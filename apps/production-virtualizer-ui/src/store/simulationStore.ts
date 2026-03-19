import { create } from "zustand";
import { railSegments, trackNodeMap } from "../data/layout";
import type { Cargo, CargoState, CoreDeviceStatus, EventItem, PalletCell, PalletLayer, RobotState } from "../types";

type SimulationState = {
  cargos: Cargo[];
  palletLayers: PalletLayer[];
  robot: RobotState;
  throughput: number;
  activeRecipe: string;
  selectedPanel: "overview" | "robot" | "pallet";
  events: EventItem[];
  connectionStatus: "connecting" | "live" | "offline";
  databaseAlive: boolean | null;
  schedulerSummary: string;
  liveDeviceCount: number;
  lastRealtimeAt: string | null;
  stackedCargoIds: string[];
  lastInspectionWorkIds: string[];
  tick: () => void;
  setSelectedPanel: (panel: "overview" | "robot" | "pallet") => void;
  setConnectionStatus: (status: "connecting" | "live" | "offline") => void;
  setDatabaseAlive: (alive: boolean) => void;
  setSchedulerSummary: (summary: string) => void;
  ingestCoreSnapshot: (snapshot: CoreDeviceStatus[]) => void;
};

const palette = ["#ffb84d", "#4ecdc4", "#ff6b6b", "#ffd166", "#7dd3c4", "#8ea7ff"];

const trackDeviceCodes = new Set(Object.keys(trackNodeMap));
const inspectionDeviceCodes = new Set(["24926", "24927", "24928", "24929", "24930", "24931", "24932", "24933", "24934"]);

const formatTime = () =>
  new Date().toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });

const appendEvent = (events: EventItem[], title: string, detail: string, tone: EventItem["tone"]): EventItem[] =>
  [{ id: `${Date.now()}-${Math.random()}`, time: formatTime(), title, detail, tone }, ...events].slice(0, 10);

const createCells = (filledCount: number, layer: number, stackedCargoIds: string[]): PalletCell[] => {
  const cells: PalletCell[] = [];
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      const index = row * 3 + col;
      const stackIndex = layer * 9 + index;
      const filled = index < filledCount;
      cells.push({
        row,
        col,
        filled,
        color: filled ? palette[layer % palette.length] : undefined,
        cargoId: filled ? stackedCargoIds[stackIndex] : undefined
      });
    }
  }
  return cells;
};

const createLayersFromStack = (stackedCargoIds: string[]): PalletLayer[] =>
  Array.from({ length: 3 }, (_, layerIndex) => {
    const layerFilled = Math.max(0, Math.min(9, stackedCargoIds.length - layerIndex * 9));
    return {
      layer: layerIndex + 1,
      filledCount: layerFilled,
      totalCount: 9,
      cells: createCells(layerFilled, layerIndex, stackedCargoIds)
    };
  });

const createFallbackCargos = (): Cargo[] => [
  { id: "BX-201", segmentIndex: 0, progress: 0.28, line: "A", state: "moving", color: palette[0] },
  { id: "BX-202", segmentIndex: 1, progress: 0.65, line: "A", state: "moving", color: palette[1] },
  { id: "BX-203", segmentIndex: 3, progress: 0.33, line: "A", state: "buffered", color: palette[2] },
  { id: "BX-204", segmentIndex: 4, progress: 0.82, line: "A", state: "picked", color: palette[3] }
];

const getCargoStateByDevice = (deviceCode: string): CargoState => {
  if (inspectionDeviceCodes.has(deviceCode)) {
    return "picked";
  }

  const suffix = Number.parseInt(deviceCode.slice(-2), 10);
  if (suffix >= 7) {
    return "buffered";
  }
  if (suffix >= 4) {
    return "moving";
  }
  return "queued";
};

const toCargoFromSnapshot = (snapshot: CoreDeviceStatus[]): Cargo[] => {
  const activeTracks = snapshot.filter(
    (item) => trackDeviceCodes.has(item.deviceCode) && item.status === "1" && item.workId && item.workId !== "0000"
  );

  if (activeTracks.length === 0) {
    return createFallbackCargos();
  }

  return activeTracks
    .sort((a, b) => a.deviceCode.localeCompare(b.deviceCode))
    .map((item, index) => {
      const node = trackNodeMap[item.deviceCode];
      return {
        id: item.workId ?? item.deviceCode,
        segmentIndex: Math.min(index, railSegments.length - 1),
        progress: 0.5,
        line: node?.line ?? "A",
        state: getCargoStateByDevice(item.deviceCode),
        color: palette[index % palette.length],
        x: node?.x ? node.x + 16 : undefined,
        y: node?.y ? node.y + 8 : undefined,
        sourceDeviceCode: item.deviceCode
      };
    });
};

const deriveRobotState = (cargos: Cargo[], stackedCargoIds: string[]): RobotState => {
  const pickedCargo = cargos.find((cargo) => cargo.state === "picked");
  const bufferedCargo = cargos.find((cargo) => cargo.state === "buffered");
  const mode: RobotState["mode"] = pickedCargo ? "placing" : bufferedCargo ? "tracking" : "idle";
  const cycleProgress = pickedCargo ? 0.82 : bufferedCargo ? 0.46 : 0.12;

  return {
    mode,
    cycleProgress,
    armX: mode === "placing" ? 748 : mode === "tracking" ? 682 : 716,
    armY: mode === "placing" ? 312 : mode === "tracking" ? 228 : 176,
    activeCargoId: pickedCargo?.id ?? bufferedCargo?.id ?? stackedCargoIds.at(-1)
  };
};

const stateToneMap: Record<string, EventItem["tone"]> = {
  "2": "warn",
  "1": "accent",
  "0": "normal"
};

export const useSimulationStore = create<SimulationState>((set) => ({
  cargos: createFallbackCargos(),
  palletLayers: createLayersFromStack(["L1-1", "L1-2", "L1-3", "L1-4", "L1-5", "L1-6", "L1-7", "L1-8", "L1-9", "L2-1", "L2-2"]),
  robot: {
    mode: "tracking",
    armX: 682,
    armY: 228,
    activeCargoId: "BX-204",
    cycleProgress: 0.46
  },
  throughput: 148,
  activeRecipe: "9-box brick stack / 3 layers",
  selectedPanel: "overview",
  connectionStatus: "connecting",
  databaseAlive: null,
  schedulerSummary: "loading scheduler state",
  liveDeviceCount: 0,
  lastRealtimeAt: null,
  stackedCargoIds: ["L1-1", "L1-2", "L1-3", "L1-4", "L1-5", "L1-6", "L1-7", "L1-8", "L1-9", "L2-1", "L2-2"],
  lastInspectionWorkIds: [],
  events: [
    { id: "evt-1", time: formatTime(), title: "QC Flow", detail: "Inspection line feeding palletizer zone", tone: "accent" },
    { id: "evt-2", time: formatTime(), title: "Pallet Build", detail: "Layer 2 now filling with verified cargo", tone: "normal" }
  ],
  setSelectedPanel: (selectedPanel) => set({ selectedPanel }),
  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
  setDatabaseAlive: (databaseAlive) => set({ databaseAlive }),
  setSchedulerSummary: (schedulerSummary) => set({ schedulerSummary }),
  ingestCoreSnapshot: (snapshot) =>
    set((state) => {
      const cargos = toCargoFromSnapshot(snapshot);
      const inspectionWorkIds = snapshot
        .filter((item) => inspectionDeviceCodes.has(item.deviceCode) && item.status === "1" && item.workId && item.workId !== "0000")
        .map((item) => item.workId as string);

      const newlyObserved = inspectionWorkIds.filter(
        (workId) => !state.lastInspectionWorkIds.includes(workId) && !state.stackedCargoIds.includes(workId)
      );

      const stackedCargoIds = [...state.stackedCargoIds, ...newlyObserved].slice(-27);
      const palletLayers = createLayersFromStack(stackedCargoIds);
      const robot = deriveRobotState(cargos, stackedCargoIds);
      const activeDevices = snapshot.filter((item) => item.status === "1" || item.status === "2");
      const errorDevices = snapshot.filter((item) => item.status === "2");

      let events = state.events;

      if (newlyObserved.length > 0) {
        const latestStacked = stackedCargoIds.length;
        const currentLayer = Math.ceil(latestStacked / 9);
        const slot = latestStacked - (currentLayer - 1) * 9;
        events = appendEvent(
          events,
          `Layer ${currentLayer} stacked`,
          `${newlyObserved.at(-1)} placed on pallet slot ${slot}`,
          "accent"
        );
      } else {
        const latest = activeDevices[0] ?? snapshot[0];
        if (latest) {
          events = appendEvent(
            events,
            latest.deviceName ?? latest.deviceCode,
            `${latest.deviceCode} -> ${latest.statusDesc ?? latest.status ?? "update"}`,
            stateToneMap[latest.status ?? "0"] ?? "normal"
          );
        }
      }

      return {
        cargos,
        palletLayers,
        robot,
        stackedCargoIds,
        lastInspectionWorkIds: inspectionWorkIds,
        liveDeviceCount: snapshot.length,
        lastRealtimeAt: formatTime(),
        throughput: Math.max(120, 120 + activeDevices.length * 2 - errorDevices.length * 4 + stackedCargoIds.length),
        events
      };
    }),
  tick: () =>
    set((state) => {
      if (state.connectionStatus === "live") {
        const bob = state.robot.mode === "tracking" ? Math.sin(Date.now() / 400) * 6 : 0;
        return {
          robot: {
            ...state.robot,
            armY: state.robot.mode === "placing" ? 312 : state.robot.mode === "tracking" ? 228 + bob : 176
          }
        };
      }

      const nextCargos: Cargo[] = state.cargos.map((cargo) => {
        let nextSegmentIndex = cargo.segmentIndex;
        let nextProgress = cargo.progress + 0.11;
        let nextState: CargoState = cargo.state;

        if (nextProgress >= 1) {
          nextProgress = 0;
          nextSegmentIndex += 1;
        }

        if (nextSegmentIndex >= railSegments.length) {
          nextSegmentIndex = railSegments.length - 1;
          nextProgress = 1;
          nextState = "stacked";
        } else if (nextSegmentIndex === 3 || nextSegmentIndex === 4) {
          nextState = "buffered";
        } else if (nextSegmentIndex >= 5) {
          nextState = "picked";
        } else {
          nextState = "moving";
        }

        return { ...cargo, segmentIndex: nextSegmentIndex, progress: nextProgress, state: nextState };
      });

      const leadCargo = nextCargos[nextCargos.length - 1];
      const robotMode: RobotState["mode"] =
        leadCargo.state === "picked" ? "tracking" : leadCargo.state === "stacked" ? "placing" : "idle";
      const cycleProgress = (state.robot.cycleProgress + 0.08) % 1;
      const armX = 710 - cycleProgress * 96;
      const armY = 172 + Math.sin(cycleProgress * Math.PI) * 116;

      let stackedCargoIds = state.stackedCargoIds;
      let events = state.events;
      if (leadCargo.state === "stacked" && state.robot.mode !== "placing") {
        stackedCargoIds = [...state.stackedCargoIds, leadCargo.id].slice(-27);
        const latestStacked = stackedCargoIds.length;
        const currentLayer = Math.ceil(latestStacked / 9);
        const slot = latestStacked - (currentLayer - 1) * 9;
        events = appendEvent(events, `Layer ${currentLayer} stacked`, `${leadCargo.id} placed on pallet slot ${slot}`, "accent");
        nextCargos[nextCargos.length - 1] = {
          id: `BX-${200 + state.throughput + 1}`,
          segmentIndex: 0,
          progress: 0,
          line: "A",
          state: "queued",
          color: palette[(state.throughput + 1) % palette.length]
        };
      } else {
        events = appendEvent(events, "Rail Flow", `${nextCargos[0].id} entered ${railSegments[0].label}`, "normal");
      }

      return {
        cargos: nextCargos,
        palletLayers: createLayersFromStack(stackedCargoIds),
        stackedCargoIds,
        robot: {
          mode: robotMode,
          armX,
          armY,
          activeCargoId: leadCargo.id,
          cycleProgress
        },
        throughput: state.throughput + (leadCargo.state === "stacked" && state.robot.mode !== "placing" ? 1 : 0),
        events
      };
    })
}));

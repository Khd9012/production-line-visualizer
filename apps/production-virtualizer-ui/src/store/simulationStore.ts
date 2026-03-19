import { create } from "zustand";
import { lineBranchMap, palletCellAnchors, pickupAnchor, railSegments, trackNodeMap } from "../data/layout";
import type {
  Cargo,
  CargoRailPhase,
  CargoState,
  CoreApmStatus,
  CoreDeviceStatus,
  CoreRobotInfo,
  CoreSimulationSnapshot,
  EventItem,
  FocusLine,
  PalletCell,
  PalletLayer,
  PlaybackSpeed,
  RobotState
} from "../types";

type SimulationState = {
  cargos: Cargo[];
  palletLayers: PalletLayer[];
  robot: RobotState;
  throughput: number;
  activeRecipe: string;
  selectedPanel: "overview" | "robot" | "pallet";
  focusedLine: FocusLine;
  playbackSpeed: PlaybackSpeed;
  events: EventItem[];
  connectionStatus: "connecting" | "live" | "offline";
  databaseAlive: boolean | null;
  schedulerSummary: string;
  liveDeviceCount: number;
  lastRealtimeAt: string | null;
  stackedCargoIds: string[];
  lastInspectionWorkIds: string[];
  robots: CoreRobotInfo[];
  apmStatus: CoreApmStatus | null;
  lineStates: CoreSimulationSnapshot["lineStates"];
  tick: () => void;
  setSelectedPanel: (panel: "overview" | "robot" | "pallet") => void;
  setFocusedLine: (line: FocusLine) => void;
  setPlaybackSpeed: (speed: PlaybackSpeed) => void;
  setConnectionStatus: (status: "connecting" | "live" | "offline") => void;
  setDatabaseAlive: (alive: boolean) => void;
  setSchedulerSummary: (summary: string) => void;
  ingestCoreSnapshot: (snapshot: CoreDeviceStatus[]) => void;
  ingestSimulationSnapshot: (snapshot: CoreSimulationSnapshot) => void;
};

const palette = ["#ffb84d", "#4ecdc4", "#ff6b6b", "#ffd166", "#7dd3c4", "#8ea7ff"];
const inspectionDeviceCodes = new Set(["24926", "24927", "24928", "24929", "24930", "24931", "24932", "24933", "24934"]);
const trackDeviceCodes = new Set(Object.keys(trackNodeMap));

const formatTime = () =>
  new Date().toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });

const appendEvent = (events: EventItem[], title: string, detail: string, tone: EventItem["tone"]): EventItem[] =>
  [{ id: `${Date.now()}-${Math.random()}`, time: formatTime(), title, detail, tone }, ...events].slice(0, 12);

const getPalletRenderOffset = (layer: number) => ({
  x: (layer - 1) * 5,
  y: (3 - layer) * 11
});

const createCells = (filledCount: number, layer: number, stackedCargoIds: string[]): PalletCell[] =>
  palletCellAnchors.map((anchor, index) => {
    const stackIndex = (layer - 1) * 9 + index;
    const filled = index < filledCount;

    return {
      row: anchor.row,
      col: anchor.col,
      filled,
      color: filled ? palette[(layer - 1) % palette.length] : undefined,
      cargoId: filled ? stackedCargoIds[stackIndex] : undefined,
      x: anchor.x,
      y: anchor.y,
      slotLabel: anchor.slotLabel
    };
  });

const createLayersFromStack = (stackedCargoIds: string[]): PalletLayer[] =>
  Array.from({ length: 3 }, (_, layerIndex) => {
    const layer = layerIndex + 1;
    const layerFilled = Math.max(0, Math.min(9, stackedCargoIds.length - layerIndex * 9));
    return {
      layer,
      filledCount: layerFilled,
      totalCount: 9,
      cells: createCells(layerFilled, layer, stackedCargoIds)
    };
  });

const getNextPalletTarget = (stackedCargoIds: string[]) => {
  const nextIndex = Math.min(stackedCargoIds.length, 26);
  const layer = Math.floor(nextIndex / 9) + 1;
  const anchor = palletCellAnchors[nextIndex % 9];
  const offset = getPalletRenderOffset(layer);

  return {
    layer,
    row: anchor.row,
    col: anchor.col,
    x: anchor.x + offset.x,
    y: anchor.y - offset.y
  };
};

const createFallbackCargos = (): Cargo[] => [
  { id: "BX-201", segmentIndex: 0, progress: 0.14, line: "L1", railPhase: "mainline", state: "moving", color: palette[0], x: 122, y: 106, interceptorIndex: 1 },
  { id: "BX-202", segmentIndex: 0, progress: 0.38, line: "L3", railPhase: "branching", state: "moving", color: palette[1], x: 282, y: 190, interceptorIndex: 3 },
  { id: "BX-203", segmentIndex: 0, progress: 0.7, line: "L5", railPhase: "interceptor", state: "buffered", color: palette[2], x: 622, y: 312, interceptorIndex: 7 },
  { id: "BX-204", segmentIndex: 0, progress: 0.92, line: "QC", railPhase: "inspection", state: "picked", color: palette[3], x: 754, y: 198, interceptorIndex: 9 }
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

const getCargoPhaseByProgress = (line: string, progress: number): CargoRailPhase => {
  if (line === "QC") {
    if (progress < 0.78) {
      return "inspection";
    }
    if (progress < 0.9) {
      return "pickup";
    }
    return "placing";
  }

  if (progress < 0.22) {
    return "mainline";
  }
  if (progress < 0.46) {
    return "branching";
  }
  if (progress < 0.8) {
    return "interceptor";
  }
  return "inspection";
};

const getCargoCoordinates = (line: string, progress: number) => {
  const branch = lineBranchMap[line as keyof typeof lineBranchMap] ?? lineBranchMap.L1;

  if (line === "QC") {
    return {
      x: 748,
      y: 132 + progress * 252
    };
  }

  if (progress < 0.22) {
    return {
      x: 92 + progress * 1250,
      y: 106
    };
  }

  if (progress < 0.46) {
    const phaseProgress = (progress - 0.22) / 0.24;
    return {
      x: branch.splitX + phaseProgress * 86,
      y: 106 + (branch.mergeY - 106) * phaseProgress
    };
  }

  if (progress < 0.8) {
    const phaseProgress = (progress - 0.46) / 0.34;
    return {
      x: 254 + (branch.interceptorX - 254) * phaseProgress,
      y: branch.mergeY
    };
  }

  const phaseProgress = (progress - 0.8) / 0.2;
  return {
    x: branch.interceptorX + (748 - branch.interceptorX) * phaseProgress,
    y: branch.interceptorY + (250 - branch.interceptorY) * phaseProgress
  };
};

const attachPalletTarget = (cargos: Cargo[], stackedCargoIds: string[]): Cargo[] => {
  if (stackedCargoIds.length >= 27) {
    return cargos;
  }

  const palletTarget = getNextPalletTarget(stackedCargoIds);
  const activeCargo = cargos.find((cargo) => cargo.state === "picked") ?? cargos.find((cargo) => cargo.state === "buffered");

  return cargos.map((cargo) => (cargo.id === activeCargo?.id ? { ...cargo, palletTarget } : cargo));
};

const toCargoFromSnapshot = (snapshot: CoreDeviceStatus[], stackedCargoIds: string[]): Cargo[] => {
  const activeTracks = snapshot.filter(
    (item) => trackDeviceCodes.has(item.deviceCode) && item.status === "1" && item.workId && item.workId !== "0000"
  );

  if (activeTracks.length === 0) {
    return attachPalletTarget(createFallbackCargos(), stackedCargoIds);
  }

  return attachPalletTarget(
    activeTracks
      .sort((a, b) => a.deviceCode.localeCompare(b.deviceCode))
      .map((item, index) => {
        const node = trackNodeMap[item.deviceCode];
        return {
          id: item.workId ?? item.deviceCode,
          segmentIndex: Math.min(index, railSegments.length - 1),
          progress: Number.parseInt(item.deviceCode.slice(-2), 10) / (inspectionDeviceCodes.has(item.deviceCode) ? 34 : 12),
          line: node?.line ?? "L1",
          state: getCargoStateByDevice(item.deviceCode),
          color: palette[index % palette.length],
          ...getCargoCoordinates(node?.line ?? "L1", Math.min(0.95, inspectionDeviceCodes.has(item.deviceCode) ? 0.74 + index * 0.02 : Number.parseInt(item.deviceCode.slice(-2), 10) / 12)),
          sourceDeviceCode: item.deviceCode,
          railPhase: getCargoPhaseByProgress(node?.line ?? "L1", Math.min(0.95, inspectionDeviceCodes.has(item.deviceCode) ? 0.74 + index * 0.02 : Number.parseInt(item.deviceCode.slice(-2), 10) / 12)),
          interceptorIndex: inspectionDeviceCodes.has(item.deviceCode) ? index + 1 : Number.parseInt(item.deviceCode.slice(-1), 10)
        };
      }),
    stackedCargoIds
  );
};

const deriveRobotState = (cargos: Cargo[], stackedCargoIds: string[]): RobotState => {
  const pickedCargo = cargos.find((cargo) => cargo.state === "picked");
  const bufferedCargo = cargos.find((cargo) => cargo.state === "buffered");
  const mode: RobotState["mode"] = pickedCargo ? "placing" : bufferedCargo ? "tracking" : "idle";
  const cycleProgress = pickedCargo ? 0.46 : bufferedCargo ? 0.22 : 0.08;
  const nextTarget = getNextPalletTarget(stackedCargoIds);

  if (mode === "placing") {
    return {
      mode,
      cycleProgress,
      armX: pickupAnchor.x + (nextTarget.x - pickupAnchor.x) * cycleProgress,
      armY: pickupAnchor.y + (nextTarget.y - pickupAnchor.y) * cycleProgress,
      activeCargoId: pickedCargo?.id
    };
  }

  return {
    mode,
    cycleProgress,
    armX: bufferedCargo ? 918 : 960,
    armY: bufferedCargo ? 172 : 154,
    activeCargoId: bufferedCargo?.id ?? stackedCargoIds.at(-1)
  };
};

const stateToneMap: Record<string, EventItem["tone"]> = {
  "2": "warn",
  "1": "accent",
  "0": "normal"
};

export const useSimulationStore = create<SimulationState>((set) => ({
  cargos: attachPalletTarget(createFallbackCargos(), ["L1-1", "L1-2", "L1-3", "L1-4", "L1-5", "L1-6", "L1-7", "L1-8", "L1-9", "L2-1", "L2-2"]),
  palletLayers: createLayersFromStack(["L1-1", "L1-2", "L1-3", "L1-4", "L1-5", "L1-6", "L1-7", "L1-8", "L1-9", "L2-1", "L2-2"]),
  robot: {
    mode: "tracking",
    armX: 862,
    armY: 192,
    activeCargoId: "BX-204",
    cycleProgress: 0.38
  },
  throughput: 148,
  activeRecipe: "3x3 brick stack / verification gated / outbound staged",
  selectedPanel: "overview",
  focusedLine: "ALL",
  playbackSpeed: 1,
  connectionStatus: "connecting",
  databaseAlive: null,
  schedulerSummary: "loading scheduler state",
  liveDeviceCount: 0,
  lastRealtimeAt: null,
  stackedCargoIds: ["L1-1", "L1-2", "L1-3", "L1-4", "L1-5", "L1-6", "L1-7", "L1-8", "L1-9", "L2-1", "L2-2"],
  lastInspectionWorkIds: [],
  robots: [],
  apmStatus: null,
  lineStates: {},
  events: [
    { id: "evt-1", time: formatTime(), title: "Line Sync", detail: "Inspection conveyor handing off verified cargo to the robot cell", tone: "accent" },
    { id: "evt-2", time: formatTime(), title: "Stack Recipe", detail: "Second layer is actively balancing outbound pallet load", tone: "normal" }
  ],
  setSelectedPanel: (selectedPanel) => set({ selectedPanel }),
  setFocusedLine: (focusedLine) => set({ focusedLine }),
  setPlaybackSpeed: (playbackSpeed) => set({ playbackSpeed }),
  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
  setDatabaseAlive: (databaseAlive) => set({ databaseAlive }),
  setSchedulerSummary: (schedulerSummary) => set({ schedulerSummary }),
  ingestSimulationSnapshot: (snapshot) =>
    set((state) => {
      const apmStatus = snapshot.apmStatus;
      const orderQty = Number.parseInt(apmStatus?.orderQty ?? "0", 10);
      const completeQty = Number.parseInt(apmStatus?.completeQty ?? "0", 10);
      const derivedStackCount = orderQty > 0 ? Math.min(27, Math.floor(completeQty / 3)) : state.stackedCargoIds.length;
      const stackedCargoIds =
        derivedStackCount > state.stackedCargoIds.length
          ? [
              ...state.stackedCargoIds,
              ...Array.from({ length: derivedStackCount - state.stackedCargoIds.length }, (_, index) => `APM-${state.stackedCargoIds.length + index + 1}`)
            ].slice(-27)
          : state.stackedCargoIds.slice(0, Math.max(derivedStackCount, state.stackedCargoIds.length));
      const palletLayers = createLayersFromStack(stackedCargoIds);
      const cargos = attachPalletTarget(state.cargos, stackedCargoIds);

      return {
        robots: snapshot.robots ?? [],
        apmStatus,
        lineStates: snapshot.lineStates ?? {},
        palletLayers,
        stackedCargoIds,
        cargos,
        events:
          snapshot.robots.length > 0
            ? appendEvent(
                state.events,
                `Robot ${snapshot.robots[0].robotNo} cycle`,
                `Load L${snapshot.robots[0].loadingLine} -> unload L${snapshot.robots[0].unLoadingLine} / ${snapshot.robots[0].totalOrderCount} box order`,
                "normal"
              )
            : state.events
      };
    }),
  ingestCoreSnapshot: (snapshot) =>
    set((state) => {
      const inspectionWorkIds = snapshot
        .filter((item) => inspectionDeviceCodes.has(item.deviceCode) && item.status === "1" && item.workId && item.workId !== "0000")
        .map((item) => item.workId as string);

      const newlyObserved = inspectionWorkIds.filter(
        (workId) => !state.lastInspectionWorkIds.includes(workId) && !state.stackedCargoIds.includes(workId)
      );

      const stackedCargoIds = [...state.stackedCargoIds, ...newlyObserved].slice(-27);
      const palletLayers = createLayersFromStack(stackedCargoIds);
      const cargos = toCargoFromSnapshot(snapshot, stackedCargoIds);
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
        throughput: Math.max(126, 116 + activeDevices.length * 2 + stackedCargoIds.length - errorDevices.length * 6),
        events
      };
    }),
  tick: () =>
    set((state) => {
      const speedFactor = state.playbackSpeed;
      const stackedCargoIds = state.stackedCargoIds;
      const cargos = attachPalletTarget(
        state.cargos.map((cargo) => {
          if (state.connectionStatus === "live") {
            return cargo;
          }

          const step = cargo.line === "QC" ? 0.035 * speedFactor : cargo.state === "buffered" ? 0.024 * speedFactor : 0.05 * speedFactor;
          const nextProgress = Math.min(0.97, cargo.progress + step);
          const coords = getCargoCoordinates(cargo.line, nextProgress);
          const phase = getCargoPhaseByProgress(cargo.line, nextProgress);
          const stateMap: CargoState =
            cargo.line === "QC"
              ? nextProgress > 0.88
                ? "picked"
                : nextProgress > 0.74
                  ? "buffered"
                  : "moving"
              : nextProgress > 0.78
                ? "buffered"
                : nextProgress > 0.18
                  ? "moving"
                  : "queued";

          if (phase === "placing") {
            return {
              ...cargo,
              progress: nextProgress,
              x: coords.x,
              y: coords.y,
              railPhase: phase,
              state: "picked"
            };
          }

          return {
            ...cargo,
            progress: nextProgress,
            x: coords.x,
            y: coords.y,
            railPhase: phase,
            state: stateMap,
            interceptorIndex: cargo.line === "QC" ? 9 : Math.max(1, Math.min(9, Math.round(nextProgress * 9)))
          };
        }),
        stackedCargoIds
      );

      const derivedRobot = deriveRobotState(cargos, stackedCargoIds);
      const robot =
        derivedRobot.mode === "placing"
          ? {
              ...derivedRobot,
              cycleProgress: Math.min(0.82, state.robot.mode === "placing" ? state.robot.cycleProgress + 0.04 * speedFactor : 0.18),
              armX: pickupAnchor.x + ((cargos.find((cargo) => cargo.id === derivedRobot.activeCargoId)?.palletTarget?.x ?? derivedRobot.armX) - pickupAnchor.x) * Math.min(0.82, state.robot.mode === "placing" ? state.robot.cycleProgress + 0.04 * speedFactor : 0.18),
              armY: pickupAnchor.y + ((cargos.find((cargo) => cargo.id === derivedRobot.activeCargoId)?.palletTarget?.y ?? derivedRobot.armY) - pickupAnchor.y) * Math.min(0.82, state.robot.mode === "placing" ? state.robot.cycleProgress + 0.04 * speedFactor : 0.18)
            }
          : derivedRobot.mode === "tracking"
            ? {
                ...derivedRobot,
                cycleProgress: Math.min(0.5, state.robot.mode === "tracking" ? state.robot.cycleProgress + 0.025 * speedFactor : 0.08)
              }
            : {
                ...derivedRobot,
                cycleProgress: Math.max(0.05, state.robot.cycleProgress - 0.04 * speedFactor)
              };

      if (state.connectionStatus === "live") {
        const bob = Math.sin(Date.now() / (540 / speedFactor)) * 4;
        return {
          cargos,
          robot: {
            ...robot,
            armY: robot.mode === "tracking" ? robot.armY + bob : robot.armY
          }
        };
      }

      return {
        cargos,
        robot
      };
    })
}));

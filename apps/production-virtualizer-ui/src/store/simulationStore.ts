import { create } from "zustand";
import { lineBranchMap, outboundDocks, palletCellAnchors, pickupAnchor, sourceTrunkJunctions, trackNodeMap } from "../data/layout";
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
  InterceptorRobotPhase,
  InterceptorRobotState,
  MainRobotPhase,
  OutboundPallet,
  PalletCell,
  PalletLayer,
  PlaybackSpeed,
  RobotState
} from "../types";

type SimulationState = {
  cargos: Cargo[];
  palletLayers: PalletLayer[];
  robot: RobotState;
  interceptorRobots: InterceptorRobotState[];
  outboundPallets: OutboundPallet[];
  releasedStackBaseline: number;
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
const northLines = new Set(["L1", "L2", "L3"]);
const southLines = new Set(["L4", "L5", "L6", "L7"]);

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
  { id: "BX-201", segmentIndex: 0, progress: 0.12, line: "L1", railPhase: "mainline", state: "moving", color: palette[0], x: 166, y: 144, interceptorIndex: 1 },
  { id: "BX-202", segmentIndex: 0, progress: 0.34, line: "L3", railPhase: "branching", state: "moving", color: palette[1], x: 542, y: 224, interceptorIndex: 3 },
  { id: "BX-203", segmentIndex: 0, progress: 0.68, line: "L5", railPhase: "interceptor", state: "buffered", color: palette[2], x: 998, y: 370, interceptorIndex: 7 },
  { id: "BX-204", segmentIndex: 0, progress: 0.88, line: "QC", railPhase: "inspection", state: "picked", color: palette[3], x: 1190, y: 260, interceptorIndex: 9 }
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
  const junction = sourceTrunkJunctions[branch.source as keyof typeof sourceTrunkJunctions];
  const intakeY = junction.splitY;

  if (line === "QC") {
    return {
      x: 1198,
      y: 144 + Math.min(0.95, progress) * 320
    };
  }

  if (progress < 0.16) {
    const phaseProgress = progress / 0.16;
    return {
      x: 112 + phaseProgress * 220,
      y: intakeY
    };
  }

  if (progress < 0.34) {
    const phaseProgress = (progress - 0.16) / 0.18;
    return {
      x: junction.splitX + phaseProgress * 150,
      y: intakeY + (144 - intakeY) * phaseProgress
    };
  }

  if (progress < 0.56) {
    const phaseProgress = (progress - 0.34) / 0.22;
    return {
      x: 458 + (branch.splitX - 458) * phaseProgress,
      y: 144
    };
  }

  if (progress < 0.82) {
    const phaseProgress = (progress - 0.56) / 0.26;
    return {
      x: branch.splitX + (branch.interceptorX - branch.splitX) * phaseProgress,
      y: 144 + (branch.mergeY - 144) * Math.min(1, phaseProgress * 1.15)
    };
  }

  const phaseProgress = (progress - 0.82) / 0.18;
  return {
    x: branch.interceptorX + (1196 - branch.interceptorX) * phaseProgress,
    y: branch.interceptorY + (302 - branch.interceptorY) * phaseProgress
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
        const progress = Math.min(
          0.95,
          inspectionDeviceCodes.has(item.deviceCode) ? 0.82 + index * 0.015 : Math.min(0.84, Number.parseInt(item.deviceCode.slice(-2), 10) / 12)
        );

        return {
          id: item.workId ?? item.deviceCode,
          segmentIndex: 0,
          progress,
          line: node?.line ?? "L1",
          railPhase: getCargoPhaseByProgress(node?.line ?? "L1", progress),
          state: getCargoStateByDevice(item.deviceCode),
          color: palette[index % palette.length],
          ...getCargoCoordinates(node?.line ?? "L1", progress),
          sourceDeviceCode: item.deviceCode,
          interceptorIndex: inspectionDeviceCodes.has(item.deviceCode) ? index + 1 : Number.parseInt(item.deviceCode.slice(-1), 10)
        };
      }),
    stackedCargoIds
  );
};

const getMainRobotPhase = (progress: number): MainRobotPhase => {
  if (progress < 0.12) {
    return "rotate";
  }
  if (progress < 0.24) {
    return "lower";
  }
  if (progress < 0.38) {
    return "suction";
  }
  if (progress < 0.52) {
    return "lift";
  }
  if (progress < 0.82) {
    return "transfer";
  }
  return "place";
};

const interpolate = (from: number, to: number, progress: number) => from + (to - from) * progress;

const buildMainRobotState = (
  cargos: Cargo[],
  stackedCargoIds: string[],
  previousRobot: RobotState,
  speedFactor: number,
  connectionStatus: SimulationState["connectionStatus"]
): RobotState => {
  const pickedCargo = cargos.find((cargo) => cargo.state === "picked" || cargo.railPhase === "placing");
  const bufferedCargo = cargos.find((cargo) => cargo.state === "buffered");

  if (!pickedCargo && !bufferedCargo) {
    return {
      mode: "idle",
      armX: 960,
      armY: 154,
      activeCargoId: previousRobot.activeCargoId,
      cycleProgress: Math.max(0.05, previousRobot.cycleProgress - 0.05 * speedFactor),
      phase: "standby",
      pickX: pickupAnchor.x,
      pickY: pickupAnchor.y
    };
  }

  if (pickedCargo?.palletTarget) {
    const cycleProgress =
      previousRobot.mode === "placing" ? Math.min(1, previousRobot.cycleProgress + 0.03 * speedFactor) : connectionStatus === "live" ? 0.08 : 0.16;
    const phase = getMainRobotPhase(cycleProgress);
    const pickX = pickupAnchor.x;
    const pickY = pickupAnchor.y;
    const targetX = pickedCargo.palletTarget.x;
    const targetY = pickedCargo.palletTarget.y;

    let armX = pickX;
    let armY = 146;

    if (phase === "rotate") {
      armX = interpolate(960, pickX, cycleProgress / 0.12);
      armY = interpolate(154, 158, cycleProgress / 0.12);
    } else if (phase === "lower") {
      armX = pickX;
      armY = interpolate(158, pickY, (cycleProgress - 0.12) / 0.12);
    } else if (phase === "suction") {
      armX = pickX;
      armY = pickY + Math.sin(((cycleProgress - 0.24) / 0.14) * Math.PI) * 2;
    } else if (phase === "lift") {
      armX = pickX;
      armY = interpolate(pickY, 156, (cycleProgress - 0.38) / 0.14);
    } else if (phase === "transfer") {
      const progress = (cycleProgress - 0.52) / 0.3;
      armX = interpolate(pickX, targetX, progress);
      armY = interpolate(156, targetY - 12, progress) - Math.sin(progress * Math.PI) * 34;
    } else {
      const progress = (cycleProgress - 0.82) / 0.18;
      armX = targetX;
      armY = interpolate(targetY - 12, targetY + 8, progress);
    }

    return {
      mode: "placing",
      armX,
      armY,
      activeCargoId: pickedCargo.id,
      cycleProgress,
      phase,
      pickX,
      pickY
    };
  }

  return {
    mode: "tracking",
    armX: interpolate(previousRobot.armX ?? 960, pickupAnchor.x + 14, 0.16 * speedFactor),
    armY: interpolate(previousRobot.armY ?? 154, pickupAnchor.y - 8, 0.18 * speedFactor),
    activeCargoId: bufferedCargo?.id ?? stackedCargoIds.at(-1),
    cycleProgress: Math.min(0.5, previousRobot.mode === "tracking" ? previousRobot.cycleProgress + 0.02 * speedFactor : 0.1),
    phase: "rotate",
    pickX: pickupAnchor.x,
    pickY: pickupAnchor.y
  };
};

const buildInterceptorRobots = (cargos: Cargo[], previousRobots: InterceptorRobotState[], speedFactor: number): InterceptorRobotState[] => {
  const definitions = [
    { id: "INT-R1", label: "Interceptor R1", zone: "north" as const, baseX: 1310, baseY: 204, releaseX: 1188, releaseY: 220, lines: northLines, lineGroup: "L1-L3" },
    { id: "INT-R2", label: "Interceptor R2", zone: "south" as const, baseX: 1310, baseY: 346, releaseX: 1188, releaseY: 362, lines: southLines, lineGroup: "L4-L7" }
  ];

  return definitions.map((definition, index) => {
    const previous = previousRobots[index] ?? {
      id: definition.id,
      label: definition.label,
      zone: definition.zone,
      armX: definition.baseX,
      armY: definition.baseY,
      phase: "idle" as InterceptorRobotPhase,
      cycleProgress: 0,
      activeCargoId: undefined,
      lineGroup: definition.lineGroup
    };

    const activeCargo = cargos
      .filter((cargo) => definition.lines.has(cargo.line) && cargo.railPhase && ["branching", "interceptor", "inspection"].includes(cargo.railPhase))
      .sort((a, b) => b.progress - a.progress)[0];

    if (!activeCargo || activeCargo.x === undefined || activeCargo.y === undefined) {
      return {
        ...previous,
        armX: interpolate(previous.armX, definition.baseX, 0.18 * speedFactor),
        armY: interpolate(previous.armY, definition.baseY, 0.18 * speedFactor),
        cycleProgress: Math.max(0, previous.cycleProgress - 0.06 * speedFactor),
        phase: "idle",
        activeCargoId: undefined
      };
    }

    const pickX = activeCargo.x + 12;
    const pickY = activeCargo.y + 8;
    let phase: InterceptorRobotPhase = "align";
    if (activeCargo.railPhase === "interceptor") {
      phase = activeCargo.progress > 0.68 ? "pick" : "align";
    } else if (activeCargo.railPhase === "inspection") {
      phase = "release";
    } else {
      phase = "transfer";
    }

    const cycleProgress = Math.min(1, previous.activeCargoId === activeCargo.id ? previous.cycleProgress + 0.04 * speedFactor : 0.12);
    let armX = definition.baseX;
    let armY = definition.baseY;

    if (phase === "align") {
      armX = interpolate(definition.baseX, pickX, cycleProgress);
      armY = interpolate(definition.baseY, pickY - 18, cycleProgress);
    } else if (phase === "pick") {
      armX = pickX;
      armY = interpolate(pickY - 18, pickY, Math.min(1, cycleProgress * 1.6));
    } else if (phase === "transfer") {
      armX = interpolate(pickX, definition.releaseX, cycleProgress);
      armY = interpolate(pickY, definition.releaseY, cycleProgress) - Math.sin(cycleProgress * Math.PI) * 16;
    } else {
      armX = definition.releaseX;
      armY = definition.releaseY;
    }

    return {
      id: definition.id,
      label: definition.label,
      zone: definition.zone,
      armX,
      armY,
      phase,
      cycleProgress,
      activeCargoId: activeCargo.id,
      lineGroup: definition.lineGroup
    };
  });
};

const advanceOutboundPallets = (outboundPallets: OutboundPallet[], speedFactor: number): OutboundPallet[] =>
  outboundPallets
    .map((pallet) => {
      if (pallet.status === "shipped") {
        return pallet;
      }

      const nextProgress = Math.min(1, pallet.progress + 0.045 * speedFactor);
      return {
        ...pallet,
        progress: nextProgress,
        status: (nextProgress >= 1 ? "shipped" : nextProgress > 0.12 ? "moving" : "staging") as OutboundPallet["status"]
      };
    })
    .slice(-4);

const releaseCompletedPallet = (
  stackedCargoIds: string[],
  outboundPallets: OutboundPallet[],
  events: EventItem[],
  releasedStackBaseline: number
) => {
  if (stackedCargoIds.length < 27) {
    return { stackedCargoIds, outboundPallets, events, releasedStackBaseline };
  }

  const nextDock = outboundDocks[outboundPallets.length % outboundDocks.length];
  const palletId = `PLT-${Date.now().toString().slice(-5)}`;

  return {
    stackedCargoIds: [],
    outboundPallets: [
      ...outboundPallets,
      {
        id: palletId,
        boxCount: 27,
        releasedAt: formatTime(),
        progress: 0,
        dockId: nextDock.id,
        status: "staging" as const
      }
    ].slice(-4),
    events: appendEvent(events, "Outbound release", `${palletId} completed 3 layers and moved to ${nextDock.id}`, "accent"),
    releasedStackBaseline: releasedStackBaseline + 27
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
    armX: 1340,
    armY: 214,
    activeCargoId: "BX-204",
    cycleProgress: 0.14,
    phase: "rotate",
    pickX: pickupAnchor.x,
    pickY: pickupAnchor.y
  },
  interceptorRobots: [
    { id: "INT-R1", label: "Interceptor R1", zone: "north", armX: 1310, armY: 204, phase: "idle", cycleProgress: 0, lineGroup: "L1-L3" },
    { id: "INT-R2", label: "Interceptor R2", zone: "south", armX: 1310, armY: 346, phase: "idle", cycleProgress: 0, lineGroup: "L4-L7" }
  ],
  outboundPallets: [],
  releasedStackBaseline: 0,
  throughput: 148,
  activeRecipe: "mainline split -> interceptor robots -> 3-layer pallet -> outbound",
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
    { id: "evt-1", time: formatTime(), title: "Interceptor Flow", detail: "Two interceptor robots gate cargo into the inspection spine", tone: "accent" },
    { id: "evt-2", time: formatTime(), title: "Outbound Logic", detail: "A full 3-layer pallet releases automatically to the dock lane", tone: "normal" }
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
      const absoluteStackCount = orderQty > 0 ? Math.floor(completeQty / 3) : 0;
      const releasedStackBaseline = absoluteStackCount < state.releasedStackBaseline ? 0 : state.releasedStackBaseline;
      const visibleStackCount = Math.max(0, absoluteStackCount - releasedStackBaseline);

      let stackedCargoIds =
        visibleStackCount > state.stackedCargoIds.length
          ? [
              ...state.stackedCargoIds,
              ...Array.from({ length: visibleStackCount - state.stackedCargoIds.length }, (_, index) => `APM-${state.stackedCargoIds.length + index + 1}`)
            ].slice(-27)
          : state.stackedCargoIds.slice(0, Math.max(visibleStackCount, state.stackedCargoIds.length));

      let events =
        snapshot.robots.length > 0
          ? appendEvent(
              state.events,
              `Robot ${snapshot.robots[0].robotNo} cycle`,
              `Load L${snapshot.robots[0].loadingLine} -> unload L${snapshot.robots[0].unLoadingLine} / ${snapshot.robots[0].totalOrderCount} box order`,
              "normal"
            )
          : state.events;

      let outboundPallets = advanceOutboundPallets(state.outboundPallets, state.playbackSpeed);
      const release = releaseCompletedPallet(stackedCargoIds, outboundPallets, events, releasedStackBaseline);
      stackedCargoIds = release.stackedCargoIds;
      outboundPallets = release.outboundPallets;
      events = release.events;

      const palletLayers = createLayersFromStack(stackedCargoIds);
      const cargos = attachPalletTarget(state.cargos, stackedCargoIds);
      const robot = buildMainRobotState(cargos, stackedCargoIds, state.robot, state.playbackSpeed, state.connectionStatus);
      const interceptorRobots = buildInterceptorRobots(cargos, state.interceptorRobots, state.playbackSpeed);

      return {
        robots: snapshot.robots ?? [],
        apmStatus,
        lineStates: snapshot.lineStates ?? {},
        palletLayers,
        stackedCargoIds,
        cargos,
        robot,
        interceptorRobots,
        outboundPallets,
        releasedStackBaseline: release.releasedStackBaseline
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

      let stackedCargoIds = [...state.stackedCargoIds, ...newlyObserved].slice(-27);
      let events = state.events;
      let outboundPallets = advanceOutboundPallets(state.outboundPallets, state.playbackSpeed);

      if (newlyObserved.length > 0) {
        const latestStacked = Math.min(stackedCargoIds.length, 27);
        const currentLayer = Math.ceil(latestStacked / 9);
        const slot = latestStacked - (currentLayer - 1) * 9;
        events = appendEvent(
          events,
          `Layer ${currentLayer} staged`,
          `${newlyObserved.at(-1)} buffered into pallet slot ${slot}`,
          "accent"
        );
      } else {
        const activeDevices = snapshot.filter((item) => item.status === "1" || item.status === "2");
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

      const release = releaseCompletedPallet(stackedCargoIds, outboundPallets, events, state.releasedStackBaseline);
      stackedCargoIds = release.stackedCargoIds;
      outboundPallets = release.outboundPallets;
      events = release.events;

      const cargos = toCargoFromSnapshot(snapshot, stackedCargoIds);
      const palletLayers = createLayersFromStack(stackedCargoIds);
      const robot = buildMainRobotState(cargos, stackedCargoIds, state.robot, state.playbackSpeed, state.connectionStatus);
      const interceptorRobots = buildInterceptorRobots(cargos, state.interceptorRobots, state.playbackSpeed);
      const activeDevices = snapshot.filter((item) => item.status === "1" || item.status === "2");
      const errorDevices = snapshot.filter((item) => item.status === "2");

      return {
        cargos,
        palletLayers,
        robot,
        interceptorRobots,
        outboundPallets,
        releasedStackBaseline: release.releasedStackBaseline,
        stackedCargoIds,
        lastInspectionWorkIds: inspectionWorkIds,
        liveDeviceCount: snapshot.length,
        lastRealtimeAt: formatTime(),
        throughput: Math.max(126, 116 + activeDevices.length * 2 + stackedCargoIds.length + outboundPallets.length * 5 - errorDevices.length * 6),
        events
      };
    }),
  tick: () =>
    set((state) => {
      const speedFactor = state.playbackSpeed;
      const existingInspectionCount = state.cargos.filter((cargo) => cargo.railPhase === "inspection" || cargo.railPhase === "pickup").length;

      let stackedCargoIds = state.stackedCargoIds;
      let events = state.events;

      const cargos = attachPalletTarget(
        state.cargos.map((cargo) => {
          if (state.connectionStatus === "live") {
            return cargo;
          }

          const lineOccupancy = state.cargos.filter(
            (item) =>
              item.line === cargo.line &&
              item.id !== cargo.id &&
              item.progress > cargo.progress &&
              item.railPhase &&
              ["interceptor", "inspection", "pickup"].includes(item.railPhase)
          ).length;

          const qcBlocked = cargo.line !== "QC" && existingInspectionCount > 2 && cargo.progress > 0.74;
          const stepBase = cargo.line === "QC" ? 0.025 : cargo.state === "buffered" ? 0.018 : 0.04;
          let nextProgress = Math.min(0.98, cargo.progress + stepBase * speedFactor);

          if (lineOccupancy > 0 && cargo.progress > 0.42 && cargo.progress < 0.7) {
            nextProgress = Math.min(nextProgress, 0.46);
          }
          if (qcBlocked) {
            nextProgress = Math.min(nextProgress, 0.79);
          }

          const railPhase = getCargoPhaseByProgress(cargo.line, nextProgress);
          const coords = getCargoCoordinates(cargo.line, nextProgress);
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

          return {
            ...cargo,
            progress: nextProgress,
            x: coords.x,
            y: coords.y,
            railPhase,
            state: stateMap,
            interceptorIndex: cargo.line === "QC" ? 9 : Math.max(1, Math.min(9, Math.round(nextProgress * 9)))
          };
        }),
        stackedCargoIds
      );

      const robot = buildMainRobotState(cargos, stackedCargoIds, state.robot, speedFactor, state.connectionStatus);
      const interceptorRobots = buildInterceptorRobots(cargos, state.interceptorRobots, speedFactor);
      let outboundPallets = advanceOutboundPallets(state.outboundPallets, speedFactor);

      if (state.connectionStatus !== "live" && robot.mode === "placing" && robot.phase === "place" && robot.cycleProgress >= 0.99) {
        const activeCargoId = robot.activeCargoId;
        if (activeCargoId && !stackedCargoIds.includes(activeCargoId)) {
          stackedCargoIds = [...stackedCargoIds, activeCargoId].slice(-27);
          events = appendEvent(events, "Pallet cell filled", `${activeCargoId} locked into the current pallet layer`, "accent");
        }
      }

      const release = releaseCompletedPallet(stackedCargoIds, outboundPallets, events, state.releasedStackBaseline);
      stackedCargoIds = release.stackedCargoIds;
      outboundPallets = release.outboundPallets;
      events = release.events;

      return {
        cargos: attachPalletTarget(cargos, stackedCargoIds),
        palletLayers: createLayersFromStack(stackedCargoIds),
        stackedCargoIds,
        robot,
        interceptorRobots,
        outboundPallets,
        releasedStackBaseline: release.releasedStackBaseline,
        throughput: state.throughput + (outboundPallets.some((pallet) => pallet.status === "moving") ? 1 : 0),
        events
      };
    })
}));

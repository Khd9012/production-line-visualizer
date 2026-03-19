import { create } from "zustand";
import { railSegments } from "../data/layout";
import type { Cargo, CargoState, EventItem, PalletCell, PalletLayer, RobotState } from "../types";

type SimulationState = {
  cargos: Cargo[];
  palletLayers: PalletLayer[];
  robot: RobotState;
  throughput: number;
  activeRecipe: string;
  selectedPanel: "overview" | "robot" | "pallet";
  events: EventItem[];
  tick: () => void;
  setSelectedPanel: (panel: "overview" | "robot" | "pallet") => void;
};

const formatTime = () =>
  new Date().toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });

const createCells = (filledCount: number, layer: number): PalletCell[] => {
  const cells: PalletCell[] = [];
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      const index = row * 3 + col;
      cells.push({
        row,
        col,
        filled: index < filledCount,
        color: index < filledCount ? ["#ffb84d", "#4ecdc4", "#ff6b6b"][layer % 3] : undefined,
        cargoId: index < filledCount ? `L${layer + 1}-${index + 1}` : undefined
      });
    }
  }
  return cells;
};

const createInitialLayers = (): PalletLayer[] => [
  { layer: 1, filledCount: 9, totalCount: 9, cells: createCells(9, 0) },
  { layer: 2, filledCount: 6, totalCount: 9, cells: createCells(6, 1) },
  { layer: 3, filledCount: 2, totalCount: 9, cells: createCells(2, 2) }
];

const createInitialCargos = (): Cargo[] => [
  { id: "BX-201", segmentIndex: 0, progress: 0.28, line: "A", state: "moving", color: "#ffb84d" },
  { id: "BX-202", segmentIndex: 1, progress: 0.65, line: "A", state: "moving", color: "#4ecdc4" },
  { id: "BX-203", segmentIndex: 3, progress: 0.33, line: "A", state: "buffered", color: "#ff6b6b" },
  { id: "BX-204", segmentIndex: 4, progress: 0.82, line: "A", state: "picked", color: "#ffd166" }
];

const appendEvent = (events: EventItem[], title: string, detail: string, tone: EventItem["tone"]): EventItem[] =>
  [{ id: `${Date.now()}-${Math.random()}`, time: formatTime(), title, detail, tone }, ...events].slice(0, 8);

export const useSimulationStore = create<SimulationState>((set) => ({
  cargos: createInitialCargos(),
  palletLayers: createInitialLayers(),
  robot: {
    mode: "tracking",
    armX: 716,
    armY: 180,
    activeCargoId: "BX-204",
    cycleProgress: 0.46
  },
  throughput: 148,
  activeRecipe: "9-box brick stack / 3 layers",
  selectedPanel: "overview",
  events: [
    { id: "evt-1", time: formatTime(), title: "Pallet Layer 3", detail: "BX-204 placed at row 1 / col 3", tone: "accent" },
    { id: "evt-2", time: formatTime(), title: "Buffer Ready", detail: "BUF-02 waiting for palletizer pickup", tone: "normal" },
    { id: "evt-3", time: formatTime(), title: "Robot Cycle", detail: "Arm tracking inbound cargo on PICK-01", tone: "normal" }
  ],
  setSelectedPanel: (selectedPanel) => set({ selectedPanel }),
  tick: () =>
    set((state) => {
      const nextCargos = state.cargos.map((cargo) => {
        if (cargo.state === "stacked") {
          return cargo;
        }

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

        return {
          ...cargo,
          segmentIndex: nextSegmentIndex,
          progress: nextProgress,
          state: nextState
        };
      });

      const leadCargo = nextCargos[nextCargos.length - 1];
      const robotMode: RobotState["mode"] =
        leadCargo.state === "picked" ? "tracking" : leadCargo.state === "stacked" ? "placing" : "idle";

      const cycleProgress = (state.robot.cycleProgress + 0.08) % 1;
      const armX = 710 - cycleProgress * 96;
      const armY = 172 + Math.sin(cycleProgress * Math.PI) * 116;

      let nextLayers = state.palletLayers;
      let nextThroughput = state.throughput;
      let nextEvents = state.events;

      if (leadCargo.state === "stacked" && state.robot.mode !== "placing") {
        nextThroughput += 1;

        nextLayers = state.palletLayers.map((layer, layerIndex) => {
          if (layer.filledCount < layer.totalCount) {
            const filledCount = layer.filledCount + 1;
            const updatedLayer = {
              ...layer,
              filledCount,
              cells: createCells(filledCount, layerIndex)
            };
            nextEvents = appendEvent(
              state.events,
              `Layer ${layer.layer} stacked`,
              `${leadCargo.id} placed on pallet at slot ${filledCount}`,
              "accent"
            );
            return updatedLayer;
          }
          return layer;
        });

        nextCargos[nextCargos.length - 1] = {
          id: `BX-${200 + nextThroughput}`,
          segmentIndex: 0,
          progress: 0,
          line: "A",
          state: "queued",
          color: ["#ffb84d", "#4ecdc4", "#ff6b6b", "#ffd166"][nextThroughput % 4]
        };
      }

      return {
        cargos: nextCargos,
        palletLayers: nextLayers,
        robot: {
          mode: robotMode,
          armX,
          armY,
          activeCargoId: leadCargo.id,
          cycleProgress
        },
        throughput: nextThroughput,
        events:
          nextEvents === state.events
            ? appendEvent(state.events, "Rail Flow", `${nextCargos[0].id} entered ${railSegments[0].label}`, "normal")
            : nextEvents
      };
    })
}));

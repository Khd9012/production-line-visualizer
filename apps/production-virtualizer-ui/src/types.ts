export type CargoState = "queued" | "moving" | "buffered" | "picked" | "stacked";

export type RailSegment = {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  status: "idle" | "active" | "blocked";
};

export type Cargo = {
  id: string;
  segmentIndex: number;
  progress: number;
  line: string;
  state: CargoState;
  color: string;
};

export type PalletCell = {
  row: number;
  col: number;
  filled: boolean;
  color?: string;
  cargoId?: string;
};

export type PalletLayer = {
  layer: number;
  filledCount: number;
  totalCount: number;
  cells: PalletCell[];
};

export type EventItem = {
  id: string;
  time: string;
  title: string;
  detail: string;
  tone: "normal" | "accent" | "warn";
};

export type RobotState = {
  mode: "idle" | "tracking" | "placing";
  armX: number;
  armY: number;
  activeCargoId?: string;
  cycleProgress: number;
};

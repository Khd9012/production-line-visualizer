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
  x?: number;
  y?: number;
  sourceDeviceCode?: string;
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

export type CoreDeviceStatus = {
  areaType?: string;
  deviceCode: string;
  deviceType?: string;
  deviceName?: string;
  ctrlStatus?: string;
  status?: string;
  statusCode?: string;
  errorLevel?: number;
  statusDesc?: string;
  workId?: string;
  triggeredAt?: string;
  detail?: Record<string, string>;
};

export type TrackNode = {
  deviceCode: string;
  line: string;
  label: string;
  x: number;
  y: number;
  kind: "buffer" | "inspection";
};

export type CoreRobotInfo = {
  workId: string;
  robotNo: number;
  loadingLine: number;
  unLoadingLine: number;
  mBoxCd: number;
  totalOrderCount: number;
  statusCode: number;
  motionCode: number;
  errorCode: number;
  totalRt1Count: number;
  totalRt2Count: number;
  totalRt3Count: number;
  totalRt4Count: number;
  ready: boolean;
};

export type CoreApmStatus = {
  workId: string;
  layer: string;
  orderQty: string;
  completeQty: string;
  process: string;
  placeProcess: string;
  status: string;
  inputStatus: string;
};

export type CoreSimulationSnapshot = {
  robots: CoreRobotInfo[];
  apmStatus: CoreApmStatus;
  bmStatus: Record<string, {
    workId: string;
    deviceCode: string;
    status: string;
    statusCode: string;
    processCode: string;
    orderQty: number;
    compQty: number;
    labelCompQty: number;
    mBoxCd: number;
  }>;
  palletMotion: Record<string, string>;
  lineStates: Record<string, { state: string }>;
  deviceCount: number;
};

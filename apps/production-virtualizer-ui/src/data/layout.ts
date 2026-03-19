import type { FocusLine, ProcessZone, RailSegment, TrackNode } from "../types";

export const processZones: ProcessZone[] = [
  {
    id: "intake",
    label: "Inbound Feed Zone",
    description: "Three source infeed tracks supplying the main trunk conveyor",
    x: 36,
    y: 72,
    width: 344,
    height: 506,
    tone: "teal"
  },
  {
    id: "buffer",
    label: "Main Trunk + Line Split Zone",
    description: "Long transfer rail branching into seven palletizing lanes",
    x: 396,
    y: 72,
    width: 720,
    height: 506,
    tone: "teal"
  },
  {
    id: "inspection",
    label: "QC Hold Zone",
    description: "Verification buffer and queueing before palletizer pickup",
    x: 1134,
    y: 72,
    width: 182,
    height: 506,
    tone: "amber"
  },
  {
    id: "stacking",
    label: "Palletizing Zone",
    description: "Two interceptor robots plus final palletizer place cell",
    x: 1334,
    y: 72,
    width: 294,
    height: 332,
    tone: "blue"
  },
  {
    id: "outbound",
    label: "Outbound Zone",
    description: "Completed three-layer pallets release toward shipping docks",
    x: 1334,
    y: 424,
    width: 294,
    height: 154,
    tone: "rose"
  }
];

export const inboundRail: RailSegment[] = [
  { id: "SRC-A", label: "SRC-A", x: 80, y: 122, width: 210, height: 44, status: "active" },
  { id: "SRC-B", label: "SRC-B", x: 80, y: 248, width: 210, height: 44, status: "active" },
  { id: "SRC-C", label: "SRC-C", x: 80, y: 374, width: 210, height: 44, status: "active" },
  { id: "TRUNK", label: "MAIN TRUNK", x: 392, y: 108, width: 664, height: 48, status: "active" },
  { id: "QC-HOLD", label: "QC HOLD", x: 1180, y: 112, width: 72, height: 390, status: "active" }
];

export const palletizerRail: RailSegment[] = [
  { id: "INT-A", label: "INT-R1 CELL", x: 1360, y: 132, width: 206, height: 56, status: "active" },
  { id: "INT-B", label: "INT-R2 CELL", x: 1360, y: 256, width: 206, height: 56, status: "active" },
  { id: "PAL-PLACE", label: "PALLET PLACE", x: 1390, y: 326, width: 170, height: 54, status: "active" },
  { id: "OUT-01", label: "OUTBOUND STAGING", x: 1384, y: 454, width: 186, height: 50, status: "active" }
];

export const railSegments = [...inboundRail, ...palletizerRail];

export const intakeSources = [
  { id: "SRC-A", x: 106, y: 144, toX: 346, toY: 144 },
  { id: "SRC-B", x: 106, y: 270, toX: 346, toY: 270 },
  { id: "SRC-C", x: 106, y: 396, toX: 346, toY: 396 }
];

const bufferLineBases = [
  { line: "L1", prefix: "243", y: 170 },
  { line: "L2", prefix: "244", y: 220 },
  { line: "L3", prefix: "245", y: 270 },
  { line: "L4", prefix: "246", y: 320 },
  { line: "L5", prefix: "247", y: 370 },
  { line: "L6", prefix: "248", y: 420 },
  { line: "L7", prefix: "249", y: 470 }
];

export const trackNodes: TrackNode[] = [
  ...bufferLineBases.flatMap(({ line, prefix, y }) =>
    Array.from({ length: 9 }, (_, index) => ({
      deviceCode: `${prefix}${String(index + 1).padStart(2, "0")}`,
      line,
      label: `${line}-${index + 1}`,
      x: 620 + index * 42,
      y,
      kind: "buffer" as const
    }))
  ),
  ...Array.from({ length: 9 }, (_, index) => ({
    deviceCode: `249${String(index + 26).padStart(2, "0")}`,
    line: "QC",
    label: `QC-${index + 1}`,
    x: 1190,
    y: 138 + index * 38,
    kind: "inspection" as const
  }))
];

export const trackNodeMap = Object.fromEntries(trackNodes.map((node) => [node.deviceCode, node]));

const palletGridBase = {
  x: 1404,
  y: 336,
  cell: 42,
  gap: 8
};

export const palletCellAnchors = Array.from({ length: 9 }, (_, index) => {
  const row = Math.floor(index / 3);
  const col = index % 3;
  return {
    row,
    col,
    x: palletGridBase.x + col * (palletGridBase.cell + palletGridBase.gap),
    y: palletGridBase.y + row * (palletGridBase.cell + palletGridBase.gap),
    slotLabel: `${row + 1}-${col + 1}`
  };
});

export const outboundDocks = [
  { id: "OUT-A", x: 1382, y: 462, width: 58, height: 46 },
  { id: "OUT-B", x: 1452, y: 462, width: 58, height: 46 },
  { id: "OUT-C", x: 1522, y: 462, width: 58, height: 46 }
];

export const mainRailPath = [
  { x: 346, y: 144 },
  { x: 438, y: 144 },
  { x: 622, y: 144 },
  { x: 824, y: 144 },
  { x: 1048, y: 144 },
  { x: 1180, y: 144 }
];

export const sourceTrunkJunctions = {
  "SRC-A": { splitX: 308, splitY: 144 },
  "SRC-B": { splitX: 326, splitY: 220 },
  "SRC-C": { splitX: 344, splitY: 296 }
} as const;

export const lineBranchMap = {
  L1: { source: "SRC-A", splitX: 522, mergeY: 170, interceptorX: 1116, interceptorY: 170 },
  L2: { source: "SRC-A", splitX: 566, mergeY: 220, interceptorX: 1116, interceptorY: 220 },
  L3: { source: "SRC-B", splitX: 610, mergeY: 270, interceptorX: 1116, interceptorY: 270 },
  L4: { source: "SRC-B", splitX: 654, mergeY: 320, interceptorX: 1116, interceptorY: 320 },
  L5: { source: "SRC-C", splitX: 698, mergeY: 370, interceptorX: 1116, interceptorY: 370 },
  L6: { source: "SRC-C", splitX: 742, mergeY: 420, interceptorX: 1116, interceptorY: 420 },
  L7: { source: "SRC-C", splitX: 786, mergeY: 470, interceptorX: 1116, interceptorY: 470 },
  QC: { source: "SRC-C", splitX: 1180, mergeY: 298, interceptorX: 1192, interceptorY: 298 }
} as const;

export const pickupAnchor = { x: 1368, y: 228 };

export const focusViewBoxes: Record<FocusLine, string> = {
  ALL: "0 0 1660 620",
  L1: "250 110 1120 150",
  L2: "250 160 1120 150",
  L3: "250 210 1120 150",
  L4: "250 260 1120 150",
  L5: "250 310 1120 150",
  L6: "250 360 1120 150",
  L7: "250 410 1120 150",
  QC: "1080 90 520 470"
};

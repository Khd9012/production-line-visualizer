import { focusViewBoxes, lineBranchMap, mainRailPath, outboundDocks, palletCellAnchors, pickupAnchor, processZones, trackNodes } from "../data/layout";
import type { Cargo, FocusLine, PalletLayer, PlaybackSpeed, RobotState } from "../types";

type FloorViewProps = {
  cargos: Cargo[];
  robot: RobotState;
  layers: PalletLayer[];
  focusedLine: FocusLine;
  playbackSpeed: PlaybackSpeed;
};

const zoneToneMap = {
  teal: { fill: "rgba(28, 77, 77, 0.26)", stroke: "#52c6be" },
  amber: { fill: "rgba(103, 74, 19, 0.25)", stroke: "#ffcb6b" },
  blue: { fill: "rgba(26, 48, 92, 0.26)", stroke: "#77a7ff" },
  rose: { fill: "rgba(102, 42, 58, 0.26)", stroke: "#ff8ca1" }
};

const lineLabelY: Record<string, number> = {
  L1: 152,
  L2: 196,
  L3: 240,
  L4: 284,
  L5: 328,
  L6: 372,
  L7: 416
};

const getPalletOffset = (layer: number) => ({
  x: (layer - 1) * 5,
  y: (3 - layer) * 11
});

const getNextTargetCell = (layers: PalletLayer[]) => {
  const totalFilled = layers.reduce((sum, layer) => sum + layer.filledCount, 0);
  if (totalFilled >= 27) {
    return null;
  }

  const layerIndex = Math.floor(totalFilled / 9);
  const cellIndex = totalFilled % 9;
  const layer = layers[layerIndex];
  const cell = layer.cells[cellIndex];
  const offset = getPalletOffset(layer.layer);

  return {
    ...cell,
    layer: layer.layer,
    renderX: cell.x + offset.x,
    renderY: cell.y - offset.y
  };
};

const isLineVisible = (line: string, focusedLine: FocusLine) => focusedLine === "ALL" || focusedLine === line;
const mainRailPathD = `M ${mainRailPath.map((point) => `${point.x} ${point.y}`).join(" L ")}`;

export function FloorView({ cargos, robot, layers, focusedLine, playbackSpeed }: FloorViewProps) {
  const nextTargetCell = getNextTargetCell(layers);
  const activeCargo = cargos.find((cargo) => cargo.id === robot.activeCargoId) ?? cargos.find((cargo) => cargo.state === "picked");
  const transitionDuration = `${Math.max(0.2, 1.15 / playbackSpeed)}s`;

  const placingCargoPosition =
    activeCargo?.palletTarget && activeCargo.x !== undefined && activeCargo.y !== undefined && robot.mode === "placing"
      ? {
          x: activeCargo.x + (activeCargo.palletTarget.x - activeCargo.x) * robot.cycleProgress,
          y:
            activeCargo.y +
            (activeCargo.palletTarget.y - activeCargo.y) * robot.cycleProgress -
            Math.sin(robot.cycleProgress * Math.PI) * 42
        }
      : null;

  const trackingCargoPosition =
    activeCargo?.x !== undefined && activeCargo?.y !== undefined && robot.mode === "tracking"
      ? {
          x: activeCargo.x + (900 - activeCargo.x) * robot.cycleProgress,
          y: activeCargo.y + (176 - activeCargo.y) * robot.cycleProgress - Math.sin(robot.cycleProgress * Math.PI) * 28
        }
      : null;

  return (
    <section className="panel floor-panel">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Digital Twin</p>
          <h3>Process Map by Zone</h3>
        </div>
        <span className="panel__pill">{focusedLine === "ALL" ? "Whole Plant" : `${focusedLine} zoom`}</span>
      </div>

      <div className="floor-canvas">
        <svg viewBox={focusViewBoxes[focusedLine]} role="img" aria-label="Production virtualizer process map">
          <defs>
            <linearGradient id="floorGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#16324c" />
              <stop offset="100%" stopColor="#07111d" />
            </linearGradient>
            <radialGradient id="stackGlow" cx="50%" cy="45%" r="62%">
              <stop offset="0%" stopColor="#ffd166" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#ffd166" stopOpacity="0" />
            </radialGradient>
          </defs>

          <rect x="0" y="0" width="1180" height="560" rx="28" fill="url(#floorGradient)" />
          <rect x="20" y="22" width="1140" height="516" rx="26" fill="rgba(6, 15, 26, 0.22)" stroke="rgba(126, 166, 205, 0.18)" />

          {processZones.map((zone) => {
            const tone = zoneToneMap[zone.tone];
            return (
              <g key={zone.id}>
                <rect x={zone.x} y={zone.y} width={zone.width} height={zone.height} rx="26" fill={tone.fill} stroke={tone.stroke} strokeWidth="2.5" />
                <text x={zone.x + 22} y={zone.y + 28} fill="#f1f6fb" fontSize="20" fontWeight="700">
                  {zone.label}
                </text>
                <text x={zone.x + 22} y={zone.y + 50} fill="#9cb9d2" fontSize="12">
                  {zone.description}
                </text>
              </g>
            );
          })}

          {Object.entries(lineLabelY).map(([line, y]) => (
            <g key={line} opacity={isLineVisible(line, focusedLine) ? 1 : 0.16}>
              <text x="64" y={y} fill="#b7d2ea" fontSize="14" fontWeight="700">
                {line}
              </text>
              <line x1="250" y1={y - 4} x2="630" y2={y - 4} stroke={focusedLine === line ? "#7dd3c4" : "#284863"} strokeWidth={focusedLine === line ? "6" : "4"} strokeLinecap="round" />
            </g>
          ))}

          <path d={mainRailPathD} fill="none" stroke="#5b7894" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
          <path d={mainRailPathD} fill="none" stroke="#9ec6ea" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />

          {Object.entries(lineBranchMap)
            .filter(([line]) => line !== "QC")
            .map(([line, branch]) => {
              const active = isLineVisible(line, focusedLine);
              return (
                <g key={line} opacity={active ? 1 : 0.12}>
                  <path
                    d={`M ${branch.splitX} 118 Q ${branch.splitX + 16} ${branch.mergeY - 22} ${branch.splitX + 42} ${branch.mergeY} L ${branch.interceptorX} ${branch.interceptorY}`}
                    fill="none"
                    stroke="#26435f"
                    strokeWidth="14"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d={`M ${branch.splitX} 118 Q ${branch.splitX + 16} ${branch.mergeY - 22} ${branch.splitX + 42} ${branch.mergeY} L ${branch.interceptorX} ${branch.interceptorY}`}
                    fill="none"
                    stroke={focusedLine === line ? "#7dd3c4" : "#4f7593"}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <rect x={branch.interceptorX - 16} y={branch.interceptorY - 14} width="28" height="28" rx="8" fill="rgba(15, 32, 49, 0.9)" stroke="#8eb2cf" />
                  <text x={branch.interceptorX - 2} y={branch.interceptorY + 5} fill="#cfe2f3" fontSize="10" textAnchor="middle">
                    I
                  </text>
                </g>
              );
            })}

          <path d="M 748 132 L 748 414" fill="none" stroke="#4f6c8e" strokeWidth="16" strokeLinecap="round" opacity="0.4" />
          <path d="M 748 132 L 748 414" fill="none" stroke="#ffd166" strokeWidth="4" strokeLinecap="round" opacity="0.82" />
          <path d={`M 748 250 C 816 250, 848 210, ${pickupAnchor.x} ${pickupAnchor.y}`} fill="none" stroke="#6789ad" strokeWidth="10" strokeLinecap="round" opacity="0.5" />
          <path d={`M 748 250 C 816 250, 848 210, ${pickupAnchor.x} ${pickupAnchor.y}`} fill="none" stroke="#8bb0d7" strokeWidth="3" strokeLinecap="round" opacity="0.8" />

          {trackNodes.map((node) => {
            const active = isLineVisible(node.line, focusedLine);
            const width = node.kind === "inspection" ? 54 : 34;
            const height = node.kind === "inspection" ? 24 : 18;
            return (
              <g key={node.deviceCode} opacity={active ? 1 : 0.14}>
                <rect
                  x={node.x}
                  y={node.y}
                  width={width}
                  height={height}
                  rx="6"
                  fill={node.kind === "inspection" ? "#172f48" : "#102033"}
                  stroke={node.kind === "inspection" ? "#ffd166" : "#406586"}
                />
                <text x={node.x + width / 2} y={node.y - 8} fill="#7f9ab2" fontSize="10" textAnchor="middle">
                  {node.deviceCode}
                </text>
              </g>
            );
          })}

          <g>
            <rect x="912" y="126" width="178" height="42" rx="18" fill="#12253b" stroke="#4c759c" />
            <text x="930" y="152" fill="#dbe8f4" fontSize="14" fontWeight="700">
              Robot pick corridor
            </text>
            <rect x="912" y="215" width="178" height="42" rx="18" fill="#13263d" stroke="#4f78b6" />
            <text x="930" y="241" fill="#dbe8f4" fontSize="14" fontWeight="700">
              Precision place corridor
            </text>
          </g>

          <g>
            <circle cx="1004" cy="268" r="86" fill="url(#stackGlow)" />
            <rect x="928" y="212" width="162" height="132" rx="24" fill="rgba(10, 22, 35, 0.78)" stroke="#7395bf" strokeWidth="2.5" />
            <text x="946" y="202" fill="#eef6ff" fontSize="14" fontWeight="700">
              Pallet target coordinates
            </text>
            <rect x="936" y="220" width="146" height="116" rx="14" fill="#23384d" stroke="#dce7f3" strokeDasharray="6 6" />

            {layers.flatMap((layer) =>
              layer.cells
                .filter((cell) => cell.filled)
                .map((cell) => {
                  const offset = getPalletOffset(layer.layer);
                  return (
                    <g key={`${layer.layer}-${cell.row}-${cell.col}`}>
                      <rect
                        x={cell.x + offset.x}
                        y={cell.y - offset.y}
                        width="38"
                        height="38"
                        rx="8"
                        fill={cell.color}
                        stroke="rgba(255,255,255,0.65)"
                        strokeWidth="2"
                      />
                      <text x={cell.x + offset.x + 19} y={cell.y - offset.y + 24} fill="#08111c" fontSize="11" fontWeight="700" textAnchor="middle">
                        {cell.slotLabel}
                      </text>
                    </g>
                  );
                })
            )}

            {nextTargetCell ? (
              <g>
                <rect
                  x={nextTargetCell.renderX}
                  y={nextTargetCell.renderY}
                  width="38"
                  height="38"
                  rx="8"
                  fill="rgba(255, 209, 102, 0.12)"
                  stroke="#ffd166"
                  strokeWidth="2.5"
                  strokeDasharray="6 5"
                />
                <text x={nextTargetCell.renderX + 19} y={nextTargetCell.renderY - 10} fill="#ffd166" fontSize="12" textAnchor="middle">
                  next L{nextTargetCell.layer}-{nextTargetCell.slotLabel}
                </text>
              </g>
            ) : null}
          </g>

          <g>
            <circle cx="1004" cy="148" r="22" fill="#244057" stroke="#dce7f3" strokeWidth="3" />
            <line x1="1004" y1="148" x2={robot.armX} y2={robot.armY} stroke="#d7e6f3" strokeWidth="10" strokeLinecap="round" />
            <line x1="1004" y1="148" x2={robot.armX} y2={robot.armY} stroke="#607e9a" strokeWidth="4" strokeLinecap="round" />
            <circle cx={pickupAnchor.x} cy={pickupAnchor.y} r="16" fill="#13263d" stroke="#9bc2e3" strokeWidth="2.5" />
            <text x={pickupAnchor.x} y={pickupAnchor.y + 4} fill="#eef7ff" fontSize="10" textAnchor="middle">
              PICK
            </text>
            <circle cx={robot.armX} cy={robot.armY} r="18" fill="#f25f5c" style={{ transitionDuration }} />
            <circle cx={robot.armX} cy={robot.armY} r="7" fill="#ffe9d0" style={{ transitionDuration }} />
          </g>

          {cargos.map((cargo) => {
            const visible = focusedLine === "ALL" || cargo.line === focusedLine || (focusedLine === "QC" && cargo.line === "QC");
            return (
              <g key={cargo.id} opacity={visible ? 1 : 0.14} style={{ transitionDuration }}>
                <rect
                  x={cargo.x}
                  y={cargo.y}
                  width="24"
                  height="24"
                  rx="7"
                  fill={cargo.color}
                  stroke="#fdfdfd"
                  strokeWidth="2"
                  style={{ transitionDuration }}
                />
                <text x={(cargo.x ?? 0) - 2} y={(cargo.y ?? 0) + 38} fill="#dce7f3" fontSize="11">
                  {cargo.id}
                </text>
                {cargo.sourceDeviceCode ? (
                  <text x={(cargo.x ?? 0) - 1} y={(cargo.y ?? 0) + 51} fill="#7dd3c4" fontSize="10">
                    {cargo.sourceDeviceCode}
                  </text>
                ) : null}
                {cargo.interceptorIndex ? (
                  <text x={(cargo.x ?? 0) + 12} y={(cargo.y ?? 0) - 10} fill="#ffcf7e" fontSize="10" textAnchor="middle">
                    Z{cargo.interceptorIndex}
                  </text>
                ) : null}
              </g>
            );
          })}

          {trackingCargoPosition && activeCargo ? (
            <g style={{ transitionDuration }}>
              <rect x={trackingCargoPosition.x} y={trackingCargoPosition.y} width="24" height="24" rx="7" fill={activeCargo.color} stroke="#ffffff" strokeWidth="2" />
              <text x={trackingCargoPosition.x - 10} y={trackingCargoPosition.y - 10} fill="#9be7db" fontSize="11">
                pickup delay
              </text>
            </g>
          ) : null}

          {placingCargoPosition && activeCargo ? (
            <g style={{ transitionDuration }}>
              <rect x={placingCargoPosition.x} y={placingCargoPosition.y} width="24" height="24" rx="7" fill={activeCargo.color} stroke="#ffffff" strokeWidth="2" />
              <text x={placingCargoPosition.x - 6} y={placingCargoPosition.y - 12} fill="#ffd166" fontSize="11">
                staged placement
              </text>
            </g>
          ) : null}

          {outboundDocks.map((dock, index) => (
            <g key={dock.id}>
              <rect x={dock.x} y={dock.y} width={dock.width} height={dock.height} rx="12" fill="#1e2936" stroke="#ff9c8f" />
              <text x={dock.x + 12} y={dock.y + 26} fill="#f6e2de" fontSize="12" fontWeight="700">
                Dock {index + 1}
              </text>
            </g>
          ))}

          <g>
            <text x="54" y="58" fill="#eff6fc" fontSize="30" fontWeight="700">
              Rail, inspection, stacking, and outbound flow
            </text>
            <text x="54" y="78" fill="#8cb4d6" fontSize="14">
              Main infeed rail branches into interceptor zones, then verified cargo is staged before a slower palletizer place cycle.
            </text>
          </g>

          {palletCellAnchors.map((anchor) => (
            <text key={`slot-${anchor.slotLabel}`} x={anchor.x + 19} y={anchor.y + 54} fill="#66839d" fontSize="10" textAnchor="middle">
              {anchor.slotLabel}
            </text>
          ))}
        </svg>
      </div>
    </section>
  );
}

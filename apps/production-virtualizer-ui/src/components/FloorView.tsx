import { railSegments, trackNodes } from "../data/layout";
import type { Cargo, RobotState } from "../types";

type FloorViewProps = {
  cargos: Cargo[];
  robot: RobotState;
};

const segmentColor = {
  idle: "#234160",
  active: "#49dcb1",
  blocked: "#ff6b6b"
};

export function FloorView({ cargos, robot }: FloorViewProps) {
  return (
    <section className="panel floor-panel">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Digital Twin</p>
          <h3>Realtime Rail and Palletizer View</h3>
        </div>
        <span className="panel__pill">2D Flow</span>
      </div>

      <div className="floor-canvas">
        <svg viewBox="0 0 980 520" role="img" aria-label="Production virtualizer floor map">
          <defs>
            <linearGradient id="floorGlow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#16324c" />
              <stop offset="100%" stopColor="#0b1728" />
            </linearGradient>
            <radialGradient id="palletGlow" cx="50%" cy="50%" r="55%">
              <stop offset="0%" stopColor="#ffd166" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#ffd166" stopOpacity="0" />
            </radialGradient>
          </defs>

          <rect x="0" y="0" width="980" height="520" rx="28" fill="url(#floorGlow)" />
          <rect x="54" y="86" width="588" height="322" rx="24" fill="rgba(10,22,35,0.38)" stroke="#20364f" />

          {railSegments.map((segment) => (
            <g key={segment.id}>
              <rect
                x={segment.x}
                y={segment.y}
                width={segment.width}
                height={segment.height}
                rx="16"
                fill="#102033"
                stroke={segmentColor[segment.status]}
                strokeWidth="3"
              />
              <text x={segment.x + 18} y={segment.y + 29} fill="#d9e8f5" fontSize="15" fontWeight="600">
                {segment.label}
              </text>
            </g>
          ))}

          {["L1", "L2", "L3", "L4", "L5", "L6", "L7"].map((line, index) => (
            <g key={line}>
              <text x="58" y={118 + index * 44} fill="#8cb4d6" fontSize="13" fontWeight="700">
                {line}
              </text>
              <line
                x1="80"
                y1={132 + index * 44}
                x2="608"
                y2={132 + index * 44}
                stroke="#234160"
                strokeWidth="4"
                strokeLinecap="round"
              />
            </g>
          ))}

          {trackNodes.map((node) => (
            <g key={node.deviceCode}>
              <rect
                x={node.x}
                y={node.y}
                width={node.kind === "inspection" ? 44 : 36}
                height={node.kind === "inspection" ? 22 : 16}
                rx="6"
                fill={node.kind === "inspection" ? "#17324d" : "#102033"}
                stroke={node.kind === "inspection" ? "#ffd166" : "#36597d"}
              />
              <text
                x={node.x + (node.kind === "inspection" ? 22 : 18)}
                y={node.y - 6}
                fill="#7f9ab2"
                fontSize="10"
                textAnchor="middle"
              >
                {node.deviceCode}
              </text>
            </g>
          ))}

          <g>
            <rect x="615" y="165" width="235" height="230" rx="28" fill="#13263d" stroke="#2d4b6f" strokeWidth="3" />
            <text x="644" y="198" fill="#f5f8fb" fontSize="19" fontWeight="700">
              Robotic Palletizer
            </text>
            <circle cx="770" cy="348" r="68" fill="url(#palletGlow)" />
            <rect x="724" y="306" width="92" height="92" rx="10" fill="#4f6583" stroke="#dce7f3" strokeDasharray="6 6" />
            <text x="738" y="422" fill="#dce7f3" fontSize="14">
              PALLET ZONE
            </text>
          </g>

          <g>
            <circle cx={robot.armX} cy={robot.armY} r="22" fill="#f25f5c" />
            <rect
              x={robot.armX - 10}
              y={robot.armY - 86}
              width="20"
              height="86"
              rx="10"
              fill="#c3d7eb"
              transform={`rotate(${16 - robot.cycleProgress * 30} ${robot.armX} ${robot.armY})`}
            />
            <circle cx="716" cy="176" r="30" fill="#27435f" stroke="#dce7f3" strokeWidth="3" />
          </g>

          {cargos.map((cargo) => {
            const segment = railSegments[cargo.segmentIndex];
            const x = cargo.x ?? segment.x + 18 + cargo.progress * (segment.width - 44);
            const y = cargo.y ?? segment.y + 10;

            return (
              <g key={cargo.id}>
                <rect x={x} y={y} width="26" height="26" rx="7" fill={cargo.color} stroke="#fdfdfd" strokeWidth="2" />
                <text x={x - 3} y={y + 43} fill="#dce7f3" fontSize="12">
                  {cargo.id}
                </text>
                {cargo.sourceDeviceCode ? (
                  <text x={x - 1} y={y + 56} fill="#7dd3c4" fontSize="10">
                    {cargo.sourceDeviceCode}
                  </text>
                ) : null}
              </g>
            );
          })}

          <g>
            <text x="70" y="74" fill="#eff6fc" fontSize="28" fontWeight="700">
              Live Buffer and Inspection Flow
            </text>
            <text x="70" y="98" fill="#8cb4d6" fontSize="14">
              core device codes 24301-24934 mapped to on-screen rail slots and palletizer handoff
            </text>
          </g>
        </svg>
      </div>
    </section>
  );
}

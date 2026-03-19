import type { CoreApmStatus, CoreRobotInfo, InterceptorRobotState, OutboundPallet } from "../types";

type RobotFleetPanelProps = {
  robots: CoreRobotInfo[];
  apmStatus: CoreApmStatus | null;
  interceptorRobots: InterceptorRobotState[];
  outboundPallets: OutboundPallet[];
};

export function RobotFleetPanel({ robots, apmStatus, interceptorRobots, outboundPallets }: RobotFleetPanelProps) {
  return (
    <section className="panel robot-fleet-panel">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Robot Cells</p>
          <h3>Palletizer and APM Activity</h3>
        </div>
        <span className="panel__pill">{robots.length} robots</span>
      </div>

      <div className="robot-fleet-list">
        {robots.map((robot) => (
          <article key={robot.robotNo} className="robot-card">
            <div className="robot-card__header">
              <strong>Robot {robot.robotNo}</strong>
              <span>{robot.ready ? "ready" : "running"}</span>
            </div>
            <div className="robot-card__grid">
              <div>
                <span>Load line</span>
                <strong>L{robot.loadingLine || "-"}</strong>
              </div>
              <div>
                <span>Unload line</span>
                <strong>L{robot.unLoadingLine || "-"}</strong>
              </div>
              <div>
                <span>Order qty</span>
                <strong>{robot.totalOrderCount || 0}</strong>
              </div>
              <div>
                <span>Box code</span>
                <strong>{robot.mBoxCd || 0}</strong>
              </div>
              <div>
                <span>Motion</span>
                <strong>{robot.motionCode || 0}</strong>
              </div>
              <div>
                <span>Error</span>
                <strong>{robot.errorCode || 0}</strong>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="robot-fleet-list">
        {interceptorRobots.map((robot) => (
          <article key={robot.id} className="robot-card">
            <div className="robot-card__header">
              <strong>{robot.label}</strong>
              <span>{robot.phase}</span>
            </div>
            <div className="robot-card__grid">
              <div>
                <span>Coverage</span>
                <strong>{robot.lineGroup}</strong>
              </div>
              <div>
                <span>Active cargo</span>
                <strong>{robot.activeCargoId ?? "idle"}</strong>
              </div>
              <div>
                <span>Cycle</span>
                <strong>{Math.round(robot.cycleProgress * 100)}%</strong>
              </div>
              <div>
                <span>Zone</span>
                <strong>{robot.zone}</strong>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="apm-card">
        <div className="apm-card__header">
          <strong>APM Stack Progress</strong>
          <span>{apmStatus?.workId ?? "idle"}</span>
        </div>
        <div className="apm-card__grid">
          <div>
            <span>Layers</span>
            <strong>{apmStatus?.layer ?? "0"}</strong>
          </div>
          <div>
            <span>Completed</span>
            <strong>
              {apmStatus?.completeQty ?? "0"} / {apmStatus?.orderQty ?? "0"}
            </strong>
          </div>
          <div>
            <span>Process</span>
            <strong>{apmStatus?.process ?? "0"}</strong>
          </div>
          <div>
            <span>Place</span>
            <strong>{apmStatus?.placeProcess ?? "0"}</strong>
          </div>
          <div>
            <span>Outbound</span>
            <strong>{outboundPallets.length}</strong>
          </div>
          <div>
            <span>Latest Dock</span>
            <strong>{outboundPallets.at(-1)?.dockId ?? "-"}</strong>
          </div>
        </div>
      </div>
    </section>
  );
}

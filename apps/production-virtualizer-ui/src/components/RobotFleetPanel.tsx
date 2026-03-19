import type { CoreApmStatus, CoreRobotInfo } from "../types";

type RobotFleetPanelProps = {
  robots: CoreRobotInfo[];
  apmStatus: CoreApmStatus | null;
};

export function RobotFleetPanel({ robots, apmStatus }: RobotFleetPanelProps) {
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
        </div>
      </div>
    </section>
  );
}

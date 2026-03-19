import type { Cargo, PalletLayer, RobotState } from "../types";

type DetailPanelProps = {
  activeRecipe: string;
  robot: RobotState;
  leadCargo: Cargo | undefined;
  layers: PalletLayer[];
  current: "overview" | "robot" | "pallet";
  connectionStatus: "connecting" | "live" | "offline";
  databaseAlive: boolean | null;
  schedulerSummary: string;
  liveDeviceCount: number;
  lastRealtimeAt: string | null;
};

export function DetailPanel({
  activeRecipe,
  robot,
  leadCargo,
  layers,
  current,
  connectionStatus,
  databaseAlive,
  schedulerSummary,
  liveDeviceCount,
  lastRealtimeAt
}: DetailPanelProps) {
  const currentLayer = layers.find((layer) => layer.filledCount < layer.totalCount) ?? layers[layers.length - 1];
  const fillRate = Math.round(
    (layers.reduce((sum, layer) => sum + layer.filledCount, 0) /
      layers.reduce((sum, layer) => sum + layer.totalCount, 0)) *
      100
  );

  return (
    <section className="panel detail-panel">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Inspector</p>
          <h3>
            {current === "overview" ? "Line Snapshot" : current === "robot" ? "Palletizer State" : "Pallet Status"}
          </h3>
        </div>
        <span className="panel__pill">{current.toUpperCase()}</span>
      </div>

      <div className="detail-block">
        <span className="detail-block__label">Active Recipe</span>
        <strong>{activeRecipe}</strong>
      </div>

      <div className="detail-grid">
        <div className="detail-card">
          <span>Robot Mode</span>
          <strong>{robot.mode}</strong>
        </div>
        <div className="detail-card">
          <span>Cycle Progress</span>
          <strong>{Math.round(robot.cycleProgress * 100)}%</strong>
        </div>
        <div className="detail-card">
          <span>Tracking Cargo</span>
          <strong>{leadCargo?.id ?? robot.activeCargoId ?? "None"}</strong>
        </div>
        <div className="detail-card">
          <span>Current Layer</span>
          <strong>{currentLayer.layer}</strong>
        </div>
      </div>

      <div className="detail-progress">
        <div className="detail-progress__labels">
          <span>Stack fill rate</span>
          <strong>{fillRate}%</strong>
        </div>
        <div className="detail-progress__track">
          <div className="detail-progress__bar" style={{ width: `${fillRate}%` }} />
        </div>
      </div>

      <div className="detail-list">
        <article>
          <span>Realtime Link</span>
          <strong>{connectionStatus}</strong>
        </article>
        <article>
          <span>Database Health</span>
          <strong>{databaseAlive === null ? "checking" : databaseAlive ? "healthy" : "offline"}</strong>
        </article>
        <article>
          <span>Scheduler State</span>
          <strong>{schedulerSummary}</strong>
        </article>
        <article>
          <span>Live Device Frames</span>
          <strong>
            {liveDeviceCount} devices {lastRealtimeAt ? `at ${lastRealtimeAt}` : ""}
          </strong>
        </article>
        <article>
          <span>Pick Position</span>
          <strong>BUF-02 / PICK-01 handoff</strong>
        </article>
        <article>
          <span>Place Position</span>
          <strong>Layer {currentLayer.layer} next slot {currentLayer.filledCount + 1}</strong>
        </article>
        <article>
          <span>Estimated Completion</span>
          <strong>{Math.max(0, 27 - layers.reduce((sum, layer) => sum + layer.filledCount, 0))} boxes left</strong>
        </article>
      </div>
    </section>
  );
}

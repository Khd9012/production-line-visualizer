import type { Cargo, FocusLine, InterceptorRobotState, OutboundPallet, PalletLayer, PlaybackSpeed, RobotState } from "../types";

type DetailPanelProps = {
  activeRecipe: string;
  robot: RobotState;
  interceptorRobots: InterceptorRobotState[];
  outboundPallets: OutboundPallet[];
  leadCargo: Cargo | undefined;
  layers: PalletLayer[];
  current: "overview" | "robot" | "pallet";
  focusedLine: FocusLine;
  playbackSpeed: PlaybackSpeed;
  connectionStatus: "connecting" | "live" | "offline";
  databaseAlive: boolean | null;
  schedulerSummary: string;
  liveDeviceCount: number;
  lastRealtimeAt: string | null;
};

export function DetailPanel({
  activeRecipe,
  robot,
  interceptorRobots,
  outboundPallets,
  leadCargo,
  layers,
  current,
  focusedLine,
  playbackSpeed,
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
          <strong>{robot.phase ?? robot.mode}</strong>
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
        <div className="detail-card">
          <span>Zoom Focus</span>
          <strong>{focusedLine}</strong>
        </div>
        <div className="detail-card">
          <span>Playback</span>
          <strong>{playbackSpeed}x</strong>
        </div>
        <div className="detail-card">
          <span>Interceptor Bots</span>
          <strong>{interceptorRobots.length} active cells</strong>
        </div>
        <div className="detail-card">
          <span>Outbound Queue</span>
          <strong>{outboundPallets.filter((pallet) => pallet.status !== "shipped").length}</strong>
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
          <strong>{focusedLine === "QC" ? "QC gate / robot pickup" : `${focusedLine === "ALL" ? "buffer" : focusedLine} / robot pickup`}</strong>
        </article>
        <article>
          <span>Place Position</span>
          <strong>
            Layer {currentLayer.layer} next slot {Math.min(currentLayer.totalCount, currentLayer.filledCount + 1)}
          </strong>
        </article>
        <article>
          <span>Main Robot Phase</span>
          <strong>{robot.phase ?? "standby"}</strong>
        </article>
        <article>
          <span>Outbound Stage</span>
          <strong>
            {outboundPallets.length > 0 ? `${outboundPallets.at(-1)?.dockId} / ${outboundPallets.at(-1)?.status}` : "awaiting full pallet"}
          </strong>
        </article>
        <article>
          <span>Estimated Completion</span>
          <strong>{Math.max(0, 27 - layers.reduce((sum, layer) => sum + layer.filledCount, 0))} boxes left</strong>
        </article>
      </div>
    </section>
  );
}

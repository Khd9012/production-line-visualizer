import { useEffect } from "react";
import { connectCoreRealtime } from "./services/coreRealtime";
import { fetchDatabaseStatus, fetchRunningSchedulers, fetchSimulationSnapshot } from "./services/coreApi";
import { ControlTabs } from "./components/ControlTabs";
import { DetailPanel } from "./components/DetailPanel";
import { EventTimeline } from "./components/EventTimeline";
import { FloorView } from "./components/FloorView";
import { PalletStackPanel } from "./components/PalletStackPanel";
import { ProcessControls } from "./components/ProcessControls";
import { RobotFleetPanel } from "./components/RobotFleetPanel";
import { StatCard } from "./components/StatCard";
import { useSimulationStore } from "./store/simulationStore";

export default function App() {
  const {
    cargos,
    palletLayers,
    robot,
    throughput,
    activeRecipe,
    selectedPanel,
    focusedLine,
    playbackSpeed,
    events,
    connectionStatus,
    databaseAlive,
    schedulerSummary,
    liveDeviceCount,
    lastRealtimeAt,
    robots,
    apmStatus,
    tick,
    setSelectedPanel,
    setFocusedLine,
    setPlaybackSpeed,
    setConnectionStatus,
    setDatabaseAlive,
    setSchedulerSummary,
    ingestCoreSnapshot,
    ingestSimulationSnapshot
  } = useSimulationStore();

  useEffect(() => {
    const timer = window.setInterval(() => {
      tick();
    }, Math.max(300, Math.round(1200 / playbackSpeed)));

    return () => window.clearInterval(timer);
  }, [playbackSpeed, tick]);

  useEffect(() => {
    let cancelled = false;

    const loadCoreStatus = async () => {
      try {
        const [dbAlive, schedulers, simulationSnapshot] = await Promise.all([
          fetchDatabaseStatus(),
          fetchRunningSchedulers(),
          fetchSimulationSnapshot()
        ]);
        if (cancelled) {
          return;
        }

        setDatabaseAlive(dbAlive);
        setSchedulerSummary(schedulers.replace("실행 중인 작업 목록: ", "") || "none");
        ingestSimulationSnapshot(simulationSnapshot);
      } catch {
        if (cancelled) {
          return;
        }

        setDatabaseAlive(false);
        setSchedulerSummary("unavailable");
      }
    };

    void loadCoreStatus();

    return () => {
      cancelled = true;
    };
  }, [ingestSimulationSnapshot, setDatabaseAlive, setSchedulerSummary]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void fetchSimulationSnapshot().then(ingestSimulationSnapshot).catch(() => undefined);
    }, Math.max(1500, Math.round(3200 / playbackSpeed)));

    return () => window.clearInterval(timer);
  }, [ingestSimulationSnapshot, playbackSpeed]);

  useEffect(() => {
    setConnectionStatus("connecting");

    const disconnect = connectCoreRealtime({
      onConnected: () => setConnectionStatus("live"),
      onDisconnected: () => setConnectionStatus("offline"),
      onMessage: (payload) => ingestCoreSnapshot(payload),
      onError: () => setConnectionStatus("offline")
    });

    return () => {
      disconnect();
    };
  }, [ingestCoreSnapshot, setConnectionStatus]);

  const leadCargo = cargos[cargos.length - 1];
  const totalStacked = palletLayers.reduce((sum, layer) => sum + layer.filledCount, 0);

  return (
    <main className="app-shell">
      <div className="hero-panel">
        <div className="hero-panel__copy">
          <p className="eyebrow">Production Visualizer</p>
          <h1>Realtime rail flow and pallet stacking cockpit</h1>
          <p className="hero-panel__text">
            A digital twin style control surface for following cargo movement across inbound rails, palletizer pickup,
            and final pallet build progression.
          </p>
        </div>

        <ControlTabs current={selectedPanel} onChange={setSelectedPanel} />
      </div>

      <section className="stats-grid">
        <StatCard label="Current Throughput" value={`${throughput} bx/h`} meta="hybrid sim + core feed" tone="accent" />
        <StatCard label="Robot Cycle" value={`${Math.round(robot.cycleProgress * 100)}%`} meta={robot.mode} />
        <StatCard label="Active Cargo" value={leadCargo?.id ?? "None"} meta={leadCargo?.state ?? "idle"} />
        <StatCard label="Focused Line" value={focusedLine} meta={`playback ${playbackSpeed}x`} />
        <StatCard
          label="Realtime Link"
          value={connectionStatus === "live" ? "ONLINE" : connectionStatus.toUpperCase()}
          meta={`db ${databaseAlive === null ? "..." : databaseAlive ? "ok" : "down"} / ${liveDeviceCount} devices`}
        />
        <StatCard label="Pallet Fill" value={`${totalStacked}/27`} meta="three-layer recipe" />
      </section>

      <ProcessControls
        focusedLine={focusedLine}
        playbackSpeed={playbackSpeed}
        onFocusChange={setFocusedLine}
        onSpeedChange={setPlaybackSpeed}
      />

      <section className="workspace-grid">
        <FloorView cargos={cargos} robot={robot} layers={palletLayers} focusedLine={focusedLine} playbackSpeed={playbackSpeed} />
        <DetailPanel
          activeRecipe={activeRecipe}
          robot={robot}
          leadCargo={leadCargo}
          layers={palletLayers}
          current={selectedPanel}
          focusedLine={focusedLine}
          playbackSpeed={playbackSpeed}
          connectionStatus={connectionStatus}
          databaseAlive={databaseAlive}
          schedulerSummary={schedulerSummary}
          liveDeviceCount={liveDeviceCount}
          lastRealtimeAt={lastRealtimeAt}
        />
        <RobotFleetPanel robots={robots} apmStatus={apmStatus} />
        <PalletStackPanel layers={palletLayers} />
        <EventTimeline events={events} />
      </section>
    </main>
  );
}

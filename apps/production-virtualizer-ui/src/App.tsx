import { useEffect } from "react";
import { connectCoreRealtime } from "./services/coreRealtime";
import { fetchDatabaseStatus, fetchRunningSchedulers } from "./services/coreApi";
import { ControlTabs } from "./components/ControlTabs";
import { DetailPanel } from "./components/DetailPanel";
import { EventTimeline } from "./components/EventTimeline";
import { FloorView } from "./components/FloorView";
import { PalletStackPanel } from "./components/PalletStackPanel";
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
    events,
    connectionStatus,
    databaseAlive,
    schedulerSummary,
    liveDeviceCount,
    lastRealtimeAt,
    tick,
    setSelectedPanel,
    setConnectionStatus,
    setDatabaseAlive,
    setSchedulerSummary,
    ingestCoreSnapshot
  } = useSimulationStore();

  useEffect(() => {
    const timer = window.setInterval(() => {
      tick();
    }, 1400);

    return () => window.clearInterval(timer);
  }, [tick]);

  useEffect(() => {
    let cancelled = false;

    const loadCoreStatus = async () => {
      try {
        const [dbAlive, schedulers] = await Promise.all([fetchDatabaseStatus(), fetchRunningSchedulers()]);
        if (cancelled) {
          return;
        }

        setDatabaseAlive(dbAlive);
        setSchedulerSummary(schedulers.replace("실행 중인 작업 목록: ", "") || "none");
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
  }, [setDatabaseAlive, setSchedulerSummary]);

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
        <StatCard
          label="Realtime Link"
          value={connectionStatus === "live" ? "ONLINE" : connectionStatus.toUpperCase()}
          meta={`db ${databaseAlive === null ? "..." : databaseAlive ? "ok" : "down"} / ${liveDeviceCount} devices`}
        />
        <StatCard label="Pallet Fill" value={`${totalStacked}/27`} meta="three-layer recipe" />
      </section>

      <section className="workspace-grid">
        <FloorView cargos={cargos} robot={robot} />
        <DetailPanel
          activeRecipe={activeRecipe}
          robot={robot}
          leadCargo={leadCargo}
          layers={palletLayers}
          current={selectedPanel}
          connectionStatus={connectionStatus}
          databaseAlive={databaseAlive}
          schedulerSummary={schedulerSummary}
          liveDeviceCount={liveDeviceCount}
          lastRealtimeAt={lastRealtimeAt}
        />
        <PalletStackPanel layers={palletLayers} />
        <EventTimeline events={events} />
      </section>
    </main>
  );
}

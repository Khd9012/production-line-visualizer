import { useEffect } from "react";
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
    tick,
    setSelectedPanel
  } = useSimulationStore();

  useEffect(() => {
    const timer = window.setInterval(() => {
      tick();
    }, 1400);

    return () => window.clearInterval(timer);
  }, [tick]);

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
        <StatCard label="Current Throughput" value={`${throughput} bx/h`} meta="simulated live output" tone="accent" />
        <StatCard label="Robot Cycle" value={`${Math.round(robot.cycleProgress * 100)}%`} meta={robot.mode} />
        <StatCard label="Active Cargo" value={leadCargo?.id ?? "None"} meta={leadCargo?.state ?? "idle"} />
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
        />
        <PalletStackPanel layers={palletLayers} />
        <EventTimeline events={events} />
      </section>
    </main>
  );
}

import type { CoreSimulationSnapshot } from "../types";

export async function fetchDatabaseStatus(): Promise<boolean> {
  const response = await fetch("/api/scada/database/status", {
    method: "POST"
  });

  if (!response.ok) {
    throw new Error(`Database status request failed: ${response.status}`);
  }

  return response.json();
}

export async function fetchRunningSchedulers(): Promise<string> {
  const response = await fetch("/api/scheduler/running");

  if (!response.ok) {
    throw new Error(`Scheduler status request failed: ${response.status}`);
  }

  return response.text();
}

export async function fetchSimulationSnapshot(): Promise<CoreSimulationSnapshot> {
  const response = await fetch("/api/scada/simulation/snapshot");

  if (!response.ok) {
    throw new Error(`Simulation snapshot request failed: ${response.status}`);
  }

  return response.json();
}

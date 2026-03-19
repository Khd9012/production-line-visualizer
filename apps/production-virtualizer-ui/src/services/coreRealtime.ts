import { Client } from "@stomp/stompjs";
import type { CoreDeviceStatus } from "../types";

type CoreRealtimeOptions = {
  onConnected: () => void;
  onDisconnected: () => void;
  onMessage: (payload: CoreDeviceStatus[]) => void;
  onError: (message: string) => void;
};

const getBrokerUrl = () => {
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${window.location.host}/ws-stomp`;
};

export function connectCoreRealtime(options: CoreRealtimeOptions) {
  const client = new Client({
    brokerURL: getBrokerUrl(),
    reconnectDelay: 3000,
    debug: () => undefined,
    onConnect: () => {
      options.onConnected();
      client.subscribe("/topic/eqStatus", (message: { body: string }) => {
        try {
          const payload = JSON.parse(message.body) as CoreDeviceStatus[];
          options.onMessage(payload);
        } catch (error) {
          options.onError(error instanceof Error ? error.message : "Failed to parse realtime payload");
        }
      });
    },
    onStompError: (frame: { headers: Record<string, string> }) => {
      options.onError(frame.headers.message || "STOMP broker error");
    },
    onWebSocketClose: () => {
      options.onDisconnected();
    }
  });

  client.activate();

  return () => {
    client.deactivate();
  };
}

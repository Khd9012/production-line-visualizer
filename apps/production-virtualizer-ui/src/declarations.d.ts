declare module "@stomp/stompjs" {
  export class Client {
    brokerURL?: string;
    reconnectDelay?: number;
    debug?: (message: string) => void;
    onConnect?: () => void;
    onStompError?: (frame: { headers: Record<string, string> }) => void;
    onWebSocketClose?: () => void;
    constructor(options?: Partial<Client>);
    subscribe(destination: string, callback: (message: { body: string }) => void): void;
    activate(): void;
    deactivate(): void;
  }
}

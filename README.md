# production-line-visualizer

Production line visualizer monorepo.

## Structure

- `apps/production-virtualizer-core`
  - Spring Boot backend for production line and warehouse virtualizer simulation
  - Includes Docker support and embedded H2 persistence for local and container runs
- `apps/production-virtualizer-ui`
  - React + Vite realtime digital twin UI
  - Connects to the core API and STOMP websocket feed

## Full Stack Run

```bash
docker compose up --build
```

Endpoints:

- UI: `http://localhost:8080`
- Core API: `http://localhost:8902`

## What Is Wired

- `ui -> core` HTTP calls through `/api/...`
- `ui -> core` STOMP websocket through `/ws-stomp`
- backend runs with embedded H2 file storage in Docker

## Stop

```bash
docker compose down
```

## Monorepo Direction

- Keep backend and frontend isolated by app directory
- Add shared contracts or docs later under top-level folders such as `packages`, `docs`, or `infra` if needed

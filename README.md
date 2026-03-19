# production-line-visualizer

Production line visualizer monorepo.

## Structure

- `apps/production-virtualizer-core`
  - Spring Boot backend for production line and warehouse virtualizer simulation
  - Includes Docker support and embedded H2 persistence for local and container runs
- `apps/production-virtualizer-ui`
  - Reserved for the visualization frontend application

## Current Backend Run

```bash
cd apps/production-virtualizer-core
docker compose up --build
```

Backend default port:

- `8902`

## Monorepo Direction

- Keep backend and frontend isolated by app directory
- Add shared contracts or docs later under top-level folders such as `packages`, `docs`, or `infra` if needed

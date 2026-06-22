# Docker

Run ai-v-models in a container with persistent data on a volume.

## Quick start

```bash
docker compose up -d
```

Open http://localhost:4000 — admin UI, API, docs (`/docs/`), and Swagger (`/api/docs/`).

## docker-compose.yml

The included compose file defines two services:

| Service | Port (default) | Role |
|---------|----------------|------|
| `proxy` | 4000 | API, admin UI, docs, Swagger |
| `web` | 5173 | nginx reverse proxy to `proxy` (dev-port parity) |

Both services:

- Build `proxy` from the repo `Dockerfile` (or use a published image)
- Mount volume `aivm-data` → `/data` (`AIVM_DATA_DIR`) on `proxy`
- Health check `GET /health` on `proxy`

Host ports are overridable via `.env` (`AIVM_HOST_PROXY_PORT`, `AIVM_HOST_WEB_PORT`). See [Reverse Proxy (nginx)](./reverse-proxy) for the `web` service config and production nginx examples.

### Environment

| Variable | Value in compose |
|----------|------------------|
| `AIVM_HOST` | `0.0.0.0` |
| `AIVM_PORT` | `4000` |
| `AIVM_DATA_DIR` | `/data` |
| `AIVM_LOG_LEVEL` | `info` |
| `AIVM_LOG_FORMAT` | `json` |
| `AIVM_CORS_ORIGINS` | `http://localhost:4000,http://localhost:5173` |

Add secrets via compose `environment` or an env file:

```yaml
environment:
  AIVM_SESSION_SECRET: "${AVM_SESSION_SECRET}"
  AIVM_ADMIN_PASSWORD: "${AVM_ADMIN_PASSWORD}"
```

## Build manually

```bash
docker build -t ai-v-models .
docker run -d \
  -p 4000:4000 \
  -v aivm-data:/data \
  -e AIVM_DATA_DIR=/data \
  ai-v-models
```

The image includes the built admin UI and VitePress docs.

## Mock backend (testing profile)

```bash
docker compose --profile testing up
```

Starts a mock OpenAI-compatible backend on port 11434 for integration testing.

## Backup

Back up the Docker volume or `/data` contents:

- `data.db` — all configuration and keys metadata
- `master.key` — required for abstraction-mode backend keys
- `config.yaml` — optional overrides

## Related

- [Reverse Proxy (nginx)](./reverse-proxy)
- [Installation](./installation)
- [Kubernetes](./kubernetes)
- [Environment Variables](./env-vars)

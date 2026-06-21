# Docker

Run ai-v-models in a container with persistent data on a volume.

## Quick start

```bash
docker compose up -d
```

Open http://localhost:4000 — admin UI, API, docs (`/docs/`), and Swagger (`/api/docs/`).

## docker-compose.yml

The included compose file:

- Builds from the repo `Dockerfile`
- Publishes port **4000**
- Mounts volume `aivm-data` → `/data` (`AIVM_DATA_DIR`)
- Health check on `GET /health`

### Environment

| Variable | Value in compose |
|----------|------------------|
| `AVM_HOST` | `0.0.0.0` |
| `AVM_PORT` | `4000` |
| `AVM_DATA_DIR` | `/data` |
| `AVM_LOG_LEVEL` | `info` |
| `AVM_LOG_FORMAT` | `json` |

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

- [Installation](./installation)
- [Kubernetes](./kubernetes)
- [Environment Variables](./env-vars)

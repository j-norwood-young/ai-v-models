# Environment Variables

Environment variables override values from `config.yaml`. See [Configuration](./configuration) for full precedence rules.

Variables can be set in the shell or in a `.env` file in the working directory when starting the proxy.

## Server

| Variable | Default | Description |
|---|---|---|
| `AIVM_HOST` | `0.0.0.0` | Listen host |
| `AIVM_PORT` | `4000` (`4001` when `AIVM_DEV=1`) | Listen port |
| `AIVM_TLS_CERT` | — | Path to TLS certificate file |
| `AIVM_TLS_KEY` | — | Path to TLS private key file |
| `AIVM_CORS_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Comma-separated allowed CORS origins |

## Logging

| Variable | Default | Description |
|---|---|---|
| `AIVM_LOG_LEVEL` | `info` | `trace`, `debug`, `info`, `warn`, `error`, or `fatal` |
| `AIVM_LOG_FORMAT` | `json` | `json` or `pretty` |
| `AIVM_LOG_FILE` | — | Optional log file path |

## Metrics & health

| Variable | Default | Description |
|---|---|---|
| `AIVM_METRICS_ENABLED` | `true` | Enable Prometheus metrics at `/metrics` |
| `AIVM_OTEL_ENDPOINT` | — | OpenTelemetry OTLP HTTP endpoint |
| `AIVM_OTEL_SERVICE_NAME` | `ai-v-models` | Service name for OTLP export |
| `AIVM_HEALTH_CHECK_INTERVAL` | `30` | Backend health check interval in seconds |

## Security

| Variable | Default | Description |
|---|---|---|
| `AIVM_SESSION_SECRET` | auto-generated | Secret for signing session cookies — set explicitly in production |
| `AIVM_WEBAUTHN_RP_ID` | — | WebAuthn relying party ID (usually your domain) |
| `AIVM_WEBAUTHN_ORIGINS` | — | Comma-separated WebAuthn allowed origins |

## Data & first-run bootstrap

| Variable | Default | Description |
|---|---|---|
| `AIVM_DATA_DIR` | `~/.aivm` | Data directory (`config.yaml`, SQLite DB, keys, logs) |
| `AIVM_ADMIN_USER` | `admin` | Initial admin username — **first run only** |
| `AIVM_ADMIN_PASSWORD` | `admin` | Initial admin password — **first run only** |

::: warning
`AIVM_ADMIN_USER` and `AIVM_ADMIN_PASSWORD` are only applied when the database is first created. To change credentials later, use the admin UI or `aivm user` CLI commands.
:::

## Development & deployment

| Variable | Description |
|---|---|
| `AIVM_DEV` | Set to `1` for development mode (proxy on port 4001, admin UI served separately by Vite) |
| `AIVM_WEB_DIR` | Override path to the built SvelteKit admin UI (`apps/web/build`) |
| `AIVM_DOCS_DIR` | Override path to the built VitePress docs (`docs/.vitepress/dist`) |
| `AIVM_PROXY_URL` | Web dev server only — proxy target for `/api` (default `http://localhost:4001`) |

## CLI & clients

These variables are read by the `aivm` CLI, MCP server, and other clients — not by the proxy process itself.

| Variable | Description |
|---|---|
| `AIVM_URL` | Proxy base URL (default `http://localhost:4000`) |
| `AIVM_ADMIN_TOKEN` | Admin Bearer token for CLI/API access |
| `AIVM_API_KEY` | Client API key for inference commands such as `aivm prompt` |

## Examples

```bash
# Production with custom port and log level
AIVM_PORT=8080 AIVM_LOG_LEVEL=debug pnpm start

# Custom data directory (Docker volume mount)
AIVM_DATA_DIR=/data pnpm start

# First run with a strong admin password
AIVM_ADMIN_PASSWORD='changeme123' pnpm start
```

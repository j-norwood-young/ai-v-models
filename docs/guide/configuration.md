# Configuration

ai-v-models supports multiple configuration sources with the following precedence (highest wins):

```
DB runtime overrides  (highest)
  ↑
Environment variables / .env
  ↑
config.yaml
  ↑
Built-in defaults     (lowest)
```

## config.yaml

Located at `~/.ai-reverse-proxy/config.yaml` by default (override with `AVM_DATA_DIR`).

```yaml
server:
  host: "0.0.0.0"
  port: 4000
  corsOrigins:
    - "http://localhost:5173"

log:
  level: "info"     # trace | debug | info | warn | error | fatal
  format: "json"    # json | pretty

metrics:
  enabled: true
  # otelEndpoint: "http://localhost:4318"

health:
  checkIntervalSecs: 30
  timeoutMs: 5000
  unhealthyThreshold: 3
  healthyThreshold: 2

security:
  sessionMaxAgeSecs: 604800  # 7 days
  loginRateLimitMaxAttempts: 10
  loginRateLimitWindowSecs: 300
```

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `AVM_HOST` | `0.0.0.0` | Listen host |
| `AVM_PORT` | `4000` | Listen port |
| `AVM_DATA_DIR` | `~/.ai-reverse-proxy` | Data directory |
| `AVM_LOG_LEVEL` | `info` | Log level |
| `AVM_LOG_FORMAT` | `json` | Log format |
| `AVM_METRICS_ENABLED` | `true` | Enable Prometheus metrics |
| `AVM_OTEL_ENDPOINT` | - | OpenTelemetry OTLP endpoint |
| `AVM_HEALTH_CHECK_INTERVAL` | `30` | Health check interval (seconds) |
| `AVM_SESSION_SECRET` | - | Session cookie signing secret |
| `AVM_ADMIN_USER` | `admin` | Initial admin username (first run only) |
| `AVM_ADMIN_PASSWORD` | `admin` | Initial admin password (first run only; must be changed on first login) |
| `AVM_TLS_CERT` | - | Path to TLS certificate |
| `AVM_TLS_KEY` | - | Path to TLS private key |
| `AVM_CORS_ORIGINS` | `http://localhost:5173` | CORS allowed origins |

## Data directory structure

```
~/.ai-reverse-proxy/
  config.yaml      # Main configuration (human-editable)
  data.db          # SQLite database (keys, usage, metrics, etc.)
  data.db-wal      # WAL journal
  master.key       # AES-256 encryption key (chmod 600, never share)
  logs/            # Log files
  hooks/           # Installed hook modules
```

::: warning
The `master.key` file is critical for decrypting backend API keys stored with abstraction mode. Back it up securely. If lost, backend keys with abstraction mode will need to be re-entered.
:::

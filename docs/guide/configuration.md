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

Located at `~/.ai-reverse-proxy/config.yaml` by default (override with `AIVM_DATA_DIR`).

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

See [Environment Variables](./env-vars) for the full reference.

Quick reference:

| Variable | Default | Description |
|---|---|---|
| `AIVM_HOST` | `0.0.0.0` | Listen host |
| `AIVM_PORT` | `4000` | Listen port |
| `AIVM_DATA_DIR` | `~/.ai-reverse-proxy` | Data directory |
| `AIVM_LOG_LEVEL` | `info` | Log level |
| `AIVM_SESSION_SECRET` | — | Session cookie signing secret |
| `AIVM_ADMIN_PASSWORD` | `admin` | Initial admin password (first run only) |

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

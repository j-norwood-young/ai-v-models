# Systemd

Run ai-v-models as a systemd service on Linux.

## Build

```bash
pnpm install
pnpm build
```

## Service unit

Create `/etc/systemd/system/ai-v-models.service`:

```ini
[Unit]
Description=ai-v-models LLM reverse proxy
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=avm
Group=avm
WorkingDirectory=/opt/ai-v-models
ExecStart=/usr/bin/node packages/proxy/dist/index.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=AVM_DATA_DIR=/var/lib/ai-v-models
Environment=AVM_HOST=0.0.0.0
Environment=AVM_PORT=4000
Environment=AVM_LOG_LEVEL=info
Environment=AVM_LOG_FORMAT=json
# Environment=AVM_SESSION_SECRET=...

# Hardening
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/ai-v-models
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

## Setup

```bash
sudo useradd --system --home /var/lib/ai-v-models avm
sudo mkdir -p /var/lib/ai-v-models
sudo chown avm:avm /var/lib/ai-v-models

sudo cp -r /path/to/ai-v-models /opt/ai-v-models
sudo chown -R avm:avm /opt/ai-v-models

sudo systemctl daemon-reload
sudo systemctl enable --now ai-v-models
sudo systemctl status ai-v-models
```

## Logs

```bash
journalctl -u ai-v-models -f
```

## Reverse proxy

Put nginx or Caddy in front for TLS — see [TLS Setup](./tls).

## Related

- [Installation](./installation)
- [Environment Variables](./env-vars)
- [Docker](./docker)

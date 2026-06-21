# Quick Start

## Requirements

- Node.js 22+
- pnpm 9+
- An LLM backend (LM Studio, Ollama, vLLM, etc.)

## Installation

```bash
# Clone the repo
git clone https://github.com/your-org/ai-v-models.git
cd ai-v-models

# Install dependencies
pnpm install

# Build all packages
pnpm build
```

## Start the proxy

```bash
# Start with defaults (port 4000, data in ~/.ai-reverse-proxy)
node packages/proxy/dist/index.js

# Or with environment variables
AVM_PORT=4000 AVM_LOG_LEVEL=debug node packages/proxy/dist/index.js
```

On first start, an admin user is created (default: `admin` / `changeme123`). **Change this immediately.**

## Add a backend

Using the CLI:
```bash
pnpm --filter @ai-v-models/cli run build
node packages/cli/dist/index.js backend add \
  --name lmstudio-bob \
  --url http://192.168.1.100:1234 \
  --provider lmstudio \
  --hostname bob \
  --mode passthrough
```

## Test the backend

```bash
node packages/cli/dist/index.js backend test lmstudio-bob
```

## List available models

```bash
curl http://localhost:4000/v1/models
```

You'll see models like:
```json
{
  "object": "list",
  "data": [
    {
      "id": "qwen3.5-35b:bob:lmstudio",
      "object": "model",
      "owned_by": "bob:lmstudio"
    }
  ]
}
```

## Create an API key

```bash
node packages/cli/dist/index.js key create --name "my-app"
```

Save the returned key — it's only shown once!

## Make a chat completion

```bash
curl http://localhost:4000/v1/chat/completions \
  -H "Authorization: Bearer avm-sk-YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen3.5-35b:bob:lmstudio",
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": true
  }'
```

## Open the Web UI

Navigate to `http://localhost:4000` (or run the web UI separately with `pnpm --filter @ai-v-models/web dev`).

Login with `admin` / `changeme123`.

## Create a virtual model

```bash
node packages/cli/dist/index.js vmodel create --model-id smart-chat --display-name "Smart Chat"
node packages/cli/dist/index.js vmodel add-backend smart-chat \
  --backend-id <backend-id> \
  --backend-model qwen3.5-35b
```

Now users can use `smart-chat` instead of the full `qwen3.5-35b:bob:lmstudio` ID.

## Using Docker

```bash
docker-compose up
```

This starts the proxy on port 4000 with data persisted in a Docker volume.

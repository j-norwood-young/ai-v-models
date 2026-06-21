# Publishing Hooks to NPM

Share hooks as NPM packages so others can install them with one command.

## Package structure

```
my-avm-hook/
  package.json
  src/index.ts
  dist/index.js
```

## package.json manifest

```json
{
  "name": "my-avm-hook",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "avm-hook": {
    "name": "My Hook",
    "description": "Prepends a system prompt",
    "trigger": "pre-request",
    "configSchema": {
      "type": "object",
      "properties": {
        "systemPromptPrefix": { "type": "string" }
      }
    }
  },
  "dependencies": {
    "@ai-v-models/hooks-sdk": "^0.0.1"
  }
}
```

The `avm-hook` key is required — the installer validates it.

## Publish

```bash
npm publish
```

## Install on a server

```bash
aivm hook add-internal \
  --name my-hook \
  --module my-avm-hook \
  --trigger pre-request
```

Modules are copied to `{AIVM_DATA_DIR}/hooks/`.

## Install from GitHub

```bash
npm install github:owner/repo#v1.0.0 --prefix ~/.ai-reverse-proxy/hooks

aivm hook add-internal \
  --name github-hook \
  --module ~/.ai-reverse-proxy/hooks/node_modules/my-avm-hook/dist/index.js \
  --trigger pre-request
```

## Related

- [Authoring Hooks](./hooks-authoring) — full SDK reference and webhook signing

# High Availability

ai-v-models keeps traffic flowing when backends fail through health checks, circuit breakers, and balancer failover.

## Health checks

Every `health.checkIntervalSecs` seconds (default 30), the proxy calls `GET {baseUrl}/v1/models` on each enabled backend.

| Status | Condition |
|--------|-----------|
| `healthy` | Response OK, latency under ~2s |
| `degraded` | Response OK but slow |
| `unhealthy` | Error or timeout |

Unhealthy backends are excluded from routing unless all backends are unhealthy — then degraded backends are used as a last resort.

## Circuit breakers

Per-backend circuit breakers trip after **5 consecutive request failures**:

1. **Closed** — normal traffic
2. **Open** — no traffic for 60 seconds
3. **Half-open** — trial request; 2 successes closes the breaker

State is exposed as the Prometheus metric `aivm_circuit_breaker_state`.

## Multi-backend v-models

Attach multiple backends to one v-model for redundancy:

```bash
aivm vmodel add-backend smart-chat --backend-id gpu1 --backend-model llama3.2 --weight 2
aivm vmodel add-backend smart-chat --backend-id gpu2 --backend-model llama3.2 --weight 1
```

Combine with a [balancing strategy](./balancing) (`session-pin`, `round-robin`, `weighted`, etc.).

## Session continuity

`session-pin` (default) hashes on the API key ID so the same client consistently hits the same backend while it stays healthy. If that backend fails, the client is re-pinned to a healthy one.

## When everything is down

If no healthy or degraded backend is available, the proxy returns **503** with an error message.

## Monitoring

- Dashboard backend health badges on `/`
- SSE `backend-health` events on `/api/v1/events`
- `aivm_backend_health{backend,provider}` Prometheus gauge

See [Monitoring](./monitoring) and [Prometheus & OTLP](./prometheus).

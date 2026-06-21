# Prometheus & OTLP

## Prometheus

When `metrics.enabled` is `true` (default), scrape:

```
GET /metrics
```

Standard Prometheus text format. Example scrape config:

```yaml
scrape_configs:
  - job_name: ai-v-models
    static_configs:
      - targets: ["localhost:4000"]
```

### Metric catalog

| Metric | Labels | Description |
|--------|--------|-------------|
| `aivm_http_requests_total` | method, endpoint, status, vmodel, backend | Request counter |
| `aivm_http_request_duration_ms` | method, endpoint, vmodel, backend | Latency histogram |
| `aivm_tokens_total` | type, vmodel, backend, key_prefix | Prompt/completion tokens |
| `aivm_ttft_ms` | vmodel, backend | Time to first token |
| `aivm_tps` | vmodel, backend | Tokens per second |
| `aivm_tool_calls_total` | vmodel, backend | Tool call counter |
| `aivm_backend_health` | backend, provider | 1=healthy, 0.5=degraded, 0=unhealthy |
| `aivm_backend_concurrency` | backend | In-flight requests |
| `aivm_rate_limit_hits_total` | key_prefix, reason | Budget/suspend hits |
| `aivm_circuit_breaker_state` | backend | 0=closed, 0.5=half-open, 1=open |

### Example queries

```text
# Error rate
sum(rate(aivm_http_requests_total{status=~"5.."}[5m]))
  / sum(rate(aivm_http_requests_total[5m]))

# P95 latency
histogram_quantile(0.95, rate(aivm_http_request_duration_ms_bucket[5m]))

# Unhealthy backends
aivm_backend_health == 0
```

## OpenTelemetry (OTLP)

Configure in `config.yaml` or environment:

```yaml
metrics:
  otelEndpoint: http://localhost:4318
  otelServiceName: ai-v-models
```

Env: `AVM_OTEL_ENDPOINT`, `AVM_OTEL_SERVICE_NAME`

::: info
OTLP export settings are validated at startup. **Wire-up to an OTLP exporter is not yet implemented** — use Prometheus scraping today.
:::

## Settings link

Open raw metrics from **Settings → Prometheus Metrics** (`/metrics`).

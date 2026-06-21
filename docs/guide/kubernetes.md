# Kubernetes

No Helm chart ships with the repo yet. Deploy using the published Docker image and the patterns below.

## Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ai-v-models
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ai-v-models
  template:
    metadata:
      labels:
        app: ai-v-models
    spec:
      containers:
        - name: proxy
          image: your-registry/ai-v-models:latest
          ports:
            - containerPort: 4000
          env:
            - name: AIVM_HOST
              value: "0.0.0.0"
            - name: AIVM_PORT
              value: "4000"
            - name: AIVM_DATA_DIR
              value: "/data"
            - name: AIVM_SESSION_SECRET
              valueFrom:
                secretKeyRef:
                  name: ai-v-models-secrets
                  key: session-secret
          volumeMounts:
            - name: data
              mountPath: /data
          livenessProbe:
            httpGet:
              path: /health
              port: 4000
            initialDelaySeconds: 10
            periodSeconds: 30
          readinessProbe:
            httpGet:
              path: /ready
              port: 4000
            initialDelaySeconds: 5
            periodSeconds: 10
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: ai-v-models-data
```

## Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: ai-v-models
spec:
  selector:
    app: ai-v-models
  ports:
    - port: 4000
      targetPort: 4000
```

## Ingress

Terminate TLS at the ingress controller and forward to the service. Set `AVM_CORS_ORIGINS` to your public admin URL.

Example annotations for nginx ingress:

```yaml
nginx.ingress.kubernetes.io/proxy-read-timeout: "3600"
nginx.ingress.kubernetes.io/proxy-send-timeout: "3600"
```

Long timeouts help streaming chat completions.

## Storage

Use a **ReadWriteOnce** PVC for `/data`. SQLite requires a single writer — run one replica unless you externalize the database in a future release.

## Metrics

Scrape `/metrics` with Prometheus Operator `PodMonitor` or annotations:

```yaml
prometheus.io/scrape: "true"
prometheus.io/port: "4000"
prometheus.io/path: "/metrics"
```

## Related

- [Docker](./docker)
- [Prometheus & OTLP](./prometheus)
- [TLS Setup](./tls)

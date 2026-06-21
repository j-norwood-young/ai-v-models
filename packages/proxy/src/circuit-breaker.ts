import { circuitBreakerState } from "./metrics.js";

export type CircuitState = "closed" | "open" | "half-open";

export interface CircuitBreakerOptions {
  failureThreshold: number;
  successThreshold: number;
  timeoutMs: number;
  backendName: string;
}

export class CircuitBreaker {
  private state: CircuitState = "closed";
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;

  constructor(private readonly opts: CircuitBreakerOptions) {
    circuitBreakerState.set({ backend: opts.backendName }, 0);
  }

  get isOpen(): boolean {
    if (this.state === "open") {
      if (Date.now() - this.lastFailureTime > this.opts.timeoutMs) {
        this.state = "half-open";
        circuitBreakerState.set({ backend: this.opts.backendName }, 0.5);
      }
    }
    return this.state === "open";
  }

  get canTry(): boolean {
    return !this.isOpen;
  }

  recordSuccess(): void {
    this.failureCount = 0;
    if (this.state === "half-open") {
      this.successCount++;
      if (this.successCount >= this.opts.successThreshold) {
        this.state = "closed";
        this.successCount = 0;
        circuitBreakerState.set({ backend: this.opts.backendName }, 0);
      }
    }
  }

  recordFailure(): void {
    this.lastFailureTime = Date.now();
    this.failureCount++;
    if (this.failureCount >= this.opts.failureThreshold) {
      this.state = "open";
      this.successCount = 0;
      circuitBreakerState.set({ backend: this.opts.backendName }, 1);
    }
  }

  getState(): CircuitState {
    // Side-effect: check for timeout transition
    void this.isOpen;
    return this.state;
  }
}

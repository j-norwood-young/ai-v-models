export type JsonRequestInit = Omit<RequestInit, "body"> & {
  /** Serialized JSON string or value to JSON.stringify. Omitted for body-less requests. */
  body?: unknown;
};

/** True when a request should send Content-Type: application/json. */
export function hasJsonRequestBody(body: RequestInit["body"] | unknown): boolean {
  if (body == null) return false;
  if (typeof body === "string") return body.length > 0;
  return true;
}

/**
 * Build fetch init for JSON APIs. Only sets Content-Type when there is a non-empty body,
 * avoiding Fastify FST_ERR_CTP_EMPTY_JSON_BODY on body-less POST/PATCH/PUT.
 */
export function buildJsonRequestInit(method: string, init: JsonRequestInit = {}): RequestInit {
  const { body, headers: initHeaders, ...rest } = init;
  const headers = new Headers(initHeaders);

  let serialized: string | undefined;
  if (body !== undefined) {
    serialized = typeof body === "string" ? body : JSON.stringify(body);
  }

  if (hasJsonRequestBody(serialized) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const fetchInit: RequestInit = { ...rest, method, headers };
  if (hasJsonRequestBody(serialized)) {
    fetchInit.body = serialized as string;
  }
  return fetchInit;
}

export class ApiHttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: string,
  ) {
    super(message);
    this.name = "ApiHttpError";
  }
}

export async function apiFetch<T>(url: string, init: JsonRequestInit = {}): Promise<T> {
  const method = init.method ?? "GET";
  const res = await fetch(url, buildJsonRequestInit(method, init));

  if (!res.ok) {
    const body = await res.text();
    let message = `HTTP ${res.status}`;
    try {
      const parsed = JSON.parse(body) as { error?: string | { message?: string }; message?: string };
      const err = parsed.error;
      message =
        (typeof err === "string" ? err : err?.message) ?? parsed.message ?? message;
    } catch {
      if (body) message = body;
    }
    throw new ApiHttpError(res.status, message, body);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export interface ApiClientOptions {
  baseUrl: string;
  token: string | undefined;
  sessionCookie: string | undefined;
}

export class ApiClient {
  constructor(private readonly opts: ApiClientOptions) {}

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.opts.token) {
      headers["Authorization"] = `Bearer ${this.opts.token}`;
    }
    if (this.opts.sessionCookie) {
      headers["Cookie"] = `avm_session=${this.opts.sessionCookie}`;
    }

    const fetchOpts: RequestInit = { method, headers };
    if (body !== undefined) fetchOpts.body = JSON.stringify(body);
    const res = await fetch(`${this.opts.baseUrl}${path}`, fetchOpts);

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`API error ${res.status}: ${err}`);
    }

    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>("GET", path);
  }
  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("POST", path, body);
  }
  patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("PATCH", path, body);
  }
  delete<T>(path: string): Promise<T> {
    return this.request<T>("DELETE", path);
  }
}

export function createApiClient(baseUrl: string): ApiClient {
  const token = process.env["AVM_ADMIN_TOKEN"];
  return new ApiClient({ baseUrl, token, sessionCookie: undefined });
}

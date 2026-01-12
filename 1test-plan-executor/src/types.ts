export type JSONValue = string | number | boolean | null | { [key: string]: JSONValue } | JSONValue[];

export interface HttpRequest {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
}

export interface HttpResponse {
  status: number;
  statusText: string;
  data: unknown;
  headers?: Record<string, string>;
}

export interface HttpClientAdapter {
  request(req: HttpRequest): Promise<HttpResponse>;
}

export interface ExecutionOptions {
  mode: 'local' | 'remote';
  baseUrl?: string;
  timeout?: number;
  httpClient: HttpClientAdapter;
}

export interface NodeResult {
  nodeId: string;
  success: boolean;
  response?: JSONValue;
  error?: string;
  duration_ms: number;
}

export interface ExecutionResult {
  success: boolean;
  results: NodeResult[];
  errors: string[];
  totalDuration_ms: number;
}

export interface EndpointResult {
  success: boolean;
  response?: JSONValue;
  error?: string;
  duration_ms: number;
}

export interface WaitResult {
  success: boolean;
  duration_ms: number;
}
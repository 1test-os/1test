import type { SecretRef, SecretOrValue } from "./secrets";

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
export type ResponseFormat = "JSON" | "XML" | "TEXT";

/**
 * Target reference for runtime base URL resolution.
 * The runner resolves this to a base URL based on the execution environment.
 */
export interface TargetRef {
  type: "target";
  key: string;
}

export interface Endpoint {
  id: string;
  type: "endpoint";
  method: HttpMethod;
  path: string;
  response_format: ResponseFormat;
  base: TargetRef;
  headers?: Record<string, SecretOrValue<string>>;
  body?: any; // Body can contain nested SecretRefs
}

export type { SecretRef, SecretOrValue };

export interface WaitNode {
  id: string;
  type: "wait";
  duration_ms: number;
}

/**
 * Rich assertion format with JSONPath support
 */
export interface SerializedAssertion {
  nodeId: string;
  accessor: "body" | "headers" | "status";
  path: string[];
  predicate: string | { operator: string; expected: unknown };
}

export interface AssertionNode {
  id: string;
  type: "assertion";
  assertions: SerializedAssertion[];
}

export type Node = Endpoint | WaitNode | AssertionNode;

export interface Edge {
  from: string;
  to: string;
}

export interface Frequency {
  every: number;
  unit: "minute" | "hour" | "day";
}

export interface TestPlan {
  name: string;
  frequency?: Frequency;
  locations?: string[];
  nodes: (Endpoint | WaitNode | AssertionNode)[];
  edges: Edge[];
}

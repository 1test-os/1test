import { type Node, NodeType, type TestPlanV1, type Endpoint, ResponseFormat, type Wait, type Assertions, HttpMethod } from './schemas.js';
import type { ExecutionOptions, ExecutionResult, NodeResult, EndpointResult, WaitResult, JSONValue } from './types.js';
import { createStateGraph, graphStore, StateGraphRegistry } from 'ts-edge';

// Define context type that matches ts-edge's GraphNodeExecuteContext (not exported from library)
interface NodeExecuteContext {
  stream: (chunk: string) => void;
  metadata: Record<string, unknown>;
}
// Dynamic state graph type for runtime-constructed graphs
// - ExecutionState: the shared state type
// - string: node names are arbitrary strings (not known at compile time)
// - never: no nodes are pre-marked as "connected" (having outgoing edges)
type DynamicStateGraph = StateGraphRegistry<ExecutionState, string, never>;

function httpMethodToString(method: HttpMethod): string {
  const methodMap: Record<HttpMethod, string> = {
    [HttpMethod.GET]: 'GET',
    [HttpMethod.POST]: 'POST',
    [HttpMethod.PUT]: 'PUT',
    [HttpMethod.DELETE]: 'DELETE',
    [HttpMethod.PATCH]: 'PATCH',
    [HttpMethod.HEAD]: 'HEAD',
    [HttpMethod.OPTIONS]: 'OPTIONS',
    [HttpMethod.CONNECT]: 'CONNECT',
    [HttpMethod.TRACE]: 'TRACE',
  };
  return methodMap[method];
}

// State shared across all nodes during execution
interface ExecutionState {
  responses: Record<string, JSONValue>;
  results: NodeResult[];
  errors: string[];
}

function buildNode(
  plan: TestPlanV1,
  node: Node,
  options: ExecutionOptions
): { name: string; execute: (state: ExecutionState, context: NodeExecuteContext) => Promise<ExecutionState> } {
  switch (node.data.type) {
    case NodeType.ENDPOINT: {
      const endpointData = node.data;
      return {
        name: node.id,
        execute: async (state: ExecutionState, _context: NodeExecuteContext): Promise<ExecutionState> => {
          const { responses, results, errors } = state;
          const result = await executeEndpoint(endpointData, plan.endpoint_host, options);
          
          // Store successful response for downstream nodes
          if (result.success && result.response !== undefined) {
            responses[node.id] = result.response;
          }
          
          // Record result in state
          results.push({
            nodeId: node.id,
            success: result.success,
            response: result.response,
            error: result.error,
            duration_ms: result.duration_ms,
          });
          
          // Track errors
          if (!result.success && result.error) {
            errors.push(`${node.id}: ${result.error}`);
          }
          return { responses, results, errors };
        },
      };
    }
    case NodeType.WAIT: {
      const waitData = node.data;
      return {
        name: node.id,
        execute: async (state: ExecutionState, _context: NodeExecuteContext): Promise<ExecutionState> => {
          const { responses, results, errors } = state;
          const result = await executeWait(waitData);
          
          // Record result in state
          results.push({
            nodeId: node.id,
            success: result.success,
            duration_ms: result.duration_ms,
          });
          return { responses, results, errors };
        },
      };
    }
    case NodeType.ASSERTION: {
      const assertionData = node.data;
      return {
        name: node.id,
        execute: async (state: ExecutionState, _context: NodeExecuteContext): Promise<ExecutionState> => {
          const { responses, results, errors } = state;
          const result = await executeAssertions(node.id, assertionData, responses);
          
          // Record result in state
          results.push(result);
          
          // Track errors
          if (!result.success && result.error) {
            errors.push(`${node.id}: ${result.error}`);
          }
          return { responses, results, errors };
        },
      };
    }
  }
}

function buildGraph(plan: TestPlanV1, options: ExecutionOptions): DynamicStateGraph {
  // Create a state store for execution
  const store = graphStore<ExecutionState>(() => ({
    responses: {},
    results: [],
    errors: [],
  }));
  
  const graph: DynamicStateGraph = createStateGraph(store) as DynamicStateGraph;
  
  // Add all nodes - cast back to DynamicStateGraph to maintain our dynamic type
  const graphWithNodes = plan.nodes.reduce<DynamicStateGraph>(
    (g, node) => g.addNode(buildNode(plan, node, options)) as DynamicStateGraph,
    graph
  );
  
  // Add all edges
  // Cast the edge method to accept string arguments since ts-edge expects literal types
  // but we have runtime strings from the plan
  const graphWithEdges = plan.edges.reduce<DynamicStateGraph>(
    (g, edge) => {
      const addEdge = g.edge as (from: string, to: string) => DynamicStateGraph;
      return addEdge(edge.from, edge.to);
    },
    graphWithNodes
  );
  
  return graphWithEdges;
}
export async function executePlanV1(
  plan: TestPlanV1,
  options: ExecutionOptions
): Promise<ExecutionResult> {
  const startTime = Date.now();

  // Build execution graph (state-based)
  const graph = buildGraph(plan, options);
  
  // Find start and end nodes from the plan
  // Convention: nodes with no incoming edges are start candidates, 
  // nodes with no outgoing edges are end candidates
  const incomingEdges = new Set(plan.edges.map(e => e.to));
  const outgoingEdges = new Set(plan.edges.map(e => e.from));
  
  const startNode = plan.nodes.find(n => !incomingEdges.has(n.id))?.id;
  const endNode = plan.nodes.find(n => !outgoingEdges.has(n.id))?.id;
  
  if (!startNode || !endNode) {
    return {
      success: false,
      results: [],
      errors: ['Could not determine start or end node from plan'],
      totalDuration_ms: Date.now() - startTime,
    };
  }

  // Compile and run the state graph
  const app = graph.compile(startNode, endNode);
  const graphResult = await app.run();

  // Extract final state - the output is the ExecutionState
  if (!graphResult.isOk) {
    return {
      success: false,
      results: graphResult.output?.results || [],
      errors: graphResult.output?.errors || [graphResult.error.message],
      totalDuration_ms: Date.now() - startTime,
    };
  }

  const finalState = graphResult.output;

  return {
    success: finalState.errors.length === 0,
    results: finalState.results,
    errors: finalState.errors,
    totalDuration_ms: Date.now() - startTime,
  };
}


async function executeEndpoint(
  endpoint: Endpoint,
  baseHost: string,
  options: ExecutionOptions
): Promise<EndpointResult> {
  const startTime = Date.now();
  
  // Only JSON response format is currently supported
  if (endpoint.response_format !== ResponseFormat.JSON) {
    throw new Error(`Unsupported response format: ${ResponseFormat[endpoint.response_format]}. Only JSON is currently supported.`);
  }
  
  // Use baseUrl from options if provided, otherwise use the plan's endpoint_host
  const host = options.baseUrl || baseHost;
  const url = `${host}${endpoint.path}`;

  try {
    const response = await options.httpClient.request({
      method: httpMethodToString(endpoint.method),
      url,
      headers: endpoint.headers,
      body: endpoint.body,
      timeout: options.timeout || 30000,
    });

    // Parse JSON response if it's a string, otherwise use as-is
    const parsedResponse: JSONValue = typeof response.data === 'string' 
      ? JSON.parse(response.data) 
      : response.data;

    return {
      success: true,
      response: parsedResponse,
      duration_ms: Date.now() - startTime,
    };
  } catch (error: unknown) {
    const duration_ms = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: errorMessage,
      duration_ms,
    };
  }
}

async function executeWait(waitNode: Wait): Promise<WaitResult> {
  const startTime = Date.now();
  await new Promise((resolve) => setTimeout(resolve, waitNode.duration_ms));
  return {
    success: true,
    duration_ms: Date.now() - startTime,
  };
}

async function executeAssertions(
  nodeId: string,
  assertionNode: Assertions,
  responses: Record<string, JSONValue>
): Promise<NodeResult> {
  const startTime = Date.now();
  const errors: string[] = [];

  // TODO: implement assertions
  // Each assertion in assertionNode.assertions should be evaluated against responses

  return {
    nodeId,
    success: errors.length === 0,
    error: errors.length > 0 ? errors.join('; ') : undefined,
    duration_ms: Date.now() - startTime,
  };
}

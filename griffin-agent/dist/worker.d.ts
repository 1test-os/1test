import type { AgentsApi, ConfigApi, RunsApi } from "griffin-hub-sdk";
import type { QueueConsumer } from "./queue/types.js";
import type { SecretProviderRegistry } from "griffin-plan-executor";
import type { HttpClientAdapter } from "griffin-plan-executor";
export interface WorkerConfig {
    /**
     * Initial delay when queue is empty (ms).
     * Uses exponential backoff up to maxEmptyDelay.
     * Default: 1000 (1 second)
     */
    emptyDelay?: number;
    /**
     * Maximum delay when queue is empty (ms).
     * Default: 30000 (30 seconds)
     */
    maxEmptyDelay?: number;
    /**
     * HTTP client for plan execution.
     */
    httpClient: HttpClientAdapter;
    /**
     * Request timeout for plan execution (ms).
     * Default: 30000 (30 seconds)
     */
    timeout?: number;
    /**
     * Secret provider registry for resolving secrets in plans.
     */
    secretRegistry?: SecretProviderRegistry;
}
/**
 * Worker service that processes execution jobs from the queue.
 * Reports results back to the hub via HTTP API.
 */
export declare class WorkerService {
    private location;
    private queueConsumer;
    private agentApi;
    private runsApi;
    private configApi;
    private isRunning;
    private workerPromise?;
    private emptyDelay;
    private maxEmptyDelay;
    private currentEmptyDelay;
    private httpClient;
    private timeout;
    private secretRegistry;
    constructor(location: string, queueConsumer: QueueConsumer, agentApi: AgentsApi, runsApi: RunsApi, configApi: ConfigApi, config: WorkerConfig);
    /**
     * Start processing jobs from the queue.
     */
    start(): void;
    /**
     * Stop the worker gracefully.
     */
    stop(): Promise<void>;
    private runWorkerLoop;
    private processJob;
    private sleep;
}
//# sourceMappingURL=worker.d.ts.map
/**
 * NOTE: These types are duplicated from griffin-hub to avoid cross-dependencies.
 */
export interface Agent {
    id: string;
    location: string;
    status: "online" | "offline";
    lastHeartbeat: string;
    registeredAt: string;
    metadata?: Record<string, string>;
}
export interface JobRunUpdate {
    status: "pending" | "running" | "completed" | "failed";
    completedAt?: string;
    duration_ms?: number;
    success?: boolean;
    errors?: string[];
}
/**
 * HTTP client for communicating with the Griffin Hub.
 * Handles agent registration, heartbeat, and result reporting.
 */
export declare class HubClient {
    private baseUrl;
    private apiKey?;
    private client;
    private agentId?;
    constructor(baseUrl: string, apiKey?: string | undefined);
    /**
     * Register this agent with the hub.
     * Returns the agent record with generated ID.
     */
    register(location: string, metadata?: Record<string, string>): Promise<Agent>;
    /**
     * Send a heartbeat to the hub.
     * Must be called after registration.
     */
    heartbeat(): Promise<void>;
    /**
     * Deregister this agent from the hub.
     * Called on graceful shutdown.
     */
    deregister(): Promise<void>;
    /**
     * Update a job run with execution results.
     */
    updateJobRun(jobRunId: string, update: JobRunUpdate): Promise<void>;
    /**
     * Fetch target configuration for a specific environment and target key.
     */
    getTarget(organizationId: string, environment: string, targetKey: string): Promise<string | undefined>;
    /**
     * Get the agent ID (set after registration).
     */
    getAgentId(): string | undefined;
}
//# sourceMappingURL=hub-client.d.ts.map
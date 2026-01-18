import axios, {} from "axios";
/**
 * HTTP client for communicating with the Griffin Hub.
 * Handles agent registration, heartbeat, and result reporting.
 */
export class HubClient {
    baseUrl;
    apiKey;
    client;
    agentId;
    constructor(baseUrl, apiKey) {
        this.baseUrl = baseUrl;
        this.apiKey = apiKey;
        this.client = axios.create({
            baseURL: this.baseUrl,
            timeout: 10000,
            headers: this.apiKey
                ? {
                    Authorization: `Bearer ${this.apiKey}`,
                }
                : {},
        });
    }
    /**
     * Register this agent with the hub.
     * Returns the agent record with generated ID.
     */
    async register(location, metadata) {
        const response = await this.client.post("/agents/register", {
            location,
            metadata,
        });
        this.agentId = response.data.id;
        return response.data;
    }
    /**
     * Send a heartbeat to the hub.
     * Must be called after registration.
     */
    async heartbeat() {
        if (!this.agentId) {
            throw new Error("Agent not registered. Call register() first.");
        }
        await this.client.post(`/agents/${this.agentId}/heartbeat`);
    }
    /**
     * Deregister this agent from the hub.
     * Called on graceful shutdown.
     */
    async deregister() {
        if (!this.agentId) {
            return; // Nothing to deregister
        }
        try {
            await this.client.delete(`/agents/${this.agentId}`);
        }
        catch (error) {
            console.error("Failed to deregister agent:", error);
            // Don't throw - allow shutdown to continue
        }
    }
    /**
     * Update a job run with execution results.
     */
    async updateJobRun(jobRunId, update) {
        await this.client.patch(`/runs/${jobRunId}`, update);
    }
    /**
     * Fetch target configuration for a specific environment and target key.
     */
    async getTarget(organizationId, environment, targetKey) {
        try {
            const response = await this.client.get(`/config/${organizationId}/${environment}/targets/${targetKey}`);
            return response.data.data.baseUrl;
        }
        catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 404) {
                return undefined;
            }
            throw error;
        }
    }
    /**
     * Get the agent ID (set after registration).
     */
    getAgentId() {
        return this.agentId;
    }
}
//# sourceMappingURL=hub-client.js.map
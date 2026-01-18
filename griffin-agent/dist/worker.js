import { executePlanV1 } from "griffin-plan-executor";
/**
 * Worker service that processes execution jobs from the queue.
 * Reports results back to the hub via HTTP API.
 */
export class WorkerService {
    location;
    queueConsumer;
    agentApi;
    runsApi;
    configApi;
    isRunning = false;
    workerPromise;
    emptyDelay;
    maxEmptyDelay;
    currentEmptyDelay;
    httpClient;
    timeout;
    secretRegistry;
    constructor(location, queueConsumer, agentApi, runsApi, configApi, config) {
        this.location = location;
        this.queueConsumer = queueConsumer;
        this.agentApi = agentApi;
        this.runsApi = runsApi;
        this.configApi = configApi;
        this.emptyDelay = config.emptyDelay ?? 1000;
        this.maxEmptyDelay = config.maxEmptyDelay ?? 30000;
        this.currentEmptyDelay = this.emptyDelay;
        this.httpClient = config.httpClient;
        this.timeout = config.timeout ?? 30000;
        this.secretRegistry = config.secretRegistry;
    }
    /**
     * Start processing jobs from the queue.
     */
    start() {
        if (this.isRunning) {
            throw new Error("Worker is already running");
        }
        this.isRunning = true;
        this.workerPromise = this.runWorkerLoop();
    }
    /**
     * Stop the worker gracefully.
     */
    async stop() {
        if (!this.isRunning) {
            return;
        }
        this.isRunning = false;
        // Wait for current job to complete
        if (this.workerPromise) {
            await this.workerPromise;
        }
    }
    async runWorkerLoop() {
        while (this.isRunning) {
            try {
                const job = await this.queueConsumer.poll(this.location);
                if (!job) {
                    // No jobs available, wait with exponential backoff
                    await this.sleep(this.currentEmptyDelay);
                    this.currentEmptyDelay = Math.min(this.currentEmptyDelay * 2, this.maxEmptyDelay);
                    continue;
                }
                // Reset backoff on successful dequeue
                this.currentEmptyDelay = this.emptyDelay;
                // Process the job
                await this.processJob(job.id, job.data);
            }
            catch (error) {
                console.error("Error in worker loop:", error);
                // Wait a bit before retrying to avoid tight error loops
                await this.sleep(1000);
            }
        }
    }
    async processJob(jobId, data) {
        try {
            const plan = data.plan;
            // Update JobRun to running via hub API
            await this.runsApi.runsIdPatch(data.jobRunId, {
                status: "running",
            });
            console.log(`Executing plan: ${plan.name} (${plan.id}) in environment: ${data.environment} from location: ${data.location}`);
            // Get the organization from the plan (required for target resolution)
            if (!plan.organization) {
                throw new Error(`Plan ${plan.id} does not have an organization set`);
            }
            // Create target resolver function that fetches from hub API
            const targetResolver = async (targetKey) => {
                const { data: { data: { baseUrl } } } = await this.configApi.configOrganizationIdEnvironmentTargetsTargetKeyGet(plan.organization, data.environment, targetKey);
                return baseUrl;
            };
            // Execute the plan
            const startTime = Date.now();
            const executionOptions = {
                mode: "remote",
                httpClient: this.httpClient,
                timeout: this.timeout,
                ...(this.secretRegistry && { secretRegistry: this.secretRegistry }),
                targetResolver,
            };
            const result = await executePlanV1(plan, executionOptions);
            const duration = Date.now() - startTime;
            // Update JobRun with results via hub API
            await this.runsApi.runsIdPatch(data.jobRunId, {
                status: result.success ? "completed" : "failed",
                completedAt: new Date().toISOString(),
                duration_ms: duration,
                success: result.success,
                ...(result.errors.length > 0 && { errors: result.errors }),
            });
            // Acknowledge the job
            await this.queueConsumer.acknowledge(jobId);
            console.log(`Plan execution ${result.success ? "succeeded" : "failed"}: ${plan.name} (${plan.id}) in ${duration}ms`);
        }
        catch (error) {
            console.error(`Error processing job ${jobId}:`, error);
            // Try to update JobRun to failed via hub API
            try {
                await this.runsApi.runsIdPatch(data.jobRunId, {
                    status: "failed",
                    completedAt: new Date().toISOString(),
                    errors: [error instanceof Error ? error.message : String(error)],
                });
            }
            catch (updateError) {
                console.error("Failed to update JobRun:", updateError);
            }
            // Fail the job (with retry)
            await this.queueConsumer.fail(jobId, error instanceof Error ? error : new Error(String(error)), true);
        }
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
//# sourceMappingURL=worker.js.map
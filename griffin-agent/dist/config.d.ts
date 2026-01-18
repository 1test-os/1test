import { Type, type Static } from "typebox";
/**
 * Configuration schema for the griffin-agent.
 * Agents consume jobs from queues and report results to the hub.
 */
export declare const AgentConfigSchema: Type.TObject<{
    agent: Type.TObject<{
        location: Type.TString;
        metadata: Type.TOptional<Type.TRecord<"^.*$", Type.TString>>;
    }>;
    hub: Type.TObject<{
        url: Type.TString;
        apiKey: Type.TOptional<Type.TString>;
    }>;
    queue: Type.TObject<{
        backend: Type.TUnion<[Type.TLiteral<"postgres">, Type.TLiteral<"sqs">, Type.TLiteral<"redis">]>;
        connectionString: Type.TOptional<Type.TString>;
        queueName: Type.TString;
        pollInterval: Type.TNumber;
        maxPollInterval: Type.TNumber;
    }>;
    heartbeat: Type.TObject<{
        enabled: Type.TBoolean;
        interval: Type.TNumber;
    }>;
    planExecution: Type.TObject<{
        timeout: Type.TNumber;
    }>;
    secrets: Type.TObject<{
        providers: Type.TArray<Type.TString>;
        env: Type.TObject<{
            prefix: Type.TOptional<Type.TString>;
        }>;
        aws: Type.TOptional<Type.TObject<{
            region: Type.TString;
            prefix: Type.TOptional<Type.TString>;
        }>>;
        vault: Type.TOptional<Type.TObject<{
            address: Type.TString;
            token: Type.TOptional<Type.TString>;
            namespace: Type.TOptional<Type.TString>;
            kvVersion: Type.TOptional<Type.TUnion<[Type.TLiteral<1>, Type.TLiteral<2>]>>;
            prefix: Type.TOptional<Type.TString>;
        }>>;
    }>;
}>;
export type AgentConfig = Static<typeof AgentConfigSchema>;
/**
 * Load agent configuration from environment variables.
 */
export declare function loadAgentConfigFromEnv(): AgentConfig;
//# sourceMappingURL=config.d.ts.map
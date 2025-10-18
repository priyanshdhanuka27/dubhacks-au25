export declare const config: {
    port: string | number;
    nodeEnv: string;
    jwtSecret: string;
    jwtExpiresIn: string;
    refreshTokenExpiresIn: string;
    aws: {
        region: string;
        accessKeyId: string | undefined;
        secretAccessKey: string | undefined;
        dynamodb: {
            usersTable: string;
            eventsTable: string;
            endpoint: string | undefined;
        };
        opensearch: {
            endpoint: string | undefined;
            region: string;
            indexName: string;
        };
        bedrock: {
            region: string;
            knowledgeBaseId: string | undefined;
            modelId: string;
            embeddingModelId: string;
        };
        cloudwatch: {
            logGroupName: string;
            region: string;
        };
    };
    cors: {
        origin: string;
        credentials: boolean;
    };
    rateLimit: {
        windowMs: number;
        max: number;
    };
    search: {
        maxResults: number;
        defaultRadius: number;
    };
    calendar: {
        icsFileTTL: number;
    };
};
export declare function validateConfig(): void;
//# sourceMappingURL=index.d.ts.map
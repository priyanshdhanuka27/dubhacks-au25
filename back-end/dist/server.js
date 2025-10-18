"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.server = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const config_1 = require("./config");
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
// Validate configuration on startup
(0, config_1.validateConfig)();
const app = (0, express_1.default)();
exports.app = app;
// Security middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)(config_1.config.cors));
// Body parsing middleware
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
    });
});
// API routes
app.use('/api/auth', authRoutes_1.default);
app.get('/api', (req, res) => {
    res.json({
        message: 'EventSync API Server',
        version: '1.0.0',
        endpoints: {
            health: '/health',
            auth: '/api/auth',
            events: '/api/events',
            search: '/api/search',
            calendar: '/api/calendar',
            users: '/api/users',
        },
    });
});
// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: config_1.config.nodeEnv === 'development' ? err.message : 'Something went wrong',
        timestamp: new Date().toISOString(),
    });
});
// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.originalUrl} not found`,
        timestamp: new Date().toISOString(),
    });
});
const server = app.listen(config_1.config.port, () => {
    console.log(`🚀 EventSync API Server running on port ${config_1.config.port}`);
    console.log(`📊 Environment: ${config_1.config.nodeEnv}`);
    console.log(`🔗 Health check: http://localhost:${config_1.config.port}/health`);
});
exports.server = server;
//# sourceMappingURL=server.js.map
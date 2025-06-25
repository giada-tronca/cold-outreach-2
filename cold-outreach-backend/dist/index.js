"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("module-alias/register");
const path_1 = __importDefault(require("path"));
const module_alias_1 = __importDefault(require("module-alias"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const environment_1 = __importStar(require("./config/environment"));
// Import API layer components
const routes_1 = __importDefault(require("./routes"));
const middleware_1 = require("./middleware");
// Import workers for background job processing
const workers_1 = require("./jobs/workers");
// Add path aliases
const rootDir = path_1.default.resolve(__dirname);
module_alias_1.default.addAliases({
    '@': rootDir,
    '@/config': path_1.default.join(rootDir, 'config'),
    '@/routes': path_1.default.join(rootDir, 'routes'),
    '@/services': path_1.default.join(rootDir, 'services'),
    '@/middleware': path_1.default.join(rootDir, 'middleware'),
    '@/models': path_1.default.join(rootDir, 'models'),
    '@/types': path_1.default.join(rootDir, 'types'),
    '@/utils': path_1.default.join(rootDir, 'utils')
});
const app = (0, express_1.default)();
const port = environment_1.default.PORT;
// Trust proxy if behind a reverse proxy
if (environment_1.default.TRUST_PROXY) {
    app.set('trust proxy', 1);
}
// Basic middleware setup
app.use((0, helmet_1.default)({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));
// CORS configuration
app.use((0, cors_1.default)((0, environment_1.getCORSConfig)()));
// Logging middleware
if ((0, environment_1.isDevelopment)()) {
    app.use((0, morgan_1.default)('dev'));
}
else {
    app.use((0, morgan_1.default)('combined'));
}
// Request ID middleware
app.use(middleware_1.requestIdHandler);
// Body parsing middleware
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Static file serving
app.use('/static', express_1.default.static('public'));
// API routes
app.use('/api', routes_1.default);
// Root route
app.get('/', (req, res) => {
    res.json({
        message: 'Cold Outreach AI API',
        version: '1.0.0',
        environment: environment_1.default.NODE_ENV,
        timestamp: new Date().toISOString()
    });
});
// Error handling middleware (must be last)
app.use(middleware_1.notFoundHandler);
app.use(middleware_1.globalErrorHandler);
/**
 * Start the server
 */
const startServer = async () => {
    try {
        console.log('🚀 Starting Cold Outreach AI API Server...');
        // Log configuration summary
        (0, environment_1.logConfigurationSummary)(console);
        // Start background job workers
        console.log('🔧 Starting background job workers...');
        await workers_1.WorkerManager.startAllWorkers();
        // Start HTTP server
        const server = app.listen(port, () => {
            console.log(`✅ Server running on http://localhost:${port}`);
            console.log(`📖 API Documentation: http://localhost:${port}/api`);
            console.log(`🏥 Health Check: http://localhost:${port}/api/health`);
            if ((0, environment_1.isDevelopment)()) {
                console.log(`🔧 Development mode enabled`);
            }
        });
        // Graceful shutdown handling
        const gracefulShutdown = async (signal) => {
            console.log(`📡 Received ${signal}. Starting graceful shutdown...`);
            // Stop workers first
            console.log('🛑 Stopping background job workers...');
            await workers_1.WorkerManager.stopAllWorkers();
            server.close(() => {
                console.log('✅ HTTP server closed');
                process.exit(0);
            });
        };
        // Listen for termination signals
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    }
    catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};
// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);
    process.exit(1);
});
// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});
// Start the server
startServer();

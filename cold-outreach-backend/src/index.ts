import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import envConfig, {
    getCORSConfig,
    logConfigurationSummary,
    isDevelopment
} from './config/environment';

// Import API layer components
import apiRoutes from './routes';
import {
    globalErrorHandler,
    notFoundHandler,
    requestIdHandler
} from './middleware';

// Import workers for background job processing
import { WorkerManager } from './jobs/workers';

const app: Express = express();
const port = envConfig.PORT;

// Trust proxy if behind a reverse proxy
if (envConfig.TRUST_PROXY) {
    app.set('trust proxy', 1);
}

// Basic middleware setup
app.use(helmet({
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
app.use(cors(getCORSConfig()));

// Logging middleware
if (isDevelopment()) {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

// Request ID middleware
app.use(requestIdHandler);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving
app.use('/static', express.static('public'));

// API routes
app.use('/api', apiRoutes);

// Root route
app.get('/', (req: Request, res: Response) => {
    res.json({
        message: 'Cold Outreach AI API',
        version: '1.0.0',
        environment: envConfig.NODE_ENV,
        timestamp: new Date().toISOString()
    });
});

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(globalErrorHandler);

/**
 * Start the server
 */
const startServer = async (): Promise<void> => {
    try {
        console.log('🚀 Starting Cold Outreach AI API Server...');

        // Log configuration summary
        logConfigurationSummary(console);

        // Start background job workers
        console.log('🔧 Starting background job workers...');
        await WorkerManager.startAllWorkers();

        // Start HTTP server
        const server = app.listen(port, () => {
            console.log(`✅ Server running on http://localhost:${port}`);
            console.log(`📖 API Documentation: http://localhost:${port}/api`);
            console.log(`🏥 Health Check: http://localhost:${port}/api/health`);

            if (isDevelopment()) {
                console.log(`🔧 Development mode enabled`);
            }
        });

        // Graceful shutdown handling
        const gracefulShutdown = async (signal: string) => {
            console.log(`📡 Received ${signal}. Starting graceful shutdown...`);

            // Stop workers first
            console.log('🛑 Stopping background job workers...');
            await WorkerManager.stopAllWorkers();

            server.close(() => {
                console.log('✅ HTTP server closed');
                process.exit(0);
            });
        };

        // Listen for termination signals
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
    console.error('💥 Uncaught Exception:', error);
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: unknown, promise: Promise<any>) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Start the server
startServer(); 
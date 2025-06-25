"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SSEService = void 0;
exports.createSSEHandler = createSSEHandler;
exports.startSSEHeartbeat = startSSEHeartbeat;
const events_1 = require("events");
/**
 * SSE (Server-Sent Events) Service
 * Provides real-time updates for job progress, batch processing, etc.
 */
class SSEService extends events_1.EventEmitter {
    constructor() {
        super();
        this.connections = new Map();
        this.userConnections = new Map();
        this.setMaxListeners(0); // Remove limit on event listeners
    }
    /**
     * Get singleton instance
     */
    static getInstance() {
        if (!SSEService.instance) {
            SSEService.instance = new SSEService();
        }
        return SSEService.instance;
    }
    /**
     * Create SSE connection for a client
     */
    createConnection(connectionId, userId, res) {
        // Set SSE headers
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Cache-Control',
        });
        // Store connection
        this.connections.set(connectionId, res);
        // Track user connections
        if (!this.userConnections.has(userId)) {
            this.userConnections.set(userId, new Set());
        }
        this.userConnections.get(userId).add(connectionId);
        // Send initial connection confirmation
        this.sendToConnection(connectionId, 'connected', {
            message: 'SSE connection established',
            connectionId,
            timestamp: new Date().toISOString(),
        });
        // Handle client disconnect
        res.on('close', () => {
            this.removeConnection(connectionId, userId);
        });
        res.on('error', error => {
            console.error(`SSE connection error for ${connectionId}:`, error);
            this.removeConnection(connectionId, userId);
        });
        console.log(`📡 [SSE]: Connection established for user ${userId} (${connectionId})`);
    }
    /**
     * Remove connection
     */
    removeConnection(connectionId, userId) {
        this.connections.delete(connectionId);
        const userConnections = this.userConnections.get(userId);
        if (userConnections) {
            userConnections.delete(connectionId);
            if (userConnections.size === 0) {
                this.userConnections.delete(userId);
            }
        }
        console.log(`🔌 [SSE]: Connection closed for user ${userId} (${connectionId})`);
    }
    /**
     * Send data to specific connection
     */
    sendToConnection(connectionId, event, data) {
        const connection = this.connections.get(connectionId);
        if (!connection) {
            return false;
        }
        try {
            const sseData = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
            connection.write(sseData);
            return true;
        }
        catch (error) {
            console.error(`Error sending SSE data to ${connectionId}:`, error);
            return false;
        }
    }
    /**
     * Send data to all connections for a user
     */
    sendToUser(userId, event, data) {
        const userConnections = this.userConnections.get(userId);
        if (!userConnections) {
            return 0;
        }
        let sent = 0;
        for (const connectionId of userConnections) {
            if (this.sendToConnection(connectionId, event, data)) {
                sent++;
            }
        }
        return sent;
    }
    /**
     * Send data to all connections
     */
    broadcast(event, data) {
        let sent = 0;
        for (const connectionId of this.connections.keys()) {
            if (this.sendToConnection(connectionId, event, data)) {
                sent++;
            }
        }
        return sent;
    }
    /**
     * Send job progress update
     */
    sendJobProgress(userId, jobData) {
        this.sendToUser(userId, 'job-progress', {
            type: 'job-progress',
            ...jobData,
            timestamp: new Date().toISOString(),
        });
    }
    /**
     * Send batch progress update
     */
    sendBatchProgress(userId, batchData) {
        this.sendToUser(userId, 'batch-progress', {
            type: 'batch-progress',
            batchId: batchData.batchId,
            batchType: batchData.batchType,
            progress: batchData.progress,
            processed: batchData.processed,
            total: batchData.total,
            failed: batchData.failed,
            status: batchData.status,
            currentItem: batchData.currentItem,
            estimatedCompletion: batchData.estimatedCompletion,
            timestamp: new Date().toISOString(),
        });
    }
    /**
     * Send workflow progress update
     */
    sendWorkflowProgress(userId, workflowData) {
        this.sendToUser(userId, 'workflow-progress', {
            type: 'workflow-progress',
            workflowSessionId: workflowData.workflowSessionId,
            step: workflowData.step,
            progress: workflowData.progress,
            status: workflowData.status,
            message: workflowData.message,
            data: workflowData.data,
            timestamp: new Date().toISOString(),
        });
    }
    /**
     * Send prospect enrichment update
     */
    sendProspectEnrichmentUpdate(userId, prospectData) {
        this.sendToUser(userId, 'prospect-enrichment', {
            type: 'prospect-enrichment',
            ...prospectData,
            timestamp: new Date().toISOString(),
        });
    }
    /**
     * Send email generation update
     */
    sendEmailGenerationUpdate(userId, emailData) {
        const sseData = {
            type: 'email-generation',
            ...emailData,
            timestamp: new Date().toISOString(),
        };
        console.log(`📡 [SSE]: Sending email generation update to user ${userId}:`, JSON.stringify(sseData));
        const sentCount = this.sendToUser(userId, 'email-generation', sseData);
        console.log(`📡 [SSE]: Email generation update sent to ${sentCount} connections`);
    }
    /**
     * Send job progress update
     */
    sendJobProgressUpdate(userId, jobData) {
        const sseData = {
            type: 'job-progress',
            ...jobData,
            timestamp: new Date().toISOString(),
        };
        console.log(`📡 [SSE]: Sending job progress update to user ${userId}:`, JSON.stringify(sseData));
        const sentCount = this.sendToUser(userId, 'job-progress', sseData);
        console.log(`📡 [SSE]: Job progress update sent to ${sentCount} connections`);
    }
    /**
     * Send system notification
     */
    sendNotification(userId, notification) {
        this.sendToUser(userId, 'notification', {
            type: 'notification',
            notificationType: notification.type,
            title: notification.title,
            message: notification.message,
            action: notification.action,
            timestamp: new Date().toISOString(),
        });
    }
    /**
     * Send heartbeat to keep connections alive
     */
    sendHeartbeat() {
        this.broadcast('heartbeat', {
            type: 'heartbeat',
            timestamp: new Date().toISOString(),
        });
    }
    /**
     * Get connection statistics
     */
    getStats() {
        const connectionsByUser = {};
        for (const [userId, connections] of this.userConnections) {
            connectionsByUser[userId] = connections.size;
        }
        return {
            totalConnections: this.connections.size,
            activeUsers: this.userConnections.size,
            connectionsByUser,
        };
    }
    /**
     * Close all connections
     */
    closeAllConnections() {
        for (const [connectionId, connection] of this.connections) {
            try {
                connection.end();
            }
            catch (error) {
                console.error(`Error closing SSE connection ${connectionId}:`, error);
            }
        }
        this.connections.clear();
        this.userConnections.clear();
        console.log('🔌 [SSE]: All connections closed');
    }
}
exports.SSEService = SSEService;
/**
 * SSE Route Handler
 */
function createSSEHandler(userId) {
    return (req, res) => {
        const connectionId = `${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        // Create SSE connection
        const sseService = SSEService.getInstance();
        sseService.createConnection(connectionId, userId, res);
    };
}
/**
 * Start heartbeat timer to keep connections alive
 */
function startSSEHeartbeat(intervalMs = 30000) {
    return setInterval(() => {
        const sseService = SSEService.getInstance();
        sseService.sendHeartbeat();
    }, intervalMs);
}
exports.default = SSEService;

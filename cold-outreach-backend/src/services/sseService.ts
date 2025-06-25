import { Response } from 'express';
import { EventEmitter } from 'events';

/**
 * SSE (Server-Sent Events) Service
 * Provides real-time updates for job progress, batch processing, etc.
 */
export class SSEService extends EventEmitter {
  private static instance: SSEService;
  private connections: Map<string, Response> = new Map();
  private userConnections: Map<string, Set<string>> = new Map();

  private constructor() {
    super();
    this.setMaxListeners(0); // Remove limit on event listeners
  }

  /**
   * Get singleton instance
   */
  static getInstance(): SSEService {
    if (!SSEService.instance) {
      SSEService.instance = new SSEService();
    }
    return SSEService.instance;
  }

  /**
   * Create SSE connection for a client
   */
  createConnection(connectionId: string, userId: string, res: Response): void {
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
    this.userConnections.get(userId)!.add(connectionId);

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

    console.log(
      `📡 [SSE]: Connection established for user ${userId} (${connectionId})`
    );
  }

  /**
   * Remove connection
   */
  private removeConnection(connectionId: string, userId: string): void {
    this.connections.delete(connectionId);

    const userConnections = this.userConnections.get(userId);
    if (userConnections) {
      userConnections.delete(connectionId);
      if (userConnections.size === 0) {
        this.userConnections.delete(userId);
      }
    }

    console.log(
      `🔌 [SSE]: Connection closed for user ${userId} (${connectionId})`
    );
  }

  /**
   * Send data to specific connection
   */
  private sendToConnection(
    connectionId: string,
    event: string,
    data: any
  ): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return false;
    }

    try {
      const sseData = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
      connection.write(sseData);
      return true;
    } catch (error) {
      console.error(`Error sending SSE data to ${connectionId}:`, error);
      return false;
    }
  }

  /**
   * Send data to all connections for a user
   */
  sendToUser(userId: string, event: string, data: any): number {
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
  broadcast(event: string, data: any): number {
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
  sendJobProgress(
    userId: string,
    jobData: {
      jobId: string;
      queueName: string;
      progress: any;
      status: string;
    }
  ): void {
    this.sendToUser(userId, 'job-progress', {
      type: 'job-progress',
      ...jobData,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Send batch progress update
   */
  sendBatchProgress(
    userId: string,
    batchData: {
      batchId: string;
      batchType: string;
      progress: number;
      processed: number;
      total: number;
      failed: number;
      status: string;
      currentItem?: string;
      estimatedCompletion?: Date;
    }
  ): void {
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
  sendWorkflowProgress(
    userId: string,
    workflowData: {
      workflowSessionId: string;
      step: string;
      progress: number;
      status: string;
      message?: string;
      data?: any;
    }
  ): void {
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
  sendProspectEnrichmentUpdate(
    userId: string,
    prospectData: {
      prospectId: string;
      status: string;
      progress?: number;
      enrichmentData?: any;
      error?: string;
    }
  ): void {
    this.sendToUser(userId, 'prospect-enrichment', {
      type: 'prospect-enrichment',
      ...prospectData,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Send email generation update
   */
  sendEmailGenerationUpdate(
    userId: string,
    emailData: {
      prospectId: string;
      campaignId: string;
      status: string;
      emailId?: string;
      subject?: string;
      preview?: string;
      error?: string;
    }
  ): void {
    const sseData = {
      type: 'email-generation',
      ...emailData,
      timestamp: new Date().toISOString(),
    };
    console.log(
      `📡 [SSE]: Sending email generation update to user ${userId}:`,
      JSON.stringify(sseData)
    );
    const sentCount = this.sendToUser(userId, 'email-generation', sseData);
    console.log(
      `📡 [SSE]: Email generation update sent to ${sentCount} connections`
    );
  }

  /**
   * Send job progress update
   */
  sendJobProgressUpdate(
    userId: string,
    jobData: {
      jobId: string;
      jobType: string;
      status: string;
      progress: number;
      totalProspects: number;
      completedProspects: number;
      failedProspects: number;
      csvDownloadUrl?: string;
      prospects?: any[];
      errors?: any[];
    }
  ): void {
    const sseData = {
      type: 'job-progress',
      ...jobData,
      timestamp: new Date().toISOString(),
    };
    console.log(
      `📡 [SSE]: Sending job progress update to user ${userId}:`,
      JSON.stringify(sseData)
    );
    const sentCount = this.sendToUser(userId, 'job-progress', sseData);
    console.log(
      `📡 [SSE]: Job progress update sent to ${sentCount} connections`
    );
  }

  /**
   * Send system notification
   */
  sendNotification(
    userId: string,
    notification: {
      type: 'info' | 'success' | 'warning' | 'error';
      title: string;
      message: string;
      action?: {
        label: string;
        url: string;
      };
    }
  ): void {
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
  sendHeartbeat(): void {
    this.broadcast('heartbeat', {
      type: 'heartbeat',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get connection statistics
   */
  getStats(): {
    totalConnections: number;
    activeUsers: number;
    connectionsByUser: Record<string, number>;
  } {
    const connectionsByUser: Record<string, number> = {};

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
  closeAllConnections(): void {
    for (const [connectionId, connection] of this.connections) {
      try {
        connection.end();
      } catch (error) {
        console.error(`Error closing SSE connection ${connectionId}:`, error);
      }
    }

    this.connections.clear();
    this.userConnections.clear();
    console.log('🔌 [SSE]: All connections closed');
  }
}

/**
 * SSE Route Handler
 */
export function createSSEHandler(userId: string) {
  return (req: any, res: Response) => {
    const connectionId = `${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create SSE connection
    const sseService = SSEService.getInstance();
    sseService.createConnection(connectionId, userId, res);
  };
}

/**
 * Start heartbeat timer to keep connections alive
 */
export function startSSEHeartbeat(intervalMs = 30000): NodeJS.Timeout {
  return setInterval(() => {
    const sseService = SSEService.getInstance();
    sseService.sendHeartbeat();
  }, intervalMs);
}

export default SSEService;

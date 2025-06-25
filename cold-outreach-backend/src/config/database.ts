import { PrismaClient } from '@prisma/client';
// Type extensions are automatically loaded via tsconfig

// Create a custom logger
const logger = {
  info: (message: string, data?: any) => {
    console.log(
      `[DATABASE] ${message}`,
      data ? JSON.stringify(data, null, 2) : ''
    );
  },
  error: (message: string, error?: any) => {
    console.error(`[DATABASE ERROR] ${message}`, error);
  },
  warn: (message: string, data?: any) => {
    console.warn(
      `[DATABASE WARNING] ${message}`,
      data ? JSON.stringify(data, null, 2) : ''
    );
  },
};

// Create Prisma client with proper configuration
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: ['warn', 'error'],
});

// Add runtime aliases for backward compatibility
function addModelAliases(client: any) {
  // Create aliases for the old model names - using the actual model names from Prisma
  Object.defineProperty(client, 'prospect', {
    get() {
      return client.cOProspects;
    },
    enumerable: true,
    configurable: true,
  });

  Object.defineProperty(client, 'campaign', {
    get() {
      return client.cOCampaigns;
    },
    enumerable: true,
    configurable: true,
  });

  Object.defineProperty(client, 'batch', {
    get() {
      return client.cOBatches;
    },
    enumerable: true,
    configurable: true,
  });

  Object.defineProperty(client, 'prospectEnrichment', {
    get() {
      return client.cOProspectEnrichments;
    },
    enumerable: true,
    configurable: true,
  });

  Object.defineProperty(client, 'generatedEmail', {
    get() {
      return client.cOGeneratedEmails;
    },
    enumerable: true,
    configurable: true,
  });

  Object.defineProperty(client, 'service', {
    get() {
      return client.cOServices;
    },
    enumerable: true,
    configurable: true,
  });

  Object.defineProperty(client, 'apiConfiguration', {
    get() {
      return client.cOApiConfigurations;
    },
    enumerable: true,
    configurable: true,
  });

  Object.defineProperty(client, 'prompt', {
    get() {
      return client.cOPrompts;
    },
    enumerable: true,
    configurable: true,
  });

  Object.defineProperty(client, 'autoServiceSettings', {
    get() {
      return client.cOAutoServiceSettings;
    },
    enumerable: true,
    configurable: true,
  });

  Object.defineProperty(client, 'workflowSession', {
    get() {
      return client.cOWorkflowSessions;
    },
    enumerable: true,
    configurable: true,
  });

  // Add placeholders for missing models to prevent errors
  Object.defineProperty(client, 'fileUpload', {
    get() {
      return null;
    },
    enumerable: true,
    configurable: true,
  });

  Object.defineProperty(client, 'fileHistory', {
    get() {
      return null;
    },
    enumerable: true,
    configurable: true,
  });
}

// Add the aliases
addModelAliases(prisma);

// Database connection management
let isConnected = false;

async function connectDatabase() {
  if (isConnected) return;

  try {
    await prisma.$connect();
    isConnected = true;
    logger.info('✅ Database connected successfully');

    // Test connection
    await prisma.$queryRaw`SELECT 1 as test`;
    logger.info('✅ Database connection test passed');
  } catch (error) {
    logger.error('❌ Database connection failed:', error);
    throw error;
  }
}

async function disconnectDatabase() {
  if (!isConnected) return;

  try {
    await prisma.$disconnect();
    isConnected = false;
    logger.info('Database disconnected');
  } catch (error) {
    logger.error('Error disconnecting from database:', error);
  }
}

// Auto-connect when module is imported
connectDatabase().catch(error => {
  logger.error('Failed to auto-connect to database:', error);
});

// Graceful shutdown
process.on('beforeExit', () => {
  disconnectDatabase();
});

process.on('SIGINT', () => {
  disconnectDatabase().then(() => process.exit(0));
});

process.on('SIGTERM', () => {
  disconnectDatabase().then(() => process.exit(0));
});

export { prisma };
export default prisma;

// Export types for convenience
export * from '@prisma/client';

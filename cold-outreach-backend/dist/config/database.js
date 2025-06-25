"use strict";
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
var client_1 = require("@prisma/client");
// Type extensions are automatically loaded via tsconfig
// Create a custom logger
var logger = {
    info: function (message, data) {
        console.log("[DATABASE] ".concat(message), data ? JSON.stringify(data, null, 2) : '');
    },
    error: function (message, error) {
        console.error("[DATABASE ERROR] ".concat(message), error);
    },
    warn: function (message, data) {
        console.warn("[DATABASE WARNING] ".concat(message), data ? JSON.stringify(data, null, 2) : '');
    },
};
// Create Prisma client with proper configuration
var prisma = new client_1.PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL,
        },
    },
    log: ['warn', 'error'],
});
exports.prisma = prisma;
// Add runtime aliases for backward compatibility
function addModelAliases(client) {
    // Create aliases for the old model names - using the actual model names from Prisma
    Object.defineProperty(client, 'prospect', {
        get: function () {
            return client.cOProspects;
        },
        enumerable: true,
        configurable: true,
    });
    Object.defineProperty(client, 'campaign', {
        get: function () {
            return client.cOCampaigns;
        },
        enumerable: true,
        configurable: true,
    });
    Object.defineProperty(client, 'batch', {
        get: function () {
            return client.cOBatches;
        },
        enumerable: true,
        configurable: true,
    });
    Object.defineProperty(client, 'prospectEnrichment', {
        get: function () {
            return client.cOProspectEnrichments;
        },
        enumerable: true,
        configurable: true,
    });
    Object.defineProperty(client, 'generatedEmail', {
        get: function () {
            return client.cOGeneratedEmails;
        },
        enumerable: true,
        configurable: true,
    });
    Object.defineProperty(client, 'service', {
        get: function () {
            return client.cOServices;
        },
        enumerable: true,
        configurable: true,
    });
    Object.defineProperty(client, 'apiConfiguration', {
        get: function () {
            return client.cOApiConfigurations;
        },
        enumerable: true,
        configurable: true,
    });
    Object.defineProperty(client, 'prompt', {
        get: function () {
            return client.cOPrompts;
        },
        enumerable: true,
        configurable: true,
    });
    Object.defineProperty(client, 'autoServiceSettings', {
        get: function () {
            return client.cOAutoServiceSettings;
        },
        enumerable: true,
        configurable: true,
    });
    Object.defineProperty(client, 'workflowSession', {
        get: function () {
            return client.cOWorkflowSessions;
        },
        enumerable: true,
        configurable: true,
    });
    // Add placeholders for missing models to prevent errors
    Object.defineProperty(client, 'fileUpload', {
        get: function () {
            return null;
        },
        enumerable: true,
        configurable: true,
    });
    Object.defineProperty(client, 'fileHistory', {
        get: function () {
            return null;
        },
        enumerable: true,
        configurable: true,
    });
}
// Add the aliases
addModelAliases(prisma);
// Database connection management
var isConnected = false;
function connectDatabase() {
    return __awaiter(this, void 0, void 0, function () {
        var error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (isConnected)
                        return [2 /*return*/];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, prisma.$connect()];
                case 2:
                    _a.sent();
                    isConnected = true;
                    logger.info('✅ Database connected successfully');
                    // Test connection
                    return [4 /*yield*/, prisma.$queryRaw(templateObject_1 || (templateObject_1 = __makeTemplateObject(["SELECT 1 as test"], ["SELECT 1 as test"])))];
                case 3:
                    // Test connection
                    _a.sent();
                    logger.info('✅ Database connection test passed');
                    return [3 /*break*/, 5];
                case 4:
                    error_1 = _a.sent();
                    logger.error('❌ Database connection failed:', error_1);
                    throw error_1;
                case 5: return [2 /*return*/];
            }
        });
    });
}
function disconnectDatabase() {
    return __awaiter(this, void 0, void 0, function () {
        var error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!isConnected)
                        return [2 /*return*/];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, prisma.$disconnect()];
                case 2:
                    _a.sent();
                    isConnected = false;
                    logger.info('Database disconnected');
                    return [3 /*break*/, 4];
                case 3:
                    error_2 = _a.sent();
                    logger.error('Error disconnecting from database:', error_2);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
// Auto-connect when module is imported
connectDatabase().catch(function (error) {
    logger.error('Failed to auto-connect to database:', error);
});
// Graceful shutdown
process.on('beforeExit', function () {
    disconnectDatabase();
});
process.on('SIGINT', function () {
    disconnectDatabase().then(function () { return process.exit(0); });
});
process.on('SIGTERM', function () {
    disconnectDatabase().then(function () { return process.exit(0); });
});
exports.default = prisma;
// Export types for convenience
__exportStar(require("@prisma/client"), exports);
var templateObject_1;

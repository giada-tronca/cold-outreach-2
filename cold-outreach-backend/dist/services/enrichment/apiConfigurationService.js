"use strict";
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
exports.ApiConfigurationService = void 0;
var database_1 = require("@/config/database");
var errors_1 = require("@/utils/errors");
/**
 * API Configuration Service
 * Manages API keys and configuration settings from database
 */
var ApiConfigurationService = /** @class */ (function () {
    function ApiConfigurationService() {
    }
    /**
     * Get API keys from database with caching
     */
    ApiConfigurationService.getApiKeys = function () {
        return __awaiter(this, void 0, void 0, function () {
            var config, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        // Check if cache is still valid
                        if (this.apiKeys && this.lastFetch &&
                            (Date.now() - this.lastFetch.getTime()) < this.CACHE_DURATION) {
                            return [2 /*return*/, this.apiKeys];
                        }
                        return [4 /*yield*/, database_1.prisma.cOApiConfigurations.findFirst({
                                where: { isActive: true },
                                orderBy: { createdAt: 'desc' }
                            })];
                    case 1:
                        config = _a.sent();
                        if (!config) {
                            throw new errors_1.DatabaseError('No active API configuration found in database');
                        }
                        this.apiKeys = {};
                        if (config.openrouterApiKey)
                            this.apiKeys.openrouterApiKey = config.openrouterApiKey;
                        if (config.geminiApiKey)
                            this.apiKeys.geminiApiKey = config.geminiApiKey;
                        if (config.firecrawlApiKey)
                            this.apiKeys.firecrawlApiKey = config.firecrawlApiKey;
                        if (config.proxycurlApiKey)
                            this.apiKeys.proxycurlApiKey = config.proxycurlApiKey;
                        this.lastFetch = new Date();
                        return [2 /*return*/, this.apiKeys];
                    case 2:
                        error_1 = _a.sent();
                        console.error('Failed to fetch API keys:', error_1);
                        throw new errors_1.DatabaseError('Failed to retrieve API configuration');
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get model configuration with defaults
     */
    ApiConfigurationService.getModelConfiguration = function () {
        return __awaiter(this, void 0, void 0, function () {
            var config, modelConfig, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        // Check cache
                        if (this.modelConfig && this.lastFetch &&
                            (Date.now() - this.lastFetch.getTime()) < this.CACHE_DURATION) {
                            return [2 /*return*/, this.modelConfig];
                        }
                        return [4 /*yield*/, database_1.prisma.cOApiConfigurations.findFirst({
                                where: { isActive: true },
                                orderBy: { createdAt: 'desc' }
                            })];
                    case 1:
                        config = _a.sent();
                        modelConfig = {
                            timeout: 30000, // 30 seconds
                            retryAttempts: 3,
                            requestDelay: 1000, // 1 second between requests
                            batchSize: 10,
                            concurrency: 3,
                        };
                        // Use actual config fields since modelConfiguration doesn't exist
                        if (config) {
                            modelConfig = {
                                timeout: config.timeoutSeconds ? config.timeoutSeconds * 1000 : modelConfig.timeout,
                                retryAttempts: config.maxRetries || modelConfig.retryAttempts,
                                requestDelay: modelConfig.requestDelay, // No field in schema
                                batchSize: modelConfig.batchSize, // No field in schema
                                concurrency: modelConfig.concurrency, // No field in schema
                            };
                        }
                        this.modelConfig = modelConfig;
                        return [2 /*return*/, modelConfig];
                    case 2:
                        error_2 = _a.sent();
                        console.error('Failed to fetch model configuration:', error_2);
                        // Return defaults on error
                        return [2 /*return*/, {
                                timeout: 30000,
                                retryAttempts: 3,
                                requestDelay: 1000,
                                batchSize: 10,
                                concurrency: 3,
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get specific API key
     */
    ApiConfigurationService.getApiKey = function (service) {
        return __awaiter(this, void 0, void 0, function () {
            var keys, key;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getApiKeys()];
                    case 1:
                        keys = _a.sent();
                        key = keys[service];
                        if (!key) {
                            throw new errors_1.DatabaseError("".concat(service, " API key not found in configuration"));
                        }
                        return [2 /*return*/, key];
                }
            });
        });
    };
    /**
     * Clear cache (useful for testing or config updates)
     */
    ApiConfigurationService.clearCache = function () {
        this.apiKeys = null;
        this.modelConfig = null;
        this.lastFetch = null;
    };
    /**
     * Validate API keys exist
     */
    ApiConfigurationService.validateApiKeys = function (requiredServices) {
        return __awaiter(this, void 0, void 0, function () {
            var keys, missing, _i, requiredServices_1, service, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.getApiKeys()];
                    case 1:
                        keys = _a.sent();
                        missing = [];
                        for (_i = 0, requiredServices_1 = requiredServices; _i < requiredServices_1.length; _i++) {
                            service = requiredServices_1[_i];
                            if (!keys[service]) {
                                missing.push(service);
                            }
                        }
                        return [2 /*return*/, {
                                valid: missing.length === 0,
                                missing: missing
                            }];
                    case 2:
                        error_3 = _a.sent();
                        return [2 /*return*/, {
                                valid: false,
                                missing: requiredServices
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
 * Get AI prompt from database by prompt type
 */
    ApiConfigurationService.getPrompt = function (promptType) {
        return __awaiter(this, void 0, void 0, function () {
            var promptRecord, prompt_1, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, database_1.prisma.cOPrompts.findFirst({
                                where: { isActive: true },
                                orderBy: { createdAt: 'desc' }
                            })];
                    case 1:
                        promptRecord = _a.sent();
                        if (!promptRecord) {
                            throw new errors_1.DatabaseError('No active prompts found in CO_prompts table');
                        }
                        prompt_1 = null;
                        switch (promptType) {
                            case 'linkedin_summary_prompt':
                                prompt_1 = promptRecord.linkedinSummaryPrompt;
                                break;
                            case 'company_summary_prompt':
                                prompt_1 = promptRecord.companySummaryPrompt;
                                break;
                            case 'prospect_analysis_prompt':
                                prompt_1 = promptRecord.prospectAnalysisPrompt;
                                break;
                            case 'tech_stack_prompt':
                                prompt_1 = promptRecord.techStackPrompt;
                                break;
                        }
                        if (!prompt_1) {
                            throw new errors_1.DatabaseError("".concat(promptType, " not found in prompts configuration"));
                        }
                        return [2 /*return*/, prompt_1];
                    case 2:
                        error_4 = _a.sent();
                        console.error("Failed to fetch ".concat(promptType, ":"), error_4);
                        throw new errors_1.DatabaseError("Failed to retrieve ".concat(promptType, ": ").concat(error_4 instanceof Error ? error_4.message : String(error_4)));
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    ApiConfigurationService.apiKeys = null;
    ApiConfigurationService.modelConfig = null;
    ApiConfigurationService.lastFetch = null;
    ApiConfigurationService.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    return ApiConfigurationService;
}());
exports.ApiConfigurationService = ApiConfigurationService;

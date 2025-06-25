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
exports.FirecrawlService = void 0;
var axios_1 = require("axios");
var apiConfigurationService_1 = require("./apiConfigurationService");
var errors_1 = require("@/utils/errors");
/**
 * Firecrawl API Service
 * Handles website content scraping and extraction
 */
var FirecrawlService = /** @class */ (function () {
    function FirecrawlService() {
    }
    /**
     * Create axios instance with authentication
     */
    FirecrawlService.createAxiosInstance = function () {
        return __awaiter(this, void 0, void 0, function () {
            var apiKey, config;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, apiConfigurationService_1.ApiConfigurationService.getApiKey('firecrawlApiKey')];
                    case 1:
                        apiKey = _a.sent();
                        return [4 /*yield*/, apiConfigurationService_1.ApiConfigurationService.getModelConfiguration()];
                    case 2:
                        config = _a.sent();
                        return [2 /*return*/, axios_1.default.create({
                                baseURL: 'https://api.firecrawl.dev',
                                timeout: Math.max(config.timeout || 60000, 60000), // Ensure at least 60 seconds for Firecrawl
                                headers: {
                                    'Authorization': "Bearer ".concat(apiKey),
                                    'Content-Type': 'application/json',
                                },
                            })];
                }
            });
        });
    };
    /**
     * Retry mechanism with exponential backoff
     */
    FirecrawlService.retryRequest = function (requestFn_1) {
        return __awaiter(this, arguments, void 0, function (requestFn, maxRetries, baseDelay) {
            var lastError, _loop_1, attempt, state_1;
            if (maxRetries === void 0) { maxRetries = 3; }
            if (baseDelay === void 0) { baseDelay = 1000; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        lastError = new Error('Max retries exceeded');
                        _loop_1 = function (attempt) {
                            var _b, error_1, status_1, delay_1;
                            return __generator(this, function (_c) {
                                switch (_c.label) {
                                    case 0:
                                        _c.trys.push([0, 2, , 5]);
                                        _b = {};
                                        return [4 /*yield*/, requestFn()];
                                    case 1: return [2 /*return*/, (_b.value = _c.sent(), _b)];
                                    case 2:
                                        error_1 = _c.sent();
                                        lastError = error_1 instanceof Error ? error_1 : new Error(String(error_1));
                                        // Don't retry on 4xx errors (except 429 rate limit)
                                        if (axios_1.default.isAxiosError(error_1) && error_1.response) {
                                            status_1 = error_1.response.status;
                                            if (status_1 >= 400 && status_1 < 500 && status_1 !== 429) {
                                                throw error_1;
                                            }
                                        }
                                        if (!(attempt < maxRetries)) return [3 /*break*/, 4];
                                        delay_1 = baseDelay * Math.pow(2, attempt);
                                        console.log("\uD83D\uDD04 [Firecrawl]: Request failed (attempt ".concat(attempt + 1, "/").concat(maxRetries + 1, "), retrying in ").concat(delay_1, "ms..."));
                                        console.log("\uD83D\uDD04 [Firecrawl]: Error: ".concat(lastError.message));
                                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, delay_1); })];
                                    case 3:
                                        _c.sent();
                                        _c.label = 4;
                                    case 4: return [3 /*break*/, 5];
                                    case 5: return [2 /*return*/];
                                }
                            });
                        };
                        attempt = 0;
                        _a.label = 1;
                    case 1:
                        if (!(attempt <= maxRetries)) return [3 /*break*/, 4];
                        return [5 /*yield**/, _loop_1(attempt)];
                    case 2:
                        state_1 = _a.sent();
                        if (typeof state_1 === "object")
                            return [2 /*return*/, state_1.value];
                        _a.label = 3;
                    case 3:
                        attempt++;
                        return [3 /*break*/, 1];
                    case 4: throw lastError;
                }
            });
        });
    };
    /**
     * Extract business information from content
     */
    FirecrawlService.extractBusinessInfo = function (content) {
        // Simple regex-based extraction (can be enhanced with NLP)
        var industryKeywords = {
            'Technology': ['software', 'tech', 'digital', 'cloud', 'AI', 'artificial intelligence', 'SaaS', 'platform'],
            'Healthcare': ['health', 'medical', 'hospital', 'clinic', 'pharmaceutical', 'biotech'],
            'Finance': ['bank', 'financial', 'investment', 'insurance', 'fintech', 'trading'],
            'Retail': ['retail', 'ecommerce', 'shopping', 'store', 'marketplace'],
            'Manufacturing': ['manufacturing', 'production', 'factory', 'industrial'],
            'Education': ['education', 'learning', 'university', 'school', 'training'],
        };
        var detectedIndustry = '';
        for (var _i = 0, _a = Object.entries(industryKeywords); _i < _a.length; _i++) {
            var _b = _a[_i], industry = _b[0], keywords = _b[1];
            if (keywords.some(function (keyword) { return content.toLowerCase().includes(keyword); })) {
                detectedIndustry = industry;
                break;
            }
        }
        return {
            industry: detectedIndustry || undefined,
            products: this.extractListItems(content, ['product', 'solution']),
            services: this.extractListItems(content, ['service', 'offering']),
            keyPeople: this.extractListItems(content, ['CEO', 'founder', 'president', 'director']),
        };
    };
    /**
     * Extract social media links from content
     */
    FirecrawlService.extractSocialMedia = function (content) {
        var socialMedia = {};
        // LinkedIn
        var linkedinMatch = content.match(/linkedin\.com\/company\/([^\/\s"'<>]+)/i);
        if (linkedinMatch) {
            socialMedia.linkedin = "https://linkedin.com/company/".concat(linkedinMatch[1]);
        }
        // Twitter
        var twitterMatch = content.match(/twitter\.com\/([^\/\s"'<>]+)/i);
        if (twitterMatch) {
            socialMedia.twitter = "https://twitter.com/".concat(twitterMatch[1]);
        }
        // Facebook
        var facebookMatch = content.match(/facebook\.com\/([^\/\s"'<>]+)/i);
        if (facebookMatch) {
            socialMedia.facebook = "https://facebook.com/".concat(facebookMatch[1]);
        }
        // Instagram
        var instagramMatch = content.match(/instagram\.com\/([^\/\s"'<>]+)/i);
        if (instagramMatch) {
            socialMedia.instagram = "https://instagram.com/".concat(instagramMatch[1]);
        }
        return socialMedia;
    };
    /**
     * Helper method to extract list items from content
     */
    FirecrawlService.extractListItems = function (content, keywords) {
        var items = [];
        for (var _i = 0, keywords_1 = keywords; _i < keywords_1.length; _i++) {
            var keyword = keywords_1[_i];
            var regex = new RegExp("".concat(keyword, "s?[:\\-]?\\s*([^\\n]{1,100})"), 'gi');
            var matches = content.matchAll(regex);
            for (var _a = 0, matches_1 = matches; _a < matches_1.length; _a++) {
                var match = matches_1[_a];
                if (match[1]) {
                    var item = match[1].trim().replace(/[^\w\s-]/g, '').trim();
                    if (item.length > 3 && !items.includes(item)) {
                        items.push(item);
                    }
                }
            }
        }
        return items.slice(0, 5); // Limit to 5 items
    };
    /**
     * Scrape website content and extract company information
     */
    FirecrawlService.scrapeCompanyWebsite = function (url) {
        return __awaiter(this, void 0, void 0, function () {
            var startTime, axiosInstance_1, config, scrapePayload_1, response, data, scrapedData, websiteData, duration, error_2, status_2, message;
            var _a, _b, _c, _d, _e;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        startTime = Date.now();
                        _f.label = 1;
                    case 1:
                        _f.trys.push([1, 5, , 6]);
                        console.log("\uD83D\uDD0D [Firecrawl]: Scraping website: ".concat(url));
                        return [4 /*yield*/, this.createAxiosInstance()];
                    case 2:
                        axiosInstance_1 = _f.sent();
                        return [4 /*yield*/, apiConfigurationService_1.ApiConfigurationService.getModelConfiguration()
                            // Prepare scraping request with correct parameters based on official documentation
                        ];
                    case 3:
                        config = _f.sent();
                        scrapePayload_1 = {
                            url: url,
                            formats: ['markdown'],
                            onlyMainContent: true
                        };
                        console.log("\uD83D\uDD0D [Firecrawl]: Making API request with ".concat(config.retryAttempts || 3, " retry attempts"));
                        return [4 /*yield*/, this.retryRequest(function () { return axiosInstance_1.post('/v1/scrape', scrapePayload_1); }, config.retryAttempts || 3)];
                    case 4:
                        response = _f.sent();
                        data = response.data;
                        if (!data.success) {
                            throw new Error(data.error || 'Scraping failed');
                        }
                        scrapedData = data.data;
                        if (!scrapedData) {
                            throw new Error('No data returned from Firecrawl API');
                        }
                        websiteData = {
                            url: url,
                            title: ((_a = scrapedData.metadata) === null || _a === void 0 ? void 0 : _a.title) || '',
                            description: ((_b = scrapedData.metadata) === null || _b === void 0 ? void 0 : _b.description) || '',
                            content: scrapedData.content || '',
                            markdown: scrapedData.markdown || '',
                            businessInfo: this.extractBusinessInfo(scrapedData.content || scrapedData.markdown || ''),
                            socialMedia: this.extractSocialMedia(scrapedData.content || scrapedData.markdown || ''),
                            metadata: {
                                language: ((_c = scrapedData.metadata) === null || _c === void 0 ? void 0 : _c.language) || 'en',
                                statusCode: ((_d = scrapedData.metadata) === null || _d === void 0 ? void 0 : _d.statusCode) || 200,
                                scrapedAt: new Date().toISOString()
                            },
                            rawData: scrapedData
                        };
                        duration = Date.now() - startTime;
                        console.log("\u2705 [Firecrawl]: Successfully scraped website: ".concat(url, " in ").concat(duration, "ms"));
                        return [2 /*return*/, websiteData];
                    case 5:
                        error_2 = _f.sent();
                        console.error("\u274C [Firecrawl]: Failed to scrape website ".concat(url, ":"), error_2);
                        if (axios_1.default.isAxiosError(error_2) && error_2.response) {
                            status_2 = error_2.response.status;
                            message = ((_e = error_2.response.data) === null || _e === void 0 ? void 0 : _e.error) || error_2.message;
                            throw new errors_1.AppError("Firecrawl API error (".concat(status_2, "): ").concat(message));
                        }
                        throw new errors_1.AppError("Firecrawl scraping failed: ".concat(error_2 instanceof Error ? error_2.message : String(error_2)));
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Extract structured data from a website using JSON mode
     * TEMPORARILY DEACTIVATED - Returns dummy data to avoid API costs
     */
    FirecrawlService.extractCompanyData = function (url, extractionPrompt) {
        return __awaiter(this, void 0, void 0, function () {
            var dummyExtractedData, status_3, message;
            var _a;
            return __generator(this, function (_b) {
                try {
                    console.log("\uD83D\uDD0D [Firecrawl]: DUMMY MODE - Simulating data extraction from: ".concat(url));
                    dummyExtractedData = {
                        company_name: 'Sample Company Inc.',
                        description: 'A leading technology company specializing in innovative solutions',
                        industry: 'Technology',
                        services: ['Software Development', 'Cloud Solutions', 'Digital Transformation'],
                        products: ['Enterprise Software', 'Cloud Platform', 'Mobile Apps'],
                        key_people: ['John Smith - CEO', 'Jane Doe - CTO'],
                        contact_info: {
                            email: 'contact@samplecompany.com',
                            phone: '+1-555-0123',
                            address: '123 Tech Street, Silicon Valley, CA'
                        }
                    };
                    console.log("\u2705 [Firecrawl]: DUMMY MODE - Returning sample extracted data for: ".concat(url));
                    return [2 /*return*/, dummyExtractedData];
                }
                catch (error) {
                    console.error("\u274C [Firecrawl]: Failed to extract data from ".concat(url, ":"), error);
                    if (axios_1.default.isAxiosError(error) && error.response) {
                        status_3 = error.response.status;
                        message = ((_a = error.response.data) === null || _a === void 0 ? void 0 : _a.error) || error.message;
                        throw new errors_1.AppError("Firecrawl extraction error (".concat(status_3, "): ").concat(message));
                    }
                    throw new errors_1.AppError("Firecrawl extraction failed: ".concat(error instanceof Error ? error.message : String(error)));
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * Search for company information - simplified to use basic scraping
     * since the /search endpoint has different requirements
     */
    FirecrawlService.searchCompanyInfo = function (companyName, domain) {
        return __awaiter(this, void 0, void 0, function () {
            var websiteData, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        console.log("\uD83D\uDD0D [Firecrawl]: Searching for company info: ".concat(companyName));
                        if (!domain) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.scrapeCompanyWebsite("https://".concat(domain))];
                    case 1:
                        websiteData = _a.sent();
                        return [2 /*return*/, [websiteData]];
                    case 2:
                        // For basic company search without domain, we'd need to use external search
                        // and then scrape results, which is complex. Return empty for now.
                        console.log("\u26A0\uFE0F [Firecrawl]: Company search without domain not implemented");
                        return [2 /*return*/, []];
                    case 3:
                        error_3 = _a.sent();
                        console.error("\u274C [Firecrawl]: Failed to search for ".concat(companyName, ":"), error_3);
                        throw error_3;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get company summary from website content
     */
    FirecrawlService.getCompanySummary = function (url) {
        return __awaiter(this, void 0, void 0, function () {
            var websiteData, summary, error_4;
            var _a, _b, _c, _d, _e;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        _f.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.scrapeCompanyWebsite(url)
                            // Extract relevant information for summary
                        ];
                    case 1:
                        websiteData = _f.sent();
                        summary = [
                            websiteData.title && "Company: ".concat(websiteData.title),
                            ((_a = websiteData.businessInfo) === null || _a === void 0 ? void 0 : _a.industry) && "Industry: ".concat(websiteData.businessInfo.industry),
                            websiteData.description && "Description: ".concat(websiteData.description),
                            ((_c = (_b = websiteData.businessInfo) === null || _b === void 0 ? void 0 : _b.products) === null || _c === void 0 ? void 0 : _c.length) &&
                                "Products: ".concat(websiteData.businessInfo.products.slice(0, 3).join(', ')),
                            ((_e = (_d = websiteData.businessInfo) === null || _d === void 0 ? void 0 : _d.services) === null || _e === void 0 ? void 0 : _e.length) &&
                                "Services: ".concat(websiteData.businessInfo.services.slice(0, 3).join(', ')),
                        ].filter(Boolean).join('\n');
                        return [2 /*return*/, summary || 'No summary available'];
                    case 2:
                        error_4 = _f.sent();
                        console.error("\u274C [Firecrawl]: Failed to get company summary for ".concat(url, ":"), error_4);
                        throw error_4;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Start a crawl job for comprehensive website analysis
     */
    FirecrawlService.startCrawlJob = function (url_1) {
        return __awaiter(this, arguments, void 0, function (url, options) {
            var axiosInstance_2, requestData_1, response, error_5, status_4, message;
            var _this = this;
            var _a;
            if (options === void 0) { options = {}; }
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 3, , 4]);
                        console.log("\uD83D\uDE80 [Firecrawl]: Starting crawl job for: ".concat(url));
                        return [4 /*yield*/, this.createAxiosInstance()];
                    case 1:
                        axiosInstance_2 = _b.sent();
                        requestData_1 = {
                            url: url,
                            crawlerOptions: {
                                includes: [],
                                excludes: [],
                                maxDepth: 2,
                                mode: 'default',
                                limit: options.maxPages || 10
                            },
                            pageOptions: {
                                onlyMainContent: true,
                                includeHtml: false,
                                screenshot: false
                            }
                        };
                        return [4 /*yield*/, this.retryRequest(function () { return __awaiter(_this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, axiosInstance_2.post('/crawl', requestData_1)];
                                        case 1: return [2 /*return*/, _a.sent()];
                                    }
                                });
                            }); })];
                    case 2:
                        response = _b.sent();
                        if (!response.data.success || !response.data.jobId) {
                            throw new Error("Failed to start crawl job: ".concat(response.data.error || 'Unknown error'));
                        }
                        console.log("\u2705 [Firecrawl]: Crawl job started with ID: ".concat(response.data.jobId));
                        return [2 /*return*/, {
                                jobId: response.data.jobId,
                                statusUrl: "/crawl/status/".concat(response.data.jobId)
                            }];
                    case 3:
                        error_5 = _b.sent();
                        console.error("\u274C [Firecrawl]: Failed to start crawl job for ".concat(url, ":"), error_5);
                        if (axios_1.default.isAxiosError(error_5) && error_5.response) {
                            status_4 = error_5.response.status;
                            message = ((_a = error_5.response.data) === null || _a === void 0 ? void 0 : _a.error) || error_5.message;
                            // Handle payment/billing errors specifically
                            if (status_4 === 402) {
                                console.log("\uD83D\uDCB3 [Firecrawl]: Payment required - please upgrade your Firecrawl plan at https://firecrawl.dev/pricing");
                                throw new errors_1.AppError("Firecrawl billing issue: ".concat(message, ". Please upgrade your plan at https://firecrawl.dev/pricing"));
                            }
                            throw new errors_1.AppError("Firecrawl crawl start error (".concat(status_4, "): ").concat(message));
                        }
                        throw new errors_1.AppError("Firecrawl crawl job failed: ".concat(error_5 instanceof Error ? error_5.message : String(error_5)));
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Poll crawl job status until completion
     */
    FirecrawlService.pollCrawlStatus = function (jobId_1) {
        return __awaiter(this, arguments, void 0, function (jobId, maxWaitTime) {
            var axiosInstance_3, startTime, pollInterval_1, response, status_5, error_6, status_6, message;
            var _this = this;
            var _a;
            if (maxWaitTime === void 0) { maxWaitTime = 300000; }
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 6, , 7]);
                        console.log("\uD83D\uDD0D [Firecrawl]: Polling crawl status for job: ".concat(jobId));
                        return [4 /*yield*/, this.createAxiosInstance()];
                    case 1:
                        axiosInstance_3 = _b.sent();
                        startTime = Date.now();
                        pollInterval_1 = 5000 // 5 seconds
                        ;
                        _b.label = 2;
                    case 2:
                        if (!(Date.now() - startTime < maxWaitTime)) return [3 /*break*/, 5];
                        return [4 /*yield*/, this.retryRequest(function () { return __awaiter(_this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, axiosInstance_3.get("/crawl/status/".concat(jobId))];
                                        case 1: return [2 /*return*/, _a.sent()];
                                    }
                                });
                            }); })];
                    case 3:
                        response = _b.sent();
                        if (!response.data.success) {
                            throw new Error("Failed to get crawl status: ".concat(response.data.error || 'Unknown error'));
                        }
                        status_5 = response.data.status;
                        console.log("\uD83D\uDD0D [Firecrawl]: Job ".concat(jobId, " status: ").concat(status_5, " (").concat(response.data.current || 0, "/").concat(response.data.total || 0, ")"));
                        if (status_5 === 'completed') {
                            console.log("\u2705 [Firecrawl]: Crawl job ".concat(jobId, " completed successfully"));
                            return [2 /*return*/, response.data];
                        }
                        else if (status_5 === 'failed') {
                            throw new Error("Crawl job failed: ".concat(response.data.error || 'Unknown error'));
                        }
                        // Wait before polling again
                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, pollInterval_1); })];
                    case 4:
                        // Wait before polling again
                        _b.sent();
                        return [3 /*break*/, 2];
                    case 5: throw new Error("Crawl job ".concat(jobId, " timed out after ").concat(maxWaitTime, "ms"));
                    case 6:
                        error_6 = _b.sent();
                        console.error("\u274C [Firecrawl]: Failed to poll crawl status for ".concat(jobId, ":"), error_6);
                        if (axios_1.default.isAxiosError(error_6) && error_6.response) {
                            status_6 = error_6.response.status;
                            message = ((_a = error_6.response.data) === null || _a === void 0 ? void 0 : _a.error) || error_6.message;
                            // Handle payment/billing errors specifically
                            if (status_6 === 402) {
                                console.log("\uD83D\uDCB3 [Firecrawl]: Payment required - please upgrade your Firecrawl plan at https://firecrawl.dev/pricing");
                                throw new errors_1.AppError("Firecrawl billing issue: ".concat(message, ". Please upgrade your plan at https://firecrawl.dev/pricing"));
                            }
                            throw new errors_1.AppError("Firecrawl crawl status error (".concat(status_6, "): ").concat(message));
                        }
                        throw new errors_1.AppError("Firecrawl crawl polling failed: ".concat(error_6 instanceof Error ? error_6.message : String(error_6)));
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Crawl website and generate AI company summary using database prompt
     */
    FirecrawlService.crawlAndGenerateCompanySummary = function (url_1) {
        return __awaiter(this, arguments, void 0, function (url, aiProvider) {
            var jobId, crawlResult, pagesContent, formattedContent, websiteData, companySummary, error_7;
            if (aiProvider === void 0) { aiProvider = 'openrouter'; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 5, , 6]);
                        console.log("\uD83D\uDD0D [Firecrawl]: Starting comprehensive crawl and summary for: ".concat(url));
                        return [4 /*yield*/, this.startCrawlJob(url, {
                                maxPages: 10,
                                allowBackwardLinks: false,
                                allowExternalLinks: false
                            })
                            // Poll for completion
                        ];
                    case 1:
                        jobId = (_a.sent()).jobId;
                        return [4 /*yield*/, this.pollCrawlStatus(jobId)];
                    case 2:
                        crawlResult = _a.sent();
                        if (crawlResult.status !== 'completed' || !crawlResult.data) {
                            throw new Error('Crawl job did not complete successfully');
                        }
                        pagesContent = crawlResult.data.map(function (page) { return page.content || page.markdown; });
                        formattedContent = this.formatMultiPageContent(crawlResult.data);
                        return [4 /*yield*/, this.scrapeCompanyWebsite(url)
                            // Generate AI summary using database prompt
                        ];
                    case 3:
                        websiteData = _a.sent();
                        return [4 /*yield*/, this.generateCompanySummaryFromMultiPageContent(formattedContent, aiProvider)];
                    case 4:
                        companySummary = _a.sent();
                        console.log("\u2705 [Firecrawl]: Successfully completed crawl and summary for: ".concat(url, " (").concat(crawlResult.data.length, " pages)"));
                        return [2 /*return*/, {
                                companySummary: companySummary,
                                websiteData: websiteData,
                                crawlData: {
                                    totalPages: crawlResult.data.length,
                                    pagesContent: pagesContent
                                }
                            }];
                    case 5:
                        error_7 = _a.sent();
                        console.error("\u274C [Firecrawl]: Failed to crawl and generate summary for ".concat(url, ":"), error_7);
                        throw error_7;
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Format multi-page content in the requested format:
     * home page: content, pg1: content, pg2: content, etc.
     */
    FirecrawlService.formatMultiPageContent = function (pages) {
        var formattedPages = [];
        pages.forEach(function (page, index) {
            var _a;
            // Prioritize markdown field for v1 API
            var content = page.markdown || page.content || '';
            var url = ((_a = page.metadata) === null || _a === void 0 ? void 0 : _a.sourceURL) || '';
            // Debug: console.log(`🔍 [Firecrawl]: Page ${index + 1} - markdown: ${page.markdown?.length || 0} chars, content: ${page.content?.length || 0} chars`)
            if (index === 0) {
                // First page is the home page
                formattedPages.push("home page (".concat(url, "): ").concat(content));
            }
            else {
                // Subsequent pages are pg1, pg2, etc.
                formattedPages.push("pg".concat(index, " (").concat(url, "): ").concat(content));
            }
        });
        // Debug: console.log(`🔍 [Firecrawl]: Formatted content total length: ${formattedPages.join('\n\n---PAGE_SEPARATOR---\n\n').length} chars`)
        return formattedPages.join('\n\n---PAGE_SEPARATOR---\n\n');
    };
    /**
     * Generate company summary from multi-page content using database prompt
     */
    FirecrawlService.generateCompanySummaryFromMultiPageContent = function (multiPageContent_1) {
        return __awaiter(this, arguments, void 0, function (multiPageContent, aiProvider) {
            var prompt_1, finalPrompt, error_8;
            if (aiProvider === void 0) { aiProvider = 'openrouter'; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, apiConfigurationService_1.ApiConfigurationService.getPrompt('company_summary_prompt')
                            // Replace placeholder with the multi-page content
                        ];
                    case 1:
                        prompt_1 = _a.sent();
                        finalPrompt = prompt_1.replace('${WEBSITE_CONTENT}', multiPageContent);
                        console.log("\uD83E\uDD16 [Firecrawl]: Generating company summary using ".concat(aiProvider, " with ").concat(multiPageContent.length, " characters of content"));
                        return [4 /*yield*/, this.generateAISummary(finalPrompt, aiProvider)];
                    case 2: 
                    // Debug: console.log(`🔍 [Firecrawl]: Content preview: ${multiPageContent.substring(0, 200)}...`)
                    return [2 /*return*/, _a.sent()];
                    case 3:
                        error_8 = _a.sent();
                        console.error('❌ [Firecrawl]: Failed to generate company summary from multi-page content:', error_8);
                        return [2 /*return*/, 'Unable to generate company summary from website content.'];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Generate AI summary using database prompt
     */
    FirecrawlService.generateAISummary = function (prompt, aiProvider) {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _a = aiProvider;
                        switch (_a) {
                            case 'gemini': return [3 /*break*/, 1];
                            case 'openrouter': return [3 /*break*/, 3];
                        }
                        return [3 /*break*/, 5];
                    case 1: return [4 /*yield*/, this.generateSummaryWithGemini(prompt)];
                    case 2: return [2 /*return*/, _b.sent()];
                    case 3: return [4 /*yield*/, this.generateSummaryWithOpenRouter(prompt)];
                    case 4: return [2 /*return*/, _b.sent()];
                    case 5: throw new Error("Unsupported AI provider: ".concat(aiProvider));
                }
            });
        });
    };
    /**
     * Generate summary using Google Gemini
     */
    FirecrawlService.generateSummaryWithGemini = function (prompt) {
        return __awaiter(this, void 0, void 0, function () {
            var apiKey, response, error_9;
            var _a, _b, _c, _d, _e, _f;
            return __generator(this, function (_g) {
                switch (_g.label) {
                    case 0:
                        _g.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, apiConfigurationService_1.ApiConfigurationService.getApiKey('geminiApiKey')];
                    case 1:
                        apiKey = _g.sent();
                        return [4 /*yield*/, axios_1.default.post("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=".concat(apiKey), {
                                contents: [{
                                        parts: [{ text: prompt }]
                                    }],
                                generationConfig: {
                                    temperature: 0.7,
                                    topK: 40,
                                    topP: 0.95,
                                    maxOutputTokens: 1000,
                                }
                            }, {
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                timeout: 30000
                            })];
                    case 2:
                        response = _g.sent();
                        return [2 /*return*/, ((_f = (_e = (_d = (_c = (_b = (_a = response.data) === null || _a === void 0 ? void 0 : _a.candidates) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.content) === null || _d === void 0 ? void 0 : _d.parts) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.text) || 'Summary generation failed'];
                    case 3:
                        error_9 = _g.sent();
                        console.error('❌ [Firecrawl]: Gemini API error:', error_9);
                        throw new errors_1.AppError("Gemini summary generation failed: ".concat(error_9 instanceof Error ? error_9.message : String(error_9)));
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Generate summary using OpenRouter o1-mini with retry logic
     */
    FirecrawlService.generateSummaryWithOpenRouter = function (prompt) {
        return __awaiter(this, void 0, void 0, function () {
            var maxRetries, lastError, _loop_2, attempt, state_2;
            var _a, _b, _c, _d, _e;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        maxRetries = 3;
                        lastError = null;
                        _loop_2 = function (attempt) {
                            var apiKey, response, aiSummary, error_10, delay_2;
                            return __generator(this, function (_g) {
                                switch (_g.label) {
                                    case 0:
                                        _g.trys.push([0, 3, , 6]);
                                        return [4 /*yield*/, apiConfigurationService_1.ApiConfigurationService.getApiKey('openrouterApiKey')];
                                    case 1:
                                        apiKey = _g.sent();
                                        console.log("\uD83D\uDD17 [Firecrawl]: Making OpenRouter API call (attempt ".concat(attempt, "/").concat(maxRetries, ")..."));
                                        return [4 /*yield*/, axios_1.default.post('https://openrouter.ai/api/v1/chat/completions', {
                                                model: 'openai/o1-mini',
                                                messages: [
                                                    {
                                                        role: 'user',
                                                        content: prompt
                                                    }
                                                ],
                                                max_completion_tokens: 8000 // Increased from 2000 to handle O1-Mini reasoning + response
                                                // Note: temperature is not supported by o1-mini model
                                            }, {
                                                headers: {
                                                    'Authorization': "Bearer ".concat(apiKey),
                                                    'Content-Type': 'application/json'
                                                },
                                                timeout: 120000 // Increased from 90s to 120s for O1-Mini reasoning
                                            })];
                                    case 2:
                                        response = _g.sent();
                                        console.log('🔍 [Firecrawl]: OpenRouter response status:', response.status);
                                        console.log('🔍 [Firecrawl]: OpenRouter response choices length:', ((_b = (_a = response.data) === null || _a === void 0 ? void 0 : _a.choices) === null || _b === void 0 ? void 0 : _b.length) || 0);
                                        aiSummary = (_e = (_d = (_c = response.data.choices[0]) === null || _c === void 0 ? void 0 : _c.message) === null || _d === void 0 ? void 0 : _d.content) === null || _e === void 0 ? void 0 : _e.trim();
                                        if (!aiSummary) {
                                            console.error('❌ [Firecrawl]: OpenRouter returned empty response:', JSON.stringify(response.data, null, 2));
                                            throw new Error('No AI summary returned from OpenRouter API');
                                        }
                                        console.log('✅ [Firecrawl]: Successfully generated summary with OpenRouter');
                                        return [2 /*return*/, { value: aiSummary }];
                                    case 3:
                                        error_10 = _g.sent();
                                        lastError = error_10 instanceof Error ? error_10 : new Error(String(error_10));
                                        console.error("\u274C [Firecrawl]: Attempt ".concat(attempt, " failed:"), lastError.message);
                                        if (!(attempt < maxRetries)) return [3 /*break*/, 5];
                                        delay_2 = Math.pow(2, attempt) * 1000 // 2s, 4s, 8s
                                        ;
                                        console.log("\u23F3 [Firecrawl]: Waiting ".concat(delay_2, "ms before retry..."));
                                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, delay_2); })];
                                    case 4:
                                        _g.sent();
                                        _g.label = 5;
                                    case 5: return [3 /*break*/, 6];
                                    case 6: return [2 /*return*/];
                                }
                            });
                        };
                        attempt = 1;
                        _f.label = 1;
                    case 1:
                        if (!(attempt <= maxRetries)) return [3 /*break*/, 4];
                        return [5 /*yield**/, _loop_2(attempt)];
                    case 2:
                        state_2 = _f.sent();
                        if (typeof state_2 === "object")
                            return [2 /*return*/, state_2.value];
                        _f.label = 3;
                    case 3:
                        attempt++;
                        return [3 /*break*/, 1];
                    case 4: throw new Error("OpenRouter API failed after ".concat(maxRetries, " attempts: ").concat((lastError === null || lastError === void 0 ? void 0 : lastError.message) || 'Unknown error'));
                }
            });
        });
    };
    /**
     * Generate company summary from scraped content
     * @deprecated Use generateCompanySummaryFromMultiPageContent instead
     */
    FirecrawlService.generateCompanySummaryFromContent = function (content) {
        return __awaiter(this, void 0, void 0, function () {
            var prompt_2, finalPrompt, error_11;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, apiConfigurationService_1.ApiConfigurationService.getPrompt('company_summary_prompt')
                            // Replace placeholder with the content
                        ];
                    case 1:
                        prompt_2 = _a.sent();
                        finalPrompt = prompt_2.replace('${WEBSITE_CONTENT}', content.substring(0, 8000));
                        return [4 /*yield*/, this.generateAISummary(finalPrompt, 'openrouter')];
                    case 2: return [2 /*return*/, _a.sent()];
                    case 3:
                        error_11 = _a.sent();
                        console.error('❌ [Firecrawl]: Failed to generate company summary:', error_11);
                        return [2 /*return*/, 'Unable to generate company summary at this time.'];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    return FirecrawlService;
}());
exports.FirecrawlService = FirecrawlService;

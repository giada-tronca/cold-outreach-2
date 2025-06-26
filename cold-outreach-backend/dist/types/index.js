"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowStatus = exports.WorkflowStep = exports.BatchStatus = exports.GenerationStatus = exports.EnrichmentStatus = exports.ProspectStatus = void 0;
// Status enums (matching database values)
var ProspectStatus;
(function (ProspectStatus) {
    ProspectStatus["PENDING"] = "PENDING";
    ProspectStatus["ENRICHING"] = "ENRICHING";
    ProspectStatus["ENRICHED"] = "ENRICHED";
    ProspectStatus["GENERATING"] = "GENERATING";
    ProspectStatus["COMPLETED"] = "COMPLETED";
    ProspectStatus["EMAIL_GENERATED"] = "EMAIL_GENERATED";
    ProspectStatus["FAILED"] = "FAILED";
})(ProspectStatus || (exports.ProspectStatus = ProspectStatus = {}));
var EnrichmentStatus;
(function (EnrichmentStatus) {
    EnrichmentStatus["PENDING"] = "PENDING";
    EnrichmentStatus["PROCESSING"] = "PROCESSING";
    EnrichmentStatus["COMPLETED"] = "COMPLETED";
    EnrichmentStatus["FAILED"] = "FAILED";
})(EnrichmentStatus || (exports.EnrichmentStatus = EnrichmentStatus = {}));
var GenerationStatus;
(function (GenerationStatus) {
    GenerationStatus["PENDING"] = "PENDING";
    GenerationStatus["GENERATING"] = "GENERATING";
    GenerationStatus["COMPLETED"] = "COMPLETED";
    GenerationStatus["FAILED"] = "FAILED";
})(GenerationStatus || (exports.GenerationStatus = GenerationStatus = {}));
var BatchStatus;
(function (BatchStatus) {
    BatchStatus["UPLOADED"] = "UPLOADED";
    BatchStatus["ENRICHING"] = "ENRICHING";
    BatchStatus["ENRICHED"] = "ENRICHED";
    BatchStatus["GENERATING"] = "GENERATING";
    BatchStatus["COMPLETED"] = "COMPLETED";
    BatchStatus["FAILED"] = "FAILED";
    BatchStatus["PARTIAL"] = "PARTIAL";
})(BatchStatus || (exports.BatchStatus = BatchStatus = {}));
var WorkflowStep;
(function (WorkflowStep) {
    WorkflowStep["UPLOAD_CSV"] = "UPLOAD_CSV";
    WorkflowStep["CAMPAIGN_SETTINGS"] = "CAMPAIGN_SETTINGS";
    WorkflowStep["ENRICHMENT_CONFIG"] = "ENRICHMENT_CONFIG";
    WorkflowStep["BEGIN_ENRICHMENT"] = "BEGIN_ENRICHMENT";
    WorkflowStep["EMAIL_GENERATION"] = "EMAIL_GENERATION";
    WorkflowStep["COMPLETED"] = "COMPLETED";
})(WorkflowStep || (exports.WorkflowStep = WorkflowStep = {}));
var WorkflowStatus;
(function (WorkflowStatus) {
    WorkflowStatus["ACTIVE"] = "ACTIVE";
    WorkflowStatus["PAUSED"] = "PAUSED";
    WorkflowStatus["COMPLETED"] = "COMPLETED";
    WorkflowStatus["ABANDONED"] = "ABANDONED";
    WorkflowStatus["ERROR"] = "ERROR";
})(WorkflowStatus || (exports.WorkflowStatus = WorkflowStatus = {}));

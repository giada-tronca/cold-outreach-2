-- PostgreSQL Database Recreation Script (Without CO_ Prefix)
-- This script recreates all tables from the cold-outreach webapp Prisma schema
-- with cleaner table names (no CO_ prefix)

-- Drop tables if they exist (in reverse dependency order)
DROP TABLE IF EXISTS "generated_emails" CASCADE;
DROP TABLE IF EXISTS "prospect_enrichments" CASCADE;
DROP TABLE IF EXISTS "prospects" CASCADE;
DROP TABLE IF EXISTS "batches" CASCADE;
DROP TABLE IF EXISTS "workflow_sessions" CASCADE;
DROP TABLE IF EXISTS "campaigns" CASCADE;
DROP TABLE IF EXISTS "api_configurations" CASCADE;
DROP TABLE IF EXISTS "auto_service_settings" CASCADE;
DROP TABLE IF EXISTS "prompts" CASCADE;
DROP TABLE IF EXISTS "services" CASCADE;
DROP TABLE IF EXISTS "profiles" CASCADE;

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create api_configurations table
CREATE TABLE "api_configurations" (
    "id" SERIAL PRIMARY KEY,
    "openrouter_api_key" VARCHAR(500),
    "gemini_api_key" VARCHAR(500),
    "firecrawl_api_key" VARCHAR(500),
    "proxycurl_api_key" VARCHAR(500),
    "industry_mappings" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "default_signature" TEXT,
    "personal_email_domains" TEXT DEFAULT 'gmail.com,yahoo.com,hotmail.com,outlook.com,aol.com,icloud.com,protonmail.com,zoho.com,gmx.com,mail.com',
    "gemini_temperature" DOUBLE PRECISION DEFAULT 0.7,
    "gemini_max_output_tokens" INTEGER DEFAULT 8192,
    "timeout_seconds" INTEGER DEFAULT 60,
    "max_retries" INTEGER DEFAULT 3,
    "domain_keywords_industry" TEXT
);

-- Create auto_service_settings table
CREATE TABLE "auto_service_settings" (
    "id" SERIAL PRIMARY KEY,
    "description" TEXT,
    "prompt_template" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create campaigns table
CREATE TABLE "campaigns" (
    "id" SERIAL PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL,
    "email_subject" VARCHAR(500),
    "prompt" TEXT,
    "enrichment_flags" JSONB,
    "service_id" INTEGER,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create batches table
CREATE TABLE "batches" (
    "id" SERIAL PRIMARY KEY,
    "campaign_id" INTEGER,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "total_prospects" INTEGER NOT NULL DEFAULT 0,
    "enriched_prospects" INTEGER NOT NULL DEFAULT 0,
    "generated_emails" INTEGER NOT NULL DEFAULT 0,
    "failed_prospects" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fk_batches_campaign" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Create prospects table
CREATE TABLE "prospects" (
    "id" SERIAL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "company" TEXT,
    "position" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "upload_id" TEXT,
    "campaign_id" INTEGER,
    "batch_id" INTEGER,
    "linkedin_url" TEXT,
    "additional_data" JSONB,
    "uses_fallback" BOOLEAN,
    "metadata" JSONB,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fk_prospects_campaign" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "fk_prospects_batch" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Create prospect_enrichments table
CREATE TABLE "prospect_enrichments" (
    "prospect_id" INTEGER PRIMARY KEY,
    "company_website" VARCHAR(500),
    "company_summary" TEXT,
    "linkedin_summary" TEXT,
    "prospect_analysis_summary" TEXT,
    "tech_stack" JSONB,
    "enrichment_status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "builtwith_summary" TEXT,
    "enriched_at" TIMESTAMP WITH TIME ZONE,
    "model_used" VARCHAR(100),
    CONSTRAINT "fk_enrichments_prospect" FOREIGN KEY ("prospect_id") REFERENCES "prospects"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create generated_emails table
CREATE TABLE "generated_emails" (
    "prospect_id" INTEGER PRIMARY KEY,
    "subject" VARCHAR(500),
    "body" TEXT,
    "generation_status" TEXT NOT NULL DEFAULT 'PENDING',
    "error_message" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "language" VARCHAR(50) DEFAULT 'english',
    "generated_at" TIMESTAMP WITH TIME ZONE,
    "model_used" VARCHAR(100),
    "generation_metadata" JSONB DEFAULT '{}',
    CONSTRAINT "fk_emails_prospect" FOREIGN KEY ("prospect_id") REFERENCES "prospects"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create prompts table
CREATE TABLE "prompts" (
    "id" SERIAL PRIMARY KEY,
    "company_summary_prompt" TEXT,
    "linkedin_summary_prompt" TEXT,
    "tech_stack_prompt" TEXT,
    "prospect_analysis_prompt" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "version" VARCHAR(50),
    "description" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create services table
CREATE TABLE "services" (
    "id" SERIAL PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "prompt_template" TEXT
);

-- Create workflow_sessions table
CREATE TABLE "workflow_sessions" (
    "id" TEXT PRIMARY KEY,
    "user_session_id" VARCHAR(255) NOT NULL,
    "campaign_id" INTEGER,
    "current_step" TEXT NOT NULL DEFAULT 'UPLOAD_CSV',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "configuration_data" JSONB,
    "steps_completed" JSONB,
    "error_message" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fk_workflow_sessions_campaign" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Create profiles table
CREATE TABLE "profiles" (
    "id" SERIAL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "api_key" TEXT,
    "temperature" TEXT,
    "max_tokens" TEXT,
    "top_k" TEXT,
    "top_p" TEXT,
    "max_email_history" TEXT,
    "email_history_max_length" TEXT,
    "custom_prompt" TEXT,
    "is_active" BOOLEAN,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX "idx_prospects_campaign_id" ON "prospects"("campaign_id");
CREATE INDEX "idx_prospects_upload_id" ON "prospects"("upload_id");
CREATE INDEX "idx_prospects_batch_id" ON "prospects"("batch_id");

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at columns
CREATE TRIGGER update_api_configurations_updated_at BEFORE UPDATE ON "api_configurations" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_auto_service_settings_updated_at BEFORE UPDATE ON "auto_service_settings" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON "campaigns" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_batches_updated_at BEFORE UPDATE ON "batches" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_prospects_updated_at BEFORE UPDATE ON "prospects" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_prospect_enrichments_updated_at BEFORE UPDATE ON "prospect_enrichments" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_generated_emails_updated_at BEFORE UPDATE ON "generated_emails" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_prompts_updated_at BEFORE UPDATE ON "prompts" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON "services" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workflow_sessions_updated_at BEFORE UPDATE ON "workflow_sessions" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON "profiles" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Success message
SELECT 'Database schema successfully created with clean table names!' AS status; 
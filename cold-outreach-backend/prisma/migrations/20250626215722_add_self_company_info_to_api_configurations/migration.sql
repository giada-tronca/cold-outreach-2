/*
  Warnings:

  - You are about to drop the `CO_api_configurations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CO_auto_service_settings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CO_batches` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CO_campaigns` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CO_generated_emails` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CO_prompts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CO_prospect_enrichments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CO_prospects` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CO_services` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CO_workflow_sessions` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "CO_batches" DROP CONSTRAINT "CO_batches_campaign_id_fkey";

-- DropForeignKey
ALTER TABLE "CO_generated_emails" DROP CONSTRAINT "CO_generated_emails_prospect_id_fkey";

-- DropForeignKey
ALTER TABLE "CO_prospect_enrichments" DROP CONSTRAINT "CO_prospect_enrichments_prospect_id_fkey";

-- DropForeignKey
ALTER TABLE "CO_prospects" DROP CONSTRAINT "CO_prospects_batch_id_fkey";

-- DropForeignKey
ALTER TABLE "CO_prospects" DROP CONSTRAINT "CO_prospects_campaign_id_fkey";

-- DropForeignKey
ALTER TABLE "CO_workflow_sessions" DROP CONSTRAINT "CO_workflow_sessions_campaign_id_fkey";

-- DropTable
DROP TABLE "CO_api_configurations";

-- DropTable
DROP TABLE "CO_auto_service_settings";

-- DropTable
DROP TABLE "CO_batches";

-- DropTable
DROP TABLE "CO_campaigns";

-- DropTable
DROP TABLE "CO_generated_emails";

-- DropTable
DROP TABLE "CO_prompts";

-- DropTable
DROP TABLE "CO_prospect_enrichments";

-- DropTable
DROP TABLE "CO_prospects";

-- DropTable
DROP TABLE "CO_services";

-- DropTable
DROP TABLE "CO_workflow_sessions";

-- CreateTable
CREATE TABLE "api_configurations" (
    "id" SERIAL NOT NULL,
    "openrouter_api_key" VARCHAR(500),
    "gemini_api_key" VARCHAR(500),
    "firecrawl_api_key" VARCHAR(500),
    "proxycurl_api_key" VARCHAR(500),
    "industry_mappings" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "default_signature" TEXT,
    "personal_email_domains" TEXT DEFAULT 'gmail.com,yahoo.com,hotmail.com,outlook.com,aol.com,icloud.com,protonmail.com,zoho.com,gmx.com,mail.com',
    "gemini_temperature" DOUBLE PRECISION DEFAULT 0.7,
    "gemini_max_output_tokens" INTEGER DEFAULT 8192,
    "timeout_seconds" INTEGER DEFAULT 60,
    "max_retries" INTEGER DEFAULT 3,
    "domain_keywords_industry" TEXT,
    "self_company_info" TEXT,

    CONSTRAINT "api_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auto_service_settings" (
    "id" SERIAL NOT NULL,
    "description" TEXT,
    "prompt_template" TEXT,
    "created_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "auto_service_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batches" (
    "id" SERIAL NOT NULL,
    "campaign_id" INTEGER,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "total_prospects" INTEGER NOT NULL DEFAULT 0,
    "enriched_prospects" INTEGER NOT NULL DEFAULT 0,
    "generated_emails" INTEGER NOT NULL DEFAULT 0,
    "failed_prospects" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email_subject" VARCHAR(500),
    "prompt" TEXT,
    "enrichment_flags" JSONB,
    "service_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generated_emails" (
    "prospect_id" INTEGER NOT NULL,
    "subject" VARCHAR(500),
    "body" TEXT,
    "generation_status" TEXT NOT NULL DEFAULT 'PENDING',
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "language" VARCHAR(50) DEFAULT 'english',
    "generated_at" TIMESTAMP(3),
    "model_used" VARCHAR(100),
    "generation_metadata" JSONB DEFAULT '{}',

    CONSTRAINT "generated_emails_pkey" PRIMARY KEY ("prospect_id")
);

-- CreateTable
CREATE TABLE "prompts" (
    "id" SERIAL NOT NULL,
    "company_summary_prompt" TEXT,
    "linkedin_summary_prompt" TEXT,
    "tech_stack_prompt" TEXT,
    "prospect_analysis_prompt" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "version" VARCHAR(50),
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prompts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prospect_enrichments" (
    "prospect_id" INTEGER NOT NULL,
    "company_website" VARCHAR(500),
    "company_summary" TEXT,
    "linkedin_summary" TEXT,
    "prospect_analysis_summary" TEXT,
    "tech_stack" JSONB,
    "enrichment_status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "builtwith_summary" TEXT,
    "enriched_at" TIMESTAMP(3),
    "model_used" VARCHAR(100),

    CONSTRAINT "prospect_enrichments_pkey" PRIMARY KEY ("prospect_id")
);

-- CreateTable
CREATE TABLE "prospects" (
    "id" SERIAL NOT NULL,
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
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prospects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "prompt_template" TEXT,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_sessions" (
    "id" TEXT NOT NULL,
    "user_session_id" VARCHAR(255) NOT NULL,
    "campaign_id" INTEGER,
    "current_step" TEXT NOT NULL DEFAULT 'UPLOAD_CSV',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "configuration_data" JSONB,
    "steps_completed" JSONB,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "prospects_campaign_id_idx" ON "prospects"("campaign_id");

-- CreateIndex
CREATE INDEX "prospects_upload_id_idx" ON "prospects"("upload_id");

-- CreateIndex
CREATE INDEX "prospects_batch_id_idx" ON "prospects"("batch_id");

-- AddForeignKey
ALTER TABLE "batches" ADD CONSTRAINT "batches_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_emails" ADD CONSTRAINT "generated_emails_prospect_id_fkey" FOREIGN KEY ("prospect_id") REFERENCES "prospects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prospect_enrichments" ADD CONSTRAINT "prospect_enrichments_prospect_id_fkey" FOREIGN KEY ("prospect_id") REFERENCES "prospects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prospects" ADD CONSTRAINT "prospects_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prospects" ADD CONSTRAINT "prospects_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_sessions" ADD CONSTRAINT "workflow_sessions_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

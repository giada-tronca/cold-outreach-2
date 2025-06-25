-- CreateTable
CREATE TABLE "CO_api_configurations" (
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

    CONSTRAINT "CO_api_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CO_auto_service_settings" (
    "id" SERIAL NOT NULL,
    "description" TEXT,
    "prompt_template" TEXT,
    "created_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "CO_auto_service_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CO_batches" (
    "id" SERIAL NOT NULL,
    "campaign_id" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UPLOADED',
    "total_prospects" INTEGER NOT NULL DEFAULT 0,
    "enriched_prospects" INTEGER NOT NULL DEFAULT 0,
    "generated_emails" INTEGER NOT NULL DEFAULT 0,
    "failed_prospects" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CO_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CO_campaigns" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email_subject" VARCHAR(500),
    "prompt" TEXT,
    "enrichment_flags" JSONB,
    "service_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CO_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CO_generated_emails" (
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

    CONSTRAINT "CO_generated_emails_pkey" PRIMARY KEY ("prospect_id")
);

-- CreateTable
CREATE TABLE "CO_prompts" (
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

    CONSTRAINT "CO_prompts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CO_prospect_enrichments" (
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

    CONSTRAINT "CO_prospect_enrichments_pkey" PRIMARY KEY ("prospect_id")
);

-- CreateTable
CREATE TABLE "CO_prospects" (
    "id" SERIAL NOT NULL,
    "campaign_id" INTEGER NOT NULL,
    "batch_id" INTEGER,
    "name" VARCHAR(255),
    "email" VARCHAR(255) NOT NULL,
    "company" VARCHAR(255),
    "position" VARCHAR(255),
    "linkedin_url" VARCHAR(500),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "additional_data" JSONB,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "job_title" VARCHAR(255),
    "phone" VARCHAR(100),
    "location" VARCHAR(255),
    "company_employees" VARCHAR(100),
    "company_industries" TEXT,
    "company_keywords" TEXT,
    "uses_fallback" BOOLEAN DEFAULT false,

    CONSTRAINT "CO_prospects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CO_services" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "prompt_template" TEXT,

    CONSTRAINT "CO_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CO_workflow_sessions" (
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

    CONSTRAINT "CO_workflow_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" SERIAL NOT NULL,
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
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CO_batches" ADD CONSTRAINT "CO_batches_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "CO_campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CO_generated_emails" ADD CONSTRAINT "CO_generated_emails_prospect_id_fkey" FOREIGN KEY ("prospect_id") REFERENCES "CO_prospects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CO_prospect_enrichments" ADD CONSTRAINT "CO_prospect_enrichments_prospect_id_fkey" FOREIGN KEY ("prospect_id") REFERENCES "CO_prospects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CO_prospects" ADD CONSTRAINT "CO_prospects_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "CO_campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CO_prospects" ADD CONSTRAINT "CO_prospects_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "CO_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CO_workflow_sessions" ADD CONSTRAINT "CO_workflow_sessions_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "CO_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

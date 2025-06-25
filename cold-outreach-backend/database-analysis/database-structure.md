# Database Structure Documentation

Generated on: 2025-06-23T17:49:12.994Z

## Overview

This document describes the current database structure after recent modifications.

## Tables

### CO_api_configurations

**Columns:**

| Column | Type | Nullable | Default | Primary Key | Foreign Key |
|--------|------|----------|---------|-------------|-------------|
| id | integer | No | nextval('api_configurations_id_seq'::regclass) | Yes | - |
| openrouter_api_key | character varying(500) | Yes | - | No | - |
| gemini_api_key | character varying(500) | Yes | - | No | - |
| firecrawl_api_key | character varying(500) | Yes | - | No | - |
| proxycurl_api_key | character varying(500) | Yes | - | No | - |
| industry_mappings | jsonb | Yes | - | No | - |
| is_active | boolean | No | true | No | - |
| created_at | timestamp without time zone | No | CURRENT_TIMESTAMP | No | - |
| updated_at | timestamp without time zone | No | - | No | - |
| default_signature | text | Yes | - | No | - |
| personal_email_domains | text | Yes | 'gmail.com,yahoo.com,hotmail.com,outlook.com,aol.com,icloud.com,protonmail.com,zoho.com,gmx.com,mail.com'::text | No | - |
| gemini_temperature | double precision | Yes | 0.7 | No | - |
| gemini_max_output_tokens | integer | Yes | 8192 | No | - |
| timeout_seconds | integer | Yes | 60 | No | - |
| max_retries | integer | Yes | 3 | No | - |
| domain_keywords_industry | text | Yes | - | No | - |

### CO_auto_service_settings

**Columns:**

| Column | Type | Nullable | Default | Primary Key | Foreign Key |
|--------|------|----------|---------|-------------|-------------|
| id | integer | No | nextval('"CO_auto_service_settings_id_seq"'::regclass) | Yes | - |
| description | text | Yes | - | No | - |
| prompt_template | text | Yes | - | No | - |
| created_at | timestamp without time zone | Yes | - | No | - |
| updated_at | timestamp without time zone | Yes | - | No | - |

### CO_batches

**Columns:**

| Column | Type | Nullable | Default | Primary Key | Foreign Key |
|--------|------|----------|---------|-------------|-------------|
| id | integer | No | nextval('batches_id_seq'::regclass) | Yes | - |
| campaign_id | integer | No | - | No | CO_campaigns.id |
| name | character varying(255) | No | - | No | - |
| status | USER-DEFINED | No | 'UPLOADED'::"BatchStatus" | No | - |
| total_prospects | integer | No | 0 | No | - |
| enriched_prospects | integer | No | 0 | No | - |
| generated_emails | integer | No | 0 | No | - |
| failed_prospects | integer | No | 0 | No | - |
| error_message | text | Yes | - | No | - |
| created_at | timestamp without time zone | No | CURRENT_TIMESTAMP | No | - |
| updated_at | timestamp without time zone | No | - | No | - |

**Foreign Key Relationships:**

- `campaign_id` references `CO_campaigns.id`

### CO_campaigns

**Columns:**

| Column | Type | Nullable | Default | Primary Key | Foreign Key |
|--------|------|----------|---------|-------------|-------------|
| id | integer | No | nextval('campaigns_id_seq'::regclass) | Yes | - |
| name | character varying(255) | No | - | No | - |
| email_subject | character varying(500) | Yes | - | No | - |
| prompt | text | Yes | - | No | - |
| enrichment_flags | jsonb | Yes | - | No | - |
| service_id | integer | Yes | - | No | - |
| created_at | timestamp without time zone | No | CURRENT_TIMESTAMP | No | - |
| updated_at | timestamp without time zone | No | - | No | - |

### CO_generated_emails

**Columns:**

| Column | Type | Nullable | Default | Primary Key | Foreign Key |
|--------|------|----------|---------|-------------|-------------|
| prospect_id | integer | No | - | Yes | CO_prospects.id |
| subject | character varying(500) | Yes | - | No | - |
| body | text | Yes | - | No | - |
| generation_status | USER-DEFINED | No | 'PENDING'::"GenerationStatus" | No | - |
| error_message | text | Yes | - | No | - |
| created_at | timestamp without time zone | No | CURRENT_TIMESTAMP | No | - |
| updated_at | timestamp without time zone | No | - | No | - |
| language | character varying(50) | Yes | 'english'::character varying | No | - |
| generated_at | timestamp without time zone | Yes | - | No | - |
| model_used | character varying(100) | Yes | - | No | - |
| generation_metadata | json | Yes | '{}'::json | No | - |

**Foreign Key Relationships:**

- `prospect_id` references `CO_prospects.id`

### CO_prompts

**Columns:**

| Column | Type | Nullable | Default | Primary Key | Foreign Key |
|--------|------|----------|---------|-------------|-------------|
| id | integer | No | nextval('"CO_prompts_id_seq"'::regclass) | Yes | - |
| company_summary_prompt | text | Yes | - | No | - |
| linkedin_summary_prompt | text | Yes | - | No | - |
| tech_stack_prompt | text | Yes | - | No | - |
| prospect_analysis_prompt | text | Yes | - | No | - |
| is_active | boolean | No | true | No | - |
| version | character varying(50) | Yes | - | No | - |
| description | text | Yes | - | No | - |
| created_at | timestamp without time zone | No | CURRENT_TIMESTAMP | No | - |
| updated_at | timestamp without time zone | No | CURRENT_TIMESTAMP | No | - |

### CO_prospect_enrichments

**Columns:**

| Column | Type | Nullable | Default | Primary Key | Foreign Key |
|--------|------|----------|---------|-------------|-------------|
| prospect_id | integer | No | - | Yes | CO_prospects.id |
| company_website | character varying(500) | Yes | - | No | - |
| company_summary | text | Yes | - | No | - |
| linkedin_summary | text | Yes | - | No | - |
| prospect_analysis_summary | text | Yes | - | No | - |
| tech_stack | jsonb | Yes | - | No | - |
| enrichment_status | USER-DEFINED | No | 'PENDING'::"EnrichmentStatus" | No | - |
| created_at | timestamp without time zone | No | CURRENT_TIMESTAMP | No | - |
| updated_at | timestamp without time zone | No | - | No | - |
| builtwith_summary | text | Yes | - | No | - |
| enriched_at | timestamp without time zone | Yes | - | No | - |
| model_used | character varying(100) | Yes | - | No | - |

**Foreign Key Relationships:**

- `prospect_id` references `CO_prospects.id`

### CO_prospects

**Columns:**

| Column | Type | Nullable | Default | Primary Key | Foreign Key |
|--------|------|----------|---------|-------------|-------------|
| id | integer | No | nextval('prospects_id_seq'::regclass) | Yes | - |
| campaign_id | integer | No | - | No | CO_campaigns.id |
| batch_id | integer | Yes | - | No | CO_batches.id |
| name | character varying(255) | Yes | - | No | - |
| email | character varying(255) | No | - | No | - |
| company | character varying(255) | Yes | - | No | - |
| position | character varying(255) | Yes | - | No | - |
| linkedin_url | character varying(500) | Yes | - | No | - |
| status | USER-DEFINED | No | 'PENDING'::"ProspectStatus" | No | - |
| additional_data | jsonb | Yes | - | No | - |
| error_message | text | Yes | - | No | - |
| created_at | timestamp without time zone | No | CURRENT_TIMESTAMP | No | - |
| updated_at | timestamp without time zone | No | - | No | - |
| job_title | character varying(255) | Yes | - | No | - |
| phone | character varying(100) | Yes | - | No | - |
| location | character varying(255) | Yes | - | No | - |
| company_employees | character varying(100) | Yes | - | No | - |
| company_industries | text | Yes | - | No | - |
| company_keywords | text | Yes | - | No | - |
| uses_fallback | boolean | Yes | false | No | - |

**Foreign Key Relationships:**

- `campaign_id` references `CO_campaigns.id`
- `batch_id` references `CO_batches.id`

### CO_services

**Columns:**

| Column | Type | Nullable | Default | Primary Key | Foreign Key |
|--------|------|----------|---------|-------------|-------------|
| id | integer | No | nextval('services_id_seq'::regclass) | Yes | - |
| name | character varying(255) | No | - | No | - |
| is_active | boolean | No | true | No | - |
| created_at | timestamp without time zone | No | CURRENT_TIMESTAMP | No | - |
| updated_at | timestamp without time zone | No | - | No | - |
| prompt_template | text | Yes | - | No | - |

### CO_workflow_sessions

**Columns:**

| Column | Type | Nullable | Default | Primary Key | Foreign Key |
|--------|------|----------|---------|-------------|-------------|
| id | text | No | - | Yes | - |
| user_session_id | character varying(255) | No | - | No | - |
| campaign_id | integer | Yes | - | No | CO_campaigns.id |
| current_step | USER-DEFINED | No | 'UPLOAD_CSV'::"WorkflowStep" | No | - |
| status | USER-DEFINED | No | 'ACTIVE'::"WorkflowStatus" | No | - |
| configuration_data | jsonb | Yes | - | No | - |
| steps_completed | jsonb | Yes | - | No | - |
| error_message | text | Yes | - | No | - |
| created_at | timestamp without time zone | No | CURRENT_TIMESTAMP | No | - |
| updated_at | timestamp without time zone | No | - | No | - |

**Foreign Key Relationships:**

- `campaign_id` references `CO_campaigns.id`

### profiles

**Columns:**

| Column | Type | Nullable | Default | Primary Key | Foreign Key |
|--------|------|----------|---------|-------------|-------------|
| id | integer | No | nextval('profiles_id_seq'::regclass) | Yes | - |
| name | character varying(100) | No | - | No | - |
| api_key | character varying(500) | Yes | - | No | - |
| temperature | character varying(10) | Yes | - | No | - |
| max_tokens | character varying(10) | Yes | - | No | - |
| top_k | character varying(10) | Yes | - | No | - |
| top_p | character varying(10) | Yes | - | No | - |
| max_email_history | character varying(10) | Yes | - | No | - |
| email_history_max_length | character varying(10) | Yes | - | No | - |
| custom_prompt | text | Yes | - | No | - |
| is_active | boolean | Yes | - | No | - |
| created_at | timestamp without time zone | Yes | - | No | - |
| updated_at | timestamp without time zone | Yes | - | No | - |

## Relationships

- `CO_workflow_sessions.campaign_id` → `CO_campaigns.id`
  - Update Rule: CASCADE
  - Delete Rule: SET NULL

- `CO_batches.campaign_id` → `CO_campaigns.id`
  - Update Rule: CASCADE
  - Delete Rule: RESTRICT

- `CO_prospects.campaign_id` → `CO_campaigns.id`
  - Update Rule: CASCADE
  - Delete Rule: RESTRICT

- `CO_prospects.batch_id` → `CO_batches.id`
  - Update Rule: CASCADE
  - Delete Rule: SET NULL

- `CO_prospect_enrichments.prospect_id` → `CO_prospects.id`
  - Update Rule: CASCADE
  - Delete Rule: CASCADE

- `CO_generated_emails.prospect_id` → `CO_prospects.id`
  - Update Rule: CASCADE
  - Delete Rule: CASCADE

## Indexes

| Table | Index Name | Definition |
|-------|------------|------------|
| CO_api_configurations | api_configurations_pkey | `CREATE UNIQUE INDEX api_configurations_pkey ON public."CO_api_configurations" USING btree (id)` |
| CO_auto_service_settings | CO_auto_service_settings_pkey | `CREATE UNIQUE INDEX "CO_auto_service_settings_pkey" ON public."CO_auto_service_settings" USING btree (id)` |
| CO_batches | batches_pkey | `CREATE UNIQUE INDEX batches_pkey ON public."CO_batches" USING btree (id)` |
| CO_campaigns | campaigns_pkey | `CREATE UNIQUE INDEX campaigns_pkey ON public."CO_campaigns" USING btree (id)` |
| CO_generated_emails | generated_emails_pkey | `CREATE UNIQUE INDEX generated_emails_pkey ON public."CO_generated_emails" USING btree (prospect_id)` |
| CO_prompts | CO_prompts_pkey | `CREATE UNIQUE INDEX "CO_prompts_pkey" ON public."CO_prompts" USING btree (id)` |
| CO_prospect_enrichments | prospect_enrichments_pkey | `CREATE UNIQUE INDEX prospect_enrichments_pkey ON public."CO_prospect_enrichments" USING btree (prospect_id)` |
| CO_prospects | prospects_pkey | `CREATE UNIQUE INDEX prospects_pkey ON public."CO_prospects" USING btree (id)` |
| CO_services | services_pkey | `CREATE UNIQUE INDEX services_pkey ON public."CO_services" USING btree (id)` |
| CO_workflow_sessions | workflow_sessions_pkey | `CREATE UNIQUE INDEX workflow_sessions_pkey ON public."CO_workflow_sessions" USING btree (id)` |
| profiles | profiles_name_key | `CREATE UNIQUE INDEX profiles_name_key ON public.profiles USING btree (name)` |
| profiles | profiles_pkey | `CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id)` |


# Database Schema Documentation

**Generated**: 2025-06-21  
**Database Type**: PostgreSQL  
**Environment**: Production (Render Cloud)  
**Purpose**: Cold Outreach Application - AI-powered prospect enrichment and email generation

## Table of Contents
1. [Overview](#overview)
2. [Database Statistics](#database-statistics)
3. [Enumerations](#enumerations)
4. [Core Tables](#core-tables)
5. [Data Flow](#data-flow)
6. [Relationships](#relationships)
7. [Schema Guidelines](#schema-guidelines)
8. [For AI Assistants](#for-ai-assistants)

## Overview

This Cold Outreach application uses a PostgreSQL database to manage:
- **Campaigns**: Email marketing campaigns with AI prompt configurations
- **Prospects**: Target contacts for outreach with enrichment data
- **Workflow Management**: Multi-step processing workflows with session tracking
- **Batch Processing**: Group processing of prospects for scalability
- **Background Jobs**: Asynchronous processing tasks with retry logic
- **API Integration**: External service enrichment (Proxycurl, Firecrawl, BuiltWith)

### Current Statistics
- **Total Tables**: 11
- **Total Prospects**: 3
- **Total Batches**: 54
- **Database URL**: PostgreSQL on Render Cloud

## Enumerations

The application uses several enumerations to ensure data consistency:

### ProspectStatus
Controls the prospect processing lifecycle:
- `PENDING` - Initial state after upload
- `ENRICHING` - Currently being enriched with external data
- `ENRICHED` - Enrichment completed successfully
- `GENERATING` - Email generation in progress
- `COMPLETED` - All processing completed successfully
- `FAILED` - Processing failed at some stage

### EnrichmentStatus
Tracks enrichment processing state:
- `PENDING` - Awaiting enrichment
- `PROCESSING` - Currently being processed
- `COMPLETED` - Enrichment successful
- `FAILED` - Enrichment failed

### GenerationStatus
Tracks email generation state:
- `PENDING` - Awaiting generation
- `GENERATING` - Currently generating
- `COMPLETED` - Generation successful
- `FAILED` - Generation failed

### BatchStatus
Manages batch-level processing:
- `UPLOADED` - Just uploaded, ready for enrichment
- `ENRICHING` - Currently enriching prospects
- `ENRICHED` - All prospects enriched
- `GENERATING` - Currently generating emails
- `COMPLETED` - All processing completed
- `FAILED` - Batch failed (some prospects failed)
- `PARTIAL` - Some prospects completed, some failed

### WorkflowStep
Defines workflow progression:
- `UPLOAD_CSV` - CSV file upload step
- `CAMPAIGN_SETTINGS` - Campaign configuration
- `ENRICHMENT_CONFIG` - Enrichment settings
- `BEGIN_ENRICHMENT` - Start enrichment process
- `EMAIL_GENERATION` - Generate emails
- `COMPLETED` - Workflow completed

### WorkflowStatus
Tracks workflow session state:
- `ACTIVE` - Currently active
- `PAUSED` - Temporarily paused
- `COMPLETED` - Successfully completed
- `ABANDONED` - User abandoned
- `ERROR` - Error occurred

## Core Tables

### campaigns
**Purpose**: Store email marketing campaigns with AI configurations
**Model Class**: `Campaign`

**Key Columns**:
- `id` (INTEGER, PK) - Primary key identifier
- `name` (VARCHAR(255)) - Campaign name/title
- `email_subject` (VARCHAR(500)) - Email subject template
- `prompt` (TEXT) - Main AI prompt for email generation
- `enrichment_flags` (JSON) - Array of enrichment services to use
- `service_id` (INTEGER, FK) - Reference to services table

**Relationships**: One-to-Many with prospects, batches, processing_jobs, workflow_sessions

### workflow_sessions
**Purpose**: Track user workflow progress and session data
**Model Class**: `WorkflowSession`

**Key Columns**:
- `id` (INTEGER, PK) - Primary key identifier
- `user_session_id` (VARCHAR(255)) - Flask session ID
- `current_step` (ENUM WorkflowStep) - Current workflow step
- `status` (ENUM WorkflowStatus) - Session status
- `configuration_data` (JSON) - Step configuration data
- `steps_completed` (JSON) - Array of completed steps

**Key Features**: Session recovery, progress tracking, error handling, checkpoint system

### batches
**Purpose**: Group prospects for batch processing
**Model Class**: `Batch`

**Key Columns**:
- `id` (INTEGER, PK) - Primary key identifier
- `campaign_id` (INTEGER, FK) - Reference to campaigns
- `name` (VARCHAR(255)) - Batch name
- `status` (ENUM BatchStatus) - Processing status
- `total_prospects` (INTEGER) - Total prospects in batch
- `enriched_prospects` (INTEGER) - Successfully enriched count
- `generated_emails` (INTEGER) - Successfully generated emails
- `failed_prospects` (INTEGER) - Failed prospects count

### prospects
**Purpose**: Store individual prospect information and processing status
**Model Class**: `Prospect`

**Key Columns**:
- `id` (INTEGER, PK) - Primary key identifier
- `campaign_id` (INTEGER, FK) - Reference to campaigns
- `batch_id` (INTEGER, FK) - Reference to batches
- `name` (VARCHAR(255)) - Prospect full name
- `email` (VARCHAR(255)) - Email address
- `company` (VARCHAR(255)) - Company name
- `status` (ENUM ProspectStatus) - Processing status
- `additional_data` (JSON) - Flexible prospect data

**Relationships**: One-to-One with enrichment, generated_email, analysis

### prospect_enrichments
**Purpose**: Store enriched prospect data from external APIs
**Model Class**: `ProspectEnrichment`

**Key Columns**:
- `prospect_id` (INTEGER, FK) - Reference to prospects
- `company_website` (VARCHAR(500)) - Company website URL
- `company_summary` (TEXT) - AI-generated company summary
- `linkedin_summary` (TEXT) - LinkedIn profile summary
- `tech_stack` (JSON) - Array of technologies
- `enrichment_data` (JSON) - Raw enrichment data

### prospect_analyses
**Purpose**: Store AI-generated prospect analysis and insights
**Model Class**: `ProspectAnalysis`

**Key Columns**:
- `prospect_id` (INTEGER, FK) - Reference to prospects
- `personalization_opportunities` (JSON) - Array of personalization points
- `pain_points` (JSON) - Identified pain points
- `market_position` (TEXT) - **[FIXED]** Market position analysis
- `suggested_approach` (TEXT) - **[FIXED]** Outreach strategy
- `executive_summary` (TEXT) - Analysis summary
- `confidence_score` (FLOAT) - Analysis confidence (0.0-1.0)

**⚠️ CRITICAL FIX**: `market_position` and `suggested_approach` were changed from `VARCHAR(500)` to `TEXT` to prevent truncation errors.

### generated_emails
**Purpose**: Store AI-generated personalized emails
**Model Class**: `GeneratedEmail`

**Key Columns**:
- `prospect_id` (INTEGER, FK) - Reference to prospects
- `subject` (VARCHAR(500)) - Email subject line
- `body` (TEXT) - Email body content
- `generation_status` (ENUM GenerationStatus) - Generation status

### processing_jobs
**Purpose**: Track background processing jobs
**Model Class**: `ProcessingJob`

**Key Columns**:
- `campaign_id` (INTEGER, FK) - Reference to campaigns
- `job_type` (ENUM JobType) - ENRICHMENT/GENERATION/FULL_PIPELINE
- `status` (ENUM JobStatus) - Job status
- `progress_current` (INTEGER) - Current progress count
- `progress_total` (INTEGER) - Total items to process

### api_configurations
**Purpose**: Store API keys and configuration settings
**Model Class**: `APIConfiguration`

**Key Features**:
- API keys for OpenRouter, Gemini, Firecrawl, Proxycurl
- Model configuration parameters
- AI prompt templates
- Industry classification mappings

## Data Flow

### Prospect Processing Pipeline
```
1. CSV Upload → Create Batch → Create Prospects
2. Prospects (PENDING) → Enrichment (ENRICHING) → Enriched (ENRICHED)
3. Enriched Prospects → Analysis → Email Generation (GENERATING)
4. Generated Emails → Completed (COMPLETED) or Failed (FAILED)
5. Batch Status Updates → Final Status (COMPLETED/PARTIAL/FAILED)
```

### API Integration Flow
```
1. Proxycurl → LinkedIn profile data → prospect_enrichments.linkedin_summary
2. Firecrawl → Website content → prospect_enrichments.company_summary
3. BuiltWith → Tech stack → prospect_enrichments.tech_stack
4. OpenRouter/Gemini → Analysis → prospect_analyses.*
5. OpenRouter/Gemini → Email → generated_emails.*
```

## Schema Guidelines

### Column Length Constraints
| Field Type | Recommended Length | Examples |
|------------|-------------------|----------|
| Name/Title | VARCHAR(255) | prospect names, campaign titles |
| Email | VARCHAR(255) | email addresses |
| Short URL | VARCHAR(500) | LinkedIn URLs, website URLs |
| Long Content | TEXT | AI analysis, email bodies, summaries |
| Short Text | VARCHAR(100) | Phone numbers, locations |
| Error Messages | TEXT | Full error stack traces |
| JSON Data | JSON | Flexible structured data |

### Status Management Pattern
All status fields follow this pattern:
- `PENDING` → `PROCESSING` → `COMPLETED` / `FAILED`
- Always update timestamps when status changes
- Store error messages in dedicated `error_message` fields
- Use appropriate enum values consistently

## For AI Assistants

### Critical Guidelines for AI Development

#### 1. **Always Reference This Schema**
Before making any database changes, check this documentation to understand:
- Column constraints and lengths
- Enum values and their meanings
- Relationship dependencies

#### 2. **Column Length Validation**
**CRITICAL**: Recent `StringDataRightTruncation` errors were caused by:
- `market_position` and `suggested_approach` columns were `VARCHAR(500)`
- AI-generated content often exceeds 500 characters
- **SOLUTION**: These are now `TEXT` columns (unlimited length)

**Always check column lengths before storing data**:
```python
# BAD - May cause truncation error
analysis.market_position = very_long_ai_generated_text  # Could be >500 chars

# GOOD - Use TEXT columns for AI-generated content
# TEXT columns can handle unlimited length content
```

#### 3. **Enum Value Validation**
Always use the correct enum values:
```python
# GOOD
prospect.status = ProspectStatus.ENRICHING
batch.status = BatchStatus.ENRICHING

# BAD
prospect.status = "enriching"  # Lowercase, not enum
```

#### 4. **Error Handling Best Practices**
```python
# GOOD - Comprehensive error handling
try:
    db.session.commit()
except IntegrityError as e:
    db.session.rollback()
    logger.error(f"Database integrity error: {e}")
    return {"error": "Database constraint violation"}
except Exception as e:
    db.session.rollback()
    logger.error(f"Unexpected error: {e}")
    return {"error": "Processing failed"}
```

#### 5. **JSON Field Handling**
```python
# GOOD - Safe JSON handling
if prospect.additional_data is None:
    prospect.additional_data = {}
prospect.additional_data['new_field'] = value
```

### Common Pitfalls to Avoid

1. **String Truncation**: Always use TEXT for AI-generated content
2. **Invalid Enums**: Use enum classes, not string literals
3. **Orphaned Records**: Clean up related records when deleting
4. **Session Conflicts**: Handle database session rollbacks properly
5. **Missing Error Handling**: Always catch and log database errors

### How to Prompt AI Assistants Correctly

When asking AI assistants to work with this database:

1. **Reference this document**: "Check the DATABASE_SCHEMA.md for column constraints"
2. **Specify constraints**: "Use TEXT column for long AI-generated content"
3. **Mention relationships**: "Update related batch counts when changing prospect status"
4. **Request validation**: "Validate enum values before saving"
5. **Ask for error handling**: "Include proper error handling with rollback"

### Example AI Prompt Template
```
Please help me [task description]. Before making changes:
1. Check DATABASE_SCHEMA.md for column constraints and relationships
2. Ensure AI-generated content uses TEXT columns (not VARCHAR)
3. Use proper enum values from the schema documentation
4. Include error handling with database rollback
5. Update related records if necessary (e.g., batch counts)
```

---

**Last Updated**: 2025-06-21  
**Maintainer**: Development Team + AI Assistant  
**Note**: This schema documentation should be referenced before any database operations to prevent schema-related errors.
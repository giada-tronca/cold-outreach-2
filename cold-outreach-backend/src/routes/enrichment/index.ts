import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '@/config/database'
import { ApiResponseBuilder } from '@/utils/apiResponse'
import { asyncHandler } from '@/middleware/asyncHandler'
import { BadRequestError, NotFoundError } from '@/utils/errors'
import { Prisma, COProspects, COBatches } from '@prisma/client'
import { prospectEnrichmentQueue, ProspectEnrichmentJobData } from '@/jobs/queues'
import { extractProspectFromRow } from '../../utils/csvHelpers'
import { v4 as uuidv4 } from 'uuid'
import { createEnrichmentBatch } from '@/controllers/prospectEnrichmentController'
import { isValidEmail } from '../../utils/validation'

const router = Router()

// In-memory job storage (replace with Redis/database in production)
interface EnrichmentJob {
    id: string
    workflowSessionId: string
    status: 'pending' | 'running' | 'paused' | 'completed' | 'completed_with_errors' | 'failed' | 'cancelled'
    totalProspects: number
    processedProspects: number
    completedProspects: number
    failedProspects: number
    currentBatch: number
    totalBatches: number
    progress: number
    startedAt?: string
    estimatedCompletion?: string
    processingRate: number
    configuration: any
    prospects: Array<{
        id: string
        name: string
        email: string
        company: string
        title: string
        status: 'pending' | 'processing' | 'completed' | 'failed' | 'retrying'
        progress: number
        enrichedData?: any
        errors?: string[]
        retryCount: number
        processingTime?: number
        completedAt?: string
    }>
    errors: Array<{
        id: string
        message: string
        severity: 'warning' | 'error'
        timestamp: string
        prospectId?: string
    }>
    createdAt: string
    updatedAt: string
    batchId?: string
}

const enrichmentJobs = new Map<string, EnrichmentJob>()
const sseClients = new Map<string, Set<any>>() // jobId -> Set of SSE connections

// Map to track which workflowSessionId corresponds to which jobId for SSE updates
const workflowToJobMapping = new Map<string, string>()

// SSE Helper function
const sendSSEEvent = (jobId: string, type: string, payload: any) => {
    const clients = sseClients.get(jobId)
    if (clients) {
        const data = JSON.stringify({ type, payload, timestamp: new Date().toISOString() })
        clients.forEach(client => {
            try {
                client.write(`data: ${data}\n\n`)
            } catch (error) {
                console.error('Failed to send SSE event:', error)
                clients.delete(client)
            }
        })
    }
}

// MOCK DATA REMOVED - no more fake prospect generation

// MOCK PROCESSING FUNCTIONS REMOVED - now uses only real enrichment processing

// Real enrichment job processor using API services
const processRealEnrichmentJob = async (job: EnrichmentJob) => {
    try {
        job.status = 'running'
        job.startedAt = new Date().toISOString()

        const { EnrichmentService } = await import('@/services/enrichment')

        sendSSEEvent(job.id, 'job_status', job)

        // Extract prospect IDs and use real enrichment service
        const prospectIds = job.prospects.map(p => parseInt(p.id))

        // Configure enrichment
        const enrichmentConfig = {
            services: {
                proxycurl: true,
                firecrawl: true,
                builtwith: true
            },
            options: {
                skipErrors: true,
                saveRawData: false
            }
        }

        console.log(`🔍 [Real Enrichment]: Starting enrichment for ${prospectIds.length} prospects`)

        // Process prospects with real API calls
        const enrichmentResults = await EnrichmentService.enrichProspects(prospectIds, enrichmentConfig)

        // Update job with results
        for (let i = 0; i < enrichmentResults.length; i++) {
            const result = enrichmentResults[i]!
            const prospect = job.prospects.find(p => parseInt(p.id) === result.prospectId)

            if (prospect) {
                prospect.status = result.success ? 'completed' : 'failed'
                prospect.progress = 100
                prospect.processingTime = result.processingTime || 0
                prospect.completedAt = new Date().toISOString()

                if (result.success) {
                    prospect.enrichedData = {
                        linkedin: result.data?.personData?.profileUrl,
                        phone: result.data?.personData?.currentPosition?.company,
                        jobTitle: result.data?.personData?.headline,
                        companySize: result.data?.companyData?.size,
                        industry: result.data?.companyData?.industry,
                        website: result.data?.websiteData?.url,
                        techStack: result.data?.techStack?.technologies
                    }
                    job.completedProspects++
                } else {
                    prospect.errors = result.errors || ['Enrichment failed']
                    job.failedProspects++

                    // Add error to job
                    job.errors.push({
                        id: uuidv4(),
                        message: `Failed to enrich prospect: ${prospect.name}`,
                        severity: 'error',
                        timestamp: new Date().toISOString(),
                        prospectId: prospect.id
                    })
                }

                job.processedProspects++
                job.progress = Math.round((job.processedProspects / job.totalProspects) * 100)

                sendSSEEvent(job.id, 'prospect_update', prospect)
                sendSSEEvent(job.id, 'job_status', job)
            }
        }

        if (job.status === 'running') {
            // Determine final status based on results
            const successRate = job.totalProspects > 0 ? (job.completedProspects / job.totalProspects) : 0

            if (job.completedProspects === 0) {
                // All prospects failed
                job.status = 'failed'
                sendSSEEvent(job.id, 'job_failed', {
                    ...job,
                    message: 'All prospects failed enrichment',
                    successRate: 0
                })
            } else if (successRate >= 0.8) {
                // 80% or more success rate - consider successful
                job.status = 'completed'
                job.progress = 100
                sendSSEEvent(job.id, 'job_complete', {
                    ...job,
                    message: 'Enrichment completed successfully',
                    successRate: Math.round(successRate * 100)
                })
            } else {
                // Partial success - completed with warnings
                job.status = 'completed_with_errors'
                job.progress = 100
                sendSSEEvent(job.id, 'job_complete_with_errors', {
                    ...job,
                    message: `Enrichment completed with ${job.failedProspects} failures (${Math.round(successRate * 100)}% success rate)`,
                    successRate: Math.round(successRate * 100)
                })
            }
        }

        console.log(`✅ [Real Enrichment]: Completed enrichment job ${job.id}`)

    } catch (error) {
        job.status = 'failed'
        job.errors.push({
            id: uuidv4(),
            message: `Real enrichment job processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            severity: 'error',
            timestamp: new Date().toISOString()
        })
        sendSSEEvent(job.id, 'error', { message: error instanceof Error ? error.message : 'Job processing failed' })
        console.error(`❌ [Real Enrichment]: Job ${job.id} failed:`, error)
    } finally {
        job.updatedAt = new Date().toISOString()
        enrichmentJobs.set(job.id, job)
    }
}

/**
 * Update enrichment job progress when individual BullMQ jobs complete
 */
export async function updateEnrichmentJobProgress(workflowSessionId: string, prospectId: string, success: boolean, enrichmentData?: any, errorMessage?: string) {
    try {
        // Find the job ID associated with this workflow session
        const jobId = workflowToJobMapping.get(workflowSessionId)
        if (!jobId) {
            console.log(`⚠️ [Batch Progress]: No job ID found for workflow session ${workflowSessionId}`)
            return
        }

        // Get the job from our tracking map
        const job = enrichmentJobs.get(jobId)
        if (!job) {
            console.log(`⚠️ [Batch Progress]: No job found for ID ${jobId}`)
            return
        }

        // Find the prospect in the job
        const prospect = job.prospects.find(p => p.id === prospectId)
        if (!prospect) {
            console.log(`⚠️ [Batch Progress]: Prospect ${prospectId} not found in job ${jobId}`)
            return
        }

        // Update prospect status
        prospect.status = success ? 'completed' : 'failed'
        prospect.progress = 100
        prospect.completedAt = new Date().toISOString()

        if (success) {
            prospect.enrichedData = enrichmentData
            job.completedProspects++
        } else {
            prospect.errors = [errorMessage || 'Enrichment failed']
            job.failedProspects++
            job.errors.push({
                id: uuidv4(),
                message: `Failed to enrich prospect: ${prospect.name}`,
                severity: 'error',
                timestamp: new Date().toISOString(),
                prospectId: prospect.id
            })
        }

        // Update job counters
        job.processedProspects++
        job.progress = Math.round((job.processedProspects / job.totalProspects) * 100)
        job.updatedAt = new Date().toISOString()

        // Send SSE updates
        sendSSEEvent(jobId, 'prospect_update', prospect)
        sendSSEEvent(jobId, 'job_status', job)

        // Check if job is complete
        if (job.processedProspects >= job.totalProspects) {
            const successRate = job.totalProspects > 0 ? (job.completedProspects / job.totalProspects) : 0

            if (job.completedProspects === 0) {
                job.status = 'failed'
                sendSSEEvent(jobId, 'job_failed', {
                    ...job,
                    message: 'All prospects failed enrichment',
                    successRate: 0
                })
            } else if (successRate >= 0.8) {
                job.status = 'completed'
                job.progress = 100
                sendSSEEvent(jobId, 'job_complete', {
                    ...job,
                    message: 'Enrichment completed successfully',
                    successRate: Math.round(successRate * 100)
                })
            } else {
                job.status = 'completed_with_errors'
                job.progress = 100
                sendSSEEvent(jobId, 'job_complete_with_errors', {
                    ...job,
                    message: `Enrichment completed with ${job.failedProspects} failures (${Math.round(successRate * 100)}% success rate)`,
                    successRate: Math.round(successRate * 100)
                })
            }

            console.log(`✅ [Batch Progress]: Job ${jobId} completed with ${job.completedProspects}/${job.totalProspects} successful enrichments`)
        }

        // Update the job in our map
        enrichmentJobs.set(jobId, job)

        console.log(`📊 [Batch Progress]: Updated job ${jobId} - ${job.processedProspects}/${job.totalProspects} processed (${job.progress}%)`)

    } catch (error) {
        console.error('Failed to update enrichment job progress:', error)
    }
}

/**
 * POST /api/enrichment/jobs
 * Create enrichment jobs using proper BullMQ background job system
 */
router.post('/jobs', asyncHandler(async (req: Request, res: Response) => {
    const { workflowSessionId, configuration, campaignId, prospectIds, csvData, filename } = req.body;

    if (!workflowSessionId || !configuration) {
        throw new BadRequestError('Missing required fields: workflowSessionId and configuration');
    }

    if (!campaignId) {
        throw new BadRequestError('Campaign ID is required');
    }

    let dbProspects: COProspects[];
    let batch: COBatches | null = null;

    // STEP 1: Create batch FIRST when starting enrichment
    console.log('📋 [Enrichment]: Creating batch for enrichment session FIRST');
    const batchName = `Enrichment Batch - ${new Date().toISOString()}`;

    batch = await prisma.cOBatches.create({
        data: {
            name: batchName,
            campaign: {
                connect: { id: parseInt(campaignId) }
            },
            status: 'PROCESSING',
            totalProspects: 0 // Will be updated after prospect processing
        }
    });
    console.log('✅ [Enrichment]: Created batch', batch.id);

    // Store warnings for mixed scenarios (some created, some skipped)
    let processingWarnings: string[] = [];

    // STEP 2: Handle CSV processing if CSV data is provided
    if (csvData && Array.isArray(csvData) && csvData.length > 0) {
        console.log(`📊 [Enrichment]: Processing CSV data with ${csvData.length} rows`);

        // Create prospects from CSV data
        const prospectsToCreate = csvData.map((row: Record<string, any>, index: number) => {
            console.log(`🔍 [CSV Debug]: Processing row ${index}:`, row);
            const prospectData = extractProspectFromRow(row);
            console.log(`🔍 [CSV Debug]: Extracted prospect data for row ${index}:`, prospectData);

            // Ensure required fields have default values
            const createData: Prisma.COProspectsUncheckedCreateInput = {
                name: prospectData.name || `Prospect-${index}`, // Provide default name since it's required
                email: prospectData.email || `prospect-${index}-${Date.now()}@placeholder.com`, // Default email to prevent type error
                company: prospectData.company || undefined,
                position: prospectData.position || undefined,
                linkedinUrl: prospectData.linkedinUrl || undefined,
                status: 'PENDING' as const,
                campaignId: parseInt(campaignId),
                batchId: batch.id,
                createdAt: new Date(),
                updatedAt: new Date(),
                usesFallback: false,
                additionalData: {
                    ...prospectData.additionalData,
                    csvRowIndex: index,
                    uploadSession: workflowSessionId
                }
            };

            console.log(`🔍 [CSV Debug]: Final create data for row ${index}:`, {
                name: createData.name,
                email: createData.email,
                company: createData.company,
                position: createData.position,
                linkedinUrl: createData.linkedinUrl
            });

            return createData;
        });

        // Create prospects with proper typing and error handling
        console.log(`👥 [Enrichment]: Creating ${prospectsToCreate.length} prospects`);

        let prospectsCreated = 0;
        let prospectsSkipped = 0;
        const skippedReasons: string[] = [];

        // Use transaction to ensure data consistency
        await prisma.$transaction(async (prismaClient: Prisma.TransactionClient) => {
            for (const prospectData of prospectsToCreate) {
                try {
                    // Check for duplicates
                    if (prospectData.email) {
                        const existingProspect = await prismaClient.cOProspects.findFirst({
                            where: {
                                email: prospectData.email,
                                campaignId: parseInt(campaignId),
                            },
                        });

                        if (existingProspect) {
                            console.log(`⚠️ [Enrichment]: Skipping duplicate email: ${prospectData.email}`);
                            prospectsSkipped++;
                            skippedReasons.push(`Duplicate email: ${prospectData.email}`);
                            continue;
                        }
                    }

                    await prismaClient.cOProspects.create({
                        data: prospectData,
                    });
                    prospectsCreated++;
                } catch (error) {
                    console.error(`❌ [Enrichment]: Error creating prospect:`, error);
                    prospectsSkipped++;
                    skippedReasons.push(`Creation error for ${prospectData.email || 'unknown email'}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            }

            // Update batch with actual prospect count
            await prismaClient.cOBatches.update({
                where: { id: batch.id },
                data: { totalProspects: prospectsCreated }
            });
        });

        console.log(`✅ [Enrichment]: CSV processing completed - ${prospectsCreated} created, ${prospectsSkipped} skipped`);

        // Get the newly created prospects for enrichment
        dbProspects = await prisma.cOProspects.findMany({
            where: {
                batchId: batch.id
            }
        });
        console.log(`🔍 [Enrichment]: Found ${dbProspects.length} newly created prospects for enrichment`);

        // Enhanced error handling for cases where no prospects were created
        if (dbProspects.length === 0 && prospectsSkipped > 0) {
            const duplicateEmails = skippedReasons.filter(reason => reason.includes('Duplicate email')).length;
            const errorReasons = skippedReasons.filter(reason => reason.includes('Creation error')).length;

            let errorMessage = `No new prospects were created from your CSV file. `;

            if (duplicateEmails > 0) {
                errorMessage += `${duplicateEmails} prospect(s) were skipped because they already exist in this campaign. `;
            }

            if (errorReasons > 0) {
                errorMessage += `${errorReasons} prospect(s) failed to create due to validation errors. `;
            }

            errorMessage += `\n\nDetails:\n${skippedReasons.slice(0, 5).join('\n')}`;

            if (skippedReasons.length > 5) {
                errorMessage += `\n... and ${skippedReasons.length - 5} more issues`;
            }

            errorMessage += `\n\nSolutions:\n`;
            if (duplicateEmails > 0) {
                errorMessage += `• Remove duplicate emails from your CSV file\n`;
                errorMessage += `• Use a different campaign for these prospects\n`;
                errorMessage += `• Or proceed with enriching existing prospects in this campaign\n`;
            }
            if (errorReasons > 0) {
                errorMessage += `• Check your CSV file format and fix validation errors\n`;
                errorMessage += `• Ensure all required fields are properly filled\n`;
            }

            throw new BadRequestError(errorMessage);
        }

        // Handle warnings for mixed scenarios (some created, some skipped)
        if (prospectsCreated > 0 && prospectsSkipped > 0) {
            const duplicateEmails = skippedReasons.filter(reason => reason.includes('Duplicate email')).length;
            const errorReasons = skippedReasons.filter(reason => reason.includes('Creation error')).length;

            let warningMessage = `Successfully created ${prospectsCreated} new prospects, but ${prospectsSkipped} were skipped:\n`;

            if (duplicateEmails > 0) {
                warningMessage += `• ${duplicateEmails} duplicates found (already exist in this campaign)\n`;
            }
            if (errorReasons > 0) {
                warningMessage += `• ${errorReasons} failed validation\n`;
            }

            // Add first few specific reasons
            if (skippedReasons.length > 0) {
                warningMessage += `\nSkipped details:\n${skippedReasons.slice(0, 3).join('\n')}`;
                if (skippedReasons.length > 3) {
                    warningMessage += `\n... and ${skippedReasons.length - 3} more`;
                }
            }

            processingWarnings.push(warningMessage);
            console.log(`⚠️ [Enrichment]: ${warningMessage}`);
        }
    } else if (prospectIds && Array.isArray(prospectIds) && prospectIds.length > 0) {
        // Get specific prospects by IDs
        dbProspects = await prisma.cOProspects.findMany({
            where: {
                id: { in: prospectIds.map(id => parseInt(id)) }
            }
        });

        if (dbProspects.length > 0) {
            // Update batch with prospect count and assign prospects to batch
            await prisma.$transaction([
                prisma.cOProspects.updateMany({
                    where: {
                        id: { in: dbProspects.map((p: COProspects) => p.id) }
                    },
                    data: {
                        batchId: batch.id
                    }
                }),
                prisma.cOBatches.update({
                    where: { id: batch.id },
                    data: { totalProspects: dbProspects.length }
                })
            ]);
            console.log(`✅ [Enrichment]: Assigned batch ${batch.id} to ${dbProspects.length} existing prospects`);
        }
    } else {
        throw new BadRequestError('Either campaignId with csvData, or prospectIds is required');
    }

    // Enhanced error handling for empty prospect lists
    if (dbProspects.length === 0) {
        // Check if we have any prospects in this campaign at all
        const existingProspects = await prisma.cOProspects.count({
            where: { campaignId: parseInt(campaignId) }
        });

        let errorMessage = 'No prospects found to enrich. ';

        if (existingProspects === 0) {
            errorMessage += 'This campaign has no prospects yet. Please upload a CSV file with prospect data first.';
        } else {
            errorMessage += `This campaign has ${existingProspects} existing prospects, but none were selected for enrichment. `;
            errorMessage += 'This usually happens when:\n';
            errorMessage += '• All prospects in your CSV already exist in this campaign\n';
            errorMessage += '• Your CSV file contains invalid or incomplete prospect data\n';
            errorMessage += '• The prospects were filtered out due to validation errors\n\n';
            errorMessage += 'Solutions:\n';
            errorMessage += '• Upload a CSV with new, unique prospects\n';
            errorMessage += '• Use the existing prospects in this campaign for enrichment\n';
            errorMessage += '• Check your CSV file format and data quality';
        }

        throw new BadRequestError(errorMessage);
    }

    // Validate and prepare enrichment configuration
    const concurrency = Math.max(1, Math.min(configuration.concurrency || 3, 10)); // Limit to 10 max
    const aiProvider = configuration.aiProvider || 'openrouter';
    const llmModelId = configuration.llmModelId;

    console.log(`🚀 [Enrichment]: Creating ${concurrency} parallel enrichment jobs for ${dbProspects.length} prospects`);

    // Create individual enrichment jobs based on concurrency
    const batchId = `batch-${Date.now()}`;
    const prospectsPerJob = Math.ceil(dbProspects.length / concurrency);
    const jobPromises = [];

    for (let i = 0; i < dbProspects.length; i += prospectsPerJob) {
        const jobProspects = dbProspects.slice(i, i + prospectsPerJob);

        // Create individual jobs for each prospect in this batch
        for (const prospect of jobProspects) {
            const typedProspect = prospect as COProspects;

            // Check which services are requested
            const services = configuration.services || [];
            const requestedServices = Array.isArray(services) ? services : Object.keys(services).filter(key => services[key]);

            // Determine what enrichment we can do for this prospect
            const canEnrichLinkedIn = !!(typedProspect.linkedinUrl &&
                (requestedServices.includes('LinkedIn') || requestedServices.includes('proxycurl')));

            const canEnrichCompany = !!(typedProspect.company &&
                (requestedServices.includes('Company') || requestedServices.includes('firecrawl')));

            const canEnrichTechStack = !!(typedProspect.company &&
                (requestedServices.includes('TechStack') || requestedServices.includes('builtwith')));

            // Skip if we can't do any enrichment for this prospect
            if (!canEnrichLinkedIn && !canEnrichCompany && !canEnrichTechStack) {
                console.log(`⚠️ [Enrichment]: Skipping prospect ${typedProspect.id} - no enrichment possible with available data`);
                continue;
            }

            // Skip if LinkedIn enrichment is needed but no URL is available (since linkedinUrl is required in the job data)
            if (canEnrichLinkedIn && !typedProspect.linkedinUrl) {
                console.log(`⚠️ [Enrichment]: Skipping prospect ${typedProspect.id} - LinkedIn enrichment requested but no LinkedIn URL available`);
                continue;
            }

            const jobData: ProspectEnrichmentJobData = {
                prospectId: typedProspect.id.toString(),
                userId: 'system', // TODO: Get from auth context
                linkedinUrl: typedProspect.linkedinUrl || '', // Provide empty string as fallback since it's required
                aiProvider: aiProvider as 'gemini' | 'openrouter',
                llmModelId,
                workflowSessionId,
                enrichmentOptions: {
                    includeCompanyInfo: canEnrichCompany,
                    includePersonalInfo: canEnrichLinkedIn,
                    includeContactDetails: canEnrichLinkedIn,
                    includeSocialProfiles: canEnrichLinkedIn
                },
                services: {
                    proxycurl: canEnrichLinkedIn,
                    firecrawl: canEnrichCompany,
                    builtwith: canEnrichTechStack
                }
            };

            jobPromises.push(
                prospectEnrichmentQueue.add(
                    `enrichment-${batchId}-${typedProspect.id}`,
                    jobData,
                    {
                        attempts: 3,
                        backoff: {
                            type: 'exponential',
                            delay: 5000
                        }
                    }
                )
            );
        }
    }

    const createdJobs = await Promise.all(jobPromises);
    console.log(`✅ [Enrichment]: Created ${createdJobs.length} individual enrichment jobs`);

    // Create a batch tracking record
    const batchJob: EnrichmentJob = {
        id: batchId,
        workflowSessionId,
        status: 'running',
        totalProspects: dbProspects.length,
        processedProspects: 0,
        completedProspects: 0,
        failedProspects: 0,
        currentBatch: 1,
        totalBatches: Math.ceil(dbProspects.length / concurrency),
        progress: 0,
        startedAt: new Date().toISOString(),
        processingRate: 0,
        configuration: {
            ...configuration,
            campaignId: parseInt(campaignId),
            concurrency,
            aiProvider,
            llmModelId
        },
        prospects: dbProspects.map(prospect => ({
            id: prospect.id.toString(),
            name: prospect.name || '',
            email: prospect.email || '',
            company: prospect.company || '',
            title: prospect.position || '',
            status: 'pending',
            progress: 0,
            retryCount: 0
        })),
        errors: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        batchId: batch?.id?.toString()
    };

    // Add processing warnings to the job if any
    if (processingWarnings && processingWarnings.length > 0) {
        processingWarnings.forEach(warning => {
            batchJob.errors.push({
                id: `warning-${Date.now()}`,
                message: warning,
                severity: 'warning',
                timestamp: new Date().toISOString()
            });
        });
    }

    // Store the job tracking information
    enrichmentJobs.set(batchId, batchJob);
    workflowToJobMapping.set(workflowSessionId, batchId);

    return ApiResponseBuilder.success(res, batchJob, 'Enrichment jobs created and queued successfully', 201);
}))

/**
 * GET /api/enrichment/jobs/:jobId
 * Get enrichment job status (for batch tracking)
 */
router.get('/jobs/:jobId', asyncHandler(async (req, res) => {
    const { jobId } = req.params

    if (!jobId) {
        throw new BadRequestError('Job ID is required')
    }

    // For now, return a mock status since we're using individual jobs
    // In a real implementation, you'd track batch progress
    const mockJob = {
        id: jobId,
        status: 'running',
        totalProspects: 0,
        processedProspects: 0,
        completedProspects: 0,
        failedProspects: 0,
        progress: 0,
        message: 'Job status tracking not fully implemented for individual jobs'
    }

    return ApiResponseBuilder.success(res, mockJob, 'Job status retrieved')
}))

/**
 * GET /api/enrichment/jobs/:jobId/progress
 * SSE endpoint for real-time progress updates
 */
router.get('/jobs/:jobId/progress', asyncHandler(async (req, res) => {
    const { jobId } = req.params

    if (!jobId) {
        throw new BadRequestError('Job ID is required')
    }

    // Set SSE headers
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
    })

    // Add client to SSE clients
    if (!sseClients.has(jobId)) {
        sseClients.set(jobId, new Set())
    }
    sseClients.get(jobId)!.add(res)

    // Send initial connection confirmation
    const initialData = JSON.stringify({
        type: 'connected',
        payload: {
            message: 'SSE connection established for job progress',
            jobId,
            timestamp: new Date().toISOString()
        }
    })
    res.write(`data: ${initialData}\n\n`)

    // Handle client disconnect
    req.on('close', () => {
        const clients = sseClients.get(jobId)
        if (clients) {
            clients.delete(res)
            if (clients.size === 0) {
                sseClients.delete(jobId)
            }
        }
    })

    req.on('error', () => {
        const clients = sseClients.get(jobId)
        if (clients) {
            clients.delete(res)
            if (clients.size === 0) {
                sseClients.delete(jobId)
            }
        }
    })
}))

/**
 * POST /api/enrichment/jobs/:jobId/pause
 * Pause enrichment job
 */
router.post('/jobs/:jobId/pause', asyncHandler(async (req, res) => {
    const { jobId } = req.params

    if (!jobId) {
        throw new BadRequestError('Job ID is required')
    }

    const job = enrichmentJobs.get(jobId)

    if (!job) {
        throw new NotFoundError('Enrichment job not found')
    }

    if (job.status !== 'running') {
        throw new BadRequestError('Job is not currently running')
    }

    job.status = 'paused'
    job.updatedAt = new Date().toISOString()
    enrichmentJobs.set(jobId, job)

    sendSSEEvent(jobId, 'job_status', job)

    return ApiResponseBuilder.success(res, job, 'Job paused successfully')
}))

/**
 * POST /api/enrichment/jobs/:jobId/resume
 * Resume enrichment job
 */
router.post('/jobs/:jobId/resume', asyncHandler(async (req, res) => {
    const { jobId } = req.params

    if (!jobId) {
        throw new BadRequestError('Job ID is required')
    }

    const job = enrichmentJobs.get(jobId)

    if (!job) {
        throw new NotFoundError('Enrichment job not found')
    }

    if (job.status !== 'paused') {
        throw new BadRequestError('Job is not currently paused')
    }

    job.status = 'running'
    job.updatedAt = new Date().toISOString()
    enrichmentJobs.set(jobId, job)

    // Resume real enrichment processing
    processRealEnrichmentJob(job)

    sendSSEEvent(jobId, 'job_status', job)

    return ApiResponseBuilder.success(res, job, 'Job resumed successfully')
}))

/**
 * POST /api/enrichment/jobs/:jobId/cancel
 * Cancel enrichment job
 */
router.post('/jobs/:jobId/cancel', asyncHandler(async (req, res) => {
    const { jobId } = req.params

    if (!jobId) {
        throw new BadRequestError('Job ID is required')
    }

    const job = enrichmentJobs.get(jobId)

    if (!job) {
        throw new NotFoundError('Enrichment job not found')
    }

    if (!['running', 'paused', 'pending'].includes(job.status)) {
        throw new BadRequestError('Job cannot be cancelled in current status')
    }

    job.status = 'cancelled'
    job.updatedAt = new Date().toISOString()
    enrichmentJobs.set(jobId, job)

    sendSSEEvent(jobId, 'job_status', job)

    // Clean up SSE connections
    const clients = sseClients.get(jobId)
    if (clients) {
        clients.forEach(client => {
            try {
                client.end()
            } catch (error) {
                console.error('Error closing SSE connection:', error)
            }
        })
        sseClients.delete(jobId)
    }

    return ApiResponseBuilder.success(res, job, 'Job cancelled successfully')
}))

/**
 * POST /api/enrichment/jobs/:jobId/retry
 * Retry failed prospects in enrichment job
 */
router.post('/jobs/:jobId/retry', asyncHandler(async (req, res) => {
    const { jobId } = req.params

    if (!jobId) {
        throw new BadRequestError('Job ID is required')
    }

    const job = enrichmentJobs.get(jobId)

    if (!job) {
        throw new NotFoundError('Enrichment job not found')
    }

    // Reset failed prospects
    const failedProspects = job.prospects.filter(p => p.status === 'failed')

    if (failedProspects.length === 0) {
        throw new BadRequestError('No failed prospects to retry')
    }

    failedProspects.forEach(prospect => {
        prospect.status = 'pending'
        prospect.progress = 0
        prospect.retryCount = (prospect.retryCount || 0) + 1
        prospect.errors = []
    })

    // Adjust counters
    job.failedProspects = 0
    job.processedProspects -= failedProspects.length
    job.progress = Math.round((job.processedProspects / job.totalProspects) * 100)
    job.updatedAt = new Date().toISOString()

    enrichmentJobs.set(jobId, job)

    // If job was completed but had failures, restart it with real enrichment
    if (job.status === 'completed') {
        job.status = 'running'
        processRealEnrichmentJob(job)
    }

    sendSSEEvent(jobId, 'job_status', job)

    return ApiResponseBuilder.success(res, {
        retriedCount: failedProspects.length,
        job
    }, `Retrying ${failedProspects.length} failed prospects`)
}))

/**
 * DELETE /api/enrichment/jobs/:jobId
 * Delete enrichment job
 */
router.delete('/jobs/:jobId', asyncHandler(async (req, res) => {
    const { jobId } = req.params

    if (!jobId) {
        throw new BadRequestError('Job ID is required')
    }

    const job = enrichmentJobs.get(jobId)

    if (!job) {
        throw new NotFoundError('Enrichment job not found')
    }

    // Clean up SSE connections
    const clients = sseClients.get(jobId)
    if (clients) {
        clients.forEach(client => {
            try {
                client.end()
            } catch (error) {
                console.error('Error closing SSE connection:', error)
            }
        })
        sseClients.delete(jobId)
    }

    enrichmentJobs.delete(jobId)

    return ApiResponseBuilder.success(res, { jobId }, 'Job deleted successfully')
}))

/**
 * GET /api/enrichment/jobs
 * Get all enrichment jobs (with pagination)
 */
router.get('/jobs', asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, status, workflowSessionId } = req.query

    let jobs = Array.from(enrichmentJobs.values())

    // Filter by status
    if (status) {
        jobs = jobs.filter(job => job.status === status)
    }

    // Filter by workflow session
    if (workflowSessionId) {
        jobs = jobs.filter(job => job.workflowSessionId === workflowSessionId)
    }

    // Sort by creation date (newest first)
    jobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    // Pagination
    const pageNum = parseInt(page as string)
    const limitNum = parseInt(limit as string)
    const startIndex = (pageNum - 1) * limitNum
    const endIndex = startIndex + limitNum

    const paginatedJobs = jobs.slice(startIndex, endIndex)

    return ApiResponseBuilder.success(res, {
        jobs: paginatedJobs,
        pagination: {
            currentPage: pageNum,
            totalPages: Math.ceil(jobs.length / limitNum),
            totalItems: jobs.length,
            hasNextPage: endIndex < jobs.length,
            hasPrevPage: pageNum > 1
        }
    }, 'Jobs retrieved successfully')
}))

// Clean up completed jobs periodically (every hour)
setInterval(() => {
    const now = Date.now()
    const oneHourAgo = now - 60 * 60 * 1000

    for (const [jobId, job] of enrichmentJobs.entries()) {
        const jobTime = new Date(job.updatedAt).getTime()

        // Clean up completed/cancelled jobs older than 1 hour
        if (['completed', 'completed_with_errors', 'cancelled', 'failed'].includes(job.status) && jobTime < oneHourAgo) {
            enrichmentJobs.delete(jobId)

            // Clean up SSE connections
            const clients = sseClients.get(jobId)
            if (clients) {
                clients.forEach(client => {
                    try {
                        client.end()
                    } catch (error) {
                        console.error('Error closing SSE connection:', error)
                    }
                })
                sseClients.delete(jobId)
            }
        }
    }
}, 60 * 60 * 1000) // Run every hour

// Create enrichment batch
router.post('/batches', asyncHandler(async (req: Request, res: Response) => {
    const { workflowSessionId, configuration, campaignId } = req.body;

    if (!workflowSessionId || !configuration) {
        throw new BadRequestError('Missing required fields: workflowSessionId and configuration');
    }

    if (!campaignId) {
        throw new BadRequestError('Campaign ID is required');
    }

    const batch = await prisma.cOBatches.create({
        data: {
            name: `Enrichment Batch - ${new Date().toISOString()}`,
            status: 'PENDING',
            campaignId: parseInt(campaignId),
            totalProspects: 0,
            enrichedProspects: 0,
            generatedEmails: 0,
            failedProspects: 0
        }
    });

    return ApiResponseBuilder.success(res, batch);
}));

export default router 
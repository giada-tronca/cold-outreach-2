import { createReadStream } from 'fs'
import csvParser from 'csv-parser'
import { Job } from 'bullmq'
import { prisma } from '@/config/database'

export interface CSVImportJobData {
    filePath: string
    userId: string
    mappingConfig?: Record<string, string>
    workflowSessionId: string
    createCampaign?: boolean
    campaignName?: string
    campaignSettings?: {
        emailSubject?: string
        prompt?: string
        enrichmentFlags?: string[]
        serviceId?: number | null
    }
}

export interface CSVImportResult {
    campaignId: number | null
    batchId: number | null
    prospectsCreated: number
    prospectsSkipped: number
    totalRows: number
    success: boolean
    workflowSessionId: string
}

/**
 * CSV Import Processor
 * Processes uploaded CSV files and creates prospects in the database
 */
export class CSVImportProcessor {
    /**
     * Process CSV import job
     * Creates campaigns, batches, and prospects from uploaded CSV data
     */
    static async process(job: Job<CSVImportJobData>): Promise<CSVImportResult> {
        const {
            filePath,
            mappingConfig = {},
            workflowSessionId,
            createCampaign = true,
            campaignName,
            campaignSettings
        } = job.data

        let createdCampaignId: number | null = null
        let createdBatchId: number | null = null
        let prospectsCreated = 0
        let prospectsSkipped = 0

        try {
            console.log('📋 [CSV Import]: Starting CSV import processing')
            await job.updateProgress(5)

            // Create campaign if needed
            if (createCampaign) {
                console.log('📋 [CSV Import]: Creating campaign')
                const campaign = await prisma.cOCampaigns.create({
                    data: {
                        name: campaignName || `CSV Import Campaign - ${new Date().toISOString()}`,
                        emailSubject: campaignSettings?.emailSubject || 'Default Subject',
                        prompt: campaignSettings?.prompt || 'Default prompt for email generation',
                        enrichmentFlags: campaignSettings?.enrichmentFlags || ['proxycurl', 'firecrawl', 'builtwith'],
                        serviceId: campaignSettings?.serviceId || null
                    }
                })
                createdCampaignId = campaign.id
                console.log(`✅ [CSV Import]: Created campaign`, createdCampaignId)
            } else {
                console.log('🔬 [CSV Import]: Campaign creation disabled, will need existing campaign')
            }

            await job.updateProgress(10)

            // Create batch for tracking
            if (createdCampaignId) {
                console.log('📋 [CSV Import]: Creating batch')
                const batchName = `CSV Import Batch - ${new Date().toISOString()}`

                const batch = await prisma.cOBatches.create({
                    data: {
                        campaignId: createdCampaignId,
                        name: batchName,
                        status: 'UPLOADED'
                    }
                })
                createdBatchId = batch.id
                console.log(`✅ [CSV Import]: Created batch`, createdBatchId)
            }

            await job.updateProgress(20)

            // Parse CSV and create prospects
            const prospects: any[] = []

            console.log('📄 [CSV Import]: Reading CSV file:', filePath)

            await new Promise((resolve, reject) => {
                createReadStream(filePath)
                    .pipe(csvParser())
                    .on('data', (row) => {
                        prospects.push(row)
                    })
                    .on('end', () => {
                        console.log(`📊 [CSV Import]: Parsed ${prospects.length} rows from CSV`)
                        resolve(undefined)
                    })
                    .on('error', (error) => {
                        console.error('❌ [CSV Import]: Error reading CSV:', error)
                        reject(error)
                    })
            })

            await job.updateProgress(40)

            // Process prospects in batches
            const batchSize = 50
            let processed = 0

            for (let i = 0; i < prospects.length; i += batchSize) {
                const batch = prospects.slice(i, i + batchSize)

                for (const prospectData of batch) {
                    try {
                        // Map CSV columns to prospect fields
                        const prospect = await this.mapProspectData(prospectData, mappingConfig)

                        if (prospect.email && prospect.email.trim()) {
                            // Check for duplicates (based on email and campaign)
                            const whereClause: any = { email: prospect.email }
                            if (createdCampaignId) {
                                whereClause.campaignId = createdCampaignId
                            }

                            const existing = await prisma.cOProspects.findFirst({ where: whereClause })

                            if (existing) {
                                console.log(`⚠️ [CSV Import]: Skipping duplicate email: ${prospect.email}`)
                                prospectsSkipped++
                                continue
                            }

                            // Create prospect data (campaignId is always required due to schema constraints)
                            const prospectCreateData: any = {
                                name: prospect.name,
                                email: prospect.email,
                                company: prospect.company,
                                position: prospect.position,
                                linkedinUrl: prospect.linkedinUrl,
                                additionalData: {
                                    ...prospect.additionalData,
                                    workflowSessionId: workflowSessionId
                                },
                                status: 'PENDING',
                                campaignId: createdCampaignId,
                                batchId: createdBatchId
                            }

                            // Create prospect
                            await prisma.cOProspects.create({ data: prospectCreateData })
                            prospectsCreated++
                            console.log(`✅ [CSV Import]: Created prospect: ${prospect.name} (${prospect.email})`)
                        } else {
                            console.log(`⚠️ [CSV Import]: Skipping prospect with missing email`)
                            prospectsSkipped++
                        }
                    } catch (error) {
                        console.error(`❌ [CSV Import]: Error processing prospect:`, error)
                        prospectsSkipped++
                    }

                    processed++
                    const progress = 40 + (processed / prospects.length) * 50
                    await job.updateProgress(progress)
                }
            }

            // Update batch with final counts
            if (createdBatchId) {
                await prisma.cOBatches.update({
                    where: { id: createdBatchId },
                    data: {
                        totalProspects: prospectsCreated,
                        status: prospectsCreated > 0 ? 'UPLOADED' : 'FAILED'
                    }
                })
            }

            await job.updateProgress(100)

            const result: CSVImportResult = {
                campaignId: createdCampaignId,
                batchId: createdBatchId,
                prospectsCreated,
                prospectsSkipped,
                totalRows: prospects.length,
                success: true,
                workflowSessionId
            }

            console.log('✅ [CSV Import]: CSV import completed successfully:', result)
            return result

        } catch (error) {
            console.error('❌ [CSV Import]: Error processing CSV import:', error)

            // Clean up created resources on error
            if (createdBatchId) {
                try {
                    await prisma.cOBatches.delete({ where: { id: createdBatchId } })
                    console.log('🗑️ [CSV Import]: Cleaned up batch on error')
                } catch (cleanupError) {
                    console.error('❌ [CSV Import]: Error cleaning up batch:', cleanupError)
                }
            }

            if (createdCampaignId) {
                try {
                    await prisma.cOCampaigns.delete({ where: { id: createdCampaignId } })
                    console.log('🗑️ [CSV Import]: Cleaned up campaign on error')
                } catch (cleanupError) {
                    console.error('❌ [CSV Import]: Error cleaning up campaign:', cleanupError)
                }
            }

            throw error
        }
    }

    /**
     * Map CSV row data to prospect fields
     */
    private static async mapProspectData(csvRow: any, mappingConfig: any): Promise<any> {
        // Default mapping if no custom mapping provided
        const defaultMapping = {
            name: ['name', 'full_name', 'fullname', 'contact_name'],
            email: ['email', 'email_address', 'contact_email'],
            company: ['company', 'company_name', 'organization'],
            position: ['position', 'title', 'job_title', 'role'],
            linkedinUrl: ['linkedin', 'linkedin_url', 'linkedin_profile']
        }

        const mapping = { ...defaultMapping, ...mappingConfig }
        const prospect: any = {}

        // Map each field
        for (const [prospectField, csvFields] of Object.entries(mapping)) {
            for (const csvField of csvFields as string[]) {
                if (csvRow[csvField] && csvRow[csvField].trim()) {
                    prospect[prospectField] = csvRow[csvField].trim()
                    break
                }
            }
        }

        // Store any additional data not in the main mapping
        const additionalData: any = {}
        for (const [key, value] of Object.entries(csvRow)) {
            const isMainField = Object.values(mapping).flat().includes(key)
            if (!isMainField && value) {
                additionalData[key] = value
            }
        }

        if (Object.keys(additionalData).length > 0) {
            prospect.additionalData = additionalData
        }

        return prospect
    }

    /**
     * Clean up temporary data (called after workflow completion)
     */
    static async cleanupTemporaryData(workflowSessionId: string): Promise<void> {
        try {
            console.log(`🗑️ [CSV Import]: Cleaning up temporary data for workflow ${workflowSessionId}`)

            // Find all prospects associated with this workflow session
            const prospectsToDelete = await prisma.cOProspects.findMany({
                where: {
                    additionalData: {
                        path: ['workflowSessionId'],
                        equals: workflowSessionId
                    }
                },
                include: {
                    batch: true,
                    campaign: true
                }
            })

            console.log(`🔍 [CSV Import]: Found ${prospectsToDelete.length} prospects to potentially clean up`)

            // Delete prospects and their related data
            for (const prospect of prospectsToDelete) {
                // Delete related enrichment data
                await prisma.cOProspectEnrichments.deleteMany({
                    where: { prospectId: prospect.id }
                })

                // Delete related generated emails
                await prisma.cOGeneratedEmails.deleteMany({
                    where: { prospectId: prospect.id }
                })

                // Delete the prospect
                await prisma.cOProspects.delete({
                    where: { id: prospect.id }
                })

                console.log(`🗑️ [CSV Import]: Deleted prospect ${prospect.name} (${prospect.email})`)
            }

            console.log(`✅ [CSV Import]: Cleanup completed for workflow ${workflowSessionId}`)

        } catch (error) {
            console.error(`❌ [CSV Import]: Error during cleanup:`, error)
            throw error
        }
    }
} 
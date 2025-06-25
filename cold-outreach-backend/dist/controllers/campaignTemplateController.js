"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllTemplates = getAllTemplates;
exports.getTemplateById = getTemplateById;
exports.createTemplate = createTemplate;
exports.updateTemplate = updateTemplate;
exports.deleteTemplate = deleteTemplate;
exports.getTemplateCategories = getTemplateCategories;
exports.createCampaignFromTemplate = createCampaignFromTemplate;
const client_1 = require("@prisma/client");
const apiResponse_1 = require("@/utils/apiResponse");
const errors_1 = require("@/utils/errors");
const prisma = new client_1.PrismaClient();
/**
 * Get all campaign templates with filtering and pagination
 */
async function getAllTemplates(req, res) {
    try {
        const { page = '1', limit = '10', search, category, isPublic, sortBy = 'usageCount', sortOrder = 'desc' } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        // For now, we'll create some mock templates since we don't have a templates table
        // In production, you'd create a separate templates table or use JSON storage
        const mockTemplates = [
            {
                id: '1',
                name: 'Software Sales Outreach',
                description: 'Perfect for reaching out to software companies about development services',
                category: 'Software',
                emailSubject: 'Boost Your Development Velocity with Expert Engineering',
                prompt: `Create a personalized email for {{prospect_name}} at {{company_name}}. 
        Focus on how we can help accelerate their software development process.
        Mention specific technologies they use: {{tech_stack}}.
        Keep it professional but friendly, under 200 words.`,
                enrichmentFlags: {
                    includeTechStack: true,
                    includeCompanyInfo: true,
                    includeLinkedInData: true,
                    includeMarketPosition: false
                },
                isPublic: true,
                usageCount: 245,
                createdAt: new Date('2024-01-15'),
                updatedAt: new Date('2024-06-20')
            },
            {
                id: '2',
                name: 'Marketing Agency Outreach',
                description: 'Tailored for marketing agencies and digital marketing services',
                category: 'Marketing',
                emailSubject: 'Scale Your Marketing Impact with Data-Driven Strategies',
                prompt: `Write a compelling email to {{prospect_name}} at {{company_name}}.
        Highlight how our marketing expertise can drive measurable growth.
        Reference their current market position: {{market_position}}.
        Include a soft call-to-action for a strategy consultation.`,
                enrichmentFlags: {
                    includeTechStack: false,
                    includeCompanyInfo: true,
                    includeLinkedInData: true,
                    includeMarketPosition: true
                },
                isPublic: true,
                usageCount: 189,
                createdAt: new Date('2024-02-10'),
                updatedAt: new Date('2024-06-18')
            },
            {
                id: '3',
                name: 'E-commerce Partnership',
                description: 'For partnerships with e-commerce and retail businesses',
                category: 'E-commerce',
                emailSubject: 'Partnership Opportunity: Increase Your E-commerce Revenue',
                prompt: `Create a partnership proposal email for {{prospect_name}}.
        Focus on mutual benefits and revenue growth opportunities.
        Keep the tone collaborative and emphasize long-term partnership value.
        Mention their company size and market presence if available.`,
                enrichmentFlags: {
                    includeTechStack: true,
                    includeCompanyInfo: true,
                    includeLinkedInData: false,
                    includeMarketPosition: true
                },
                isPublic: true,
                usageCount: 156,
                createdAt: new Date('2024-03-05'),
                updatedAt: new Date('2024-06-15')
            },
            {
                id: '4',
                name: 'SaaS Product Demo',
                description: 'Template for SaaS product demonstrations and trials',
                category: 'SaaS',
                emailSubject: 'See How {{company_name}} Can Save 40% on {{pain_point}}',
                prompt: `Write a personalized demo invitation email to {{prospect_name}}.
        Address their specific pain point: {{pain_point}}.
        Offer a customized demo showing relevant features.
        Include social proof from similar companies in their industry.`,
                enrichmentFlags: {
                    includeTechStack: true,
                    includeCompanyInfo: true,
                    includeLinkedInData: true,
                    includeMarketPosition: false
                },
                isPublic: true,
                usageCount: 312,
                createdAt: new Date('2024-01-20'),
                updatedAt: new Date('2024-06-22')
            },
            {
                id: '5',
                name: 'Consulting Services',
                description: 'Professional consulting services outreach template',
                category: 'Consulting',
                emailSubject: 'Strategic Growth Opportunities for {{company_name}}',
                prompt: `Create a consulting outreach email for {{prospect_name}}.
        Position our services as strategic growth enablers.
        Reference their market position and growth potential.
        Offer a complimentary strategic assessment.`,
                enrichmentFlags: {
                    includeTechStack: false,
                    includeCompanyInfo: true,
                    includeLinkedInData: true,
                    includeMarketPosition: true
                },
                isPublic: true,
                usageCount: 98,
                createdAt: new Date('2024-04-12'),
                updatedAt: new Date('2024-06-10')
            }
        ];
        // Apply filtering
        let filteredTemplates = mockTemplates;
        if (search) {
            const searchTerm = search.toLowerCase();
            filteredTemplates = filteredTemplates.filter(t => t.name.toLowerCase().includes(searchTerm) ||
                t.description?.toLowerCase().includes(searchTerm) ||
                t.category?.toLowerCase().includes(searchTerm));
        }
        if (category) {
            filteredTemplates = filteredTemplates.filter(t => t.category?.toLowerCase() === category.toLowerCase());
        }
        if (isPublic !== undefined) {
            const isPublicBool = isPublic === 'true';
            filteredTemplates = filteredTemplates.filter(t => t.isPublic === isPublicBool);
        }
        // Apply sorting
        filteredTemplates.sort((a, b) => {
            const sortField = sortBy;
            const direction = sortOrder === 'desc' ? -1 : 1;
            if (sortField === 'usageCount') {
                return (a.usageCount - b.usageCount) * direction;
            }
            if (sortField === 'createdAt' || sortField === 'updatedAt') {
                return (new Date(a[sortField]).getTime() - new Date(b[sortField]).getTime()) * direction;
            }
            if (typeof a[sortField] === 'string' && typeof b[sortField] === 'string') {
                return a[sortField].localeCompare(b[sortField]) * direction;
            }
            return 0;
        });
        // Apply pagination
        const totalCount = filteredTemplates.length;
        const startIndex = (pageNum - 1) * limitNum;
        const paginatedTemplates = filteredTemplates.slice(startIndex, startIndex + limitNum);
        const pagination = (0, apiResponse_1.calculatePagination)(totalCount, pageNum, limitNum);
        apiResponse_1.ApiResponseBuilder.paginated(res, paginatedTemplates, pagination, 'Templates retrieved successfully');
    }
    catch (error) {
        console.error('Error fetching templates:', error);
        throw new errors_1.DatabaseError('Failed to fetch templates');
    }
}
/**
 * Get template by ID
 */
async function getTemplateById(req, res) {
    try {
        const templateId = req.params.id;
        // Mock template lookup (in production, fetch from database)
        const mockTemplate = {
            id: templateId,
            name: 'Software Sales Outreach',
            description: 'Perfect for reaching out to software companies about development services',
            category: 'Software',
            emailSubject: 'Boost Your Development Velocity with Expert Engineering',
            prompt: `Create a personalized email for {{prospect_name}} at {{company_name}}. 
      Focus on how we can help accelerate their software development process.
      Mention specific technologies they use: {{tech_stack}}.
      Keep it professional but friendly, under 200 words.`,
            enrichmentFlags: {
                includeTechStack: true,
                includeCompanyInfo: true,
                includeLinkedInData: true,
                includeMarketPosition: false
            },
            isPublic: true,
            usageCount: 245,
            createdAt: new Date('2024-01-15'),
            updatedAt: new Date('2024-06-20'),
            variables: [
                { name: 'prospect_name', description: 'Name of the prospect', required: true },
                { name: 'company_name', description: 'Name of the company', required: true },
                { name: 'tech_stack', description: 'Technologies used by the company', required: false },
                { name: 'position', description: 'Prospect\'s job title', required: false }
            ]
        };
        apiResponse_1.ApiResponseBuilder.success(res, mockTemplate, 'Template retrieved successfully');
    }
    catch (error) {
        console.error('Error fetching template:', error);
        throw new errors_1.DatabaseError('Failed to fetch template');
    }
}
/**
 * Create new template
 */
async function createTemplate(req, res) {
    try {
        const { name, emailSubject, prompt, enrichmentFlags } = req.body;
        const newTemplate = {
            id: `template_${Date.now()}`,
            name,
            emailSubject,
            prompt,
            enrichmentFlags,
            usageCount: 0,
            createdAt: new Date()
        };
        apiResponse_1.ApiResponseBuilder.created(res, newTemplate, 'Template created successfully');
    }
    catch (error) {
        console.error('Error creating template:', error);
        throw new errors_1.DatabaseError('Failed to create template');
    }
}
/**
 * Update template
 */
async function updateTemplate(req, res) {
    try {
        const templateId = req.params.id;
        const updateData = req.body;
        // Mock update (in production, update in database)
        const updatedTemplate = {
            id: templateId,
            ...updateData,
            updatedAt: new Date()
        };
        apiResponse_1.ApiResponseBuilder.success(res, updatedTemplate, 'Template updated successfully');
    }
    catch (error) {
        console.error('Error updating template:', error);
        throw new errors_1.DatabaseError('Failed to update template');
    }
}
/**
 * Delete template
 */
async function deleteTemplate(req, res) {
    try {
        // In production, check if template is being used by any campaigns
        // and prevent deletion if it's a public template with high usage
        apiResponse_1.ApiResponseBuilder.success(res, { deletedTemplateId: req.params.id }, 'Template deleted successfully');
    }
    catch (error) {
        console.error('Error deleting template:', error);
        throw new errors_1.DatabaseError('Failed to delete template');
    }
}
/**
 * Get template categories
 */
async function getTemplateCategories(req, res) {
    try {
        const categories = [
            { name: 'Software', count: 12, description: 'Software development and IT services' },
            { name: 'Marketing', count: 8, description: 'Marketing agencies and digital marketing' },
            { name: 'E-commerce', count: 15, description: 'Online retail and e-commerce platforms' },
            { name: 'SaaS', count: 23, description: 'Software as a Service products' },
            { name: 'Consulting', count: 7, description: 'Professional consulting services' },
            { name: 'Finance', count: 9, description: 'Financial services and fintech' },
            { name: 'Healthcare', count: 6, description: 'Healthcare and medical services' },
            { name: 'Real Estate', count: 4, description: 'Real estate and property management' }
        ];
        apiResponse_1.ApiResponseBuilder.success(res, categories, 'Template categories retrieved successfully');
    }
    catch (error) {
        console.error('Error fetching template categories:', error);
        throw new errors_1.DatabaseError('Failed to fetch template categories');
    }
}
/**
 * Create campaign from template
 */
async function createCampaignFromTemplate(req, res) {
    try {
        const templateId = req.params.id;
        const { campaignName, customizations } = req.body;
        // In production, you would fetch the template by templateId from the database
        console.log(`Creating campaign from template: ${templateId}`);
        // Mock template retrieval
        const template = {
            name: 'Software Sales Outreach',
            emailSubject: 'Boost Your Development Velocity with Expert Engineering',
            prompt: `Create a personalized email for {{prospect_name}} at {{company_name}}.`,
            enrichmentFlags: {
                includeTechStack: true,
                includeCompanyInfo: true,
                includeLinkedInData: true,
                includeMarketPosition: false
            }
        };
        // Create campaign using template
        const campaign = await prisma.campaign.create({
            data: {
                name: campaignName || `${template.name} - ${new Date().toISOString().split('T')[0]}`,
                emailSubject: customizations?.emailSubject || template.emailSubject,
                prompt: customizations?.prompt || template.prompt,
                enrichmentFlags: customizations?.enrichmentFlags || template.enrichmentFlags
            }
        });
        // In production, increment template usage count
        apiResponse_1.ApiResponseBuilder.created(res, campaign, 'Campaign created from template successfully');
    }
    catch (error) {
        console.error('Error creating campaign from template:', error);
        throw new errors_1.DatabaseError('Failed to create campaign from template');
    }
}

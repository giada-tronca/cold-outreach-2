import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ApiResponseBuilder, calculatePagination } from '@/utils/apiResponse';
import { DatabaseError } from '@/utils/errors';

const prisma = new PrismaClient();

// Extended Prisma schema for templates (using JSON storage in Campaign table)
interface CampaignTemplate {
  id: string;
  name: string;
  description?: string;
  category?: string;
  emailSubject: string;
  prompt: string;
  enrichmentFlags: Record<string, any>;
  isPublic: boolean;
  createdBy?: string;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Get all campaign templates with filtering and pagination
 */
export async function getAllTemplates(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const {
      page = '1',
      limit = '10',
      search,
      category,
      isPublic,
      sortBy = 'usageCount',
      sortOrder = 'desc',
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    // For now, we'll create some mock templates since we don't have a templates table
    // In production, you'd create a separate templates table or use JSON storage
    const mockTemplates: CampaignTemplate[] = [
      {
        id: '1',
        name: 'Software Sales Outreach',
        description:
          'Perfect for reaching out to software companies about development services',
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
          includeMarketPosition: false,
        },
        isPublic: true,
        usageCount: 245,
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-06-20'),
      },
      {
        id: '2',
        name: 'Marketing Agency Outreach',
        description:
          'Tailored for marketing agencies and digital marketing services',
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
          includeMarketPosition: true,
        },
        isPublic: true,
        usageCount: 189,
        createdAt: new Date('2024-02-10'),
        updatedAt: new Date('2024-06-18'),
      },
      {
        id: '3',
        name: 'E-commerce Partnership',
        description: 'For partnerships with e-commerce and retail businesses',
        category: 'E-commerce',
        emailSubject:
          'Partnership Opportunity: Increase Your E-commerce Revenue',
        prompt: `Create a partnership proposal email for {{prospect_name}}.
        Focus on mutual benefits and revenue growth opportunities.
        Keep the tone collaborative and emphasize long-term partnership value.
        Mention their company size and market presence if available.`,
        enrichmentFlags: {
          includeTechStack: true,
          includeCompanyInfo: true,
          includeLinkedInData: false,
          includeMarketPosition: true,
        },
        isPublic: true,
        usageCount: 156,
        createdAt: new Date('2024-03-05'),
        updatedAt: new Date('2024-06-15'),
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
          includeMarketPosition: false,
        },
        isPublic: true,
        usageCount: 312,
        createdAt: new Date('2024-01-20'),
        updatedAt: new Date('2024-06-22'),
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
          includeMarketPosition: true,
        },
        isPublic: true,
        usageCount: 98,
        createdAt: new Date('2024-04-12'),
        updatedAt: new Date('2024-06-10'),
      },
    ];

    // Apply filtering
    let filteredTemplates = mockTemplates;

    if (search) {
      const searchTerm = (search as string).toLowerCase();
      filteredTemplates = filteredTemplates.filter(
        t =>
          t.name.toLowerCase().includes(searchTerm) ||
          t.description?.toLowerCase().includes(searchTerm) ||
          t.category?.toLowerCase().includes(searchTerm)
      );
    }

    if (category) {
      filteredTemplates = filteredTemplates.filter(
        t => t.category?.toLowerCase() === (category as string).toLowerCase()
      );
    }

    if (isPublic !== undefined) {
      const isPublicBool = isPublic === 'true';
      filteredTemplates = filteredTemplates.filter(
        t => t.isPublic === isPublicBool
      );
    }

    // Apply sorting
    filteredTemplates.sort((a, b) => {
      const sortField = sortBy as keyof CampaignTemplate;
      const direction = sortOrder === 'desc' ? -1 : 1;

      if (sortField === 'usageCount') {
        return (a.usageCount - b.usageCount) * direction;
      }
      if (sortField === 'createdAt' || sortField === 'updatedAt') {
        return (
          (new Date(a[sortField]).getTime() -
            new Date(b[sortField]).getTime()) *
          direction
        );
      }
      if (
        typeof a[sortField] === 'string' &&
        typeof b[sortField] === 'string'
      ) {
        return (
          (a[sortField] as string).localeCompare(b[sortField] as string) *
          direction
        );
      }
      return 0;
    });

    // Apply pagination
    const totalCount = filteredTemplates.length;
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedTemplates = filteredTemplates.slice(
      startIndex,
      startIndex + limitNum
    );

    const pagination = calculatePagination(totalCount, pageNum, limitNum);

    ApiResponseBuilder.paginated(
      res,
      paginatedTemplates,
      pagination,
      'Templates retrieved successfully'
    );
  } catch (error) {
    console.error('Error fetching templates:', error);
    throw new DatabaseError('Failed to fetch templates');
  }
}

/**
 * Get template by ID
 */
export async function getTemplateById(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const templateId = req.params.id;

    // Mock template lookup (in production, fetch from database)
    const mockTemplate = {
      id: templateId,
      name: 'Software Sales Outreach',
      description:
        'Perfect for reaching out to software companies about development services',
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
        includeMarketPosition: false,
      },
      isPublic: true,
      usageCount: 245,
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-06-20'),
      variables: [
        {
          name: 'prospect_name',
          description: 'Name of the prospect',
          required: true,
        },
        {
          name: 'company_name',
          description: 'Name of the company',
          required: true,
        },
        {
          name: 'tech_stack',
          description: 'Technologies used by the company',
          required: false,
        },
        {
          name: 'position',
          description: "Prospect's job title",
          required: false,
        },
      ],
    };

    ApiResponseBuilder.success(
      res,
      mockTemplate,
      'Template retrieved successfully'
    );
  } catch (error) {
    console.error('Error fetching template:', error);
    throw new DatabaseError('Failed to fetch template');
  }
}

/**
 * Create new template
 */
export async function createTemplate(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { name, emailSubject, prompt, enrichmentFlags } = req.body;

    const newTemplate = {
      id: `template_${Date.now()}`,
      name,
      emailSubject,
      prompt,
      enrichmentFlags,
      usageCount: 0,
      createdAt: new Date(),
    };

    ApiResponseBuilder.created(
      res,
      newTemplate,
      'Template created successfully'
    );
  } catch (error) {
    console.error('Error creating template:', error);
    throw new DatabaseError('Failed to create template');
  }
}

/**
 * Update template
 */
export async function updateTemplate(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const templateId = req.params.id;
    const updateData = req.body;

    // Mock update (in production, update in database)
    const updatedTemplate = {
      id: templateId,
      ...updateData,
      updatedAt: new Date(),
    };

    ApiResponseBuilder.success(
      res,
      updatedTemplate,
      'Template updated successfully'
    );
  } catch (error) {
    console.error('Error updating template:', error);
    throw new DatabaseError('Failed to update template');
  }
}

/**
 * Delete template
 */
export async function deleteTemplate(
  req: Request,
  res: Response
): Promise<void> {
  try {
    // In production, check if template is being used by any campaigns
    // and prevent deletion if it's a public template with high usage

    ApiResponseBuilder.success(
      res,
      { deletedTemplateId: req.params.id },
      'Template deleted successfully'
    );
  } catch (error) {
    console.error('Error deleting template:', error);
    throw new DatabaseError('Failed to delete template');
  }
}

/**
 * Get template categories
 */
export async function getTemplateCategories(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const categories = [
      {
        name: 'Software',
        count: 12,
        description: 'Software development and IT services',
      },
      {
        name: 'Marketing',
        count: 8,
        description: 'Marketing agencies and digital marketing',
      },
      {
        name: 'E-commerce',
        count: 15,
        description: 'Online retail and e-commerce platforms',
      },
      {
        name: 'SaaS',
        count: 23,
        description: 'Software as a Service products',
      },
      {
        name: 'Consulting',
        count: 7,
        description: 'Professional consulting services',
      },
      {
        name: 'Finance',
        count: 9,
        description: 'Financial services and fintech',
      },
      {
        name: 'Healthcare',
        count: 6,
        description: 'Healthcare and medical services',
      },
      {
        name: 'Real Estate',
        count: 4,
        description: 'Real estate and property management',
      },
    ];

    ApiResponseBuilder.success(
      res,
      categories,
      'Template categories retrieved successfully'
    );
  } catch (error) {
    console.error('Error fetching template categories:', error);
    throw new DatabaseError('Failed to fetch template categories');
  }
}

/**
 * Create campaign from template
 */
export async function createCampaignFromTemplate(
  req: Request,
  res: Response
): Promise<void> {
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
        includeMarketPosition: false,
      },
    };

    // Create campaign using template
    const campaign = await prisma.campaign.create({
      data: {
        name:
          campaignName ||
          `${template.name} - ${new Date().toISOString().split('T')[0]}`,
        emailSubject: customizations?.emailSubject || template.emailSubject,
        prompt: customizations?.prompt || template.prompt,
        enrichmentFlags:
          customizations?.enrichmentFlags || template.enrichmentFlags,
      },
    });

    // In production, increment template usage count

    ApiResponseBuilder.created(
      res,
      campaign,
      'Campaign created from template successfully'
    );
  } catch (error) {
    console.error('Error creating campaign from template:', error);
    throw new DatabaseError('Failed to create campaign from template');
  }
}

import { apiClient, handleApiResponse } from './api';
import type {
  Prospect,
  ProspectEnrichment,
  ProspectAnalysis,
  CreateProspectData,
  UpdateProspectData,
  CreateEnrichmentData,
  UpdateEnrichmentData,
  CreateAnalysisData,
  UpdateAnalysisData,
  ProspectFilters,
  PaginatedResponse,
  ApiResponse,
} from '@/types';

export class ProspectService {
  // Prospect CRUD Operations
  static async getAllProspects(
    filters: ProspectFilters = {}
  ): Promise<PaginatedResponse<Prospect>> {
    const params = new URLSearchParams();

    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.search) params.append('search', filters.search);
    if (filters.campaignId)
      params.append('campaignId', filters.campaignId.toString());
    if (filters.status) params.append('status', filters.status);
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

    const response = await apiClient.get(`/api/prospects?${params.toString()}`);
    return handleApiResponse<PaginatedResponse<Prospect>>(response);
  }

  static async getProspectById(id: number): Promise<ApiResponse<Prospect>> {
    const response = await apiClient.get(`/api/prospects/${id}`);
    return handleApiResponse<ApiResponse<Prospect>>(response);
  }

  static async getGeneratedEmailByProspectId(
    prospectId: number
  ): Promise<ApiResponse<any>> {
    const response = await apiClient.get(
      `/api/prospects/${prospectId}/generated-email`
    );
    return handleApiResponse<ApiResponse<any>>(response);
  }

  static async createProspect(
    data: CreateProspectData
  ): Promise<ApiResponse<Prospect>> {
    const response = await apiClient.post('/api/prospects', data);
    return handleApiResponse<ApiResponse<Prospect>>(response);
  }

  static async updateProspect(
    id: number,
    data: UpdateProspectData
  ): Promise<ApiResponse<Prospect>> {
    const response = await apiClient.put(`/api/prospects/${id}`, data);
    return handleApiResponse<ApiResponse<Prospect>>(response);
  }

  static async deleteProspect(
    id: number
  ): Promise<ApiResponse<{ deletedProspectId: number }>> {
    const response = await apiClient.delete(`/api/prospects/${id}`);
    return handleApiResponse<ApiResponse<{ deletedProspectId: number }>>(
      response
    );
  }

  // Enrichment CRUD Operations
  static async getAllEnrichments(
    filters: ProspectFilters = {}
  ): Promise<PaginatedResponse<ProspectEnrichment>> {
    const params = new URLSearchParams();

    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.status) params.append('status', filters.status);
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

    const response = await apiClient.get(
      `/api/prospects/enrichments?${params.toString()}`
    );
    return handleApiResponse<PaginatedResponse<ProspectEnrichment>>(response);
  }

  static async getEnrichmentByProspectId(
    prospectId: number
  ): Promise<ApiResponse<ProspectEnrichment>> {
    const response = await apiClient.get(
      `/api/prospects/enrichments/${prospectId}`
    );
    return handleApiResponse<ApiResponse<ProspectEnrichment>>(response);
  }

  static async createEnrichment(
    data: CreateEnrichmentData
  ): Promise<ApiResponse<ProspectEnrichment>> {
    const response = await apiClient.post('/api/prospects/enrichments', data);
    return handleApiResponse<ApiResponse<ProspectEnrichment>>(response);
  }

  static async updateEnrichment(
    prospectId: number,
    data: UpdateEnrichmentData
  ): Promise<ApiResponse<ProspectEnrichment>> {
    const response = await apiClient.put(
      `/api/prospects/enrichments/${prospectId}`,
      data
    );
    return handleApiResponse<ApiResponse<ProspectEnrichment>>(response);
  }

  static async deleteEnrichment(
    prospectId: number
  ): Promise<ApiResponse<{ deletedProspectId: number }>> {
    const response = await apiClient.delete(
      `/api/prospects/enrichments/${prospectId}`
    );
    return handleApiResponse<ApiResponse<{ deletedProspectId: number }>>(
      response
    );
  }

  // Analysis CRUD Operations
  static async getAllAnalyses(
    filters: ProspectFilters = {}
  ): Promise<PaginatedResponse<ProspectAnalysis>> {
    const params = new URLSearchParams();

    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

    const response = await apiClient.get(
      `/api/prospects/analyses?${params.toString()}`
    );
    return handleApiResponse<PaginatedResponse<ProspectAnalysis>>(response);
  }

  static async getAnalysisByProspectId(
    prospectId: number
  ): Promise<ApiResponse<ProspectAnalysis>> {
    const response = await apiClient.get(
      `/api/prospects/analyses/${prospectId}`
    );
    return handleApiResponse<ApiResponse<ProspectAnalysis>>(response);
  }

  static async createAnalysis(
    data: CreateAnalysisData
  ): Promise<ApiResponse<ProspectAnalysis>> {
    const response = await apiClient.post('/api/prospects/analyses', data);
    return handleApiResponse<ApiResponse<ProspectAnalysis>>(response);
  }

  static async updateAnalysis(
    prospectId: number,
    data: UpdateAnalysisData
  ): Promise<ApiResponse<ProspectAnalysis>> {
    const response = await apiClient.put(
      `/api/prospects/analyses/${prospectId}`,
      data
    );
    return handleApiResponse<ApiResponse<ProspectAnalysis>>(response);
  }

  static async deleteAnalysis(
    prospectId: number
  ): Promise<ApiResponse<{ deletedProspectId: number }>> {
    const response = await apiClient.delete(
      `/api/prospects/analyses/${prospectId}`
    );
    return handleApiResponse<ApiResponse<{ deletedProspectId: number }>>(
      response
    );
  }

  static async upsertAnalysis(
    prospectId: number,
    data: UpdateAnalysisData
  ): Promise<ApiResponse<ProspectAnalysis>> {
    const response = await apiClient.post(
      `/api/prospects/analyses/${prospectId}/upsert`,
      data
    );
    return handleApiResponse<ApiResponse<ProspectAnalysis>>(response);
  }

  static async getAnalysisStats(): Promise<
    ApiResponse<{
      totalAnalyses: number;
      averageConfidenceScore: number;
      confidenceDistribution: {
        high: number;
        medium: number;
        low: number;
      };
    }>
  > {
    const response = await apiClient.get('/api/prospects/analyses/stats');
    return handleApiResponse(response);
  }

  static async getProspectStats(): Promise<
    ApiResponse<{
      totalProspects: number;
      enrichedProspects: number;
      emailsGenerated: number;
      changes: {
        totalProspects: number;
        enrichedProspects: number;
        emailsGenerated: number;
      };
    }>
  > {
    const response = await apiClient.get('/api/prospects/stats');
    return handleApiResponse(response);
  }

  // Enrichment Operations (Existing)
  static async startEnrichment(prospectId: number): Promise<ApiResponse<any>> {
    const response = await apiClient.post(
      `/api/prospects/${prospectId}/enrichment/start`
    );
    return handleApiResponse(response);
  }

  static async getEnrichmentStatus(
    prospectId: number
  ): Promise<ApiResponse<any>> {
    const response = await apiClient.get(
      `/api/prospects/${prospectId}/enrichment/status`
    );
    return handleApiResponse(response);
  }

  static async enrichWithLinkedIn(
    linkedinUrl: string,
    aiProvider: 'gemini' | 'openrouter' = 'openrouter'
  ): Promise<ApiResponse<any>> {
    const response = await apiClient.post('/api/prospects/enrich/linkedin', {
      linkedinUrl,
      aiProvider,
    });
    return handleApiResponse(response);
  }

  static async enrichWithCompanyData(
    prospectId: number,
    aiProvider: 'gemini' | 'openrouter' = 'openrouter'
  ): Promise<ApiResponse<any>> {
    const response = await apiClient.post('/api/prospects/enrich/company', {
      prospectId,
      aiProvider,
    });
    return handleApiResponse(response);
  }

  static async enrichWithTechStack(
    prospectId: number,
    aiProvider: 'gemini' | 'openrouter' = 'openrouter'
  ): Promise<ApiResponse<any>> {
    const response = await apiClient.post('/api/prospects/enrich/techstack', {
      prospectId,
      aiProvider,
    });
    return handleApiResponse(response);
  }

  static async enrichWithProspectAnalysis(
    prospectId: number,
    aiProvider: 'gemini' | 'openrouter' = 'openrouter'
  ): Promise<ApiResponse<any>> {
    const response = await apiClient.post('/api/prospects/enrich/analysis', {
      prospectId,
      aiProvider,
    });
    return handleApiResponse(response);
  }

  // Utility Methods
  static getStatusColor(status: string): string {
    switch (status) {
      case 'PENDING':
        return 'bg-gray-100 text-gray-800';
      case 'ENRICHING':
        return 'bg-blue-100 text-blue-800';
      case 'ENRICHED':
        return 'bg-green-100 text-green-800';
      case 'GENERATING':
        return 'bg-yellow-100 text-yellow-800';
      case 'COMPLETED':
        return 'bg-emerald-100 text-emerald-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  static getEnrichmentStatusColor(status: string): string {
    switch (status) {
      case 'PENDING':
        return 'bg-gray-100 text-gray-800';
      case 'PROCESSING':
        return 'bg-blue-100 text-blue-800';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  static formatConfidenceScore(score?: number): string {
    if (score === undefined || score === null) return 'N/A';
    return `${(score * 100).toFixed(1)}%`;
  }
}

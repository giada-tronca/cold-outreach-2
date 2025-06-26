import type {
  Campaign,
  CreateCampaignData,
  UpdateCampaignData,
  ApiResponse,
  PaginatedResponse,
} from '@/types';
import { apiClient, handleApiResponse } from './api';

const API_BASE = '/api/campaigns';

export interface CampaignQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

class CampaignService {
  /**
   * Get all campaigns with optional filtering and pagination
   */
  async getAllCampaigns(
    params?: CampaignQueryParams
  ): Promise<PaginatedResponse<Campaign>> {
    const searchParams = new URLSearchParams();

    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.search) searchParams.append('search', params.search);
    if (params?.sortBy) searchParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) searchParams.append('sortOrder', params.sortOrder);

    const url = `${API_BASE}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;

    const response = await apiClient.get(url);
    return handleApiResponse<PaginatedResponse<Campaign>>(response);
  }

  /**
   * Get a campaign by ID
   */
  async getCampaignById(id: number): Promise<ApiResponse<Campaign>> {
    const response = await apiClient.get(`${API_BASE}/${id}`);
    return handleApiResponse<ApiResponse<Campaign>>(response);
  }

  /**
   * Create a new campaign
   */
  async createCampaign(
    campaignData: CreateCampaignData
  ): Promise<ApiResponse<Campaign>> {
    const response = await apiClient.post(API_BASE, campaignData);
    return handleApiResponse<ApiResponse<Campaign>>(response);
  }

  /**
   * Update an existing campaign
   */
  async updateCampaign(
    id: number,
    campaignData: UpdateCampaignData
  ): Promise<ApiResponse<Campaign>> {
    const response = await apiClient.put(`${API_BASE}/${id}`, campaignData);
    return handleApiResponse<ApiResponse<Campaign>>(response);
  }

  /**
   * Delete a campaign
   */
  async deleteCampaign(
    id: number
  ): Promise<ApiResponse<{ deletedCampaignId: number }>> {
    const response = await apiClient.delete(`${API_BASE}/${id}`);
    return handleApiResponse<ApiResponse<{ deletedCampaignId: number }>>(response);
  }

  /**
 * Duplicate a campaign
 */
  async duplicateCampaign(id: number): Promise<ApiResponse<Campaign>> {
    const response = await apiClient.post(`${API_BASE}/${id}/duplicate`);
    return handleApiResponse<ApiResponse<Campaign>>(response);
  }
}

export const campaignService = new CampaignService();

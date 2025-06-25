import type {
  Campaign,
  CreateCampaignData,
  UpdateCampaignData,
  ApiResponse,
  PaginatedResponse,
} from '@/types';

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

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch campaigns: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get a campaign by ID
   */
  async getCampaignById(id: number): Promise<ApiResponse<Campaign>> {
    const response = await fetch(`${API_BASE}/${id}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch campaign: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Create a new campaign
   */
  async createCampaign(
    campaignData: CreateCampaignData
  ): Promise<ApiResponse<Campaign>> {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(campaignData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || `Failed to create campaign: ${response.statusText}`
      );
    }

    return response.json();
  }

  /**
   * Update an existing campaign
   */
  async updateCampaign(
    id: number,
    campaignData: UpdateCampaignData
  ): Promise<ApiResponse<Campaign>> {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(campaignData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || `Failed to update campaign: ${response.statusText}`
      );
    }

    return response.json();
  }

  /**
   * Delete a campaign
   */
  async deleteCampaign(
    id: number
  ): Promise<ApiResponse<{ deletedCampaignId: number }>> {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || `Failed to delete campaign: ${response.statusText}`
      );
    }

    return response.json();
  }

  /**
   * Duplicate a campaign
   */
  async duplicateCampaign(id: number): Promise<ApiResponse<Campaign>> {
    const response = await fetch(`${API_BASE}/${id}/duplicate`, {
      method: 'POST',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message ||
          `Failed to duplicate campaign: ${response.statusText}`
      );
    }

    return response.json();
  }
}

export const campaignService = new CampaignService();

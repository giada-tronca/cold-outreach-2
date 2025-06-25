import type { ApiResponse } from '@/types';
import { apiClient, handleApiResponse } from '@/services/api';

const API_BASE = '/api/services';

export interface Service {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

class ServiceService {
  /**
   * Get all active services
   */
  async getAllServices(): Promise<ApiResponse<Service[]>> {
    const response = await apiClient.get(`${API_BASE}?isActive=true`);
    return handleApiResponse<ApiResponse<Service[]>>(response);
  }

  /**
   * Get a service by ID
   */
  async getServiceById(id: number): Promise<ApiResponse<Service>> {
    const response = await apiClient.get(`${API_BASE}/${id}`);
    return handleApiResponse<ApiResponse<Service>>(response);
  }
}

export const serviceService = new ServiceService();

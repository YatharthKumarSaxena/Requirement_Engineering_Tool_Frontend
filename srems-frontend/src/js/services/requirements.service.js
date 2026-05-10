/**
 * requirements.service.js
 * Requirement management operations
 */

import apiClient from './api.js';
import { API_CONFIG } from '../utils/constants.js';

class RequirementsService {
  /**
   * Create requirement
   */
  async createRequirement(requirementData) {
    return apiClient.post(`${API_CONFIG.ENDPOINTS.REQUIREMENTS}/create`, requirementData);
  }

  /**
   * Get requirements by project
   * Backend: GET /projects/:projectId/requirements
   */
  async getRequirements(projectId, page = 1, pageSize = 10) {
    const response = await apiClient.get(
      `/projects/${projectId}/requirements?page=${page}&pageSize=${pageSize}`
    );
    
    // Check if response was successful
    if (!response.success) {
      throw new Error(response.message || 'Failed to fetch requirements');
    }
    
    // Return the data array
    return Array.isArray(response.data) ? response.data : (response.data?.data?.requirements || []);
  }

  /**
   * Get requirement by ID
   */
  async getRequirementById(requirementId) {
    return apiClient.get(`${API_CONFIG.ENDPOINTS.REQUIREMENTS}/get/${requirementId}`);
  }

  /**
   * Update requirement
   */
  async updateRequirement(requirementId, updateData) {
    return apiClient.patch(
      `${API_CONFIG.ENDPOINTS.REQUIREMENTS}/update/${requirementId}`,
      updateData
    );
  }

  /**
   * Delete requirement
   */
  async deleteRequirement(requirementId) {
    return apiClient.delete(`${API_CONFIG.ENDPOINTS.REQUIREMENTS}/delete/${requirementId}`);
  }

  /**
   * Classify requirements (QFD mode)
   */
  async classifyRequirements(elicitationId) {
    return apiClient.post(
      `${API_CONFIG.ENDPOINTS.REQUIREMENTS}/classify`,
      { elicitationId }
    );
  }

  /**
   * Bulk upload requirements from CSV
   */
  async bulkUploadRequirements(formData) {
    return apiClient.post(
      `${API_CONFIG.ENDPOINTS.REQUIREMENTS}/bulk-upload`,
      formData,
      { headers: {} } // Let browser set boundary
    );
  }

  /**
   * Move requirement to different category
   */
  async moveRequirement(requirementId, newType) {
    return apiClient.patch(
      `${API_CONFIG.ENDPOINTS.REQUIREMENTS}/move/${requirementId}`,
      { type: newType }
    );
  }

  /**
   * Reorder requirements
   */
  async reorderRequirements(elicitationId, orderedIds) {
    return apiClient.patch(
      `${API_CONFIG.ENDPOINTS.REQUIREMENTS}/reorder`,
      { elicitationId, orderedIds }
    );
  }
}

export const requirementsService = new RequirementsService();
export default requirementsService;

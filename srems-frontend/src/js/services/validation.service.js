/**
 * validation.service.js
 * Validation phase management operations
 */

import apiClient from './api.js';

class ValidationService {
  /**
   * Create validation phase
   * Backend: POST /validations/create/:projectId
   */
  async createValidation(projectId, validationData = {}) {
    return apiClient.post(
      `/validations/create/${projectId}`,
      validationData
    );
  }

  /**
   * Get all validations
   * Backend: GET /validations/list/:projectId
   */
  async getValidations(projectId) {
    try {
      const response = await apiClient.get(
        `/validations/list/${projectId}`
      );
      
      if (!response.success) {
        return [];
      }
      
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Failed to fetch validations:', error);
      return [];
    }
  }

  /**
   * Get latest (active) validation for a project
   * Backend: GET /validations/latest/:projectId
   */
  async getLatestValidation(projectId) {
    try {
      if (!projectId) {
        throw new Error('Project ID is required');
      }
      const response = await apiClient.get(`/validations/latest/${projectId}`);
      return response.data?.data?.validation || response.data?.data || null;
    } catch (error) {
      console.error('Failed to fetch latest validation:', error);
      return null;
    }
  }

  /**
   * Freeze validation
   * Backend: PATCH /validations/freeze/:projectId
   */
  async freezeValidation(projectId) {
    return apiClient.patch(
      `/validations/freeze/${projectId}`,
      {}
    );
  }

  /**
   * Delete validation phase
   * Backend: DELETE /validations/delete/:projectId
   */
  async deleteValidation(projectId, deleteData = {}) {
    return apiClient.delete(
      `/validations/delete/${projectId}`,
      deleteData
    );
  }
}

export const validationService = new ValidationService();
export default validationService;

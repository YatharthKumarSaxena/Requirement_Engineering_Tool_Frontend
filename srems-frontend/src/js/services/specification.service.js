/**
 * specification.service.js
 * Specification phase management operations
 */

import apiClient from './api.js';

class SpecificationService {
  /**
   * Create specification phase
   * Backend: POST /specifications/create/:projectId
   */
  async createSpecification(projectId, specificationData = {}) {
    return apiClient.post(
      `/specifications/create/${projectId}`,
      specificationData
    );
  }

  /**
   * Get all specifications
   * Backend: GET /specifications/list/:projectId
   */
  async getSpecifications(projectId) {
    try {
      const response = await apiClient.get(
        `/specifications/list/${projectId}`
      );
      
      if (!response.success) {
        return [];
      }
      
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Failed to fetch specifications:', error);
      return [];
    }
  }

  /**
   * Get latest (active) specification for a project
   * Backend: GET /specifications/latest/:projectId
   */
  async getLatestSpecification(projectId) {
    try {
      if (!projectId) {
        throw new Error('Project ID is required');
      }
      const response = await apiClient.get(`/specifications/latest/${projectId}`);
      return response.data?.data?.specification || response.data?.data || null;
    } catch (error) {
      console.error('Failed to fetch latest specification:', error);
      return null;
    }
  }

  /**
   * Freeze specification
   * Backend: PATCH /specifications/freeze/:projectId
   */
  async freezeSpecification(projectId) {
    return apiClient.patch(
      `/specifications/freeze/${projectId}`,
      {}
    );
  }

  /**
   * Get single specification
   * Backend: GET /specifications/get/:specificationId
   */
  async getSpecification(projectId, specificationId) {
    return apiClient.get(
      `/specifications/get/${specificationId}`
    );
  }

  /**
   * Update specification
   * Backend: PATCH /specifications/update/:projectId
   */
  async updateSpecification(projectId, specificationId, updateData) {
    return apiClient.patch(
      `/specifications/update/${projectId}`,
      { specificationId, ...updateData }
    );
  }

  /**
   * Delete specification phase
   * Backend: DELETE /specifications/delete/:projectId
   */
  async deleteSpecification(projectId, specificationId, deleteData = {}) {
    return apiClient.delete(
      `/specifications/delete/${projectId}`,
      { specificationId, ...deleteData }
    );
  }
}

export const specificationService = new SpecificationService();
export default specificationService;

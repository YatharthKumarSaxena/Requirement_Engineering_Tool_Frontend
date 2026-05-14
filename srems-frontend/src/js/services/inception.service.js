/**
 * inception.service.js
 * Inception management operations
 */

import apiClient from './api.js';
import { API_CONFIG } from '../utils/constants.js';

class InceptionService {
  /**
   * Create inception document
   * Backend: POST /inceptions/create/:projectId
   */
  async createInception(inceptionData) {
    const { projectId, ...data } = inceptionData;
    return apiClient.post(
      `/inceptions/create/${projectId}`,
      data
    );
  }

  /**
   * Get all inception documents for a project
   * Backend: GET /inceptions/list/:projectId
   * @param {string} projectId - MongoDB ObjectId of the project (REQUIRED)
   * @returns {Array} List of inception documents or empty array on error
   */
  async getInceptions(projectId, page = 1, pageSize = 10) {
    try {
      // Dev: debug log when fetching inceptions
      console.debug('InceptionService.getInceptions called', { projectId, page, pageSize });
      // Validate projectId is provided and is a valid MongoDB ObjectId format
      if (!projectId) {
        throw new Error('Project ID is required to fetch inceptions');
      }

      // MongoDB ObjectId regex: 24 hex characters
      const mongoIdRegex = /^[a-f\d]{24}$/i;
      if (!mongoIdRegex.test(projectId)) {
        throw new Error('Invalid project ID format');
      }

      const response = await apiClient.get(
        `/inceptions/list/${projectId}`
      );
      
      if (!response.success) {
        // Return empty array instead of throwing to show "No data" state
        return [];
      }
      
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Failed to fetch inceptions:', error);
      throw error; // Propagate error to page handler
    }
  }

  /**
   * Get latest (active) inception for a project
   * Backend: GET /inceptions/get-latest/:projectId
   */
  async getLatestInception(projectId) {
    try {
      if (!projectId) {
        throw new Error('Project ID is required');
      }
      const response = await apiClient.get(`/inceptions/get-latest/${projectId}`);
      return response.data || null;
    } catch (error) {
      console.error('Failed to fetch latest inception:', error);
      return null;
    }
  }

  /**
   * Get single inception document
   * Backend: GET /inceptions/get/:inceptionId
   */
  async getInception(inceptionId, projectId) {
    return apiClient.get(
      `/inceptions/get/${inceptionId}`
    );
  }

  /**
   * Update inception document
   * Backend: PATCH /inceptions/update/:projectId
   */
  async updateInception(projectId, inceptionId, updateData) {
    return apiClient.patch(
      `/inceptions/update/${projectId}`,
      { inceptionId, ...updateData }
    );
  }

  /**
   * Freeze inception document
   * Backend: PATCH /inceptions/freeze/:projectId
   */
  async freezeInception(projectId) {
    return apiClient.patch(
      `/inceptions/freeze/${projectId}`,
      {}
    );
  }

  /**
   * Delete inception document
   * Backend: DELETE /inceptions/delete/:projectId
   */
  async deleteInception(projectId, inceptionId, deleteData = {}) {
    return apiClient.delete(
      `/inceptions/delete/${projectId}`,
      { inceptionId, ...deleteData }
    );
  }

  /**
   * Get inception documents by project
   */
  async getInceptionsByProject(projectId) {
    return apiClient.get(
      `/inceptions/list/${projectId}`
    );
  }
}

export const inceptionService = new InceptionService();
export default inceptionService;

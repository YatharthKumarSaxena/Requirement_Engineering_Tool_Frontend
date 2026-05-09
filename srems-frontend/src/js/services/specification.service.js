/**
 * specification.service.js
 * Specification management operations
 * 
 * Backend Endpoints:
 * POST   /projects/:projectId/specifications
 * GET    /projects/:projectId/specifications
 * GET    /projects/:projectId/specifications/latest
 * GET    /projects/:projectId/specifications/:specificationId
 * PATCH  /projects/:projectId/specifications/:specificationId
 * PATCH  /projects/:projectId/specifications/:specificationId/finalize
 * DELETE /projects/:projectId/specifications/:specificationId
 */

import apiClient from './api.js';
import { API_CONFIG } from '../utils/constants.js';

class SpecificationService {
  /**
   * Create new specification
   * Backend: POST /projects/:projectId/specifications
   * REQUIRED FIELDS: title
   * OPTIONAL FIELDS: description, content, expectedDuration
   */
  async createSpecification(projectId, specificationData) {
    try {
      const response = await apiClient.post(
        `/projects/${projectId}/specifications`,
        specificationData
      );
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to create specification');
      }
      
      return response;
    } catch (error) {
      console.error('Failed to create specification:', error);
      throw error;
    }
  }

  /**
   * Get all specifications for a project
   * Backend: GET /projects/:projectId/specifications
   */
  async getSpecifications(projectId, page = 1, pageSize = 10) {
    try {
      if (!projectId) {
        throw new Error('Project ID is required to fetch specifications');
      }

      const response = await apiClient.get(
        `/projects/${projectId}/specifications?page=${page}&pageSize=${pageSize}`
      );
      
      if (!response.success) {
        return [];
      }
      
      return Array.isArray(response.data?.data?.specifications) ? response.data.data.specifications :
             Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Failed to fetch specifications:', error);
      return [];
    }
  }

  /**
   * Get latest (active) specification for a project
   * Backend: GET /projects/:projectId/specifications/latest
   */
  async getLatestSpecification(projectId) {
    try {
      if (!projectId) {
        throw new Error('Project ID is required');
      }

      const response = await apiClient.get(
        `/projects/${projectId}/specifications/latest`
      );
      
      if (!response.success) {
        return null;
      }
      
      return response.data || null;
    } catch (error) {
      console.error('Failed to fetch latest specification:', error);
      return null;
    }
  }

  /**
   * Get single specification by ID
   * Backend: GET /projects/:projectId/specifications/:specificationId
   */
  async getSpecification(projectId, specificationId) {
    try {
      if (!projectId || !specificationId) {
        throw new Error('Project ID and Specification ID are required');
      }

      const response = await apiClient.get(
        `/projects/${projectId}/specifications/${specificationId}`
      );
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch specification');
      }
      
      return response;
    } catch (error) {
      console.error('Failed to fetch specification:', error);
      throw error;
    }
  }

  /**
   * Update specification
   * Backend: PATCH /projects/:projectId/specifications/:specificationId
   * OPTIONAL FIELDS: title, description, content, expectedDuration
   */
  async updateSpecification(projectId, specificationId, specificationData) {
    try {
      const response = await apiClient.patch(
        `/projects/${projectId}/specifications/${specificationId}`,
        specificationData
      );
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to update specification');
      }
      
      return response;
    } catch (error) {
      console.error('Failed to update specification:', error);
      throw error;
    }
  }

  /**
   * Finalize specification (lock and mark as complete)
   * Backend: PATCH /projects/:projectId/specifications/:specificationId/finalize
   * OPTIONAL FIELDS: finalizeReason, finalizeDescription
   */
  async finalizeSpecification(projectId, specificationId, finalizeData = {}) {
    try {
      const response = await apiClient.patch(
        `/projects/${projectId}/specifications/${specificationId}/finalize`,
        finalizeData
      );
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to finalize specification');
      }
      
      return response;
    } catch (error) {
      console.error('Failed to finalize specification:', error);
      throw error;
    }
  }

  /**
   * Delete specification (soft delete)
   * Backend: DELETE /projects/:projectId/specifications/:specificationId
   * OPTIONAL FIELDS: deletionReasonType, deletionReasonDescription
   */
  async deleteSpecification(projectId, specificationId, deleteData = {}) {
    try {
      const response = await apiClient.delete(
        `/projects/${projectId}/specifications/${specificationId}`,
        deleteData
      );
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to delete specification');
      }
      
      return response;
    } catch (error) {
      console.error('Failed to delete specification:', error);
      throw error;
    }
  }
}

export const specificationService = new SpecificationService();
export default specificationService;

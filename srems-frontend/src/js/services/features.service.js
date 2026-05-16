/**
 * features.service.js
 * High-Level Features management
 */

import apiClient from './api.js';
import { API_CONFIG } from '../utils/constants.js';

class FeaturesService {
  /**
   * Create high-level feature
   * Backend: POST /high-level-features/create/:projectId
   * Backend only supports: title, description, linkedIdeaId
   */
  async createFeature(projectId, featureData) {
    // Only send backend-supported fields
    const payload = {
      title: featureData.title || featureData.name,
      description: featureData.description,
      linkedIdeaId: featureData.linkedIdeaId || null
    };
    
    return apiClient.post(
      `${API_CONFIG.ENDPOINTS.HIGH_LEVEL_FEATURES}/create/${projectId}`,
      payload
    );
  }

  /**
   * Get features by project
   */
  async getFeaturesByProject(projectId) {
    const response = await apiClient.get(
      `${API_CONFIG.ENDPOINTS.HIGH_LEVEL_FEATURES}/list/${projectId}`
    );
    
    // Check if response was successful
    if (!response.success) {
      throw new Error(response.message || 'Failed to fetch features');
    }
    
    // Backend returns { data: { hlfs: [...], pagination: {...} } }
    // ApiClient wraps it, so we access: response.data.data.hlfs
    return (response.data?.data?.hlfs || []).map((feature) => ({
      ...feature,
      id: feature.hlfId || feature._id || feature.id,
      _id: feature._id || feature.hlfId || feature.id,
    }));
  }

  /**
   * Get feature by ID
   */
  async getFeatureById(featureId) {
    return apiClient.get(
      `${API_CONFIG.ENDPOINTS.HIGH_LEVEL_FEATURES}/get/${featureId}`
    );
  }

  /**
   * Update feature
   * Backend only supports: title, description, linkedIdeaId
   */
  async updateFeature(featureId, updateData) {
    // Only send backend-supported fields
    const payload = {
      title: updateData.title || updateData.name,
      description: updateData.description,
      linkedIdeaId: updateData.linkedIdeaId || null
    };
    
    return apiClient.patch(
      `${API_CONFIG.ENDPOINTS.HIGH_LEVEL_FEATURES}/update/${featureId}`,
      payload
    );
  }

  /**
   * Delete feature
   */
  async deleteFeature(featureId, deletionReasonDescription = 'Deleted from frontend') {
    return apiClient.delete(
      `${API_CONFIG.ENDPOINTS.HIGH_LEVEL_FEATURES}/delete/${featureId}`,
      deletionReasonDescription ? { deletionReasonDescription } : {}
    );
  }

  /**
   * Get requirements linked to feature
   * NOTE: Backend does not currently expose this nested endpoint
   * TODO: Either implement backend endpoint GET /high-level-features/:hlfId/requirements
   *       OR remove this method if feature requirements should be fetched separately
   */
  async getFeatureRequirements(featureId) {
    console.warn('getFeatureRequirements() calls non-existent backend endpoint. Requires backend implementation.');
    // Temporary fallback - fetch all requirements and filter by featureId
    try {
      const response = await apiClient.get(
        `${API_CONFIG.ENDPOINTS.REQUIREMENTS}/list`
      );
      if (!response.success) {
        throw new Error('Failed to fetch requirements');
      }
      // Filter requirements by parentFeatureId
      const allRequirements = response.data || [];
      return allRequirements.filter(req => req.parentFeatureId === featureId);
    } catch (error) {
      console.error('Error fetching feature requirements:', error);
      throw new Error('Unable to fetch requirements linked to feature');
    }
  }
}

export const featuresService = new FeaturesService();
export default featuresService;

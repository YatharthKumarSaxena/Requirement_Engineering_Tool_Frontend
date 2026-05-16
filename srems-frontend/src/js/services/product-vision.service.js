/**
 * product-vision.service.js
 * Product vision management operations
 */

import apiClient from './api.js';
import { API_CONFIG } from '../utils/constants.js';

class ProductVisionService {
  /**
   * Create product vision
   * Backend: POST /product-vision/create/:projectId
   */
  async createProductVision(visionData) {
    const { projectId, productVision } = visionData;
    return apiClient.post(
      `${API_CONFIG.ENDPOINTS.PRODUCT_VISION}/create/${projectId}`,
      { productVision }
    );
  }

  /**
   * Get product vision for a project
   * Backend: /product-vision/get/:projectId
   */
  async getProductVisions(projectId) {
    try {
      if (!projectId) {
        throw new Error('Project ID is required to fetch product visions');
      }
      const response = await apiClient.get(
        `${API_CONFIG.ENDPOINTS.PRODUCT_VISION}/get/${projectId}`
      );
      
      if (!response.success) {
        return [];
      }

      // Backend returns { data: { inception: {...} } }
      const inception = response.data?.data?.inception;
      return inception ? [inception] : [];
    } catch (error) {
      console.error('Failed to fetch product visions:', error);
      return [];
    }
  }

  /**
   * Get product vision by ID
   * Backend: GET /product-vision/get/:projectId
   */
  async getProductVisionById(projectId) {
    return apiClient.get(
      `${API_CONFIG.ENDPOINTS.PRODUCT_VISION}/get/${projectId}`
    );
  }

  /**
   * Backend: PATCH /product-vision/update/:projectId
   */
  async updateProductVision(projectId, updateData) {
    const payload = {
      productVision: updateData.productVision
    };
    return apiClient.patch(
      `${API_CONFIG.ENDPOINTS.PRODUCT_VISION}/update/${projectId}`,
      payload
    );
  }

  /**
   * Backend: DELETE /product-vision/delete/:projectId
   */
  async deleteProductVision(projectId, deletionReasonDescription = '') {
    return apiClient.delete(
      `${API_CONFIG.ENDPOINTS.PRODUCT_VISION}/delete/${projectId}`,
      deletionReasonDescription ? { deletionReasonDescription } : {}
    );
  }


}

export const productVisionService = new ProductVisionService();
export default productVisionService;

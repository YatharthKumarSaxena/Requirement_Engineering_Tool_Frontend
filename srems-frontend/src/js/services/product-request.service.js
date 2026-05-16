/**
 * product-request.service.js
 * Product request management operations
 */

import apiClient from './api.js';
import { API_CONFIG } from '../utils/constants.js';

class ProductRequestService {
  normalizeResponse(response, fallbackMessage) {
    if (!response.success) {
      throw new Error(response.message || fallbackMessage);
    }

    return response.data?.data?.productRequest
      || response.data?.productRequest
      || response.data?.data
      || response.data
      || null;
  }

  /**
   * Create product request
   */
  async createProductRequest(requestData) {
    const response = await apiClient.post(
      `${API_CONFIG.ENDPOINTS.PRODUCT_REQUESTS}/create`,
      requestData
    );

    return this.normalizeResponse(response, 'Failed to create product request');
  }

  /**
   * Get all product requests
   */
  async getProductRequests(page = 1, limit = 10) {
    const response = await apiClient.get(
      `${API_CONFIG.ENDPOINTS.PRODUCT_REQUESTS}/list?page=${page}&limit=${limit}`
    );
    
    // Check if response was successful
    if (!response.success) {
      throw new Error(response.message || 'Failed to fetch product requests');
    }
    
    // Backend returns { data: { productRequests: [...], pagination: {...} } }
    // ApiClient wraps it, so we access: response.data.data.productRequests
    return response.data?.data?.productRequests || [];
  }

  /**
   * Get product request by ID
   */
  async getProductRequestById(requestId) {
    const response = await apiClient.get(
      `${API_CONFIG.ENDPOINTS.PRODUCT_REQUESTS}/get/${requestId}`
    );

    return this.normalizeResponse(response, 'Failed to fetch product request');
  }

  /**
   * Update product request
   */
  async updateProductRequest(requestId, updateData) {
    const response = await apiClient.patch(
      `${API_CONFIG.ENDPOINTS.PRODUCT_REQUESTS}/update/${requestId}`,
      updateData
    );

    return this.normalizeResponse(response, 'Failed to update product request');
  }

  /**
   * Delete product request
   */
  async deleteProductRequest(requestId) {
    const response = await apiClient.delete(
      `${API_CONFIG.ENDPOINTS.PRODUCT_REQUESTS}/delete/${requestId}`
    );

    return this.normalizeResponse(response, 'Failed to delete product request');
  }

  /**
   * Get product requests by priority
   */
  async getProductRequestsByPriority(priority) {
    const requests = await this.getProductRequests(1, 1000);
    return requests.filter((request) => request.priority === priority);
  }

  /**
   * Approve product request
   * Backend: PATCH /product-requests/approve/:requestId
   */
  async approveProductRequest(requestId, reasonType, reasonDescription = '') {
    const response = await apiClient.patch(
      `${API_CONFIG.ENDPOINTS.PRODUCT_REQUESTS}/approve/${requestId}`,
      { reasonType, reasonDescription }
    );

    return this.normalizeResponse(response, 'Failed to approve product request');
  }

  /**
   * Reject product request
   * Backend: PATCH /product-requests/reject/:requestId
   */
  async rejectProductRequest(requestId, reasonType, reasonDescription) {
    const response = await apiClient.patch(
      `${API_CONFIG.ENDPOINTS.PRODUCT_REQUESTS}/reject/${requestId}`,
      { reasonType, reasonDescription }
    );

    return this.normalizeResponse(response, 'Failed to reject product request');
  }

  /**
   * Cancel product request
   * Backend: PATCH /product-requests/cancel/:requestId
   */
  async cancelProductRequest(requestId) {
    const response = await apiClient.patch(
      `${API_CONFIG.ENDPOINTS.PRODUCT_REQUESTS}/cancel/${requestId}`,
      {}
    );

    return this.normalizeResponse(response, 'Failed to cancel product request');
  }
}

export const productRequestService = new ProductRequestService();
export default productRequestService;

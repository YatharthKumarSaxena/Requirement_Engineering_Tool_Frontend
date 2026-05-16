/**
 * stakeholders.service.js
 * Stakeholder management operations
 */

import apiClient from './api.js';
import { API_CONFIG } from '../utils/constants.js';

class StakeholdersService {
  /**
   * Add stakeholder to project
   * Backend expects: { userId, role, projectId, orgId (optional) }
   */
  async addStakeholder(userId, role, orgId = null, projectId = null) {
    console.log('📤 Adding stakeholder with:', { userId, role, orgId, projectId });
    
    const payload = {
      userId,
      role,
      projectId
    };
    if (orgId) {
      payload.orgId = orgId;
    }
    
    console.log('📨 Payload being sent:', payload);
    
    const response = await apiClient.post(`${API_CONFIG.ENDPOINTS.STAKEHOLDERS}/create`, payload);
    
    console.log('✅ Response:', response);
    return response;
  }

  /**
   * Get all stakeholders with pagination
   */
  async getStakeholders(page = 1, pageSize = 10) {
    const role = localStorage.getItem('user_role');
    const clientRoles = ['sponsor', 'partner', 'vendor', 'end_user', 'other'];
    const isClient = clientRoles.includes(role);
    const endpoint = isClient ? '/clients/list-stakeholders' : `${API_CONFIG.ENDPOINTS.STAKEHOLDERS}/list`;
    
    return apiClient.get(
      `${endpoint}?page=${page}&pageSize=${pageSize}`
    );
  }

  /**
   * Get stakeholder by ID
   */
  async getStakeholderById(stakeholderId) {
    const role = localStorage.getItem('user_role');
    const clientRoles = ['sponsor', 'partner', 'vendor', 'end_user', 'other'];
    const isClient = clientRoles.includes(role);
    const endpoint = isClient ? `/clients/get-stakeholder/${stakeholderId}` : `${API_CONFIG.ENDPOINTS.STAKEHOLDERS}/get/${stakeholderId}`;
    
    return apiClient.get(endpoint);
  }

  /**
   * Update stakeholder role
   * Backend expects: { role }
   */
  async updateStakeholder(stakeholderId, role) {
    return apiClient.patch(
      `${API_CONFIG.ENDPOINTS.STAKEHOLDERS}/update/${stakeholderId}`,
      { role }
    );
  }

  /**
   * Delete stakeholder (soft-delete)
   * Backend expects: { deletionReasonType, deletionReasonDescription (optional) }
   */
  async deleteStakeholder(stakeholderId, deletionReasonType, deletionReasonDescription = null) {
    const payload = {
      deletionReasonType
    };
    if (deletionReasonDescription) {
      payload.deletionReasonDescription = deletionReasonDescription;
    }
    return apiClient.delete(`${API_CONFIG.ENDPOINTS.STAKEHOLDERS}/delete/${stakeholderId}`, payload);
  }

  /**
   * Get stakeholders by project ID
   * Backend: GET /stakeholders/list?projectId=xxx
   */
  async getProjectStakeholders(projectId) {
    console.log('📤 Fetching stakeholders for project:', projectId);
    
    const role = localStorage.getItem('user_role');
    const clientRoles = ['sponsor', 'partner', 'vendor', 'end_user', 'other'];
    const isClient = clientRoles.includes(role);
    const endpoint = isClient ? '/clients/list-stakeholders' : `${API_CONFIG.ENDPOINTS.STAKEHOLDERS}/list`;
    
    const response = await apiClient.get(
      `${endpoint}?projectId=${projectId}`
    );
    
    console.log('📥 Service received response:', {
      success: response?.success,
      hasData: !!response?.data,
      stakeholderCount: response?.data?.data?.stakeholders?.length || 0,
      structure: response?.data ? Object.keys(response.data) : 'N/A'
    });

    // API returns double-nested structure: response.data.data.stakeholders
    console.log('✅ Actual stakeholders location:', response?.data?.data?.stakeholders);
    
    return response;
  }
}

export const stakeholdersService = new StakeholdersService();
export default stakeholdersService;

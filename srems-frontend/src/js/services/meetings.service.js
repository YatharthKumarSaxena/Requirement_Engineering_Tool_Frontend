import { API_CONFIG } from '../utils/constants.js';
import { apiClient } from './api.js';

/**
 * Meetings Service
 * Handles all meeting-related API operations
 * 
 * Backend Endpoints:
 * POST   /meetings/create/:entityType/:projectId
 * PATCH  /meetings/update/:entityType/:meetingId
 * PATCH  /meetings/cancel/:entityType/:meetingId
 * GET    /meetings/get/:entityType/:meetingId
 * GET    /meetings/list/:entityType/:projectId
 * PATCH  /meetings/schedule/:entityType/:meetingId
 * PATCH  /meetings/reschedule/:entityType/:meetingId
 * PATCH  /meetings/start/:entityType/:meetingId
 * PATCH  /meetings/end/:entityType/:meetingId
 * PATCH  /meetings/freeze/:entityType/:meetingId
 */
export const meetingsService = {
  /**
   * Create new meeting
   * Backend: POST /meetings/create/:entityType/:projectId
   * Response structure: {success: true, data: {meeting: {...}}}
   * REQUIRED FIELDS: title
   * OPTIONAL FIELDS: description, facilitatorId, meetingGroup, platform
   * @param {string} entityType - Type of entity (inception, elicitation, elaboration, etc.)
   * @param {string} projectId - Project ID
   * @param {Object} meetingData - Meeting data
   */
  async createMeeting(entityType, projectId, meetingData) {
    // Normalize field names to match backend expectations
    const normalizedData = {
      title: meetingData.title,
      ...(meetingData.description && { description: meetingData.description }),
      ...(meetingData.facilitatorId && { facilitatorId: meetingData.facilitatorId }),
      ...(meetingData.meetingGroup && { meetingGroup: meetingData.meetingGroup }),
      ...(meetingData.platform && { platform: meetingData.platform })
    };

    const response = await apiClient.post(
      `${API_CONFIG.ENDPOINTS.MEETINGS}/create/${entityType}/${projectId}`,
      normalizedData
    );

    // apiClient wraps backend JSON in response.data; backend payload is usually response.data.data
    const payload = response.data;
    response.data = payload?.data?.meeting || payload?.meeting || payload?.data || payload;
    return response;
  },

  /**
   * List all meetings for an entity
   * Backend: GET /meetings/list/:entityType/:projectId
   * Response structure: {success: true, data: {meetings: [...], pagination: {...}}}
   * @param {string} entityType - Type of entity (inception, elicitation, elaboration, etc.)
   * @param {string} projectId - Project ID
   */
  async listMeetings(entityType, projectId) {
    try {
      console.log(`🔄 [meetingsService.listMeetings] Fetching: /meetings/list/${entityType}/${projectId}`);
      const response = await apiClient.get(
        `${API_CONFIG.ENDPOINTS.MEETINGS}/list/${entityType}/${projectId}`
      );
      
      console.log('📨 Response:', response);
      
      if (!response.success) {
        console.warn('⚠️ API returned success:false', response.message);
        return [];
      }

      // Support both wrapped and direct payloads.
      const payload = response.data;
      const meetings = payload?.data?.meetings || payload?.meetings || payload?.data || [];
      const data = Array.isArray(meetings) ? meetings : [];
      console.log(`✅ Returning ${data.length} meetings`);
      return data;
    } catch (error) {
      console.error('❌ Failed to fetch meetings:', error);
      return [];
    }
  },

  /**
   * Get single meeting details
   * Backend: GET /meetings/get/:entityType/:meetingId
   * Response structure: {success: true, data: {meeting: {...}}}
   * @param {string} entityType - Type of entity
   * @param {string} meetingId - Meeting ID
   */
  async getMeeting(entityType, meetingId) {
    const response = await apiClient.get(
      `${API_CONFIG.ENDPOINTS.MEETINGS}/get/${entityType}/${meetingId}`
    );

    const payload = response.data;
    response.data = payload?.data?.meeting || payload?.meeting || payload?.data || payload;
    return response;
  },

  /**
   * Update meeting
   * Backend: PATCH /meetings/update/:entityType/:meetingId
   * Response structure: {success: true, data: {meeting: {...}}}
   * @param {string} entityType - Type of entity
   * @param {string} meetingId - Meeting ID
   * @param {Object} meetingData - Updated meeting data
   */
  async updateMeeting(entityType, meetingId, meetingData) {
    const response = await apiClient.patch(
      `${API_CONFIG.ENDPOINTS.MEETINGS}/update/${entityType}/${meetingId}`,
      meetingData
    );

    const payload = response.data;
    response.data = payload?.data?.meeting || payload?.meeting || payload?.data || payload;
    return response;
  },

  /**
   * Schedule meeting
   * Backend: PATCH /meetings/schedule/:entityType/:meetingId
   * REQUIRED FIELDS: scheduledAt (ISO date), meetingLink
   * OPTIONAL FIELDS: meetingPassword, platform, expectedDuration
   * @param {string} entityType - Type of entity
   * @param {string} meetingId - Meeting ID
   * @param {Object} scheduleData - Schedule info
   */
  async scheduleMeeting(entityType, meetingId, scheduleData) {
    // Normalize field names to match backend expectations
    const normalizedData = {
      scheduledAt: scheduleData.scheduledAt,      // REQUIRED - ISO date string
      meetingLink: scheduleData.meetingLink,      // REQUIRED - meeting URL
      ...(scheduleData.meetingPassword && { meetingPassword: scheduleData.meetingPassword }),
      ...(scheduleData.platform && { platform: scheduleData.platform }),
      ...(scheduleData.expectedDuration && { expectedDuration: scheduleData.expectedDuration })
    };

    return apiClient.patch(
      `${API_CONFIG.ENDPOINTS.MEETINGS}/schedule/${entityType}/${meetingId}`,
      normalizedData
    );
  },

  /**
   * Cancel meeting
   * Backend: PATCH /meetings/cancel/:entityType/:meetingId
   * OPTIONAL FIELDS: cancelReason, cancelDescription
   * @param {string} entityType - Type of entity
   * @param {string} meetingId - Meeting ID
   * @param {Object} cancelData - Cancellation reason and details
   */
  async cancelMeeting(entityType, meetingId, cancelData = {}) {
    // Normalize field names to match backend expectations
    const normalizedData = {
      ...(cancelData.cancelReason && { cancelReason: cancelData.cancelReason }),
      ...(cancelData.cancelDescription && { cancelDescription: cancelData.cancelDescription })
    };

    return apiClient.patch(
      `${API_CONFIG.ENDPOINTS.MEETINGS}/cancel/${entityType}/${meetingId}`,
      normalizedData
    );
  },

  /**
   * Reschedule meeting
   * Backend: PATCH /meetings/reschedule/:entityType/:meetingId
   * OPTIONAL FIELDS: scheduledAt, meetingLink, platform, meetingPassword
   * @param {string} entityType - Type of entity
   * @param {string} meetingId - Meeting ID
   * @param {Object} rescheduleData - New schedule info
   */
  async rescheduleMeeting(entityType, meetingId, rescheduleData) {
    // Normalize field names to match backend expectations
    const normalizedData = {
      ...(rescheduleData.scheduledAt && { scheduledAt: rescheduleData.scheduledAt }),
      ...(rescheduleData.meetingLink && { meetingLink: rescheduleData.meetingLink }),
      ...(rescheduleData.platform && { platform: rescheduleData.platform }),
      ...(rescheduleData.meetingPassword && { meetingPassword: rescheduleData.meetingPassword })
    };

    return apiClient.patch(
      `${API_CONFIG.ENDPOINTS.MEETINGS}/reschedule/${entityType}/${meetingId}`,
      normalizedData
    );
  },

  /**
   * Start meeting
   * Backend: PATCH /meetings/start/:entityType/:meetingId
   * @param {string} entityType - Type of entity
   * @param {string} meetingId - Meeting ID
   * @param {Object} startData - Start meeting data (optional)
   */
  async startMeeting(entityType, meetingId, startData = {}) {
    return apiClient.patch(
      `${API_CONFIG.ENDPOINTS.MEETINGS}/start/${entityType}/${meetingId}`,
      startData
    );
  },

  /**
   * End meeting
   * Backend: PATCH /meetings/end/:entityType/:meetingId
   * @param {string} entityType - Type of entity
   * @param {string} meetingId - Meeting ID
   * @param {Object} endData - End meeting data (notes, outcomes, etc.)
   */
  async endMeeting(entityType, meetingId, endData = {}) {
    return apiClient.patch(
      `${API_CONFIG.ENDPOINTS.MEETINGS}/end/${entityType}/${meetingId}`,
      endData
    );
  },

  /**
   * Freeze meeting
   * Backend: PATCH /meetings/freeze/:entityType/:meetingId
   * @param {string} entityType - Type of entity
   * @param {string} meetingId - Meeting ID
   * @param {Object} freezeData - Freeze data (optional)
   */
  async freezeMeeting(entityType, meetingId, freezeData = {}) {
    return apiClient.patch(
      `${API_CONFIG.ENDPOINTS.MEETINGS}/freeze/${entityType}/${meetingId}`,
      freezeData
    );
  },
};

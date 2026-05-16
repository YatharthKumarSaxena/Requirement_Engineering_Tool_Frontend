import { API_CONFIG } from '../utils/constants.js';
import { apiClient } from './api.js';

/**
 * Comments Service
 * Handles all comment-related API operations
 * 
 * Backend Endpoints:
 * POST   /comments/create/:entityType/:entityId
 * GET    /comments/list/:entityType/:entityId
 * GET    /comments/list-hierarchical/:entityType/:entityId
 * GET    /comments/get/:commentId
 * PATCH  /comments/update/:commentId
 * DELETE /comments/delete/:commentId
 */
export const commentsService = {
  supportedEntityTypes: ['scopes', 'requirements', 'inceptions', 'high-level-features'],

  normalizeCommentTree(comment) {
    const commentId = comment?._id || comment?.id;
    const children = comment?.replies || comment?.childComments || [];

    return {
      ...comment,
      _id: commentId,
      id: commentId,
      childComments: Array.isArray(children)
        ? children.map((child) => this.normalizeCommentTree(child))
        : []
    };
  },

  normalizeCommentResponse(response, fallbackMessage) {
    if (!response.success) {
      throw new Error(response.message || fallbackMessage);
    }

    return response.data?.data?.comment
      || response.data?.comment
      || response.data?.data
      || response.data
      || null;
  },

  /**
   * Create new comment
   * Backend: POST /comments/create
   * Body format (entityType and entityId go in request body, not URL)
   * REQUIRED FIELDS: entityType, entityId, commentText
   * OPTIONAL FIELDS: parentCommentId (for replies)
   * 
   * Valid entityTypes: scopes, requirements, inceptions, high-level-features
   * NOTE: entityId must be a specific entity ID, not 'all'
   */
  async createComment(entityType, entityId, commentData) {
    // Validate entityId - cannot be 'all' or empty
    if (!entityId || entityId === 'all') {
      console.error('❌ Invalid entityId for comment creation:', entityId, '- must be a specific entity ID');
      return { success: false, message: 'Invalid entity ID' };
    }

    // Validate entityType - must be one of the supported backend entity collections
    if (!entityType || !this.supportedEntityTypes.includes(entityType)) {
      console.error('❌ Invalid entityType for comment:', entityType, '- must be one of:', this.supportedEntityTypes.join(', '));
      return { success: false, message: 'Invalid entity type' };
    }

    // Backend expects: { entityType: "...", entityId: "...", commentText: "...", parentCommentId?: "..." }
    const normalizedData = {
      entityType: entityType,  // REQUIRED
      entityId: entityId,      // REQUIRED
      commentText: commentData.commentText,  // REQUIRED
      ...(commentData.parentCommentId && { parentCommentId: commentData.parentCommentId })
    };

    const response = await apiClient.post(
      `${API_CONFIG.ENDPOINTS.COMMENTS}/create`,
      normalizedData
    );

    return this.normalizeCommentResponse(response, 'Failed to create comment');
  },

  /**
   * List all comments (flat list)
   * Backend: GET /comments/list/:entityType/:entityId
   * NOTE: entityId must be a specific entity ID, not 'all'
   */
  async listComments(entityType = 'projects', entityId = null) {
    // Validate entityId - cannot be 'all' or empty
    if (!entityId || entityId === 'all') {
      console.warn('⚠️ Invalid entityId for comments:', entityId, '- must be a specific entity ID');
      return [];
    }

    try {
      const response = await apiClient.get(
        `${API_CONFIG.ENDPOINTS.COMMENTS}/list/${entityType}/${entityId}`
      );
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch comments');
      }
      
      // ApiClient wraps backend response, so we access response.data.data.comments
      return (response.data?.data?.comments || []).map((comment) => this.normalizeCommentTree(comment));
    } catch (error) {
      console.error('Failed to fetch comments:', error);
      return [];
    }
  },

  /**
   * Get comments for entity (flat list with pagination)
   */
  async getCommentsByEntity(entityType, entityId, params = {}) {
    const queryParams = new URLSearchParams({
      page: params.page || 1,
      limit: params.limit || 20,
    }).toString();

    const response = await apiClient.get(
      `${API_CONFIG.ENDPOINTS.COMMENTS}/list/${entityType}/${entityId}?${queryParams}`
    );

    if (!response.success) {
      throw new Error(response.message || 'Failed to fetch comments');
    }

    return response.data?.data?.comments || [];
  },

  /**
   * Get comments for entity (hierarchical/threaded structure)
   * Backend: GET /comments/list-hierarchical/:entityType/:entityId
   * Note: entityId must be a specific entity ID, not 'all'
   */
  async getCommentsByEntityHierarchical(entityType, entityId) {
    // Validate that entityId is not 'all' - backend doesn't support listing all comments across entities
    if (!entityId || entityId === 'all') {
      console.warn('⚠️ Invalid entityId for comments:', entityId, '- must be a specific entity ID');
      return { success: false, data: [] };
    }
    
    const response = await apiClient.get(
      `${API_CONFIG.ENDPOINTS.COMMENTS}/list-hierarchical/${entityType}/${entityId}`
    );

    if (!response.success) {
      throw new Error(response.message || 'Failed to fetch comments');
    }

    const comments = response.data?.data?.comments || [];
    return comments.map((comment) => this.normalizeCommentTree(comment));
  },

  async listHierarchical(entityType, entityId, params = {}) {
    return this.getCommentsByEntityHierarchical(entityType, entityId, params);
  },

  /**
   * Get single comment details
   * Backend: GET /comments/get/:commentId
   */
  async getComment(commentId) {
    const response = await apiClient.get(
      `${API_CONFIG.ENDPOINTS.COMMENTS}/get/${commentId}`
    );

    return this.normalizeCommentResponse(response, 'Failed to fetch comment');
  },

  /**
   * Update comment
   * Backend: PATCH /comments/update/:commentId
   * REQUIRED FIELDS: commentText
   */
  async updateComment(commentId, commentData) {
    const normalizedData = {
      commentText: commentData.commentText  // REQUIRED
    };

    const response = await apiClient.patch(
      `${API_CONFIG.ENDPOINTS.COMMENTS}/update/${commentId}`,
      normalizedData
    );

    return this.normalizeCommentResponse(response, 'Failed to update comment');
  },

  /**
   * Delete comment
   * Backend: DELETE /comments/delete/:commentId
   * OPTIONAL FIELDS: deletedReason
   */
  async deleteComment(commentId, deletedReason = null) {
    const deleteData = deletedReason ? { deletedReason } : {};

    const response = await apiClient.delete(
      `${API_CONFIG.ENDPOINTS.COMMENTS}/delete/${commentId}`,
      deleteData
    );

    if (!response.success) {
      throw new Error(response.message || 'Failed to delete comment');
    }

    return response;
  },

  /**
   * Add reply to comment (uses parentCommentId in createComment)
   */
  async replyToComment(entityType, entityId, parentCommentId, replyData) {
    return this.createComment(entityType, entityId, {
      commentText: replyData.commentText,
      parentCommentId: parentCommentId
    });
  },

  async create(entityType, entityId, commentText, parentCommentId = null) {
    return this.createComment(entityType, entityId, { commentText, parentCommentId });
  },

  async delete(commentId, deletedReason = null) {
    return this.deleteComment(commentId, deletedReason);
  }
};

/**
 * constants.js
 * Centralized constants, enums, and configuration values
 * Like backend's enums.config.js
 */

// ═════════════════════════════════════════════════════════════════════════════
// ENVIRONMENT VARIABLES (from window.ENV - loaded by env.js)
// ═════════════════════════════════════════════════════════════════════════════

const getEnvVar = (key, defaultValue) => {
  // Get from window.ENV (loaded by env.js in index.html)
  const value = window.ENV?.[key];
  return value !== undefined ? value : defaultValue;
};

// ═════════════════════════════════════════════════════════════════════════════
// API CONFIGURATION (Environment-aware)
// ═════════════════════════════════════════════════════════════════════════════

export const API_CONFIG = {
  BASE_URL: getEnvVar('API_BASE_URL', 'http://localhost:8082'),
  BASE_PATH: getEnvVar('API_SERVICE_PATH', '/software-management-service'),
  API_VERSION: getEnvVar('API_VERSION', '/api/v1'),
  
  // Complete URI paths - MUST MATCH BACKEND uri.config.js EXACTLY
  ENDPOINTS: {
    // Core Management
    PROJECTS: '/projects',
    STAKEHOLDERS: '/stakeholders',
    PRODUCT_REQUESTS: '/product-requests',
    
    // SREMS RE Workflow - PLURAL FORMS TO MATCH BACKEND
    SCOPE: '/scope',
    HIGH_LEVEL_FEATURES: '/high-level-features',
    IDEAS: '/ideas',                                // Backend: /ideas (PLURAL!)
    PRODUCT_VISION: '/product-vision',              // Backend: /product-vision (NO list endpoint)
    ELICITATION: '/elicitations',                   // Backend: /elicitations (PLURAL!)
    INCEPTION: '/inceptions',                       // Backend: /inceptions (PLURAL!)
    ELABORATION: '/elaborations',                   // Backend: /elaborations (PLURAL!)
    NEGOTIATION: '/negotiations',                   // Backend: /negotiations (PLURAL!)
    SPECIFICATION: '/specifications',               // Backend: /specifications (PLURAL!)
    VALIDATION: '/validations',                     // Backend: /validations (PLURAL!)
    
    // Requirements Management
    REQUIREMENTS: '/requirements',                  // Backend: /requirements (CRUD endpoints)
    
    // Shared Features & Collaboration
    COMMENTS: '/comments',
    ACTIVITY_TRACKER: '/activity-trackers',
    MEETINGS: '/meetings',                          // Backend: /meetings (requires :entityType/:projectId)
    PARTICIPANTS: '/participants',                  // Backend: /participants (requires :entityType/:meetingId)
  },

  // HTTP Methods
  METHODS: {
    GET: 'GET',
    POST: 'POST',
    PATCH: 'PATCH',
    DELETE: 'DELETE',
    PUT: 'PUT'
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// APPLICATION CONFIGURATION (Environment-aware)
// ═════════════════════════════════════════════════════════════════════════════

export const APP_CONFIG = {
  NAME: getEnvVar('APP_NAME', 'SREMS Frontend'),
  ENVIRONMENT: getEnvVar('ENVIRONMENT', 'development'),
  IS_DEVELOPMENT: getEnvVar('ENVIRONMENT', 'development') === 'development',
  IS_PRODUCTION: getEnvVar('ENVIRONMENT', 'development') === 'production',
};

// ═════════════════════════════════════════════════════════════════════════════
// LOGGING CONFIGURATION (Environment-aware)
// ═════════════════════════════════════════════════════════════════════════════

export const LOGGING_CONFIG = {
  ENABLED: getEnvVar('ENABLE_LOGGING', 'true') === 'true',
  LEVEL: getEnvVar('LOG_LEVEL', 'info'),
  LEVELS: {
    DEBUG: 'debug',
    INFO: 'info',
    WARN: 'warn',
    ERROR: 'error'
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// SESSION CONFIGURATION (Environment-aware)
// ═════════════════════════════════════════════════════════════════════════════

export const SESSION_CONFIG = {
  TIMEOUT_MINUTES: parseInt(getEnvVar('SESSION_TIMEOUT_MINUTES', '30'), 10),
  TOKEN_REFRESH_INTERVAL_MINUTES: parseInt(getEnvVar('TOKEN_REFRESH_INTERVAL_MINUTES', '5'), 10),
  STORAGE_KEYS: {
    ACCESS_TOKEN: 'accessToken',
    DEVICE_UUID: 'deviceUUID',
    DEVICE_TYPE: 'deviceType',
    USER_DATA: 'user',
    THEME: 'theme'
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// PROJECT ENUMS (Backend aligned)
// ═════════════════════════════════════════════════════════════════════════════

export const PROJECT_STATUS = Object.freeze({
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  ON_HOLD: 'ON_HOLD',
  COMPLETED: 'COMPLETED',
  ABORTED: 'ABORTED'
});

export const PHASES = Object.freeze({
  INCEPTION: 'INCEPTION',
  ELICITATION: 'ELICITATION',
  ELABORATION: 'ELABORATION',
  NEGOTIATION: 'NEGOTIATION',
  SPECIFICATION: 'SPECIFICATION',
  VALIDATION: 'VALIDATION',
  MANAGEMENT: 'MANAGEMENT'
});

export const PHASE_LABELS = {
  'INCEPTION': 'Inception',
  'ELICITATION': 'Elicitation',
  'ELABORATION': 'Elaboration',
  'NEGOTIATION': 'Negotiation',
  'SPECIFICATION': 'Specification',
  'VALIDATION': 'Validation',
  'MANAGEMENT': 'Management'
};

export const PROJECT_TYPES = Object.freeze({
  DEVELOPMENT: 'development',
  ENHANCEMENT: 'enhancement',
  MAINTENANCE: 'maintenance',
  OTHER: 'other'
});

export const PROJECT_CATEGORY = Object.freeze({
  INDIVIDUAL: 'individual',
  ORGANIZATION: 'organization',
  MULTI_ORGANIZATION: 'multi_organization'
});

export const PROJECT_COMPLEXITY = Object.freeze({
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
});

export const PROJECT_CRITICALITY = Object.freeze({
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high'
});

export const PROJECT_PRIORITY = Object.freeze({
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
});

export const PRIORITY_LEVELS = Object.freeze({
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
});

// ═════════════════════════════════════════════════════════════════════════════
// REQUIREMENT ENUMS
// ═════════════════════════════════════════════════════════════════════════════

export const REQUIREMENT_TYPES = Object.freeze({
  FUNCTIONAL: 'FUNCTIONAL',
  NON_FUNCTIONAL: 'NON_FUNCTIONAL',
  EXCITED: 'EXCITED'
});

export const REQUIREMENT_STATUS = Object.freeze({
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  VALIDATED: 'VALIDATED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED'
});

export const REQUIREMENT_SOURCE = Object.freeze({
  MANUAL: 'MANUAL',
  CSV_UPLOAD: 'CSV_UPLOAD',
  FAST: 'FAST',
  QFD: 'QFD'
});

// ═════════════════════════════════════════════════════════════════════════════
// SCOPE ENUMS
// ═════════════════════════════════════════════════════════════════════════════

export const SCOPE_TYPES = Object.freeze({
  IN_SCOPE: 'IN_SCOPE',
  OUT_OF_SCOPE: 'OUT_OF_SCOPE',
  PARTIAL_SCOPE: 'PARTIAL_SCOPE'
});

// ═════════════════════════════════════════════════════════════════════════════
// STAKEHOLDER ROLES
// ═════════════════════════════════════════════════════════════════════════════

export const CLIENT_ROLES = Object.freeze({
  SPONSOR: 'sponsor',
  PARTNER: 'partner',
  VENDOR: 'vendor',
  END_USER: 'end_user',
  OTHER: 'other'
});

export const PROJECT_ROLES = Object.freeze({
  MANAGER: 'manager',
  DEVELOPER: 'developer',
  TESTER: 'tester',
  ANALYST: 'analyst',
  OTHER: 'other',
  OWNER: 'owner'
});

export const STAKEHOLDER_DELETION_REASON = Object.freeze({
  DUPLICATE: 'duplicate_stakeholder',
  TEST_STAKEHOLDER: 'test_or_demo_stakeholder_cleanup',
  ADMIN_ERROR: 'created_by_admin_mistake',
  ORGANIZATION_REMOVED: 'organization_removed_from_client',
  OTHER: 'other'
});

// ═════════════════════════════════════════════════════════════════════════════
// PRODUCT REQUEST STATUS
// ═════════════════════════════════════════════════════════════════════════════

export const REQUEST_STATUS = Object.freeze({
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED'
});

// ═════════════════════════════════════════════════════════════════════════════
// ELICITATION METHODS
// ═════════════════════════════════════════════════════════════════════════════

export const ELICITATION_METHOD = Object.freeze({
  QFD: 'QFD',
  FAST: 'FAST'
});

// ═════════════════════════════════════════════════════════════════════════════
// VALIDATION STATUS
// ═════════════════════════════════════════════════════════════════════════════

export const VALIDATION_STATUS = Object.freeze({
  DRAFT: 'DRAFT',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED'
});

// ═════════════════════════════════════════════════════════════════════════════
// UI MESSAGES & LABELS
// ═════════════════════════════════════════════════════════════════════════════

export const UI_MESSAGES = {
  SUCCESS: {
    PROJECT_CREATED: 'Project created successfully',
    PROJECT_UPDATED: 'Project updated successfully',
    STAKEHOLDER_ADDED: 'Stakeholder added successfully',
    REQUIREMENT_ADDED: 'Requirement added successfully',
    SCOPE_CREATED: 'Scope item created successfully'
  },
  ERROR: {
    INVALID_INPUT: 'Please fill all required fields',
    API_ERROR: 'Something went wrong. Please try again',
    NETWORK_ERROR: 'Network error. Please check your connection',
    UNAUTHORIZED: 'Unauthorized access',
    NOT_FOUND: 'Resource not found'
  },
  CONFIRMATION: {
    DELETE_PROJECT: 'Are you sure you want to delete this project?',
    DELETE_STAKEHOLDER: 'Are you sure you want to remove this stakeholder?',
    DELETE_REQUIREMENT: 'Are you sure you want to delete this requirement?'
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// STATUS COLORS & STYLING
// ═════════════════════════════════════════════════════════════════════════════

export const STATUS_COLORS = {
  [PROJECT_STATUS.DRAFT]: '#FFA500',      // Orange
  [PROJECT_STATUS.ACTIVE]: '#28A745',     // Green
  [PROJECT_STATUS.ON_HOLD]: '#FFC107',    // Yellow
  [PROJECT_STATUS.COMPLETED]: '#17A2B8',  // Blue
  [PROJECT_STATUS.ABORTED]: '#DC3545'     // Red
};

export const PRIORITY_COLORS = {
  [PRIORITY_LEVELS.LOW]: '#6C757D',       // Gray
  [PRIORITY_LEVELS.MEDIUM]: '#FFC107',    // Yellow
  [PRIORITY_LEVELS.HIGH]: '#FF9800',      // Orange
  [PRIORITY_LEVELS.CRITICAL]: '#DC3545'   // Red
};

// Alias for backward compatibility
export const COLORS = STATUS_COLORS;

export const REQUIREMENT_TYPE_COLORS = {
  [REQUIREMENT_TYPES.FUNCTIONAL]: '#007BFF',      // Blue
  [REQUIREMENT_TYPES.NON_FUNCTIONAL]: '#6F42C1',  // Purple
  [REQUIREMENT_TYPES.EXCITED]: '#20C997'          // Teal
};

// ═════════════════════════════════════════════════════════════════════════════
// PAGINATION & LIMITS
// ═════════════════════════════════════════════════════════════════════════════

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
  DEFAULT_PAGE: 1
};

// ═════════════════════════════════════════════════════════════════════════════
// LOCAL STORAGE KEYS
// ═════════════════════════════════════════════════════════════════════════════

export const STORAGE_KEYS = {
  accessToken: 'accessToken',
  deviceUUID: 'deviceUUID',
  deviceName: 'deviceName',
  USER_ID: 'user_id',
  USER_ROLE: 'user_role',
  CURRENT_PROJECT: 'current_project',
  CURRENT_PHASE: 'current_phase',
  THEME: 'theme'
};

// ═════════════════════════════════════════════════════════════════════════════
// TIME & DATE FORMATS
// ═════════════════════════════════════════════════════════════════════════════

export const DATE_FORMATS = {
  DISPLAY: 'DD/MM/YYYY',
  ISO: 'YYYY-MM-DD',
  TIMESTAMP: 'DD/MM/YYYY HH:mm'
};

// ═════════════════════════════════════════════════════════════════════════════
// MEETING ENUMS (Backend aligned)
// ═════════════════════════════════════════════════════════════════════════════

export const MEETING_PLATFORMS = Object.freeze({
  ZOOM: 'ZOOM',
  TEAMS: 'TEAMS',
  GOOGLE_MEET: 'GOOGLE_MEET',
  OTHER: 'OTHER'
});

export const MEETING_STATUSES = Object.freeze({
  DRAFT: 'DRAFT',
  SCHEDULED: 'SCHEDULED',
  ONGOING: 'ONGOING',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
});

export const MEETING_GROUPS = Object.freeze({
  GENERAL: 'GENERAL',
  AUTH: 'AUTH',
  PAYMENT: 'PAYMENT',
  NOTIFICATION: 'NOTIFICATION',
  SEARCH: 'SEARCH',
  ANALYTICS: 'ANALYTICS',
  USER_MANAGEMENT: 'USER_MANAGEMENT',
  ORDER_MANAGEMENT: 'ORDER_MANAGEMENT',
  INVENTORY: 'INVENTORY',
  BILLING: 'BILLING',
  THIRD_PARTY: 'THIRD_PARTY',
  API: 'API',
  INTEGRATION: 'INTEGRATION',
  PERFORMANCE: 'PERFORMANCE',
  SECURITY: 'SECURITY',
  DATABASE: 'DATABASE',
  INFRASTRUCTURE: 'INFRASTRUCTURE',
  REQUIREMENTS: 'REQUIREMENTS',
  DESIGN: 'DESIGN',
  REVIEW: 'REVIEW',
  PLANNING: 'PLANNING',
  BUG_FIX: 'BUG_FIX',
  ENHANCEMENT: 'ENHANCEMENT'
});

export const MEETING_CANCELLATION_REASONS = Object.freeze({
  SCHEDULING_CONFLICT: 'SCHEDULING_CONFLICT',
  TECHNICAL_ISSUES: 'TECHNICAL_ISSUES',
  CHANGE_IN_PLANS: 'CHANGE_IN_PLANS',
  STAKEHOLDER_UNAVAILABILITY: 'STAKEHOLDER_UNAVAILABILITY',
  OTHER: 'OTHER'
});

// ═════════════════════════════════════════════════════════════════════════════
// PARTICIPANTS ENUMS (Backend aligned)
// ═════════════════════════════════════════════════════════════════════════════

export const PARTICIPANT_TYPES = Object.freeze({
  FACILITATOR: 'FACILITATOR',
  PARTICIPANT: 'PARTICIPANT'
});

// ═════════════════════════════════════════════════════════════════════════════
// COMMENTS ENUMS (Backend aligned)
// ═════════════════════════════════════════════════════════════════════════════

export const COMMENT_ENTITY_TYPES = Object.freeze({
  SCOPES: 'scopes',
  REQUIREMENTS: 'requirements',
  INCEPTIONS: 'inceptions',
  HIGH_LEVEL_FEATURES: 'high_level_features',
  EXTERNAL_INTERFACES: 'external_interfaces',
  IDEAS: 'ideas',
  MEETINGS: 'meetings',
  PROJECTS: 'projects'
});

// ═════════════════════════════════════════════════════════════════════════════
// PHASE ENTITY TYPES (for API calls)
// ═════════════════════════════════════════════════════════════════════════════

export const ENTITY_TYPES = Object.freeze({
  INCEPTION: 'inceptions',        // Backend requires PLURAL
  ELICITATION: 'elicitations',    // Backend requires PLURAL
  ELABORATION: 'elaborations',    // Backend requires PLURAL
  NEGOTIATION: 'negotiations',    // Backend requires PLURAL
  SPECIFICATION: 'specifications',// Backend requires PLURAL
  VALIDATION: 'validations'       // Backend requires PLURAL
});

// ═════════════════════════════════════════════════════════════════════════════
// URLS & ROUTES
// ═════════════════════════════════════════════════════════════════════════════

export const ROUTES = {
  DASHBOARD: '/',
  PROJECTS: '/projects',
  PROJECT_DETAIL: '/projects/:projectId',
  PROJECT_CREATE: '/projects/create',
  REQUIREMENTS: '/projects/:projectId/requirements',
  SCOPE: '/projects/:projectId/scope',
  FEATURES: '/projects/:projectId/features',
  ELABORATION: '/projects/:projectId/elaboration',
  NEGOTIATION: '/projects/:projectId/negotiation',
  SPECIFICATION: '/projects/:projectId/specification',
  VALIDATION: '/projects/:projectId/validation',
  ACTIVITY: '/projects/:projectId/activity'
};

export default {
  API_CONFIG,
  PROJECT_STATUS,
  PROJECT_TYPES,
  PROJECT_CATEGORY,
  PRIORITY_LEVELS,
  PHASES,
  PHASE_LABELS,
  REQUIREMENT_TYPES,
  REQUIREMENT_STATUS,
  REQUIREMENT_SOURCE,
  SCOPE_TYPES,
  CLIENT_ROLES,
  PROJECT_ROLES,
  REQUEST_STATUS,
  ELICITATION_METHOD,
  VALIDATION_STATUS,
  UI_MESSAGES,
  STATUS_COLORS,
  PRIORITY_COLORS,
  REQUIREMENT_TYPE_COLORS,
  PAGINATION,
  STORAGE_KEYS,
  DATE_FORMATS,
  ROUTES
};

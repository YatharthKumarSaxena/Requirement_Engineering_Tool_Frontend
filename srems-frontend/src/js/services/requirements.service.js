/**
 * requirements.service.js
 * Requirement management operations (MOCKED via LocalStorage)
 * Since the backend API for requirements does not exist, this mock allows the frontend flow to continue without modifying the backend.
 */

import { store } from '../store/store.js';

// Helper to simulate API delay
const delay = (ms = 300) => new Promise(resolve => setTimeout(resolve, ms));

// Storage Key
const STORAGE_KEY = 'SREMS_MOCK_REQUIREMENTS_V2';
const DEFAULT_DEMO_PROJECT_ID = 'project_demo_1';

const DEFAULT_DEMO_REQUIREMENTS = [
  {
    _id: 'req_demo_001',
    projectId: DEFAULT_DEMO_PROJECT_ID,
    title: 'Secure Sign In',
    description: 'Users must be able to sign in using email and password with secure session handling.',
    type: 'functional',
    priority: 'critical',
    category: 'functional',
    status: 'DRAFT',
    context: 'Core authentication flow for all users.',
    createdAt: '2026-05-15T09:00:00.000Z'
  },
  {
    _id: 'req_demo_002',
    projectId: DEFAULT_DEMO_PROJECT_ID,
    title: 'Password Reset',
    description: 'Users should receive a password reset link on their registered email address within 60 seconds.',
    type: 'functional',
    priority: 'high',
    category: 'functional',
    status: 'DRAFT',
    context: 'Account recovery and support reduction.',
    createdAt: '2026-05-15T09:05:00.000Z'
  },
  {
    _id: 'req_demo_003',
    projectId: DEFAULT_DEMO_PROJECT_ID,
    title: 'Fast Page Load',
    description: 'Dashboard pages should load within 2 seconds for 90% of normal usage sessions.',
    type: 'non-functional',
    priority: 'high',
    category: 'non-functional',
    status: 'DRAFT',
    context: 'Performance target for a smooth user experience.',
    createdAt: '2026-05-15T09:10:00.000Z'
  },
  {
    _id: 'req_demo_004',
    projectId: DEFAULT_DEMO_PROJECT_ID,
    title: 'Responsive Layout',
    description: 'The application should remain fully usable on desktop, tablet, and mobile devices.',
    type: 'non-functional',
    priority: 'medium',
    category: 'non-functional',
    status: 'DRAFT',
    context: 'Cross-device support for stakeholders.',
    createdAt: '2026-05-15T09:15:00.000Z'
  },
  {
    _id: 'req_demo_005',
    projectId: DEFAULT_DEMO_PROJECT_ID,
    title: 'Role-Based Access',
    description: 'Managers, analysts, and clients should only see actions permitted by their role and project membership.',
    type: 'functional',
    priority: 'critical',
    category: 'functional',
    status: 'DRAFT',
    context: 'Supports the management dashboard authorization model.',
    createdAt: '2026-05-15T09:20:00.000Z'
  },
  {
    _id: 'req_demo_006',
    projectId: DEFAULT_DEMO_PROJECT_ID,
    title: 'Instant Feedback',
    description: 'Users should get immediate visual confirmation after saving, updating, or deleting a record.',
    type: 'excited',
    priority: 'medium',
    category: 'excited',
    status: 'DRAFT',
    context: 'Improves perceived responsiveness in demos.',
    createdAt: '2026-05-15T09:25:00.000Z'
  },
  {
    _id: 'req_demo_007',
    projectId: DEFAULT_DEMO_PROJECT_ID,
    title: 'Audit Trail',
    description: 'Every important action should be traceable with timestamp, actor, and action type.',
    type: 'functional',
    priority: 'high',
    category: 'unclassified',
    status: 'DRAFT',
    context: 'Audit and compliance support.',
    createdAt: '2026-05-15T09:30:00.000Z'
  },
  {
    _id: 'req_demo_008',
    projectId: DEFAULT_DEMO_PROJECT_ID,
    title: 'Accessibility Standard',
    description: 'Key screens should meet basic accessibility standards with readable contrast and keyboard support.',
    type: 'non-functional',
    priority: 'low',
    category: 'unclassified',
    status: 'DRAFT',
    context: 'Improves usability for diverse users.',
    createdAt: '2026-05-15T09:35:00.000Z'
  },
  {
    _id: 'req_demo_009',
    projectId: DEFAULT_DEMO_PROJECT_ID,
    title: 'Offline Mode Support',
    description: 'Allow users to read and add requirements while offline, syncing when connection is restored.',
    type: 'excited',
    priority: 'low',
    category: 'unclassified',
    status: 'DRAFT',
    context: 'Requested by field teams.',
    createdAt: '2026-05-15T09:40:00.000Z'
  },
  {
    _id: 'req_demo_010',
    projectId: DEFAULT_DEMO_PROJECT_ID,
    title: 'Automated Backups',
    description: 'Database must backup automatically every 24 hours to a secure remote server.',
    type: 'non-functional',
    priority: 'critical',
    category: 'unclassified',
    status: 'DRAFT',
    context: 'Data protection policy.',
    createdAt: '2026-05-15T09:45:00.000Z'
  },
  {
    _id: 'req_demo_011',
    projectId: DEFAULT_DEMO_PROJECT_ID,
    title: 'Third-party Integrations',
    description: 'Provide an API to integrate with Jira and Slack for automatic status updates.',
    type: 'functional',
    priority: 'medium',
    category: 'unclassified',
    status: 'DRAFT',
    context: 'Enhance team workflow.',
    createdAt: '2026-05-15T09:50:00.000Z'
  },
  {
    _id: 'req_demo_012',
    projectId: DEFAULT_DEMO_PROJECT_ID,
    title: 'Dark Mode UI',
    description: 'Provide a toggle for a dark theme to reduce eye strain in low-light environments.',
    type: 'excited',
    priority: 'medium',
    category: 'unclassified',
    status: 'DRAFT',
    context: 'Modern UX standard.',
    createdAt: '2026-05-15T09:55:00.000Z'
  },
  {
    _id: 'req_demo_013',
    projectId: DEFAULT_DEMO_PROJECT_ID,
    title: 'Multi-language Support',
    description: 'UI should support English, Spanish, and French via a language toggle.',
    type: 'functional',
    priority: 'low',
    category: 'unclassified',
    status: 'DRAFT',
    context: 'Expansion to international markets.',
    createdAt: '2026-05-15T10:00:00.000Z'
  },
  {
    _id: 'req_demo_014',
    projectId: DEFAULT_DEMO_PROJECT_ID,
    title: 'Data Export to PDF',
    description: 'Allow stakeholders to download a neatly formatted PDF of all requirements.',
    type: 'functional',
    priority: 'high',
    category: 'unclassified',
    status: 'DRAFT',
    context: 'Management reporting.',
    createdAt: '2026-05-15T10:05:00.000Z'
  },
  {
    _id: 'req_demo_015',
    projectId: DEFAULT_DEMO_PROJECT_ID,
    title: 'Real-time Collaboration',
    description: 'Multiple users should be able to edit different requirements simultaneously without conflicts.',
    type: 'non-functional',
    priority: 'high',
    category: 'unclassified',
    status: 'DRAFT',
    context: 'Team efficiency.',
    createdAt: '2026-05-15T10:10:00.000Z'
  },
  {
    _id: 'req_demo_016',
    projectId: DEFAULT_DEMO_PROJECT_ID,
    title: 'Role-based Dashboards',
    description: 'Each role should see a custom dashboard prioritizing their specific tasks and alerts.',
    type: 'functional',
    priority: 'medium',
    category: 'unclassified',
    status: 'DRAFT',
    context: 'Personalized user experience.',
    createdAt: '2026-05-15T10:15:00.000Z'
  }
];

class RequirementsService {
  _normalizeProjectId(projectId = null) {
    if (!projectId) {
      const currentProject = store.state.projects.current;
      return currentProject?._id || currentProject?.id || currentProject || DEFAULT_DEMO_PROJECT_ID;
    }

    if (typeof projectId === 'object') {
      return projectId?._id || projectId?.id || DEFAULT_DEMO_PROJECT_ID;
    }

    return projectId;
  }

  _normalizeRequirementId(requirementId) {
    return requirementId ? String(requirementId) : '';
  }

  _getStorage() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  _saveStorage(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  _seedDemoRequirements(projectId) {
    const normalizedProjectId = this._normalizeProjectId(projectId);
    const seeded = DEFAULT_DEMO_REQUIREMENTS.map((req, index) => ({
      ...req,
      _id: `${normalizedProjectId}_req_${String(index + 1).padStart(2, '0')}`,
      projectId: normalizedProjectId
    }));

    this._saveStorage(seeded);
    return seeded;
  }

  /**
   * Create requirement
   */
  async createRequirement(projectId, requirementData) {
    await delay();
    const reqs = this._getStorage();
    
    // Check if projectId is passed correctly, sometimes it's passed as first arg in frontend
    const actualData = typeof projectId === 'object' ? projectId : requirementData;
    const actualProjectId = this._normalizeProjectId(projectId);

    const newReq = {
      _id: 'req_' + Math.random().toString(36).substr(2, 9),
      projectId: actualProjectId,
      ...actualData,
      status: 'DRAFT',
      createdAt: new Date().toISOString()
    };
    
    reqs.push(newReq);
    this._saveStorage(reqs);
    return { success: true, data: newReq };
  }

  /**
   * Get requirements by project
   */
  async getRequirements(projectId, page = 1, pageSize = 10) {
    await delay();
    // Dev: lightweight fallback log for requirements fetch
    console.warn('RequirementsService.getRequirements called', { projectId, page, pageSize });
    const normalizedProjectId = this._normalizeProjectId(projectId);
    let reqs = this._getStorage();

    const projectReqs = reqs.filter(r => String(r.projectId) === String(normalizedProjectId));

    if (projectReqs.length === 0) {
      reqs = this._seedDemoRequirements(normalizedProjectId);
      return reqs;
    }

    return projectReqs;
  }

  /**
   * Get requirement by ID
   */
  async getRequirementById(requirementId) {
    await delay();
    const reqs = this._getStorage();
    const normalizedId = this._normalizeRequirementId(requirementId);
    const req = reqs.find(r => this._normalizeRequirementId(r._id) === normalizedId);
    if (!req) throw new Error('Requirement not found');
    return { success: true, data: req };
  }

  /**
   * Update requirement (handles Elaboration, Negotiation, Validation data)
   */
  async updateRequirement(requirementId, updateData) {
    await delay();
    const reqs = this._getStorage();
    const normalizedId = this._normalizeRequirementId(requirementId);
    const index = reqs.findIndex(r => this._normalizeRequirementId(r._id) === normalizedId);
    
    if (index === -1) throw new Error('Requirement not found');
    
    reqs[index] = { ...reqs[index], ...updateData };
    
    // Special handling for negotiation votes
    if (updateData.negotiationVotes) {
       if (!reqs[index].negotiationVotes) reqs[index].negotiationVotes = [];
       // Add the new vote instead of overwriting if it's an array push simulation
       // but here we just merge it into the object for simplicity.
    }
    
    this._saveStorage(reqs);
    return { success: true, data: reqs[index] };
  }

  /**
   * Delete requirement
   */
  async deleteRequirement(requirementId) {
    await delay();
    let reqs = this._getStorage();
    const normalizedId = this._normalizeRequirementId(requirementId);
    reqs = reqs.filter(r => this._normalizeRequirementId(r._id) !== normalizedId);
    this._saveStorage(reqs);
    return { success: true };
  }

  async classifyRequirements(elicitationId) {
    await delay();
    return { success: true };
  }

  async bulkUploadRequirements(formData) {
    await delay();
    return { success: true };
  }

  async moveRequirement(requirementId, newType) {
    return this.updateRequirement(requirementId, { type: newType });
  }

  async reorderRequirements(elicitationId, orderedIds) {
    await delay();
    return { success: true };
  }
}

export const requirementsService = new RequirementsService();
export default requirementsService;

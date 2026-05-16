import { requirementsService } from '../js/services/requirements.service.js';
import { validationService } from '../js/services/validation.service.js';
import { store } from '../js/store/store.js';
import { showToast, showConfirmDialog, showModal, hideModal } from '../js/utils/helpers.js';

export class ValidationPage {
  constructor() {
    this.requirements = [];
    this.validationData = {};
    this.currentReqIndex = 0;
    this.init();
  }

  init() {
    this.attachEventListeners();
    this.loadRequirements();
  }

  attachEventListeners() {
    document.getElementById('btnCreateValidation')?.addEventListener('click', () => this.handleCreateValidation());
    document.getElementById('btnFreezeValidation')?.addEventListener('click', () => this.handleFreezeValidation());
    document.getElementById('btnStartValidation')?.addEventListener('click', () => this.startValidation());
    document.getElementById('btnDeleteValidation')?.addEventListener('click', () => this.openDeleteModal());
    document.getElementById('validationForm')?.addEventListener('submit', (e) => this.handleValidationSubmit(e));
    document.getElementById('deleteValidationForm')?.addEventListener('submit', (e) => this.handleDeleteValidation(e));

    document.querySelectorAll('.rating-btn')?.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('.rating-btn').forEach(b => b.removeAttribute('selected'));
        e.target.setAttribute('selected', 'true');
        document.getElementById('val-rating').value = e.target.dataset.rating;
      });
    });

    // Modal close buttons
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modalId = e.currentTarget.getAttribute('data-close-modal');
        hideModal(modalId);
      });
    });
      });
    });
  }

  async loadRequirements() {
    try {
      // Get current project from store or localStorage
      let projectId = store.state.projects.current?._id || 
                     store.state.projects.current?.id || 
                     store.state.projects.current;
      
      if (!projectId) {
        const savedProject = localStorage.getItem('CURRENT_PROJECT');
        if (savedProject) {
          try {
            const projectData = typeof savedProject === 'string' ? JSON.parse(savedProject) : savedProject;
            projectId = projectData?._id || projectData?.id || projectData;
            store.state.projects.current = projectData;
          } catch (e) {
            console.error('Failed to parse saved project:', e);
          }
        }
      }

      if (!projectId) {
        showToast('Please select a project', 'warning');
        return;
      }

      // Check for active validation phase
      const validation = await validationService.getLatestValidation(projectId);
      
      const btnCreate = document.getElementById('btnCreateValidation');
      const btnFreeze = document.getElementById('btnFreezeValidation');
      const btnStart = document.getElementById('btnStartValidation');
      const container = document.getElementById('validationContainer');

      if (validation) {
        // Hide create, show freeze and start
        if (btnCreate) btnCreate.classList.add('hidden');
        if (btnStart) btnStart.classList.remove('hidden');
        
        if (btnFreeze) {
          if (!validation.isFrozen && !validation.isDeleted) {
            btnFreeze.classList.remove('hidden');
          } else {
            btnFreeze.classList.add('hidden');
            if (btnStart) btnStart.classList.add('hidden'); // Cannot start if frozen
          }
        }

        const btnDelete = document.getElementById('btnDeleteValidation');
        if (btnDelete) {
          if (!validation.isFrozen && !validation.isDeleted) {
            btnDelete.classList.remove('hidden');
          } else {
            btnDelete.classList.add('hidden');
          }
        }

        this.requirements = await requirementsService.getRequirements(projectId);
        this.renderValidationProgress();
        this.renderValidationItems();
      } else {
        // Show create, hide others
        if (btnCreate) btnCreate.classList.remove('hidden');
        if (btnFreeze) btnFreeze.classList.add('hidden');

        const btnDelete = document.getElementById('btnDeleteValidation');
        if (btnDelete) btnDelete.classList.add('hidden');
        if (btnStart) btnStart.classList.add('hidden');
        
        if (container) {
          container.innerHTML = '<div class="empty-state"><p>No Validation phase created yet. Create one to begin.</p></div>';
        }
      }
    } catch (error) {
      showToast(error.message || 'Failed to load requirements', 'error');
    }
  }

  async handleCreateValidation() {
    try {
      let projectId = store.state.projects.current?._id || 
                     store.state.projects.current?.id || 
                     store.state.projects.current;

      const response = await validationService.createValidation(projectId, {});
      if (!response.success) {
        showToast(response.message || 'Failed to create validation phase', 'error');
        return;
      }

      showToast('Validation phase created successfully!', 'success');
      await this.loadRequirements();
    } catch (error) {
      console.error('[Validation] Error creating phase:', error);
      showToast(error.message || 'Failed to create validation phase', 'error');
    }
  }

  async handleFreezeValidation() {
    const confirmed = await showConfirmDialog('Freeze Validation Phase', 'Are you sure you want to freeze this phase? This action cannot be undone and will lock the phase from further edits.');
    if (!confirmed) return;

    try {
      let projectId = store.state.projects.current?._id || 
                     store.state.projects.current?.id || 
                     store.state.projects.current;

      const response = await validationService.freezeValidation(projectId);
      if (!response.success) {
        showToast(response.message || 'Failed to freeze validation phase', 'error');
        return;
      }

      showToast('Validation phase frozen successfully. Project Management can now begin.', 'success');
      await this.loadRequirements(); // Reload the data to update UI state
    } catch (error) {
      console.error('[Validation] Error freezing phase:', error);
      showToast(error.message || 'Failed to freeze validation phase', 'error');
    }
  }

  renderValidationProgress() {
    const validated = this.requirements.filter(r => r.validationData?.isApproved).length;
    const issues = this.requirements.filter(r => r.validationData?.issues).length;

    document.getElementById('valTotal').textContent = this.requirements.length;
    document.getElementById('valValidated').textContent = validated;
    document.getElementById('valIssues').textContent = issues;

    const allApproved = validated === this.requirements.length && this.requirements.length > 0;
    document.getElementById('valStatus').textContent = allApproved ? 'Approved' : 'In Progress';
    document.getElementById('valStatus').className = allApproved ? 'badge success' : 'badge warning';
  }

  renderValidationItems() {
    const container = document.getElementById('validationContainer');
    if (this.requirements.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>No requirements to validate</p></div>';
      return;
    }

    container.innerHTML = this.requirements.map((req, idx) => {
      const valData = req.validationData || {};
      const isApproved = valData.isApproved;
      const score = valData.qualityRating || 0;

      return `
        <div class="validation-item ${isApproved ? 'approved' : ''}" data-index="${idx}">
          <div class="item-header">
            <div class="item-number">${idx + 1}</div>
            <div class="item-content">
              <p class="item-description">${req.description}</p>
              <div class="item-badges">
                <span class="badge">${req.type}</span>
                <span class="badge">${req.priority}</span>
              </div>
            </div>
          </div>
          <div class="item-status">
            ${isApproved ? `
              <div class="approval-badge">
                <span class="approved-check">✓</span> Approved
              </div>
            ` : `
              <button class="btn btn-sm btn-primary validate-btn">Validate</button>
            `}
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.validate-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.closest('.validation-item').dataset.index);
        this.openValidationModal(index);
      });
    });
  }

  openValidationModal(index) {
    this.currentReqIndex = index;
    const req = this.requirements[index];
    const valData = req.validationData || {};

    document.getElementById('valReqPreview').innerHTML = `
      <div class="requirement-details">
        <h4>${req.description}</h4>
        <div class="details-row">
          <span><strong>Type:</strong> ${req.type}</span>
          <span><strong>Priority:</strong> ${req.priority}</span>
          ${req.elaborationDetails?.acceptanceCriteria ? `
            <div class="acceptance">
              <strong>Acceptance Criteria:</strong>
              <pre>${req.elaborationDetails.acceptanceCriteria}</pre>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    // Load saved validation data
    document.getElementById('val-complete').checked = valData.isComplete || false;
    document.getElementById('val-testable').checked = valData.isTestable || false;
    document.getElementById('val-traceable').checked = valData.isTraceable || false;
    document.getElementById('val-consistent').checked = valData.isConsistent || false;
    document.getElementById('val-feasible').checked = valData.isFeasible || false;
    document.getElementById('val-rating').value = valData.qualityRating || '3';
    document.getElementById('val-issues').value = valData.issues || '';
    document.getElementById('val-comments').value = valData.comments || '';
    document.getElementById('val-approved').checked = valData.isApproved || false;

    // Update rating button states
    document.querySelectorAll('.rating-btn').forEach(btn => {
      btn.removeAttribute('selected');
      if (btn.dataset.rating === String(valData.qualityRating || '3')) {
        btn.setAttribute('selected', 'true');
      }
    });

    showModal('validationModal');
  }

  async handleValidationSubmit(event) {
    event.preventDefault();

    const req = this.requirements[this.currentReqIndex];
    const validationData = {
      isComplete: document.getElementById('val-complete').checked,
      isTestable: document.getElementById('val-testable').checked,
      isTraceable: document.getElementById('val-traceable').checked,
      isConsistent: document.getElementById('val-consistent').checked,
      isFeasible: document.getElementById('val-feasible').checked,
      qualityRating: parseInt(document.getElementById('val-rating').value),
      issues: document.getElementById('val-issues').value,
      comments: document.getElementById('val-comments').value,
      isApproved: document.getElementById('val-approved').checked,
      validatedAt: new Date().toISOString(),
      validatedBy: store.getState().userId || 'validator',
    };

    try {
      await requirementsService.updateRequirement(req._id, { validationData });
      showToast('Validation saved', 'success');
      hideModal('validationModal');
      await this.loadRequirements();

      // Move to next unvalidated
      const nextUnvalidated = this.requirements.findIndex((r, idx) => idx > this.currentReqIndex && !r.validationData?.isApproved);
      if (nextUnvalidated !== -1) {
        setTimeout(() => this.openValidationModal(nextUnvalidated), 500);
      }
    } catch (error) {
      showToast(error.message || 'Failed to save validation', 'error');
    }
  }

  startValidation() {
    const unvalidated = this.requirements.findIndex(r => !r.validationData?.isApproved);
    if (unvalidated === -1) {
      showToast('All requirements validated!', 'info');
      return;
    }
    this.openValidationModal(unvalidated);
  }

  openDeleteModal() {
    showModal('deleteValidationModal');
  }

  async handleDeleteValidation(e) {
    e.preventDefault();

    try {
      let projectId = store.state.projects.current?._id || 
                     store.state.projects.current?.id || 
                     store.state.projects.current;

      if (!projectId) {
        showToast('Please select a project', 'warning');
        return;
      }

      const reasonType = document.getElementById('valDeletionReasonType')?.value?.trim() || '';
      const reasonDescription = document.getElementById('valDeletionReasonDescription')?.value?.trim() || '';

      if (!reasonType) {
        showToast('Please select a valid deletion reason', 'error');
        return;
      }

      const deleteData = { deletionReasonType: reasonType };
      if (reasonDescription) deleteData.deletionReasonDescription = reasonDescription;

      const response = await validationService.deleteValidation(projectId, deleteData);

      if (!response.success) {
        showToast(response.message || 'Failed to delete validation phase', 'error');
        return;
      }

      hideModal('deleteValidationModal');
      showToast('Validation phase deleted successfully', 'success');
      setTimeout(() => { window.location.reload(); }, 800);
    } catch (error) {
      console.error('[Validation] Error deleting phase:', error);
      showToast(error.message || 'Failed to delete validation phase', 'error');
    }
  }
}



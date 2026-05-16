import { inceptionService } from '../js/services/inception.service.js';
import { store } from '../js/store/store.js';
import { showToast, showConfirmDialog, showModal, hideModal, formatDate } from '../js/utils/helpers.js';

export class InceptionDetailPage {
  constructor() {
    this.inceptionId = null;
    this.projectId = null;
    this.inception = null;
    this.actionOnLoad = null; // 'delete' or 'edit' to auto-open modal
    this.init();
  }

  init() {
    this.extractIds();
    this.attachEventListeners();
    this.loadInception();
  }

  extractIds() {
    // Extract from hash: #/inception-detail?inception=<id>&project=<projectId>&action=<delete|edit>
    const hash = window.location.hash.substring(2);
    const queryIndex = hash.indexOf('?');
    
    if (queryIndex === -1) {
      this.showError('No inception document specified');
      return;
    }
    
    const queryString = hash.substring(queryIndex + 1);
    const params = new URLSearchParams(queryString);
    this.inceptionId = params.get('inception');
    this.projectId = params.get('project');
    this.actionOnLoad = params.get('action'); // 'delete' or 'edit'
    
    if (!this.inceptionId) {
      this.showError('No inception document specified');
      return;
    }
  }

  showError(message) {
    const loadingState = document.getElementById('loadingState');
    const errorState = document.getElementById('errorState');
    
    if (loadingState) loadingState.classList.add('hidden');
    if (errorState) {
      errorState.classList.remove('hidden');
      const errorMsg = document.getElementById('errorMessage');
      if (errorMsg) errorMsg.textContent = message;
    }
  }

  attachEventListeners() {
    // Modal close buttons
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modalId = e.currentTarget.getAttribute('data-close-modal');
        hideModal(modalId);
      });
    });

    // Edit button
    const btnEdit = document.getElementById('btnEditInception');
    if (btnEdit) {
      btnEdit.addEventListener('click', () => this.openEditModal());
    }

    // Delete button
    const btnDelete = document.getElementById('btnDeleteInception');
    if (btnDelete) {
      btnDelete.addEventListener('click', () => this.openDeleteModal());
    }

    // Freeze button
    const btnFreeze = document.getElementById('btnFreezeInception');
    if (btnFreeze) {
      btnFreeze.addEventListener('click', () => this.handleFreezeInception());
    }

    // Form submissions
    document.getElementById('editInceptionForm')?.addEventListener('submit', (e) => this.handleEditInception(e));
    document.getElementById('deleteInceptionForm')?.addEventListener('submit', (e) => this.handleDeleteInception(e));
  }

  async loadInception() {
    try {
      if (!this.inceptionId) {
        showToast('No inception ID provided. Cannot load document.', 'error');
        return;
      }

      const loadingState = document.getElementById('loadingState');
      const errorState = document.getElementById('errorState');
      
      if (loadingState) loadingState.classList.remove('hidden');
      if (errorState) errorState.classList.add('hidden');

      const response = await inceptionService.getInception(this.inceptionId, this.projectId);
      
      if (!response.success) {
        this.showError(response.message || 'Failed to load inception document');
        return;
      }

      // Backend returns { success, message, data: { inception } }
      this.inception = response.data?.inception || response.data;
      this.renderInception();
      
      // Auto-open modal based on action parameter from URL
      if (this.actionOnLoad === 'delete') {
        console.log('🗑️ Auto-opening delete modal');
        setTimeout(() => this.openDeleteModal(), 300);
      } else if (this.actionOnLoad === 'edit') {
        console.log('✏️ Auto-opening edit modal');
        setTimeout(() => this.openEditModal(), 300);
      }
      
      if (loadingState) loadingState.classList.add('hidden');
    } catch (error) {
      console.error('[InceptionDetail] Error loading inception:', error);
      this.showError(error.message || 'Unable to load inception document');
    }
  }

  renderInception() {
    if (!this.inception) return;

    // Calculate status from boolean fields
    const status = this.inception.isFrozen ? 'Frozen' : (this.inception.isDeleted ? 'Deleted' : 'Active');

    // Update breadcrumb title
    const breadcrumb = document.getElementById('breadcrumbTitle');
    if (breadcrumb) breadcrumb.textContent = 'Inception Document';

    // Update header
    const title = document.getElementById('inceptionTitle');
    if (title) title.textContent = 'Project Inception';

    const statusBadge = document.getElementById('statusBadge');
    if (statusBadge) {
      statusBadge.textContent = status;
      statusBadge.className = `status-badge status-${status.toLowerCase()}`;
    }

    const createdDate = document.getElementById('createdDate');
    if (createdDate) {
      createdDate.textContent = `Created: ${formatDate(this.inception.createdAt) || '—'}`;
    }

    // Update information grid - show all available data
    // Parallel Meetings Setting
    const infoVision = document.getElementById('infoVision');
    if (infoVision) infoVision.textContent = this.inception.allowParallelMeetings ? 'Allowed' : 'Not Allowed';
    
    // Created By
    const infoGoals = document.getElementById('infoGoals');
    if (infoGoals) infoGoals.textContent = this.inception.createdBy || '—';
    
    // Project ID
    const infoObjectives = document.getElementById('infoObjectives');
    if (infoObjectives) infoObjectives.textContent = this.inception.projectId || '—';
    
    // Version (Cycle)
    const infoScope = document.getElementById('infoScope');
    if (infoScope) infoScope.textContent = this.inception.version?.major ? `Cycle ${this.inception.version.major}.${this.inception.version.minor || 0}` : '—';
    
    // Status (Active/Frozen/Deleted)
    const infoScale = document.getElementById('infoScale');
    if (infoScale) infoScale.textContent = status;
    
    // Inception ID
    const infoBeneficiary = document.getElementById('infoBeneficiary');
    if (infoBeneficiary) infoBeneficiary.textContent = this.inception._id || '—';
    
    // Frozen Status
    const infoStakeholders = document.getElementById('infoStakeholders');
    if (infoStakeholders) infoStakeholders.textContent = this.inception.isFrozen ? 'Yes' : 'No';
    
    // Project ID (display)
    const infoProject = document.getElementById('infoProject');
    if (infoProject) infoProject.textContent = this.inception.projectId || '—';
    
    // Document Status
    const infoDocStatus = document.getElementById('infoDocStatus');
    if (infoDocStatus) infoDocStatus.textContent = status;

    // Handle Freeze button visibility
    const btnFreeze = document.getElementById('btnFreezeInception');
    if (btnFreeze) {
      if (this.inception.isFrozen || this.inception.isDeleted) {
        btnFreeze.style.display = 'none';
      } else {
        btnFreeze.style.display = 'inline-flex';
      }
    }
    
    // Handle Edit button visibility
    const btnEdit = document.getElementById('btnEditInception');
    if (btnEdit) {
      if (this.inception.isFrozen || this.inception.isDeleted) {
        btnEdit.style.display = 'none';
      } else {
        btnEdit.style.display = 'inline-flex';
      }
    }

    // Populate edit form with current values
    this.populateEditForm();
  }

  populateEditForm() {
    if (!this.inception) return;

    document.getElementById('editAllowParallelMeetings').checked = this.inception.allowParallelMeetings || false;
  }

  openEditModal() {
    showModal('editInceptionModal');
  }

  openDeleteModal() {
    showModal('deleteInceptionModal');
  }

  async handleEditInception(e) {
    e.preventDefault();

    try {
      const updateData = {
        allowParallelMeetings: document.getElementById('editAllowParallelMeetings').checked
      };

      const response = await inceptionService.updateInception(this.projectId, this.inceptionId, updateData);

      if (!response.success) {
        showToast(response.message || 'Failed to update inception document', 'error');
        return;
      }

      this.inception = response.data?.inception || response.data;
      this.renderInception();
      hideModal('editInceptionModal');
      showToast('Inception document updated successfully', 'success');
    } catch (error) {
      console.error('[InceptionDetail] Error updating inception:', error);
      showToast(error.message || 'Failed to update inception document', 'error');
    }
  }

  async handleDeleteInception(e) {
    e.preventDefault();

    try {
      const reasonType = document.getElementById('deletionReasonType')?.value?.trim() || '';
      const reasonDescription = document.getElementById('deletionReasonDescription')?.value?.trim() || '';

      // Validate reason type - must be non-empty
      if (!reasonType) {
        showToast('Please select a valid deletion reason from the dropdown', 'error');
        return;
      }

      const deleteData = {
        deletionReasonType: reasonType
      };

      // Add description only if provided
      if (reasonDescription) {
        deleteData.deletionReasonDescription = reasonDescription;
      }

      console.log('🗑️ Sending delete request:', { projectId: this.projectId, inceptionId: this.inceptionId, deleteData });

      const response = await inceptionService.deleteInception(this.projectId, this.inceptionId, deleteData);

      if (!response.success) {
        showToast(response.message || 'Failed to delete inception document', 'error');
        return;
      }

      hideModal('deleteInceptionModal');
      showToast('Inception document deleted successfully', 'success');
      
      // Redirect back to list
      setTimeout(() => {
        window.location.hash = '#/inception';
      }, 1000);
    } catch (error) {
      console.error('[InceptionDetail] Error deleting inception:', error);
      showToast(error.message || 'Failed to delete inception document', 'error');
    }
  }

  async handleFreezeInception() {
    const confirmed = await showConfirmDialog('Freeze Inception Phase', 'Are you sure you want to freeze this phase? This action cannot be undone and will lock the document from further edits.');
    if (!confirmed) return;

    try {
      const response = await inceptionService.freezeInception(this.projectId);
      if (!response.success) {
        showToast(response.message || 'Failed to freeze inception phase', 'error');
        return;
      }

      showToast('Inception phase frozen successfully. You can now create the Elicitation phase.', 'success');
      await this.loadInception(); // Reload the data to update UI state
    } catch (error) {
      console.error('[InceptionDetail] Error freezing inception:', error);
      showToast(error.message || 'Failed to freeze inception phase', 'error');
    }
  }
}

import { scopeService } from '../js/services/scope.service.js';
import { store } from '../js/store/store.js';
import { showToast, showConfirmDialog, showModal, hideModal, debounce } from '../js/utils/helpers.js';
import { validateFormData } from '../js/utils/helpers.js';

const SCOPE_FORM_FIELDS = {
  scopeTitle: {
    id: 'scopeTitle',
    label: 'Title',
    required: true,
    validation: (value) => {
      const text = value?.trim() || '';
      if (text.length < 3) return 'Title must be at least 3 characters';
      if (text.length > 200) return 'Title cannot exceed 200 characters';
      return null;
    }
  },
  scopeType: {
    id: 'scopeType',
    label: 'Scope type',
    type: 'select',
    required: true,
    options: ['included', 'excluded', 'constraint']
  },
  scopeDescription: {
    id: 'scopeDescription',
    label: 'Description',
    required: false,
    validation: (value) => {
      const text = value?.trim() || '';
      if (!text) return null;
      if (text.length < 10) return 'Description must be at least 10 characters';
      if (text.length > 2000) return 'Description cannot exceed 2000 characters';
      return null;
    }
  }
};

export class ScopePage {
  constructor() {
    this.scopeItems = [];
    this.editingId = null;
    this.init();
  }

  init() {
    this.attachEventListeners();
    this.loadScope();
  }

  attachEventListeners() {
    document.getElementById('btnAddScope')?.addEventListener('click', () => this.openAddModal());
    document.getElementById('scopeForm')?.addEventListener('submit', (e) => this.handleFormSubmit(e));
    document.getElementById('filterScopeType')?.addEventListener('change', () => this.applyFilters());
    document.getElementById('searchScope')?.addEventListener('input', debounce(() => this.applyFilters(), 300));
  }

  async loadScope() {
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

      const data = await scopeService.getScopesByProject(projectId);
      this.scopeItems = Array.isArray(data) ? data : [];
      this.renderScope();
    } catch (error) {
      showToast(error.message || 'Failed to load scope items', 'error');
      // Initialize with empty array to prevent errors
      this.scopeItems = [];
    }
  }

  renderScope() {
    const included = this.scopeItems.filter(s => s.type === 'IN_SCOPE' || s.type === 'included');
    const excluded = this.scopeItems.filter(s => s.type === 'OUT_SCOPE' || s.type === 'excluded');
    const constraints = this.scopeItems.filter(s => s.type === 'CONSTRAINT' || s.type === 'constraint');

    this.renderSection('includedScope', included);
    this.renderSection('excludedScope', excluded);
    this.renderSection('constraintScope', constraints);

    this.attachItemListeners();
  }

  renderSection(elementId, items) {
    const elem = document.getElementById(elementId);
    if (!elem) return;

    if (items.length === 0) {
      elem.innerHTML = '<div class="empty-placeholder">No items yet</div>';
      return;
    }

    elem.innerHTML = items.map(item => {
      const itemId = item._id || item.id || item.scopeId || '';
      const title = item.title || item.description || 'Untitled Scope';
      const description = item.description && item.description !== title ? item.description : '';
      return `
      <div class="scope-item premium-scope-card" data-id="${itemId}">
        <div class="item-header">
          <div class="item-heading-block">
            <h4 class="item-title">${title}</h4>
            ${description ? `<p class="item-description">${description}</p>` : ''}
          </div>
          <div class="item-actions">
            <button class="btn-icon edit-item" title="Edit Scope">✏️</button>
            <button class="btn-icon delete-item" title="Delete Scope">🗑️</button>
          </div>
        </div>
        ${item.rationale ? `<div class="item-rationale"><strong>Rationale:</strong> ${item.rationale}</div>` : ''}
        ${item.estimatedImpact ? `<div class="item-impact impact-${item.estimatedImpact?.toLowerCase()}">Impact: ${item.estimatedImpact}</div>` : ''}
      </div>
    `;}).join('');
  }

  attachItemListeners() {
    document.querySelectorAll('.scope-item').forEach(item => {
      const id = item.dataset.id;
      if (!id || id === 'undefined') return;
      item.querySelector('.edit-item')?.addEventListener('click', () => this.openEditModal(id));
      item.querySelector('.delete-item')?.addEventListener('click', () => this.deleteScopeItem(id));
    });
  }

  openAddModal() {
    this.editingId = null;
    document.getElementById('scopeForm').reset();
    document.getElementById('scopeModalTitle').textContent = 'Add Scope Item';
    showModal('scopeModal');
  }

  openEditModal(id) {
    const item = this.scopeItems.find(s => (s._id || s.id || s.scopeId) === id);
    if (!item) return;

    this.editingId = id;
    document.getElementById('scopeModalTitle').textContent = 'Edit Scope Item';
    // Map backend enum to form value
    const typeMapping = { 'IN_SCOPE': 'included', 'OUT_SCOPE': 'excluded', 'CONSTRAINT': 'constraint' };
    const formValue = typeMapping[item.type] || item.type;
    document.getElementById('scopeTitle').value = item.title || '';
    document.getElementById('scopeType').value = formValue;
    document.getElementById('scopeDescription').value = item.description || '';
    document.getElementById('scopeRationale').value = item.rationale || '';
    document.getElementById('scopeImpact').value = item.estimatedImpact || '';

    showModal('scopeModal');
  }

  async handleFormSubmit(event) {
    event.preventDefault();

    const formData = {
      scopeTitle: document.getElementById('scopeTitle').value,
      scopeType: document.getElementById('scopeType').value,
      scopeDescription: document.getElementById('scopeDescription').value,
    };

    const validation = validateFormData(formData, SCOPE_FORM_FIELDS);
    if (!validation.isValid) {
      Object.entries(validation.errors).forEach(([field, message]) => {
        const el = document.getElementById(`error-${field}`);
        if (el) el.textContent = message;
      });
      return;
    }

    // Map form values to backend enum values
    const typeMapping = { 'included': 'IN_SCOPE', 'excluded': 'OUT_SCOPE', 'constraint': 'CONSTRAINT' };
    const formType = formData.scopeType;

    const payload = {
      type: typeMapping[formType] || formType,
      title: formData.scopeTitle.trim(),
      description: formData.scopeDescription.trim() || null,
    };

    try {
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
        showToast('Project ID is required', 'error');
        return;
      }
      
      if (this.editingId) {
        await scopeService.updateScope(this.editingId, payload);
        showToast('Scope item updated', 'success');
      } else {
        await scopeService.createScope(projectId, payload);
        showToast('Scope item created', 'success');
      }

      hideModal('scopeModal');
      await this.loadScope();
    } catch (error) {
      showToast(error.message || 'Failed to save scope item', 'error');
    }
  }

  async deleteScopeItem(id) {
    const confirmed = await showConfirmDialog('Delete this scope item?');
    if (!confirmed) return;

    if (!id || id === 'undefined') {
      showToast('Scope ID is missing. Please reload the list and try again.', 'error');
      return;
    }

    try {
      await scopeService.deleteScope(id);
      showToast('Scope item deleted', 'success');
      await this.loadScope();
    } catch (error) {
      if (error?.status === 404) {
        showToast('Scope item not found. Reload the list and try again.', 'error');
        return;
      }
      showToast(error.message || 'Failed to delete', 'error');
    }
  }

  applyFilters() {
    console.log('Filters applied'); // Implement filtering logic
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new ScopePage();
  });
} else {
  new ScopePage();
}

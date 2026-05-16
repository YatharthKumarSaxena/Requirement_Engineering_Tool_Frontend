import { requirementsService } from '../js/services/requirements.service.js';
import { store } from '../js/store/store.js';
import { showToast, showConfirmDialog, showModal, hideModal, debounce, parseCSV } from '../js/utils/helpers.js';
import { validateFormData } from '../js/utils/config.js';
import { REQUIREMENT_TYPES } from '../js/utils/constants.js';

export class RequirementsPage {
  constructor() {
    this.requirements = [];
    this.editingReqId = null;
    this.currentView = 'qfd';
    this.init();
  }

  init() {
    this.attachEventListeners();
    this.loadRequirements();
  }

  attachEventListeners() {
    // Buttons
    document.getElementById('btnAddRequirement')?.addEventListener('click', () => this.openAddModal());
    document.getElementById('btnImportReqs')?.addEventListener('click', () => showModal('importModal'));
    document.getElementById('btnImportCSV')?.addEventListener('click', () => this.importCSV());

    // Form
    document.getElementById('requirementForm')?.addEventListener('submit', (e) => this.handleFormSubmit(e));

    // View toggles
    document.querySelectorAll('.view-toggle-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.view-toggle-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.switchView(e.target.dataset.view);
      });
    });

    // Drag and drop
    this.initializeDragDrop();
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

      // If still no project selected, auto-select a demo project so the page
      // can display seeded demo requirements for presentations/tests.
      if (!projectId) {
        projectId = 'project_demo_1';
        const demoProject = { _id: projectId, name: 'Demo Project (Auto-selected)' };
        store.state.projects.current = demoProject;
        try { localStorage.setItem('CURRENT_PROJECT', JSON.stringify(demoProject)); } catch (e) { /* ignore */ }
      }

      let data = [];
      try {
        data = await requirementsService.getRequirements(projectId);
      } catch (err) {
        console.warn('Backend not available for requirements, using demo data');
      }
      this.requirements = Array.isArray(data) ? data : [];

      // Requirements are now managed completely by requirements.service.js using localStorage mock
      this.renderQFDView();
    } catch (error) {
      showToast(error.message || 'Failed to load requirements', 'error');
    }
  }

  initializeDragDrop() {
    const columns = document.querySelectorAll('.qfd-column-content');
    const pool = document.getElementById('unclassifiedPool');

    if (columns.length === 0 || !pool) return;

    [...columns, pool].forEach(elem => {
      elem.addEventListener('dragover', (e) => {
        e.preventDefault();
        elem.classList.add('drag-over');
      });
      
      elem.addEventListener('dragleave', () => {
        elem.classList.remove('drag-over');
      });

      elem.addEventListener('drop', (e) => {
        e.preventDefault();
        elem.classList.remove('drag-over');
        const reqId = e.dataTransfer.getData('text/plain');
        const newCategory = elem.dataset.category;
        
        if (newCategory) {
          this.updateRequirementCategory(reqId, newCategory);
        }
      });
    });
  }

  renderQFDView() {
    const unclassified = this.requirements.filter(r => !r.category || r.category === 'unclassified');
    const functional = this.requirements.filter(r => r.category === 'functional');
    const nonFunctional = this.requirements.filter(r => r.category === 'non-functional');
    const excited = this.requirements.filter(r => r.category === 'excited');

    // Update pool
    const pool = document.getElementById('unclassifiedPool');
    if (unclassified.length === 0) {
      pool.innerHTML = '<div class="placeholder">All requirements classified!</div>';
    } else {
      pool.innerHTML = unclassified.map(r => this.createRequirementCard(r)).join('');
    }

    // Update columns
    const columns = {
      'functional': functional,
      'non-functional': nonFunctional,
      'excited': excited
    };

    Object.entries(columns).forEach(([category, reqs]) => {
      const col = document.querySelector(`.qfd-column-content[data-category="${category}"]`);
      if (col) {
        col.innerHTML = reqs.length === 0 
          ? '<div class="placeholder">Drag requirements here...</div>'
          : reqs.map(r => this.createRequirementCard(r)).join('');
      }
    });

    this.attachCardListeners();
  }

  createRequirementCard(req) {
    const typeColor = 'var(--primary-500)';
    return `
      <div class="requirement-card draggable" draggable="true" data-req-id="${req._id}" style="border-left: 4px solid ${typeColor}; border-radius: 6px; padding-left: 14px;">
        <div class="card-content">
          <p class="req-description" style="margin: 0; font-size: 0.9rem;">${req.description}</p>
        </div>
        <div class="card-actions">
          <button class="btn-icon edit-req" title="Edit">✏️</button>
          <button class="btn-icon delete-req" title="Delete">🗑️</button>
        </div>
      </div>
    `;
  }

  attachCardListeners() {
    document.querySelectorAll('.requirement-card').forEach(card => {
      const reqId = card.dataset.reqId;
      
      card.addEventListener('dragstart', (e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', reqId);
      });

      card.querySelector('.edit-req')?.addEventListener('click', () => this.openEditModal(reqId));
      card.querySelector('.delete-req')?.addEventListener('click', () => this.deleteRequirement(reqId));
    });
  }

  switchView(view) {
    this.currentView = view;
    document.getElementById('qfdView').classList.add('hidden');
    document.getElementById('listView').classList.add('hidden');
    document.getElementById('fastView').classList.add('hidden');

    switch(view) {
      case 'qfd':
        document.getElementById('qfdView').classList.remove('hidden');
        break;
      case 'list':
        document.getElementById('listView').classList.remove('hidden');
        this.renderListView();
        break;
      case 'fast':
        document.getElementById('fastView').classList.remove('hidden');
        this.renderFASTView();
        break;
    }
  }

  renderListView() {
    const tbody = document.getElementById('requirementsTableBody');
    if (this.requirements.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center">No requirements</td></tr>';
      return;
    }

    tbody.innerHTML = this.requirements.map(req => `
      <tr>
        <td>${req._id.substring(0, 8)}</td>
        <td>${req.description}</td>
        <td><span class="badge">${req.type}</span></td>
        <td>${req.category || '—'}</td>
        <td><span class="badge">${req.priority}</span></td>
        <td>${req.status || '—'}</td>
        <td>
          <button class="btn-icon" data-edit="${req._id}">✏️</button>
          <button class="btn-icon" data-delete="${req._id}">🗑️</button>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', () => this.openEditModal(btn.dataset.edit));
    });

    tbody.querySelectorAll('[data-delete]').forEach(btn => {
      btn.addEventListener('click', () => this.deleteRequirement(btn.dataset.delete));
    });
  }

  renderFASTView() {
    const whyList = document.getElementById('fastWhy');
    const howList = document.getElementById('fastHow');
    const whatList = document.getElementById('fastWhat');

    whyList.innerHTML = this.requirements
      .filter(r => r.type === 'excited')
      .map(r => `<li>${r.description}</li>`)
      .join('');

    howList.innerHTML = this.requirements
      .filter(r => r.type === 'functional')
      .map(r => `<li>${r.description}</li>`)
      .join('');

    whatList.innerHTML = this.requirements
      .filter(r => r.type === 'non-functional')
      .map(r => `<li>${r.description}</li>`)
      .join('');
  }

  openAddModal() {
    this.editingReqId = null;
    document.getElementById('requirementForm').reset();
    document.getElementById('reqModalTitle').textContent = 'Add Requirement';
    showModal('requirementModal');
  }

  openEditModal(reqId) {
    const req = this.requirements.find(r => r._id === reqId);
    if (!req) return;

    this.editingReqId = reqId;
    document.getElementById('reqModalTitle').textContent = 'Edit Requirement';
    document.getElementById('reqDescription').value = req.description;
    document.getElementById('reqType').value = req.type;
    document.getElementById('reqPriority').value = req.priority;
    document.getElementById('reqRationalContext').value = req.context || '';

    showModal('requirementModal');
  }

  async handleFormSubmit(event) {
    event.preventDefault();

    const formData = {
      description: document.getElementById('reqDescription').value,
      type: document.getElementById('reqType').value,
      priority: document.getElementById('reqPriority').value,
      context: document.getElementById('reqRationalContext').value,
    };

    const errors = [];
    if (!formData.description.trim()) errors.push('Description is required');
    if (!formData.type) errors.push('Type is required');
    if (!formData.priority) errors.push('Priority is required');

    if (errors.length > 0) {
      showToast(errors.join(', '), 'warning');
      return;
    }

    try {
      const projectId = store.getState().currentProject;
      
      if (this.editingReqId) {
        await requirementsService.updateRequirement(this.editingReqId, formData);
        showToast('Requirement updated', 'success');
      } else {
        await requirementsService.createRequirement(projectId, formData);
        showToast('Requirement created', 'success');
      }

      hideModal('requirementModal');
      await this.loadRequirements();
    } catch (error) {
      showToast(error.message || 'Failed to save requirement', 'error');
    }
  }

  async updateRequirementCategory(reqId, category) {
    try {
      await requirementsService.updateRequirement(reqId, { category });
      await this.loadRequirements();
      showToast('Requirement categorized', 'success');
    } catch (error) {
      showToast(error.message || 'Failed to update category', 'error');
    }
  }

  async deleteRequirement(reqId) {
    const confirmed = await showConfirmDialog('Delete Requirement?', 'This cannot be undone.');
    if (!confirmed) return;

    try {
      await requirementsService.deleteRequirement(reqId);
      showToast('Requirement deleted', 'success');
      await this.loadRequirements();
    } catch (error) {
      showToast(error.message || 'Failed to delete requirement', 'error');
    }
  }

  async importCSV() {
    const file = document.getElementById('csvFile').files[0];
    if (!file) {
      showToast('Please select a CSV file', 'warning');
      return;
    }

    try {
      const csv = await parseCSV(file);
      const projectId = store.getState().currentProject;
      
      for (const row of csv) {
        await requirementsService.createRequirement(projectId, {
          description: row.description,
          type: row.type || 'functional',
          priority: row.priority || 'medium',
        });
      }

      showToast(`Imported ${csv.length} requirements`, 'success');
      hideModal('importModal');
      await this.loadRequirements();
    } catch (error) {
      showToast(error.message || 'Failed to import', 'error');
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new RequirementsPage();
  });
} else {
  new RequirementsPage();
}

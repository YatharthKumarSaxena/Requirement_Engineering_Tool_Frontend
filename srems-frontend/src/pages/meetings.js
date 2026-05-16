import { meetingsService } from '../js/services/meetings.service.js';
import { store } from '../js/store/store.js';
import { MEETING_PLATFORMS, MEETING_GROUPS, MEETING_STATUSES, MEETING_CANCELLATION_REASONS, ENTITY_TYPES } from '../js/utils/constants.js';

/**
 * Meetings Page Controller
 * 
 * Backend requires entityType for all operations (PLURAL forms):
 * - entityType: inceptions, elicitations, elaborations, negotiations, specifications, validations
 */
class MeetingsPage {
  constructor() {
    this.meetings = [];
    this.filteredMeetings = [];
    this.editingMeetingId = null;
    this.currentMeetingData = null;  // Store data between step 1 and step 2
    this.entityType = 'inceptions';  // Default entity type (PLURAL for backend)
    this.projectId = null;          // Will be loaded from store or localStorage
    this.isSubmittingMeeting = false;  // ✅ Prevent duplicate form submission
    window.meetingsPage = this;     // Required for inline onclick handlers in rendered HTML
    this.init();
  }

  async init() {
    setTimeout(() => {
      this.setupEventListeners();
      this.loadMeetings();
    }, 50);
  }

  setupEventListeners() {
    // Hide modals on init
    const createModal = document.getElementById('createMeetingModal');
    const scheduleModal = document.getElementById('scheduleMeetingModal');
    if (createModal) createModal.classList.remove('show');
    if (scheduleModal) scheduleModal.classList.remove('show');

    // ===== CREATE MODAL EVENTS =====
    // Open create modal on button click
    const createBtn = document.getElementById('createMeetingBtn') || document.getElementById('newMeetingBtn');
    if (createBtn) {
      createBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.openCreateMeetingModal();
      });
    }

    // CREATE form submission
    const createForm = document.getElementById('createMeetingForm');
    if (createForm) {
      createForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleCreateMeetingSubmit();
      });
    }

    // CREATE modal close buttons
    const closeCreateBtn = document.getElementById('closeCreateModal');
    if (closeCreateBtn) {
      closeCreateBtn.addEventListener('click', () => {
        this.cancelCreateMeetingModal();
      });
    }

    const cancelCreateBtn = document.getElementById('cancelCreateBtn');
    if (cancelCreateBtn) {
      cancelCreateBtn.addEventListener('click', () => {
        this.cancelCreateMeetingModal();
      });
    }

    // CREATE modal backdrop click
    const createBackdrop = createModal?.querySelector('.modal-backdrop');
    if (createBackdrop) {
      createBackdrop.addEventListener('click', () => {
        this.cancelCreateMeetingModal();
      });
    }

    // ===== SCHEDULE MODAL EVENTS =====
    // SCHEDULE form submission
    const scheduleForm = document.getElementById('scheduleMeetingForm');
    if (scheduleForm) {
      scheduleForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleScheduleMeetingSubmit();
      });
    }

    // SCHEDULE modal close buttons
    const closeScheduleBtn = document.getElementById('closeScheduleModal');
    if (closeScheduleBtn) {
      closeScheduleBtn.addEventListener('click', () => {
        this.cancelScheduleMeetingModal();
      });
    }

    // SCHEDULE modal back button
    const backToCreateBtn = document.getElementById('backToCreateBtn');
    if (backToCreateBtn) {
      backToCreateBtn.addEventListener('click', () => {
        this.goBackToCreateModal();
      });
    }

    // SCHEDULE modal backdrop click
    const scheduleBackdrop = scheduleModal?.querySelector('.modal-backdrop');
    if (scheduleBackdrop) {
      scheduleBackdrop.addEventListener('click', () => {
        this.cancelScheduleMeetingModal();
      });
    }

    // Search and filters
    const searchBox = document.getElementById('searchMeetings');
    if (searchBox) {
      searchBox.addEventListener('input', () => {
        this.filterMeetings();
      });
    }

    const statusFilter = document.getElementById('filterStatus');
    if (statusFilter) {
      statusFilter.addEventListener('change', () => {
        this.filterMeetings();
      });
    }

    const groupFilter = document.getElementById('filterGroup');
    if (groupFilter) {
      groupFilter.addEventListener('change', () => {
        this.filterMeetings();
      });
    }

    const entityTypeFilter = document.getElementById('filterEntityType');
    if (entityTypeFilter) {
      entityTypeFilter.value = this.entityType;
      entityTypeFilter.addEventListener('change', async (e) => {
        this.entityType = e.target.value || 'inceptions';
        await this.loadMeetings();
      });
    }
  }

  async loadMeetings() {
    try {
      // Get projectId from store or localStorage
      let projectId = store.state?.projects?.current?._id || store.state?.projects?.current?.id || store.state?.projects?.current;
      
      if (!projectId) {
        const savedProject = localStorage.getItem('CURRENT_PROJECT');
        if (savedProject) {
          try {
            const projectData = typeof savedProject === 'string' ? JSON.parse(savedProject) : savedProject;
            projectId = projectData?._id || projectData?.id || projectData;
          } catch (e) {
            console.error('Failed to parse saved project:', e);
          }
        }
      }

      if (!projectId) {
        console.warn('⚠️ No project selected');
        this.meetings = [];
        this.renderMeetings();
        return;
      }

      this.projectId = projectId;
      console.log(`📅 Loading meetings for entityType=${this.entityType}, projectId=${projectId}`);

      // Call service with entityType and projectId
      // Service returns array directly (handles response wrapper internally)
      const meetings = await meetingsService.listMeetings(this.entityType, projectId);
      console.log('✅ API Response received:', meetings);
      
      this.meetings = Array.isArray(meetings) ? meetings : [];
      console.log('📦 Total meetings loaded:', this.meetings.length);
      
      this.filterMeetings();
      this.renderMeetings();
    } catch (error) {
      console.error('❌ Failed to load meetings:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      
      // Show error message to user
      const container = document.getElementById('meetingsList');
      if (container) {
        const errorMsg = error?.message || 'Failed to load meetings';
        const htmlContent = '<div class="empty-state" style="color: #d32f2f;"><div class="empty-icon">⚠️</div><h3>Error Loading Meetings</h3><p>' + errorMsg + '</p><small style="display: block; margin-top: 10px; opacity: 0.7;">Tip: Inception phase may not exist. Create a phase first.</small></div>';
        container.innerHTML = htmlContent;
      }
      this.meetings = [];
    }
  }

  filterMeetings() {
    const search = document.getElementById('searchMeetings')?.value?.toLowerCase() || '';
    const statusFilter = document.getElementById('filterStatus')?.value || '';
    const groupFilter = document.getElementById('filterGroup')?.value || '';

    console.log('🔍 [filterMeetings] search:', search, 'status:', statusFilter, 'group:', groupFilter);
    console.log('📦 Total meetings:', this.meetings.length);

    this.filteredMeetings = this.meetings.filter(meeting => {
      const matchesSearch = !search || 
        (meeting.title || '').toLowerCase().includes(search) ||
        (meeting.description || '').toLowerCase().includes(search);
      
      const matchesStatus = !statusFilter || meeting.status === statusFilter;
      const matchesGroup = !groupFilter || meeting.meetingGroup === groupFilter;

      return matchesSearch && matchesStatus && matchesGroup;
    });

    console.log('✅ Filtered to:', this.filteredMeetings.length, 'meetings');
    this.renderMeetings();
  }

  renderMeetings() {
    const container = document.getElementById('meetingsList');
    
    console.log('🎨 [renderMeetings] Container found:', !!container, 'Meetings count:', this.filteredMeetings.length);
    console.log('📊 Filtered meetings:', this.filteredMeetings);
    
    if (!container) {
      console.error('❌ meetingsList container not found in HTML!');
      return;
    }

    if (!Array.isArray(this.filteredMeetings) || this.filteredMeetings.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📅</div>
          <h3>No Meetings</h3>
          <p>No meetings scheduled yet. Click "Schedule Meeting" to create one.</p>
        </div>
      `;
      console.log('📭 No meetings to display');
      return;
    }

    container.innerHTML = this.filteredMeetings.map(meeting => `
      <div class="meeting-card premium-card">
        <div class="card-header-enhanced">
          <div class="card-title-section">
            <h3 class="card-title">${meeting.title}</h3>
            <span class="card-status-tag ${meeting.status?.toLowerCase() || 'draft'}">${meeting.status || 'DRAFT'}</span>
          </div>
          <div class="phase-badge">
            ${meeting.meetingGroup || 'General'}
          </div>
        </div>
        <div class="card-body" style="padding: 0;">
          <div class="card-details-grid">
            <div class="detail-item">
              <span class="detail-label">📅 Scheduled</span>
              <span class="detail-value" ${meeting.scheduledAt ? '' : 'style="opacity: 0.5;"'}>
                ${meeting.scheduledAt ? new Date(meeting.scheduledAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Not set'}
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-label">⏱️ Duration</span>
              <span class="detail-value">${meeting.expectedDuration || 60} min</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">🌐 Platform</span>
              <span class="detail-value">${meeting.platform || 'General'}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">👥 Participants</span>
              <span class="detail-value">${meeting.participants?.length || 0}</span>
            </div>
          </div>
          
          ${meeting.meetingLink ? `
            <div class="card-meta-row" style="padding: 1rem 2rem; border-bottom: 1px solid rgba(226, 232, 240, 0.5);">
              <div class="meta-item">
                <span class="meta-icon">🔗</span>
                <span class="meta-text"><a href="${meeting.meetingLink}" target="_blank" style="color: #0ea5e9; text-decoration: none; font-weight: 600;">Join Meeting</a></span>
              </div>
            </div>
          ` : ''}

          ${meeting.description ? `
            <div class="card-description" style="margin: 1rem 0; padding: 0 2rem;">
              ${meeting.description}
            </div>
          ` : '<div style="margin-bottom: 1rem;"></div>'}
        </div>
        
        <div class="card-actions-group">
          ${meeting.status === 'DRAFT' ? `
            <button class="btn-action" onclick="window.meetingsPage.scheduleMeeting('${meeting._id}')">
              <span style="font-size: 1.2rem;">📅</span> Schedule
            </button>
            <button class="btn-action" onclick="window.meetingsPage.editMeeting('${meeting._id}')">
              <span style="font-size: 1.2rem;">✏️</span> Edit
            </button>
          ` : ''}
          ${meeting.status === 'SCHEDULED' ? `
            <button class="btn-action" onclick="window.meetingsPage.startMeeting('${meeting._id}')" style="color: #059669; border-color: #34d399;">
              <span style="font-size: 1.2rem;">▶️</span> Start
            </button>
            <button class="btn-action" onclick="window.meetingsPage.rescheduleMeeting('${meeting._id}')">
              <span style="font-size: 1.2rem;">🔄</span> Reschedule
            </button>
          ` : ''}
          ${meeting.status === 'ONGOING' ? `
            <button class="btn-action" onclick="window.meetingsPage.endMeeting('${meeting._id}')" style="color: #ea580c; border-color: #fb923c;">
              <span style="font-size: 1.2rem;">⏹️</span> End
            </button>
          ` : ''}
          ${(meeting.status === 'DRAFT' || meeting.status === 'SCHEDULED') ? `
            <button class="btn-action" onclick="window.meetingsPage.cancelMeeting('${meeting._id}')" style="color: #e11d48; border-color: #f43f5e;">
              <span style="font-size: 1.2rem;">❌</span> Cancel
            </button>
          ` : ''}
          ${(meeting.status === 'SCHEDULED' || meeting.status === 'ONGOING') ? `
            <button class="btn-action" onclick="window.meetingsPage.freezeMeeting('${meeting._id}')" style="color: #0284c7; border-color: #38bdf8;">
              <span style="font-size: 1.2rem;">❄️</span> Freeze
            </button>
          ` : ''}
        </div>
      </div>
    `).join('');

    // ✅ NEW: Save Meeting ID to localStorage when clicked
    document.querySelectorAll('.meeting-card').forEach(card => {
      card.addEventListener('click', (e) => {
        // Don't trigger on button clicks
        if (e.target.closest('button')) return;

        const titleEl = card.querySelector('h3');
        const badgeEl = card.querySelector('.badge');
        
        // Find the meeting data from the rendered card
        const title = titleEl?.textContent || 'Unknown Meeting';
        const status = badgeEl?.textContent || 'DRAFT';
        
        // Find the corresponding meeting in our data to get the ID
        const meeting = this.filteredMeetings.find(m => m.title === title);
        if (meeting) {
          localStorage.setItem('CURRENT_MEETING', meeting._id);
          localStorage.setItem('CURRENT_MEETING_TITLE', meeting.title);
          console.log(`✅ [Meetings] Saved: ${meeting.title} (ID: ${meeting._id.substring(0, 8)}...)`);
          
          // Highlight selected card
          document.querySelectorAll('.meeting-card').forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
        }
      });
    });
  }

  openCreateMeetingModal() {
    this.currentMeetingData = null;  // Reset
    const form = document.getElementById('createMeetingForm');
    if (form) form.reset();
    
    const modal = document.getElementById('createMeetingModal');
    if (modal) modal.classList.add('show');
    
    console.log('✅ Opening CREATE Meeting modal');
  }

  closeCreateMeetingModal() {
    // DO NOT CLEAR DATA - we might be transitioning to next step!
    const modal = document.getElementById('createMeetingModal');
    if (modal) modal.classList.remove('show');
    console.log('❌ Closed CREATE Meeting modal');
  }

  cancelCreateMeetingModal() {
    // Clear data when actually cancelling (not transitioning)
    this.closeCreateMeetingModal();
    this.currentMeetingData = null;
    const form = document.getElementById('createMeetingForm');
    if (form) form.reset();
    console.log('❌ CANCELLED CREATE Meeting');
  }

  async handleCreateMeetingSubmit() {
    try {
      // Get form values
      const titleVal = document.getElementById('createTitle')?.value?.trim();
      const groupVal = document.getElementById('createGroup')?.value;
      const platformVal = document.getElementById('createPlatform')?.value;
      const descriptionVal = document.getElementById('createDescription')?.value?.trim();

      // Validate required fields
      if (!titleVal) {
        alert('❌ Meeting title is required');
        return;
      }
      if (!groupVal) {
        alert('❌ Meeting group is required');
        return;
      }
      if (!platformVal) {
        alert('❌ Platform is required');
        return;
      }

      if (!this.projectId) {
        alert('⚠️ No project selected. Please go back and select a project.');
        return;
      }

      const meetingData = {
        title: titleVal,
        meetingGroup: groupVal,
        platform: platformVal,
        ...(descriptionVal && { description: descriptionVal })
      };

      // Store data for step 2
      this.currentMeetingData = meetingData;

      // Close create modal
      this.closeCreateMeetingModal();

      // Open schedule modal
      console.log('📋 Meeting data saved, opening SCHEDULE modal...');
      setTimeout(() => {
        this.openScheduleMeetingModal();
      }, 300);

    } catch (error) {
      console.error('❌ Failed in CREATE step:', error);
      alert(`❌ Error: ${error.message}`);
    }
  }

  openScheduleMeetingModal() {
    const form = document.getElementById('scheduleMeetingForm');
    if (form) form.reset();
    
    const modal = document.getElementById('scheduleMeetingModal');
    if (modal) modal.classList.add('show');
    
    // Focus on date input
    setTimeout(() => {
      document.getElementById('scheduleDateTime')?.focus();
    }, 100);

    console.log('✅ Opening SCHEDULE Meeting modal');
  }

  closeScheduleMeetingModal() {
    // DO NOT CLEAR DATA - we might be going back!
    const modal = document.getElementById('scheduleMeetingModal');
    if (modal) modal.classList.remove('show');
    console.log('❌ Closed SCHEDULE Meeting modal');
  }

  cancelScheduleMeetingModal() {
    // Clear data when actually cancelling
    this.closeScheduleMeetingModal();
    this.currentMeetingData = null;
    const form = document.getElementById('scheduleMeetingForm');
    if (form) form.reset();
    console.log('❌ CANCELLED SCHEDULE Meeting');
  }

  goBackToCreateModal() {
    console.log('⬅️ Going back to CREATE modal...');
    this.closeScheduleMeetingModal();
    setTimeout(() => {
      this.openCreateMeetingModal();
      // Restore form data
      if (this.currentMeetingData) {
        document.getElementById('createTitle').value = this.currentMeetingData.title || '';
        document.getElementById('createGroup').value = this.currentMeetingData.meetingGroup || '';
        document.getElementById('createPlatform').value = this.currentMeetingData.platform || '';
        document.getElementById('createDescription').value = this.currentMeetingData.description || '';
      }
    }, 300);
  }

  async handleScheduleMeetingSubmit() {
    try {
      // ✅ Prevent duplicate submission
      if (this.isSubmittingMeeting) {
        console.warn('⚠️ Meeting submission already in progress - ignoring duplicate submission');
        return;
      }
      this.isSubmittingMeeting = true;
      console.log('🔒 Meeting submission lock enabled');

      if (!this.currentMeetingData) {
        alert('❌ Meeting data not found. Please start over.');
        this.closeScheduleMeetingModal();
        this.isSubmittingMeeting = false;  // ✅ Release lock
        return;
      }

      // Get schedule form values
      const dateTimeVal = document.getElementById('scheduleDateTime')?.value;
      const linkVal = document.getElementById('scheduleLink')?.value?.trim();
      const passwordVal = document.getElementById('schedulePassword')?.value?.trim();

      // Validate required fields
      if (!dateTimeVal) {
        alert('❌ Date & Time is required');
        return;
      }
      if (!linkVal) {
        alert('❌ Meeting link is required');
        return;
      }

      if (!this.projectId) {
        alert('⚠️ Project not found. Please refresh and try again.');
        return;
      }

      console.log('🔄 Creating meeting...');
      // Step 1: CREATE meeting
      const createResponse = await meetingsService.createMeeting(
        this.entityType,
        this.projectId,
        this.currentMeetingData
      );

      let newMeetingId = null;

      if (createResponse?.success) {
        const createdMeeting =
          createResponse.data?.meeting ||
          createResponse.data?.data?.meeting ||
          createResponse.data?.data ||
          createResponse.data;
        newMeetingId = createdMeeting?._id || createdMeeting?.id || null;

        if (!newMeetingId) {
          console.error('❌ Cannot extract meeting ID. Full response:', createResponse);
          throw new Error('Failed to extract meeting ID from response');
        }

        console.log('✅ Meeting created:', createResponse);
      } else {
        const createMessage = createResponse?.message || 'Failed to create meeting';
        const isParallelConflict = createResponse?.status === 409 &&
          createMessage.toLowerCase().includes('parallel meetings are disabled');

        if (!isParallelConflict) {
          throw new Error(createMessage);
        }

        // Fallback: reuse existing draft meeting when parallel meetings are disabled.
        const existingMeetings = await meetingsService.listMeetings(this.entityType, this.projectId);
        const draftMeeting = existingMeetings.find(m =>
          m &&
          (m.status === 'DRAFT' || !m.status) &&
          !m.scheduledAt
        );

        if (!draftMeeting?._id) {
          throw new Error('Parallel meetings are disabled. Please complete/cancel existing meeting first.');
        }

        newMeetingId = draftMeeting._id;
        console.warn('⚠️ Using existing draft meeting due to parallel-meeting restriction:', newMeetingId);
      }

      console.log(`📌 New Meeting ID: ${newMeetingId}`);

      // Step 2: SCHEDULE the meeting
      console.log('🔄 Scheduling meeting...');
      const scheduleData = {
        scheduledAt: new Date(dateTimeVal).toISOString(),
        meetingLink: linkVal,
        ...(passwordVal && { meetingPassword: passwordVal })
      };

      const scheduleResponse = await meetingsService.scheduleMeeting(
        this.entityType,
        newMeetingId,
        scheduleData
      );

      if (!scheduleResponse?.success) {
        throw new Error(scheduleResponse?.message || 'Failed to schedule meeting');
      }

      console.log('✅ Meeting scheduled:', scheduleResponse);

      // Success! Clear data and reload
      this.currentMeetingData = null;
      this.closeScheduleMeetingModal();
      alert('✅ Meeting scheduled successfully!');

      // Reload meetings
      await this.loadMeetings();

    } catch (error) {
      console.error('❌ Failed in SCHEDULE step:', error);
      alert(`❌ Error: ${error.message}`);
    } finally {
      this.isSubmittingMeeting = false;  // ✅ Always release lock
      console.log('🔓 Meeting submission lock released');
    }
  }

  async rescheduleMeeting(meetingId) {
    try {
      // Show reschedule modal to get all required fields
      this.showRescheduleModal(meetingId);
    } catch (error) {
      console.error('Failed to reschedule:', error);
      alert(`Failed to reschedule meeting: ${error.message}`);
    }
  }

  showRescheduleModal(meetingId) {
    const meeting = this.meetings.find(m => m._id === meetingId);
    if (!meeting) {
      alert('Meeting not found');
      return;
    }

    // Get or create reschedule modal
    let modal = document.getElementById('rescheduleModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'rescheduleModal';
      modal.className = 'modal';
      modal.innerHTML = `
        <div class="modal-content">
          <div class="modal-header">
            <h2>Reschedule Meeting</h2>
            <button type="button" class="close" id="closeRescheduleModal">&times;</button>
          </div>
          <div class="modal-body">
            <form id="rescheduleForm">
              <div class="form-group">
                <label for="rescheduledAt">New Date & Time *</label>
                <input type="datetime-local" id="rescheduledAt" required>
              </div>
              <div class="form-group">
                <label for="newMeetingLink">Meeting Link *</label>
                <input type="url" id="newMeetingLink" placeholder="https://zoom.us/j/..." required>
              </div>
              <div class="form-group">
                <label for="newMeetingPassword">Meeting Password</label>
                <input type="text" id="newMeetingPassword" placeholder="Optional password">
              </div>
              <div class="form-group">
                <label for="newPlatform">Platform</label>
                <select id="newPlatform">
                  <option value="">Keep Existing Platform</option>
                  <option value="ZOOM">ZOOM</option>
                  <option value="TEAMS">TEAMS</option>
                  <option value="GOOGLE_MEET">GOOGLE_MEET</option>
                  <option value="OTHER">OTHER</option>
                </select>
              </div>
              <button type="submit" class="btn btn-primary">Reschedule</button>
              <button type="button" class="btn btn-secondary" id="cancelRescheduleBtn">Cancel</button>
            </form>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }

    const toDateTimeLocal = (isoValue) => {
      if (!isoValue) return '';
      const d = new Date(isoValue);
      if (Number.isNaN(d.getTime())) return '';
      const pad = (num) => String(num).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    document.getElementById('rescheduledAt').value = toDateTimeLocal(meeting.scheduledAt);
    document.getElementById('newMeetingLink').value = meeting.meetingLink || '';
    document.getElementById('newMeetingPassword').value = meeting.meetingPassword || '';
    document.getElementById('newPlatform').value = meeting.platform || '';

    // Setup event listeners
    modal.querySelector('#rescheduleForm').onsubmit = async (e) => {
      e.preventDefault();
      const scheduledAtEl = document.getElementById('rescheduledAt').value;
      const meetingLink = document.getElementById('newMeetingLink').value;
      const meetingPassword = document.getElementById('newMeetingPassword').value;
      const platform = document.getElementById('newPlatform').value;

      if (!scheduledAtEl || !meetingLink) {
        alert('Date & Time and Meeting Link are required');
        return;
      }

      const scheduledDate = new Date(scheduledAtEl);
      if (Number.isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
        alert('Please select a future date and time');
        return;
      }

      try {
        const rescheduleData = {
          scheduledAt: scheduledDate.toISOString(),
          meetingLink: meetingLink,
          ...(meetingPassword && { meetingPassword }),
          ...(platform && { platform })
        };

        const response = await meetingsService.rescheduleMeeting(this.entityType, meetingId, rescheduleData);
        if (!response?.success) {
          throw new Error(response?.message || 'Failed to reschedule meeting');
        }

        console.log('✅ Meeting rescheduled:', response);
        alert('Meeting rescheduled successfully!');
        modal.classList.remove('show');
        await this.loadMeetings();
      } catch (error) {
        console.error('Failed to reschedule:', error);
        alert(`Failed to reschedule: ${error.message}`);
      }
    };

    document.getElementById('closeRescheduleModal').onclick = () => {
      modal.classList.remove('show');
    };
    document.getElementById('cancelRescheduleBtn').onclick = () => {
      modal.classList.remove('show');
    };

    modal.classList.add('show');
  }

  async cancelMeeting(meetingId) {
    try {
      const reasonOptions = Object.values(MEETING_CANCELLATION_REASONS).join(', ');
      const reason = prompt(`Enter cancellation reason type (${reasonOptions}):`, 'OTHER');
      if (!reason) return;

      const normalizedReason = reason.trim().toUpperCase();
      if (!MEETING_CANCELLATION_REASONS[normalizedReason]) {
        alert(`Invalid reason. Use one of: ${reasonOptions}`);
        return;
      }

      const cancelDescription = prompt('Enter cancellation description (optional):') || '';

      const cancelData = {
        cancelReason: normalizedReason,
        ...(cancelDescription.trim() && { cancelDescription: cancelDescription.trim() })
      };

      // Pass entityType and meetingId
      const response = await meetingsService.cancelMeeting(this.entityType, meetingId, cancelData);
      if (!response?.success) {
        throw new Error(response?.message || 'Failed to cancel meeting');
      }

      console.log('✅ Meeting cancelled:', response);
      alert('Meeting cancelled successfully!');
      await this.loadMeetings();
    } catch (error) {
      console.error('Failed to cancel:', error);
      alert(`Failed to cancel meeting: ${error.message}`);
    }
  }

  async startMeeting(meetingId) {
    try {
      // Pass entityType and meetingId
      const response = await meetingsService.startMeeting(this.entityType, meetingId, {});
      if (!response?.success) {
        throw new Error(response?.message || 'Failed to start meeting');
      }

      console.log('✅ Meeting started:', response);
      alert('Meeting started successfully!');
      await this.loadMeetings();
    } catch (error) {
      console.error('Failed to start:', error);
      alert(`Failed to start meeting: ${error.message}`);
    }
  }

  async endMeeting(meetingId) {
    try {
      // Pass entityType and meetingId
      const response = await meetingsService.endMeeting(this.entityType, meetingId, {});
      if (!response?.success) {
        throw new Error(response?.message || 'Failed to end meeting');
      }

      console.log('✅ Meeting ended:', response);
      alert('Meeting ended successfully!');
      await this.loadMeetings();
    } catch (error) {
      console.error('Failed to end:', error);
      alert(`Failed to end meeting: ${error.message}`);
    }
  }

  async freezeMeeting(meetingId) {
    try {
      // Pass entityType and meetingId
      const response = await meetingsService.freezeMeeting(this.entityType, meetingId, {});
      if (!response?.success) {
        throw new Error(response?.message || 'Failed to freeze meeting');
      }

      console.log('✅ Meeting frozen:', response);
      alert('Meeting frozen successfully!');
      await this.loadMeetings();
    } catch (error) {
      console.error('Failed to freeze:', error);
      alert(`Failed to freeze meeting: ${error.message}`);
    }
  }

  async editMeeting(meetingId) {
    try {
      // Find the meeting
      const meeting = this.meetings.find(m => m._id === meetingId);
      if (!meeting) {
        alert('Meeting not found');
        return;
      }

      // Get or create edit modal
      let modal = document.getElementById('editMeetingModal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'editMeetingModal';
        modal.className = 'modal';
        modal.innerHTML = `
          <div class="modal-content">
            <div class="modal-header">
              <h2>Edit Meeting</h2>
              <button type="button" class="close" id="closeEditModal">&times;</button>
            </div>
            <div class="modal-body">
              <form id="editMeetingForm">
                <div class="form-group">
                  <label for="editTitle">Title *</label>
                  <input type="text" id="editTitle" placeholder="Meeting title" required>
                </div>
                <div class="form-group">
                  <label for="editGroup">Meeting Group *</label>
                  <select id="editGroup" required>
                    <option value="">Select group</option>
                    <option value="GENERAL">GENERAL</option>
                    <option value="AUTH">AUTH</option>
                    <option value="PAYMENT">PAYMENT</option>
                    <option value="NOTIFICATION">NOTIFICATION</option>
                    <option value="SEARCH">SEARCH</option>
                    <option value="ANALYTICS">ANALYTICS</option>
                    <option value="USER_MANAGEMENT">USER_MANAGEMENT</option>
                    <option value="ORDER_MANAGEMENT">ORDER_MANAGEMENT</option>
                    <option value="INVENTORY">INVENTORY</option>
                    <option value="BILLING">BILLING</option>
                    <option value="THIRD_PARTY">THIRD_PARTY</option>
                    <option value="API">API</option>
                    <option value="INTEGRATION">INTEGRATION</option>
                    <option value="PERFORMANCE">PERFORMANCE</option>
                    <option value="SECURITY">SECURITY</option>
                    <option value="DATABASE">DATABASE</option>
                    <option value="INFRASTRUCTURE">INFRASTRUCTURE</option>
                    <option value="REQUIREMENTS">REQUIREMENTS</option>
                    <option value="DESIGN">DESIGN</option>
                    <option value="REVIEW">REVIEW</option>
                    <option value="PLANNING">PLANNING</option>
                    <option value="BUG_FIX">BUG_FIX</option>
                    <option value="ENHANCEMENT">ENHANCEMENT</option>
                  </select>
                </div>
                <div class="form-group">
                  <label for="editPlatform">Platform *</label>
                  <select id="editPlatform" required>
                    <option value="">Select platform</option>
                    <option value="ZOOM">ZOOM</option>
                    <option value="TEAMS">TEAMS</option>
                    <option value="GOOGLE_MEET">GOOGLE_MEET</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                </div>
                <div class="form-group">
                  <label for="editDescription">Description</label>
                  <textarea id="editDescription" placeholder="Meeting description" rows="3"></textarea>
                </div>
                <button type="submit" class="btn btn-primary">Save Changes</button>
                <button type="button" class="btn btn-secondary" id="cancelEditBtn">Cancel</button>
              </form>
            </div>
          </div>
        `;
        document.body.appendChild(modal);
      }

      // Populate form with current data
      document.getElementById('editTitle').value = meeting.title || '';
      document.getElementById('editGroup').value = meeting.meetingGroup || 'GENERAL';
      document.getElementById('editPlatform').value = meeting.platform || 'GOOGLE_MEET';
      document.getElementById('editDescription').value = meeting.description || '';

      // Setup event listeners
      modal.querySelector('#editMeetingForm').onsubmit = async (e) => {
        e.preventDefault();
        try {
          const titleVal = document.getElementById('editTitle').value?.trim();
          const groupVal = document.getElementById('editGroup').value;
          const platformVal = document.getElementById('editPlatform').value;
          const descriptionVal = document.getElementById('editDescription').value?.trim();

          if (!titleVal) {
            alert('Title is required');
            return;
          }
          if (!groupVal) {
            alert('Meeting group is required');
            return;
          }
          if (!platformVal) {
            alert('Platform is required');
            return;
          }

          const updateData = {
            title: titleVal,
            meetingGroup: groupVal,
            platform: platformVal,
            ...(descriptionVal && { description: descriptionVal })
          };

          const response = await meetingsService.updateMeeting(this.entityType, meetingId, updateData);
          if (!response?.success) {
            throw new Error(response?.message || 'Failed to update meeting');
          }

          console.log('✅ Meeting updated:', response);
          alert('Meeting updated successfully!');
          modal.classList.remove('show');
          await this.loadMeetings();
        } catch (error) {
          console.error('Failed to update meeting:', error);
          alert(`Failed to update meeting: ${error.message}`);
        }
      };

      document.getElementById('closeEditModal').onclick = () => {
        modal.classList.remove('show');
      };
      document.getElementById('cancelEditBtn').onclick = () => {
        modal.classList.remove('show');
      };

      modal.classList.add('show');
    } catch (error) {
      console.error('Failed to open edit modal:', error);
      alert(`Failed to edit meeting: ${error.message}`);
    }
  }

  scheduleMeeting(meetingId) {
    const meeting = this.meetings.find(m => m._id === meetingId);
    if (!meeting) {
      alert('Meeting not found');
      return;
    }

    if (meeting.status !== 'DRAFT') {
      alert(`Only DRAFT meetings can be scheduled. Current status: ${meeting.status}`);
      return;
    }

    this.currentMeetingData = {
      title: meeting.title,
      meetingGroup: meeting.meetingGroup,
      platform: meeting.platform,
      description: meeting.description || ''
    };

    this.openScheduleMeetingModal();
  }
}

// Export class for app.js to initialize when page loads
export { MeetingsPage };

/**
 * Dashboard Module
 * Manages admin panel dashboard functionality, data loading, and state management
 * Integrated with Project dashboard via token synchronization
 * Features: Operation queuing, loading states, error recovery
 */

/**
 * Dashboard state object
 * Stores cached data from admin panel API
 * @type {Object}
 */
let dashboardData = {
  admins: [],
  users: [],
  organizations: [],
  devices: [],
  activities: [],
};

/**
 * Operation state management
 * Prevents concurrent operations and tracks loading states
 */
const operationState = {
  isLoading: false,
  currentOperation: null,
  operationQueue: [],
  activeOperations: new Map(), // Track operations by section
  lastLoadTime: {},
  loadingTimeouts: new Map(),

  /**
   * Add operation to queue
   * @param {string} operationType - Type of operation (load, create, update, delete)
   * @param {string} section - Section affected (admins, users, etc.)
   * @param {Function} operation - Async operation function
   */
  async executeOperation(operationType, section, operation) {
    const operationId = `${section}-${operationType}-${Date.now()}`;

    // Check if section is already processing
    if (this.activeOperations.has(section)) {
      console.warn(`⏳ Operation already in progress for ${section}, queuing...`);
      this.operationQueue.push({ operationId, section, operation });
      return;
    }

    try {
      this.activeOperations.set(section, operationId);
      console.log(`🔄 Starting ${operationType} operation for ${section}`);

      const result = await operation();

      console.log(`✅ Completed ${operationType} operation for ${section}`);
      return result;
    } catch (error) {
      console.error(`❌ Failed ${operationType} operation for ${section}:`, error);
      throw error;
    } finally {
      this.activeOperations.delete(section);

      // Process next queued operation
      const nextOp = this.operationQueue.shift();
      if (nextOp) {
        this.executeOperation('queued', nextOp.section, nextOp.operation);
      }
    }
  },

  /**
   * Mark section as loading with visual feedback
   */
  startLoading(section) {
    const loadingEl = document.querySelector(`[data-section="${section}"]`);
    if (loadingEl) {
      loadingEl.classList.add('loading');
      loadingEl.style.opacity = '0.6';
      loadingEl.style.pointerEvents = 'none';
    }
  },

  /**
   * Remove loading state
   */
  stopLoading(section) {
    const loadingEl = document.querySelector(`[data-section="${section}"]`);
    if (loadingEl) {
      loadingEl.classList.remove('loading');
      loadingEl.style.opacity = '1';
      loadingEl.style.pointerEvents = 'auto';
    }
  },

  /**
   * Check if data needs refresh (cache invalidation)
   */
  shouldRefresh(section, maxAgeMs = 60000) {
    const lastLoad = this.lastLoadTime[section] || 0;
    return (Date.now() - lastLoad) > maxAgeMs;
  },

  /**
   * Update last load time for section
   */
  updateLoadTime(section) {
    this.lastLoadTime[section] = Date.now();
  }
};

/**
 * Authenticates admin user
 * Supports both token formats (accessToken from Project, adminAuthToken from Admin Panel)
 * Creates fallback admin object when coming from Project dashboard
 * @returns {Object|null} Admin object with email and fullName, or null if not authenticated
 */
function checkAdminAuth() {
  const token = localStorage.getItem('adminAuthToken') || localStorage.getItem('accessToken');

  // Only token is required - adminData is optional (may not exist when redirecting from Project)
  if (!token) {
    console.warn('🔓 No authentication token found');
    return null;
  }

  // Try to get admin data, fallback to basic admin object if not available
  let adminData = localStorage.getItem('adminData');
  if (!adminData) {
    // When coming from Project, adminData won't exist initially
    // Create a minimal admin object from token for seamless integration
    console.log('ℹ️ Admin data not in localStorage - Will be loaded from API on demand');
    return {
      email: 'Admin',
      fullName: 'Admin User'
    };
  }

  try {
    return JSON.parse(adminData);
  } catch (e) {
    console.error('❌ Invalid admin data in localStorage:', e);
    // Return fallback even if JSON parse fails - ensures dashboard doesn't break
    return {
      email: 'Admin',
      fullName: 'Admin User'
    };
  }
}

/**
 * Logout admin user completely
 * Clears all admin credentials and returns to Project login
 */
function logoutAdmin() {
  console.log('🚪 Logging out admin completely...');

  // Clear ALL admin-related data
  localStorage.removeItem('adminAuthToken');
  localStorage.removeItem('adminRefreshToken');
  localStorage.removeItem('adminData');

  // NOTE: Keep accessToken and deviceUUID for potential future Project dashboard login
  // This allows seamless return to Project dashboard

  // Show success message
  showNotification('✓ Logged out successfully. Redirecting...', 'success', 1500);

  // Redirect to Project login page after short delay
  setTimeout(() => {
    // Redirect to Project index/login page - complete logout
    window.location.href = 'http://127.0.0.1:5500/PROJECT/project/auth/login.html';
  }, 1000);
}

// Show notification
function showNotification(message, type = 'success', duration = 3000) {
  const notification = document.getElementById('notification') || (() => {
    const div = document.createElement('div');
    div.id = 'notification';
    document.body.appendChild(div);
    return div;
  })();

  notification.textContent = message;
  notification.className = `notification show ${type}`;
  notification.style.position = 'fixed';
  notification.style.bottom = '20px';
  notification.style.right = '20px';
  notification.style.padding = '15px 20px';
  notification.style.borderRadius = '8px';
  notification.style.color = 'white';
  notification.style.fontWeight = '500';
  notification.style.zIndex = '9999';
  notification.style.background = type === 'success' ? '#48bb78' : (type === 'error' ? '#f56565' : '#ed8936');

  setTimeout(() => {
    notification.classList.remove('show');
  }, duration);
}

// Initialize Dashboard
window.addEventListener('load', async () => {
  console.log('✅ Dashboard loaded - Connecting to backend services...');

  // Check authentication
  const admin = checkAdminAuth();
  if (!admin) {
    window.location.href = '../auth/login.html';
    return;
  }

  // Set admin name
  document.getElementById('adminName').textContent = admin.fullName || admin.email || 'Admin';

  // Setup event listeners
  setupNavigation();
  setupLogout();
  setupBackButton();
  setupSidebarToggle();
  setupFilters();
  setupButtonListeners();

  // Load initial dashboard data
  // If URL has a hash for a page (e.g. #admins), navigate there; otherwise load dashboard
  const hashPage = (window.location.hash || '').replace('#', '');
  if (hashPage) {
    navigateToPage(hashPage);
  } else {
    loadDashboardData();
  }
});

// Navigation
function setupNavigation() {
  document.querySelectorAll('.nav-link').forEach((link) => {
    link.addEventListener('click', async (e) => {
      e.preventDefault();
      const page = link.dataset.page;
      if (page) {
        navigateToPage(page);
      }
    });
  });
}

async function navigateToPage(page) {
  // Hide all pages
  document.querySelectorAll('.page').forEach((p) => {
    p.classList.remove('active');
  });

  // Show active page
  const activePage = document.getElementById(page);
  if (activePage) {
    activePage.classList.add('active');
  }

  // Update nav links
  document.querySelectorAll('.nav-link').forEach((link) => {
    link.classList.remove('active');
    if (link.dataset.page === page) {
      link.classList.add('active');
    }
  });

  // Update page title
  const titles = {
    dashboard: 'Dashboard',
    admins: 'Admin Management',
    users: 'User Management',
    organizations: 'Organization Management',
    devices: 'Device Management',
    activities: 'Activity Logs',
    'client-conversion-requests': 'Client Conversion Requests',
    'organization-user-requests': 'Organization User Requests',
  };

  document.getElementById('pageTitle').textContent = titles[page] || 'Dashboard';

  // Load page-specific data (DEMO VERSION)
  switch (page) {
    case 'admins':
      loadAdminsData();
      break;
    case 'users':
      loadUsersData();
      break;
    case 'organizations':
      loadOrganizationsData();
      break;
    case 'devices':
      loadDevicesData();
      break;
    case 'activities':
      loadActivitiesData();
      break;
    case 'client-conversion-requests':
      loadClientConversionRequests();
      break;
    case 'organization-user-requests':
      loadOrganizationUserRequests();
      break;
  }

  // Close mobile sidebar
  const sidebar = document.querySelector('.sidebar');
  sidebar.classList.remove('mobile-open');
}

// Sidebar Toggle
function setupSidebarToggle() {
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebar = document.querySelector('.sidebar');

  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('mobile-open');
    });
  }
}

// Logout
/**
 * Setup logout button and event handlers
 * Confirms logout and handles backend session termination
 */
function setupLogout() {
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      const confirmed = confirm('Are you sure you want to logout?');

      if (confirmed) {
        try {
          console.log('📡 Calling backend logout API...');
          await API.adminSignOut();
          console.log('✅ Backend logout successful');
        } catch (error) {
          console.warn('⚠️ Backend logout failed (continuing with local logout):', error.message);
          // Continue with logout even if backend call fails
        }

        // Perform local logout and redirect
        logoutAdmin();
      }
    });
  }
}

/**
 * Setup back to dashboard button
 * Allows quick return to Project dashboard
 */
function setupBackButton() {
  const backBtn = document.getElementById('backToDashboardBtn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      console.log('🔙 Returning to Project dashboard...');
      window.location.href = 'http://127.0.0.1:5500/PROJECT/project/app/dashboard.html';
    });
  }
}

// Dashboard Data - Real API
async function loadDashboardData() {
  try {
    console.log('📋 Dashboard initializing - Listing endpoints not available on backend');

    // Attempt to fetch counts from backend list endpoints (graceful fallback to dash placeholders)
    try {
      const [adminsRes, usersRes, orgsRes, devicesRes] = await Promise.allSettled([
        API.getAdmins(1, 1),
        API.getUsers(1, 1),
        API.getOrganizations(1, 1),
        API.getDevices(1, 1)
      ]);

      const getTotal = (res) => {
        if (!res) return '-';
        if (res.status === 'rejected') return '-';
        const val = res.value;
        if (!val) return '-';
        if (val.pagination && typeof val.pagination.totalCount !== 'undefined') return val.pagination.totalCount;
        if (val.pagination && typeof val.pagination.total !== 'undefined') return val.pagination.total;
        if (typeof val.total !== 'undefined') return val.total;
        if (typeof val.totalCount !== 'undefined') return val.totalCount;
        if (Array.isArray(val)) return val.length;
        if (val.data && Array.isArray(val.data)) return val.data.length;
        if (val.admins && Array.isArray(val.admins)) return val.admins.length;
        if (val.users && Array.isArray(val.users)) return val.users.length;
        if (val.organizations && Array.isArray(val.organizations)) return val.organizations.length;
        return '-';
      };

      document.getElementById('totalAdmins').textContent = getTotal(adminsRes);
      document.getElementById('totalUsers').textContent = getTotal(usersRes);
      document.getElementById('totalOrgs').textContent = getTotal(orgsRes);
      document.getElementById('totalDevices').textContent = getTotal(devicesRes);
    } catch (err) {
      console.warn('Failed to fetch dashboard counts:', err);
      document.getElementById('totalAdmins').textContent = '-';
      document.getElementById('totalUsers').textContent = '-';
      document.getElementById('totalOrgs').textContent = '-';
      document.getElementById('totalDevices').textContent = '-';
    }

    // Load recent activities
    await loadRecentActivities();
  } catch (error) {
    console.error('Failed to load dashboard:', error);
    // Set defaults on error
    document.getElementById('totalAdmins').textContent = '-';
    document.getElementById('totalUsers').textContent = '-';
    document.getElementById('totalOrgs').textContent = '-';
    document.getElementById('totalDevices').textContent = '-';
  }
}

async function loadRecentActivities() {
  try {
    const activityList = document.getElementById('recentActivityList');
    const response = await API.listActivities(1, 5);
    const activities = Array.isArray(response) ? response : (response?.data || response?.activities || []);

    if (activities && activities.length > 0) {
      activityList.innerHTML = activities.map(a => `
        <div class="activity-item" style="padding: 12px 15px; border-bottom: 1px solid #f0f0f0; display: flex; align-items: flex-start; transition: background-color 0.2s; border-radius: 6px; margin-bottom: 5px;">
          <div style="background: #e6f2ff; color: #0066cc; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px; flex-shrink: 0; font-weight: bold; font-size: 14px;">
            <i class="fas fa-bolt"></i>
          </div>
          <div style="flex: 1;">
            <div style="font-weight: 600; color: #2c3e50; font-size: 14px; margin-bottom: 4px;">
              ${(a.eventType || 'System Event').replace(/_/g, ' ')}
            </div>
            <div style="font-size: 13px; color: #5a6c7d; margin-bottom: 6px;">
              ${a.description || 'Action performed successfully'}
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #95a5a6;">
              <span><i class="fas fa-user" style="margin-right: 4px;"></i> ${a.adminId || a.performedBy || 'System'}</span>
              <span><i class="far fa-clock" style="margin-right: 4px;"></i> ${formatDate(a.timestamp || a.createdAt)}</span>
            </div>
          </div>
        </div>
      `).join('');
    } else {
      activityList.innerHTML = '<div class="loading" style="padding: 20px;">No activities yet</div>';
    }
  } catch (error) {
    console.error('Failed to load activities:', error);
    document.getElementById('recentActivityList').innerHTML = '<div class="loading">Unable to load activities</div>';
  }
}

// Load Admins
async function loadAdminsData() {
  try {
    const adminsList = document.getElementById('adminsList');
    adminsList.innerHTML = `<tr><td colspan="6" style="padding:20px; text-align:center;">Loading admins...</td></tr>`;
    console.log('✅ Loading admins from backend');
    const result = await API.getAdmins(1, 50);

    // API client may return { data: [...] } or array directly or { admins: [...] }
    const admins = result && result.admins ? result.admins : (result && result.data ? result.data : (Array.isArray(result) ? result : []));

    if (!admins || admins.length === 0) {
      adminsList.innerHTML = `<tr><td colspan="6" style="padding:30px; text-align:center;">No admins found</td></tr>`;
      return;
    }

    displayAdmins(admins);
  } catch (error) {
    console.error('Failed to load admins:', error);
    const adminsList = document.getElementById('adminsList');
    if (adminsList) adminsList.innerHTML = `<tr><td colspan="6" style="padding:30px; text-align:center;">Unable to load admins</td></tr>`;
    showNotification('Error loading admin page', 'error');
  }
}

function displayAdmins(admins) {
  const adminsList = document.getElementById('adminsList');
  adminsList.innerHTML = admins
    .map(
      (admin) => `
    <tr>
      <td>${admin.email || admin.adminId || 'N/A'}</td>
      <td>${admin.fullName || admin.firstName || 'N/A'}</td>
      <td>${admin.role || admin.adminType || 'Internal Admin'}</td>
      <td>${getStatusBadge(admin.isBlocked ? 'blocked' : 'active')}</td>
      <td>${formatDate(admin.createdAt)}</td>
      <td>
        ${admin.isBlocked
          ? `<button class="btn btn-sm btn-secondary" onclick="unblockAdmin('${admin.adminId || admin._id}')">Unblock</button>`
          : `<button class="btn btn-sm btn-danger" onclick="blockAdmin('${admin.adminId || admin._id}')">Block</button>`
        }
      </td>
    </tr>
  `
    )
    .join('');
}

async function blockAdmin(adminId) {
  const blockReason = prompt('Select block reason:\nOptions: admin_action, security_threat, policy_violation, suspicious_activity, other\n\nEnter reason:');
  if (!blockReason) return;

  const reasonDescription = prompt('Enter additional description (optional):');

  try {
    await API.blockAdmin(adminId, blockReason, reasonDescription || '');
    showNotification('Admin blocked successfully', 'success');
    loadAdminsData();
  } catch (error) {
    console.error('Error blocking admin:', error);
    showNotification('Failed to block admin: ' + error.message, 'error');
  }
}

async function unblockAdmin(adminId) {
  const unblockReason = prompt('Select unblock reason:\nOptions: admin_action, manual_review, appeal_granted, error_correction, other\n\nEnter reason:');
  if (!unblockReason) return;

  const reasonDescription = prompt('Enter additional description (optional):');

  try {
    await API.unblockAdmin(adminId, unblockReason, reasonDescription || '');
    showNotification('Admin unblocked successfully', 'success');
    loadAdminsData();
  } catch (error) {
    console.error('Error unblocking admin:', error);
    showNotification('Failed to unblock admin: ' + error.message, 'error');
  }
}

async function deleteAdmin(adminId) {
  if (!confirmAction('Are you sure you want to DELETE this admin? This action cannot be undone!')) return;
  try {
    await API.deleteAdmin(adminId);
    showNotification('Admin deleted successfully', 'success');
    loadAdminsData();
  } catch (error) {
    console.error('Error deleting admin:', error);
    showNotification('Failed to delete admin: ' + error.message, 'error');
  }
}

// Load Users
async function loadUsersData() {
  try {
    const usersList = document.getElementById('usersList');
    usersList.innerHTML = `<tr><td colspan="7" style="padding:20px; text-align:center;">Loading users...</td></tr>`;
    console.log('✅ Loading users from backend');
    const result = await API.getUsers(1, 50);
    const users = result && result.entities ? result.entities : (result && result.users ? result.users : (result && result.data ? result.data : (Array.isArray(result) ? result : [])));

    if (!users || users.length === 0) {
      usersList.innerHTML = `<tr><td colspan="7" style="padding:30px; text-align:center;">No users found</td></tr>`;
      return;
    }

    displayUsers(users);
  } catch (error) {
    console.error('Failed to load users:', error);
    const usersList = document.getElementById('usersList');
    if (usersList) usersList.innerHTML = `<tr><td colspan="7" style="padding:30px; text-align:center;">Unable to load users</td></tr>`;
    showNotification('Error loading user page', 'error');
  }
}

async function blockUserAction() {
  const userId = document.getElementById('userIdInput')?.value.trim();
  if (!userId) {
    showNotification('Please enter User ID', 'error');
    return;
  }

  const blockReason = prompt('Select block reason:\nOptions: policy_violation, spam_activity, harassment, fraudulent_behavior, suspicious_login, other\n\nEnter reason:');
  if (!blockReason) return;

  const reasonDescription = prompt('Enter additional description (optional):');

  if (!confirm('Are you sure you want to block this user?')) return;

  try {
    await API.blockUser(userId, blockReason, reasonDescription || '');
    showNotification('✓ User blocked successfully', 'success');
    document.getElementById('userIdInput').value = '';
  } catch (error) {
    showNotification('❌ Error: ' + error.message, 'error');
  }
}

async function unblockUserAction() {
  const userId = document.getElementById('userIdInput')?.value.trim();
  if (!userId) {
    showNotification('Please enter User ID', 'error');
    return;
  }

  const unblockReason = prompt('Select unblock reason:\nOptions: manual_review_passed, user_appeal_granted, system_error, mistake, other\n\nEnter reason:');
  if (!unblockReason) return;

  const reasonDescription = prompt('Enter additional description (optional):');

  if (!confirm('Are you sure you want to unblock this user?')) return;

  try {
    await API.unblockUser(userId, unblockReason, reasonDescription || '');
    showNotification('✓ User unblocked successfully', 'success');
    document.getElementById('userIdInput').value = '';
  } catch (error) {
    showNotification('❌ Error: ' + error.message, 'error');
  }
}

function displayUsers(users) {
  const usersList = document.getElementById('usersList');
  usersList.innerHTML = users
    .map(
      (user) => `
    <tr>
      <td>${user.email || user.userId || 'N/A'}</td>
      <td>${user.fullName || user.firstName || 'N/A'}</td>
      <td>${user.phone || '-'}</td>
      <td>${getStatusBadge(user.isBlocked ? 'blocked' : 'active')}</td>
      <td>${user.emailVerified ? '✅' : '❌'}</td>
      <td>${formatDate(user.createdAt)}</td>
      <td>
        ${user.isBlocked
          ? `<button class="btn btn-sm btn-secondary" onclick="unblockUser('${user.userId || user._id}')">Unblock</button>`
          : `<button class="btn btn-sm btn-danger" onclick="blockUser('${user.userId || user._id}')">Block</button>`
        }
      </td>
    </tr>
  `
    )
    .join('');
}

async function blockUser(userId) {
  if (!confirmAction('Are you sure you want to block this user?')) return;
  try {
    await API.blockUser(userId);
    showNotification('User blocked successfully', 'success');
    loadUsersData();
  } catch (error) {
    console.error('Error blocking user:', error);
    showNotification('Failed to block user: ' + error.message, 'error');
  }
}

async function unblockUser(userId) {
  if (!confirmAction('Are you sure you want to unblock this user?')) return;
  try {
    await API.unblockUser(userId);
    showNotification('User unblocked successfully', 'success');
    loadUsersData();
  } catch (error) {
    console.error('Error unblocking user:', error);
    showNotification('Failed to unblock user: ' + error.message, 'error');
  }
}

// Load Organizations
async function loadOrganizationsData() {
  try {
    const orgsList = document.getElementById('organizationsList');
    console.log('📡 Fetching organizations from backend...');
    const response = await API.getOrganizations(1, 10);

    // Handle response structure - could be array or wrapped in data field
    const organizations = Array.isArray(response) ? response : (response?.data || response?.organizations || []);

    if (!organizations || organizations.length === 0) {
      orgsList.innerHTML = `<tr><td colspan="7" style="padding: 20px; text-align: center; color: #666;">No organizations found</td></tr>`;
      return;
    }

    displayOrganizations(organizations);
  } catch (error) {
    console.error('Failed to load organizations:', error);
    const orgsList = document.getElementById('organizationsList');
    orgsList.innerHTML = `<tr><td colspan="7" style="padding: 20px; text-align: center; color: #e74c3c;">Failed to load organizations: ${error.message}</td></tr>`;
  }
}

// Load Devices
async function loadDevicesData() {
  try {
    const devicesList = document.getElementById('devicesList');
    devicesList.innerHTML = `<tr><td colspan="7" style="padding:20px; text-align:center;">Loading devices...</td></tr>`;
    console.log('✅ Attempting to load devices list from backend');

    try {
      const res = await API.getDevices(1, 50);
      const devices = res && res.data ? res.data : (Array.isArray(res) ? res : []);

      if (devices && devices.length > 0) {
        // Render devices table rows
        devicesList.innerHTML = devices.map(d => `
          <tr>
            <td>${d.deviceUUID || d.uuid || d.id || '-'}</td>
            <td>${d.userEmail || d.ownerEmail || '-'}</td>
            <td>${d.platform || d.os || '-'}</td>
            <td>${d.isBlocked ? 'Blocked' : 'Active'}</td>
            <td>${formatDate(d.createdAt || d.registeredAt)}</td>
            <td>
              ${d.isBlocked ? `<button class="btn btn-sm btn-secondary" onclick="unblockDevice('${d.deviceUUID || d.uuid || ''}')">Unblock</button>` : `<button class="btn btn-sm btn-danger" onclick="blockDevice('${d.deviceUUID || d.uuid || ''}')">Block</button>`}
            </td>
          </tr>
        `).join('');
        return;
      }

      // If no devices returned, show block/unblock input UI as fallback
    } catch (err) {
      console.warn('Devices list not provided by backend or error occurred:', err.message);
      // continue to render fallback UI below
    }

    // Fallback UI: block/unblock by UUID (backend supports these operations)
    devicesList.innerHTML = `
      <tr>
        <td colspan="7" style="padding: 30px; text-align: center;">
          <div style="background: #f0f7ff; padding: 25px; border-radius: 8px; border-left: 4px solid #0066cc;">
            <p style="margin: 0 0 15px 0; font-weight: 600; font-size: 16px; color: #333;">Device Management</p>
            <p style="margin: 0 0 10px 0; color: #666;">Device listing not available — use UUID to block/unblock</p>
            <div style="background: white; padding: 20px; border-radius: 6px; display: inline-block;">
              <div style="margin-bottom: 10px;">
                <input type="text" id="deviceUuidInput" placeholder="Enter Device UUID (e.g., 550e8400-e29b-41d4-a716-446655440000)" 
                  style="width: 400px; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;">
              </div>
              <div>
                <button onclick="blockDeviceAction()" class="btn btn-danger" style="padding: 10px 20px; margin-right: 10px;">🚫 Block Device</button>
                <button onclick="unblockDeviceAction()" class="btn btn-success" style="padding: 10px 20px; background: #48bb78; color: white; border: none; border-radius: 4px; cursor: pointer;">✅ Unblock Device</button>
              </div>
            </div>
          </div>
        </td>
      </tr>`;
  } catch (error) {
    console.error('Failed to load devices:', error);
    showNotification('Error loading device page', 'error');
  }
}

async function blockDeviceAction() {
  const deviceUUID = document.getElementById('deviceUuidInput')?.value.trim();
  if (!deviceUUID) {
    showNotification('Please enter Device UUID', 'error');
    return;
  }

  if (!confirm('Are you sure you want to block this device?')) return;

  try {
    await API.blockDevice(deviceUUID, 'Admin blocked', 'Blocked via admin panel');
    showNotification('✓ Device blocked successfully', 'success');
    document.getElementById('deviceUuidInput').value = '';
  } catch (error) {
    showNotification('❌ Error: ' + error.message, 'error');
  }
}

async function unblockDeviceAction() {
  const deviceUUID = document.getElementById('deviceUuidInput')?.value.trim();
  if (!deviceUUID) {
    showNotification('Please enter Device UUID', 'error');
    return;
  }

  if (!confirm('Are you sure you want to unblock this device?')) return;

  try {
    await API.unblockDevice(deviceUUID, 'Admin unblocked', 'Unblocked via admin panel');
    showNotification('✓ Device unblocked successfully', 'success');
    document.getElementById('deviceUuidInput').value = '';
  } catch (error) {
    showNotification('❌ Error: ' + error.message, 'error');
  }
}

// Load Activities
async function loadActivitiesData() {
  try {
    const activitiesList = document.getElementById('activitiesList');
    console.log('📡 Fetching all activities from backend...');
    operationState.startLoading('activities');

    const activities = await API.listActivities(1, 20);

    operationState.stopLoading('activities');

    if (!activities || activities.length === 0) {
      activitiesList.innerHTML = `<tr><td colspan="6" style="padding: 20px; text-align: center; color: #666;">No activities found. Use "View Admin Activities" button to fetch specific admin's activities.</td></tr>`;
      return;
    }

    // Store activities in dashboardData
    dashboardData.activities = activities;

    // Debug: Log first activity to see actual structure
    console.log('📊 Sample Activity Data:', JSON.stringify(activities[0], null, 2));
    console.log('🔍 Full activities array:', activities);

    displayActivities(activities);
    console.log(`✅ Loaded ${activities.length} activities`);
  } catch (error) {
    operationState.stopLoading('activities');
    console.error('Failed to load activities:', error);
    const activitiesList = document.getElementById('activitiesList');
    activitiesList.innerHTML = `<tr><td colspan="6" style="padding: 20px; text-align: center; color: #e74c3c;">Failed to load activities: ${error.message}</td></tr>`;
  }
}

function displayActivities(activities) {
  const activitiesList = document.getElementById('activitiesList');

  activitiesList.innerHTML = activities
    .map(
      (activity) => `
    <tr>
      <td>${activity.adminId || '-'}</td>
      <td>${activity.eventType || '-'}</td>
      <td>${activity.adminActions?.performedOn || activity.description?.substring(0, 20) || '-'}</td>
      <td>${activity.adminActions?.targetId ? String(activity.adminActions.targetId).substring(0, 8) : '-'}</td>
      <td>${formatDate(activity.createdAt)}</td>
      <td><button class="btn btn-sm btn-primary" onclick="showActivityDetails('${activity.id}')">View</button></td>
    </tr>
  `
    )
    .join('');
}

function showActivityDetails(activityId) {
  const activity = dashboardData.activities.find((a) => a.id === activityId);
  if (activity) {
    const performedOn = activity.adminActions?.performedOn || 'System Event';
    const targetId = activity.adminActions?.targetId || '-';
    const reason = activity.adminActions?.reason || 'N/A';

    alert(`
Activity Details:
Admin: ${activity.adminId}
Event Type: ${activity.eventType}
Performed By: ${activity.performedBy}
Device Type: ${activity.deviceType || 'N/A'}
Performed On: ${performedOn}
Target ID: ${targetId}
Reason: ${reason}
Description: ${activity.description}
Timestamp: ${formatDate(activity.createdAt)}
    `);
  }
}

// Filters
function setupFilters() {
  const filterInputs = document.querySelectorAll('.filters input, .filters select');
  filterInputs.forEach((input) => {
    input.addEventListener('input', debounce(applyFilters, 300));
  });
}

function applyFilters() {
  const pageActive = document.querySelector('.page.active');
  if (!pageActive) return;

  const pageId = pageActive.id;

  switch (pageId) {
    case 'admins':
      filterAdmins();
      break;
    case 'users':
      filterUsers();
      break;
    case 'organizations':
      filterOrganizations();
      break;
    case 'devices':
      filterDevices();
      break;
    case 'activities':
      filterActivities();
      break;
  }
}

function filterAdmins() {
  const searchTerm = document.getElementById('adminSearch')?.value.toLowerCase() || '';
  const roleFilter = document.getElementById('adminRoleFilter')?.value || '';

  const filtered = dashboardData.admins.filter((admin) => {
    const matchesSearch =
      admin.email.toLowerCase().includes(searchTerm) ||
      admin.fullName.toLowerCase().includes(searchTerm);
    const matchesRole = !roleFilter || admin.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  displayAdmins(filtered);
}

function filterUsers() {
  const searchTerm = document.getElementById('userSearch')?.value.toLowerCase() || '';
  const statusFilter = document.getElementById('userStatusFilter')?.value || '';

  const filtered = dashboardData.users.filter((user) => {
    const matchesSearch =
      user.email.toLowerCase().includes(searchTerm) ||
      user.fullName.toLowerCase().includes(searchTerm);
    const matchesStatus =
      !statusFilter || (statusFilter === 'blocked' && user.isBlocked) || (statusFilter === 'active' && !user.isBlocked);
    return matchesSearch && matchesStatus;
  });

  displayUsers(filtered);
}

function filterOrganizations() {
  const searchTerm = document.getElementById('orgSearch')?.value.toLowerCase() || '';

  const filtered = dashboardData.organizations.filter(
    (org) =>
      org.organizationName.toLowerCase().includes(searchTerm) ||
      org.email.toLowerCase().includes(searchTerm)
  );

  displayOrganizations(filtered);
}

function filterDevices() {
  const searchTerm = document.getElementById('deviceSearch')?.value.toLowerCase() || '';
  const statusFilter = document.getElementById('deviceStatusFilter')?.value || '';

  const filtered = dashboardData.devices.filter((device) => {
    const matchesSearch = device.deviceId.toLowerCase().includes(searchTerm);
    const matchesStatus =
      !statusFilter || (statusFilter === 'blocked' && device.isBlocked) || (statusFilter === 'active' && !device.isBlocked);
    return matchesSearch && matchesStatus;
  });

  displayDevices(filtered);
}

function filterActivities() {
  const searchTerm = document.getElementById('activitySearch')?.value.toLowerCase() || '';
  const typeFilter = document.getElementById('activityTypeFilter')?.value || '';

  const filtered = dashboardData.activities.filter((activity) => {
    const matchesSearch =
      activity.eventType.toLowerCase().includes(searchTerm) ||
      activity.adminId.toLowerCase().includes(searchTerm) ||
      activity.description.toLowerCase().includes(searchTerm);
    const matchesType = !typeFilter || activity.eventType === typeFilter;
    return matchesSearch && matchesType;
  });

  displayActivities(filtered);
}

// Helper functions
function confirmAction(message = 'Are you sure?') {
  return confirm(message);
}

function getStatusBadge(status) {
  const statusMap = {
    'active': { class: 'status-active', label: 'Active' },
    'blocked': { class: 'status-blocked', label: 'Blocked' },
    'pending': { class: 'status-pending', label: 'Pending' },
    'disabled': { class: 'status-blocked', label: 'Disabled' },
  };

  const normalized = status ? status.toLowerCase() : 'active';
  const config = statusMap[normalized] || { class: 'status-active', label: normalized };

  return `<span class="status-badge ${config.class}">${config.label}</span>`;
}

function formatDate(dateString) {
  try {
    const date = new Date(dateString);
    const options = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return date.toLocaleDateString('en-US', options);
  } catch (e) {
    return dateString;
  }
}

// Display Organizations
// Store organizations globally for modal access
let currentOrganizations = [];

function displayOrganizations(orgs) {
  currentOrganizations = orgs; // Store for modal access
  const orgsList = document.getElementById('organizationsList');
  orgsList.innerHTML = orgs
    .map(
      (org, index) => {
        // Use _id, id, or organizationId - fallback to index
        const orgId = org._id || org.id || org.organizationId || index;

        return `
    <tr>
      <td>${org.organizationName}</td>
      <td>${org.organizationType || org.orgType || '-'}</td>
      <td>${org.email || org.contactEmail || '-'}</td>
      <td>${getStatusBadge(org.isActive === false ? 'disabled' : 'active')}</td>
      <td>${org.users?.length || 0}</td>
      <td>${formatDate(org.createdAt)}</td>
      <td>
        <div style="display: flex; gap: 4px; flex-wrap: nowrap; align-items: center; justify-content: flex-start;">
          <button class="btn btn-sm btn-info" style="padding: 5px 10px; font-size: 12px; white-space: nowrap;" onclick="openUpdateOrgModal('${orgId}')">Edit</button>
          <button class="btn btn-sm btn-success" style="padding: 5px 10px; font-size: 12px; white-space: nowrap;" onclick="openAddOrgUserModal('${orgId}')">Add</button>
          ${org.isActive === false
            ? `<button class="btn btn-sm btn-secondary" style="padding: 5px 10px; font-size: 12px; white-space: nowrap;" onclick="enableOrganization('${orgId}')">On</button>`
            : `<button class="btn btn-sm btn-danger" style="padding: 5px 10px; font-size: 12px; white-space: nowrap;" onclick="disableOrganization('${orgId}')">Off</button>`
          }
          <button class="btn btn-sm btn-danger" style="padding: 5px 10px; font-size: 12px; white-space: nowrap;" onclick="confirmDeleteOrganization('${orgId}')">Del</button>
        </div>
      </td>
    </tr>
  `;
      }
    )
    .join('');
}

async function disableOrganization(orgId) {
  if (!confirmAction('Are you sure you want to disable this organization?')) return;

  const reason = prompt('Please provide the reason for disabling this organization:\n\nOptions:\n- policy_violation\n- suspended_for_review\n- inactivity\n- compliance_issue\n- unauthorized_activity\n- admin_request\n- temporary_suspension\n- other\n\nEnter reason:')?.trim();

  if (!reason) {
    showNotification('Reason is required', 'error');
    return;
  }

  try {
    await API.disableOrganization(orgId, reason);
    showNotification('Organization disabled successfully', 'success');
    loadOrganizationsData();
  } catch (error) {
    console.error('Error disabling organization:', error);
    showNotification('Failed to disable organization: ' + error.message, 'error');
  }
}

async function enableOrganization(orgId) {
  if (!confirmAction('Are you sure you want to enable this organization?')) return;

  const reason = prompt('Please provide the reason for enabling this organization:\n\nOptions:\n- review_completed\n- suspension_period_ended\n- issue_resolved\n- appeal_approved\n- compliance_verified\n- admin_decision\n- other\n\nEnter reason:')?.trim();

  if (!reason) {
    showNotification('Reason is required', 'error');
    return;
  }

  try {
    await API.enableOrganization(orgId, reason);
    showNotification('Organization enabled successfully', 'success');
    loadOrganizationsData();
  } catch (error) {
    console.error('Error enabling organization:', error);
    showNotification('Failed to enable organization: ' + error.message, 'error');
  }
}

// Update Organization Modal
function openUpdateOrgModal(orgId) {
  // Find the organization from stored data
  const orgData = currentOrganizations.find(o => (o._id || o.id || o.organizationId) === orgId);

  if (!orgData) {
    showNotification('Organization not found', 'error');
    return;
  }

  // FIRST: Reset the form to clear any old data
  document.getElementById('updateOrgForm').reset();

  // Store the org ID for submission
  document.getElementById('updateOrgForm').dataset.orgId = orgId;

  // Populate form with existing data
  document.getElementById('updateOrgName').value = orgData.organizationName || '';
  document.getElementById('updateOrgType').value = orgData.organizationType || orgData.orgType || '';
  document.getElementById('updateOrgDescription').value = orgData.description || '';
  document.getElementById('updateOrgWebsiteUrl').value = orgData.websiteUrl || '';
  document.getElementById('updateOrgContactEmail').value = orgData.contactEmail || '';
  document.getElementById('updateOrgContactCountryCode').value = orgData.contactCountryCode || '';
  document.getElementById('updateOrgContactLocalNumber').value = orgData.contactLocalNumber || '';

  // DEFAULT: Set Update Reason to empty (user must select)
  document.getElementById('updateOrgReason').value = '';
  document.getElementById('updateOrgReasonDescription').value = '';

  console.log('✏️ Edit modal opened for org:', orgId, 'Org Data:', orgData);

  document.getElementById('updateOrgModal').style.display = 'flex';
}

function closeUpdateOrgModal() {
  document.getElementById('updateOrgModal').style.display = 'none';
  document.getElementById('updateOrgForm').reset();
  delete document.getElementById('updateOrgForm').dataset.orgId;
}

// Delete Organization Confirmation
function confirmDeleteOrganization(orgId) {
  if (!confirmAction('Are you sure you want to DELETE this organization? This action cannot be undone!')) return;
  deleteOrganization(orgId);
}

async function deleteOrganization(orgId) {
  const reason = prompt('Please provide the reason for deleting this organization:\n\nOptions:\n- out_of_business\n- merger\n- acquisition\n- reorganization\n- admin_request\n- other\n\nEnter reason:')?.trim();

  if (!reason) {
    showNotification('Reason is required', 'error');
    return;
  }

  try {
    await API.deleteOrganization(orgId, reason);
    showNotification('Organization deleted successfully', 'success');
    loadOrganizationsData();
  } catch (error) {
    console.error('Error deleting organization:', error);
    showNotification('Failed to delete organization: ' + error.message, 'error');
  }
}

// Display Devices
function displayDevices(devices) {
  const devicesList = document.getElementById('devicesList');
  if (!devicesList) return;

  devicesList.innerHTML = devices
    .map(
      (device) => `
    <tr>
      <td>${device.deviceId}</td>
      <td>${device.deviceType || '-'}</td>
      <td>${device.owner || '-'}</td>
      <td>${formatDate(device.lastLogin || device.createdAt)}</td>
      <td>${device.isBlocked ? "<span class='badge badge-danger'>Blocked</span>" : "<span class='badge badge-success'>Active</span>"}</td>
      <td>
        ${device.isBlocked ? `<button class="btn btn-sm btn-secondary" onclick="unblockDevice('${device._id}')">Unblock</button>` : `<button class="btn btn-sm btn-danger" onclick="blockDevice('${device._id}')">Block</button>`}
      </td>
    </tr>
  `
    )
    .join('');
}

async function blockDevice(deviceUUID) {
  const blockReason = prompt('Select block reason:\nOptions: suspicious_activity, compromised_device, unauthorized_access, security_threat, user_requested, malware_detected, other\n\nEnter reason:');
  if (!blockReason) return;

  const reasonDescription = prompt('Enter additional description (optional):');

  try {
    await API.blockDevice(deviceUUID, blockReason, reasonDescription || '');
    showNotification('Device blocked successfully', 'success');
    loadDevicesData();
  } catch (error) {
    console.error('Error blocking device:', error);
    showNotification('Failed to block device: ' + error.message, 'error');
  }
}

async function unblockDevice(deviceUUID) {
  const unblockReason = prompt('Select unblock reason:\nOptions: verified_safe, user_verified, false_positive, device_secured, user_requested, security_check_passed, other\n\nEnter reason:');
  if (!unblockReason) return;

  const reasonDescription = prompt('Enter additional description (optional):');

  try {
    await API.unblockDevice(deviceUUID, unblockReason, reasonDescription || '');
    showNotification('Device unblocked successfully', 'success');
    loadDevicesData();
  } catch (error) {
    console.error('Error unblocking device:', error);
    showNotification('Failed to unblock device: ' + error.message, 'error');
  }
}

// Button Listeners
function setupButtonListeners() {
  const addAdminBtn = document.getElementById('addAdminBtn');
  const addClientBtn = document.getElementById('addClientBtn');
  const convertUserBtn = document.getElementById('convertUserBtn');
  const addOrgBtn = document.getElementById('addOrgBtn');
  const createClientConversionReqBtn = document.getElementById('createClientConversionReqBtn');
  const createOrgUserReqBtn = document.getElementById('createOrgUserReqBtn');

  if (addAdminBtn) {
    addAdminBtn.addEventListener('click', openAdminModal);
  }

  if (addClientBtn) {
    addClientBtn.addEventListener('click', openClientModal);
  }

  if (convertUserBtn) {
    convertUserBtn.addEventListener('click', openConvertUserModal);
  }

  if (addOrgBtn) {
    addOrgBtn.addEventListener('click', openOrgModal);
  }

  if (createClientConversionReqBtn) {
    createClientConversionReqBtn.addEventListener('click', openClientConversionReqModal);
  }

  if (createOrgUserReqBtn) {
    createOrgUserReqBtn.addEventListener('click', openOrgUserReqModal);
  }

  // Admin Form Submission
  const adminForm = document.getElementById('adminForm');
  if (adminForm) {
    adminForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const firstName = document.getElementById('adminFirstName').value.trim();
      const email = document.getElementById('adminEmail').value.trim();
      const password = document.getElementById('adminPassword').value;

      // Validate firstName (2-50 chars)
      if (firstName.length < 2 || firstName.length > 50) {
        showNotification('First name must be 2-50 characters long', 'error');
        return;
      }

      // Validate email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        showNotification('Please enter a valid email address', 'error');
        return;
      }

      // Validate password length
      if (password.length < 8 || password.length > 64) {
        showNotification('Password must be 8-64 characters long', 'error');
        return;
      }

      // Check password strength (uppercase, lowercase, number, special char)
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,64}$/;
      if (!passwordRegex.test(password)) {
        showNotification('Password must contain uppercase, lowercase, numbers, and special characters', 'error');
        return;
      }


      const adminData = {
        firstName: firstName,
        email: email,
        password: password,
        adminType: document.getElementById('adminType').value,
        role: document.getElementById('adminRole').value,
        creationReason: document.getElementById('creationReason').value,
      };

      if (!adminData.firstName || !adminData.email || !adminData.password || !adminData.adminType || !adminData.role || !adminData.creationReason) {
        showNotification('Please fill in all required fields', 'error');
        return;
      }

      await createNewAdmin(adminData);
      closeAdminModal();
    });
  }

  // Organization Form Submission
  const orgForm = document.getElementById('orgForm');
  if (orgForm) {
    orgForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const orgName = document.getElementById('orgName').value.trim();
      const orgType = document.getElementById('orgType').value;
      const description = document.getElementById('orgDescription').value.trim();
      const websiteUrl = document.getElementById('orgWebsiteUrl').value.trim();
      const contactEmail = document.getElementById('orgContactEmail').value.trim();
      const contactCountryCode = document.getElementById('orgContactCountryCode').value.trim();
      const contactLocalNumber = document.getElementById('orgContactLocalNumber').value.trim();
      const logUrl = document.getElementById('orgLogUrl').value.trim();
      const creationReason = document.getElementById('orgCreationReason').value;
      const reasonDescription = document.getElementById('orgReasonDescription').value.trim();

      // Validation - only required fields
      if (!orgName || !orgType || !creationReason) {
        showNotification('Please fill in all required fields', 'error');
        return;
      }

      // Phone validation: both country code and local number must be provided together
      if ((contactCountryCode && !contactLocalNumber) || (!contactCountryCode && contactLocalNumber)) {
        showNotification('Both country code and local number must be provided together', 'error');
        return;
      }

      const orgData = {
        organizationName: orgName,
        orgType: orgType,
        creationReason: creationReason,
      };

      // Add optional fields if provided
      if (description) orgData.description = description;
      if (websiteUrl) orgData.websiteUrl = websiteUrl;
      if (contactEmail) orgData.contactEmail = contactEmail;
      if (contactCountryCode && contactLocalNumber) {
        orgData.contactCountryCode = contactCountryCode;
        orgData.contactLocalNumber = contactLocalNumber;
      }
      if (logUrl) orgData.logUrl = logUrl;
      if (reasonDescription) orgData.reasonDescription = reasonDescription;

      await createNewOrganization(orgData);
      closeOrgModal();
    });
  }

  // Organization Update Form Submission
  const updateOrgForm = document.getElementById('updateOrgForm');
  if (updateOrgForm) {
    updateOrgForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      console.log('🔄 Update Organization Form Submitted');

      const orgId = e.target.dataset.orgId;
      console.log('📋 Organization ID:', orgId);

      if (!orgId) {
        showNotification('Organization ID not found', 'error');
        return;
      }

      // Only include fields that have values (avoid empty optional fields)
      const orgData = {
        organizationName: document.getElementById('updateOrgName').value.trim(),
        orgType: document.getElementById('updateOrgType').value.trim(),
        updationReason: document.getElementById('updateOrgReason').value.trim()
      };

      console.log('📝 Base org data:', orgData);

      // Add optional fields only if they have valid values
      const description = document.getElementById('updateOrgDescription').value.trim();
      if (description && description.length >= 10) {
        orgData.description = description;
      }

      const website = document.getElementById('updateOrgWebsiteUrl').value.trim();
      if (website && website.length >= 8) {
        orgData.website = website;
      }

      const contactEmail = document.getElementById('updateOrgContactEmail').value.trim();
      if (contactEmail && contactEmail.length >= 5) {
        orgData.contactEmail = contactEmail;
      }

      const countryCode = document.getElementById('updateOrgContactCountryCode').value.trim();
      const localNumber = document.getElementById('updateOrgContactLocalNumber').value.trim();

      // Both must be provided together if either is provided
      if (countryCode || localNumber) {
        if (!countryCode || !localNumber) {
          showNotification('Both country code and local number must be provided together', 'error');
          return;
        }
        if (countryCode.length >= 1 && localNumber.length >= 9) {
          orgData.contactCountryCode = countryCode;
          orgData.contactLocalNumber = localNumber;
        }
      }

      const reasonDesc = document.getElementById('updateOrgReasonDescription').value.trim();
      if (reasonDesc && reasonDesc.length >= 10) {
        orgData.reasonDescription = reasonDesc;
      }

      // Validate required fields
      if (!orgData.organizationName || !orgData.orgType || !orgData.updationReason) {
        let missing = [];
        if (!orgData.organizationName) missing.push('Organization Name');
        if (!orgData.orgType) missing.push('Organization Type');
        if (!orgData.updationReason) missing.push('Update Reason');
        console.warn('⚠️ Missing required fields:', missing);
        showNotification(`Please fill in all required fields: ${missing.join(', ')}`, 'error');
        return;
      }

      console.log('📤 Final org data to send:', orgData);

      try {
        console.log('🔄 Updating organization...');
        await API.updateOrganization(orgId, orgData);
        console.log('✅ Update successful - reloading organizations');
        showNotification('Organization updated successfully', 'success');
        closeUpdateOrgModal();
        loadOrganizationsData(); // Reload the list
      } catch (error) {
        console.error('❌ Error updating organization:', error);
        showNotification('Failed to update organization: ' + error.message, 'error');
      }
    });
  }

  // Client Form Submission
  const clientForm = document.getElementById('clientForm');
  if (clientForm) {
    clientForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const firstName = document.getElementById('clientFirstName').value.trim();
      const email = document.getElementById('clientEmail').value.trim();
      const password = document.getElementById('clientPassword').value;
      const role = document.getElementById('clientRole').value;
      const creationReason = document.getElementById('clientCreationReason').value;
      const reasonDescription = document.getElementById('clientReasonDescription').value.trim();
      const countryCode = document.getElementById('clientCountryCode').value.trim();
      const localNumber = document.getElementById('clientLocalNumber').value.trim();
      const orgIdsInput = document.getElementById('clientOrgIds').value.trim();

      // Validate firstName
      if (firstName.length < 2 || firstName.length > 50) {
        showNotification('First name must be 2-50 characters long', 'error');
        return;
      }

      // Validate email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        showNotification('Please enter a valid email address', 'error');
        return;
      }

      // Validate password
      if (password.length < 8 || password.length > 64) {
        showNotification('Password must be 8-64 characters long', 'error');
        return;
      }

      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,64}$/;
      if (!passwordRegex.test(password)) {
        showNotification('Password must contain uppercase, lowercase, numbers, and special characters', 'error');
        return;
      }

      // Validate required fields
      if (!role || !creationReason) {
        showNotification('Please fill in all required fields', 'error');
        return;
      }

      const clientData = {
        firstName: firstName,
        email: email,
        password: password,
        role: role,
        creationReason: creationReason,
      };

      if (reasonDescription) clientData.reasonDescription = reasonDescription;
      if (countryCode) clientData.countryCode = countryCode;
      if (localNumber) clientData.localNumber = localNumber;

      // Parse organization IDs
      if (orgIdsInput) {
        clientData.orgIds = orgIdsInput.split(',').map(id => id.trim()).filter(id => id);
      }

      await createNewClient(clientData);
      closeClientModal();
    });
  }

  // Convert User to Client Form Submission
  const convertUserForm = document.getElementById('convertUserForm');
  if (convertUserForm) {
    convertUserForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const userId = document.getElementById('convertUserId').value.trim();
      const convertReason = document.getElementById('convertReason').value;
      const role = document.getElementById('convertRole').value;
      const reasonDescription = document.getElementById('convertReasonDescription').value.trim();
      const orgIdsInput = document.getElementById('convertOrgIds').value.trim();

      // Validate required fields
      if (!userId || !convertReason || !role) {
        showNotification('Please fill in all required fields', 'error');
        return;
      }

      const organizationIds = orgIdsInput
        ? orgIdsInput.split(',').map(id => id.trim()).filter(id => id)
        : [];

      await convertUserToClientAction(userId, convertReason, role, organizationIds, reasonDescription);
      closeConvertUserModal();
    });
  }

  // Client Conversion Request Form Submission
  const clientConversionReqForm = document.getElementById('clientConversionReqForm');
  if (clientConversionReqForm) {
    clientConversionReqForm.addEventListener('submit', handleClientConversionReqSubmit);
  }

  // Organization User Request Form Submission
  const orgUserReqForm = document.getElementById('orgUserReqForm');
  if (orgUserReqForm) {
    orgUserReqForm.addEventListener('submit', handleOrgUserReqSubmit);
  }

  // Add Org User Form Submission
  const addOrgUserForm = document.getElementById('addOrgUserForm');
  if (addOrgUserForm) {
    addOrgUserForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const orgId = document.getElementById('addOrgUserOrgId').value.trim();
      const userId = document.getElementById('addOrgUserUserId').value.trim();
      const role = document.getElementById('addOrgUserRole').value.trim();
      const creationReason = document.getElementById('addOrgUserCreationReason').value;
      const reasonDescription = document.getElementById('addOrgUserReasonDescription').value.trim() || '';

      // Validate required fields
      if (!orgId || !userId || !role || !creationReason) {
        showNotification('Please fill in all required fields', 'error');
        return;
      }

      // Validate userId format (must be exactly 10 characters)
      if (userId.length !== 10) {
        showNotification(`User ID must be exactly 10 characters (received: ${userId.length})`, 'error');
        return;
      }

      try {
        await API.addUserToOrganization(orgId, userId, role, creationReason, reasonDescription);
        showNotification('User added to organization successfully', 'success');
        closeAddOrgUserModal();
        // Reload org data
        await loadOrganizationsData();
      } catch (error) {
        console.error('Error adding user to organization:', error);
        showNotification('Failed to add user: ' + error.message, 'error');
      }
    });
  }
}

// Modal Functions
function openAdminModal() {
  const modal = document.getElementById('adminModal');
  if (modal) {
    modal.classList.add('show');
    document.getElementById('adminForm').reset();
  }
}

function closeAdminModal() {
  const modal = document.getElementById('adminModal');
  if (modal) {
    modal.classList.remove('show');
    document.getElementById('adminForm').reset();
  }
}

function openOrgModal() {
  const modal = document.getElementById('orgModal');
  if (modal) {
    modal.classList.add('show');
    document.getElementById('orgForm').reset();
  }
}

function closeOrgModal() {
  const modal = document.getElementById('orgModal');
  if (modal) {
    modal.classList.remove('show');
    document.getElementById('orgForm').reset();
  }
}

function openClientModal() {
  const modal = document.getElementById('clientModal');
  if (modal) {
    modal.classList.add('show');
    document.getElementById('clientForm').reset();
  }
}

function closeClientModal() {
  const modal = document.getElementById('clientModal');
  if (modal) {
    modal.classList.remove('show');
    document.getElementById('clientForm').reset();
  }
}

function openConvertUserModal() {
  const modal = document.getElementById('convertUserModal');
  if (modal) {
    modal.classList.add('show');
    document.getElementById('convertUserForm').reset();
  }
}

function closeConvertUserModal() {
  const modal = document.getElementById('convertUserModal');
  if (modal) {
    modal.classList.remove('show');
    document.getElementById('convertUserForm').reset();
  }
}

// Close modals when clicking outside
window.addEventListener('click', (e) => {
  const adminModal = document.getElementById('adminModal');
  const orgModal = document.getElementById('orgModal');
  const clientModal = document.getElementById('clientModal');
  const convertUserModal = document.getElementById('convertUserModal');
  const updateOrgModal = document.getElementById('updateOrgModal');
  const orgUsersListModal = document.getElementById('orgUsersListModal');

  if (e.target === adminModal) closeAdminModal();
  if (e.target === orgModal) closeOrgModal();
  if (e.target === clientModal) closeClientModal();
  if (e.target === convertUserModal) closeConvertUserModal();
  if (e.target === updateOrgModal) closeUpdateOrgModal();
  if (e.target === orgUsersListModal) closeOrgUsersListModal();
});

async function createNewAdmin(adminData) {
  try {
    console.log('📤 Sending admin creation request:', adminData);
    await API.createAdmin(adminData);
    showNotification('✅ Admin created successfully!', 'success');
    loadAdminsData();
  } catch (error) {
    console.error('❌ Error creating admin:', error);

    // Check for authorization errors
    const errorMsg = error.message.toLowerCase();
    if (errorMsg.includes('authorization') || errorMsg.includes('permission') || errorMsg.includes('restricted')) {
      showNotification(
        '⛔ PERMISSION DENIED: Only SUPER_ADMIN or INTERNAL_ADMIN can create other admins. Your account role does not have this permission.',
        'error',
        8000
      );
    } else {
      showNotification('❌ Failed to create admin: ' + error.message, 'error');
    }
  }
}

async function createNewOrganization(orgData) {
  try {
    await API.createOrganization(orgData);
    showNotification('Organization created successfully', 'success');
    loadOrganizationsData();
  } catch (error) {
    console.error('Error creating organization:', error);
    showNotification('Failed to create organization: ' + error.message, 'error');
  }
}

async function createNewClient(clientData) {
  try {
    console.log('📤 Sending client creation request:', clientData);
    await API.createClient(clientData);
    showNotification('✅ Client created successfully!', 'success');
    loadAdminsData();
  } catch (error) {
    console.error('❌ Error creating client:', error);
    showNotification('Failed to create client: ' + error.message, 'error');
  }
}

async function convertUserToClientAction(userId, convertReason, role, organizationIds = [], reasonDescription = '') {
  try {
    console.log('📤 Converting user to client:', { userId, convertReason, role, organizationIds, reasonDescription });
    await API.convertUserToClient(userId, convertReason, role, organizationIds, reasonDescription);
    showNotification('✅ User converted to client successfully!', 'success');
    loadAdminsData();
  } catch (error) {
    console.error('❌ Error converting user:', error);
    showNotification('Failed to convert user: ' + error.message, 'error');
  }
}

async function viewAdminActivitiesAction(adminId, reason, reasonDescription = '') {
}

// Organization User Management Functions
async function addUserToOrganization(orgId) {
  const userId = prompt('Enter user ID:');
  if (!userId) return;

  if (!confirmAction('Are you sure you want to add this user to the organization?')) return;

  try {
    await API.addUserToOrganization(orgId, userId);
    showNotification('User added to organization successfully', 'success');
    loadOrganizationsData();
  } catch (error) {
    console.error('Error adding user:', error);
    showNotification('Failed to add user: ' + error.message, 'error');
  }
}

async function removeUserFromOrganization(orgId, userId) {
  if (!confirmAction('Are you sure you want to remove this user from the organization?')) return;

  try {
    await API.removeUserFromOrganization(orgId, userId);
    showNotification('User removed from organization successfully', 'success');
    loadOrganizationsData();
  } catch (error) {
    console.error('Error removing user:', error);
    showNotification('Failed to remove user: ' + error.message, 'error');
  }
}

async function listOrgUsers(orgId) {
  try {
    const users = await API.listOrgUsers(orgId);
    const usersList = users.data || users || [];

    let display = `<table class="data-table" style="width: 100%; margin-top: 10px;">
      <thead>
        <tr>
          <th>Email</th>
          <th>Name</th>
          <th>Role</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>`;

    if (usersList.length === 0) {
      display += `<tr><td colspan="5" style="text-align: center; padding: 20px;">No users found in this organization</td></tr>`;
    } else {
      usersList.forEach(user => {
        display += `<tr>
          <td>${user.email}</td>
          <td>${user.fullName || '-'}</td>
          <td>${user.role || '-'}</td>
          <td>${getStatusBadge(user.isDisabled ? 'disabled' : 'active')}</td>
          <td>
            ${user.isDisabled ?
            `<button class="btn btn-sm btn-secondary" onclick="enableOrgUser('${user._id}')">Enable</button>` :
            `<button class="btn btn-sm btn-warning" onclick="disableOrgUser('${user._id}')">Disable</button>`
          }
            <button class="btn btn-sm btn-danger" onclick="removeUserFromOrganization('${orgId}', '${user._id}')">Remove</button>
          </td>
        </tr>`;
      });
    }

    display += `</tbody></table>`;

    // Use modal instead of alert
    document.getElementById('orgUsersListContainer').innerHTML = display;
    document.getElementById('orgUsersListModal').style.display = 'flex';
  } catch (error) {
    console.error('Error listing org users:', error);
    showNotification('Failed to list users: ' + error.message, 'error');
  }
}

function closeOrgUsersListModal() {
  document.getElementById('orgUsersListModal').style.display = 'none';
  document.getElementById('orgUsersListContainer').innerHTML = '';
}

async function disableOrgUser(orgUserId) {
  if (!confirmAction('Are you sure you want to disable this organization user?')) return;

  try {
    await API.disableOrgUser(orgUserId);
    showNotification('Organization user disabled successfully', 'success');
    // Note: Refresh logic would be implemented if we store current orgId
  } catch (error) {
    console.error('Error disabling org user:', error);
    showNotification('Failed to disable user: ' + error.message, 'error');
  }
}

async function enableOrgUser(orgUserId) {
  if (!confirmAction('Are you sure you want to enable this organization user?')) return;

  try {
    await API.enableOrgUser(orgUserId);
    showNotification('Organization user enabled successfully', 'success');
    // Note: Refresh logic would be implemented if we store current orgId
  } catch (error) {
    console.error('Error enabling org user:', error);
    showNotification('Failed to enable user: ' + error.message, 'error');
  }
}

// CLIENT CONVERSION REQUESTS DISPLAY & MODALS
function displayClientConversionRequests(requests) {
  const tbody = document.getElementById('clientConversionRequestsList');
  if (!requests || requests.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">No client conversion requests found</td></tr>';
    return;
  }

  tbody.innerHTML = requests.map(req => `
    <tr>
      <td>${req.requestId || req._id || 'N/A'}</td>
      <td>${req.userId || 'N/A'}</td>
      <td><span class="badge ${req.status === 'approved' ? 'badge-success' : req.status === 'rejected' ? 'badge-danger' : 'badge-warning'}">${req.status || 'pending'}</span></td>
      <td>${formatDate(req.createdAt)}</td>
      <td>${formatDate(req.updatedAt)}</td>
      <td>
        <button class="btn-sm btn-info" onclick="viewClientConversionRequest('${req.requestId || req._id}')">View</button>
        ${req.status === 'pending' ? `
          <button class="btn-sm btn-success" onclick="approveClientConversionRequest('${req.requestId || req._id}')">Approve</button>
          <button class="btn-sm btn-danger" onclick="rejectClientConversionRequest('${req.requestId || req._id}')">Reject</button>
        ` : ''}
      </td>
    </tr>
  `).join('');
}

function displayOrganizationUserRequests(requests) {
  const tbody = document.getElementById('orgUserRequestsList');
  if (!requests || requests.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">No organization user requests found</td></tr>';
    return;
  }

  tbody.innerHTML = requests.map(req => `
    <tr>
      <td>${req.requestId || req._id || 'N/A'}</td>
      <td>${req.organizationId || 'N/A'}</td>
      <td>${req.userId || 'N/A'}</td>
      <td><span class="badge ${req.status === 'approved' ? 'badge-success' : req.status === 'rejected' ? 'badge-danger' : 'badge-warning'}">${req.status || 'pending'}</span></td>
      <td>${formatDate(req.createdAt)}</td>
      <td>
        <button class="btn-sm btn-info" onclick="viewOrgUserRequest('${req.requestId || req._id}')">View</button>
        ${req.status === 'pending' ? `
          <button class="btn-sm btn-success" onclick="approveOrgUserRequest('${req.requestId || req._id}')">Approve</button>
          <button class="btn-sm btn-danger" onclick="rejectOrgUserRequest('${req.requestId || req._id}')">Reject</button>
        ` : ''}
      </td>
    </tr>
  `).join('');
}

// MODAL FUNCTIONS FOR CLIENT CONVERSION REQUESTS
function openClientConversionReqModal() {
  document.getElementById('clientConversionReqModal').classList.add('show');
}

function closeClientConversionReqModal() {
  document.getElementById('clientConversionReqModal').classList.remove('show');
  document.getElementById('clientConversionReqForm').reset();
  resetConversionFormFields();
}

function updateConversionFormFields() {
  const requestType = document.getElementById('convReqRequestType').value;
  const claimsSection = document.getElementById('organizationClaimsSection');
  const existingOrgContainer = document.getElementById('existingOrgContainer');
  const newOrgContainer = document.getElementById('newOrgContainer');

  if (!requestType) {
    claimsSection.style.display = 'none';
    return;
  }

  claimsSection.style.display = 'block';
  // For now, show both options - user will choose by filling one or the other
  existingOrgContainer.style.display = 'block';
  newOrgContainer.style.display = 'block';
}

function resetConversionFormFields() {
  document.getElementById('organizationClaimsSection').style.display = 'none';
  document.getElementById('existingOrgContainer').style.display = 'none';
  document.getElementById('newOrgContainer').style.display = 'none';
}

// MODAL FUNCTIONS FOR ORG USER REQUESTS
function openOrgUserReqModal() {
  showNotification('Organization User Requests are not yet available in the backend', 'warning');
}

function closeOrgUserReqModal() {
  document.getElementById('orgUserReqModal').classList.remove('show');
  document.getElementById('orgUserReqForm').reset();
}

// MODAL FUNCTIONS FOR ADD ORG USER (Direct)
function openAddOrgUserModal(orgId = null) {
  // Reset form first
  document.getElementById('addOrgUserForm').reset();

  // Auto-populate org ID if provided
  if (orgId) {
    document.getElementById('addOrgUserOrgId').value = orgId;
    console.log('✏️ Add Org User modal opened for Org ID:', orgId);
  } else {
    console.warn('⚠️ No organization ID provided');
  }

  document.getElementById('addOrgUserModal').classList.add('show');
}

function closeAddOrgUserModal() {
  document.getElementById('addOrgUserModal').classList.remove('show');
  document.getElementById('addOrgUserForm').reset();
}

// FORM SUBMISSION HANDLERS
async function handleClientConversionReqSubmit(e) {
  e.preventDefault();

  try {
    const userId = document.getElementById('convReqUserId').value;
    const requestType = document.getElementById('convReqRequestType').value;
    const conversionReason = document.getElementById('convReqConversionReason').value;
    const reasonDescription = document.getElementById('convReqReasonDescription').value || '';

    // Collect existing organization data
    const organizations = [];
    const existingOrgId = document.querySelector('.existingOrgId')?.value;
    const existingOrgEmail = document.querySelector('.existingOrgEmail')?.value;

    if (existingOrgId && existingOrgEmail) {
      organizations.push({
        organizationId: existingOrgId,
        workEmail: existingOrgEmail,
        designation: document.querySelector('.existingOrgDesignation')?.value || null,
        message: document.querySelector('.existingOrgMessage')?.value || null
      });
    }

    // Collect new organization data
    const newOrganizations = [];
    const newOrgName = document.querySelector('.newOrgName')?.value;
    const newOrgWebsite = document.querySelector('.newOrgWebsite')?.value;
    const newOrgEmail = document.querySelector('.newOrgEmail')?.value;

    if (newOrgName && newOrgWebsite && newOrgEmail) {
      newOrganizations.push({
        organizationName: newOrgName,
        website: newOrgWebsite,
        workEmail: newOrgEmail,
        designation: document.querySelector('.newOrgDesignation')?.value || null,
        message: document.querySelector('.newOrgMessage')?.value || null
      });
    }

    // Validate required fields
    if (!userId || !requestType || !conversionReason) {
      showNotification('Please fill all required fields', 'warning');
      return;
    }

    if (organizations.length === 0 && newOrganizations.length === 0) {
      showNotification('Please provide at least one organization claim', 'warning');
      return;
    }

    const requestData = {
      userId,
      requestType,
      conversionReason,
      reasonDescription,
      organizations,
      newOrganizations
    };

    await API.createClientConversionRequest(requestData);
    showNotification('Client conversion request created successfully', 'success');
    closeClientConversionReqModal();
    // Reload the list
    await loadClientConversionRequests();
  } catch (error) {
    console.error('Error creating client conversion request:', error);
    showNotification('Failed to create request: ' + error.message, 'error');
  }
}

async function handleOrgUserReqSubmit(e) {
  e.preventDefault();
  showNotification('Organization User Requests are not yet available in the backend', 'warning');
}

// ACTION HANDLERS
async function approveClientConversionRequest(requestId) {
  showNotification('Client Conversion Request approval is not yet available in the backend', 'warning');
}

async function rejectClientConversionRequest(requestId) {
  showNotification('Client Conversion Request rejection is not yet available in the backend', 'warning');
}

async function approveOrgUserRequest(requestId) {
  showNotification('Organization User Requests are not yet available in the backend', 'warning');
}

async function rejectOrgUserRequest(requestId) {
  showNotification('Organization User Requests are not yet available in the backend', 'warning');
}

async function viewClientConversionRequest(requestId) {
  showNotification('Client Conversion Request details are not yet available in the backend', 'warning');
}

async function viewOrgUserRequest(requestId) {
  showNotification('Organization User Requests are not yet available in the backend', 'warning');
}

// DATA LOADING FUNCTIONS
async function loadClientConversionRequests() {
  try {
    const result = await API.listClientConversionRequests(1, 20);
    dashboardData.clientConversionRequests = result.data || result || [];
    displayClientConversionRequests(dashboardData.clientConversionRequests);

    // Show disabled message if empty
    if (dashboardData.clientConversionRequests.length === 0) {
      const container = document.getElementById('clientConversionRequestsContent');
      if (container) {
        container.innerHTML = `
          <div class="disabled-module-message">
            <h3>⚠️ Feature Coming Soon</h3>
            <p>Client Conversion Request listing is not yet available in the backend.</p>
            <p style="font-size: 12px; color: #999; margin-top: 10px;">Only the 'Create' request feature is available.</p>
          </div>
        `;
      }
    }
  } catch (error) {
    console.error('Error loading client conversion requests:', error);
    const container = document.getElementById('clientConversionRequestsContent');
    if (container) {
      container.innerHTML = `
        <div class="disabled-module-message">
          <h3>⚠️ Feature Coming Soon</h3>
          <p>Client Conversion Request listing is not yet available in the backend.</p>
          <p style="font-size: 12px; color: #999; margin-top: 10px;">Only the 'Create' request feature is available.</p>
        </div>
      `;
    }
  }
}

async function loadOrganizationUserRequests() {
  try {
    const result = await API.listOrganizationChangeRequests(1, 20);
    dashboardData.organizationUserRequests = result.data || result || [];
    displayOrganizationUserRequests(dashboardData.organizationUserRequests);
  } catch (error) {
    console.error('Error loading organization user requests:', error);
    const container = document.getElementById('organizationUserRequestsContent');
    if (container) {
      container.innerHTML = `
        <div class="disabled-module-message">
          <h3>⚠️ Feature Coming Soon</h3>
          <p>Organization User Request management is not yet available in the backend.</p>
          <p style="font-size: 12px; color: #999; margin-top: 10px;">This feature will be enabled in a future update.</p>
        </div>
      `;
    }
  }
}

// DEMO DATA LOADING FUNCTIONS REMOVED - Using real API calls instead

console.log('✅ Dashboard script loaded - Ready for real backend integration');

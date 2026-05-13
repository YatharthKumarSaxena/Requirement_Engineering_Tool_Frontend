/**
 * app.js
 * Main application entry point and initialization
 */

import { store } from './store/store.js';
import { showToast } from './utils/helpers.js';
import { STORAGE_KEYS } from './utils/constants.js';

// Dev: add startup log
console.log("srems-frontend: app.js loaded");
// ═══════════════════════════════════════════════════════════════════════════
// DEVICE MANAGEMENT FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get Device UUID - generated once per browser, stored in localStorage
 * Required by backend for device authentication
 */
function getDeviceUUID() {
  let uuid = localStorage.getItem('deviceUUID');
  if (!uuid) {
    uuid = crypto.randomUUID();
    localStorage.setItem('deviceUUID', uuid);
  }
  return uuid;
}

/**
 * Get Device Type - auto-detect from user agent
 * Returns: MOBILE, TABLET, or LAPTOP
 */
function getDeviceType() {
  const ua = navigator.userAgent.toLowerCase();
  if (/mobile|android|iphone/.test(ua)) return 'MOBILE';
  if (/tablet|ipad/.test(ua)) return 'TABLET';
  return 'LAPTOP';
}

/**
 * Get Device Name - extract from user agent string
 */
function getDeviceName() {
  return navigator.userAgent.split(')')[0].split('(')[1] || 'Browser';
}

/**
 * Build auth headers with device info and token
 * Call this in ALL API requests
 */
function authHeaders() {
  const token = localStorage.getItem('accessToken');
  const headers = {
    'x-device-uuid': getDeviceUUID()
  };
  if (token) {
    headers['x-access-token'] = token;
  }
  return headers;
}

/**
 * Save new token from response header
 * Backend sends token in response header: x-access-token
 */
function saveNewToken(res) {
  const token = res.headers.get('x-access-token');
  if (token) {
    localStorage.setItem('accessToken', token);
  }
}

class App {
  constructor() {
    this.store = store;
    this.isInitialized = false;
  }

  /**
   * Initialize application
   */
  async init() {
    try {
      console.log('[App] Initializing...');
      
      // ✅ CHECK AUTHENTICATION TOKEN
      const token = localStorage.getItem('accessToken');
      const deviceUUID = localStorage.getItem('deviceUUID');
      
      if (!token) {
        console.log('[App] ⚠️  No authentication token found. Redirecting to login...');
        showToast('Session expired. Please login again.', 'warning');
        // Redirect to Authentication Dashboard
        window.location.href = 'http://localhost:5500';
        return;
      }
      
      console.log('[App] ✅ Auth token found');
      console.log('[App] ✅ Device UUID:', deviceUUID);
      
      // Load persisted state
      this.store.loadPersistedState();
      
      // Check if user is authenticated
      const user = this.store.getState('user');
      if (user.isAuthenticated) {
        console.log('[App] User authenticated:', user.id);
      } else {
        console.log('[App] No authenticated user');
      }
      
      // Initialize UI
      this.setupEventListeners();
      this.setupNavigation();
      this.updateUserDisplay();
      this.applyRoleBasedUI();
      
      // Subscribe to store changes
      this.store.subscribe((state) => this.onStateChange(state));
      
      this.isInitialized = true;
      console.log('[App] Initialization complete');
      
      // DEBUG: Log sidebar scrollbar status
      setTimeout(() => this.debugSidebarScrollbar(), 500);
      
      
    } catch (error) {
      console.error('[App] Initialization failed:', error);
      showToast('Failed to initialize application', 'error');
    }
  }

  /**
   * Setup global event listeners
   */
  setupEventListeners() {
    // Handle navigation
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[data-link]');
      if (link) {
        e.preventDefault();
        this.navigateTo(link.getAttribute('data-link'));
      }
    });

    // Handle collapsible sections in sidebar
    document.querySelectorAll('.collapsible-section').forEach(title => {
      title.addEventListener('click', (e) => {
        e.stopPropagation();
        const section = title.closest('.nav-section');
        const sectionId = title.getAttribute('data-section');
        
        if (section) {
          section.classList.toggle('collapsed');
          title.classList.toggle('collapsed');
          
          // Save collapse state to localStorage
          const collapsedSections = JSON.parse(localStorage.getItem('sidebarCollapsed') || '{}');
          collapsedSections[sectionId] = section.classList.contains('collapsed');
          localStorage.setItem('sidebarCollapsed', JSON.stringify(collapsedSections));
        }
      });
    });

    // Restore collapse state from localStorage
    const collapsedSections = JSON.parse(localStorage.getItem('sidebarCollapsed') || '{}');
    Object.entries(collapsedSections).forEach(([sectionId, isCollapsed]) => {
      if (isCollapsed) {
        const section = document.querySelector(`.nav-section [data-section="${sectionId}"]`)?.closest('.nav-section');
        const title = document.querySelector(`.collapsible-section[data-section="${sectionId}"]`);
        if (section && title) {
          section.classList.add('collapsed');
          title.classList.add('collapsed');
        }
      }
    });

    // Handle sidebar toggle
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('mainSidebar');
    if (sidebarToggle && sidebar) {
      sidebarToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        sidebar.classList.toggle('show');
      });

      // Close sidebar when clicking outside
      document.addEventListener('click', (e) => {
        if (sidebar.classList.contains('show') && 
            !sidebar.contains(e.target) && 
            e.target !== sidebarToggle) {
          sidebar.classList.remove('show');
        }
      });

      // Close sidebar when a link is clicked
      sidebar.querySelectorAll('a[data-link]').forEach(link => {
        link.addEventListener('click', () => {
          if (window.innerWidth < 769) {
            sidebar.classList.remove('show');
          }
        });
      });
    }

    // Handle theme toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        const currentTheme = this.store.getState('ui')?.theme || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        this.store.setTheme(newTheme);
      });
    }

    // Handle logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        this.logout();
      });
    }

    // Handle modal close
    document.addEventListener('click', (e) => {
      const modal = document.getElementById('appModal');
      if (modal && e.target === modal) {
        this.closeModal();
      }
      
      const closeBtn = e.target.closest('.modal-close-btn');
      if (closeBtn) {
        this.closeModal();
      }
    });

    // Handle form submission
    document.addEventListener('submit', (e) => {
      const form = e.target;
      if (form.classList.contains('form-validated')) {
        // Validation will be handled by individual form handlers
      }
    });

    // Listen for Escape key to close modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const modal = document.getElementById('appModal');
        if (modal && modal.classList.contains('show')) {
          this.closeModal();
        }
      }
    });

    // Handle resize to hide sidebar on large screens
    window.addEventListener('resize', () => {
      if (window.innerWidth >= 769 && sidebar) {
        sidebar.classList.remove('show');
      }
    });
  }

  /**
   * Setup navigation routing
   */
  setupNavigation() {
    const hash = window.location.hash;
    if (hash) {
      this.loadPage(hash.substring(2)); // Remove '#/'
    } else {
      this.loadPage('/');
    }

    // Listen for hash changes
    window.addEventListener('hashchange', (e) => {
      const hash = window.location.hash;
      if (hash) {
        this.loadPage(hash.substring(2));
      } else {
        this.loadPage('/');
      }
    });
  }

  /**
   * DEBUG: Check sidebar scrollbar CSS and element properties
   */
  debugSidebarScrollbar() {
    console.log('🔍 [DEBUG] Checking Sidebar Scrollbar Status...');
    
    const sidebar = document.querySelector('.sidebar');
    const sidebarNav = document.querySelector('.sidebar-nav');
    
    if (!sidebar) {
      console.error('❌ [DEBUG] .sidebar element NOT FOUND!');
      return;
    }
    
    if (!sidebarNav) {
      console.error('❌ [DEBUG] .sidebar-nav element NOT FOUND!');
      return;
    }
    
    console.log('✅ [DEBUG] Sidebar elements found');
    
    // Get computed styles
    const sidebarStyle = window.getComputedStyle(sidebar);
    const navStyle = window.getComputedStyle(sidebarNav);
    
    console.log('📊 [DEBUG] .sidebar computed properties:');
    console.log('  - height:', sidebarStyle.height);
    console.log('  - max-height:', sidebarStyle.maxHeight);
    console.log('  - overflow:', sidebarStyle.overflow);
    console.log('  - display:', sidebarStyle.display);
    console.log('  - flex-direction:', sidebarStyle.flexDirection);
    
    console.log('📊 [DEBUG] .sidebar-nav computed properties:');
    console.log('  - height:', navStyle.height);
    console.log('  - max-height:', navStyle.maxHeight);
    console.log('  - overflow-y:', navStyle.overflowY);
    console.log('  - overflow-x:', navStyle.overflowX);
    console.log('  - scrollbar-width:', navStyle.scrollbarWidth);
    console.log('  - flex:', navStyle.flex);
    
    // Check actual element dimensions
    console.log('📐 [DEBUG] Element dimensions:');
    console.log('  - sidebar.scrollHeight:', sidebar.scrollHeight);
    console.log('  - sidebar.clientHeight:', sidebar.clientHeight);
    console.log('  - sidebarNav.scrollHeight:', sidebarNav.scrollHeight);
    console.log('  - sidebarNav.clientHeight:', sidebarNav.clientHeight);
    
    // Check if scrolling is needed
    const needsScroll = sidebarNav.scrollHeight > sidebarNav.clientHeight;
    console.log('🔄 [DEBUG] Scrolling needed?', needsScroll ? '✅ YES' : '❌ NO');
    
    if (needsScroll) {
      console.log('✅ [DEBUG] Sidebar should be scrollable!');
    } else {
      console.log('⚠️  [DEBUG] Content fits in viewport - no scrolling needed');
      console.log('    Content height:', sidebarNav.scrollHeight, 'vs Container:', sidebarNav.clientHeight);
    }
    
    // 🧪 TEST IF SCROLLING ACTUALLY WORKS
    console.log('\n🧪 [DEBUG] TESTING SCROLL FUNCTIONALITY...');
    const scrollPositionBefore = sidebarNav.scrollTop;
    console.log('  - Scroll position BEFORE:', scrollPositionBefore);
    
    // Test 1: Try to scroll down by 100px
    sidebarNav.scrollTop = 100;
    const scrollPositionAfter = sidebarNav.scrollTop;
    console.log('  - Scroll position AFTER setting to 100:', scrollPositionAfter);
    console.log('  - Scroll worked?', scrollPositionAfter === 100 ? '✅ YES' : '❌ NO');
    
    // Test 2: Try to scroll to bottom
    const maxScroll = sidebarNav.scrollHeight - sidebarNav.clientHeight;
    sidebarNav.scrollTop = maxScroll;
    console.log('  - Max scrollable height:', maxScroll);
    console.log('  - Scroll position after max scroll:', sidebarNav.scrollTop);
    console.log('  - Reached bottom?', sidebarNav.scrollTop >= maxScroll - 10 ? '✅ YES' : '❌ NO');
    
    // Reset scroll to top
    sidebarNav.scrollTop = 0;
    
    // Check CSS rules
    console.log('\n📋 [DEBUG] Checking stylesheet rules...');
    for (let sheet of document.styleSheets) {
      try {
        for (let rule of sheet.cssRules || sheet.rules) {
          if (rule.selectorText && rule.selectorText.includes('sidebar-nav')) {
            console.log('  - Found rule:', rule.selectorText);
            console.log('    Style:', rule.style.cssText);
          }
        }
      } catch (e) {
        // Skip CORS errors
      }
    }
  }

  /**
   * Update active menu item in sidebar
   */
  updateActiveMenu(route) {
    // Remove active class from all menu items
    document.querySelectorAll('.sidebar-menu-item').forEach(item => {
      item.classList.remove('active');
    });

    // Add active class to current page menu item
    const cleanRoute = route.split('?')[0] || '/';
    const routeName = cleanRoute === '/' ? 'dashboard' : cleanRoute;

    const activeLink = document.querySelector(`.sidebar-menu-item[data-page="${routeName}"]`);
    if (activeLink) {
      activeLink.classList.add('active');
    }
  }

  /**
   * Load page dynamically
   */
  async loadPage(route) {
    const mainContent = document.getElementById('page-content');
    if (!mainContent) {
      console.error('[App] Main content element not found!');
      return;
    }

    console.log('[App] Loading page:', route);

    try {
      const pagePath = this.getPagePath(route);
      console.log('[App] Fetching:', pagePath);
      
      const response = await fetch(pagePath);
      console.log('[App] Response status:', response.status);
      
      if (!response.ok) throw new Error(`Page not found: ${route} (${response.status})`);
      
      const html = await response.text();
      mainContent.innerHTML = html;
      console.log('[App] Page HTML loaded');

      // Update active menu item in sidebar
      this.updateActiveMenu(route);

      // Load and initialize page controller
      await this.initializePageController(route);
    } catch (error) {
      console.error('[App] Failed to load page:', error);
      mainContent.innerHTML = `
        <div class="error-page">
          <h2>Page Not Found</h2>
          <p>${error.message}</p>
          <button class="btn btn-primary" onclick="window.location.hash='#/'">Go to Dashboard</button>
        </div>
      `;
    }
  }

  /**
   * Map route to page path
   */
  getPagePath(route) {
    const routes = {
      '/': './src/pages/dashboard.html',
      'projects': './src/pages/projects.html',
      'project-detail': './src/pages/project-detail.html',
      'inception-detail': './src/pages/inception-detail.html',
      'elicitation-detail': './src/pages/elicitation-detail.html',
      'elaboration-detail': './src/pages/elaboration-detail.html',
      'requirements': './src/pages/requirements.html',
      'scope': './src/pages/scope.html',
      'features': './src/pages/features.html',
      'ideas': './src/pages/ideas.html',
      'stakeholders': './src/pages/stakeholders.html',
      'elaboration': './src/pages/elaboration.html',
      'negotiation': './src/pages/negotiation.html',
      'specification': './src/pages/specification.html',
      'validation': './src/pages/validation.html',
      'activity': './src/pages/activity.html',
      'elicitation': './src/pages/elicitation.html',
      'inception': './src/pages/inception.html',
      'product-request': './src/pages/product-request.html',
      'product-vision': './src/pages/product-vision.html',
      'meetings': './src/pages/meetings.html',
      'participants': './src/pages/participants.html',
      'comments': './src/pages/comments.html'
    };

    const cleanRoute = route.split('?')[0]; // Remove query params
    return routes[cleanRoute] || './src/pages/dashboard.html';
  }

  /**
   * Initialize page controller
   */
  async initializePageController(route) {
    let cleanRoute = route.split('?')[0];
    
    // Normalize empty route to dashboard
    if (!cleanRoute || cleanRoute === '') {
      cleanRoute = '/';
    }
    
    const controllers = {
      'projects': () => import('../pages/projects.js').then(m => new m.ProjectsPage()),
      'project-detail': () => import('../pages/project-detail.js').then(m => new m.ProjectDetailPage()),
      'inception': () => import('../pages/inception.js').then(m => new m.InceptionPage()),
      'inception-detail': () => import('../pages/inception-detail.js').then(m => new m.InceptionDetailPage()),
      'elicitation': () => import('../pages/elicitation.js').then(m => new m.ElicitationPage()),
      'elicitation-detail': () => import('../pages/elicitation-detail.js').then(m => new m.ElicitationDetailPage()),
      'elaboration': () => import('../pages/elaboration.js').then(m => new m.ElaborationPage()),
      'elaboration-detail': () => import('../pages/elaboration-detail.js').then(m => new m.ElaborationDetailPage()),
      'requirements': () => import('../pages/requirements.js').then(m => new m.RequirementsPage()),
      'scope': () => import('../pages/scope.js').then(m => new m.ScopePage()),
      'features': () => import('../pages/features.js').then(m => new m.FeaturesPage()),
      'ideas': () => import('../pages/ideas.js').then(m => new m.IdeasPage()),
      'stakeholders': () => import('../pages/stakeholders.js').then(m => new m.StakeholdersPage()),
      'negotiation': () => import('../pages/negotiation.js').then(m => new m.NegotiationPage()),
      'specification': () => import('../pages/specification.js').then(m => new m.SpecificationPage()),
      'validation': () => import('../pages/validation.js').then(m => new m.ValidationPage()),
      'activity': () => import('../pages/activity.js').then(m => new m.ActivityPage()),
      'product-request': () => import('../pages/product-request.js').then(m => new m.ProductRequestPage()),
      'product-vision': () => import('../pages/product-vision.js').then(m => new m.ProductVisionPage()),
      'meetings': () => import('../pages/meetings.js').then(m => new m.MeetingsPage()),
      'participants': () => import('../pages/participants.js').then(m => new m.ParticipantsPage()),
      'comments': () => import('../pages/comments.js').then(m => new m.CommentsPage()),
      '/': () => import('../pages/dashboard.js').then(m => new m.DashboardPage()),
    };

    const loader = controllers[cleanRoute];
    if (loader) {
      try {
        const controller = await loader();
        console.log('[App] Page controller initialized successfully:', cleanRoute, controller);
      } catch (error) {
        console.error('[App] Failed to initialize page controller for route:', cleanRoute, error);
        console.error('[App] Error details:', error.message, error.stack);
      }
    } else {
      console.warn('[App] No controller found for route:', cleanRoute);
    }
  }

  /**
   * Navigate to a route
   */
  navigateTo(route) {
    window.location.hash = '#' + (route.startsWith('/') ? route : '/' + route);
  }

  /**
   * Show modal
   */
  openModal(modalType, data = null) {
    this.store.toggleModal(modalType);
    
    // Emit custom event for modal handlers
    window.dispatchEvent(new CustomEvent('modal:open', { detail: { type: modalType, data } }));
  }

  /**
   * Close modal
   */
  closeModal() {
    const modal = document.querySelector('.modal.show');
    if (modal) {
      modal.classList.remove('show');
      
      const backdrop = document.querySelector('.modal-backdrop.show');
      if (backdrop) {
        backdrop.classList.remove('show');
      }
      
      this.store.toggleModal(null);
    }
  }

  /**
   * Handle state changes
   */
  onStateChange(state) {
    // Update UI when state changes
    this.updateUserDisplay();
    this.updateNotifications(state);
    this.updateModal(state);
    this.updateTheme(state);
  }

  /**
   * Update notifications
   */
  updateNotifications(state) {
    const notification = state.ui.notification;
    if (notification) {
      showToast(notification.message, notification.type);
    }
  }

  /**
   * Update modal visibility
   */
  updateModal(state) {
    const modal = document.querySelector('.modal');
    const backdrop = document.querySelector('.modal-backdrop');
    
    if (!modal || !backdrop) return;

    if (state.ui.modalOpen) {
      modal.classList.add('show');
      backdrop.classList.add('show');
    } else {
      modal.classList.remove('show');
      backdrop.classList.remove('show');
    }
  }

  /**
   * Update theme
   */
  updateTheme(state) {
    const theme = state.ui.theme;
    document.documentElement.setAttribute('data-theme', theme);
    const themeToggleBtn = document.getElementById('themeToggle');
    
    if (theme === 'dark') {
      document.body.classList.add('dark-mode');
      document.body.classList.remove('light-mode');
      if (themeToggleBtn) themeToggleBtn.textContent = '◑';
    } else {
      document.body.classList.remove('dark-mode');
      document.body.classList.add('light-mode');
      if (themeToggleBtn) themeToggleBtn.textContent = '◐';
    }
  }

  /**
   * Update user display name in header
   */
  updateUserDisplay() {
    const userNameElement = document.getElementById('user-name');
    if (!userNameElement) return;

    // Try to get from localStorage first (from signup)
    let displayName = localStorage.getItem('userName');
    
    if (!displayName) {
      // Fallback: Get email from localStorage and extract username
      const email = localStorage.getItem('signupEmail');
      if (email) {
        displayName = email.split('@')[0]
          .replace(/[._-]/g, ' ')  // Replace separators with spaces
          .split(' ')              // Split by spaces
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))  // Capitalize each word
          .join(' ');              // Join back
      }
    }
    
    if (displayName) {
      userNameElement.textContent = displayName;
    }
  }

  /**
   * Apply role-based UI adjustments (e.g., hide admin elements for clients)
   */
  applyRoleBasedUI() {
    // Determine role from localStorage (default to admin if not set for safety)
    const role = localStorage.getItem('user_role');
    
    // Check if the role is a client role
    const clientRoles = ['sponsor', 'partner', 'vendor', 'end_user', 'other'];
    if (clientRoles.includes(role)) {
      document.body.classList.add('client-mode');
      console.log('[App] Client mode enabled. Hiding admin-only elements.');
    } else {
      document.body.classList.remove('client-mode');
    }
  }


  showError(message) {
    this.store.addNotification(message, 'error');
  }

  /**
   * Show success notification
   */
  showSuccess(message) {
    this.store.addNotification(message, 'success');
  }

  /**
   * Show warning notification
   */
  showWarning(message) {
    this.store.addNotification(message, 'warning');
  }

  /**
   * Get store
   */
  getStore() {
    return this.store;
  }

  /**
   * Get user
   */
  getUser() {
    return this.store.getState('user');
  }

  /**
   * Logout - clear tokens and redirect to login
   */
  logout() {
    // Clear all authentication tokens from localStorage
    localStorage.clear();
    sessionStorage.clear();
    
    // Clear store
    this.store.logout();
    
    // Show message and redirect
    showToast('Logged out successfully', 'success');
    
    // Redirect to project folder's index.html
    setTimeout(() => {
      window.location.href = 'http://127.0.0.1:5500/PROJECT/project/index.html';
    }, 1000);
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return this.store.getState('user.isAuthenticated');
  }

  /**
   * Get current project
   */
  getCurrentProject() {
    return this.store.getState('projects.current');
  }

  /**
   * Set current project
   */
  setCurrentProject(project) {
    this.store.setCurrentProject(project);
  }
}

// Create and export singleton instance
export const app = new App();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.init());
} else {
  app.init();
}

// Export for global access
window.app = app;

export default app;

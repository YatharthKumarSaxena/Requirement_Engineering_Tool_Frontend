// Immediate startup check
console.log("✅ dashboard.js loading...");

if (!window.RUNTIME_ENV) {
  console.error("❌ RUNTIME_ENV not defined!");
} else {
  console.log("✅ RUNTIME_ENV found");
}

const API_BASE = window.RUNTIME_ENV?.API_BASE_URL || "NOT_DEFINED";
console.log("📍 API_BASE:", API_BASE);

// ===== ANIMATE STAT COUNTERS =====
function animateStatCounters() {
  const statNumbers = document.querySelectorAll('.stat-number[data-target]');
  
  statNumbers.forEach(element => {
    const target = parseFloat(element.getAttribute('data-target'));
    const isPercent = element.getAttribute('data-format') === 'percent';
    const duration = 1500; // 1.5 seconds
    const startTime = performance.now();
    
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth animation
      const easeOutQuad = 1 - Math.pow(1 - progress, 2);
      const current = target * easeOutQuad;
      
      // Format number - handle decimals for percentages
      let displayValue;
      if (isPercent && current < target) {
        displayValue = current.toFixed(1); // Show one decimal for percentages
      } else if (current >= 1000) {
        displayValue = Math.floor(current).toLocaleString();
      } else {
        displayValue = Math.floor(current).toString();
      }
      
      // Update only the stat-value span, preserving suffix symbols
      const valueSpan = element.querySelector('.stat-value');
      if (valueSpan) {
        valueSpan.textContent = displayValue;
      }
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  });
}

// Call on page load
setTimeout(animateStatCounters, 500);

// ===== Toggle Eye Icon for Password Fields =====
document.querySelectorAll(".toggle-eye").forEach(eye => {
  eye.addEventListener("click", () => {
    const input = document.getElementById(eye.dataset.target);
    if (input) {
      input.type = input.type === "password" ? "text" : "password";
    }
  });
});

function getDeviceUUID() {
  let uuid = localStorage.getItem("deviceUUID");
  if (!uuid) { uuid = crypto.randomUUID(); localStorage.setItem("deviceUUID", uuid); }
  console.log("   🆔 Device UUID:", uuid);
  return uuid;
}

function authHeaders() {
  const token = localStorage.getItem("accessToken");
  const headers = { "x-device-uuid": getDeviceUUID() };
  if (token) {
    headers["x-access-token"] = token;
    console.log("   🔐 Token found (length:", token.length + ")");
  } else {
    console.warn("   ⚠️  No token in localStorage!");
  }
  console.log("   📤 Headers:", headers);
  return headers;
}

function saveNewToken(res) {
  const t = res.headers.get("x-access-token");
  if (t) {
    localStorage.setItem("accessToken", t);
    console.log("   💾 New token saved (length:", t.length + ")");
  }
}

/**
 * Navigate to Software Management Dashboard
 * Validates token and device UUID before redirecting
 */
function goToSoftwareManagement() {
  // Check if token exists
  const token = localStorage.getItem("accessToken");
  const deviceUUID = localStorage.getItem("deviceUUID");
  
  if (!token) {
    console.warn("❌ No authentication token found");
    alert("❌ Session expired. Please login again.");
    window.location.href = "./login.html";
    return;
  }
  
  if (!deviceUUID) {
    console.warn("❌ Device not registered");
    alert("❌ Device not registered. Please refresh the page.");
    return;
  }
  
  console.log("✅ Redirecting to Software Management Dashboard");
  console.log("   Token length:", token.length);
  console.log("   Device UUID:", deviceUUID);

  const basePrefix = window.location.pathname.includes('/PROJECT/') ? '/PROJECT' : '';
  
  // Redirect to Software Management Frontend Dashboard (Port 5500 - hash-based routing)
  window.location.href = `${window.location.origin}${basePrefix}/srems-frontend/index.html#/`;
}

/**
 * Navigate to Admin Panel
 * Validates token and device UUID before redirecting
 */
function goToAdminPanel() {
  const token = localStorage.getItem("accessToken");
  const deviceUUID = localStorage.getItem("deviceUUID");
  
  if (!token) {
    console.warn("❌ No authentication token found");
    alert("❌ Session expired. Please login again.");
    window.location.href = "./login.html";
    return;
  }
  
  if (!deviceUUID) {
    console.warn("❌ Device not registered");
    alert("❌ Device not registered. Please refresh the page.");
    return;
  }
  
  console.log("✅ Redirecting to Admin Panel");
  console.log("   Token length:", token.length);
  console.log("   Device UUID:", deviceUUID);

  const basePrefix = window.location.pathname.includes('/PROJECT/') ? '/PROJECT' : '';
  
  // Redirect to Admin Panel
  window.location.href = `${window.location.origin}${basePrefix}/admin-panel/index.html`;
}

/**
 * Check user type and show admin button if user is admin
 * Admin = NOT "USER" and NOT "CLIENT"
 */
function checkAndShowAdminButton(userType) {
  const adminBtn = document.getElementById("goToAdminPanelBtn");
  
  console.log("🔐 checkAndShowAdminButton() called");
  console.log("   Button element:", adminBtn);
  
  if (!adminBtn) {
    console.warn("⚠️ Admin button element not found in DOM!");
    return;
  }
  
  console.log("🔍 Admin Check Logic:");
  console.log("   userType value:", userType);
  console.log("   userType === 'USER'?", userType === "USER");
  console.log("   userType === 'CLIENT'?", userType === "CLIENT");
  
  // Show button if userType is NOT "USER" and NOT "CLIENT"
  const isAdmin = userType !== "USER" && userType !== "CLIENT";
  console.log("   RESULT - Is Admin?", isAdmin);
  
  if (isAdmin) {
    console.log("✅ User is ADMIN - SHOWING button");
    adminBtn.style.display = "flex";
    console.log("   Button display style set to:", adminBtn.style.display);
  } else {
    console.log("❌ User is NOT admin - HIDING button");
    adminBtn.style.display = "none";
    console.log("   Button display style set to:", adminBtn.style.display);
  }
}

/**
 * Check user type and show/hide management button
 * Hide if userType = "USER", show otherwise
 */
function checkAndShowManagementButton(userType) {
  const managementBtn = document.getElementById("goToSoftwareBtn");
  
  console.log("📊 checkAndShowManagementButton() called");
  console.log("   Button element:", managementBtn);
  
  if (!managementBtn) {
    console.warn("⚠️ Management button element not found in DOM!");
    return;
  }
  
  console.log("🔍 Management Check Logic:");
  console.log("   userType value:", userType);
  console.log("   userType === 'USER'?", userType === "USER");
  
  // Hide button if userType is "USER", show otherwise
  const isStandardUser = userType === "USER";
  console.log("   RESULT - Is Standard USER?", isStandardUser);
  
  if (isStandardUser) {
    console.log("❌ User is STANDARD USER - HIDING management button");
    managementBtn.style.display = "none";
    console.log("   Button display style set to:", managementBtn.style.display);
  } else {
    console.log("✅ User is NOT standard USER - SHOWING management button");
    managementBtn.style.display = "flex";
    console.log("   Button display style set to:", managementBtn.style.display);
  }
}

// ===== NOTIFICATIONS SYSTEM =====
let notifications = [
  {
    id: 1,
    type: "success",
    title: "Welcome Back!",
    message: "Your account is secure and ready to use.",
    time: "Just now",
    read: false
  },
  {
    id: 2,
    type: "info",
    title: "Security Update",
    message: "Your account health score is 65%. Enable 2FA for better security.",
    time: "2 hours ago",
    read: false
  },
  {
    id: 3,
    type: "warning",
    title: "New Login",
    message: "New login detected from Chrome on Windows. If this wasn't you, secure your account.",
    time: "5 hours ago",
    read: true
  }
];

function setupNotificationPanel() {
  const overlay = document.getElementById("notificationsOverlay");
  const closeBtn = document.getElementById("closeNotifications");
  const clearAllBtn = document.getElementById("clearAllNotifications");
  
  if (overlay) {
    overlay.addEventListener("click", closeNotificationPanel);
  }
  
  if (closeBtn) {
    closeBtn.addEventListener("click", closeNotificationPanel);
  }
  
  if (clearAllBtn) {
    clearAllBtn.addEventListener("click", (e) => {
      e.preventDefault();
      clearAllNotifications();
    });
  }
  
  renderNotifications();
  updateNotificationBadge();
}

function toggleNotificationPanel() {
  const panel = document.getElementById("notificationsPanel");
  const overlay = document.getElementById("notificationsOverlay");
  
  panel.classList.toggle("active");
  overlay.classList.toggle("active");
  
  if (panel.classList.contains("active")) {
    markAllAsRead();
    updateNotificationBadge();
  }
}

function closeNotificationPanel() {
  const panel = document.getElementById("notificationsPanel");
  const overlay = document.getElementById("notificationsOverlay");
  
  panel.classList.remove("active");
  overlay.classList.remove("active");
}

function renderNotifications() {
  const notificationsList = document.getElementById("notificationsList");
  
  if (!notificationsList) return;
  
  if (notifications.length === 0) {
    notificationsList.innerHTML = `
      <div class="notifications-empty">
        <span class="material-icons">notifications_none</span>
        <p>No notifications yet</p>
      </div>
    `;
    return;
  }
  
  notificationsList.innerHTML = notifications.map(notif => `
    <div class="notification-item ${!notif.read ? 'unread' : ''}" data-id="${notif.id}">
      <div class="notification-icon ${notif.type}">
        <span class="material-icons" style="font-size: 20px;">
          ${getNotificationIcon(notif.type)}
        </span>
      </div>
      <div class="notification-content">
        <h4 class="notification-title">${notif.title}</h4>
        <p class="notification-message">${notif.message}</p>
        <p class="notification-time">${notif.time}</p>
      </div>
    </div>
  `).join("");
  
  // Add event listeners for dismissal
  document.querySelectorAll(".notification-item").forEach(item => {
    item.addEventListener("click", function() {
      const id = parseInt(this.dataset.id);
      dismissNotification(id);
    });
  });
}

function getNotificationIcon(type) {
  const icons = {
    success: "check_circle",
    warning: "warning",
    error: "error",
    info: "info"
  };
  return icons[type] || "notifications";
}

function dismissNotification(id) {
  notifications = notifications.filter(n => n.id !== id);
  renderNotifications();
  updateNotificationBadge();
}

function clearAllNotifications() {
  notifications = [];
  renderNotifications();
  updateNotificationBadge();
  closeNotificationPanel();
}

function markAllAsRead() {
  notifications.forEach(n => n.read = true);
  renderNotifications();
}

function updateNotificationBadge() {
  const badge = document.getElementById("notificationBadge");
  const unreadCount = notifications.filter(n => !n.read).length;
  
  if (badge) {
    if (unreadCount === 0) {
      badge.style.display = "none";
    } else {
      badge.style.display = "flex";
      badge.textContent = unreadCount > 9 ? "9+" : unreadCount;
    }
  }
}

// ===== Load Account Details =====
async function loadAccount() {
  const accountInfo = document.getElementById("accountInfo");
  const accountStatus = document.getElementById("accountStatus");
  
  const hasAccountSection = accountInfo && accountStatus;
  
  if (hasAccountSection) {
    // Show loading state if account section exists
    accountInfo.innerHTML = `<div style="text-align: center; padding: 20px; color: #667eea;">Loading account information...</div>`;
    console.log("📦 Account section found - will render account info");
  } else {
    console.log("⚠️ Account elements not found - will still check admin status for navbar button");
  }
  
  try {
    const endpoint = `${API_BASE}/auth/me`;
    console.log("Fetching from:", endpoint);
    
    // Add 10 second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const res = await fetch(endpoint, {
      method: "GET",
      headers: authHeaders(),
      credentials: "include",
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    console.log("Response status:", res.status);
    saveNewToken(res);

    if (res.status === 401) { 
      window.location.href = "../auth/login.html"; 
      return; 
    }

    const data = await res.json();
    console.log("Backend response:", data);
    
    if (!data.success || !data.data) {
      accountInfo.innerHTML = `<div style="color: red; padding: 20px;">Failed to load account information</div>`;
      return;
    }

    // ===== PARSE BACKEND RESPONSE - Handle Different Key Names =====
    const backendData = data.data;
    
    // Debug: Log all backend fields to see what we're getting
    console.log("🔍 All backend fields received:");
    Object.keys(backendData).forEach(key => {
      console.log(`   ✓ "${key}" = "${backendData[key]}"`);
    });
    
    // Extract values from backend response (it uses different key names!)
    const firstName = backendData["First Name"] || "—";
    const email = backendData["Email"] || "—";
    const phone = backendData["Phone"] || "—";
    const userId = backendData["User ID"] || "—";
    
    // Convert "Activated"/"Deactivated" string to boolean
    const isActive = (backendData["Account Status"] === "Activated");
    
    // Convert "Yes"/"No" strings to boolean with fallbacks for backend key inconsistencies
    const isEmailVerified = (backendData["isEmailVerified"] === "Yes") || (backendData["Email Verified"] === "Yes");
    const isPhoneVerified = (backendData["isPhoneVerified"] === "Yes") || (backendData["Phone Verified"] === "Yes");
    
    // 2FA: Fallback to localStorage if backend returns wrong value
    let isTwoFaEnabled = (backendData["2FA Enabled"] === "Yes");
    
    // If backend says "No" but localStorage has newer cached "enabled" state, use cache
    if (!isTwoFaEnabled) {
      const cached2FA = localStorage.getItem("twoFAUpdated");
      if (cached2FA) {
        try {
          const parsed = JSON.parse(cached2FA);
          const cacheAge = new Date().getTime() - parsed.timestamp;
          // Use cache if less than 2 minutes old
          if (cacheAge < 120000 && parsed.enabled === true) {
            console.log("⚠️ Backend says 2FA disabled, but using cached 'enabled' state (age:", cacheAge + "ms)");
            isTwoFaEnabled = true;
          }
        } catch (e) {
          // Invalid cache, ignore
        }
      }
    }
    
    const isBlocked = (backendData["Blocked Account"] === "Yes");
    
    // Parse dates
    const createdAt = new Date(backendData["Account Created At"]);
    const lastLoginAt = backendData["Last Login At"] ? new Date(backendData["Last Login At"]) : null;
    
    // Extract User Type from backend response
    const userType = backendData["userType"] || "USER";  // ✅ Changed from "User Type" to "userType"
    console.log("👤 User Type value:", userType);
    console.log("   Is Admin Check: userType !== 'USER' && userType !== 'CLIENT'");
    console.log("   Result:", userType !== "USER" && userType !== "CLIENT");
    
    console.log("✅ Parsed data:", { firstName, email, phone, isActive, isEmailVerified, isTwoFaEnabled, userType });
    
    // Update status badge (only if element exists)
    if (accountStatus) {
      accountStatus.textContent = isActive ? "✓ Active" : "⚠ Inactive";
      accountStatus.style.background = isActive ? "#dcfce7" : "#fef08a";
      accountStatus.style.color = isActive ? "#166534" : "#854d0e";
    }
    
    // ===== CALCULATE AND UPDATE HEALTH SCORE =====
    const healthScoreEl = document.getElementById("healthScore");
    const healthProgressEl = document.getElementById("healthProgress");
    const twoFATipEl = document.getElementById("twoFATip");
    
    if (healthScoreEl && healthProgressEl) {
      // Calculate health score based on:
      // - Account active: 20 points
      // - Email verified: 30 points
      // - 2FA enabled: 35 points
      // - Not blocked: 15 points
      let score = 0;
      if (isActive) score += 20;
      if (isEmailVerified) score += 30;
      if (isTwoFaEnabled) score += 35;
      if (!isBlocked) score += 15;
      
      // Get current score for animation
      const currentScore = parseInt(healthScoreEl.textContent) || 0;
      
      // Animate score change with smooth transition
      if (currentScore !== score) {
        console.log(`📊 Health score changing: ${currentScore}% → ${score}%`);
        
        // Add visual feedback animations
        healthScoreEl.style.animation = "scoreGlow 0.6s cubic-bezier(0.4, 0, 0.2, 1), scoreScale 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)";
        healthProgressEl.style.animation = "none";
        
        // Trigger reflow to restart animation
        void healthScoreEl.offsetWidth;
        
        // Change color based on 2FA status
        healthScoreEl.style.color = isTwoFaEnabled ? "#10b981" : "#ef4444";
        
        // Animate the progress bar
        healthProgressEl.style.transition = "width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)";
        healthProgressEl.style.width = score + "%";
        
        // Add glow to progress bar
        healthProgressEl.style.boxShadow = "0 0 20px rgba(102, 126, 234, 0.8), inset 0 0 8px rgba(255, 255, 255, 0.2)";
        
        // Animate the score text
        let startScore = currentScore;
        let animationFrames = 0;
        const maxFrames = 20;
        
        const animateScore = () => {
          animationFrames++;
          const progress = animationFrames / maxFrames;
          const newScore = Math.round(startScore + (score - startScore) * progress);
          healthScoreEl.textContent = newScore + "%";
          
          if (animationFrames < maxFrames) {
            requestAnimationFrame(animateScore);
          } else {
            healthScoreEl.textContent = score + "%";
            // Reset color styling after animation
            setTimeout(() => {
              healthScoreEl.style.color = "";
              healthScoreEl.style.animation = "";
              healthProgressEl.style.boxShadow = "0 0 12px rgba(102, 126, 234, 0.6)";
            }, 600);
          }
        };
        
        animateScore();
      }
      
      // Update 2FA tip - show as enabled or show prompt to enable
      if (twoFATipEl) {
        if (!isTwoFaEnabled) {
          // Show prompt to enable 2FA
          twoFATipEl.innerHTML = `
            <span class="material-icons tip-icon" style="color: #fbbf24;">info</span>
            <span>Enable 2FA for extra security</span>
          `;
          twoFATipEl.style.background = "rgba(240, 147, 251, 0.1) !important";
          twoFATipEl.style.borderLeft = "2px solid #f093fb";
          twoFATipEl.style.opacity = "1";
          twoFATipEl.style.display = "flex";
          twoFATipEl.style.cursor = "pointer";
        } else {
          // Show 2FA as enabled with checkmark
          twoFATipEl.innerHTML = `
            <span class="material-icons tip-icon">check_circle</span>
            <span>2FA Enabled</span>
          `;
          twoFATipEl.style.background = "rgba(255, 255, 255, 0.05)";
          twoFATipEl.style.borderLeft = "none";
          twoFATipEl.style.opacity = "1";
          twoFATipEl.style.display = "flex";
          twoFATipEl.style.cursor = "default";
        }
      }
      
      console.log("✅ Health score calculated:", score + "%");
    }
    
    // Render account information (only if section exists)
    if (accountInfo && accountStatus) {
      // Update status badge
      accountStatus.textContent = isActive ? "✓ Active" : "⚠ Inactive";
      accountStatus.style.background = isActive ? "#dcfce7" : "#fef08a";
      accountStatus.style.color = isActive ? "#166534" : "#854d0e";
      
      accountInfo.innerHTML = `
        <div class="info-row">
          <div>
            <p>Name</p>
            <strong>${firstName}</strong>
          </div>
          <div>
            <p>Email</p>
            <strong>${email}</strong>
          </div>
          <div>
            <p>Phone</p>
            <strong>${phone}</strong>
          </div>
        </div>
        <div class="info-row">
          <div>
            <p>User ID</p>
            <strong style="font-size: 12px; font-family: monospace;">${userId}</strong>
          </div>
          <div>
            <p>Status</p>
            <strong>${isActive ? '🟢 Active' : '🔴 Inactive'}</strong>
          </div>
          <div>
            <p>Email Verified</p>
            <strong>${isEmailVerified ? '✅ Yes' : '❌ No'}</strong>
          </div>
        </div>
      `;
      
      console.log("✅ Account information rendered successfully");
    } else {
      console.log("⚠️ Skipping account info rendering - elements not in DOM");
    }
    
    // Update created date if element exists
    const createdDateEl = document.getElementById("createdDate");
    if (createdDateEl && createdAt) {
      createdDateEl.textContent = createdAt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }
    
    // Update last login if available
    const lastLoginEl = document.getElementById("lastLogin");
    if (lastLoginEl && lastLoginAt) {
      const now = new Date();
      const diffMs = now - lastLoginAt;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      
      let timeStr = "Just now";
      if (diffMins > 0 && diffMins < 60) timeStr = `${diffMins}m ago`;
      else if (diffHours > 0 && diffHours < 24) timeStr = `${diffHours}h ago`;
      else if (diffDays > 0) timeStr = `${diffDays}d ago`;
      
      lastLoginEl.textContent = timeStr;
    }
    
    // Load active sessions count
    loadSessionsCount();
    
    // Check and show admin button if user is admin
    console.log("📢 About to call checkAndShowAdminButton with userType:", userType);
    checkAndShowAdminButton(userType);
    console.log("✅ checkAndShowAdminButton completed");
    
    // Check and show management button based on user type
    console.log("📢 About to call checkAndShowManagementButton with userType:", userType);
    checkAndShowManagementButton(userType);
    console.log("✅ checkAndShowManagementButton completed");
    
    // Show page with staggered animations
    showPageContent();
    
  } catch (err) {
    console.error("Error loading account:", err);
    if (accountInfo) {
      accountInfo.innerHTML = `<div style="color: red; padding: 20px;">Error: ${err.message}</div>`;
    }
    
    // Show page even on error
    showPageContent();
  }
}

// ===== Load Sessions Count =====
async function loadSessionsCount() {
  try {
    const sessionsCountEl = document.getElementById("sessionsCount");
    
    if (!sessionsCountEl) return;
    
    const endpoint = `${API_BASE}/auth/active-sessions`;
    
    // Add 5 second timeout for sessions
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const res = await fetch(endpoint, {
      method: "GET",
      headers: authHeaders(),
      credentials: "include",
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    const data = await res.json();
    
    if (data.success && Array.isArray(data.data)) {
      sessionsCountEl.textContent = data.data.length;
    }
  } catch (err) {
    console.error("Could not load sessions:", err);
  }
}

// ===== Sign Out =====
document.getElementById("signoutBtn").addEventListener("click", async () => {
  const btn = document.getElementById("signoutBtn");
  const dashError = document.getElementById("dashError");
  btn.disabled = true;
  btn.textContent = "Signing out...";
  try {
    const res = await fetch(`${API_BASE}/auth/signout`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      dashError.textContent = data.message || "Sign out failed.";
      btn.disabled = false;
      btn.textContent = "Sign Out";
      return;
    }
    localStorage.removeItem("accessToken");
    window.location.href = "../auth/login.html";
  } catch (err) {
    dashError.textContent = "Network error.";
    btn.disabled = false;
    btn.textContent = "Sign Out";
  }
});

// ===== 2FA TIP CLICK HANDLER =====
document.addEventListener('DOMContentLoaded', () => {
  // Initialize LoadingManager
  LoadingManager.init();
  
  // Setup notification panel
  setupNotificationPanel();
  
  // Setup navigation buttons
  const navNotifications = document.getElementById("navNotifications");
  const navProfileBtn = document.getElementById("navProfile");
  
  if (navNotifications) {
    navNotifications.addEventListener("click", () => {
      console.log("📢 Notifications clicked");
      toggleNotificationPanel();
    });
  }
  
  if (navProfileBtn) {
    navProfileBtn.addEventListener("click", () => {
      console.log("👤 Profile clicked");
      window.location.href = "settings.html";
    });
  }
  
  // Setup Admin Panel Button in Nav
  const adminBtn = document.getElementById("goToAdminPanelBtn");
  if (adminBtn) {
    adminBtn.addEventListener("click", () => {
      console.log("🔐 Admin Panel button clicked");
      goToAdminPanel();
    });
    console.log("✅ Admin button listener attached");
  } else {
    console.warn("⚠️ Admin button not found (element id: goToAdminPanelBtn)");
  }
  
  // Setup Software Management Button in Nav
  const softwareBtn = document.getElementById("goToSoftwareBtn");
  if (softwareBtn) {
    softwareBtn.addEventListener("click", () => {
      console.log("🚀 Software Management button clicked");
      goToSoftwareManagement();
    });
  } else {
    console.warn("⚠️ Software Management button not found (element id: goToSoftwareBtn)");
  }
  
  const twoFATip = document.getElementById("twoFATip");
  if (twoFATip) {
    twoFATip.addEventListener("click", () => {
      window.location.href = "settings.html?tab=security";
    });
  }
});

// ===== LISTEN FOR 2FA STATUS CHANGES =====
// Listen for messages from settings page
window.addEventListener('message', (event) => {
  if (event.data && event.data.type === '2FA_STATUS_CHANGED') {
    console.log("📢 Received 2FA status change notification:", event.data.enabled ? "ENABLED" : "DISABLED");
    // Reload account data to get fresh 2FA status
    setTimeout(() => {
      console.log("🔄 Refreshing account data after 2FA change...");
      loadAccount();
    }, 1000);
  }
});

// Listen for localStorage changes from settings page
window.addEventListener('storage', (event) => {
  if (event.key === 'twoFAUpdated') {
    const data = JSON.parse(event.newValue || '{}');
    console.log("📢 localStorage: 2FA status changed to:", data.enabled ? "ENABLED" : "DISABLED");
    setTimeout(() => {
      console.log("🔄 Refreshing account data after storage change...");
      loadAccount();
    }, 800);
  }
});

// Stagger animations for loaded elements
function addElementAnimations() {
  console.log("🎬 Starting staggered animations...");
  const accountCard = document.querySelector('.account-card');
  const healthCard = document.querySelector('.health-card');
  const metricCards = document.querySelectorAll('.metric-card');
  const quickActionsSection = document.querySelector('.quick-actions-section');
  const actionCards = document.querySelectorAll('.action-card');
  
  // Add loaded class with staggered timing
  if (accountCard) {
    console.log("📌 Adding animation to account card at 200ms");
    setTimeout(() => {
      accountCard.classList.add('loaded');
      console.log("✅ Account card animated");
    }, 200);
  }
  
  if (healthCard) {
    console.log("📌 Adding animation to health card at 400ms");
    setTimeout(() => {
      healthCard.classList.add('loaded');
      console.log("✅ Health card animated");
    }, 400);
  }
  
  if (metricCards.length > 0) {
    console.log(`📌 Adding animations to ${metricCards.length} metric cards starting at 700ms`);
    metricCards.forEach((card, index) => {
      card.style.setProperty('--card-index', index);
      const delay = 700 + index * 150;
      setTimeout(() => {
        card.classList.add('loaded');
        console.log(`✅ Metric card ${index} animated at ${delay}ms`);
      }, delay);
    });
  }
  
  if (quickActionsSection) {
    console.log("📌 Adding animation to quick actions at 1200ms");
    setTimeout(() => {
      quickActionsSection.classList.add('loaded');
      console.log("✅ Quick actions animated");
    }, 1200);
  }
  
  if (actionCards.length > 0) {
    console.log(`📌 Adding animations to ${actionCards.length} action cards starting at 1400ms`);
    actionCards.forEach((card, index) => {
      card.style.setProperty('--card-index', index);
      const delay = 1400 + index * 150;
      setTimeout(() => {
        card.classList.add('loaded');
        console.log(`✅ Action card ${index} animated at ${delay}ms`);
      }, delay);
    });
  }
}

// Show page on load complete
function showPageContent() {
  console.log("🎯 showPageContent() called - starting animation sequence");
  const container = document.querySelector('.dash-container');
  if (container) {
    console.log("📦 Found container, removing loading-state");
    container.classList.remove('loading-state');
  } else {
    console.error("❌ Container not found!");
  }
  console.log("📞 Calling addElementAnimations...");
  addElementAnimations();
  console.log("⏹️ Hiding page loader...");
  LoadingManager.hidePageLoader();
}

// Ensure DOM is ready before calling loadAccount
if (document.readyState === 'loading') {
  console.log("⏳ DOM still loading, waiting for DOMContentLoaded...");
  document.addEventListener('DOMContentLoaded', () => {
    console.log("✅ DOMContentLoaded fired, showing loader...");
    const container = document.querySelector('.dash-container');
    if (container) container.classList.add('loading-state');
    LoadingManager.showPageLoader('Loading your account');
    console.log("🚀 Loading account data...");
    loadAccount();
  });
} else {
  console.log("✅ DOM already loaded, showing loader...");
  const container = document.querySelector('.dash-container');
  if (container) container.classList.add('loading-state');
  LoadingManager.showPageLoader('Loading your account');
  console.log("🚀 Loading account data...");
  loadAccount();
}

// Fallback timeout - ensure page loads even if something hangs
setTimeout(() => {
  console.warn("⚠️ Page load timeout (15s) - forcing page to show");
  if (LoadingManager) {
    LoadingManager.hidePageLoader();
    const container = document.querySelector('.dash-container');
    if (container) container.classList.remove('loading-state');
    addElementAnimations();
  }
}, 15000);

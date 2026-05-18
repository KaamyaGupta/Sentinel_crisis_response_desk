/**
 * Main Application Logic
 * ----------------------
 * Handles page navigation, forms, dashboard, and incident cards.
 * This file runs after the DOM is loaded.
 */

// DOM element references (set when page loads)
let authSection, dashboardSection, loginForm, signupForm, incidentForm;
let incidentsGrid, alertBox, userGreeting, reportModal, reportFormBtn;

/**
 * Show a temporary alert message at the top of the page
 */
function showAlert(message, type = "info") {
  if (!alertBox) return;
  alertBox.textContent = message;
  alertBox.className = `alert alert-${type} show`;
  setTimeout(() => {
    alertBox.classList.remove("show");
  }, 4000);
}

/**
 * Switch between login/signup tabs on the auth page
 */
function showAuthTab(tabName) {
  document.querySelectorAll(".auth-tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.tab === tabName);
  });
  document.querySelectorAll(".auth-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === `${tabName}-panel`);
  });
}

/**
 * Show auth screen or dashboard based on login state
 */
function renderApp() {
  if (isLoggedIn()) {
    authSection.classList.add("hidden");
    dashboardSection.classList.remove("hidden");
    const user = getStoredUser();
    if (userGreeting && user) {
      userGreeting.textContent = `Welcome, ${user.name}`;
    }
    loadIncidents();
  } else {
    authSection.classList.remove("hidden");
    dashboardSection.classList.add("hidden");
  }
}

/**
 * Handle login form submit
 */
async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;

  try {
    const data = await login(email, password);
    saveSession(data.token, data.user);
    showAlert("Login successful!", "success");
    renderApp();
  } catch (err) {
    showAlert(err.message, "error");
  }
}

/**
 * Handle signup form submit
 */
async function handleSignup(e) {
  e.preventDefault();
  const name = document.getElementById("signup-name").value.trim();
  const email = document.getElementById("signup-email").value.trim();
  const password = document.getElementById("signup-password").value;

  try {
    const data = await signup(name, email, password);
    saveSession(data.token, data.user);
    showAlert("Account created! Welcome.", "success");
    renderApp();
  } catch (err) {
    showAlert(err.message, "error");
  }
}

/**
 * Logout - clear token and return to auth screen
 */
function handleLogout() {
  clearSession();
  showAlert("You have been logged out.", "info");
  renderApp();
}

/**
 * Fetch incidents from API and render cards
 */
async function loadIncidents() {
  if (!incidentsGrid) return;

  incidentsGrid.innerHTML = `<p class="loading-text">Loading incidents...</p>`;

  try {
    const data = await fetchIncidents();
    const incidents = data.incidents || [];

    if (incidents.length === 0) {
      incidentsGrid.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📋</div>
          <p>No incidents reported yet.</p>
          <p class="empty-hint">Click "Report Incident" to add the first one.</p>
        </div>`;
      return;
    }

    incidentsGrid.innerHTML = incidents.map(renderIncidentCard).join("");
    attachCardListeners();
  } catch (err) {
    incidentsGrid.innerHTML = `<p class="error-text">Failed to load: ${err.message}</p>`;
    if (err.message.includes("log in")) {
      clearSession();
      renderApp();
    }
  }
}

/**
 * Build HTML for one incident card
 */
function renderIncidentCard(incident) {
  const date = new Date(incident.createdAt).toLocaleString();
  const severityClass = `severity-${incident.severity}`;
  const statusClass = `status-${incident.status.replace(/\s/g, "-")}`;

  return `
    <article class="incident-card" data-id="${incident._id}">
      <div class="card-header">
        <h3>${escapeHtml(incident.title)}</h3>
        <span class="badge ${severityClass}">${incident.severity}</span>
      </div>
      <p class="card-desc">${escapeHtml(incident.description)}</p>
      <div class="card-meta">
        <span class="meta-item">📍 ${escapeHtml(incident.location)}</span>
        <span class="meta-item">👤 ${escapeHtml(incident.reporterName || "Unknown")}</span>
        <span class="meta-item">🕐 ${date}</span>
      </div>
      <div class="card-footer">
        <select class="status-select" data-id="${incident._id}" aria-label="Update status">
          <option value="reported" ${incident.status === "reported" ? "selected" : ""}>Reported</option>
          <option value="in-progress" ${incident.status === "in-progress" ? "selected" : ""}>In Progress</option>
          <option value="resolved" ${incident.status === "resolved" ? "selected" : ""}>Resolved</option>
          <option value="closed" ${incident.status === "closed" ? "selected" : ""}>Closed</option>
        </select>
        <span class="badge ${statusClass}">${formatStatus(incident.status)}</span>
        <button type="button" class="btn btn-danger btn-sm delete-btn" data-id="${incident._id}">Delete</button>
      </div>
    </article>
  `;
}

function formatStatus(status) {
  return status.replace("-", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Prevent XSS when displaying user text */
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Wire up status change and delete buttons on cards
 */
function attachCardListeners() {
  document.querySelectorAll(".status-select").forEach((select) => {
    select.addEventListener("change", async (e) => {
      const id = e.target.dataset.id;
      const status = e.target.value;
      try {
        await updateIncident(id, { status });
        showAlert("Status updated.", "success");
        loadIncidents();
      } catch (err) {
        showAlert(err.message, "error");
      }
    });
  });

  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const id = e.target.dataset.id;
      if (!confirm("Delete this incident permanently?")) return;
      try {
        await deleteIncident(id);
        showAlert("Incident deleted.", "success");
        loadIncidents();
      } catch (err) {
        showAlert(err.message, "error");
      }
    });
  });
}

/**
 * Open/close report incident modal
 */
function openReportModal() {
  reportModal.classList.add("open");
  document.getElementById("incident-title").focus();
}

function closeReportModal() {
  reportModal.classList.remove("open");
  incidentForm.reset();
}

/**
 * Submit new incident
 */
async function handleReportIncident(e) {
  e.preventDefault();

  const payload = {
    title: document.getElementById("incident-title").value.trim(),
    description: document.getElementById("incident-description").value.trim(),
    location: document.getElementById("incident-location").value.trim(),
    severity: document.getElementById("incident-severity").value,
  };

  try {
    await createIncident(payload);
    showAlert("Incident reported successfully.", "success");
    closeReportModal();
    loadIncidents();
  } catch (err) {
    showAlert(err.message, "error");
  }
}

/**
 * Initialize app when DOM is ready
 */
document.addEventListener("DOMContentLoaded", () => {
  authSection = document.getElementById("auth-section");
  dashboardSection = document.getElementById("dashboard-section");
  loginForm = document.getElementById("login-form");
  signupForm = document.getElementById("signup-form");
  incidentForm = document.getElementById("incident-form");
  incidentsGrid = document.getElementById("incidents-grid");
  alertBox = document.getElementById("alert-box");
  userGreeting = document.getElementById("user-greeting");
  reportModal = document.getElementById("report-modal");
  reportFormBtn = document.getElementById("report-incident-btn");

  // Auth tabs
  document.querySelectorAll(".auth-tab").forEach((tab) => {
    tab.addEventListener("click", () => showAuthTab(tab.dataset.tab));
  });

  loginForm.addEventListener("submit", handleLogin);
  signupForm.addEventListener("submit", handleSignup);
  document.getElementById("logout-btn").addEventListener("click", handleLogout);

  reportFormBtn.addEventListener("click", openReportModal);
  document.getElementById("modal-close").addEventListener("click", closeReportModal);
  document.getElementById("modal-cancel").addEventListener("click", closeReportModal);
  incidentForm.addEventListener("submit", handleReportIncident);

  reportModal.addEventListener("click", (e) => {
    if (e.target === reportModal) closeReportModal();
  });

  renderApp();
});

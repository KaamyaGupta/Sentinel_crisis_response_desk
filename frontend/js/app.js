/**
 * Main Application Logic
 * ----------------------
 * Auth, incidents CRUD, and dashboard orchestration.
 * Dashboard UI helpers live in dashboard.js (frontend-only).
 */

let authSection, dashboardSection, loginForm, signupForm, incidentForm;
let incidentsGrid, alertBox, userGreeting, reportModal, reportFormBtn;
let welcomeUserName, welcomeUserEmail, incidentsCountLabel, timelineList;
let incidentSearch, filterSeverity, filterStatus, sortIncidents;

const ACTIVITY_LOG_KEY = "disaster_activity_log";

/** Cached incidents from last API fetch (for filters without re-fetching) */
let allIncidents = [];

// ---------- Toast notifications ----------

function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  if (!container) {
    showAlert(message, type);
    return;
  }

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add("show"));

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function showAlert(message, type = "info") {
  if (!alertBox) return;
  alertBox.textContent = message;
  alertBox.className = `alert alert-${type} show`;
  setTimeout(() => alertBox.classList.remove("show"), 4000);
}

// ---------- Auth UI ----------

function showAuthTab(tabName) {
  document.querySelectorAll(".auth-tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.tab === tabName);
  });
  document.querySelectorAll(".auth-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === `${tabName}-panel`);
  });
}

function updateWelcomeBanner() {
  const user = getStoredUser();
  if (!user) return;

  if (userGreeting) userGreeting.textContent = `Welcome, ${user.name}`;
  if (welcomeUserName) welcomeUserName.textContent = user.name || "Coordinator";
  if (welcomeUserEmail) {
    welcomeUserEmail.textContent = user.email ? ` · ${user.email}` : "";
  }
}

function renderApp() {
  if (isLoggedIn()) {
    authSection.classList.add("hidden");
    dashboardSection.classList.remove("hidden");
    updateWelcomeBanner();
    startLiveClock();
    loadIncidents();
  } else {
    authSection.classList.remove("hidden");
    dashboardSection.classList.add("hidden");
    stopLiveClock();
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;

  if (!email || !password) {
    showToast("Please enter email and password.", "error");
    return;
  }

  try {
    const data = await login(email, password);
    saveSession(data.token, data.user);
    showToast("Login successful!", "success");
    renderApp();
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function handleSignup(e) {
  e.preventDefault();
  const name = document.getElementById("signup-name").value.trim();
  const email = document.getElementById("signup-email").value.trim();
  const password = document.getElementById("signup-password").value;

  if (!name || !email || !password) {
    showToast("Please fill in all fields.", "error");
    return;
  }
  if (password.length < 6) {
    showToast("Password must be at least 6 characters.", "error");
    return;
  }

  try {
    const data = await signup(name, email, password);
    saveSession(data.token, data.user);
    showToast("Account created! Welcome.", "success");
    renderApp();
  } catch (err) {
    showToast(err.message, "error");
  }
}

function handleLogout() {
  clearSession();
  showToast("You have been logged out.", "info");
  renderApp();
}

// ---------- Activity log (frontend only) ----------

function logActivity(type, title, extra = "") {
  const entry = { type, title, extra, timestamp: new Date().toISOString() };
  let log = [];
  try {
    log = JSON.parse(localStorage.getItem(ACTIVITY_LOG_KEY) || "[]");
  } catch {
    log = [];
  }
  log.unshift(entry);
  localStorage.setItem(ACTIVITY_LOG_KEY, JSON.stringify(log.slice(0, 20)));
}

function getSessionLog() {
  try {
    return JSON.parse(localStorage.getItem(ACTIVITY_LOG_KEY) || "[]");
  } catch {
    return [];
  }
}

// ---------- Filters & rendering ----------

function getFilterState() {
  return {
    search: incidentSearch?.value || "",
    severity: filterSeverity?.value || "all",
    status: filterStatus?.value || "all",
    sort: sortIncidents?.value || "severity",
  };
}

function applyFiltersAndRender() {
  const filters = getFilterState();
  let list = filterIncidents(allIncidents, filters);
  list = sortIncidentsByPriority(list, filters.sort);

  const total = allIncidents.length;
  const showing = list.length;

  if (incidentsCountLabel) {
    if (total === 0) {
      incidentsCountLabel.textContent = "No incidents in the system";
    } else if (showing === total) {
      incidentsCountLabel.textContent =
        total === 1 ? "Showing 1 incident" : `Showing all ${total} incidents`;
    } else {
      incidentsCountLabel.textContent = `Showing ${showing} of ${total} incidents`;
    }
  }

  renderTimeline(buildTimelineEntries(allIncidents, getSessionLog()), timelineList);

  if (total === 0) {
    incidentsGrid.classList.add("incidents-grid--empty");
    incidentsGrid.classList.remove("incidents-grid--few");
    incidentsGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-illustration" aria-hidden="true">
          <span class="empty-illustration-ring"></span>
          <span class="empty-illustration-icon">🚨</span>
        </div>
        <h3 class="empty-title">No active disaster reports currently</h3>
        <p class="empty-message">The operations board is clear. Report a new incident when an emergency arises.</p>
        <p class="empty-hint">Use <strong>Report New Incident</strong> or the quick-action panel.</p>
      </div>`;
    return;
  }

  incidentsGrid.classList.remove("incidents-grid--empty");

  if (list.length === 0) {
    incidentsGrid.innerHTML = `
      <p class="empty-filter-msg">No incidents match your search or filters.</p>`;
    return;
  }

  if (list.length <= 2) {
    incidentsGrid.classList.add("incidents-grid--few");
  } else {
    incidentsGrid.classList.remove("incidents-grid--few");
  }

  incidentsGrid.innerHTML = list.map(renderIncidentCard).join("");
  attachCardListeners();
}

async function loadIncidents() {
  if (!incidentsGrid) return;

  incidentsGrid.innerHTML = getSkeletonHTML(3);
  incidentsGrid.classList.remove("incidents-grid--empty", "incidents-grid--few");

  try {
    const data = await fetchIncidents();
    allIncidents = data.incidents || [];

    updateOperationsStats(allIncidents);
    updateAnalyticsInsights(allIncidents);
    applyFiltersAndRender();
  } catch (err) {
    incidentsGrid.innerHTML = `<p class="error-text">Failed to load: ${err.message}</p>`;
    allIncidents = [];
    updateOperationsStats([]);
    updateAnalyticsInsights([]);
    renderTimeline([], timelineList);
    showToast(err.message, "error");
    if (err.message.includes("log in")) {
      clearSession();
      renderApp();
    }
  }
}

// ---------- Incident cards ----------

function renderIncidentCard(incident) {
  const dateFormatted = formatDateTime(incident.createdAt);
  const severityClass = `severity-${incident.severity}`;
  const statusClass = `status-${incident.status.replace(/\s/g, "-")}`;
  const severityIcon = getSeverityIcon(incident.severity);
  const statusInfo = getStatusDisplay(incident.status);
  const priority = getPriorityLevel(incident);
  const isResolved =
    incident.status === "resolved" || incident.status === "closed";
  const isHigh =
    incident.severity === "high" || incident.severity === "critical";

  const cardClasses = [
    "incident-card",
    isResolved ? "incident-card--resolved" : "",
    isHigh && !isResolved ? "incident-card--priority" : "",
    incident.severity === "critical" ? "incident-card--critical" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const shortDesc =
    incident.description.length > 120
      ? incident.description.slice(0, 120) + "…"
      : incident.description;

  return `
    <article class="${cardClasses}" data-id="${incident._id}">
      <div class="card-top-row">
        <span class="priority-pill ${priority.class}">${priority.label}</span>
        <span class="badge badge-with-icon ${severityClass}">
          <span aria-hidden="true">${severityIcon}</span> ${incident.severity}
        </span>
      </div>
      <div class="card-header">
        <h3>${escapeHtml(incident.title)}</h3>
      </div>
      <p class="card-desc">${escapeHtml(shortDesc)}</p>
      <div class="card-meta">
        <span class="meta-item"><span class="meta-icon" aria-hidden="true">📍</span> ${escapeHtml(incident.location)}</span>
        <span class="meta-item"><span class="meta-icon" aria-hidden="true">👤</span> ${escapeHtml(incident.reporterName || "Unknown")}</span>
      </div>
      <div class="card-timestamp">
        <span class="meta-icon" aria-hidden="true">🕐</span>
        <time datetime="${incident.createdAt}">${dateFormatted}</time>
      </div>
      <div class="card-status-row">
        <span class="badge badge-with-icon status-badge ${statusClass}">
          <span aria-hidden="true">${getStatusIcon(incident.status)}</span>
          ${statusInfo.label}
        </span>
        ${
          incident.status === "in-progress"
            ? '<span class="badge badge-team">Team Assigned</span>'
            : ""
        }
      </div>
      <button type="button" class="btn btn-ghost btn-sm toggle-details-btn" data-id="${incident._id}" aria-expanded="false">
        View Details ▼
      </button>
      <div class="card-details" id="details-${incident._id}">
        <p><strong>Full description:</strong> ${escapeHtml(incident.description)}</p>
        <p><strong>Reported:</strong> ${dateFormatted}</p>
        <p><strong>Status:</strong> ${statusInfo.label} — ${statusInfo.hint}</p>
        <p><strong>Severity:</strong> ${incident.severity} — ${getSeverityExplanation(incident.severity)}</p>
      </div>
      <div class="card-footer">
        <div class="card-footer-left">
          <label class="status-label" for="status-${incident._id}">Update Status</label>
          <select id="status-${incident._id}" class="status-select" data-id="${incident._id}" aria-label="Update status">
            <option value="reported" ${incident.status === "reported" ? "selected" : ""}>Reported</option>
            <option value="in-progress" ${incident.status === "in-progress" ? "selected" : ""}>In Progress</option>
            <option value="resolved" ${incident.status === "resolved" ? "selected" : ""}>Resolved</option>
            <option value="closed" ${incident.status === "closed" ? "selected" : ""}>Closed</option>
          </select>
        </div>
        <button type="button" class="btn btn-danger btn-sm delete-btn" data-id="${incident._id}">
          <span aria-hidden="true">🗑️</span> Delete
        </button>
      </div>
    </article>
  `;
}

function formatDateTime(dateInput) {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(d.getTime())) return "Unknown date";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getSeverityIcon(severity) {
  return (
    { low: "🟢", medium: "🟡", high: "🟠", critical: "🔴" }[severity] || "⚪"
  );
}

function getStatusIcon(status) {
  return (
    {
      reported: "📋",
      "in-progress": "🔄",
      resolved: "✅",
      closed: "📁",
    }[status] || "📌"
  );
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function attachCardListeners() {
  document.querySelectorAll(".status-select").forEach((select) => {
    select.addEventListener("change", async (e) => {
      const id = e.target.dataset.id;
      const status = e.target.value;
      const card = e.target.closest(".incident-card");
      const title = card?.querySelector("h3")?.textContent || "Incident";

      try {
        await updateIncident(id, { status });
        logActivity("updated", title, getStatusDisplay(status).label);
        if (status === "resolved" || status === "closed") {
          logActivity("resolved", title);
        }
        showToast("Status updated.", "success");
        await loadIncidents();
      } catch (err) {
        showToast(err.message, "error");
      }
    });
  });

  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const el = e.target.closest(".delete-btn");
      const id = el?.dataset.id;
      const card = e.target.closest(".incident-card");
      const title = card?.querySelector("h3")?.textContent || "Incident";

      if (!confirm("Delete this incident permanently?")) return;
      try {
        await deleteIncident(id);
        logActivity("deleted", title);
        showToast("Incident deleted.", "success");
        await loadIncidents();
      } catch (err) {
        showToast(err.message, "error");
      }
    });
  });

  document.querySelectorAll(".toggle-details-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      const panel = document.getElementById(`details-${id}`);
      const isOpen = panel.classList.contains("card-details--open");

      panel.classList.toggle("card-details--open", !isOpen);
      btn.setAttribute("aria-expanded", String(!isOpen));
      btn.textContent = isOpen ? "View Details ▼" : "Hide Details ▲";
    });
  });
}

// ---------- Modal & form ----------

function openReportModal() {
  reportModal.classList.add("open");
  clearFormErrors();
  document.getElementById("incident-title").focus();
}

function closeReportModal() {
  reportModal.classList.remove("open");
  incidentForm.reset();
  clearFormErrors();
}

function clearFormErrors() {
  document.querySelectorAll(".field-error").forEach((el) => el.remove());
}

function validateIncidentForm() {
  clearFormErrors();
  let valid = true;

  const title = document.getElementById("incident-title");
  const desc = document.getElementById("incident-description");
  const loc = document.getElementById("incident-location");

  function showFieldError(input, msg) {
    const err = document.createElement("span");
    err.className = "field-error";
    err.textContent = msg;
    input.classList.add("input-error");
    input.after(err);
    valid = false;
  }

  [title, desc, loc].forEach((i) => i.classList.remove("input-error"));

  if (!title.value.trim()) showFieldError(title, "Title is required.");
  if (!desc.value.trim()) showFieldError(desc, "Description is required.");
  if (!loc.value.trim()) showFieldError(loc, "Location is required.");

  return valid;
}

async function handleReportIncident(e) {
  e.preventDefault();
  if (!validateIncidentForm()) {
    showToast("Please fix the form errors.", "error");
    return;
  }

  const payload = {
    title: document.getElementById("incident-title").value.trim(),
    description: document.getElementById("incident-description").value.trim(),
    location: document.getElementById("incident-location").value.trim(),
    severity: document.getElementById("incident-severity").value,
  };

  const submitBtn = incidentForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = "Submitting…";

  try {
    await createIncident(payload);
    logActivity("created", payload.title);
    showToast("Incident reported successfully.", "success");
    closeReportModal();
    await loadIncidents();
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit Report";
  }
}

// ---------- Quick actions ----------

function setupQuickActions() {
  document.getElementById("qa-report")?.addEventListener("click", openReportModal);
  document.getElementById("qa-refresh")?.addEventListener("click", async () => {
    showToast("Refreshing dashboard…", "info");
    await loadIncidents();
    showToast("Dashboard refreshed.", "success");
  });

  document.getElementById("qa-alerts")?.addEventListener("click", () => {
    if (filterSeverity) filterSeverity.value = "high";
    if (filterStatus) filterStatus.value = "active";
    if (sortIncidents) sortIncidents.value = "severity";
    applyFiltersAndRender();
    showToast("Showing active high-priority alerts.", "info");
  });

  document.getElementById("qa-resolved")?.addEventListener("click", () => {
    if (filterSeverity) filterSeverity.value = "all";
    if (filterStatus) filterStatus.value = "resolved";
    if (sortIncidents) sortIncidents.value = "newest";
    applyFiltersAndRender();
    showToast("Showing resolved cases.", "info");
  });
}

function setupFilters() {
  const rerender = () => applyFiltersAndRender();
  incidentSearch?.addEventListener("input", rerender);
  filterSeverity?.addEventListener("change", rerender);
  filterStatus?.addEventListener("change", rerender);
  sortIncidents?.addEventListener("change", rerender);
}

// ---------- Init ----------

document.addEventListener("DOMContentLoaded", () => {
  authSection = document.getElementById("auth-section");
  dashboardSection = document.getElementById("dashboard-section");
  loginForm = document.getElementById("login-form");
  signupForm = document.getElementById("signup-form");
  incidentForm = document.getElementById("incident-form");
  incidentsGrid = document.getElementById("incidents-grid");
  alertBox = document.getElementById("alert-box");
  userGreeting = document.getElementById("user-greeting");
  welcomeUserName = document.getElementById("welcome-user-name");
  welcomeUserEmail = document.getElementById("welcome-user-email");
  incidentsCountLabel = document.getElementById("incidents-count-label");
  timelineList = document.getElementById("timeline-list");
  incidentSearch = document.getElementById("incident-search");
  filterSeverity = document.getElementById("filter-severity");
  filterStatus = document.getElementById("filter-status");
  sortIncidents = document.getElementById("sort-incidents");
  reportModal = document.getElementById("report-modal");
  reportFormBtn = document.getElementById("report-incident-btn");

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

  setupQuickActions();
  setupFilters();
  renderApp();
});

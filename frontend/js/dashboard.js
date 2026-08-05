/**
 * Dashboard UI Helpers (Frontend Only)
 * --------------------------------------
 * Statistics, filters, timeline, clock, and animations.
 * Does NOT call APIs — app.js passes incident data here.
 */

// Severity weight for sorting (higher = more urgent)
const SEVERITY_WEIGHT = { critical: 4, high: 3, medium: 2, low: 1 };

/**
 * Animated count-up for stat numbers
 */
function animateCountUp(element, targetValue, suffix = "") {
  if (!element) return;

  const isPercent = suffix === "%";
  const target = isPercent ? parseFloat(targetValue) : parseInt(targetValue, 10) || 0;
  const duration = 800;
  const start = performance.now();

  function step(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = target * eased;

    if (isPercent) {
      element.textContent = `${Math.round(current)}%`;
    } else {
      element.textContent = Math.round(current);
    }

    if (progress < 1) requestAnimationFrame(step);
    else element.textContent = isPercent ? `${target}%` : String(target);
  }

  requestAnimationFrame(step);
}

/**
 * Update all operations overview stat cards with count-up
 */
function updateOperationsStats(incidents) {
  const total = incidents.length;
  const activeEmergencies = incidents.filter(
    (i) => i.status === "reported" || i.status === "in-progress"
  ).length;
  const highAlerts = incidents.filter(
    (i) => i.severity === "high" || i.severity === "critical"
  ).length;
  const resolvedCases = incidents.filter(
    (i) => i.status === "resolved" || i.status === "closed"
  ).length;
  const efficiency =
    total === 0 ? 0 : Math.round((resolvedCases / total) * 100);

  animateCountUp(document.getElementById("stat-total"), total);
  animateCountUp(document.getElementById("stat-active-emergencies"), activeEmergencies);
  animateCountUp(document.getElementById("stat-high-alerts"), highAlerts);
  animateCountUp(document.getElementById("stat-resolved"), resolvedCases);
  animateCountUp(document.getElementById("stat-efficiency"), efficiency, "%");
}

/**
 * Lightweight analytics insights (frontend-calculated)
 */
function updateAnalyticsInsights(incidents) {
  const severityEl = document.getElementById("insight-severity");
  const activeEl = document.getElementById("insight-active");
  const resolutionEl = document.getElementById("insight-resolution");

  if (!severityEl) return;

  if (incidents.length === 0) {
    severityEl.textContent = "—";
    activeEl.textContent = "0";
    resolutionEl.textContent = "0%";
    return;
  }

  const counts = {};
  incidents.forEach((i) => {
    counts[i.severity] = (counts[i.severity] || 0) + 1;
  });

  const topSeverity = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  severityEl.textContent = topSeverity
    ? topSeverity[0].charAt(0).toUpperCase() + topSeverity[0].slice(1)
    : "—";

  const active = incidents.filter(
    (i) => i.status === "reported" || i.status === "in-progress"
  ).length;
  activeEl.textContent = String(active);

  const resolved = incidents.filter(
    (i) => i.status === "resolved" || i.status === "closed"
  ).length;
  resolutionEl.textContent = `${Math.round((resolved / incidents.length) * 100)}%`;
}

/**
 * Live clock in command center header
 */
let clockIntervalId = null;

function startLiveClock() {
  const dateEl = document.getElementById("command-date");
  const timeEl = document.getElementById("command-time");

  function tick() {
    const now = new Date();
    if (dateEl) {
      dateEl.textContent = now.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }
    if (timeEl) {
      timeEl.textContent = now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    }
  }

  tick();
  if (clockIntervalId) clearInterval(clockIntervalId);
  clockIntervalId = setInterval(tick, 1000);
}

function stopLiveClock() {
  if (clockIntervalId) {
    clearInterval(clockIntervalId);
    clockIntervalId = null;
  }
}

/**
 * Priority level label for incident cards (frontend only)
 */
function getPriorityLevel(incident) {
  if (incident.status === "resolved" || incident.status === "closed") {
    return { label: "Low Priority", class: "priority-low" };
  }
  if (incident.severity === "critical") {
    return { label: "Critical Priority", class: "priority-critical" };
  }
  if (incident.severity === "high") {
    return { label: "High Priority", class: "priority-high" };
  }
  if (incident.severity === "medium") {
    return { label: "Medium Priority", class: "priority-medium" };
  }
  return { label: "Standard Priority", class: "priority-standard" };
}

/**
 * Human-readable status badge (API values unchanged)
 */
function getStatusDisplay(status) {
  const map = {
    reported: { label: "Reported", hint: "Awaiting response coordination" },
    "in-progress": {
      label: "In Progress",
      hint: "Team assigned — active response underway",
    },
    resolved: { label: "Resolved", hint: "Incident successfully contained" },
    closed: { label: "Closed", hint: "Case archived and closed" },
  };
  return map[status] || { label: status, hint: "" };
}

/**
 * Severity explanation for expanded card details
 */
function getSeverityExplanation(severity) {
  const map = {
    low: "Minor impact — routine monitoring recommended.",
    medium: "Moderate impact — standard response protocols apply.",
    high: "Significant impact — expedited response required.",
    critical: "Severe impact — immediate emergency coordination needed.",
  };
  return map[severity] || "";
}

/**
 * Sort incidents: high severity first, resolved last, then by date
 */
function sortIncidentsByPriority(incidents, sortMode) {
  const list = [...incidents];

  const prioritySort = (a, b) => {
    const aResolved =
      a.status === "resolved" || a.status === "closed" ? 1 : 0;
    const bResolved =
      b.status === "resolved" || b.status === "closed" ? 1 : 0;
    if (aResolved !== bResolved) return aResolved - bResolved;

    const sevDiff =
      (SEVERITY_WEIGHT[b.severity] || 0) - (SEVERITY_WEIGHT[a.severity] || 0);
    if (sevDiff !== 0) return sevDiff;

    return new Date(b.createdAt) - new Date(a.createdAt);
  };

  if (sortMode === "newest") {
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
  if (sortMode === "severity") {
    return list.sort(prioritySort);
  }
  return list.sort(prioritySort);
}

/**
 * Filter incidents by search, severity, and status (frontend only)
 */
function filterIncidents(incidents, { search, severity, status }) {
  return incidents.filter((incident) => {
    const q = search.trim().toLowerCase();
    if (q) {
      const haystack = [
        incident.title,
        incident.description,
        incident.location,
        incident.reporterName,
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (severity !== "all" && incident.severity !== severity) return false;
    if (status === "active") {
      if (incident.status !== "reported" && incident.status !== "in-progress") {
        return false;
      }
    } else if (status === "resolved") {
      if (incident.status !== "resolved" && incident.status !== "closed") {
        return false;
      }
    } else if (status !== "all" && incident.status !== status) {
      return false;
    }
    return true;
  });
}

/**
 * Build timeline entries from incidents + session log
 */
function buildTimelineEntries(incidents, sessionLog) {
  const entries = [];

  incidents.forEach((inc) => {
    const title = inc.title || "Incident";
    const created = new Date(inc.createdAt);
    entries.push({
      icon: "📝",
      text: `${title} reported`,
      time: created,
      sortKey: created.getTime(),
    });

    if (inc.status === "in-progress") {
      const t = new Date(inc.updatedAt || inc.createdAt);
      entries.push({
        icon: "🔄",
        text: `Status updated to in-progress — ${title}`,
        time: t,
        sortKey: t.getTime() + 1,
      });
    }
    if (inc.status === "resolved" || inc.status === "closed") {
      const t = new Date(inc.updatedAt || inc.createdAt);
      entries.push({
        icon: "✅",
        text: `${title} resolved`,
        time: t,
        sortKey: t.getTime() + 2,
      });
    }
  });

  const icons = { created: "📝", updated: "🔄", resolved: "✅", deleted: "🗑️" };
  sessionLog.forEach((entry) => {
    let text = entry.title;
    if (entry.type === "created") text = `${entry.title} reported`;
    else if (entry.type === "updated")
      text = `Status updated — ${entry.title}${entry.extra ? ` (${entry.extra})` : ""}`;
    else if (entry.type === "resolved") text = `${entry.title} resolved`;
    else if (entry.type === "deleted") text = `${entry.title} removed`;

    entries.push({
      icon: icons[entry.type] || "📌",
      text,
      time: new Date(entry.timestamp),
      sortKey: new Date(entry.timestamp).getTime(),
    });
  });

  entries.sort((a, b) => b.sortKey - a.sortKey);
  const seen = new Set();
  return entries
    .filter((e) => {
      const key = `${e.text}-${e.time.toISOString()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 10);
}

/**
 * Render vertical activity timeline
 */
function renderTimeline(entries, container) {
  if (!container) return;

  if (entries.length === 0) {
    container.innerHTML =
      '<li class="timeline-empty">No activity recorded yet.</li>';
    return;
  }

  container.innerHTML = entries
    .map(
      (e, i) => `
    <li class="timeline-item fade-in-section" style="animation-delay: ${i * 0.05}s">
      <div class="timeline-marker" aria-hidden="true">
        <span class="timeline-dot"></span>
        ${i < entries.length - 1 ? '<span class="timeline-line"></span>' : ""}
      </div>
      <div class="timeline-content">
        <span class="timeline-icon" aria-hidden="true">${e.icon}</span>
        <p class="timeline-text">${escapeHtmlDash(e.text)}</p>
        <time class="timeline-time">${formatDateTimeDash(e.time)}</time>
      </div>
    </li>`
    )
    .join("");
}

function escapeHtmlDash(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function formatDateTimeDash(dateInput) {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(d.getTime())) return "Unknown";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * HTML for loading skeleton cards
 */
function getSkeletonHTML(count = 3) {
  return Array(count)
    .fill(0)
    .map(
      () => `
    <div class="skeleton-card" aria-hidden="true">
      <div class="skeleton-line skeleton-line--title"></div>
      <div class="skeleton-line skeleton-line--short"></div>
      <div class="skeleton-line"></div>
      <div class="skeleton-line skeleton-line--medium"></div>
    </div>`
    )
    .join("");
}

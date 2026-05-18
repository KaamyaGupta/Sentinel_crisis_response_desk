/**
 * API Helper Functions
 * --------------------
 * Central place for HTTP requests to both microservices.
 * Automatically attaches JWT from localStorage when needed.
 */

/**
 * Get stored JWT token (or null if not logged in)
 */
function getToken() {
  return localStorage.getItem(CONFIG.TOKEN_KEY);
}

/**
 * Save token and user info after successful login/signup
 */
function saveSession(token, user) {
  localStorage.setItem(CONFIG.TOKEN_KEY, token);
  localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(user));
}

/**
 * Clear session on logout
 */
function clearSession() {
  localStorage.removeItem(CONFIG.TOKEN_KEY);
  localStorage.removeItem(CONFIG.USER_KEY);
}

/**
 * Get logged-in user from localStorage
 */
function getStoredUser() {
  const raw = localStorage.getItem(CONFIG.USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

/**
 * Check if user appears to be logged in
 */
function isLoggedIn() {
  return !!getToken();
}

/**
 * Generic fetch wrapper with JSON headers and optional auth
 */
async function apiRequest(url, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}

// --- Auth API calls ---

async function signup(name, email, password) {
  return apiRequest(`${CONFIG.AUTH_API_URL}/signup`, {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
}

async function login(email, password) {
  return apiRequest(`${CONFIG.AUTH_API_URL}/login`, {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

// --- Incident API calls ---

async function fetchIncidents() {
  return apiRequest(CONFIG.INCIDENT_API_URL);
}

async function createIncident(incidentData) {
  return apiRequest(CONFIG.INCIDENT_API_URL, {
    method: "POST",
    body: JSON.stringify(incidentData),
  });
}

async function updateIncident(id, updates) {
  return apiRequest(`${CONFIG.INCIDENT_API_URL}/${id}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}

async function deleteIncident(id) {
  return apiRequest(`${CONFIG.INCIDENT_API_URL}/${id}`, {
    method: "DELETE",
  });
}

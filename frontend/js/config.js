/**
 * API Configuration
 * -----------------
 * Change these URLs if you deploy services elsewhere.
 * Auth service runs on port 3001, Incident service on 3002.
 */

const CONFIG = {
  AUTH_API_URL: "http://localhost:3001/api/auth",
  INCIDENT_API_URL: "http://localhost:3002/api/incidents",
  // Key used in localStorage to save the JWT after login
  TOKEN_KEY: "disaster_coord_token",
  USER_KEY: "disaster_coord_user",
};

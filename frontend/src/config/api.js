const fallbackApiUrl = "http://localhost:8080";

export const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || fallbackApiUrl).replace(/\/$/, "");

export function apiUrl(path) {
  return `${API_BASE_URL}${path}`;
}

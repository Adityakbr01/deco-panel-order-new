import axios from "axios";

const DEFAULT_API_URL = "https://decopanel.in/public/api/";
const shouldUseDevProxy =
  import.meta.env.DEV && import.meta.env.VITE_USE_API_PROXY === "true";

const api = axios.create({
  baseURL: shouldUseDevProxy
    ? import.meta.env.VITE_API_PROXY_URL || "/api/proxy"
    : import.meta.env.VITE_API_URL || DEFAULT_API_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => {
    // Handle cases where the API returns HTTP 200 but contains an error code in the body
    if (res.data && res.data.code === 501) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        localStorage.removeItem("user_type_id");
        localStorage.removeItem("id");
        localStorage.removeItem("username");
        localStorage.removeItem("email");
        window.location.href = "/login";
      }
      return Promise.reject(new Error(res.data.message || "Token expired"));
    }
    return res;
  },
  (err) => {
    // Handle actual HTTP 401 or 501 statuses
    if (
      (err.response?.status === 401 || err.response?.status === 501) && 
      typeof window !== "undefined"
    ) {
      localStorage.removeItem("token");
      localStorage.removeItem("user_type_id");
      localStorage.removeItem("id");
      localStorage.removeItem("username");
      localStorage.removeItem("email");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;

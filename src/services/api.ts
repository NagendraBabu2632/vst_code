import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("dfs_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("dfs_user");
      localStorage.removeItem("dfs_token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default apiClient;

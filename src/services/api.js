import axios from "axios";

const API_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:3000/api";

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

// ✅ INTERCEPTOR UNIQUE → ajoute token automatiquement
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token"); // ✅ source unique

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// ✅ INTERCEPTOR → gestion erreurs globales
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      console.warn("🔒 Session expirée");

      localStorage.clear(); // ✅ cohérent avec login
      window.location.href = "/";
    }

    return Promise.reject(err);
  }
);

export default api;
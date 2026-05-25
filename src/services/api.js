import axios from "axios";

// ======================================================
// API URL
// ======================================================

const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://backend-ad3t.onrender.com/api";

// ======================================================
// AXIOS INSTANCE
// ======================================================

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ======================================================
// REQUEST INTERCEPTOR
// → ajoute automatiquement le token
// ======================================================

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ======================================================
// RESPONSE INTERCEPTOR
// → gestion globale des erreurs
// ======================================================

api.interceptors.response.use(
  (response) => response,

  (error) => {
    // ==================================================
    // SESSION EXPIRÉE / TOKEN INVALID
    // ==================================================

    if (error.response?.status === 401) {
      console.warn("🔒 Session expirée");

      localStorage.removeItem("token");
      localStorage.removeItem("user");

      window.location.href = "/";
    }

    // ==================================================
    // BACKEND OFFLINE
    // ==================================================

    if (
      error.code === "ERR_NETWORK" ||
      error.message === "Network Error"
    ) {
      console.error("🌐 Impossible de joindre le serveur");
    }

    // ==================================================
    // TIMEOUT
    // ==================================================

    if (error.code === "ECONNABORTED") {
      console.error("⏳ Temps de réponse dépassé");
    }

    return Promise.reject(error);
  }
);

export default api;
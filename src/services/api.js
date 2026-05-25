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

  timeout: 20000,

  withCredentials: true,

  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// ======================================================
// REQUEST INTERCEPTOR
// → ajoute automatiquement le token
// ======================================================

api.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem("token");

    // attach JWT
    if (token) {
      config.headers.Authorization =
        `Bearer ${token}`;
    }

    console.log(
      `📡 ${config.method?.toUpperCase()} ${config.url}`
    );

    return config;
  },

  (error) => {
    console.error(
      "❌ REQUEST ERROR:",
      error
    );

    return Promise.reject(error);
  }
);

// ======================================================
// RESPONSE INTERCEPTOR
// → gestion globale des erreurs
// ======================================================

api.interceptors.response.use(
  (response) => {
    console.log(
      `✅ ${response.status} ${response.config.url}`
    );

    return response;
  },

  (error) => {
    // ==================================================
    // BACKEND OFFLINE / CORS / NETWORK
    // ==================================================

    if (!error.response) {
      console.error(
        "🌐 NETWORK ERROR"
      );

      console.error(
        "Possible causes:"
      );

      console.error(
        "- Backend Render sleeping"
      );

      console.error(
        "- CORS blocked"
      );

      console.error(
        "- Invalid API URL"
      );

      console.error(
        "- Internet issue"
      );

      return Promise.reject({
        success: false,

        message:
          "Impossible de joindre le serveur",
      });
    }

    // ==================================================
    // ERROR STATUS
    // ==================================================

    const status =
      error.response.status;

    console.error(
      `❌ API ERROR ${status}:`,
      error.response.data
    );

    // ==================================================
    // SESSION EXPIRÉE / TOKEN INVALID
    // ==================================================

    if (status === 401) {
      console.warn(
        "🔒 Session expirée"
      );

      localStorage.removeItem(
        "token"
      );

      localStorage.removeItem(
        "user"
      );

      // prevent redirect loop
      if (
        window.location.pathname !==
        "/"
      ) {
        window.location.href = "/";
      }
    }

    // ==================================================
    // FORBIDDEN
    // ==================================================

    if (status === 403) {
      console.error(
        "⛔ Accès refusé"
      );
    }

    // ==================================================
    // NOT FOUND
    // ==================================================

    if (status === 404) {
      console.error(
        "📭 Route introuvable"
      );
    }

    // ==================================================
    // SERVER ERROR
    // ==================================================

    if (status >= 500) {
      console.error(
        "🔥 Erreur serveur"
      );
    }

    // ==================================================
    // TIMEOUT
    // ==================================================

    if (
      error.code ===
      "ECONNABORTED"
    ) {
      console.error(
        "⏳ Temps de réponse dépassé"
      );
    }

    return Promise.reject(
      error.response.data ||
        error
    );
  }
);

export default api;
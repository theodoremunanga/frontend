import axios from "axios";

// ======================================================
// ENV CONFIG
// ======================================================

const API_URL =
  import.meta.env.VITE_API_URL?.trim() ||
  "https://backend-ad3t.onrender.com/api";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL?.trim() ||
  "https://backend-ad3t.onrender.com";

// ======================================================
// DEBUG ENV
// ======================================================

console.log("🌍 API URL :", API_URL);
console.log("🔌 SOCKET URL :", SOCKET_URL);

// ======================================================
// AXIOS INSTANCE
// ======================================================

const api = axios.create({
  baseURL: API_URL,

  timeout: 30000,

  withCredentials: false,

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
    const token = localStorage.getItem("token");

    // ==================================================
    // ATTACH JWT TOKEN
    // ==================================================

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // ==================================================
    // LOG REQUEST
    // ==================================================

    console.log(
      `📡 ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`
    );

    return config;
  },

  (error) => {
    console.error("❌ REQUEST ERROR :", error);

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

  async (error) => {
    // ==================================================
    // TIMEOUT
    // ==================================================

    if (error.code === "ECONNABORTED") {
      console.error("⏳ Temps de réponse dépassé");

      return Promise.reject({
        success: false,
        message:
          "Le serveur met trop de temps à répondre",
      });
    }

    // ==================================================
    // NETWORK / CORS / BACKEND DOWN
    // ==================================================

    if (!error.response) {
      console.error("🌐 NETWORK ERROR");

      console.error("Causes possibles :");

      console.error("- Backend Render endormi");

      console.error("- Erreur CORS");

      console.error("- API inaccessible");

      console.error("- Connexion internet");

      console.error("- Mauvaise URL backend");

      return Promise.reject({
        success: false,
        message:
          "Impossible de joindre le serveur",
      });
    }

    // ==================================================
    // RESPONSE DATA
    // ==================================================

    const status = error.response.status;

    const data = error.response.data;

    console.error(
      `❌ API ERROR ${status} :`,
      data
    );

    // ==================================================
    // UNAUTHORIZED
    // ==================================================

    if (status === 401) {
      console.warn("🔒 Session expirée");

      localStorage.removeItem("token");

      localStorage.removeItem("user");

      // éviter boucle infinie
      if (
        window.location.pathname !== "/" &&
        window.location.pathname !== "/login"
      ) {
        window.location.href = "/";
      }
    }

    // ==================================================
    // FORBIDDEN
    // ==================================================

    if (status === 403) {
      console.error("⛔ Accès refusé");
    }

    // ==================================================
    // NOT FOUND
    // ==================================================

    if (status === 404) {
      console.error("📭 Route introuvable");
    }

    // ==================================================
    // VALIDATION ERROR
    // ==================================================

    if (status === 422) {
      console.error("🧾 Données invalides");
    }

    // ==================================================
    // SERVER ERROR
    // ==================================================

    if (status >= 500) {
      console.error("🔥 Erreur serveur");
    }

    // ==================================================
    // RETURN CLEAN ERROR
    // ==================================================

    return Promise.reject({
      success: false,

      status,

      message:
        data?.message ||
        data?.error ||
        "Une erreur est survenue",

      data,
    });
  }
);

// ======================================================
// EXPORTS
// ======================================================

export { API_URL, SOCKET_URL };

export default api;
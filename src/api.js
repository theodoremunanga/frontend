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

  withCredentials: true,

  timeout: 15000,

  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// ======================================================
// REQUEST INTERCEPTOR
// ======================================================
api.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem(
        "token"
      );

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
// ======================================================
api.interceptors.response.use(
  (response) => {
    console.log(
      `✅ ${response.status} ${response.config.url}`
    );

    return response;
  },

  (error) => {
    // ==========================================
    // NETWORK ERROR / CORS / BACKEND DOWN
    // ==========================================
    if (!error.response) {
      console.error(
        "❌ NETWORK ERROR"
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
        "- Bad API URL"
      );

      console.error(
        "- Internet issue"
      );

      return Promise.reject({
        success: false,

        message:
          "Backend unreachable",
      });
    }

    // ==========================================
    // API ERROR
    // ==========================================
    const status =
      error.response.status;

    console.error(
      `❌ API ERROR ${status}:`,
      error.response.data
    );

    // ==========================================
    // TOKEN EXPIRED
    // ==========================================
    if (status === 401) {
      localStorage.removeItem(
        "token"
      );

      if (
        window.location.pathname !==
        "/login"
      ) {
        window.location.href =
          "/login";
      }
    }

    // ==========================================
    // FORBIDDEN
    // ==========================================
    if (status === 403) {
      console.error(
        "⛔ ACCESS DENIED"
      );
    }

    // ==========================================
    // SERVER ERROR
    // ==========================================
    if (status >= 500) {
      console.error(
        "🔥 SERVER ERROR"
      );
    }

    return Promise.reject(
      error.response.data ||
        error
    );
  }
);

export default api;
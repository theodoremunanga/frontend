import axios from "axios";

/**
 * =====================================================
 * ENV
 * =====================================================
 */

export const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://backend-ad3t.onrender.com/api";

export const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  "https://backend-ad3t.onrender.com";

/**
 * =====================================================
 * VALIDATION
 * =====================================================
 */

if (!API_URL?.startsWith("http")) {
  throw new Error(
    `❌ Invalid VITE_API_URL: ${API_URL}`
  );
}

// ======================================================
// AXIOS INSTANCE
// ======================================================

const api = axios.create({
  baseURL: API_URL,

  // Render free tier can sleep
  timeout: 60000,

  withCredentials: true,

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
    try {
      const token =
        localStorage.getItem("token");

      // attach token safely
      if (token) {
        config.headers = {
          ...config.headers,
          Authorization: `Bearer ${token}`,
        };
      }

      if (isDev) {
        console.log(
          `📡 ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`
        );
      }

      return config;
    } catch (err) {
      console.error(
        "❌ REQUEST INTERCEPTOR ERROR",
        err
      );

      return Promise.reject(err);
    }
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
    if (isDev) {
      console.log(
        `✅ ${response.status} ${response.config.url}`
      );
    }

    return response;
  },

  async (error) => {
    // ==================================================
    // NETWORK ERROR
    // ==================================================

    if (!error.response) {
      console.error(
        "🌐 NETWORK ERROR"
      );

      console.error(
        "Possible causes:"
      );

      console.error(
        "- Render backend sleeping"
      );

      console.error(
        "- Backend offline"
      );

      console.error(
        "- Invalid API URL"
      );

      console.error(
        "- CORS blocked"
      );

      console.error(
        "- Internet connection"
      );

      // keep original axios error
      return Promise.reject({
        success: false,

        network: true,

        message:
          "Impossible de joindre le serveur",

        originalError: error,
      });
    }

    // ==================================================
    // STATUS
    // ==================================================

    const status =
      error.response.status;

    const data =
      error.response.data;

    console.error(
      `❌ API ERROR ${status}`,
      data
    );

    // ==================================================
    // 401 UNAUTHORIZED
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

      // avoid infinite redirect loop
      const currentPath =
        window.location.pathname;

      const publicRoutes = [
        "/",
        "/login",
        "/register",
      ];

      if (
        !publicRoutes.includes(
          currentPath
        )
      ) {
        setTimeout(() => {
          window.location.replace("/");
        }, 100);
      }
    }

    // ==================================================
    // 403
    // ==================================================

    if (status === 403) {
      console.error(
        "⛔ Access denied"
      );
    }

    // ==================================================
    // 404
    // ==================================================

    if (status === 404) {
      console.error(
        "📭 Route not found"
      );
    }

    // ==================================================
    // 429
    // ==================================================

    if (status === 429) {
      console.error(
        "🚫 Too many requests"
      );
    }

    // ==================================================
    // SERVER ERROR
    // ==================================================

    if (status >= 500) {
      console.error(
        "🔥 Internal server error"
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
        "⏳ Request timeout"
      );
    }

    return Promise.reject({
      success: false,

      status,

      ...(typeof data === "object"
        ? data
        : { message: data }),

      originalError: error,
    });
  }
);

// ======================================================
// EXPORT
// ======================================================

export default api;
import axios from "axios";

/**
 * =====================================================
 * ENV
 * =====================================================
 */

const isDev = import.meta.env.DEV;

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

if (!SOCKET_URL?.startsWith("http")) {
  throw new Error(
    `❌ Invalid VITE_SOCKET_URL: ${SOCKET_URL}`
  );
}

/**
 * =====================================================
 * AXIOS INSTANCE
 * =====================================================
 */

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

/**
 * =====================================================
 * REQUEST INTERCEPTOR
 * =====================================================
 */

api.interceptors.request.use(
  (config) => {
    try {
      const token =
        localStorage.getItem("token");

      /**
       * Attach JWT token
       */
      if (token) {
        config.headers.Authorization =
          `Bearer ${token}`;
      }

      /**
       * Debug logs
       */
      if (isDev) {
        console.log(
          `📡 ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`
        );

        console.log(
          "🪪 TOKEN:",
          token ? "FOUND" : "MISSING"
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

/**
 * =====================================================
 * RESPONSE INTERCEPTOR
 * =====================================================
 */

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
    /**
     * =================================================
     * TIMEOUT
     * =================================================
     */

    if (
      error.code === "ECONNABORTED"
    ) {
      console.error(
        "⏳ REQUEST TIMEOUT"
      );

      return Promise.reject({
        success: false,

        timeout: true,

        message:
          "Le serveur met trop de temps à répondre",

        originalError: error,
      });
    }

    /**
     * =================================================
     * NETWORK ERROR
     * =================================================
     */

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

      return Promise.reject({
        success: false,

        network: true,

        message:
          "Impossible de joindre le serveur",

        originalError: error,
      });
    }

    /**
     * =================================================
     * RESPONSE DATA
     * =================================================
     */

    const status =
      error.response.status;

    const data =
      error.response.data || {};

    console.error(
      `❌ API ERROR ${status}`,
      data
    );

    /**
     * =================================================
     * 400 BAD REQUEST
     * =================================================
     */

    if (status === 400) {
      console.error(
        "⚠️ BAD REQUEST"
      );
    }

    /**
     * =================================================
     * 401 UNAUTHORIZED
     * =================================================
     */

    if (status === 401) {
      console.warn(
        "🔒 SESSION EXPIRED"
      );

      localStorage.removeItem(
        "token"
      );

      localStorage.removeItem(
        "user"
      );

      /**
       * Avoid redirect loop
       */
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

    /**
     * =================================================
     * 403 FORBIDDEN
     * =================================================
     */

    if (status === 403) {
      console.error(
        "⛔ ACCESS DENIED"
      );
    }

    /**
     * =================================================
     * 404 NOT FOUND
     * =================================================
     */

    if (status === 404) {
      console.error(
        "📭 ROUTE NOT FOUND"
      );
    }

    /**
     * =================================================
     * 429 TOO MANY REQUESTS
     * =================================================
     */

    if (status === 429) {
      console.error(
        "🚫 TOO MANY REQUESTS"
      );
    }

    /**
     * =================================================
     * 500+ SERVER ERROR
     * =================================================
     */

    if (status >= 500) {
      console.error(
        "🔥 INTERNAL SERVER ERROR"
      );
    }

    /**
     * =================================================
     * FINAL ERROR OBJECT
     * =================================================
     */

    return Promise.reject({
      success: false,

      status,

      message:
        data.message ||
        data.error ||
        "Une erreur est survenue",

      ...(
        typeof data === "object"
          ? data
          : {}
      ),

      originalError: error,
    });
  }
);

/**
 * =====================================================
 * OPTIONAL HELPERS
 * =====================================================
 */

export const setAuthToken = (
  token
) => {
  if (!token) return;

  localStorage.setItem(
    "token",
    token
  );

  api.defaults.headers.common.Authorization =
    `Bearer ${token}`;
};

export const clearAuth = () => {
  localStorage.removeItem("token");

  localStorage.removeItem("user");

  delete api.defaults.headers.common
    .Authorization;
};

/**
 * =====================================================
 * EXPORT
 * =====================================================
 */

export default api;
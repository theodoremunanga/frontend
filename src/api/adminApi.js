import axios from "axios";

// ======================================================
// API URL
// ======================================================
const API_URL =
  import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error(
    "❌ VITE_API_URL is missing"
  );
}

// ======================================================
// AXIOS INSTANCE
// ======================================================
const api = axios.create({
  baseURL: `${API_URL}/api`,

  withCredentials: true,

  headers: {
    "Content-Type":
      "application/json",
  },
});

// ======================================================
// TOKEN INTERCEPTOR
// ======================================================
api.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem(
        "token"
      );

    if (token) {
      config.headers.Authorization =
        `Bearer ${token}`;
    }

    return config;
  },

  (error) => {
    return Promise.reject(error);
  }
);

// ======================================================
// RESPONSE INTERCEPTOR
// ======================================================
api.interceptors.response.use(
  (response) => response,

  (error) => {
    console.error(
      "❌ API ERROR:",
      error
    );

    if (
      error.response?.status ===
      401
    ) {
      console.warn(
        "⚠️ Unauthorized"
      );
    }

    return Promise.reject(error);
  }
);

// ======================================================
// ADMIN API
// ======================================================
const adminApi = {
  // ====================================================
  // STATS
  // ====================================================
  getStats: async () => {
    const res =
      await api.get(
        "/admin/stats"
      );

    return res.data;
  },

  // ====================================================
  // TRANSACTIONS
  // ====================================================
  getTransactions:
    async () => {
      const res =
        await api.get(
          "/admin/transactions"
        );

      return res.data;
    },

  // ====================================================
  // MATCHES
  // ====================================================
  getMatches: async () => {
    const res =
      await api.get(
        "/admin/matches"
      );

    return res.data;
  },

  // ====================================================
  // MESSAGES
  // ====================================================
  getMessages:
    async () => {
      const res =
        await api.get(
          "/admin/messages"
        );

      return res.data;
    },

  // ====================================================
  // APPROVE TRANSACTION
  // ====================================================
  approveTx: async (
    id,
    reference
  ) => {
    const res =
      await api.post(
        "/admin/validate",
        {
          transactionId: id,
          reference,
        }
      );

    return res.data;
  },

  // ====================================================
  // REJECT TRANSACTION
  // ====================================================
  rejectTx: async (
    id,
    reason
  ) => {
    const res =
      await api.post(
        "/admin/reject",
        {
          transactionId: id,
          reason,
        }
      );

    return res.data;
  },

  // ====================================================
  // CANCEL MATCH
  // ====================================================
  cancelMatch:
    async (id) => {
      const res =
        await api.post(
          `/admin/match/${id}/cancel`
        );

      return res.data;
    },
};

export default adminApi;
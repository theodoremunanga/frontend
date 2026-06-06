import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

const api = axios.create({ baseURL: API });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default {
  getStats: () => api.get("/admin/stats").then(r => r.data),
  getTransactions: () => api.get("/admin/transactions").then(r => r.data),
  getMatches: () => api.get("/admin/matches").then(r => r.data),
  getMessages: () => api.get("/admin/messages").then(r => r.data),

  approveTx: (id, reference) =>
    api.post("/admin/validate", { transactionId: id, reference }),

  rejectTx: (id, reason) =>
    api.post("/admin/reject", { transactionId: id, reason }),

  cancelMatch: (id) =>
    api.post(`/admin/match/${id}/cancel`),
};
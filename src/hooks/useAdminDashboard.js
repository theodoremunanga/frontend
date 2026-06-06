import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import api from "../api/adminApi";

const SOCKET_URL =
  (import.meta.env.VITE_API_URL || "http://localhost:3000").replace("/api", "");

export default function useAdminDashboard() {
  const [loading, setLoading] = useState(false);

  const [stats, setStats] = useState({});
  const [transactions, setTransactions] = useState([]);
  const [matches, setMatches] = useState([]);
  const [messages, setMessages] = useState([]);
  const [notifications, setNotifications] = useState([]);

  const socketRef = useRef(null);

  const push = (msg) =>
    setNotifications((p) => [msg, ...p].slice(0, 5));

  // ================= FETCH =================
  const fetchAll = async () => {
    try {
      setLoading(true);

      const [s, t, m, msg] = await Promise.all([
        api.getStats(),
        api.getTransactions(),
        api.getMatches(),
        api.getMessages(),
      ]);

      setStats(s || {});
      setTransactions(t || []);
      setMatches(m || []);
      setMessages(msg || []);
    } catch {
      push("❌ Erreur serveur");
    } finally {
      setLoading(false);
    }
  };

  // ================= SOCKET =================
  useEffect(() => {
    fetchAll();

    const socket = io(SOCKET_URL, {
      auth: { token: localStorage.getItem("token") },
    });

    socketRef.current = socket;

    socket.on("connect", () => push("🟢 Live connecté"));

    socket.on("transaction:new", (tx) => {
      setTransactions((p) => [tx, ...p]);
      push("💰 Nouvelle transaction");
    });

    socket.on("message:new", (m) => {
      setMessages((p) => [m, ...p]);
    });

    return () => socket.disconnect();
  }, []);

  // ================= ACTIONS =================
  const approve = async (id) => {
    const tx = transactions.find(t => t.id === id);
    if (!tx) return push("⚠️ Transaction introuvable");

    const reference = tx.description || tx.reference;
    if (!reference) return push("⚠️ Référence manquante");

    try {
      await api.approveTx(id, reference);
      setTransactions(p => p.filter(t => t.id !== id));
      push("✅ Transaction validée");
    } catch {
      push("❌ Erreur validation");
    }
  };

  const reject = async (id) => {
    const reason = prompt("Raison du rejet ?");
    if (!reason) return;

    try {
      await api.rejectTx(id, reason);
      setTransactions(p => p.filter(t => t.id !== id));
      push("❌ Transaction rejetée");
    } catch {
      push("❌ Erreur rejet");
    }
  };

  const cancelMatch = async (id) => {
    if (!window.confirm("Annuler ce match ?")) return;

    try {
      await api.cancelMatch(id);
      push("⚠️ Match annulé");
    } catch {
      push("❌ Erreur annulation");
    }
  };

  return {
    loading,
    stats,
    transactions,
    matches,
    messages,
    notifications,
    fetchAll,
    approve,
    reject,
    cancelMatch,
  };
}
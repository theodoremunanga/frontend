import { useEffect, useMemo, useState } from "react";
import axios from "axios";

// ================= API =================
const API = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

const api = axios.create({ baseURL: API });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ================= COMPONENT =================
export default function MessagesList({ type = "all" }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  // ================= FETCH =================
  const fetchMessages = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/admin/messages");
      setMessages(data || []);
    } catch (err) {
      console.error("❌ FETCH MESSAGES:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  // ================= FILTER =================
  const filtered = useMemo(() => {
    let list = [...messages];

    if (type !== "all") {
      list = list.filter((m) => m.type === type);
    }

    return list.sort((a, b) => {
      if (a.read === b.read) {
        return new Date(b.created_at) - new Date(a.created_at);
      }
      return a.read ? 1 : -1;
    });
  }, [messages, type]);

  // ================= ACTIONS =================
  const markAsRead = async (id) => {
    try {
      await api.post(`/admin/messages/${id}/read`);
      fetchMessages();
    } catch {
      alert("❌ Erreur mise à jour");
    }
  };

  const markAsResolved = async (id) => {
    try {
      await api.post(`/admin/messages/${id}/resolve`);
      fetchMessages();
    } catch {
      alert("❌ Erreur résolution");
    }
  };

  const resolveWithWinner = async (m) => {
    const winnerId = prompt("ID du gagnant ?");
    if (!winnerId) return;

    try {
      await api.post("/admin/resolve-match", {
        matchId: m.match_id,
        winnerId,
        messageId: m.id,
      });

      fetchMessages();
    } catch (err) {
      console.error(err);
      alert("❌ Erreur résolution litige");
    }
  };

  const deleteMessage = async (id) => {
    if (!confirm("Supprimer ce message ?")) return;

    try {
      await api.delete(`/admin/messages/${id}`);
      fetchMessages();
    } catch {
      alert("❌ Erreur suppression");
    }
  };

  // ================= EMPTY =================
  if (loading) {
    return <p style={{ color: "#94a3b8" }}>⏳ Chargement...</p>;
  }

  if (!filtered.length) {
    return (
      <p style={{ color: "#94a3b8" }}>
        Aucun message {type !== "all" ? `(${type})` : ""}
      </p>
    );
  }

  // ================= UI =================
  return (
    <div style={container}>
      {filtered.map((m) => (
        <div
          key={m.id}
          style={{
            ...card,
            borderLeft: `4px solid ${typeColor(m.type)}`,
            opacity: m.resolved ? 0.6 : 1,
          }}
        >
          {/* HEADER */}
          <div style={header}>
            <div>
              <b>{m.username || "Utilisateur inconnu"}</b>

              <div style={meta}>
                {formatDate(m.created_at)} • {labelType(m.type)}
              </div>
            </div>

            <div style={{ display: "flex", gap: 6 }}>
              {!m.read && <span style={badgeNew}>NEW</span>}
              {m.resolved && <span style={badgeResolved}>✔</span>}
            </div>
          </div>

          {/* CONTEXT */}
          {m.type === "report" && (
            <div style={contextBox}>
              🎮 Match ID: {m.match_id || "N/A"}
              <br />
              ⚠️ Blocage signalé
            </div>
          )}

          {m.type === "complaint" && (
            <div style={contextBox}>
              📥 Réclamation utilisateur
            </div>
          )}

          {/* 📸 IMAGE DU PLATEAU */}
          {m.image && (
            <div style={{ marginBottom: 10 }}>
              <img
                src={m.image}
                alt="capture plateau"
                style={{
                  width: "100%",
                  borderRadius: 8,
                  border: "1px solid #334155",
                }}
              />
            </div>
          )}

          {/* CONTENT */}
          <p style={content}>{m.content}</p>

          {/* ACTIONS */}
          <div style={actions}>
            {!m.read && (
              <button
                style={btnPrimary}
                onClick={() => markAsRead(m.id)}
              >
                ✔ Lu
              </button>
            )}

            {/* 🔥 Résolution simple */}
            {!m.resolved && (
              <button
                style={btnSuccess}
                onClick={() => markAsResolved(m.id)}
              >
                ✅ Résoudre
              </button>
            )}

            {/* 🔥 RÉSOLUTION AVEC GAGNANT (IMPORTANT) */}
            {m.type === "report" && !m.resolved && (
              <button
                style={btnResolve}
                onClick={() => resolveWithWinner(m)}
              >
                ⚖️ Résoudre + payer gagnant
              </button>
            )}

            <button
              style={btnDanger}
              onClick={() => deleteMessage(m.id)}
            >
              🗑 Supprimer
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ================= HELPERS =================

function labelType(type) {
  if (type === "report") return "🚨 Blocage Dames";
  if (type === "complaint") return "📥 Réclamation";
  return "Message";
}

function typeColor(type) {
  if (type === "report") return "#ef4444";
  if (type === "complaint") return "#0ea5e9";
  return "#64748b";
}

function formatDate(date) {
  return date ? new Date(date).toLocaleString() : "";
}

// ================= STYLES =================

const container = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const card = {
  background: "#1e293b",
  padding: 15,
  borderRadius: 10,
  color: "#e2e8f0",
};

const header = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: 8,
};

const meta = {
  fontSize: 12,
  color: "#94a3b8",
};

const contextBox = {
  background: "#0f172a",
  padding: 8,
  borderRadius: 6,
  fontSize: 12,
  marginBottom: 8,
};

const content = {
  marginTop: 8,
  marginBottom: 10,
};

const actions = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};

const badgeNew = {
  background: "#ef4444",
  padding: "2px 6px",
  borderRadius: 6,
  fontSize: 10,
};

const badgeResolved = {
  background: "#22c55e",
  padding: "2px 6px",
  borderRadius: 6,
  fontSize: 10,
};

const btnBase = {
  border: "none",
  padding: "6px 10px",
  borderRadius: 6,
  color: "white",
  cursor: "pointer",
};

const btnPrimary = { ...btnBase, background: "#0ea5e9" };
const btnSuccess = { ...btnBase, background: "#22c55e" };
const btnDanger = { ...btnBase, background: "#ef4444" };
const btnResolve = { ...btnBase, background: "#f59e0b" };
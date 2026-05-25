import axios from "axios";

// 🔥 AXIOS CONFIG (IMPORTANT)
const API = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

const api = axios.create({
  baseURL: API,
});

// 🔐 TOKEN
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// ================= COMPONENT =================
export default function MatchesList({ matches = [], onRefresh }) {

  if (!matches.length) {
    return <p style={{ color: "#94a3b8" }}>Aucun match</p>;
  }

  // ================= ACTIONS =================

  const cancelMatch = async (id) => {
    if (!confirm("Annuler ce match ?")) return;

    try {
      await api.post(`/admin/match/${id}/cancel`);
      alert("✅ Match annulé");
      onRefresh?.();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.error || "❌ Erreur annulation");
    }
  };

  const finishMatch = async (id) => {
    if (!confirm("Terminer ce match ?")) return;

    try {
      await api.post(`/admin/match/${id}/force-finish`);
      alert("✅ Match terminé");
      onRefresh?.();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.error || "❌ Erreur fin match");
    }
  };

  const deleteMatch = async (id) => {
    if (!confirm("Supprimer définitivement ce match ?")) return;

    try {
      await api.delete(`/admin/match/${id}`);
      alert("🗑 Match supprimé");
      onRefresh?.();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.error || "❌ Erreur suppression");
    }
  };

  const viewPlayers = (m) => {
    alert(`Joueurs:\n${m.user1_name || "?"} vs ${m.user2_name || "?"}`);
  };

  // ================= UI =================

  return (
    <div style={container}>
      {matches.map((m) => (
        <div key={m.id} style={card}>
          <div style={header}>
            <div>
              <strong>Match #{m.id}</strong>
              <div style={subText}>
                {m.status} • {m.game} • 💰 {m.bet_amount || 0}
              </div>
            </div>

            <div style={players}>
              <span>{m.user1_name || "?"}</span>
              <span style={{ color: "#38bdf8" }}>vs</span>
              <span>{m.user2_name || "?"}</span>
            </div>
          </div>

          <div style={actions}>
            <button style={btnPrimary} onClick={() => viewPlayers(m)}>
              👥 Joueurs
            </button>

            {!["cancelled", "finished"].includes(m.status) && (
              <>
                <button
                  style={btnWarning}
                  onClick={() => cancelMatch(m.id)}
                >
                  ⛔ Annuler
                </button>

                <button
                  style={btnSuccess}
                  onClick={() => finishMatch(m.id)}
                >
                  🏁 Terminer
                </button>
              </>
            )}

            <button
              style={btnDanger}
              onClick={() => deleteMatch(m.id)}
            >
              🗑 Supprimer
            </button>
          </div>
        </div>
      ))}
    </div>
  );
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
  borderRadius: 12,
  color: "#e2e8f0",
  boxShadow: "0 4px 10px rgba(0,0,0,0.25)",
};

const header = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 10,
};

const subText = {
  fontSize: 12,
  color: "#94a3b8",
};

const players = {
  display: "flex",
  gap: 8,
  fontWeight: "bold",
};

const actions = {
  display: "flex",
  gap: 10,
  marginTop: 10,
  flexWrap: "wrap",
};

const btnBase = {
  border: "none",
  padding: "6px 10px",
  borderRadius: 6,
  color: "white",
  cursor: "pointer",
};

const btnPrimary = { ...btnBase, background: "#0ea5e9" };
const btnWarning = { ...btnBase, background: "#f59e0b" };
const btnSuccess = { ...btnBase, background: "#22c55e" };
const btnDanger = { ...btnBase, background: "#ef4444" };
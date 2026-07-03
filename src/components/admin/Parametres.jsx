import { useEffect, useState } from "react";
import api from "../../services/api";

// ================= UI STYLE SYSTEM =================

const page = {
  minHeight: "100vh",
  background: "#0b1220",
  color: "white",
  padding: 24,
  fontFamily: "system-ui",
};

const container = {
  maxWidth: 1200,
  margin: "0 auto",
  display: "flex",
  flexDirection: "column",
  gap: 18,
};

const header = {
  fontSize: 26,
  fontWeight: 800,
  marginBottom: 10,
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 16,
};

const card = {
  background: "linear-gradient(145deg,#111827,#0f172a)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16,
  padding: 16,
  boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
};

const title = {
  fontSize: 16,
  fontWeight: 700,
  marginBottom: 10,
  color: "#e5e7eb",
};

const label = {
  fontSize: 12,
  opacity: 0.7,
  marginBottom: 6,
};

const input = {
  width: "100%",
  padding: 12,
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.1)",
  background: "#0b1220",
  color: "white",
  outline: "none",
};

const textarea = {
  ...input,
  minHeight: 90,
  resize: "vertical",
};

const row = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  marginTop: 10,
};

const btn = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "none",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: 13,
};

const primary = {
  ...btn,
  background: "#2563eb",
  color: "white",
};

const danger = {
  ...btn,
  background: "#ef4444",
  color: "white",
};

const warning = {
  ...btn,
  background: "#f59e0b",
  color: "white",
};

const success = {
  ...btn,
  background: "#22c55e",
  color: "white",
};

const badge = (active) => ({
  display: "inline-block",
  padding: "4px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
  background: active ? "#22c55e" : "#ef4444",
});

// ================= COMPONENT =================

export default function Parametres() {
  const [loading, setLoading] = useState(true);

  const [settings, setSettings] = useState({
    platform_enabled: true,
    maintenance_mode: false,
    maintenance_message: "",
  });

  const [userId, setUserId] = useState("");
  const [matchId, setMatchId] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await api.get("/admin/settings");
      setSettings(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const togglePlatform = async (enabled) => {
    await api.put("/admin/settings/platform", { enabled });
    loadSettings();
  };

  const toggleMaintenance = async (enabled) => {
    await api.put("/admin/settings/maintenance", {
      enabled,
      message: settings.maintenance_message,
    });
    loadSettings();
  };

  const saveMaintenanceMessage = async () => {
    await api.put("/admin/settings/maintenance", {
      enabled: settings.maintenance_mode,
      message: settings.maintenance_message,
    });
    alert("Message sauvegardé");
  };

  const resetPassword = async () => {
    if (!userId) return;
    const res = await api.post(`/admin/users/${userId}/reset-password`);
    alert(`Nouveau mot de passe : ${res.data.newPassword}`);
  };

  const suspendUser = async () => {
    if (!userId) return;
    await api.put(`/admin/users/${userId}/suspend`);
    alert("Utilisateur suspendu");
  };

  const activateUser = async () => {
    if (!userId) return;
    await api.put(`/admin/users/${userId}/activate`);
    alert("Utilisateur activé");
  };

  const deleteUser = async () => {
    if (!userId) return;
    if (!window.confirm("Supprimer cet utilisateur ?")) return;
    await api.delete(`/admin/users/${userId}`);
    alert("Utilisateur supprimé");
  };

  const deleteMatch = async () => {
    if (!matchId) return;
    if (!window.confirm("Supprimer ce match ?")) return;
    await api.delete(`/admin/matches/${matchId}`);
    alert("Match supprimé");
  };

  const resetWallets = async () => {
    if (!window.confirm("Vider tous les wallets ?")) return;
    await api.post("/admin/wallets/reset", { confirm: true });
    alert("Wallets vidés");
  };

  const clearTransactions = async () => {
    if (!window.confirm("Supprimer transactions ?")) return;
    await api.post("/admin/transactions/clear");
    alert("Transactions supprimées");
  };

  const clearMatches = async () => {
    if (!window.confirm("Supprimer tous les matches ?")) return;
    await api.post("/admin/matches/clear");
    alert("Matches supprimés");
  };

  if (loading) {
    return (
      <div style={page}>
        <div style={{ textAlign: "center" }}>⏳ Chargement...</div>
      </div>
    );
  }

  return (
    <div style={page}>
      <div style={container}>
        <div style={header}>⚙️ Paramètres Système</div>

        <div style={grid}>
          {/* PLATFORM */}
          <div style={card}>
            <div style={title}>Plateforme</div>

            <div style={badge(settings.platform_enabled)}>
              {settings.platform_enabled ? "ACTIVE" : "OFF"}
            </div>

            <div style={row}>
              <button style={success} onClick={() => togglePlatform(true)}>
                Activer
              </button>
              <button style={danger} onClick={() => togglePlatform(false)}>
                Désactiver
              </button>
            </div>
          </div>

          {/* MAINTENANCE */}
          <div style={card}>
            <div style={title}>Maintenance</div>

            <div style={badge(settings.maintenance_mode)}>
              {settings.maintenance_mode ? "ON" : "OFF"}
            </div>

            <textarea
              style={textarea}
              value={settings.maintenance_message}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  maintenance_message: e.target.value,
                })
              }
            />

            <div style={row}>
              <button style={primary} onClick={saveMaintenanceMessage}>
                Sauver
              </button>
              <button style={warning} onClick={() => toggleMaintenance(true)}>
                ON
              </button>
              <button style={danger} onClick={() => toggleMaintenance(false)}>
                OFF
              </button>
            </div>
          </div>

          {/* USERS */}
          <div style={card}>
            <div style={title}>Utilisateur</div>

            <input
              style={input}
              placeholder="User ID"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            />

            <div style={row}>
              <button style={primary} onClick={resetPassword}>
                Reset Pass
              </button>
              <button style={warning} onClick={suspendUser}>
                Suspendre
              </button>
              <button style={success} onClick={activateUser}>
                Activer
              </button>
              <button style={danger} onClick={deleteUser}>
                Supprimer
              </button>
            </div>
          </div>

          {/* MATCH */}
          <div style={card}>
            <div style={title}>Match</div>

            <input
              style={input}
              placeholder="Match ID"
              value={matchId}
              onChange={(e) => setMatchId(e.target.value)}
            />

            <div style={row}>
              <button style={danger} onClick={deleteMatch}>
                Supprimer
              </button>
              <button style={warning} onClick={clearMatches}>
                Tout supprimer
              </button>
            </div>
          </div>

          {/* ECONOMY */}
          <div style={card}>
            <div style={title}>Économie</div>

            <div style={row}>
              <button style={warning} onClick={resetWallets}>
                Reset Wallets
              </button>
              <button style={danger} onClick={clearTransactions}>
                Clear Transactions
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
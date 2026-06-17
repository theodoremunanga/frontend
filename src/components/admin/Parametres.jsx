import { useEffect, useState } from "react";
import api from "../../services/api";

export default function Parametres() {

  const [loading, setLoading] = useState(true);

  const [settings, setSettings] = useState({
    platform_enabled: true,
    maintenance_mode: false,
    maintenance_message: ""
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
    try {

      await api.put("/admin/settings/platform", {
        enabled
      });

      loadSettings();

    } catch (err) {

      console.error(err);

    }
  };

  const toggleMaintenance = async (enabled) => {
    try {

      await api.put("/admin/settings/maintenance", {
        enabled,
        message: settings.maintenance_message
      });

      loadSettings();

    } catch (err) {

      console.error(err);

    }
  };

  const saveMaintenanceMessage = async () => {
    try {

      await api.put("/admin/settings/maintenance", {
        enabled: settings.maintenance_mode,
        message: settings.maintenance_message
      });

      alert("Message enregistré");

    } catch (err) {

      console.error(err);

    }
  };

  const resetPassword = async () => {
    if (!userId) return;

    try {

      const res = await api.post(
        `/admin/users/${userId}/reset-password`
      );

      alert(
        `Nouveau mot de passe : ${res.data.newPassword}`
      );

    } catch (err) {

      console.error(err);

    }
  };

  const suspendUser = async () => {
    if (!userId) return;

    try {

      await api.put(
        `/admin/users/${userId}/suspend`
      );

      alert("Utilisateur suspendu");

    } catch (err) {

      console.error(err);

    }
  };

  const activateUser = async () => {
    if (!userId) return;

    try {

      await api.put(
        `/admin/users/${userId}/activate`
      );

      alert("Utilisateur réactivé");

    } catch (err) {

      console.error(err);

    }
  };

  const deleteUser = async () => {

    const confirmDelete = window.confirm(
      "Supprimer définitivement cet utilisateur ?"
    );

    if (!confirmDelete) return;

    try {

      await api.delete(
        `/admin/users/${userId}`
      );

      alert("Utilisateur supprimé");

    } catch (err) {

      console.error(err);

    }
  };

  const deleteMatch = async () => {

    const confirmDelete = window.confirm(
      "Supprimer ce match ?"
    );

    if (!confirmDelete) return;

    try {

      await api.delete(
        `/admin/matches/${matchId}`
      );

      alert("Match supprimé");

    } catch (err) {

      console.error(err);

    }
  };

  const resetWallets = async () => {

    const confirmReset = window.confirm(
      "Vider tous les wallets ?"
    );

    if (!confirmReset) return;

    try {

      await api.post(
        "/admin/wallets/reset",
        {
          confirm: true
        }
      );

      alert("Wallets vidés");

    } catch (err) {

      console.error(err);

    }
  };

  const clearTransactions = async () => {

    const confirmClear = window.confirm(
      "Supprimer toutes les transactions ?"
    );

    if (!confirmClear) return;

    try {

      await api.post(
        "/admin/transactions/clear"
      );

      alert("Transactions supprimées");

    } catch (err) {

      console.error(err);

    }
  };

  const clearMatches = async () => {

    const confirmClear = window.confirm(
      "Supprimer tous les matches ?"
    );

    if (!confirmClear) return;

    try {

      await api.post(
        "/admin/matches/clear"
      );

      alert("Matches supprimés");

    } catch (err) {

      console.error(err);

    }
  };

  if (loading) {
    return (
      <div className="admin-loading">
        Chargement...
      </div>
    );
  }

  return (
    <div className="admin-settings">

      <h2>Paramètres Système</h2>

      {/* Plateforme */}

      <section className="settings-card">
        <h3>Plateforme</h3>

        <p>
          Statut :
          {" "}
          <strong>
            {settings.platform_enabled
              ? "ACTIVE"
              : "DÉSACTIVÉE"}
          </strong>
        </p>

        <button
          onClick={() => togglePlatform(true)}
        >
          Activer
        </button>

        <button
          onClick={() => togglePlatform(false)}
        >
          Désactiver
        </button>
      </section>

      {/* Maintenance */}

      <section className="settings-card">
        <h3>Maintenance</h3>

        <p>
          Mode :
          {" "}
          <strong>
            {settings.maintenance_mode
              ? "ACTIF"
              : "INACTIF"}
          </strong>
        </p>

        <textarea
          rows="4"
          value={settings.maintenance_message}
          onChange={(e) =>
            setSettings({
              ...settings,
              maintenance_message:
                e.target.value
            })
          }
        />

        <div>

          <button
            onClick={saveMaintenanceMessage}
          >
            Enregistrer Message
          </button>

          <button
            onClick={() =>
              toggleMaintenance(true)
            }
          >
            Activer
          </button>

          <button
            onClick={() =>
              toggleMaintenance(false)
            }
          >
            Désactiver
          </button>

        </div>
      </section>

      {/* Utilisateurs */}

      <section className="settings-card">
        <h3>Gestion Utilisateur</h3>

        <input
          type="number"
          placeholder="ID Utilisateur"
          value={userId}
          onChange={(e) =>
            setUserId(e.target.value)
          }
        />

        <div>

          <button onClick={resetPassword}>
            Réinitialiser Mot de Passe
          </button>

          <button onClick={suspendUser}>
            Suspendre
          </button>

          <button onClick={activateUser}>
            Réactiver
          </button>

          <button onClick={deleteUser}>
            Supprimer
          </button>

        </div>
      </section>

      {/* Wallets */}

      <section className="settings-card">
        <h3>Wallets</h3>

        <button onClick={resetWallets}>
          Vider Tous les Wallets
        </button>
      </section>

      {/* Transactions */}

      <section className="settings-card">
        <h3>Transactions</h3>

        <button onClick={clearTransactions}>
          Supprimer Historique
        </button>
      </section>

      {/* Matches */}

      <section className="settings-card">
        <h3>Matches</h3>

        <input
          type="number"
          placeholder="ID Match"
          value={matchId}
          onChange={(e) =>
            setMatchId(e.target.value)
          }
        />

        <button onClick={deleteMatch}>
          Supprimer Match
        </button>

        <button onClick={clearMatches}>
          Supprimer Tous les Matches
        </button>
      </section>

    </div>
  );
}
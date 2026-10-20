// ============================================================
// PARAMETRES.JSX — 6BETBALL ADMINISTRATION
// Interface Windows 10 / React
// ============================================================

import { useCallback, useEffect, useState } from "react";
import api from "../services/api";
import "./Parametres.css";

const INITIAL_SETTINGS = {
  platform_enabled: true,
  maintenance_mode: false,
  maintenance_message: "",
};

const getErrorMessage = (error) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  "Une erreur inattendue est survenue.";

export default function Parametres() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [settings, setSettings] = useState(INITIAL_SETTINGS);
  const [userId, setUserId] = useState("");
  const [matchId, setMatchId] = useState("");
  const [notice, setNotice] = useState(null);
  const [newPassword, setNewPassword] = useState("");

  // ==========================================================
  // NOTIFICATIONS
  // ==========================================================

  const notify = (message, type = "success") => {
    setNotice({ message, type });
  };

  // ==========================================================
  // CHARGEMENT DES PARAMÈTRES
  // ==========================================================

  const loadSettings = useCallback(async () => {
    try {
      const res = await api.get("/admin/settings");

      // Compatible avec une réponse directe ou { settings: {...} }
      const data = res.data?.settings ?? res.data;

      if (data && typeof data === "object") {
        setSettings((previous) => ({
          ...previous,
          ...data,
          platform_enabled:
            data.platform_enabled ?? previous.platform_enabled,
          maintenance_mode:
            data.maintenance_mode ?? previous.maintenance_mode,
          maintenance_message:
            data.maintenance_message ?? previous.maintenance_message,
        }));
      }
    } catch (error) {
      console.error("Chargement des paramètres :", error);
      notify(
        `Impossible de charger les paramètres : ${getErrorMessage(error)}`,
        "error"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // ==========================================================
  // EXÉCUTION SÉCURISÉE DES ACTIONS
  // ==========================================================

  const runAction = async (key, action, successMessage) => {
    if (busy) return;

    setBusy(key);
    setNotice(null);

    try {
      const result = await action();

      if (successMessage) {
        notify(successMessage);
      }

      return result;
    } catch (error) {
      console.error(`Action ${key} :`, error);
      notify(getErrorMessage(error), "error");
      return null;
    } finally {
      setBusy("");
    }
  };

  // ==========================================================
  // PLATEFORME
  // ==========================================================

  const togglePlatform = async (enabled) => {
    if (settings.platform_enabled === enabled) return;

    if (
      !window.confirm(
        enabled
          ? "Confirmer la réactivation de la plateforme ?"
          : "Attention : désactiver la plateforme peut empêcher les utilisateurs d'accéder au service. Continuer ?"
      )
    ) {
      return;
    }

    const result = await runAction(
      "platform",
      () => api.put("/admin/settings/platform", { enabled }),
      enabled
        ? "La plateforme a été activée."
        : "La plateforme a été désactivée."
    );

    if (result) {
      await loadSettings();
    }
  };

  // ==========================================================
  // MAINTENANCE
  // ==========================================================

  const saveMaintenanceMessage = async () => {
    const result = await runAction(
      "maintenance-message",
      () =>
        api.put("/admin/settings/maintenance", {
          enabled: settings.maintenance_mode,
          message: settings.maintenance_message,
        }),
      "Le message de maintenance a été enregistré."
    );

    if (result) await loadSettings();
  };

  const toggleMaintenance = async (enabled) => {
    if (settings.maintenance_mode === enabled) return;

    if (
      !window.confirm(
        enabled
          ? "Activer le mode maintenance ?"
          : "Désactiver le mode maintenance ?"
      )
    ) {
      return;
    }

    const result = await runAction(
      "maintenance",
      () =>
        api.put("/admin/settings/maintenance", {
          enabled,
          message: settings.maintenance_message,
        }),
      enabled
        ? "Le mode maintenance est activé."
        : "Le mode maintenance est désactivé."
    );

    if (result) await loadSettings();
  };

  // ==========================================================
  // UTILISATEURS
  // ==========================================================

  const resetPassword = async () => {
    if (!userId.trim()) {
      notify("Veuillez saisir l'identifiant de l'utilisateur.", "error");
      return;
    }

    if (
      !window.confirm(
        "Générer un nouveau mot de passe pour cet utilisateur ?"
      )
    ) {
      return;
    }

    setNewPassword("");

    const result = await runAction(
      "reset-password",
      () => api.post(`/admin/users/${encodeURIComponent(userId.trim())}/reset-password`),
      null
    );

    if (result) {
      const password = result.data?.newPassword;

      if (password) {
        setNewPassword(password);
        notify("Nouveau mot de passe généré. Copiez-le et transmettez-le de manière sécurisée.");
      } else {
        notify("La requête a réussi, mais aucun mot de passe n'a été retourné.", "error");
      }
    }
  };

  const changeUserStatus = async (action, label) => {
    if (!userId.trim()) {
      notify("Veuillez saisir l'identifiant de l'utilisateur.", "error");
      return;
    }

    const messages = {
      suspend: "Suspendre cet utilisateur ?",
      activate: "Réactiver cet utilisateur ?",
      delete: "Supprimer définitivement cet utilisateur ? Cette action peut être irréversible.",
    };

    if (!window.confirm(messages[action])) return;

    const path = `/admin/users/${encodeURIComponent(userId.trim())}`;

    const result = await runAction(
      `user-${action}`,
      () => {
        if (action === "suspend") return api.put(`${path}/suspend`);
        if (action === "activate") return api.put(`${path}/activate`);
        return api.delete(path);
      },
      label
    );

    if (result && action === "delete") {
      setUserId("");
      setNewPassword("");
    }
  };

  const copyPassword = async () => {
    if (!newPassword) return;

    try {
      await navigator.clipboard.writeText(newPassword);
      notify("Mot de passe copié.");
    } catch {
      notify(
        "Copie impossible. Sélectionnez le mot de passe et copiez-le manuellement.",
        "error"
      );
    }
  };

  // ==========================================================
  // PARTIES
  // ==========================================================

  const deleteMatch = async () => {
    if (!matchId.trim()) {
      notify("Veuillez saisir l'identifiant de la partie.", "error");
      return;
    }

    if (!window.confirm(`Supprimer la partie ${matchId} ?`)) return;

    const result = await runAction(
      "delete-match",
      () =>
        api.delete(
          `/admin/matches/${encodeURIComponent(matchId.trim())}`
        ),
      "La demande de suppression de la partie a réussi."
    );

    if (result) setMatchId("");
  };

  const clearMatches = async () => {
    if (
      !window.confirm(
        "Supprimer toutes les parties de tous les jeux ? Cette opération peut être irréversible."
      )
    ) {
      return;
    }

    if (
      !window.confirm(
        "Confirmation finale : voulez-vous réellement nettoyer toutes les parties ?"
      )
    ) {
      return;
    }

    await runAction(
      "clear-matches",
      () => api.post("/admin/matches/clear"),
      "Le nettoyage des parties a été effectué."
    );
  };

  // ==========================================================
  // ÉCONOMIE
  // ==========================================================

  const resetWallets = async () => {
    if (
      !window.confirm(
        "ATTENTION : remettre à zéro les soldes disponibles de tous les utilisateurs ?"
      )
    ) {
      return;
    }

    if (
      !window.confirm(
        "Confirmation finale : cette opération peut avoir des conséquences financières. Continuer ?"
      )
    ) {
      return;
    }

    await runAction(
      "reset-wallets",
      () => api.post("/admin/wallets/reset", { confirm: true }),
      "La demande de remise à zéro des wallets a réussi."
    );
  };

  const clearTransactions = async () => {
    if (
      !window.confirm(
        "ATTENTION : supprimer l'historique des transactions ? Vérifiez les obligations comptables avant de continuer."
      )
    ) {
      return;
    }

    if (
      !window.confirm(
        "Confirmation finale : supprimer toutes les transactions ?"
      )
    ) {
      return;
    }

    await runAction(
      "clear-transactions",
      () => api.post("/admin/transactions/clear"),
      "Le nettoyage des transactions a été effectué."
    );
  };

  // ==========================================================
  // CHARGEMENT
  // ==========================================================

  if (loading) {
    return (
      <main className="settings-page">
        <div className="settings-loading">
          <span className="settings-spinner" />
          <p>Chargement des paramètres système...</p>
        </div>
      </main>
    );
  }

  // ==========================================================
  // INTERFACE
  // ==========================================================

  return (
    <main className="settings-page">
      <div className="settings-shell">
        {/* EN-TÊTE */}
        <header className="settings-header">
          <div className="settings-heading">
            <div className="settings-heading-icon">⚙</div>

            <div>
              <div className="settings-eyebrow">6BETBALL · ADMINISTRATION</div>
              <h1>Paramètres</h1>
              <p>Gérez la plateforme, les utilisateurs et les opérations système.</p>
            </div>
          </div>

          <button
            type="button"
            className="settings-button settings-button-secondary"
            disabled={Boolean(busy)}
            onClick={() => {
              setLoading(true);
              loadSettings();
            }}
          >
            <span>↻</span> Actualiser
          </button>
        </header>

        {/* NOTIFICATION */}
        {notice && (
          <div
            className={`settings-notice settings-notice-${notice.type}`}
            role="status"
          >
            <span>{notice.type === "error" ? "⚠" : "✓"}</span>
            <p>{notice.message}</p>
            <button
              type="button"
              className="settings-notice-close"
              aria-label="Fermer la notification"
              onClick={() => setNotice(null)}
            >
              ×
            </button>
          </div>
        )}

        {/* BARRE D'ÉTAT */}
        <section className="settings-overview">
          <div className="settings-overview-item">
            <span
              className={`settings-status-dot ${
                settings.platform_enabled ? "is-online" : "is-offline"
              }`}
            />
            <div>
              <span className="settings-overview-label">Plateforme</span>
              <strong>
                {settings.platform_enabled ? "Active" : "Désactivée"}
              </strong>
            </div>
          </div>

          <div className="settings-overview-divider" />

          <div className="settings-overview-item">
            <span
              className={`settings-status-dot ${
                settings.maintenance_mode ? "is-warning" : "is-online"
              }`}
            />
            <div>
              <span className="settings-overview-label">Maintenance</span>
              <strong>
                {settings.maintenance_mode ? "En cours" : "Désactivée"}
              </strong>
            </div>
          </div>

          <div className="settings-overview-divider" />

          <div className="settings-overview-item">
            <span className="settings-overview-icon">▦</span>
            <div>
              <span className="settings-overview-label">Administration</span>
              <strong>Centre de contrôle</strong>
            </div>
          </div>
        </section>

        {/* CONTENU PRINCIPAL */}
        <div className="settings-layout">
          <aside className="settings-sidebar">
            <div className="settings-sidebar-heading">PARAMÈTRES SYSTÈME</div>

            <a className="settings-nav-item active" href="#settings-platform">
              <span>▦</span> Vue générale
            </a>

            <a className="settings-nav-item" href="#settings-platform">
              <span>◉</span> Plateforme
            </a>

            <a className="settings-nav-item" href="#settings-maintenance">
              <span>⚒</span> Maintenance
            </a>

            <div className="settings-sidebar-heading settings-sidebar-spaced">
              GESTION
            </div>

            <a className="settings-nav-item" href="#settings-users">
              <span>♙</span> Utilisateurs
            </a>

            <a className="settings-nav-item" href="#settings-matches">
              <span>♟</span> Parties et jeux
            </a>

            <a className="settings-nav-item" href="#settings-economy">
              <span>▤</span> Économie
            </a>

            <div className="settings-sidebar-footer">
              <span className="settings-footer-mark">6B</span>
              <div>
                <strong>6BetBall</strong>
                <span>Panneau d'administration</span>
              </div>
            </div>
          </aside>

          <div className="settings-content">
            {/* PLATEFORME */}
            <section
              className="settings-section"
              id="settings-platform"
            >
              <div className="settings-section-heading">
                <div className="settings-section-icon blue-icon">▦</div>
                <div>
                  <h2>Plateforme</h2>
                  <p>Contrôlez l'accès général aux services 6BetBall.</p>
                </div>
              </div>

              <div className="settings-panel">
                <div className="settings-panel-row">
                  <div className="settings-panel-copy">
                    <strong>État de la plateforme</strong>
                    <p>
                      {settings.platform_enabled
                        ? "La plateforme est configurée comme active."
                        : "La plateforme est configurée comme désactivée."}
                    </p>
                  </div>

                  <span
                    className={`settings-pill ${
                      settings.platform_enabled
                        ? "settings-pill-success"
                        : "settings-pill-danger"
                    }`}
                  >
                    {settings.platform_enabled ? "● Active" : "● Désactivée"}
                  </span>
                </div>

                <div className="settings-panel-actions">
                  <button
                    type="button"
                    className="settings-button settings-button-primary"
                    disabled={Boolean(busy) || settings.platform_enabled}
                    onClick={() => togglePlatform(true)}
                  >
                    {busy === "platform" ? "Traitement..." : "Activer la plateforme"}
                  </button>

                  <button
                    type="button"
                    className="settings-button settings-button-danger-outline"
                    disabled={Boolean(busy) || !settings.platform_enabled}
                    onClick={() => togglePlatform(false)}
                  >
                    Désactiver
                  </button>
                </div>
              </div>
            </section>

            {/* MAINTENANCE */}
            <section
              className="settings-section"
              id="settings-maintenance"
            >
              <div className="settings-section-heading">
                <div className="settings-section-icon amber-icon">⚒</div>
                <div>
                  <h2>Maintenance</h2>
                  <p>Préparez une intervention technique et informez vos utilisateurs.</p>
                </div>
              </div>

              <div className="settings-panel">
                <div className="settings-panel-row">
                  <div className="settings-panel-copy">
                    <strong>Mode maintenance</strong>
                    <p>
                      Activez ou désactivez le mode maintenance de la plateforme.
                    </p>
                  </div>

                  <span
                    className={`settings-pill ${
                      settings.maintenance_mode
                        ? "settings-pill-warning"
                        : "settings-pill-neutral"
                    }`}
                  >
                    {settings.maintenance_mode ? "● Activé" : "● Désactivé"}
                  </span>
                </div>

                <label
                  className="settings-field-label"
                  htmlFor="maintenance-message"
                >
                  Message affiché aux utilisateurs
                </label>

                <textarea
                  id="maintenance-message"
                  className="settings-textarea"
                  maxLength={1000}
                  value={settings.maintenance_message || ""}
                  placeholder="Ex. : Nous effectuons une maintenance. Merci de revenir dans quelques instants."
                  onChange={(e) =>
                    setSettings((previous) => ({
                      ...previous,
                      maintenance_message: e.target.value,
                    }))
                  }
                />

                <div className="settings-character-count">
                  {(settings.maintenance_message || "").length}/1000 caractères
                </div>

                <div className="settings-panel-actions">
                  <button
                    type="button"
                    className="settings-button settings-button-primary"
                    disabled={Boolean(busy)}
                    onClick={saveMaintenanceMessage}
                  >
                    {busy === "maintenance-message"
                      ? "Enregistrement..."
                      : "Enregistrer le message"}
                  </button>

                  <button
                    type="button"
                    className="settings-button settings-button-warning"
                    disabled={Boolean(busy) || settings.maintenance_mode}
                    onClick={() => toggleMaintenance(true)}
                  >
                    Activer
                  </button>

                  <button
                    type="button"
                    className="settings-button settings-button-secondary"
                    disabled={Boolean(busy) || !settings.maintenance_mode}
                    onClick={() => toggleMaintenance(false)}
                  >
                    Désactiver
                  </button>
                </div>
              </div>
            </section>

            {/* UTILISATEURS */}
            <section className="settings-section" id="settings-users">
              <div className="settings-section-heading">
                <div className="settings-section-icon purple-icon">♙</div>
                <div>
                  <h2>Utilisateurs</h2>
                  <p>Gérez les accès et les opérations administratives sur un compte.</p>
                </div>
              </div>

              <div className="settings-panel">
                <label className="settings-field-label" htmlFor="user-id">
                  Identifiant utilisateur
                </label>

                <input
                  id="user-id"
                  className="settings-input"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="Saisissez l'ID de l'utilisateur"
                />

                <div className="settings-help">
                  Vérifiez soigneusement l'identifiant avant toute opération.
                </div>

                <div className="settings-action-grid">
                  <button
                    type="button"
                    className="settings-action-tile"
                    disabled={Boolean(busy)}
                    onClick={resetPassword}
                  >
                    <span className="settings-action-icon blue-icon">⚿</span>
                    <strong>Réinitialiser le mot de passe</strong>
                    <small>Générer un nouveau mot de passe</small>
                  </button>

                  <button
                    type="button"
                    className="settings-action-tile"
                    disabled={Boolean(busy)}
                    onClick={() =>
                      changeUserStatus("suspend", "Utilisateur suspendu.")
                    }
                  >
                    <span className="settings-action-icon amber-icon">Ⅱ</span>
                    <strong>Suspendre le compte</strong>
                    <small>Restreindre temporairement l'accès</small>
                  </button>

                  <button
                    type="button"
                    className="settings-action-tile"
                    disabled={Boolean(busy)}
                    onClick={() =>
                      changeUserStatus("activate", "Utilisateur réactivé.")
                    }
                  >
                    <span className="settings-action-icon green-icon">✓</span>
                    <strong>Activer le compte</strong>
                    <small>Demander la réactivation du compte</small>
                  </button>

                  <button
                    type="button"
                    className="settings-action-tile settings-action-tile-danger"
                    disabled={Boolean(busy)}
                    onClick={() =>
                      changeUserStatus("delete", "Utilisateur supprimé.")
                    }
                  >
                    <span className="settings-action-icon red-icon">⌫</span>
                    <strong>Supprimer le compte</strong>
                    <small>Suppression potentiellement irréversible</small>
                  </button>
                </div>

                {newPassword && (
                  <div className="settings-password-result">
                    <div>
                      <strong>Nouveau mot de passe</strong>
                      <p>
                        Transmettez-le uniquement à la personne concernée,
                        par un canal sécurisé.
                      </p>
                    </div>

                    <code>{newPassword}</code>

                    <button
                      type="button"
                      className="settings-button settings-button-primary"
                      onClick={copyPassword}
                    >
                      Copier
                    </button>
                  </div>
                )}
              </div>
            </section>

            {/* PARTIES */}
            <section className="settings-section" id="settings-matches">
              <div className="settings-section-heading">
                <div className="settings-section-icon cyan-icon">♟</div>
                <div>
                  <h2>Parties et jeux</h2>
                  <p>Intervenez sur une partie précise ou nettoyez les parties.</p>
                </div>
              </div>

              <div className="settings-panel">
                <label className="settings-field-label" htmlFor="match-id">
                  Identifiant de la partie
                </label>

                <input
                  id="match-id"
                  className="settings-input"
                  value={matchId}
                  onChange={(e) => setMatchId(e.target.value)}
                  placeholder="Saisissez l'ID de la partie"
                />

                <div className="settings-panel-actions">
                  <button
                    type="button"
                    className="settings-button settings-button-danger-outline"
                    disabled={Boolean(busy)}
                    onClick={deleteMatch}
                  >
                    Supprimer cette partie
                  </button>
                </div>

                <div className="settings-danger-zone">
                  <div>
                    <strong>Nettoyage global des parties</strong>
                    <p>
                      Nettoie les parties de tous les jeux selon la logique
                      définie par le backend.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="settings-button settings-button-danger"
                    disabled={Boolean(busy)}
                    onClick={clearMatches}
                  >
                    Tout nettoyer
                  </button>
                </div>
              </div>
            </section>

            {/* ÉCONOMIE */}
            <section className="settings-section" id="settings-economy">
              <div className="settings-section-heading">
                <div className="settings-section-icon green-icon">▤</div>
                <div>
                  <h2>Économie et transactions</h2>
                  <p>Outils d'administration des soldes et de l'historique financier.</p>
                </div>
              </div>

              <div className="settings-panel">
                <div className="settings-warning-box">
                  <span>⚠</span>
                  <p>
                    <strong>Opérations sensibles.</strong> Ces actions peuvent
                    affecter les soldes ou supprimer des données financières.
                    Vérifiez les sauvegardes, les rapprochements et les
                    obligations de conservation avant de continuer.
                  </p>
                </div>

                <div className="settings-economy-grid">
                  <div className="settings-economy-card">
                    <div className="settings-economy-icon amber-icon">₿</div>
                    <h3>Soldes des wallets</h3>
                    <p>
                      Met à zéro le champ de solde disponible de tous les
                      utilisateurs, selon le backend actuel.
                    </p>

                    <button
                      type="button"
                      className="settings-button settings-button-warning"
                      disabled={Boolean(busy)}
                      onClick={resetWallets}
                    >
                      {busy === "reset-wallets"
                        ? "Traitement..."
                        : "Réinitialiser les wallets"}
                    </button>
                  </div>

                  <div className="settings-economy-card">
                    <div className="settings-economy-icon red-icon">▤</div>
                    <h3>Historique des transactions</h3>
                    <p>
                      Demande la suppression des transactions par la route
                      administrative existante.
                    </p>

                    <button
                      type="button"
                      className="settings-button settings-button-danger"
                      disabled={Boolean(busy)}
                      onClick={clearTransactions}
                    >
                      {busy === "clear-transactions"
                        ? "Traitement..."
                        : "Effacer les transactions"}
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <footer className="settings-footer">
              <span>6BetBall</span>
              <span>Centre de contrôle administratif</span>
              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  loadSettings();
                }}
                disabled={Boolean(busy)}
              >
                Actualiser les paramètres
              </button>
            </footer>
          </div>
        </div>
      </div>
    </main>
  );
}
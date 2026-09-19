import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import "./AdminDashboard.css";

// ============================================================
// API ADMIN
// ============================================================

import adminApi from "./api/adminApi";

// API générale utilisée notamment pour les utilisateurs
import api from "../services/api";

// ============================================================
// COMPOSANTS ADMIN
// ============================================================

import DashboardStats from "./DashboardStats";

import TransactionsList from "./TransactionsList";

import MatchesList from "./MatchesList";

import MessagesList from "./MessagesList";

import Ambassade from "./Ambassade";

import AIControlPanel from "./AIControlPanel";

import AdminUsers from "./AdminUsers/AdminUsers";

import PerceptorCM from "./PerceptorCM";

import AdsManager from "./AdsManager";

import AdsEditor from "./AdsEditor";

import GestionTournois from "./GestionTournois";

import Parametres from "./Parametres";

// ============================================================
// SERVICES AI
// ============================================================

import {
  getAISettings,
  getAIWallet,
  updateAISettings,
  creditBot,
  debitBot,
  transferToSystem,
} from "../services/aiService";

// ============================================================
// CONFIGURATION
// ============================================================

const REFRESH_INTERVAL = 5000;

// ============================================================
// STATS PAR DEFAUT
// ============================================================

const DEFAULT_STATS = {
  totalDeposits: 0,
  totalWithdrawals: 0,
  pendingTransactions: 0,

  totalUsers: 0,
  activeMatches: 0,
  unreadMessages: 0,

  activeAmbassadors: 0,
  activeTournaments: 0,
};

// ============================================================
// ICÔNES
// ============================================================

const Icons = {
  dashboard: "📊",
  ai: "🤖",
  ads: "📢",
  adsEditor: "📝",
  ambassade: "🤝",
  matches: "⚽",
  messages: "💬",
  settings: "⚙️",
  perceptor: "🎯",
  tournaments: "🏆",
  users: "👥",
  transactions: "💰",
};

// ============================================================
// HELPERS
// ============================================================

function extractArray(response) {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  if (Array.isArray(response?.users)) {
    return response.users;
  }

  if (Array.isArray(response?.matches)) {
    return response.matches;
  }

  if (Array.isArray(response?.transactions)) {
    return response.transactions;
  }

  if (Array.isArray(response?.data?.users)) {
    return response.data.users;
  }

  if (Array.isArray(response?.data?.matches)) {
    return response.data.matches;
  }

  if (Array.isArray(response?.data?.transactions)) {
    return response.data.transactions;
  }

  return [];
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

const AdminDashboard = () => {
  // ==========================================================
  // NAVIGATION
  // ==========================================================

  const [activeSection, setActiveSection] =
    useState("dashboard");

  const [sidebarOpen, setSidebarOpen] =
    useState(true);

  // ==========================================================
  // STATISTIQUES
  // ==========================================================

  const [stats, setStats] =
    useState(DEFAULT_STATS);

  const [statsLoading, setStatsLoading] =
    useState(true);

  const [statsError, setStatsError] =
    useState(null);

  // ==========================================================
  // DONNÉES DES MODULES
  // ==========================================================

  const [users, setUsers] =
    useState([]);

  const [transactions, setTransactions] =
    useState([]);

  const [matches, setMatches] =
    useState([]);

  const [ai, setAI] = useState({
    settings: null,
    user: null,
  });

  const [aiLoading, setAILoading] = useState(false);

  // ==========================================================
  // ETAT GENERAL
  // ==========================================================

  const [lastUpdate, setLastUpdate] =
    useState(null);

  const [isRefreshing, setIsRefreshing] =
    useState(false);

  const [dataLoading, setDataLoading] =
    useState(false);

  const [dataError, setDataError] =
    useState(null);

  // ==========================================================
  // MENU
  // ==========================================================

  const menuItems = useMemo(
    () => [
      {
        id: "dashboard",
        label: "Tableau de bord",
        icon: Icons.dashboard,
        description:
          "Vue générale de 6BetBall",
      },

      {
        id: "ai",
        label: "AI Panel",
        icon: Icons.ai,
        description:
          "Contrôle et gestion de l'IA",
      },

      {
        id: "ads",
        label: "Ads",
        icon: Icons.ads,
        description:
          "Gestion des publicités",
      },

      {
        id: "ads-editor",
        label: "Ads Editor",
        icon: Icons.adsEditor,
        description:
          "Création et modification des publicités",
      },

      {
        id: "ambassade",
        label: "Ambassade",
        icon: Icons.ambassade,
        description:
          "Gestion des ambassadeurs",
      },

      {
        id: "matches",
        label: "Matchs",
        icon: Icons.matches,
        description:
          "Supervision des matchs",
      },

      {
        id: "messages",
        label: "Messages",
        icon: Icons.messages,
        description:
          "Messages, signalements et réclamations",
      },

      {
        id: "settings",
        label: "Paramètres",
        icon: Icons.settings,
        description:
          "Configuration de la plateforme",
      },

      {
        id: "perceptor",
        label: "Perceptor",
        icon: Icons.perceptor,
        description:
          "Surveillance et historique Perceptor",
      },

      {
        id: "tournaments",
        label: "Tournois",
        icon: Icons.tournaments,
        description:
          "Gestion des tournois",
      },

      {
        id: "users",
        label: "Utilisateurs",
        icon: Icons.users,
        description:
          "Gestion complète des utilisateurs",
      },

      {
        id: "transactions",
        label: "Transactions",
        icon: Icons.transactions,
        description:
          "Dépôts, retraits et validations",
      },
    ],
    [],
  );

  // ==========================================================
  // CHARGER LES STATISTIQUES
  // ==========================================================

  const fetchDashboardStats =
    useCallback(async () => {
      try {
        setStatsError(null);

        const data =
          await adminApi.getStats();

        console.log(
          "📊 ADMIN STATS :",
          data,
        );

        setStats((previousStats) => ({
          ...previousStats,
          ...(data || {}),
        }));

        return data;
      } catch (error) {
        console.error(
          "❌ ADMIN DASHBOARD STATS :",
          error,
        );

        setStatsError(
          error?.response?.data?.message ||
            error?.response?.data?.error ||
            error?.message ||
            "Impossible de charger les statistiques.",
        );

        throw error;
      } finally {
        setStatsLoading(false);
      }
    }, []);

  // ==========================================================
  // CHARGER LES UTILISATEURS
  // ==========================================================

  const fetchUsers =
    useCallback(async () => {
      try {
        /*
         * adminApi ne possède actuellement pas
         * getUsers().
         *
         * On utilise donc l'API générale directement.
         */
        const response =
          await api.get("/admin/users");

        const list =
          extractArray(response?.data);

        console.log(
          "👥 ADMIN USERS :",
          list.length,
        );

        setUsers(list);

        return list;
      } catch (error) {
        console.error(
          "❌ ADMIN USERS :",
          error,
        );

        /*
         * On ne détruit pas la liste déjà chargée
         * si un refresh échoue.
         */
        return users;
      }
    }, [users]);

  // ==========================================================
  // CHARGER LES TRANSACTIONS
  // ==========================================================

  const fetchTransactions =
    useCallback(async () => {
      try {
        const response =
          await adminApi.getTransactions();

        const list =
          extractArray(response);

        console.log(
          "💰 ADMIN TRANSACTIONS :",
          list.length,
        );

        setTransactions(list);

        return list;
      } catch (error) {
        console.error(
          "❌ ADMIN TRANSACTIONS :",
          error,
        );

        return transactions;
      }
    }, [transactions]);

  // ==========================================================
  // CHARGER LES MATCHS
  // ==========================================================

  const fetchMatches =
    useCallback(async () => {
      try {
        const response =
          await adminApi.getMatches();

        const list =
          extractArray(response);

        console.log(
          "⚽ ADMIN MATCHES :",
          list.length,
        );

        setMatches(list);

        return list;
      } catch (error) {
        console.error(
          "❌ ADMIN MATCHES :",
          error,
        );

        return matches;
      }
    }, [matches]);

  // ==========================================================
  // CHARGEMENT GLOBAL ADMIN
  // ==========================================================

  const fetchAdminData =
    useCallback(async () => {
      try {
        setDataLoading(true);
        setDataError(null);

        /*
         * Les quatre sources sont chargées ensemble.
         *
         * stats       -> DashboardStats
         * users       -> AdminUsers
         * transactions -> TransactionsList
         * matches     -> MatchesList
         */

        await Promise.all([
          fetchDashboardStats(),
          fetchUsers(),
          fetchTransactions(),
          fetchMatches(),
        ]);

        setLastUpdate(
          new Date(),
        );
      } catch (error) {
        console.error(
          "❌ ADMIN GLOBAL DATA :",
          error,
        );

        setDataError(
          error?.message ||
            "Certaines données administrateur n'ont pas pu être chargées.",
        );
      } finally {
        setDataLoading(false);
        setStatsLoading(false);
      }
    }, [
      fetchDashboardStats,
      fetchUsers,
      fetchTransactions,
      fetchMatches,
    ]);

  // ==========================================================
  // INITIALISATION + REFRESH AUTOMATIQUE
  // ==========================================================

  useEffect(() => {
    fetchAdminData();

    const interval =
      setInterval(() => {
        fetchAdminData();
      }, REFRESH_INTERVAL);

    return () => {
      clearInterval(interval);
    };
  }, [fetchAdminData]);

  // ==========================================================
  // REFRESH MANUEL
  // ==========================================================

  const handleRefresh =
    async () => {
      if (isRefreshing) {
        return;
      }

      setIsRefreshing(true);

      try {
        await fetchAdminData();
      } finally {
        setIsRefreshing(false);
      }
    };

  // ==========================================================
  // REFRESH USERS
  // ==========================================================

  const refreshUsers =
    async () => {
      await fetchUsers();

      /*
       * Les statistiques peuvent également
       * changer après une opération utilisateur.
       */
      await fetchDashboardStats();

      setLastUpdate(
        new Date(),
      );
    };

  // ==========================================================
  // REFRESH MATCHES
  // ==========================================================

  const refreshMatches =
    async () => {
      await fetchMatches();

      await fetchDashboardStats();

      setLastUpdate(
        new Date(),
      );
    };

  // ==========================================================
  // REFRESH TRANSACTIONS
  // ==========================================================

  const refreshTransactions =
    async () => {
      await fetchTransactions();

      await fetchDashboardStats();

      setLastUpdate(
        new Date(),
      );
    };

  // ==========================================================
  // REFRESH AI
  // ==========================================================
  const refreshAI = useCallback(async () => {
    try {
      setAILoading(true);

      const [settingsResponse, walletResponse] = await Promise.all([
        getAISettings(),
        getAIWallet(),
      ]);

      console.log("🤖 ADMIN AI SETTINGS :", settingsResponse);
      console.log("💰 ADMIN AI WALLET :", walletResponse);

      const settings =
        settingsResponse?.data ??
        settingsResponse?.settings ??
        settingsResponse ??
        null;

      const wallet =
        walletResponse?.data ??
        walletResponse?.wallet ??
        walletResponse ??
        null;

      setAI({
        settings,
        user: wallet?.user ?? wallet,
      });

      return {
        settings,
        user: wallet?.user ?? wallet,
      };
    } catch (error) {
      console.error("❌ ADMIN AI :", error);
      throw error;
    } finally {
      setAILoading(false);
    }
  }, []);

  const saveSettings = useCallback(async (settings) => {
    try {
      setAILoading(true);

      const response = await updateAISettings(settings);

      console.log("🤖 ADMIN AI SETTINGS UPDATED :", response);

      await refreshAI();

      return response;
    } catch (error) {
      console.error("❌ ADMIN AI SETTINGS UPDATE :", error);
      throw error;
    } finally {
      setAILoading(false);
    }
  }, [refreshAI]);

  // ==========================================================
  // CHANGEMENT DE SECTION
  // ==========================================================

  const handleSectionChange =
    (sectionId) => {
      setActiveSection(sectionId);
    };

  // ==========================================================
  // NAVIGATION CLAVIER
  // ==========================================================

  const handleMenuKeyDown =
    (
      event,
      sectionId,
    ) => {
      if (
        event.key === "Enter" ||
        event.key === " "
      ) {
        event.preventDefault();

        handleSectionChange(
          sectionId,
        );

        return;
      }

      if (
        event.key === "ArrowDown" ||
        event.key === "ArrowRight"
      ) {
        event.preventDefault();

        const currentIndex =
          menuItems.findIndex(
            (item) =>
              item.id ===
              sectionId,
          );

        const nextIndex =
          (currentIndex + 1) %
          menuItems.length;

        const nextItem =
          menuItems[nextIndex];

        if (nextItem) {
          handleSectionChange(
            nextItem.id,
          );

          setTimeout(() => {
            document
              .querySelector(
                `[data-admin-menu-id="${nextItem.id}"]`,
              )
              ?.focus();
          }, 0);
        }

        return;
      }

      if (
        event.key === "ArrowUp" ||
        event.key === "ArrowLeft"
      ) {
        event.preventDefault();

        const currentIndex =
          menuItems.findIndex(
            (item) =>
              item.id ===
              sectionId,
          );

        const previousIndex =
          (currentIndex -
            1 +
            menuItems.length) %
          menuItems.length;

        const previousItem =
          menuItems[
            previousIndex
          ];

        if (previousItem) {
          handleSectionChange(
            previousItem.id,
          );

          setTimeout(() => {
            document
              .querySelector(
                `[data-admin-menu-id="${previousItem.id}"]`,
              )
              ?.focus();
          }, 0);
        }
      }
    };

  // ==========================================================
  // FORMAT MONTANT
  // ==========================================================

  const formatAmount =
    (amount) => {
      const numericAmount =
        Number(amount) || 0;

      return new Intl.NumberFormat(
        "fr-FR",
        {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        },
      ).format(
        numericAmount,
      );
    };

  // ==========================================================
  // ACCUEIL DASHBOARD
  // ==========================================================

  const renderDashboardHome =
    () => {
      return (
        <section className="admin-dashboard-home">

          {/* ================================================= */}
          {/* HEADER */}
          {/* ================================================= */}

          <div className="admin-page-header">

            <div>
              <span className="admin-page-eyebrow">
                ADMINISTRATION 6BETBALL
              </span>

              <h1>
                Tableau de bord
              </h1>

              <p>
                Supervision générale de la
                plateforme.
              </p>
            </div>

            <div className="admin-page-actions">

              <span
                className={`admin-live-status ${
                  dataError
                    ? "is-error"
                    : "is-live"
                }`}
              >
                <span className="admin-live-dot" />

                {dataError
                  ? "Synchronisation limitée"
                  : "Système connecté"}
              </span>

              <button
                type="button"
                className="admin-refresh-button"
                onClick={
                  handleRefresh
                }
                disabled={
                  isRefreshing
                }
              >
                {isRefreshing
                  ? "⟳ Actualisation..."
                  : "↻ Actualiser"}
              </button>

            </div>
          </div>

          {/* ================================================= */}
          {/* ERREUR */}
          {/* ================================================= */}

          {dataError && (
            <div className="admin-dashboard-alert">
              ⚠️ {dataError}
            </div>
          )}

          {/* ================================================= */}
          {/* STATISTIQUES PRINCIPALES */}
          {/* ================================================= */}

          <DashboardStats
            stats={stats}
            loading={statsLoading}
          />

          {/* ================================================= */}
          {/* STATISTIQUES SECONDAIRES */}
          {/* ================================================= */}

          <div className="admin-secondary-stats">

            <article className="admin-mini-stat">
              <span className="admin-mini-stat-icon">
                👥
              </span>

              <div>
                <span>
                  Utilisateurs
                </span>

                <strong>
                  {statsLoading
                    ? "..."
                    : stats.totalUsers ??
                      users.length}
                </strong>
              </div>
            </article>

            <article className="admin-mini-stat">
              <span className="admin-mini-stat-icon">
                ⚽
              </span>

              <div>
                <span>
                  Matchs actifs
                </span>

                <strong>
                  {statsLoading
                    ? "..."
                    : stats.activeMatches ??
                      matches.length}
                </strong>
              </div>
            </article>

            <article className="admin-mini-stat">
              <span className="admin-mini-stat-icon">
                💬
              </span>

              <div>
                <span>
                  Messages non lus
                </span>

                <strong>
                  {statsLoading
                    ? "..."
                    : stats.unreadMessages ??
                      0}
                </strong>
              </div>
            </article>

            <article className="admin-mini-stat">
              <span className="admin-mini-stat-icon">
                🤝
              </span>

              <div>
                <span>
                  Ambassadeurs actifs
                </span>

                <strong>
                  {statsLoading
                    ? "..."
                    : stats.activeAmbassadors ??
                      0}
                </strong>
              </div>
            </article>

            <article className="admin-mini-stat">
              <span className="admin-mini-stat-icon">
                🏆
              </span>

              <div>
                <span>
                  Tournois actifs
                </span>

                <strong>
                  {statsLoading
                    ? "..."
                    : stats.activeTournaments ??
                      0}
                </strong>
              </div>
            </article>

          </div>

          {/* ================================================= */}
          {/* ETAT DES DONNEES */}
          {/* ================================================= */}

          <section className="admin-data-overview">

            <div className="admin-section-heading">

              <div>
                <span className="admin-section-eyebrow">
                  Données opérationnelles
                </span>

                <h2>
                  État des modules
                </h2>
              </div>

            </div>

            <div className="admin-data-overview-grid">

              <button
                type="button"
                className="admin-data-card"
                onClick={() =>
                  handleSectionChange(
                    "users",
                  )
                }
              >
                <span className="admin-data-card-icon">
                  👥
                </span>

                <div>
                  <strong>
                    {users.length}
                  </strong>

                  <span>
                    utilisateurs chargés
                  </span>
                </div>
              </button>

              <button
                type="button"
                className="admin-data-card"
                onClick={() =>
                  handleSectionChange(
                    "matches",
                  )
                }
              >
                <span className="admin-data-card-icon">
                  ⚽
                </span>

                <div>
                  <strong>
                    {matches.length}
                  </strong>

                  <span>
                    matchs chargés
                  </span>
                </div>
              </button>

              <button
                type="button"
                className="admin-data-card"
                onClick={() =>
                  handleSectionChange(
                    "transactions",
                  )
                }
              >
                <span className="admin-data-card-icon">
                  💰
                </span>

                <div>
                  <strong>
                    {transactions.length}
                  </strong>

                  <span>
                    transactions chargées
                  </span>
                </div>
              </button>

            </div>

          </section>

          {/* ================================================= */}
          {/* ACCÈS RAPIDES */}
          {/* ================================================= */}

          <section className="admin-quick-access">

            <div className="admin-section-heading">

              <div>
                <span className="admin-section-eyebrow">
                  Gestion rapide
                </span>

                <h2>
                  Accès aux modules
                </h2>
              </div>

              <span className="admin-section-count">
                {menuItems.length - 1} modules
              </span>

            </div>

            <div className="admin-quick-grid">

              {menuItems
                .filter(
                  (item) =>
                    item.id !==
                    "dashboard",
                )
                .map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="admin-quick-card"
                    onClick={() =>
                      handleSectionChange(
                        item.id,
                      )
                    }
                  >
                    <span className="admin-quick-icon">
                      {item.icon}
                    </span>

                    <span className="admin-quick-content">
                      <strong>
                        {item.label}
                      </strong>

                      <small>
                        {item.description}
                      </small>
                    </span>

                    <span className="admin-quick-arrow">
                      →
                    </span>
                  </button>
                ))}

            </div>

          </section>

          {/* ================================================= */}
          {/* FOOTER */}
          {/* ================================================= */}

          <footer className="admin-dashboard-footer">

            <span>
              État du système :{" "}
              <strong>
                {dataError
                  ? "Attention"
                  : "Opérationnel"}
              </strong>
            </span>

            <span>
              Dernière synchronisation :{" "}
              <strong>
                {lastUpdate
                  ? lastUpdate.toLocaleTimeString(
                      "fr-FR",
                    )
                  : "En attente..."}
              </strong>
            </span>

            <span>
              Actualisation automatique :{" "}
              <strong>
                5 secondes
              </strong>
            </span>

          </footer>

        </section>
      );
    };

  // ==========================================================
  // RENDU DU MODULE ACTIF
  // ==========================================================

  const renderActiveSection =
    () => {
      switch (
        activeSection
      ) {

        // ====================================================
        // DASHBOARD
        // ====================================================

        case "dashboard":
          return renderDashboardHome();

        // ====================================================
        // AI
        // ====================================================

        case "ai":
          return (
            <section className="admin-module">
              <AIControlPanel
                ai={ai}
                saveSettings={saveSettings}
                creditBot={creditBot}
                transferToSystem={transferToSystem}
                refreshAI={refreshAI}
                money={formatAmount}
                actionLoading={aiLoading}
              />
            </section>
          );

          
        // ====================================================
        // ADS
        // ====================================================

        case "ads":
          return (
            <section className="admin-module">
              <AdsManager />
            </section>
          );

        // ====================================================
        // ADS EDITOR
        // ====================================================

        case "ads-editor":
          return (
            <section className="admin-module">
              <AdsEditor />
            </section>
          );

        // ====================================================
        // AMBASSADE
        // ====================================================

        case "ambassade":
          return (
            <section className="admin-module">
              <Ambassade />
            </section>
          );

        // ====================================================
        // MATCHS
        // ====================================================

        case "matches":
          return (
            <section className="admin-module">

              <div className="admin-module-header">

                <div>
                  <span className="admin-page-eyebrow">
                    SUPERVISION
                  </span>

                  <h1>
                    Matchs
                  </h1>

                  <p>
                    {matches.length} match
                    {matches.length > 1
                      ? "s"
                      : ""}{" "}
                    chargé
                    {matches.length > 1
                      ? "s"
                      : ""}.
                  </p>
                </div>

                <button
                  type="button"
                  className="admin-refresh-button"
                  onClick={
                    refreshMatches
                  }
                >
                  ↻ Actualiser
                </button>

              </div>

              <MatchesList
                matches={matches}
                onRefresh={
                  refreshMatches
                }
              />

            </section>
          );

        // ====================================================
        // MESSAGES
        // ====================================================

        case "messages":
          return (
            <section className="admin-module">

              <div className="admin-module-header">

                <div>
                  <span className="admin-page-eyebrow">
                    COMMUNICATION
                  </span>

                  <h1>
                    Messages
                  </h1>

                  <p>
                    Messages, signalements
                    et réclamations.
                  </p>
                </div>

              </div>

              {/*
               * IMPORTANT :
               *
               * MessagesList ne reçoit PAS
               * messages en props.
               *
               * Le composant possède déjà
               * son propre loadData() et son
               * intervalle de 15 secondes.
               *
               * On le monte donc simplement.
               */}

              <MessagesList />

            </section>
          );

        // ====================================================
        // PARAMETRES
        // ====================================================

        case "settings":
          return (
            <section className="admin-module">
              <Parametres />
            </section>
          );

        // ====================================================
        // PERCEPTOR
        // ====================================================

        case "perceptor":
          return (
            <section className="admin-module">
              <PerceptorCM />
            </section>
          );

        // ====================================================
        // TOURNOIS
        // ====================================================

        case "tournaments":
          return (
            <section className="admin-module">
              <GestionTournois />
            </section>
          );

        // ====================================================
        // UTILISATEURS
        // ====================================================

        case "users":
          return (
            <section className="admin-module">

              <div className="admin-module-header">

                <div>
                  <span className="admin-page-eyebrow">
                    UTILISATEURS
                  </span>

                  <h1>
                    Utilisateurs
                  </h1>

                  <p>
                    {users.length} utilisateur
                    {users.length > 1
                      ? "s"
                      : ""}{" "}
                    chargé
                    {users.length > 1
                      ? "s"
                      : ""}.
                  </p>
                </div>

                <button
                  type="button"
                  className="admin-refresh-button"
                  onClick={
                    refreshUsers
                  }
                >
                  ↻ Actualiser
                </button>

              </div>

              <AdminUsers
                users={users}
                refresh={
                  refreshUsers
                }
              />

            </section>
          );

        // ====================================================
        // TRANSACTIONS
        // ====================================================

        case "transactions":
          return (
            <section className="admin-module">
              <TransactionsList
                transactions={transactions}
                money={formatAmount}
                refresh={refreshTransactions}
              />
            </section>
          );
    
        // ====================================================
        // FALLBACK
        // ====================================================

        default:
          return renderDashboardHome();
      }
    };

  // ==========================================================
  // MODULE ACTIF
  // ==========================================================

  const activeMenuItem =
    menuItems.find(
      (item) =>
        item.id ===
        activeSection,
    ) ||
    menuItems[0];

  // ==========================================================
  // RENDU GLOBAL
  // ==========================================================

  return (
    <div
      className={`admin-dashboard ${
        sidebarOpen
          ? "sidebar-open"
          : "sidebar-collapsed"
      }`}
    >

      {/* ==================================================== */}
      {/* SIDEBAR */}
      {/* ==================================================== */}

      <aside
        className="admin-sidebar"
        aria-label="Navigation administration"
      >

        {/* -------------------------------------------------- */}
        {/* LOGO */}
        {/* -------------------------------------------------- */}

        <div className="admin-sidebar-header">

          <div className="admin-logo">

            <span className="admin-logo-mark">
              6B
            </span>

            {sidebarOpen && (
              <div className="admin-logo-text">
                <strong>
                  6BetBall
                </strong>

                <span>
                  ADMIN
                </span>
              </div>
            )}

          </div>

          <button
            type="button"
            className="admin-sidebar-toggle"
            onClick={() =>
              setSidebarOpen(
                (value) =>
                  !value,
              )
            }
            aria-label={
              sidebarOpen
                ? "Réduire le menu"
                : "Ouvrir le menu"
            }
          >
            {sidebarOpen
              ? "‹"
              : "›"}
          </button>

        </div>

        {/* -------------------------------------------------- */}
        {/* MENU */}
        {/* -------------------------------------------------- */}

        <nav className="admin-sidebar-nav">

          {menuItems.map(
            (item) => {
              const isActive =
                activeSection ===
                item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  data-admin-menu-id={
                    item.id
                  }
                  className={`admin-menu-item ${
                    isActive
                      ? "active"
                      : ""
                  }`}
                  onClick={() =>
                    handleSectionChange(
                      item.id,
                    )
                  }
                  onKeyDown={(event) =>
                    handleMenuKeyDown(
                      event,
                      item.id,
                    )
                  }
                  title={
                    !sidebarOpen
                      ? item.label
                      : undefined
                  }
                >

                  <span className="admin-menu-icon">
                    {item.icon}
                  </span>

                  {sidebarOpen && (
                    <span className="admin-menu-label">
                      {item.label}
                    </span>
                  )}

                  {sidebarOpen &&
                    item.id ===
                      "transactions" &&
                    stats.pendingTransactions >
                      0 && (
                      <span className="admin-menu-badge">
                        {
                          stats.pendingTransactions
                        }
                      </span>
                    )}

                  {sidebarOpen &&
                    item.id ===
                      "messages" &&
                    stats.unreadMessages >
                      0 && (
                      <span className="admin-menu-badge">
                        {
                          stats.unreadMessages
                        }
                      </span>
                    )}

                </button>
              );
            },
          )}

        </nav>

        {/* -------------------------------------------------- */}
        {/* FOOTER SIDEBAR */}
        {/* -------------------------------------------------- */}

        <div className="admin-sidebar-footer">

          <div className="admin-system-status">

            <span className="admin-system-dot" />

            {sidebarOpen && (
              <span>
                Système opérationnel
              </span>
            )}

          </div>

        </div>

      </aside>

      {/* ==================================================== */}
      {/* ZONE PRINCIPALE */}
      {/* ==================================================== */}

      <main className="admin-main">

        {/* ================================================== */}
        {/* TOPBAR */}
        {/* ================================================== */}

        <header className="admin-topbar">

          <div className="admin-topbar-left">

            <div className="admin-breadcrumb">

              <span>
                Administration
              </span>

              <span>
                /
              </span>

              <strong>
                {activeMenuItem.label}
              </strong>

            </div>

          </div>

          <div className="admin-topbar-right">

            <span className="admin-topbar-live">
              <span className="admin-live-dot" />
              LIVE
            </span>

            <button
              type="button"
              className="admin-topbar-refresh"
              onClick={
                handleRefresh
              }
              disabled={
                isRefreshing
              }
            >
              {isRefreshing
                ? "⟳"
                : "↻"}
            </button>

            <div className="admin-profile">

              <span className="admin-profile-avatar">
                A
              </span>

              <div>
                <strong>
                  Administrateur
                </strong>

                <span>
                  6BetBall
                </span>
              </div>

            </div>

          </div>

        </header>

        {/* ================================================== */}
        {/* CONTENU */}
        {/* ================================================== */}

        <div className="admin-content">

          {renderActiveSection()}

        </div>

      </main>

    </div>
  );
};

export default AdminDashboard;
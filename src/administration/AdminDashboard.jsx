import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import "./AdminDashboard.css";

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
// API ADMIN
// ============================================================

import adminApi from "./api/adminApi";

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
// STATISTIQUES PAR DÉFAUT
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
// ADMIN DASHBOARD
// ============================================================

const AdminDashboard = () => {
  // ==========================================================
  // ÉTAT DU MENU
  // ==========================================================

  const [activeSection, setActiveSection] = useState("dashboard");

  // ==========================================================
  // ÉTAT DES STATISTIQUES
  // ==========================================================

  const [stats, setStats] = useState(DEFAULT_STATS);

  const [statsLoading, setStatsLoading] = useState(true);

  const [statsError, setStatsError] = useState(null);

  const [lastUpdate, setLastUpdate] = useState(null);

  const [transactions, setTransactions] = useState([]);
  const [matches, setMatches] = useState([]);
  const [messages, setMessages] = useState([]);
  adminApi.getMessages()
  const [users, setUsers] = useState([]);

  // ==========================================================
  // ÉTAT DE L'INTERFACE
  // ==========================================================

  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [isRefreshing, setIsRefreshing] = useState(false);

  // ==========================================================
  // MENU ADMIN
  // ==========================================================

  const menuItems = useMemo(
    () => [
      {
        id: "dashboard",
        label: "Tableau de bord",
        icon: Icons.dashboard,
        description: "Vue générale de 6BetBall",
      },

      {
        id: "ai",
        label: "AI Panel",
        icon: Icons.ai,
        description: "Contrôle et gestion de l'IA",
      },

      {
        id: "ads",
        label: "Ads",
        icon: Icons.ads,
        description: "Gestion des publicités",
      },

      {
        id: "ads-editor",
        label: "Ads Editor",
        icon: Icons.adsEditor,
        description: "Création et modification des publicités",
      },

      {
        id: "ambassade",
        label: "Ambassade",
        icon: Icons.ambassade,
        description: "Gestion des ambassadeurs",
      },

      {
        id: "matches",
        label: "Match",
        icon: Icons.matches,
        description: "Gestion des matchs",
      },

      {
        id: "messages",
        label: "Messages",
        icon: Icons.messages,
        description: "Messages et communications",
      },

      {
        id: "settings",
        label: "Paramètre",
        icon: Icons.settings,
        description: "Configuration de 6BetBall",
      },

      {
        id: "perceptor",
        label: "Perceptor",
        icon: Icons.perceptor,
        description: "Contrôle Perceptor",
      },

      {
        id: "tournaments",
        label: "Tournois",
        icon: Icons.tournaments,
        description: "Gestion des tournois",
      },

      {
        id: "users",
        label: "Utilisateurs",
        icon: Icons.users,
        description: "Gestion des utilisateurs",
      },

      {
        id: "transactions",
        label: "Transactions",
        icon: Icons.transactions,
        description: "Dépôts, retraits et transactions",
      },
    ],
    [],
  );

  // ==========================================================
  // RÉCUPÉRATION DES STATISTIQUES
  // ==========================================================

  const fetchDashboardStats = useCallback(async () => {
    try {
      setStatsError(null);

      const data = await adminApi.getStats();

      console.log("📊 ADMIN STATS :", data);

      /*
       * Le DashboardStats attend idéalement :
       *
       * {
       *   totalDeposits: 0,
       *   totalWithdrawals: 0,
       *   pendingTransactions: 0,
       *   totalUsers: 0,
       *   activeMatches: 0,
       *   unreadMessages: 0,
       *   activeAmbassadors: 0,
       *   activeTournaments: 0
       * }
       */

      setStats((previousStats) => ({
        ...previousStats,
        ...data,
      }));

      setLastUpdate(new Date());
    } catch (error) {
      console.error(
        "❌ ADMIN DASHBOARD STATS :",
        error,
      );

      setStatsError(
        error?.response?.data?.message ||
          error?.message ||
          "Impossible de charger les statistiques.",
      );
    } finally {
      setStatsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const fetchAdminData = useCallback(async () => {
  const [
    transactionsData,
    matchesData,
    messagesData,
    usersData,
  ] = await Promise.all([
    adminApi.getTransactions(),
    adminApi.getMatches(),
    adminApi.getMessages(),
    adminApi.getUsers(),
  ]);

  setTransactions(transactionsData);
  setMatches(matchesData);
  setMessages(messagesData);
  setUsers(usersData);
}, []);

  // ==========================================================
  // ACTUALISATION AUTOMATIQUE
  // ==========================================================

  useEffect(() => {
    fetchDashboardStats();
    fetchAdminData();

    const interval = setInterval(() => {
      fetchDashboardStats();
      fetchAdminData();
    }, REFRESH_INTERVAL);

    return () => {
      clearInterval(interval);
    };
  }, [fetchDashboardStats, fetchAdminData]);
  // ==========================================================
  // ACTUALISATION MANUELLE
  // ==========================================================

  const handleRefresh = async () => {
    if (isRefreshing) {
      return;
    }

    setIsRefreshing(true);

    await fetchDashboardStats();
  };

  // ==========================================================
  // CHANGEMENT DE SECTION
  // ==========================================================

  const handleSectionChange = (sectionId) => {
    setActiveSection(sectionId);
  };

  // ==========================================================
  // NAVIGATION CLAVIER
  // ==========================================================

  const handleMenuKeyDown = (event, sectionId) => {
    // --------------------------------------------------------
    // ENTRÉE / ESPACE
    // --------------------------------------------------------

    if (
      event.key === "Enter" ||
      event.key === " "
    ) {
      event.preventDefault();

      handleSectionChange(sectionId);

      return;
    }

    // --------------------------------------------------------
    // FLÈCHE BAS / DROITE
    // --------------------------------------------------------

    if (
      event.key === "ArrowDown" ||
      event.key === "ArrowRight"
    ) {
      event.preventDefault();

      const currentIndex = menuItems.findIndex(
        (item) => item.id === sectionId,
      );

      const nextIndex =
        (currentIndex + 1) % menuItems.length;

      const nextItem = menuItems[nextIndex];

      if (!nextItem) {
        return;
      }

      handleSectionChange(nextItem.id);

      setTimeout(() => {
        const element = document.querySelector(
          `[data-admin-menu-id="${nextItem.id}"]`,
        );

        element?.focus();
      }, 0);

      return;
    }

    // --------------------------------------------------------
    // FLÈCHE HAUT / GAUCHE
    // --------------------------------------------------------

    if (
      event.key === "ArrowUp" ||
      event.key === "ArrowLeft"
    ) {
      event.preventDefault();

      const currentIndex = menuItems.findIndex(
        (item) => item.id === sectionId,
      );

      const previousIndex =
        (currentIndex - 1 + menuItems.length) %
        menuItems.length;

      const previousItem =
        menuItems[previousIndex];

      if (!previousItem) {
        return;
      }

      handleSectionChange(previousItem.id);

      setTimeout(() => {
        const element = document.querySelector(
          `[data-admin-menu-id="${previousItem.id}"]`,
        );

        element?.focus();
      }, 0);
    }
  };

  // ==========================================================
  // ACCUEIL ADMIN
  // ==========================================================

  const renderDashboardHome = () => {
    return (
      <section
        className="admin-dashboard-home"
        aria-labelledby="admin-dashboard-title"
      >
        {/* ================================================== */}
        {/* EN-TÊTE */}
        {/* ================================================== */}

        <div className="admin-page-header">
          <div>
            <span className="admin-page-eyebrow">
              Administration 6BetBall
            </span>

            <h1 id="admin-dashboard-title">
              Tableau de bord
            </h1>

            <p>
              Vue globale des activités et opérations
              de la plateforme.
            </p>
          </div>

          <div className="admin-header-actions">
            <div
              className={`admin-live-indicator ${
                statsError
                  ? "offline"
                  : "online"
              }`}
              aria-live="polite"
            >
              <span className="admin-live-dot" />

              {statsError
                ? "Connexion à vérifier"
                : "Données actualisées"}
            </div>

            <button
              type="button"
              className="admin-refresh-button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              title="Actualiser les statistiques"
            >
              {isRefreshing
                ? "⟳ Actualisation..."
                : "↻ Actualiser"}
            </button>
          </div>
        </div>

        {/* ================================================== */}
        {/* ERREUR */}
        {/* ================================================== */}

        {statsError && (
          <div
            className="admin-dashboard-alert"
            role="alert"
          >
            <strong>
              Attention :
            </strong>{" "}
            Les statistiques n'ont pas pu être
            actualisées.

            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              Réessayer
            </button>
          </div>
        )}

        {/* ================================================== */}
        {/* STATISTIQUES PRINCIPALES */}
        {/* ================================================== */}

        <DashboardStats
          stats={stats}
          loading={statsLoading}
        />

        <TransactionsList
          transactions={transactions}
          refresh={fetchAdminData}
        />

        <MatchesList
          matches={matches}
          onRefresh={fetchAdminData}
        />

        <MessagesList />

        <AdminUsers
          users={users}
          refresh={fetchAdminData}
        />

        {/* ================================================== */}
        {/* STATISTIQUES SECONDAIRES */}
        {/* ================================================== */}

        <section
          className="admin-secondary-stats"
          aria-label="Statistiques secondaires"
        >
          {/* ------------------------------------------------ */}
          {/* UTILISATEURS */}
          {/* ------------------------------------------------ */}

          <article className="admin-mini-stat">
            <span
              className="admin-mini-stat-icon"
              aria-hidden="true"
            >
              👥
            </span>

            <div>
              <span>
                Utilisateurs
              </span>

              <strong>
                {statsLoading
                  ? "..."
                  : stats.totalUsers}
              </strong>
            </div>
          </article>

          {/* ------------------------------------------------ */}
          {/* MATCHS */}
          {/* ------------------------------------------------ */}

          <article className="admin-mini-stat">
            <span
              className="admin-mini-stat-icon"
              aria-hidden="true"
            >
              ⚽
            </span>

            <div>
              <span>
                Matchs actifs
              </span>

              <strong>
                {statsLoading
                  ? "..."
                  : stats.activeMatches}
              </strong>
            </div>
          </article>

          {/* ------------------------------------------------ */}
          {/* MESSAGES */}
          {/* ------------------------------------------------ */}

          <article className="admin-mini-stat">
            <span
              className="admin-mini-stat-icon"
              aria-hidden="true"
            >
              💬
            </span>

            <div>
              <span>
                Messages non lus
              </span>

              <strong>
                {statsLoading
                  ? "..."
                  : stats.unreadMessages}
              </strong>
            </div>
          </article>

          {/* ------------------------------------------------ */}
          {/* AMBASSADEURS */}
          {/* ------------------------------------------------ */}

          <article className="admin-mini-stat">
            <span
              className="admin-mini-stat-icon"
              aria-hidden="true"
            >
              🤝
            </span>

            <div>
              <span>
                Ambassadeurs actifs
              </span>

              <strong>
                {statsLoading
                  ? "..."
                  : stats.activeAmbassadors}
              </strong>
            </div>
          </article>

          {/* ------------------------------------------------ */}
          {/* TOURNOIS */}
          {/* ------------------------------------------------ */}

          <article className="admin-mini-stat">
            <span
              className="admin-mini-stat-icon"
              aria-hidden="true"
            >
              🏆
            </span>

            <div>
              <span>
                Tournois actifs
              </span>

              <strong>
                {statsLoading
                  ? "..."
                  : stats.activeTournaments}
              </strong>
            </div>
          </article>
        </section>

        {/* ================================================== */}
        {/* ACCÈS RAPIDE */}
        {/* ================================================== */}

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
                  item.id !== "dashboard",
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
                  <span
                    className="admin-quick-icon"
                    aria-hidden="true"
                  >
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

                  <span
                    className="admin-quick-arrow"
                    aria-hidden="true"
                  >
                    →
                  </span>
                </button>
              ))}
          </div>
        </section>

        {/* ================================================== */}
        {/* PIED DE PAGE */}
        {/* ================================================== */}

        <footer className="admin-dashboard-footer">
          <span>
            État du système :{" "}
            <strong>
              {statsError
                ? "À vérifier"
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
  // MODULE ACTIF
  // ==========================================================

  const renderActiveSection = () => {
    switch (activeSection) {
      // ======================================================
      // TABLEAU DE BORD
      // ======================================================

      case "dashboard":
        return renderDashboardHome();

      // ======================================================
      // AI PANEL
      // ======================================================

      case "ai":
        return (
          <section
            className="admin-module"
            aria-label="AI Panel"
          >
            <AIControlPanel
              getAISettings={getAISettings}
              getAIWallet={getAIWallet}
              updateAISettings={
                updateAISettings
              }
              creditBot={creditBot}
              debitBot={debitBot}
              transferToSystem={
                transferToSystem
              }
            />
          </section>
        );

      // ======================================================
      // ADS
      // ======================================================

      case "ads":
        return (
          <section
            className="admin-module"
            aria-label="Publicités"
          >
            <AdsManager />
          </section>
        );

      // ======================================================
      // ADS EDITOR
      // ======================================================

      case "ads-editor":
        return (
          <section
            className="admin-module"
            aria-label="Éditeur publicitaire"
          >
            <AdsEditor />
          </section>
        );

      // ======================================================
      // AMBASSADE
      // ======================================================

      case "ambassade":
        return (
          <section
            className="admin-module"
            aria-label="Ambassade"
          >
            <Ambassade />
          </section>
        );

      // ======================================================
      // MATCHS
      // ======================================================

      case "matches":
        return (
          <section
            className="admin-module"
            aria-label="Matchs"
          >
            <MatchesList />
          </section>
        );

      // ======================================================
      // MESSAGES
      // ======================================================

      case "messages":
        return (
          <section
            className="admin-module"
            aria-label="Messages"
          >
            <MessagesList />
          </section>
        );

      // ======================================================
      // PARAMÈTRES
      // ======================================================

      case "settings":
        return (
          <section
            className="admin-module"
            aria-label="Paramètres"
          >
            <Parametres />
          </section>
        );

      // ======================================================
      // PERCEPTOR
      // ======================================================

      case "perceptor":
        return (
          <section
            className="admin-module"
            aria-label="Perceptor"
          >
            <PerceptorCM />
          </section>
        );

      // ======================================================
      // TOURNOIS
      // ======================================================

      case "tournaments":
        return (
          <section
            className="admin-module"
            aria-label="Tournois"
          >
            <GestionTournois />
          </section>
        );

      // ======================================================
      // UTILISATEURS
      // ======================================================

      case "users":
        return (
          <section
            className="admin-module"
            aria-label="Utilisateurs"
          >
            <AdminUsers />
          </section>
        );

      // ======================================================
      // TRANSACTIONS
      // ======================================================

      case "transactions":
        return (
          <section
            className="admin-module"
            aria-label="Transactions"
          >
            <TransactionsList />
          </section>
        );

      // ======================================================
      // SÉCURITÉ / FALLBACK
      // ======================================================

      default:
        return renderDashboardHome();
    }
  };

  // ==========================================================
  // MODULE ACTUEL
  // ==========================================================

  const activeMenuItem =
    menuItems.find(
      (item) =>
        item.id === activeSection,
    ) || menuItems[0];

  // ==========================================================
  // RENDU
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
            <span
              className="admin-logo-mark"
              aria-hidden="true"
            >
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
                (value) => !value,
              )
            }
            aria-label={
              sidebarOpen
                ? "Réduire le menu"
                : "Ouvrir le menu"
            }
            title={
              sidebarOpen
                ? "Réduire le menu"
                : "Ouvrir le menu"
            }
          >
            {sidebarOpen ? "‹" : "›"}
          </button>
        </div>

        {/* -------------------------------------------------- */}
        {/* NAVIGATION */}
        {/* -------------------------------------------------- */}

        <nav className="admin-navigation">
          <div className="admin-navigation-label">
            {sidebarOpen
              ? "ADMINISTRATION"
              : "☰"}
          </div>

          <ul className="admin-menu">
            {menuItems.map((item) => {
              const isActive =
                activeSection ===
                item.id;

              return (
                <li
                  key={item.id}
                  className="admin-menu-item"
                >
                  <button
                    type="button"
                    className={`admin-menu-button ${
                      isActive
                        ? "active"
                        : ""
                    }`}
                    data-admin-menu-id={
                      item.id
                    }
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
                      sidebarOpen
                        ? item.description
                        : item.label
                    }
                    aria-current={
                      isActive
                        ? "page"
                        : undefined
                    }
                  >
                    <span
                      className="admin-menu-icon"
                      aria-hidden="true"
                    >
                      {item.icon}
                    </span>

                    {sidebarOpen && (
                      <>
                        <span className="admin-menu-label">
                          {item.label}
                        </span>

                        {/* -------------------------------- */}
                        {/* BADGE TRANSACTIONS */}
                        {/* -------------------------------- */}

                        {item.id ===
                          "transactions" &&
                          stats.pendingTransactions >
                            0 && (
                            <span className="admin-menu-badge">
                              {
                                stats.pendingTransactions
                              }
                            </span>
                          )}

                        {/* -------------------------------- */}
                        {/* BADGE MESSAGES */}
                        {/* -------------------------------- */}

                        {item.id ===
                          "messages" &&
                          stats.unreadMessages >
                            0 && (
                            <span className="admin-menu-badge">
                              {
                                stats.unreadMessages
                              }
                            </span>
                          )}
                      </>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* -------------------------------------------------- */}
        {/* FOOTER SIDEBAR */}
        {/* -------------------------------------------------- */}

        <div className="admin-sidebar-footer">
          <div className="admin-system-status">
            <span
              className="admin-status-dot"
              aria-hidden="true"
            />

            {sidebarOpen && (
              <span>
                Système opérationnel
              </span>
            )}
          </div>
        </div>
      </aside>

      {/* ==================================================== */}
      {/* CONTENU PRINCIPAL */}
      {/* ==================================================== */}

      <main className="admin-main">
        {/* -------------------------------------------------- */}
        {/* TOPBAR */}
        {/* -------------------------------------------------- */}

        <header className="admin-topbar">
          <div className="admin-topbar-left">
            <button
              type="button"
              className="admin-mobile-menu"
              onClick={() =>
                setSidebarOpen(
                  (value) => !value,
                )
              }
              aria-label="Ouvrir le menu"
            >
              ☰
            </button>

            <div className="admin-breadcrumb">
              <span>
                6BetBall
              </span>

              <span
                className="admin-breadcrumb-separator"
                aria-hidden="true"
              >
                /
              </span>

              <strong>
                {activeMenuItem.label}
              </strong>
            </div>
          </div>

          <div className="admin-topbar-right">
            {/* ---------------------------------------------- */}
            {/* INDICATEUR LIVE */}
            {/* ---------------------------------------------- */}

            <div className="admin-topbar-live">
              <span
                className="admin-live-dot"
                aria-hidden="true"
              />

              LIVE
            </div>

            {/* ---------------------------------------------- */}
            {/* REFRESH */}
            {/* ---------------------------------------------- */}

            <button
              type="button"
              className="admin-topbar-refresh"
              onClick={handleRefresh}
              disabled={isRefreshing}
              title="Actualiser les données"
              aria-label="Actualiser les données"
            >
              {isRefreshing
                ? "⟳"
                : "↻"}
            </button>

            {/* ---------------------------------------------- */}
            {/* PROFIL ADMIN */}
            {/* ---------------------------------------------- */}

            <div className="admin-profile">
              <div
                className="admin-profile-avatar"
                aria-hidden="true"
              >
                A
              </div>

              <div className="admin-profile-info">
                <strong>
                  Administrateur
                </strong>

                <span>
                  Super Admin
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* -------------------------------------------------- */}
        {/* CONTENU */}
        {/* -------------------------------------------------- */}

        <div className="admin-content">
          {renderActiveSection()}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
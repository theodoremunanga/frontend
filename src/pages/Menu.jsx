// ============================================================
// 6BETBALL — MENU PRINCIPAL
// ============================================================

import { useEffect, useState } from "react";

import PrivacyPolicy from "../legal/PrivacyPolicy";
import TermsOfUse from "../legal/TermsOfUse";

import "./Menu.css";

// ============================================================
// CONSTANTES
// ============================================================

const APP_NAME = "6BetBall";
const CURRENT_YEAR = new Date().getFullYear();

// ============================================================
// HELPERS
// ============================================================

function getStoredValue(...keys) {
  for (const key of keys) {
    const value = localStorage.getItem(key);

    if (value !== null && value !== undefined && value !== "") {
      return value;
    }
  }

  return "";
}

function normalizeRole(value) {
  const role = String(value || "").trim().toUpperCase();

  if (role === "ADMIN" || role === "ADMINISTRATOR") {
    return "ADMIN";
  }

  if (
    role === "AMBASSADOR" ||
    role === "AMBASSADEUR" ||
    role === "AMBASSADOR_USER"
  ) {
    return "AMBASSADOR";
  }

  return role || "JOUEUR";
}

// ============================================================
// COMPONENT
// ============================================================

export default function Menu({ setPage }) {
  // ----------------------------------------------------------
  // USER
  // ----------------------------------------------------------

  const [role, setRole] = useState("JOUEUR");
  const [username, setUsername] = useState("Joueur");

  // ----------------------------------------------------------
  // LEGAL
  // ----------------------------------------------------------

  const [legalPage, setLegalPage] = useState(null);

  // ----------------------------------------------------------
  // UI
  // ----------------------------------------------------------

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // ==========================================================
  // INITIALISATION
  // ==========================================================

  useEffect(() => {
    const storedRole = getStoredValue(
      "role",
      "userRole"
    );

    const storedUsername =
      getStoredValue(
        "username",
        "name",
        "userName"
      ) || "Joueur";

    setRole(normalizeRole(storedRole));
    setUsername(storedUsername);
  }, []);

  // ==========================================================
  // NAVIGATION
  // ==========================================================

  const navigate = (page) => {
    setMobileMenuOpen(false);

    if (typeof setPage === "function") {
      setPage(page);
    }
  };

  // ==========================================================
  // LEGAL NAVIGATION
  // ==========================================================

  const openPrivacyPolicy = () => {
    setMobileMenuOpen(false);
    setLegalPage("privacy");
  };

  const openTermsOfUse = () => {
    setMobileMenuOpen(false);
    setLegalPage("terms");
  };

  const closeLegalPage = () => {
    setLegalPage(null);
  };

  // ==========================================================
  // LOGOUT
  // ==========================================================

  const handleLogout = () => {
    try {
      sessionStorage.clear();
      localStorage.clear();
    } catch (error) {
      console.warn(
        "6BetBall — nettoyage session impossible :",
        error
      );
    }

    setMobileMenuOpen(false);

    if (typeof setPage === "function") {
      setPage("login");
    }
  };

  // ==========================================================
  // MENU BUTTON
  // ==========================================================

  const MenuButton = ({
    icon,
    title,
    subtitle,
    onClick,
    variant = "default",
    badge,
    disabled = false,
    compact = false,
  }) => {
    const handleClick = () => {
      if (disabled) {
        return;
      }

      if (typeof onClick === "function") {
        onClick();
      }
    };

    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className={[
          "menu-button",
          `menu-button--${variant}`,
          disabled ? "menu-button--disabled" : "",
          compact ? "menu-button--compact" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-disabled={disabled}
      >
        <span className="menu-button__shine" />

        <span className="menu-button__icon">
          {icon}
        </span>

        <span className="menu-button__content">
          <span className="menu-button__title">
            {title}
          </span>

          {subtitle && (
            <span className="menu-button__subtitle">
              {subtitle}
            </span>
          )}
        </span>

        {badge && (
          <span className="menu-button__badge">
            {badge}
          </span>
        )}

        {!disabled && (
          <span className="menu-button__arrow">
            →
          </span>
        )}
      </button>
    );
  };

  // ==========================================================
  // BADGE
  // ==========================================================

  const Badge = ({
    children,
    variant = "default",
  }) => (
    <span
      className={[
        "menu-badge",
        `menu-badge--${variant}`,
      ].join(" ")}
    >
      {children}
    </span>
  );

  // ==========================================================
  // LEGAL VIEW
  // ==========================================================

  if (legalPage === "privacy") {
    return (
      <div className="menu-legal-page">
        <div className="menu-legal-page__topbar">
          <button
            type="button"
            className="menu-legal-page__back"
            onClick={closeLegalPage}
          >
            ← Retour au menu
          </button>

          <div className="menu-legal-page__brand">
            <span className="menu-brand-mark">
              6
            </span>

            <span>
              Bet<span>Ball</span>
            </span>
          </div>
        </div>

        <main className="menu-legal-page__content">
          <PrivacyPolicy />
        </main>
      </div>
    );
  }

  if (legalPage === "terms") {
    return (
      <div className="menu-legal-page">
        <div className="menu-legal-page__topbar">
          <button
            type="button"
            className="menu-legal-page__back"
            onClick={closeLegalPage}
          >
            ← Retour au menu
          </button>

          <div className="menu-legal-page__brand">
            <span className="menu-brand-mark">
              6
            </span>

            <span>
              Bet<span>Ball</span>
            </span>
          </div>
        </div>

        <main className="menu-legal-page__content">
          <TermsOfUse />
        </main>
      </div>
    );
  }

  // ==========================================================
  // STATUS DATA
  // ==========================================================

  const accountStatus = [
    {
      label: "Connexion",
      value: "SÉCURISÉE",
      variant: "success",
    },
    {
      label: "Synchronisation",
      value: "TEMPS RÉEL",
      variant: "info",
    },
    {
      label: "Session",
      value: "ACTIVE",
      variant: "warning",
    },
    {
      label: "Réseau",
      value: "STABLE",
      variant: "purple",
    },
  ];

  // ==========================================================
  // STATS
  // ==========================================================

  const stats = [
    {
      icon: "⚡",
      value: "24/7",
      label: "Plateforme active",
    },
    
    {
      icon: "🌍",
      value: "LIVE",
      label: "Multijoueur",
    },
    {
      icon: "🔒",
      value: "SÛR",
      label: "Environnement sécurisé",
    },
  ];

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="menu-page">
      {/* ======================================================
          BACKGROUND
      ====================================================== */}

      <div
        className="menu-background"
        aria-hidden="true"
      >
        <div className="menu-background__orb menu-background__orb--one" />
        <div className="menu-background__orb menu-background__orb--two" />
        <div className="menu-background__orb menu-background__orb--three" />
        <div className="menu-background__grid" />
      </div>

      {/* ======================================================
          HEADER
      ====================================================== */}

      <header className="menu-header">
        <div className="menu-header__inner">
          {/* BRAND */}

          <button
            type="button"
            className="menu-brand"
            onClick={() => navigate("home")}
            aria-label="Retour à l'accueil 6BetBall"
          >
            <span className="menu-brand__icon">
              6
            </span>

            <span className="menu-brand__text">
              <span>Bet</span>
              <strong>Ball</strong>
            </span>
          </button>

          {/* DESKTOP STATUS */}

          <div className="menu-header__status">
            <Badge variant="success">
              🟢 EN LIGNE
            </Badge>

            <Badge variant="info">
              {role === "AMBASSADOR"
                ? "AMBASSADEUR"
                : role === "ADMIN"
                ? "ADMIN"
                : "JOUEUR"}
            </Badge>
          </div>

          {/* MOBILE TOGGLE */}

          <button
            type="button"
            className="menu-mobile-toggle"
            onClick={() =>
              setMobileMenuOpen(
                (previous) => !previous
              )
            }
            aria-label="Ouvrir le menu"
            aria-expanded={mobileMenuOpen}
          >
            <span />
            <span />
            <span />
          </button>
        </div>

        {/* MOBILE NAV */}

        {mobileMenuOpen && (
          <div className="menu-mobile-nav">
            <button
              type="button"
              onClick={() => navigate("profile")}
            >
              👤 Profil
            </button>

            <button
              type="button"
              onClick={() => navigate("chat")}
            >
              📩 Support
            </button>

            <button
              type="button"
              onClick={openTermsOfUse}
            >
              📜 Conditions
            </button>

            <button
              type="button"
              onClick={openPrivacyPolicy}
            >
              🔐 Confidentialité
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="menu-mobile-nav__logout"
            >
              🚪 Déconnexion
            </button>
          </div>
        )}
      </header>

      {/* ======================================================
          MAIN
      ====================================================== */}

      <main className="menu-main">
        {/* ====================================================
            HERO
        ==================================================== */}

        <section className="menu-hero">
          <div className="menu-hero__glow" />

          <div className="menu-hero__content">
            {/* USER */}

            <div className="menu-user">
              <div className="menu-user__avatar">
                👤
              </div>

              <div className="menu-user__info">
                <div className="menu-user__name-row">
                  <h1>
                    Bonjour,{" "}
                    <strong>{username}</strong>
                  </h1>

                  {role === "AMBASSADOR" && (
                    <Badge variant="gold">
                      🤝 AMBASSADEUR
                    </Badge>
                  )}

                  {role === "ADMIN" && (
                    <Badge variant="danger">
                      🛠️ ADMIN
                    </Badge>
                  )}
                </div>

                <p>
                  Bienvenue dans votre espace
                  personnel 6BetBall.
                </p>

                <div className="menu-user__features">
                  <Badge variant="dark">
                    ⚡ Temps réel
                  </Badge>

                  <Badge variant="success">
                    🔒 Sécurisé
                  </Badge>

                  <Badge variant="purple">
                    🌍 Multijoueur
                  </Badge>
                </div>
              </div>
            </div>

            {/* ACCOUNT STATUS */}

            <div className="menu-account-status">
              <div className="menu-account-status__header">
                <span>Statut du compte</span>

                <Badge variant="success">
                  ACTIF
                </Badge>
              </div>

              <div className="menu-account-status__list">
                {accountStatus.map(
                  (item) => (
                    <div
                      key={item.label}
                      className="menu-account-status__item"
                    >
                      <span>
                        {item.label}
                      </span>

                      <strong
                        className={`menu-status-value menu-status-value--${item.variant}`}
                      >
                        {item.value}
                      </strong>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ====================================================
            STATS
        ==================================================== */}

        <section className="menu-stats">
          {stats.map((item) => (
            <div
              key={item.label}
              className="menu-stat"
            >
              <div className="menu-stat__icon">
                {item.icon}
              </div>

              <div className="menu-stat__value">
                {item.value}
              </div>

              <div className="menu-stat__label">
                {item.label}
              </div>
            </div>
          ))}
        </section>


        {/* ====================================================
            SERVICES
        ==================================================== */}

        <section className="menu-section">
          <div className="menu-section__heading">
            <div>
              <span className="menu-section__eyebrow">
                SERVICES
              </span>

              <h2>
                ⚡ Votre espace
              </h2>

              <p>
                Gérez votre compte et accédez
                aux services disponibles.
              </p>
            </div>
          </div>

          <div className="menu-grid">
            {/* PROFIL */}

            <MenuButton
              icon="👤"
              title="Mon profil"
              subtitle="Consultez et modifiez les informations de votre compte."
              onClick={() =>
                navigate("profile")
              }
              variant="profile"
            />

            {/* AMBASSADEUR */}

            <MenuButton
              icon="🤝"
              title={
                role === "AMBASSADOR"
                  ? "Espace Ambassadeur"
                  : "Devenir Ambassadeur"
              }
              subtitle={
                role === "AMBASSADOR"
                  ? "Récupérez les fonds, consultez vos opérations et gérez vos commissions."
                  : "Découvrez le programme Ambassadeur et les possibilités offertes par 6BetBall."
              }
              onClick={() =>
                navigate("ambassade")
              }
              variant="ambassador"
              badge={
                role === "AMBASSADOR"
                  ? "ACTIF"
                  : "AMBASSADEUR"
              }
            />

            {/* SUPPORT */}

            <MenuButton
              icon="📩"
              title="Retrouvez vos amis et Discutez"
              subtitle="C'est aussi le meilleur moyen d'envoyer et récevoir des messages"
              onClick={() =>
                navigate("chat")
              }
              variant="support"
              badge="SUPPORT"
            />

            {/* BOT IA */}

            <MenuButton
              icon="🤖"
              title="Bot IA"
              subtitle="Louez le Joueur Artificiel pour jouer à vos matchs de Dames."
              disabled
              variant="ai"
              badge="Bientôt disponible"
            />

            {/* TOURNOIS */}

            <MenuButton
              icon="🏆"
              title="Tournois"
              subtitle="Participez à des compétitions organisées et suivez vos performances."
              disabled
              variant="tournament"
              badge="Bientôt disponible"
            />

            {/* CLASSEMENTS */}

            <MenuButton
              icon="📊"
              title="Classements"
              subtitle="Consultez les performances et les statistiques de la communauté."
              disabled
              variant="ranking"
              badge="Bientôt disponible"
            />
          </div>
        </section>

        {/* ====================================================
            ADMINISTRATION
        ==================================================== */}

        {role === "ADMIN" && (
          <section className="menu-section menu-admin-section">
            <div className="menu-section__heading">
              <div>
                <span className="menu-section__eyebrow">
                  ADMINISTRATION
                </span>

                <h2>
                  🛠️ Administration
                </h2>

                <p>
                  Outils de gestion réservés à
                  l'administration 6BetBall.
                </p>
              </div>
            </div>

            <div className="menu-grid menu-grid--admin">
              <MenuButton
                icon="🛠️"
                title="Admin Dashboard"
                subtitle="Administration complète de la plateforme et supervision des services."
                onClick={() =>
                  navigate("admin")
                }
                variant="admin"
                badge="ADMIN"
              />
            </div>
          </section>
        )}

        {/* ====================================================
            À PROPOS
        ==================================================== */}

        <section className="menu-information-grid">
          {/* ABOUT */}

          <article className="menu-information-card">
            <div className="menu-information-card__icon">
              🎯
            </div>

            <div>
              <span className="menu-information-card__eyebrow">
                NOTRE PLATEFORME
              </span>

              <h2>
                À propos de 6BetBall
              </h2>

              <p>
                6BetBall est une plateforme de
                jeux compétitifs pensée autour
                du divertissement, du
                multijoueur et de l'expérience
                en temps réel.
              </p>
            </div>

            <div className="menu-information-card__tags">
              <Badge variant="info">
                ⚡ Temps réel
              </Badge>

              <Badge variant="success">
                🔒 Sécurité
              </Badge>

              <Badge variant="purple">
                🌍 Multijoueur
              </Badge>

              <Badge variant="gold">
                🎮 Jeux
              </Badge>
            </div>
          </article>

          {/* SECURITY */}

          <article className="menu-information-card">
            <div className="menu-information-card__icon">
              🔐
            </div>

            <div>
              <span className="menu-information-card__eyebrow">
                PROTECTION
              </span>

              <h2>
                Sécurité & système
              </h2>

              <p>
                Votre espace est conçu pour
                maintenir une expérience claire,
                sécurisée et synchronisée.
              </p>
            </div>

            <div className="menu-security-list">
              {[
                "Connexion sécurisée",
                "Synchronisation temps réel",
                "Protection de session",
                "Vérification des données",
              ].map((item) => (
                <div
                  key={item}
                  className="menu-security-item"
                >
                  <span>
                    {item}
                  </span>

                  <Badge variant="success">
                    ACTIVE
                  </Badge>
                </div>
              ))}
            </div>
          </article>
        </section>

        {/* ====================================================
            QUICK ACCESS
        ==================================================== */}

        <section className="menu-quick-access">
          <button
            type="button"
            onClick={() => navigate("profile")}
          >
            <span>👤</span>
            <strong>Profil</strong>
          </button>

          <button
            type="button"
            onClick={() => navigate("chat")}
          >
            <span>📩</span>
            <strong>Support</strong>
          </button>

          <button
            type="button"
            onClick={openTermsOfUse}
          >
            <span>📜</span>
            <strong>Conditions</strong>
          </button>

          <button
            type="button"
            onClick={openPrivacyPolicy}
          >
            <span>🔐</span>
            <strong>Confidentialité</strong>
          </button>
        </section>

        {/* ====================================================
            FOOTER
        ==================================================== */}

        <footer className="menu-footer">
          <div className="menu-footer__brand">
            <button
              type="button"
              className="menu-footer__logo"
              onClick={() =>
                navigate("home")
              }
              aria-label="Retour à l'accueil"
            >
              <span className="menu-footer__logo-mark">
                6
              </span>

              <span>
                <strong>Bet</strong>
                <b>Ball</b>
              </span>
            </button>

            <p>
              Authentique, Honnête et Sûr
            </p>

            <small>
              Copyright © {CURRENT_YEAR}{" "}
              {APP_NAME}. Tous droits réservés.
            </small>
          </div>

          <div className="menu-footer__links">
            <button
              type="button"
              onClick={openTermsOfUse}
            >
              📜 Conditions d'utilisation
            </button>

            <button
              type="button"
              onClick={openPrivacyPolicy}
            >
              🔐 Politique de confidentialité
            </button>
          </div>

          <div className="menu-footer__actions">
            <button
              type="button"
              onClick={handleLogout}
              className="menu-footer__logout"
            >
              🚪
              <span>
                Déconnexion
              </span>
            </button>
          </div>
        </footer>

        {/* ====================================================
            SIGNATURE
        ==================================================== */}

        <div className="menu-signature">
          <span>6BetBall</span>
          <i>•</i>
          <span>Authentique</span>
          <i>•</i>
          <span>Honnête</span>
          <i>•</i>
          <span>Sûr</span>
        </div>
      </main>
    </div>
  );
}
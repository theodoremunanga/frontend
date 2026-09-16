import { useState } from "react";
import api from "../services/api";
import "./Login.css";

export default function Login({ setPage, setIsAuth }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [aboutExpanded, setAboutExpanded] = useState(false);

  // =========================================================
  // CONNEXION
  // =========================================================
  const handleLogin = async (e) => {
    e?.preventDefault();

    if (!identifier.trim() || !password) {
      setError(
        "⚠️ Veuillez renseigner votre identifiant et votre mot de passe."
      );
      return;
    }

    try {
      setLoading(true);
      setError("");

      console.log("🔐 Tentative de connexion...");

      const res = await api.post("/auth/login", {
        identifier: identifier.trim(),
        password,
      });

      console.log("✅ Réponse API:", res.data);

      const data = res.data;

      if (!data?.token) {
        throw new Error("Réponse serveur invalide.");
      }

      const userRole = String(
        data?.user?.role || "USER"
      ).toUpperCase();

      // Stockage de la session
      localStorage.setItem("token", data.token);
      localStorage.setItem("role", userRole);

      // Informations utilisateur si disponibles
      if (data?.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
      }

      setIsAuth(true);

      // Redirection
      if (userRole === "ADMIN") {
        setPage("admin");
      } else {
        setPage("accueil");
      }
    } catch (err) {
      console.error("❌ LOGIN ERROR:", err);

      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message;

      setError(
        message || "❌ Une erreur est survenue lors de la connexion."
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // NAVIGATION
  // =========================================================
  const goToRegister = () => {
    setPage("register");
  };

  const openLogin = () => {
    setError("");
    setShowLogin(true);

    // Petit délai pour permettre l'animation CSS
    setTimeout(() => {
      document
        .getElementById("login-form")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
    }, 50);
  };

  const closeLogin = () => {
    setShowLogin(false);
    setError("");
  };

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
    });
  };

  // =========================================================
  // DONNÉES DES JEUX
  // =========================================================
  const games = [
    {
      icon: "⚽",
      title: "Football",
      category: "SPORT",
      image: "/assets/login/hero-football.PNG",
      description:
        "Affrontez vos adversaires dans des matchs compétitifs.",
    },
    {
      icon: "🥊",
      title: "BraVMan",
      category: "COMBAT",
      image: "/assets/login/hero-combat.PNG",
      description:
        "Entrez dans l'arène et imposez votre style de combat.",
    },
    {
      icon: "♟️",
      title: "Dames",
      category: "STRATÉGIE",
      image: "/assets/login/hero-gaming.PNG",
      description:
        "Mettez votre intelligence et votre stratégie à l'épreuve.",
    },
    {
      icon: "🎲",
      title: "Ludo",
      category: "ARCADE",
      image: "/assets/login/hero-gaming.PNG",
      description:
        "Jouez, défiez et tentez de prendre l'avantage.",
    },
    {
      icon: "🃏",
      title: "Cartes",
      category: "CARDS",
      image: "/assets/login/hero-gaming.PNG",
      description:
        "Des parties de cartes compétitives entre joueurs.",
    },
    {
      icon: "🏎️",
      title: "Course",
      category: "RACING",
      image: "/assets/login/hero-racing.PNG",
      description:
        "Vitesse, réflexes et stratégie pour arriver premier.",
    },
    {
      icon: "🥋",
      title: "Mortal Combat",
      category: "ACTION",
      image: "/assets/login/hero-combat.PNG",
      description:
        "Un univers de combat intense entre adversaires.",
    },
  ];

  // =========================================================
  // FONCTIONNALITÉS
  // =========================================================
  const features = [
    {
      icon: "🎮",
      title: "Jeux compétitifs",
      description:
        "Affrontez d'autres joueurs dans plusieurs univers de jeu.",
    },
    {
      icon: "🤝",
      title: "Défis entre joueurs",
      description:
        "Trouvez un adversaire et participez à des matchs équitables.",
    },
    {
      icon: "🏆",
      title: "Compétition",
      description:
        "Chaque partie met votre talent, vos réflexes et votre stratégie à l'épreuve.",
    },
    {
      icon: "🔐",
      title: "Compte sécurisé",
      description:
        "Créez votre compte et retrouvez votre espace personnel.",
    },
    {
      icon: "💳",
      title: "Paiements intégrés",
      description:
        "Une architecture pensée pour intégrer les solutions de paiement.",
    },
    {
      icon: "📊",
      title: "Progression",
      description:
        "Suivez vos performances et votre évolution au fil de vos parties.",
    },
  ];

  // =========================================================
  // RENDU
  // =========================================================
  return (
    <div className="login-page">

      <div
        className="login-background"
        style={{
          backgroundImage: "url('/assets/login/6betball-bg.PNG')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="background-overlay"></div>

        <div className="floating-shape shape-one"></div>
        <div className="floating-shape shape-two"></div>
        <div className="floating-shape shape-three"></div>

        <div className="light-orb orb-one"></div>
        <div className="light-orb orb-two"></div>

        <div className="background-grid"></div>
      </div>

      {/* =====================================================
          NAVBAR
      ====================================================== */}
      <header className="public-navbar">

        <div
          className="brand"
          onClick={() => window.scrollTo({
            top: 0,
            behavior: "smooth",
          })}
        >
          <div className="brand-logo">
            <span>6</span>
          </div>

          <div className="brand-text">
            <strong>6BetBall Pro 2026</strong>
            <small>AUTHENTIQUE • HONNÊTE • SÛR</small>
          </div>
        </div>

        <nav className="public-nav-links">
          <button
            type="button"
            onClick={() => scrollToSection("games")}
          >
            Jeux
          </button>

          <button
            type="button"
            onClick={() => scrollToSection("features")}
          >
            Fonctionnalités
          </button>

          <button
            type="button"
            onClick={() => scrollToSection("about")}
          >
            À propos
          </button>
        </nav>

        <div className="navbar-actions">
          <button
            type="button"
            className="nav-login-button"
            onClick={openLogin}
          >
            Se connecter
          </button>

          <button
            type="button"
            className="nav-register-button"
            onClick={goToRegister}
          >
            Créer un compte
          </button>
        </div>

      </header>

      {/* =====================================================
          HERO
      ====================================================== */}
      <main>

        <section className="hero-section">

          <div className="hero-content">

            <div className="hero-badge">
              <span className="badge-dot"></span>
              LA NOUVELLE EXPÉRIENCE DU JEU COMPÉTITIF
            </div>

            <h1>
              Bienvenue sur
              <br />

              <span className="gradient-text">
                6BetBall.
              </span>

              <br />

              <span className="hero-highlight">
                ICI ON JOUE...
              </span>
            </h1>

            <p className="hero-description">
              <strong>6BetBall</strong> est une plateforme de jeux compétitifs en ligne 
              qui rassemble les joueurs autour de matchs en temps réel, 
              de défis et de compétitions.
              Jouez contre d'autres participants, suivez les rencontres, 
              relevez de nouveaux défis et profitez 
              d'un environnement interactif pensé autour de la compétition, 
              du divertissement et de la récompense.
              Avec son système centralisé de gestion des matchs et son portefeuille virtuel, 
              6BetBall propose une expérience complète où jouer, 
              affronter et gagner sont réunis sur une seule plateforme.
              6BetBall — Authentique, Honnête et Sûr.
            </p>

            <div className="hero-actions">

              <button
                type="button"
                className="primary-hero-button"
                onClick={goToRegister}
              >
                <span>🚀</span>
                Commencer maintenant
              </button>

              <button
                type="button"
                className="secondary-hero-button"
                onClick={() => scrollToSection("games")}
              >
                <span>🎮</span>
                Découvrir les jeux
              </button>

            </div>

            <div className="hero-stats">

              <div className="hero-stat">
                <strong>07+</strong>
                <span>Jeux</span>
              </div>

              <div className="hero-stat-separator"></div>

              <div className="hero-stat">
                <strong>1 VS 1</strong>
                <span>Défis</span>
              </div>

              <div className="hero-stat-separator"></div>

              <div className="hero-stat">
                <strong>24/7</strong>
                <span>Compétition</span>
              </div>

            </div>

          </div>

          {/* =================================================
              VISUEL HERO
          ================================================== */}
          <div className="hero-player-card">

            <img
              src="/assets/login/hero-football.PNG"
              alt="Football - 6BetBall"
              className="hero-real-image"
            />

            <div className="hero-image-overlay"></div>

            <div className="player-card-info">

              <span className="player-label">
                6BETBALL
              </span>

              <strong>
                GAME
                <br />
                CHANGER
              </strong>

              <small>
                AUTHENTIQUE • HONNÊTE • SÛR
              </small>

            </div>

            <div className="floating-game-card card-football">

              <img
                src="/assets/login/hero-football.PNG"
                alt="Football"
              />

              <div>
                <strong>Football</strong>
                <small>VS</small>
              </div>

            </div>

            <div className="floating-game-card card-combat">

              <img
                src="/assets/login/hero-combat.PNG"
                alt="BraVMan"
              />

              <div>
                <strong>BraVMan</strong>
                <small>FIGHT</small>
              </div>

            </div>

            <div className="floating-game-card card-racing">

              <img
                src="/assets/login/hero-racing.PNG"
                alt="Course"
              />

              <div>
                <strong>Racing</strong>
                <small>RACE</small>
              </div>

            </div>

          </div>

        </section>

        {/* ===================================================
            BARRE DE CONFIANCE
        ==================================================== */}
        <section className="trust-bar">

          <div className="trust-item">
            <span>🎮</span>
            <strong>Plusieurs univers</strong>
          </div>

          <div className="trust-item">
            <span>⚡</span>
            <strong>Expérience dynamique</strong>
          </div>

          <div className="trust-item">
            <span>🏆</span>
            <strong>Esprit compétitif</strong>
          </div>

          <div className="trust-item">
            <span>🔒</span>
            <strong>Compte personnel</strong>
          </div>

        </section>

        {/* ===================================================
            JEUX
        ==================================================== */}
        <section
          id="games"
          className="games-section"
        >

          <div className="section-heading">

            <span className="section-kicker">
              EXPLORE L'UNIVERS
            </span>

            <h2>
              Choisis ton
              <span> terrain de jeu</span>
            </h2>

            <p>
              Du sport au combat, de la stratégie à la vitesse,
              6BetBall rassemble plusieurs expériences compétitives
              dans une même plateforme.
            </p>

          </div>

          <div className="games-grid">

            {games.map((game, index) => (
              <article
                className={`game-card game-card-${index + 1}`}
                key={game.title}
              >

                <div className="game-card-glow"></div>

                <div className="game-number">
                  0{index + 1}
                </div>

                <div className="game-card-image">
                  <img
                    src={game.image}
                    alt={`Visuel ${game.title}`}
                    loading="lazy"
                  />
                </div>

                <div className="game-icon">
                  {game.icon}
                </div>

                <div className="game-card-content">

                  <span className="game-category">
                    {game.category}
                  </span>

                  <h3>
                    {game.title}
                  </h3>

                  <p>
                    {game.description}
                  </p>

                  <button
                    type="button"
                    onClick={openLogin}
                    className="game-play-button"
                  >
                    Jouer
                    <span>→</span>
                  </button>

                </div>

              </article>
            ))}

          </div>

        </section>

        {/* ===================================================
            FEATURES
        ==================================================== */}
        <section
          id="features"
          className="features-section"
        >

          <div className="section-heading">

            <span className="section-kicker">
              POURQUOI 6BETBALL ?
            </span>

            <h2>
              Pour les passionnées des défis...
              <br />
              <span>6BetBall est votre Arbitre Sécurisé.</span>
            </h2>

          </div>

          <div className="features-grid">

            {features.map((feature, index) => (
              <article
                className="feature-card"
                key={feature.title}
              >

                <div className="feature-icon">
                  {feature.icon}
                </div>

                <div className="feature-number">
                  0{index + 1}
                </div>

                <h3>
                  {feature.title}
                </h3>

                <p>
                  {feature.description}
                </p>

              </article>
            ))}

          </div>

        </section>

        {/* ===================================================
            SECTION COMPÉTITION
        ==================================================== */}
        <section className="competition-section">

          <div className="competition-content">

            <span className="section-kicker">
              L'ESPRIT 6BETBALL
            </span>

            <h2>
              Le jeu commence
              <span> quand le défi commence.</span>
            </h2>

            <p>
              6BetBall vous offre un espace où les joueurs peuvent
              se rencontrer, se mesurer et développer leur talent
              à travers des défis compétitifs.
            </p>

            <div className="competition-points">

              <div>
                <span>✓</span>
                <p>
                  Affrontez des joueurs réels
                </p>
              </div>

              <div>
                <span>✓</span>
                <p>
                  Choisissez votre univers de jeu
                </p>
              </div>

              <div>
                <span>✓</span>
                <p>
                  Faites progresser votre niveau
                </p>
              </div>

            </div>

            <button
              type="button"
              className="primary-hero-button"
              onClick={goToRegister}
            >
              Rejoindre 6BetBall
              <span>→</span>
            </button>

          </div>

          <div className="competition-visual">

            <div className="versus-card">

              <div className="versus-player">
                <div className="versus-avatar">
                  ⚽
                </div>

                <strong>
                  PLAYER
                </strong>

                <span>
                  CHALLENGER
                </span>
              </div>

              <div className="versus-middle">
                <span>VS</span>
              </div>

              <div className="versus-player">
                <div className="versus-avatar">
                  🥊
                </div>

                <strong>
                  PLAYER
                </strong>

                <span>
                  OPPONENT
                </span>
              </div>

            </div>

            <div className="versus-decoration">
              6
            </div>

          </div>

        </section>

        {/* ===================================================
            À PROPOS
        ==================================================== */}
        <section
          id="about"
          className="about-section"
        >

          <div className="about-logo">
            <div className="about-logo-circle">
              6
            </div>
          </div>

          <div className="about-content">

            <span className="section-kicker">
              À PROPOS DE 6BETBALL
            </span>

            <h2>
              6BetBall Pro 2026
              <span> Authentique, Honnête et Sûr.</span>
            </h2>

            
            <div className="about-description-text">
              <p>
                6BetBall est une plateforme de jeux compétitifs en ligne pensée
                pour transformer chaque partie en une véritable expérience de
                challenge. Football, combat, stratégie, vitesse et autres univers
                se rencontrent dans un même espace où chaque joueur peut entrer
                dans la compétition, relever des défis et chercher à progresser.
              </p>

              <p>
                Notre ambition est de créer un environnement où le talent, l'effort,
                la stratégie, la maîtrise du jeu et l'esprit de compétition ont une
                véritable place. Sur 6BetBall, chaque défi peut devenir une occasion
                de se mesurer à d'autres joueurs, de développer son expérience et
                de repousser ses propres limites.
              </p>

              <p>
                La plateforme rassemble plusieurs univers afin que chacun puisse
                trouver son terrain de jeu. Que l'on préfère la précision du sport,
                l'intensité du combat, la réflexion stratégique ou la vitesse,
                l'objectif reste le même : jouer, progresser et relever de nouveaux
                défis.
              </p>

              <p>
                6BetBall veut également construire une expérience claire et agréable,
                basée sur une relation de confiance avec ses joueurs. Chaque détail
                de la plateforme est pensé pour faire du jeu compétitif une expérience
                dynamique, accessible et engageante.
              </p>
            </div>

            <button
              type="button"
              className="about-see-more"
              onClick={() => setAboutExpanded((prev) => !prev)}
              aria-expanded={aboutExpanded}
            >
              {aboutExpanded ? "Voir moins" : "Voir plus"}
              <span className={aboutExpanded ? "rotated" : ""}>↓</span>
            </button>

          </div>

            <div className="about-values">

              <div>
                <strong>01</strong>
                <span>Talent</span>
              </div>

              <div>
                <strong>02</strong>
                <span>Effort</span>
              </div>

              <div>
                <strong>03</strong>
                <span>Stratégie</span>
              </div>

              <div>
                <strong>04</strong>
                <span>Compétition</span>
              </div>

            </div>
  
        </section>

        {/* ===================================================
            CTA FINAL
        ==================================================== */}
        <section className="final-cta-section">

          <div className="final-cta-glow"></div>

          <div className="final-cta-content">

            <span className="section-kicker">
              PRÊT À ENTRER DANS LE JEU ?
            </span>

            <h2>
              Ton prochain adversaire t'attend !
              <span> ICI ON JOUE, ON NE PARIE PAS</span>
            </h2>

            <p>
              Crée ton compte, choisis ton jeu et prépare-toi
              à relever de nouveaux défis.
            </p>

            <div className="final-cta-actions">

              <button
                type="button"
                className="primary-hero-button"
                onClick={goToRegister}
              >
                Je crée mon compte
              </button>

              <button
                type="button"
                className="secondary-hero-button"
                onClick={openLogin}
              >
                J'ai déjà un compte
              </button>

            </div>

          </div>

        </section>

      </main>

      {/* =====================================================
          FOOTER
      ====================================================== */}
      <footer className="public-footer">

        <div className="footer-brand">

          <div className="brand-logo">
            <span>6</span>
          </div>

          <div>
            <strong>6BetBall Pro 2026</strong>
            <small>
              AUTHENTIQUE • HONNÊTE • SÛR
            </small>
          </div>

        </div>

        <div className="footer-links">

          <button
            type="button"
            onClick={() => scrollToSection("games")}
          >
            Jeux
          </button>

          <button
            type="button"
            onClick={() => scrollToSection("features")}
          >
            Fonctionnalités
          </button>

          <button
            type="button"
            onClick={() => scrollToSection("about")}
          >
            À propos
          </button>

          <button
            type="button"
            onClick={goToRegister}
          >
            Inscription
          </button>

        </div>

        <div className="footer-copy">
          © {new Date().getFullYear()} Tout Fait Nombre
        </div>

      </footer>

      {/* =====================================================
          MODALE / ESPACE CONNEXION
      ====================================================== */}
      {showLogin && (
        <div
          className="login-modal"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              closeLogin();
            }
          }}
        >

          <div
            id="login-form"
            className="login-modal-card"
          >

            <button
              type="button"
              className="login-close-button"
              onClick={closeLogin}
              aria-label="Fermer"
            >
              ×
            </button>

            <div className="login-modal-header">

              <div className="login-modal-logo">
                6
              </div>

              <span className="section-kicker">
                ESPACE JOUEUR
              </span>

              <h2>
                Bon retour
                <span> sur 6BetBall</span>
              </h2>

              <p>
                Connectez-vous pour accéder à votre espace
                et retrouver vos jeux.
              </p>

            </div>

            {error && (
              <div className="login-error">
                <span>⚠️</span>
                <p>{error}</p>
              </div>
            )}

            <form onSubmit={handleLogin}>

              <div className="login-field">

                <label htmlFor="identifier">
                  Identifiant
                </label>

                <div className="input-wrapper">

                  <span className="input-icon">
                    👤
                  </span>

                  <input
                    id="identifier"
                    type="text"
                    placeholder="Votre username"
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                      setError("");
                    }}
                    autoComplete="username"
                  />

                </div>

              </div>

              <div className="login-field">

                <label htmlFor="password">
                  Mot de passe
                </label>

                <div className="input-wrapper">

                  <span className="input-icon">
                    🔒
                  </span>

                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Votre mot de passe"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError("");
                    }}
                    autoComplete="current-password"
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() =>
                      setShowPassword((previous) => !previous)
                    }
                    aria-label={
                      showPassword
                        ? "Masquer le mot de passe"
                        : "Afficher le mot de passe"
                    }
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </button>

                </div>

              </div>

              <div className="login-options">

                <label className="remember-option">
                  <input
                    type="checkbox"
                  />

                  <span>
                    Se souvenir de moi
                  </span>
                </label>

                <button
                  type="button"
                  className="forgot-password"
                  onClick={() => {
                    setError(
                      "La récupération du mot de passe sera disponible prochainement."
                    );
                  }}
                >
                  Mot de passe oublié ?
                </button>

              </div>

              <button
                type="submit"
                className="login-submit-button"
                disabled={loading}
              >

                {loading ? (
                  <>
                    <span className="loading-spinner"></span>
                    Connexion...
                  </>
                ) : (
                  <>
                    Se connecter
                    <span>→</span>
                  </>
                )}

              </button>

            </form>

            <div className="login-divider">
              <span></span>
              <small>OU</small>
              <span></span>
            </div>

            <div className="login-register">

              <span>
                Vous n'avez pas encore de compte ?
              </span>

              <button
                type="button"
                onClick={goToRegister}
              >
                Créer un compte
              </button>

            </div>

            <div className="login-security">

              <span>🔐</span>

              <p>
                Vos informations de connexion sont
                utilisées uniquement pour accéder à votre compte.
              </p>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}
// ============================================================
// src/App.jsx
// ============================================================
//
// RESPONSABILITÉS :
// - Navigation principale de 6BetBall
// - Authentification / protection des pages
// - Persistance de la page courante après F5
// - Gestion propre de l'historique navigateur
// - Protection contre la restauration d'anciens matchs
// - Chargement des jeux uniquement si le match est réellement actif
// - Responsive global de l'application
//
// IMPORTANT :
// - Un gameConfig présent dans localStorage NE signifie PAS
//   qu'un match est encore actif.
// - Le serveur reste la source de vérité pour l'état du match.
// - Aucun localStorage.clear() global.
// ============================================================

import { useState, useEffect, useCallback } from "react";

// ============================================================
// COMPONENTS
// ============================================================

import AdminDashboard from "./components/AdminDashboard";
import Navbar from "./components/Navbar";

import Accueil from "./pages/Accueil";
import Competition from "./pages/Competitions";
import Infos from "./pages/Infos";
import Menu from "./pages/Menu";
import Avis from "./pages/Avis";
import Chat from "./pages/Chat";

import Login from "./pages/Login";
import Register from "./pages/Register";

import PrivacyPolicy from "./legal/PrivacyPolicy";
import TermsOfUse from "./legal/TermsOfUse";

import ProfileRadar from "./components/Profile/ProfileRadar";
import AdsPage from "./pages/AdsPage";
import Ambassade from "./components/ambassade/Ambassade";

import BravmanPage from "./sac/games/bravman/Bravman";
import Dames from "./sac/games/checkers/Dames";
import FootballPage from "./sac/games/football/Football";

// ============================================================
// CONFIGURATION
// ============================================================

const API_BASE =
  (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

// ============================================================
// STORAGE KEYS
// ============================================================

const STORAGE_KEYS = {
  GAME_CONFIG: "gameConfig",
  CURRENT_PAGE: "6betball_current_page",
};

// ============================================================
// PAGES AUTORISÉES
// ============================================================

const PUBLIC_PAGES = new Set([
  "login",
  "register",
  "terms",
  "privacy",
]);

const KNOWN_PAGES = new Set([
  "login",
  "register",
  "terms",
  "privacy",
  "accueil",
  "competition",
  "infos",
  "menu",
  "ambassade",
  "chat",
  "avis",
  "ads",
  "game",
  "football",
  "bravman",
  "profile",
  "admin",
]);

// ============================================================
// HELPERS
// ============================================================

function normalizePage(value) {
  if (!value) return "accueil";

  const page = String(value)
    .trim()
    .toLowerCase();

  return KNOWN_PAGES.has(page)
    ? page
    : "accueil";
}

// ------------------------------------------------------------
// Normalisation du type de jeu
// ------------------------------------------------------------

function normalizeGame(value) {
  if (!value) return null;

  const game = String(value)
    .trim()
    .toLowerCase();

  if (
    game === "dames" ||
    game === "checkers" ||
    game === "checkers10" ||
    game === "draughts"
  ) {
    return "dames";
  }

  if (
    game === "football" ||
    game === "foot"
  ) {
    return "football";
  }

  if (
    game === "bravman" ||
    game === "brav-man" ||
    game === "brav_man"
  ) {
    return "bravman";
  }

  return game;
}

// ------------------------------------------------------------
// Lecture sécurisée du gameConfig
// ------------------------------------------------------------

function readGameConfig() {
  try {
    const raw =
      localStorage.getItem(
        STORAGE_KEYS.GAME_CONFIG
      );

    if (!raw) return null;

    const parsed = JSON.parse(raw);

    if (
      !parsed ||
      typeof parsed !== "object"
    ) {
      return null;
    }

    return parsed;
  } catch (error) {
    console.error(
      "❌ GAME CONFIG INVALID:",
      error
    );

    localStorage.removeItem(
      STORAGE_KEYS.GAME_CONFIG
    );

    return null;
  }
}

// ------------------------------------------------------------
// Sauvegarde sécurisée du gameConfig
// ------------------------------------------------------------

function saveGameConfig(config) {
  if (!config) {
    localStorage.removeItem(
      STORAGE_KEYS.GAME_CONFIG
    );
    return;
  }

  try {
    localStorage.setItem(
      STORAGE_KEYS.GAME_CONFIG,
      JSON.stringify(config)
    );
  } catch (error) {
    console.error(
      "❌ Impossible de sauvegarder gameConfig:",
      error
    );
  }
}

// ------------------------------------------------------------
// Récupération du rôle
// ------------------------------------------------------------

function getStoredRole() {
  return String(
    localStorage.getItem("role") || ""
  )
    .trim()
    .toUpperCase();
}

// ------------------------------------------------------------
// Récupération du token
// ------------------------------------------------------------

function getStoredToken() {
  const token =
    localStorage.getItem("token");

  if (
    !token ||
    token === "undefined" ||
    token === "null"
  ) {
    return null;
  }

  return token;
}

// ============================================================
// API MATCH
// ============================================================
//
// IMPORTANT :
// Le stockage local ne décide jamais si le match est actif.
// On vérifie le serveur.
// ============================================================

async function fetchMatchStatus(
  matchId,
  signal
) {
  if (!matchId) {
    return null;
  }

  const token =
    getStoredToken();

  if (!token) {
    return null;
  }

  const endpoint =
    `${API_BASE}/match/${encodeURIComponent(
      matchId
    )}`;

  try {
    const response =
      await fetch(endpoint, {
        method: "GET",
        headers: {
          Authorization:
            `Bearer ${token}`,
          Accept:
            "application/json",
        },
        signal,
      });

    if (!response.ok) {
      return null;
    }

    const data =
      await response.json();

    if (!data) {
      return null;
    }

    return (
      data.match ||
      data.data?.match ||
      data.data ||
      null
    );
  } catch (error) {
    if (
      error?.name !==
      "AbortError"
    ) {
      console.error(
        "❌ Match status error:",
        error
      );
    }

    return null;
  }
}

// ============================================================
// MATCH ACTIF ?
// ============================================================

function isMatchActuallyActive(match) {
  if (!match) {
    return false;
  }

  const status =
    String(
      match.status ||
        match.state ||
        ""
    )
      .trim()
      .toLowerCase();

  return [
    "playing",
    "active",
    "started",
    "in_progress",
    "in-progress",
  ].includes(status);
}

// ============================================================
// CONSTRUCTION CONFIG JEU
// ============================================================

function buildGameConfig(
  config,
  match
) {
  if (!config) {
    return null;
  }

  return {
    ...config,

    matchId:
      config.matchId ??
      match?.id ??
      match?.match_id ??
      null,

    game:
      normalizeGame(
        config.game ||
          match?.game ||
          match?.game_type
      ),

    // Informations serveur utiles aux jeux
    status:
      match?.status ??
      config.status ??
      null,

    serverMatch:
      match || null,
  };
}

// ============================================================
// WAITING MATCH
// ============================================================

function WaitingMatch({
  matchId,
  game,
  setPage,
  setGameConfig,
}) {
  const [error, setError] =
    useState(null);

  useEffect(() => {
    if (!matchId) {
      return undefined;
    }

    const controller =
      new AbortController();

    let mounted = true;

    const checkMatch =
      async () => {
        try {
          const match =
            await fetchMatchStatus(
              matchId,
              controller.signal
            );

          if (!mounted) return;

          if (!match) {
            return;
          }

          // ==================================================
          // MATCH DÉMARRÉ
          // ==================================================

          if (
            isMatchActuallyActive(
              match
            )
          ) {
            const updated =
              buildGameConfig(
                {
                  matchId,
                  game,
                },
                match
              );

            setGameConfig(
              updated
            );

            saveGameConfig(
              updated
            );

            setPage("game");

            return;
          }

          // ==================================================
          // MATCH ANNULÉ / TERMINÉ
          // ==================================================

          const status =
            String(
              match.status || ""
            )
              .trim()
              .toLowerCase();

          if (
            [
              "finished",
              "completed",
              "cancelled",
              "canceled",
              "expired",
              "closed",
            ].includes(status)
          ) {
            localStorage.removeItem(
              STORAGE_KEYS.GAME_CONFIG
            );

            setGameConfig(null);
            setPage("accueil");
          }
        } catch (err) {
          if (
            err?.name !==
            "AbortError"
          ) {
            console.error(
              "❌ Waiting error:",
              err
            );

            if (mounted) {
              setError(
                "Impossible de vérifier le match."
              );
            }
          }
        }
      };

    // Vérification immédiate
    checkMatch();

    // Puis vérification périodique
    const interval =
      setInterval(
        checkMatch,
        2000
      );

    return () => {
      mounted = false;
      controller.abort();
      clearInterval(interval);
    };
  }, [
    matchId,
    game,
    setPage,
    setGameConfig,
  ]);

  return (
    <main className="app-waiting">
      <div className="app-waiting-card">
        <div className="app-waiting-icon">
          ⏳
        </div>

        <h2>
          Défi en attente
        </h2>

        <p>
          Match ID :{" "}
          <strong>
            {matchId}
          </strong>
        </p>

        <p>
          En attente d’un
          joueur...
        </p>

        {error && (
          <p className="app-error">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}

// ============================================================
// APP
// ============================================================

export default function App() {
  // ==========================================================
  // AUTH
  // ==========================================================

  const [isAuth, setIsAuth] =
    useState(
      () => !!getStoredToken()
    );

  // ==========================================================
  // PAGE INITIALE
  // ==========================================================

  const [page, setPageState] =
    useState(() => {
      const token =
        getStoredToken();

      if (!token) {
        return "login";
      }

      const savedPage =
        sessionStorage.getItem(
          STORAGE_KEYS.CURRENT_PAGE
        );

      return normalizePage(
        savedPage || "accueil"
      );
    });

  // ==========================================================
  // GAME CONFIG
  // ==========================================================

  const [
    gameConfig,
    setGameConfigState,
  ] = useState(() =>
    readGameConfig()
  );

  // ==========================================================
  // ROLE
  // ==========================================================

  const role =
    getStoredRole();

  // ==========================================================
  // NAVIGATION SPA
  // ==========================================================
  //
  // On utilise l'historique du navigateur pour que :
  //
  // - F5 conserve l'onglet/page
  // - Retour revienne à la page SPA précédente
  // - le navigateur ne quitte pas immédiatement 6BetBall
  //
  // ==========================================================

  const setPage = useCallback(
    (nextPage, options = {}) => {
      const normalized =
        normalizePage(
          nextPage
        );

      const {
        replace = false,
        persist = true,
      } = options;

      setPageState(
        normalized
      );

      if (persist) {
        sessionStorage.setItem(
          STORAGE_KEYS.CURRENT_PAGE,
          normalized
        );
      }

      // ------------------------------------------------------
      // Historique navigateur
      // ------------------------------------------------------

      const currentState =
        window.history.state;

      const newState = {
        ...(
          currentState &&
          typeof currentState ===
            "object"
            ? currentState
            : {}
        ),
        __6betball: true,
        page: normalized,
      };

      if (replace) {
        window.history.replaceState(
          newState,
          "",
          window.location.href
        );
      } else {
        window.history.pushState(
          newState,
          "",
          window.location.href
        );
      }
    },
    []
  );

  // ==========================================================
  // WRAPPER POUR LES CONFIGURATIONS DE JEU
  // ==========================================================

  const setGameConfig =
    useCallback(
      (config) => {
        setGameConfigState(
          config
        );

        if (config) {
          saveGameConfig(
            config
          );
        } else {
          localStorage.removeItem(
            STORAGE_KEYS.GAME_CONFIG
          );
        }
      },
      []
    );

  // ==========================================================
  // INITIALISATION NAVIGATEUR
  // ==========================================================

  useEffect(() => {
    // --------------------------------------------------------
    // Première entrée dans l'application
    // --------------------------------------------------------

    const token =
      getStoredToken();

    if (!token) {
      setIsAuth(false);

      setPageState(
        "login"
      );

      sessionStorage.removeItem(
        STORAGE_KEYS.CURRENT_PAGE
      );

      return;
    }

    setIsAuth(true);

    // --------------------------------------------------------
    // Création / remplacement de l'entrée historique
    // --------------------------------------------------------

    const initialPage =
      normalizePage(
        sessionStorage.getItem(
          STORAGE_KEYS.CURRENT_PAGE
        ) || page
      );

    const existingState =
      window.history.state;

    if (
      !existingState ||
      existingState.__6betball !== true
    ) {
      window.history.replaceState(
        {
          __6betball: true,
          page: initialPage,
        },
        "",
        window.location.href
      );
    }

    // --------------------------------------------------------
    // Synchronisation stockage
    // --------------------------------------------------------

    sessionStorage.setItem(
      STORAGE_KEYS.CURRENT_PAGE,
      initialPage
    );

    setPageState(
      initialPage
    );
  }, []);

  // ==========================================================
  // NAVIGATION BACK / FORWARD
  // ==========================================================

  useEffect(() => {
    const handlePopState =
      (event) => {
        const state =
          event.state;

        // ----------------------------------------------------
        // Historique créé par 6BetBall
        // ----------------------------------------------------

        if (
          state?.__6betball ===
          true
        ) {
          const restoredPage =
            normalizePage(
              state.page
            );

          setPageState(
            restoredPage
          );

          sessionStorage.setItem(
            STORAGE_KEYS.CURRENT_PAGE,
            restoredPage
          );

          return;
        }

        // ----------------------------------------------------
        // Si le navigateur arrive sur une entrée externe,
        // on recrée une entrée 6BetBall avant de quitter.
        //
        // Cela évite qu'un simple Back fasse sortir
        // immédiatement de l'application.
        // ----------------------------------------------------

        const currentPage =
          normalizePage(
            sessionStorage.getItem(
              STORAGE_KEYS.CURRENT_PAGE
            ) || "accueil"
          );

        window.history.pushState(
          {
            __6betball: true,
            page: currentPage,
          },
          "",
          window.location.href
        );

        setPageState(
          currentPage
        );
      };

    window.addEventListener(
      "popstate",
      handlePopState
    );

    return () => {
      window.removeEventListener(
        "popstate",
        handlePopState
      );
    };
  }, []);

  // ==========================================================
  // PERSISTANCE PAGE
  // ==========================================================

  useEffect(() => {
    if (!isAuth) {
      return;
    }

    sessionStorage.setItem(
      STORAGE_KEYS.CURRENT_PAGE,
      page
    );
  }, [
    page,
    isAuth,
  ]);

  // ==========================================================
  // VALIDATION D'UN ANCIEN MATCH
  // ==========================================================
  //
  // C'est LA correction principale du problème :
  //
  // gameConfig peut rester dans localStorage,
  // mais cela ne suffit plus à ouvrir automatiquement
  // un jeu.
  //
  // Le serveur doit confirmer que le match est actif.
  //
  // ==========================================================

  useEffect(() => {
    if (!isAuth) {
      return undefined;
    }

    const savedConfig =
      readGameConfig();

    if (!savedConfig) {
      return undefined;
    }

    const savedMatchId =
      savedConfig.matchId ??
      savedConfig.match_id ??
      savedConfig.id;

    const savedGame =
      normalizeGame(
        savedConfig.game ??
          savedConfig.gameType ??
          savedConfig.game_type
      );

    // --------------------------------------------------------
    // Pas de match identifiable
    // --------------------------------------------------------

    if (!savedMatchId) {
      localStorage.removeItem(
        STORAGE_KEYS.GAME_CONFIG
      );

      setGameConfigState(
        null
      );

      return undefined;
    }

    // --------------------------------------------------------
    // Un gameConfig existe mais la page n'est pas game
    //
    // On ne force PAS le retour au jeu.
    // --------------------------------------------------------

    if (page !== "game") {
      return undefined;
    }

    const controller =
      new AbortController();

    let mounted = true;

    const validate =
      async () => {
        const match =
          await fetchMatchStatus(
            savedMatchId,
            controller.signal
          );

        if (!mounted) {
          return;
        }

        // ----------------------------------------------------
        // Impossible de confirmer le match
        //
        // Sécurité :
        // on ne recharge pas un ancien match.
        // ----------------------------------------------------

        if (!match) {
          console.warn(
            "⚠️ Match non confirmé par le serveur. Nettoyage du gameConfig."
          );

          localStorage.removeItem(
            STORAGE_KEYS.GAME_CONFIG
          );

          setGameConfigState(
            null
          );

          setPage(
            "accueil",
            {
              replace: true,
            }
          );

          return;
        }

        // ----------------------------------------------------
        // Match actif
        // ----------------------------------------------------

        if (
          isMatchActuallyActive(
            match
          )
        ) {
          const validatedConfig =
            buildGameConfig(
              {
                ...savedConfig,
                matchId:
                  savedMatchId,
                game:
                  savedGame,
              },
              match
            );

          setGameConfigState(
            validatedConfig
          );

          saveGameConfig(
            validatedConfig
          );

          return;
        }

        // ----------------------------------------------------
        // Match terminé / annulé / expiré
        // ----------------------------------------------------

        console.log(
          "🧹 Ancien match détecté et supprimé :",
          savedMatchId
        );

        localStorage.removeItem(
          STORAGE_KEYS.GAME_CONFIG
        );

        setGameConfigState(
          null
        );

        setPage(
          "accueil",
          {
            replace: true,
          }
        );
      };

    validate();

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [
    isAuth,
    page,
    setPage,
  ]);

  // ==========================================================
  // RESET GAME
  // ==========================================================

  const resetGame =
    useCallback(() => {
      setGameConfigState(
        null
      );

      localStorage.removeItem(
        STORAGE_KEYS.GAME_CONFIG
      );

      setPage(
        "accueil"
      );
    }, [
      setPage,
    ]);

  // ==========================================================
  // LOGOUT / TOKEN DISPARITION
  // ==========================================================
  //
  // On NE fait surtout pas localStorage.clear().
  //
  // ==========================================================

  useEffect(() => {
    const checkAuth =
      () => {
        const token =
          getStoredToken();

        if (!token) {
          setIsAuth(false);
          setGameConfigState(
            null
          );

          localStorage.removeItem(
            STORAGE_KEYS.GAME_CONFIG
          );

          sessionStorage.removeItem(
            STORAGE_KEYS.CURRENT_PAGE
          );

          setPageState(
            "login"
          );
        }
      };

    window.addEventListener(
      "storage",
      checkAuth
    );

    return () => {
      window.removeEventListener(
        "storage",
        checkAuth
      );
    };
  }, []);

  // ==========================================================
  // LOGIN GUARD
  // ==========================================================

  if (
    !isAuth &&
    !PUBLIC_PAGES.has(page)
  ) {
    return (
      <>
        <GlobalAppStyles />

        <Login
          setPage={setPage}
          setIsAuth={
            (value) => {
              setIsAuth(
                value
              );

              if (value) {
                const nextPage =
                  role === "ADMIN"
                    ? "admin"
                    : "accueil";

                setPage(
                  nextPage,
                  {
                    replace: true,
                  }
                );
              }
            }
          }
        />
      </>
    );
  }

  // ==========================================================
  // SAFE GAME
  // ==========================================================

  const safeGame =
    normalizeGame(
      gameConfig?.game
    );

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <>
      <GlobalAppStyles />

      <div className="app-shell">
        {/* ==================================================
            NAVBAR
        ================================================== */}

        {page !== "login" &&
          page !== "register" && (
            <Navbar
              setPage={setPage}
            />
          )}

        {/* ==================================================
            CONTENT
        ================================================== */}

        <main
          className="app-content"
          data-page={page}
        >
          {/* ================================================
              CONDITIONS
          ================================================ */}

          {page === "terms" && (
            <TermsOfUse
              setPage={setPage}
            />
          )}

          {/* ================================================
              CONFIDENTIALITÉ
          ================================================ */}

          {page === "privacy" && (
            <PrivacyPolicy
              setPage={setPage}
            />
          )}

          {/* ================================================
              LOGIN
          ================================================ */}

          {page === "login" && (
            <Login
              setPage={setPage}
              setIsAuth={
                (value) => {
                  setIsAuth(
                    value
                  );

                  if (value) {
                    const nextPage =
                      getStoredRole() ===
                      "ADMIN"
                        ? "admin"
                        : "accueil";

                    setPage(
                      nextPage,
                      {
                        replace: true,
                      }
                    );
                  }
                }
              }
            />
          )}

          {/* ================================================
              REGISTER
          ================================================ */}

          {page === "register" && (
            <Register
              setPage={setPage}
            />
          )}

          {/* ================================================
              ACCUEIL
          ================================================ */}

          {page === "accueil" && (
            <Accueil
              setPage={setPage}
              setGameConfig={
                (config) => {
                  setGameConfig(
                    config
                  );
                }
              }
            />
          )}

          {/* ================================================
              COMPÉTITIONS
          ================================================ */}

          {page === "competition" && (
            <Competition />
          )}

          {/* ================================================
              INFOS
          ================================================ */}

          {page === "infos" && (
            <Infos />
          )}

          {/* ================================================
              MENU
          ================================================ */}

          {page === "menu" && (
            <Menu
              setPage={setPage}
            />
          )}

          {/* ================================================
              AMBASSADEUR
          ================================================ */}

          {page === "ambassade" && (
            <Ambassade />
          )}

          {/* ================================================
              CHAT
          ================================================ */}

          {page === "chat" && (
            <Chat />
          )}

          {/* ================================================
              AVIS
          ================================================ */}

          {page === "avis" && (
            <Avis />
          )}

          {/* ================================================
              ADS
          ================================================ */}

          {page === "ads" && (
            <AdsPage />
          )}

          {/* ================================================
              GAME
          ================================================ */}

          {page === "game" && (
            <>
              {!gameConfig ? (
                <div className="app-empty-state">
                  <h2>
                    ⚠️ Aucun match actif
                  </h2>

                  <button
                    type="button"
                    onClick={() =>
                      setPage(
                        "accueil"
                      )
                    }
                  >
                    Retour à l'accueil
                  </button>
                </div>
              ) : safeGame === "dames" ? (
                <Dames
                  gameConfig={
                    gameConfig
                  }
                  setPage={
                    setPage
                  }
                  resetGame={
                    resetGame
                  }
                />
              ) : safeGame === "football" ? (
                <FootballPage
                  gameConfig={
                    gameConfig
                  }
                  setPage={
                    setPage
                  }
                  resetGame={
                    resetGame
                  }
                />
              ) : safeGame === "bravman" ? (
                <BravmanPage
                  gameConfig={
                    gameConfig
                  }
                  setPage={
                    setPage
                  }
                  resetGame={
                    resetGame
                  }
                />
              ) : (
                <div className="app-empty-state">
                  <h2>
                    ⚠️ Jeu non supporté
                  </h2>

                  <p>
                    Type :{" "}
                    {safeGame ||
                      "inconnu"}
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      resetGame()
                    }
                  >
                    Retour à l'accueil
                  </button>
                </div>
              )}
            </>
          )}

          {/* ================================================
              FOOTBALL
          ================================================ */}

          {page === "football" && (
            <FootballPage
              gameConfig={
                gameConfig
              }
              setPage={
                setPage
              }
              resetGame={
                resetGame
              }
            />
          )}

          {/* ================================================
              BRAVMAN
          ================================================ */}

          {page === "bravman" && (
            <BravmanPage
              gameConfig={
                gameConfig
              }
              setPage={
                setPage
              }
              resetGame={
                resetGame
              }
            />
          )}

          {/* ================================================
              PROFILE
          ================================================ */}

          {page === "profile" && (
            <ProfileRadar />
          )}

          {/* ================================================
              ADMIN
          ================================================ */}

          {page === "admin" &&
            (getStoredRole() ===
            "ADMIN" ? (
              <AdminDashboard />
            ) : (
              <div className="app-access-denied">
                <h2>
                  ⛔ Accès refusé
                </h2>

                <button
                  type="button"
                  onClick={() =>
                    setPage(
                      "accueil"
                    )
                  }
                >
                  Retour
                </button>
              </div>
            ))}

          {/* ================================================
              WAITING MATCH
          ================================================ */}

          {page === "waiting" && (
            <WaitingMatch
              matchId={
                gameConfig?.matchId
              }
              game={
                gameConfig?.game
              }
              setPage={
                setPage
              }
              setGameConfig={
                setGameConfig
              }
            />
          )}
        </main>
      </div>
    </>
  );
}

// ============================================================
// GLOBAL RESPONSIVE STYLES
// ============================================================
//
// Ces règles ne remplacent PAS les CSS propres à chaque page.
// Elles sécurisent le conteneur global de 6BetBall.
//
// Windows desktop
// Android mobile
// tablette
// petites fenêtres
// orientation paysage
// ============================================================

function GlobalAppStyles() {
  return (
    <style>
      {`
        /* ==================================================
           RESET GLOBAL
        ================================================== */

        *,
        *::before,
        *::after {
          box-sizing: border-box;
        }

        html,
        body,
        #root {
          width: 100%;
          min-width: 0;
          min-height: 100%;
          margin: 0;
          padding: 0;
        }

        html {
          overflow-x: hidden;
          -webkit-text-size-adjust: 100%;
          text-size-adjust: 100%;
        }

        body {
          overflow-x: hidden;
          overflow-y: auto;
        }

        img,
        video,
        canvas,
        svg {
          max-width: 100%;
          height: auto;
        }

        button,
        input,
        textarea,
        select {
          max-width: 100%;
          font: inherit;
        }

        button {
          touch-action: manipulation;
        }

        /* ==================================================
           APP SHELL
        ================================================== */

        .app-shell {
          width: 100%;
          min-width: 0;
          min-height: 100vh;
          min-height: 100dvh;
          overflow-x: hidden;
          display: flex;
          flex-direction: column;
        }

        .app-content {
          width: 100%;
          min-width: 0;
          flex: 1 1 auto;
          overflow-x: hidden;
        }

        /* ==================================================
           EMPTY / ERROR STATES
        ================================================== */

        .app-empty-state,
        .app-access-denied {
          width: min(
            100% - 32px,
            700px
          );

          margin: 40px auto;
          padding: 24px;

          text-align: center;

          border-radius: 16px;
          background: rgba(
            128,
            128,
            128,
            0.08
          );
        }

        .app-empty-state button,
        .app-access-denied button {
          min-height: 44px;
          padding: 10px 18px;
          margin-top: 12px;

          border: 0;
          border-radius: 10px;

          cursor: pointer;
        }

        /* ==================================================
           WAITING MATCH
        ================================================== */

        .app-waiting {
          width: 100%;
          min-height: 60vh;

          display: flex;
          align-items: center;
          justify-content: center;

          padding: 24px 16px;
        }

        .app-waiting-card {
          width: min(
            100%,
            520px
          );

          padding: 28px 22px;

          text-align: center;

          border-radius: 18px;
          background: rgba(
            128,
            128,
            128,
            0.08
          );

          overflow-wrap: anywhere;
        }

        .app-waiting-icon {
          font-size: clamp(
            36px,
            8vw,
            64px
          );

          margin-bottom: 8px;
        }

        .app-waiting h2 {
          margin: 8px 0 14px;
          font-size: clamp(
            20px,
            4vw,
            30px
          );
        }

        .app-waiting p {
          margin: 8px 0;
          line-height: 1.5;
        }

        .app-error {
          margin-top: 18px !important;
          font-weight: 600;
        }

        /* ==================================================
           TABLET
        ================================================== */

        @media (max-width: 900px) {
          .app-waiting {
            padding: 20px 14px;
          }

          .app-empty-state,
          .app-access-denied {
            width: min(
              calc(100% - 28px),
              650px
            );

            margin-top: 28px;
          }
        }

        /* ==================================================
           MOBILE
        ================================================== */

        @media (max-width: 600px) {
          .app-waiting {
            min-height: 55vh;
            padding: 18px 12px;
          }

          .app-waiting-card {
            padding: 24px 16px;
            border-radius: 14px;
          }

          .app-empty-state,
          .app-access-denied {
            width: calc(
              100% - 24px
            );

            margin: 20px auto;
            padding: 20px 14px;
            border-radius: 14px;
          }
        }

        /* ==================================================
           PETITS TÉLÉPHONES
        ================================================== */

        @media (max-width: 380px) {
          .app-waiting {
            padding: 14px 8px;
          }

          .app-waiting-card {
            padding: 20px 12px;
          }

          .app-empty-state,
          .app-access-denied {
            width: calc(
              100% - 16px
            );

            padding: 16px 10px;
          }
        }

        /* ==================================================
           MOBILE LANDSCAPE
        ================================================== */

        @media (
          max-height: 500px
        ) and (
          orientation: landscape
        ) {
          .app-waiting {
            min-height: auto;
            padding: 16px 12px;
          }

          .app-waiting-card {
            padding: 16px;
          }
        }

        /* ==================================================
           TOUCH DEVICES
        ================================================== */

        @media (
          pointer: coarse
        ) {
          button,
          [role="button"] {
            min-height: 42px;
          }

          input,
          select,
          textarea {
            min-height: 42px;
          }
        }

        /* ==================================================
           SAFE AREA ANDROID / IOS
        ================================================== */

        @supports (
          padding: env(
            safe-area-inset-bottom
          )
        ) {
          .app-shell {
            padding-bottom: env(
              safe-area-inset-bottom
            );
          }
        }

        /* ==================================================
           ACCESSIBILITÉ
        ================================================== */

        @media (
          prefers-reduced-motion: reduce
        ) {
          *,
          *::before,
          *::after {
            scroll-behavior: auto !important;
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}
    </style>
  );
}
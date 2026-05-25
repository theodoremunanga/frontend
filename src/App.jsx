import { useState, useEffect } from "react";
import { io } from "socket.io-client";

import AdminDashboard from "./components/AdminDashboard";
import Navbar from "./components/Navbar";

import Accueil from "./pages/Accueil";
import Competition from "./pages/Competitions";
import Infos from "./pages/Infos";
import Menu from "./pages/Menu";
import Dames from "./pages/Dames";

import Login from "./pages/Login";
import Register from "./pages/Register";

import ProfileRadar from "./components/Profile/ProfileRadar";
import AdsPage from "./pages/AdsPage";
import SponsoredBanner from "./components/ads/SponsoredBanner";

// ✅ MESSAGE PAGE
import Messages from "./pages/Messages";

// =========================
// ⏳ WAITING MATCH
// =========================
function WaitingMatch({
  matchId,
  setPage,
  setGameConfig,
}) {
  useEffect(() => {
    if (!matchId) return;

    const token =
      localStorage.getItem("token");

    const checkMatch =
      async () => {
        try {
          const res =
            await fetch(
              `http://localhost:3000/api/match/${matchId}`,
              {
                headers: {
                  Authorization:
                    "Bearer " +
                    token,
                },
              }
            );

          const data =
            await res.json();

          if (!res.ok) return;

          const match =
            data.match;

          // ✅ MATCH STARTED
          if (
            match?.status ===
            "playing"
          ) {
            const updated = {
              matchId,
              game: "dames",
            };

            setGameConfig(
              updated
            );

            localStorage.setItem(
              "gameConfig",
              JSON.stringify(
                updated
              )
            );

            setPage("game");
          }
        } catch (err) {
          console.error(
            "Waiting error:",
            err
          );
        }
      };

    // ✅ instant check
    checkMatch();

    // ✅ polling
    const interval =
      setInterval(
        checkMatch,
        2000
      );

    return () =>
      clearInterval(interval);
  }, [
    matchId,
    setPage,
    setGameConfig,
  ]);

  return (
    <div
      style={{
        textAlign: "center",
        marginTop: 50,
      }}
    >
      <h2>
        ⏳ Défi en attente
      </h2>

      <p>
        Match ID: {matchId}
      </p>

      <p>
        En attente d’un
        joueur...
      </p>
    </div>
  );
}

// =========================
// 🧠 APP
// =========================
export default function App() {
  // =========================
  // STATES
  // =========================

  const [page, setPage] =
    useState("login");

  const [isAuth, setIsAuth] =
    useState(false);

  const [
    gameConfig,
    setGameConfig,
  ] = useState(null);

  // =========================
  // ROLE
  // =========================

  const role = (
    localStorage.getItem(
      "role"
    ) || ""
  ).toUpperCase();

  // =========================
  // 🔄 INIT
  // =========================

  useEffect(() => {
    const token =
      localStorage.getItem(
        "token"
      );

    if (
      token &&
      token !== "undefined" &&
      token !== "null"
    ) {
      setIsAuth(true);

      // ✅ reset auto game
      localStorage.removeItem(
        "gameConfig"
      );

      setGameConfig(null);

      setPage(
        role === "ADMIN"
          ? "admin"
          : "accueil"
      );
    } else {
      localStorage.clear();

      setPage("login");
    }
  }, [role]);

  // =========================
  // 🧹 RESET GAME
  // =========================

  const resetGame = () => {
    setGameConfig(null);

    localStorage.removeItem(
      "gameConfig"
    );

    setPage("accueil");
  };

  // =========================
  // 🔐 LOGIN GUARD
  // =========================

  if (
    !isAuth &&
    page !== "register"
  ) {
    return (
      <Login
        setPage={setPage}
        setIsAuth={setIsAuth}
      />
    );
  }

  // =========================
  // SAFE GAME
  // =========================

  const safeGame =
    gameConfig?.game
      ? String(
          gameConfig.game
        )
          .toLowerCase()
          .trim()
      : null;

  // =========================
  // UI
  // =========================

  return (
    <div>
      {/* =========================
          🔝 NAVBAR
      ========================= */}

      {page !== "login" &&
        page !==
          "register" && (
          <Navbar
            setPage={setPage}
          />
        )}

      {/* =========================
          🔐 AUTH
      ========================= */}

      {page === "login" && (
        <Login
          setPage={setPage}
          setIsAuth={setIsAuth}
        />
      )}

      {page ===
        "register" && (
        <Register
          setPage={setPage}
        />
      )}

      {/* =========================
          🏠 ACCUEIL
      ========================= */}

      {page ===
        "accueil" && (
        <Accueil
          setPage={setPage}
          setGameConfig={(
            config
          ) => {
            setGameConfig(
              config
            );

            localStorage.setItem(
              "gameConfig",
              JSON.stringify(
                config
              )
            );
          }}
        />
      )}

      {/* =========================
          🏆 COMPÉTITIONS
      ========================= */}

      {page ===
        "competition" && (
        <Competition />
      )}

      {/* =========================
          ℹ️ INFOS
      ========================= */}

      {page === "infos" && (
        <Infos />
      )}

      {/* =========================
          📋 MENU
      ========================= */}

      {page === "menu" && (
        <Menu
          setPage={setPage}
        />
      )}

      {/* =========================
          📩 MESSAGES
      ========================= */}

      {page ===
        "messages" && (
        <Messages />
      )}

      {/* =========================
          📢 ADS PAGE
      ========================= */}

      {page === "ads" && (
        <AdsPage />
      )}

      {/* =========================
          ⏳ WAITING MATCH
      ========================= */}

      {page === "waiting" &&
        gameConfig && (
          <WaitingMatch
            matchId={
              gameConfig.matchId
            }
            setPage={setPage}
            setGameConfig={
              setGameConfig
            }
          />
        )}

      {/* =========================
          🎮 GAME
      ========================= */}

      {page === "game" && (
        <>
          {!gameConfig ? (
            <div
              style={{
                textAlign:
                  "center",
                marginTop: 50,
              }}
            >
              <h2>
                ⚠️ Aucun match
                actif
              </h2>
            </div>
          ) : safeGame ===
            "dames" ? (
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
          ) : (
            <div
              style={{
                textAlign:
                  "center",
                marginTop: 50,
              }}
            >
              <h2>
                ⚠️ Jeu non
                supporté
              </h2>

              <p>
                Type:{" "}
                {safeGame}
              </p>
            </div>
          )}
        </>
      )}

      {/* =========================
          👤 PROFILE
      ========================= */}

      {page ===
        "profile" && (
        <ProfileRadar />
      )}

      {/* =========================
          🛡️ ADMIN
      ========================= */}

      {page === "admin" &&
        (role === "ADMIN" ? (
          <AdminDashboard />
        ) : (
          <h2>
            ⛔ Accès refusé
          </h2>
        ))}
    </div>
  );
}
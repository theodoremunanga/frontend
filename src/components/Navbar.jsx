import {
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";

import logo from "../assets/logo.png";

// ======================================================
// CONFIG
// ======================================================

const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error("❌ VITE_API_URL is missing");
}

// ------------------------------------------------------
// Le polling reste uniquement un filet de sécurité.
// La mise à jour normale du solde doit passer par
// l'événement "wallet:updated" dès qu'une opération
// modifie réellement le portefeuille.
// ------------------------------------------------------

const FALLBACK_REFRESH_INTERVAL = 5000;

// ======================================================
// NAVIGATION
// ======================================================

const NAV_ITEMS = [
  {
    id: "accueil",
    
    icon: "🏠",
  },
  {
    id: "competition",
    
    icon: "🏆",
  },
  {
    id: "infos",
    
    icon: "🔔",
  },
  {
    id: "menu",
    
    icon: "☰",
  },
  {
    id: "profile",
    
    icon: "👤",
  },
];

// ======================================================
// HELPERS
// ======================================================

function getStoredToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken")
  );
}

function normalizeBalance(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  return numericValue;
}

function formatBalance(value) {
  return normalizeBalance(value).toLocaleString("fr-FR");
}

// ======================================================
// COMPONENT
// ======================================================

export default function Navbar({ setPage }) {
  // ====================================================
  // STATES
  // ====================================================

  const [active, setActive] = useState("accueil");

  const [balance, setBalance] = useState(0);

  const [loading, setLoading] = useState(false);

  const [isOffline, setIsOffline] = useState(false);

  // ====================================================
  // REFS
  // ====================================================

  const mountedRef = useRef(true);

  const loadingRef = useRef(false);

  const intervalRef = useRef(null);

  const broadcastChannelRef = useRef(null);

  // ====================================================
  // SET BALANCE SAFELY
  // ====================================================

  const updateBalance = useCallback((nextBalance) => {
    if (!mountedRef.current) {
      return;
    }

    setBalance(normalizeBalance(nextBalance));
  }, []);

  // ====================================================
  // LOAD WALLET
  // ====================================================

  const loadWallet = useCallback(
    async ({ silent = false } = {}) => {
      try {
        // ------------------------------------------------
        // Évite plusieurs requêtes simultanées.
        // ------------------------------------------------

        if (loadingRef.current) {
          return;
        }

        // ------------------------------------------------
        // Offline
        // ------------------------------------------------

        if (!navigator.onLine) {
          if (mountedRef.current) {
            setIsOffline(true);
          }

          return;
        }

        if (mountedRef.current) {
          setIsOffline(false);
        }

        // ------------------------------------------------
        // Token
        // ------------------------------------------------

        const token = getStoredToken();

        if (!token) {
          updateBalance(0);
          return;
        }

        // ------------------------------------------------
        // Loading uniquement pour le chargement initial.
        // Les refresh silencieux ne doivent pas faire
        // clignoter le portefeuille.
        // ------------------------------------------------

        loadingRef.current = true;

        if (!silent && mountedRef.current) {
          setLoading(true);
        }

        // ------------------------------------------------
        // Request
        // ------------------------------------------------

        const controller = new AbortController();

        const timeout = setTimeout(() => {
          controller.abort();
        }, 10000);

        let res;

        try {
          res = await fetch(`${API_URL}/wallet/me`, {
            method: "GET",

            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },

            cache: "no-store",

            signal: controller.signal,
          });
        } finally {
          clearTimeout(timeout);
        }

        // ------------------------------------------------
        // Unauthorized
        // ------------------------------------------------

        if (res.status === 401) {
          console.warn("⚠️ Session expirée");

          localStorage.removeItem("token");
          localStorage.removeItem("accessToken");

          updateBalance(0);

          return;
        }

        // ------------------------------------------------
        // Server error
        // ------------------------------------------------

        if (!res.ok) {
          console.error(
            "❌ Wallet request failed:",
            res.status
          );

          return;
        }

        // ------------------------------------------------
        // Response
        // ------------------------------------------------

        const data = await res.json();

        // ------------------------------------------------
        // Compatible avec plusieurs formats backend.
        // ------------------------------------------------

        const nextBalance =
          data?.balance ??
          data?.wallet?.balance ??
          data?.data?.balance ??
          0;

        updateBalance(nextBalance);
      } catch (err) {
        // Abort = timeout volontaire.
        if (err?.name !== "AbortError") {
          console.error(
            "❌ Wallet error:",
            err?.message || err
          );
        }

        if (mountedRef.current && !navigator.onLine) {
          setIsOffline(true);
        }
      } finally {
        loadingRef.current = false;

        if (mountedRef.current) {
          setLoading(false);
        }
      }
    },
    [updateBalance]
  );

  // ====================================================
  // INITIAL LOAD
  // ====================================================

  useEffect(() => {
    mountedRef.current = true;

    loadWallet();

    return () => {
      mountedRef.current = false;
    };
  }, [loadWallet]);

  // ====================================================
  // INSTANT WALLET EVENTS
  // ====================================================
  //
  // Lorsqu'une autre partie de l'application modifie
  // le solde, elle peut simplement faire :
  //
  // window.dispatchEvent(
  //   new CustomEvent("wallet:updated", {
  //     detail: { balance: nouveauSolde }
  //   })
  // );
  //
  // Le Navbar se met alors à jour immédiatement,
  // sans attendre une nouvelle requête.
  // ====================================================

  useEffect(() => {
    const handleWalletUpdated = (event) => {
      const nextBalance =
        event?.detail?.balance ??
        event?.detail?.wallet?.balance ??
        event?.detail?.amount;

      if (
        nextBalance !== undefined &&
        nextBalance !== null
      ) {
        updateBalance(nextBalance);
      }

      // Si seul un signal de changement est envoyé,
      // on récupère immédiatement la valeur serveur.
      if (
        nextBalance === undefined ||
        nextBalance === null
      ) {
        loadWallet({ silent: true });
      }
    };

    window.addEventListener(
      "wallet:updated",
      handleWalletUpdated
    );

    return () => {
      window.removeEventListener(
        "wallet:updated",
        handleWalletUpdated
      );
    };
  }, [loadWallet, updateBalance]);

  // ====================================================
  // BROADCAST CHANNEL
  // ====================================================
  //
  // Permet de synchroniser plusieurs onglets du navigateur.
  // ====================================================

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof BroadcastChannel === "undefined"
    ) {
      return undefined;
    }

    const channel = new BroadcastChannel(
      "6betball-wallet"
    );

    broadcastChannelRef.current = channel;

    const handleMessage = (event) => {
      const data = event?.data;

      if (!data) {
        return;
      }

      if (data.type === "wallet:updated") {
        if (
          data.balance !== undefined &&
          data.balance !== null
        ) {
          updateBalance(data.balance);
        } else {
          loadWallet({ silent: true });
        }
      }
    };

    channel.addEventListener(
      "message",
      handleMessage
    );

    return () => {
      channel.removeEventListener(
        "message",
        handleMessage
      );

      channel.close();

      broadcastChannelRef.current = null;
    };
  }, [loadWallet, updateBalance]);

  // ====================================================
  // STORAGE EVENT
  // ====================================================

  useEffect(() => {
    const handleStorage = (event) => {
      // Une autre fenêtre / un autre onglet a changé
      // le token.
      if (
        event.key === "token" ||
        event.key === "accessToken"
      ) {
        loadWallet({ silent: true });
        return;
      }

      // Certaines parties de l'application peuvent
      // également stocker directement le dernier solde.
      if (
        event.key === "wallet_balance" &&
        event.newValue !== null
      ) {
        updateBalance(event.newValue);
      }

      // Signal générique.
      if (event.key === "wallet_updated") {
        loadWallet({ silent: true });
      }
    };

    window.addEventListener(
      "storage",
      handleStorage
    );

    return () => {
      window.removeEventListener(
        "storage",
        handleStorage
      );
    };
  }, [loadWallet, updateBalance]);

  // ====================================================
  // FALLBACK REFRESH
  // ====================================================
  //
  // Le Navbar ne dépend plus d'un refresh à 60 secondes.
  //
  // Le système événementiel fait la mise à jour immédiate.
  // Ce polling sert uniquement de sécurité si une opération
  // externe ne déclenche aucun événement frontend.
  // ====================================================

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      if (document.hidden) {
        return;
      }

      loadWallet({ silent: true });
    }, FALLBACK_REFRESH_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [loadWallet]);

  // ====================================================
  // WINDOW FOCUS / VISIBILITY
  // ====================================================

  useEffect(() => {
    const refresh = () => {
      if (!document.hidden) {
        loadWallet({ silent: true });
      }
    };

    const handleFocus = () => {
      refresh();
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refresh();
      }
    };

    window.addEventListener(
      "focus",
      handleFocus
    );

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () => {
      window.removeEventListener(
        "focus",
        handleFocus
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
    };
  }, [loadWallet]);

  // ====================================================
  // ONLINE / OFFLINE
  // ====================================================

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);

      loadWallet({ silent: true });
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener(
      "online",
      handleOnline
    );

    window.addEventListener(
      "offline",
      handleOffline
    );

    return () => {
      window.removeEventListener(
        "online",
        handleOnline
      );

      window.removeEventListener(
        "offline",
        handleOffline
      );
    };
  }, [loadWallet]);

  // ====================================================
  // NAVIGATION
  // ====================================================

  const handleNav = useCallback(
    (page) => {
      setActive(page);

      if (setPage) {
        setPage(page);
      }
    },
    [setPage]
  );

  // ====================================================
  // RENDER
  // ====================================================

  return (
    <header className="sixbetball-navbar">
      <div className="sixbetball-navbar__inner">

        {/* ==============================================
            LOGO
        ============================================== */}

        <button
          type="button"
          className="sixbetball-navbar__logo"
          onClick={() => handleNav("accueil")}
          aria-label="Accueil 6BetBall"
        >
          <img
            src={logo}
            alt="6BetBall"
            className="sixbetball-navbar__logo-image"
          />

          <span className="sixbetball-navbar__logo-text">
            6BetBall
          </span>
        </button>

        {/* ==============================================
            NAVIGATION
        ============================================== */}

        <nav
          className="sixbetball-navbar__navigation"
          aria-label="Navigation principale"
        >
          <div className="sixbetball-navbar__navigation-list">
            {NAV_ITEMS.map((item) => {
              const isActive = active === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  className={`sixbetball-navbar__nav-button ${
                    isActive
                      ? "sixbetball-navbar__nav-button--active"
                      : ""
                  }`}
                  onClick={() =>
                    handleNav(item.id)
                  }
                  title={item.label}
                  aria-label={item.label}
                  aria-current={
                    isActive
                      ? "page"
                      : undefined
                  }
                >
                  <span
                    className="sixbetball-navbar__nav-icon"
                    aria-hidden="true"
                  >
                    {item.icon}
                  </span>

                  <span className="sixbetball-navbar__nav-label">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* ==============================================
            DESKTOP RIGHT SIDE
        ============================================== */}

        <div className="sixbetball-navbar__right">

          {/* ----------------------------------------------
              DOWNLOAD
          ---------------------------------------------- */}

          <button
            type="button"
            className="sixbetball-navbar__download"
            onClick={() =>
              window.open(
                "https://backend-ad3t.onrender.com/downloads/6BetBall.apk",
                "_blank",
                "noopener,noreferrer"
              )
            }
            aria-label="Télécharger 6BetBall"
          >
            <span aria-hidden="true">
              📱⬇️
            </span>

            <span>
              Télécharger
            </span>
          </button>

          {/* ----------------------------------------------
              WALLET
          ---------------------------------------------- */}

          <div
            className="sixbetball-navbar__wallet"
            title="Solde du portefeuille"
            aria-label={`Solde : ${formatBalance(
              balance
            )} CDF`}
          >
            {isOffline ? (
              <span className="sixbetball-navbar__wallet-offline">
                🔴 Hors ligne
              </span>
            ) : loading ? (
              <span className="sixbetball-navbar__wallet-loading">
                ⏳ ...
              </span>
            ) : (
              <>
                <span aria-hidden="true">
                  💰
                </span>

                <span>
                  {formatBalance(balance)}
                </span>

                <span>
                  CDF
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

// ======================================================
// STYLES
// ======================================================
//
// Le Navbar est volontairement dans le flux normal.
//
// IMPORTANT :
// - PAS de position: fixed
// - PAS de position: absolute
// - PAS de z-index gigantesque
//
// Ainsi le contenu de chaque page commence après le
// Navbar et aucune page ne passe derrière lui.
// ======================================================

const styleId =
  "sixbetball-navbar-styles";

if (
  typeof document !== "undefined" &&
  !document.getElementById(styleId)
) {
  const style = document.createElement("style");

  style.id = styleId;

  style.textContent = `
    /* ==================================================
       ROOT NAVBAR
    ================================================== */

    .sixbetball-navbar {
      position: relative;
      width: 100%;
      flex: 0 0 auto;

      background:
        linear-gradient(
          180deg,
          rgba(15, 23, 42, 0.98),
          rgba(15, 23, 42, 0.94)
        );

      color: #ffffff;

      border-bottom:
        1px solid rgba(255, 255, 255, 0.08);

      box-sizing: border-box;

      isolation: isolate;
    }

    /* ==================================================
       INNER
    ================================================== */

    .sixbetball-navbar__inner {
      width: 100%;
      max-width: 100%;

      min-height: 70px;

      display: flex;
      align-items: center;

      gap: 14px;

      padding:
        10px 16px;

      box-sizing: border-box;
    }

    /* ==================================================
       LOGO
    ================================================== */

    .sixbetball-navbar__logo {
      flex: 0 0 auto;

      display: flex;
      align-items: center;

      gap: 10px;

      min-width: 145px;

      padding: 0;

      border: 0;

      background: transparent;

      color: #ffffff;

      cursor: pointer;

      font: inherit;

      text-align: left;
    }

    .sixbetball-navbar__logo-image {
      width: 40px;
      height: 40px;

      flex: 0 0 40px;

      border-radius: 10px;

      object-fit: cover;

      display: block;
    }

    .sixbetball-navbar__logo-text {
      font-size: 17px;

      font-weight: 800;

      letter-spacing: 0.2px;

      white-space: nowrap;
    }

    /* ==================================================
       NAVIGATION
    ================================================== */

    .sixbetball-navbar__navigation {
      flex: 1 1 auto;

      min-width: 0;

      display: flex;
      align-items: center;

      justify-content: center;
    }

    .sixbetball-navbar__navigation-list {
      width: 100%;

      display: flex;
      align-items: center;
      justify-content: center;

      gap: 8px;

      min-width: 0;
    }

    /* ==================================================
       NAV BUTTON
    ================================================== */

    .sixbetball-navbar__nav-button {
      flex: 0 1 auto;

      min-width: 82px;
      min-height: 46px;

      padding:
        7px 12px;

      border: 0;

      border-radius: 12px;

      background:
        rgba(30, 41, 59, 0.95);

      color: #ffffff;

      cursor: pointer;

      display: inline-flex;
      align-items: center;
      justify-content: center;

      gap: 7px;

      font: inherit;

      box-sizing: border-box;

      transition:
        background 0.18s ease,
        transform 0.18s ease,
        box-shadow 0.18s ease;
    }

    .sixbetball-navbar__nav-button:hover {
      background:
        rgba(51, 65, 85, 0.98);

      transform:
        translateY(-1px);
    }

    .sixbetball-navbar__nav-button:focus-visible {
      outline:
        2px solid #60a5fa;

      outline-offset: 2px;
    }

    .sixbetball-navbar__nav-button--active {
      background:
        linear-gradient(
          90deg,
          #2563eb,
          #7c3aed
        );

      box-shadow:
        0 6px 18px
        rgba(37, 99, 235, 0.25);
    }

    .sixbetball-navbar__nav-button--active:hover {
      background:
        linear-gradient(
          90deg,
          #2563eb,
          #7c3aed
        );

      transform:
        translateY(-1px);
    }

    /* ==================================================
       NAV ICON
    ================================================== */

    .sixbetball-navbar__nav-icon {
      display: inline-flex;

      align-items: center;
      justify-content: center;

      font-size: 20px;

      line-height: 1;
    }

    /* ==================================================
       NAV LABEL
    ================================================== */

    .sixbetball-navbar__nav-label {
      font-size: 13px;

      font-weight: 700;

      line-height: 1;

      white-space: nowrap;
    }

    /* ==================================================
       RIGHT SECTION
    ================================================== */

    .sixbetball-navbar__right {
      flex: 0 0 auto;

      display: flex;

      align-items: center;

      gap: 10px;
    }

    /* ==================================================
       DOWNLOAD
    ================================================== */

    .sixbetball-navbar__download {
      min-height: 44px;

      padding:
        9px 14px;

      border: 0;

      border-radius: 10px;

      background:
        linear-gradient(
          90deg,
          #22c55e,
          #16a34a
        );

      color: #ffffff;

      cursor: pointer;

      display: inline-flex;

      align-items: center;
      justify-content: center;

      gap: 6px;

      font: inherit;

      font-size: 13px;

      font-weight: 800;

      white-space: nowrap;

      transition:
        transform 0.18s ease,
        box-shadow 0.18s ease;
    }

    .sixbetball-navbar__download:hover {
      transform:
        translateY(-1px);

      box-shadow:
        0 5px 15px
        rgba(34, 197, 94, 0.22);
    }

    .sixbetball-navbar__download:focus-visible {
      outline:
        2px solid #86efac;

      outline-offset: 2px;
    }

    /* ==================================================
       WALLET
    ================================================== */

    .sixbetball-navbar__wallet {
      min-width: 145px;

      min-height: 44px;

      padding:
        8px 13px;

      border:
        1px solid rgba(255, 255, 255, 0.07);

      border-radius: 10px;

      background:
        rgba(30, 41, 59, 0.95);

      box-sizing: border-box;

      display: inline-flex;

      align-items: center;
      justify-content: center;

      gap: 5px;

      font-size: 14px;

      font-weight: 800;

      white-space: nowrap;
    }

    .sixbetball-navbar__wallet-offline {
      color: #ef4444;
    }

    .sixbetball-navbar__wallet-loading {
      opacity: 0.75;
    }

    /* ==================================================
       LARGE DESKTOP
    ================================================== */

    @media (min-width: 1400px) {
      .sixbetball-navbar__inner {
        padding-left: 24px;
        padding-right: 24px;
      }

      .sixbetball-navbar__navigation-list {
        gap: 12px;
      }

      .sixbetball-navbar__nav-button {
        min-width: 105px;
      }
    }

    /* ==================================================
       SMALL DESKTOP / TABLET LANDSCAPE
    ================================================== */

    @media (max-width: 1150px) {
      .sixbetball-navbar__inner {
        gap: 8px;
        padding-left: 10px;
        padding-right: 10px;
      }

      .sixbetball-navbar__logo {
        min-width: 125px;
      }

      .sixbetball-navbar__logo-text {
        font-size: 16px;
      }

      .sixbetball-navbar__nav-button {
        min-width: 70px;
        padding-left: 8px;
        padding-right: 8px;
      }

      .sixbetball-navbar__nav-label {
        font-size: 12px;
      }

      .sixbetball-navbar__wallet {
        min-width: 125px;
        font-size: 13px;
      }

      .sixbetball-navbar__download {
        padding-left: 10px;
        padding-right: 10px;
      }
    }

    /* ==================================================
       TABLET / MOBILE
    ================================================== */

    @media (max-width: 768px) {
      /*
       * MOBILE :
       * uniquement les 5 onglets.
       *
       * Logo, téléchargement et portefeuille
       * disparaissent complètement.
       */

      .sixbetball-navbar__inner {
        min-height: 68px;

        padding:
          7px 8px;

        gap: 0;
      }

      .sixbetball-navbar__logo,
      .sixbetball-navbar__right {
        display: none;
      }

      .sixbetball-navbar__navigation {
        width: 100%;
        flex: 1 1 100%;

        justify-content: stretch;
      }

      .sixbetball-navbar__navigation-list {
        width: 100%;

        gap: 4px;

        justify-content: space-between;
      }

      .sixbetball-navbar__nav-button {
        flex: 1 1 20%;

        min-width: 0;

        min-height: 54px;

        padding:
          5px 3px;

        border-radius: 11px;

        flex-direction: column;

        gap: 4px;
      }

      .sixbetball-navbar__nav-icon {
        font-size: 20px;
      }

      .sixbetball-navbar__nav-label {
        font-size: 10px;

        font-weight: 800;
      }
    }

    /* ==================================================
       PETITS MOBILES
    ================================================== */

    @media (max-width: 380px) {
      .sixbetball-navbar__inner {
        padding-left: 5px;
        padding-right: 5px;
      }

      .sixbetball-navbar__navigation-list {
        gap: 2px;
      }

      .sixbetball-navbar__nav-button {
        min-height: 52px;

        border-radius: 9px;
      }

      .sixbetball-navbar__nav-icon {
        font-size: 18px;
      }

      .sixbetball-navbar__nav-label {
        font-size: 9px;
      }
    }

    /* ==================================================
       REDUCED MOTION
    ================================================== */

    @media (prefers-reduced-motion: reduce) {
      .sixbetball-navbar__nav-button,
      .sixbetball-navbar__download {
        transition: none;
      }
    }
  `;

  document.head.appendChild(style);
}

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

const REFRESH_INTERVAL = 60000;

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

  const intervalRef = useRef(null);

  const mountedRef = useRef(true);

  const loadingRef = useRef(false);

  // ====================================================
  // LOAD WALLET
  // ====================================================

  const loadWallet = useCallback(async () => {
    try {
      // ----------------------------------------------
      // Already loading
      // ----------------------------------------------

      if (loadingRef.current) {
        return;
      }

      // ----------------------------------------------
      // Offline
      // ----------------------------------------------

      if (!navigator.onLine) {
        setIsOffline(true);
        return;
      }

      setIsOffline(false);

      // ----------------------------------------------
      // Token
      // ----------------------------------------------

      const token = localStorage.getItem("token");

      if (!token) {
        setBalance(0);
        return;
      }

      // ----------------------------------------------
      // Request
      // ----------------------------------------------

      loadingRef.current = true;

      setLoading(true);

      const res = await fetch(
        `${API_URL}/wallet/me`,
        {
          method: "GET",

          headers: {
            Authorization: `Bearer ${token}`,

            "Content-Type": "application/json",
          },
        }
      );

      // ----------------------------------------------
      // Unauthorized
      // ----------------------------------------------

      if (res.status === 401) {
        console.warn("⚠️ Session expirée");

        localStorage.removeItem("token");

        setBalance(0);

        return;
      }

      // ----------------------------------------------
      // Server error
      // ----------------------------------------------

      if (!res.ok) {
        console.error(
          "❌ Wallet request failed:",
          res.status
        );

        return;
      }

      // ----------------------------------------------
      // Response
      // ----------------------------------------------

      const data = await res.json();

      if (mountedRef.current) {
        setBalance(data?.balance || 0);
      }
    } catch (err) {
      console.error(
        "❌ Wallet error:",
        err?.message || err
      );

      setIsOffline(true);
    } finally {
      loadingRef.current = false;

      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

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
  // AUTO REFRESH
  // ====================================================

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      if (document.hidden) {
        return;
      }

      loadWallet();
    }, REFRESH_INTERVAL);

    return () => {
      clearInterval(intervalRef.current);
    };
  }, [loadWallet]);

  // ====================================================
  // WINDOW FOCUS
  // ====================================================

  useEffect(() => {
    const handleFocus = () => {
      loadWallet();
    };

    window.addEventListener(
      "focus",
      handleFocus
    );

    return () => {
      window.removeEventListener(
        "focus",
        handleFocus
      );
    };
  }, [loadWallet]);

  // ====================================================
  // ONLINE / OFFLINE
  // ====================================================

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);

      loadWallet();
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
  // FORMAT BALANCE
  // ====================================================

  const formatBalance = (value) => {
    return Number(value || 0).toLocaleString(
      "fr-FR"
    );
  };

  // ====================================================
  // NAVIGATION
  // ====================================================

  const navItems = [
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

  // ====================================================
  // HANDLE NAVIGATION
  // ====================================================

  const handleNav = (page) => {
    setActive(page);

    if (setPage) {
      setPage(page);
    }
  };

  // ====================================================
  // RENDER
  // ====================================================

  return (
    <header style={navbar}>
      {/* ==================================================
          MAIN NAVBAR
      ================================================== */}

      <div style={navbarInner}>

        {/* ==================================================
            LOGO
        ================================================== */}

        <button
          type="button"
          style={logoSection}
          onClick={() => handleNav("accueil")}
          aria-label="Accueil 6BetBall"
        >
          <img
            src={logo}
            alt="6BetBall"
            style={logoStyle}
          />

          <span style={logoText}>
            6BetBall
          </span>
        </button>

        {/* ==================================================
            HORIZONTAL NAVIGATION
        ================================================== */}

        <nav
          style={navigationWrapper}
          aria-label="Navigation principale"
        >
          <div style={navigation}>
            {navItems.map((item) => {
              const isActive =
                active === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
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
                  style={{
                    ...navButton,

                    ...(isActive
                      ? activeStyle
                      : {}),
                  }}
                >
                  <span
                    style={navIcon}
                  >
                    {item.icon}
                  </span>

                  <span
                    style={navLabel}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* ==================================================
            RIGHT SIDE
        ================================================== */}

        <div style={rightSection}>

          {/* ==================================================
              DOWNLOAD
          ================================================== */}

          <button
            type="button"
            style={downloadButton}
            onClick={() =>
              window.open(
                "https://backend-ad3t.onrender.com/downloads/6BetBall.apk",
                "_blank",
                "noopener,noreferrer"
              )
            }
          >
            📱⬇️
            <span>
              Télécharger
            </span>
          </button>

          {/* ==================================================
              WALLET
          ================================================== */}

          <div
            style={wallet}
            title="Solde du portefeuille"
          >
            {isOffline ? (
              <span
                style={{
                  color: "#ef4444",
                }}
              >
                🔴 Hors ligne
              </span>
            ) : loading ? (
              "⏳ ..."
            ) : (
              <>
                💰{" "}
                {formatBalance(
                  balance
                )}{" "}
                CDF
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

const navbar = {
  position: "fixed",

  top: 0,

  left: 0,

  right: 0,

  width: "100%",

  height: 70,

  background:
    "rgba(15, 23, 42, 0.92)",

  backdropFilter:
    "blur(12px)",

  WebkitBackdropFilter:
    "blur(12px)",

  borderBottom:
    "1px solid rgba(255,255,255,0.05)",

  zIndex: 9999,

  color: "white",

  boxSizing: "border-box",

  overflow: "hidden",
};

// ======================================================
// INNER
// ======================================================

const navbarInner = {
  width: "100%",

  height: "100%",

  display: "flex",

  alignItems: "center",

  gap: 12,

  padding:
    "0 16px",

  boxSizing: "border-box",

  minWidth: 0,
};

// ======================================================
// LOGO
// ======================================================

const logoSection = {
  flexShrink: 0,

  display: "flex",

  alignItems: "center",

  gap: 10,

  border: "none",

  background: "transparent",

  color: "white",

  cursor: "pointer",

  padding: 0,

  minWidth: 145,
};

const logoStyle = {
  width: 40,

  height: 40,

  borderRadius: 10,

  objectFit: "cover",

  flexShrink: 0,
};

const logoText = {
  fontWeight: "bold",

  fontSize: 17,

  whiteSpace: "nowrap",
};

// ======================================================
// NAVIGATION WRAPPER
// ======================================================

const navigationWrapper = {
  flex: "1 1 auto",

  minWidth: 0,

  overflowX: "auto",

  overflowY: "hidden",

  WebkitOverflowScrolling:
    "touch",

  scrollbarWidth: "none",

  msOverflowStyle: "none",
};

// ======================================================
// NAVIGATION
// ======================================================

const navigation = {
  display: "flex",

  alignItems: "center",

  gap: 10,

  width: "max-content",

  minWidth: "max-content",

  padding:
    "4px 2px",
};

// ======================================================
// NAV BUTTON
// ======================================================

const navButton = {
  flex: "0 0 auto",

  minWidth: 48,

  height: 46,

  padding:
    "0 12px",

  borderRadius: 12,

  border: "none",

  background:
    "#1e293b",

  color: "white",

  cursor: "pointer",

  display: "flex",

  alignItems: "center",

  justifyContent:
    "center",

  gap: 7,

  fontSize: 18,

  whiteSpace: "nowrap",

  transition:
    "all 0.2s ease",

  boxSizing: "border-box",
};

// ======================================================
// NAV ICON
// ======================================================

const navIcon = {
  display: "inline-flex",

  alignItems: "center",

  justifyContent: "center",

  fontSize: 20,

  lineHeight: 1,
};

// ======================================================
// NAV LABEL
// ======================================================

const navLabel = {
  fontSize: 13,

  fontWeight: 600,

  whiteSpace: "nowrap",
};

// ======================================================
// ACTIVE
// ======================================================

const activeStyle = {
  background:
    "linear-gradient(90deg, #2563eb, #7c3aed)",

  transform:
    "scale(1.03)",

  boxShadow:
    "0 5px 15px rgba(0,0,0,0.4)",
};

// ======================================================
// RIGHT SECTION
// ======================================================

const rightSection = {
  flexShrink: 0,

  display: "flex",

  alignItems: "center",

  gap: 10,
};

// ======================================================
// WALLET
// ======================================================

const wallet = {
  background:
    "#1e293b",

  padding:
    "8px 14px",

  borderRadius: 10,

  fontWeight: "bold",

  fontSize: 14,

  border:
    "1px solid rgba(255,255,255,0.05)",

  minWidth: 140,

  textAlign: "center",

  whiteSpace: "nowrap",

  flexShrink: 0,
};

// ======================================================
// DOWNLOAD
// ======================================================

const downloadButton = {
  background:
    "linear-gradient(90deg,#22c55e,#16a34a)",

  color: "#fff",

  border: "none",

  borderRadius: 10,

  padding:
    "10px 16px",

  fontWeight: "bold",

  cursor: "pointer",

  whiteSpace: "nowrap",

  transition:
    "0.2s",

  flexShrink: 0,
};
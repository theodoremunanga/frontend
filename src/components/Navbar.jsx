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

const API_URL =
  import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error(
    "❌ VITE_API_URL is missing"
  );
}

const REFRESH_INTERVAL =
  60000; // 1 min

// ======================================================
// COMPONENT
// ======================================================

export default function Navbar({
  setPage,
}) {
  // ====================================================
  // STATES
  // ====================================================

  const [active, setActive] =
    useState("accueil");

  const [balance, setBalance] =
    useState(0);

  const [loading, setLoading] =
    useState(false);

  const [isOffline, setIsOffline] =
    useState(false);

  // ====================================================
  // REFS
  // ====================================================

  const intervalRef =
    useRef(null);

  const mountedRef =
    useRef(true);

  const loadingRef =
    useRef(false);

  // ====================================================
  // LOAD WALLET
  // ====================================================

  const loadWallet =
    useCallback(async () => {
      try {
        // already loading
        if (loadingRef.current) {
          return;
        }

        // offline
        if (!navigator.onLine) {
          setIsOffline(true);
          return;
        }

        setIsOffline(false);

        const token =
          localStorage.getItem(
            "token"
          );

        // not connected
        if (!token) {
          setBalance(0);
          return;
        }

        loadingRef.current = true;
        setLoading(true);

        // ✅ CORRECTION ICI
        const res = await fetch(
          `${API_URL}/wallet/me`,
          {
            method: "GET",

            headers: {
              Authorization:
                `Bearer ${token}`,

              "Content-Type":
                "application/json",
            },
          }
        );

        // unauthorized
        if (res.status === 401) {
          console.warn(
            "⚠️ Session expirée"
          );

          localStorage.removeItem(
            "token"
          );

          setBalance(0);

          return;
        }

        // server error
        if (!res.ok) {
          console.error(
            "❌ Wallet request failed:",
            res.status
          );

          return;
        }

        const data =
          await res.json();

        if (
          mountedRef.current
        ) {
          setBalance(
            data?.balance || 0
          );
        }
      } catch (err) {
        console.error(
          "❌ Wallet error:",
          err.message
        );

        setIsOffline(true);
      } finally {
        loadingRef.current =
          false;

        if (
          mountedRef.current
        ) {
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
      mountedRef.current =
        false;
    };
  }, [loadWallet]);

  // ====================================================
  // SMART AUTO REFRESH
  // ====================================================

  useEffect(() => {
    intervalRef.current =
      setInterval(() => {
        // tab hidden
        if (
          document.hidden
        ) {
          return;
        }

        loadWallet();
      }, REFRESH_INTERVAL);

    return () => {
      clearInterval(
        intervalRef.current
      );
    };
  }, [loadWallet]);

  // ====================================================
  // WINDOW FOCUS REFRESH
  // ====================================================

  useEffect(() => {
    const handleFocus =
      () => {
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
  // ONLINE/OFFLINE
  // ====================================================

  useEffect(() => {
    const online = () => {
      setIsOffline(false);

      loadWallet();
    };

    const offline = () => {
      setIsOffline(true);
    };

    window.addEventListener(
      "online",
      online
    );

    window.addEventListener(
      "offline",
      offline
    );

    return () => {
      window.removeEventListener(
        "online",
        online
      );

      window.removeEventListener(
        "offline",
        offline
      );
    };
  }, [loadWallet]);

  // ====================================================
  // FORMAT BALANCE
  // ====================================================

  const formatBalance = (
    value
  ) => {
    return Number(
      value || 0
    ).toLocaleString(
      "fr-FR"
    );
  };

  // ====================================================
  // NAV ITEMS
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
  // NAVIGATION
  // ====================================================

  const handleNav = (
    page
  ) => {
    setActive(page);

    if (setPage) {
      setPage(page);
    }
  };

  // ====================================================
  // RENDER
  // ====================================================

  return (
    <div style={navbar}>
      {/* LOGO */}

      <div
        style={leftSection}
        onClick={() =>
          handleNav(
            "accueil"
          )
        }
      >
        <img
          src={logo}
          alt="logo"
          style={logoStyle}
        />

        <span
          style={{
            fontWeight:
              "bold",
          }}
        >
          6BetBall
        </span>
      </div>

      {/* NAVIGATION */}

      <div
        style={
          centerSection
        }
      >
        {navItems.map(
          (item) => (
            <button
              key={
                item.id
              }
              onClick={() =>
                handleNav(
                  item.id
                )
              }
              style={{
                ...navButton,

                ...(active ===
                item.id
                  ? activeStyle
                  : {}),
              }}
            >
              {item.icon}
            </button>
          )
        )}
      </div>

      {/* WALLET */}

      <div style={wallet}>
        {isOffline ? (
          <span
            style={{
              color:
                "#ef4444",
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
  );
}

// ======================================================
// STYLES
// ======================================================

const navbar = {
  position: "fixed",

  top: 0,

  left: 0,

  width: "100%",

  height: 70,

  display: "flex",

  alignItems: "center",

  justifyContent:
    "space-between",

  padding: "0 30px",

  background:
    "rgba(15, 23, 42, 0.85)",

  backdropFilter:
    "blur(12px)",

  borderBottom:
    "1px solid rgba(255,255,255,0.05)",

  zIndex: 999,

  color: "white",

  boxSizing:
    "border-box",
};

const leftSection = {
  display: "flex",

  alignItems: "center",

  gap: 10,

  cursor: "pointer",

  minWidth: 150,
};

const centerSection = {
  display: "flex",

  gap: 15,

  justifyContent:
    "center",

  flex: 1,
};

const wallet = {
  background: "#1e293b",

  padding: "8px 14px",

  borderRadius: 10,

  fontWeight: "bold",

  fontSize: 14,

  border:
    "1px solid rgba(255,255,255,0.05)",

  minWidth: 140,

  textAlign: "center",
};

const navButton = {
  width: 45,

  height: 45,

  borderRadius: 12,

  border: "none",

  background: "#1e293b",

  color: "white",

  fontSize: 20,

  cursor: "pointer",

  transition:
    "all 0.2s ease",
};

const activeStyle = {
  background:
    "linear-gradient(90deg, #2563eb, #7c3aed)",

  transform:
    "scale(1.1)",

  boxShadow:
    "0 5px 15px rgba(0,0,0,0.4)",
};

const logoStyle = {
  width: 40,

  height: 40,

  borderRadius: 10,

  objectFit: "cover",
};
import { useState, useEffect, useCallback } from "react";
import logo from "../assets/logo.png";

export default function Navbar({ setPage }) {
  const [active, setActive] = useState("accueil");
  const [balance, setBalance] = useState(0);

  // =========================
  // 💰 LOAD WALLET
  // =========================
  const loadWallet = useCallback(async () => {
    try {
      // 🔐 récupérer token
      const token = localStorage.getItem("token");

      // ❌ pas connecté
      if (!token) {
        console.warn("Aucun token trouvé");
        setBalance(0);
        return;
      }

      const res = await fetch("http://localhost:3000/api/wallet/me", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      // ❌ token expiré ou invalide
      if (res.status === 401) {
        console.warn("Utilisateur non authentifié");

        // nettoyage auto
        localStorage.removeItem("token");

        setBalance(0);
        return;
      }

      const data = await res.json();

      if (res.ok) {
        setBalance(data?.balance || 0);
      } else {
        console.error("Erreur wallet:", data?.message);
      }
    } catch (err) {
      console.error("Erreur wallet:", err);
    }
  }, []);

  // =========================
  // 🔄 INITIAL LOAD + AUTO REFRESH
  // =========================
  useEffect(() => {
    loadWallet();

    // refresh toutes les 5 secondes
    const interval = setInterval(() => {
      loadWallet();
    }, 5000);

    return () => clearInterval(interval);
  }, [loadWallet]);

  // =========================
  // 💡 FORMAT BALANCE
  // =========================
  const formatBalance = (value) => {
    return Number(value || 0).toLocaleString("fr-FR");
  };

  // =========================
  // 📌 NAV ITEMS
  // =========================
  const navItems = [
    { id: "accueil", icon: "🏠" },
    { id: "competition", icon: "🏆" },
    { id: "infos", icon: "🔔" },
    { id: "menu", icon: "☰" },
    { id: "profile", icon: "👤" },
  ];

  // =========================
  // 🧭 HANDLE NAVIGATION
  // =========================
  const handleNav = (page) => {
    setActive(page);

    if (setPage) {
      setPage(page);
    }
  };

  return (
    <div style={navbar}>
      {/* 🔷 LOGO */}
      <div
        style={leftSection}
        onClick={() => handleNav("accueil")}
      >
        <img
          src={logo}
          alt="logo"
          style={logoStyle}
        />

        <span style={{ fontWeight: "bold" }}>
          6BetBall
        </span>
      </div>

      {/* 🎯 NAVIGATION */}
      <div style={centerSection}>
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleNav(item.id)}
            style={{
              ...navButton,
              ...(active === item.id
                ? activeStyle
                : {}),
            }}
            onMouseEnter={(e) => {
              if (active !== item.id) {
                e.currentTarget.style.transform =
                  "scale(1.05)";
              }
            }}
            onMouseLeave={(e) => {
              if (active !== item.id) {
                e.currentTarget.style.transform =
                  "scale(1)";
              }
            }}
          >
            {item.icon}
          </button>
        ))}
      </div>

      {/* 💰 WALLET */}
      <div style={wallet}>
        💰 {formatBalance(balance)} CDF
      </div>
    </div>
  );
}

// =========================
// 🎨 STYLES
// =========================

const navbar = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  height: 70,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0 30px",
  background: "rgba(15, 23, 42, 0.85)",
  backdropFilter: "blur(12px)",
  borderBottom:
    "1px solid rgba(255,255,255,0.05)",
  zIndex: 999,
  color: "white",
  boxSizing: "border-box",
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
  justifyContent: "center",
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
  minWidth: 120,
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
  transition: "all 0.2s ease",
};

const activeStyle = {
  background:
    "linear-gradient(90deg, #2563eb, #7c3aed)",
  transform: "scale(1.1)",
  boxShadow: "0 5px 15px rgba(0,0,0,0.4)",
};

const logoStyle = {
  width: 40,
  height: 40,
  borderRadius: 10,
  objectFit: "cover",
};
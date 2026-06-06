import { useState, useEffect } from "react";
import logo from "../assets/logo.PNG";

export default function Navbar({ setPage }) {
  const [active, setActive] = useState("accueil");
  const [balance, setBalance] = useState(0);

  // =========================
  // 💰 LOAD WALLET (REAL BACKEND)
  // =========================
  const loadWallet = async () => {
    try {
      const res = await fetch("http://localhost:3000/api/wallet/me", {
        headers: {
          Authorization: "Bearer " + localStorage.getItem("token"),
        },
      });

      const data = await res.json();

      if (res.ok) {
        setBalance(data.balance);
      }
    } catch (err) {
      console.error("Erreur wallet:", err);
    }
  };

  // 🔄 Chargement initial + refresh auto
  useEffect(() => {
    loadWallet();

    // 🔁 refresh toutes les 5s (simple et efficace)
    const interval = setInterval(loadWallet, 5000);

    return () => clearInterval(interval);
  }, []);

  // 💡 Format propre (12 500)
  const formatBalance = (value) => {
    return Number(value || 0).toLocaleString("fr-FR");
  };

  const navItems = [
    { id: "accueil", icon: "🏠" },
    { id: "competition", icon: "🏆" },
    { id: "infos", icon: "ℹ️" },
    { id: "menu", icon: "☰" },
    { id: "profile", icon: "👤" },
  ];

  const handleNav = (page) => {
    setActive(page);
    setPage(page);
  };

  return (
    <div style={navbar}>
      {/* 🔷 LOGO */}
      <div style={leftSection} onClick={() => handleNav("accueil")}>
        <img src={logo} alt="logo" style={logoStyle} />
        <span style={{ fontWeight: "bold" }}>6BetBall</span>
      </div>

      {/* 🎯 NAV */}
      <div style={centerSection}>
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleNav(item.id)}
            style={{
              ...navButton,
              ...(active === item.id ? activeStyle : {}),
            }}
            onMouseEnter={(e) => {
              if (active !== item.id) {
                e.target.style.transform = "scale(1.05)";
              }
            }}
            onMouseLeave={(e) => {
              if (active !== item.id) {
                e.target.style.transform = "scale(1)";
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

// 🎨 STYLES

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
  borderBottom: "1px solid rgba(255,255,255,0.05)",
  zIndex: 999,
  color: "white",
};

const leftSection = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  cursor: "pointer",
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
  border: "1px solid rgba(255,255,255,0.05)",
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
  background: "linear-gradient(90deg, #2563eb, #7c3aed)",
  transform: "scale(1.1)",
  boxShadow: "0 5px 15px rgba(0,0,0,0.4)",
};

const logoStyle = {
  width: 40,
  height: 40,
  borderRadius: 10,
};
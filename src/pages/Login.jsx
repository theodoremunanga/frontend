import { useState } from "react";
import api from "../services/api";

export default function Login({ setPage, setIsAuth }) {
  const [identifier, setIdentifier] = useState(""); // 🔥 renommé
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!identifier || !password) {
      return setError("⚠️ Veuillez renseigner votre identifiant et votre mot de passe.");
    }

    try {
      setLoading(true);
      setError("");

      console.log("🔐 Tentative de connexion...");

      // ✅ ENVOI PROPRE
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

      // ✅ stockage
      localStorage.setItem("token", data.token);
      localStorage.setItem("role", userRole);

      setIsAuth(true);

      // ✅ redirection
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
        err.message;

      setError(message || "❌ Une erreur est survenue lors de la connexion.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      background: "#0f172a",
      color: "white",
      padding: "20px"
    }}>
      <div style={{
        width: "100%",
        maxWidth: "400px",
        background: "#1e293b",
        padding: "30px",
        borderRadius: "16px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.4)"
      }}>

        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <h1 style={{ fontSize: "28px", fontWeight: "bold", marginBottom: "10px" }}>
            6BetBall
          </h1>

          <p style={{ fontSize: "14px", color: "#cbd5f5", lineHeight: "1.6" }}>
            Bienvenue sur <strong>6BetBall</strong>, votre plateforme de Jeux en ligne.
          </p>
        </div>

        <h2 style={{ marginBottom: "15px" }}>🔐 Connexion</h2>

        {error && (
          <div style={{
            background: "#7f1d1d",
            padding: "10px",
            borderRadius: "8px",
            marginBottom: "15px",
            fontSize: "14px"
          }}>
            {error}
          </div>
        )}

        <input
          type="text"
          placeholder="👤 Username"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          style={inputStyle}
        />

        <input
          type="password"
          placeholder="🔑 Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
        />

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            ...buttonStyle,
            opacity: loading ? 0.6 : 1
          }}
        >
          {loading ? "⏳ Connexion..." : "Se connecter"}
        </button>

        <p
          onClick={() => setPage("register")}
          style={{
            marginTop: "15px",
            textAlign: "center",
            cursor: "pointer",
            color: "#38bdf8"
          }}
        >
          Pas encore de compte ? S'inscrire
        </p>

      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "12px",
  marginBottom: "10px",
  borderRadius: "8px",
  border: "none",
  outline: "none",
  background: "#334155",
  color: "white"
};

const buttonStyle = {
  width: "100%",
  padding: "12px",
  borderRadius: "8px",
  border: "none",
  background: "linear-gradient(90deg, #2563eb, #7c3aed)",
  color: "white",
  fontWeight: "bold",
  cursor: "pointer"
};
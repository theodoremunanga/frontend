import { useState } from "react";
import api from "../api";

// 🌍 LISTE DES PAYS
const countries = [
  { name: "Afghanistan", code: "+93" },
  { name: "Afrique du Sud", code: "+27" },
  { name: "Allemagne", code: "+49" },
  { name: "Angola", code: "+244" },
  { name: "Arabie Saoudite", code: "+966" },
  { name: "Argentine", code: "+54" },
  { name: "Belgique", code: "+32" },
  { name: "Bénin", code: "+229" },
  { name: "Brésil", code: "+55" },
  { name: "Burkina Faso", code: "+226" },
  { name: "Burundi", code: "+257" },
  { name: "Cameroun", code: "+237" },
  { name: "Canada", code: "+1" },
  { name: "Chine", code: "+86" },
  { name: "Côte d'Ivoire", code: "+225" },
  { name: "Égypte", code: "+20" },
  { name: "Espagne", code: "+34" },
  { name: "États-Unis", code: "+1" },
  { name: "France", code: "+33" },
  { name: "Gabon", code: "+241" },
  { name: "Ghana", code: "+233" },
  { name: "Guinée", code: "+224" },
  { name: "Inde", code: "+91" },
  { name: "Italie", code: "+39" },
  { name: "Japon", code: "+81" },
  { name: "Kenya", code: "+254" },
  { name: "Maroc", code: "+212" },
  { name: "Nigeria", code: "+234" },
  { name: "RDC", code: "+243" },
  { name: "R.Congo", code: "+242" },
  { name: "Royaume-Uni", code: "+44" },
  { name: "Sénégal", code: "+221" },
  { name: "Togo", code: "+228" },
  { name: "Tunisie", code: "+216" },
  { name: "Turquie", code: "+90" },
];

// 🎯 Générateur ID type A1B23C
const generateUserId = () => {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";

  const randLetter = () => letters[Math.floor(Math.random() * letters.length)];
  const randNumber = () => numbers[Math.floor(Math.random() * numbers.length)];

  return (
    randLetter() +
    randNumber() +
    randLetter() +
    randNumber() +
    randNumber() +
    randLetter()
  );
};

// 💰 Générateur Wallet
const generateWallet = () => {
  return {
    walletId: "WLT-" + Date.now() + "-" + Math.floor(Math.random() * 10000),
    balance: 0,
    currency: "USD",
    createdAt: new Date().toISOString(),
  };
};

export default function Register({ setPage }) {
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    phone: "",
    countryCode: "+243",
    country: "RDC",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleCountryChange = (e) => {
    const selected = countries.find(c => c.code === e.target.value);
    setForm({
      ...form,
      countryCode: selected.code,
      country: selected.name,
    });
  };

  const validatePassword = (password) =>
    /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{8,}$/.test(password);

  const validatePhone = (phone) =>
    /^\d{6,15}$/.test(phone);

  const register = async () => {
    setError("");
    setSuccess("");

    const { username, email, password, phone, countryCode, country } = form;

    if (!username || !email || !password || !phone) {
      return setError("⚠️ Tous les champs sont obligatoires.");
    }

    if (!validatePassword(password)) {
      return setError("🔒 Mot de passe faible.");
    }

    if (!validatePhone(phone)) {
      return setError("📱 Numéro invalide.");
    }

    try {
      setLoading(true);

      // 🔁 Génération ID + retry simple
      let userId;
      for (let i = 0; i < 3; i++) {
        userId = generateUserId();
        if (userId) break;
      }

      // 💰 Wallet unique
      const wallet = generateWallet();

      const res = await api.post("/auth/register", {
        userId,
        username,
        email: email.trim().toLowerCase(),
        password,
        phone: countryCode + phone,
        country,
        wallet,
      });

      const finalUserId = res?.data?.userId || userId;

      console.log("✅ USER ID =", finalUserId);
      console.log("💰 WALLET =", wallet);

      setSuccess(`✅ Compte créé (ID: ${finalUserId})`);

      setTimeout(() => {
        setPage("login");
      }, 1500);

    } catch (err) {
      console.error("❌ REGISTER ERROR:", err);

      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "Erreur lors de l'inscription";

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={container}>
      <div style={card}>

        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <h1 style={{ fontSize: 26, fontWeight: "bold" }}>6BetBall 🎮</h1>
          <p style={{ fontSize: 14, color: "#cbd5f5" }}>
            Créez votre compte pour commencer.
          </p>
        </div>

        <h2>📝 Inscription</h2>

        {error && <div style={errorStyle}>{error}</div>}
        {success && <div style={successStyle}>{success}</div>}

        <input name="username" placeholder="👤 Nom utilisateur" onChange={handleChange} style={input} />
        <input name="email" type="email" placeholder="📧 Email" onChange={handleChange} style={input} />
        <input name="password" type="password" placeholder="🔑 Mot de passe" onChange={handleChange} style={input} />

        <div style={{ display: "flex", gap: 10 }}>
          <select onChange={handleCountryChange} style={{ ...input, width: "40%" }}>
            {countries.map((c) => (
              <option key={c.name + c.code} value={c.code}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>

          <input
            name="phone"
            placeholder="📱 Numéro"
            onChange={handleChange}
            style={{ ...input, width: "60%" }}
          />
        </div>

        <button onClick={register} disabled={loading} style={button}>
          {loading ? "⏳ Inscription..." : "Créer mon compte"}
        </button>

        <p
          onClick={() => setPage("login")}
          style={{ marginTop: 15, textAlign: "center", cursor: "pointer", color: "#38bdf8" }}
        >
          Déjà un compte ? Se connecter
        </p>

      </div>
    </div>
  );
}

// 🎨 STYLES
const container = {
  minHeight: "100vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  background: "#0f172a",
  color: "white",
  padding: 20
};

const card = {
  width: "100%",
  maxWidth: 420,
  background: "#1e293b",
  padding: 30,
  borderRadius: 16,
  boxShadow: "0 10px 30px rgba(0,0,0,0.4)"
};

const input = {
  width: "100%",
  padding: 12,
  marginBottom: 10,
  borderRadius: 8,
  border: "none",
  background: "#334155",
  color: "white"
};

const button = {
  width: "100%",
  padding: 12,
  borderRadius: 8,
  border: "none",
  background: "linear-gradient(90deg, #2563eb, #7c3aed)",
  color: "white",
  fontWeight: "bold",
  cursor: "pointer"
};

const errorStyle = {
  background: "#7f1d1d",
  padding: 10,
  borderRadius: 8,
  marginBottom: 10
};

const successStyle = {
  background: "#14532d",
  padding: 10,
  borderRadius: 8,
  marginBottom: 10
};
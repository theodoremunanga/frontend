import { useMemo, useState } from "react";
import api from "../services/api";

// 🌍 LISTE DES PAYS
const countries = [
  { name: "RDC", code: "+243" },
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
  { name: "R.Congo", code: "+242" },
  { name: "Royaume-Uni", code: "+44" },
  { name: "Sénégal", code: "+221" },
  { name: "Togo", code: "+228" },
  { name: "Tunisie", code: "+216" },
  { name: "Turquie", code: "+90" },
];

// 🎯 Générateur USER ID
const generateUserId = () => {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";

  const randLetter = () =>
    letters[Math.floor(Math.random() * letters.length)];

  const randNumber = () =>
    numbers[Math.floor(Math.random() * numbers.length)];

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
const generateWallet = () => ({
  walletId:
    "WLT-" +
    Date.now() +
    "-" +
    Math.floor(Math.random() * 100000),
  balance: 0,
  currency: "USD",
  createdAt: new Date().toISOString(),
});

export default function Register({ setPage }) {
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    birthDate: "",
    phone: "",
    countryCode: "+243",
    country: "RDC",
    acceptTerms: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // 🎂 CALCUL ÂGE
  const age = useMemo(() => {
    if (!form.birthDate) return 0;

    const today = new Date();
    const birth = new Date(form.birthDate);

    let age = today.getFullYear() - birth.getFullYear();

    const month = today.getMonth() - birth.getMonth();

    if (
      month < 0 ||
      (month === 0 &&
        today.getDate() < birth.getDate())
    ) {
      age--;
    }

    return age;
  }, [form.birthDate]);

  // ✍️ INPUT CHANGE
  const handleChange = (e) => {
    const { name, value, type, checked } =
      e.target;

    setForm((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? checked
          : value,
    }));
  };

  // 🌍 PAYS
  const handleCountryChange = (e) => {
    const selected = countries.find(
      (c) => c.code === e.target.value
    );

    setForm((prev) => ({
      ...prev,
      countryCode: selected.code,
      country: selected.name,
    }));
  };

  // 🔒 PASSWORD VALIDATION
  const validatePassword = (password) =>
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(
      password
    );

  // 📧 EMAIL VALIDATION
  const validateEmail = (email) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // 📱 PHONE VALIDATION
  const validatePhone = (phone) =>
    /^\d{6,15}$/.test(phone);

  // 🚀 REGISTER
  const register = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    try {
      setLoading(true);

      const {
        username,
        email,
        password,
        confirmPassword,
        birthDate,
        phone,
        countryCode,
        country,
        acceptTerms,
      } = form;

      // 🧹 CLEAN DATA
      const cleanUsername =
        username.trim().charAt(0).toUpperCase() +
        username.trim().slice(1);

      const cleanEmail = email
        .trim()
        .toLowerCase();

      const cleanPhone = phone.replace(
        /\s/g,
        ""
      );

      // ✅ VALIDATIONS
      if (
        !cleanUsername ||
        !cleanEmail ||
        !password ||
        !confirmPassword ||
        !birthDate ||
        !cleanPhone
      ) {
        return setError(
          "⚠️ Veuillez remplir tous les champs."
        );
      }

      if (cleanUsername.length < 3) {
        return setError(
          "⚠️ Nom utilisateur invalide."
        );
      }

      if (!validateEmail(cleanEmail)) {
        return setError(
          "📧 Adresse email invalide."
        );
      }

      if (!validatePhone(cleanPhone)) {
        return setError(
          "📱 Numéro de téléphone invalide."
        );
      }

      if (age < 18) {
        return setError(
          "🔞 L'inscription est réservée aux personnes âgées de 18 ans ou plus."
        );
      }

      if (!validatePassword(password)) {
        return setError(
          "🔒 Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre."
        );
      }

      if (password !== confirmPassword) {
        return setError(
          "❌ Les mots de passe ne correspondent pas."
        );
      }

      if (!acceptTerms) {
        return setError(
          "📄 Vous devez accepter les conditions d'utilisation."
        );
      }

      // 🎯 USER ID
      const userId = generateUserId();

      // 💰 WALLET
      const wallet = generateWallet();

      // 📡 API CALL
      const res = await api.post(
        "/auth/register",
        {
          userId,
          username: cleanUsername,
          email: cleanEmail,
          password,
          birthDate,
          age,
          phone:
            countryCode + cleanPhone,
          country,
          wallet,
        }
      );

      const finalUserId =
        res?.data?.userId || userId;

      setSuccess(
        `✅ Compte créé avec succès. ID : ${finalUserId}`
      );

      setTimeout(() => {
        setPage("login");
      }, 1800);

    } catch (err) {
      console.error(err);

      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "❌ Impossible de créer le compte.";

      setError(message);

    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={container}>
      <div style={card}>

        {/* HEADER */}
        <div style={header}>
          <h1 style={logo}>
            6BetBall
          </h1>

          <p style={subtitle}>
            Rejoignez la plateforme moderne
            des Jeux compétitifs en ligne.
          </p>
        </div>

        <h2 style={title}>
          Créer un compte
        </h2>

        {error && (
          <div style={errorStyle}>
            {error}
          </div>
        )}

        {success && (
          <div style={successStyle}>
            {success}
          </div>
        )}

        <form onSubmit={register}>

          {/* USERNAME */}
          <input
            type="text"
            name="username"
            placeholder="🆔 Nom utilisateur"
            value={form.username}
            onChange={(e) => {
              const value = e.target.value;

              setForm((prev) => ({
                ...prev,
                username:
                  value.charAt(0).toUpperCase() +
                  value.slice(1),
              }));
            }}
            style={input}
          />

          {/* EMAIL */}
          <input
            type="email"
            name="email"
            placeholder="📧 Adresse email"
            value={form.email}
            onChange={handleChange}
            style={input}
          />

          <div style={infoBox}>
            ℹ️ Cette adresse email sera
            utilisée pour la sécurité du
            compte, les notifications et
            les paiements/retraits.
          </div>

          {/* DATE */}
          <label style={label}>
            🎂 Date de naissance
          </label>

          <input
            type="date"
            name="birthDate"
            value={form.birthDate}
            onChange={handleChange}
            style={input}
          />

          {form.birthDate && (
            <div style={ageInfo}>
              Âge détecté :
              <strong>
                {" "}
                {age} ans
              </strong>
            </div>
          )}

          {/* PASSWORD */}
          <input
            type="password"
            name="password"
            placeholder="🔑 Mot de passe"
            value={form.password}
            onChange={handleChange}
            style={input}
          />

          {/* CONFIRM PASSWORD */}
          <input
            type="password"
            name="confirmPassword"
            placeholder="🔐 Confirmer le mot de passe"
            value={form.confirmPassword}
            onChange={handleChange}
            style={input}
          />

          {/* PHONE */}
          <div style={phoneContainer}>
            <select
              onChange={
                handleCountryChange
              }
              style={countrySelect}
              value={form.countryCode}
            >
              {countries.map((c) => (
                <option
                  key={
                    c.name + c.code
                  }
                  value={c.code}
                >
                  {c.name} ({c.code})
                </option>
              ))}
            </select>

            <input
              type="text"
              name="phone"
              placeholder="📱 Numéro téléphone"
              value={form.phone}
              onChange={handleChange}
              style={phoneInput}
            />
          </div>

          <div style={infoBox}>
            ℹ️ Ce numéro sera utilisé
            pour les paiements Mobile
            Money, retraits et la
            sécurisation du compte.
          </div>

          {/* TERMS */}
          <label
            style={
              checkboxContainer
            }
          >
            <input
              type="checkbox"
              name="acceptTerms"
              checked={
                form.acceptTerms
              }
              onChange={handleChange}
            />

            <span>
              J'accepte les conditions
              d'utilisation et la
              politique de
              confidentialité de
              6BetBall.
            </span>
          </label>

          {/* BUTTON */}
          <button
            type="submit"
            disabled={loading}
            style={{
              ...button,
              opacity: loading
                ? 0.7
                : 1,
              cursor: loading
                ? "not-allowed"
                : "pointer",
            }}
          >
            {loading
              ? "⏳ Création du compte..."
              : "Créer mon compte"}
          </button>

        </form>

        {/* LOGIN */}
        <p
          onClick={() =>
            setPage("login")
          }
          style={loginText}
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
  background:
    "linear-gradient(135deg, #020617, #0f172a)",
  padding: 20,
};

const card = {
  width: "100%",
  maxWidth: 480,
  background: "#111827",
  borderRadius: 20,
  padding: 30,
  boxShadow:
    "0 15px 40px rgba(0,0,0,0.45)",
  color: "white",
};

const header = {
  textAlign: "center",
  marginBottom: 25,
};

const logo = {
  fontSize: 32,
  marginBottom: 10,
};

const subtitle = {
  color: "#cbd5e1",
  fontSize: 14,
  lineHeight: 1.5,
};

const title = {
  marginBottom: 20,
};

const input = {
  width: "100%",
  padding: 14,
  borderRadius: 10,
  border: "1px solid #334155",
  background: "#1e293b",
  color: "white",
  marginBottom: 12,
  outline: "none",
  fontSize: 14,
  boxSizing: "border-box",
};

const label = {
  display: "block",
  marginBottom: 6,
  fontSize: 14,
  color: "#cbd5e1",
};

const phoneContainer = {
  display: "flex",
  gap: 10,
};

const countrySelect = {
  width: "38%",
  padding: 14,
  borderRadius: 10,
  border: "1px solid #334155",
  background: "#1e293b",
  color: "white",
};

const phoneInput = {
  width: "62%",
  padding: 14,
  borderRadius: 10,
  border: "1px solid #334155",
  background: "#1e293b",
  color: "white",
};

const infoBox = {
  background: "#172554",
  border: "1px solid #1d4ed8",
  color: "#bfdbfe",
  padding: 12,
  borderRadius: 10,
  fontSize: 13,
  marginBottom: 14,
  lineHeight: 1.5,
};

const checkboxContainer = {
  display: "flex",
  gap: 10,
  alignItems: "flex-start",
  fontSize: 13,
  color: "#cbd5e1",
  marginBottom: 20,
  lineHeight: 1.5,
};

const ageInfo = {
  marginBottom: 12,
  fontSize: 13,
  color: "#93c5fd",
};

const button = {
  width: "100%",
  padding: 15,
  borderRadius: 12,
  border: "none",
  background:
    "linear-gradient(90deg, #2563eb, #7c3aed)",
  color: "white",
  fontWeight: "bold",
  fontSize: 15,
  transition: "0.2s",
};

const loginText = {
  marginTop: 20,
  textAlign: "center",
  cursor: "pointer",
  color: "#38bdf8",
  fontWeight: "500",
};

const errorStyle = {
  background: "#7f1d1d",
  border: "1px solid #dc2626",
  padding: 12,
  borderRadius: 10,
  marginBottom: 15,
  color: "#fecaca",
};

const successStyle = {
  background: "#14532d",
  border: "1px solid #16a34a",
  padding: 12,
  borderRadius: 10,
  marginBottom: 15,
  color: "#bbf7d0",
};
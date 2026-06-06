import { useEffect, useMemo, useState } from "react";

import {
  getWallet,
  getTransactions,
  submitKYC,
  getKYCStatus,
  getProfile,
} from "../services/api";

import WalletCard from "../components/WalletCard";
import TransactionsTable from "../components/TransactionsTable";

export default function Dashboard() {
  const token = localStorage.getItem("token");

  // =========================================
  // STATES
  // =========================================

  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [profile, setProfile] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // =========================================
  // KYC
  // =========================================

  const [kycStatus, setKycStatus] =
    useState("not_submitted");

  const [submittingKYC, setSubmittingKYC] =
    useState(false);

  const [kycForm, setKycForm] = useState({
    fullName: "",
    birthDate: "",
    nationality: "",
    documentType: "passport",
    documentNumber: "",
    address: "",
    city: "",
    country: "",
    phone: "",
    documentFront: null,
    documentBack: null,
    selfie: null,
  });

  // =========================================
  // LOAD DASHBOARD
  // =========================================

  const loadDashboard = async (
    silent = false
  ) => {
    try {
      if (!silent) {
        setLoading(true);
      }

      setRefreshing(true);
      setError("");

      const [
        walletData,
        txData,
        kycData,
        profileData,
      ] = await Promise.all([
        getWallet(token),
        getTransactions(token),
        getKYCStatus(token),
        getProfile(token),
      ]);

      setWallet(walletData || null);

      setTransactions(
        Array.isArray(txData)
          ? txData
          : []
      );

      setProfile(profileData || null);

      setKycStatus(
        kycData?.status ||
          "not_submitted"
      );

    } catch (err) {
      console.error(
        "DASHBOARD ERROR:",
        err
      );

      if (
        err?.response?.status === 401
      ) {
        localStorage.removeItem(
          "token"
        );

        window.location.href =
          "/login";

        return;
      }

      setError(
        "Impossible de charger le dashboard."
      );

    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // =========================================
  // INIT
  // =========================================

  useEffect(() => {
    loadDashboard();

    const interval = setInterval(() => {
      loadDashboard(true);
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  // =========================================
  // STATS
  // =========================================

  const stats = useMemo(() => {
    let totalDeposit = 0;
    let totalWithdraw = 0;
    let totalWon = 0;

    for (const tx of transactions) {
      const amount = Number(
        tx.amount || 0
      );

      if (tx.type === "deposit") {
        totalDeposit += amount;
      }

      if (tx.type === "withdraw") {
        totalWithdraw += amount;
      }

      if (tx.type === "match_win") {
        totalWon += amount;
      }
    }

    return {
      totalDeposit,
      totalWithdraw,
      totalWon,
      totalTransactions:
        transactions.length,
    };
  }, [transactions]);

  // =========================================
  // HANDLE INPUT
  // =========================================

  const handleKYCChange = (e) => {
    const {
      name,
      value,
      files,
    } = e.target;

    if (files && files.length > 0) {
      setKycForm((prev) => ({
        ...prev,
        [name]: files[0],
      }));

      return;
    }

    setKycForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // =========================================
  // SUBMIT KYC
  // =========================================

  const handleSubmitKYC = async (
    e
  ) => {
    e.preventDefault();

    try {
      setSubmittingKYC(true);

      setError("");
      setSuccess("");

      const formData =
        new FormData();

      Object.entries(kycForm).forEach(
        ([key, value]) => {
          if (value !== null) {
            formData.append(
              key,
              value
            );
          }
        }
      );

      await submitKYC(
        token,
        formData
      );

      setSuccess(
        "Votre demande KYC a été envoyée avec succès."
      );

      setKycStatus("pending");

      await loadDashboard(true);

    } catch (err) {
      console.error(
        "KYC ERROR:",
        err
      );

      setError(
        err?.response?.data
          ?.message ||
          "Erreur lors de l'envoi du KYC"
      );

    } finally {
      setSubmittingKYC(false);
    }
  };

  // =========================================
  // KYC BADGE
  // =========================================

  const renderKYCStatus = () => {
    let background =
      "#6b7280";

    let text =
      "⚠️ Non vérifié";

    if (kycStatus === "verified") {
      background = "#16a34a";
      text = "✅ Vérifié";
    }

    if (kycStatus === "pending") {
      background = "#f59e0b";
      text = "⏳ En cours";
    }

    if (kycStatus === "rejected") {
      background = "#dc2626";
      text = "❌ Rejeté";
    }

    return (
      <span
        style={{
          background,
          color: "white",
          padding: "6px 14px",
          borderRadius: 30,
          fontWeight: "bold",
        }}
      >
        {text}
      </span>
    );
  };

  // =========================================
  // LOADING
  // =========================================

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          justifyContent:
            "center",
          alignItems: "center",
          background:
            "#0f172a",
          color: "white",
          fontSize: 24,
          fontWeight: "bold",
        }}
      >
        Chargement du Dashboard...
      </div>
    );
  }

  // =========================================
  // RENDER
  // =========================================

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0f172a",
        color: "white",
        padding: 20,
      }}
    >
      {/* HEADER */}

      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 20,
          marginBottom: 30,
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 34,
            }}
          >
            👤 Dashboard
          </h1>

          <p
            style={{
              color: "#94a3b8",
            }}
          >
            Bienvenue{" "}
            {profile?.username ||
              "Joueur"}
          </p>
        </div>

        {renderKYCStatus()}
      </div>

      {/* ERROR */}

      {error && (
        <div
          style={{
            background:
              "#7f1d1d",
            padding: 14,
            borderRadius: 10,
            marginBottom: 20,
          }}
        >
          {error}
        </div>
      )}

      {/* SUCCESS */}

      {success && (
        <div
          style={{
            background:
              "#14532d",
            padding: 14,
            borderRadius: 10,
            marginBottom: 20,
          }}
        >
          {success}
        </div>
      )}

      {/* WALLET */}

      <WalletCard wallet={wallet} />

      {/* STATS */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(220px,1fr))",
          gap: 20,
          marginTop: 30,
          marginBottom: 30,
        }}
      >
        <StatCard
          title="💰 Dépôts"
          value={`${stats.totalDeposit}$`}
        />

        <StatCard
          title="🏆 Gains"
          value={`${stats.totalWon}$`}
        />

        <StatCard
          title="📤 Retraits"
          value={`${stats.totalWithdraw}$`}
        />

        <StatCard
          title="📄 Transactions"
          value={
            stats.totalTransactions
          }
        />
      </div>

      {/* KYC */}

      {kycStatus !==
        "verified" &&
        kycStatus !==
          "pending" && (
          <div
            style={{
              background:
                "#111827",
              padding: 25,
              borderRadius: 16,
              marginBottom: 30,
            }}
          >
            <h2>
              🪪 Vérification KYC
            </h2>

            <form
              onSubmit={
                handleSubmitKYC
              }
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit,minmax(250px,1fr))",
                  gap: 16,
                }}
              >
                <Input
                  label="Nom complet"
                  name="fullName"
                  value={
                    kycForm.fullName
                  }
                  onChange={
                    handleKYCChange
                  }
                />

                <Input
                  label="Date naissance"
                  type="date"
                  name="birthDate"
                  value={
                    kycForm.birthDate
                  }
                  onChange={
                    handleKYCChange
                  }
                />

                <Input
                  label="Nationalité"
                  name="nationality"
                  value={
                    kycForm.nationality
                  }
                  onChange={
                    handleKYCChange
                  }
                />

                <Input
                  label="Document"
                  name="documentNumber"
                  value={
                    kycForm.documentNumber
                  }
                  onChange={
                    handleKYCChange
                  }
                />

                <Input
                  label="Téléphone"
                  name="phone"
                  value={
                    kycForm.phone
                  }
                  onChange={
                    handleKYCChange
                  }
                />

                <Input
                  label="Adresse"
                  name="address"
                  value={
                    kycForm.address
                  }
                  onChange={
                    handleKYCChange
                  }
                />

                <Input
                  label="Ville"
                  name="city"
                  value={
                    kycForm.city
                  }
                  onChange={
                    handleKYCChange
                  }
                />

                <Input
                  label="Pays"
                  name="country"
                  value={
                    kycForm.country
                  }
                  onChange={
                    handleKYCChange
                  }
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit,minmax(250px,1fr))",
                  gap: 16,
                  marginTop: 20,
                }}
              >
                <FileInput
                  label="Recto"
                  name="documentFront"
                  onChange={
                    handleKYCChange
                  }
                />

                <FileInput
                  label="Verso"
                  name="documentBack"
                  onChange={
                    handleKYCChange
                  }
                />

                <FileInput
                  label="Selfie"
                  name="selfie"
                  onChange={
                    handleKYCChange
                  }
                />
              </div>

              <button
                type="submit"
                disabled={
                  submittingKYC
                }
                style={{
                  marginTop: 20,
                  background:
                    "#2563eb",
                  color: "white",
                  border: "none",
                  padding:
                    "14px 22px",
                  borderRadius: 12,
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                {submittingKYC
                  ? "Envoi..."
                  : "Soumettre le KYC"}
              </button>
            </form>
          </div>
        )}

      {/* TRANSACTIONS */}

      <div
        style={{
          background: "#111827",
          borderRadius: 16,
          padding: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <h2>
            📜 Transactions
          </h2>

          <button
            onClick={() =>
              loadDashboard(true)
            }
            style={{
              background:
                "#1d4ed8",
              color: "white",
              border: "none",
              padding:
                "10px 18px",
              borderRadius: 10,
              cursor: "pointer",
            }}
          >
            {refreshing
              ? "Actualisation..."
              : "Rafraîchir"}
          </button>
        </div>

        {transactions.length ===
        0 ? (
          <div
            style={{
              padding: 40,
              textAlign: "center",
              color: "#94a3b8",
            }}
          >
            Aucune transaction.
          </div>
        ) : (
          <TransactionsTable
            transactions={
              transactions
            }
          />
        )}
      </div>
    </div>
  );
}

// =========================================
// STAT CARD
// =========================================

function StatCard({
  title,
  value,
}) {
  return (
    <div
      style={{
        background: "#111827",
        borderRadius: 16,
        padding: 20,
      }}
    >
      <div
        style={{
          color: "#94a3b8",
          marginBottom: 10,
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: 28,
          fontWeight: "bold",
        }}
      >
        {value}
      </div>
    </div>
  );
}

// =========================================
// INPUT
// =========================================

function Input({
  label,
  type = "text",
  ...props
}) {
  return (
    <div>
      <label
        style={{
          display: "block",
          marginBottom: 8,
          fontWeight: "bold",
        }}
      >
        {label}
      </label>

      <input
        type={type}
        required
        {...props}
        style={{
          width: "100%",
          padding: 12,
          borderRadius: 10,
          border:
            "1px solid #334155",
          background:
            "#0f172a",
          color: "white",
        }}
      />
    </div>
  );
}

// =========================================
// FILE INPUT
// =========================================

function FileInput({
  label,
  ...props
}) {
  return (
    <div>
      <label
        style={{
          display: "block",
          marginBottom: 8,
          fontWeight: "bold",
        }}
      >
        {label}
      </label>

      <input
        type="file"
        accept="image/*"
        required
        {...props}
        style={{
          width: "100%",
          padding: 12,
          borderRadius: 10,
          border:
            "1px solid #334155",
          background:
            "#0f172a",
          color: "white",
        }}
      />
    </div>
  );
}
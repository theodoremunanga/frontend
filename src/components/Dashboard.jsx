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


// =====================================================
// TYPES DE TRANSACTIONS
// =====================================================

// Transactions qui représentent une ENTRÉE d'argent
const CREDIT_TYPES = new Set([
  "deposit",
  "match_win",
  "win",
  "winning",
  "bonus",
  "refund",
  "cashback",
  "credit",
  "reward",
]);


// Transactions qui représentent une SORTIE d'argent
const DEBIT_TYPES = new Set([
  "withdraw",
  "withdrawal",
  "match_loss",
  "loss",
  "match_bet",
  "bet",
  "stake",
  "debit",
  "payment",
  "purchase",
  "fee",
  "commission",
  "penalty",
]);


// =====================================================
// NORMALISATION DU TYPE
// =====================================================

function normalizeTransactionType(type) {
  return String(type || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}


// =====================================================
// MONTANT SIGNE
// =====================================================
//
// Le backend peut envoyer :
//
// deposit      -> 100
// match_win    -> 180
// withdraw     -> 50
// match_loss   -> 20
//
// Le Dashboard transforme alors :
//
// +100
// +180
// -50
// -20
//
// Si le backend envoie déjà -50 pour un retrait,
// on conserve -50 et on ne fait pas -(-50).
// =====================================================

function getSignedTransactionAmount(tx) {

  const rawAmount = Number(
    tx?.amount ?? 0
  );

  if (!Number.isFinite(rawAmount)) {
    return 0;
  }

  const type = normalizeTransactionType(
    tx?.type
  );

  if (DEBIT_TYPES.has(type)) {
    return -Math.abs(rawAmount);
  }

  if (CREDIT_TYPES.has(type)) {
    return Math.abs(rawAmount);
  }

  // ===================================================
  // TYPE INCONNU
  // ===================================================
  //
  // On ne force pas arbitrairement le signe.
  // Si le backend connaît déjà le signe, on le conserve.
  // ===================================================

  return rawAmount;
}


// =====================================================
// FORMAT MONTANT
// =====================================================

function formatAmount(amount) {

  const value = Number(amount || 0);

  if (!Number.isFinite(value)) {
    return "0.00";
  }

  return value.toFixed(2);
}


// =====================================================
// LABEL DU TYPE
// =====================================================

function getTransactionTypeLabel(type) {

  const normalized =
    normalizeTransactionType(type);

  const labels = {
    deposit: "Dépôt",
    match_win: "Gain de match",
    withdraw: "Retrait",
    withdrawal: "Retrait",
    match_loss: "Perte de match",
    match_bet: "Mise de match",
    bet: "Mise",
    stake: "Mise",
    refund: "Remboursement",
    bonus: "Bonus",
    cashback: "Cashback",
    reward: "Récompense",
    fee: "Frais",
    commission: "Commission",
    debit: "Débit",
    credit: "Crédit",
    payment: "Paiement",
    purchase: "Achat",
    penalty: "Pénalité",
    loss: "Perte",
  };

  return (
    labels[normalized] ||
    type ||
    "Transaction"
  );
}


// =====================================================
// DASHBOARD
// =====================================================

export default function Dashboard() {

  const token =
    localStorage.getItem("token");


  // ===================================================
  // STATES
  // ===================================================

  const [wallet, setWallet] =
    useState(null);

  const [transactions, setTransactions] =
    useState([]);

  const [profile, setProfile] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");


  // ===================================================
  // KYC
  // ===================================================

  const [kycStatus, setKycStatus] =
    useState("not_submitted");

  const [submittingKYC, setSubmittingKYC] =
    useState(false);

  const [kycForm, setKycForm] =
    useState({
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


  // ===================================================
  // LOAD DASHBOARD
  // ===================================================

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


      // ===============================================
      // WALLET
      // ===============================================

      setWallet(
        walletData || null
      );


      // ===============================================
      // TRANSACTIONS
      // ===============================================
      //
      // IMPORTANT :
      //
      // On normalise le signe ici afin que
      // TransactionsTable reçoive directement
      // les montants financiers corrects.
      // ===============================================

      const rawTransactions =
        Array.isArray(txData)
          ? txData
          : [];


      const normalizedTransactions =
        rawTransactions.map(
          (tx) => {

            const signedAmount =
              getSignedTransactionAmount(
                tx
              );

            return {
              ...tx,

              // Montant utilisé pour l'affichage
              amount: signedAmount,

              // Informations supplémentaires
              originalAmount:
                tx?.amount,

              signedAmount,

              typeLabel:
                getTransactionTypeLabel(
                  tx?.type
                ),

              direction:
                signedAmount > 0
                  ? "credit"
                  : signedAmount < 0
                    ? "debit"
                    : "neutral",
            };
          }
        );


      setTransactions(
        normalizedTransactions
      );


      // ===============================================
      // PROFILE
      // ===============================================

      setProfile(
        profileData || null
      );


      // ===============================================
      // KYC
      // ===============================================

      setKycStatus(
        kycData?.status ||
        "not_submitted"
      );

    } catch (err) {

      console.error(
        "DASHBOARD ERROR:",
        err
      );


      // ===============================================
      // SESSION EXPIREE
      // ===============================================

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
        err?.response?.data?.message ||
        "Impossible de charger le dashboard."
      );

    } finally {

      setLoading(false);

      setRefreshing(false);
    }
  };


  // ===================================================
  // INIT
  // ===================================================

  useEffect(() => {

    loadDashboard();

    const interval =
      setInterval(() => {

        loadDashboard(true);

      }, 15000);


    return () =>
      clearInterval(interval);

  }, []);


  // ===================================================
  // STATS FINANCIERES
  // ===================================================

  const stats = useMemo(() => {

    let totalDeposit = 0;

    let totalWithdraw = 0;

    let totalWon = 0;

    let totalLoss = 0;

    let totalBet = 0;

    let totalCredit = 0;

    let totalDebit = 0;

    let netAmount = 0;


    for (
      const tx of transactions
    ) {

      const amount =
        Number(
          tx?.signedAmount ??
          tx?.amount ??
          0
        );


      if (!Number.isFinite(amount)) {
        continue;
      }


      const type =
        normalizeTransactionType(
          tx?.type
        );


      // =============================================
      // FLUX GENERAL
      // =============================================

      if (amount > 0) {
        totalCredit += amount;
      }

      if (amount < 0) {
        totalDebit += Math.abs(amount);
      }

      netAmount += amount;


      // =============================================
      // DEPOTS
      // =============================================

      if (
        type === "deposit"
      ) {
        totalDeposit +=
          Math.abs(amount);
      }


      // =============================================
      // GAINS
      // =============================================

      if (
        CREDIT_TYPES.has(type) &&
        (
          type === "match_win" ||
          type === "win" ||
          type === "winning"
        )
      ) {

        totalWon +=
          Math.abs(amount);
      }


      // =============================================
      // RETRAITS
      // =============================================

      if (
        type === "withdraw" ||
        type === "withdrawal"
      ) {

        totalWithdraw +=
          Math.abs(amount);
      }


      // =============================================
      // PERTES
      // =============================================

      if (
        type === "match_loss" ||
        type === "loss"
      ) {

        totalLoss +=
          Math.abs(amount);
      }


      // =============================================
      // MISES
      // =============================================

      if (
        type === "match_bet" ||
        type === "bet" ||
        type === "stake"
      ) {

        totalBet +=
          Math.abs(amount);
      }
    }


    return {

      totalDeposit,

      totalWithdraw,

      totalWon,

      totalLoss,

      totalBet,

      totalCredit,

      totalDebit,

      netAmount,

      totalTransactions:
        transactions.length,
    };

  }, [transactions]);


  // ===================================================
  // HANDLE KYC INPUT
  // ===================================================

  const handleKYCChange = (e) => {

    const {
      name,
      value,
      files,
    } = e.target;


    if (
      files &&
      files.length > 0
    ) {

      setKycForm(
        (prev) => ({
          ...prev,

          [name]: files[0],
        })
      );

      return;
    }


    setKycForm(
      (prev) => ({
        ...prev,

        [name]: value,
      })
    );
  };


  // ===================================================
  // SUBMIT KYC
  // ===================================================

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


      Object.entries(
        kycForm
      ).forEach(
        ([key, value]) => {

          if (
            value !== null &&
            value !== undefined
          ) {

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


      setKycStatus(
        "pending"
      );


      await loadDashboard(
        true
      );

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

      setSubmittingKYC(
        false
      );
    }
  };


  // ===================================================
  // KYC BADGE
  // ===================================================

  const renderKYCStatus = () => {

    let background =
      "#6b7280";

    let text =
      "⚠️ Non vérifié";


    if (
      kycStatus ===
      "verified"
    ) {

      background =
        "#16a34a";

      text =
        "✅ Vérifié";
    }


    if (
      kycStatus ===
      "pending"
    ) {

      background =
        "#f59e0b";

      text =
        "⏳ En cours";
    }


    if (
      kycStatus ===
      "rejected"
    ) {

      background =
        "#dc2626";

      text =
        "❌ Rejeté";
    }


    return (
      <span
        style={{
          background,

          color: "white",

          padding:
            "6px 14px",

          borderRadius: 30,

          fontWeight:
            "bold",
        }}
      >
        {text}
      </span>
    );
  };


  // ===================================================
  // LOADING
  // ===================================================

  if (loading) {

    return (
      <div
        style={{
          minHeight:
            "100vh",

          display:
            "flex",

          justifyContent:
            "center",

          alignItems:
            "center",

          background:
            "#0f172a",

          color:
            "white",

          fontSize:
            24,

          fontWeight:
            "bold",
        }}
      >
        Chargement du Dashboard...
      </div>
    );
  }


  // ===================================================
  // RENDER
  // ===================================================

  return (

    <div
      style={{
        minHeight:
          "100vh",

        background:
          "#0f172a",

        color:
          "white",

        padding:
          20,
      }}
    >

      {/* ==============================================
          HEADER
      =============================================== */}

      <div
        style={{
          display:
            "flex",

          justifyContent:
            "space-between",

          alignItems:
            "center",

          flexWrap:
            "wrap",

          gap:
            20,

          marginBottom:
            30,
        }}
      >

        <div>

          <h1
            style={{
              margin:
                0,

              fontSize:
                34,
            }}
          >
            👤 Dashboard
          </h1>


          <p
            style={{
              color:
                "#94a3b8",
            }}
          >
            Bienvenue{" "}
            {profile?.username ||
              "Joueur"}
          </p>

        </div>


        {renderKYCStatus()}

      </div>


      {/* ==============================================
          ERROR
      =============================================== */}

      {error && (

        <div
          style={{
            background:
              "#7f1d1d",

            padding:
              14,

            borderRadius:
              10,

            marginBottom:
              20,
          }}
        >
          {error}
        </div>

      )}


      {/* ==============================================
          SUCCESS
      =============================================== */}

      {success && (

        <div
          style={{
            background:
              "#14532d",

            padding:
              14,

            borderRadius:
              10,

            marginBottom:
              20,
          }}
        >
          {success}
        </div>

      )}


      {/* ==============================================
          WALLET
      =============================================== */}

      <WalletCard
        wallet={wallet}
      />


      {/* ==============================================
          STATISTIQUES
      =============================================== */}

      <div
        style={{
          display:
            "grid",

          gridTemplateColumns:
            "repeat(auto-fit, minmax(220px,1fr))",

          gap:
            20,

          marginTop:
            30,

          marginBottom:
            30,
        }}
      >

        <StatCard
          title="💰 Dépôts"
          value={`+${formatAmount(
            stats.totalDeposit
          )}$`}
          type="positive"
        />


        <StatCard
          title="🏆 Gains"
          value={`+${formatAmount(
            stats.totalWon
          )}$`}
          type="positive"
        />


        <StatCard
          title="📤 Retraits"
          value={`-${formatAmount(
            stats.totalWithdraw
          )}$`}
          type="negative"
        />


        <StatCard
          title="🎯 Mises"
          value={`-${formatAmount(
            stats.totalBet
          )}$`}
          type="negative"
        />


        <StatCard
          title="❌ Pertes"
          value={`-${formatAmount(
            stats.totalLoss
          )}$`}
          type="negative"
        />


        <StatCard
          title="📊 Flux net"
          value={
            stats.netAmount >= 0
              ? `+${formatAmount(
                  stats.netAmount
                )}$`
              : `-${formatAmount(
                  Math.abs(
                    stats.netAmount
                  )
                )}$`
          }
          type={
            stats.netAmount >= 0
              ? "positive"
              : "negative"
          }
        />


        <StatCard
          title="📥 Entrées"
          value={`+${formatAmount(
            stats.totalCredit
          )}$`}
          type="positive"
        />


        <StatCard
          title="📤 Sorties"
          value={`-${formatAmount(
            stats.totalDebit
          )}$`}
          type="negative"
        />


        <StatCard
          title="📄 Transactions"
          value={
            stats.totalTransactions
          }
        />

      </div>


      {/* ==============================================
          KYC
      =============================================== */}

      {kycStatus !== "verified" &&
        kycStatus !== "pending" && (

        <div
          style={{
            background:
              "#111827",

            padding:
              25,

            borderRadius:
              16,

            marginBottom:
              30,
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
                display:
                  "grid",

                gridTemplateColumns:
                  "repeat(auto-fit,minmax(250px,1fr))",

                gap:
                  16,
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
                display:
                  "grid",

                gridTemplateColumns:
                  "repeat(auto-fit,minmax(250px,1fr))",

                gap:
                  16,

                marginTop:
                  20,
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
                marginTop:
                  20,

                background:
                  "#2563eb",

                color:
                  "white",

                border:
                  "none",

                padding:
                  "14px 22px",

                borderRadius:
                  12,

                cursor:
                  submittingKYC
                    ? "not-allowed"
                    : "pointer",

                fontWeight:
                  "bold",

                opacity:
                  submittingKYC
                    ? 0.7
                    : 1,
              }}
            >
              {submittingKYC
                ? "Envoi..."
                : "Soumettre le KYC"}
            </button>

          </form>

        </div>

      )}


      {/* ==============================================
          TRANSACTIONS
      =============================================== */}

      <div
        style={{
          background:
            "#111827",

          borderRadius:
            16,

          padding:
            20,
        }}
      >

        <div
          style={{
            display:
              "flex",

            justifyContent:
              "space-between",

            alignItems:
              "center",

            marginBottom:
              20,

            gap:
              15,

            flexWrap:
              "wrap",
          }}
        >

          <div>

            <h2
              style={{
                margin:
                  0,
              }}
            >
              📜 Transactions
            </h2>


            <p
              style={{
                margin:
                  "6px 0 0",

                color:
                  "#94a3b8",

                fontSize:
                  14,
              }}
            >
              Les entrées sont affichées
              en positif et les sorties
              en négatif.
            </p>

          </div>


          <button
            onClick={() =>
              loadDashboard(true)
            }
            disabled={
              refreshing
            }
            style={{
              background:
                "#1d4ed8",

              color:
                "white",

              border:
                "none",

              padding:
                "10px 18px",

              borderRadius:
                10,

              cursor:
                refreshing
                  ? "not-allowed"
                  : "pointer",

              opacity:
                refreshing
                  ? 0.7
                  : 1,
            }}
          >
            {refreshing
              ? "Actualisation..."
              : "Rafraîchir"}
          </button>

        </div>


        {transactions.length === 0 ? (

          <div
            style={{
              padding:
                40,

              textAlign:
                "center",

              color:
                "#94a3b8",
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


// =====================================================
// STAT CARD
// =====================================================

function StatCard({
  title,
  value,
  type,
}) {

  let valueColor =
    "white";

  if (
    type === "positive"
  ) {
    valueColor =
      "#22c55e";
  }

  if (
    type === "negative"
  ) {
    valueColor =
      "#ef4444";
  }


  return (

    <div
      style={{
        background:
          "#111827",

        borderRadius:
          16,

        padding:
          20,

        border:
          "1px solid #1e293b",
      }}
    >

      <div
        style={{
          color:
            "#94a3b8",

          marginBottom:
            10,

          fontSize:
            14,
        }}
      >
        {title}
      </div>


      <div
        style={{
          fontSize:
            28,

          fontWeight:
            "bold",

          color:
            valueColor,
        }}
      >
        {value}
      </div>

    </div>
  );
}


// =====================================================
// INPUT
// =====================================================

function Input({
  label,
  type = "text",
  ...props
}) {

  return (

    <div>

      <label
        style={{
          display:
            "block",

          marginBottom:
            8,

          fontWeight:
            "bold",
        }}
      >
        {label}
      </label>


      <input
        type={type}
        required
        {...props}
        style={{
          width:
            "100%",

          padding:
            12,

          borderRadius:
            10,

          border:
            "1px solid #334155",

          background:
            "#0f172a",

          color:
            "white",

          boxSizing:
            "border-box",
        }}
      />

    </div>
  );
}


// =====================================================
// FILE INPUT
// =====================================================

function FileInput({
  label,
  ...props
}) {

  return (

    <div>

      <label
        style={{
          display:
            "block",

          marginBottom:
            8,

          fontWeight:
            "bold",
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
          width:
            "100%",

          padding:
            12,

          borderRadius:
            10,

          border:
            "1px solid #334155",

          background:
            "#0f172a",

          color:
            "white",

          boxSizing:
            "border-box",
        }}
      />

    </div>
  );
}
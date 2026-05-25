import { useState } from "react";

export default function AIControlPanel({
  ai,
  fundAmount,
  setFundAmount,
  toggleAI,
  fundAI,
  debitAI, // 🔥 NEW
  refreshAI,
  money,
  actionLoading,
}) {

  // 🔥 NEW
  const [debitAmount, setDebitAmount] =
    useState("");

  // ======================================================
  // TOGGLE AI
  // ======================================================

  const handleToggle = async () => {

    try {

      if (typeof toggleAI !== "function") {

        console.warn(
          "toggleAI non défini"
        );

        return;
      }

      const newState =
        !Boolean(ai?.enabled);

      await toggleAI(newState);

      if (
        typeof refreshAI ===
        "function"
      ) {
        await refreshAI();
      }

    } catch (err) {

      console.error(
        "❌ TOGGLE AI ERROR:",
        err
      );

      alert(
        "Erreur lors du changement IA"
      );
    }
  };

  // ======================================================
  // FUND AI
  // ======================================================

  const handleFund = async () => {

    try {

      const amount =
        Number(fundAmount);

      if (
        !amount ||
        amount <= 0
      ) {

        alert(
          "Montant invalide"
        );

        return;
      }

      if (
        typeof fundAI !==
        "function"
      ) {

        alert(
          "fundAI non défini"
        );

        return;
      }

      await fundAI(amount);

      if (
        typeof refreshAI ===
        "function"
      ) {
        await refreshAI();
      }

      setFundAmount("");

      alert(
        "✅ Wallet IA crédité"
      );

    } catch (err) {

      console.error(
        "❌ FUND AI ERROR:",
        err
      );

      alert(
        err?.response?.data
          ?.message ||
          "Erreur financement IA"
      );
    }
  };

  // ======================================================
  // DEBIT AI
  // ======================================================

  const handleDebit = async () => {

    try {

      const amount =
        Number(debitAmount);

      if (
        !amount ||
        amount <= 0
      ) {

        alert(
          "Montant invalide"
        );

        return;
      }

      if (
        typeof debitAI !==
        "function"
      ) {

        alert(
          "debitAI non défini"
        );

        return;
      }

      // 🔥 confirmation sécurité
      const confirmed =
        window.confirm(
          `Débiter ${money(amount)} du wallet IA ?`
        );

      if (!confirmed) {
        return;
      }

      await debitAI(amount);

      if (
        typeof refreshAI ===
        "function"
      ) {
        await refreshAI();
      }

      setDebitAmount("");

      alert(
        "✅ Wallet IA débité"
      );

    } catch (err) {

      console.error(
        "❌ DEBIT AI ERROR:",
        err
      );

      alert(
        err?.response?.data
          ?.message ||
          "Erreur débit IA"
      );
    }
  };

  return (
    <div style={card}>

      {/* ================================================= */}
      {/* HEADER */}
      {/* ================================================= */}

      <div style={header}>
        <h2 style={{ margin: 0 }}>
          🤖 AI CONTROL CENTER
        </h2>

        <span
          style={{
            ...statusBadge,

            background:
              ai?.enabled
                ? "#14532d"
                : "#7f1d1d",
          }}
        >
          {ai?.enabled
            ? "ACTIVE"
            : "OFFLINE"}
        </span>
      </div>

      {/* ================================================= */}
      {/* STATS */}
      {/* ================================================= */}

      <div style={statsContainer}>

        <div style={statBox}>
          <span style={label}>
            Balance
          </span>

          <strong>
            💰{" "}
            {money(
              ai?.balance || 0
            )}
          </strong>
        </div>

        <div style={statBox}>
          <span style={label}>
            Frozen
          </span>

          <strong
            style={{
              color: "#f59e0b",
            }}
          >
            ❄️{" "}
            {money(
              ai?.balance_locked ||
                0
            )}
          </strong>
        </div>

        <div style={statBox}>
          <span style={label}>
            Profit
          </span>

          <strong
            style={{
              color: "#22c55e",
            }}
          >
            📈{" "}
            {money(
              ai?.profit || 0
            )}
          </strong>
        </div>

        <div style={statBox}>
          <span style={label}>
            Loss
          </span>

          <strong
            style={{
              color: "#ef4444",
            }}
          >
            📉{" "}
            {money(
              ai?.loss || 0
            )}
          </strong>
        </div>

      </div>

      {/* ================================================= */}
      {/* TOGGLE */}
      {/* ================================================= */}

      <button
        onClick={handleToggle}
        style={{
          ...mainButton,

          background:
            ai?.enabled
              ? "#dc2626"
              : "#16a34a",
        }}
        disabled={actionLoading}
      >
        {actionLoading
          ? "Processing..."
          : ai?.enabled
          ? "🛑 Disable AI"
          : "✅ Enable AI"}
      </button>

      <hr style={divider} />

      {/* ================================================= */}
      {/* FUND */}
      {/* ================================================= */}

      <div style={section}>

        <h3 style={sectionTitle}>
          💰 Fund AI Wallet
        </h3>

        <input
          type="number"
          placeholder="Enter amount"
          value={fundAmount}
          onChange={(e) =>
            setFundAmount(
              e.target.value
            )
          }
          style={input}
        />

        <button
          onClick={handleFund}
          style={{
            ...actionBtn,
            background:
              "#2563eb",
          }}
          disabled={actionLoading}
        >
          💰 Fund Wallet
        </button>

      </div>

      {/* ================================================= */}
      {/* DEBIT */}
      {/* ================================================= */}

      <div style={section}>

        <h3 style={sectionTitle}>
          ⬇️ Debit AI Wallet
        </h3>

        <input
          type="number"
          placeholder="Enter amount"
          value={debitAmount}
          onChange={(e) =>
            setDebitAmount(
              e.target.value
            )
          }
          style={input}
        />

        <button
          onClick={handleDebit}
          style={{
            ...actionBtn,
            background:
              "#b91c1c",
          }}
          disabled={actionLoading}
        >
          ⬇️ Debit Wallet
        </button>

      </div>

      {/* ================================================= */}
      {/* REFRESH */}
      {/* ================================================= */}

      <button
        onClick={refreshAI}
        style={refresh}
        disabled={actionLoading}
      >
        🔄 Refresh stats
      </button>

    </div>
  );
}

// ======================================================
// STYLES
// ======================================================

const card = {
  background: "#1e293b",
  padding: 20,
  borderRadius: 14,
  color: "white",
  display: "flex",
  flexDirection: "column",
  gap: 14,
  boxShadow:
    "0 4px 20px rgba(0,0,0,0.25)",
};

const header = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
};

const statusBadge = {
  padding: "6px 12px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: "bold",
};

const statsContainer = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(120px,1fr))",
  gap: 10,
};

const statBox = {
  background: "#0f172a",
  padding: 12,
  borderRadius: 10,
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const label = {
  fontSize: 12,
  opacity: 0.7,
};

const divider = {
  border:
    "1px solid rgba(255,255,255,0.08)",
};

const section = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const sectionTitle = {
  margin: 0,
  fontSize: 16,
};

const input = {
  padding: 12,
  borderRadius: 10,
  border: "none",
  outline: "none",
  background: "#0f172a",
  color: "white",
  width: "100%",
  boxSizing: "border-box",
};

const mainButton = {
  padding: 12,
  border: "none",
  borderRadius: 10,
  color: "white",
  fontWeight: "bold",
  cursor: "pointer",
  transition: "0.2s",
};

const actionBtn = {
  padding: 12,
  border: "none",
  borderRadius: 10,
  color: "white",
  fontWeight: "bold",
  cursor: "pointer",
};

const refresh = {
  padding: 12,
  background: "#16a34a",
  border: "none",
  borderRadius: 10,
  color: "white",
  fontWeight: "bold",
  cursor: "pointer",
};
export default function AIControlPanel({
  ai,
  fundAmount,
  setFundAmount,
  toggleAI,
  fundAI,
  refreshAI,
  money,
  actionLoading,
}) {
  const nextState = !ai?.enabled;

  const handleToggle = () => {
    if (typeof toggleAI === "function") {
      toggleAI(nextState);
    } else {
      console.warn("toggleAI non défini");
    }
  };

  const handleFund = () => {
    const amount = Number(fundAmount);

    if (!amount || amount <= 0) {
      alert("Montant invalide");
      return;
    }

    fundAI(amount);
  };

  return (
    <div style={card}>
      <h2>🤖 AI CONTROL CENTER</h2>

      <p>Status: {ai?.enabled ? "🟢 ACTIVE" : "🔴 OFF"}</p>

      <p>Balance: 💰 {money(ai?.balance || 0)}</p>

      {/* 🔥 AJOUT FROZEN FUNDS */}
       <p>
        Frozen Funds:{" "}
       <span style={{ color: "#f59e0b" }}>
        ❄️ {money(ai?.balance_locked || 0)}
      </span>
     </p>

      <p>Profit: 📈 {money(ai?.profit || 0)}</p>
      <p>Loss: 📉 {money(ai?.loss || 0)}</p>

      <button onClick={handleToggle} style={btn} disabled={actionLoading}>
        {ai?.enabled ? "Disable AI" : "Enable AI"}
      </button>

      <hr style={{ margin: "10px 0" }} />

      <input
        placeholder="Fund AI wallet"
        value={fundAmount}
        onChange={(e) => setFundAmount(e.target.value)}
        style={input}
      />

      <button onClick={handleFund} style={btn} disabled={actionLoading}>
        💰 Fund
      </button>

      <button onClick={refreshAI} style={refresh}>
        🔄 Refresh stats
      </button>
    </div>
  );
}

const card = {
  background: "#1e293b",
  padding: 15,
  borderRadius: 10,
};

const btn = {
  padding: 8,
  background: "#2563eb",
  border: "none",
  borderRadius: 6,
  color: "white",
  marginRight: 5,
};

const input = {
  padding: 8,
  borderRadius: 8,
  border: "none",
  marginBottom: 10,
};

const refresh = {
  padding: 8,
  background: "#16a34a",
  border: "none",
  borderRadius: 8,
  color: "white",
};
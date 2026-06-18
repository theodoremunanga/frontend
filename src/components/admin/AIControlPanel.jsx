import { useEffect, useState } from "react";

export default function AIControlPanel({
  ai,
  saveSettings,
  creditBot,
  debitBot,
  transferToSystem,
  refreshAI,
  money,
  actionLoading = false,
}) {

  const [difficulty, setDifficulty] =
    useState(50);

  const [spawnRate, setSpawnRate] =
    useState(50);

  const [maxBots, setMaxBots] =
    useState(100);

  const [enabled, setEnabled] =
    useState(true);

  const [creditAmount, setCreditAmount] =
    useState("");

  const [debitAmount, setDebitAmount] =
    useState("");

  const [transferAmount, setTransferAmount] =
    useState("");

  useEffect(() => {

    if (!ai?.settings) return;

    setEnabled(
      ai.settings.enabled
    );

    setDifficulty(
      ai.settings
        .experience_percent || 50
    );

    setSpawnRate(
      ai.settings.spawn_rate || 50
    );

    setMaxBots(
      ai.settings.max_active_bots || 100
    );

  }, [ai]);

  // =====================================
  // SAVE SETTINGS
  // =====================================

  const handleSaveSettings =
    async () => {

      try {

        await saveSettings({
          enabled,
          experience_percent:
            difficulty,
          spawn_rate:
            spawnRate,
          max_active_bots:
            maxBots,
        });

        await refreshAI();

        alert(
          "✅ Paramètres IA enregistrés"
        );

      } catch (err) {

        console.error(err);

        alert(
          err?.response?.data
            ?.message ||
            "Erreur sauvegarde"
        );
      }
    };

  // =====================================
  // CREDIT BOT
  // =====================================

  const handleCredit =
    async () => {

      const amount =
        Number(creditAmount);

      if (
        !amount ||
        amount <= 0
      ) {
        return alert(
          "Montant invalide"
        );
      }

      try {

        await creditBot(amount);

        setCreditAmount("");

        await refreshAI();

        alert(
          "✅ Bot crédité"
        );

      } catch (err) {

        console.error(err);

        alert(
          err?.response?.data
            ?.message ||
            "Erreur crédit"
        );
      }
    };

  // =====================================
  // DEBIT BOT
  // =====================================

  const handleDebit =
    async () => {

      const amount =
        Number(debitAmount);

      if (
        !amount ||
        amount <= 0
      ) {
        return alert(
          "Montant invalide"
        );
      }

      const confirmDebit =
        window.confirm(
          `Débiter ${money(amount)} du bot #9999 ?`
        );

      if (!confirmDebit)
        return;

      try {

        await debitBot(amount);

        setDebitAmount("");

        await refreshAI();

        alert(
          "✅ Bot débité"
        );

      } catch (err) {

        console.error(err);

        alert(
          err?.response?.data
            ?.message ||
            "Erreur débit"
        );
      }
    };

  // =====================================
  // TRANSFER SYSTEM
  // =====================================

  const handleTransfer =
    async () => {

      const amount =
        Number(transferAmount);

      if (
        !amount ||
        amount <= 0
      ) {
        return alert(
          "Montant invalide"
        );
      }

      const confirmTransfer =
        window.confirm(
          `Transférer ${money(amount)} du bot #9999 vers le système #7777 ?`
        );

      if (!confirmTransfer)
        return;

      try {

        await transferToSystem(
          amount
        );

        setTransferAmount("");

        await refreshAI();

        alert(
          "✅ Transfert effectué"
        );

      } catch (err) {

        console.error(err);

        alert(
          err?.response?.data
            ?.message ||
            "Erreur transfert"
        );
      }
    };

  return (
    <div style={card}>

      {/* HEADER */}

      <div style={header}>

        <h2 style={{ margin: 0 }}>
          🤖 AI CONTROL CENTER
        </h2>

        <span
          style={{
            ...badge,
            background:
              enabled
                ? "#14532d"
                : "#7f1d1d",
          }}
        >
          {enabled
            ? "ACTIVE"
            : "OFFLINE"}
        </span>

      </div>

      {/* WALLET */}

      <div style={grid}>

        <div style={box}>
          <span style={label}>
            Disponible
          </span>

          <strong>
            💰{" "}
            {money(
              ai?.wallet
                ?.balance_available ||
                0
            )}
          </strong>
        </div>

        <div style={box}>
          <span style={label}>
            Gelé
          </span>

          <strong>
            ❄️{" "}
            {money(
              ai?.wallet
                ?.balance_frozen ||
                0
            )}
          </strong>
        </div>

        <div style={box}>
          <span style={label}>
            Bot
          </span>

          <strong>
            #9999
          </strong>
        </div>

        <div style={box}>
          <span style={label}>
            Système
          </span>

          <strong>
            #7777
          </strong>
        </div>

      </div>

      <hr style={divider} />

      {/* CONFIG */}

      <div style={section}>

        <h3>
          ⚙️ Configuration IA
        </h3>

        <label>
          Activer IA
        </label>

        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) =>
            setEnabled(
              e.target.checked
            )
          }
        />

        <label>
          Difficulté :
          {" "}
          {difficulty}%
        </label>

        <input
          type="range"
          min="10"
          max="100"
          value={difficulty}
          onChange={(e) =>
            setDifficulty(
              Number(
                e.target.value
              )
            )
          }
        />

        <label>
          Spawn Rate :
          {" "}
          {spawnRate}%
        </label>

        <input
          type="range"
          min="0"
          max="100"
          value={spawnRate}
          onChange={(e) =>
            setSpawnRate(
              Number(
                e.target.value
              )
            )
          }
        />

        <label>
          Max Bots
        </label>

        <input
          type="number"
          value={maxBots}
          onChange={(e) =>
            setMaxBots(
              Number(
                e.target.value
              )
            )
          }
          style={input}
        />

        <button
          style={saveBtn}
          onClick={
            handleSaveSettings
          }
          disabled={
            actionLoading
          }
        >
          💾 Enregistrer
        </button>

      </div>

      <hr style={divider} />

      {/* CREDIT */}

      <div style={section}>

        <h3>
          💰 Créditer Bot
        </h3>

        <input
          type="number"
          value={creditAmount}
          onChange={(e) =>
            setCreditAmount(
              e.target.value
            )
          }
          placeholder="Montant"
          style={input}
        />

        <button
          style={blueBtn}
          onClick={
            handleCredit
          }
        >
          Créditer #9999
        </button>

      </div>

      {/* DEBIT */}

      <div style={section}>

        <h3>
          ⬇️ Débiter Bot
        </h3>

        <input
          type="number"
          value={debitAmount}
          onChange={(e) =>
            setDebitAmount(
              e.target.value
            )
          }
          placeholder="Montant"
          style={input}
        />

        <button
          style={redBtn}
          onClick={
            handleDebit
          }
        >
          Débiter #9999
        </button>

      </div>

      {/* TRANSFER */}

      <div style={section}>

        <h3>
          🏦 Vers Système
        </h3>

        <input
          type="number"
          value={
            transferAmount
          }
          onChange={(e) =>
            setTransferAmount(
              e.target.value
            )
          }
          placeholder="Montant"
          style={input}
        />

        <button
          style={orangeBtn}
          onClick={
            handleTransfer
          }
        >
          Transférer vers #7777
        </button>

      </div>

      <hr style={divider} />

      {/* STATS */}

      <div style={grid}>

        <div style={box}>
          <span style={label}>
            Parties
          </span>

          <strong>
            🎮{" "}
            {ai?.stats
              ?.matches || 0}
          </strong>
        </div>

        <div style={box}>
          <span style={label}>
            Victoires
          </span>

          <strong>
            🏆{" "}
            {ai?.stats?.wins ||
              0}
          </strong>
        </div>

        <div style={box}>
          <span style={label}>
            Défaites
          </span>

          <strong>
            ❌{" "}
            {ai?.stats
              ?.losses || 0}
          </strong>
        </div>

        <div style={box}>
          <span style={label}>
            Win Rate
          </span>

          <strong>
            📊{" "}
            {ai?.stats
              ?.win_rate || 0}
            %
          </strong>
        </div>

      </div>

      <button
        style={refreshBtn}
        onClick={refreshAI}
      >
        🔄 Actualiser
      </button>

    </div>
  );
}

const card = {
  background: "#1e293b",
  color: "#fff",
  padding: 20,
  borderRadius: 14,
  display: "flex",
  flexDirection: "column",
  gap: 16,
};

const header = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
};

const badge = {
  padding: "6px 12px",
  borderRadius: 999,
  fontWeight: "bold",
};

const grid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(160px,1fr))",
  gap: 10,
};

const box = {
  background: "#0f172a",
  padding: 12,
  borderRadius: 10,
};

const label = {
  display: "block",
  opacity: 0.7,
  fontSize: 12,
  marginBottom: 5,
};

const section = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const input = {
  padding: 10,
  borderRadius: 10,
  border: "none",
  background: "#0f172a",
  color: "#fff",
};

const divider = {
  border:
    "1px solid rgba(255,255,255,.08)",
};

const saveBtn = {
  padding: 12,
  border: "none",
  borderRadius: 10,
  background: "#7c3aed",
  color: "#fff",
  cursor: "pointer",
};

const blueBtn = {
  padding: 12,
  border: "none",
  borderRadius: 10,
  background: "#2563eb",
  color: "#fff",
  cursor: "pointer",
};

const redBtn = {
  padding: 12,
  border: "none",
  borderRadius: 10,
  background: "#dc2626",
  color: "#fff",
  cursor: "pointer",
};

const orangeBtn = {
  padding: 12,
  border: "none",
  borderRadius: 10,
  background: "#d97706",
  color: "#fff",
  cursor: "pointer",
};

const refreshBtn = {
  padding: 12,
  border: "none",
  borderRadius: 10,
  background: "#16a34a",
  color: "#fff",
  cursor: "pointer",
};


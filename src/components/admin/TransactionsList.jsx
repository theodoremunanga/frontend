import { useState, useMemo } from "react";
import api from "../../services/api";

export default function TransactionsList({ transactions = [], money, refresh }) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [date, setDate] = useState("");

  const [loadingId, setLoadingId] = useState(null);
  const [actionData, setActionData] = useState({});
  const [rejectMode, setRejectMode] = useState(null);

  // 🔎 FILTRAGE
  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (filter !== "all" && t.status !== filter) return false;

      if (
        search &&
        !t.username?.toLowerCase().includes(search.toLowerCase())
      )
        return false;

      if (min && Number(t.amount) < Number(min)) return false;
      if (max && Number(t.amount) > Number(max)) return false;

      if (date) {
        const txDate = new Date(t.created_at)
          .toISOString()
          .slice(0, 10);
        if (txDate !== date) return false;
      }

      return true;
    });
  }, [transactions, filter, search, min, max, date]);

  const handleChange = (id, field, value) => {
    setActionData((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  };

  // ✅ APPROVE
  const approve = async (t) => {
    const isWithdraw = t.type === "withdraw";
    const reference = actionData[t.id]?.reference;

    if (isWithdraw && !reference) {
      return alert("Référence obligatoire pour un retrait");
    }

    setLoadingId(t.id);

    try {
      await api.post("/admin/validate", {
        transactionId: Number(t.id),
        reference: isWithdraw ? reference : t.reference, // 👈 IMPORTANT
      });

      refresh?.();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Erreur validation");
    } finally {
      setLoadingId(null);
    }
  };

  // ❌ REJET
  const confirmReject = async (id) => {
    const reason = actionData[id]?.reason;

    if (!reason) {
      return alert("Raison obligatoire");
    }

    setLoadingId(id);

    try {
      await api.post("/admin/reject", {
        transactionId: Number(id),
        reason,
      });

      setRejectMode(null);
      refresh?.();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Erreur rejet");
    } finally {
      setLoadingId(null);
    }
  };

  if (!transactions.length) return <p>Aucune transaction</p>;

  return (
    <div>
      {/* FILTRES */}
      <div style={filters}>
        <input
          placeholder="🔍 username"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={input}
        />

        <input
          type="number"
          placeholder="Min"
          value={min}
          onChange={(e) => setMin(e.target.value)}
          style={input}
        />

        <input
          type="number"
          placeholder="Max"
          value={max}
          onChange={(e) => setMax(e.target.value)}
          style={input}
        />

        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={input}
        />
      </div>

      {/* STATUS */}
      <div style={filters}>
        {["all", "pending", "approved", "rejected"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={filter === f ? activeBtn : btn}
          >
            {f}
          </button>
        ))}
      </div>

      {/* LISTE */}
      {filtered.map((t) => {
        const isLoading = loadingId === t.id;
        const isRejecting = rejectMode === t.id;
        const data = actionData[t.id] || {};

        return (
          <div key={t.id} style={card}>
            <b>#{t.id}</b> | {t.username}

            <p>💰 {money(t.amount)}</p>

            <p>Type: <b>{t.type}</b></p>

            {/* ✅ DÉPÔT → référence user */}
            {t.type === "deposit" && (
              <p>📌 Référence: {t.reference}</p>
            )}

            {/* ✅ RETRAIT */}
            {t.type === "withdraw" && (
              <>
                <p>📞 Bénéficiaire: {t.phone}</p>
              </>
            )}

            <p>
              Status:{" "}
              <span style={statusColor(t.status)}>
                {t.status}
              </span>
            </p>

            <p>📅 {new Date(t.created_at).toLocaleString()}</p>

            {/* ACTIONS */}
            {t.status === "pending" && (
              <div style={{ marginTop: 10 }}>
                
                {/* 🔵 RETRAIT → input admin */}
                {t.type === "withdraw" && (
                  <input
                    placeholder="Référence de validation (obligatoire)"
                    value={data.reference || ""}
                    onChange={(e) =>
                      handleChange(t.id, "reference", e.target.value)
                    }
                    style={input}
                  />
                )}

                <div style={{ marginTop: 10 }}>
                  <button
                    onClick={() => approve(t)}
                    disabled={isLoading}
                    style={approveBtn}
                  >
                    ✔ Approuver
                  </button>

                  <button
                    onClick={() => setRejectMode(t.id)}
                    style={rejectBtn}
                  >
                    ✖ Rejeter
                  </button>
                </div>

                {/* 🔴 REJET DYNAMIQUE */}
                {isRejecting && (
                  <div style={{ marginTop: 10 }}>
                    <input
                      placeholder="Raison du rejet"
                      value={data.reason || ""}
                      onChange={(e) =>
                        handleChange(t.id, "reason", e.target.value)
                      }
                      style={input}
                    />

                    <button
                      onClick={() => confirmReject(t.id)}
                      disabled={isLoading}
                      style={{ ...rejectBtn, marginTop: 5 }}
                    >
                      Confirmer rejet
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// STYLES
const card = {
  background: "#1e293b",
  padding: 15,
  borderRadius: 10,
  marginBottom: 10,
};

const filters = {
  display: "flex",
  gap: 10,
  marginBottom: 10,
  flexWrap: "wrap",
};

const input = {
  padding: 6,
  borderRadius: 6,
  border: "none",
  width: "100%",
  maxWidth: 220,
};

const btn = {
  padding: "6px 12px",
  background: "#334155",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
};

const activeBtn = {
  ...btn,
  background: "#3b82f6",
};

const approveBtn = {
  background: "#22c55e",
  color: "#fff",
  border: "none",
  padding: "6px 10px",
  borderRadius: 6,
  marginRight: 10,
  cursor: "pointer",
};

const rejectBtn = {
  background: "#ef4444",
  color: "#fff",
  border: "none",
  padding: "6px 10px",
  borderRadius: 6,
  cursor: "pointer",
};

const statusColor = (status) => {
  switch (status) {
    case "approved":
      return { color: "#22c55e" };
    case "pending":
      return { color: "#facc15" };
    case "rejected":
      return { color: "#ef4444" };
    default:
      return { color: "#fff" };
  }
};
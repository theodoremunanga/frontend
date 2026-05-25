import { useMemo, useState } from "react";
import api from "../../services/api";

export default function TransactionsList({
  transactions = [],
  money,
  refresh,
}) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [date, setDate] = useState("");

  const [loadingId, setLoadingId] = useState(null);

  const [rejectMode, setRejectMode] = useState(null);
  const [deleteMode, setDeleteMode] = useState(null);

  const [actionData, setActionData] = useState({});

  // ===============================
  // FILTERS
  // ===============================
  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (filter !== "all" && t.status !== filter) {
        return false;
      }

      if (typeFilter !== "all" && t.type !== typeFilter) {
        return false;
      }

      if (search) {
        const keyword = search.toLowerCase();

        const found =
          t.username?.toLowerCase().includes(keyword) ||
          t.phone?.toLowerCase().includes(keyword) ||
          t.custom_id?.toLowerCase().includes(keyword) ||
          t.reference?.toLowerCase().includes(keyword);

        if (!found) return false;
      }

      if (min && Number(t.amount) < Number(min)) {
        return false;
      }

      if (max && Number(t.amount) > Number(max)) {
        return false;
      }

      if (date) {
        const txDate = new Date(t.created_at)
          .toISOString()
          .slice(0, 10);

        if (txDate !== date) {
          return false;
        }
      }

      return true;
    });
  }, [transactions, filter, typeFilter, search, min, max, date]);

  // ===============================
  // HELPERS
  // ===============================
  const handleChange = (id, field, value) => {
    setActionData((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  };

  const clearLocalState = (id) => {
    setRejectMode(null);
    setDeleteMode(null);

    setActionData((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  // ===============================
  // APPROVE
  // ===============================
  const approve = async (t) => {
    try {
      setLoadingId(t.id);

      const isWithdraw =
        t.type === "withdraw" || t.type === "withdrawal";

      const reference = actionData[t.id]?.reference?.trim();

      if (isWithdraw && !reference) {
        return alert(
          "La référence de validation est obligatoire."
        );
      }

      await api.post("/admin/validate", {
        transactionId: Number(t.id),
        reference: isWithdraw ? reference : t.reference,
      });

      clearLocalState(t.id);

      // 🔥 balayage automatique
      refresh?.();
    } catch (err) {
      console.error(err);

      alert(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "Erreur lors de la validation."
      );
    } finally {
      setLoadingId(null);
    }
  };

  // ===============================
  // REJECT
  // ===============================
  const confirmReject = async (id) => {
    try {
      setLoadingId(id);

      const reason = actionData[id]?.reason?.trim();

      if (!reason) {
        return alert("La raison du rejet est obligatoire.");
      }

      await api.post("/admin/reject", {
        transactionId: Number(id),
        reason,
      });

      clearLocalState(id);

      // 🔥 balayage automatique
      refresh?.();
    } catch (err) {
      console.error(err);

      alert(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "Erreur lors du rejet."
      );
    } finally {
      setLoadingId(null);
    }
  };

  // ===============================
  // DELETE
  // ===============================
  const confirmDelete = async (id) => {
    try {
      setLoadingId(id);

      await api.post("/admin/delete-transaction", {
        transactionId: Number(id),
      });

      clearLocalState(id);

      // 🔥 balayage automatique
      refresh?.();
    } catch (err) {
      console.error(err);

      alert(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "Erreur lors de la suppression."
      );
    } finally {
      setLoadingId(null);
    }
  };

  // ===============================
  // EMPTY
  // ===============================
  if (!transactions.length) {
    return (
      <div style={emptyCard}>
        <p>Aucune transaction disponible.</p>
      </div>
    );
  }

  return (
    <div>
      {/* ================= FILTERS ================= */}
      <div style={filters}>
        <input
          placeholder="🔍 Username, téléphone, référence..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={input}
        />

        <input
          type="number"
          placeholder="Montant min"
          value={min}
          onChange={(e) => setMin(e.target.value)}
          style={smallInput}
        />

        <input
          type="number"
          placeholder="Montant max"
          value={max}
          onChange={(e) => setMax(e.target.value)}
          style={smallInput}
        />

        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={smallInput}
        />
      </div>

      {/* ================= STATUS FILTER ================= */}
      <div style={filters}>
        {["all", "pending", "approved", "rejected"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={filter === f ? activeBtn : btn}
          >
            {f.toUpperCase()}
          </button>
        ))}
      </div>

      {/* ================= TYPE FILTER ================= */}
      <div style={filters}>
        {["all", "deposit", "withdraw"].map((f) => (
          <button
            key={f}
            onClick={() => setTypeFilter(f)}
            style={typeFilter === f ? activeBtn : btn}
          >
            {f.toUpperCase()}
          </button>
        ))}
      </div>

      {/* ================= LIST ================= */}
      {filtered.map((t) => {
        const isLoading = loadingId === t.id;
        const data = actionData[t.id] || {};

        const isRejecting = rejectMode === t.id;
        const isDeleting = deleteMode === t.id;

        const isWithdraw =
          t.type === "withdraw" || t.type === "withdrawal";

        return (
          <div key={t.id} style={card}>
            {/* ================= HEADER ================= */}
            <div style={header}>
              <div>
                <h3 style={title}>
                  #{t.id} — {t.username || "Utilisateur"}
                </h3>

                <p style={sub}>
                  {t.custom_id || "Aucun ID"}
                </p>
              </div>

              <div style={amountBox}>
                {money(t.amount)}
              </div>
            </div>

            {/* ================= BODY ================= */}
            <div style={grid}>
              <Info label="Type" value={t.type} />

              <Info
                label="Statut"
                value={
                  <span style={statusColor(t.status)}>
                    {t.status}
                  </span>
                }
              />

              <Info
                label="Téléphone"
                value={t.phone || "-"}
              />

              <Info
                label="Référence"
                value={t.reference || "-"}
              />

              <Info
                label="Date"
                value={new Date(
                  t.created_at
                ).toLocaleString()}
              />

              <Info
                label="Traité"
                value={t.processed ? "Oui" : "Non"}
              />
            </div>

            {/* ================= WITHDRAW INPUT ================= */}
            {t.status === "pending" && isWithdraw && (
              <div style={{ marginTop: 15 }}>
                <input
                  placeholder="Référence de validation du retrait"
                  value={data.reference || ""}
                  onChange={(e) =>
                    handleChange(
                      t.id,
                      "reference",
                      e.target.value
                    )
                  }
                  style={fullInput}
                />
              </div>
            )}

            {/* ================= ACTIONS ================= */}
            {t.status === "pending" && (
              <div style={actions}>
                <button
                  disabled={isLoading}
                  onClick={() => approve(t)}
                  style={approveBtn}
                >
                  {isLoading
                    ? "Traitement..."
                    : "✔ Approuver"}
                </button>

                <button
                  disabled={isLoading}
                  onClick={() => setRejectMode(t.id)}
                  style={rejectBtn}
                >
                  ✖ Rejeter
                </button>

                <button
                  disabled={isLoading}
                  onClick={() => setDeleteMode(t.id)}
                  style={deleteBtn}
                >
                  🗑 Supprimer
                </button>
              </div>
            )}

            {/* ================= REJECT MODE ================= */}
            {isRejecting && (
              <div style={dangerBox}>
                <input
                  placeholder="Raison du rejet"
                  value={data.reason || ""}
                  onChange={(e) =>
                    handleChange(
                      t.id,
                      "reason",
                      e.target.value
                    )
                  }
                  style={fullInput}
                />

                <div style={miniActions}>
                  <button
                    disabled={isLoading}
                    onClick={() => confirmReject(t.id)}
                    style={rejectBtn}
                  >
                    Confirmer rejet
                  </button>

                  <button
                    onClick={() => setRejectMode(null)}
                    style={cancelBtn}
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}

            {/* ================= DELETE MODE ================= */}
            {isDeleting && (
              <div style={deleteBox}>
                <p style={{ marginBottom: 10 }}>
                  Cette opération supprimera uniquement
                  l’enregistrement de la transaction.
                </p>

                <div style={miniActions}>
                  <button
                    disabled={isLoading}
                    onClick={() => confirmDelete(t.id)}
                    style={deleteBtn}
                  >
                    Confirmer suppression
                  </button>

                  <button
                    onClick={() => setDeleteMode(null)}
                    style={cancelBtn}
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// =======================================
// COMPONENT
// =======================================
function Info({ label, value }) {
  return (
    <div style={infoCard}>
      <p style={infoLabel}>{label}</p>
      <div style={infoValue}>{value}</div>
    </div>
  );
}

// =======================================
// STYLES
// =======================================
const card = {
  background: "#0f172a",
  border: "1px solid #1e293b",
  borderRadius: 16,
  padding: 20,
  marginBottom: 16,
};

const header = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 15,
  marginBottom: 20,
  flexWrap: "wrap",
};

const title = {
  margin: 0,
  color: "#fff",
};

const sub = {
  margin: 0,
  color: "#94a3b8",
  fontSize: 13,
};

const amountBox = {
  background: "#111827",
  color: "#22c55e",
  padding: "10px 14px",
  borderRadius: 12,
  fontWeight: "bold",
  fontSize: 18,
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 12,
};

const infoCard = {
  background: "#111827",
  borderRadius: 12,
  padding: 12,
};

const infoLabel = {
  color: "#94a3b8",
  fontSize: 12,
  marginBottom: 5,
};

const infoValue = {
  color: "#fff",
  fontWeight: 600,
  wordBreak: "break-word",
};

const filters = {
  display: "flex",
  gap: 10,
  marginBottom: 14,
  flexWrap: "wrap",
};

const input = {
  padding: 10,
  borderRadius: 10,
  border: "1px solid #334155",
  background: "#0f172a",
  color: "#fff",
  minWidth: 250,
};

const smallInput = {
  padding: 10,
  borderRadius: 10,
  border: "1px solid #334155",
  background: "#0f172a",
  color: "#fff",
};

const fullInput = {
  width: "100%",
  padding: 12,
  borderRadius: 10,
  border: "1px solid #334155",
  background: "#020617",
  color: "#fff",
  boxSizing: "border-box",
};

const btn = {
  background: "#1e293b",
  color: "#fff",
  border: "none",
  padding: "10px 14px",
  borderRadius: 10,
  cursor: "pointer",
};

const activeBtn = {
  ...btn,
  background: "#2563eb",
};

const actions = {
  display: "flex",
  gap: 10,
  marginTop: 20,
  flexWrap: "wrap",
};

const miniActions = {
  display: "flex",
  gap: 10,
  marginTop: 10,
  flexWrap: "wrap",
};

const approveBtn = {
  background: "#16a34a",
  color: "#fff",
  border: "none",
  padding: "10px 14px",
  borderRadius: 10,
  cursor: "pointer",
};

const rejectBtn = {
  background: "#dc2626",
  color: "#fff",
  border: "none",
  padding: "10px 14px",
  borderRadius: 10,
  cursor: "pointer",
};

const deleteBtn = {
  background: "#475569",
  color: "#fff",
  border: "none",
  padding: "10px 14px",
  borderRadius: 10,
  cursor: "pointer",
};

const cancelBtn = {
  background: "#334155",
  color: "#fff",
  border: "none",
  padding: "10px 14px",
  borderRadius: 10,
  cursor: "pointer",
};

const dangerBox = {
  marginTop: 15,
  background: "#450a0a",
  padding: 15,
  borderRadius: 12,
};

const deleteBox = {
  marginTop: 15,
  background: "#1e293b",
  padding: 15,
  borderRadius: 12,
  color: "#fff",
};

const emptyCard = {
  background: "#0f172a",
  padding: 20,
  borderRadius: 16,
  textAlign: "center",
  color: "#94a3b8",
};

const statusColor = (status) => {
  switch (status) {
    case "approved":
      return {
        color: "#22c55e",
        fontWeight: "bold",
      };

    case "pending":
      return {
        color: "#facc15",
        fontWeight: "bold",
      };

    case "rejected":
      return {
        color: "#ef4444",
        fontWeight: "bold",
      };

    default:
      return {
        color: "#fff",
      };
  }
};
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import axios from "axios";

// ======================================================
// API
// ======================================================

const API =
  import.meta.env.VITE_API_URL;

// ======================================================
// AXIOS INSTANCE
// ======================================================

const api = axios.create({
  baseURL: API,
  timeout: 30000,
});

api.interceptors.request.use(
  (config) => {

    const token =
      localStorage.getItem(
        "token"
      );

    if (token) {
      config.headers.Authorization =
        `Bearer ${token}`;
    }

    return config;
  }
);

// ======================================================
// HELPERS
// ======================================================

function money(value) {
  return Number(
    value || 0
  ).toLocaleString() + " CDF";
}

function formatDate(date) {

  if (!date) {
    return "--";
  }

  try {
    return new Date(
      date
    ).toLocaleString();
  } catch {
    return "--";
  }
}

function statusColor(
  status
) {

  switch (
    String(
      status
    ).toLowerCase()
  ) {

    case "success":
    case "completed":
      return "#22c55e";

    case "pending":
      return "#f59e0b";

    case "failed":
      return "#ef4444";

    default:
      return "#64748b";
  }
}

// ======================================================
// COMPONENT
// ======================================================

export default function PerceptorCM() {

  // ======================================================
  // STATES
  // ======================================================

  const [
    data,
    setData,
  ] = useState({
    balance: 0,
    locked: 0,
    totalCommission: 0,
    todayCommission: 0,
    monthlyCommission: 0,
    totalTransfers: 0,
  });

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    history,
    setHistory,
  ] = useState([]);

  const [
    transferLoading,
    setTransferLoading,
  ] = useState(false);

  const [
    transferData,
    setTransferData,
  ] = useState({
    receiver: "",
    amount: "",
    reason: "",
  });

  const [
    period,
    setPeriod,
  ] = useState("today");

  const [
    search,
    setSearch,
  ] = useState("");

  // ======================================================
  // FETCH PLATFORM
  // ======================================================

  const fetchPlatform =
    useCallback(
      async (
        silent = false
      ) => {

        try {

          if (!silent) {
            setLoading(
              true
            );
          }

          setRefreshing(
            true
          );

          setError("");

          // ============================================
          // WALLET
          // ============================================

          const walletRes =
            await api.get(
              "/admin/platform-wallet"
            );

          // ============================================
          // HISTORY
          // ============================================

          const historyRes =
            await api.get(
              `/admin/perceptor/history?period=${period}`
            );

          console.log(
            "💰 Perceptor =>",
            walletRes.data
          );

          console.log(
            "📜 History =>",
            historyRes.data
          );

          setData(
            walletRes.data
              ?.perceptor || {
              balance: 0,
              locked: 0,
              totalCommission: 0,
              todayCommission: 0,
              monthlyCommission: 0,
              totalTransfers: 0,
            }
          );

          setHistory(
            Array.isArray(
              historyRes.data
            )
              ? historyRes.data
              : historyRes.data
                  ?.history || []
          );

        } catch (err) {

          console.error(
            "PerceptorCM:",
            err
          );

          setError(
            err?.response
              ?.data
              ?.error ||
            err?.message ||
            "Impossible de charger les données"
          );

        } finally {

          setLoading(
            false
          );

          setRefreshing(
            false
          );
        }
      },
      [period]
    );

  // ======================================================
  // INIT
  // ======================================================

  useEffect(() => {

    fetchPlatform();

    const interval =
      setInterval(() => {
        fetchPlatform(true);
      }, 15000);

    return () =>
      clearInterval(
        interval
      );

  }, [fetchPlatform]);

  // ======================================================
  // TRANSFER
  // ======================================================

  const handleTransfer =
    async () => {

      try {

        if (
          !transferData.receiver
        ) {
          return alert(
            "Utilisateur requis"
          );
        }

        if (
          !transferData.amount ||
          Number(
            transferData.amount
          ) <= 0
        ) {
          return alert(
            "Montant invalide"
          );
        }

        if (
          Number(
            transferData.amount
          ) >
          Number(
            data.balance
          )
        ) {
          return alert(
            "Solde insuffisant"
          );
        }

        if (
          !window.confirm(
            `Transférer ${money(
              transferData.amount
            )} ?`
          )
        ) {
          return;
        }

        setTransferLoading(
          true
        );

        // ============================================
        // API TRANSFER
        // ============================================

        const res =
          await api.post(
            "/admin/perceptor/transfer",
            {
              receiver:
                transferData.receiver,
              amount:
                Number(
                  transferData.amount
                ),
              reason:
                transferData.reason,
            }
          );

        console.log(
          "✅ Transfer =>",
          res.data
        );

        alert(
          "✅ Transfert effectué"
        );

        setTransferData({
          receiver: "",
          amount: "",
          reason: "",
        });

        fetchPlatform(true);

      } catch (err) {

        console.error(
          err
        );

        alert(
          err?.response
            ?.data
            ?.error ||
          err?.message ||
          "Erreur transfert"
        );

      } finally {

        setTransferLoading(
          false
        );
      }
    };

  // ======================================================
  // FILTER HISTORY
  // ======================================================

  const filteredHistory =
    useMemo(() => {

      const q =
        search.toLowerCase();

      return history.filter(
        (item) => {

          return (
            String(
              item.id || ""
            )
              .toLowerCase()
              .includes(q) ||

            String(
              item.type || ""
            )
              .toLowerCase()
              .includes(q) ||

            String(
              item.receiver ||
              item.username ||
              ""
            )
              .toLowerCase()
              .includes(q)
          );
        }
      );

    }, [
      history,
      search,
    ]);

  // ======================================================
  // LOADING
  // ======================================================

  if (loading) {
    return (
      <div style={loadingBox}>
        ⏳ Chargement des données...
      </div>
    );
  }

  // ======================================================
  // ERROR
  // ======================================================

  if (error) {
    return (
      <div style={errorBox}>
        ❌ {error}
      </div>
    );
  }

  // ======================================================
  // UI
  // ======================================================

  return (
    <div style={container}>

      {/* HEADER */}

      <div style={topBar}>

        <div>

          <h1 style={title}>
            💰 Perceptor Center
          </h1>

          <div style={subTitle}>
            Gestion des commissions,
            transferts et historiques
          </div>

        </div>

        <button
          onClick={() =>
            fetchPlatform()
          }
          disabled={
            refreshing
          }
          style={refreshBtn}
        >
          {refreshing
            ? "⏳"
            : "🔄"}{" "}
          Actualiser
        </button>

      </div>

      {/* STATS */}

      <div style={statsGrid}>

        <Card
          title="💼 Balance"
          value={money(
            data.balance
          )}
        />

        <Card
          title="🔒 Locked"
          value={money(
            data.locked
          )}
        />

        <Card
          title="📊 Total Commission"
          value={money(
            data.totalCommission
          )}
        />

        <Card
          title="📅 Aujourd'hui"
          value={money(
            data.todayCommission
          )}
        />

        <Card
          title="🗓 Mensuel"
          value={money(
            data.monthlyCommission
          )}
        />

        <Card
          title="💸 Transferts"
          value={money(
            data.totalTransfers
          )}
        />

      </div>

      {/* TRANSFER */}

      <div style={sectionBox}>

        <h2 style={sectionTitle}>
          💸 Nouveau transfert
        </h2>

        <div style={formGrid}>

          <input
            type="text"
            placeholder="Username / ID utilisateur"
            value={
              transferData.receiver
            }
            onChange={(e) =>
              setTransferData({
                ...transferData,
                receiver:
                  e.target.value,
              })
            }
            style={input}
          />

          <input
            type="number"
            placeholder="Montant"
            value={
              transferData.amount
            }
            onChange={(e) =>
              setTransferData({
                ...transferData,
                amount:
                  e.target.value,
              })
            }
            style={input}
          />

          <input
            type="text"
            placeholder="Motif"
            value={
              transferData.reason
            }
            onChange={(e) =>
              setTransferData({
                ...transferData,
                reason:
                  e.target.value,
              })
            }
            style={input}
          />

        </div>

        <button
          onClick={
            handleTransfer
          }
          disabled={
            transferLoading
          }
          style={transferBtn}
        >
          {transferLoading
            ? "⏳ Transfert..."
            : "🚀 Effectuer le transfert"}
        </button>

      </div>

      {/* HISTORY */}

      <div style={sectionBox}>

        <div style={historyHeader}>

          <h2 style={sectionTitle}>
            📜 Historique transactionnel
          </h2>

          <div style={filters}>

            <select
              value={period}
              onChange={(e) =>
                setPeriod(
                  e.target.value
                )
              }
              style={select}
            >
              <option value="today">
                Aujourd'hui
              </option>

              <option value="7days">
                7 jours
              </option>

              <option value="30days">
                30 jours
              </option>

              <option value="all">
                Tout
              </option>
            </select>

            <input
              placeholder="Recherche..."
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              style={searchInput}
            />

          </div>

        </div>

        <div style={tableWrapper}>

          <table style={table}>

            <thead>

              <tr>

                <th style={th}>
                  ID
                </th>

                <th style={th}>
                  Type
                </th>

                <th style={th}>
                  Utilisateur
                </th>

                <th style={th}>
                  Montant
                </th>

                <th style={th}>
                  Statut
                </th>

                <th style={th}>
                  Date
                </th>

              </tr>

            </thead>

            <tbody>

              {!filteredHistory.length && (
                <tr>
                  <td
                    colSpan="6"
                    style={
                      emptyTd
                    }
                  >
                    Aucun mouvement
                  </td>
                </tr>
              )}

              {filteredHistory.map(
                (item) => (

                  <tr
                    key={item.id}
                  >

                    <td style={td}>
                      #{item.id}
                    </td>

                    <td style={td}>
                      {item.type ||
                        "commission"}
                    </td>

                    <td style={td}>
                      {item.receiver ||
                        item.username ||
                        "--"}
                    </td>

                    <td style={td}>
                      {money(
                        item.amount
                      )}
                    </td>

                    <td style={td}>

                      <span
                        style={{
                          ...badge,
                          background:
                            statusColor(
                              item.status
                            ),
                        }}
                      >
                        {item.status ||
                          "success"}
                      </span>

                    </td>

                    <td style={td}>
                      {formatDate(
                        item.created_at
                      )}
                    </td>

                  </tr>
                )
              )}

            </tbody>

          </table>

        </div>

      </div>

    </div>
  );
}

// ======================================================
// CARD
// ======================================================

function Card({
  title,
  value,
}) {

  return (
    <div style={card}>

      <div style={cardTitle}>
        {title}
      </div>

      <div style={cardValue}>
        {value}
      </div>

    </div>
  );
}

// ======================================================
// STYLES
// ======================================================

const container = {
  padding: 24,
  color: "white",
};

const topBar = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  marginBottom: 24,
};

const title = {
  margin: 0,
  fontSize: 32,
  color: "#ffd700",
};

const subTitle = {
  marginTop: 8,
  color: "#94a3b8",
};

const statsGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(220px,1fr))",
  gap: 18,
  marginBottom: 24,
};

const card = {
  background: "#111827",
  border:
    "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16,
  padding: 20,
};

const cardTitle = {
  color: "#94a3b8",
  marginBottom: 10,
};

const cardValue = {
  fontSize: 24,
  fontWeight: 700,
};

const sectionBox = {
  background: "#111827",
  borderRadius: 16,
  padding: 20,
  marginBottom: 24,
  border:
    "1px solid rgba(255,255,255,0.08)",
};

const sectionTitle = {
  marginTop: 0,
  marginBottom: 20,
  color: "#ffd700",
};

const formGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(220px,1fr))",
  gap: 14,
  marginBottom: 18,
};

const input = {
  background: "#0f172a",
  border:
    "1px solid rgba(255,255,255,0.08)",
  color: "white",
  padding: 14,
  borderRadius: 12,
  outline: "none",
};

const transferBtn = {
  border: "none",
  background: "#2563eb",
  color: "white",
  padding: "14px 22px",
  borderRadius: 12,
  cursor: "pointer",
  fontWeight: 700,
};

const historyHeader = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  marginBottom: 20,
  gap: 14,
  flexWrap: "wrap",
};

const filters = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
};

const select = {
  ...input,
  minWidth: 180,
};

const searchInput = {
  ...input,
  minWidth: 240,
};

const tableWrapper = {
  overflowX: "auto",
};

const table = {
  width: "100%",
  borderCollapse: "collapse",
};

const th = {
  background: "#1e293b",
  padding: 14,
  textAlign: "left",
  color: "#ffd700",
};

const td = {
  padding: 14,
  borderBottom:
    "1px solid rgba(255,255,255,0.08)",
};

const badge = {
  color: "white",
  padding: "5px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
};

const emptyTd = {
  padding: 30,
  textAlign: "center",
  color: "#94a3b8",
};

const loadingBox = {
  color: "white",
  padding: 40,
};

const errorBox = {
  color: "#f87171",
  padding: 20,
};

const refreshBtn = {
  border: "none",
  background: "#2563eb",
  color: "white",
  padding: "12px 18px",
  borderRadius: 12,
  cursor: "pointer",
  fontWeight: 700,
};
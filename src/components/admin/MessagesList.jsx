import axios from "axios";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

// ======================================================
// API
// ======================================================

const API =
  import.meta.env.VITE_API_URL ||
  "http://localhost:3000/api";

const api = axios.create({
  baseURL: API,
  timeout: 20000,
});

// ======================================================
// AUTH
// ======================================================

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

function truncate(
  text,
  max = 140
) {
  if (!text) {
    return "";
  }

  if (
    text.length <= max
  ) {
    return text;
  }

  return (
    text.slice(0, max) +
    "..."
  );
}

function statusColor(
  status
) {
  switch (
    String(
      status
    ).toLowerCase()
  ) {
    case "approved":
    case "resolved":
    case "done":
    case "closed":
      return "#22c55e";

    case "pending":
    case "open":
      return "#f59e0b";

    case "rejected":
      return "#ef4444";

    default:
      return "#64748b";
  }
}

// ======================================================
// COMPONENT
// ======================================================

export default function Messages() {

  // ======================================================
  // STATES
  // ======================================================

  const [
    reports,
    setReports,
  ] = useState([]);

  const [
    claims,
    setClaims,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    activeTab,
    setActiveTab,
  ] = useState("reports");

  const [
    selected,
    setSelected,
  ] = useState(null);

  const [
    processingId,
    setProcessingId,
  ] = useState(null);

  const [
    search,
    setSearch,
  ] = useState("");

  // ======================================================
  // LOAD DATA
  // ======================================================

  const loadData =
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

          const [
            reportsRes,
            claimsRes,
          ] =
            await Promise.all([
              api.get(
                "/admin/reports"
              ),

              api.get(
                "/admin/claims"
              ),
            ]);

          setReports(
            Array.isArray(
              reportsRes.data
            )
              ? reportsRes.data
              : reportsRes.data
                  ?.reports || []
          );

          setClaims(
            Array.isArray(
              claimsRes.data
            )
              ? claimsRes.data
              : claimsRes.data
                  ?.claims || []
          );

        } catch (err) {

          console.error(
            "❌ loadData:",
            err
          );

          setError(
            err?.response
              ?.data
              ?.error ||
              "Impossible de charger les messages"
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
      []
    );

  // ======================================================
  // INIT
  // ======================================================

  useEffect(() => {

    loadData();

    const interval =
      setInterval(() => {
        loadData(true);
      }, 15000);

    return () =>
      clearInterval(
        interval
      );

  }, [loadData]);

  // ======================================================
  // FILTERED REPORTS
  // ======================================================

  const filteredReports =
    useMemo(() => {

      const q =
        search.toLowerCase();

      return reports.filter(
        (r) => {

          return (
            String(
              r.id
            )
              .toLowerCase()
              .includes(q) ||

            String(
              r.match_id || ""
            )
              .toLowerCase()
              .includes(q) ||

            String(
              r.username ||
              r.user_name ||
              ""
            )
              .toLowerCase()
              .includes(q) ||

            String(
              r.reason ||
              r.message ||
              ""
            )
              .toLowerCase()
              .includes(q)
          );
        }
      );

    }, [
      reports,
      search,
    ]);

  // ======================================================
  // FILTERED CLAIMS
  // ======================================================

  const filteredClaims =
    useMemo(() => {

      const q =
        search.toLowerCase();

      return claims.filter(
        (c) => {

          return (
            String(
              c.id
            )
              .toLowerCase()
              .includes(q) ||

            String(
              c.subject || ""
            )
              .toLowerCase()
              .includes(q) ||

            String(
              c.username ||
              c.user_name ||
              ""
            )
              .toLowerCase()
              .includes(q) ||

            String(
              c.message || ""
            )
              .toLowerCase()
              .includes(q)
          );
        }
      );

    }, [
      claims,
      search,
    ]);

  // ======================================================
  // REPORT ACTIONS
  // ======================================================

  const resolveReport =
    async (id) => {

      if (
        !window.confirm(
          "Marquer ce report comme résolu ?"
        )
      ) {
        return;
      }

      try {

        setProcessingId(
          id
        );

        await api.post(
          `/admin/reports/${id}/resolve`
        );

        await loadData(
          true
        );

        alert(
          "✅ Report résolu"
        );

      } catch (err) {

        console.error(
          "❌ resolveReport:",
          err
        );

        alert(
          err?.response
            ?.data
            ?.error ||
          "Erreur résolution"
        );

      } finally {

        setProcessingId(
          null
        );
      }
    };

  // ======================================================
  // CLAIM APPROVE
  // ======================================================

  const resolveClaim =
    async (id) => {

      if (
        !window.confirm(
          "Approuver cette réclamation ?"
        )
      ) {
        return;
      }

      try {

        setProcessingId(
          id
        );

        // ✅ ROUTE CORRIGÉE
        await api.post(
          `/admin/claims/${id}/approve`
        );

        await loadData(
          true
        );

        // refresh selected
        if (selected?.id === id) {

          const updated =
            claims.find(
              (c) =>
                c.id === id
            );

          if (updated) {
            setSelected({
              ...updated,
              status:
                "approved",
            });
          }
        }

        alert(
          "✅ Réclamation approuvée"
        );

      } catch (err) {

        console.error(
          "❌ resolveClaim:",
          err
        );

        alert(
          err?.response
            ?.data
            ?.error ||
          "Erreur approbation"
        );

      } finally {

        setProcessingId(
          null
        );
      }
    };

  // ======================================================
  // REPORT DELETE
  // ======================================================

  const deleteReport =
    async (id) => {

      if (
        !window.confirm(
          "Supprimer ce report ?"
        )
      ) {
        return;
      }

      try {

        setProcessingId(
          id
        );

        await api.delete(
          `/admin/reports/${id}`
        );

        await loadData(
          true
        );

        setSelected(
          null
        );

        alert(
          "🗑 Report supprimé"
        );

      } catch (err) {

        console.error(
          "❌ deleteReport:",
          err
        );

        alert(
          err?.response
            ?.data
            ?.error ||
          "Erreur suppression"
        );

      } finally {

        setProcessingId(
          null
        );
      }
    };

  // ======================================================
  // CLAIM REJECT
  // ======================================================

  const deleteClaim =
    async (id) => {

      if (
        !window.confirm(
          "Rejeter cette réclamation ?"
        )
      ) {
        return;
      }

      try {

        setProcessingId(
          id
        );

        // ✅ ROUTE CORRIGÉE
        await api.post(
          `/admin/claims/${id}/reject`,
          {
            reason:
              "Rejeté par administrateur",
          }
        );

        await loadData(
          true
        );

        // refresh selected
        if (selected?.id === id) {

          const updated =
            claims.find(
              (c) =>
                c.id === id
            );

          if (updated) {
            setSelected({
              ...updated,
              status:
                "rejected",
            });
          }
        }

        alert(
          "❌ Réclamation rejetée"
        );

      } catch (err) {

        console.error(
          "❌ deleteClaim:",
          err
        );

        alert(
          err?.response
            ?.data
            ?.error ||
          "Erreur rejet"
        );

      } finally {

        setProcessingId(
          null
        );
      }
    };

  // ======================================================
  // CURRENT LIST
  // ======================================================

  const currentList =
    activeTab ===
    "reports"
      ? filteredReports
      : filteredClaims;

  // ======================================================
  // LOADING
  // ======================================================

  if (loading) {
    return (
      <div style={loadingBox}>
        ⏳ Chargement des messages...
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
            📩 Centre des messages
          </h1>

          <div style={subTitle}>
            Reports matchs +
            Réclamations utilisateurs
          </div>

        </div>

        <button
          onClick={() =>
            loadData()
          }
          disabled={
            refreshing
          }
          style={
            btnRefresh
          }
        >
          {refreshing
            ? "⏳"
            : "🔄"}{" "}
          Actualiser
        </button>
      </div>

      {/* TABS */}

      <div style={tabs}>

        <button
          onClick={() =>
            setActiveTab(
              "reports"
            )
          }
          style={{
            ...tabBtn,
            background:
              activeTab ===
              "reports"
                ? "#2563eb"
                : "#1e293b",
          }}
        >
          🚨 Reports (
          {reports.length}
          )
        </button>

        <button
          onClick={() =>
            setActiveTab(
              "claims"
            )
          }
          style={{
            ...tabBtn,
            background:
              activeTab ===
              "claims"
                ? "#2563eb"
                : "#1e293b",
          }}
        >
          💬 Réclamations (
          {claims.length}
          )
        </button>
      </div>

      {/* SEARCH */}

      <input
        value={search}
        onChange={(e) =>
          setSearch(
            e.target.value
          )
        }
        placeholder="Recherche..."
        style={searchInput}
      />

      {/* ERROR */}

      {error && (
        <div style={errorBox}>
          ❌ {error}
        </div>
      )}

      {/* CONTENT */}

      <div style={layout}>

        {/* LIST */}

        <div style={listBox}>

          {!currentList.length && (
            <div style={emptyBox}>
              Aucun message
            </div>
          )}

          {currentList.map(
            (item) => {

              const isReport =
                activeTab ===
                "reports";

              const status =
                item.status ||
                "pending";

              return (
                <div
                  key={item.id}
                  onClick={() =>
                    setSelected(
                      item
                    )
                  }
                  style={{
                    ...messageCard,

                    border:
                      selected?.id ===
                      item.id
                        ? "1px solid #3b82f6"
                        : "1px solid rgba(255,255,255,0.08)",
                  }}
                >

                  <div style={messageHeader}>

                    <strong>
                      {isReport
                        ? `🚨 Report #${item.id}`
                        : `💬 Réclamation #${item.id}`}
                    </strong>

                    <div
                      style={{
                        ...statusBadge,
                        background:
                          statusColor(
                            status
                          ),
                      }}
                    >
                      {status}
                    </div>
                  </div>

                  <div style={smallText}>
                    👤{" "}
                    {item.username ||
                      item.user_name ||
                      "Utilisateur"}
                  </div>

                  {isReport && (
                    <div style={smallText}>
                      🎮 Match #
                      {item.match_id || "--"}
                    </div>
                  )}

                  <div style={previewText}>
                    {truncate(
                      item.message ||
                      item.reason ||
                      item.subject
                    )}
                  </div>

                  <div style={dateText}>
                    {formatDate(
                      item.created_at
                    )}
                  </div>

                </div>
              );
            }
          )}
        </div>

        {/* DETAILS */}

        <div style={detailsBox}>

          {!selected && (
            <div style={emptyDetails}>
              Sélectionne un message
            </div>
          )}

          {selected && (
            <>

              <div style={detailsHeader}>

                <h2
                  style={{
                    margin: 0,
                  }}
                >
                  {activeTab ===
                  "reports"
                    ? `🚨 Report #${selected.id}`
                    : `💬 Réclamation #${selected.id}`}
                </h2>

                <div
                  style={{
                    ...statusBadge,
                    background:
                      statusColor(
                        selected.status
                      ),
                  }}
                >
                  {selected.status ||
                    "pending"}
                </div>

              </div>

              <div style={infoGrid}>

                <Info
                  label="Utilisateur"
                  value={
                    selected.username ||
                    selected.user_name
                  }
                />

                <Info
                  label="Date"
                  value={formatDate(
                    selected.created_at
                  )}
                />

                {activeTab ===
                  "reports" && (
                  <Info
                    label="Match"
                    value={`#${selected.match_id}`}
                  />
                )}

              </div>

              {/* IMAGE */}

              {(selected.image_url ||
                selected.image) && (
                <div
                  style={{
                    marginBottom: 20,
                  }}
                >

                  <div style={sectionTitle}>
                    📸 Capture
                  </div>

                  <img
                    src={
                      selected.image_url ||
                      selected.image
                    }
                    alt="report"
                    style={reportImage}
                  />

                </div>
              )}

              {/* MESSAGE */}

              <div
                style={{
                  marginBottom: 24,
                }}
              >

                <div style={sectionTitle}>
                  📝 Message
                </div>

                <div style={messageContent}>
                  {selected.message ||
                    selected.reason ||
                    "Aucun contenu"}
                </div>

              </div>

              {/* ACTIONS */}

              <div style={detailsActions}>

                <button
                  disabled={
                    processingId ===
                    selected.id
                  }
                  onClick={() =>
                    activeTab ===
                    "reports"
                      ? resolveReport(
                          selected.id
                        )
                      : resolveClaim(
                          selected.id
                        )
                  }
                  style={btnSuccess}
                >
                  ✅ Approuver
                </button>

                <button
                  disabled={
                    processingId ===
                    selected.id
                  }
                  onClick={() =>
                    activeTab ===
                    "reports"
                      ? deleteReport(
                          selected.id
                        )
                      : deleteClaim(
                          selected.id
                        )
                  }
                  style={btnDanger}
                >
                  ❌ Rejeter
                </button>

              </div>

            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ======================================================
// INFO COMPONENT
// ======================================================

function Info({
  label,
  value,
}) {

  return (
    <div style={infoCard}>

      <div style={infoLabel}>
        {label}
      </div>

      <div style={infoValue}>
        {value || "--"}
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

const loadingBox = {
  padding: 40,
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
};

const subTitle = {
  marginTop: 8,
  color: "#94a3b8",
};

const tabs = {
  display: "flex",
  gap: 12,
  marginBottom: 18,
};

const tabBtn = {
  border: "none",
  color: "white",
  padding: "12px 18px",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: 700,
};

const searchInput = {
  width: "100%",
  padding: 14,
  borderRadius: 12,
  border:
    "1px solid rgba(255,255,255,0.08)",
  background: "#0f172a",
  color: "white",
  marginBottom: 20,
  outline: "none",
};

const layout = {
  display: "grid",
  gridTemplateColumns:
    "420px 1fr",
  gap: 20,
};

const listBox = {
  background: "#111827",
  borderRadius: 16,
  padding: 16,
  maxHeight: "75vh",
  overflowY: "auto",
  border:
    "1px solid rgba(255,255,255,0.08)",
};

const detailsBox = {
  background: "#111827",
  borderRadius: 16,
  padding: 24,
  minHeight: 500,
  border:
    "1px solid rgba(255,255,255,0.08)",
};

const messageCard = {
  background: "#1e293b",
  borderRadius: 12,
  padding: 14,
  marginBottom: 12,
  cursor: "pointer",
  transition: "0.2s",
};

const messageHeader = {
  display: "flex",
  justifyContent:
    "space-between",
  marginBottom: 8,
  alignItems: "center",
};

const smallText = {
  fontSize: 13,
  color: "#94a3b8",
  marginBottom: 6,
};

const previewText = {
  marginTop: 10,
  fontSize: 14,
  lineHeight: 1.5,
};

const dateText = {
  marginTop: 10,
  fontSize: 12,
  color: "#64748b",
};

const statusBadge = {
  color: "white",
  fontSize: 12,
  padding: "5px 10px",
  borderRadius: 999,
  fontWeight: 700,
};

const detailsHeader = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  marginBottom: 20,
};

const infoGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(180px,1fr))",
  gap: 14,
  marginBottom: 24,
};

const infoCard = {
  background: "#1e293b",
  padding: 14,
  borderRadius: 12,
};

const infoLabel = {
  color: "#94a3b8",
  fontSize: 13,
  marginBottom: 6,
};

const infoValue = {
  fontWeight: 700,
};

const sectionTitle = {
  marginBottom: 10,
  fontWeight: 700,
};

const reportImage = {
  width: "100%",
  maxHeight: 420,
  objectFit: "contain",
  borderRadius: 14,
  border:
    "1px solid rgba(255,255,255,0.08)",
};

const messageContent = {
  background: "#0f172a",
  padding: 18,
  borderRadius: 14,
  lineHeight: 1.7,
  whiteSpace: "pre-wrap",
};

const detailsActions = {
  display: "flex",
  gap: 14,
  marginTop: 20,
};

const btnRefresh = {
  border: "none",
  padding: "12px 18px",
  borderRadius: 12,
  background: "#2563eb",
  color: "white",
  cursor: "pointer",
  fontWeight: 700,
};

const btnBase = {
  border: "none",
  padding: "12px 18px",
  borderRadius: 12,
  color: "white",
  cursor: "pointer",
  fontWeight: 700,
};

const btnSuccess = {
  ...btnBase,
  background: "#22c55e",
};

const btnDanger = {
  ...btnBase,
  background: "#ef4444",
};

const errorBox = {
  background:
    "rgba(239,68,68,0.15)",
  color: "#fca5a5",
  border:
    "1px solid rgba(239,68,68,0.3)",
  padding: 14,
  borderRadius: 12,
  marginBottom: 20,
};

const emptyBox = {
  padding: 30,
  textAlign: "center",
  color: "#94a3b8",
};

const emptyDetails = {
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent:
    "center",
  color: "#94a3b8",
};
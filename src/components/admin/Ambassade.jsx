import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../services/api";

// ======================================================
// CONFIGURATION
// ======================================================

const MIN_AMOUNT = 500;

// ======================================================
// HELPERS
// ======================================================

function formatMoney(value) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "CDF",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDate(date) {
  if (!date) return "--";

  try {
    return new Date(date).toLocaleString("fr-FR");
  } catch {
    return "--";
  }
}

function getErrorMessage(error) {
  const data = error?.response?.data;

  if (data?.error) {
    return data.error;
  }

  if (error?.message) {
    return error.message;
  }

  return "Une erreur est survenue.";
}

// ======================================================
// COMPONENT
// ======================================================

export default function Ambassade() {
  // ======================================================
  // FORM
  // ======================================================

  const [tid, setTid] = useState("");
  const [amount, setAmount] = useState("");

  // ======================================================
  // DATA
  // ======================================================

  const [funds, setFunds] = useState([]);
  const [selectedTid, setSelectedTid] = useState(null);

  // ======================================================
  // LOADING
  // ======================================================

  const [loading, setLoading] = useState(true);
  const [circulatingLoading, setCirculatingLoading] =
    useState(false);
  const [submitLoading, setSubmitLoading] =
    useState(false);
  const [detailLoading, setDetailLoading] =
    useState(false);

  // ======================================================
  // SEARCH
  // ======================================================

  const [searchTid, setSearchTid] = useState("");

  // ======================================================
  // NOTIFICATION
  // ======================================================

  const [notification, setNotification] = useState(null);

  // ======================================================
  // NOTIFICATION HELPER
  // ======================================================

  const notify = useCallback((message, type = "info") => {
    setNotification({
      message,
      type,
    });

    window.setTimeout(() => {
      setNotification(null);
    }, 4500);
  }, []);

  // ======================================================
  // LOAD CIRCULATING FUNDS
  // ======================================================

  const loadFunds = useCallback(async () => {
    try {
      setCirculatingLoading(true);

      const response = await api.get(
        "/ambassade/circulating"
      );

      const data = response?.data;

      setFunds(
        Array.isArray(data?.funds)
          ? data.funds
          : []
      );
    } catch (error) {
      console.error(
        "AMBASSADE LOAD FUNDS ERROR:",
        error
      );

      notify(
        getErrorMessage(error),
        "error"
      );
    } finally {
      setCirculatingLoading(false);
      setLoading(false);
    }
  }, [notify]);

  // ======================================================
  // INITIAL LOAD
  // ======================================================

  useEffect(() => {
    loadFunds();
  }, [loadFunds]);

  // ======================================================
  // SUBMIT CIRCULATION
  // ======================================================

  const handleCirculate = async (event) => {
    event.preventDefault();

    const normalizedTid = tid
      .trim()
      .toUpperCase();

    const numericAmount = Number(amount);

    // ----------------------------------------------------
    // FRONT VALIDATION
    // ----------------------------------------------------

    if (!normalizedTid) {
      notify(
        "Le TID est obligatoire.",
        "error"
      );
      return;
    }

    if (
      !Number.isFinite(numericAmount) ||
      !Number.isInteger(numericAmount) ||
      numericAmount < MIN_AMOUNT
    ) {
      notify(
        `Le montant doit être un nombre entier supérieur ou égal à ${MIN_AMOUNT} CDF.`,
        "error"
      );
      return;
    }

    try {
      setSubmitLoading(true);

      const response = await api.post(
        "/ambassade/circulate",
        {
          tid: normalizedTid,
          amount: numericAmount,
        }
      );

      const data = response?.data;

      notify(
        data?.message ||
          `Les fonds de ${numericAmount} CDF sont maintenant en circulation.`,
        "success"
      );

      // --------------------------------------------------
      // RESET FORM
      // --------------------------------------------------

      setTid("");
      setAmount("");

      // --------------------------------------------------
      // REFRESH
      // --------------------------------------------------

      await loadFunds();
    } catch (error) {
      console.error(
        "AMBASSADE CIRCULATE ERROR:",
        error
      );

      const code =
        error?.response?.data?.code;

      if (code === "TID_ALREADY_EXISTS") {
        notify(
          "Ce TID existe déjà dans le système.",
          "error"
        );
      } else if (code === "TID_REQUIRED") {
        notify(
          "Le TID est obligatoire.",
          "error"
        );
      } else if (
        code === "INVALID_TID_FORMAT"
      ) {
        notify(
          "Le format du TID est invalide.",
          "error"
        );
      } else if (
        code === "INVALID_AMOUNT"
      ) {
        notify(
          `Le montant doit être un nombre entier supérieur ou égal à ${MIN_AMOUNT} CDF.`,
          "error"
        );
      } else {
        notify(
          getErrorMessage(error),
          "error"
        );
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  // ======================================================
  // LOAD TID DETAIL
  // ======================================================

  const handleViewDetail = async (tidValue) => {
    if (!tidValue) return;

    try {
      setDetailLoading(true);

      const response = await api.get(
        `/ambassade/${encodeURIComponent(
          tidValue
        )}`
      );

      const data = response?.data;

      setSelectedTid(
        data?.tidTransaction || null
      );
    } catch (error) {
      console.error(
        "AMBASSADE TID DETAIL ERROR:",
        error
      );

      const code =
        error?.response?.data?.code;

      if (code === "TID_NOT_FOUND") {
        notify(
          "TID introuvable.",
          "error"
        );
      } else {
        notify(
          getErrorMessage(error),
          "error"
        );
      }
    } finally {
      setDetailLoading(false);
    }
  };

  // ======================================================
  // SEARCH TID DETAIL
  // ======================================================

  const handleSearch = async () => {
    const value = searchTid.trim();

    if (!value) {
      notify(
        "Saisissez un TID à rechercher.",
        "error"
      );
      return;
    }

    await handleViewDetail(value);
  };

  // ======================================================
  // FILTERED FUNDS
  // ======================================================

  const filteredFunds = useMemo(() => {
    const query =
      searchTid.trim().toLowerCase();

    if (!query) {
      return funds;
    }

    return funds.filter((item) =>
      String(item?.tid || "")
        .toLowerCase()
        .includes(query)
    );
  }, [funds, searchTid]);

  // ======================================================
  // STATISTICS
  // ======================================================

  const totalFunds = funds.reduce(
    (total, item) =>
      total + Number(item?.amount || 0),
    0
  );

  const totalTransactions = funds.length;

  // ======================================================
  // LOADING
  // ======================================================

  if (loading) {
    return (
      <div style={loadingBox}>
        <div style={loadingIcon}>⏳</div>

        <div>
          <div style={loadingTitle}>
            Chargement de l'Ambassade
          </div>

          <div style={loadingText}>
            Récupération des fonds en circulation...
          </div>
        </div>
      </div>
    );
  }

  // ======================================================
  // RENDER
  // ======================================================

  return (
    <div style={container}>
      {/* ==================================================
          NOTIFICATION
      ================================================== */}

      {notification && (
        <div
          style={{
            ...notificationBox,
            borderLeft:
              notification.type === "success"
                ? "4px solid #22c55e"
                : notification.type === "error"
                ? "4px solid #ef4444"
                : "4px solid #3b82f6",
          }}
        >
          <span>
            {notification.type === "success"
              ? "✅"
              : notification.type === "error"
              ? "❌"
              : "ℹ️"}
          </span>

          <span>
            {notification.message}
          </span>
        </div>
      )}

      {/* ==================================================
          HEADER
      ================================================== */}

      <div style={moduleHeader}>
        <div>
          <div style={moduleTitle}>
            🤝 Ambassade
          </div>

          <div style={moduleSubtitle}>
            Gestion des fonds reçus sur la C.O.6
            et mis à disposition des ambassadeurs.
          </div>
        </div>

        <button
          type="button"
          onClick={loadFunds}
          disabled={circulatingLoading}
          style={refreshButton}
        >
          {circulatingLoading
            ? "⏳ Actualisation..."
            : "🔄 Actualiser"}
        </button>
      </div>

      {/* ==================================================
          STATISTICS
      ================================================== */}

      <div style={statsGrid}>
        <div style={statCard}>
          <div style={statIcon}>💰</div>

          <div>
            <div style={statLabel}>
              Fonds en circulation
            </div>

            <div style={statValue}>
              {formatMoney(totalFunds)}
            </div>
          </div>
        </div>

        <div style={statCard}>
          <div style={statIcon}>🧾</div>

          <div>
            <div style={statLabel}>
              TID disponibles
            </div>

            <div style={statValue}>
              {totalTransactions}
            </div>
          </div>
        </div>

        <div style={statCard}>
          <div style={statIcon}>📌</div>

          <div>
            <div style={statLabel}>
              Montant minimum
            </div>

            <div style={statValue}>
              {formatMoney(MIN_AMOUNT)}
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================
          REGISTER FUNDS
      ================================================== */}

      <section style={card}>
        <div style={sectionHeader}>
          <div>
            <div style={sectionTitle}>
              💵 Enregistrer des fonds
            </div>

            <div style={sectionSubtitle}>
              Créez un TID disponible pour les
              opérations des ambassadeurs.
            </div>
          </div>

          <div style={availableBadge}>
            ● DISPONIBLE
          </div>
        </div>

        <form
          onSubmit={handleCirculate}
          style={form}
        >
          <div style={field}>
            <label style={label}>
              TID
            </label>

            <input
              type="text"
              value={tid}
              onChange={(event) =>
                setTid(
                  event.target.value.toUpperCase()
                )
              }
              placeholder="CO260821.1659.T32121"
              autoComplete="off"
              disabled={submitLoading}
              style={input}
            />

            <div style={hint}>
              Saisissez le TID reçu lors du paiement
              sur la C.O.6.
            </div>
          </div>

          <div style={field}>
            <label style={label}>
              Montant
            </label>

            <div style={amountWrapper}>
              <input
                type="number"
                min={MIN_AMOUNT}
                step="1"
                value={amount}
                onChange={(event) =>
                  setAmount(event.target.value)
                }
                placeholder="5000"
                disabled={submitLoading}
                style={amountInput}
              />

              <span style={currency}>
                CDF
              </span>
            </div>

            <div style={hint}>
              Minimum :{" "}
              <strong>
                {formatMoney(MIN_AMOUNT)}
              </strong>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitLoading}
            style={{
              ...submitButton,
              opacity: submitLoading ? 0.7 : 1,
            }}
          >
            {submitLoading
              ? "⏳ Enregistrement..."
              : "🚀 Faire circuler les fonds"}
          </button>
        </form>

        <div style={warningBox}>
          <span style={warningIcon}>
            ⚠️
          </span>

          <div>
            <strong>
              Attention
            </strong>

            <div style={warningText}>
              Cette opération ne crédite aucun wallet
              utilisateur. Le TID devient simplement
              disponible dans le système pour être
              recherché et utilisé par un ambassadeur.
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================
          SEARCH
      ================================================== */}

      <section style={card}>
        <div style={sectionHeader}>
          <div>
            <div style={sectionTitle}>
              🔎 Rechercher un TID
            </div>

            <div style={sectionSubtitle}>
              Consultez les informations détaillées
              d'une opération.
            </div>
          </div>
        </div>

        <div style={searchRow}>
          <input
            type="text"
            value={searchTid}
            onChange={(event) =>
              setSearchTid(
                event.target.value.toUpperCase()
              )
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                handleSearch();
              }
            }}
            placeholder="Ex. CO260821.1659.T32121"
            style={searchInput}
          />

          <button
            type="button"
            onClick={handleSearch}
            disabled={detailLoading}
            style={searchButton}
          >
            {detailLoading
              ? "⏳ Recherche..."
              : "🔎 Rechercher"}
          </button>
        </div>
      </section>

      {/* ==================================================
          DETAIL
      ================================================== */}

      {selectedTid && (
        <section style={card}>
          <div style={sectionHeader}>
            <div>
              <div style={sectionTitle}>
                📋 Détail du TID
              </div>

              <div style={sectionSubtitle}>
                Informations retournées par le serveur.
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                setSelectedTid(null)
              }
              style={closeButton}
            >
              ✕ Fermer
            </button>
          </div>

          <div style={detailGrid}>
            <DetailItem
              label="TID"
              value={selectedTid.tid}
              mono
            />

            <DetailItem
              label="Montant"
              value={formatMoney(
                selectedTid.amount
              )}
            />

            <DetailItem
              label="Statut"
              value={selectedTid.status}
              status
            />

            <DetailItem
              label="Utilisateur"
              value={
                selectedTid.user_id ??
                "Aucun"
              }
            />

            <DetailItem
              label="Transaction"
              value={
                selectedTid.transaction_id ??
                "Aucune"
              }
            />

            <DetailItem
              label="Créé le"
              value={formatDate(
                selectedTid.created_at
              )}
            />

            <DetailItem
              label="Mis à jour le"
              value={formatDate(
                selectedTid.updated_at
              )}
            />

            <DetailItem
              label="Utilisé le"
              value={
                selectedTid.used_at
                  ? formatDate(
                      selectedTid.used_at
                    )
                  : "Pas encore utilisé"
              }
            />
          </div>
        </section>
      )}

      {/* ==================================================
          CIRCULATING FUNDS
      ================================================== */}

      <section style={card}>
        <div style={sectionHeader}>
          <div>
            <div style={sectionTitle}>
              📊 Fonds en circulation
            </div>

            <div style={sectionSubtitle}>
              TID actuellement disponibles pour les
              ambassadeurs.
            </div>
          </div>

          <div style={countBadge}>
            {filteredFunds.length} TID
          </div>
        </div>

        {circulatingLoading ? (
          <div style={emptyBox}>
            ⏳ Actualisation des fonds...
          </div>
        ) : filteredFunds.length === 0 ? (
          <div style={emptyBox}>
            <div style={emptyIcon}>
              📭
            </div>

            <div style={emptyTitle}>
              Aucun fonds disponible
            </div>

            <div style={emptyText}>
              Aucun TID actuellement en circulation.
            </div>
          </div>
        ) : (
          <div style={tableWrapper}>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>
                    TID
                  </th>

                  <th style={th}>
                    Montant
                  </th>

                  <th style={th}>
                    Statut
                  </th>

                  <th style={th}>
                    Créé le
                  </th>

                  <th
                    style={{
                      ...th,
                      textAlign: "right",
                    }}
                  >
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredFunds.map(
                  (item) => (
                    <tr key={item.id}>
                      <td
                        style={{
                          ...td,
                          ...monoText,
                        }}
                      >
                        {item.tid}
                      </td>

                      <td
                        style={{
                          ...td,
                          fontWeight: 800,
                        }}
                      >
                        {formatMoney(
                          item.amount
                        )}
                      </td>

                      <td style={td}>
                        <span
                          style={
                            statusBadge
                          }
                        >
                          ●{" "}
                          {item.status ||
                            "AVAILABLE"}
                        </span>
                      </td>

                      <td style={td}>
                        {formatDate(
                          item.created_at
                        )}
                      </td>

                      <td
                        style={{
                          ...td,
                          textAlign: "right",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            handleViewDetail(
                              item.tid
                            )
                          }
                          disabled={
                            detailLoading
                          }
                          style={
                            detailButton
                          }
                        >
                          👁 Détail
                        </button>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

// ======================================================
// DETAIL ITEM
// ======================================================

function DetailItem({
  label,
  value,
  mono = false,
  status = false,
}) {
  return (
    <div style={detailItem}>
      <div style={detailLabel}>
        {label}
      </div>

      <div
        style={{
          ...detailValue,
          ...(mono ? monoText : {}),
        }}
      >
        {status ? (
          <span style={statusBadge}>
            ● {value}
          </span>
        ) : (
          value
        )}
      </div>
    </div>
  );
}

// ======================================================
// STYLES
// ======================================================

const container = {
  width: "100%",
  maxWidth: 1400,
  margin: "0 auto",
};

const moduleHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 20,
  marginBottom: 24,
  flexWrap: "wrap",
};

const moduleTitle = {
  fontSize: 28,
  fontWeight: 800,
};

const moduleSubtitle = {
  marginTop: 6,
  color: "#94a3b8",
  fontSize: 14,
  lineHeight: 1.5,
  maxWidth: 700,
};

const refreshButton = {
  padding: "12px 18px",
  borderRadius: 12,
  border:
    "1px solid rgba(255,255,255,0.08)",
  background:
    "rgba(255,255,255,0.06)",
  color: "white",
  cursor: "pointer",
  fontWeight: 700,
};

const statsGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(220px,1fr))",
  gap: 16,
  marginBottom: 20,
};

const statCard = {
  display: "flex",
  alignItems: "center",
  gap: 16,
  padding: 20,
  borderRadius: 18,
  background:
    "linear-gradient(135deg,rgba(37,99,235,0.15),rgba(124,58,237,0.10))",
  border:
    "1px solid rgba(255,255,255,0.08)",
};

const statIcon = {
  width: 48,
  height: 48,
  borderRadius: 14,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background:
    "rgba(255,255,255,0.07)",
  fontSize: 22,
};

const statLabel = {
  color: "#94a3b8",
  fontSize: 12,
  marginBottom: 5,
};

const statValue = {
  fontSize: 21,
  fontWeight: 800,
};

const card = {
  background:
    "rgba(15,23,42,0.72)",
  border:
    "1px solid rgba(255,255,255,0.07)",
  borderRadius: 20,
  padding: 22,
  marginBottom: 20,
  backdropFilter: "blur(10px)",
};

const sectionHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 15,
  marginBottom: 22,
  flexWrap: "wrap",
};

const sectionTitle = {
  fontSize: 19,
  fontWeight: 800,
};

const sectionSubtitle = {
  color: "#94a3b8",
  fontSize: 13,
  marginTop: 5,
};

const availableBadge = {
  padding: "7px 11px",
  borderRadius: 999,
  background:
    "rgba(34,197,94,0.12)",
  border:
    "1px solid rgba(34,197,94,0.25)",
  color: "#4ade80",
  fontSize: 11,
  fontWeight: 800,
};

const form = {
  display: "grid",
  gridTemplateColumns:
    "minmax(250px,1.5fr) minmax(180px,0.8fr) auto",
  gap: 16,
  alignItems: "end",
};

const field = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const label = {
  fontSize: 13,
  fontWeight: 700,
  color: "#cbd5e1",
};

const input = {
  width: "100%",
  boxSizing: "border-box",
  padding: "14px 15px",
  borderRadius: 13,
  border:
    "1px solid rgba(255,255,255,0.09)",
  background:
    "rgba(255,255,255,0.045)",
  color: "white",
  outline: "none",
  fontSize: 14,
};

const amountWrapper = {
  position: "relative",
};

const amountInput = {
  ...input,
  paddingRight: 55,
};

const currency = {
  position: "absolute",
  right: 15,
  top: "50%",
  transform: "translateY(-50%)",
  color: "#94a3b8",
  fontSize: 12,
  fontWeight: 800,
};

const hint = {
  color: "#64748b",
  fontSize: 11,
};

const submitButton = {
  minHeight: 48,
  padding: "0 20px",
  border: "none",
  borderRadius: 13,
  background:
    "linear-gradient(135deg,#16a34a,#15803d)",
  color: "white",
  cursor: "pointer",
  fontWeight: 800,
  whiteSpace: "nowrap",
};

const warningBox = {
  display: "flex",
  gap: 12,
  marginTop: 20,
  padding: 15,
  borderRadius: 14,
  background:
    "rgba(245,158,11,0.08)",
  border:
    "1px solid rgba(245,158,11,0.18)",
};

const warningIcon = {
  fontSize: 18,
};

const warningText = {
  marginTop: 4,
  color: "#94a3b8",
  fontSize: 12,
  lineHeight: 1.5,
};

const searchRow = {
  display: "flex",
  gap: 12,
};

const searchInput = {
  flex: 1,
  minWidth: 0,
  padding: "14px 15px",
  borderRadius: 13,
  border:
    "1px solid rgba(255,255,255,0.09)",
  background:
    "rgba(255,255,255,0.045)",
  color: "white",
  outline: "none",
  fontSize: 14,
};

const searchButton = {
  padding: "0 20px",
  border: "none",
  borderRadius: 13,
  background:
    "linear-gradient(135deg,#2563eb,#1d4ed8)",
  color: "white",
  cursor: "pointer",
  fontWeight: 800,
};

const closeButton = {
  padding: "8px 12px",
  borderRadius: 10,
  border:
    "1px solid rgba(255,255,255,0.08)",
  background:
    "rgba(255,255,255,0.05)",
  color: "#cbd5e1",
  cursor: "pointer",
  fontWeight: 700,
};

const countBadge = {
  padding: "7px 12px",
  borderRadius: 999,
  background:
    "rgba(37,99,235,0.12)",
  border:
    "1px solid rgba(37,99,235,0.2)",
  color: "#60a5fa",
  fontSize: 12,
  fontWeight: 800,
};

const tableWrapper = {
  overflowX: "auto",
  borderRadius: 14,
  border:
    "1px solid rgba(255,255,255,0.06)",
};

const table = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: 800,
};

const th = {
  padding: "14px 15px",
  textAlign: "left",
  color: "#94a3b8",
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  background:
    "rgba(255,255,255,0.035)",
  borderBottom:
    "1px solid rgba(255,255,255,0.06)",
};

const td = {
  padding: "15px",
  borderBottom:
    "1px solid rgba(255,255,255,0.05)",
  color: "#e2e8f0",
  fontSize: 13,
};

const monoText = {
  fontFamily:
    "ui-monospace,SFMono-Regular,Menlo,monospace",
  fontSize: 12,
};

const statusBadge = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  padding: "5px 9px",
  borderRadius: 999,
  background:
    "rgba(34,197,94,0.10)",
  border:
    "1px solid rgba(34,197,94,0.18)",
  color: "#4ade80",
  fontSize: 10,
  fontWeight: 800,
};

const detailButton = {
  padding: "8px 11px",
  borderRadius: 9,
  border:
    "1px solid rgba(255,255,255,0.08)",
  background:
    "rgba(255,255,255,0.05)",
  color: "white",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 700,
};

const detailGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(200px,1fr))",
  gap: 12,
};

const detailItem = {
  padding: 15,
  borderRadius: 14,
  background:
    "rgba(255,255,255,0.035)",
  border:
    "1px solid rgba(255,255,255,0.05)",
};

const detailLabel = {
  color: "#64748b",
  fontSize: 11,
  marginBottom: 7,
  textTransform: "uppercase",
  fontWeight: 700,
};

const detailValue = {
  color: "#e2e8f0",
  fontSize: 13,
  fontWeight: 700,
  wordBreak: "break-word",
};

const emptyBox = {
  padding: 45,
  textAlign: "center",
  borderRadius: 16,
  background:
    "rgba(255,255,255,0.025)",
  border:
    "1px dashed rgba(255,255,255,0.08)",
};

const emptyIcon = {
  fontSize: 30,
  marginBottom: 10,
};

const emptyTitle = {
  fontSize: 16,
  fontWeight: 800,
};

const emptyText = {
  marginTop: 5,
  color: "#64748b",
  fontSize: 13,
};

const loadingBox = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 15,
  minHeight: 220,
  borderRadius: 18,
  background:
    "rgba(255,255,255,0.04)",
  border:
    "1px solid rgba(255,255,255,0.06)",
};

const loadingIcon = {
  fontSize: 25,
};

const loadingTitle = {
  fontWeight: 800,
};

const loadingText = {
  color: "#64748b",
  fontSize: 12,
  marginTop: 4,
};

const notificationBox = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: 14,
  marginBottom: 20,
  borderRadius: 14,
  background:
    "rgba(255,255,255,0.05)",
  color: "#e2e8f0",
  fontSize: 13,
  fontWeight: 700,
};
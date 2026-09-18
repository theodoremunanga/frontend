import { useState } from "react";
import useAdminDashboard from "../hooks/useAdminDashboard";

const NAVBAR_HEIGHT = 70;

// ======================================================
// HELPERS
// ======================================================

const money = (value) => {
  const amount = Number(value || 0);

  return amount.toLocaleString("fr-FR");
};

const safeArray = (value) => {
  return Array.isArray(value) ? value : [];
};

const normalizeText = (value) => {
  return String(value ?? "").toLowerCase();
};

// ======================================================
// SMALL UI COMPONENTS
// ======================================================

function Card({ title, value }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statTitle}>{title}</div>
      <div style={styles.statValue}>{value ?? 0}</div>
    </div>
  );
}

// ======================================================
// ADMIN DASHBOARD
// ======================================================

export default function AdminDashboard() {
  const [tab, setTab] = useState("dashboard");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");

  const {
    loading,
    stats,
    transactions,
    matches,
    messages,
    notifications,
    fetchAll,
    approve,
    reject,
    cancelMatch,
  } = useAdminDashboard();

  // ====================================================
  // SAFE DATA
  // ====================================================

  const safeStats = stats || {};
  const safeTransactions = safeArray(transactions);
  const safeMatches = safeArray(matches);
  const safeMessages = safeArray(messages);
  const safeNotifications = safeArray(notifications);

  // ====================================================
  // TRANSACTIONS FILTER
  // ====================================================

  const searchValue = normalizeText(search);

  const filteredTx = safeTransactions.filter((transaction) => {
    const username = normalizeText(
      transaction.username ||
        transaction.user?.username ||
        transaction.user?.name
    );

    const transactionId = String(transaction.id ?? "");

    const matchesSearch =
      !searchValue ||
      username.includes(searchValue) ||
      transactionId.includes(searchValue);

    const matchesStatus =
      statusFilter === "all" ||
      normalizeText(transaction.status) === normalizeText(statusFilter);

    return matchesSearch && matchesStatus;
  });

  // ====================================================
  // NAVIGATION
  // ====================================================

  const tabs = [
    {
      key: "dashboard",
      label: "📊 Dashboard",
    },
    {
      key: "transactions",
      label: "💰 Transactions",
    },
    {
      key: "matches",
      label: "🎮 Matchs",
    },
    {
      key: "messages",
      label: "💬 Messages",
    },
  ];

  // ====================================================
  // RENDER
  // ====================================================

  return (
    <div style={styles.layout}>
      {/* ==================================================
          SIDEBAR
      ================================================== */}

      <aside style={styles.sidebar}>
        <div style={styles.brand}>
          <div style={styles.brandIcon}>⚡</div>

          <div>
            <div style={styles.brandTitle}>6BetBall</div>
            <div style={styles.brandSubtitle}>Administration</div>
          </div>
        </div>

        <nav style={styles.navigation}>
          {tabs.map((item) => {
            const active = tab === item.key;

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                style={{
                  ...styles.menuItem,
                  ...(active ? styles.menuItemActive : {}),
                }}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* ==================================================
          MAIN
      ================================================== */}

      <main style={styles.main}>
        {/* ==================================================
            HEADER
        ================================================== */}

        <header style={styles.header}>
          <div>
            <h1 style={styles.pageTitle}>
              {tab === "dashboard" && "Dashboard"}
              {tab === "transactions" && "Transactions"}
              {tab === "matches" && "Matchs"}
              {tab === "messages" && "Messages"}
            </h1>

            <p style={styles.pageSubtitle}>
              Administration de la plateforme 6BetBall
            </p>
          </div>

          <div style={styles.headerActions}>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher..."
              style={styles.searchBox}
            />

            {tab === "transactions" && (
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                style={styles.selectBox}
              >
                <option value="pending">En attente</option>
                <option value="approved">Validées</option>
                <option value="rejected">Rejetées</option>
                <option value="all">Toutes</option>
              </select>
            )}

            <button
              type="button"
              onClick={fetchAll}
              disabled={loading}
              style={{
                ...styles.refreshButton,
                ...(loading ? styles.refreshButtonDisabled : {}),
              }}
              title="Actualiser les données"
            >
              {loading ? "⏳" : "🔄"}
            </button>
          </div>
        </header>

        {/* ==================================================
            NOTIFICATIONS
        ================================================== */}

        {safeNotifications.length > 0 && (
          <div style={styles.notifications}>
            {safeNotifications.map((notification, index) => (
              <div
                key={`${index}-${String(notification)}`}
                style={styles.notification}
              >
                {String(notification)}
              </div>
            ))}
          </div>
        )}

        {/* ==================================================
            LOADING
        ================================================== */}

        {loading && (
          <div style={styles.loadingBox}>
            <div style={styles.loadingSpinner}>⏳</div>
            <span>Chargement des données...</span>
          </div>
        )}

        {/* ==================================================
            DASHBOARD
        ================================================== */}

        {tab === "dashboard" && (
          <section>
            <div style={styles.statsGrid}>
              <Card
                title="Utilisateurs"
                value={safeStats.users ?? 0}
              />

              <Card
                title="Dépôts"
                value={`${money(safeStats.totalDeposits)} FC`}
              />

              <Card
                title="Matchs"
                value={safeStats.matches ?? 0}
              />
            </div>

            <div style={styles.dashboardSection}>
              <div style={styles.sectionHeader}>
                <h2 style={styles.sectionTitle}>
                  Aperçu
                </h2>
              </div>

              <div style={styles.overviewGrid}>
                <div style={styles.overviewCard}>
                  <span style={styles.overviewLabel}>
                    Transactions
                  </span>

                  <strong style={styles.overviewValue}>
                    {safeTransactions.length}
                  </strong>
                </div>

                <div style={styles.overviewCard}>
                  <span style={styles.overviewLabel}>
                    Matchs
                  </span>

                  <strong style={styles.overviewValue}>
                    {safeMatches.length}
                  </strong>
                </div>

                <div style={styles.overviewCard}>
                  <span style={styles.overviewLabel}>
                    Messages
                  </span>

                  <strong style={styles.overviewValue}>
                    {safeMessages.length}
                  </strong>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ==================================================
            TRANSACTIONS
        ================================================== */}

        {tab === "transactions" && (
          <section>
            <div style={styles.sectionHeader}>
              <div>
                <h2 style={styles.sectionTitle}>
                  Transactions
                </h2>

                <p style={styles.sectionSubtitle}>
                  {filteredTx.length} transaction
                  {filteredTx.length !== 1 ? "s" : ""} affichée
                  {filteredTx.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            {filteredTx.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>💰</div>
                <strong>Aucune transaction</strong>
                <span>
                  Aucune transaction ne correspond aux critères actuels.
                </span>
              </div>
            ) : (
              <div style={styles.list}>
                {filteredTx.map((transaction) => {
                  const username =
                    transaction.username ||
                    transaction.user?.username ||
                    transaction.user?.name ||
                    "Utilisateur";

                  const status =
                    transaction.status || "unknown";

                  const reference =
                    transaction.reference ||
                    transaction.description ||
                    "—";

                  return (
                    <div
                      key={transaction.id}
                      style={styles.transactionCard}
                    >
                      <div style={styles.transactionMain}>
                        <div style={styles.transactionIdentity}>
                          <div style={styles.avatar}>
                            {String(username)
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div>
                            <strong style={styles.transactionUser}>
                              {username}
                            </strong>

                            <span style={styles.transactionId}>
                              ID #{transaction.id}
                            </span>
                          </div>
                        </div>

                        <div style={styles.transactionAmount}>
                          {money(transaction.amount)} FC
                        </div>
                      </div>

                      <div style={styles.transactionDetails}>
                        <div>
                          <span style={styles.detailLabel}>
                            Statut
                          </span>

                          <span
                            style={{
                              ...styles.statusBadge,
                              ...getStatusStyle(status),
                            }}
                          >
                            {formatStatus(status)}
                          </span>
                        </div>

                        <div>
                          <span style={styles.detailLabel}>
                            Référence
                          </span>

                          <span style={styles.detailValue}>
                            {reference}
                          </span>
                        </div>
                      </div>

                      {normalizeText(status) === "pending" && (
                        <div style={styles.transactionActions}>
                          <button
                            type="button"
                            onClick={() => approve(transaction.id)}
                            style={styles.approveButton}
                          >
                            ✔ Valider
                          </button>

                          <button
                            type="button"
                            onClick={() => reject(transaction.id)}
                            style={styles.rejectButton}
                          >
                            ✖ Rejeter
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ==================================================
            MATCHES
        ================================================== */}

        {tab === "matches" && (
          <section>
            <div style={styles.sectionHeader}>
              <div>
                <h2 style={styles.sectionTitle}>
                  Matchs
                </h2>

                <p style={styles.sectionSubtitle}>
                  {safeMatches.length} match
                  {safeMatches.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            {safeMatches.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>🎮</div>
                <strong>Aucun match</strong>
                <span>
                  Aucun match à afficher actuellement.
                </span>
              </div>
            ) : (
              <div style={styles.list}>
                {safeMatches.map((match) => {
                  const status =
                    match.status || "unknown";

                  return (
                    <div
                      key={match.id}
                      style={styles.matchCard}
                    >
                      <div style={styles.matchInfo}>
                        <div style={styles.matchIcon}>
                          🎮
                        </div>

                        <div>
                          <strong style={styles.matchTitle}>
                            Match #{match.id}
                          </strong>

                          <span style={styles.matchStatus}>
                            Statut : {formatStatus(status)}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => cancelMatch(match.id)}
                        style={styles.rejectButton}
                      >
                        Annuler
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ==================================================
            MESSAGES
        ================================================== */}

        {tab === "messages" && (
          <section>
            <div style={styles.sectionHeader}>
              <div>
                <h2 style={styles.sectionTitle}>
                  Messages
                </h2>

                <p style={styles.sectionSubtitle}>
                  {safeMessages.length} message
                  {safeMessages.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            {safeMessages.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>💬</div>
                <strong>Aucun message</strong>
                <span>
                  Aucun message à afficher actuellement.
                </span>
              </div>
            ) : (
              <div style={styles.list}>
                {safeMessages.map((message, index) => {
                  const sender =
                    message.username ||
                    message.sender_name ||
                    message.sender?.username ||
                    message.sender?.name ||
                    "Utilisateur";

                  const content =
                    message.content ||
                    message.message ||
                    message.text ||
                    "Message sans contenu";

                  return (
                    <div
                      key={message.id ?? index}
                      style={styles.messageCard}
                    >
                      <div style={styles.messageHeader}>
                        <div style={styles.transactionIdentity}>
                          <div style={styles.avatar}>
                            {String(sender)
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <strong style={styles.transactionUser}>
                            {sender}
                          </strong>
                        </div>

                        {message.created_at && (
                          <span style={styles.messageDate}>
                            {String(message.created_at)}
                          </span>
                        )}
                      </div>

                      <div style={styles.messageContent}>
                        {String(content)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

// ======================================================
// STATUS HELPERS
// ======================================================

function formatStatus(status) {
  const value = normalizeText(status);

  switch (value) {
    case "pending":
      return "En attente";

    case "approved":
      return "Validée";

    case "rejected":
      return "Rejetée";

    case "cancelled":
    case "canceled":
      return "Annulé";

    case "active":
      return "Actif";

    case "finished":
    case "completed":
      return "Terminé";

    case "waiting":
      return "En attente";

    default:
      return status || "Inconnu";
  }
}

function getStatusStyle(status) {
  const value = normalizeText(status);

  if (value === "pending") {
    return styles.statusPending;
  }

  if (value === "approved") {
    return styles.statusApproved;
  }

  if (value === "rejected") {
    return styles.statusRejected;
  }

  if (
    value === "cancelled" ||
    value === "canceled"
  ) {
    return styles.statusCancelled;
  }

  return styles.statusDefault;
}

// ======================================================
// STYLES
// ======================================================

const styles = {
  layout: {
    minHeight: `calc(100vh - ${NAVBAR_HEIGHT}px)`,
    display: "flex",
    background: "#f5f7fb",
    color: "#111827",
    fontFamily:
      "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },

  // ====================================================
  // SIDEBAR
  // ====================================================

  sidebar: {
    width: "250px",
    minHeight: `calc(100vh - ${NAVBAR_HEIGHT}px)`,
    background: "#111827",
    color: "#ffffff",
    padding: "24px 16px",
    boxSizing: "border-box",
    position: "sticky",
    top: `${NAVBAR_HEIGHT}px`,
    alignSelf: "flex-start",
  },

  brand: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "4px 8px 28px",
    borderBottom: "1px solid rgba(255,255,255,0.1)",
  },

  brandIcon: {
    width: "42px",
    height: "42px",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#2563eb",
    fontSize: "21px",
  },

  brandTitle: {
    fontSize: "18px",
    fontWeight: 800,
  },

  brandSubtitle: {
    marginTop: "2px",
    fontSize: "12px",
    color: "#9ca3af",
  },

  navigation: {
    display: "flex",
    flexDirection: "column",
    gap: "7px",
    marginTop: "24px",
  },

  menuItem: {
    width: "100%",
    border: "none",
    borderRadius: "10px",
    padding: "12px 14px",
    background: "transparent",
    color: "#d1d5db",
    textAlign: "left",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "background 0.2s ease",
  },

  menuItemActive: {
    background: "#2563eb",
    color: "#ffffff",
  },

  // ====================================================
  // MAIN
  // ====================================================

  main: {
    flex: 1,
    minWidth: 0,
    padding: "28px",
    boxSizing: "border-box",
  },

  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "20px",
    marginBottom: "28px",
    flexWrap: "wrap",
  },

  pageTitle: {
    margin: 0,
    fontSize: "28px",
    fontWeight: 800,
    color: "#111827",
  },

  pageSubtitle: {
    margin: "5px 0 0",
    color: "#6b7280",
    fontSize: "14px",
  },

  headerActions: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
  },

  searchBox: {
    width: "220px",
    maxWidth: "100%",
    height: "42px",
    padding: "0 13px",
    border: "1px solid #d1d5db",
    borderRadius: "9px",
    outline: "none",
    background: "#ffffff",
    color: "#111827",
    boxSizing: "border-box",
  },

  selectBox: {
    height: "42px",
    padding: "0 12px",
    border: "1px solid #d1d5db",
    borderRadius: "9px",
    outline: "none",
    background: "#ffffff",
    color: "#111827",
    cursor: "pointer",
  },

  refreshButton: {
    width: "42px",
    height: "42px",
    border: "none",
    borderRadius: "9px",
    background: "#111827",
    color: "#ffffff",
    cursor: "pointer",
    fontSize: "17px",
  },

  refreshButtonDisabled: {
    opacity: 0.6,
    cursor: "wait",
  },

  // ====================================================
  // NOTIFICATIONS
  // ====================================================

  notifications: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    marginBottom: "20px",
  },

  notification: {
    padding: "10px 13px",
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "9px",
    color: "#374151",
    fontSize: "13px",
  },

  // ====================================================
  // LOADING
  // ====================================================

  loadingBox: {
    display: "flex",
    alignItems: "center",
    gap: "9px",
    marginBottom: "20px",
    padding: "12px 15px",
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "9px",
    color: "#4b5563",
    fontSize: "14px",
  },

  loadingSpinner: {
    fontSize: "16px",
  },

  // ====================================================
  // STATS
  // ====================================================

  statsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(190px, 1fr))",
    gap: "16px",
    marginBottom: "28px",
  },

  statCard: {
    padding: "20px",
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    boxShadow: "0 2px 8px rgba(15, 23, 42, 0.04)",
  },

  statTitle: {
    color: "#6b7280",
    fontSize: "13px",
    fontWeight: 600,
    marginBottom: "9px",
  },

  statValue: {
    color: "#111827",
    fontSize: "26px",
    fontWeight: 800,
  },

  // ====================================================
  // SECTIONS
  // ====================================================

  dashboardSection: {
    marginTop: "10px",
  },

  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "15px",
    marginBottom: "16px",
  },

  sectionTitle: {
    margin: 0,
    fontSize: "20px",
    fontWeight: 800,
  },

  sectionSubtitle: {
    margin: "5px 0 0",
    color: "#6b7280",
    fontSize: "13px",
  },

  overviewGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "14px",
  },

  overviewCard: {
    padding: "18px",
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
  },

  overviewLabel: {
    display: "block",
    color: "#6b7280",
    fontSize: "13px",
    marginBottom: "7px",
  },

  overviewValue: {
    fontSize: "22px",
    fontWeight: 800,
  },

  // ====================================================
  // LIST
  // ====================================================

  list: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },

  // ====================================================
  // TRANSACTIONS
  // ====================================================

  transactionCard: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "13px",
    padding: "17px",
    boxShadow: "0 2px 8px rgba(15, 23, 42, 0.03)",
  },

  transactionMain: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "15px",
    flexWrap: "wrap",
  },

  transactionIdentity: {
    display: "flex",
    alignItems: "center",
    gap: "11px",
  },

  avatar: {
    width: "38px",
    height: "38px",
    borderRadius: "50%",
    background: "#e5e7eb",
    color: "#374151",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
  },

  transactionUser: {
    display: "block",
    fontSize: "15px",
  },

  transactionId: {
    display: "block",
    marginTop: "3px",
    color: "#9ca3af",
    fontSize: "12px",
  },

  transactionAmount: {
    fontSize: "18px",
    fontWeight: 800,
    whiteSpace: "nowrap",
  },

  transactionDetails: {
    display: "flex",
    gap: "28px",
    marginTop: "16px",
    paddingTop: "13px",
    borderTop: "1px solid #f0f1f3",
    flexWrap: "wrap",
  },

  detailLabel: {
    display: "block",
    marginBottom: "5px",
    color: "#9ca3af",
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },

  detailValue: {
    color: "#374151",
    fontSize: "13px",
  },

  statusBadge: {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: "999px",
    padding: "4px 9px",
    fontSize: "12px",
    fontWeight: 700,
  },

  statusPending: {
    background: "#fef3c7",
    color: "#92400e",
  },

  statusApproved: {
    background: "#dcfce7",
    color: "#166534",
  },

  statusRejected: {
    background: "#fee2e2",
    color: "#991b1b",
  },

  statusCancelled: {
    background: "#e5e7eb",
    color: "#374151",
  },

  statusDefault: {
    background: "#e5e7eb",
    color: "#374151",
  },

  transactionActions: {
    display: "flex",
    gap: "8px",
    marginTop: "15px",
    flexWrap: "wrap",
  },

  approveButton: {
    border: "none",
    borderRadius: "8px",
    padding: "9px 13px",
    background: "#16a34a",
    color: "#ffffff",
    fontWeight: 700,
    cursor: "pointer",
  },

  rejectButton: {
    border: "none",
    borderRadius: "8px",
    padding: "9px 13px",
    background: "#dc2626",
    color: "#ffffff",
    fontWeight: 700,
    cursor: "pointer",
  },

  // ====================================================
  // MATCHES
  // ====================================================

  matchCard: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "15px",
    padding: "17px",
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "13px",
    flexWrap: "wrap",
  },

  matchInfo: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },

  matchIcon: {
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    background: "#eff6ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "18px",
  },

  matchTitle: {
    display: "block",
    fontSize: "15px",
  },

  matchStatus: {
    display: "block",
    marginTop: "4px",
    color: "#6b7280",
    fontSize: "12px",
  },

  // ====================================================
  // MESSAGES
  // ====================================================

  messageCard: {
    padding: "17px",
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "13px",
  },

  messageHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "15px",
    flexWrap: "wrap",
  },

  messageDate: {
    color: "#9ca3af",
    fontSize: "12px",
  },

  messageContent: {
    marginTop: "14px",
    paddingTop: "13px",
    borderTop: "1px solid #f0f1f3",
    color: "#374151",
    fontSize: "14px",
    lineHeight: 1.55,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },

  // ====================================================
  // EMPTY
  // ====================================================

  emptyState: {
    minHeight: "220px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "7px",
    padding: "30px",
    background: "#ffffff",
    border: "1px dashed #d1d5db",
    borderRadius: "14px",
    color: "#6b7280",
    textAlign: "center",
  },

  emptyIcon: {
    fontSize: "32px",
    marginBottom: "5px",
  },
};

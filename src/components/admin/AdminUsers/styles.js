// =======================================================
// GLOBAL COLORS
// =======================================================

export const COLORS = {
    background: "#0b1120",
    panel: "#111827",
    panelLight: "#1f2937",
    border: "rgba(255,255,255,.08)",

    primary: "#2563eb",
    success: "#22c55e",
    danger: "#ef4444",
    warning: "#f59e0b",

    text: "#ffffff",
    textSoft: "#94a3b8",

    admin: "#dc2626",
    jo: "#2563eb",
    user: "#16a34a",

    suspended: "#6b7280",

    verified: "#22c55e",
    pending: "#f59e0b",
    rejected: "#ef4444",
};

// =======================================================
// PAGE
// =======================================================

export const page = {
    display: "flex",
    flexDirection: "column",
    gap: 20,
    color: COLORS.text,
};

// =======================================================
// MAIN LAYOUT
// =======================================================

export const layout = {
    display: "grid",
    gridTemplateColumns: "340px 1fr",
    gap: 20,
    alignItems: "flex-start",
};

// =======================================================
// PANEL
// =======================================================

export const panel = {
    background: COLORS.panel,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 18,
    overflow: "hidden",
};

// =======================================================
// SIDEBAR
// =======================================================

export const sidebar = {
    ...panel,
    height: "calc(100vh - 180px)",
    display: "flex",
    flexDirection: "column",
};

// =======================================================
// DETAILS
// =======================================================

export const details = {
    ...panel,
    minHeight: "calc(100vh - 180px)",
    padding: 24,
};

// =======================================================
// HEADER
// =======================================================

export const header = {
    ...panel,
    padding: 24,
};

export const headerTitle = {
    fontSize: 28,
    fontWeight: 800,
};

export const headerSubtitle = {
    marginTop: 5,
    color: COLORS.textSoft,
};

// =======================================================
// HEADER STATS
// =======================================================

export const statsRow = {
    display: "grid",
    gridTemplateColumns: "repeat(6,1fr)",
    gap: 15,
    marginTop: 25,
};

export const statCard = {
    background: COLORS.panelLight,
    borderRadius: 16,
    padding: 18,
};

export const statLabel = {
    fontSize: 12,
    color: COLORS.textSoft,
};

export const statValue = {
    fontSize: 24,
    fontWeight: 800,
    marginTop: 8,
};

// =======================================================
// FILTERS
// =======================================================

export const filters = {
    padding: 15,
    borderBottom: `1px solid ${COLORS.border}`,
};

export const input = {
    width: "100%",
    padding: 12,
    marginBottom: 10,
    borderRadius: 12,
    border: `1px solid ${COLORS.border}`,
    background: COLORS.panelLight,
    color: "white",
    outline: "none",
};

export const select = {
    width: "100%",
    padding: 12,
    marginBottom: 10,
    borderRadius: 12,
    border: `1px solid ${COLORS.border}`,
    background: COLORS.panelLight,
    color: "white",
};

// =======================================================
// USER LIST
// =======================================================

export const usersList = {
    flex: 1,
    overflowY: "auto",
};

// =======================================================
// USER ROW
// =======================================================

export const userRow = {
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: 14,
    cursor: "pointer",
    borderBottom: `1px solid ${COLORS.border}`,
    transition: ".2s",
};

export const userRowActive = {
    ...userRow,
    background: "#1d4ed8",
};

export const folder = {
    fontSize: 24,
};

export const userName = {
    fontWeight: 700,
};

export const userSmall = {
    color: COLORS.textSoft,
    fontSize: 12,
};

// =======================================================
// SECTION
// =======================================================

export const section = {
    marginTop: 25,
};

export const sectionTitle = {
    fontWeight: 700,
    fontSize: 20,
    marginBottom: 16,
};

// =======================================================
// GRID
// =======================================================

export const grid2 = {
    display: "grid",
    gridTemplateColumns: "repeat(2,1fr)",
    gap: 16,
};

export const grid4 = {
    display: "grid",
    gridTemplateColumns:
        "repeat(auto-fit,minmax(180px,1fr))",
    gap: 16,
};

// =======================================================
// CARD
// =======================================================

export const card = {
    background: COLORS.panelLight,
    borderRadius: 16,
    padding: 18,
};

export const cardLabel = {
    color: COLORS.textSoft,
    fontSize: 13,
};

export const cardValue = {
    marginTop: 10,
    fontWeight: 700,
    fontSize: 22,
};

// =======================================================
// ACTION BUTTON
// =======================================================

export const actionsGrid = {
    display: "grid",
    gridTemplateColumns: "repeat(4,1fr)",
    gap: 14,
};

export const actionButton = {
    border: "none",
    borderRadius: 14,
    padding: 18,
    cursor: "pointer",
    color: "white",
    background: COLORS.panelLight,
    fontWeight: 700,
    fontSize: 15,
};
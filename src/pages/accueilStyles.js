// ================= STYLES =================

const styles = {
  container: {
    minHeight: "100vh",
    background:
      "linear-gradient(to bottom, #020617, #0f172a)",
    color: "white",
  },

  adsWrapper: {
    maxWidth: 1300,
    margin: "20px auto",
    padding: "0 20px",
  },

  feedAdCard: {
    background:
      "linear-gradient(to bottom, rgba(30,41,59,0.96), rgba(15,23,42,0.96))",
    borderRadius: 28,
    padding: 24,
    marginBottom: 40,
    border:
      "1px solid rgba(255,255,255,0.08)",
  },

  adTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },

  sponsoredBadge: {
    background:
      "linear-gradient(to right,#eab308,#f59e0b)",
    color: "#111827",
    padding: "6px 12px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: "bold",
  },

  advertiserName: {
    opacity: 0.7,
    fontSize: 14,
  },

  adTitle: {
    fontSize: 28,
    fontWeight: 900,
    marginBottom: 20,
  },

  adImage: {
    width: "100%",
    borderRadius: 20,
    marginBottom: 20,
    maxHeight: 450,
    objectFit: "cover",
  },

  adDescription: {
    opacity: 0.85,
    lineHeight: 1.7,
    marginBottom: 20,
  },

  adButton: {
    padding: "14px 22px",
    border: "none",
    borderRadius: 16,
    background:
      "linear-gradient(to right,#2563eb,#4f46e5)",
    color: "white",
    fontWeight: "bold",
    cursor: "pointer",
  },

  hero: {
    position: "relative",
    paddingBottom: 40,
    overflow: "hidden",
  },

  heroOverlay: {
    position: "absolute",
    inset: 0,
    background:
      "radial-gradient(circle at top, rgba(59,130,246,0.35), transparent 60%)",
  },

  heroContent: {
    position: "relative",
    zIndex: 2,
    maxWidth: 1300,
    margin: "0 auto",
    padding: "40px 20px",
  },

  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 20,
    flexWrap: "wrap",
  },

  title: {
    fontSize: 52,
    fontWeight: 900,
    marginBottom: 10,
  },

  subtitle: {
    opacity: 0.8,
    fontSize: 18,
  },

  profileCard: {
    display: "flex",
    alignItems: "center",
    gap: 15,
    background: "rgba(255,255,255,0.08)",
    padding: "12px 18px",
    borderRadius: 20,
    backdropFilter: "blur(12px)",
  },

  avatar: {
    width: 50,
    height: 50,
    borderRadius: "50%",
    background:
      "linear-gradient(to bottom right, #2563eb, #7c3aed)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 22,
  },

  statsGrid: {
    marginTop: 30,
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(180px,1fr))",
    gap: 20,
  },

  statCard: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 24,
    padding: 24,
    backdropFilter: "blur(10px)",
  },

  statIcon: {
    fontSize: 26,
  },

  statValue: {
    fontSize: 36,
    fontWeight: 900,
    marginTop: 12,
  },

  statLabel: {
    opacity: 0.7,
  },

  content: {
    maxWidth: 1300,
    margin: "0 auto",
    padding: "0 20px 60px",
  },

  sectionTitle: {
    fontSize: 28,
    fontWeight: 900,
    marginBottom: 18,
    display: "flex",
    alignItems: "center",
    gap: 10,
  },

  horizontalScroll: {
    display: "flex",
    gap: 20,
    overflowX: "auto",
    paddingBottom: 10,
    marginBottom: 40,
  },

  challengeCard: {
    minWidth: 250,
    background:
      "linear-gradient(to bottom, rgba(30,41,59,0.95), rgba(15,23,42,0.95))",
    borderRadius: 26,
    padding: 24,
    border: "1px solid rgba(255,255,255,0.06)",
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },

  gameBadge: {
    background: "#2563eb",
    width: "fit-content",
    padding: "6px 12px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: "bold",
  },

  smallText: {
    fontSize: 13,
    opacity: 0.8,
  },

  statusBadge: {
    padding: "6px 10px",
    borderRadius: 999,
    width: "fit-content",
    fontSize: 12,
    fontWeight: "bold",
  },

  primaryButton: {
    marginTop: 10,
    padding: 14,
    borderRadius: 14,
    border: "none",
    background:
      "linear-gradient(to right, #22c55e, #16a34a)",
    color: "white",
    fontWeight: "bold",
    cursor: "pointer",
  },

  joinButton: {
    marginTop: 10,
    padding: 14,
    borderRadius: 14,
    border: "none",
    background:
      "linear-gradient(to right, #2563eb, #1d4ed8)",
    color: "white",
    fontWeight: "bold",
    cursor: "pointer",
  },

  disabledButton: {
    marginTop: 10,
    padding: 14,
    borderRadius: 14,
    border: "none",
    background: "#475569",
    color: "white",
    fontWeight: "bold",
    cursor: "not-allowed",
  },

  grid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(340px,1fr))",
    gap: 25,
  },

  emptyBox: {
    background: "rgba(255,255,255,0.05)",
    padding: 25,
    borderRadius: 24,
    textAlign: "center",
    opacity: 0.7,
    marginBottom: 40,
  },

  footer: {
    marginTop: 70,
    paddingTop: 30,
    borderTop:
      "1px solid rgba(255,255,255,0.08)",
    textAlign: "center",
  },

  errorStyle: {
    background:
      "linear-gradient(to right, #7f1d1d, #991b1b)",
    padding: 16,
    borderRadius: 18,
    marginBottom: 25,
    textAlign: "center",
    fontWeight: "bold",
  },

  loadingContainer: {
    minHeight: "100vh",
    background: "#020617",
    color: "white",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
  },

  spinner: {
    width: 70,
    height: 70,
    border: "6px solid rgba(255,255,255,0.1)",
    borderTop: "6px solid #2563eb",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },

  gameCard: {
    background:
      "linear-gradient(to bottom, rgba(30,41,59,0.95), rgba(15,23,42,0.95))",
    borderRadius: 30,
    padding: 28,
    boxShadow:
      "0 15px 40px rgba(0,0,0,0.25)",
  },

  gameTop: {
    display: "flex",
    gap: 18,
    marginBottom: 20,
  },

  gameIcon: {
    fontSize: 50,
  },

  gameDescription: {
    opacity: 0.75,
    marginTop: 6,
    lineHeight: 1.5,
  },

  availabilityBadge: {
    width: "fit-content",
    padding: "8px 14px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 20,
  },

  input: {
    width: "100%",
    padding: 15,
    marginBottom: 15,
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "#1e293b",
    color: "white",
    fontSize: 15,
  },

  launchButton: {
    width: "100%",
    padding: 16,
    borderRadius: 18,
    border: "none",
    background:
      "linear-gradient(to right, #2563eb, #4f46e5)",
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
    cursor: "pointer",
  },

  disabledContainer: {
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },

  disabledText: {
    opacity: 0.7,
    lineHeight: 1.6,
  },

  disabledButtonLarge: {
    width: "100%",
    padding: 16,
    borderRadius: 18,
    border: "none",
    background: "#334155",
    color: "#94a3b8",
    fontWeight: "bold",
  },
};

export default styles;
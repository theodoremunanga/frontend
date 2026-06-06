import {
  Trophy,
  XCircle,
  Percent,
  Target,
  Swords,
  TrendingUp,
  ShieldCheck,
  Flame,
} from "lucide-react";

export default function Stats({ stats }) {
  if (!stats) return null;

  // =========================================
  // SAFE VALUES
  // =========================================

  const wins = Number(stats?.wins || 0);

  const losses = Number(
    stats?.losses || 0
  );

  const draws = Number(
    stats?.draws || 0
  );

  const currentStreak = Number(
    stats?.current_streak || 0
  );

  const bestStreak = Number(
    stats?.best_streak || 0
  );

  const total =
    wins + losses + draws;

  // =========================================
  // WIN RATE
  // =========================================

  const winRate =
    total > 0
      ? (
          (wins / total) *
          100
        ).toFixed(1)
      : "0.0";

  // =========================================
  // PERFORMANCE LEVEL
  // =========================================

  let performance =
    "Débutant";

  let performanceColor =
    "#94a3b8";

  if (winRate >= 80) {
    performance =
      "Élite";

    performanceColor =
      "#22c55e";
  } else if (winRate >= 60) {
    performance =
      "Professionnel";

    performanceColor =
      "#38bdf8";
  } else if (winRate >= 40) {
    performance =
      "Intermédiaire";

    performanceColor =
      "#f59e0b";
  }

  // =========================================
  // RENDER
  // =========================================

  return (
    <div style={card}>
      {/* HEADER */}

      <div style={header}>
        <div>
          <h2 style={title}>
            📊 Statistiques Joueur
          </h2>

          <p style={subtitle}>
            Analyse complète des
            performances
          </p>
        </div>

        <div
          style={{
            ...badge,
            borderColor:
              performanceColor,
            color: performanceColor,
          }}
        >
          <ShieldCheck
            size={15}
          />

          {performance}
        </div>
      </div>

      {/* MAIN STATS */}

      <div style={grid}>
        <StatBox
          icon={
            <Trophy size={20} />
          }
          label="Victoires"
          value={wins}
          color="#22c55e"
          bg="rgba(34,197,94,0.15)"
        />

        <StatBox
          icon={
            <XCircle size={20} />
          }
          label="Défaites"
          value={losses}
          color="#ef4444"
          bg="rgba(239,68,68,0.15)"
        />

        <StatBox
          icon={
            <Target size={20} />
          }
          label="Nulls"
          value={draws}
          color="#f59e0b"
          bg="rgba(245,158,11,0.15)"
        />

        <StatBox
          icon={
            <Percent size={20} />
          }
          label="Win Rate"
          value={`${winRate}%`}
          color="#38bdf8"
          bg="rgba(56,189,248,0.15)"
        />

        <StatBox
          icon={
            <Flame size={20} />
          }
          label="Série actuelle"
          value={currentStreak}
          color="#f97316"
          bg="rgba(249,115,22,0.15)"
        />

        <StatBox
          icon={
            <TrendingUp size={20} />
          }
          label="Meilleure série"
          value={bestStreak}
          color="#a855f7"
          bg="rgba(168,85,247,0.15)"
        />
      </div>

      {/* FOOTER */}

      <div style={footer}>
        <div style={footerCard}>
          <Swords size={18} />

          <span>
            Total matchs :
          </span>

          <strong>{total}</strong>
        </div>

        <div style={footerCard}>
          <ShieldCheck
            size={18}
          />

          <span>
            Niveau joueur :
          </span>

          <strong
            style={{
              color:
                performanceColor,
            }}
          >
            {performance}
          </strong>
        </div>
      </div>
    </div>
  );
}

// =========================================
// STAT BOX
// =========================================

function StatBox({
  icon,
  label,
  value,
  color,
  bg,
}) {
  return (
    <div style={box}>
      <div
        style={{
          ...iconBox,
          background: bg,
          color,
        }}
      >
        {icon}
      </div>

      <p style={labelStyle}>
        {label}
      </p>

      <h3
        style={{
          ...valueStyle,
          color,
        }}
      >
        {value}
      </h3>
    </div>
  );
}

// =========================================
// STYLES
// =========================================

const card = {
  background:
    "linear-gradient(145deg,#111827,#0f172a)",
  padding: 24,
  borderRadius: 22,
  border: "1px solid #1e293b",
  boxShadow:
    "0 10px 40px rgba(0,0,0,0.35)",
};

const header = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: 20,
  marginBottom: 25,
  flexWrap: "wrap",
};

const title = {
  margin: 0,
  fontSize: 24,
  fontWeight: "bold",
  color: "white",
};

const subtitle = {
  marginTop: 8,
  color: "#94a3b8",
  fontSize: 14,
};

const badge = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "10px 16px",
  borderRadius: 999,
  border: "1px solid",
  fontWeight: "bold",
  background:
    "rgba(255,255,255,0.03)",
};

const grid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(180px,1fr))",
  gap: 16,
};

const box = {
  background:
    "rgba(255,255,255,0.03)",
  border:
    "1px solid rgba(255,255,255,0.05)",
  borderRadius: 18,
  padding: 18,
  textAlign: "center",
  transition: "0.3s",
};

const iconBox = {
  width: 52,
  height: 52,
  borderRadius: 16,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  margin: "0 auto 14px",
};

const labelStyle = {
  color: "#94a3b8",
  fontSize: 14,
  marginBottom: 10,
};

const valueStyle = {
  margin: 0,
  fontSize: 28,
  fontWeight: "bold",
};

const footer = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(240px,1fr))",
  gap: 16,
  marginTop: 24,
};

const footerCard = {
  background:
    "rgba(255,255,255,0.03)",
  border:
    "1px solid rgba(255,255,255,0.05)",
  padding: 18,
  borderRadius: 16,
  display: "flex",
  alignItems: "center",
  gap: 12,
  color: "white",
};
import {
  useState,
  useEffect,
  useMemo,
} from "react";

import {
  User,
  Wallet as WalletIcon,
  RefreshCw,
  Trophy,
  ShieldCheck,
  Phone,
  Mail,
  Globe,
  TrendingUp,
  Clock3,
  Star,
  Swords,
  Coins,
  BadgeCheck,
} from "lucide-react";

import WalletActions from "../WalletActions";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://192.168.42.106:3000/api";

export default function ProfileRadar() {
  // ======================================================
  // STATES
  // ======================================================

  const [user, setUser] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [refreshing, setRefreshing] =
    useState(false);

  const token =
    localStorage.getItem("token");

  // ======================================================
  // LOAD PROFILE
  // ======================================================

  const load = async (
    silent = false
  ) => {
    try {
      if (!silent) {
        setLoading(true);
      }

      setRefreshing(true);

      setError("");

      if (!token) {
        setError(
          "Utilisateur non authentifié"
        );

        return;
      }

      const res = await fetch(
        `${API_URL}/user/profile`,
        {
          method: "GET",

          headers: {
            Authorization:
              "Bearer " + token,

            "Content-Type":
              "application/json",
          },
        }
      );

      let data = null;

      try {
        data = await res.json();
      } catch {
        throw new Error(
          "Réponse serveur invalide"
        );
      }

      if (!res.ok) {
        if (
          data?.error ===
            "Token invalide" ||
          data?.error ===
            "Token expiré"
        ) {
          localStorage.clear();

          window.location.reload();

          return;
        }

        throw new Error(
          data?.error ||
            "Erreur serveur"
        );
      }

      setUser(data);

    } catch (err) {

      console.error(
        "PROFILE ERROR:",
        err
      );

      setError(
        err.message ||
          "Erreur chargement profil"
      );

    } finally {

      setLoading(false);

      setRefreshing(false);
    }
  };

  // ======================================================
  // INIT
  // ======================================================

  useEffect(() => {
    load();
  }, []);

  // ======================================================
  // DERIVED
  // ======================================================

  const balance = Number(
    user?.wallet?.balance ??
      user?.balance ??
      0
  );

  const locked = Number(
    user?.wallet
      ?.balance_locked ?? 0
  );

  const wins = Number(
    user?.wins || 0
  );

  const losses = Number(
    user?.losses || 0
  );

  const matches = Number(
    user?.matches || 0
  );

  const level = Number(
    user?.level || 1
  );

  const customId =
    user?.custom_id ||
    (user?.id
      ? `PLAYER-${String(
          user.id
        ).padStart(6, "0")}`
      : "UNKNOWN");

  const winRate = useMemo(() => {

    const total =
      wins + losses;

    if (total <= 0) {
      return 0;
    }

    return Number(
      (
        (wins / total) *
        100
      ).toFixed(1)
    );

  }, [wins, losses]);

  const rank = useMemo(() => {

    if (wins >= 200)
      return "🔥 Grand Maître";

    if (wins >= 100)
      return "👑 Maître";

    if (wins >= 50)
      return "⚔️ Expert";

    if (wins >= 20)
      return "🥈 Confirmé";

    return "🥉 Débutant";

  }, [wins]);

  // ======================================================
  // LOADING
  // ======================================================

  if (loading) {
    return (
      <div style={loadingContainer}>
        <div style={loader} />

        <h2>
          Chargement du profil...
        </h2>
      </div>
    );
  }

  // ======================================================
  // ERROR
  // ======================================================

  if (error) {
    return (
      <div style={container}>
        <div style={errorCard}>
          <h2>
            ❌ Une erreur est
            survenue
          </h2>

          <p>{error}</p>

          <button
            onClick={() => load()}
            style={retryBtn}
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  // ======================================================
  // EMPTY
  // ======================================================

  if (!user) {
    return (
      <div style={container}>
        <div style={emptyCard}>
          Aucun utilisateur trouvé
        </div>
      </div>
    );
  }

  // ======================================================
  // UI
  // ======================================================

  return (
    <div style={container}>
      {/* HERO */}

      <div style={hero}>
        <div style={heroLeft}>
          <div style={avatar}>
            {user?.username
              ?.charAt(0)
              ?.toUpperCase() || "U"}
          </div>

          <div>
            <div style={verified}>
              <BadgeCheck size={14} />
              Joueur vérifié
            </div>

            <h1 style={username}>
              {user?.username ||
                "Utilisateur"}
            </h1>

            <div style={heroMeta}>
              <span>
                {customId}
              </span>

              <span>
                Niveau {level}
              </span>

              <span>{rank}</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => load(true)}
          style={refreshBtn}
        >
          <RefreshCw
            size={18}
            style={{
              animation:
                refreshing
                  ? "spin 1s linear infinite"
                  : "none",
            }}
          />

          Actualiser
        </button>
      </div>

      {/* GRID */}

      <div style={grid}>
        {/* WALLET */}

        <div style={card}>
          <SectionTitle
            icon={
              <WalletIcon
                size={18}
              />
            }
            title="Portefeuille"
          />

          <div style={walletBox}>
            <div style={walletLabel}>
              Solde disponible
            </div>

            <div style={walletAmount}>
              {balance.toLocaleString()}{" "}
              CDF
            </div>
          </div>

          <div style={miniContainer}>
            <MiniStat
              icon={
                <ShieldCheck
                  size={15}
                />
              }
              label="Bloqué"
              value={`${locked.toLocaleString()} CDF`}
            />

            <MiniStat
              icon={
                <Coins size={15} />
              }
              label="Winrate"
              value={`${winRate}%`}
            />
          </div>

          <div
            style={{
              marginTop: 20,
            }}
          >
            <WalletActions
              onSuccess={() =>
                load(true)
              }
            />
          </div>
        </div>

        {/* PROFILE */}

        <div style={card}>
          <SectionTitle
            icon={<User size={18} />}
            title="Informations"
          />

          <InfoRow
            icon={<User size={15} />}
            label="Nom"
            value={
              user?.username ||
              "N/A"
            }
          />

          <InfoRow
            icon={<Mail size={15} />}
            label="Email"
            value={
              user?.email || "N/A"
            }
          />

          <InfoRow
            icon={<Phone size={15} />}
            label="Téléphone"
            value={
              user?.phone || "N/A"
            }
          />

          <InfoRow
            icon={<Globe size={15} />}
            label="Pays"
            value={
              user?.country ||
              "N/A"
            }
          />
        </div>

        {/* STATS */}

        <div style={card}>
          <SectionTitle
            icon={
              <Trophy size={18} />
            }
            title="Statistiques"
          />

          <div style={statsGrid}>
            <StatCard
              icon={
                <TrendingUp
                  size={18}
                />
              }
              value={wins}
              label="Victoires"
            />

            <StatCard
              icon={
                <Swords
                  size={18}
                />
              }
              value={losses}
              label="Défaites"
            />

            <StatCard
              icon={
                <Clock3
                  size={18}
                />
              }
              value={matches}
              label="Matchs"
            />

            <StatCard
              icon={<Star size={18} />}
              value={`${winRate}%`}
              label="Winrate"
            />
          </div>

          <div style={progressWrap}>
            <div style={progressTop}>
              <span>
                Progression
              </span>

              <strong>
                {winRate}%
              </strong>
            </div>

            <div style={progressBar}>
              <div
                style={{
                  ...progressFill,
                  width: `${winRate}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* TRANSACTIONS */}

        <div style={card}>
          <SectionTitle
            icon={
              <Clock3 size={18} />
            }
            title="Transactions"
          />

          {!user
            ?.transactions_list
            ?.length && (
            <div style={emptyTransactions}>
              Aucune transaction
            </div>
          )}

          {user?.transactions_list
            ?.slice(0, 8)
            .map((t, i) => {

              const positive =
                Number(
                  t?.amount || 0
                ) > 0;

              return (
                <div
                  key={i}
                  style={
                    transactionRow
                  }
                >
                  <div>
                    <div
                      style={
                        transactionType
                      }
                    >
                      {t?.type ||
                        "Transaction"}
                    </div>

                    <div
                      style={
                        transactionDate
                      }
                    >
                      {t?.created_at
                        ? new Date(
                            t.created_at
                          ).toLocaleString()
                        : "—"}
                    </div>
                  </div>

                  <div
                    style={{
                      fontWeight: 800,
                      color:
                        positive
                          ? "#22c55e"
                          : "#ef4444",
                    }}
                  >
                    {positive
                      ? "+"
                      : ""}
                    {Number(
                      t?.amount || 0
                    ).toLocaleString()}{" "}
                    CDF
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}

// ======================================================
// COMPONENTS
// ======================================================

function SectionTitle({
  icon,
  title,
}) {
  return (
    <div style={sectionTitle}>
      {icon}
      <span>{title}</span>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}) {
  return (
    <div style={infoRow}>
      <div style={infoLeft}>
        {icon}
        {label}
      </div>

      <strong>{value}</strong>
    </div>
  );
}

function StatCard({
  icon,
  value,
  label,
}) {
  return (
    <div style={statCard}>
      <div>{icon}</div>

      <div style={statValue}>
        {value}
      </div>

      <div style={statLabel}>
        {label}
      </div>
    </div>
  );
}

function MiniStat({
  icon,
  label,
  value,
}) {
  return (
    <div style={miniStat}>
      <div style={miniLeft}>
        {icon}
        {label}
      </div>

      <strong>{value}</strong>
    </div>
  );
}

// ======================================================
// STYLES
// ======================================================

const container = {
  minHeight: "100vh",
  background:
    "linear-gradient(180deg,#020617,#0f172a)",
  color: "white",
  padding: 20,
  paddingTop: 90,
};

const hero = {
  background:
    "linear-gradient(135deg,#2563eb,#0f172a)",
  borderRadius: 30,
  padding: 30,
  marginBottom: 24,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 20,
  flexWrap: "wrap",
};

const heroLeft = {
  display: "flex",
  alignItems: "center",
  gap: 20,
};

const avatar = {
  width: 90,
  height: 90,
  borderRadius: "50%",
  background: "white",
  color: "#0f172a",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 34,
  fontWeight: 800,
};

const verified = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 12px",
  borderRadius: 999,
  background:
    "rgba(255,255,255,0.15)",
  marginBottom: 10,
  fontSize: 12,
};

const username = {
  margin: 0,
  fontSize: 36,
};

const heroMeta = {
  display: "flex",
  gap: 14,
  flexWrap: "wrap",
  marginTop: 10,
  opacity: 0.85,
};

const refreshBtn = {
  border: "none",
  cursor: "pointer",
  padding: "14px 18px",
  borderRadius: 16,
  background:
    "rgba(255,255,255,0.15)",
  color: "white",
  display: "flex",
  alignItems: "center",
  gap: 10,
  fontWeight: 700,
};

const grid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(320px,1fr))",
  gap: 22,
};

const card = {
  background: "#111827",
  borderRadius: 24,
  padding: 22,
  border:
    "1px solid rgba(255,255,255,0.06)",
};

const sectionTitle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  marginBottom: 20,
  fontSize: 18,
  fontWeight: 700,
};

const walletBox = {
  padding: 20,
  borderRadius: 20,
  background:
    "linear-gradient(135deg,#0f172a,#1e293b)",
  marginBottom: 18,
};

const walletLabel = {
  opacity: 0.7,
  marginBottom: 8,
};

const walletAmount = {
  fontSize: 34,
  fontWeight: 800,
};

const miniContainer = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const miniStat = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "12px 14px",
  borderRadius: 14,
  background:
    "rgba(255,255,255,0.05)",
};

const miniLeft = {
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const infoRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "14px 0",
  borderBottom:
    "1px solid rgba(255,255,255,0.06)",
};

const infoLeft = {
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const statsGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(2,1fr)",
  gap: 14,
};

const statCard = {
  padding: 18,
  borderRadius: 18,
  textAlign: "center",
  background:
    "rgba(255,255,255,0.05)",
};

const statValue = {
  fontSize: 28,
  fontWeight: 800,
  marginTop: 8,
};

const statLabel = {
  marginTop: 6,
  opacity: 0.7,
};

const progressWrap = {
  marginTop: 22,
};

const progressTop = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: 10,
};

const progressBar = {
  width: "100%",
  height: 12,
  borderRadius: 999,
  background:
    "rgba(255,255,255,0.08)",
  overflow: "hidden",
};

const progressFill = {
  height: "100%",
  background:
    "linear-gradient(90deg,#22c55e,#3b82f6)",
};

const transactionRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "14px 0",
  borderBottom:
    "1px solid rgba(255,255,255,0.06)",
};

const transactionType = {
  fontWeight: 700,
  marginBottom: 4,
};

const transactionDate = {
  opacity: 0.6,
  fontSize: 12,
};

const emptyTransactions = {
  textAlign: "center",
  opacity: 0.6,
  padding: 20,
};

const loadingContainer = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  background: "#020617",
  color: "white",
};

const loader = {
  width: 70,
  height: 70,
  borderRadius: "50%",
  border:
    "6px solid rgba(255,255,255,0.1)",
  borderTop:
    "6px solid #3b82f6",
  animation:
    "spin 1s linear infinite",
};

const errorCard = {
  background:
    "rgba(127,29,29,0.25)",
  padding: 30,
  borderRadius: 20,
};

const retryBtn = {
  marginTop: 16,
  border: "none",
  cursor: "pointer",
  padding: "12px 18px",
  borderRadius: 12,
  background:
    "linear-gradient(135deg,#dc2626,#991b1b)",
  color: "white",
  fontWeight: 700,
};

const emptyCard = {
  padding: 40,
  textAlign: "center",
  borderRadius: 20,
  background:
    "rgba(255,255,255,0.05)",
};
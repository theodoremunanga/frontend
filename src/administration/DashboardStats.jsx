import React from "react";

/**
 * DashboardStats
 *
 * Affiche les statistiques principales de l'administration.
 *
 * Props :
 * - stats : objet contenant les statistiques
 */
export default function DashboardStats({ stats = {} }) {
  /**
   * Formatage des montants.
   *
   * On protège la valeur pour éviter les erreurs si le backend
   * renvoie null, undefined ou une chaîne.
   */
  const formatMoney = (value) => {
    const amount = Number(value) || 0;

    return new Intl.NumberFormat("fr-FR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div style={grid}>
      {/* UTILISATEURS */}
      <Card
        title="👤 Users"
        value={stats.users ?? 0}
      />

      {/* MATCHS */}
      <Card
        title="⚽ Matches"
        value={stats.matches ?? 0}
      />

      {/* DEPOTS */}
      <Card
        title="💰 Total Deposits"
        value={formatMoney(stats.totalDeposits)}
        suffix=" FC"
      />

      {/* RETRAITS */}
      <Card
        title="💸 Total Withdrawals"
        value={formatMoney(stats.totalWithdrawals)}
        suffix=" FC"
      />

      {/* TRANSACTIONS EN ATTENTE */}
      <Card
        title="⏳ Pending Transactions"
        value={stats.pendingTx ?? 0}
      />
    </div>
  );
}

/**
 * Carte statistique
 */
function Card({ title, value, suffix = "" }) {
  return (
    <div style={card}>
      <h3 style={titleStyle}>
        {title}
      </h3>

      <p style={valueStyle}>
        {value}
        {suffix}
      </p>
    </div>
  );
}

/* =========================
   STYLES
========================= */

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: 15,
  width: "100%",
};

const card = {
  background: "#1e293b",
  padding: 15,
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.06)",
  minHeight: 100,
  boxSizing: "border-box",
};

const titleStyle = {
  margin: 0,
  marginBottom: 8,
  fontSize: 14,
  fontWeight: 600,
  color: "#cbd5e1",
};

const valueStyle = {
  margin: 0,
  fontSize: 22,
  fontWeight: "bold",
  color: "#ffffff",
};
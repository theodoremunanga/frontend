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
   */
  const formatMoney = (value) => {
    const amount = Number(value) || 0;

    return new Intl.NumberFormat("fr-FR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <section className="dashboard-stats">

      {/* =========================
          EN-TÊTE DES STATISTIQUES
      ========================= */}
      <div className="dashboard-stats-header">
        <div>
          <span className="dashboard-stats-eyebrow">
            Vue générale
          </span>

          <h2>Statistiques du système</h2>

          <p>
            Aperçu des principales données de la plateforme.
          </p>
        </div>

        <div className="dashboard-stats-live">
          <span className="dashboard-stats-live-dot" />
          Données actuelles
        </div>
      </div>

      {/* =========================
          GRILLE DES STATISTIQUES
      ========================= */}
      <div className="dashboard-stats-grid">

        {/* UTILISATEURS */}
        <StatCard
          className="dashboard-stat-users"
          icon="👤"
          title="Utilisateurs"
          value={stats.users ?? 0}
          status="Actifs"
          footer="Utilisateurs enregistrés"
        />

        {/* MATCHS */}
        <StatCard
          className="dashboard-stat-matches"
          icon="⚽"
          title="Matchs"
          value={stats.matches ?? 0}
          status="Matchs"
          footer="Matchs enregistrés"
        />

        {/* DÉPÔTS */}
        <StatCard
          className="dashboard-stat-deposits"
          icon="💰"
          title="Total dépôts"
          value={formatMoney(stats.totalDeposits)}
          suffix=" FC"
          status="Dépôts"
          footer="Montant total déposé"
        />

        {/* RETRAITS */}
        <StatCard
          className="dashboard-stat-withdrawals"
          icon="💸"
          title="Total retraits"
          value={formatMoney(stats.totalWithdrawals)}
          suffix=" FC"
          status="Retraits"
          footer="Montant total retiré"
        />

        {/* TRANSACTIONS EN ATTENTE */}
        <StatCard
          className="dashboard-stat-pending"
          icon="⏳"
          title="Transactions en attente"
          value={stats.pendingTx ?? 0}
          status="À traiter"
          footer="Transactions nécessitant une action"
        />

      </div>
    </section>
  );
}

/**
 * Carte statistique réutilisable.
 */
function StatCard({
  className = "",
  icon,
  title,
  value,
  suffix = "",
  status,
  footer,
}) {
  return (
    <article
      className={`dashboard-stat-card ${className}`.trim()}
    >
      {/* TOP */}
      <div className="dashboard-stat-top">

        <div className="dashboard-stat-icon">
          {icon}
        </div>

        <span className="dashboard-stat-status">
          {status}
        </span>

      </div>

      {/* BODY */}
      <div className="dashboard-stat-body">

        <span className="dashboard-stat-label">
          {title}
        </span>

        <strong className="dashboard-stat-value">
          {value}
          {suffix}
        </strong>

      </div>

      {/* FOOTER */}
      {footer && (
        <div className="dashboard-stat-footer">
          {footer}
        </div>
      )}
    </article>
  );
}

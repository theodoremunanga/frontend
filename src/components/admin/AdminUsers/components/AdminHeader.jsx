import {
    header,
    headerTitle,
    headerSubtitle,
    statsRow,
    statCard,
    statLabel,
    statValue,
    COLORS,
} from "../styles";

function money(value = 0) {
    return new Intl.NumberFormat("fr-FR").format(Number(value));
}

function StatCard({
    label,
    value,
    color,
}) {
    return (
        <div
            style={{
                ...statCard,
                borderTop: `4px solid ${color}`,
            }}
        >
            <div style={statLabel}>
                {label}
            </div>

            <div style={statValue}>
                {value}
            </div>
        </div>
    );
}

export default function AdminHeader({
    stats,
}) {
    return (
        <div style={header}>
            <div style={headerTitle}>
                👥 Gestion des utilisateurs
            </div>

            <div style={headerSubtitle}>
                Tableau de bord d'administration
            </div>

            <div style={statsRow}>
                <StatCard
                    label="Utilisateurs"
                    value={stats.total}
                    color={COLORS.primary}
                />

                <StatCard
                    label="Connectés"
                    value={stats.connected}
                    color={COLORS.success}
                />

                <StatCard
                    label="Suspendus"
                    value={stats.suspended}
                    color={COLORS.danger}
                />

                <StatCard
                    label="Admins"
                    value={stats.admins}
                    color={COLORS.admin}
                />

                <StatCard
                    label="JO"
                    value={stats.jo}
                    color={COLORS.jo}
                />

                <StatCard
                    label="Balance totale"
                    value={`${money(
                        stats.totalBalance
                    )} FC`}
                    color={COLORS.warning}
                />
            </div>
        </div>
    );
}
import {
    section,
    sectionTitle,
    grid4,
    card,
    cardLabel,
    cardValue,
    COLORS,
} from "../styles";

function StatCard({
    label,
    value,
    color = COLORS.primary,
}) {
    return (
        <div
            style={{
                ...card,
                borderLeft: `4px solid ${color}`,
            }}
        >
            <div style={cardLabel}>
                {label}
            </div>

            <div style={cardValue}>
                {value}
            </div>
        </div>
    );
}

export default function UserStats({
    user,
}) {

    if (!user) return null;

    const played =
        Number(user.games_played || 0);

    const won =
        Number(user.games_won || 0);

    const lost =
        Number(user.games_lost || 0);

    const abandoned =
        Number(user.games_abandoned || 0);

    const hours =
        Number(user.play_time_hours || 0);

    const rate =
        played > 0
            ? Math.round((won / played) * 100)
            : 0;

    return (
        <section style={section}>

            <div style={sectionTitle}>
                📊 Statistiques
            </div>

            <div style={grid4}>

                <StatCard
                    label="Matchs joués"
                    value={played}
                    color="#2563eb"
                />

                <StatCard
                    label="Victoires"
                    value={won}
                    color="#22c55e"
                />

                <StatCard
                    label="Défaites"
                    value={lost}
                    color="#ef4444"
                />

                <StatCard
                    label="Win Rate"
                    value={`${rate}%`}
                    color="#38bdf8"
                />

                <StatCard
                    label="Abandons"
                    value={abandoned}
                    color="#f59e0b"
                />

                <StatCard
                    label="Temps de jeu"
                    value={`${hours} h`}
                    color="#8b5cf6"
                />

            </div>

        </section>
    );
}
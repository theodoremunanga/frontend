import {
    section,
    sectionTitle,
    grid2,
    card,
    cardLabel,
    cardValue,
    COLORS,
} from "../styles";

// ======================================================
// MONEY
// ======================================================

function money(value = 0) {
    return (
        new Intl.NumberFormat("fr-FR").format(
            Number(value || 0)
        ) + " FC"
    );
}

// ======================================================
// ROW
// ======================================================

function HistoryRow({
    title,
    subtitle,
    value,
    color,
}) {
    return (
        <div
            style={{
                padding: 14,
                borderBottom:
                    "1px solid rgba(255,255,255,.06)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
            }}
        >
            <div>

                <div
                    style={{
                        fontWeight: 700,
                    }}
                >
                    {title}
                </div>

                <div
                    style={{
                        color: "#94a3b8",
                        fontSize: 12,
                        marginTop: 4,
                    }}
                >
                    {subtitle}
                </div>

            </div>

            <div
                style={{
                    color,
                    fontWeight: 700,
                }}
            >
                {value}
            </div>
        </div>
    );
}

// ======================================================
// COMPONENT
// ======================================================

export default function UserHistory({
    user,
}) {

    if (!user) return null;

    const games =
        user.games_history || [];

    const transactions =
        user.transactions_history || [];

    return (

        <section style={section}>

            <div style={sectionTitle}>
                📜 Historique
            </div>

            <div style={grid2}>

                {/* MATCHS */}

                <div style={card}>

                    <div
                        style={{
                            ...cardLabel,
                            marginBottom: 15,
                            fontSize: 16,
                            fontWeight: 700,
                        }}
                    >
                        🎮 Les 10 derniers matchs
                    </div>

                    {
                        games.length === 0 &&
                        (
                            <div
                                style={{
                                    color: "#94a3b8",
                                    textAlign: "center",
                                    padding: 20,
                                }}
                            >
                                Aucun historique.
                            </div>
                        )
                    }

                    {
                        games
                            .slice(0, 10)
                            .map((game, index) => (

                                <HistoryRow
                                    key={index}
                                    title={
                                        game.game_name ||
                                        game.game ||
                                        "Jeu"
                                    }
                                    subtitle={
                                        game.date ||
                                        game.created_at ||
                                        "-"
                                    }
                                    value={
                                        game.result ||
                                        "-"
                                    }
                                    color={
                                        game.result ===
                                        "Victoire"
                                            ? COLORS.success
                                            : COLORS.danger
                                    }
                                />

                            ))
                    }

                </div>

                {/* TRANSACTIONS */}

                <div style={card}>

                    <div
                        style={{
                            ...cardLabel,
                            marginBottom: 15,
                            fontSize: 16,
                            fontWeight: 700,
                        }}
                    >
                        💳 Les 10 dernières transactions
                    </div>

                    {
                        transactions.length === 0 &&
                        (
                            <div
                                style={{
                                    color: "#94a3b8",
                                    textAlign: "center",
                                    padding: 20,
                                }}
                            >
                                Aucune transaction.
                            </div>
                        )
                    }

                    {
                        transactions
                            .slice(0, 10)
                            .map((tx, index) => (

                                <HistoryRow
                                    key={index}
                                    title={
                                        tx.type ||
                                        "Transaction"
                                    }
                                    subtitle={
                                        tx.date ||
                                        tx.created_at ||
                                        "-"
                                    }
                                    value={money(
                                        tx.amount
                                    )}
                                    color={
                                        Number(tx.amount) >= 0
                                            ? COLORS.success
                                            : COLORS.danger
                                    }
                                />

                            ))
                    }

                </div>

            </div>

        </section>

    );
}
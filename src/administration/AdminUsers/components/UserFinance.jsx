import {
    section,
    sectionTitle,
    grid4,
    card,
    cardLabel,
    cardValue,
    COLORS,
} from "../styles";

// ======================================================
// MONEY FORMAT
// ======================================================

function money(value = 0) {
    return (
        new Intl.NumberFormat("fr-FR").format(
            Number(value || 0)
        ) + " FC"
    );
}

// ======================================================
// SMALL CARD
// ======================================================

function FinanceCard({
    title,
    value,
    color,
}) {
    return (
        <div
            style={{
                ...card,
                borderLeft: `4px solid ${color}`,
            }}
        >
            <div style={cardLabel}>
                {title}
            </div>

            <div style={cardValue}>
                {money(value)}
            </div>
        </div>
    );
}

// ======================================================
// COMPONENT
// ======================================================

export default function UserFinance({
    user,
}) {

    if (!user) return null;

    const balance =
        Number(user.balance || 0);

    const locked =
        Number(user.balance_locked || 0);

    const deposits =
        Number(user.total_deposits || 0);

    const withdrawals =
        Number(user.total_withdrawals || 0);

    const bonus =
        Number(user.total_bonus || 0);

    const profit =
        deposits -
        withdrawals +
        bonus;

    return (
        <section style={section}>

            <div style={sectionTitle}>
                💰 Finances
            </div>

            <div style={grid4}>

                <FinanceCard
                    title="Balance"
                    value={balance}
                    color={COLORS.success}
                />

                <FinanceCard
                    title="Balance bloquée"
                    value={locked}
                    color={COLORS.warning}
                />

                <FinanceCard
                    title="Total déposé"
                    value={deposits}
                    color="#3b82f6"
                />

                <FinanceCard
                    title="Total retiré"
                    value={withdrawals}
                    color="#ef4444"
                />

                <FinanceCard
                    title="Profit net"
                    value={profit}
                    color="#8b5cf6"
                />

                <FinanceCard
                    title="Bonus reçus"
                    value={bonus}
                    color="#14b8a6"
                />

            </div>

        </section>
    );
}
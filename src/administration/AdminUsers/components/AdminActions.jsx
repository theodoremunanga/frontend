import {
    section,
    sectionTitle,
    actionsGrid,
    actionButton,
    COLORS,
} from "../styles";

const ACTIONS = [
    {
        key: "credit",
        icon: "💰",
        title: "Créditer",
        color: COLORS.success,
    },

    {
        key: "debit",
        icon: "💸",
        title: "Débiter",
        color: COLORS.danger,
    },

    {
        key: "freeze",
        icon: "🔒",
        title: "Geler un montant",
        color: COLORS.warning,
    },

    {
        key: "unfreeze",
        icon: "🔓",
        title: "Débloquer",
        color: "#0ea5e9",
    },

    {
        key: "suspend",
        icon: "⛔",
        title: "Suspendre",
        color: "#dc2626",
    },

    {
        key: "activate",
        icon: "✅",
        title: "Autoriser",
        color: "#16a34a",
    },

    {
        key: "notification",
        icon: "📨",
        title: "Notification",
        color: "#7c3aed",
    },

    {
        key: "role",
        icon: "📝",
        title: "Modifier rôle",
        color: "#2563eb",
    },

    {
        key: "history",
        icon: "📈",
        title: "Historique complet",
        color: "#14b8a6",
    },

    {
        key: "pdf",
        icon: "📂",
        title: "Exporter PDF",
        color: "#f97316",
    },

    {
        key: "excel",
        icon: "📄",
        title: "Exporter Excel",
        color: "#22c55e",
    },

    {
        key: "delete",
        icon: "🗑",
        title: "Supprimer",
        color: "#991b1b",
    },
];

export default function AdminActions({
    user,
    onAction,
}) {

    if (!user) return null;

    return (

        <section style={section}>

            <div style={sectionTitle}>
                ⚙️ Actions Administrateur
            </div>

            <div style={actionsGrid}>

                {ACTIONS.map((action) => (

                    <button
                        key={action.key}
                        onClick={() =>
                            onAction?.(
                                action.key,
                                user
                            )
                        }
                        style={{
                            ...actionButton,
                            borderLeft:
                                `5px solid ${action.color}`,
                        }}
                    >

                        <div
                            style={{
                                fontSize: 30,
                                marginBottom: 12,
                            }}
                        >
                            {action.icon}
                        </div>

                        <div>
                            {action.title}
                        </div>

                    </button>

                ))}

            </div>

        </section>

    );

}
import {
    details,
    section,
    sectionTitle,
    grid2,
    card,
    cardLabel,
    cardValue,
    COLORS,
} from "../styles";

import UserFinance from "./UserFinance";
import UserStats from "./UserStats";
import UserHistory from "./UserHistory";
import AdminActions from "./AdminActions";

// ======================================================
// HELPERS
// ======================================================

function roleColor(role) {
    switch (role) {
        case "ADMIN":
            return COLORS.admin;

        case "JO":
            return COLORS.jo;

        default:
            return COLORS.user;
    }
}

function formatDate(date) {

    if (!date) return "-";

    return new Date(date).toLocaleDateString(
        "fr-FR",
        {
            year: "numeric",
            month: "long",
            day: "numeric",
        }
    );

}

function formatDateTime(date) {

    if (!date) return "-";

    return new Date(date).toLocaleString(
        "fr-FR"
    );

}

function getAnciennete(date) {

    if (!date) return "-";

    const created = new Date(date);

    const today = new Date();

    const diff =
        Math.floor(
            (today - created) /
            (1000 * 60 * 60 * 24)
        );

    return `${diff} jours`;

}

// ======================================================
// COMPONENT
// ======================================================

export default function UserDetails({

    user,

    onAction,

}) {

    if (!user) {

        return (

            <div style={details}>

                <div
                    style={{
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#94a3b8",
                        fontSize: 22,
                    }}
                >
                    👈 Sélectionnez un utilisateur
                </div>

            </div>

        );

    }

    return (

        <div style={details}>

            {/* ====================================================== */}
            {/* HEADER */}
            {/* ====================================================== */}

            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 30,
                    flexWrap: "wrap",
                    gap: 20,
                }}
            >

                <div>

                    <div
                        style={{
                            fontSize: 34,
                            fontWeight: 800,
                        }}
                    >
                        👤 {user.username}
                    </div>

                    <div
                        style={{
                            marginTop: 8,
                            color: "#94a3b8",
                        }}
                    >
                        ID : {user.custom_id || user.id}
                    </div>

                </div>

                <div
                    style={{
                        background:
                            roleColor(
                                user.role
                            ),
                        color: "white",
                        padding:
                            "10px 18px",
                        borderRadius: 999,
                        fontWeight: 700,
                    }}
                >
                    {user.role}
                </div>

            </div>

            {/* ====================================================== */}
            {/* IDENTITE */}
            {/* ====================================================== */}

            <section style={section}>

                <div style={sectionTitle}>
                    👤 Informations générales
                </div>

                <div style={grid2}>

                    <Info
                        label="Nom"
                        value={user.username}
                    />

                    <Info
                        label="Téléphone"
                        value={
                            user.phone ||
                            "-"
                        }
                    />

                    <Info
                        label="Pays"
                        value={
                            user.country ||
                            "-"
                        }
                    />

                    <Info
                        label="Etat"
                        value={
                            user.is_suspended
                                ? "🔴 Suspendu"
                                : "🟢 Actif"
                        }
                    />

                    <Info
                        label="Compte créé"
                        value={formatDate(
                            user.created_at
                        )}
                    />

                    <Info
                        label="Ancienneté"
                        value={getAnciennete(
                            user.created_at
                        )}
                    />

                    <Info
                        label="Dernière connexion"
                        value={formatDateTime(
                            user.last_login
                        )}
                    />

                    <Info
                        label="KYC"
                        value={
                            user.kyc_status ||
                            "-"
                        }
                    />

                </div>

            </section>

            {/* ====================================================== */}
            {/* FINANCES */}
            {/* ====================================================== */}

            <UserFinance
                user={user}
            />

            {/* ====================================================== */}
            {/* STATS */}
            {/* ====================================================== */}

            <UserStats
                user={user}
            />

            {/* ====================================================== */}
            {/* HISTORY */}
            {/* ====================================================== */}

            <UserHistory
                user={user}
            />

            {/* ====================================================== */}
            {/* ACTIONS */}
            {/* ====================================================== */}

            <AdminActions
                user={user}
                onAction={onAction}
            />

        </div>

    );

}

// ======================================================
// INFO CARD
// ======================================================

function Info({

    label,

    value,

}) {

    return (

        <div style={card}>

            <div style={cardLabel}>
                {label}
            </div>

            <div style={cardValue}>
                {value}
            </div>

        </div>

    );

}
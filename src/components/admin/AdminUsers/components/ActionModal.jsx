import { useEffect, useState } from "react";

const TITLES = {
    credit: "💰 Créditer un utilisateur",
    debit: "💸 Débiter un utilisateur",
    freeze: "🔒 Geler un montant",
    unfreeze: "🔓 Débloquer un montant",
    suspend: "⛔ Suspendre le compte",
    activate: "✅ Réactiver le compte",
    notification: "📨 Envoyer une notification",
    role: "📝 Modifier le rôle",
    delete: "🗑 Supprimer le compte",
};

const ROLES = [
    {
        value: "user",
        label: "Utilisateur",
    },
    {
        value: "ambassadeur",
        label: "Ambassadeur",
    },
    {
        value: "admin",
        label: "Administrateur",
    },
    {
        value: "superadmin",
        label: "Super administrateur",
    },
];

export default function ActionModal({
    open,
    action,
    user,
    loading = false,
    error = "",
    onClose,
    onValidate,
}) {
    const [form, setForm] = useState({
        amount: "",
        reason: "",
        message: "",
        role: "user",
    });

    useEffect(() => {
        if (!open || !user) return;

        setForm({
            amount: "",
            reason: "",
            message: "",
            role: normalizeRole(user.role),
        });
    }, [open, user]);

    if (!open || !action || !user) {
        return null;
    }

    const showAmount = [
        "credit",
        "debit",
        "freeze",
        "unfreeze",
    ].includes(action);

    const showReason = [
        "credit",
        "debit",
        "freeze",
        "unfreeze",
        "suspend",
    ].includes(action);

    const showMessage = action === "notification";

    const showRole = action === "role";

    const isDelete = action === "delete";

    const updateField = (field, value) => {
        setForm((previous) => ({
            ...previous,
            [field]: value,
        }));
    };

    const submit = () => {
        if (loading) return;

        onValidate(
            action,
            user,
            form
        );
    };

    return (
        <div style={overlay}>

            <div style={modal}>

                {/* ================= HEADER ================= */}

                <div style={header}>

                    <div>
                        <div style={title}>
                            {TITLES[action]}
                        </div>

                        <div style={subtitle}>
                            {user.username}
                        </div>

                        {user.email && (
                            <div style={userInfo}>
                                {user.email}
                            </div>
                        )}
                    </div>

                    <button
                        type="button"
                        style={close}
                        onClick={onClose}
                        disabled={loading}
                    >
                        ✕
                    </button>

                </div>

                {/* ================= DELETE ================= */}

                {isDelete && (
                    <div style={dangerBox}>

                        <div style={dangerTitle}>
                            ⚠️ Suppression définitive
                        </div>

                        <p style={dangerText}>
                            Vous êtes sur le point de supprimer
                            définitivement le compte de{" "}
                            <strong>
                                {user.username}
                            </strong>.
                        </p>

                        <p style={dangerText}>
                            Cette opération ne doit être effectuée
                            que si vous êtes certain de vouloir
                            supprimer cet utilisateur.
                        </p>

                        <label style={label}>
                            Motif de suppression
                        </label>

                        <textarea
                            rows={4}
                            style={textarea}
                            value={form.reason}
                            disabled={loading}
                            placeholder="Indiquez le motif de la suppression..."
                            onChange={(e) =>
                                updateField(
                                    "reason",
                                    e.target.value
                                )
                            }
                        />

                    </div>
                )}

                {/* ================= AMOUNT ================= */}

                {showAmount && (
                    <>
                        <label style={label}>
                            Montant
                        </label>

                        <input
                            style={input}
                            type="number"
                            min="0"
                            step="1"
                            value={form.amount}
                            disabled={loading}
                            placeholder="0"
                            onChange={(e) =>
                                updateField(
                                    "amount",
                                    e.target.value
                                )
                            }
                        />
                    </>
                )}

                {/* ================= REASON ================= */}

                {showReason && (
                    <>
                        <label style={label}>
                            Motif
                        </label>

                        <textarea
                            rows={4}
                            style={textarea}
                            value={form.reason}
                            disabled={loading}
                            placeholder="Indiquez le motif..."
                            onChange={(e) =>
                                updateField(
                                    "reason",
                                    e.target.value
                                )
                            }
                        />
                    </>
                )}

                {/* ================= MESSAGE ================= */}

                {showMessage && (
                    <>
                        <label style={label}>
                            Message
                        </label>

                        <textarea
                            rows={6}
                            style={textarea}
                            value={form.message}
                            disabled={loading}
                            placeholder="Écrivez votre message..."
                            onChange={(e) =>
                                updateField(
                                    "message",
                                    e.target.value
                                )
                            }
                        />
                    </>
                )}

                {/* ================= ROLE ================= */}

                {showRole && (
                    <div>

                        <label style={label}>
                            Rôle actuel
                        </label>

                        <div style={currentRole}>
                            {getRoleLabel(user.role)}
                        </div>

                        <label style={label}>
                            Nouveau rôle
                        </label>

                        <select
                            style={input}
                            value={form.role}
                            disabled={loading}
                            onChange={(e) =>
                                updateField(
                                    "role",
                                    e.target.value
                                )
                            }
                        >
                            {ROLES.map((role) => (
                                <option
                                    key={role.value}
                                    value={role.value}
                                >
                                    {role.label}
                                </option>
                            ))}
                        </select>

                    </div>
                )}

                {/* ================= ERROR ================= */}

                {error && (
                    <div style={errorBox}>
                        ❌ {error}
                    </div>
                )}

                {/* ================= FOOTER ================= */}

                <div style={footer}>

                    <button
                        type="button"
                        style={cancel}
                        onClick={onClose}
                        disabled={loading}
                    >
                        Annuler
                    </button>

                    <button
                        type="button"
                        style={
                            isDelete
                                ? deleteButton
                                : validate
                        }
                        disabled={loading}
                        onClick={submit}
                    >
                        {loading
                            ? "Traitement..."
                            : isDelete
                                ? "Supprimer définitivement"
                                : "Valider"}
                    </button>

                </div>

            </div>

        </div>
    );
}

/* ======================================================
   HELPERS
====================================================== */

function normalizeRole(role) {
    const value = String(
        role || "user"
    )
        .trim()
        .toLowerCase();

    const aliases = {
        USER: "user",
        ADMIN: "admin",
        SUPERADMIN: "superadmin",
        AMBASSADOR: "ambassadeur",
        AMBASSADEUR: "ambassadeur",
    };

    return aliases[role] || value;
}

function getRoleLabel(role) {
    const normalized = normalizeRole(role);

    const found = ROLES.find(
        (item) => item.value === normalized
    );

    return found
        ? found.label
        : normalized;
}

/* ======================================================
   STYLES
====================================================== */

const overlay = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,.65)",
    backdropFilter: "blur(6px)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 99999,
    padding: 20,
};

const modal = {
    width: 560,
    maxWidth: "100%",
    maxHeight: "90vh",
    overflowY: "auto",
    background: "#111827",
    borderRadius: 18,
    padding: 24,
    border: "1px solid rgba(255,255,255,.08)",
    boxSizing: "border-box",
};

const header = {
    display: "flex",
    justifyContent: "space-between",
    gap: 20,
    marginBottom: 25,
};

const title = {
    fontSize: 22,
    fontWeight: 800,
    color: "white",
};

const subtitle = {
    marginTop: 5,
    color: "#94a3b8",
    fontWeight: 600,
};

const userInfo = {
    marginTop: 3,
    color: "#64748b",
    fontSize: 13,
};

const close = {
    border: "none",
    background: "transparent",
    color: "white",
    cursor: "pointer",
    fontSize: 22,
    height: 32,
    width: 32,
};

const label = {
    color: "#cbd5e1",
    marginBottom: 8,
    display: "block",
    marginTop: 15,
    fontWeight: 600,
};

const input = {
    width: "100%",
    padding: 12,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,.08)",
    background: "#1f2937",
    color: "white",
    outline: "none",
    boxSizing: "border-box",
};

const textarea = {
    ...input,
    resize: "vertical",
    minHeight: 90,
};

const currentRole = {
    padding: "12px 14px",
    borderRadius: 12,
    background: "#0f172a",
    border: "1px solid rgba(255,255,255,.08)",
    color: "#94a3b8",
    fontWeight: 700,
};

const dangerBox = {
    padding: 16,
    borderRadius: 14,
    background: "rgba(127,29,29,.18)",
    border: "1px solid rgba(248,113,113,.25)",
    marginBottom: 5,
};

const dangerTitle = {
    color: "#fca5a5",
    fontWeight: 800,
    fontSize: 16,
};

const dangerText = {
    color: "#cbd5e1",
    fontSize: 14,
    lineHeight: 1.5,
};

const errorBox = {
    marginTop: 18,
    padding: 12,
    borderRadius: 10,
    background: "rgba(127,29,29,.25)",
    border: "1px solid rgba(248,113,113,.3)",
    color: "#fca5a5",
    fontSize: 14,
};

const footer = {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 30,
};

const cancel = {
    padding: "12px 20px",
    borderRadius: 12,
    border: "none",
    background: "#374151",
    color: "white",
    cursor: "pointer",
    fontWeight: 600,
};

const validate = {
    padding: "12px 24px",
    borderRadius: 12,
    border: "none",
    background: "#2563eb",
    color: "white",
    cursor: "pointer",
    fontWeight: 700,
};

const deleteButton = {
    padding: "12px 24px",
    borderRadius: 12,
    border: "none",
    background: "#dc2626",
    color: "white",
    cursor: "pointer",
    fontWeight: 800,
};
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

export default function ActionModal({
    open,
    action,
    user,
    loading = false,
    onClose,
    onValidate,
}) {

    const [form, setForm] = useState({
        amount: "",
        reason: "",
        message: "",
        role: "USER",
    });

    useEffect(() => {

        if (!open) return;

        setForm({
            amount: "",
            reason: "",
            message: "",
            role: user?.role || "USER",
        });

    }, [open, user]);

    if (!open || !action || !user)
        return null;

    const showAmount =
        [
            "credit",
            "debit",
            "freeze",
            "unfreeze",
        ].includes(action);

    const showReason =
        [
            "credit",
            "debit",
            "freeze",
            "unfreeze",
            "suspend",
            "delete",
        ].includes(action);

    const showMessage =
        action === "notification";

    const showRole =
        action === "role";

    return (
        <div style={overlay}>

            <div style={modal}>

                {/* HEADER */}

                <div style={header}>

                    <div>

                        <div style={title}>
                            {TITLES[action]}
                        </div>

                        <div style={subtitle}>
                            {user.username}
                        </div>

                    </div>

                    <button
                        style={close}
                        onClick={onClose}
                    >
                        ✕
                    </button>

                </div>

                {/* FORM */}

                {showAmount && (

                    <>
                        <label style={label}>
                            Montant
                        </label>

                        <input
                            style={input}
                            type="number"
                            value={form.amount}
                            onChange={(e) =>
                                setForm({
                                    ...form,
                                    amount:
                                        e.target.value,
                                })
                            }
                        />
                    </>

                )}

                {showReason && (

                    <>
                        <label style={label}>
                            Motif
                        </label>

                        <textarea
                            rows={4}
                            style={textarea}
                            value={form.reason}
                            onChange={(e) =>
                                setForm({
                                    ...form,
                                    reason:
                                        e.target.value,
                                })
                            }
                        />
                    </>

                )}

                {showMessage && (

                    <>
                        <label style={label}>
                            Message
                        </label>

                        <textarea
                            rows={6}
                            style={textarea}
                            value={form.message}
                            onChange={(e) =>
                                setForm({
                                    ...form,
                                    message:
                                        e.target.value,
                                })
                            }
                        />
                    </>

                )}

                {showRole && (

                    <>
                        <label style={label}>
                            Nouveau rôle
                        </label>

                        <select
                            style={input}
                            value={form.role}
                            onChange={(e) =>
                                setForm({
                                    ...form,
                                    role:
                                        e.target.value,
                                })
                            }
                        >
                            <option value="USER">
                                USER
                            </option>

                            <option value="JO">
                                JO
                            </option>

                            <option value="ADMIN">
                                ADMIN
                            </option>

                        </select>

                    </>

                )}

                {/* FOOTER */}

                <div style={footer}>

                    <button
                        style={cancel}
                        onClick={onClose}
                    >
                        Annuler
                    </button>

                    <button
                        style={validate}
                        disabled={loading}
                        onClick={() =>
                            onValidate(
                                action,
                                user,
                                form
                            )
                        }
                    >
                        {loading
                            ? "Traitement..."
                            : "Valider"}
                    </button>

                </div>

            </div>

        </div>
    );
}

/* ================= STYLES ================= */

const overlay = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,.65)",
    backdropFilter: "blur(6px)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 99999,
};

const modal = {
    width: 560,
    maxWidth: "95%",
    background: "#111827",
    borderRadius: 18,
    padding: 24,
    border: "1px solid rgba(255,255,255,.08)",
};

const header = {
    display: "flex",
    justifyContent: "space-between",
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
};

const close = {
    border: "none",
    background: "transparent",
    color: "white",
    cursor: "pointer",
    fontSize: 22,
};

const label = {
    color: "#cbd5e1",
    marginBottom: 8,
    display: "block",
    marginTop: 15,
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
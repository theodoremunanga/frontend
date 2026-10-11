
import { useEffect, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CreditCard,
  Smartphone,
  Copy,
  Check,
  X,
  Loader2,
  ShieldCheck,
  AlertCircle,
  Banknote,
} from "lucide-react";

import api from "../services/api";

// ======================================================
// WALLET ACTIONS — ALIGNÉ SUR LE BACKEND
// ======================================================

const MIN_AMOUNT = 1000;

const METHODS = {
  airtel: {
    label: "Airtel Money",
    number: "0973596027",
    accountName: "TUADILA GERARD MICHEL",
    available: true,
    withdrawAvailable: true,
  },
  mpesa: {
    label: "M-Pesa",
    number: "Pas encore disponible",
    accountName: "",
    available: false,
    withdrawAvailable: false,
  },
  orange: {
    label: "Orange Money",
    number: "Pas encore disponible",
    accountName: "",
    available: false,
    withdrawAvailable: false,
  },
  usdt: {
    label: "USDT / Tether",
    number: "Pas encore disponible",
    accountName: "",
    available: false,
    withdrawAvailable: false,
  },
  credit_card: {
    label: "Virement bancaire",
    number: "922200340863331",
    accountName: "NTUMBA THEODORE",
    available: true,
    withdrawAvailable: true,
  },
};

const getErrorMessage = (err) =>
  err?.response?.data?.error ||
  err?.response?.data?.message ||
  err?.message ||
  "Une erreur est survenue.";



 export default function WalletActions({
    refresh,
    onSuccess,
    autoOpen = false,
    initialAction = "deposit",
    onClose,
  }) {
  const [open, setOpen] = useState(null);
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [method, setMethod] = useState("");
  const [withdrawMethod, setWithdrawMethod] = useState("");
  const [reference, setReference] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // ======================================================
// OUVERTURE AUTOMATIQUE DEPUIS L'ACCUEIL
// ======================================================

useEffect(() => {
  if (!autoOpen) return;

  reset();
  setOpen(initialAction);
}, [autoOpen, initialAction]);

  const reset = () => {
    setAmount("");
    setPhone("");
    setMethod("");
    setWithdrawMethod("");
    setReference("");
    setError("");
    setCopied(false);
  };

  const openAction = (action) => {
    reset();
    setOpen(action);
  };

  // force=true permet de fermer la fenêtre après le succès,
  // même si la requête vient de terminer son traitement.
  const close = (force = false) => {
    if (loading && !force) return;

    setOpen(null);
    reset();

    if (typeof onClose === "function") {
      onClose();
    }
  };

  const copyNumber = async () => {
    if (!method || !METHODS[method]?.available) return;

    try {
      await navigator.clipboard.writeText(METHODS[method].number);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("COPY ERROR:", err);
      setError("Impossible de copier le numéro.");
    }
  };

  // ======================================================
  // VALIDATION FRONTEND
  // ======================================================

  const validate = () => {
    const numericAmount = Number(amount);

    if (
      amount.trim() === "" ||
      !Number.isFinite(numericAmount) ||
      !Number.isInteger(numericAmount)
    ) {
      return "Veuillez saisir un montant entier valide.";
    }

    if (numericAmount < MIN_AMOUNT) {
      return `Le montant minimum est de ${MIN_AMOUNT} CDF.`;
    }

    if (open === "deposit") {
      if (!method) {
        return "Veuillez choisir un moyen de paiement.";
      }

      if (!METHODS[method]?.available) {
        return "Ce moyen de paiement n'est pas encore disponible.";
      }

      if (!reference.trim()) {
        return "La référence TID est obligatoire.";
      }
    }

    if (open === "withdraw") {
      if (!withdrawMethod) {
        return "Veuillez choisir un moyen de retrait.";
      }

      if (!METHODS[withdrawMethod]?.withdrawAvailable) {
        return "Ce moyen de retrait n'est pas encore disponible.";
      }

      if (!phone.trim()) {
        return "Veuillez saisir vos coordonnées de retrait.";
      }

      if (
        ["airtel", "mpesa", "orange"].includes(withdrawMethod) &&
        phone.trim().replace(/\s/g, "").length < 9
      ) {
        return "Le numéro de téléphone semble invalide.";
      }

      if (
        withdrawMethod === "credit_card" &&
        phone.trim().length < 5
      ) {
        return "Veuillez saisir un numéro de compte bancaire valide.";
      }
    }

    return null;
  };

  // ======================================================
  // SUBMIT — CONTRAT BACKEND
  // ======================================================

  const submit = async () => {
    const validationError = validate();

    if (validationError) {
      setError(validationError);
      return;
    }

    const action = open;
    const numericAmount = Number(amount);

    try {
      setLoading(true);
      setError("");

      let response;

      // --------------------------------------------------
      // DÉPÔT : vérification du TID puis création
      // --------------------------------------------------

      if (action === "deposit") {
        const tid = reference.trim();

        // Backend :
        // GET /payment/tid/check?tid=...&amount=...&method=...
        const checkResponse = await api.get("/wallet/tid/check", {
          params: {
            tid,
            amount: numericAmount,
            method,
          },
        });

        if (checkResponse?.data?.valid !== true) {
          throw new Error(
            checkResponse?.data?.error ||
              "Ce TID n'est pas valide ou disponible."
          );
        }

        // Backend attend { amount, phone, reference }.
        // Ici phone contient le code du moyen de paiement.
        response = await api.post("/wallet/deposit", {
          amount: numericAmount,
          phone: method,
          reference: tid,
        });
      }

      // --------------------------------------------------
      // RETRAIT
      // --------------------------------------------------

      if (action === "withdraw") {
        // Le backend fourni attend { amount, phone }.
        // On transmet le moyen et les coordonnées ensemble,
        // car le backend ne possède pas de champ method dédié.
        response = await api.post("/wallet/withdraw", {
          amount: numericAmount,
          phone: `${withdrawMethod}: ${phone.trim()}`,
        });
      }

      // --------------------------------------------------
      // SUCCÈS
      // --------------------------------------------------

      const message =
        response?.data?.message ||
        (action === "deposit"
          ? "Demande de dépôt envoyée pour vérification administrative."
          : "Demande de retrait envoyée.");

      alert(`✅ ${message}`);

      close(true);

      if (typeof refresh === "function") {
        await refresh();
      }

      if (typeof onSuccess === "function") {
        await onSuccess();
      }
    } catch (err) {
      console.error("WALLET ACTION ERROR:", err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // ======================================================
  // RENDER
  // ======================================================

  return (
    <div style={styles.container}>
      <div style={styles.actionsGrid}>
        <button
          type="button"
          onClick={() => openAction("deposit")}
          style={styles.depositButton}
        >
          <div style={styles.buttonIcon}>
            <ArrowDownToLine size={22} />
          </div>
          <div style={styles.buttonText}>
            <strong>Déposer</strong>
            <span>Ajouter de l'argent</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => openAction("withdraw")}
          style={styles.withdrawButton}
        >
          <div style={styles.buttonIcon}>
            <ArrowUpFromLine size={22} />
          </div>
          <div style={styles.buttonText}>
            <strong>Retirer</strong>
            <span>Retirer vos fonds</span>
          </div>
        </button>
      </div>

      {open && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            {/* HEADER */}
            <div style={styles.modalHeader}>
              <div style={styles.modalTitleWrapper}>
                <div
                  style={
                    open === "deposit"
                      ? styles.modalIconDeposit
                      : styles.modalIconWithdraw
                  }
                >
                  {open === "deposit" ? (
                    <ArrowDownToLine size={24} />
                  ) : (
                    <ArrowUpFromLine size={24} />
                  )}
                </div>

                <div>
                  <h3 style={styles.modalTitle}>
                    {open === "deposit"
                      ? "Effectuer un dépôt"
                      : "Effectuer un retrait"}
                  </h3>
                  <p style={styles.modalSubtitle}>
                    {open === "deposit"
                      ? "Ajoutez des fonds à votre portefeuille."
                      : "Recevez vos fonds sur vos coordonnées de retrait."}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => close()}
                disabled={loading}
                style={styles.closeButton}
                aria-label="Fermer"
              >
                <X size={20} />
              </button>
            </div>

            {/* CONTENU */}
            <div style={styles.modalContent}>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Montant</label>

                <div style={styles.inputWrapper}>
                  <Banknote size={19} style={styles.inputIcon} />
                  <input
                    type="number"
                    min={MIN_AMOUNT}
                    step="1"
                    placeholder="Ex. : 5000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    style={styles.input}
                    disabled={loading}
                  />
                  <span style={styles.currency}>CDF</span>
                </div>

                <small style={styles.hint}>
                  Minimum : {MIN_AMOUNT} CDF
                </small>
              </div>

              {/* DÉPÔT */}
              {open === "deposit" && (
                <>
                  <div style={styles.fieldGroup}>
                    <label style={styles.label}>
                      Moyen de paiement
                    </label>

                    <div style={styles.methodsGrid}>
                      {Object.entries(METHODS).map(([key, item]) => {
                        const selected = method === key;
                        const Icon =
                          key === "credit_card" ? CreditCard : Smartphone;

                        return (
                          <button
                            key={key}
                            type="button"
                            disabled={!item.available || loading}
                            onClick={() => {
                              setMethod(key);
                              setError("");
                            }}
                            style={{
                              ...styles.methodCard,
                              ...(selected
                                ? styles.methodCardSelected
                                : {}),
                              ...(!item.available
                                ? styles.methodCardDisabled
                                : {}),
                            }}
                          >
                            <div
                              style={{
                                ...styles.methodIcon,
                                ...(selected
                                  ? styles.methodIconSelected
                                  : {}),
                              }}
                            >
                              {key === "usdt" ? (
                                <span style={{ fontWeight: 900 }}>₮</span>
                              ) : (
                                <Icon size={20} />
                              )}
                            </div>

                            <div style={styles.methodText}>
                              <strong>{item.label}</strong>
                              <span>
                                {item.available
                                  ? "Disponible"
                                  : "Bientôt disponible"}
                              </span>
                            </div>

                            {selected && (
                              <Check size={18} style={styles.checkIcon} />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {method && METHODS[method]?.available && (
                    <div style={styles.paymentInfo}>
                      <div style={styles.paymentInfoHeader}>
                        <ShieldCheck size={19} />
                        <strong>Informations de paiement</strong>
                      </div>

                      <p style={styles.paymentInstruction}>
                        {method === "credit_card"
                          ? "Effectuez le virement vers le compte indiqué. Saisissez ensuite le TID fourni par le système de paiement."
                          : "Envoyez le montant exact au numéro indiqué. Saisissez ensuite le TID de votre transaction."}
                      </p>

                      <div style={styles.numberBox}>
                        <div style={styles.paymentRecipient}>
                          <span style={styles.recipientLabel}>
                            Bénéficiaire
                          </span>
                          <strong style={styles.recipientName}>
                            {METHODS[method].accountName}
                          </strong>
                        </div>

                        <div style={styles.paymentAccount}>
                          <span style={styles.recipientLabel}>
                            {method === "credit_card"
                              ? "Compte bancaire"
                              : "Numéro de paiement"}
                          </span>
                          <strong style={styles.accountNumber}>
                            {METHODS[method].number}
                          </strong>
                        </div>

                        <button
                          type="button"
                          onClick={copyNumber}
                          style={styles.copyButton}
                        >
                          {copied ? (
                            <>
                              <Check size={16} />
                              Copié
                            </>
                          ) : (
                            <>
                              <Copy size={16} />
                              Copier
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  <div style={styles.fieldGroup}>
                    <label style={styles.label}>
                      Référence TID
                    </label>
                    <input
                      type="text"
                      placeholder="Saisissez votre TID"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      style={styles.plainInput}
                      disabled={loading}
                    />
                    <small style={styles.hint}>
                      Le TID sera vérifié avant la création de la demande.
                      Le crédit du portefeuille nécessite ensuite la validation
                      administrative.
                    </small>
                  </div>
                </>
              )}

              {/* RETRAIT */}
              {open === "withdraw" && (
                <>
                  <div style={styles.fieldGroup}>
                    <label style={styles.label}>
                      Moyen de retrait
                    </label>

                    <div style={styles.methodsGrid}>
                      {Object.entries(METHODS).map(([key, item]) => {
                        const selected = withdrawMethod === key;
                        const Icon =
                          key === "credit_card" ? CreditCard : Smartphone;

                        return (
                          <button
                            key={key}
                            type="button"
                            disabled={!item.withdrawAvailable || loading}
                            onClick={() => {
                              if (!item.withdrawAvailable) return;
                              setWithdrawMethod(key);
                              setPhone("");
                              setError("");
                            }}
                            style={{
                              ...styles.methodCard,
                              ...(selected
                                ? styles.methodCardSelected
                                : {}),
                              ...(!item.withdrawAvailable
                                ? styles.methodCardDisabled
                                : {}),
                            }}
                          >
                            <div
                              style={{
                                ...styles.methodIcon,
                                ...(selected
                                  ? styles.methodIconSelected
                                  : {}),
                              }}
                            >
                              {key === "usdt" ? (
                                <span style={{ fontWeight: 900 }}>₮</span>
                              ) : (
                                <Icon size={20} />
                              )}
                            </div>

                            <div style={styles.methodText}>
                              <strong>{item.label}</strong>
                              <span>
                                {item.withdrawAvailable
                                  ? "Disponible"
                                  : "Bientôt disponible"}
                              </span>
                            </div>

                            {selected && (
                              <Check size={18} style={styles.checkIcon} />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {withdrawMethod && (
                    <div style={styles.fieldGroup}>
                      <label style={styles.label}>
                        {withdrawMethod === "credit_card"
                          ? "Numéro de compte bancaire"
                          : `Numéro ${METHODS[withdrawMethod].label}`}
                      </label>

                      <div style={styles.inputWrapper}>
                        {withdrawMethod === "credit_card" ? (
                          <CreditCard size={19} style={styles.inputIcon} />
                        ) : (
                          <Smartphone size={19} style={styles.inputIcon} />
                        )}

                        <input
                          type={
                            withdrawMethod === "credit_card" ? "text" : "tel"
                          }
                          placeholder={
                            withdrawMethod === "credit_card"
                              ? "Votre numéro de compte"
                              : "Ex. : 0999999999"
                          }
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          style={styles.input}
                          disabled={loading}
                        />
                      </div>

                      <small style={styles.hint}>
                        Vérifiez les coordonnées avant de soumettre votre
                        demande de retrait.
                      </small>
                    </div>
                  )}
                </>
              )}

              {/* ERREUR */}
              {error && (
                <div style={styles.errorBox} role="alert">
                  <AlertCircle size={18} />
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* FOOTER */}
            <div style={styles.modalFooter}>
              <button
                type="button"
                onClick={() => close()}
                disabled={loading}
                style={styles.cancelButton}
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={submit}
                disabled={loading}
                style={
                  open === "deposit"
                    ? styles.confirmDepositButton
                    : styles.confirmWithdrawButton
                }
              >
                {loading ? (
                  <>
                    <Loader2 size={18} style={styles.spinner} />
                    Traitement...
                  </>
                ) : open === "deposit" ? (
                  "Confirmer le dépôt"
                ) : (
                  "Confirmer le retrait"
                )}
              </button>
            </div>

            <div style={styles.securityNotice}>
              <ShieldCheck size={16} />
              <span>
                Les demandes sont enregistrées côté serveur. Ne partagez
                jamais vos identifiants.
              </span>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes wallet-spin {
          to { transform: rotate(360deg); }
        }
        .wallet-actions-unused {}
      `}</style>
    </div>
  );
}

// ======================================================
// STYLES
// ======================================================

const styles = {
  container: { width: "100%" },

  actionsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2,minmax(0,1fr))",
    gap: 14,
  },

  baseActionButton: {
    border: "1px solid",
    borderRadius: 18,
    padding: 16,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 13,
    color: "white",
    textAlign: "left",
    transition: "transform .2s ease, box-shadow .2s ease",
  },

  depositButton: {
    border: "1px solid #22c55e",
    borderRadius: 18,
    padding: 16,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 13,
    color: "white",
    textAlign: "left",
    background: "linear-gradient(135deg,#14532d,#166534)",
  },

  withdrawButton: {
    border: "1px solid #ef4444",
    borderRadius: 18,
    padding: 16,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 13,
    color: "white",
    textAlign: "left",
    background: "linear-gradient(135deg,#7f1d1d,#991b1b)",
  },

  buttonIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(255,255,255,.12)",
    flexShrink: 0,
  },

  buttonText: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },

  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 9999,
    background: "rgba(2,6,23,.78)",
    backdropFilter: "blur(8px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },

  modal: {
    width: "100%",
    maxWidth: 620,
    maxHeight: "92vh",
    overflowY: "auto",
    background: "linear-gradient(145deg,#111827,#020617)",
    border: "1px solid rgba(255,255,255,.1)",
    borderRadius: 26,
    boxShadow: "0 30px 80px rgba(0,0,0,.55)",
  },

  modalHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 15,
    padding: 22,
    borderBottom: "1px solid rgba(255,255,255,.07)",
  },

  modalTitleWrapper: {
    display: "flex",
    alignItems: "center",
    gap: 13,
  },

  modalIconDeposit: {
    width: 48,
    height: 48,
    borderRadius: 15,
    background: "rgba(34,197,94,.15)",
    color: "#4ade80",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  modalIconWithdraw: {
    width: 48,
    height: 48,
    borderRadius: 15,
    background: "rgba(239,68,68,.15)",
    color: "#f87171",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  modalTitle: { margin: 0, color: "white", fontSize: 20 },

  modalSubtitle: {
    margin: "5px 0 0",
    color: "#94a3b8",
    fontSize: 13,
  },

  closeButton: {
    width: 38,
    height: 38,
    border: "none",
    borderRadius: 12,
    cursor: "pointer",
    background: "rgba(255,255,255,.07)",
    color: "#cbd5e1",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  modalContent: {
    padding: 22,
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },

  fieldGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },

  label: { color: "#e2e8f0", fontSize: 14, fontWeight: 700 },

  inputWrapper: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: 14,
    padding: "0 13px",
  },

  inputIcon: { color: "#64748b", flexShrink: 0 },

  input: {
    width: "100%",
    minWidth: 0,
    border: "none",
    outline: "none",
    background: "transparent",
    color: "white",
    padding: "14px 0",
    fontSize: 15,
  },

  plainInput: {
    width: "100%",
    boxSizing: "border-box",
    background: "#0f172a",
    color: "white",
    border: "1px solid #334155",
    borderRadius: 14,
    padding: 14,
    outline: "none",
    fontSize: 15,
  },

  currency: { color: "#64748b", fontWeight: 700, fontSize: 13 },

  hint: { color: "#94a3b8", fontSize: 12, lineHeight: 1.5 },

  methodsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2,minmax(0,1fr))",
    gap: 10,
  },

  methodCard: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: 13,
    borderRadius: 15,
    border: "1px solid #334155",
    background: "#0f172a",
    color: "white",
    textAlign: "left",
    cursor: "pointer",
    minWidth: 0,
  },

  methodCardSelected: {
    borderColor: "#3b82f6",
    background: "rgba(37,99,235,.13)",
  },

  methodCardDisabled: { opacity: 0.48, cursor: "not-allowed" },

  methodIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(255,255,255,.06)",
    color: "#94a3b8",
    flexShrink: 0,
  },

  methodIconSelected: {
    background: "rgba(59,130,246,.18)",
    color: "#60a5fa",
  },

  methodText: {
    display: "flex",
    flexDirection: "column",
    gap: 3,
    fontSize: 12,
    minWidth: 0,
    overflowWrap: "anywhere",
  },

  checkIcon: {
    position: "absolute",
    right: 7,
    top: 7,
    color: "#60a5fa",
  },

  paymentInfo: {
    padding: 16,
    borderRadius: 17,
    background: "rgba(234,179,8,.08)",
    border: "1px solid rgba(234,179,8,.25)",
  },

  paymentInfoHeader: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    color: "#facc15",
  },

  paymentInstruction: {
    color: "#cbd5e1",
    fontSize: 13,
    lineHeight: 1.6,
  },

  numberBox: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 13,
    background: "rgba(0,0,0,.2)",
    flexWrap: "wrap",
  },

  paymentRecipient: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    minWidth: 0,
  },

  paymentAccount: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    minWidth: 0,
    flex: 1,
  },

  recipientLabel: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: ".04em",
  },

  recipientName: { color: "white", fontSize: 14 },

  accountNumber: {
    color: "#f8fafc",
    fontSize: 15,
    letterSpacing: ".03em",
    wordBreak: "break-word",
  },

  copyButton: {
    marginLeft: "auto",
    border: "none",
    borderRadius: 10,
    padding: "8px 11px",
    background: "#2563eb",
    color: "white",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontWeight: 700,
  },

  errorBox: {
    display: "flex",
    alignItems: "flex-start",
    gap: 9,
    padding: 13,
    borderRadius: 13,
    background: "rgba(239,68,68,.1)",
    border: "1px solid rgba(239,68,68,.3)",
    color: "#fca5a5",
    fontSize: 13,
  },

  modalFooter: {
    display: "flex",
    gap: 10,
    padding: 22,
    borderTop: "1px solid rgba(255,255,255,.07)",
  },

  cancelButton: {
    flex: 1,
    border: "1px solid #334155",
    borderRadius: 13,
    padding: "13px 15px",
    background: "transparent",
    color: "#cbd5e1",
    cursor: "pointer",
    fontWeight: 700,
  },

  confirmDepositButton: {
    flex: 2,
    border: "none",
    borderRadius: 13,
    padding: "13px 15px",
    background: "linear-gradient(135deg,#16a34a,#22c55e)",
    color: "white",
    cursor: "pointer",
    fontWeight: 800,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },

  confirmWithdrawButton: {
    flex: 2,
    border: "none",
    borderRadius: 13,
    padding: "13px 15px",
    background: "linear-gradient(135deg,#dc2626,#ef4444)",
    color: "white",
    cursor: "pointer",
    fontWeight: 800,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },

  spinner: { animation: "wallet-spin 1s linear infinite" },

  securityNotice: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    padding: "0 22px 20px",
    color: "#94a3b8",
    fontSize: 11,
    textAlign: "center",
  },
};
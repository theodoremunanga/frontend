import { useState } from "react";
import {
  Wallet,
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
// WALLET ACTIONS
// ======================================================

export default function WalletActions({ refresh, onSuccess }) {
  const [open, setOpen] = useState(null);
  // "deposit" | "withdraw" | null

  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [method, setMethod] = useState("");
  const [withdrawMethod, setWithdrawMethod] = useState("");
  const [reference, setReference] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // ======================================================
  // MOYENS DE PAIEMENT
  // ======================================================

  const methods = {
  airtel: {
    label: "Airtel Money",
    number: "0973596027",
    accountName: "TUADILA GERARD MICHEL",
    icon: <Smartphone size={20} />,
    available: true,
    withdrawAvailable: true,
  },

  mpesa: {
    label: "M-Pesa",
    number: "Pas encore disponible",
    accountName: "",
    icon: <Smartphone size={20} />,
    available: false,
    withdrawAvailable: false,
  },

  orange: {
    label: "Orange Money",
    number: "Pas encore disponible",
    accountName: "",
    icon: <Smartphone size={20} />,
    available: false,
    withdrawAvailable: false,
  },

  usdt: {
    label: "USDT / Tether",
    number: "Pas encore disponible",
    accountName: "",
    icon: <CoinsIcon />,
    available: false,
    withdrawAvailable: false,
  },

  credit_card: {
    label: "Virement bancaire",
    number: "922200340863331",
    accountName: "NTUMBA THEODORE",
    icon: <CreditCard size={20} />,
    available: true,
    withdrawAvailable: true,
  },
};

  // ======================================================
  // RESET
  // ======================================================

  const reset = () => {
    setAmount("");
    setPhone("");
    setMethod("");
    setWithdrawMethod("");
    setReference("");
    setError("");
    setCopied(false);
  };

  // ======================================================
  // OPEN
  // ======================================================

  const openAction = (action) => {
    reset();
    setOpen(action);
  };

  // ======================================================
  // CLOSE
  // ======================================================

  const close = () => {
    if (loading) return;

    setOpen(null);
    reset();
  };

  // ======================================================
  // COPY NUMBER
  // ======================================================

  const copyNumber = async () => {
    if (!method) return;

    const selected = methods[method];

    if (
      !selected ||
      !selected.available
    ) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        selected.number
      );

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (err) {
      console.error(
        "COPY ERROR:",
        err
      );
    }
  };

  // ======================================================
  // VALIDATION
  // ======================================================

  const validate = () => {
    const numericAmount =
      Number(amount);

    if (
      !amount ||
      !Number.isFinite(
        numericAmount
      )
    ) {
      return "Veuillez saisir un montant valide.";
    }

    if (numericAmount < 500) {
      return "Le montant minimum est de 500 CDF.";
    }

    if (open === "deposit") {
      if (!method) {
        return "Veuillez choisir un moyen de paiement.";
      }

      const selected =
        methods[method];

      if (
        !selected?.available
      ) {
        return "Ce moyen de paiement n'est pas encore disponible.";
      }

      if (!reference.trim()) {
        return "La référence de transaction est obligatoire.";
      }
    }

    if (open === "withdraw") {
      if (!withdrawMethod) {
        return "Veuillez choisir un moyen de retrait.";
      }

      const selected =
        methods[withdrawMethod];

      if (!selected?.withdrawAvailable) {
        return "Ce moyen de retrait n'est pas encore disponible.";
      }

      if (!phone.trim()) {
        return "Veuillez saisir les coordonnées de retrait.";
      }

      if (
        withdrawMethod === "airtel" ||
        withdrawMethod === "mpesa" ||
        withdrawMethod === "orange"
      ) {
        if (phone.trim().length < 9) {
          return "Le numéro de téléphone semble invalide.";
        }
      }

      if (withdrawMethod === "credit_card") {
        if (phone.trim().length < 5) {
          return "Veuillez saisir un numéro de compte bancaire valide.";
        }
      }
    }

    return null;
  };

  // ======================================================
  // SUBMIT
  // ======================================================

  const submit = async () => {
    const validationError =
      validate();

    if (validationError) {
      setError(
        validationError
      );

      return;
    }

    try {
      setLoading(true);
      setError("");

      let response;

      // ==================================================
      // DEPOT
      // ==================================================

      if (
        open === "deposit"
      ) {
        response =
          await api.post(
            "/payment/deposit",
            {
              amount:
                Number(amount),

              method,

              reference:
                reference.trim(),
            }
          );
      }

      // ==================================================
      // RETRAIT
      // ==================================================

      if (
        open === "withdraw"
      ) {
        response = await api.post(
          "/wallet/withdraw",
          {
            amount: Number(amount),
            method: withdrawMethod,
            phone: phone.trim(),
          }
        );
      }

      // ==================================================
      // SUCCESS
      // ==================================================

      const message =
        response?.data?.message ||
        (
          open === "deposit"
            ? "Demande de dépôt envoyée avec succès."
            : "Demande de retrait envoyée avec succès."
        );

      // On garde alert pour rester
      // compatible avec le comportement
      // actuel du projet.
      alert(
        `✅ ${message}`
      );

      close();

      if (refresh) {
        refresh();
      }

      if (onSuccess) {
        onSuccess();
      }

    } catch (err) {
      console.error(
        "WALLET ACTION ERROR:",
        err
      );

      setError(
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Une erreur est survenue."
      );

    } finally {
      setLoading(false);
    }
  };

  // ======================================================
  // RENDER
  // ======================================================

  return (
    <div style={container}>

      {/* ==================================================
          ACTION BUTTONS
      ================================================== */}

      <div style={actionsGrid}>

        <button
          type="button"
          onClick={() =>
            openAction("deposit")
          }
          style={depositButton}
        >
          <div style={buttonIcon}>
            <ArrowDownToLine
              size={22}
            />
          </div>

          <div style={buttonText}>
            <strong>
              Déposer
            </strong>

            <span>
              Ajouter de l'argent
            </span>
          </div>
        </button>


        <button
          type="button"
          onClick={() =>
            openAction("withdraw")
          }
          style={withdrawButton}
        >
          <div style={buttonIcon}>
            <ArrowUpFromLine
              size={22}
            />
          </div>

          <div style={buttonText}>
            <strong>
              Retirer
            </strong>

            <span>
              Retirer vos fonds
            </span>
          </div>
        </button>

      </div>


      {/* ==================================================
          MODAL
      ================================================== */}

      {open && (
        <div style={overlay}>

          <div style={modal}>

            {/* HEADER */}

            <div style={modalHeader}>

              <div style={modalTitleWrapper}>

                <div
                  style={
                    open === "deposit"
                      ? modalIconDeposit
                      : modalIconWithdraw
                  }
                >
                  {open === "deposit" ? (
                    <ArrowDownToLine
                      size={24}
                    />
                  ) : (
                    <ArrowUpFromLine
                      size={24}
                    />
                  )}
                </div>

                <div>

                  <h3 style={modalTitle}>
                    {open === "deposit"
                      ? "Effectuer un dépôt"
                      : "Effectuer un retrait"}
                  </h3>

                  <p style={modalSubtitle}>
                    {open === "deposit"
                      ? "Ajoutez des fonds à votre portefeuille."
                      : "Recevez vos fonds directement sur votre numéro."}
                  </p>

                </div>

              </div>


              <button
                type="button"
                onClick={close}
                disabled={loading}
                style={closeButton}
              >
                <X size={20} />
              </button>

            </div>


            {/* CONTENT */}

            <div style={modalContent}>

              {/* MONTANT */}

              <div style={fieldGroup}>

                <label style={label}>
                  Montant
                </label>

                <div style={inputWrapper}>

                  <Banknote
                    size={19}
                    style={inputIcon}
                  />

                  <input
                    type="number"
                    min="500"
                    step="1"
                    placeholder="Ex : 5000"
                    value={amount}
                    onChange={(e) =>
                      setAmount(
                        e.target.value
                      )
                    }
                    style={input}
                  />

                  <span
                    style={currency}
                  >
                    CDF
                  </span>

                </div>

                <small style={hint}>
                  Minimum : 500 CDF
                </small>

              </div>


              {/* ==================================================
                  DEPOT
              ================================================== */}

              {open === "deposit" && (
                <>

                  {/* MOYEN DE PAIEMENT */}

                  <div style={fieldGroup}>

                    <label style={label}>
                      Moyen de paiement
                    </label>

                    <div style={methodsGrid}>

                      {Object.entries(
                        methods
                      ).map(
                        ([
                          key,
                          item,
                        ]) => {

                          const selected =
                            method ===
                            key;

                          return (
                            <button
                              key={key}
                              type="button"
                              disabled={
                                !item.available
                              }
                              onClick={() =>
                                item.available &&
                                setMethod(
                                  key
                                )
                              }
                              style={{
                                ...methodCard,

                                ...(selected
                                  ? methodCardSelected
                                  : {}),

                                ...(!item.available
                                  ? methodCardDisabled
                                  : {}),
                              }}
                            >

                              <div
                                style={{
                                  ...methodIcon,
                                  ...(selected
                                    ? methodIconSelected
                                    : {}),
                                }}
                              >
                                {item.icon}
                              </div>

                              <div
                                style={
                                  methodText
                                }
                              >
                                <strong>
                                  {item.label}
                                </strong>

                                <span>
                                  {item.available
                                    ? "Disponible"
                                    : "Bientôt disponible"}
                                </span>
                              </div>

                              {selected && (
                                <Check
                                  size={18}
                                  style={
                                    checkIcon
                                  }
                                />
                              )}

                            </button>
                          );
                        }
                      )}

                    </div>

                  </div>


                  {/* NUMERO AGENT */}

                  {method &&
                    methods[method]?.available && (

                    <div style={paymentInfo}>

                      <div style={paymentInfoHeader}>
                        <ShieldCheck size={19} />

                        <strong>
                          Informations de paiement
                        </strong>
                      </div>

                      <p style={paymentInstruction}>
                        {method === "credit_card"
                          ? "Effectuez votre virement vers notre compte bancaire, puis saisissez la référence de l'opération afin que votre dépôt puisse être vérifié."
                          : "Envoyez exactement le montant indiqué ci-dessus au numéro Airtel Money indiqué, puis saisissez la référence de la transaction."
                        }
                      </p>

                      <div style={numberBox}>

                        <div style={paymentRecipient}>
                          <span style={recipientLabel}>
                            Bénéficiaire
                          </span>

                          <strong style={recipientName}>
                            {methods[method].accountName}
                          </strong>
                        </div>

                        <div style={paymentAccount}>
                          <span style={recipientLabel}>
                            {method === "credit_card"
                              ? "Compte bancaire"
                              : "Numéro Airtel Money"}
                          </span>

                          <strong style={accountNumber}>
                            {methods[method].number}
                          </strong>
                        </div>

                        <button
                          type="button"
                          onClick={copyNumber}
                          style={copyButton}
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


                  {/* REFERENCE */}

                  <div style={fieldGroup}>

                    <label style={label}>
                      Référence de transaction
                    </label>

                    <input
                      type="text"
                      placeholder="Ex : TXN123456789"
                      value={reference}
                      onChange={(e) =>
                        setReference(
                          e.target.value
                        )
                      }
                      style={plainInput}
                    />

                    <small style={hint}>
                      Saisissez la référence
                      reçue après votre paiement.
                    </small>

                  </div>

                </>
              )}


              {/* ==================================================
                  RETRAIT
              ================================================== */}

            {open === "withdraw" && (
              <>
                {/* MOYEN DE RETRAIT */}

                <div style={fieldGroup}>

                  <label style={label}>
                    Moyen de retrait
                  </label>

                  <div style={methodsGrid}>

                    {Object.entries(methods).map(
                      ([key, item]) => {

                        const selected =
                          withdrawMethod === key;

                        return (
                          <button
                            key={key}
                            type="button"
                            disabled={
                              !item.withdrawAvailable
                            }
                            onClick={() => {
                              if (
                                item.withdrawAvailable
                              ) {
                                setWithdrawMethod(key);
                                setPhone("");
                                setError("");
                              }
                            }}
                            style={{
                              ...methodCard,

                              ...(selected
                                ? methodCardSelected
                                : {}),

                              ...(!item.withdrawAvailable
                                ? methodCardDisabled
                                : {}),
                            }}
                          >

                            <div
                              style={{
                                ...methodIcon,

                                ...(selected
                                  ? methodIconSelected
                                  : {}),
                              }}
                            >
                              {item.icon}
                            </div>

                            <div style={methodText}>

                              <strong>
                                {item.label}
                              </strong>

                              <span>
                                {item.withdrawAvailable
                                  ? "Disponible"
                                  : "Bientôt disponible"}
                              </span>

                            </div>

                            {selected && (
                              <Check
                                size={18}
                                style={checkIcon}
                              />
                            )}

                          </button>
                        );
                      }
                    )}

                  </div>

                </div>


                {/* COORDONNÉE DE RETRAIT */}

                {withdrawMethod && (
                  <div style={fieldGroup}>

                    <label style={label}>
                      {withdrawMethod === "credit_card"
                        ? "Numéro de compte bancaire"
                        : `Numéro ${methods[withdrawMethod]?.label || ""}`
                      }
                    </label>

                    <div style={inputWrapper}>

                      {withdrawMethod === "credit_card" ? (
                        <CreditCard
                          size={19}
                          style={inputIcon}
                        />
                      ) : (
                        <Smartphone
                          size={19}
                          style={inputIcon}
                        />
                      )}

                      <input
                        type={
                          withdrawMethod === "credit_card"
                            ? "text"
                            : "tel"
                        }
                        placeholder={
                          withdrawMethod === "credit_card"
                            ? "Ex : votre numéro de compte"
                            : "Ex : 0999999999"
                        }
                        value={phone}
                        onChange={(e) =>
                          setPhone(e.target.value)
                        }
                        style={input}
                      />

                    </div>

                    <small style={hint}>
                      {withdrawMethod === "credit_card"
                        ? "Le transfert bancaire sera effectué vers ce compte."
                        : "Le retrait sera envoyé sur ce numéro."
                      }
                    </small>

                  </div>
                )}
              </>
            )}


              {/* ERROR */}

              {error && (
                <div style={errorBox}>

                  <AlertCircle
                    size={18}
                  />

                  <span>
                    {error}
                  </span>

                </div>
              )}

            </div>


            {/* FOOTER */}

            <div style={modalFooter}>

              <button
                type="button"
                onClick={close}
                disabled={loading}
                style={cancelButton}
              >
                Annuler
              </button>


              <button
                type="button"
                onClick={submit}
                disabled={
                  loading ||
                  (
                    open ===
                      "deposit" &&
                    method &&
                    !methods[
                      method
                    ]?.available
                  )
                }
                style={
                  open === "deposit"
                    ? confirmDepositButton
                    : confirmWithdrawButton
                }
              >

                {loading ? (
                  <>
                    <Loader2
                      size={18}
                      style={{
                        animation:
                          "spin 1s linear infinite",
                      }}
                    />

                    Traitement...
                  </>
                ) : (
                  <>
                    {open === "deposit"
                      ? "Confirmer le dépôt"
                      : "Confirmer le retrait"}
                  </>
                )}

              </button>

            </div>


            {/* SECURITE */}

            <div style={securityNotice}>

              <ShieldCheck
                size={16}
              />

              <span>
                Vos opérations sont
                sécurisées et enregistrées
                dans votre portefeuille.
              </span>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}


// ======================================================
// PETIT ICONE USDT
// ======================================================

function CoinsIcon() {
  return (
    <div
      style={{
        fontWeight: 900,
        fontSize: 17,
      }}
    >
      ₮
    </div>
  );
}


// ======================================================
// STYLES
// ======================================================

const container = {
  width: "100%",
};

const actionsGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(2,minmax(0,1fr))",
  gap: 14,
};

const baseActionButton = {
  border: "1px solid",
  borderRadius: 18,
  padding: "16px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 13,
  color: "white",
  textAlign: "left",
  transition: "transform .2s ease, box-shadow .2s ease",
};

const depositButton = {
  ...baseActionButton,
  background:
    "linear-gradient(135deg,#14532d,#166534)",
  borderColor: "#22c55e",
};

const withdrawButton = {
  ...baseActionButton,
  background:
    "linear-gradient(135deg,#7f1d1d,#991b1b)",
  borderColor: "#ef4444",
};

const buttonIcon = {
  width: 44,
  height: 44,
  borderRadius: 14,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background:
    "rgba(255,255,255,.12)",
  flexShrink: 0,
};

const buttonText = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

const overlay = {
  position: "fixed",
  inset: 0,
  zIndex: 9999,
  background:
    "rgba(2,6,23,.78)",
  backdropFilter: "blur(8px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 18,
};

const modal = {
  width: "100%",
  maxWidth: 620,
  maxHeight: "92vh",
  overflowY: "auto",
  background:
    "linear-gradient(145deg,#111827,#020617)",
  border:
    "1px solid rgba(255,255,255,.1)",
  borderRadius: 26,
  boxShadow:
    "0 30px 80px rgba(0,0,0,.55)",
};

const modalHeader = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 15,
  padding: 22,
  borderBottom:
    "1px solid rgba(255,255,255,.07)",
};

const modalTitleWrapper = {
  display: "flex",
  alignItems: "center",
  gap: 13,
};

const modalIconDeposit = {
  width: 48,
  height: 48,
  borderRadius: 15,
  background:
    "rgba(34,197,94,.15)",
  color: "#4ade80",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const modalIconWithdraw = {
  width: 48,
  height: 48,
  borderRadius: 15,
  background:
    "rgba(239,68,68,.15)",
  color: "#f87171",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const modalTitle = {
  margin: 0,
  color: "white",
  fontSize: 20,
};

const modalSubtitle = {
  margin: "5px 0 0",
  color: "#94a3b8",
  fontSize: 13,
};

const closeButton = {
  width: 38,
  height: 38,
  border: "none",
  borderRadius: 12,
  cursor: "pointer",
  background:
    "rgba(255,255,255,.07)",
  color: "#cbd5e1",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const modalContent = {
  padding: 22,
  display: "flex",
  flexDirection: "column",
  gap: 20,
};

const fieldGroup = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const label = {
  color: "#e2e8f0",
  fontSize: 14,
  fontWeight: 700,
};

const inputWrapper = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  background: "#0f172a",
  border:
    "1px solid #334155",
  borderRadius: 14,
  padding: "0 13px",
};

const inputIcon = {
  color: "#64748b",
  flexShrink: 0,
};

const input = {
  width: "100%",
  border: "none",
  outline: "none",
  background: "transparent",
  color: "white",
  padding: "14px 0",
  fontSize: 15,
};

const plainInput = {
  width: "100%",
  boxSizing: "border-box",
  background: "#0f172a",
  color: "white",
  border:
    "1px solid #334155",
  borderRadius: 14,
  padding: "14px",
  outline: "none",
  fontSize: 15,
};

const currency = {
  color: "#64748b",
  fontWeight: 700,
  fontSize: 13,
};

const hint = {
  color: "#64748b",
  fontSize: 12,
};

const methodsGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(2,minmax(0,1fr))",
  gap: 10,
};

const methodCard = {
  position: "relative",
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: 13,
  borderRadius: 15,
  border:
    "1px solid #334155",
  background: "#0f172a",
  color: "white",
  textAlign: "left",
  cursor: "pointer",
};

const methodCardSelected = {
  borderColor: "#3b82f6",
  background:
    "rgba(37,99,235,.13)",
};

const methodCardDisabled = {
  opacity: 0.48,
  cursor: "not-allowed",
};

const methodIcon = {
  width: 38,
  height: 38,
  borderRadius: 11,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background:
    "rgba(255,255,255,.06)",
  color: "#94a3b8",
  flexShrink: 0,
};

const methodIconSelected = {
  background:
    "rgba(59,130,246,.18)",
  color: "#60a5fa",
};

const methodText = {
  display: "flex",
  flexDirection: "column",
  gap: 3,
  fontSize: 12,
};

const checkIcon = {
  position: "absolute",
  right: 10,
  top: 10,
  color: "#60a5fa",
};

const paymentInfo = {
  padding: 16,
  borderRadius: 17,
  background:
    "rgba(234,179,8,.08)",
  border:
    "1px solid rgba(234,179,8,.25)",
};

const paymentInfoHeader = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  color: "#facc15",
};

const paymentInstruction = {
  color: "#cbd5e1",
  fontSize: 13,
  lineHeight: 1.6,
};

const numberBox = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: 12,
  borderRadius: 13,
  background:
    "rgba(0,0,0,.2)",
  flexWrap: "wrap",
};

const copyButton = {
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
};

const errorBox = {
  display: "flex",
  alignItems: "flex-start",
  gap: 9,
  padding: 13,
  borderRadius: 13,
  background:
    "rgba(239,68,68,.1)",
  border:
    "1px solid rgba(239,68,68,.3)",
  color: "#fca5a5",
  fontSize: 13,
};

const modalFooter = {
  display: "flex",
  gap: 10,
  padding: 22,
  borderTop:
    "1px solid rgba(255,255,255,.07)",
};

const cancelButton = {
  flex: 1,
  border: "1px solid #334155",
  borderRadius: 13,
  padding: "13px 15px",
  background: "transparent",
  color: "#cbd5e1",
  cursor: "pointer",
  fontWeight: 700,
};

const confirmDepositButton = {
  flex: 2,
  border: "none",
  borderRadius: 13,
  padding: "13px 15px",
  background:
    "linear-gradient(135deg,#16a34a,#22c55e)",
  color: "white",
  cursor: "pointer",
  fontWeight: 800,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  gap: 8,
};

const confirmWithdrawButton = {
  flex: 2,
  border: "none",
  borderRadius: 13,
  padding: "13px 15px",
  background:
    "linear-gradient(135deg,#dc2626,#ef4444)",
  color: "white",
  cursor: "pointer",
  fontWeight: 800,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  gap: 8,
};

const securityNotice = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 7,
  padding: "0 22px 20px",
  color: "#64748b",
  fontSize: 11,
  textAlign: "center",
};

const paymentRecipient = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  minWidth: 0,
};

const paymentAccount = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  minWidth: 0,
  flex: 1,
};

const recipientLabel = {
  color: "#94a3b8",
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: ".04em",
};

const recipientName = {
  color: "white",
  fontSize: 14,
};

const accountNumber = {
  color: "#f8fafc",
  fontSize: 15,
  letterSpacing: ".03em",
  wordBreak: "break-word",
};
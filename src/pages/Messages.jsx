import axios from "axios";
import {
  useMemo,
  useRef,
  useState,
} from "react";

import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  Gamepad2,
  ImagePlus,
  Receipt,
  Send,
  ShieldAlert,
  Wallet,
  X,
} from "lucide-react";

// ======================================================
// API
// ======================================================

const API =
  (
    import.meta.env.VITE_API_URL ||
    "https://api.6betball.com/api"
  ).replace(/\/+$/, "");

const api = axios.create({
  baseURL: API,
  timeout: 30000,
});

// ======================================================
// AUTH
// ======================================================

api.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem(
        "token"
      );

    if (token) {
      config.headers.Authorization =
        `Bearer ${token}`;
    }

    return config;
  }
);

// ======================================================
// CONFIG
// ======================================================

const MAX_IMAGE_SIZE =
  5 * 1024 * 1024;

const ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
];

// ======================================================
// REPORT TYPES
// ======================================================

const REPORT_TYPES = [
  {
    id: "MATCH_PROBLEM",
    label: "Problème de match",
    icon: <Gamepad2 size={18} />,
    description:
      "Bug, partie bloquée, triche, résultat incorrect...",
    requiresMatch: true,
  },

  {
    id: "TRANSACTION_PROBLEM",
    label:
      "Transaction non reçue",
    icon: <Wallet size={18} />,
    description:
      "Dépôt, retrait ou transfert introuvable.",
    requiresMatch: false,
  },

  {
    id: "PAYMENT_PROOF",
    label:
      "Preuve de paiement",
    icon: <Receipt size={18} />,
    description:
      "Envoi d'une preuve ou reçu de transaction.",
    requiresMatch: false,
  },

  {
    id: "ACCOUNT_PROBLEM",
    label:
      "Problème de compte",
    icon: <ShieldAlert size={18} />,
    description:
      "Compte bloqué, accès refusé, sécurité...",
    requiresMatch: false,
  },

  {
    id: "OTHER",
    label: "Autre",
    icon: <AlertTriangle size={18} />,
    description:
      "Autre demande adressée au support.",
    requiresMatch: false,
  },
];

// ======================================================
// COMPONENT
// ======================================================

export default function Message() {
  // ======================================================
  // STATES
  // ======================================================

  const [reportType, setReportType] =
    useState("MATCH_PROBLEM");

  const [matchId, setMatchId] =
    useState("");

  const [
    transactionId,
    setTransactionId,
  ] = useState("");

  const [
    amount,
    setAmount,
  ] = useState("");

  const [
    subject,
    setSubject,
  ] = useState("");

  const [
    description,
    setDescription,
  ] = useState("");

  const [image, setImage] =
    useState(null);

  const [
    imagePreview,
    setImagePreview,
  ] = useState("");

  const [sending, setSending] =
    useState(false);

  const [success, setSuccess] =
    useState("");

  const [error, setError] =
    useState("");

  const fileRef =
    useRef(null);

  // ======================================================
  // CURRENT TYPE
  // ======================================================

  const currentType =
    REPORT_TYPES.find(
      (r) =>
        r.id === reportType
    );

  // ======================================================
  // VALID
  // ======================================================

  const isValid =
    useMemo(() => {
      const validSubject =
        subject.trim()
          .length >= 5;

      const validDescription =
        description.trim()
          .length >= 20;

      const validMatch =
        !currentType?.requiresMatch ||
        Number(matchId) > 0;

      return (
        validSubject &&
        validDescription &&
        validMatch
      );
    }, [
      subject,
      description,
      matchId,
      currentType,
    ]);

  // ======================================================
  // IMAGE
  // ======================================================

  const handleImage = (
    e
  ) => {
    const file =
      e.target.files?.[0];

    setError("");

    if (!file) return;

    // ======================================================
    // TYPE
    // ======================================================

    if (
      !ALLOWED_TYPES.includes(
        file.type
      )
    ) {
      return setError(
        "Format image invalide"
      );
    }

    // ======================================================
    // SIZE
    // ======================================================

    if (
      file.size >
      MAX_IMAGE_SIZE
    ) {
      return setError(
        "Image trop lourde (5MB max)"
      );
    }

    setImage(file);

    const reader =
      new FileReader();

    reader.onload = () => {
      setImagePreview(
        reader.result
      );
    };

    reader.readAsDataURL(
      file
    );
  };

  // ======================================================
  // REMOVE IMAGE
  // ======================================================

  const removeImage = () => {
    setImage(null);

    setImagePreview("");

    if (fileRef.current) {
      fileRef.current.value =
        "";
    }
  };

  // ======================================================
  // SUBMIT
  // ======================================================

  const handleSubmit =
    async (e) => {
      e.preventDefault();

      setError("");
      setSuccess("");

      // ======================================================
      // VALIDATIONS
      // ======================================================

      if (
        currentType
          ?.requiresMatch &&
        !Number(matchId)
      ) {
        return setError(
          "ID du match invalide"
        );
      }

      if (
        subject.trim()
          .length < 5
      ) {
        return setError(
          "Sujet trop court"
        );
      }

      if (
        description.trim()
          .length < 20
      ) {
        return setError(
          "Description trop courte"
        );
      }

      try {
        setSending(true);

        // ======================================================
        // FORM DATA
        // ======================================================

        const form =
          new FormData();

        form.append(
          "type",
          reportType
        );

        form.append(
          "subject",
          subject.trim()
        );

        form.append(
          "message",
          description.trim()
        );

        if (
          currentType
            ?.requiresMatch
        ) {
          form.append(
            "matchId",
            matchId
          );
        }

        if (
          transactionId
            .trim()
        ) {
          form.append(
            "transactionId",
            transactionId.trim()
          );
        }

        if (amount) {
          form.append(
            "amount",
            amount
          );
        }

        if (image) {
          form.append(
            "image",
            image
          );
        }

        // ======================================================
        // SEND
        // ======================================================

        await api.post(
          "/messages",
          form,
          {
            headers: {
              "Content-Type":
                "multipart/form-data",
            },
          }
        );

        // ======================================================
        // RESET
        // ======================================================

        setMatchId("");
        setTransactionId("");
        setAmount("");
        setSubject("");
        setDescription("");
        setImage(null);
        setImagePreview("");

        if (
          fileRef.current
        ) {
          fileRef.current.value =
            "";
        }

        setSuccess(
          "✅ Votre demande a été envoyée avec succès au support 6BetBall."
        );
      } catch (err) {
        console.error(err);

        setError(
          err?.response
            ?.data?.error ||
            "Erreur lors de l'envoi"
        );
      } finally {
        setSending(false);
      }
    };

  // ======================================================
  // UI
  // ======================================================

  return (
    <div style={page}>
      <div style={container}>
        {/* ====================================================== */}
        {/* HEADER */}
        {/* ====================================================== */}

        <div style={header}>
          <div style={headerBadge}>
            <CreditCard
              size={18}
            />
            Centre Support
          </div>

          <h1 style={title}>
            📩 Assistance &
            Réclamations
          </h1>

          <div style={subtitle}>
            Envoyez une
            réclamation concernant
            un match, une
            transaction, un dépôt
            non reçu ou tout autre
            problème rencontré sur
            6BetBall.
          </div>
        </div>

        {/* ====================================================== */}
        {/* ALERTS */}
        {/* ====================================================== */}

        {error && (
          <div style={errorBox}>
            <AlertTriangle
              size={18}
            />
            {error}
          </div>
        )}

        {success && (
          <div style={successBox}>
            <CheckCircle2
              size={18}
            />
            {success}
          </div>
        )}

        {/* ====================================================== */}
        {/* TYPES */}
        {/* ====================================================== */}

        <div style={typesGrid}>
          {REPORT_TYPES.map(
            (type) => (
              <button
                key={type.id}
                type="button"
                onClick={() =>
                  setReportType(
                    type.id
                  )
                }
                style={{
                  ...typeCard,

                  border:
                    reportType ===
                    type.id
                      ? "1px solid #3b82f6"
                      : "1px solid rgba(255,255,255,0.08)",

                  background:
                    reportType ===
                    type.id
                      ? "rgba(37,99,235,0.18)"
                      : "#111827",
                }}
              >
                <div
                  style={
                    typeIcon
                  }
                >
                  {type.icon}
                </div>

                <div>
                  <div
                    style={
                      typeTitle
                    }
                  >
                    {
                      type.label
                    }
                  </div>

                  <div
                    style={
                      typeDescription
                    }
                  >
                    {
                      type.description
                    }
                  </div>
                </div>
              </button>
            )
          )}
        </div>

        {/* ====================================================== */}
        {/* FORM */}
        {/* ====================================================== */}

        <form
          onSubmit={
            handleSubmit
          }
          style={form}
        >
          {/* ====================================================== */}
          {/* MATCH ID */}
          {/* ====================================================== */}

          {currentType?.requiresMatch && (
            <div style={group}>
              <label style={label}>
                🎮 ID du match
              </label>

              <input
                type="number"
                value={matchId}
                onChange={(e) =>
                  setMatchId(
                    e.target.value
                  )
                }
                placeholder="Ex: 125"
                style={input}
                required
              />
            </div>
          )}

          {/* ====================================================== */}
          {/* TRANSACTION ID */}
          {/* ====================================================== */}

          <div style={group}>
            <label style={label}>
              💳 ID Transaction
              (optionnel)
            </label>

            <input
              type="text"
              value={
                transactionId
              }
              onChange={(e) =>
                setTransactionId(
                  e.target.value
                )
              }
              placeholder="Ex: TRX-928383"
              style={input}
            />
          </div>

          {/* ====================================================== */}
          {/* AMOUNT */}
          {/* ====================================================== */}

          <div style={group}>
            <label style={label}>
              💰 Montant concerné
              (optionnel)
            </label>

            <input
              type="number"
              value={amount}
              onChange={(e) =>
                setAmount(
                  e.target.value
                )
              }
              placeholder="Ex: 5000"
              style={input}
            />
          </div>

          {/* ====================================================== */}
          {/* SUBJECT */}
          {/* ====================================================== */}

          <div style={group}>
            <label style={label}>
              📝 Sujet
            </label>

            <input
              type="text"
              value={subject}
              onChange={(e) =>
                setSubject(
                  e.target.value
                )
              }
              placeholder="Décrivez brièvement votre problème"
              maxLength={120}
              style={input}
              required
            />
          </div>

          {/* ====================================================== */}
          {/* DESCRIPTION */}
          {/* ====================================================== */}

          <div style={group}>
            <label style={label}>
              📄 Description
              détaillée
            </label>

            <textarea
              value={
                description
              }
              onChange={(e) =>
                setDescription(
                  e.target.value
                )
              }
              placeholder="Expliquez précisément le problème rencontré..."
              style={textarea}
              maxLength={4000}
              required
            />
          </div>

          {/* ====================================================== */}
          {/* IMAGE */}
          {/* ====================================================== */}

          <div style={group}>
            <label style={label}>
              📸 Capture /
              justificatif
              (optionnel)
            </label>

            <label
              style={
                uploadArea
              }
            >
              <ImagePlus
                size={34}
              />

              <div
                style={
                  uploadTitle
                }
              >
                Ajouter une
                image
              </div>

              <div
                style={
                  uploadSubtitle
                }
              >
                PNG / JPG /
                WEBP — 5MB max
              </div>

              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={
                  handleImage
                }
                style={{
                  display:
                    "none",
                }}
              />
            </label>

            {imagePreview && (
              <div
                style={
                  previewWrapper
                }
              >
                <img
                  src={
                    imagePreview
                  }
                  alt="preview"
                  style={
                    previewImage
                  }
                />

                <button
                  type="button"
                  onClick={
                    removeImage
                  }
                  style={
                    removeBtn
                  }
                >
                  <X size={16} />
                  Retirer
                </button>
              </div>
            )}
          </div>

          {/* ====================================================== */}
          {/* BUTTON */}
          {/* ====================================================== */}

          <button
            type="submit"
            disabled={
              !isValid ||
              sending
            }
            style={{
              ...submitBtn,

              opacity:
                !isValid ||
                sending
                  ? 0.6
                  : 1,

              cursor:
                !isValid ||
                sending
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {sending ? (
              "⏳ Envoi en cours..."
            ) : (
              <>
                <Send
                  size={18}
                />
                Envoyer au
                support
              </>
            )}
          </button>
        </form>

        {/* ====================================================== */}
        {/* HELP */}
        {/* ====================================================== */}

        <div style={helpBox}>
          <div style={helpTitle}>
            ℹ️ Recommandations
          </div>

          <ul style={helpList}>
            <li>
              Fournissez un
              maximum de détails
              pour accélérer le
              traitement.
            </li>

            <li>
              Pour les problèmes
              financiers, ajoutez
              si possible l'ID de
              transaction et le
              montant exact.
            </li>

            <li>
              Les captures
              d'écran améliorent
              fortement la
              vérification du
              support.
            </li>

            <li>
              Les demandes sont
              analysées par
              l'administration
              6BetBall.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// ======================================================
// STYLES
// ======================================================

const page = {
  minHeight: "100vh",
  background:
    "linear-gradient(135deg,#020617,#0f172a)",
  padding: 24,
  color: "white",
};

const container = {
  maxWidth: 980,
  margin: "0 auto",
  background:
    "linear-gradient(to bottom, rgba(17,24,39,0.96), rgba(15,23,42,0.96))",
  borderRadius: 30,
  padding: 32,
  border:
    "1px solid rgba(255,255,255,0.08)",
  boxShadow:
    "0 20px 60px rgba(0,0,0,0.35)",
};

const header = {
  marginBottom: 30,
};

const headerBadge = {
  width: "fit-content",
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 14px",
  borderRadius: 999,
  background:
    "rgba(37,99,235,0.15)",
  color: "#93c5fd",
  marginBottom: 18,
  fontWeight: 700,
  fontSize: 13,
};

const title = {
  margin: 0,
  fontSize: 38,
  fontWeight: 900,
};

const subtitle = {
  marginTop: 12,
  color: "#94a3b8",
  lineHeight: 1.7,
  maxWidth: 720,
};

const typesGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(240px,1fr))",
  gap: 16,
  marginBottom: 30,
};

const typeCard = {
  borderRadius: 20,
  padding: 18,
  textAlign: "left",
  cursor: "pointer",
  transition: "0.2s",
  color: "white",
};

const typeIcon = {
  width: 46,
  height: 46,
  borderRadius: 14,
  background:
    "rgba(255,255,255,0.08)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: 14,
};

const typeTitle = {
  fontWeight: 800,
  marginBottom: 8,
};

const typeDescription = {
  fontSize: 13,
  color: "#94a3b8",
  lineHeight: 1.6,
};

const form = {
  display: "flex",
  flexDirection:
    "column",
  gap: 22,
};

const group = {
  display: "flex",
  flexDirection:
    "column",
  gap: 10,
};

const label = {
  fontWeight: 700,
  fontSize: 15,
};

const input = {
  padding: 16,
  borderRadius: 16,
  border:
    "1px solid rgba(255,255,255,0.08)",
  background: "#0f172a",
  color: "white",
  outline: "none",
  fontSize: 15,
};

const textarea = {
  minHeight: 200,
  resize: "vertical",
  padding: 18,
  borderRadius: 18,
  border:
    "1px solid rgba(255,255,255,0.08)",
  background: "#0f172a",
  color: "white",
  outline: "none",
  lineHeight: 1.7,
  fontSize: 15,
};

const uploadArea = {
  border:
    "2px dashed rgba(59,130,246,0.4)",
  borderRadius: 22,
  padding: 40,
  display: "flex",
  flexDirection:
    "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  background:
    "rgba(15,23,42,0.7)",
  cursor: "pointer",
};

const uploadTitle = {
  fontWeight: 800,
  fontSize: 16,
};

const uploadSubtitle = {
  fontSize: 13,
  color: "#94a3b8",
};

const previewWrapper = {
  marginTop: 16,
  position: "relative",
};

const previewImage = {
  width: "100%",
  maxHeight: 420,
  objectFit: "contain",
  borderRadius: 18,
  border:
    "1px solid rgba(255,255,255,0.08)",
};

const removeBtn = {
  marginTop: 14,
  border: "none",
  background: "#ef4444",
  color: "white",
  padding: "12px 16px",
  borderRadius: 12,
  cursor: "pointer",
  fontWeight: 700,
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const submitBtn = {
  border: "none",
  background:
    "linear-gradient(135deg,#2563eb,#1d4ed8)",
  color: "white",
  padding: "18px 22px",
  borderRadius: 18,
  fontSize: 16,
  fontWeight: 800,
  transition: "0.2s",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
};

const errorBox = {
  background:
    "rgba(239,68,68,0.15)",
  color: "#fca5a5",
  border:
    "1px solid rgba(239,68,68,0.3)",
  padding: 16,
  borderRadius: 16,
  marginBottom: 20,
  display: "flex",
  alignItems: "center",
  gap: 10,
};

const successBox = {
  background:
    "rgba(34,197,94,0.15)",
  color: "#86efac",
  border:
    "1px solid rgba(34,197,94,0.3)",
  padding: 16,
  borderRadius: 16,
  marginBottom: 20,
  display: "flex",
  alignItems: "center",
  gap: 10,
};

const helpBox = {
  marginTop: 36,
  padding: 24,
  borderRadius: 22,
  background: "#0f172a",
  border:
    "1px solid rgba(255,255,255,0.08)",
};

const helpTitle = {
  fontWeight: 800,
  marginBottom: 14,
  fontSize: 16,
};

const helpList = {
  margin: 0,
  paddingLeft: 20,
  lineHeight: 2,
  color: "#cbd5e1",
};
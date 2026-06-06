import axios from "axios";
import {
  useMemo,
  useRef,
  useState,
} from "react";

// ======================================================
// API
// ======================================================

const API =
  import.meta.env.VITE_API_URL ||
  "http://localhost:3000/api";

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
// COMPONENT
// ======================================================

export default function Message() {
  // ======================================================
  // STATES
  // ======================================================

  const [matchId, setMatchId] =
    useState("");

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
  // VALID
  // ======================================================

  const isValid =
    useMemo(() => {
      return (
        Number(matchId) > 0 &&
        subject.trim()
          .length >= 5 &&
        description.trim()
          .length >= 20 &&
        image
      );
    }, [
      matchId,
      subject,
      description,
      image,
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

    if (!file) {
      return;
    }

    // ======================================================
    // TYPE
    // ======================================================

    if (
      !ALLOWED_TYPES.includes(
        file.type
      )
    ) {
      setError(
        "Format image invalide"
      );

      return;
    }

    // ======================================================
    // SIZE
    // ======================================================

    if (
      file.size >
      MAX_IMAGE_SIZE
    ) {
      setError(
        "Image trop lourde (5MB max)"
      );

      return;
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

      if (!image) {
        return setError(
          "Capture obligatoire"
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
          "matchId",
          matchId
        );

        form.append(
          "subject",
          subject.trim()
        );

        form.append(
          "message",
          description.trim()
        );

        form.append(
          "image",
          image
        );

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
          "✅ Message envoyé à l'administration"
        );
      } catch (err) {
        console.error(
          err
        );

        setError(
          err?.response
            ?.data?.error ||
            "Erreur envoi message"
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
          <h1 style={title}>
            📩 Support &
            Réclamations
          </h1>

          <div style={subtitle}>
            Tous les messages
            sont envoyés à
            l'administration
            6BetBall.
          </div>
        </div>

        {/* ====================================================== */}
        {/* ALERTS */}
        {/* ====================================================== */}

        {error && (
          <div style={errorBox}>
            ❌ {error}
          </div>
        )}

        {success && (
          <div style={successBox}>
            {success}
          </div>
        )}

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
              placeholder="Ex: Match bloqué / Suspicion de triche"
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
              📄 Description du
              problème
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
              placeholder="Décris précisément le problème rencontré..."
              style={textarea}
              maxLength={3000}
              required
            />
          </div>

          {/* ====================================================== */}
          {/* IMAGE */}
          {/* ====================================================== */}

          <div style={group}>
            <label style={label}>
              📸 Capture
              obligatoire
            </label>

            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={
                handleImage
              }
              style={fileInput}
              required
            />

            <div style={hint}>
              PNG / JPG / WEBP —
              5MB max
            </div>

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
                  ✖ Retirer
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
            {sending
              ? "⏳ Envoi..."
              : "📨 Envoyer au support"}
          </button>
        </form>

        {/* ====================================================== */}
        {/* HELP */}
        {/* ====================================================== */}

        <div style={helpBox}>
          <div style={helpTitle}>
            ℹ️ Conseils
          </div>

          <ul style={helpList}>
            <li>
              Ajoute toujours
              une capture claire
              du problème.
            </li>

            <li>
              Vérifie bien
              l'ID du match.
            </li>

            <li>
              Décris les étapes
              exactes du bug ou
              du litige.
            </li>

            <li>
              Les messages sont
              traités par
              l'administration.
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
  maxWidth: 900,
  margin: "0 auto",
  background: "#111827",
  borderRadius: 24,
  padding: 30,
  border:
    "1px solid rgba(255,255,255,0.08)",
};

const header = {
  marginBottom: 30,
};

const title = {
  margin: 0,
  fontSize: 36,
};

const subtitle = {
  marginTop: 10,
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
  padding: 14,
  borderRadius: 14,
  border:
    "1px solid rgba(255,255,255,0.08)",
  background: "#0f172a",
  color: "white",
  outline: "none",
  fontSize: 15,
};

const textarea = {
  minHeight: 180,
  resize: "vertical",
  padding: 16,
  borderRadius: 14,
  border:
    "1px solid rgba(255,255,255,0.08)",
  background: "#0f172a",
  color: "white",
  outline: "none",
  lineHeight: 1.6,
  fontSize: 15,
};

const fileInput = {
  color: "white",
};

const hint = {
  color: "#94a3b8",
  fontSize: 13,
};

const previewWrapper = {
  marginTop: 12,
  position: "relative",
};

const previewImage = {
  width: "100%",
  maxHeight: 420,
  objectFit: "contain",
  borderRadius: 16,
  border:
    "1px solid rgba(255,255,255,0.08)",
};

const removeBtn = {
  marginTop: 12,
  border: "none",
  background: "#ef4444",
  color: "white",
  padding: "10px 14px",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: 700,
};

const submitBtn = {
  border: "none",
  background:
    "linear-gradient(135deg,#2563eb,#1d4ed8)",
  color: "white",
  padding: "16px 22px",
  borderRadius: 16,
  fontSize: 16,
  fontWeight: 700,
  transition: "0.2s",
};

const errorBox = {
  background:
    "rgba(239,68,68,0.15)",
  color: "#fca5a5",
  border:
    "1px solid rgba(239,68,68,0.3)",
  padding: 14,
  borderRadius: 14,
  marginBottom: 20,
};

const successBox = {
  background:
    "rgba(34,197,94,0.15)",
  color: "#86efac",
  border:
    "1px solid rgba(34,197,94,0.3)",
  padding: 14,
  borderRadius: 14,
  marginBottom: 20,
};

const helpBox = {
  marginTop: 34,
  padding: 22,
  borderRadius: 18,
  background: "#0f172a",
  border:
    "1px solid rgba(255,255,255,0.08)",
};

const helpTitle = {
  fontWeight: 700,
  marginBottom: 12,
};

const helpList = {
  margin: 0,
  paddingLeft: 20,
  lineHeight: 1.8,
};
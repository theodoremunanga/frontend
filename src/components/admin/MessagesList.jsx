import {
  useEffect,
  useMemo,
  useState,
} from "react";

import api from "../../services/api";

const API_BASE =
  import.meta.env.VITE_API_URL?.replace(
    "/api",
    ""
  ) || "";

// ======================================================
// HELPERS
// ======================================================

function formatDate(date) {
  if (!date) return "--";

  try {
    return new Date(date)
      .toLocaleString("fr-FR");
  } catch {
    return "--";
  }
}

function getStatusColor(status) {
  switch (
    String(status).toLowerCase()
  ) {
    case "approved":
      return "#22c55e";

    case "resolved":
      return "#3b82f6";

    case "pending":
      return "#f59e0b";

    case "rejected":
    case "closed":
      return "#ef4444";

    default:
      return "#64748b";
  }
}

// ======================================================
// COMPONENT
// ======================================================

export default function MessagesList() {
  const [tab, setTab] =
    useState("messages");

  const [messages, setMessages] =
    useState([]);

  const [reports, setReports] =
    useState([]);

  const [claims, setClaims] =
    useState([]);

  const [selected, setSelected] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [search, setSearch] =
    useState("");

  const [reply, setReply] =
    useState("");
  

  // ======================================================
  // LOAD
  // ======================================================

  const loadData = async () => {
    try {
      setLoading(true);

      const [
        messagesRes,
        reportsRes,
        claimsRes,
      ] = await Promise.all([
        api.get("/admin/messages"),
        api.get("/admin/reports"),
        api.get("/admin/claims"),
      ]);

      setMessages(
        Array.isArray(
          messagesRes.data
        )
          ? messagesRes.data
          : []
      );

      setReports(
        reportsRes.data?.reports ||
          []
      );

      setClaims(
        claimsRes.data?.claims ||
          []
      );
    } catch (err) {
      console.error(
        "MessagesList:",
        err
      );
    } finally {
      setLoading(false);
    }
  };

  // ======================================================
  // INIT
  // ======================================================

  useEffect(() => {
    loadData();

    const interval =
      setInterval(
        loadData,
        15000
      );

    return () =>
      clearInterval(interval);
  }, []);

  useEffect(() => {

  if (selected?.reply) {
    setReply(
      selected.reply
    );
  } else {
    setReply("");
  }

}, [selected]);

const sendReply =
  async () => {

    if (!selected?.id) {
      return;
    }

    if (!reply.trim()) {
      alert(
        "Écrivez une réponse"
      );
      return;
    }

    try {

      await api.post(
        `/admin/messages/${selected.id}/reply`,
        {
          reply,
        }
      );

      alert(
        "Réponse envoyée"
      );

      loadData();

    } catch (err) {

      console.error(err);

      alert(
        "Erreur envoi"
      );
    }
  };

  // ======================================================
  // FILTER
  // ======================================================

  const currentList = useMemo(() => {
    let data = [];

    if (tab === "messages")
      data = messages;

    if (tab === "reports")
      data = reports;

    if (tab === "claims")
      data = claims;

    if (!search.trim()) {
      return data;
    }

    const q =
      search.toLowerCase();

    return data.filter((item) =>
      JSON.stringify(item)
        .toLowerCase()
        .includes(q)
    );
  }, [
    tab,
    messages,
    reports,
    claims,
    search,
  ]);

  // ======================================================
  // AUTO SELECT
  // ======================================================

  useEffect(() => {
    if (
      currentList.length &&
      !selected
    ) {
      setSelected(
        currentList[0]
      );
    }
  }, [
    currentList,
    selected,
  ]);

  // ======================================================
  // IMAGE
  // ======================================================

  const getImage = (item) => {
    if (!item?.image)
      return null;

    if (
      item.image.startsWith(
        "http"
      )
    ) {
      return item.image;
    }

    if (
      item.image.startsWith(
        "/uploads"
      )
    ) {
      return `${API_BASE}${item.image}`;
    }

    return `${API_BASE}/uploads/claims/${item.image}`;
  };

  // ======================================================
  // ACTIONS MESSAGES
  // ======================================================

  const markRead =
    async (id) => {
      try {
        await api.post(
          `/admin/messages/${id}/read`
        );

        loadData();
      } catch (err) {
        console.error(err);
      }
    };

  const resolveMessage =
    async (id) => {
      try {
        await api.post(
          `/admin/messages/${id}/resolve`
        );

        loadData();
      } catch (err) {
        console.error(err);
      }
    };

  const deleteMessage =
    async (id) => {
      if (
        !window.confirm(
          "Supprimer ce message ?"
        )
      ) {
        return;
      }

      try {
        await api.delete(
          `/admin/messages/${id}`
        );

        setSelected(null);

        loadData();
      } catch (err) {
        console.error(err);
      }
    };

  // ======================================================
  // REPORTS
  // ======================================================

  const resolveReport =
    async (id) => {
      try {
        await api.post(
          `/admin/reports/${id}/resolve`
        );

        loadData();
      } catch (err) {
        console.error(err);
      }
    };

  const deleteReport =
    async (id) => {
      if (
        !window.confirm(
          "Supprimer ce signalement ?"
        )
      ) {
        return;
      }

      try {
        await api.delete(
          `/admin/reports/${id}`
        );

        setSelected(null);

        loadData();
      } catch (err) {
        console.error(err);
      }
    };

  // ======================================================
  // CLAIMS
  // ======================================================

  const approveClaim =
    async (id) => {
      try {
        await api.post(
          `/admin/claims/${id}/approve`
        );

        loadData();
      } catch (err) {
        console.error(err);
      }
    };

  const rejectClaim =
    async (id) => {
      try {
        await api.post(
          `/admin/claims/${id}/reject`,
          {
            reason:
              "Rejeté par administrateur",
          }
        );

        loadData();
      } catch (err) {
        console.error(err);
      }
    };

  // ======================================================
  // RENDER
  // ======================================================

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "380px 1fr",
        gap: 20,
      }}
    >
      {/* LEFT */}

      <div>
        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 15,
          }}
        >
          <button
            onClick={() =>
              setTab(
                "messages"
              )
            }
          >
            💬 Messages (
            {messages.length})
          </button>

          <button
            onClick={() =>
              setTab(
                "reports"
              )
            }
          >
            🚨 Signalements (
            {reports.length})
          </button>

          <button
            onClick={() =>
              setTab("claims")
            }
          >
            💰 Réclamations (
            {claims.length})
          </button>
        </div>

        <input
          value={search}
          onChange={(e) =>
            setSearch(
              e.target.value
            )
          }
          placeholder="Recherche..."
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 12,
            marginBottom: 15,
          }}
        />

        {loading && (
          <div>
            Chargement...
          </div>
        )}

        {!loading &&
          !currentList.length && (
            <div>
              Aucun élément
            </div>
          )}

        {currentList.map(
          (item) => (
            <div
              key={item.id}
              onClick={() =>
                setSelected(item)
              }
              style={{
                padding: 14,
                marginBottom: 10,
                cursor: "pointer",
                borderRadius: 14,
                border:
                  selected?.id ===
                  item.id
                    ? "1px solid #2563eb"
                    : "1px solid rgba(255,255,255,0.08)",
                background:
                  selected?.id ===
                  item.id
                    ? "rgba(37,99,235,0.15)"
                    : "rgba(255,255,255,0.03)",
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                }}
              >
                {item.username ||
                  item.user ||
                  "Utilisateur"}
              </div>

              <div
                style={{
                  marginTop: 6,
                }}
              >
                {(
                  item.subject ||
                  item.reason ||
                  item.content ||
                  item.message ||
                  ""
                ).slice(
                  0,
                  80
                )}
              </div>

              <div
                style={{
                  marginTop: 8,
                  color:
                    "#94a3b8",
                  fontSize: 12,
                }}
              >
                {formatDate(
                  item.created_at
                )}
              </div>
            </div>
          )
        )}
      </div>

      {/* RIGHT */}

      <div>
        {!selected && (
          <div>
            Sélectionnez un élément
          </div>
        )}

        {selected && (
          <>
            <div
              style={{
                display: "flex",
                gap: 10,
                marginBottom: 15,
              }}
            >
              <span
                style={{
                  background:
                    getStatusColor(
                      selected.status
                    ),
                  color: "#fff",
                  padding:
                    "6px 12px",
                  borderRadius: 10,
                  fontWeight: 700,
                }}
              >
                {selected.status ||
                  "MESSAGE"}
              </span>

              <span>
                {formatDate(
                  selected.created_at
                )}
              </span>
            </div>

            <h2>
              {selected.subject ||
                selected.reason ||
                "Sans sujet"}
            </h2>

            <p>
              {selected.message ||
                selected.content ||
                selected.reason}
            </p>

            <p>
              <strong>
                Utilisateur :
              </strong>{" "}
              {selected.username ||
                selected.user}
            </p>

            <p>
              <strong>
                Match :
              </strong>{" "}
              {selected.match_id ||
                "--"}
            </p>

            {selected.image && (
              <img
                src={getImage(
                  selected
                )}
                alt=""
                style={{
                  width: "100%",
                  maxWidth: 600,
                  borderRadius: 16,
                  marginTop: 15,
                }}
              />
            )}

            <hr
             style={{
                margin: "20px 0",
             }}
           />

          <h3>
            Réponse administrateur
          </h3>

          <textarea
            value={reply}
            onChange={(e) =>
              setReply(
                e.target.value
              )
            }
            rows={6}
            placeholder="Répondre à l'utilisateur..."
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 12,
              resize: "vertical",
              background: "#0f172a",
              color: "#fff",
              border:
                "1px solid #334155",
            }}
          />

          <button
            onClick={sendReply}
            style={{
              marginTop: 10,
              padding:
                "12px 18px",
              border: "none",
              borderRadius: 12,
              background:
                "#2563eb",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            📨 Envoyer la réponse
          </button>

            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                marginTop: 20,
              }}
            >
              {tab ===
                "messages" && (
                <>
                  <button
                    onClick={() =>
                      markRead(
                        selected.id
                      )
                    }
                  >
                    ✓ Lu
                  </button>

                  <button
                    onClick={() =>
                      resolveMessage(
                        selected.id
                      )
                    }
                  >
                    ✓ Résolu
                  </button>

                  <button
                    onClick={() =>
                      deleteMessage(
                        selected.id
                      )
                    }
                  >
                    🗑 Supprimer
                  </button>
                </>
              )}

              {tab ===
                "reports" && (
                <>
                  <button
                    onClick={() =>
                      resolveReport(
                        selected.id
                      )
                    }
                  >
                    ✓ Résoudre
                  </button>

                  <button
                    onClick={() =>
                      deleteReport(
                        selected.id
                      )
                    }
                  >
                    🗑 Supprimer
                  </button>
                </>
              )}

              {tab ===
                "claims" && (
                <>
                  <button
                    onClick={() =>
                      approveClaim(
                        selected.id
                      )
                    }
                  >
                    ✅ Approuver
                  </button>

                  <button
                    onClick={() =>
                      rejectClaim(
                        selected.id
                      )
                    }
                  >
                    ❌ Rejeter
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
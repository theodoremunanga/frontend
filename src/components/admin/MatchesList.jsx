import { useState } from "react";


// ======================================================
// API CONFIG
// ======================================================

import api from "../services/api";
// ======================================================
// TOKEN INTERCEPTOR
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
// COMPONENT
// ======================================================

export default function MatchesList({
  matches = [],
  onRefresh,
}) {
  // ====================================================
  // STATES
  // ====================================================

  const [loadingId, setLoadingId] =
    useState(null);

  const [selectedMatch, setSelectedMatch] =
    useState(null);

  const [matchState, setMatchState] =
    useState(null);

  const [loadingState, setLoadingState] =
    useState(false);

  // ====================================================
  // EMPTY
  // ====================================================

  if (!matches.length) {
    return (
      <p
        style={{
          color: "#94a3b8",
        }}
      >
        Aucun match
      </p>
    );
  }

  // ====================================================
  // SAFE REFRESH
  // ====================================================

  const refresh =
    async () => {
      try {
        await onRefresh?.();
      } catch (err) {
        console.error(
          "❌ Refresh error:",
          err
        );
      }
    };

  // ====================================================
  // CANCEL MATCH
  // ====================================================

  const cancelMatch =
    async (id) => {
      const confirmCancel =
        confirm(
          "Annuler ce match ?"
        );

      if (!confirmCancel) {
        return;
      }

      try {
        setLoadingId(id);

        await api.post(
          `/admin/match/${id}/cancel`
        );

        alert(
          "✅ Match annulé"
        );

        await refresh();
      } catch (err) {
        console.error(err);

        alert(
          err?.response?.data
            ?.error ||
            "❌ Erreur annulation"
        );
      } finally {
        setLoadingId(null);
      }
    };

  // ====================================================
  // FORCE FINISH
  // ====================================================

  const finishMatch =
    async (id) => {
      const confirmFinish =
        confirm(
          "Terminer ce match ?"
        );

      if (!confirmFinish) {
        return;
      }

      try {
        setLoadingId(id);

        await api.post(
          `/admin/match/${id}/force-finish`
        );

        alert(
          "✅ Match terminé"
        );

        await refresh();
      } catch (err) {
        console.error(err);

        alert(
          err?.response?.data
            ?.error ||
            "❌ Erreur fin match"
        );
      } finally {
        setLoadingId(null);
      }
    };

  // ====================================================
  // VIEW PLAYERS
  // ====================================================

  const viewPlayers = (
    m
  ) => {
    alert(
      `👥 Joueurs\n\n${m.user1_name || "?"} VS ${m.user2_name || "?"}`
    );
  };

  // ====================================================
  // VIEW MATCH STATE
  // ====================================================

  const viewMatchState =
    async (match) => {
      try {
        setSelectedMatch(
          match
        );

        setLoadingState(true);

        const res =
          await api.get(
            `/admin/match/${match.id}/state`
          );

        setMatchState(
          res.data
        );
      } catch (err) {
        console.error(err);

        alert(
          err?.response?.data
            ?.error ||
            "❌ Impossible de récupérer l'état du match"
        );
      } finally {
        setLoadingState(false);
      }
    };

  // ====================================================
  // STATUS COLOR
  // ====================================================

  const getStatusColor = (
    status
  ) => {
    switch (status) {
      case "finished":
        return "#22c55e";

      case "cancelled":
        return "#ef4444";

      case "playing":
        return "#38bdf8";

      case "pending":
        return "#f59e0b";

      default:
        return "#94a3b8";
    }
  };

  // ====================================================
  // RENDER
  // ====================================================

  return (
    <>
      <div style={container}>
        {matches.map((m) => (
          <div
            key={m.id}
            style={card}
          >
            {/* HEADER */}

            <div style={header}>
              <div>
                <strong>
                  Match #{m.id}
                </strong>

                <div
                  style={{
                    ...subText,

                    color:
                      getStatusColor(
                        m.status
                      ),
                  }}
                >
                  ● {m.status} •{" "}
                  {m.game} • 💰{" "}
                  {m.bet_amount ||
                    0}
                </div>
              </div>

              <div
                style={players}
              >
                <span>
                  {m.user1_name ||
                    "?"}
                </span>

                <span
                  style={{
                    color:
                      "#38bdf8",
                  }}
                >
                  vs
                </span>

                <span>
                  {m.user2_name ||
                    "?"}
                </span>
              </div>
            </div>

            {/* ACTIONS */}

            <div style={actions}>
              <button
                style={
                  btnPrimary
                }
                onClick={() =>
                  viewPlayers(
                    m
                  )
                }
              >
                👥 Joueurs
              </button>

              <button
                style={btnInfo}
                onClick={() =>
                  viewMatchState(
                    m
                  )
                }
              >
                📡 Voir état
              </button>

              {![
                "cancelled",
                "finished",
              ].includes(
                m.status
              ) && (
                <>
                  <button
                    disabled={
                      loadingId ===
                      m.id
                    }
                    style={
                      btnWarning
                    }
                    onClick={() =>
                      cancelMatch(
                        m.id
                      )
                    }
                  >
                    ⛔ Annuler
                  </button>

                  <button
                    disabled={
                      loadingId ===
                      m.id
                    }
                    style={
                      btnSuccess
                    }
                    onClick={() =>
                      finishMatch(
                        m.id
                      )
                    }
                  >
                    🏁 Terminer
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* MATCH STATE MODAL */}

      {selectedMatch && (
        <div style={modalOverlay}>
          <div style={modal}>
            <h2>
              📡 État Match #
              {
                selectedMatch.id
              }
            </h2>

            {loadingState ? (
              <p>
                Chargement...
              </p>
            ) : (
              <pre
                style={
                  stateBox
                }
              >
                {JSON.stringify(
                  matchState,
                  null,
                  2
                )}
              </pre>
            )}

            <button
              style={
                btnDanger
              }
              onClick={() => {
                setSelectedMatch(
                  null
                );

                setMatchState(
                  null
                );
              }}
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ======================================================
// STYLES
// ======================================================

const container = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const card = {
  background: "#1e293b",
  padding: 15,
  borderRadius: 12,
  color: "#e2e8f0",
  boxShadow:
    "0 4px 10px rgba(0,0,0,0.25)",
};

const header = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  marginBottom: 10,
};

const subText = {
  fontSize: 12,
};

const players = {
  display: "flex",
  gap: 8,
  fontWeight: "bold",
};

const actions = {
  display: "flex",
  gap: 10,
  marginTop: 10,
  flexWrap: "wrap",
};

const btnBase = {
  border: "none",
  padding: "8px 12px",
  borderRadius: 8,
  color: "white",
  cursor: "pointer",
  fontWeight: "bold",
};

const btnPrimary = {
  ...btnBase,
  background: "#0ea5e9",
};

const btnInfo = {
  ...btnBase,
  background: "#6366f1",
};

const btnWarning = {
  ...btnBase,
  background: "#f59e0b",
};

const btnSuccess = {
  ...btnBase,
  background: "#22c55e",
};

const btnDanger = {
  ...btnBase,
  background: "#ef4444",
};

const modalOverlay = {
  position: "fixed",
  inset: 0,
  background:
    "rgba(0,0,0,0.7)",
  display: "flex",
  justifyContent:
    "center",
  alignItems: "center",
  zIndex: 9999,
};

const modal = {
  width: "90%",
  maxWidth: 700,
  background: "#0f172a",
  padding: 20,
  borderRadius: 12,
  color: "white",
};

const stateBox = {
  background: "#020617",
  padding: 15,
  borderRadius: 10,
  overflow: "auto",
  maxHeight: 400,
  fontSize: 13,
};
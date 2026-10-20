
import axios from "axios";

const API =
  import.meta.env.VITE_API_URL ||
  "https://backend-ad3t.onrender.com/api";

const api = axios.create({
  baseURL: API,
  headers: {
    "Content-Type": "application/json",
  },
});

// ======================================================
// AUTHENTIFICATION
// ======================================================

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// ======================================================
// NORMALISATION DU JEU
// ======================================================

const normalizeGame = (game) => {
  const value = String(game || "")
    .trim()
    .toLowerCase();

  const aliases = {
    dames: "dames",
    dame: "dames",
    checkers: "checkers",
    "jeu de dames": "dames",
    football: "football",
    bravman: "bravman",
    ludo: "ludo",
  };

  return aliases[value] || "";
};

const validateMatch = (id, game) => {
  const matchId = String(id ?? "").trim();
  const normalizedGame = normalizeGame(game);

  if (!/^\d+$/.test(matchId) || Number(matchId) <= 0) {
    throw new Error("ID du match invalide.");
  }

  if (!normalizedGame) {
    throw new Error(
      "Jeu obligatoire : dames, checkers, football, bravman ou ludo."
    );
  }

  return {
    id: matchId,
    game: normalizedGame,
  };
};

// ======================================================
// SERVICE ADMIN
// ======================================================

const adminService = {
  getStats: () =>
    api.get("/admin/stats").then((r) => r.data),

  getTransactions: () =>
    api.get("/admin/transactions").then((r) => r.data),

  getMatches: () =>
    api.get("/admin/matches").then((r) => r.data),

  getMessages: () =>
    api.get("/admin/messages").then((r) => r.data),

  approveTx: (id, reference) =>
    api.post("/admin/validate", {
      transactionId: id,
      reference,
    }),

  rejectTx: (id, reason) =>
    api.post("/admin/reject", {
      transactionId: id,
      reason,
    }),

  // Annuler un match : le backend exige ID + jeu.
  cancelMatch: (id, game) => {
    const match = validateMatch(id, game);

    return api.post(
      `/admin/match/${match.id}/cancel`,
      { game: match.game }
    );
  },

  // Terminer un match : transmet également le jeu.
  finishMatch: (id, game) => {
    const match = validateMatch(id, game);

    return api.post(
      `/admin/match/${match.id}/force-finish`,
      { game: match.game }
    );
  },

  // Récupérer l'état d'un match : le jeu est envoyé en query.
  getMatchState: (id, game) => {
    const match = validateMatch(id, game);

    return api.get(
      `/admin/match/${match.id}/state`,
      {
        params: {
          game: match.game,
        },
      }
    );
  },
};

export default adminService;

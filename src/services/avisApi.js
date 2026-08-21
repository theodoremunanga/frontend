// ==========================================================
// AVIS API
// ==========================================================
//
// API centrale des avis de 6BetBall.
//
// Utilisée par :
// - Avis.jsx
// - les formulaires d'avis généraux
// - les écrans de fin de match
// - les jeux (Dames, BraVMan, etc.)
//
// Le backend est monté sur /api/avis.
// Le service api ajoute déjà /api selon sa configuration.
// ==========================================================

import api from "../services/api";


// ==========================================================
// NORMALISER LE JEU
// ==========================================================

const normalizeGame = (game) => {

  if (!game) {
    return null;
  }

  return String(game)
    .trim()
    .toLowerCase();
};


// ==========================================================
// CRÉER UN AVIS
// ==========================================================
//
// POST /api/avis
//
// Body :
//
// {
//   game: "dames",
//   matchId: 61,
//   rating: 5,
//   comment: "Très bonne partie",
//   context: "match"
// }
//
// context :
// - "match"
// - "general"
// ==========================================================

export const createAvis = async ({
  game,
  matchId = null,
  rating,
  comment = null,
  context = "general",
}) => {

  const payload = {

    game:
      normalizeGame(game),

    matchId:
      matchId === null ||
      matchId === undefined ||
      matchId === ""
        ? null
        : Number(matchId),

    rating:
      Number(rating),

    comment:
      comment === null ||
      comment === undefined
        ? null
        : String(comment).trim(),

    context:
      context || "general",

  };


  const response =
    await api.post(
      "/avis",
      payload
    );


  return response.data;
};


// ==========================================================
// RÉCUPÉRER LES AVIS
// ==========================================================
//
// GET /api/avis
//
// Exemples :
//
// /api/avis
// /api/avis?game=dames
// /api/avis?game=bravman
// /api/avis?matchId=61
// /api/avis?page=1&limit=20
//
// Retour backend :
//
// {
//   success,
//   avis,
//   pagination
// }
// ==========================================================

export const getAvis = async ({
  game = null,
  matchId = null,
  status = "published",
  page = 1,
  limit = 20,
} = {}) => {

  const params = {

    page:
      Math.max(
        Number(page) || 1,
        1
      ),

    limit:
      Math.min(
        Math.max(
          Number(limit) || 20,
          1
        ),
        100
      ),

    status,

  };


  if (game) {

    params.game =
      normalizeGame(game);

  }


  if (
    matchId !== null &&
    matchId !== undefined &&
    matchId !== ""
  ) {

    params.matchId =
      Number(matchId);

  }


  const response =
    await api.get(
      "/avis",
      {
        params,
      }
    );


  return response.data;
};


// ==========================================================
// RÉCUPÉRER UN AVIS PAR ID
// ==========================================================
//
// GET /api/avis/:id
// ==========================================================

export const getAvisById = async (
  id
) => {

  if (!id) {

    throw new Error(
      "Identifiant d'avis requis."
    );

  }


  const response =
    await api.get(
      `/avis/${id}`
    );


  return response.data;
};


// ==========================================================
// STATISTIQUES D'UN JEU
// ==========================================================
//
// GET /api/avis/game/:game/stats
//
// Exemple :
//
// /api/avis/game/dames/stats
//
// Retour :
//
// {
//   success,
//   game,
//   stats
// }
// ==========================================================

export const getAvisStats = async (
  game
) => {

  const normalizedGame =
    normalizeGame(game);


  if (!normalizedGame) {

    throw new Error(
      "Jeu requis pour récupérer les statistiques."
    );

  }


  const response =
    await api.get(
      `/avis/game/${encodeURIComponent(
        normalizedGame
      )}/stats`
    );


  return response.data;
};


// ==========================================================
// MODIFIER UN AVIS
// ==========================================================
//
// PUT /api/avis/:id
//
// Body :
//
// {
//   rating: 4,
//   comment: "Nouvelle impression"
// }
// ==========================================================

export const updateAvis = async ({
  id,
  rating,
  comment = null,
}) => {

  if (!id) {

    throw new Error(
      "Identifiant d'avis requis."
    );

  }


  const response =
    await api.put(
      `/avis/${id}`,
      {

        rating:
          Number(rating),

        comment:
          comment === null ||
          comment === undefined
            ? null
            : String(comment).trim(),

      }
    );


  return response.data;
};


// ==========================================================
// SUPPRIMER UN AVIS
// ==========================================================
//
// DELETE /api/avis/:id
//
// Le backend exige auth + isAdmin.
// ==========================================================

export const deleteAvis = async (
  id
) => {

  if (!id) {

    throw new Error(
      "Identifiant d'avis requis."
    );

  }


  const response =
    await api.delete(
      `/avis/${id}`
    );


  return response.data;
};


// ==========================================================
// MARQUER / RETIRER "UTILE"
// ==========================================================
//
// POST /api/avis/:id/useful
//
// Le même endpoint :
// - ajoute le vote si absent
// - retire le vote s'il existe
// ==========================================================

export const toggleAvisUseful = async (
  id
) => {

  if (!id) {

    throw new Error(
      "Identifiant d'avis requis."
    );

  }


  const response =
    await api.post(
      `/avis/${id}/useful`
    );


  return response.data;
};


// ==========================================================
// VÉRIFIER SI UN AVIS EST UTILE
// ==========================================================
//
// GET /api/avis/:id/useful
// ==========================================================

export const isAvisUseful = async (
  id
) => {

  if (!id) {

    throw new Error(
      "Identifiant d'avis requis."
    );

  }


  const response =
    await api.get(
      `/avis/${id}/useful`
    );


  return response.data;
};


// ==========================================================
// AVIS D'UNE PARTIE
// ==========================================================
//
// Raccourci pratique pour les écrans de match.
// ==========================================================

export const getAvisByMatch = async ({
  matchId,
  page = 1,
  limit = 20,
} = {}) => {

  if (
    matchId === null ||
    matchId === undefined ||
    matchId === ""
  ) {

    throw new Error(
      "Identifiant de partie requis."
    );

  }


  return getAvis({

    matchId,

    page,

    limit,

  });
};


// ==========================================================
// AVIS D'UN JEU
// ==========================================================
//
// Raccourci utilisé notamment par Avis.jsx.
// ==========================================================

export const getAvisByGame = async ({
  game,
  page = 1,
  limit = 20,
} = {}) => {

  if (!game) {

    throw new Error(
      "Jeu requis."
    );

  }


  return getAvis({

    game,

    page,

    limit,

  });
};


// ==========================================================
// EXPORT PAR DÉFAUT
// ==========================================================
//
// Permet éventuellement :
//
// import avisApi from "./avisApi";
//
// avisApi.createAvis(...)
// ==========================================================

const avisApi = {

  createAvis,

  getAvis,

  getAvisById,

  getAvisStats,

  updateAvis,

  deleteAvis,

  toggleAvisUseful,

  isAvisUseful,

  getAvisByMatch,

  getAvisByGame,

};


export default avisApi;
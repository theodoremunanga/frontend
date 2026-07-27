import api from "../../services/api";

/**
 * ======================================
 * CREER UN MATCH FOOTBALL
 * POST /football/create
 * ======================================
 */
export const createFootballMatch = async (data) => {
  const response = await api.post(
    "/football/create",
    data
  );

  return response.data;
};


/**
 * ======================================
 * REJOINDRE UN MATCH FOOTBALL
 * POST /football/join
 * ======================================
 */
export const joinFootballMatch = async (matchId) => {
  const response = await api.post(
    "/football/join",
    {
      matchId,
    }
  );

  return response.data;
};


/**
 * ======================================
 * MATCHS FOOTBALL DISPONIBLES
 * GET /football/open
 * ======================================
 */
export const getOpenFootballMatches = async () => {
  const response = await api.get(
    "/football/open"
  );

  return response.data;
};


/**
 * ======================================
 * MES MATCHS FOOTBALL ACTIFS
 * GET /football/my-active
 * ======================================
 */
export const getMyActiveFootballMatches = async () => {
  const response = await api.get(
    "/football/my-active"
  );

  return response.data;
};


/**
 * ======================================
 * LISTE DE TOUS LES MATCHS FOOTBALL
 * GET /football/matches
 * ======================================
 */
export const getFootballMatches = async () => {
  const response = await api.get(
    "/football/matches"
  );

  return response.data;
};


/**
 * ======================================
 * DETAIL D'UN MATCH FOOTBALL
 * GET /football/matches/:id
 * ======================================
 */
export const getFootballMatch = async (matchId) => {
  const response = await api.get(
    `/football/matches/${matchId}`
  );

  return response.data;
};


/**
 * ======================================
 * DEMARRER UN MATCH FOOTBALL
 * POST /football/matches/:id/start
 * ======================================
 */
export const startFootballMatch = async (matchId) => {
  const response = await api.post(
    `/football/matches/${matchId}/start`
  );

  return response.data;
};


/**
 * ======================================
 * METTRE EN PAUSE UN MATCH FOOTBALL
 * POST /football/matches/:id/pause
 * ======================================
 */
export const pauseFootballMatch = async (matchId) => {
  const response = await api.post(
    `/football/matches/${matchId}/pause`
  );

  return response.data;
};


/**
 * ======================================
 * REPRENDRE UN MATCH FOOTBALL
 * POST /football/matches/:id/resume
 * ======================================
 */
export const resumeFootballMatch = async (matchId) => {
  const response = await api.post(
    `/football/matches/${matchId}/resume`
  );

  return response.data;
};

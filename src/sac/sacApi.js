// frontend/src/sac/sacApi.js

import api from "../services/api";


// ==========================================================
// CREATE MATCH SAC
// ==========================================================

export const createSacMatch = async ({
    game,
    stake
}) => {

    const response = await api.post(
        "/sac/matches",
        {
            game,
            stake
        }
    );

    return response.data;
};


// ==========================================================
// JOIN MATCH SAC
// ==========================================================

export const joinSacMatch = async ({
    game,
    matchId
}) => {

    const response = await api.post(
        `/sac/matches/${Number(matchId)}/join`,
        {
            game
        }
    );

    return response.data;
};


// ==========================================================
// GET MATCH SAC
// ==========================================================

export const getSacMatch = async (
    matchId
) => {

    const response = await api.get(
        `/sac/matches/${Number(matchId)}`
    );

    return response.data;
};


// ==========================================================
// LIST MATCHES SAC
// ==========================================================

export const getSacMatches = async (
    game
) => {

    const response = await api.get(
        "/sac/matches",
        {
            params: {
                game
            }
        }
    );

    return response.data;
};


// ==========================================================
// CLASSEMENT BRAVMAN
// ==========================================================

export const getBravmanRanking = async () => {

    const response = await api.get(
        "/bravman/ranking"
    );

    return response.data;
};
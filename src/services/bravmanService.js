import api from "./api";


// ======================================================
// CREATE MATCH
// ======================================================

export const createMatch = async (stake) => {

    const response = await api.post(
        "/bravman/create",
        {
            stake,
        }
    );

    return response.data;
};


// ======================================================
// JOIN MATCH
// ======================================================

export const joinMatch = async (matchId) => {

    const response = await api.post(
        `/bravman/join/${matchId}`
    );

    return response.data;
};


// ======================================================
// GET OPEN MATCHES
// ======================================================

export const getOpenMatches = async () => {

    const response = await api.get(
        "/bravman/open"
    );

    return response.data;
};


// ======================================================
// GET MY ACTIVE MATCH
// ======================================================

export const getMyActiveMatch = async () => {

    const response = await api.get(
        "/bravman/my-active"
    );

    return response.data;
};


// ======================================================
// GET MATCH DETAILS
// ======================================================

export const getMatch = async (matchId) => {

    const response = await api.get(
        `/bravman/${matchId}`
    );

    return response.data;
};


// ======================================================
// CANCEL MATCH
// ======================================================

export const cancelMatch = async (matchId) => {

    const response = await api.post(
        `/bravman/cancel/${matchId}`
    );

    return response.data;
};


// ======================================================
// GET HISTORY
// ======================================================

export const getHistory = async () => {

    const response = await api.get(
        "/bravman/history"
    );

    return response.data;
};


// ======================================================
// EXPORT
// ======================================================

const bravmanService = {

    createMatch,
    joinMatch,
    getOpenMatches,
    getMyActiveMatch,
    getMatch,
    cancelMatch,
    getHistory,

};

export default bravmanService;

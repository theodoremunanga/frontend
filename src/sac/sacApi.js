// frontend/src/sac/sacApi.js


import api from "../services/api";


// ==========================================
// CREATE MATCH SAC
// ==========================================

export const createSacMatch = async ({
    game,
    stake
}) => {


    const response =
        await api.post(
            "/sac/matches",
            {
                game,
                stake
            }
        );


    return response.data;

};




// ==========================================
// JOIN MATCH SAC
// ==========================================

export const joinSacMatch = async ({
    game,
    matchId
}) => {


    const response =
        await api.post(
            `/sac/matches/${matchId}/join`,
            {
                game
            }
        );


    return response.data;

};




// ==========================================
// GET MATCH
// ==========================================

export const getSacMatch = async (
    matchId
)=>{


    const response =
        await api.get(
            `/sac/matches/${matchId}`
        );


    return response.data;


};




// ==========================================
// LIST MATCHES
// ==========================================

export const getSacMatches = async (
    game
)=>{


    const response =
        await api.get(
            `/sac/matches?game=${game}`
        );


    return response.data;


};

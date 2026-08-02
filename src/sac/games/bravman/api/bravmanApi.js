// frontend/src/games/bravman/api/bravmanApi.js


import {
    createSacMatch,
    joinSacMatch,
    getSacMatches,
    getSacMatch
} from "../../../../sac/sacApi";



// ==========================================
// CREATE BRAVMAN
// ==========================================

export const createBravmanMatch = async (
    stake
)=>{


    return await createSacMatch({

        game:
            "bravman",

        stake

    });


};




// ==========================================
// JOIN BRAVMAN
// ==========================================

export const joinBravmanMatch = async (
    matchId
)=>{


    return await joinSacMatch({

        game:
            "bravman",

        matchId

    });


};




// ==========================================
// OPEN MATCHES
// ==========================================

export const getOpenBravmanMatches =
async ()=>{


    return await getSacMatches(
        "bravman"
    );


};




// ==========================================
// DETAILS
// ==========================================

export const getBravmanMatch =
async (
    id
)=>{


    return await getSacMatch(
        id
    );


};
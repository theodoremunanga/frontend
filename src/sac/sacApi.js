
import api from "../services/api";

// ==========================================================
// MODES SAC / LUDO
// ==========================================================

export const SAC_MODES = Object.freeze({
    USER: "user",
    ANDROID: "android",
    TRAINING: "training",
});

const normalizeMode = (mode = SAC_MODES.USER) => {
    const value = String(mode).trim().toLowerCase();

    if (value === "ai") return SAC_MODES.ANDROID;

    if (Object.values(SAC_MODES).includes(value)) {
        return value;
    }

    throw new Error(`Mode SAC invalide : ${mode}`);
};

// ==========================================================
// CREATE MATCH SAC
// ==========================================================


export const createSacMatch = async ({
    game,
    stake,
    mode = SAC_MODES.USER,
}) => {
    const amount = Number(stake);

    if (
        !Number.isFinite(amount) ||
        amount < 0 ||
        (mode !== SAC_MODES.TRAINING && amount <= 0) ||
        (mode === SAC_MODES.TRAINING && amount !== 0)
    ) {
        throw new Error(
            mode === SAC_MODES.TRAINING
                ? "Le mode entraînement ne nécessite aucune mise."
                : "Une mise valide supérieure à zéro est obligatoire."
        );
    }

    const normalizedMode = normalizeMode(mode);

    const response = await api.post("/sac/matches", {
        game,
        mode: normalizedMode,
        stake: amount,
        bet_amount: amount,
    });

    return response.data;
};


// ==========================================================
// JOIN MATCH SAC
// ==========================================================

export const joinSacMatch = async ({
    game,
    matchId,
    mode,
}) => {
    const payload = { game };

    // Le mode est facultatif lors de la jonction.
    if (mode !== undefined && mode !== null) {
        payload.mode = normalizeMode(mode);
    }

    const response = await api.post(
        `/sac/matches/${Number(matchId)}/join`,
        payload
    );

    return response.data;
};

// ==========================================================
// GET MATCH SAC
// ==========================================================

export const getSacMatch = async (matchId) => {
    const response = await api.get(
        `/sac/matches/${Number(matchId)}`
    );

    console.log("♟️ SAC GET MATCH RAW:", response.data);

    return response.data;
};

// ==========================================================
// LIST MATCHES SAC
// ==========================================================

export const getSacMatches = async (game, mode) => {
    const params = { game };

    if (mode !== undefined && mode !== null) {
        params.mode = normalizeMode(mode);
    }

    const response = await api.get("/sac/matches", {
        params,
    });

    return response.data;
};

// ==========================================================
// CLASSEMENT BRAVMAN
// ==========================================================

export const getBravmanRanking = async () => {
    const response = await api.get("/bravman/ranking");
    return response.data;
};

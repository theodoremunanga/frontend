'use strict';

/**
 * ============================================================
 * CASINO API SERVICE — 6BetBall
 * ============================================================
 *
 * Contrat backend :
 *
 * POST /api/gamewin/create
 * GET  /api/gamewin/:roundId
 * POST /api/gamewin/:roundId/spin
 * POST /api/gamewin/:roundId/cancel
 *
 * Le serveur reste l'autorité absolue du résultat.
 */

// ============================================================
// CONFIG
// ============================================================

const API_BASE_URL =
    import.meta.env.VITE_API_URL || '';

const GAMEWIN_BASE_URL =
    `${API_BASE_URL}/gamewin`;


// ============================================================
// TOKEN
// ============================================================

function getAuthToken() {

    return (
        localStorage.getItem(
            'token'
        ) ||

        localStorage.getItem(
            'accessToken'
        ) ||

        localStorage.getItem(
            'authToken'
        ) ||

        null
    );
}


// ============================================================
// HEADERS
// ============================================================

function getHeaders() {

    const headers = {
        'Content-Type':
            'application/json'
    };

    const token =
        getAuthToken();

    if (token) {
        headers.Authorization =
            `Bearer ${token}`;
    }

    return headers;
}


// ============================================================
// RESPONSE
// ============================================================

async function parseResponse(
    response
) {

    let data = null;

    try {
        data =
            await response.json();

    } catch {
        data = null;
    }


    if (!response.ok) {

        const message =
            data?.message ||
            data?.error ||
            `Erreur serveur (${response.status})`;

        const error =
            new Error(message);

        error.status =
            response.status;

        error.data =
            data;

        throw error;
    }


    return data;
}


// ============================================================
// CREATE
// ============================================================

export async function createCasinoGame({
    stake,
    idempotencyKey
}) {

    const response =
        await fetch(
            `${GAMEWIN_BASE_URL}/create`,
            {
                method: 'POST',

                headers:
                    getHeaders(),

                credentials:
                    'include',

                body:
                    JSON.stringify({
                        stake,
                        idempotencyKey
                    })
            }
        );


    return parseResponse(
        response
    );
}


// ============================================================
// GET
// ============================================================

export async function getCasinoGame(
    roundId
) {

    if (!roundId) {
        throw new Error(
            'roundId obligatoire'
        );
    }


    const response =
        await fetch(
            `${GAMEWIN_BASE_URL}/${encodeURIComponent(
                roundId
            )}`,
            {
                method: 'GET',

                headers:
                    getHeaders(),

                credentials:
                    'include'
            }
        );


    return parseResponse(
        response
    );
}


// ============================================================
// SPIN
// ============================================================

export async function spinCasinoGame(
    roundId
) {

    if (!roundId) {
        throw new Error(
            'roundId obligatoire'
        );
    }


    const response =
        await fetch(
            `${GAMEWIN_BASE_URL}/${encodeURIComponent(
                roundId
            )}/spin`,
            {
                method: 'POST',

                headers:
                    getHeaders(),

                credentials:
                    'include',

                body:
                    JSON.stringify({})
            }
        );


    return parseResponse(
        response
    );
}


// ============================================================
// CANCEL
// ============================================================

export async function cancelCasinoGame(
    roundId,
    reason = 'USER_CANCELLED'
) {

    if (!roundId) {
        throw new Error(
            'roundId obligatoire'
        );
    }


    const response =
        await fetch(
            `${GAMEWIN_BASE_URL}/${encodeURIComponent(
                roundId
            )}/cancel`,
            {
                method: 'POST',

                headers:
                    getHeaders(),

                credentials:
                    'include',

                body:
                    JSON.stringify({
                        reason
                    })
            }
        );


    return parseResponse(
        response
    );
}


// ============================================================
// EXPORT DEFAULT
// ============================================================

export default {
    createCasinoGame,
    getCasinoGame,
    spinCasinoGame,
    cancelCasinoGame
};
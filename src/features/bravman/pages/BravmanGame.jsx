// src/features/bravman/pages/BravmanGame.jsx

import {
    useEffect,
    useState,
} from "react";

import api from "../../../services/api";

import {
    BravmanProvider,
} from "../context/BravmanContext";

import BravmanArena
    from "../components/arena/BravmanArena";


// ======================================================
// PAGE
// ======================================================

const BravmanGame = ({
    gameConfig,
    resetGame,
}) => {

    const [
        match,
        setMatch,
    ] = useState(null);

    const [
        user,
        setUser,
    ] = useState(null);

    const [
        loading,
        setLoading,
    ] = useState(true);

    const [
        error,
        setError,
    ] = useState(null);


    // ==================================================
    // LOAD MATCH
    // ==================================================

    useEffect(() => {

        const loadMatch = async () => {

            try {

                setLoading(true);

                setError(null);

                // ------------------------------------------
                // MATCH ID
                // ------------------------------------------

                if (!gameConfig?.matchId) {

                    throw new Error(
                        "Match introuvable."
                    );

                }

                // ------------------------------------------
                // USER
                // ------------------------------------------

                // ------------------------------------------
                // AUTH
                // ------------------------------------------

                const token = localStorage.getItem("token");

                    if (!token) {
                        throw new Error("Utilisateur non connecté.");
                    }

                // ------------------------------------------
                // MATCH
                // ------------------------------------------

                const response =
                    await api.get(
                        `/bravman/matches/${gameConfig.matchId}`
                    );

                if (
                    !response.data?.success
                ) {

                    throw new Error(
                        response.data?.message ||
                        "Impossible de charger le match."
                    );

                }

                if (
                    !response.data.match
                ) {

                    throw new Error(
                        "Le match est introuvable."
                    );

                }

                setMatch(
                    response.data.match
                );

                // ------------------------------------------
                // USER FROM MATCH
                // ------------------------------------------

                const storedUser =
                    JSON.parse(
                        localStorage.getItem("user")
                    );

                if (!storedUser?.id) {

                    throw new Error(
                        "Utilisateur non connecté."
                    );

                }

                setUser(storedUser);

            }

            
            catch (err) {

                console.error(
                    "BRAVMAN GAME ERROR:",
                    err
                );
 
                setError(
                    err.response?.data?.message ||
                    err.message
                );

            }
            finally {

                setLoading(false);

            }

        };

        loadMatch();

    }, [gameConfig]);

        // ==================================================
    // LOADING
    // ==================================================

    if (loading) {

        return (

            <div className="bravman-game-loading">

                Chargement du match...

            </div>

        );

    }


    // ==================================================
    // ERROR
    // ==================================================

    if (error) {

        return (

            <div className="bravman-game-loading">

                <h2>
                    {error}
                </h2>

                <button
                    type="button"
                    onClick={resetGame}
                >
                    Retour
                </button>

            </div>

        );

    }


    // ==================================================
    // SECURITY
    // ==================================================

    if (!match || !user) {

        return (

            <div className="bravman-game-loading">

                <h2>

                    Impossible de charger la partie.

                </h2>

                <button
                    type="button"
                    onClick={resetGame}
                >
                    Retour
                </button>

            </div>

        );

    }


    // ==================================================
    // PLAYER SIDE
    // ==================================================

    const playerSide =

        Number(match.creator_id) ===
        Number(user.id)

            ? "creator"

            : "opponent";


    // ==================================================
    // RENDER
    // ==================================================

    return (

        <BravmanProvider

            match={match}

            user={user}

            matchId={match.id}

            userId={user.id}

            playerSide={playerSide}

            autoJoin={true}

        >

            <BravmanArena />

        </BravmanProvider>

    );

};


// ======================================================
// EXPORT
// ======================================================

export default BravmanGame;

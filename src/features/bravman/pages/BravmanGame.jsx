import {
    useEffect,
    useState,
} from "react";

import api from "../../../services/api";

import BravmanProvider from "../context/BravmanContext";
import BravmanArena from "../components/arena/BravmanArena";


const BravmanGame = ({
    gameConfig,
    setPage,
    resetGame,
}) => {

    const [match, setMatch] =
        useState(null);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState(null);


    useEffect(() => {

        const loadMatch =
            async () => {

                try {

                    if (!gameConfig?.matchId) {

                        throw new Error(
                            "Match introuvable."
                        );

                    }

                    const response =
                        await api.get(
                            `/bravman/matches/${gameConfig.matchId}`
                        );

                    const data =
                        response.data;

                    if (!data.success) {

                        throw new Error(
                            data.message ||
                            "Impossible de charger le match."
                        );

                    }

                    if (!data.match) {

                        throw new Error(
                            "Les données du match sont introuvables."
                        );

                    }

                    setMatch(
                        data.match
                    );

                }
                catch (err) {

                    console.error(
                        "❌ BRAVMAN LOAD MATCH ERROR:",
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


    if (loading) {

        return (

            <div className="bravman-game-loading">

                Chargement du match...

            </div>

        );

    }


    if (error) {

        return (

            <div className="bravman-game-loading">

                <h2>
                    {error}
                </h2>

                <button
                    onClick={resetGame}
                >
                    Retour
                </button>

            </div>

        );

    }


    if (!match) {

        return (

            <div className="bravman-game-loading">

                <h2>
                    Match introuvable.
                </h2>

                <button
                    onClick={resetGame}
                >
                    Retour
                </button>

            </div>

        );

    }


    const storedUser =
        localStorage.getItem("user");

    if (!storedUser) {

        return (

            <div className="bravman-game-loading">

                <h2>
                    Utilisateur non connecté.
                </h2>

                <button
                    onClick={resetGame}
                >
                    Retour
                </button>

            </div>

        );

    }


    let user;

    try {

        user =
            JSON.parse(
                storedUser
            );

    }
    catch (err) {

        console.error(
            "❌ USER JSON ERROR:",
            err
        );

        return (

            <div className="bravman-game-loading">

                <h2>
                    Session utilisateur invalide.
                </h2>

                <button
                    onClick={resetGame}
                >
                    Retour
                </button>

            </div>

        );

    }


    if (!user?.id) {

        return (

            <div className="bravman-game-loading">

                <h2>
                    Utilisateur introuvable.
                </h2>

                <button
                    onClick={resetGame}
                >
                    Retour
                </button>

            </div>

        );

    }


    const playerSide =
        Number(match.creator_id) ===
        Number(user.id)
            ? "creator"
            : "opponent";


    return (

        <BravmanProvider
            matchId={match.id}
            userId={user.id}
            playerSide={playerSide}
            autoJoin={true}
        >

            <BravmanArena />

        </BravmanProvider>

    );

};


export default BravmanGame;
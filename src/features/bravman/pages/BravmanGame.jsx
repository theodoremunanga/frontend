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

                    setMatch(
                        data.match
                    );

                }
                catch (err) {

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


    const user =
        JSON.parse(
            localStorage.getItem("user")
        );

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
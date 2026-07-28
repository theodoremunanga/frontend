// src/features/bravman/pages/BravmanLobby.jsx

import {
    useCallback,
    useEffect,
    useState,
} from "react";

import BravmanMatchCard
    from "../components/BravmanMatchCard";

import bravmanSocket
    from "../../../sockets/bravmanSocket";

import api
    from "../../../services/api";


// ------------------------------------------------------
// TODO
// ------------------------------------------------------
// Remplace cette récupération par ton vrai AuthContext.
// ------------------------------------------------------
const getCurrentUserId = () => {

    const token =
        localStorage.getItem("token");

    if (!token) {
        return null;
    }

    return null;
};

const BravmanLobby = ({
    setPage,
    setGameConfig,
}) => {

    const [
        matches,
        setMatches
    ] = useState([]);


    const [
        loading,
        setLoading
    ] = useState(true);


    const [
        error,
        setError
    ] = useState(null);


    const [
        joinedMatch,
        setJoinedMatch
    ] = useState(null);


    const currentUserId =
        getCurrentUserId();


    // ==================================================
    // LOAD OPEN MATCHES
    // ==================================================

    const loadMatches =
        useCallback(
            async () => {

                try {

                    setLoading(true);
                    setError(null);


                    const response =
                        await api.get(
                            "/bravman/open"
                        );


                    const data =
                        response.data;


                    if (!data.success) {

                        throw new Error(
                            data.message ||
                            "Impossible de charger les matchs."
                        );

                    }


                    setMatches(
                        data.matches || []
                    );

                }
                catch (err) {

                    setError(
                        err.response?.data?.message ||
                        err.message ||
                        "Impossible de charger les matchs."
                    );

                }
                finally {

                    setLoading(false);

                }

            },
            []
        );


    useEffect(() => {

        bravmanSocket.connect();

        const remove =
            bravmanSocket.onMatchReady(
                ({ matchId }) => {

                    const match =
                        matches.find(
                            m =>
                                Number(m.id) ===
                                Number(matchId)
                        );

                    if (!match) {
                        return;
                    }

                    launchGame(match);

                }
            );

        return remove;

    }, [matches]);

    const launchGame = (match) => {

        const config = {

            matchId: match.id,

            game: "bravman",

        };

        setGameConfig(config);

        localStorage.setItem(
            "gameConfig",
            JSON.stringify(config)
        );

        setPage("game");

    };


    // ==================================================
    // JOINED
    // ==================================================

    const handleJoined = (match) => {

        setJoinedMatch(match);

        setMatches(previous =>
            previous.filter(
                item =>
                    Number(item.id) !==
                    Number(match.id)
            )
        );

        launchGame(match);

    };


    // ==================================================
    // LOADING
    // ==================================================

    if (loading) {

        return (

            <section className="bravman-lobby">

                <div className="bravman-lobby__loading">

                    <span className="bravman-loader" />

                    <p>
                        Recherche des adversaires...
                    </p>

                </div>

            </section>

        );

    }


    // ==================================================
    // ERROR
    // ==================================================

    if (error) {

        return (

            <section className="bravman-lobby">

                <div className="bravman-lobby__error">

                    <h2>
                        Impossible de charger le lobby
                    </h2>

                    <p>
                        {error}
                    </p>

                    <button
                        type="button"
                        onClick={loadMatches}
                    >
                        Réessayer
                    </button>

                </div>

            </section>

        );

    }


    return (

        <section className="bravman-lobby">


            <header className="bravman-lobby__header">

                <div>

                    <span>
                        ARENA
                    </span>

                    <h1>
                        Trouve ton adversaire
                    </h1>

                    <p>
                        Choisis un défi disponible
                        et prends place à la table.
                    </p>

                </div>


                <button
                    type="button"
                    onClick={loadMatches}
                >
                    Actualiser
                </button>

            </header>


            {joinedMatch && (

                <div className="bravman-lobby__joined">

                    <strong>
                        Tu as rejoint le match !
                    </strong>

                    <span>
                        Match #{joinedMatch.id}
                    </span>

                    <span>
                        Préparation de l'arène...
                    </span>

                </div>

            )}


            {matches.length === 0 && (

                <div className="bravman-lobby__empty">

                    <div>
                        👊
                    </div>

                    <h2>
                        Personne à affronter pour l'instant.
                    </h2>

                    <p>
                        Crée ton propre défi ou
                        actualise le lobby dans quelques instants.
                    </p>

                </div>

            )}


            {matches.length > 0 && (

                <div className="bravman-lobby__grid">

                    {matches.map(
                        match => (

                            <BravmanMatchCard
                                key={match.id}
                                match={match}
                                currentUserId={
                                    currentUserId
                                }
                                onJoined={
                                    handleJoined
                                }
                            />

                        )
                    )}

                </div>

            )}

        </section>

    );

};


export default BravmanLobby;
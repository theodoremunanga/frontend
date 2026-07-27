// src/features/bravman/pages/BravmanLobby.jsx

import {
    useCallback,
    useEffect,
    useState,
} from "react";

import BravmanMatchCard
    from "../components/BravmanMatchCard";

import api
    from "../../../services/api";


// ------------------------------------------------------
// TODO
// ------------------------------------------------------
// Remplace cette récupération par ton vrai AuthContext.
// ------------------------------------------------------

const getCurrentUserId = () => {

    const storedUser =
        localStorage.getItem(
            "user"
        );

    if (!storedUser) {
        return null;
    }

    try {

        const user =
            JSON.parse(
                storedUser
            );

        return user?.id ?? null;

    }
    catch {

        return null;

    }

};


const BravmanLobby = () => {

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

        loadMatches();

    }, [
        loadMatches
    ]);


    // ==================================================
    // JOINED
    // ==================================================

    const handleJoined =
        (match) => {

            setJoinedMatch(
                match
            );

            setMatches(
                previous =>
                    previous.filter(
                        item =>
                            Number(item.id) !==
                            Number(match.id)
                    )
            );

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
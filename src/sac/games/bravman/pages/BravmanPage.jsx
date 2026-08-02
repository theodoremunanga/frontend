// frontend/src/sac/games/bravman/pages/BravmanPage.jsx

import { useEffect } from "react";

import useBravman from "../hooks/useBravman";

import BravmanCard from "../components/BravmanCard";
import BravmanRoom from "../components/BravmanRoom";
import BravmanArena from "../components/BravmanArena";
import BravmanResult from "../components/BravmanResult";

const BravmanPage = () => {

    const {

        // données

        matches,

        match,

        game,

        loading,

        error,

        // actions

        loadMatches,

        createMatch,

        joinMatch,

        connectGame,

        tap

    } = useBravman();



    // ==========================================
    // Chargement initial
    // ==========================================

    useEffect(() => {

        loadMatches();

    }, [loadMatches]);



    // ==========================================
    // Chargement
    // ==========================================

    if (loading) {

        return (

            <div className="bravman-loading">

                Chargement...

            </div>

        );

    }



    // ==========================================
    // Erreur
    // ==========================================

    if (error) {

        return (

            <div className="bravman-error">

                {error}

            </div>

        );

    }

        // ==========================================
    // AUCUN MATCH
    // ==========================================

    if (!match) {

        return (

            <BravmanCard

                matches={matches}

                createMatch={createMatch}

                joinMatch={joinMatch}

            />

        );

    }



    // ==========================================
    // EN ATTENTE / READY / STARTING
    // ==========================================

    if (

        match.status === "WAITING_OPPONENT" ||

        match.status === "READY" ||

        match.status === "STARTING"

    ) {

        return (

            <BravmanRoom

                match={match}

                connectGame={connectGame}

            />

        );

    }



    // ==========================================
    // MATCH EN COURS
    // ==========================================

    if (

        match.status === "RUNNING"

    ) {

        return (

            <BravmanArena

                match={match}

                game={game}

                tap={tap}

            />

        );

    }



    // ==========================================
    // MATCH TERMINÉ
    // ==========================================

    if (

        match.status === "FINISHED"

    ) {

        return (

            <BravmanResult

                match={match}

                game={game}

            />

        );

    }



    // ==========================================
    // CAS INCONNU
    // ==========================================

    return (

        <div
            className="bravman-page"
        >

            <h2>

                État inconnu du match

            </h2>

            <pre>

                {

                    JSON.stringify(

                        match,

                        null,

                        2

                    )

                }

            </pre>

        </div>

    );

};

export default BravmanPage;
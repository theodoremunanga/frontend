// frontend/src/sac/games/bravman/components/BravmanRoom.jsx

import { useEffect } from "react";

// ==========================================
// SALLE D'ATTENTE BRAVMAN
// ==========================================

const BravmanRoom = ({

    match,

    connectGame

}) => {

    // ======================================
    // CONNEXION AU MATCH
    // ======================================

    useEffect(() => {

        if (!match?.id) {

            return;

        }

        connectGame(
            match.id
        );

    }, [

        match,

        connectGame

    ]);



    // ======================================
    // MATCH INTROUVABLE
    // ======================================

    if (!match) {

        return (

            <div className="bravman-room">

                <h2>

                    Match introuvable

                </h2>

            </div>

        );

    }

        // ======================================
    // WAITING OPPONENT
    // ======================================

    if (match.status === "WAITING_OPPONENT") {

        return (

            <div className="bravman-room">

                <h1>
                    💪 BraVMan
                </h1>

                <h2>

                    Défi créé

                </h2>

                <p>

                    Match #{match.id}

                </p>

                <p>

                    Mise : {match.stake} CDF

                </p>

                <p>

                    En attente d'un adversaire...

                </p>

            </div>

        );

    }



    // ======================================
    // READY
    // ======================================

    if (match.status === "READY") {

        return (

            <div className="bravman-room">

                <h1>
                    💪 BraVMan
                </h1>

                <h2>

                    Adversaire trouvé

                </h2>

                <p>

                    Les deux joueurs sont connectés.

                </p>

                <p>

                    Préparation de la partie...

                </p>

            </div>

        );

    }



    // ======================================
    // STARTING
    // ======================================

    if (match.status === "STARTING") {

        return (

            <div className="bravman-room">

                <h1>
                    💪 BraVMan
                </h1>

                <h2>

                    La partie démarre...

                </h2>

                <p>

                    Préparez-vous !

                </p>

                <h1>

                    3...2...1...

                </h1>

            </div>

        );

    }

        // ======================================
    // ÉTAT INCONNU
    // ======================================

    return (

        <div className="bravman-room">

            <h1>

                💪 BraVMan

            </h1>

            <h2>

                État inconnu

            </h2>

            <p>

                Status actuel :

                <strong>

                    {" "}

                    {match.status}

                </strong>

            </p>

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

export default BravmanRoom;
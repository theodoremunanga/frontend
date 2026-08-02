// frontend/src/sac/games/bravman/components/BravmanArena.jsx

import React from "react";

// ==========================================
// ARÈNE BRAVMAN
// ==========================================

const BravmanArena = ({

    match,

    game,

    tap

}) => {

    // ======================================
    // SÉCURITÉ
    // ======================================

    if (!match || !game) {

        return (

            <div className="bravman-arena">

                <h2>

                    Chargement de la partie...

                </h2>

            </div>

        );

    }



    // ======================================
    // DONNÉES DE JEU
    // ======================================

    const creatorTaps =
        game.creatorTaps || 0;

    const opponentTaps =
        game.opponentTaps || 0;

    const remaining =
        game.remaining || 0;

    const status =
        game.status || "running";

        // ======================================
    // AFFICHAGE ARÈNE
    // ======================================

    return (

        <div className="bravman-arena">


            {/* ==============================
                HEADER MATCH
            =============================== */}

            <div className="bravman-header">

                <h2>
                    BraVMan Arena
                </h2>


                <p>
                    Match #{match.id}
                </p>


                <p>
                    Statut : {status}
                </p>


                <p>
                    Temps restant :
                    {" "}
                    {remaining}s
                </p>

            </div>




            {/* ==============================
                COMBAT
            =============================== */}

            <div className="bravman-fight">



                {/* JOUEUR CRÉATEUR */}

                <div className="player creator">


                    <h3>
                        Joueur 1
                    </h3>


                    <div className="score">

                        {creatorTaps}

                    </div>



                    <button

                        disabled={
                            status !== "running"
                        }

                        onClick={() =>
                            tap("creator")
                        }

                    >

                        💪 Pousser

                    </button>


                </div>





                {/* VS */}

                <div className="versus">

                    VS

                </div>





                {/* ADVERSAIRE */}

                <div className="player opponent">


                    <h3>
                        Joueur 2
                    </h3>



                    <div className="score">

                        {opponentTaps}

                    </div>



                    <button


                        disabled={
                            status !== "running"
                        }


                        onClick={() =>
                            tap("opponent")
                        }


                    >

                        💪 Pousser

                    </button>



                </div>


            </div>





            {/* ==============================
                FIN DE PARTIE
            =============================== */}


            {

                status === "finished" && (


                    <div className="bravman-result">


                        <h2>

                            Partie terminée

                        </h2>



                        <p>

                            Score final :

                            {" "}

                            {creatorTaps}

                            {" - "}

                            {opponentTaps}


                        </p>


                    </div>


                )

            }



        </div>

    );


};



export default BravmanArena;
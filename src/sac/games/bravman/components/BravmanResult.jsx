// frontend/src/sac/games/bravman/components/BravmanResult.jsx

import React from "react";


// ==========================================
// RÉSULTAT BRAVMAN
// ==========================================

const BravmanResult = ({

    match,

    game,

    result

}) => {


    // ======================================
    // SÉCURITÉ
    // ======================================

    if (!match || !game) {

        return (

            <div className="bravman-result">

                <h2>
                    Résultat indisponible...
                </h2>

            </div>

        );

    }



    // ======================================
    // DONNÉES DU MATCH
    // ======================================

    const creatorTaps =
        game.creatorTaps || 0;


    const opponentTaps =
        game.opponentTaps || 0;


    const winner =
        result?.winner ||
        game.winner ||
        null;


    const status =
        game.status || "finished";



    // ======================================
    // AFFICHAGE
    // ======================================

    return (

        <div className="bravman-result">


            <div className="result-header">

                <h2>
                    🏆 Résultat BraVMan
                </h2>


                <p>
                    Match #{match.id}
                </p>


                <p>
                    Statut : {status}
                </p>


            </div>





            <div className="final-score">


                <div className="player-score">

                    <h3>
                        Joueur 1
                    </h3>


                    <strong>
                        {creatorTaps}
                    </strong>


                    <span>
                        taps
                    </span>

                </div>




                <div className="separator">

                    -

                </div>




                <div className="player-score">

                    <h3>
                        Joueur 2
                    </h3>


                    <strong>
                        {opponentTaps}
                    </strong>


                    <span>
                        taps
                    </span>


                </div>


            </div>





            {/* ======================================
                AFFICHAGE DU GAGNANT
            ====================================== */}


            <div className="winner-zone">


                {

                    winner ? (

                        <>

                            <h2>
                                🏆 Victoire
                            </h2>


                            <p>
                                Joueur gagnant : {winner}
                            </p>


                        </>


                    ) : (


                        <h2>
                            Résultat en attente...
                        </h2>


                    )

                }


            </div>





            {/* ======================================
                MESSAGE FINAL
            ====================================== */}


            <div className="result-message">


                {

                    creatorTaps === opponentTaps && (

                        <p>
                            🤝 Match nul
                        </p>

                    )

                }





                {

                    creatorTaps > opponentTaps && (

                        <p>
                            Le joueur 1 domine la confrontation.
                        </p>

                    )

                }





                {

                    opponentTaps > creatorTaps && (

                        <p>
                            Le joueur 2 domine la confrontation.
                        </p>

                    )

                }


            </div>





            {/* ======================================
                ACTIONS
            ====================================== */}


            <div className="result-actions">


                <button

                    onClick={() =>
                        window.location.reload()
                    }

                >

                    🔄 Nouvelle partie

                </button>


            </div>



        </div>

    );


};



export default BravmanResult;
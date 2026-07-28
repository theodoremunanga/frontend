// src/features/bravman/pages/BravmanHome.jsx

import { useState } from "react";

import BravmanCreateForm from "../components/BravmanCreateForm";
import BravmanLobby from "./BravmanLobby";

import BravmanWaitingRoom
    from "./BravmanWaitingRoom";


const BravmanHome = ({
    setPage,
    setGameConfig,
}) => {

    const [view, setView] =
        useState("home");


    return (

        <main className="bravman-home">

            {view === "home" && (

                <section className="bravman-home__hero">

                    <div className="bravman-home__content">

                        <span className="bravman-home__eyebrow">
                            BRAVMAN
                        </span>

                        <h1>
                            Le bras de fer
                            <br />
                            nouvelle génération.
                        </h1>

                        <p>
                            Affronte un adversaire en temps réel.
                            Tape le plus vite possible et pousse
                            son bras jusqu'à la victoire.
                        </p>


                        <div className="bravman-home__actions">

                            <button
                                type="button"
                                onClick={() =>
                                    setView("create")
                                }
                            >
                                Créer une partie
                            </button>


                            <button
                                type="button"
                                onClick={() =>
                                    setView("lobby")
                                }
                            >
                                Trouver un adversaire
                            </button>

                        </div>

                    </div>


                    <div className="bravman-home__visual">

                        <div className="bravman-home__table">

                            <div className="bravman-home__player bravman-home__player--left">
                                <span>
                                    PLAYER 1
                                </span>
                            </div>

                            <div className="bravman-home__player bravman-home__player--right">
                                <span>
                                    PLAYER 2
                                </span>
                            </div>

                        </div>

                    </div>

                </section>

            )}


            {view === "create" && (

                <section className="bravman-home__panel">

                    <button
                        type="button"
                        onClick={() =>
                            setView("home")
                        }
                    >
                        ← Retour
                    </button>

                    <BravmanCreateForm
                        setPage={setPage}
                        setGameConfig={setGameConfig}
                    />

                </section>

            )}

            {view === "waiting" && (

                <section className="bravman-home__panel">

                    <BravmanWaitingRoom

                        gameConfig={JSON.parse(
                            localStorage.getItem("gameConfig")
                        )}

                        setPage={setPage}

                        setGameConfig={setGameConfig}

                    />

                </section>

            )}


            {view === "lobby" && (

                <section className="bravman-home__panel">

                    <button
                        type="button"
                        onClick={() =>
                            setView("home")
                        }
                    >
                        ← Retour
                    </button>

                    <BravmanLobby
                        setPage={setPage}
                        setGameConfig={setGameConfig}
                    />

                </section>

            )}

        </main>

    );

};


export default BravmanHome;
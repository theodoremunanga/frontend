import React, { useMemo } from "react";

import BravmanFighter
    from "../../components/arena/BravmanFighter";

import BravmanArm
    from "../../components/arena/BravmanArm";

import BravmanTable
    from "../../components/arena/BravmanTable";

import BravmanAudience
    from "../../components/arena/BravmanAudience";

import BravmanTapButton
    from "../../components/arena/BravmanTapButton";

import "../../../../styles/bravman/BravmanArena.css";
import "../../../../styles/bravman/BravmanFighter.css";


const BravmanArena = ({
    match,
    player,
    opponent,
    creatorTaps = 0,
    opponentTaps = 0,
    remaining = 0,
    status,
    countdown,
    onTap,
}) => {


    /*
     * ================================
     * IDENTIFICATION DU CÔTÉ
     * ================================
     */

    const isCreator =
        Number(player?.id) ===
        Number(match?.creator_id);


    const myTaps =
        isCreator
            ? creatorTaps
            : opponentTaps;


    const enemyTaps =
        isCreator
            ? opponentTaps
            : creatorTaps;


    /*
     * ================================
     * AVANTAGE
     * ================================
     */

    const advantage =
        useMemo(() => {

            const total =
                myTaps + enemyTaps;

            if (!total) {
                return 50;
            }

            return (
                myTaps /
                total
            ) * 100;

        }, [
            myTaps,
            enemyTaps
        ]);


    /*
     * ================================
     * ROTATION DU BRAS
     * ================================
     */

    const armRotation =
        useMemo(() => {

            const normalized =
                Math.max(
                    -1,
                    Math.min(
                        1,
                        (advantage - 50) / 50
                    )
                );

            return normalized * 42;

        }, [advantage]);


    return (

        <main className="bravman-arena">


            {/* ================= HEADER ================= */}

            <header className="bravman-header">

                <div className="bravman-header__brand">

                    <span>
                        BRAVMAN
                    </span>

                    <small>
                        ARM WRESTLING ARENA
                    </small>

                </div>


                <div className="bravman-header__timer">

                    <small>
                        TEMPS
                    </small>

                    <strong>
                        00:
                        {String(
                            remaining
                        ).padStart(
                            2,
                            "0"
                        )}
                    </strong>

                </div>


                <div className="bravman-header__score">

                    <div>

                        <span>
                            {creatorTaps}
                        </span>

                        <small>
                            {match?.creator_id === player?.id
                                ? "VOUS"
                                : "ADVERSAIRE"}
                        </small>

                    </div>


                    <b>
                        VS
                    </b>


                    <div>

                        <span>
                            {opponentTaps}
                        </span>

                        <small>
                            {match?.opponent_id === player?.id
                                ? "VOUS"
                                : "ADVERSAIRE"}
                        </small>

                    </div>

                </div>

            </header>


            {/* ================= ARENA ================= */}

            <section className="bravman-arena__fighters">


                <BravmanFighter

                    side="left"

                    name={
                        isCreator
                            ? player?.username
                            : opponent?.username
                    }

                    taps={
                        creatorTaps
                    }

                    image={
                        isCreator
                            ? player?.avatar
                            : opponent?.avatar
                    }

                />


                <BravmanTable />


                <BravmanFighter

                    side="right"

                    name={
                        isCreator
                            ? opponent?.username
                            : player?.username
                    }

                    taps={
                        opponentTaps
                    }

                    image={
                        isCreator
                            ? opponent?.avatar
                            : player?.avatar
                    }

                />


                <BravmanArm
                    rotation={
                        armRotation
                    }

                />

            </section>


            {/* ================= PUBLIC ================= */}

            <BravmanAudience />


            {/* ================= TAP ================= */}

            <BravmanTapButton

                disabled={
                    status !== "playing"
                }

                onTap={
                    onTap
                }

            />


            {/* ================= COUNTDOWN ================= */}

            {status === "countdown" && (

                <div className="bravman-countdown">

                    <span>
                        PRÉPAREZ-VOUS
                    </span>

                    <strong>
                        {countdown}
                    </strong>

                </div>

            )}

        </main>

    );

};


export default BravmanArena;
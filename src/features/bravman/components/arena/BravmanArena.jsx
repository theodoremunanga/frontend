// src/features/bravman/components/arena/BravmanArena.jsx

import {
    useMemo,
} from "react";

import {
    useBravmanContext,
} from "../../context/BravmanContext";

import BravmanFighter
    from "./BravmanFighter";

import BravmanArm
    from "./BravmanArm";

import BravmanTable
    from "./BravmanTable";

import BravmanAudience
    from "./BravmanAudience";

import BravmanTapButton
    from "./BravmanTapButton";

import "../../../../styles/bravman/BravmanArena.css";
import "../../../../styles/bravman/BravmanFighter.css";


// ======================================================
// COMPONENT
// ======================================================

const BravmanArena = () => {

    // ==================================================
    // CONTEXT
    // ==================================================

    const {

        match,

        user,

        playerSide,

        status,

        countdown,

        remaining,

        creatorTaps,

        opponentTaps,

        tap,

    } = useBravmanContext();


    // ==================================================
    // SECURITY
    // ==================================================

    if (!match || !user) {

        return null;

    }


    // ==================================================
    // PLAYER SIDE
    // ==================================================

    const isCreator =
        playerSide === "creator";


    // ==================================================
    // MY SCORE
    // ==================================================

    const myTaps =
        isCreator
            ? creatorTaps
            : opponentTaps;


    const enemyTaps =
        isCreator
            ? opponentTaps
            : creatorTaps;


    // ==================================================
    // ARM ADVANTAGE
    // ==================================================

    const advantage =
        useMemo(() => {

            const total =
                myTaps +
                enemyTaps;

            if (total <= 0) {

                return 50;

            }

            return (
                myTaps /
                total
            ) * 100;

        }, [

            myTaps,

            enemyTaps,

        ]);


    // ==================================================
    // ARM ROTATION
    // ==================================================

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

        }, [

            advantage,

        ]);
            // ==================================================
    // RENDER
    // ==================================================

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

                            {isCreator
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

                            {isCreator
                                ? "ADVERSAIRE"
                                : "VOUS"}

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
                            ? `Joueur #${match.creator_id}`
                            : `Joueur #${match.opponent_id}`
                    }

                    taps={
                        creatorTaps
                    }

                />

                <BravmanTable />

                <BravmanFighter

                    side="right"

                    name={
                        isCreator
                            ? `Joueur #${match.opponent_id}`
                            : `Joueur #${match.creator_id}`
                    }

                    taps={
                        opponentTaps
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


            {/* ================= ACTION ================= */}

            <BravmanTapButton

                disabled={
                    status !== "playing"
                }

                onTap={
                    tap
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
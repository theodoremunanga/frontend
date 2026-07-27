// src/features/bravman/components/arena/BravmanFighter.jsx

import BravmanArm from "./BravmanArm";


const BravmanFighter = ({
    side,
    taps,
    isCurrentPlayer,
    advantagePercent,
}) => {

    const isCreator =
        side === "creator";


    return (

        <div
            className={[
                "bravman-fighter",
                isCreator
                    ? "bravman-fighter--creator"
                    : "bravman-fighter--opponent",
                isCurrentPlayer
                    ? "bravman-fighter--me"
                    : "",
            ].join(" ")}
        >

            <div className="bravman-fighter__body">

                <div className="bravman-fighter__head" />

                <div className="bravman-fighter__torso">

                    <span className="bravman-fighter__singlet">
                        BRAVMAN
                    </span>

                </div>

            </div>


            <div className="bravman-fighter__identity">

                <strong>
                    {isCreator
                        ? "CHALLENGER"
                        : "ADVERSAIRE"
                    }
                </strong>

                {isCurrentPlayer && (
                    <span>
                        VOUS
                    </span>
                )}

            </div>


            <BravmanArm
                side={side}
                advantagePercent={
                    advantagePercent
                }
            />


            <div className="bravman-fighter__taps">
                {taps}
            </div>

        </div>

    );

};


export default BravmanFighter;
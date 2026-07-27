import React from "react";

const BravmanFighter = ({
    side = "left",
    name = "Joueur",
    taps = 0,
    image,
    isWinner = false,
    isLoser = false,
}) => {

    const className = [
        "bravman-fighter",
        `bravman-fighter--${side}`,
        isWinner ? "bravman-fighter--winner" : "",
        isLoser ? "bravman-fighter--loser" : "",
    ]
        .filter(Boolean)
        .join(" ");

    return (

        <div className={className}>

            {/* IDENTITÉ */}

            <div className="bravman-fighter__identity">

                <span className="bravman-fighter__role">
                    {side === "left"
                        ? "CHALLENGER"
                        : "ADVERSAIRE"}
                </span>

                <strong>
                    {name}
                </strong>

                <span className="bravman-fighter__score">
                    {taps}
                </span>

            </div>


            {/* COMBATTANT */}

            <div className="bravman-fighter__visual">

                <img
                    src={image}
                    alt={name}
                    draggable="false"
                />

            </div>

        </div>

    );
};

export default BravmanFighter;
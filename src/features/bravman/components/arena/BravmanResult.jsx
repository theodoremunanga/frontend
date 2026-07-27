// src/features/bravman/components/arena/BravmanResult.jsx

const BravmanResult = ({
    winner,
    loser,
    draw,
    result,
}) => {

    let title =
        "MATCH TERMINÉ";

    let subtitle =
        "Le combat est terminé.";


    if (winner) {

        title =
            "VICTOIRE !";

        subtitle =
            "Tu as remporté le bras de fer.";

    }
    else if (loser) {

        title =
            "DÉFAITE";

        subtitle =
            "Ton adversaire a pris l'avantage.";

    }
    else if (draw) {

        title =
            "ÉGALITÉ";

        subtitle =
            "Les deux combattants sont à égalité.";

    }


    return (

        <div className="bravman-result">

            <div className="bravman-result__panel">

                <span>
                    BRAVMAN
                </span>

                <h2>
                    {title}
                </h2>

                <p>
                    {subtitle}
                </p>


                {result && (
                    <div className="bravman-result__details">
                        Match terminé
                    </div>
                )}


                <button
                    type="button"
                    onClick={() => {
                        window.location.href =
                            "/bravman";
                    }}
                >
                    Retour à l'arène
                </button>

            </div>

        </div>

    );

};


export default BravmanResult;
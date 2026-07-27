// src/features/bravman/components/BravmanMatchCard.jsx

import {
    useState
} from "react";

import api from "../../../services/api";


const BravmanMatchCard = ({
    match,
    currentUserId,
    onJoined,
}) => {

    const [loading, setLoading] =
        useState(false);

    const [error, setError] =
        useState(null);


    if (!match) {
        return null;
    }


    const handleJoin = async () => {

        setError(null);


        if (
            Number(match.creator_id) ===
            Number(currentUserId)
        ) {

            setError(
                "Vous ne pouvez pas rejoindre votre propre partie."
            );

            return;

        }


        try {

            setLoading(true);


            const response =
                await api.post(
                    `/bravman/join/${match.id}`
                );


            const data =
                response.data;


            if (!data.success) {

                throw new Error(
                    data.message ||
                    "Impossible de rejoindre cette partie."
                );

            }


            if (onJoined) {

                onJoined(
                    data.match
                );

            }

        }
        catch (err) {

            setError(
                err.response?.data?.message ||
                err.message ||
                "Impossible de rejoindre la partie."
            );

        }
        finally {

            setLoading(false);

        }

    };


    return (

        <article className="bravman-match-card">

            <div className="bravman-match-card__top">

                <span className="bravman-match-card__badge">
                    BRA V MAN
                </span>

                <span className="bravman-match-card__status">
                    EN ATTENTE
                </span>

            </div>


            <div className="bravman-match-card__body">

                <div className="bravman-match-card__fighter">

                    <div className="bravman-match-card__avatar">
                        👊
                    </div>

                    <div>

                        <strong>
                            Joueur #{match.creator_id}
                        </strong>

                        <span>
                            Challenger
                        </span>

                    </div>

                </div>


                <div className="bravman-match-card__vs">
                    VS
                </div>


                <div className="bravman-match-card__opponent">

                    <div className="bravman-match-card__avatar">
                        ?
                    </div>

                    <span>
                        Cherche un adversaire
                    </span>

                </div>

            </div>


            <div className="bravman-match-card__footer">

                <div className="bravman-match-card__stake">

                    <small>
                        MISE
                    </small>

                    <strong>
                        {match.stake} FC
                    </strong>

                </div>


                <button
                    type="button"
                    onClick={handleJoin}
                    disabled={loading}
                >

                    {loading
                        ? "Connexion..."
                        : "Relever le défi"
                    }

                </button>

            </div>


            {error && (

                <p className="bravman-match-card__error">
                    {error}
                </p>

            )}

        </article>

    );

};


export default BravmanMatchCard;
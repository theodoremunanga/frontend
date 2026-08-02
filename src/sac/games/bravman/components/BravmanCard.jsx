// frontend/src/sac/games/bravman/components/BravmanCard.jsx

import { useState } from "react";

// ==========================================
// PAGE D'ACCUEIL BRAVMAN
// ==========================================

const BravmanCard = ({

    matches = [],

    createMatch,

    joinMatch

}) => {

    const [stake, setStake] = useState(200);

    const [loading, setLoading] = useState(false);

    const [error, setError] = useState("");



    // ======================================
    // CREATE MATCH
    // ======================================

    const handleCreate = async () => {

        try {

            setLoading(true);

            setError("");

            await createMatch(
                Number(stake)
            );

        }

        catch (err) {

            setError(
                err.message
            );

        }

        finally {

            setLoading(false);

        }

    };

        // ======================================
    // UI
    // ======================================

    return (

        <div className="bravman-page">

            <div className="bravman-create-card">

                <h1>
                    💪 BraVMan
                </h1>

                <p>

                    Créez un défi ou rejoignez
                    une partie déjà ouverte.

                </p>

                {

                    error && (

                        <div
                            className="bravman-error"
                        >

                            {error}

                        </div>

                    )

                }

                <div
                    className="bravman-form"
                >

                    <label>

                        Mise (CDF)

                    </label>

                    <input

                        type="number"

                        min="100"

                        step="100"

                        value={stake}

                        onChange={(e)=>{

                            setStake(
                                e.target.value
                            );

                        }}

                    />

                    <button

                        onClick={handleCreate}

                        disabled={loading}

                    >

                        {

                            loading

                            ?

                            "Création..."

                            :

                            "Créer un défi"

                        }

                    </button>

                </div>

            </div>

            <hr />

            <h2>

                Défis disponibles

            </h2>

                        {

                matches.length === 0

                ? (

                    <div
                        className="bravman-empty"
                    >

                        Aucun défi disponible.

                    </div>

                )

                : (

                    <div
                        className="bravman-match-list"
                    >

                        {

                            matches.map((match)=>(

                                <div

                                    key={match.id}

                                    className="bravman-match-card"

                                >

                                    <div>

                                        <h3>

                                            💪 BraVMan

                                        </h3>

                                        <p>

                                            Mise :

                                            <strong>

                                                {" "}

                                                {match.stake} CDF

                                            </strong>

                                        </p>

                                        <p>

                                            Créateur :

                                            <strong>

                                                {" "}

                                                {match.creator_name ||

                                                ("#" + match.creator_id)}

                                            </strong>

                                        </p>

                                    </div>

                                    <button

                                        onClick={()=>{

                                            joinMatch(
                                                match.id
                                            );

                                        }}

                                    >

                                        Rejoindre

                                    </button>

                                </div>

                            ))

                        }

                    </div>

                )

            }

        </div>

    );

};

export default BravmanCard;
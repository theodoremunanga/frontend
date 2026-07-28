// src/features/bravman/components/BravmanCreateForm.jsx

import {
    useState
} from "react";


// Adapte cet import à ton système API existant.
import api from "../../../services/api";


const BravmanCreateForm = ({
    setPage,
    setGameConfig,
}) => {

    const [stake, setStake] =
        useState("");

    const [loading, setLoading] =
        useState(false);

    const [error, setError] =
        useState(null);

    const [createdMatch, setCreatedMatch] =
        useState(null);


    const handleSubmit = async (event) => {

        event.preventDefault();

        setError(null);


        const numericStake =
            Number(stake);


        if (
            !numericStake ||
            numericStake <= 0
        ) {

            setError(
                "Veuillez entrer une mise valide."
            );

            return;

        }


        try {

            setLoading(true);


            const response =
                await api.post(
                    "/bravman/create",
                    {
                        stake:
                            numericStake,
                    }
                );


            const data =
                response.data;


            if (!data.success) {

                throw new Error(
                    data.message ||
                    "Impossible de créer la partie."
                );

            }


            setCreatedMatch(
                data.match
            );


            setStake("");

            const config = {

                matchId: data.match.id,

                game: "bravman",

            };

            localStorage.setItem(
                "gameConfig",
                JSON.stringify(config)
            );

            setGameConfig(config);

            const config = {

                matchId: data.match.id,

                game: "bravman",

            };

            setGameConfig(config);

            setPage("waiting");

        }
        catch (err) {

            setError(
                err.response?.data?.message ||
                err.message ||
                "Une erreur est survenue."
            );

        }
        finally {

            setLoading(false);

        }

    };


    return (

        <section className="bravman-create">

            <div className="bravman-create__header">

                <span>
                    BRAVMAN
                </span>

                <h2>
                    Défie quelqu'un.
                </h2>

                <p>
                    Définis ta mise et attends
                    qu'un adversaire te rejoigne.
                </p>

            </div>


            <form
                className="bravman-create__form"
                onSubmit={handleSubmit}
            >

                <label htmlFor="bravman-stake">
                    Mise
                </label>


                <div className="bravman-create__input">

                    <input
                        id="bravman-stake"
                        type="number"
                        min="1"
                        step="1"
                        value={stake}
                        onChange={(event) =>
                            setStake(
                                event.target.value
                            )
                        }
                        placeholder="Ex. 100"
                        disabled={loading}
                    />

                    <span>
                        FC
                    </span>

                </div>


                {error && (

                    <p className="bravman-create__error">
                        {error}
                    </p>

                )}


                <button
                    type="submit"
                    disabled={loading}
                >

                    {loading
                        ? "Création..."
                        : "Créer le match"
                    }

                </button>

            </form>


            {createdMatch && (

                <div className="bravman-create__success">

                    <strong>
                        Match créé !
                    </strong>

                    <span>
                        Match #{createdMatch.id}
                    </span>

                    <span>
                        Mise : {createdMatch.stake} FC
                    </span>

                    <span>
                        En attente d'un adversaire...
                    </span>

                </div>

            )}

        </section>

    );

};


export default BravmanCreateForm;
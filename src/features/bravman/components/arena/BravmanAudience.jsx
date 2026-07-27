// src/features/bravman/components/arena/BravmanAudience.jsx

const BravmanAudience = ({
    status,
}) => {

    const active =
        status === "playing";


    const finished =
        status === "finished";


    return (

        <div
            className={[
                "bravman-audience",
                active
                    ? "bravman-audience--active"
                    : "",
                finished
                    ? "bravman-audience--finished"
                    : "",
            ].join(" ")}
        >

            {Array.from(
                { length: 24 }
            ).map(
                (_, index) => (

                    <div
                        key={index}
                        className="bravman-audience__person"
                    >

                        <span className="bravman-audience__head" />

                        <span className="bravman-audience__body" />

                    </div>

                )
            )}

        </div>

    );

};


export default BravmanAudience;
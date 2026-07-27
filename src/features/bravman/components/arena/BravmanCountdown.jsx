// src/features/bravman/components/arena/BravmanCountdown.jsx

const BravmanCountdown = ({
    value,
}) => {

    if (
        value === null ||
        value === undefined
    ) {
        return null;
    }


    return (

        <div className="bravman-countdown">

            <span>
                PRÉPAREZ-VOUS
            </span>

            <strong key={value}>
                {value}
            </strong>

        </div>

    );

};


export default BravmanCountdown;
// src/features/bravman/components/arena/BravmanArm.jsx

const BravmanArm = ({
    side,
    advantagePercent = 50,
}) => {

    const normalized =
        Math.max(
            0,
            Math.min(
                100,
                advantagePercent
            )
        );


    const rotation =
        ((normalized - 50) / 50) * 38;


    return (

        <div
            className={[
                "bravman-arm",
                `bravman-arm--${side}`,
            ].join(" ")}
            style={{
                "--arm-rotation":
                    `${rotation}deg`,
            }}
        >

            <div className="bravman-arm__upper" />

            <div className="bravman-arm__elbow" />

            <div className="bravman-arm__forearm" />

            <div className="bravman-arm__hand" />

        </div>

    );

};


export default BravmanArm;
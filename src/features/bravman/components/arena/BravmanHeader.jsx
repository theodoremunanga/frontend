// src/features/bravman/components/arena/BravmanHeader.jsx

const formatTime = (seconds) => {

    const value =
        Math.max(
            0,
            Number(seconds || 0)
        );

    const minutes =
        Math.floor(value / 60);

    const secs =
        value % 60;

    return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

};


const BravmanHeader = ({
    remaining,
    creatorTaps,
    opponentTaps,
}) => {

    return (

        <header className="bravman-header">

            <div className="bravman-header__brand">

                <span>
                    BRAVMAN
                </span>

                <small>
                    DIGITAL ARM WRESTLING
                </small>

            </div>


            <div className="bravman-header__timer">

                <small>
                    TEMPS
                </small>

                <strong>
                    {formatTime(remaining)}
                </strong>

            </div>


            <div className="bravman-header__score">

                <div>
                    <span>
                        {creatorTaps}
                    </span>

                    <small>
                        P1
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
                        P2
                    </small>
                </div>

            </div>

        </header>

    );

};


export default BravmanHeader;
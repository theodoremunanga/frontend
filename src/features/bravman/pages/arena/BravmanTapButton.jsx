// src/features/bravman/components/arena/BravmanTapButton.jsx

const BravmanTapButton = ({
    onTap,
}) => {

    const handleTap = (event) => {

        event.preventDefault();

        onTap();

    };


    return (

        <button
            type="button"
            className="bravman-tap-button"
            onPointerDown={handleTap}
        >

            <span className="bravman-tap-button__shine" />

            <strong>
                TAP
            </strong>

            <small>
                APPUIEZ !
            </small>

        </button>

    );

};


export default BravmanTapButton;
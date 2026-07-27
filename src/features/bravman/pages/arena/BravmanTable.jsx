// src/features/bravman/components/arena/BravmanTable.jsx

const BravmanTable = ({
    advantagePercent = 50,
}) => {

    return (

        <div className="bravman-table">

            <div className="bravman-table__surface">

                <div className="bravman-table__pad" />

                <div
                    className="bravman-table__center"
                    style={{
                        "--advantage":
                            `${advantagePercent}%`,
                    }}
                />

            </div>


            <div className="bravman-table__leg" />

            <div className="bravman-table__leg" />

        </div>

    );

};


export default BravmanTable;
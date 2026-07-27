import React from "react";

const BravmanTable = () => {

    return (

        <div className="bravman-table">

            {/* ================= TABLE SURFACE ================= */}

            <div className="bravman-table__surface">

                {/* PAD JOUEUR GAUCHE */}
                <div
                    className="
                        bravman-table__pad
                        bravman-table__pad--left
                    "
                />

                {/* PAD CENTRAL */}
                <div
                    className="
                        bravman-table__pad
                        bravman-table__pad--center
                    "
                />

                {/* PAD JOUEUR DROIT */}
                <div
                    className="
                        bravman-table__pad
                        bravman-table__pad--right
                    "
                />

            </div>


            {/* ================= CENTRE ================= */}

            <div className="bravman-table__center" />


            {/* ================= PIEDS ================= */}

            <div
                className="
                    bravman-table__leg
                    bravman-table__leg--left
                "
            />

            <div
                className="
                    bravman-table__leg
                    bravman-table__leg--right
                "
            />


            {/* ================= SUPPORTS ================= */}

            <div
                className="
                    bravman-table__support
                    bravman-table__support--left
                "
            />

            <div
                className="
                    bravman-table__support
                    bravman-table__support--right
                "
            />

        </div>

    );

};

export default BravmanTable;
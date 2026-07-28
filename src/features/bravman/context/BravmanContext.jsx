// src/features/bravman/context/BravmanContext.jsx

import {
    createContext,
    useContext,
    useMemo,
} from "react";

import useBravman
    from "../hooks/useBravman";


// ======================================================
// CONTEXT
// ======================================================

const BravmanContext =
    createContext(null);


// ======================================================
// PROVIDER
// ======================================================

export const BravmanProvider = ({

    children,

    match = null,

    user = null,

    matchId = null,

    userId = null,

    playerSide = null,

    autoJoin = true,

}) => {


    const bravman =
        useBravman({

            matchId,

            userId,

            playerSide,

            autoJoin,

        });


    const value =
        useMemo(
            () => ({

                // -----------------------------------------
                // données du match
                // -----------------------------------------

                match,

                user,

                // -----------------------------------------
                // état du jeu (hook)
                // -----------------------------------------

                ...bravman,

            }),
            [
                match,
                user,
                bravman,
            ]
        );


    return (

        <BravmanContext.Provider
            value={value}
        >

            {children}

        </BravmanContext.Provider>

    );

};


// ======================================================
// HOOK
// ======================================================

export const useBravmanContext =
() => {

    const context =
        useContext(
            BravmanContext
        );

    if (!context) {

        throw new Error(

            "useBravmanContext doit être utilisé à l'intérieur de BravmanProvider."

        );

    }

    return context;

};


// ======================================================
// EXPORT
// ======================================================

export default BravmanContext;
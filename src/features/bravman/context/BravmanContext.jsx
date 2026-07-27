// src/context/BravmanContext.jsx

import {
    createContext,
    useContext,
    useMemo,
} from "react";

import useBravman from "../hooks/useBravman";


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
            () => bravman,
            [bravman]
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
// CONSUMER HOOK
// ======================================================

export const useBravmanContext = () => {

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
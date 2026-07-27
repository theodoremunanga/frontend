// src/features/bravman/pages/BravmanGame.jsx

import BravmanProvider from "../context/BravmanContext";
import BravmanArena from "../components/arena/BravmanArena";


const BravmanGame = ({
    match,
    user,
}) => {

    if (!match || !user) {

        return (
            <div className="bravman-game-loading">
                Chargement du match...
            </div>
        );

    }


    const playerSide =
        Number(match.creator_id) ===
        Number(user.id)
            ? "creator"
            : "opponent";


    return (

        <BravmanProvider
            matchId={match.id}
            userId={user.id}
            playerSide={playerSide}
            autoJoin={true}
        >

            <BravmanArena />

        </BravmanProvider>

    );

};


export default BravmanGame;
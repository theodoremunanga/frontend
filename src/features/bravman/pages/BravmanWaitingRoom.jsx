import {
    useEffect,
    useState,
} from "react";

import bravmanSocket
    from "../../../sockets/bravmanSocket";

const BravmanWaitingRoom = ({
    gameConfig,
    setPage,
    setGameConfig,
}) => {

    const [
        status,
        setStatus,
    ] = useState(
        "Connexion..."
    );


    useEffect(() => {

        if (!gameConfig?.matchId) {
            return;
        }

        const storedUser =
            localStorage.getItem(
                "user"
            );

        if (!storedUser) {
            return;
        }

        const user =
            JSON.parse(
                storedUser
            );

        if (!user?.id) {
            return;
        }

        // ==========================
        // SOCKET
        // ==========================

        bravmanSocket.connect();

        setStatus(
            "Connexion à l'arène..."
        );

        const socket =
            bravmanSocket.getSocket();

        const join = () => {

            bravmanSocket.joinRoom(
                gameConfig.matchId,
                user.id
            );

            bravmanSocket.requestState();

            setStatus(
                "En attente d'un adversaire..."
            );

        };

        if (socket.connected) {

            join();

        } else {

            socket.once(
                "connect",
                join
            );

        }

        // ==========================
        // MATCH READY
        // ==========================

        const removeReady =
            bravmanSocket.onMatchReady(
                ({ match }) => {

                    if (
                        Number(match.id) !==
                        Number(gameConfig.matchId)
                    ) {
                        return;
                    }

                    setStatus(
                        "Adversaire trouvé !"
                    );

                    const config = {

                        matchId: match.id,

                        game: "bravman",

                    };

                    setGameConfig(
                        config
                    );

                    setTimeout(() => {

                        setPage(
                            "game"
                        );

                    }, 400);

                }
            );

        // ==========================
        // CLEANUP
        // ==========================

        return () => {

            removeReady?.();

        };

    }, [
        gameConfig,
        setPage,
        setGameConfig,
    ]);


    return (

        <section
            className="bravman-waiting"
        >

            <h1>

                👊 BraVMan

            </h1>

            <h2>

                Match #
                {gameConfig.matchId}

            </h2>

            <p>

                {status}

            </p>

            <div
                className="bravman-loader"
            />

        </section>

    );

};

export default BravmanWaitingRoom;
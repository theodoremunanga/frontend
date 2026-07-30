import {
    useEffect,
    useState,
} from "react";

import bravmanSocket
    from "../sockets/bravmanSocket";

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

        setStatus(
            "Connexion à l'arène..."
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
                        return; () => {

                            removeReady?.();

                            removeState?.();

                            removeJoined?.();

                        };
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

                    setPage("game");

                }
            );

            const removeState =
                bravmanSocket.onUpdate(
            (state) => {

            if (
                Number(state.matchId) !==
                Number(gameConfig.matchId)
            ) {
                return;
            }

            switch (state.status) {

                case "matched":

                    setStatus(
                        "Adversaire connecté..."
                    );

                    break;

                case "countdown":

                    setStatus(
                        "Préparation du combat..."
                    );

                    setGameConfig({
                        matchId: gameConfig.matchId,
                        game: "bravman",
                    });

                    setPage("game");

                    break;

                case "playing":

                    setGameConfig({
                        matchId: gameConfig.matchId,
                        game: "bravman",
                    });

                    setPage("game");

                    break;

                case "finished":

                    setStatus(
                        "Combat terminé."
                    );

                    break;

                default:
                    break;

            }

        }
    );

        const removeJoined =
            bravmanSocket.onJoined(() => {

            bravmanSocket.requestState();

        });

        // ==========================
        // CLEANUP
        // ==========================

        return () => {

            removeReady?.();
            removeJoined?.();
            removeJoined?.();

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
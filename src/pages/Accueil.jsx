// ============================================================
// 6BETBALL — ACCUEIL
// frontend/src/pages/Accueil.jsx
//
// Architecture :
// - SAC pour les jeux intégrés au système SAC
// - BraVMan / Football : ouverture directe de leur lobby
// - Ludo : création SAC + choix mode/mise
// - Dames : système historique conservé
// - Casino : toujours prioritaire
// - Publicités / défis / parties actives conservés
// ============================================================

import {
    useState,
    useEffect,
    useRef,
    useMemo,
    useCallback,
} from "react";

import "./Accueil.css";

import { getSocket } from "../services/socket";
import { API_URL } from "../services/api";

import SponsoredBanner from "../components/ads/SponsoredBanner";
import AdCarousel from "../components/ads/AdCarousel";
import AdComments from "../components/ads/AdComments";
import Casino from "../components/Casino";

import {
    getHomeFeedAds,
    trackAdView,
    openAdLink,
} from "../services/adService";

import {
    createSacMatch,
} from "../sac/sacApi";

// ============================================================
// CONFIGURATION DES JEUX
// ============================================================

const games = [
    {
        id: "bravman",
        name: "BraVMan",
        icon: "💪",
        available: true,
        description:
            "Le bras de fer digital compétitif.",
        players: "2 Joueurs",
        difficulty: "PRO",
        actionLabel: "Ouvrir BraVMan",
        directLobby: true,

        // Plusieurs chemins possibles pour faciliter
        // l'intégration de ton PNG.
        imageCandidates: [
            "/games/bravman.png",
            "/games/BraVMan.png",
            "/games/bravman.png",
        ],
    },

    {
        id: "football",
        name: "Football",
        icon: "⚽",
        available: false,
        description:
            "Affronte un autre joueur dans le lobby Football.",
        players: "2 Joueurs",
        difficulty: "PRO",
        actionLabel: "Ouvrir Football",
        directLobby: true,

        imageCandidates: [
            "/games/football.png",
            "/games/Football.png",
            "/games/football.png",
        ],
    },

    {
        id: "ludo",
        name: "Ludo",
        icon: "🎲",
        available: false,
        description:
            "Course, stratégie et suspense autour du dé.",
        players: "2 Joueurs",
        difficulty: "PRO",
        actionLabel: "Créer une partie",
        directLobby: false,

        imageCandidates: [
            "/games/ludo.png",
        ],
    },

    {
        id: "dames",
        name: "Dames",
        icon: "♟️",
        available: true,
        description:
            "Le grand classique de réflexion compétitive.",
        players: "2 Joueurs",
        difficulty: "PRO",
        actionLabel: "Lancer une partie",
        directLobby: false,

        imageCandidates: [
            "/games/dames.png",
        ],
    },

    {
        id: "cartes",
        name: "Cartes",
        icon: "🃏",
        available: false,
        description:
            "Disponible prochainement dans une future mise à jour.",
        players: "Bientôt",
        difficulty: "NEW",
        actionLabel: "Bientôt disponible",
        directLobby: false,

        imageCandidates: [
            "/games/cartes.png",
        ],
    },
];

// ============================================================
// OUTILS
// ============================================================

const GAME_META = games.reduce(
    (accumulator, game) => {
        accumulator[game.id] = game;
        return accumulator;
    },
    {}
);

function getGameMeta(gameId) {
    return (
        GAME_META[String(gameId || "").toLowerCase()] || {
            id: gameId,
            name: "Jeu",
            icon: "🎮",
        }
    );
}

function normalizeGameId(value) {
    if (!value) {
        return "";
    }

    const normalized = String(value)
        .toLowerCase()
        .trim();

    if (
        normalized === "checkers" ||
        normalized === "matches"
    ) {
        return "dames";
    }

    return normalized;
}

function formatMoney(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "0";
    }

    return new Intl.NumberFormat("fr-FR").format(
        number
    );
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export default function Accueil({
    setPage,
    setGameConfig,
}) {
    // ========================================================
    // STATES
    // ========================================================

    const [inputs, setInputs] = useState({});
    const [error, setError] = useState("");

    const [openChallenges, setOpenChallenges] =
        useState([]);

    const [myGames, setMyGames] =
        useState([]);

    const [loading, setLoading] =
        useState(true);

    // ========================================================
    // ADS
    // ========================================================

    const [feedAds, setFeedAds] =
        useState([]);

    const [loadingAds, setLoadingAds] =
        useState(true);

    // ========================================================
    // NETWORK
    // ========================================================

    const [isOffline, setIsOffline] =
        useState(
            typeof navigator !== "undefined"
                ? !navigator.onLine
                : false
        );

    // ========================================================
    // REFERENCES
    // ========================================================

    const viewedAds = useRef(
        new Set()
    );

    const isFetching = useRef(false);

    // ========================================================
    // CONSTANTES
    // ========================================================

    const MIN_BET = 200;

    const token =
        typeof localStorage !== "undefined"
            ? localStorage.getItem("token")
            : null;

    const username =
        typeof localStorage !== "undefined"
            ? localStorage.getItem("username") ||
              "Joueur"
            : "Joueur";

    const role =
        typeof localStorage !== "undefined"
            ? localStorage.getItem("role") ||
              "PLAYER"
            : "PLAYER";

    const API = (
        API_URL ||
        "https://backend-ad3t.onrender.com/api"
    ).replace(/\/+$/, "");

    // ========================================================
    // NETWORK STATUS
    // ========================================================

    useEffect(() => {
        const handleOnline = () => {
            setIsOffline(false);
        };

        const handleOffline = () => {
            setIsOffline(true);
        };

        window.addEventListener(
            "online",
            handleOnline
        );

        window.addEventListener(
            "offline",
            handleOffline
        );

        return () => {
            window.removeEventListener(
                "online",
                handleOnline
            );

            window.removeEventListener(
                "offline",
                handleOffline
            );
        };
    }, []);

    // ========================================================
    // LOAD ADS
    // ========================================================

    useEffect(() => {
        let mounted = true;

        const loadAds = async () => {
            try {
                const ads =
                    await getHomeFeedAds();

                if (mounted) {
                    setFeedAds(
                        Array.isArray(ads)
                            ? ads
                            : []
                    );
                }
            } catch (err) {
                console.error(
                    "❌ Error loading ads:",
                    err
                );
            } finally {
                if (mounted) {
                    setLoadingAds(false);
                }
            }
        };

        loadAds();

        return () => {
            mounted = false;
        };
    }, []);

    // ========================================================
    // TRACK AD VIEW
    // ========================================================

    const handleAdView = useCallback(
        async (id) => {
            if (!id) {
                return;
            }

            if (
                viewedAds.current.has(id)
            ) {
                return;
            }

            viewedAds.current.add(id);

            try {
                await trackAdView(id);
            } catch (err) {
                console.error(
                    "Track ad failed:",
                    err
                );
            }
        },
        []
    );

    // ========================================================
    // LOAD MATCH DATA
    // ========================================================

    const fetchData = useCallback(
        async (silent = false) => {
            if (!token) {
                setLoading(false);
                return;
            }

            if (isFetching.current) {
                return;
            }

            if (isOffline) {
                setError(
                    "📡 Vous êtes actuellement hors ligne."
                );

                setLoading(false);
                return;
            }

            isFetching.current = true;

            if (!silent) {
                setLoading(true);
            }

            try {
                const headers = {
                    Authorization:
                        "Bearer " + token,
                };

                const [
                    openRes,
                    myRes,
                ] = await Promise.all([
                    fetch(
                        `${API}/match/open`,
                        {
                            headers,
                        }
                    ),

                    fetch(
                        `${API}/match/my-active`,
                        {
                            headers,
                        }
                    ),
                ]);

                if (
                    openRes.status === 401 ||
                    myRes.status === 401
                ) {
                    localStorage.removeItem(
                        "token"
                    );

                    localStorage.removeItem(
                        "user"
                    );

                    setError(
                        "🔒 Votre session a expiré."
                    );

                    return;
                }

                const [
                    openData,
                    myData,
                ] = await Promise.all([
                    openRes
                        .json()
                        .catch(() => ({})),

                    myRes
                        .json()
                        .catch(() => ({})),
                ]);

                if (openRes.ok) {
                    setOpenChallenges(
                        Array.isArray(
                            openData?.matches
                        )
                            ? openData.matches
                            : []
                    );
                }

                if (myRes.ok) {
                    setMyGames(
                        Array.isArray(
                            myData?.matches
                        )
                            ? myData.matches
                            : []
                    );
                }

                setError("");
            } catch (err) {
                console.error(
                    "HOME FETCH ERROR:",
                    err
                );

                setError(
                    "❌ Connexion au serveur impossible."
                );
            } finally {
                isFetching.current = false;
                setLoading(false);
            }
        },
        [
            token,
            isOffline,
            API,
        ]
    );

    // ========================================================
    // INITIAL LOAD + AUTO REFRESH
    // ========================================================

    useEffect(() => {
        fetchData();

        const interval =
            setInterval(() => {
                if (
                    document.visibilityState ===
                    "visible"
                ) {
                    fetchData(true);
                }
            }, 15000);

        return () => {
            clearInterval(interval);
        };
    }, [fetchData]);

    // ========================================================
    // REFRESH APRÈS RETOUR ONLINE
    // ========================================================

    useEffect(() => {
        if (!isOffline) {
            fetchData(true);
        }
    }, [
        isOffline,
        fetchData,
    ]);

    // ========================================================
    // SOCKET REALTIME
    // ========================================================

    useEffect(() => {
        if (!token) {
            return undefined;
        }

        const socket = getSocket();

        if (!socket) {
            return undefined;
        }

        const refreshFeed = () => {
            fetchData(true);
        };

        socket.on(
            "match_created",
            refreshFeed
        );

        socket.on(
            "match_joined",
            refreshFeed
        );

        socket.on(
            "match_finished",
            refreshFeed
        );

        return () => {
            socket.off(
                "match_created",
                refreshFeed
            );

            socket.off(
                "match_joined",
                refreshFeed
            );

            socket.off(
                "match_finished",
                refreshFeed
            );
        };
    }, [
        fetchData,
        token,
    ]);

    // ========================================================
    // INPUTS
    // ========================================================

    const updateInput = useCallback(
        (
            gameId,
            field,
            value
        ) => {
            setInputs((previous) => ({
                ...previous,

                [gameId]: {
                    ...previous[gameId],
                    [field]: value,
                },
            }));
        },
        []
    );

    const getAmount = useCallback(
        (gameId) =>
            inputs[gameId]?.amount ||
            "",

        [inputs]
    );

    const getMode = useCallback(
        (gameId) =>
            inputs[gameId]?.mode ||
            "user",

        [inputs]
    );

    const getJoId = useCallback(
        (gameId) =>
            inputs[gameId]?.joId ||
            "",

        [inputs]
    );

    // ========================================================
    // RECHARGER
    //
    // Le nom "wallet" correspond à la page Wallet.
    // Si ton App.jsx utilise un autre nom de page,
    // change uniquement cette valeur.
    // ========================================================

    const handleRecharge = () => {
        setError("");

        setTimeout(() => {
            setPage("wallet");
        }, 0);
    };

    // ========================================================
    // OUVERTURE DIRECTE DES LOBBIES
    // ========================================================

    const openDirectLobby = (
        gameId
    ) => {
        setError("");

        if (gameId === "bravman") {
            setPage("bravman");
            return;
        }

        if (gameId === "football") {
            setPage("football");
            return;
        }

        if (gameId === "ludo") {
            setPage("ludo");
            return;
        }

        if (gameId === "dames") {
            setPage("game");
            return;
        }

        setError(
            "🚧 Ce jeu n'est pas encore disponible."
        );
    };

    // ========================================================
    // GAME NAVIGATION
    // ========================================================

    const goToGame = useCallback(
        (match) => {
            if (!match) {
                setError(
                    "❌ Partie invalide."
                );
                return;
            }

            const matchId =
                match.matchId ||
                match.id;

            if (!matchId) {
                setError(
                    "❌ matchId invalide."
                );
                return;
            }

            const gameId =
                normalizeGameId(
                    match.game ||
                    match.game_type ||
                    match.gameId
                );

            const bet =
                match.bet ??
                match.bet_amount ??
                match.stake ??
                0;

            // ------------------------------------------------
            // BRAVMAN
            // ------------------------------------------------

            if (
                gameId ===
                "bravman"
            ) {
                setGameConfig({
                    matchId:
                        Number(matchId),
                    game: "bravman",
                    mode: "playing",
                    bet,
                });

                setPage("bravman");
                return;
            }

            // ------------------------------------------------
            // FOOTBALL
            // ------------------------------------------------

            if (
                gameId ===
                "football"
            ) {
                setGameConfig({
                    matchId:
                        Number(matchId),
                    game: "football",
                    mode: "playing",
                    bet,
                });

                setPage("football");
                return;
            }

            // ------------------------------------------------
            // LUDO
            // ------------------------------------------------

            if (
                gameId === "ludo"
            ) {
                setGameConfig({
                    matchId:
                        Number(matchId),
                    game: "ludo",
                    mode:
                        match.mode ||
                        "user",
                    bet,
                });

                setPage("ludo");
                return;
            }

            // ------------------------------------------------
            // DAMES
            // ------------------------------------------------

            setGameConfig({
                matchId:
                    Number(matchId),
                game:
                    gameId ||
                    "dames",
                mode: "playing",
                bet,
            });

            setTimeout(() => {
                setPage("game");
            }, 0);
        },
        [
            setGameConfig,
            setPage,
        ]
    );

    // ========================================================
    // JOIN MATCH CLASSIQUE
    // ========================================================

    const joinMatchById = async (
        match
    ) => {
        if (!match?.id) {
            return;
        }

        if (isOffline) {
            setError(
                "📡 Impossible de rejoindre une partie hors ligne."
            );

            return;
        }

        try {
            const res =
                await fetch(
                    `${API}/match/join`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json",

                            Authorization:
                                "Bearer " +
                                token,
                        },

                        body:
                            JSON.stringify({
                                matchId:
                                    match.id,
                            }),
                    }
                );

            const data =
                await res
                    .json()
                    .catch(
                        () => ({})
                    );

            if (
                !res.ok ||
                data.error
            ) {
                setError(
                    data?.error ||
                        "❌ Impossible de rejoindre cette partie."
                );

                return;
            }

            const joinedMatch = {
                ...match,

                id:
                    data.matchId ||
                    match.id,

                game:
                    match.game ||
                    "dames",

                bet:
                    match.bet ??
                    match.bet_amount ??
                    0,
            };

            await fetchData();

            goToGame(
                joinedMatch
            );
        } catch (err) {
            console.error(
                "JOIN MATCH ERROR:",
                err
            );

            setError(
                "❌ Connexion serveur impossible."
            );
        }
    };

    // ========================================================
    // CREATE CHALLENGE
    // ========================================================

    const handleCreateChallenge =
        async (gameId) => {
            // ==================================================
            // BRAVMAN
            //
            // IMPORTANT :
            // aucun mode ni aucune mise ici.
            // Le lobby BraVMan s'en occupe.
            // ==================================================

            if (
                gameId ===
                "bravman"
            ) {
                openDirectLobby(
                    "bravman"
                );

                return;
            }

            // ==================================================
            // FOOTBALL
            //
            // IMPORTANT :
            // aucun mode ni aucune mise ici.
            // Le lobby Football s'en occupe.
            // ==================================================

            if (
                gameId ===
                "football"
            ) {
                openDirectLobby(
                    "football"
                );

                return;
            }

            // ==================================================
            // LUDO
            // ==================================================

            if (
                gameId ===
                "ludo"
            ) {
                if (isOffline) {
                    setError(
                        "📡 Hors ligne."
                    );

                    return;
                }

                const mode =
                    getMode(
                        gameId
                    );

                const raw =
                    getAmount(
                        gameId
                    );

                const amount =
                    mode ===
                    "training"
                        ? 0
                        : raw
                        ? Number(
                              raw
                          )
                        : null;

                if (
                    mode !==
                        "training" &&
                    (!amount ||
                        amount <
                            500)
                ) {
                    setError(
                        "⚠️ Mise minimum Ludo : 500 CDF."
                    );

                    return;
                }

                try {
                    const created =
                        await createSacMatch(
                            {
                                game: "ludo",
                                stake:
                                    amount ||
                                    0,
                            }
                        );

                    console.log(
                        "🎲 LUDO SAC MATCH CREATED:",
                        created
                    );

                    const matchId =
                        created?.matchId ||
                        created?.id ||
                        created?.match?.id;

                    if (!matchId) {
                        console.error(
                            "❌ Réponse SAC Ludo invalide:",
                            created
                        );

                        setError(
                            "❌ Le serveur n'a pas retourné de matchId."
                        );

                        return;
                    }

                    setGameConfig({
                        matchId:
                            Number(
                                matchId
                            ),

                        game: "ludo",

                        mode,

                        bet:
                            amount ||
                            0,
                    });

                    setTimeout(() => {
                        setPage("ludo");
                    }, 0);

                    return;
                } catch (err) {
                    console.error(
                        "❌ LUDO SAC CREATE ERROR:",
                        err
                    );

                    setError(
                        err?.response
                            ?.data
                            ?.error ||
                            err?.response
                                ?.data
                                ?.message ||
                            err?.message ||
                            "❌ Impossible de créer la partie Ludo."
                    );

                    return;
                }
            }

            // ==================================================
            // DAMES
            // ==================================================

            if (
                gameId !==
                "dames"
            ) {
                setError(
                    "🚧 Jeu indisponible actuellement."
                );

                return;
            }

            if (isOffline) {
                setError(
                    "📡 Hors ligne."
                );

                return;
            }

            const mode =
                getMode(
                    gameId
                );

            // --------------------------------------------------
            // Vérification Match Direct
            // --------------------------------------------------

            if (
                mode ===
                "ai"
            ) {
                try {
                    const response =
                        await fetch(
                            `${API}/ai/status`
                        );

                    const data =
                        await response
                            .json()
                            .catch(
                                () => ({})
                            );

                    if (
                        !response.ok ||
                        !data.success
                    ) {
                        setError(
                            "Impossible de vérifier la disponibilité du Match Direct."
                        );

                        return;
                    }

                    if (
                        !data.status
                            ?.enabled
                    ) {
                        setError(
                            "⚠️ Le Match Direct est momentanément indisponible. Veuillez choisir « VS Joueur »."
                        );

                        return;
                    }
                } catch (err) {
                    console.error(
                        "AI STATUS ERROR:",
                        err
                    );

                    setError(
                        "❌ Impossible de vérifier le Match Direct."
                    );

                    return;
                }
            }

            const raw =
                getAmount(
                    gameId
                );

            const amount =
                mode ===
                "training"
                    ? 0
                    : raw
                    ? Number(raw)
                    : null;

            const joId =
                getJoId(
                    gameId
                );

            // --------------------------------------------------
            // Validation mise
            // --------------------------------------------------

            if (
                mode !==
                    "training" &&
                (!amount ||
                    amount <
                        MIN_BET)
            ) {
                setError(
                    `⚠️ Mise minimum : ${MIN_BET} CDF.`
                );

                return;
            }

            if (
                mode === "jo" &&
                !joId
            ) {
                setError(
                    "⚠️ ID du JO requis."
                );

                return;
            }

            try {
                let res;

                // ----------------------------------------------
                // MATCH GRATUIT
                // ----------------------------------------------

                if (
                    mode ===
                    "training"
                ) {
                    res =
                        await fetch(
                            `${API}/training/create`,
                            {
                                method:
                                    "POST",

                                headers: {
                                    "Content-Type":
                                        "application/json",

                                    Authorization:
                                        "Bearer " +
                                        token,
                                },

                                body:
                                    JSON.stringify(
                                        {
                                            game: gameId,
                                        }
                                    ),
                            }
                        );
                }

                // ----------------------------------------------
                // MATCH CLASSIQUE
                // ----------------------------------------------

                else {
                    res =
                        await fetch(
                            `${API}/match/create`,
                            {
                                method:
                                    "POST",

                                headers: {
                                    "Content-Type":
                                        "application/json",

                                    Authorization:
                                        "Bearer " +
                                        token,
                                },

                                body:
                                    JSON.stringify(
                                        {
                                            game:
                                                gameId,

                                            bet:
                                                amount,

                                            mode,

                                            joId,
                                        }
                                    ),
                            }
                        );
                }

                const data =
                    await res
                        .json()
                        .catch(
                            () => ({})
                        );

                if (
                    !res.ok ||
                    data?.error
                ) {
                    setError(
                        data?.error ||
                            "❌ Création échouée."
                    );

                    return;
                }

                if (
                    !data?.matchId
                ) {
                    setError(
                        "❌ matchId manquant."
                    );

                    return;
                }

                const match = {
                    id:
                        data.matchId,

                    game:
                        gameId,

                    bet:
                        amount,
                };

                await fetchData();

                // ----------------------------------------------
                // VS JOUEUR
                // ----------------------------------------------

                if (
                    mode ===
                    "user"
                ) {
                    setGameConfig({
                        matchId:
                            match.id,

                        game:
                            gameId,

                        mode:
                            "waiting",

                        bet:
                            amount,
                    });

                    setTimeout(() => {
                        setPage(
                            "waiting"
                        );
                    }, 0);

                    return;
                }

                // ----------------------------------------------
                // MATCH DIRECT
                // ----------------------------------------------

                if (
                    mode ===
                    "ai"
                ) {
                    const botRes =
                        await fetch(
                            `${API}/match/create/bot`,
                            {
                                method:
                                    "POST",

                                headers: {
                                    "Content-Type":
                                        "application/json",

                                    Authorization:
                                        "Bearer " +
                                        token,
                                },

                                body:
                                    JSON.stringify(
                                        {
                                            matchId:
                                                match.id,

                                            level:
                                                "medium",

                                            user_id:
                                                999,
                                        }
                                    ),
                            }
                        );

                    const botData =
                        await botRes
                            .json()
                            .catch(
                                () => ({})
                            );

                    if (
                        !botRes.ok ||
                        botData.error
                    ) {
                        await fetch(
                            `${API}/match/${match.id}`,
                            {
                                method:
                                    "DELETE",

                                headers: {
                                    Authorization:
                                        "Bearer " +
                                        token,
                                },
                            }
                        ).catch(
                            () => {}
                        );

                        setError(
                            "⚠️ Match Direct non disponible pour le moment. Créez un Match VS Joueur ou rejoignez les défis ouverts."
                        );

                        return;
                    }

                    goToGame(
                        match
                    );

                    return;
                }

                // ----------------------------------------------
                // MATCH GRATUIT
                // ----------------------------------------------

                if (
                    mode ===
                    "training"
                ) {
                    setGameConfig({
                        matchId:
                            match.id,

                        game:
                            gameId,

                        mode:
                            "playing",

                        bet: 0,
                    });

                    setTimeout(() => {
                        setPage(
                            "game"
                        );
                    }, 0);
                }
            } catch (err) {
                console.error(
                    "CREATE MATCH ERROR:",
                    err
                );

                setError(
                    "❌ Connexion serveur impossible."
                );
            }
        };

    // ========================================================
    // FEED
    // ========================================================

    const feedSections =
        useMemo(() => {
            const sections = [
                {
                    type: "myGames",
                },

                {
                    type:
                        "openChallenges",
                },

                {
                    type: "games",
                },
            ];

            if (
                !feedAds.length
            ) {
                return sections;
            }

            const merged = [];

            sections.forEach(
                (
                    section,
                    index
                ) => {
                    merged.push(
                        section
                    );

                    if (
                        feedAds[index]
                    ) {
                        merged.push({
                            type: "ad",

                            ad:
                                feedAds[
                                    index
                                ],
                        });
                    }
                }
            );

            return merged;
        }, [
            feedAds,
        ]);

    // ========================================================
    // STATS
    // ========================================================

    const stats =
        useMemo(() => {
            return {
                open:
                    openChallenges.length,

                active:
                    myGames.length,

                games:
                    games.filter(
                        (game) =>
                            game.available
                    ).length,
            };
        }, [
            openChallenges,
            myGames,
        ]);

    // ========================================================
    // LOADING
    // ========================================================

    if (loading) {
        return (
            <div className="home-loading">
                <div className="home-loading-orbit">
                    <div className="home-loading-spinner" />
                </div>

                <div className="home-loading-brand">
                    6BETBALL
                </div>

                <h2>
                    Préparation de votre espace de jeu...
                </h2>

                <p>
                    Connexion au système d'arbitrage.
                </p>
            </div>
        );
    }

    // ========================================================
    // RENDER
    // ========================================================

    return (
        <div className="home-page">
            {/* ==================================================
                BACKGROUND DECORATION
            ================================================== */}

            <div className="home-background">
                <div className="home-glow home-glow-one" />
                <div className="home-glow home-glow-two" />
                <div className="home-grid" />
            </div>

            <div className="home-content">
                {/* ==================================================
                    SPONSORED TOP
                ================================================== */}

                <div className="home-sponsored">
                    <SponsoredBanner />
                </div>

                {/* ==================================================
                    HERO
                ================================================== */}

                <section className="home-hero">
                    <div className="home-hero-noise" />

                    <div className="home-hero-content">
                        <div className="home-hero-top">
                            <div className="home-hero-copy">
                                <div className="home-kicker">
                                    <span className="home-kicker-dot" />
                                    SAJCL · 6BETBALL
                                </div>

                                <h1 className="home-title">
                                    ICI ON JOUE,
                                    <span>
                                        ON NE PARIE PAS !
                                    </span>
                                </h1>

                                <p className="home-subtitle">
                                    Le Système d'Arbitrage
                                    de Jeux Compétitifs
                                    en Ligne.
                                    <br />
                                    Une plateforme
                                    authentique,
                                    honnête et sûre
                                    pour jouer
                                    autrement.
                                </p>

                                <div className="home-hero-actions">
                                    <button
                                        type="button"
                                        className="home-recharge-button"
                                        onClick={
                                            handleRecharge
                                        }
                                    >
                                        <span className="home-recharge-icon">
                                            +
                                        </span>

                                        <span>
                                            <strong>
                                                Recharger
                                            </strong>

                                            <small>
                                                Déposer des fonds
                                            </small>
                                        </span>
                                    </button>

                                    <div className="home-security-badge">
                                        <span>
                                            🔐
                                        </span>

                                        Paiements sécurisés
                                    </div>
                                </div>
                            </div>

                            <div className="home-profile">
                                <div className="home-profile-avatar">
                                    {username
                                        ?.charAt(
                                            0
                                        )
                                        ?.toUpperCase() ||
                                        "J"}
                                </div>

                                <div className="home-profile-info">
                                    <span>
                                        Connecté en tant que
                                    </span>

                                    <strong>
                                        {username}
                                    </strong>

                                    <small>
                                        {role}
                                    </small>
                                </div>

                                <div className="home-profile-status">
                                    <span />
                                    EN LIGNE
                                </div>
                            </div>
                        </div>

                        {/* ==================================================
                            STATS
                        ================================================== */}

                        <div className="home-stats">
                            <StatCard
                                value={
                                    stats.active
                                }
                                label="Mes parties"
                                icon="🎮"
                            />

                            <StatCard
                                value={
                                    stats.open
                                }
                                label="Défis ouverts"
                                icon="🔥"
                            />

                            <StatCard
                                value={
                                    stats.games
                                }
                                label="Jeux disponibles"
                                icon="🕹️"
                            />
                        </div>
                    </div>
                </section>

                {/* ==================================================
                    AD CAROUSEL
                ================================================== */}

                <div className="home-ad-carousel">
                    <AdCarousel />
                </div>

                {/* ==================================================
                    CONTENT
                ================================================== */}

                <main className="home-main">
                    {/* ==================================================
                        ERROR
                    ================================================== */}

                    {error && (
                        <div className="home-alert home-alert-error">
                            <span>
                                ⚠️
                            </span>

                            <div>
                                <strong>
                                    Attention
                                </strong>

                                <p>
                                    {error}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    setError("")
                                }
                                aria-label="Fermer"
                            >
                                ×
                            </button>
                        </div>
                    )}

                    {/* ==================================================
                        OFFLINE
                    ================================================== */}

                    {isOffline && (
                        <div className="home-alert home-alert-offline">
                            <span>
                                📡
                            </span>

                            <div>
                                <strong>
                                    Mode hors ligne
                                </strong>

                                <p>
                                    Certaines fonctionnalités
                                    nécessitent une connexion
                                    Internet.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* ==================================================
                        DYNAMIC FEED
                    ================================================== */}

                    {feedSections.map(
                        (
                            section,
                            index
                        ) => {
                            // ==================================================
                            // PUBLICITÉ
                            // ==================================================

                            if (
                                section.type ===
                                "ad"
                            ) {
                                const ad =
                                    section.ad;

                                return (
                                    <article
                                        className="home-feed-ad"
                                        key={`ad-${ad.id}`}
                                        onMouseEnter={() =>
                                            handleAdView(
                                                ad.id
                                            )
                                        }
                                    >
                                        <div className="home-feed-ad-top">
                                            <span className="home-sponsored-badge">
                                                SPONSORED
                                            </span>

                                            {ad.advertiser && (
                                                <span className="home-advertiser">
                                                    {
                                                        ad.advertiser
                                                    }
                                                </span>
                                            )}
                                        </div>

                                        <h2>
                                            {ad.title}
                                        </h2>

                                        {ad.image && (
                                            <img
                                                src={
                                                    ad.image
                                                }
                                                alt={
                                                    ad.title ||
                                                    "Publicité"
                                                }
                                                className="home-feed-ad-image"
                                            />
                                        )}

                                        {ad.description && (
                                            <p>
                                                {
                                                    ad.description
                                                }
                                            </p>
                                        )}

                                        <div className="home-feed-ad-actions">
                                            {ad.link && (
                                                <button
                                                    type="button"
                                                    className="home-ad-link"
                                                    onClick={() =>
                                                        openAdLink(
                                                            ad
                                                        )
                                                    }
                                                >
                                                    🔗 Voir plus
                                                </button>
                                            )}

                                            <button
                                                type="button"
                                                className="home-ad-review-button"
                                                onClick={() =>
                                                    setPage(
                                                        "avis"
                                                    )
                                                }
                                            >
                                                ⭐ Avis des joueurs
                                            </button>
                                        </div>

                                        <AdComments
                                            ad={ad}
                                            currentUser={{
                                                username,
                                            }}
                                        />
                                    </article>
                                );
                            }

                            // ==================================================
                            // MES PARTIES
                            // ==================================================

                            if (
                                section.type ===
                                "myGames"
                            ) {
                                return (
                                    <section
                                        className="home-section"
                                        key={`section-${index}`}
                                    >
                                        <SectionTitle
                                            icon="🎮"
                                            title="Mes parties actives"
                                            subtitle="Retrouvez rapidement vos parties en cours."
                                        />

                                        {myGames.length ===
                                        0 ? (
                                            <div className="home-empty">
                                                <div className="home-empty-icon">
                                                    🎮
                                                </div>

                                                <strong>
                                                    Aucune partie active
                                                </strong>

                                                <span>
                                                    Lancez une partie
                                                    pour commencer à
                                                    jouer.
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="home-horizontal-list">
                                                {myGames.map(
                                                    (
                                                        match
                                                    ) => {
                                                        const gameId =
                                                            normalizeGameId(
                                                                match.game ||
                                                                    match.game_type
                                                            );

                                                        const game =
                                                            getGameMeta(
                                                                gameId
                                                            );

                                                        const status =
                                                            match.status ||
                                                            "playing";

                                                        const isWaiting =
                                                            status ===
                                                            "waiting";

                                                        return (
                                                            <article
                                                                className="home-active-card"
                                                                key={
                                                                    match.id
                                                                }
                                                            >
                                                                <div className="home-active-image">
                                                                    <GameImage
                                                                        game={
                                                                            game
                                                                        }
                                                                    />

                                                                    <div className="home-active-image-overlay" />
                                                                </div>

                                                                <div className="home-active-body">
                                                                    <div className="home-game-mini-badge">
                                                                        <span>
                                                                            {
                                                                                game.icon
                                                                            }
                                                                        </span>

                                                                        {
                                                                            game.name
                                                                        }
                                                                    </div>

                                                                    <div className="home-active-stake">
                                                                        <span>
                                                                            Mise
                                                                        </span>

                                                                        <strong>
                                                                            {formatMoney(
                                                                                match.bet_amount ??
                                                                                    match.bet ??
                                                                                    match.stake ??
                                                                                    0
                                                                            )}{" "}
                                                                            CDF
                                                                        </strong>
                                                                    </div>

                                                                    <div className="home-active-players">
                                                                        <span>
                                                                            👤{" "}
                                                                            {
                                                                                match.creator_name
                                                                            }
                                                                        </span>

                                                                        {match.opponent_name && (
                                                                            <span>
                                                                                ⚔️{" "}
                                                                                {
                                                                                    match.opponent_name
                                                                                }
                                                                            </span>
                                                                        )}
                                                                    </div>

                                                                    <div
                                                                        className={`home-status-pill ${
                                                                            isWaiting
                                                                                ? "waiting"
                                                                                : "ready"
                                                                        }`}
                                                                    >
                                                                        <span />
                                                                        {isWaiting
                                                                            ? "EN ATTENTE"
                                                                            : "PRÊT À JOUER"}
                                                                    </div>

                                                                    {isWaiting ? (
                                                                        <button
                                                                            type="button"
                                                                            className="home-action-button home-action-disabled"
                                                                            disabled
                                                                        >
                                                                            ⏳ En attente
                                                                        </button>
                                                                    ) : (
                                                                        <button
                                                                            type="button"
                                                                            className="home-action-button"
                                                                            onClick={() =>
                                                                                goToGame(
                                                                                    match
                                                                                )
                                                                            }
                                                                        >
                                                                            ▶ Reprendre
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </article>
                                                        );
                                                    }
                                                )}
                                            </div>
                                        )}
                                    </section>
                                );
                            }

                            // ==================================================
                            // OPEN CHALLENGES
                            // ==================================================

                            if (
                                section.type ===
                                "openChallenges"
                            ) {
                                return (
                                    <section
                                        className="home-section"
                                        key={`section-${index}`}
                                    >
                                        <SectionTitle
                                            icon="🔥"
                                            title="Défis disponibles"
                                            subtitle="Rejoignez rapidement une partie ouverte."
                                        />

                                        {openChallenges.length ===
                                        0 ? (
                                            <div className="home-empty home-empty-compact">
                                                <div className="home-empty-icon">
                                                    🔥
                                                </div>

                                                <strong>
                                                    Aucun défi disponible
                                                </strong>

                                                <span>
                                                    Les nouveaux défis
                                                    apparaîtront ici en
                                                    temps réel.
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="home-horizontal-list">
                                                {openChallenges.map(
                                                    (
                                                        match
                                                    ) => {
                                                        const gameId =
                                                            normalizeGameId(
                                                                match.game ||
                                                                    match.game_type
                                                            );

                                                        const game =
                                                            getGameMeta(
                                                                gameId
                                                            );

                                                        return (
                                                            <article
                                                                className="home-challenge-card"
                                                                key={
                                                                    match.id
                                                                }
                                                            >
                                                                <div className="home-challenge-image">
                                                                    <GameImage
                                                                        game={
                                                                            game
                                                                        }
                                                                    />
                                                                </div>

                                                                <div className="home-challenge-content">
                                                                    <div className="home-game-mini-badge">
                                                                        <span>
                                                                            {
                                                                                game.icon
                                                                            }
                                                                        </span>

                                                                        {
                                                                            game.name
                                                                        }
                                                                    </div>

                                                                    <div className="home-challenge-title">
                                                                        Match
                                                                        disponible
                                                                    </div>

                                                                    <div className="home-challenge-player">
                                                                        👤{" "}
                                                                        {match.creator_name ||
                                                                            "Joueur"}
                                                                    </div>

                                                                    <div className="home-challenge-bottom">
                                                                        <strong>
                                                                            💰{" "}
                                                                            {formatMoney(
                                                                                match.bet
                                                                            )}{" "}
                                                                            CDF
                                                                        </strong>

                                                                        <button
                                                                            type="button"
                                                                            className="home-join-button"
                                                                            onClick={() =>
                                                                                joinMatchById(
                                                                                    match
                                                                                )
                                                                            }
                                                                        >
                                                                            Rejoindre
                                                                            →
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </article>
                                                        );
                                                    }
                                                )}
                                            </div>
                                        )}
                                    </section>
                                );
                            }

                            // ==================================================
                            // GAMES
                            // ==================================================

                            if (
                                section.type ===
                                "games"
                            ) {
                                return (
                                    <section
                                        className="home-section home-games-section"
                                        key={`section-${index}`}
                                    >
                                        <SectionTitle
                                            icon="🎲"
                                            title="L'arène 6BetBall"
                                            subtitle="Choisissez votre univers de jeu."
                                        />

                                        {/* ==================================================
                                            CASINO — TOUJOURS AU-DESSUS
                                        ================================================== */}

                                        <div className="home-casino-zone">
                                            <div className="home-casino-header">
                                                <div>
                                                    <div className="home-casino-kicker">
                                                        <span />
                                                        ESPACE CASINO
                                                    </div>

                                                    <h2>
                                                        Casino
                                                    </h2>

                                                    <p>
                                                        Divertissement,
                                                        jeux et expériences
                                                        exclusives.
                                                    </p>
                                                </div>

                                                <button
                                                    type="button"
                                                    className="home-casino-recharge"
                                                    onClick={
                                                        handleRecharge
                                                    }
                                                >
                                                    <span>
                                                        💰
                                                    </span>

                                                    Recharger
                                                </button>
                                            </div>

                                            <div className="home-casino-container">
                                                <Casino />
                                            </div>
                                        </div>

                                        {/* ==================================================
                                            AUTRES JEUX
                                        ================================================== */}

                                        <div className="home-games-header">
                                            <div>
                                                <span className="home-games-kicker">
                                                    JEUX COMPÉTITIFS
                                                </span>

                                                <h2>
                                                    Entrez dans
                                                    l'arène
                                                </h2>
                                            </div>

                                            <span className="home-games-count">
                                                {
                                                    stats.games
                                                }{" "}
                                                jeux actifs
                                            </span>
                                        </div>

                                        <div className="home-games-grid">
                                            {games.map(
                                                (
                                                    game
                                                ) => {
                                                    const disabled =
                                                        !game.available;

                                                    return (
                                                        <article
                                                            key={
                                                                game.id
                                                            }
                                                            className={`home-game-card ${
                                                                disabled
                                                                    ? "is-disabled"
                                                                    : ""
                                                            } ${
                                                                game.directLobby
                                                                    ? "is-direct-lobby"
                                                                    : ""
                                                            }`}
                                                        >
                                                            {/* IMAGE */}
                                                            <div className="home-game-visual">
                                                                <GameImage
                                                                    game={
                                                                        game
                                                                    }
                                                                />

                                                                <div className="home-game-visual-gradient" />

                                                                <div className="home-game-topline">
                                                                    <span className="home-game-status">
                                                                        {disabled
                                                                            ? "BIENTÔT"
                                                                            : "DISPONIBLE"}
                                                                    </span>

                                                                    <span className="home-game-difficulty">
                                                                        {
                                                                            game.difficulty
                                                                        }
                                                                    </span>
                                                                </div>

                                                                <div className="home-game-icon-floating">
                                                                    {
                                                                        game.icon
                                                                    }
                                                                </div>
                                                            </div>

                                                            {/* BODY */}
                                                            <div className="home-game-body">
                                                                <div className="home-game-heading">
                                                                    <div>
                                                                        <h3>
                                                                            {
                                                                                game.name
                                                                            }
                                                                        </h3>

                                                                        <p>
                                                                            {
                                                                                game.description
                                                                            }
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                <div className="home-game-meta">
                                                                    <span>
                                                                        👥{" "}
                                                                        {
                                                                            game.players
                                                                        }
                                                                    </span>

                                                                    {game.directLobby && (
                                                                        <span>
                                                                            🏟️ Lobby
                                                                        </span>
                                                                    )}

                                                                    {!game.directLobby &&
                                                                        game.available && (
                                                                            <span>
                                                                                ⚡ SAC
                                                                            </span>
                                                                        )}
                                                                </div>

                                                                {/* ==================================================
                                                                    JEU INDISPONIBLE
                                                                ================================================== */}

                                                                {disabled ? (
                                                                    <div className="home-game-disabled">
                                                                        <span>
                                                                            🔒
                                                                        </span>

                                                                        <p>
                                                                            Ce jeu
                                                                            sera
                                                                            disponible
                                                                            prochainement
                                                                            sur
                                                                            6BetBall.
                                                                        </p>

                                                                        <button
                                                                            type="button"
                                                                            disabled
                                                                        >
                                                                            Bientôt
                                                                            disponible
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <>
                                                                        {/* ==================================================
                                                                            BRAVMAN / FOOTBALL
                                                                            = BOUTON DIRECT UNIQUEMENT
                                                                        ================================================== */}

                                                                        {game.directLobby ? (
                                                                            <div className="home-direct-lobby">
                                                                                <div className="home-direct-info">
                                                                                    <span>
                                                                                        🏟️
                                                                                    </span>

                                                                                    <div>
                                                                                        <strong>
                                                                                            Lobby
                                                                                            intégré
                                                                                        </strong>

                                                                                        <small>
                                                                                            Mise
                                                                                            et
                                                                                            matchmaking
                                                                                            dans
                                                                                            le
                                                                                            jeu
                                                                                        </small>
                                                                                    </div>
                                                                                </div>

                                                                                <button
                                                                                    type="button"
                                                                                    className="home-launch-button home-launch-direct"
                                                                                    onClick={() =>
                                                                                        openDirectLobby(
                                                                                            game.id
                                                                                        )
                                                                                    }
                                                                                >
                                                                                    {game.actionLabel}

                                                                                    <span>
                                                                                        →
                                                                                    </span>
                                                                                </button>
                                                                            </div>
                                                                        ) : (
                                                                            <>
                                                                                {/* ==================================================
                                                                                    MISE + MODE
                                                                                    UNIQUEMENT LUDO / DAMES
                                                                                ================================================== */}

                                                                                <div className="home-game-form">
                                                                                    <div className="home-input-group">
                                                                                        <label>
                                                                                            💰
                                                                                            Mise
                                                                                        </label>

                                                                                        <div className="home-input-wrap">
                                                                                            <input
                                                                                                type="number"
                                                                                                min={
                                                                                                    game.id ===
                                                                                                    "ludo"
                                                                                                        ? 500
                                                                                                        : MIN_BET
                                                                                                }
                                                                                                placeholder={
                                                                                                    game.id ===
                                                                                                    "ludo"
                                                                                                        ? "Min. 500"
                                                                                                        : `Min. ${MIN_BET}`
                                                                                                }
                                                                                                value={getAmount(
                                                                                                    game.id
                                                                                                )}
                                                                                                onChange={(
                                                                                                    event
                                                                                                ) =>
                                                                                                    updateInput(
                                                                                                        game.id,
                                                                                                        "amount",
                                                                                                        event
                                                                                                            .target
                                                                                                            .value
                                                                                                    )
                                                                                                }
                                                                                            />

                                                                                            <span>
                                                                                                CDF
                                                                                            </span>
                                                                                        </div>
                                                                                    </div>

                                                                                    <div className="home-input-group">
                                                                                        <label>
                                                                                            🎮
                                                                                            Mode
                                                                                        </label>

                                                                                        <select
                                                                                            value={getMode(
                                                                                                game.id
                                                                                            )}
                                                                                            onChange={(
                                                                                                event
                                                                                            ) =>
                                                                                                updateInput(
                                                                                                    game.id,
                                                                                                    "mode",
                                                                                                    event
                                                                                                        .target
                                                                                                        .value
                                                                                                )
                                                                                            }
                                                                                        >
                                                                                            <option value="user">
                                                                                                👤
                                                                                                VS
                                                                                                Joueur
                                                                                            </option>

                                                                                            <option value="ai">
                                                                                                ⚡
                                                                                                Match
                                                                                                Direct
                                                                                            </option>

                                                                                            <option value="training">
                                                                                                🎯
                                                                                                Match
                                                                                                Gratuit
                                                                                            </option>

                                                                                            {game.id ===
                                                                                                "dames" && (
                                                                                                <option value="jo">
                                                                                                    🧑‍💼
                                                                                                    Via
                                                                                                    JO
                                                                                                </option>
                                                                                            )}
                                                                                        </select>
                                                                                    </div>
                                                                                </div>

                                                                                {getMode(
                                                                                    game.id
                                                                                ) ===
                                                                                    "jo" && (
                                                                                    <div className="home-input-group home-jo-field">
                                                                                        <label>
                                                                                            🧑‍💼
                                                                                            ID
                                                                                            du
                                                                                            JO
                                                                                        </label>

                                                                                        <input
                                                                                            type="text"
                                                                                            placeholder="Entrer l'ID du JO"
                                                                                            value={getJoId(
                                                                                                game.id
                                                                                            )}
                                                                                            onChange={(
                                                                                                event
                                                                                            ) =>
                                                                                                updateInput(
                                                                                                    game.id,
                                                                                                    "joId",
                                                                                                    event
                                                                                                        .target
                                                                                                        .value
                                                                                                )
                                                                                            }
                                                                                        />
                                                                                    </div>
                                                                                )}

                                                                                <button
                                                                                    type="button"
                                                                                    className="home-launch-button"
                                                                                    onClick={() =>
                                                                                        handleCreateChallenge(
                                                                                            game.id
                                                                                        )
                                                                                    }
                                                                                >
                                                                                    <span>
                                                                                        {game.id ===
                                                                                        "ludo"
                                                                                            ? "🎲"
                                                                                            : "🎯"}
                                                                                    </span>

                                                                                    {
                                                                                        game.actionLabel
                                                                                    }

                                                                                    <span className="home-launch-arrow">
                                                                                        →
                                                                                    </span>
                                                                                </button>
                                                                            </>
                                                                        )}
                                                                    </>
                                                                )}
                                                            </div>
                                                        </article>
                                                    );
                                                }
                                            )}
                                        </div>
                                    </section>
                                );
                            }

                            return null;
                        }
                    )}

                    {/* ==================================================
                        FOOTER
                    ================================================== */}

                    <footer className="home-footer">
                        <div className="home-footer-brand">
                            <strong>
                                6BETBALL
                            </strong>

                            <span>
                                © 2026
                            </span>
                        </div>

                        <p>
                            Un Système d'Arbitrage
                            Centralisé Authentique,
                            Honnête et Sûr.
                        </p>

                        <div className="home-footer-line" />

                        <span className="home-footer-status">
                            ● Plateforme opérationnelle
                        </span>
                    </footer>
                </main>
            </div>
        </div>
    );
}

// ============================================================
// GAME IMAGE
// ============================================================

function GameImage({
    game,
}) {
    const candidates =
        Array.isArray(
            game?.imageCandidates
        )
            ? game.imageCandidates
            : [];

    const [index, setIndex] =
        useState(0);

    const source =
        candidates[index];

    const handleError = () => {
        if (
            index <
            candidates.length - 1
        ) {
            setIndex(
                (previous) =>
                    previous + 1
            );
        }
    };

    if (!source) {
        return (
            <div className="home-game-image-fallback">
                <span>
                    {game?.icon ||
                        "🎮"}
                </span>
            </div>
        );
    }

    return (
        <img
            src={source}
            alt={
                game?.name ||
                "Jeu 6BetBall"
            }
            className="home-game-image"
            onError={
                handleError
            }
        />
    );
}

// ============================================================
// STAT CARD
// ============================================================

function StatCard({
    value,
    label,
    icon,
}) {
    return (
        <div className="home-stat-card">
            <div className="home-stat-icon">
                {icon}
            </div>

            <div className="home-stat-data">
                <strong>
                    {value}
                </strong>

                <span>
                    {label}
                </span>
            </div>

            <div className="home-stat-arrow">
                ↗
            </div>
        </div>
    );
}

// ============================================================
// SECTION TITLE
// ============================================================

function SectionTitle({
    icon,
    title,
    subtitle,
}) {
    return (
        <div className="home-section-title">
            <div className="home-section-icon">
                {icon}
            </div>

            <div>
                <div className="home-section-kicker">
                    6BETBALL
                </div>

                <h2>
                    {title}
                </h2>

                {subtitle && (
                    <p>
                        {subtitle}
                    </p>
                )}
            </div>
        </div>
    );
}
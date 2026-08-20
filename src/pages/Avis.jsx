// ==========================================================
// AVIS
// Page centrale des avis 6BetBall
//
// Compatible avec :
// Football / BraVMan / Ludo / Checkers / etc.
// ==========================================================

import React, {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import api from "../services/api";

import "./Avis.css";


// ==========================================================
// CONSTANTES
// ==========================================================

const GAMES = [
    {
        value: "all",
        label: "Tous les jeux",
    },
    {
        value: "football",
        label: "Football",
    },
    {
        value: "bravman",
        label: "BraVMan",
    },
    {
        value: "ludo",
        label: "Ludo",
    },
    {
        value: "checkers",
        label: "Checkers",
    },
];

const PAGE_SIZE = 10;


// ==========================================================
// UTILITAIRES
// ==========================================================

function normalizeGame(game) {
    if (!game) {
        return "";
    }

    return String(game)
        .trim()
        .toLowerCase();
}


function getGameLabel(game) {
    const normalized = normalizeGame(game);

    const found = GAMES.find(
        (item) => item.value === normalized
    );

    if (found) {
        return found.label;
    }

    if (!normalized) {
        return "Jeu";
    }

    return normalized
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (letter) =>
            letter.toUpperCase()
        );
}


function getUserDisplayName(avis) {
    if (!avis) {
        return "Joueur";
    }

    return (
        avis.username ||
        avis.user_name ||
        avis.display_name ||
        avis.user?.username ||
        avis.user?.name ||
        avis.playerName ||
        avis.player_name ||
        `Joueur #${avis.user_id || "?"}`
    );
}


function getUserAvatar(avis) {
    if (!avis) {
        return null;
    }

    return (
        avis.avatar ||
        avis.avatar_url ||
        avis.user?.avatar ||
        avis.user?.avatar_url ||
        null
    );
}


function getRating(avis) {
    const rating = Number(avis?.rating);

    if (!Number.isFinite(rating)) {
        return 0;
    }

    return Math.min(
        5,
        Math.max(0, Math.round(rating))
    );
}


function getUsefulCount(avis) {
    const count = Number(
        avis?.useful_count ??
        avis?.helpful_count ??
        avis?.useful ??
        avis?.helpful ??
        0
    );

    return Number.isFinite(count)
        ? count
        : 0;
}


function getIsUseful(avis) {
    return Boolean(
        avis?.is_useful ??
        avis?.has_marked_useful ??
        avis?.user_found_useful ??
        avis?.useful_by_me ??
        false
    );
}


function formatDate(date) {
    if (!date) {
        return "";
    }

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
        return "";
    }

    return new Intl.DateTimeFormat(
        "fr-FR",
        {
            day: "numeric",
            month: "short",
            year: "numeric",
        }
    ).format(parsed);
}


// ==========================================================
// ETOILES
// ==========================================================

function RatingStars({
    rating = 0,
    interactive = false,
    value = null,
    onChange = null,
    size = "normal",
}) {
    const currentValue =
        interactive && value !== null
            ? value
            : rating;

    return (
        <div
            className={`avis-stars avis-stars-${size}`}
            aria-label={
                interactive
                    ? `Choisir une note de ${currentValue} sur 5`
                    : `Note de ${rating} sur 5`
            }
        >
            {[1, 2, 3, 4, 5].map((star) => {
                const active =
                    star <= currentValue;

                if (!interactive) {
                    return (
                        <span
                            key={star}
                            className={
                                active
                                    ? "avis-star active"
                                    : "avis-star"
                            }
                            aria-hidden="true"
                        >
                            ★
                        </span>
                    );
                }

                return (
                    <button
                        key={star}
                        type="button"
                        className={
                            active
                                ? "avis-star-button active"
                                : "avis-star-button"
                        }
                        onClick={() => {
                            if (onChange) {
                                onChange(star);
                            }
                        }}
                        aria-label={`${star} étoile${
                            star > 1 ? "s" : ""
                        }`}
                    >
                        ★
                    </button>
                );
            })}
        </div>
    );
}


// ==========================================================
// CARTE D'AVIS
// ==========================================================

function AvisCard({
    avis,
    currentUserId,
    isAdmin,
    onUseful,
    onDelete,
    usefulLoading,
    deleteLoading,
}) {
    const rating = getRating(avis);

    const usefulCount =
        getUsefulCount(avis);

    const alreadyUseful =
        getIsUseful(avis);

    const userId =
        avis?.user_id ??
        avis?.userId ??
        avis?.user?.id;

    const isOwner =
        currentUserId &&
        userId &&
        String(currentUserId) ===
            String(userId);

    const displayName =
        getUserDisplayName(avis);

    const avatar =
        getUserAvatar(avis);

    const game =
        getGameLabel(avis?.game);

    const comment =
        avis?.comment ||
        avis?.impression ||
        avis?.text ||
        "";

    const matchId =
        avis?.match_id ??
        avis?.matchId ??
        null;

    const createdAt =
        avis?.created_at ??
        avis?.createdAt;

    return (
        <article
            className="avis-card"
            data-avis-id={avis?.id}
        >

            {/* ==================================================
                HEADER
            ================================================== */}

            <div className="avis-card-header">

                <div className="avis-user">

                    <div className="avis-avatar">

                        {avatar ? (
                            <img
                                src={avatar}
                                alt={displayName}
                                loading="lazy"
                            />
                        ) : (
                            <span>
                                {displayName
                                    .charAt(0)
                                    .toUpperCase()}
                            </span>
                        )}

                    </div>


                    <div className="avis-user-info">

                        <strong className="avis-user-name">
                            {displayName}
                        </strong>

                        <div className="avis-meta">

                            <span className="avis-game">
                                {game}
                            </span>

                            {matchId && (
                                <>
                                    <span className="avis-meta-separator">
                                        •
                                    </span>

                                    <span>
                                        Partie #{matchId}
                                    </span>
                                </>
                            )}

                            {createdAt && (
                                <>
                                    <span className="avis-meta-separator">
                                        •
                                    </span>

                                    <time
                                        dateTime={
                                            createdAt
                                        }
                                    >
                                        {formatDate(
                                            createdAt
                                        )}
                                    </time>
                                </>
                            )}

                        </div>

                    </div>

                </div>


                {/* ==================================================
                    NOTE
                ================================================== */}

                <div className="avis-rating">

                    <RatingStars
                        rating={rating}
                        size="small"
                    />

                    <span className="avis-rating-number">
                        {rating}/5
                    </span>

                </div>

            </div>


            {/* ==================================================
                IMPRESSION
            ================================================== */}

            {comment ? (
                <p className="avis-comment">
                    {comment}
                </p>
            ) : (
                <p className="avis-comment avis-comment-empty">
                    Aucun commentaire écrit.
                </p>
            )}


            {/* ==================================================
                FOOTER
            ================================================== */}

            <div className="avis-card-footer">

                <button
                    type="button"
                    className={
                        alreadyUseful
                            ? "avis-useful-button active"
                            : "avis-useful-button"
                    }
                    onClick={() => {
                        if (onUseful) {
                            onUseful(avis);
                        }
                    }}
                    disabled={
                        usefulLoading === avis?.id
                    }
                    aria-pressed={
                        alreadyUseful
                    }
                >

                    <span
                        className="avis-useful-icon"
                        aria-hidden="true"
                    >
                        {alreadyUseful
                            ? "✓"
                            : "👍"}
                    </span>

                    <span>
                        Utile
                    </span>

                    {usefulCount > 0 && (
                        <span className="avis-useful-count">
                            {usefulCount}
                        </span>
                    )}

                </button>


                <div className="avis-card-actions">

                    {/* --------------------------------------------------
                        L'administrateur peut supprimer.
                        Le backend reste la vraie sécurité.
                    -------------------------------------------------- */}

                    {isAdmin && (
                        <button
                            type="button"
                            className="avis-delete-button"
                            onClick={() => {
                                if (onDelete) {
                                    onDelete(avis);
                                }
                            }}
                            disabled={
                                deleteLoading === avis?.id
                            }
                        >
                            {deleteLoading ===
                            avis?.id
                                ? "Suppression..."
                                : "Supprimer"}
                        </button>
                    )}

                    {isOwner && !isAdmin && (
                        <span className="avis-owner-label">
                            Votre avis
                        </span>
                    )}

                </div>

            </div>

        </article>
    );
}


// ==========================================================
// COMPOSANT PRINCIPAL
// ==========================================================

export default function Avis() {

    // ========================================================
    // ETATS
    // ========================================================

    const [avis, setAvis] =
        useState([]);

    const [selectedGame, setSelectedGame] =
        useState("all");

    const [loading, setLoading] =
        useState(true);

    const [refreshing, setRefreshing] =
        useState(false);

    const [error, setError] =
        useState("");

    const [page, setPage] =
        useState(1);

    const [stats, setStats] =
        useState(null);

    const [statsLoading, setStatsLoading] =
        useState(false);

    const [usefulLoading, setUsefulLoading] =
        useState(null);

    const [deleteLoading, setDeleteLoading] =
        useState(null);

    const [successMessage, setSuccessMessage] =
        useState("");

    // --------------------------------------------------------
    // Utilisateur
    // --------------------------------------------------------

    const [currentUser, setCurrentUser] =
        useState(null);


    // ========================================================
    // FORMULAIRE NOUVEL AVIS
    // ========================================================

    const [showForm, setShowForm] =
        useState(false);

    const [formGame, setFormGame] =
        useState("bravman");

    const [formRating, setFormRating] =
        useState(5);

    const [formComment, setFormComment] =
        useState("");

    const [submitting, setSubmitting] =
        useState(false);

    const [formError, setFormError] =
        useState("");


    // ========================================================
    // RECUPERATION UTILISATEUR
    // ========================================================

    useEffect(() => {

        try {

            const storedUser =
                localStorage.getItem(
                    "user"
                );

            if (storedUser) {

                const parsed =
                    JSON.parse(
                        storedUser
                    );

                setCurrentUser(
                    parsed
                );

                return;
            }

            const token =
                localStorage.getItem(
                    "token"
                );

            if (!token) {
                return;
            }

            const payload =
                token.split(".")[1];

            if (!payload) {
                return;
            }

            const decoded =
                JSON.parse(
                    atob(
                        payload
                            .replace(/-/g, "+")
                            .replace(/_/g, "/")
                    )
                );

            setCurrentUser(
                decoded
            );

        } catch (err) {

            console.warn(
                "Impossible de récupérer l'utilisateur courant:",
                err
            );

        }

    }, []);


    // ========================================================
    // IDENTIFIANT UTILISATEUR
    // ========================================================

    const currentUserId =
        currentUser?.id ??
        currentUser?.userId ??
        currentUser?.user_id ??
        currentUser?.sub ??
        null;


    // ========================================================
    // ADMIN
    // ========================================================

    const isAdmin = useMemo(() => {

        if (!currentUser) {
            return false;
        }

        const role =
            currentUser.role ??
            currentUser.user_role ??
            currentUser.type ??
            currentUser.user?.role;

        return (
            role === "admin" ||
            role === "administrator" ||
            role === "ADMIN" ||
            role === "ADMINISTRATOR" ||
            currentUser.isAdmin === true ||
            currentUser.is_admin === true
        );

    }, [currentUser]);


    // ========================================================
    // CHARGER LES AVIS
    // ========================================================

    const loadAvis = useCallback(
        async ({
            silent = false,
            game = selectedGame,
        } = {}) => {

            try {

                if (silent) {
                    setRefreshing(true);
                } else {
                    setLoading(true);
                }

                setError("");

                const params = {};

                if (
                    game &&
                    game !== "all"
                ) {
                    params.game = game;
                }

                params.limit =
                    PAGE_SIZE;

                params.offset =
                    (page - 1) *
                    PAGE_SIZE;


                const response =
                    await api.get(
                        "/avis",
                        {
                            params,
                        }
                    );


                const data =
                    response?.data;


                const receivedAvis =
                    data?.avis ??
                    data?.data ??
                    [];


                setAvis(
                    Array.isArray(
                        receivedAvis
                    )
                        ? receivedAvis
                        : []
                );

            } catch (err) {

                console.error(
                    "AVIS LOAD ERROR:",
                    err
                );

                setError(
                    err?.response?.data?.message ||
                    err?.response?.data?.error ||
                    "Impossible de charger les avis."
                );

            } finally {

                setLoading(false);
                setRefreshing(false);

            }

        },
        [selectedGame, page]
    );


    // ========================================================
    // CHARGEMENT INITIAL / FILTRE / PAGE
    // ========================================================

    useEffect(() => {

        loadAvis();

    }, [loadAvis]);


    // ========================================================
    // CHARGER LES STATISTIQUES
    // ========================================================

    const loadStats =
        useCallback(
            async (game) => {

                try {

                    setStatsLoading(
                        true
                    );

                    if (
                        !game ||
                        game === "all"
                    ) {

                        setStats(null);

                        return;
                    }

                    const response =
                        await api.get(
                            `/avis/game/${encodeURIComponent(
                                game
                            )}/stats`
                        );

                    const data =
                        response?.data;

                    setStats(
                        data?.stats ??
                        data?.data ??
                        null
                    );

                } catch (err) {

                    console.error(
                        "AVIS STATS ERROR:",
                        err
                    );

                    setStats(
                        null
                    );

                } finally {

                    setStatsLoading(
                        false
                    );

                }

            },
            []
        );


    useEffect(() => {

        loadStats(
            selectedGame
        );

    }, [
        selectedGame,
        loadStats,
    ]);


    // ========================================================
    // CHANGEMENT DE JEU
    // ========================================================

    const handleGameChange =
        (game) => {

            setSelectedGame(
                game
            );

            setPage(1);

        };


    // ========================================================
    // RAFRAICHIR
    // ========================================================

    const handleRefresh =
        async () => {

            await loadAvis({
                silent: true,
            });

            if (
                selectedGame !==
                "all"
            ) {
                await loadStats(
                    selectedGame
                );
            }

        };


    // ========================================================
    // MARQUER "UTILE"
    //
    // Endpoint préparé pour le backend :
    //
    // POST /api/avis/:id/useful
    //
    // Le controller/service pourra ensuite :
    // - créer le vote ;
    // - retirer le vote si déjà présent ;
    // - retourner usefulCount ;
    // - retourner isUseful.
    // ========================================================

    const handleUseful =
        async (item) => {

            if (!item?.id) {
                return;
            }

            if (!currentUserId) {

                setError(
                    "Connectez-vous pour indiquer qu'un avis est utile."
                );

                return;
            }

            try {

                setUsefulLoading(
                    item.id
                );

                setError("");


                const response =
                    await api.post(
                        `/avis/${item.id}/useful`
                    );


                const data =
                    response?.data;


                const updated =
                    data?.avis ??
                    data?.data ??
                    data;


                setAvis(
                    (previous) =>
                        previous.map(
                            (current) => {

                                if (
                                    String(
                                        current.id
                                    ) !==
                                    String(
                                        item.id
                                    )
                                ) {
                                    return current;
                                }

                                return {
                                    ...current,

                                    ...(updated ||
                                        {}),

                                    useful_count:
                                        updated?.useful_count ??
                                        updated?.usefulCount ??
                                        current.useful_count ??
                                        current.usefulCount ??
                                        0,

                                    is_useful:
                                        updated?.is_useful ??
                                        updated?.isUseful ??
                                        !getIsUseful(
                                            current
                                        ),
                                };

                            }
                        )
                );

            } catch (err) {

                console.error(
                    "AVIS USEFUL ERROR:",
                    err
                );

                setError(
                    err?.response?.data?.message ||
                    "Impossible d'enregistrer votre vote."
                );

            } finally {

                setUsefulLoading(
                    null
                );

            }

        };


    // ========================================================
    // SUPPRESSION
    // ========================================================

    const handleDelete =
        async (item) => {

            if (!item?.id) {
                return;
            }

            if (!isAdmin) {
                return;
            }


            const confirmed =
                window.confirm(
                    "Voulez-vous vraiment supprimer cet avis ?"
                );

            if (!confirmed) {
                return;
            }


            try {

                setDeleteLoading(
                    item.id
                );

                setError("");


                await api.delete(
                    `/avis/${item.id}`
                );


                setAvis(
                    (previous) =>
                        previous.filter(
                            (current) =>
                                String(
                                    current.id
                                ) !==
                                String(
                                    item.id
                                )
                        )
                );


                setSuccessMessage(
                    "Avis supprimé avec succès."
                );


                setTimeout(() => {

                    setSuccessMessage(
                        ""
                    );

                }, 3000);


                if (
                    selectedGame !==
                    "all"
                ) {
                    await loadStats(
                        selectedGame
                    );
                }

            } catch (err) {

                console.error(
                    "AVIS DELETE ERROR:",
                    err
                );

                setError(
                    err?.response?.data?.message ||
                    "Impossible de supprimer cet avis."
                );

            } finally {

                setDeleteLoading(
                    null
                );

            }

        };


    // ========================================================
    // OUVRIR FORMULAIRE
    // ========================================================

    const openForm =
        () => {

            setFormError("");

            setFormRating(5);

            setFormComment("");

            if (
                selectedGame !==
                "all"
            ) {
                setFormGame(
                    selectedGame
                );
            }

            setShowForm(
                true
            );

        };


    // ========================================================
    // FERMER FORMULAIRE
    // ========================================================

    const closeForm =
        () => {

            if (submitting) {
                return;
            }

            setShowForm(
                false
            );

            setFormError("");

        };


    // ========================================================
    // ENVOYER AVIS
    // ========================================================

    const handleSubmit =
        async (event) => {

            event.preventDefault();

            if (submitting) {
                return;
            }


            if (!currentUserId) {

                setFormError(
                    "Vous devez être connecté pour publier un avis."
                );

                return;
            }


            if (!formGame) {

                setFormError(
                    "Veuillez sélectionner un jeu."
                );

                return;
            }


            if (
                formRating < 1 ||
                formRating > 5
            ) {

                setFormError(
                    "Veuillez choisir une note entre 1 et 5."
                );

                return;
            }


            const cleanComment =
                formComment.trim();


            if (
                cleanComment.length >
                2000
            ) {

                setFormError(
                    "Votre impression ne peut pas dépasser 2000 caractères."
                );

                return;
            }


            try {

                setSubmitting(
                    true
                );

                setFormError("");

                setError("");


                await api.post(
                    "/avis",
                    {
                        game:
                            formGame,

                        rating:
                            formRating,

                        comment:
                            cleanComment ||
                            null,

                        context:
                            "general",
                    }
                );


                setShowForm(
                    false
                );

                setFormComment("");

                setFormRating(5);


                setSuccessMessage(
                    "Merci pour votre avis !"
                );


                setTimeout(() => {

                    setSuccessMessage(
                        ""
                    );

                }, 4000);


                setPage(1);


                await loadAvis({
                    silent: true,
                    game: selectedGame,
                });


                if (
                    selectedGame !==
                    "all"
                ) {
                    await loadStats(
                        selectedGame
                    );
                }

            } catch (err) {

                console.error(
                    "AVIS CREATE ERROR:",
                    err
                );

                setFormError(
                    err?.response?.data?.message ||
                    err?.response?.data?.error ||
                    "Impossible d'enregistrer votre avis."
                );

            } finally {

                setSubmitting(
                    false
                );

            }

        };


    // ========================================================
    // STATISTIQUES VISUELLES
    // ========================================================

    const averageRating =
        Number(
            stats?.average_rating ??
            stats?.averageRating ??
            0
        );


    const totalReviews =
        Number(
            stats?.total ??
            stats?.count ??
            0
        );


    const ratingDistribution =
        [
            {
                value: 5,
                count:
                    Number(
                        stats?.rating_5 ??
                        stats?.rating5 ??
                        0
                    ),
            },
            {
                value: 4,
                count:
                    Number(
                        stats?.rating_4 ??
                        stats?.rating4 ??
                        0
                    ),
            },
            {
                value: 3,
                count:
                    Number(
                        stats?.rating_3 ??
                        stats?.rating3 ??
                        0
                    ),
            },
            {
                value: 2,
                count:
                    Number(
                        stats?.rating_2 ??
                        stats?.rating2 ??
                        0
                    ),
            },
            {
                value: 1,
                count:
                    Number(
                        stats?.rating_1 ??
                        stats?.rating1 ??
                        0
                    ),
            },
        ];


    // ========================================================
    // RENDU
    // ========================================================

    return (
        <main className="avis-page">

            {/* ==================================================
                HERO
            ================================================== */}

            <section className="avis-hero">

                <div className="avis-hero-content">

                    <span className="avis-eyebrow">
                        COMMUNAUTÉ 6BETBALL
                    </span>

                    <h1>
                        Les avis des joueurs
                    </h1>

                    <p>
                        Découvrez les impressions
                        de la communauté sur
                        les différents jeux de
                        6BetBall.
                    </p>

                </div>


                <button
                    type="button"
                    className="avis-write-button"
                    onClick={openForm}
                >
                    <span>
                        ★
                    </span>

                    Donner mon avis
                </button>

            </section>


            {/* ==================================================
                MESSAGE SUCCÈS
            ================================================== */}

            {successMessage && (
                <div
                    className="avis-success"
                    role="status"
                >
                    ✓ {successMessage}
                </div>
            )}


            {/* ==================================================
                MESSAGE ERREUR
            ================================================== */}

            {error && (
                <div
                    className="avis-error"
                    role="alert"
                >
                    <span>
                        {error}
                    </span>

                    <button
                        type="button"
                        onClick={() =>
                            setError("")
                        }
                    >
                        ×
                    </button>
                </div>
            )}


            {/* ==================================================
                FILTRES
            ================================================== */}

            <section className="avis-filters-section">

                <div className="avis-game-tabs">

                    {GAMES.map(
                        (game) => (

                            <button
                                key={
                                    game.value
                                }
                                type="button"
                                className={
                                    selectedGame ===
                                    game.value
                                        ? "avis-game-tab active"
                                        : "avis-game-tab"
                                }
                                onClick={() =>
                                    handleGameChange(
                                        game.value
                                    )
                                }
                            >
                                {game.label}
                            </button>

                        )
                    )}

                </div>


                <button
                    type="button"
                    className="avis-refresh-button"
                    onClick={
                        handleRefresh
                    }
                    disabled={
                        refreshing
                    }
                    aria-label="Actualiser les avis"
                >
                    {refreshing
                        ? "..."
                        : "↻"}
                </button>

            </section>


            {/* ==================================================
                STATISTIQUES
            ================================================== */}

            {selectedGame !==
                "all" && (
                <section className="avis-stats">

                    <div className="avis-stats-main">

                        <div className="avis-average">

                            <strong>
                                {statsLoading
                                    ? "—"
                                    : averageRating.toFixed(
                                          1
                                      )}
                            </strong>

                            <RatingStars
                                rating={Math.round(
                                    averageRating
                                )}
                                size="normal"
                            />

                            <span>
                                {totalReviews}{" "}
                                avis
                            </span>

                        </div>


                        <div className="avis-distribution">

                            {ratingDistribution.map(
                                (item) => {

                                    const percentage =
                                        totalReviews >
                                        0
                                            ? Math.round(
                                                  (item.count /
                                                      totalReviews) *
                                                      100
                                              )
                                            : 0;

                                    return (
                                        <div
                                            key={
                                                item.value
                                            }
                                            className="avis-distribution-row"
                                        >

                                            <span>
                                                {
                                                    item.value
                                                }
                                                ★
                                            </span>

                                            <div className="avis-distribution-bar">

                                                <div
                                                    className="avis-distribution-fill"
                                                    style={{
                                                        width: `${percentage}%`,
                                                    }}
                                                />

                                            </div>

                                            <span>
                                                {
                                                    percentage
                                                }%
                                            </span>

                                        </div>
                                    );

                                }
                            )}

                        </div>

                    </div>

                </section>
            )}


            {/* ==================================================
                FORMULAIRE
            ================================================== */}

            {showForm && (
                <section className="avis-form-section">

                    <div className="avis-form-card">

                        <div className="avis-form-header">

                            <div>
                                <span className="avis-form-eyebrow">
                                    VOTRE IMPRESSION
                                </span>

                                <h2>
                                    Partagez votre expérience
                                </h2>
                            </div>

                            <button
                                type="button"
                                className="avis-close-button"
                                onClick={
                                    closeForm
                                }
                                disabled={
                                    submitting
                                }
                            >
                                ×
                            </button>

                        </div>


                        {formError && (
                            <div
                                className="avis-form-error"
                                role="alert"
                            >
                                {formError}
                            </div>
                        )}


                        <form
                            onSubmit={
                                handleSubmit
                            }
                        >

                            <div className="avis-form-grid">

                                <div className="avis-form-field">

                                    <label htmlFor="avis-game">
                                        Jeu
                                    </label>

                                    <select
                                        id="avis-game"
                                        value={
                                            formGame
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setFormGame(
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                        disabled={
                                            submitting
                                        }
                                    >

                                        {GAMES
                                            .filter(
                                                (
                                                    game
                                                ) =>
                                                    game.value !==
                                                    "all"
                                            )
                                            .map(
                                                (
                                                    game
                                                ) => (
                                                    <option
                                                        key={
                                                            game.value
                                                        }
                                                        value={
                                                            game.value
                                                        }
                                                    >
                                                        {
                                                            game.label
                                                        }
                                                    </option>
                                                )
                                            )}

                                    </select>

                                </div>


                                <div className="avis-form-field">

                                    <label>
                                        Votre note
                                    </label>

                                    <div className="avis-form-rating">

                                        <RatingStars
                                            interactive={
                                                true
                                            }
                                            value={
                                                formRating
                                            }
                                            onChange={
                                                setFormRating
                                            }
                                            size="large"
                                        />

                                        <strong>
                                            {
                                                formRating
                                            }{" "}
                                            / 5
                                        </strong>

                                    </div>

                                </div>

                            </div>


                            <div className="avis-form-field">

                                <label htmlFor="avis-comment">
                                    Votre impression
                                </label>

                                <textarea
                                    id="avis-comment"
                                    value={
                                        formComment
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setFormComment(
                                            event
                                                .target
                                                .value
                                        )
                                    }
                                    placeholder="Qu'avez-vous pensé de votre expérience ?"
                                    maxLength={
                                        2000
                                    }
                                    rows={5}
                                    disabled={
                                        submitting
                                    }
                                />

                                <div className="avis-character-count">
                                    {
                                        formComment.length
                                    }{" "}
                                    / 2000
                                </div>

                            </div>


                            <div className="avis-form-actions">

                                <button
                                    type="button"
                                    className="avis-form-cancel"
                                    onClick={
                                        closeForm
                                    }
                                    disabled={
                                        submitting
                                    }
                                >
                                    Annuler
                                </button>

                                <button
                                    type="submit"
                                    className="avis-form-submit"
                                    disabled={
                                        submitting
                                    }
                                >
                                    {submitting
                                        ? "Publication..."
                                        : "Publier mon avis"}
                                </button>

                            </div>

                        </form>

                    </div>

                </section>
            )}


            {/* ==================================================
                LISTE
            ================================================== */}

            <section className="avis-list-section">

                <div className="avis-list-header">

                    <div>

                        <span className="avis-list-eyebrow">
                            AVIS DES JOUEURS
                        </span>

                        <h2>
                            {selectedGame ===
                            "all"
                                ? "Toutes les impressions"
                                : `Avis ${getGameLabel(
                                      selectedGame
                                  )}`}
                        </h2>

                    </div>

                    <span className="avis-list-count">
                        {avis.length} avis
                    </span>

                </div>


                {/* ==================================================
                    LOADING
                ================================================== */}

                {loading && (
                    <div className="avis-loading">

                        <div className="avis-loader" />

                        <p>
                            Chargement des avis...
                        </p>

                    </div>
                )}


                {/* ==================================================
                    EMPTY
                ================================================== */}

                {!loading &&
                    avis.length ===
                        0 && (
                        <div className="avis-empty">

                            <div className="avis-empty-icon">
                                ★
                            </div>

                            <h3>
                                Aucun avis pour le moment
                            </h3>

                            <p>
                                Soyez le premier à
                                partager votre
                                expérience.
                            </p>

                            <button
                                type="button"
                                onClick={
                                    openForm
                                }
                            >
                                Donner mon avis
                            </button>

                        </div>
                    )}


                {/* ==================================================
                    AVIS
                ================================================== */}

                {!loading &&
                    avis.length > 0 && (
                        <div className="avis-list">

                            {avis.map(
                                (item) => (
                                    <AvisCard
                                        key={
                                            item.id
                                        }
                                        avis={
                                            item
                                        }
                                        currentUserId={
                                            currentUserId
                                        }
                                        isAdmin={
                                            isAdmin
                                        }
                                        onUseful={
                                            handleUseful
                                        }
                                        onDelete={
                                            handleDelete
                                        }
                                        usefulLoading={
                                            usefulLoading
                                        }
                                        deleteLoading={
                                            deleteLoading
                                        }
                                    />
                                )
                            )}

                        </div>
                    )}


                {/* ==================================================
                    PAGINATION
                ================================================== */}

                {!loading &&
                    avis.length > 0 && (
                        <div className="avis-pagination">

                            <button
                                type="button"
                                disabled={
                                    page <=
                                    1
                                }
                                onClick={() =>
                                    setPage(
                                        (current) =>
                                            Math.max(
                                                1,
                                                current -
                                                    1
                                            )
                                    )
                                }
                            >
                                ←
                                <span>
                                    Précédent
                                </span>
                            </button>


                            <span>
                                Page{" "}
                                <strong>
                                    {page}
                                </strong>
                            </span>


                            <button
                                type="button"
                                disabled={
                                    avis.length <
                                    PAGE_SIZE
                                }
                                onClick={() =>
                                    setPage(
                                        (current) =>
                                            current +
                                            1
                                    )
                                }
                            >
                                <span>
                                    Suivant
                                </span>
                                →
                            </button>

                        </div>
                    )}

            </section>

        </main>
    );
}
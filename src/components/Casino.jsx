import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState
} from 'react';

import './Casino.css';

import {
    createCasinoGame,
    getCasinoGame,
    spinCasinoGame,
    cancelCasinoGame
} from '../services/casinoSocket';


// ============================================================
// CONFIGURATION
// ============================================================

const MIN_STAKE = 200;
const SPIN_DURATION = 5000;

const CURRENCY = 'FC';


// ============================================================
// ROULETTE VISUELLE
// ============================================================
//
// IMPORTANT :
// Ces valeurs servent à l'affichage uniquement.
//
// Le serveur décide réellement du segment.
//
// L'ordre visuel peut être différent de l'ordre
// PostgreSQL : le moteur reste l'autorité.
//

const WHEEL_SEGMENTS = [
    {
        id: 'visual-300',
        amount: 300,
        label: '300',
        suffix: 'FC'
    },
    {
        id: 'visual-0',
        amount: 0,
        label: '0',
        suffix: 'FC'
    },
    {
        id: 'visual-2000000',
        amount: 2000000,
        label: '2 000 000',
        suffix: 'FC'
    },
    {
        id: 'visual-500',
        amount: 500,
        label: '500',
        suffix: 'FC'
    },
    {
        id: 'visual-600000',
        amount: 600000,
        label: '600 000',
        suffix: 'FC'
    },
    
    {
        id: 'visual-300000',
        amount: 300000,
        label: '300 000',
        suffix: 'FC'
    },
    {
        id: 'visual-200',
        amount: 200,
        label: '200',
        suffix: 'FC'
    },
    
];


// ============================================================
// HELPERS
// ============================================================

function formatAmount(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return '0';
    }

    return new Intl.NumberFormat('fr-FR').format(
        number
    );
}


function getResultAmount(result) {
    return Number(
        result?.settlement?.segmentAmount ??
        result?.result?.segment_amount ??
        result?.segmentAmount ??
        0
    );
}


function getPayout(result) {
    return Number(
        result?.settlement?.playerPayout ??
        result?.result?.payout_amount ??
        result?.payoutAmount ??
        0
    );
}


function getResultType(result) {
    return (
        result?.engine?.resultType ??
        result?.result?.result_type ??
        result?.resultType ??
        null
    );
}


function getRoundId(result) {
    return (
        result?.round?.id ??
        result?.bet?.round_id ??
        result?.roundId ??
        null
    );
}


function createLocalIdempotencyKey() {
    return [
        'CASINO',
        Date.now(),
        Math.random()
            .toString(36)
            .slice(2)
    ].join('_');
}


// ============================================================
// COMPONENT
// ============================================================

export default function Casino() {

    // --------------------------------------------------------
    // MISE
    // --------------------------------------------------------

    const [stakeInput, setStakeInput] =
        useState('');

    const [stake, setStake] =
        useState(null);


    // --------------------------------------------------------
    // ÉTAT DU JEU
    // --------------------------------------------------------

    const [status, setStatus] =
        useState('IDLE');

    const [roundId, setRoundId] =
        useState(null);

    const [result, setResult] =
        useState(null);

    const [error, setError] =
        useState('');

    const [countdown, setCountdown] =
        useState(0);


    // --------------------------------------------------------
    // ANIMATION
    // --------------------------------------------------------

    const [rotation, setRotation] =
        useState(0);

    const [selectedVisualIndex, setSelectedVisualIndex] =
        useState(null);


    // --------------------------------------------------------
    // HISTORIQUE LOCAL
    // --------------------------------------------------------

    const [history, setHistory] =
        useState([]);


    // --------------------------------------------------------
    // REFS
    // --------------------------------------------------------

    const countdownTimerRef =
        useRef(null);

    const spinTimerRef =
        useRef(null);

    const mountedRef =
        useRef(true);


    // ========================================================
    // CLEANUP
    // ========================================================

    useEffect(() => {
        return () => {
            mountedRef.current = false;

            if (countdownTimerRef.current) {
                clearInterval(
                    countdownTimerRef.current
                );
            }

            if (spinTimerRef.current) {
                clearTimeout(
                    spinTimerRef.current
                );
            }
        };
    }, []);


    // ========================================================
    // SEGMENT VISUEL CORRESPONDANT
    // ========================================================

    const findVisualIndex = useCallback(
        (amount) => {
            const numericAmount =
                Number(amount);

            return WHEEL_SEGMENTS.findIndex(
                segment =>
                    Number(segment.amount) ===
                    numericAmount
            );
        },
        []
    );


    // ========================================================
    // VALIDATION MISE
    // ========================================================

    const parsedStake = useMemo(() => {
        const value =
            Number(
                String(stakeInput)
                    .replace(/\s/g, '')
                    .replace(',', '.')
            );

        return Number.isFinite(value)
            ? value
            : 0;

    }, [stakeInput]);


    const isStakeValid =
        parsedStake >= MIN_STAKE;


    // ========================================================
    // CHANGEMENT MISE
    // ========================================================

    const handleStakeChange = (
        event
    ) => {

        const value =
            event.target.value;

        /**
         * On autorise uniquement les chiffres
         * et éventuellement un point.
         */
        if (
            value === '' ||
            /^\d*\.?\d*$/.test(value)
        ) {
            setStakeInput(value);
        }

        setError('');
    };


    // ========================================================
    // MISES RAPIDES
    // ========================================================

    const setQuickStake = (
        amount
    ) => {

        setStakeInput(
            String(amount)
        );

        setError('');
    };


    // ========================================================
    // ANIMATION VISUELLE
    // ========================================================

    const startWheelAnimation = useCallback(
        (targetIndex = null) => {

            const numberOfSegments =
                WHEEL_SEGMENTS.length;

            const segmentAngle =
                360 / numberOfSegments;

            /**
             * Plusieurs tours complets pour donner
             * une vraie impression de roulette.
             */
            const fullRotations =
                7 + Math.floor(
                    Math.random() * 4
                );

            const currentRotation =
                rotation;

            let finalRotation =
                currentRotation +
                fullRotations * 360;

            /**
             * Si le serveur a déjà fourni le résultat,
             * on termine visuellement sur la case
             * correspondante.
             *
             * Cela ne détermine absolument pas
             * le résultat : le serveur l'a déjà choisi.
             */
            if (
                targetIndex !== null &&
                targetIndex >= 0
            ) {
                const targetAngle =
                    targetIndex *
                    segmentAngle;

                finalRotation +=
                    360 -
                    targetAngle;
            }
            else {
                finalRotation +=
                    Math.floor(
                        Math.random() *
                        360
                    );
            }

            setRotation(
                finalRotation
            );
        },
        [rotation]
    );


    // ========================================================
    // COMPTE À REBOURS
    // ========================================================

    const startCountdown = useCallback(() => {

        setCountdown(5);

        let remaining = 5;

        countdownTimerRef.current =
            setInterval(() => {

                remaining -= 1;

                if (
                    remaining <= 0
                ) {
                    clearInterval(
                        countdownTimerRef.current
                    );

                    countdownTimerRef.current =
                        null;

                    setCountdown(0);

                    return;
                }

                setCountdown(
                    remaining
                );

            }, 1000);

    }, []);


    // ========================================================
    // LANCER UNE PARTIE
    // ========================================================

    const handleSpin = async () => {

        if (
            status === 'CREATING' ||
            status === 'SPINNING'
        ) {
            return;
        }

        setError('');
        setResult(null);
        setSelectedVisualIndex(null);


        // ----------------------------------------------------
        // VALIDATION
        // ----------------------------------------------------

        if (
            !Number.isFinite(parsedStake) ||
            parsedStake < MIN_STAKE
        ) {

            setError(
                `La mise minimum est de ${formatAmount(MIN_STAKE)} FC.`
            );

            return;
        }


        if (
            !Number.isInteger(parsedStake)
        ) {

            setError(
                'La mise doit être un nombre entier.'
            );

            return;
        }


        try {

            // ------------------------------------------------
            // CRÉATION DU TOUR
            // ------------------------------------------------

            setStatus('CREATING');

            setStake(
                parsedStake
            );

            const idempotencyKey =
                createLocalIdempotencyKey();


            const created =
                await createCasinoGame({
                    stake: parsedStake,
                    idempotencyKey
                });


            if (!mountedRef.current) {
                return;
            }


            const createdRoundId =
                getRoundId(created);


            if (!createdRoundId) {
                throw new Error(
                    'Le serveur n’a pas retourné d’identifiant de tour.'
                );
            }


            setRoundId(
                createdRoundId
            );


            // ------------------------------------------------
            // ROTATION
            // ------------------------------------------------

            setStatus('SPINNING');

            startCountdown();

            /**
             * À ce moment les fonds sont déjà bloqués
             * côté backend.
             *
             * Le résultat n'est PAS calculé ici.
             */

            startWheelAnimation();


            // ------------------------------------------------
            // ATTENTE DES 5 SECONDES
            // ------------------------------------------------

            await new Promise(
                resolve => {

                    spinTimerRef.current =
                        setTimeout(
                            resolve,
                            SPIN_DURATION
                        );
                }
            );


            if (!mountedRef.current) {
                return;
            }


            // ------------------------------------------------
            // DEMANDE DU RÉSULTAT AU SERVEUR
            // ------------------------------------------------

            const serverResult =
                await spinCasinoGame(
                    createdRoundId
                );


            if (!mountedRef.current) {
                return;
            }


            // ------------------------------------------------
            // EXTRACTION DU RÉSULTAT
            // ------------------------------------------------

            const segmentAmount =
                getResultAmount(
                    serverResult
                );

            const payout =
                getPayout(
                    serverResult
                );

            const resultType =
                getResultType(
                    serverResult
                );


            // ------------------------------------------------
            // ALIGNEMENT VISUEL
            // ------------------------------------------------

            const visualIndex =
                findVisualIndex(
                    segmentAmount
                );


            if (
                visualIndex >= 0
            ) {
                setSelectedVisualIndex(
                    visualIndex
                );

                /**
                 * On fait terminer la roulette
                 * sur la case réellement retournée
                 * par le serveur.
                 */
                startWheelAnimation(
                    visualIndex
                );
            }


            // ------------------------------------------------
            // RESULTAT
            // ------------------------------------------------

            setResult({
                ...serverResult,

                segmentAmount,
                payout,
                resultType
            });


            // ------------------------------------------------
            // HISTORIQUE LOCAL
            // ------------------------------------------------

            setHistory(
                previous => [
                    {
                        id:
                            serverResult
                                ?.result
                                ?.id ??
                            Date.now(),

                        roundId:
                            createdRoundId,

                        stake:
                            parsedStake,

                        segmentAmount,

                        payout,

                        resultType,

                        createdAt:
                            new Date()
                                .toISOString()
                    },

                    ...previous
                ].slice(0, 10)
            );


            setStatus(
                'COMPLETED'
            );


        } catch (err) {

            if (!mountedRef.current) {
                return;
            }

            console.error(
                'CASINO ERROR:',
                err
            );


            setStatus(
                'ERROR'
            );


            setError(
                err?.message ||
                'Impossible de terminer la rotation.'
            );
        }
    };


    // ========================================================
    // ANNULER
    // ========================================================

    const handleCancel = async () => {

        if (!roundId) {
            return;
        }

        try {

            await cancelCasinoGame(
                roundId,
                'USER_CANCELLED'
            );

            setStatus(
                'CANCELLED'
            );

            setError('');

        } catch (err) {

            console.error(
                'CASINO CANCEL ERROR:',
                err
            );

            setError(
                err?.message ||
                'Impossible d’annuler le tour.'
            );
        }
    };


    // ========================================================
    // NOUVELLE PARTIE
    // ========================================================

    const handleNewGame = () => {

        setResult(null);
        setRoundId(null);
        setStake(null);
        setError('');
        setCountdown(0);
        setSelectedVisualIndex(null);

        setStatus(
            'IDLE'
        );
    };


    // ========================================================
    // TEXTE STATUT
    // ========================================================

    const statusLabel = {

        IDLE:
            'Choisissez votre mise',

        CREATING:
            'Préparation de votre partie…',

        SPINNING:
            'La roue tourne…',

        COMPLETED:
            'Résultat',

        CANCELLED:
            'Partie annulée',

        ERROR:
            'Erreur'

    }[status];


    // ========================================================
    // RENDU
    // ========================================================

    return (
        <section
            className="casino"
            aria-label="Casino 6BetBall"
        >

            {/* =================================================
                HEADER
            ================================================= */}

            <header className="casino__header">

                <div>
                    <span className="casino__eyebrow">
                        6BetBall
                    </span>

                    <h1 className="casino__title">
                        CASINO
                    </h1>

                    <p className="casino__subtitle">
                        Tournez. Attendez. Découvrez.
                    </p>
                </div>

                <div className="casino__status">
                    {statusLabel}
                </div>

            </header>


            {/* =================================================
                ZONE PRINCIPALE
            ================================================= */}

            <div className="casino__content">


                {/* =============================================
                    ROULETTE
                ============================================= */}

                <div className="casino__wheel-section">

                    <div className="casino__pointer">
                        ▼
                    </div>


                    <div className="casino__wheel-wrapper">

                        <div
                            className={
                                `casino__wheel ${
                                    status === 'SPINNING'
                                        ? 'casino__wheel--spinning'
                                        : ''
                                }`
                            }
                            style={{
                                transform:
                                    `rotate(${rotation}deg)`
                            }}
                        >

                            {WHEEL_SEGMENTS.map(
                                (
                                    segment,
                                    index
                                ) => {

                                    const angle =
                                        (
                                            360 /
                                            WHEEL_SEGMENTS.length
                                        ) *
                                        index;

                                    return (
                                        <div
                                            key={
                                                segment.id
                                            }
                                            className={
                                                `casino__segment ${
                                                    selectedVisualIndex === index
                                                        ? 'casino__segment--selected'
                                                        : ''
                                                }`
                                            }
                                            style={{
                                                transform:
                                                    `rotate(${angle}deg)`
                                            }}
                                        >

                                            <span>
                                                {segment.label}
                                            </span>

                                            <small>
                                                {segment.suffix}
                                            </small>

                                        </div>
                                    );
                                }
                            )}

                        </div>


                        <div className="casino__wheel-center">
                            <span>
                                6B
                            </span>
                        </div>

                    </div>


                    {/* =========================================
                        COMPTE À REBOURS
                    ========================================= */}

                    {status === 'SPINNING' && (
                        <div className="casino__countdown">

                            <strong>
                                {countdown}
                            </strong>

                            <span>
                                secondes
                            </span>

                        </div>
                    )}

                </div>


                {/* =============================================
                    PANNEAU DE JEU
                ============================================= */}

                <div className="casino__panel">


                    {/* =========================================
                        MISE
                    ========================================= */}

                    {(
                        status === 'IDLE' ||
                        status === 'ERROR' ||
                        status === 'CANCELLED'
                    ) && (

                        <div className="casino__bet">

                            <label
                                htmlFor="casino-stake"
                            >
                                Votre mise
                            </label>


                            <div className="casino__input-wrapper">

                                <input
                                    id="casino-stake"
                                    type="text"
                                    inputMode="numeric"
                                    value={
                                        stakeInput
                                    }
                                    onChange={
                                        handleStakeChange
                                    }
                                    placeholder="200"
                                    min={MIN_STAKE}
                                />

                                <span>
                                    {CURRENCY}
                                </span>

                            </div>


                            <div className="casino__minimum">
                                Minimum :{' '}
                                {formatAmount(
                                    MIN_STAKE
                                )}{' '}
                                {CURRENCY}
                            </div>


                            <div className="casino__quick-stakes">

                                {[200, 500, 1000, 5000].map(
                                    amount => (

                                        <button
                                            type="button"
                                            key={amount}
                                            onClick={() =>
                                                setQuickStake(
                                                    amount
                                                )
                                            }
                                        >
                                            {formatAmount(
                                                amount
                                            )}
                                        </button>

                                    )
                                )}

                            </div>


                            <button
                                type="button"
                                className="casino__spin-button"
                                disabled={
                                    !isStakeValid
                                }
                                onClick={
                                    handleSpin
                                }
                            >
                                <span>
                                    TOURNER
                                </span>

                                <small>
                                    {isStakeValid
                                        ? `${formatAmount(parsedStake)} FC`
                                        : `Minimum ${formatAmount(MIN_STAKE)} FC`
                                    }
                                </small>
                            </button>

                        </div>
                    )}


                    {/* =========================================
                        PARTIE EN COURS
                    ========================================= */}

                    {status === 'CREATING' && (

                        <div className="casino__processing">

                            <div className="casino__loader" />

                            <h2>
                                Préparation…
                            </h2>

                            <p>
                                Vos fonds sont sécurisés
                                pendant la préparation
                                de la rotation.
                            </p>

                        </div>
                    )}


                    {status === 'SPINNING' && (

                        <div className="casino__processing">

                            <div className="casino__loader casino__loader--spin" />

                            <h2>
                                La roue tourne
                            </h2>

                            <p>
                                Le résultat est déterminé
                                par le serveur.
                            </p>

                            <strong>
                                Mise :{' '}
                                {formatAmount(
                                    stake
                                )}{' '}
                                FC
                            </strong>

                        </div>
                    )}


                    {/* =========================================
                        RESULTAT
                    ========================================= */}

                    {status === 'COMPLETED' &&
                        result && (

                        <div
                            className={
                                `casino__result ${
                                    resultTypeClass(
                                        result.resultType
                                    )
                                }`
                            }
                        >

                            <span className="casino__result-label">
                                RÉSULTAT
                            </span>


                            <strong className="casino__result-value">

                                {formatAmount(
                                    result.segmentAmount
                                )}{' '}

                                <small>
                                    FC
                                </small>

                            </strong>


                            <div className="casino__result-divider" />


                            <div className="casino__result-row">

                                <span>
                                    Mise
                                </span>

                                <strong>
                                    {formatAmount(
                                        stake
                                    )}{' '}
                                    FC
                                </strong>

                            </div>


                            <div className="casino__result-row">

                                <span>
                                    Gain
                                </span>

                                <strong>
                                    {formatAmount(
                                        result.payout
                                    )}{' '}
                                    FC
                                </strong>

                            </div>


                            <div className="casino__result-type">

                                {result.resultType === 'WIN'
                                    ? '🎉 GAGNÉ'
                                    : 'PERDU'}

                            </div>


                            <button
                                type="button"
                                className="casino__new-game"
                                onClick={
                                    handleNewGame
                                }
                            >
                                NOUVELLE PARTIE
                            </button>

                        </div>
                    )}


                    {/* =========================================
                        ERREUR
                    ========================================= */}

                    {error && (

                        <div
                            className="casino__error"
                            role="alert"
                        >
                            {error}
                        </div>

                    )}


                    {/* =========================================
                        ANNULATION
                    ========================================= */}

                    {(
                        status === 'CREATING' ||
                        status === 'SPINNING'
                    ) && (

                        <button
                            type="button"
                            className="casino__cancel"
                            onClick={
                                handleCancel
                            }
                        >
                            Annuler
                        </button>

                    )}

                </div>

            </div>


            {/* =================================================
                HISTORIQUE
            ================================================= */}

            {history.length > 0 && (

                <section className="casino__history">

                    <div className="casino__history-header">

                        <h2>
                            Dernières rotations
                        </h2>

                        <span>
                            {history.length}
                        </span>

                    </div>


                    <div className="casino__history-list">

                        {history.map(
                            item => (

                                <div
                                    className="casino__history-item"
                                    key={item.id}
                                >

                                    <div>
                                        <strong>
                                            {formatAmount(
                                                item.segmentAmount
                                            )}{' '}
                                            FC
                                        </strong>

                                        <small>
                                            Mise{' '}
                                            {formatAmount(
                                                item.stake
                                            )}{' '}
                                            FC
                                        </small>
                                    </div>


                                    <div>

                                        <strong
                                            className={
                                                item.payout > 0
                                                    ? 'casino__history-win'
                                                    : 'casino__history-loss'
                                            }
                                        >
                                            {item.payout > 0
                                                ? `+${formatAmount(item.payout)} FC`
                                                : '0 FC'
                                            }
                                        </strong>

                                    </div>

                                </div>

                            )
                        )}

                    </div>

                </section>
            )}

        </section>
    );
}


// ============================================================
// HELPER CLASS RESULTAT
// ============================================================

function resultTypeClass(
    resultType
) {

    if (
        resultType === 'WIN'
    ) {
        return 'casino__result--win';
    }

    if (
        resultType === 'LOSS'
    ) {
        return 'casino__result--loss';
    }

    return '';
}
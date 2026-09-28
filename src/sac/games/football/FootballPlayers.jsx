/**
 * ============================================================
 * 6BetBall - FOOTBALL PLAYERS
 * ============================================================
 *
 * Responsabilité :
 *
 *  - Fournir à Football.jsx les informations football des joueurs
 *  - Transformer l'état envoyé par le moteur en données UI propres
 *  - Identifier le joueur contrôlé
 *  - Identifier le propriétaire du ballon
 *  - Fournir les rôles / comportements / règles
 *  - Fournir les informations des deux équipes
 *  - Garantir une structure stable pour Football.jsx
 *
 * IMPORTANT :
 *
 * Les joueurs RÉELS du match sont ceux envoyés par le backend.
 *
 * Le moteur football crée déjà :
 *   - 11 joueurs HOME
 *   - 11 joueurs AWAY
 *   - leurs IDs
 *   - leurs positions
 *   - leurs rôles
 *   - leurs statistiques
 *   - leur état
 *   - leur endurance
 *
 * Ce fichier NE DOIT PAS générer de nouveaux IDs joueurs
 * pour le match réel.
 *
 * ============================================================
 */


/* ============================================================
 * CONSTANTES
 * ============================================================
 */

export const FOOTBALL_ROLES = Object.freeze({
    GK: "GK",

    LB: "LB",
    CB: "CB",
    RB: "RB",

    LM: "LM",
    CM: "CM",
    RM: "RM",

    LW: "LW",
    ST: "ST",
    RW: "RW",
});


export const ROLE_LABELS = Object.freeze({
    GK: "Gardien",

    LB: "Latéral gauche",
    CB: "Défenseur central",
    RB: "Latéral droit",

    LM: "Milieu gauche",
    CM: "Milieu central",
    RM: "Milieu droit",

    LW: "Ailier gauche",
    ST: "Avant-centre",
    RW: "Ailier droit",
});


export const PLAYER_STATES = Object.freeze({
    IDLE: "IDLE",
    RUNNING: "RUNNING",
    WITH_BALL: "WITH_BALL",
});


/* ============================================================
 * CLUBS
 *
 * Le moteur possède déjà son propre catalogue.
 * Cette liste reprend les clubs présents dans l'engine.
 * ============================================================
 */

export const FOOTBALL_CLUBS = Object.freeze([
    "Real Madrid",
    "Manchester City",
    "FC Barcelona",
    "Liverpool",
    "Manchester United",
    "Chelsea",
    "Arsenal",
    "Bayern Munich",
    "Borussia Dortmund",
    "Paris Saint-Germain",
    "Inter Milan",
    "AC Milan",
    "Juventus",
    "Napoli",
    "AS Roma",
    "Atlético Madrid",
    "Sevilla FC",
    "Tottenham",
    "Newcastle United",
    "Aston Villa",
    "Benfica",
    "FC Porto",
    "Ajax",
    "PSV Eindhoven",
    "Galatasaray",
    "Fenerbahçe",
    "Al Hilal",
    "Al Nassr",
    "River Plate",
    "Boca Juniors",
    "Léopard du Congo",
    "TP Mazembe",
    "Al Ahly SC",
    "Zamalek SC",
    "Orlando Pirates",
    "Kaizer Chiefs",
    "Mamelodi Sundowns",
    "Al Sadd SC",
    "Al Duhail SC",
    "Al Ain FC",
    "Al Wahda FC",
    "Al Jazira Club",
    "Al Nasr SC",
    "AS Monaco",
    "Olympique Lyonnais",
    "Olympique de Marseille",
    "AS KOLOMBOKA",
    "FC Nantes",
    "Stade Rennais",
    "RC Lens",
    "OGC Nice",
    "Lille OSC",
    "FC Girondins de Bordeaux",
    "FC Metz",
    "Stade de Reims",
    "FC Lorient",
    "Stade Brestois 29",
    "AS Tout Petits",
    "FC Lausanne-Sport",
    "BSC Young Boys",
    "FC Basel",
    "AS TSHIKAPA",
    "AS VITA CLUB",
    "DCMP",
    "AS OTOHO",
]);


/* ============================================================
 * NOMS DE JOUEURS
 *
 * Catalogue d'affichage / fallback.
 *
 * Le moteur reste la source des joueurs du match.
 * ============================================================
 */

export const FOOTBALL_PLAYER_NAMES = Object.freeze([
    "Lucas Martin",
    "Daniel Silva",
    "Mateo Garcia",
    "Noah Williams",
    "Adam Johnson",
    "Ethan Brown",
    "Liam Wilson",
    "Leo Martinez",
    "Carlos Fernandez",
    "Marco Rossi",
    "Victor Santos",
    "Alex Turner",
    "Thomas Evans",
    "David Walker",
    "Samuel Carter",
    "Michael Lewis",
    "Oliver King",
    "James Scott",
    "William Young",
    "Benjamin Hall",
    "Henry Allen",
    "Jack Wright",
    "Oscar Green",
    "Arthur Baker",
    "Leo Nelson",
    "Mason Hill",
    "Ryan Adams",
    "Daniel Mitchell",
    "Nathan Roberts",
    "Gabriel Campbell",
    "Julian Phillips",
    "Felix Parker",
    "Max Edwards",
    "Theo Collins",
    "Hugo Stewart",
    "Enzo Morris",
    "Luis Rogers",
    "Diego Reed",
    "Antoine Cook",
    "Paul Morgan",
    "Kevin Bell",
    "Thomas Murphy",
    "Adrian Bailey",
    "Martin Rivera",
    "Sebastian Cooper",
    "Javier Richardson",
    "MUNANGA THEODORE",
    "CHIKAPA KABONGO",
    "KABONGO KALONJI",
    "KABONGO MUKOKO",
    "Kabascomovic",
    "Ilunga Mbuyi",
    "Mbuyi Tshibangu",
    "Théodore MUNANGA",
    "Musankisha Chris",
    "Chris Melly",
    "Cristiano Ronaldo",
    "Lionel Messi",
    "Neymar Jr",
    "Kylian Mbappé",
    "Mohamed Salah",
    "Kevin De Bruyne",
    "Virgil van Dijk",
    "Sadio Mané",
    "David Alaba",
    "Robert Lewandowski",
    "Raheem Sterling",
    "Erling Haaland",
    "Karim Benzema",
    "Luka Modrić",
    "Sergio Ramos",
    "Manuel Neuer",
    "Harry Kane",
    "Tony Kroos",
    "Paulo Dybala",
    "Luis Suárez",
    "Gareth Bale",
    "Mbemba KABONGO",
    "Yamal MAMOUN",
    "PÉPÉ KOUASSI",
    "Wissam BEN YEDDER",
    "Hakim ZIYECH",
    "Wissa KALIDOU",
    "Théo Bongonda",
    "Franck Kessié",
    "Nicolas Pépé",
    "Wilfried Zaha",
]);


/* ============================================================
 * COMPORTEMENT DES POSTES
 *
 * Ces informations servent à Football.jsx pour l'affichage,
 * les indications utilisateur et éventuellement l'IA frontend.
 *
 * La simulation officielle reste dans le moteur backend.
 * ============================================================
 */

export const PLAYER_BEHAVIORS = Object.freeze({

    GK: {
        label: "Gardien",
        behavior: "Protège le but, reste principalement dans sa surface.",
        attack: 20,
        defense: 100,
        movement: 30,
    },

    LB: {
        label: "Latéral gauche",
        behavior: "Défend le côté gauche et accompagne les attaques.",
        attack: 55,
        defense: 75,
        movement: 85,
    },

    CB: {
        label: "Défenseur central",
        behavior: "Protège l'axe défensif et intervient sur les attaquants.",
        attack: 30,
        defense: 95,
        movement: 60,
    },

    RB: {
        label: "Latéral droit",
        behavior: "Défend le côté droit et accompagne les attaques.",
        attack: 55,
        defense: 75,
        movement: 85,
    },

    LM: {
        label: "Milieu gauche",
        behavior: "Assure la liaison entre défense et attaque sur le côté gauche.",
        attack: 65,
        defense: 60,
        movement: 85,
    },

    CM: {
        label: "Milieu central",
        behavior: "Organise le jeu, distribue les passes et participe au pressing.",
        attack: 70,
        defense: 65,
        movement: 80,
    },

    RM: {
        label: "Milieu droit",
        behavior: "Assure la liaison entre défense et attaque sur le côté droit.",
        attack: 65,
        defense: 60,
        movement: 85,
    },

    LW: {
        label: "Ailier gauche",
        behavior: "Exploite la largeur, dribble et cherche les occasions.",
        attack: 90,
        defense: 35,
        movement: 95,
    },

    ST: {
        label: "Avant-centre",
        behavior: "Joue près du but adverse et recherche les occasions de tir.",
        attack: 100,
        defense: 25,
        movement: 80,
    },

    RW: {
        label: "Ailier droit",
        behavior: "Exploite la largeur, dribble et cherche les occasions.",
        attack: 90,
        defense: 35,
        movement: 95,
    },
});


/* ============================================================
 * RÈGLES FOOTBALL
 * ============================================================
 */

export const FOOTBALL_RULES = Object.freeze({

    playersPerTeam: 11,

    totalPlayers: 22,

    matchMinutes: 90,

    halves: 2,

    halfMinutes: 45,

    fieldLength: 105,

    fieldWidth: 68,

    goalWidth: 7.32,

    goalHeight: 2.44,

    commands: {
        direction: "Déplacement du joueur contrôlé",

        X: "Passe avec ballon / action offensive sans ballon",

        A: "Tir avec ballon / tacle sans ballon",
    },

    directions: {
        UP: "Haut",
        DOWN: "Bas",
        LEFT: "Gauche",
        RIGHT: "Droite",
    },

    general: [
        "Chaque équipe possède 11 joueurs.",
        "Le match dure 90 minutes.",
        "Le match est composé de deux mi-temps.",
        "Le ballon peut être libre ou contrôlé par un joueur.",
        "Un utilisateur ne peut contrôler qu'un joueur de son équipe.",
        "Le moteur serveur reste l'autorité sur les positions et les événements.",
        "Les buts sont déterminés par le moteur serveur.",
        "Les statistiques du match proviennent du moteur serveur.",
    ],
});


/* ============================================================
 * NORMALISATION JOUEUR
 *
 * Transforme le joueur du backend en modèle frontend.
 * ============================================================
 */

export function normalizePlayer(player) {

    if (!player) {
        return null;
    }

    const role = String(
        player.role || ""
    ).toUpperCase();

    const behavior =
        PLAYER_BEHAVIORS[role] ||
        PLAYER_BEHAVIORS.CM;

    return {
        ...player,

        id: player.id,

        number:
            Number(player.number) || 0,

        name:
            player.name ||
            `Joueur ${player.number || ""}`.trim(),

        team:
            player.team || null,

        teamName:
            player.teamName || "",

        role,

        roleLabel:
            ROLE_LABELS[role] || role,

        behavior,

        position: {
            x: Number(player.position?.x) || 0,
            y: Number(player.position?.y) || 0,
            z: Number(player.position?.z) || 0,
        },

        velocity: {
            x: Number(player.velocity?.x) || 0,
            y: Number(player.velocity?.y) || 0,
            z: Number(player.velocity?.z) || 0,
        },

        state:
            player.state ||
            PLAYER_STATES.IDLE,

        stamina:
            Number.isFinite(
                Number(player.stamina)
            )
                ? Number(player.stamina)
                : 100,

        distanceCovered:
            Number(player.distanceCovered) || 0,

        stats: {
            passes:
                Number(player.stats?.passes) || 0,

            passesCompleted:
                Number(player.stats?.passesCompleted) || 0,

            shots:
                Number(player.stats?.shots) || 0,

            shotsOnTarget:
                Number(player.stats?.shotsOnTarget) || 0,

            goals:
                Number(player.stats?.goals) || 0,

            assists:
                Number(player.stats?.assists) || 0,

            dribbles:
                Number(player.stats?.dribbles) || 0,

            successfulDribbles:
                Number(player.stats?.successfulDribbles) || 0,

            tackles:
                Number(player.stats?.tackles) || 0,

            interceptions:
                Number(player.stats?.interceptions) || 0,

            fouls:
                Number(player.stats?.fouls) || 0,

            yellowCards:
                Number(player.stats?.yellowCards) || 0,

            redCards:
                Number(player.stats?.redCards) || 0,
        },
    };
}


/* ============================================================
 * EXTRACTION DES 22 JOUEURS
 *
 * Football.jsx appelle cette fonction avec matchState.
 * ============================================================
 */

export function getFootballPlayers(matchState) {

    const homePlayers =
        Array.isArray(
            matchState?.teams?.home?.players
        )
            ? matchState.teams.home.players
            : [];

    const awayPlayers =
        Array.isArray(
            matchState?.teams?.away?.players
        )
            ? matchState.teams.away.players
            : [];

    return {
        home: homePlayers.map(normalizePlayer),

        away: awayPlayers.map(normalizePlayer),

        all: [
            ...homePlayers,
            ...awayPlayers,
        ].map(normalizePlayer),

        homeCount:
            homePlayers.length,

        awayCount:
            awayPlayers.length,

        total:
            homePlayers.length +
            awayPlayers.length,
    };
}


/* ============================================================
 * ÉQUIPE
 * ============================================================
 */

export function getFootballTeam(
    matchState,
    team
) {

    const side =
        String(team || "").toLowerCase();

    if (
        side !== "home" &&
        side !== "away"
    ) {
        return null;
    }

    const source =
        matchState?.teams?.[side];

    if (!source) {
        return null;
    }

    return {
        side:
            side.toUpperCase(),

        name:
            source.name || "Équipe",

        formation:
            source.formation || null,

        stats:
            source.stats || {},

        players:
            Array.isArray(source.players)
                ? source.players.map(
                      normalizePlayer
                  )
                : [],
    };
}


/* ============================================================
 * JOUEUR CONTRÔLÉ
 * ============================================================
 */

export function getControlledPlayer(
    matchState,
    userId
) {

    if (
        !matchState ||
        userId === null ||
        userId === undefined
    ) {
        return null;
    }

    const controlled =
        matchState.controlledPlayers || {};

    const playerId =
        controlled[String(userId)] ??
        controlled[userId];

    if (!playerId) {
        return null;
    }

    const players =
        getFootballPlayers(
            matchState
        );

    return (
        players.all.find(
            player =>
                String(player.id) ===
                String(playerId)
        ) || null
    );
}


/* ============================================================
 * PROPRIÉTAIRE DU BALLON
 * ============================================================
 */

export function getBallOwner(
    matchState
) {

    const ownerId =
        matchState?.ball?.ownerPlayerId;

    if (!ownerId) {
        return null;
    }

    const players =
        getFootballPlayers(
            matchState
        );

    return (
        players.all.find(
            player =>
                String(player.id) ===
                String(ownerId)
        ) || null
    );
}


/* ============================================================
 * ÉQUIPE DU JOUEUR
 * ============================================================
 */

export function getPlayerTeam(
    matchState,
    userId
) {

    const player =
        getControlledPlayer(
            matchState,
            userId
        );

    if (!player) {
        return null;
    }

    return player.team;
}


/* ============================================================
 * VÉRIFICATION : JOUEUR CONTRÔLÉ
 * ============================================================
 */

export function isControlledPlayer(
    matchState,
    userId,
    playerId
) {

    const player =
        getControlledPlayer(
            matchState,
            userId
        );

    if (!player) {
        return false;
    }

    return (
        String(player.id) ===
        String(playerId)
    );
}


/* ============================================================
 * VÉRIFICATION : BALLON
 * ============================================================
 */

export function playerHasBall(
    matchState,
    playerId
) {

    return (
        String(
            matchState?.ball?.ownerPlayerId
        ) === String(playerId)
    );
}


/* ============================================================
 * POURCENTAGE ENDURANCE
 * ============================================================
 */

export function getPlayerStaminaPercent(
    player
) {

    if (!player) {
        return 0;
    }

    const stamina =
        Number(player.stamina);

    if (!Number.isFinite(stamina)) {
        return 100;
    }

    return Math.max(
        0,
        Math.min(
            100,
            stamina
        )
    );
}


/* ============================================================
 * ÉTAT VISUEL
 * ============================================================
 */

export function getPlayerStateLabel(
    player
) {

    if (!player) {
        return "Inconnu";
    }

    switch (
        String(player.state).toUpperCase()
    ) {

        case PLAYER_STATES.RUNNING:
            return "Course";

        case PLAYER_STATES.WITH_BALL:
            return "Avec ballon";

        case PLAYER_STATES.IDLE:
            return "Position";

        default:
            return player.state || "Inconnu";
    }
}


/* ============================================================
 * COORDONNÉES POUR LE TERRAIN UI
 *
 * Le moteur utilise :
 *
 *   X = 0 → 105
 *   Y = 0 → 68
 *
 * Football.jsx peut utiliser directement ces %
 * pour positionner les joueurs.
 * ============================================================
 */

export function getPlayerFieldPosition(
    player
) {

    if (!player) {
        return {
            left: 50,
            top: 50,
        };
    }

    const x =
        Number(player.position?.x) || 0;

    const y =
        Number(player.position?.y) || 0;

    return {
        left:
            Math.max(
                0,
                Math.min(
                    100,
                    (x / FOOTBALL_RULES.fieldLength) *
                        100
                )
            ),

        top:
            Math.max(
                0,
                Math.min(
                    100,
                    (y / FOOTBALL_RULES.fieldWidth) *
                        100
                )
            ),
    };
}


/* ============================================================
 * RÉSUMÉ D'UN JOUEUR
 * ============================================================
 */

export function getPlayerSummary(
    player
) {

    if (!player) {
        return null;
    }

    return {
        id: player.id,

        number: player.number,

        name: player.name,

        team: player.team,

        teamName: player.teamName,

        role: player.role,

        roleLabel:
            player.roleLabel ||
            ROLE_LABELS[player.role] ||
            player.role,

        state:
            getPlayerStateLabel(player),

        stamina:
            getPlayerStaminaPercent(player),

        hasBall:
            player.state ===
            PLAYER_STATES.WITH_BALL,

        position:
            getPlayerFieldPosition(player),

        stats:
            player.stats || {},
    };
}


/* ============================================================
 * VALIDATION DES 22 JOUEURS
 * ============================================================
 */

export function validateFootballPlayers(
    matchState
) {

    const players =
        getFootballPlayers(
            matchState
        );

    return {
        valid:
            players.homeCount === 11 &&
            players.awayCount === 11 &&
            players.total === 22,

        homeCount:
            players.homeCount,

        awayCount:
            players.awayCount,

        total:
            players.total,

        message:
            players.homeCount === 11 &&
            players.awayCount === 11
                ? "22 joueurs présents"
                : `Effectif incomplet : ${players.homeCount} HOME / ${players.awayCount} AWAY`,
    };
}


/* ============================================================
 * DONNÉES PRÊTES POUR FOOTBALL.JSX
 * ============================================================
 *
 * C'est la fonction principale que Football.jsx pourra utiliser.
 *
 * Exemple :
 *
 * const football = getFootballData(
 *     matchState,
 *     userId
 * );
 *
 * football.players.home
 * football.players.away
 * football.controlledPlayer
 * football.ballOwner
 * football.myTeam
 * football.validation
 * ============================================================
 */

export function getFootballData(
    matchState,
    userId
) {

    const players =
        getFootballPlayers(
            matchState
        );

    const controlledPlayer =
        getControlledPlayer(
            matchState,
            userId
        );

    const ballOwner =
        getBallOwner(
            matchState
        );

    const myTeam =
        controlledPlayer?.team ||
        null;

    return {

        players,

        homeTeam:
            getFootballTeam(
                matchState,
                "home"
            ),

        awayTeam:
            getFootballTeam(
                matchState,
                "away"
            ),

        controlledPlayer,

        ballOwner,

        myTeam,

        validation:
            validateFootballPlayers(
                matchState
            ),

        rules:
            FOOTBALL_RULES,
    };
}


/* ============================================================
 * EXPORT PAR DÉFAUT
 * ============================================================
 */

export default {
    FOOTBALL_ROLES,

    ROLE_LABELS,

    PLAYER_STATES,

    FOOTBALL_CLUBS,

    FOOTBALL_PLAYER_NAMES,

    PLAYER_BEHAVIORS,

    FOOTBALL_RULES,

    normalizePlayer,

    getFootballPlayers,

    getFootballTeam,

    getControlledPlayer,

    getBallOwner,

    getPlayerTeam,

    isControlledPlayer,

    playerHasBall,

    getPlayerStaminaPercent,

    getPlayerStateLabel,

    getPlayerFieldPosition,

    getPlayerSummary,

    validateFootballPlayers,

    getFootballData,
};
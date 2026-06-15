import { useEffect, useState } from "react";
import { checkJOEligibility } from "../utils/joEligibility";

// ======================================================
// COMPONENT
// ======================================================

export default function Menu({
  setPage,
}) {
  const [role, setRole] =
    useState("");

  const [
    username,
    setUsername,
  ] = useState("");

  const [
    isEligible,
    setIsEligible,
  ] = useState(false);

  // ======================================================
  // INIT
  // ======================================================

  useEffect(() => {
    const r =
      localStorage.getItem(
        "role"
      ) || "";

    const user =
      localStorage.getItem(
        "username"
      ) || "Joueur";

    setRole(r);
    setUsername(user);

    const result =
      checkJOEligibility();

    setIsEligible(
      result.isEligible
    );

    if (
      result.isEligible
    ) {
      setTimeout(() => {
        alert(
          "🎉 Vous êtes éligible pour devenir Joueur Officiel !"
        );
      }, 500);
    }
  }, []);

  // ======================================================
  // LOGOUT
  // ======================================================

  const handleLogout =
    () => {
      sessionStorage.clear();
      localStorage.clear();

      setPage("login");
    };

  // ======================================================
  // MENU BUTTON
  // ======================================================

  const MenuButton = ({
    icon,
    title,
    subtitle,
    onClick,
    color,
    badge,
  }) => {
    return (
      <button
        onClick={onClick}
        className={`
          relative
          overflow-hidden
          rounded-[34px]
          p-6
          text-left
          transition-all
          duration-300
          hover:scale-[1.02]
          active:scale-[0.98]
          shadow-2xl
          border
          border-white/10
          bg-gradient-to-br
          ${color}
          group
        `}
      >
        {/* Glow */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-500 bg-white/5" />

        {/* Blur */}
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 blur-3xl" />

        {/* Badge */}
        {badge && (
          <div className="absolute top-4 right-4 bg-red-500 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-xl animate-pulse">
            {badge}
          </div>
        )}

        <div className="relative z-10 flex items-center gap-5">
          <div
            className="
            w-20 h-20
            rounded-[24px]
            bg-white/10
            border border-white/10
            backdrop-blur-xl
            flex items-center justify-center
            text-4xl
            shadow-xl
          "
          >
            {icon}
          </div>

          <div className="flex-1">
            <div className="text-2xl font-black text-white">
              {title}
            </div>

            <div className="text-sm text-gray-200 mt-2 leading-6">
              {subtitle}
            </div>
          </div>

          <div className="text-3xl text-white/40 group-hover:text-white transition">
            →
          </div>
        </div>
      </button>
    );
  };

  // ======================================================
  // BADGE
  // ======================================================

  const Badge = ({
    children,
    color,
  }) => (
    <div
      className={`
        px-4 py-2
        rounded-full
        text-xs
        font-black
        border
        backdrop-blur-xl
        ${color}
      `}
    >
      {children}
    </div>
  );

  // ======================================================
  // UI
  // ======================================================

  return (
    <div
      className="
      min-h-screen
      bg-[#020617]
      text-white
      overflow-hidden
      relative
    "
    >
      {/* ====================================================== */}
      {/* BACKGROUND */}
      {/* ====================================================== */}

      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="
          absolute
          top-[-200px]
          left-[-150px]
          w-[600px]
          h-[600px]
          rounded-full
          bg-blue-600/20
          blur-[140px]
        "
        />

        <div
          className="
          absolute
          bottom-[-250px]
          right-[-150px]
          w-[600px]
          h-[600px]
          rounded-full
          bg-purple-600/20
          blur-[140px]
        "
        />

        <div
          className="
          absolute
          top-[40%]
          left-[40%]
          w-[400px]
          h-[400px]
          rounded-full
          bg-cyan-500/10
          blur-[140px]
        "
        />
      </div>

      {/* ====================================================== */}
      {/* HEADER */}
      {/* ====================================================== */}

      <div
        className="
        sticky top-0 z-30
        backdrop-blur-2xl
        bg-black/30
        border-b border-white/10
      "
      >
        <div className="max-w-7xl mx-auto px-5 py-5">
          <div
            className="
            flex
            justify-between
            items-center
            gap-5
            flex-wrap
          "
          >
            {/* LEFT */}
            <div>
              <h1
                className="
                text-5xl
                md:text-6xl
                font-black
                tracking-tight
                bg-gradient-to-r
                from-white
                via-blue-200
                to-purple-300
                bg-clip-text
                text-transparent
              "
              >
                🎮 6BetBall
              </h1>

              <p
                className="
                text-gray-400
                mt-2
                text-sm
                md:text-base
              "
              >
                Centre de contrôle nouvelle génération
              </p>
            </div>

            {/* RIGHT */}
            <div className="flex items-center gap-3 flex-wrap">
              <Badge color="bg-green-500/20 border-green-500/20 text-green-300">
                🟢 EN LIGNE
              </Badge>

              <Badge color="bg-blue-500/20 border-blue-500/20 text-blue-300">
                {role || "JOUEUR"}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* ====================================================== */}
      {/* CONTENT */}
      {/* ====================================================== */}

      <div className="relative z-10 max-w-7xl mx-auto px-5 py-8">
        {/* ====================================================== */}
        {/* HERO */}
        {/* ====================================================== */}

        <div
          className="
          relative
          overflow-hidden
          rounded-[42px]
          border border-white/10
          bg-gradient-to-r
          from-blue-700
          via-indigo-700
          to-purple-800
          shadow-[0_30px_120px_rgba(59,130,246,0.35)]
          mb-12
        "
        >
          <div
            className="
            absolute
            top-0
            right-0
            w-96
            h-96
            bg-white/10
            blur-[120px]
            rounded-full
          "
          />

          <div
            className="
            absolute
            bottom-0
            left-0
            w-96
            h-96
            bg-black/20
            blur-[120px]
            rounded-full
          "
          />

          <div className="relative z-10 p-8 md:p-12">
            <div
              className="
              flex
              flex-col
              xl:flex-row
              justify-between
              gap-10
            "
            >
              {/* USER */}
              <div className="flex gap-6 items-center flex-wrap">
                <div
                  className="
                  w-32 h-32
                  rounded-full
                  bg-white/10
                  border border-white/20
                  backdrop-blur-2xl
                  flex items-center justify-center
                  text-7xl
                  shadow-2xl
                "
                >
                  👤
                </div>

                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2
                      className="
                      text-5xl
                      font-black
                    "
                    >
                      {username}
                    </h2>

                    {role ===
                      "JO" && (
                      <Badge color="bg-yellow-400 text-black border-yellow-300">
                        ⭐ JO
                      </Badge>
                    )}

                    {role ===
                      "ADMIN" && (
                      <Badge color="bg-red-500 text-white border-red-400">
                        🛠️ ADMIN
                      </Badge>
                    )}
                  </div>

                  <p
                    className="
                    mt-3
                    text-blue-100
                    text-lg
                  "
                  >
                    Bienvenue sur la plateforme officielle
                    6BetBall
                  </p>

                  <div className="flex gap-3 flex-wrap mt-5">
                    <Badge color="bg-black/30 text-white border-white/10">
                      ⚡ Temps réel
                    </Badge>

                    <Badge color="bg-emerald-500/20 text-emerald-200 border-emerald-500/20">
                      🔒 Sécurisé
                    </Badge>

                    <Badge color="bg-purple-500/20 text-purple-200 border-purple-500/20">
                      🌍 Multijoueur
                    </Badge>

                    {isEligible && (
                      <Badge color="bg-emerald-500 text-white border-emerald-400">
                        🎉 Éligible JO
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* STATUS */}
              <div
                className="
                min-w-[320px]
                rounded-[34px]
                bg-black/20
                border border-white/10
                backdrop-blur-2xl
                p-7
                shadow-2xl
              "
              >
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">
                    Statut du compte
                  </span>

                  <Badge color="bg-green-500 text-white border-green-400">
                    ACTIF
                  </Badge>
                </div>

                <div className="space-y-5 mt-7">
                  {[
                    [
                      "Anti-triche",
                      "ACTIVÉE",
                      "text-green-400",
                    ],
                    [
                      "Synchronisation",
                      "TEMPS RÉEL",
                      "text-blue-300",
                    ],
                    [
                      "Session",
                      "SÉCURISÉE",
                      "text-yellow-300",
                    ],
                    [
                      "Réseau",
                      "STABLE",
                      "text-purple-300",
                    ],
                  ].map(
                    (
                      item,
                      i
                    ) => (
                      <div
                        key={i}
                        className="flex justify-between items-center"
                      >
                        <span className="text-gray-300">
                          {
                            item[0]
                          }
                        </span>

                        <span
                          className={`font-black ${item[2]}`}
                        >
                          {
                            item[1]
                          }
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ====================================================== */}
        {/* STATS */}
        {/* ====================================================== */}

        <div
          className="
          grid
          grid-cols-1
          sm:grid-cols-2
          xl:grid-cols-4
          gap-5
          mb-12
        "
        >
          {[
            {
              icon: "⚡",
              value: "99.9%",
              label:
                "Disponibilité",
            },
            {
              icon: "🌍",
              value: "24/7",
              label:
                "Serveurs actifs",
            },
            {
              icon: "🧠",
              value: "IA",
              label:
                "Bots intelligents",
            },
            {
              icon: "🔒",
              value: "AES-256",
              label:
                "Chiffrement",
            },
          ].map((item, i) => (
            <div
              key={i}
              className="
                rounded-[30px]
                bg-white/5
                border border-white/10
                p-6
                backdrop-blur-xl
                shadow-2xl
              "
            >
              <div className="text-4xl">
                {item.icon}
              </div>

              <div className="text-4xl font-black mt-4">
                {item.value}
              </div>

              <div className="text-gray-400 mt-2">
                {item.label}
              </div>
            </div>
          ))}
        </div>

        {/* ====================================================== */}
        {/* MENU GRID */}
        {/* ====================================================== */}

        <div
          className="
          grid
          md:grid-cols-2
          xl:grid-cols-3
          gap-7
        "
        >
          <MenuButton
            icon="👤"
            title="Profil"
            subtitle="Visitez et modifiez les détails de votre compte"
            onClick={() =>
              setPage(
                "profile"
              )
            }
            color="from-slate-700 via-slate-800 to-slate-900"
          />

          <MenuButton
            icon="⭐"
            title="Devenir Joueur Officiel"
            subtitle="Rejoignez le programme officiel 6BetBall"
            onClick={() =>
              setPage(
                "jo-request"
              )
            }
            color="from-green-600 via-emerald-700 to-emerald-950"
          />

          <MenuButton
            icon="🤖"
            title="Bots IA"
            subtitle="Louez des bots intelligents pour vos matchs"
            onClick={() =>
              setPage("bots")
            }
            color="from-blue-600 via-indigo-700 to-indigo-950"
          />

          <MenuButton
            icon="💸"
            title="Retrait via JO"
            subtitle="Effectuez vos retraits sécurisés"
            onClick={() =>
              setPage(
                "withdraw-jo"
              )
            }
            color="from-yellow-500 via-orange-600 to-orange-950"
          />

          {/* ====================================================== */}
          {/* NEW MESSAGES PAGE */}
          {/* ====================================================== */}

          <MenuButton
            icon="📩"
            title="Support & Messages"
            subtitle="Envoyer une réclamation, signaler un problème ou contacter l'administration"
            onClick={() =>
              setPage(
                "messages"
              )
            }
            color="from-pink-600 via-rose-700 to-rose-950"
            badge="SUPPORT"
          />

          {role ===
            "JO" && (
            <MenuButton
              icon="🎮"
              title="Mode JO"
              subtitle="Gestion des matchs et validations"
              onClick={() =>
                setPage(
                  "jo-mode"
                )
              }
              color="from-teal-600 via-green-700 to-teal-950"
            />
          )}

          {role ===
            "ADMIN" && (
            <MenuButton
              icon="🛠️"
              title="Admin Dashboard"
              subtitle="Administration complète de la plateforme"
              onClick={() =>
                setPage(
                  "admin"
                )
              }
              color="from-red-700 via-red-800 to-black"
            />
          )}

          <MenuButton
            icon="🚪"
            title="Déconnexion"
            subtitle="Quitter votre session sécurisée"
            onClick={
              handleLogout
            }
            color="from-red-600 via-red-700 to-black"
          />
        </div>

        {/* ====================================================== */}
        {/* PANELS */}
        {/* ====================================================== */}

        <div
          className="
          grid
          lg:grid-cols-2
          gap-7
          mt-14
        "
        >
          {/* ABOUT */}
          <div
            className="
            rounded-[36px]
            bg-white/5
            border border-white/10
            p-8
            backdrop-blur-2xl
            shadow-2xl
          "
          >
            <h3 className="text-4xl font-black mb-6">
              ℹ️ À propos de
              6BetBall
            </h3>

            <p className="text-gray-300 leading-8 text-[15px]">
              6BetBall est une
              plateforme compétitive moderne
              spécialisée dans
              les jeux
              stratégiques,
              les défis
              multijoueurs en
              temps réel et
              les systèmes
              sécurisés de
              compétition.
            </p>

            <div className="flex flex-wrap gap-3 mt-7">
              <Badge color="bg-blue-500/20 border-blue-500/20 text-blue-300">
                ⚡ Temps réel
              </Badge>

              <Badge color="bg-green-500/20 border-green-500/20 text-green-300">
                🔒 Sécurité
                avancée
              </Badge>

              <Badge color="bg-purple-500/20 border-purple-500/20 text-purple-300">
                🌍 Réseau
                multijoueur
              </Badge>

              <Badge color="bg-yellow-500/20 border-yellow-500/20 text-yellow-300">
                🧠 IA intégrée
              </Badge>
            </div>
          </div>

          {/* SECURITY */}
          <div
            className="
            rounded-[36px]
            bg-white/5
            border border-white/10
            p-8
            backdrop-blur-2xl
            shadow-2xl
          "
          >
            <h3 className="text-4xl font-black mb-6">
              🔐 Sécurité &
              Système
            </h3>

            <div className="space-y-5">
              {[
                "Connexion sécurisée",
                "Détection anti-triche",
                "Vérification temps réel",
                "Chiffrement des données",
              ].map(
                (
                  item,
                  i
                ) => (
                  <div
                    key={i}
                    className="
                    flex
                    justify-between
                    items-center
                    bg-black/20
                    rounded-[24px]
                    p-5
                    border border-white/5
                  "
                  >
                    <span className="text-gray-300">
                      {item}
                    </span>

                    <Badge color="bg-green-500 text-white border-green-400">
                      ACTIVE
                    </Badge>
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        {/* ====================================================== */}
        {/* FOOTER */}
        {/* ====================================================== */}

        <div
          className="
          mt-16
          border-t
          border-white/10
          pt-10
          pb-14
        "
        >
          <div
            className="
            flex
            flex-col
            lg:flex-row
            justify-between
            items-center
            gap-7
          "
          >
            <div>
              <div
                className="
                text-4xl
                font-black
                bg-gradient-to-r
                from-white
                to-blue-300
                bg-clip-text
                text-transparent
              "
              >
                🎮 6BetBall
              </div>

              <div className="text-gray-500 text-sm mt-3">
                Copyright ©
                2026
                6BetBall.
                Tous droits
                réservés.
              </div>
            </div>

            <div className="flex gap-4 flex-wrap">
              <button
                className="
                px-6 py-4
                rounded-[22px]
                bg-white/5
                hover:bg-white/10
                transition
                border border-white/10
                backdrop-blur-xl
              "
              >
                📜 Conditions
              </button>

              <button
                className="
                px-6 py-4
                rounded-[22px]
                bg-white/5
                hover:bg-white/10
                transition
                border border-white/10
                backdrop-blur-xl
              "
              >
                🔐
                Confidentialité
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
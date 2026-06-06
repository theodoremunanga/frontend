import {
  Heart,
  MessageCircle,
  Share2,
  ExternalLink,
} from "lucide-react";

export default function AdCard({
  ad,
}) {
  return (
    <div
      className="
        bg-[#111827]
        border
        border-slate-800
        rounded-3xl
        overflow-hidden
        shadow-2xl
      "
    >
      {/* HEADER */}

      <div className="p-5">
        <div className="flex items-center gap-3">
          <div
            className="
              w-12
              h-12
              rounded-full
              bg-blue-500
              flex
              items-center
              justify-center
              text-white
              font-black
            "
          >
            6B
          </div>

          <div>
            <h3 className="font-bold text-white">
              {ad.advertiser ||
                "6BetBall"}
            </h3>

            <p
              className="
                text-sm
                text-slate-400
              "
            >
              Sponsorisé
            </p>
          </div>
        </div>

        {/* TITLE */}

        <h2
          className="
            text-2xl
            font-black
            text-white
            mt-5
          "
        >
          {ad.title}
        </h2>

        {/* DESCRIPTION */}

        <p
          className="
            text-slate-300
            mt-4
            whitespace-pre-wrap
            leading-relaxed
          "
        >
          {ad.description}
        </p>
      </div>

      {/* IMAGE */}

      {ad.image && (
        <img
          src={ad.image}
          alt={ad.title}
          className="
            w-full
            max-h-[600px]
            object-cover
          "
        />
      )}

      {/* VIDEO */}

      {ad.video && (
        <video
          controls
          className="
            w-full
            bg-black
            max-h-[600px]
          "
        >
          <source
            src={ad.video}
          />
        </video>
      )}

      {/* FOOTER */}

      <div className="p-5">
        {/* STATS */}

        <div
          className="
            flex
            items-center
            justify-between
            text-sm
            text-slate-400
            mb-4
          "
        >
          <div>
            👁 {ad.views || 0} vues
          </div>

          <div>
            🖱 {ad.clicks || 0} clics
          </div>
        </div>

        {/* ACTIONS */}

        <div
          className="
            grid
            grid-cols-4
            gap-3
          "
        >
          <button
            className={actionBtn}
          >
            <Heart size={18} />

            <span>Like</span>
          </button>

          <button
            className={actionBtn}
          >
            <MessageCircle
              size={18}
            />

            <span>
              Commenter
            </span>
          </button>

          <button
            className={actionBtn}
          >
            <Share2 size={18} />

            <span>
              Partager
            </span>
          </button>

          {/* CTA */}

          {ad.link && (
            <a
              href={ad.link}
              target="_blank"
              rel="noreferrer"
              className="
                bg-blue-500
                hover:bg-blue-600
                transition
                rounded-xl
                flex
                items-center
                justify-center
                gap-2
                py-3
                font-bold
                text-white
              "
            >
              <ExternalLink
                size={18}
              />

              Visiter
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

const actionBtn = `
  bg-[#1E293B]
  hover:bg-[#334155]
  transition
  rounded-xl
  py-3
  flex
  items-center
  justify-center
  gap-2
  text-white
  font-semibold
`;
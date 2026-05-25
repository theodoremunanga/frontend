import { useEffect, useState } from "react";
import {
  getHomeBannerAds,
  trackAdView,
  openAdLink,
} from "../../services/adService";

export default function SponsoredBanner() {
  const [ad, setAd] = useState(null);

  useEffect(() => {
    loadBanner();
  }, []);

  async function loadBanner() {
    try {
      const ads = await getHomeBannerAds();

      if (ads?.length) {
        const selected =
          ads[Math.floor(Math.random() * ads.length)];

        setAd(selected);

        trackAdView(selected.id);
      }
    } catch (error) {
      console.error("Banner ads error:", error);
    }
  }

  if (!ad) return null;

  return (
    <div
      onClick={() => openAdLink(ad)}
      className="
        relative
        w-full
        rounded-3xl
        overflow-hidden
        cursor-pointer
        bg-black
        mb-6
        shadow-2xl
      "
    >
      {/* IMAGE */}
      {ad.image && (
        <img
          src={ad.image}
          alt={ad.title}
          className="
            w-full
            h-[220px]
            md:h-[320px]
            object-cover
          "
        />
      )}

      {/* VIDEO */}
      {ad.video && (
        <video
          autoPlay
          muted
          loop
          playsInline
          className="
            w-full
            h-[220px]
            md:h-[320px]
            object-cover
          "
        >
          <source src={ad.video} />
        </video>
      )}

      {/* OVERLAY */}
      <div
        className="
          absolute
          inset-0
          bg-gradient-to-t
          from-black/80
          via-black/30
          to-transparent
        "
      />

      {/* CONTENT */}
      <div
        className="
          absolute
          bottom-0
          left-0
          right-0
          p-6
        "
      >
        <div className="flex items-center gap-2 mb-2">
          <span
            className="
              bg-yellow-500
              text-black
              text-xs
              font-bold
              px-3
              py-1
              rounded-full
            "
          >
            SPONSORISÉ
          </span>

          {ad.advertiser && (
            <span className="text-white/80 text-sm">
              {ad.advertiser}
            </span>
          )}
        </div>

        <h1
          className="
            text-white
            text-2xl
            md:text-4xl
            font-extrabold
            mb-2
          "
        >
          {ad.title}
        </h1>

        {ad.description && (
          <p
            className="
              text-gray-200
              text-sm
              md:text-base
              max-w-2xl
            "
          >
            {ad.description}
          </p>
        )}

        {/* BUTTON */}
        {ad.link && (
          <button
            className="
              mt-4
              bg-green-500
              hover:bg-green-600
              transition
              px-6
              py-3
              rounded-xl
              text-white
              font-bold
            "
          >
            Découvrir
          </button>
        )}
      </div>
    </div>
  );
}
import { useEffect, useState } from "react";

import AdCard from "../components/ads/AdCard";
import AdComments from "../components/ads/AdComments";
import SponsoredBanner from "../components/ads/SponsoredBanner";
import AdCarousel from "../components/ads/AdCarousel";

import {
  getSponsoredPosts,
} from "../services/adService";

export default function AdsPage() {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAds();
  }, []);

  async function loadAds() {
    try {
      const data = await getSponsoredPosts();

      setAds(data || []);
    } catch (error) {
      console.error("Ads page error:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="
        min-h-screen
        bg-[#0B1120]
        text-white
        px-4
        py-6
      "
    >
      {/* TOP BANNER */}
      <SponsoredBanner />

      {/* CAROUSEL */}
      <div className="mb-8">
        <AdCarousel />
      </div>

      {/* HEADER */}
      <div className="mb-8">
        <h1
          className="
            text-3xl
            md:text-4xl
            font-extrabold
            mb-2
          "
        >
          Publications sponsorisées
        </h1>

        <p className="text-gray-400">
          Découvrez les partenaires et offres
          exclusives de 6BetBall.
        </p>
      </div>

      {/* LOADING */}
      {loading && (
        <div className="text-center py-10">
          Chargement des publicités...
        </div>
      )}

      {/* EMPTY */}
      {!loading && ads.length === 0 && (
        <div
          className="
            bg-[#111827]
            border border-gray-800
            rounded-2xl
            p-8
            text-center
          "
        >
          Aucune publicité disponible.
        </div>
      )}

      {/* ADS */}
      <div
        className="
          max-w-3xl
          mx-auto
        "
      >
        {ads.map((ad) => (
          <div
            key={ad.id}
            className="mb-8"
          >
            <AdCard ad={ad} />

            <AdComments ad={ad} />
          </div>
        ))}
      </div>
    </div>
  );
}
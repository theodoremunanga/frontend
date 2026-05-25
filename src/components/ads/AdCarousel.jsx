import { useEffect, useState } from "react";
import AdCard from "./AdCard";
import { getCarouselAds } from "../../services/adService";

export default function AdCarousel() {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAds();
  }, []);

  async function loadAds() {
    try {
      const data = await getCarouselAds();
      setAds(data || []);
    } catch (error) {
      console.error("Carousel ads error:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="text-center text-gray-400 py-4">
        Chargement des publicités...
      </div>
    );
  }

  if (!ads.length) return null;

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex gap-4 pb-2">
        {ads.map((ad) => (
          <div
            key={ad.id}
            className="min-w-[320px] max-w-[320px]"
          >
            <AdCard
              ad={ad}
              compact={true}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
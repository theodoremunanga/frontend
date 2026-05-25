import axios from "axios";

/**
 * =====================================================
 * API BASE URL
 * =====================================================
 */

const API =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/api";

/**
 * =====================================================
 * AXIOS INSTANCES
 * =====================================================
 */

// ================= ADMIN =================
const adminApi = axios.create({
  baseURL: `${API}/admin`,
});

// ================= PUBLIC ADS =================
const publicAdsApi = axios.create({
  baseURL: `${API}/ads`,
});

/**
 * =====================================================
 * TOKEN HELPER
 * =====================================================
 */

function getToken() {
  return localStorage.getItem("token");
}

/**
 * =====================================================
 * ADMIN AUTH INTERCEPTOR
 * =====================================================
 */

adminApi.interceptors.request.use(
  (config) => {
    const token = getToken();

    if (token) {
      config.headers.Authorization =
        `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * =====================================================
 * ERROR HELPER
 * =====================================================
 */

function handleError(
  error,
  label = "API Error"
) {
  console.error(
    `❌ ${label}:`,
    error?.response?.data ||
      error.message
  );

  throw error;
}

/**
 * =====================================================
 * CREATE AD (ADMIN)
 * =====================================================
 */

export async function createAd(adData) {
  try {
    const response = await adminApi.post(
      "/ads",
      adData
    );

    return response.data;
  } catch (error) {
    handleError(error, "Create ad");
  }
}

/**
 * =====================================================
 * GET ALL ADS (ADMIN)
 * =====================================================
 */

export async function getAllAds() {
  try {
    const response = await adminApi.get(
      "/ads"
    );

    return response.data.ads || [];
  } catch (error) {
    handleError(error, "Get all ads");
  }
}

/**
 * =====================================================
 * GET SINGLE AD (ADMIN)
 * =====================================================
 */

export async function getAdById(id) {
  try {
    const response = await adminApi.get(
      `/ads/${id}`
    );

    return response.data.ad;
  } catch (error) {
    handleError(error, "Get ad");
  }
}

/**
 * =====================================================
 * UPDATE AD (ADMIN)
 * =====================================================
 */

export async function updateAd(
  id,
  data
) {
  try {
    const response = await adminApi.put(
      `/ads/${id}`,
      data
    );

    return response.data;
  } catch (error) {
    handleError(error, "Update ad");
  }
}

/**
 * =====================================================
 * DELETE AD (ADMIN)
 * =====================================================
 */

export async function deleteAd(id) {
  try {
    const response = await adminApi.delete(
      `/ads/${id}`
    );

    return response.data;
  } catch (error) {
    handleError(error, "Delete ad");
  }
}

/**
 * =====================================================
 * TOGGLE AD STATUS (ADMIN)
 * =====================================================
 */

export async function toggleAdStatus(
  id
) {
  try {
    const response =
      await adminApi.patch(
        `/ads/${id}/toggle`
      );

    return response.data;
  } catch (error) {
    handleError(
      error,
      "Toggle ad status"
    );
  }
}

/**
 * =====================================================
 * PUBLIC ACTIVE ADS
 * =====================================================
 */

export async function getActiveAds(
  category = ""
) {
  try {
    const response =
      await publicAdsApi.get(
        "/active",
        {
          params: category
            ? { category }
            : {},
        }
      );

    // Compatible avec plusieurs formats backend
    return (
      response.data.ads ||
      response.data ||
      []
    );
  } catch (error) {
    console.error(
      "❌ Get active ads:",
      error?.response?.data ||
        error.message
    );

    return [];
  }
}

/**
 * =====================================================
 * TRACK VIEW
 * =====================================================
 */

export async function trackAdView(id) {
  if (!id) return;

  try {
    await publicAdsApi.post(
      `/${id}/view`,
      {}
    );
  } catch (error) {
    console.error(
      "❌ Track view error:",
      error?.response?.data ||
        error.message
    );
  }
}

/**
 * =====================================================
 * TRACK CLICK
 * =====================================================
 */

export async function trackAdClick(
  id
) {
  if (!id) return;

  try {
    await publicAdsApi.post(
      `/${id}/click`,
      {}
    );
  } catch (error) {
    console.error(
      "❌ Track click error:",
      error?.response?.data ||
        error.message
    );
  }
}

/**
 * =====================================================
 * OPEN AD LINK
 * =====================================================
 */

export async function openAdLink(ad) {
  if (!ad?.id) return;

  try {
    await trackAdClick(ad.id);

    if (ad.link) {
      window.open(
        ad.link,
        "_blank",
        "noopener,noreferrer"
      );
    }
  } catch (error) {
    console.error(
      "❌ Open ad link error:",
      error
    );
  }
}

/**
 * =====================================================
 * CATEGORY HELPERS
 * =====================================================
 */

export async function getHomeBannerAds() {
  return await getActiveAds(
    "home_banner"
  );
}

export async function getHomeFeedAds() {
  return await getActiveAds(
    "home_feed"
  );
}

export async function getPreMatchAds() {
  return await getActiveAds(
    "pre_match"
  );
}

export async function getPostMatchAds() {
  return await getActiveAds(
    "post_match"
  );
}

export async function getCarouselAds() {
  return await getActiveAds(
    "carousel"
  );
}

export async function getSponsoredPosts() {
  return await getActiveAds(
    "sponsored_post"
  );
}

export async function getAdComments(
  adId
) {
  try {
    const response =
      await publicAdsApi.get(
        `/${adId}/comments`
      );

    return (
      response.data.comments || []
    );
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function addAdComment(
  adId,
  comment
) {
  try {
    const response =
      await adminApi.post(
        `/ads/${adId}/comments`,
        { comment }
      );

    return response.data;
  } catch (error) {
    console.error(error);
  }
}

/**
 * =====================================================
 * EXPORTS
 * =====================================================
 */

export {
  adminApi,
  publicAdsApi,
};

export default adminApi;
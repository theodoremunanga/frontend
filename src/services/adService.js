import axios from "axios";

/**
 * =====================================================
 * ENV
 * =====================================================
 */

// API
export const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://backend-ad3t.onrender.com/api";

// SOCKET
export const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  "https://backend-ad3t.onrender.com";

/**
 * =====================================================
 * AXIOS MAIN INSTANCE
 * =====================================================
 */

const api = axios.create({
  baseURL: API_URL,

  timeout: 20000,

  withCredentials: true,
});

/**
 * =====================================================
 * SPECIALIZED INSTANCES
 * =====================================================
 */

// ================= ADMIN =================

const adminApi = axios.create({
  baseURL: `${API_URL}/admin`,

  timeout: 20000,

  withCredentials: true,
});

// ================= PUBLIC ADS =================

const publicAdsApi = axios.create({
  baseURL: `${API_URL}/ads`,

  timeout: 20000,

  withCredentials: true,
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
 * AUTH INTERCEPTOR
 * =====================================================
 */

const attachToken = (config) => {
  const token = getToken();

  if (token) {
    config.headers.Authorization =
      `Bearer ${token}`;
  }

  return config;
};

api.interceptors.request.use(
  attachToken,
  (error) => Promise.reject(error)
);

adminApi.interceptors.request.use(
  attachToken,
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
 * CREATE AD
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
 * GET ALL ADS
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
 * GET SINGLE AD
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
 * UPDATE AD
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
 * DELETE AD
 * =====================================================
 */

export async function deleteAd(id) {
  try {
    const response =
      await adminApi.delete(
        `/ads/${id}`
      );

    return response.data;
  } catch (error) {
    handleError(error, "Delete ad");
  }
}

/**
 * =====================================================
 * TOGGLE AD STATUS
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
 * GET ACTIVE ADS
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

/**
 * =====================================================
 * COMMENTS
 * =====================================================
 */

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

export default api;
/**
 * Image Cache Utility
 * Preloads and caches images for faster loading across the app
 * Uses both memory cache and localStorage for persistence
 */

const IMAGE_CACHE_KEY = 'bstoreapp-image-cache';
const MAX_CACHE_SIZE = 500; // Maximum number of images to cache

// In-memory cache for loaded image blobs
const imageCache = new Map();

// Load cache from localStorage
function loadCacheMetadata() {
  try {
    const raw = localStorage.getItem(IMAGE_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

// Save cache metadata to localStorage
function saveCacheMetadata(metadata) {
  try {
    localStorage.setItem(IMAGE_CACHE_KEY, JSON.stringify(metadata));
  } catch (e) {
    console.warn('Failed to save image cache metadata:', e);
  }
}

/**
 * Get cached image URL from memory or localStorage
 * @param {string} src - Image source URL
 * @returns {string|null} - Cached URL or null
 */
export function getCachedImage(src) {
  if (!src) return null;

  // Check memory cache first
  if (imageCache.has(src)) {
    return imageCache.get(src);
  }

  // Check localStorage cache
  const cacheMeta = loadCacheMetadata();
  if (cacheMeta[src]) {
    const cachedData = cacheMeta[src];
    // Check if cache is still valid (7 days)
    const age = Date.now() - cachedData.timestamp;
    if (age < 7 * 24 * 60 * 60 * 1000) {
      return cachedData.blobUrl;
    }
    // Expired, remove from cache
    delete cacheMeta[src];
    saveCacheMetadata(cacheMeta);
  }

  return null;
}

/**
 * Cache an image by preloading it
 * Uses browser's native image caching instead of fetch/blob
 * @param {string} src - Image source URL
 * @returns {Promise<string>} - Cached URL (original URL)
 */
export async function cacheImage(src) {
  if (!src) return null;

  // Return if already cached
  const existing = getCachedImage(src);
  if (existing) return existing;

  // Preload image using Image object (uses browser cache)
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      // Image loaded successfully, browser has cached it
      // Store reference in memory cache (the URL itself)
      imageCache.set(src, src);
      
      // Store metadata in localStorage
      try {
        const cacheMeta = loadCacheMetadata();
        
        // Remove old entries if cache is too large
        const keys = Object.keys(cacheMeta);
        if (keys.length >= MAX_CACHE_SIZE) {
          const sorted = keys.sort((a, b) => cacheMeta[a].timestamp - cacheMeta[b].timestamp);
          for (let i = 0; i < 50; i++) {
            delete cacheMeta[sorted[i]];
          }
        }
        
        cacheMeta[src] = {
          timestamp: Date.now(),
          url: src,
          cached: true,
        };
        
        saveCacheMetadata(cacheMeta);
      } catch (e) {
        console.warn('Failed to persist image cache metadata:', e);
      }
      
      resolve(src);
    };
    
    img.onerror = () => {
      console.warn('Failed to preload image:', src);
      reject(new Error('Failed to load image'));
    };
    
    img.src = src;
  });
}

/**
 * Preload multiple images at once
 * @param {string[]} imageUrls - Array of image URLs
 * @returns {Promise<void>}
 */
export async function preloadImages(imageUrls) {
  if (!Array.isArray(imageUrls)) return;

  // Filter out already cached images
  const toLoad = imageUrls.filter(url => url && !getCachedImage(url));

  if (toLoad.length === 0) return;

  // Load images in parallel (max 10 at a time)
  const batchSize = 10;
  for (let i = 0; i < toLoad.length; i += batchSize) {
    const batch = toLoad.slice(i, i + batchSize);
    await Promise.all(batch.map(url => cacheImage(url)).catch(() => {}));
  }
}

/**
 * Clear all cached images
 */
export function clearImageCache() {
  // Revoke all blob URLs
  imageCache.forEach((url) => {
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  });

  // Clear memory cache
  imageCache.clear();

  // Clear localStorage cache
  try {
    localStorage.removeItem(IMAGE_CACHE_KEY);
  } catch (e) {
    console.warn('Failed to clear image cache:', e);
  }
}

/**
 * Extract all image URLs from products array
 * @param {Array} products - Array of product objects
 * @returns {string[]} - Array of image URLs
 */
export function extractProductImages(products) {
  if (!Array.isArray(products)) return [];

  const images = [];

  products.forEach(product => {
    if (product.image) {
      // Split comma-separated images
      const imageList = product.image.split(',').map(img => img.trim()).filter(Boolean);
      images.push(...imageList);
    }
    if (product.imageUrl) {
      images.push(product.imageUrl);
    }
    if (product.iconUrl) {
      images.push(product.iconUrl);
    }
  });

  // Remove duplicates
  return [...new Set(images)];
}

/**
 * Get cached or original image URL
 * Automatically caches if not already cached
 * @param {string} src - Image source URL
 * @returns {Promise<string>} - Cached or original URL
 */
export async function getOptimizedImage(src) {
  if (!src) return null;

  const cached = getCachedImage(src);
  if (cached) return cached;

  // Cache and return
  return await cacheImage(src);
}

// Auto-preload images when products are loaded
export function autoPreloadProducts(products) {
  const images = extractProductImages(products);
  // Preload in background without blocking
  setTimeout(() => {
    preloadImages(images);
  }, 100);
}

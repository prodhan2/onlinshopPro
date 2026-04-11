import { db, auth } from '../firebase';
import { collection, doc, setDoc, deleteDoc, getDocs, query, where } from 'firebase/firestore';

const WISHLIST_CACHE_KEY = 'beautiful-dinajpur-wishlist';

/**
 * Add product to wishlist in Firestore
 */
export async function addToWishlist(productId, product) {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.warn('User not authenticated for wishlist');
      return false;
    }

    const wishlistRef = doc(
      collection(db, 'wishlists', user.uid, 'items'),
      productId
    );

    await setDoc(wishlistRef, {
      ...product,
      productId,
      addedAt: new Date(),
    });

    // Update local cache
    updateLocalWishlistCache(productId, 'add');
    return true;
  } catch (error) {
    console.error('Error adding to wishlist:', error);
    return false;
  }
}

/**
 * Remove product from wishlist in Firestore
 */
export async function removeFromWishlist(productId) {
  try {
    const user = auth.currentUser;
    if (!user) return false;

    const wishlistRef = doc(
      db,
      'wishlists',
      user.uid,
      'items',
      productId
    );

    await deleteDoc(wishlistRef);

    // Update local cache
    updateLocalWishlistCache(productId, 'remove');
    return true;
  } catch (error) {
    console.error('Error removing from wishlist:', error);
    return false;
  }
}

/**
 * Get wishlist items from Firestore
 */
export async function getWishlist() {
  try {
    const user = auth.currentUser;
    if (!user) return [];

    const wishlistRef = collection(db, 'wishlists', user.uid, 'items');
    const snapshot = await getDocs(wishlistRef);

    const items = [];
    snapshot.forEach((doc) => {
      items.push({ id: doc.id, ...doc.data() });
    });

    // Cache the wishlist
    localStorage.setItem(WISHLIST_CACHE_KEY, JSON.stringify(items));
    return items;
  } catch (error) {
    console.error('Error fetching wishlist:', error);
    return getLocalWishlistCache(); // Fallback to local cache
  }
}

/**
 * Check if product is in wishlist
 */
export async function isInWishlist(productId) {
  try {
    const user = auth.currentUser;
    if (!user) return false;

    const wishlistRef = collection(db, 'wishlists', user.uid, 'items');
    const q = query(wishlistRef, where('productId', '==', productId));
    const snapshot = await getDocs(q);

    return snapshot.size > 0;
  } catch (error) {
    console.error('Error checking wishlist:', error);
    return isInLocalWishlist(productId); // Fallback to local check
  }
}

/**
 * Get wishlist count
 */
export async function getWishlistCount() {
  try {
    const user = auth.currentUser;
    if (!user) return 0;

    const wishlistRef = collection(db, 'wishlists', user.uid, 'items');
    const snapshot = await getDocs(wishlistRef);
    return snapshot.size;
  } catch (error) {
    console.error('Error fetching wishlist count:', error);
    const items = getLocalWishlistCache();
    return items.length;
  }
}

// ============ Local Cache Functions ============

function getLocalWishlistCache() {
  try {
    const cached = localStorage.getItem(WISHLIST_CACHE_KEY);
    return cached ? JSON.parse(cached) : [];
  } catch {
    return [];
  }
}

function isInLocalWishlist(productId) {
  const items = getLocalWishlistCache();
  return items.some((item) => item.id === productId || item.productId === productId);
}

function updateLocalWishlistCache(productId, action) {
  try {
    const items = getLocalWishlistCache();

    if (action === 'add') {
      // Find product and add to cache if not already there
      if (!items.some((item) => item.id === productId || item.productId === productId)) {
        items.push({ productId, id: productId });
      }
    } else if (action === 'remove') {
      const filtered = items.filter(
        (item) => item.id !== productId && item.productId !== productId
      );
      localStorage.setItem(WISHLIST_CACHE_KEY, JSON.stringify(filtered));
      return;
    }

    localStorage.setItem(WISHLIST_CACHE_KEY, JSON.stringify(items));
  } catch (error) {
    console.error('Error updating local wishlist cache:', error);
  }
}

/**
 * Clear wishlist
 */
export async function clearWishlist() {
  try {
    const user = auth.currentUser;
    if (!user) return false;

    const items = await getWishlist();

    for (const item of items) {
      await removeFromWishlist(item.id);
    }

    localStorage.removeItem(WISHLIST_CACHE_KEY);
    return true;
  } catch (error) {
    console.error('Error clearing wishlist:', error);
    return false;
  }
}

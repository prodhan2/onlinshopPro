/**
 * Seller Trust Badge Utilities
 * Determines trust badges based on seller metrics
 */

export const BADGE_TYPES = {
  VERIFIED: 'verified',
  TOP_SELLER: 'top-seller',
  TRUSTED: 'trusted',
  NEW_SELLER: 'new-seller',
};

export const BADGE_INFO = {
  [BADGE_TYPES.VERIFIED]: {
    icon: '✓',
    label: 'Verified Seller',
    color: '#28a745',
    description: 'This seller has been verified',
    requirement: 'Account verified',
  },
  [BADGE_TYPES.TOP_SELLER]: {
    icon: '⭐',
    label: 'Top Seller',
    color: '#ffc107',
    description: 'Consistently high ratings',
    requirement: '>50 orders, 4.5★ rating',
  },
  [BADGE_TYPES.TRUSTED]: {
    icon: '🏆',
    label: 'Trusted',
    color: '#667eea',
    description: 'Trusted by many customers',
    requirement: '>100 orders, 4.7★ rating',
  },
  [BADGE_TYPES.NEW_SELLER]: {
    icon: '🆕',
    label: 'New Seller',
    color: '#17a2b8',
    description: 'Recently joined our marketplace',
    requirement: '<30 days old',
  },
};

/**
 * Calculate seller badges based on metrics
 */
export function getSellerBadges(sellerData = {}) {
  const badges = [];
  const {
    verified = false,
    totalOrders = 0,
    averageRating = 0,
    createdDate = null,
    cancellationRate = 0,
  } = sellerData;

  // Check if seller is verified
 if (verified) {
    badges.push(BADGE_TYPES.VERIFIED);
  }

  // Check if new seller (created within last 30 days)
  if (createdDate) {
    const daysOld = Math.floor(
      (new Date() - new Date(createdDate)) / (1000 * 60 * 60 * 24)
    );
    if (daysOld < 30) {
      badges.push(BADGE_TYPES.NEW_SELLER);
    }
  }

  // Check for Trusted badge (highest tier)
  if (totalOrders > 100 && averageRating >= 4.7 && cancellationRate < 2) {
    badges.push(BADGE_TYPES.TRUSTED);
  }
  // Check for Top Seller badge
  else if (totalOrders > 50 && averageRating >= 4.5 && cancellationRate < 3) {
    badges.push(BADGE_TYPES.TOP_SELLER);
  }

  return badges;
}

/**
 * Get badge info with labels and styling
 */
export function getBadgeDisplay(badgeType) {
  return BADGE_INFO[badgeType] || null;
}

/**
 * Format seller metrics for display
 */
export function formatSellerMetrics(sellerData = {}) {
  const { totalOrders = 0, averageRating = 0, cancellationRate = 0 } = sellerData;

  return {
    orders: Math.max(0, totalOrders),
    rating: Math.min(5, Math.max(0, averageRating)),
    ratingDisplay: averageRating.toFixed(1),
    cancellationRate: cancellationRate.toFixed(1),
    responseTime: sellerData.responseTime || 'Fast',
  };
}

/**
 * Calculate seller score (0-100)
 */
export function getSellerScore(sellerData = {}) {
  const {
    totalOrders = 0,
    averageRating = 5,
    cancellationRate = 0,
  } = sellerData;

  let score = 50; // Base score

  // Add points for orders (max 25 points)
  score += Math.min(25, (Math.min(totalOrders, 500) / 500) * 25);

  // Add points for rating (max 20 points)
  score += (averageRating / 5) * 20;

  // Subtract points for cancellation rate (max 20 points)
  score -= Math.min(20, cancellationRate * 2);

  // Clamp score between 0 and 100
  return Math.max(0, Math.min(100, score));
}

/**
 * Get seller tier based on metrics
 */
export function getSellerTier(sellerData = {}) {
  const score = getSellerScore(sellerData);

  if (score >= 90) {
    return { tier: 'Platinum', color: '#e5e4e2', icon: '👑' };
  } else if (score >= 80) {
    return { tier: 'Gold', color: '#ffd700', icon: '🥇' };
  } else if (score >= 70) {
    return { tier: 'Silver', color: '#c0c0c0', icon: '🥈' };
  } else if (score >= 60) {
    return { tier: 'Bronze', color: '#cd7f32', icon: '🥉' };
  } else {
    return { tier: 'Standard', color: '#999', icon: '⭐' };
  }
}

/**
 * Get seller health status
 */
export function getSellerHealth(sellerData = {}) {
  const {
    averageRating = 0,
    cancellationRate = 0,
  } = sellerData;

  if (averageRating >= 4.6 && cancellationRate < 1) {
    return { status: 'Excellent', color: '#28a745', icon: '✓' };
  } else if (averageRating >= 4.0 && cancellationRate < 3) {
    return { status: 'Good', color: '#17a2b8', icon: '✓' };
  } else if (averageRating >= 3.5 && cancellationRate < 5) {
    return { status: 'Fair', color: '#ffc107', icon: '!' };
  } else {
    return { status: 'Needs Improvement', color: '#dc3545', icon: '✕' };
  }
}

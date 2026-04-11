import React from 'react';
import { getBadgeDisplay, getSellerBadges } from '../utils/sellerBadgeUtils.js';

const SellerBadge = ({ badge, size = 'small' }) => {
  const badgeInfo = getBadgeDisplay(badge);

  if (!badgeInfo) return null;

  const sizeClasses = {
    small: 'seller-badge-sm',
    medium: 'seller-badge-md',
    large: 'seller-badge-lg',
  };

  return (
    <span
      className={`seller-badge ${sizeClasses[size]}`}
      style={{ backgroundColor: badgeInfo.color, borderColor: badgeInfo.color }}
      title={badgeInfo.description}
    >
      <span className="badge-icon">{badgeInfo.icon}</span>
      <span className="badge-label">{badgeInfo.label}</span>
    </span>
  );
};

export const SellerBadges = ({ sellerData, size = 'small', maxBadges = 3 }) => {
  const badges = getSellerBadges(sellerData);

  if (badges.length === 0) return null;

  return (
    <div className="seller-badges">
      {badges.slice(0, maxBadges).map((badge) => (
        <SellerBadge key={badge} badge={badge} size={size} />
      ))}
      {badges.length > maxBadges && (
        <span className="badge-more">+{badges.length - maxBadges}</span>
      )}
    </div>
  );
};

export default SellerBadge;

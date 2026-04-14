import { useEffect, useMemo, useState } from 'react';
import { addToCart, getCartItem, isProductInCart, subscribeCart } from '../bstoreapp/cardManager';
import FullScreenImageView from '../bstoreapp/imageview';
import { getDiscountedUnitPrice, parseNumber, splitProductImages } from '../bstoreapp/models';
import { fetchShippingRules } from '../bstoreapp/shippingrules';
import ShimmerImage from '../bstoreapp/ShimmerImage';
import { FiArrowLeft, FiShoppingCart, FiStar, FiPackage } from 'react-icons/fi';
import './details.css';

export default function ProductDetailsPage({ product, currentUser, onBack, onOpenCart, onRequireLogin, onBuyNow }) {
  const [quantity, setQuantity] = useState(1);
  const [shippingRules, setShippingRules] = useState([]);
  const [selectedRule, setSelectedRule] = useState(null);
  const [loadingRules, setLoadingRules] = useState(true);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [initialIndex, setInitialIndex] = useState(0);
  const [inCart, setInCart] = useState(() => isProductInCart(product));

  useEffect(() => subscribeCart(() => {
    setInCart(isProductInCart(product));
    const item = getCartItem(product);
    if (item) {
      setQuantity(item.quantity);
    }
  }), [product]);

  useEffect(() => {
    let ignore = false;

    async function loadRules() {
      try {
        const rules = await fetchShippingRules();
        if (!ignore) {
          setShippingRules(rules);
          setSelectedRule(rules[0] ?? null);
        }
      } finally {
        if (!ignore) {
          setLoadingRules(false);
        }
      }
    }

    loadRules();
    return () => {
      ignore = true;
    };
  }, []);

  const images = splitProductImages(product);
  const unitPrice = getDiscountedUnitPrice(product);
  const subtotal = unitPrice * quantity;
  const shippingCharge = parseNumber(selectedRule?.charge, 60);
  const total = subtotal + shippingCharge;

  const stockLabel = useMemo(() => {
    const stock = parseNumber(product.stock, 0);
    return stock > 0 ? `${stock} in stock` : 'Out of stock';
  }, [product.stock]);

  function handleAddToCart() {
    if (!currentUser) {
      onRequireLogin?.();
      return;
    }

    if (!inCart) {
      addToCart(product, quantity);
      setInCart(true);
    }
  }

  return (
    <div className="details-page">
      {/* Mobile App Bar */}
      <div className="details-app-bar">
        <button className="details-back-btn" onClick={onBack || (() => window.history.back())}>
          <FiArrowLeft />
        </button>
        <h1 className="details-app-title">Product Details</h1>
        <button className="details-cart-btn" onClick={onOpenCart} title="Go to Cart">
          <FiShoppingCart />
          {inCart && <span className="details-cart-dot" />}
        </button>
      </div>

      <div className="details-content">
        {/* Image Gallery */}
        <div className="details-gallery">
          <div className="details-main-image">
            {images.length > 0 ? (
              <button
                className="details-image-button"
                onClick={() => {
                  setInitialIndex(0);
                  setShowImageViewer(true);
                }}
              >
                <ShimmerImage
                  src={images[0]}
                  alt={product.name}
                  wrapperClassName="details-image-shell"
                />
                {images.length > 1 && (
                  <div className="details-image-count">
                    <FiPackage /> {images.length} photos
                  </div>
                )}
              </button>
            ) : (
              <div className="details-image-placeholder">
                <FiPackage />
                <span>No image</span>
              </div>
            )}
          </div>

          {/* Thumbnail Gallery */}
          {images.length > 1 && (
            <div className="details-thumbnails">
              {images.map((image, index) => (
                <button
                  key={index}
                  className={`details-thumbnail ${index === 0 ? 'active' : ''}`}
                  onClick={() => {
                    setInitialIndex(index);
                    setShowImageViewer(true);
                  }}
                >
                  <ShimmerImage
                    src={image}
                    alt={`${product.name} ${index + 1}`}
                    wrapperClassName="details-thumb-shell"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="details-info">
          <h1 className="details-product-name">{product.name}</h1>
          <p className="details-product-desc">{product.description}</p>

          {/* Badges */}
          <div className="details-badges">
            <span className="details-badge details-badge-rating">
              <FiStar /> {product.rating || '0'}
            </span>
            <span className={`details-badge ${stockLabel.includes('Out') ? 'details-badge-out' : 'details-badge-stock'}`}>
              {stockLabel}
            </span>
            <span className="details-badge details-badge-discount">
              {product.discount || '0'}% off
            </span>
          </div>

          {/* Price */}
          <div className="details-price-box">
            <span className="details-price-current">৳{unitPrice.toFixed(2)}</span>
            <span className="details-price-original">৳{parseNumber(product.price).toFixed(2)}</span>
            {product.discount && <span className="details-price-save">Save {product.discount}%</span>}
          </div>

          {/* Quantity & Shipping */}
          <div className="details-form">
            <div className="details-form-row">
              <label className="details-label">Quantity</label>
              <div className="details-qty-selector">
                <button
                  className="details-qty-btn"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  -
                </button>
                <input
                  type="number"
                  className="details-qty-input"
                  min="1"
                  value={quantity}
                  onChange={e => setQuantity(Math.max(1, parseInt(e.target.value || '1', 10)))}
                />
                <button
                  className="details-qty-btn"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  +
                </button>
              </div>
            </div>

            <div className="details-form-row">
              <label className="details-label">Delivery Area</label>
              {loadingRules ? (
                <div className="details-loading">Loading shipping options...</div>
              ) : (
                <select
                  className="details-select"
                  value={selectedRule?.areaName ?? ''}
                  onChange={e => setSelectedRule(shippingRules.find(r => r.areaName === e.target.value) ?? null)}
                >
                  {shippingRules.map(rule => (
                    <option key={rule.areaName} value={rule.areaName}>
                      {rule.areaName} - ৳{parseNumber(rule.charge, 60).toFixed(2)}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Price Summary */}
          <div className="details-summary">
            <div className="details-summary-row">
              <span>Subtotal</span>
              <span>৳{subtotal.toFixed(2)}</span>
            </div>
            <div className="details-summary.row">
              <span>Shipping</span>
              <span>৳{shippingCharge.toFixed(2)}</span>
            </div>
            <div className="details-summary-row details-summary-total">
              <span>Total</span>
              <span>৳{total.toFixed(2)}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="details-actions">
            <button className="details-btn details-btn-cart" onClick={handleAddToCart}>
              <FiShoppingCart /> {inCart ? 'In Cart' : 'Add to Cart'}
            </button>
            <button
              className="details-btn details-btn-buy"
              onClick={() => {
                if (!currentUser) {
                  onRequireLogin?.();
                  return;
                }
                onBuyNow({ product, quantity, shippingRule: selectedRule, totalPrice: total });
              }}
              disabled={!currentUser || !selectedRule || loadingRules}
            >
              Buy Now - ৳{total.toFixed(2)}
            </button>
          </div>
        </div>
      </div>

      {/* Image Viewer */}
      {showImageViewer && (
        <FullScreenImageView
          images={images}
          initialIndex={initialIndex}
          onClose={() => setShowImageViewer(false)}
        />
      )}
    </div>
  );
}

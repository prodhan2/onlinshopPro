import { useEffect, useMemo, useRef, useState } from 'react';
import { addToCart, getCartItem, isProductInCart, subscribeCart } from '../bstoreapp/cardManager';
import FullScreenImageView from '../bstoreapp/imageview';
import { getDiscountedUnitPrice, parseNumber, splitProductImages } from '../bstoreapp/models';
import { fetchShippingRules } from '../bstoreapp/shippingrules';
import ShimmerImage from '../bstoreapp/ShimmerImage';
import { FiArrowLeft, FiChevronLeft, FiChevronRight, FiImage, FiShoppingCart, FiStar } from 'react-icons/fi';
import './details.css';

export default function ProductDetailsPage({ product, currentUser, onBack, onOpenCart, onRequireLogin, onBuyNow }) {
  const touchStartXRef = useRef(0);
  const touchEndXRef = useRef(0);
  const [quantity, setQuantity] = useState(1);
  const [shippingRules, setShippingRules] = useState([]);
  const [selectedRule, setSelectedRule] = useState(null);
  const [loadingRules, setLoadingRules] = useState(true);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [initialIndex, setInitialIndex] = useState(0);
  const [inCart, setInCart] = useState(() => isProductInCart(product));
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const images = splitProductImages(product);

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

  useEffect(() => {
    setActiveImageIndex(0);
  }, [product]);

  useEffect(() => {
    if (images.length <= 1) {
      setActiveImageIndex(0);
      return undefined;
    }

    const timer = window.setInterval(() => {
      setActiveImageIndex((previous) => (previous + 1) % images.length);
    }, 3500);

    return () => window.clearInterval(timer);
  }, [images.length]);

  useEffect(() => {
    if (images.length <= 1) {
      return undefined;
    }

    function handleKeyDown(event) {
      if (event.key === 'ArrowRight') {
        setActiveImageIndex((previous) => (previous + 1) % images.length);
      }
      if (event.key === 'ArrowLeft') {
        setActiveImageIndex((previous) => (previous - 1 + images.length) % images.length);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [images.length]);

  const activeImage = images[activeImageIndex] || '';
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

  function goToPreviousImage() {
    setActiveImageIndex((previous) => (previous - 1 + images.length) % images.length);
  }

  function goToNextImage() {
    setActiveImageIndex((previous) => (previous + 1) % images.length);
  }

  function handleGalleryTouchStart(event) {
    touchStartXRef.current = event.changedTouches[0]?.clientX ?? 0;
    touchEndXRef.current = touchStartXRef.current;
  }

  function handleGalleryTouchMove(event) {
    touchEndXRef.current = event.changedTouches[0]?.clientX ?? touchStartXRef.current;
  }

  function handleGalleryTouchEnd() {
    const deltaX = touchStartXRef.current - touchEndXRef.current;
    if (Math.abs(deltaX) < 45 || images.length <= 1) {
      return;
    }

    if (deltaX > 0) {
      goToNextImage();
    } else {
      goToPreviousImage();
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
        <div className="details-gallery">
          <div className="details-gallery-card">
            <div
              className="details-gallery-stage"
              onTouchStart={handleGalleryTouchStart}
              onTouchMove={handleGalleryTouchMove}
              onTouchEnd={handleGalleryTouchEnd}
            >
              {images.length ? (
                <>
                  <button
                    type="button"
                    className="details-image-button"
                    onClick={() => {
                      setInitialIndex(activeImageIndex);
                      setShowImageViewer(true);
                    }}
                  >
                    <div className="details-image-shell">
                      <ShimmerImage
                        src={activeImage}
                        alt={`${product.name} ${activeImageIndex + 1}`}
                        className="details-image-element"
                        wrapperClassName="details-image-shell"
                      />
                    </div>
                  </button>

                  {images.length > 1 ? (
                    <>
                      <button
                        type="button"
                        className="details-gallery-nav details-gallery-nav-prev"
                        onClick={goToPreviousImage}
                        aria-label="Previous image"
                      >
                        <FiChevronLeft />
                      </button>
                      <button
                        type="button"
                        className="details-gallery-nav details-gallery-nav-next"
                        onClick={goToNextImage}
                        aria-label="Next image"
                      >
                        <FiChevronRight />
                      </button>
                    </>
                  ) : null}

                  <div className="details-image-count">
                    <FiImage />
                    <span>{activeImageIndex + 1}/{images.length}</span>
                  </div>

                  <div className="details-gallery-chip">
                    Swipe or tap to explore
                  </div>
                </>
              ) : (
                <div className="details-image-placeholder">
                  <FiImage />
                  <span>No product image</span>
                </div>
              )}
            </div>

            {images.length > 1 ? (
              <>
                <div className="details-gallery-dots" aria-label="Image navigation dots">
                  {images.map((image, index) => (
                    <button
                      key={`${image}-${index}`}
                      type="button"
                      className={`details-gallery-dot ${index === activeImageIndex ? 'active' : ''}`}
                      onClick={() => setActiveImageIndex(index)}
                      aria-label={`Show image ${index + 1}`}
                    />
                  ))}
                </div>

                <div className="details-thumbnails">
                  {images.map((image, index) => (
                    <button
                      key={`${image}-thumb-${index}`}
                      type="button"
                      className={`details-thumbnail ${index === activeImageIndex ? 'active' : ''}`}
                      onClick={() => setActiveImageIndex(index)}
                      aria-label={`Preview image ${index + 1}`}
                    >
                      <div className="details-thumb-shell">
                        <ShimmerImage
                          src={image}
                          alt={`${product.name} thumbnail ${index + 1}`}
                          className="details-thumb-image"
                          wrapperClassName="details-thumb-shell"
                        />
                      </div>
                    </button>
                  ))}
                </div>

                <div className="details-gallery-meta">
                  <span className="details-gallery-meta-label">Gallery</span>
                  <span className="details-gallery-meta-value">{images.length} photos available</span>
                </div>
              </>
            ) : null}
          </div>
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
              ) : shippingRules.length === 0 ? (
                <div className="details-no-areas">No delivery areas available</div>
              ) : (
                <select
                  className="details-select"
                  value={selectedRule?.areaName ?? ''}
                  onChange={e => setSelectedRule(shippingRules.find(r => r.areaName === e.target.value) ?? null)}
                  aria-label="Delivery Area"
                >
                  <option value="" disabled>Select delivery area</option>
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
            <div className="details-summary-row">
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

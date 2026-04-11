import { useEffect, useMemo, useState } from 'react';
import { addToCart, getCartItem, isProductInCart, subscribeCart } from './cardManager';
import FullScreenImageView from './imageview';
import { getDiscountedUnitPrice, parseNumber, splitProductImages } from './models';
import { fetchShippingRules } from './shippingrules';
import ShimmerImage from './ShimmerImage';

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
    <section className="bstore-page">
      <div className="bstore-appbar mb-3">
        {/* Back button removed */}
        <h1 className="bstore-appbar__title mb-0">Details</h1>
        <div className="bstore-appbar__actions">
          <button className="btn btn-primary" type="button" onClick={onOpenCart}>
            Go to cart
          </button>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-12 col-lg-6">
          <div className="bstore-card">
            <div className="bstore-product-gallery">
              {(images.length ? images : ['']).map((image, index) => (
                <button
                  className="bstore-gallery-thumb"
                  key={`${image}-${index}`}
                  type="button"
                  onClick={() => {
                    setInitialIndex(index);
                    setShowImageViewer(true);
                  }}
                >
                  {image ? (
                    <ShimmerImage
                      src={image}
                      alt={`${product.name} ${index + 1}`}
                      wrapperClassName="bstore-gallery-image-shell"
                    />
                  ) : <span>No image</span>}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-6">
          <div className="bstore-card">
            <p className="bstore-kicker">Product Details</p>
            <h1 className="h3">{product.name}</h1>
            <p className="bstore-muted">{product.description}</p>

            <div className="d-flex flex-wrap gap-2 mb-3">
              <span className="badge text-bg-light">Rating {product.rating || '0'}</span>
              <span className="badge text-bg-light">{stockLabel}</span>
              <span className="badge text-bg-light">{product.discount || '0'}% off</span>
            </div>

            <div className="bstore-price-box">
              <strong>৳{unitPrice.toFixed(2)}</strong>
              <span className="bstore-muted">Original: ৳{parseNumber(product.price).toFixed(2)}</span>
            </div>

            <div className="row g-3 mt-2">
              <div className="col-12 col-md-4">
                <label className="form-label" htmlFor="details-qty">
                  Quantity
                </label>
                <input
                  id="details-qty"
                  className="form-control"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={event => setQuantity(Math.max(1, Number.parseInt(event.target.value || '1', 10)))}
                />
              </div>

              <div className="col-12 col-md-8">
                <label className="form-label" htmlFor="details-shipping">
                  Delivery Area
                </label>
                {loadingRules ? (
                  <div className="bstore-field-shimmer">
                    <div className="bstore-skeleton bstore-skeleton--input" />
                    <div className="bstore-skeleton bstore-skeleton--hint" />
                  </div>
                ) : (
                  <select
                    id="details-shipping"
                    className="form-select"
                    value={selectedRule?.areaName ?? ''}
                    onChange={event => setSelectedRule(shippingRules.find(rule => rule.areaName === event.target.value) ?? null)}
                    disabled={loadingRules}
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

            <div className="bstore-summary mt-4">
              <div><span>Subtotal</span><strong>৳{subtotal.toFixed(2)}</strong></div>
              <div><span>Shipping</span><strong>৳{shippingCharge.toFixed(2)}</strong></div>
              <div><span>Total</span><strong>৳{total.toFixed(2)}</strong></div>
            </div>

            <div className="d-flex flex-wrap gap-2 mt-4">
              <button className="btn btn-outline-secondary" type="button" onClick={handleAddToCart}>
                {inCart ? 'Already in cart' : 'Add to cart'}
              </button>
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => {
                  if (!currentUser) {
                    onRequireLogin?.();
                    return;
                  }

                  onBuyNow({ product, quantity, shippingRule: selectedRule, totalPrice: total });
                }}
                disabled={!currentUser || !selectedRule || loadingRules}
              >
                {currentUser ? 'Buy now' : 'Login required'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showImageViewer ? (
        <FullScreenImageView
          images={images}
          initialIndex={initialIndex}
          onClose={() => setShowImageViewer(false)}
        />
      ) : null}
    </section>
  );
}

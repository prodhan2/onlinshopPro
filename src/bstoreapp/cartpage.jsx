import { useEffect, useState } from 'react';
import { clearCart, loadCart, removeFromCart, subscribeCart, updateQuantity } from './cardManager';
import { getCartItemTotal, parseNumber } from './models';
import { fetchShippingRules } from './shippingrules';
import ShimmerImage from './ShimmerImage';

export default function CartPage({ currentUser, onBack, onRequireLogin, onCheckout }) {
  const [cartState, setCartState] = useState(() => loadCart());
  const [shippingRules, setShippingRules] = useState([]);
  const [selectedArea, setSelectedArea] = useState('');
  const [error, setError] = useState('');

  useEffect(() => subscribeCart(setCartState), []);

  useEffect(() => {
    let ignore = false;

    async function loadRules() {
      try {
        const rules = await fetchShippingRules();
        if (!ignore) {
          setShippingRules(rules);
          setSelectedArea(rules[0]?.areaName ?? '');
        }
      } catch (fetchError) {
        if (!ignore) {
          setError(fetchError.message);
        }
      }
    }

    loadRules();
    return () => {
      ignore = true;
    };
  }, []);

  const selectedRule = shippingRules.find(rule => rule.areaName === selectedArea) ?? null;
  const shippingCharge = parseNumber(selectedRule?.charge, 60);
  const grandTotal = cartState.totalPrice + shippingCharge;

  return (
    <section className="bstore-page">
      <div className="bstore-appbar mb-4">
        {/* Back button removed */}
        <h1 className="bstore-appbar__title mb-0">Cart</h1>
        <div className="d-flex gap-2 bstore-appbar__actions">
          <button className="btn btn-outline-danger" type="button" onClick={clearCart} disabled={!cartState.items.length}>
            Clear cart
          </button>
          <button
            className="btn btn-primary"
            type="button"
            disabled={!currentUser || !cartState.items.length || !selectedRule}
            onClick={() => {
              if (!currentUser) {
                onRequireLogin?.();
                return;
              }

              onCheckout({ items: cartState.items, shippingRule: selectedRule, totalPrice: grandTotal });
            }}
          >
            {currentUser ? 'Checkout' : 'Login required'}
          </button>
          <button
            className="btn btn-success"
            type="button"
            disabled={!currentUser || !cartState.items.length || !selectedRule}
            onClick={() => {
              if (!currentUser) {
                onRequireLogin?.();
                return;
              }

              onCheckout({ items: cartState.items, shippingRule: selectedRule, totalPrice: grandTotal });
            }}
          >
            {currentUser ? 'Buy Now' : 'Login required'}
          </button>
        </div>
      </div>

      {!cartState.items.length ? (
        <div className="bstore-card text-center">
          <h2 className="h4">Your cart is empty</h2>
          <p className="bstore-muted mb-0">Add products from the category page to continue.</p>
        </div>
      ) : (
        <div className="row g-4">
          <div className="col-12 col-lg-8">
            <div className="d-grid gap-3">
              {cartState.items.map(item => (
                <article className="bstore-card" key={item.product.id}>
                  <div className="d-flex flex-column flex-md-row gap-3 align-items-start">
                    <div className="bstore-cart-image">
                      <ShimmerImage
                        src={item.product.image ? item.product.image.split(',')[0]?.trim() : ''}
                        alt={item.product.name}
                        wrapperClassName="bstore-cart-image-shell"
                      />
                    </div>
                    <div className="flex-grow-1">
                      <div className="d-flex justify-content-between gap-3">
                        <div>
                          <h3 className="h5 mb-1">{item.product.name}</h3>
                          <p className="bstore-muted mb-2">{item.product.description.slice(0, 120)}</p>
                        </div>
                        <button className="btn btn-sm btn-outline-danger" type="button" onClick={() => removeFromCart(item.product.id)}>
                          Remove
                        </button>
                      </div>
                      <div className="row g-3 align-items-end">
                        <div className="col-12 col-md-4">
                          <label className="form-label" htmlFor={`cart-qty-${item.product.id}`}>
                            Quantity
                          </label>
                          <input
                            id={`cart-qty-${item.product.id}`}
                            className="form-control"
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={event => updateQuantity(item.product.id, Number.parseInt(event.target.value || '1', 10))}
                          />
                        </div>
                        <div className="col-12 col-md-4">
                          <span className="bstore-muted d-block">Unit price</span>
                          <strong>৳{(getCartItemTotal({ ...item, quantity: 1 })).toFixed(2)}</strong>
                        </div>
                        <div className="col-12 col-md-4">
                          <span className="bstore-muted d-block">Total</span>
                          <strong>৳{getCartItemTotal(item).toFixed(2)}</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="col-12 col-lg-4">
            <div className="bstore-card">
              <h2 className="h5 mb-3">Checkout Summary</h2>
              {error ? <div className="alert alert-danger">{error}</div> : null}

              <label className="form-label" htmlFor="cart-shipping-area">
                Delivery area
              </label>
              <select
                id="cart-shipping-area"
                className="form-select mb-3"
                value={selectedArea}
                onChange={event => setSelectedArea(event.target.value)}
              >
                {shippingRules.map(rule => (
                  <option key={rule.areaName} value={rule.areaName}>
                    {rule.areaName} - ৳{parseNumber(rule.charge).toFixed(2)}
                  </option>
                ))}
              </select>

              <div className="bstore-summary">
                <div><span>Items</span><strong>{cartState.totalItems}</strong></div>
                <div><span>Subtotal</span><strong>৳{cartState.totalPrice.toFixed(2)}</strong></div>
                <div><span>Shipping</span><strong>৳{shippingCharge.toFixed(2)}</strong></div>
                <div><span>Total</span><strong>৳{grandTotal.toFixed(2)}</strong></div>
              </div>

              <button
                className="btn btn-success w-100 mt-3"
                type="button"
                disabled={!currentUser || !cartState.items.length || !selectedRule}
                onClick={() => {
                  if (!currentUser) {
                    onRequireLogin?.();
                    return;
                  }

                  onCheckout({ items: cartState.items, shippingRule: selectedRule, totalPrice: grandTotal });
                }}
              >
                {currentUser ? 'Buy Now' : 'Login required'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

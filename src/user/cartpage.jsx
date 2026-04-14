import { useEffect, useState } from 'react';
import { clearCart, loadCart, removeFromCart, subscribeCart, updateQuantity } from '../bstoreapp/cardManager';
import { getCartItemTotal, parseNumber } from '../bstoreapp/models';
import { fetchShippingRules } from '../bstoreapp/shippingrules';
import ShimmerImage from '../bstoreapp/ShimmerImage';
import ConfirmDialog from '../components/ConfirmDialog';
import logo from '../bstoreapp/assets/images/logo.png';
import { FiArrowLeft, FiTrash2, FiShoppingBag } from 'react-icons/fi';
import './cart.css';

export default function CartPage({ currentUser, onBack, onRequireLogin, onCheckout }) {
  const [cartState, setCartState] = useState(() => loadCart());
  const [shippingRules, setShippingRules] = useState([]);
  const [selectedArea, setSelectedArea] = useState('');
  const [error, setError] = useState('');
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [confirmClearCart, setConfirmClearCart] = useState(false);

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
    <div className="cart-page">
      {/* Mobile App Bar */}
      <div className="cart-app-bar">
        <button className="cart-back-btn" onClick={onBack || (() => window.history.back())}>
          <FiArrowLeft />
        </button>
        <h1 className="cart-app-title">Shopping Cart ({cartState.totalItems})</h1>
        <button
          className="cart-clear-btn"
          onClick={() => setConfirmClearCart(true)}
          disabled={!cartState.items.length}
          title="Clear Cart"
        >
          <FiTrash2 />
        </button>
      </div>

      <div className="cart-content">
        {!cartState.items.length ? (
          <div className="cart-empty">
            <div className="cart-empty-icon"><FiShoppingBag /></div>
            <h2>Your cart is empty</h2>
            <p>Add products from the category page to continue.</p>
          </div>
        ) : (
          <>
            {/* Cart Items */}
            <div className="cart-items">
              {cartState.items.map(item => (
                <div className="cart-item-card" key={item.product.id}>
                  <div className="cart-item-image">
                    <ShimmerImage
                      src={item.product.image ? item.product.image.split(',')[0]?.trim() : ''}
                      alt={item.product.name}
                      wrapperClassName="cart-item-img"
                    />
                  </div>
                  <div className="cart-item-info">
                    <div className="cart-item-header">
                      <h3 className="cart-item-name">{item.product.name}</h3>
                      <button
                        className="cart-item-remove"
                        onClick={() => setConfirmRemove(item.product)}
                        title="Remove"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                    <p className="cart-item-desc">
                      {item.product.description ? item.product.description.slice(0, 80) : ''}
                    </p>
                    <div className="cart-item-footer">
                      <div className="cart-qty-selector">
                        <button
                          className="cart-qty-btn"
                          onClick={() => updateQuantity(item.product.id, Math.max(1, item.quantity - 1))}
                        >
                          -
                        </button>
                        <input
                          type="number"
                          className="cart-qty-input"
                          min="1"
                          value={item.quantity}
                          onChange={e => updateQuantity(item.product.id, Math.max(1, parseInt(e.target.value || '1', 10)))}
                        />
                        <button
                          className="cart-qty-btn"
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        >
                          +
                        </button>
                      </div>
                      <div className="cart-item-price">
                        <span>৳{(getCartItemTotal({ ...item, quantity: 1 })).toFixed(2)} ea</span>
                        <strong>৳{getCartItemTotal(item).toFixed(2)}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Checkout Summary */}
            <div className="cart-summary-card">
              <h2>Order Summary</h2>
              {error && <div className="cart-error">{error}</div>}

              <div className="cart-summary-row">
                <span>Items</span>
                <span>{cartState.totalItems}</span>
              </div>
              <div className="cart-summary-row">
                <span>Subtotal</span>
                <span>৳{cartState.totalPrice.toFixed(2)}</span>
              </div>

              <div className="cart-shipping-select">
                <label>Delivery Area</label>
                <select
                  value={selectedArea}
                  onChange={e => setSelectedArea(e.target.value)}
                >
                  {shippingRules.map(rule => (
                    <option key={rule.areaName} value={rule.areaName}>
                      {rule.areaName} - ৳{parseNumber(rule.charge).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="cart-summary-row cart-summary-total">
                <span>Total</span>
                <span>৳{grandTotal.toFixed(2)}</span>
              </div>

              <button
                className="cart-checkout-btn"
                disabled={!currentUser || !cartState.items.length || !selectedRule}
                onClick={() => {
                  if (!currentUser) {
                    onRequireLogin?.();
                    return;
                  }
                  onCheckout({ items: cartState.items, shippingRule: selectedRule, totalPrice: grandTotal });
                }}
              >
                {currentUser ? 'Checkout - ৳' + grandTotal.toFixed(2) : 'Login Required'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={confirmClearCart === true}
        title="Clear Cart?"
        message="Are you sure you want to remove all items from your cart?"
        confirmText="Clear All"
        cancelText="Cancel"
        type="danger"
        logo={logo}
        onConfirm={async () => {
          clearCart();
          setConfirmClearCart(false);
        }}
        onCancel={() => setConfirmClearCart(false)}
      />

      <ConfirmDialog
        isOpen={confirmRemove !== null}
        title="Remove Item?"
        message={confirmRemove ? `Remove "${confirmRemove.name}" from cart?` : ''}
        confirmText="Remove"
        cancelText="Cancel"
        type="warning"
        logo={logo}
        onConfirm={async () => {
          if (confirmRemove) {
            removeFromCart(confirmRemove.id);
            setConfirmRemove(null);
          }
        }}
        onCancel={() => setConfirmRemove(null)}
      />
    </div>
  );
}

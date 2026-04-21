import { useEffect, useState } from 'react';
import { clearCart, loadCart, removeFromCart, subscribeCart, updateQuantity } from '../bstoreapp/cardManager';
import { getCartItemTotal, parseNumber } from '../bstoreapp/models';
import { fetchShippingRules } from '../bstoreapp/shippingrules';
import ShimmerImage from '../bstoreapp/ShimmerImage';
import ConfirmDialog from '../components/ConfirmDialog';
import logo from '../bstoreapp/assets/images/logo.png';
import { FiArrowLeft, FiTrash2, FiShoppingBag, FiCheckSquare, FiSquare } from 'react-icons/fi';
import './cart.css';

export default function CartPage({ currentUser, onBack, onRequireLogin, onCheckout, onOpenOrders }) {
  const [cartState, setCartState]       = useState(() => loadCart());
  const [shippingRules, setShippingRules] = useState([]);
  const [selectedArea, setSelectedArea] = useState('');
  const [error, setError]               = useState('');
  const [confirmRemove, setConfirmRemove]     = useState(null);
  const [confirmClearCart, setConfirmClearCart] = useState(false);
  const [confirmDeleteSelected, setConfirmDeleteSelected] = useState(false);

  // Selection state
  const [selectMode, setSelectMode]     = useState(false);
  const [selectedIds, setSelectedIds]   = useState(new Set());

  useEffect(() => subscribeCart(setCartState), []);

  useEffect(() => {
    let ignore = false;
    async function loadRules() {
      try {
        const rules = await fetchShippingRules();
        if (!ignore) { setShippingRules(rules); setSelectedArea(rules[0]?.areaName ?? ''); }
      } catch (e) { if (!ignore) setError(e.message); }
    }
    loadRules();
    return () => { ignore = true; };
  }, []);

  const selectedRule   = shippingRules.find(r => r.areaName === selectedArea) ?? null;
  const shippingCharge = parseNumber(selectedRule?.charge, 60);
  const grandTotal     = cartState.totalPrice + shippingCharge;

  const allIds      = cartState.items.map(i => i.product.id);
  const allSelected = allIds.length > 0 && allIds.every(id => selectedIds.has(id));

  function toggleSelectMode() {
    setSelectMode(v => !v);
    setSelectedIds(new Set());
  }

  function toggleItem(id) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelectedIds(allSelected ? new Set() : new Set(allIds));
  }

  function deleteSelected() {
    selectedIds.forEach(id => removeFromCart(id));
    setSelectedIds(new Set());
    setSelectMode(false);
    setConfirmDeleteSelected(false);
  }

  return (
    <div className="cart-page">
      {/* App Bar */}
      <div className="cart-app-bar">
        <button className="cart-back-btn" onClick={onBack || (() => window.history.back())}>
          <FiArrowLeft />
        </button>
        <h1 className="cart-app-title">
          {selectMode && selectedIds.size > 0
            ? `${selectedIds.size} selected`
            : `Cart (${cartState.totalItems})`}
        </h1>
        <div className="cart-appbar-actions">
          {!selectMode && (
            <button className="cart-orders-btn" onClick={onOpenOrders} title="My Orders">
              <FiShoppingBag />
              <span>My Orders</span>
            </button>
          )}
          {selectMode ? (
            <>
              {selectedIds.size > 0 && (
                <button className="cart-delete-selected-btn" onClick={() => setConfirmDeleteSelected(true)} title="Delete selected">
                  <FiTrash2 />
                </button>
              )}
              <button className="cart-select-cancel-btn" onClick={toggleSelectMode}>
                Cancel
              </button>
            </>
          ) : (
            <>
              {cartState.items.length > 0 && (
                <button className="cart-select-btn" onClick={toggleSelectMode} title="Select items">
                  <FiCheckSquare />
                </button>
              )}
              <button className="cart-clear-btn" onClick={() => setConfirmClearCart(true)} disabled={!cartState.items.length} title="Clear all">
                <FiTrash2 />
              </button>
            </>
          )}
        </div>
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
            {/* Select All bar */}
            {selectMode && (
              <div className="cart-select-all-bar">
                <button className="cart-select-all-btn" onClick={toggleAll}>
                  {allSelected ? <FiCheckSquare style={{ color: '#3b82f6' }} /> : <FiSquare />}
                  <span>{allSelected ? 'Deselect All' : 'Select All'}</span>
                </button>
                <span className="cart-select-hint">{selectedIds.size} of {allIds.length} selected</span>
              </div>
            )}

            {/* Cart Items */}
            <div className="cart-items">
              {cartState.items.map(item => {
                const isSelected = selectedIds.has(item.product.id);
                return (
                  <div
                    className={`cart-item-card ${selectMode && isSelected ? 'cart-item-selected' : ''}`}
                    key={item.product.id}
                    onClick={selectMode ? () => toggleItem(item.product.id) : undefined}
                    style={selectMode ? { cursor: 'pointer' } : {}}
                  >
                    {/* Checkbox */}
                    {selectMode && (
                      <div className="cart-item-checkbox">
                        {isSelected
                          ? <FiCheckSquare style={{ color: '#3b82f6', fontSize: '1.2rem' }} />
                          : <FiSquare style={{ color: '#cbd5e1', fontSize: '1.2rem' }} />}
                      </div>
                    )}

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
                        {!selectMode && (
                          <button className="cart-item-remove" onClick={() => setConfirmRemove(item.product)} title="Remove">
                            <FiTrash2 />
                          </button>
                        )}
                      </div>
                      <p className="cart-item-desc">
                        {item.product.description ? item.product.description.slice(0, 80) : ''}
                      </p>
                      <div className="cart-item-footer">
                        {!selectMode && (
                          <div className="cart-qty-selector">
                            <button className="cart-qty-btn" onClick={() => updateQuantity(item.product.id, Math.max(1, item.quantity - 1))}>-</button>
                            <input
                              type="number" className="cart-qty-input" min="1"
                              value={item.quantity}
                              onChange={e => updateQuantity(item.product.id, Math.max(1, parseInt(e.target.value || '1', 10)))}
                            />
                            <button className="cart-qty-btn" onClick={() => updateQuantity(item.product.id, item.quantity + 1)}>+</button>
                          </div>
                        )}
                        <div className="cart-item-price">
                          <span>৳{getCartItemTotal({ ...item, quantity: 1 }).toFixed(2)} ea</span>
                          <strong>৳{getCartItemTotal(item).toFixed(2)}</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Checkout Summary */}
            {!selectMode && (
              <div className="cart-summary-card">
                <h2>Order Summary</h2>
                {error && <div className="cart-error">{error}</div>}
                <div className="cart-summary-row"><span>Items</span><span>{cartState.totalItems}</span></div>
                <div className="cart-summary-row"><span>Subtotal</span><span>৳{cartState.totalPrice.toFixed(2)}</span></div>
                <div className="cart-shipping-select">
                  <label>Delivery Area</label>
                  <select value={selectedArea} onChange={e => setSelectedArea(e.target.value)}>
                    {shippingRules.map(rule => (
                      <option key={rule.areaName} value={rule.areaName}>
                        {rule.areaName} - ৳{parseNumber(rule.charge).toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="cart-summary-row cart-summary-total"><span>Total</span><span>৳{grandTotal.toFixed(2)}</span></div>
                <button
                  className="cart-checkout-btn"
                  disabled={!currentUser || !cartState.items.length || !selectedRule}
                  onClick={() => {
                    if (!currentUser) { onRequireLogin?.(); return; }
                    onCheckout({ items: cartState.items, shippingRule: selectedRule, totalPrice: grandTotal });
                  }}
                >
                  {currentUser ? 'Checkout - ৳' + grandTotal.toFixed(2) : 'Login Required'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Confirm Dialogs */}
      <ConfirmDialog
        isOpen={confirmClearCart}
        title="Clear Cart?"
        message="Are you sure you want to remove all items?"
        confirmText="Clear All" cancelText="Cancel" type="danger" logo={logo}
        onConfirm={() => { clearCart(); setConfirmClearCart(false); }}
        onCancel={() => setConfirmClearCart(false)}
      />
      <ConfirmDialog
        isOpen={confirmRemove !== null}
        title="Remove Item?"
        message={confirmRemove ? `Remove "${confirmRemove.name}" from cart?` : ''}
        confirmText="Remove" cancelText="Cancel" type="warning" logo={logo}
        onConfirm={() => { if (confirmRemove) { removeFromCart(confirmRemove.id); setConfirmRemove(null); } }}
        onCancel={() => setConfirmRemove(null)}
      />
      <ConfirmDialog
        isOpen={confirmDeleteSelected}
        title="Delete Selected?"
        message={`Delete ${selectedIds.size} selected item${selectedIds.size !== 1 ? 's' : ''} from cart?`}
        confirmText="Delete" cancelText="Cancel" type="danger" logo={logo}
        onConfirm={deleteSelected}
        onCancel={() => setConfirmDeleteSelected(false)}
      />
    </div>
  );
}

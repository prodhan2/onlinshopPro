import { createCartItem, createProduct, getCartItemTotal, toProductJson } from './models';

const CART_KEY_PREFIX = 'bstoreapp-cart';
const listeners = new Set();
let cartItems = [];
let cartOwnerId = null;

function getCartKey() {
  return cartOwnerId ? `${CART_KEY_PREFIX}-${cartOwnerId}` : null;
}

function notify() {
  listeners.forEach(listener => listener(getCartState()));
}

function persist() {
  const key = getCartKey();
  if (!key) {
    return;
  }

  const payload = cartItems.map(item => ({
    product: toProductJson(item.product),
    quantity: item.quantity,
  }));
  localStorage.setItem(key, JSON.stringify(payload));
}

export function setCartOwner(userId) {
  cartOwnerId = userId || null;
  loadCart();
  notify();
}

export function canUseCart() {
  return Boolean(cartOwnerId);
}

export function loadCart() {
  const key = getCartKey();

  if (!key) {
    cartItems = [];
    return getCartState();
  }

  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      cartItems = [];
      return getCartState();
    }

    const parsed = JSON.parse(raw);
    cartItems = Array.isArray(parsed)
      ? parsed.map(item => createCartItem(createProduct(item.product), item.quantity ?? 1))
      : [];
  } catch {
    cartItems = [];
  }

  return getCartState();
}

export function subscribeCart(listener) {
  listeners.add(listener);
  listener(getCartState());
  return () => listeners.delete(listener);
}

export function getCartState() {
  return {
    items: [...cartItems],
    totalItems: cartItems.reduce((sum, item) => sum + item.quantity, 0),
    totalPrice: cartItems.reduce((sum, item) => sum + getCartItemTotal(item), 0),
  };
}

export function isProductInCart(product) {
  return cartItems.some(item => item.product.id === product.id);
}

export function getCartItem(product) {
  return cartItems.find(item => item.product.id === product.id) ?? null;
}

export function addToCart(product, quantity = 1) {
  if (!canUseCart()) {
    return false;
  }

  const found = cartItems.find(item => item.product.id === product.id);
  if (found) {
    found.quantity += quantity;
  } else {
    cartItems.push(createCartItem(product, quantity));
  }
  persist();
  notify();
  return true;
}

export function updateQuantity(productId, quantity) {
  if (!canUseCart()) {
    return;
  }

  const found = cartItems.find(item => item.product.id === productId);
  if (!found) {
    return;
  }

  if (quantity <= 0) {
    cartItems = cartItems.filter(item => item.product.id !== productId);
  } else {
    found.quantity = quantity;
  }

  persist();
  notify();
}

export function removeFromCart(productId) {
  if (!canUseCart()) {
    return;
  }

  cartItems = cartItems.filter(item => item.product.id !== productId);
  persist();
  notify();
}

export function clearCart() {
  if (!canUseCart()) {
    cartItems = [];
    notify();
    return;
  }

  cartItems = [];
  persist();
  notify();
}

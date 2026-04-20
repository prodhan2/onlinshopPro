import { useMemo, useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { clearCart } from '../bstoreapp/cardManager';
import { getPaymentInstructions } from '../bstoreapp/shippingrules';
import { getCartItemTotal, parseNumber } from '../bstoreapp/models';
import { FiArrowLeft, FiCheck, FiDownload, FiList } from 'react-icons/fi';
import logo from '../bstoreapp/assets/images/logo.png';
import './payment.css';

const PAYMENT_METHODS = [
  { id: 'bkash',  label: 'bKash',            color: '#e2136e' },
  { id: 'nagad',  label: 'Nagad',             color: '#f7941d' },
  { id: 'rocket', label: 'Rocket',            color: '#8b2fc9' },
  { id: 'cod',    label: 'Cash on Delivery',  color: '#10b981' },
];

function formatMoney(v) { return `৳${Number(v || 0).toFixed(2)}`; }
function formatDate(v) {
  return new Intl.DateTimeFormat('en-BD', { dateStyle: 'medium', timeStyle: 'short' }).format(v);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function buildProofImage(order) {
  const canvas = document.createElement('canvas');
  canvas.width = 1200; canvas.height = 1600;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  ctx.fillStyle = '#f4f7fb';
  ctx.fillRect(0, 0, 1200, 1600);

  const grad = ctx.createLinearGradient(0, 0, 1200, 240);
  grad.addColorStop(0, '#0b57d0'); grad.addColorStop(1, '#1565c0');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1200, 250);

  ctx.fillStyle = '#fff'; ctx.font = '700 34px Arial';
  ctx.fillText('Beautiful Dinajpur', 84, 74);
  ctx.font = '400 20px Arial';
  ctx.fillText('Payment confirmation proof', 84, 110);

  ctx.fillStyle = '#fff';
  roundRect(ctx, 70, 120, 1060, 1360, 36); ctx.fill();

  ctx.fillStyle = '#162033'; ctx.font = '700 42px Arial';
  ctx.fillText('Order Payment Proof', 110, 200);
  ctx.font = '400 22px Arial'; ctx.fillStyle = '#667085';
  ctx.fillText(`Generated on ${formatDate(order.confirmedAt)}`, 110, 240);

  function drawSection(startY, title, rows) {
    ctx.fillStyle = '#162033'; ctx.font = '700 28px Arial';
    ctx.fillText(title, 110, startY);
    let y = startY + 52;
    rows.forEach(([label, value], i) => {
      if (i % 2 === 0) { ctx.fillStyle = '#f8fafc'; roundRect(ctx, 110, y - 30, 980, 54, 14); ctx.fill(); }
      ctx.fillStyle = '#667085'; ctx.font = '600 20px Arial'; ctx.fillText(label, 135, y);
      ctx.textAlign = 'right'; ctx.fillStyle = '#162033'; ctx.fillText(String(value || 'N/A'), 1060, y);
      ctx.textAlign = 'left'; y += 56;
    });
    return y + 8;
  }

  let y = 320;
  y = drawSection(y, 'Order Details', [
    ['Order ID', order.orderId], ['Customer', order.userName],
    ['Phone', order.userPhone], ['Payment', order.paymentMethodLabel],
    ['Transaction ID', order.transactionId || 'N/A'], ['Status', 'Confirmed'],
  ]);
  y = drawSection(y + 14, 'Delivery', [
    ['Address', order.street], ['Area', order.area], ['Shipping Area', order.shippingArea],
  ]);

  ctx.fillStyle = '#162033'; ctx.font = '700 28px Arial';
  ctx.fillText('Items', 110, y + 28); y += 60;

  order.items.forEach((item, i) => {
    ctx.fillStyle = i % 2 === 0 ? '#f8fafc' : '#eef4ff';
    roundRect(ctx, 110, y - 10, 980, 82, 18); ctx.fill();
    ctx.fillStyle = '#162033'; ctx.font = '700 22px Arial'; ctx.fillText(item.name, 135, y + 22);
    ctx.font = '400 19px Arial'; ctx.fillStyle = '#667085'; ctx.fillText(`Qty ${item.quantity}`, 135, y + 52);
    ctx.textAlign = 'right'; ctx.fillStyle = '#0f4aa3'; ctx.font = '700 22px Arial';
    ctx.fillText(formatMoney(item.total), 1060, y + 38); ctx.textAlign = 'left'; y += 96;
  });

  ctx.fillStyle = '#f8fafc'; roundRect(ctx, 110, y + 14, 980, 170, 24); ctx.fill();
  const s = y + 58;
  [[`Subtotal`, formatMoney(order.subtotal)], [`Shipping`, formatMoney(order.shippingCharge)]].forEach(([l, v], i) => {
    ctx.fillStyle = '#667085'; ctx.font = '600 22px Arial'; ctx.fillText(l, 140, s + i * 40);
    ctx.textAlign = 'right'; ctx.fillStyle = '#162033'; ctx.fillText(v, 1060, s + i * 40); ctx.textAlign = 'left';
  });
  ctx.fillStyle = '#162033'; ctx.font = '700 28px Arial'; ctx.fillText('Total', 140, s + 92);
  ctx.textAlign = 'right'; ctx.fillStyle = '#0f4aa3'; ctx.fillText(formatMoney(order.total), 1060, s + 92); ctx.textAlign = 'left';

  ctx.textAlign = 'center'; ctx.fillStyle = '#0b57d0'; ctx.font = '700 24px Arial';
  ctx.fillText('Powered by Beautiful Dinajpur', 600, 1510); ctx.textAlign = 'left';

  return canvas.toDataURL('image/png');
}

export default function PaymentPage({ checkout, onBack, onDone }) {
  const [method, setMethod]       = useState('bkash');
  const [phone, setPhone]         = useState('');
  const [txId, setTxId]           = useState('');
  const [street, setStreet]       = useState('');
  const [area, setArea]           = useState(checkout?.shippingRule?.areaName ?? '');
  const [processing, setProcessing] = useState(false);
  const [status, setStatus]       = useState('');
  const [done, setDone]           = useState(null);

  const items = checkout?.items ?? (checkout?.product ? [{ product: checkout.product, quantity: checkout.quantity ?? 1 }] : []);
  const shippingCharge = parseNumber(checkout?.shippingRule?.charge, 60);
  const subtotal = useMemo(() => items.reduce((s, i) => s + getCartItemTotal(i), 0), [items]);
  const total = checkout?.totalPrice ?? subtotal + shippingCharge;
  const instructions = getPaymentInstructions(checkout?.shippingRule, method);

  async function handleSubmit(e) {
    e.preventDefault();
    setProcessing(true); setStatus('');
    try {
      const user = auth.currentUser;
      const payload = {
        userUid: user?.uid || '', userEmail: user?.email || '',
        userName: user?.displayName || user?.email || '',
        userPhone: phone, transactionId: txId, street, area,
        paymentMethod: method,
        shippingArea: checkout?.shippingRule?.areaName ?? area,
        shippingCharge, totalPrice: total,
        status: 'pending', statusMessage: 'Order placed. Waiting for confirmation.',
        createdAt: serverTimestamp(),
        items: items.map(i => ({ id: i.product.id, name: i.product.name, price: i.product.price, quantity: i.quantity, image: i.product.image })),
      };
      const ref = await addDoc(collection(db, 'orders'), payload);
      const methodLabel = PAYMENT_METHODS.find(m => m.id === method)?.label || method;
      setDone({
        orderId: ref.id, userName: payload.userName, userEmail: payload.userEmail,
        userPhone: payload.userPhone, transactionId: payload.transactionId,
        street: payload.street, area: payload.area, shippingArea: payload.shippingArea,
        shippingCharge, subtotal, total, paymentMethodLabel: methodLabel,
        confirmedAt: new Date(),
        items: items.map(i => ({ name: i.product.name, quantity: i.quantity, total: getCartItemTotal(i) })),
      });
      clearCart();
      setStatus('success');
    } catch {
      setStatus('error');
    } finally {
      setProcessing(false);
    }
  }

  function handleDownload() {
    if (!done) return;
    try {
      const url = buildProofImage(done);
      const a = document.createElement('a');
      a.href = url; a.download = `proof-${done.orderId}.png`; a.click();
    } catch { setStatus('download-error'); }
  }

  return (
    <div className="pp-page">
      {/* App Bar */}
      <div className="pp-appbar">
        <button className="pp-back" onClick={onBack || (() => window.history.back())}>
          <FiArrowLeft />
        </button>
        <div className="pp-appbar-center">
          <img src={logo} alt="Logo" className="pp-appbar-logo" />
          <span className="pp-appbar-title">Payment</span>
        </div>
        <div style={{ width: 36 }} />
      </div>

      <form className="pp-body" onSubmit={handleSubmit}>

        {/* Order Summary */}
        <div className="pp-section">
          <p className="pp-section-label">Order Summary</p>
          {items.map(item => (
            <div className="pp-item-row" key={item.product.id}>
              <span className="pp-item-name">{item.product.name} <span className="pp-item-qty">×{item.quantity}</span></span>
              <span className="pp-item-price">{formatMoney(getCartItemTotal(item))}</span>
            </div>
          ))}
          <div className="pp-divider" />
          <div className="pp-total-row"><span>Subtotal</span><span>{formatMoney(subtotal)}</span></div>
          <div className="pp-total-row"><span>Shipping</span><span>{formatMoney(shippingCharge)}</span></div>
          <div className="pp-total-row pp-grand-total"><span>Total</span><span>{formatMoney(total)}</span></div>
        </div>

        {/* Delivery Info */}
        <div className="pp-section">
          <p className="pp-section-label">Delivery Info</p>
          <div className="pp-field">
            <label>Phone Number</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="01xxxxxxxxx" required />
          </div>
          <div className="pp-field">
            <label>Street / Address</label>
            <input type="text" value={street} onChange={e => setStreet(e.target.value)} placeholder="House, road, village" required />
          </div>
          <div className="pp-field">
            <label>Area</label>
            <input type="text" value={area} onChange={e => setArea(e.target.value)} required />
          </div>
        </div>

        {/* Payment Method */}
        <div className="pp-section">
          <p className="pp-section-label">Payment Method</p>
          <div className="pp-methods">
            {PAYMENT_METHODS.map(m => (
              <button
                key={m.id} type="button"
                className={`pp-method ${method === m.id ? 'pp-method-active' : ''}`}
                style={method === m.id ? { borderColor: m.color, color: m.color } : {}}
                onClick={() => setMethod(m.id)}
              >
                {m.label}
              </button>
            ))}
          </div>

          {method !== 'cod' && (
            <div className="pp-field" style={{ marginTop: '1rem' }}>
              <label>Transaction ID</label>
              <input type="text" value={txId} onChange={e => setTxId(e.target.value)} placeholder="Enter transaction ID" required />
            </div>
          )}

          {instructions && <div className="pp-info">{instructions}</div>}
        </div>

        {/* Status messages */}
        {status === 'error' && <div className="pp-alert pp-alert-error">Order failed. Please try again.</div>}

        {/* Done state */}
        {done ? (
          <div className="pp-done">
            <div className="pp-done-check"><FiCheck /></div>
            <h3>Order Confirmed!</h3>
            <p>Order #{done.orderId.slice(-8)}</p>
            <button type="button" className="pp-btn pp-btn-green" onClick={handleDownload}>
              <FiDownload /> Download Proof
            </button>
            <button type="button" className="pp-btn pp-btn-outline" onClick={() => onDone?.()}>
              <FiList /> View Orders
            </button>
          </div>
        ) : (
          <button className="pp-btn pp-btn-primary" type="submit" disabled={processing}>
            {processing ? <span className="pp-spinner" /> : null}
            {processing ? 'Processing...' : `Confirm Payment — ${formatMoney(total)}`}
          </button>
        )}

      </form>
    </div>
  );
}

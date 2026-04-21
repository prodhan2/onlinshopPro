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

function buildProofImage(order, logoBase64) {
  const canvas = document.createElement('canvas');
  canvas.width = 1080; canvas.height = 1920;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  // Background
  ctx.fillStyle = '#f0f4ff';
  ctx.fillRect(0, 0, 1080, 1920);

  // Top gradient header
  const headerGrad = ctx.createLinearGradient(0, 0, 1080, 320);
  headerGrad.addColorStop(0, '#1e40af');
  headerGrad.addColorStop(1, '#3b82f6');
  ctx.fillStyle = headerGrad;
  roundRect(ctx, 0, 0, 1080, 320, 0); ctx.fill();

  // Header circle decoration
  ctx.beginPath();
  ctx.arc(950, -40, 200, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(100, 280, 150, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  ctx.fill();

  // Logo
  if (logoBase64) {
    const img = new Image();
    img.src = logoBase64;
    ctx.drawImage(img, 60, 50, 160, 160);
  }

  // Header text
  ctx.fillStyle = '#fff';
  ctx.font = '800 52px Arial';
  ctx.fillText('Beautiful Dinajpur', 250, 120);
  ctx.font = '400 28px Arial';
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillText('Official Payment Receipt', 250, 165);

  // Date
  ctx.font = '500 26px Arial';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText(`Date: ${formatDate(order.confirmedAt)}`, 60, 280);

  // Order ID badge
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  roundRect(ctx, 60, 300, 960, 60, 12); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = '700 26px Arial';
  ctx.fillText(`Order ID: #${order.orderId}`, 90, 340);

  // White card
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, 40, 390, 1000, 1480, 28); ctx.fill();
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  roundRect(ctx, 40, 390, 1000, 1480, 28); ctx.stroke();

  let y = 460;

  // Section helper
  function sectionTitle(title, icon) {
    ctx.fillStyle = '#1e40af';
    ctx.font = '800 32px Arial';
    ctx.fillText(`${icon}  ${title}`, 80, y);
    y += 16;
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(80, y, 920, 3);
    y += 28;
  }

  function row(label, value, highlight = false) {
    ctx.fillStyle = highlight ? '#eff6ff' : (y % 2 === 0 ? '#f8fafc' : '#fff');
    roundRect(ctx, 80, y - 28, 920, 52, 10); ctx.fill();
    ctx.fillStyle = '#64748b';
    ctx.font = '500 24px Arial';
    ctx.fillText(label, 105, y + 8);
    ctx.textAlign = 'right';
    ctx.fillStyle = highlight ? '#1e40af' : '#1e293b';
    ctx.font = highlight ? '800 26px Arial' : '600 24px Arial';
    ctx.fillText(String(value || '—'), 975, y + 8);
    ctx.textAlign = 'left';
    y += 60;
  }

  // Customer Info
  sectionTitle('Customer Details', '👤');
  row('Name', order.userName);
  row('Email', order.userEmail);
  row('Phone', order.userPhone);
  y += 20;

  // Payment Info
  sectionTitle('Payment Details', '💳');
  row('Method', order.paymentMethodLabel);
  row('Transaction ID', order.transactionId || 'N/A');
  row('Status', '✅ Confirmed');
  y += 20;

  // Delivery Info
  sectionTitle('Delivery Address', '📦');
  row('Street', order.street);
  row('Area', order.area);
  row('Shipping Zone', order.shippingArea);
  y += 20;

  // Items
  sectionTitle('Ordered Items', '🛒');
  order.items.forEach((item, i) => {
    ctx.fillStyle = i % 2 === 0 ? '#f8fafc' : '#fff';
    roundRect(ctx, 80, y - 28, 920, 60, 10); ctx.fill();
    ctx.fillStyle = '#1e293b';
    ctx.font = '600 24px Arial';
    const name = item.name.length > 32 ? item.name.slice(0, 32) + '...' : item.name;
    ctx.fillText(`${i + 1}. ${name}`, 105, y + 4);
    ctx.fillStyle = '#64748b';
    ctx.font = '500 22px Arial';
    ctx.fillText(`Qty: ${item.quantity}`, 105, y + 30);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#2563eb';
    ctx.font = '700 26px Arial';
    ctx.fillText(formatMoney(item.total), 975, y + 16);
    ctx.textAlign = 'left';
    y += 72;
  });
  y += 20;

  // Summary box
  ctx.fillStyle = '#eff6ff';
  roundRect(ctx, 80, y, 920, 200, 16); ctx.fill();
  ctx.strokeStyle = '#bfdbfe';
  ctx.lineWidth = 2;
  roundRect(ctx, 80, y, 920, 200, 16); ctx.stroke();

  y += 50;
  ctx.fillStyle = '#64748b'; ctx.font = '500 26px Arial';
  ctx.fillText('Subtotal', 110, y);
  ctx.textAlign = 'right'; ctx.fillStyle = '#1e293b'; ctx.font = '600 26px Arial';
  ctx.fillText(formatMoney(order.subtotal), 975, y); ctx.textAlign = 'left';
  y += 50;
  ctx.fillStyle = '#64748b'; ctx.font = '500 26px Arial';
  ctx.fillText('Shipping', 110, y);
  ctx.textAlign = 'right'; ctx.fillStyle = '#1e293b'; ctx.font = '600 26px Arial';
  ctx.fillText(formatMoney(order.shippingCharge), 975, y); ctx.textAlign = 'left';
  y += 16;
  ctx.fillStyle = '#bfdbfe'; ctx.fillRect(110, y, 860, 2); y += 20;
  ctx.fillStyle = '#1e40af'; ctx.font = '800 34px Arial';
  ctx.fillText('Total', 110, y);
  ctx.textAlign = 'right'; ctx.fillStyle = '#1e40af'; ctx.font = '800 36px Arial';
  ctx.fillText(formatMoney(order.total), 975, y); ctx.textAlign = 'left';

  // Footer
  ctx.fillStyle = '#1e40af';
  roundRect(ctx, 0, 1840, 1080, 80, 0); ctx.fill();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff'; ctx.font = '600 26px Arial';
  ctx.fillText('Thank you for shopping with Beautiful Dinajpur', 540, 1888);
  ctx.textAlign = 'left';

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
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = img.width || 160;
        tempCanvas.height = img.height || 160;
        const tCtx = tempCanvas.getContext('2d');
        tCtx.drawImage(img, 0, 0);
        const logoBase64 = tempCanvas.toDataURL('image/png');
        const url = buildProofImage(done, logoBase64);
        const a = document.createElement('a');
        a.href = url; a.download = `receipt-${done.orderId}.png`; a.click();
      };
      img.onerror = () => {
        const url = buildProofImage(done, null);
        const a = document.createElement('a');
        a.href = url; a.download = `receipt-${done.orderId}.png`; a.click();
      };
      img.src = logo;
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

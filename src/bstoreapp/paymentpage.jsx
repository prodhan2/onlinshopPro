import { useMemo, useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { clearCart } from './cardManager';
import { getPaymentInstructions } from './shippingrules';
import { getCartItemTotal, parseNumber } from './models';

const PAYMENT_METHODS = [
  { id: 'bkash', label: 'bKash' },
  { id: 'nagad', label: 'Nagad' },
  { id: 'rocket', label: 'Rocket' },
  { id: 'cod', label: 'Cash on Delivery' },
];

function formatMoney(value) {
  return `Tk ${Number(value || 0).toFixed(2)}`;
}

function formatDate(value) {
  return new Intl.DateTimeFormat('en-BD', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(value);
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function drawSection(ctx, startY, title, rows) {
  ctx.fillStyle = '#162033';
  ctx.font = '700 28px Arial';
  ctx.fillText(title, 110, startY);

  let y = startY + 52;
  rows.forEach(([label, value], index) => {
    if (index % 2 === 0) {
      ctx.fillStyle = '#f8fafc';
      roundRect(ctx, 110, y - 30, 980, 54, 14);
      ctx.fill();
    }

    ctx.fillStyle = '#667085';
    ctx.font = '600 20px Arial';
    ctx.fillText(label, 135, y);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#162033';
    ctx.font = '600 20px Arial';
    ctx.fillText(String(value || 'N/A'), 1060, y);
    ctx.textAlign = 'left';
    y += 56;
  });

  return y + 8;
}

function drawSummaryRow(ctx, label, value, y, emphasized = false) {
  ctx.fillStyle = emphasized ? '#162033' : '#667085';
  ctx.font = emphasized ? '700 28px Arial' : '600 22px Arial';
  ctx.fillText(label, 140, y);

  ctx.textAlign = 'right';
  ctx.fillStyle = emphasized ? '#0f4aa3' : '#162033';
  ctx.fillText(value, 1060, y);
  ctx.textAlign = 'left';
}

function buildProofImage(order) {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 1600;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas is not supported in this browser.');
  }

  ctx.fillStyle = '#f4f7fb';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const headerGradient = ctx.createLinearGradient(0, 0, canvas.width, 240);
  headerGradient.addColorStop(0, '#0b57d0');
  headerGradient.addColorStop(0.6, '#1565c0');
  headerGradient.addColorStop(1, '#ff914d');
  ctx.fillStyle = headerGradient;
  ctx.fillRect(0, 0, canvas.width, 250);

  ctx.fillStyle = '#ffffff';
  roundRect(ctx, 70, 120, 1060, 1360, 36);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = '700 34px Arial';
  ctx.fillText('Beautiful Dinajpur', 84, 74);
  ctx.font = '400 20px Arial';
  ctx.fillText('Payment confirmation proof', 84, 110);

  ctx.fillStyle = '#162033';
  ctx.font = '700 42px Arial';
  ctx.fillText('Order Payment Proof', 110, 200);
  ctx.font = '400 22px Arial';
  ctx.fillStyle = '#667085';
  ctx.fillText(`Generated on ${formatDate(order.confirmedAt)}`, 110, 240);

  let y = 320;
  y = drawSection(ctx, y, 'Order Details', [
    ['Order ID', order.orderId],
    ['Customer', order.userName],
    ['Email', order.userEmail],
    ['Phone', order.userPhone],
    ['Payment Method', order.paymentMethodLabel],
    ['Transaction ID', order.transactionId || 'N/A'],
    ['Status', 'Payment Confirmed'],
  ]);

  y = drawSection(ctx, y + 14, 'Delivery Details', [
    ['Street / Address', order.street],
    ['Area', order.area],
    ['Shipping Area', order.shippingArea],
  ]);

  ctx.fillStyle = '#162033';
  ctx.font = '700 28px Arial';
  ctx.fillText('Purchased Items', 110, y + 28);

  y += 60;
  order.items.forEach((item, index) => {
    ctx.fillStyle = index % 2 === 0 ? '#f8fafc' : '#eef4ff';
    roundRect(ctx, 110, y - 10, 980, 82, 18);
    ctx.fill();

    ctx.fillStyle = '#162033';
    ctx.font = '700 22px Arial';
    ctx.fillText(item.name, 135, y + 22);
    ctx.font = '400 19px Arial';
    ctx.fillStyle = '#667085';
    ctx.fillText(`Qty ${item.quantity}`, 135, y + 52);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#0f4aa3';
    ctx.font = '700 22px Arial';
    ctx.fillText(formatMoney(item.total), 1060, y + 38);
    ctx.textAlign = 'left';
    y += 96;
  });

  ctx.fillStyle = '#f8fafc';
  roundRect(ctx, 110, y + 14, 980, 170, 24);
  ctx.fill();

  const summaryStart = y + 58;
  drawSummaryRow(ctx, 'Subtotal', formatMoney(order.subtotal), summaryStart);
  drawSummaryRow(ctx, 'Shipping', formatMoney(order.shippingCharge), summaryStart + 40);
  drawSummaryRow(ctx, 'Total', formatMoney(order.total), summaryStart + 92, true);

  ctx.fillStyle = '#667085';
  ctx.font = '400 22px Arial';
  ctx.fillText('Keep this image as payment proof for delivery or support needs.', 110, 1440);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#0b57d0';
  ctx.font = '700 24px Arial';
  ctx.fillText('Powered by Beautiful Dinajpur', canvas.width / 2, 1510);
  ctx.textAlign = 'left';

  return canvas.toDataURL('image/png');
}

export default function PaymentPage({ checkout, onBack, onDone }) {
  const [paymentMethod, setPaymentMethod] = useState('bkash');
  const [phone, setPhone] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [street, setStreet] = useState('');
  const [area, setArea] = useState(checkout.shippingRule?.areaName ?? '');
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState('');
  const [completedOrder, setCompletedOrder] = useState(null);

  const items = checkout.items ?? (checkout.product ? [{ product: checkout.product, quantity: checkout.quantity ?? 1 }] : []);
  const shippingCharge = parseNumber(checkout.shippingRule?.charge, 60);
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + getCartItemTotal(item), 0), [items]);
  const total = checkout.totalPrice ?? subtotal + shippingCharge;
  const instructions = getPaymentInstructions(checkout.shippingRule, paymentMethod);

  async function handleConfirm(event) {
    event.preventDefault();
    setProcessing(true);
    setStatus('');

    try {
      const currentUser = auth.currentUser;
      const orderPayload = {
        userUid: currentUser?.uid || '',
        userEmail: currentUser?.email || '',
        userName: currentUser?.displayName || currentUser?.email || '',
        userPhone: phone,
        transactionId,
        street,
        area,
        paymentMethod,
        shippingArea: checkout.shippingRule?.areaName ?? area,
        shippingCharge,
        totalPrice: total,
        status: 'pending',
        statusMessage: 'Order placed. Waiting for confirmation.',
        createdAt: serverTimestamp(),
        items: items.map(item => ({
          id: item.product.id,
          name: item.product.name,
          price: item.product.price,
          quantity: item.quantity,
          image: item.product.image,
        })),
      };

      const orderRef = await addDoc(collection(db, 'orders'), orderPayload);
      const paymentMethodLabel = PAYMENT_METHODS.find(method => method.id === paymentMethod)?.label || paymentMethod;

      setCompletedOrder({
        orderId: orderRef.id,
        userName: orderPayload.userName,
        userEmail: orderPayload.userEmail,
        userPhone: orderPayload.userPhone,
        transactionId: orderPayload.transactionId,
        street: orderPayload.street,
        area: orderPayload.area,
        shippingArea: orderPayload.shippingArea,
        shippingCharge,
        subtotal,
        total,
        paymentMethodLabel,
        confirmedAt: new Date(),
        items: items.map(item => ({
          name: item.product.name,
          quantity: item.quantity,
          total: getCartItemTotal(item),
        })),
      });

      clearCart();
      setStatus('Payment confirmed. Proof image is ready to download.');
    } catch {
      setStatus('Order save failed. Please verify Firestore rules and try again.');
    } finally {
      setProcessing(false);
    }
  }

  function handleDownloadProof() {
    if (!completedOrder) return;

    try {
      const imageUrl = buildProofImage(completedOrder);
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = `payment-proof-${completedOrder.orderId}.png`;
      link.click();
      setStatus('Proof image downloaded successfully.');
    } catch {
      setStatus('Proof image could not be generated. Please try again.');
    }
  }

  return (
    <section className="bstore-page">
      <div className="bstore-appbar mb-4">
        <button className="btn btn-outline-secondary" type="button" onClick={() => window.history.back()}>
          Back
        </button>
        <h1 className="bstore-appbar__title mb-0">Payment</h1>
        <div className="bstore-appbar__actions">
          <span className="badge text-bg-light">Payment</span>
        </div>
      </div>

      <form className="row g-4" onSubmit={handleConfirm}>
        <div className="col-12 col-lg-7">
          <div className="bstore-card">
            <p className="bstore-kicker">Payment Page</p>
            <h1 className="h3 mb-3">Confirm your order</h1>

            <div className="d-grid gap-3">
              <div>
                <label className="form-label" htmlFor="payment-phone">
                  Phone number
                </label>
                <input
                  id="payment-phone"
                  className="form-control"
                  value={phone}
                  onChange={event => setPhone(event.target.value)}
                  placeholder="01xxxxxxxxx"
                  required
                />
              </div>

              <div className="row g-3">
                <div className="col-12 col-md-6">
                  <label className="form-label" htmlFor="payment-street">
                    Street / address
                  </label>
                  <input
                    id="payment-street"
                    className="form-control"
                    value={street}
                    onChange={event => setStreet(event.target.value)}
                    placeholder="House, road, village"
                    required
                  />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label" htmlFor="payment-area">
                    Area
                  </label>
                  <input
                    id="payment-area"
                    className="form-control"
                    value={area}
                    onChange={event => setArea(event.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="form-label d-block">Payment method</label>
                <div className="bstore-chip-row">
                  {PAYMENT_METHODS.map(method => (
                    <button
                      className={`bstore-chip ${paymentMethod === method.id ? 'bstore-chip--active' : ''}`}
                      key={method.id}
                      type="button"
                      onClick={() => setPaymentMethod(method.id)}
                    >
                      {method.label}
                    </button>
                  ))}
                </div>
              </div>

              {paymentMethod !== 'cod' ? (
                <div>
                  <label className="form-label" htmlFor="payment-transaction">
                    Transaction ID
                  </label>
                  <input
                    id="payment-transaction"
                    className="form-control"
                    value={transactionId}
                    onChange={event => setTransactionId(event.target.value)}
                    placeholder="Enter wallet transaction id"
                    required
                  />
                </div>
              ) : null}

              {instructions ? <div className="alert alert-info mb-0">{instructions}</div> : null}
              {status ? <div className="alert alert-secondary mb-0">{status}</div> : null}
              {completedOrder ? (
                <div className="bstore-proof-box">
                  <div>
                    <p className="bstore-kicker mb-2">Proof Ready</p>
                    <h2 className="h5 mb-2">Download payment proof image</h2>
                    <p className="bstore-muted mb-0">
                      This image includes order details, payment data, delivery info, item summary, and Powered by Beautiful Dinajpur.
                    </p>
                  </div>
                  <div className="d-grid gap-2">
                    <button className="btn btn-success" type="button" onClick={handleDownloadProof}>
                      Download Proof Image
                    </button>
                    <button className="btn btn-outline-primary" type="button" onClick={() => onDone?.()}>
                      View Orders
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-5">
          <div className="bstore-card">
            <h2 className="h5 mb-3">Order Summary</h2>
            <div className="d-grid gap-3 mb-4">
              {items.map(item => (
                <div className="d-flex justify-content-between gap-3" key={`${item.product.id}-${item.quantity}`}>
                  <div>
                    <strong>{item.product.name}</strong>
                    <div className="bstore-muted">Qty: {item.quantity}</div>
                  </div>
                  <strong>{formatMoney(getCartItemTotal(item))}</strong>
                </div>
              ))}
            </div>

            <div className="bstore-summary mb-4">
              <div><span>Subtotal</span><strong>{formatMoney(subtotal)}</strong></div>
              <div><span>Shipping</span><strong>{formatMoney(shippingCharge)}</strong></div>
              <div><span>Total</span><strong>{formatMoney(total)}</strong></div>
            </div>

            {processing ? (
              <div className="bstore-processing-box">
                <div className="bstore-spinner-glow" />
                <div className="bstore-skeleton bstore-skeleton--button bstore-skeleton--button-lg" />
                <p className="bstore-muted mb-0">Processing your payment and saving the order...</p>
              </div>
            ) : (
              <button className="btn btn-primary w-100" type="submit" disabled={processing || Boolean(completedOrder)}>
                {completedOrder ? 'Payment Confirmed' : `Confirm Payment - ${formatMoney(total)}`}
              </button>
            )}
          </div>
        </div>
      </form>
    </section>
  );
}

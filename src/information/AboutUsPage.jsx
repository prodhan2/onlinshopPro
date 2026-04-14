import './information.css';

export default function AboutUsPage({ onBack }) {
  return (
    <div className="info-page-container">
      <div className="info-header">
        <button className="info-back-btn" onClick={onBack || (() => window.history.back())}>
          ← Back
        </button>
        <h1>About Us</h1>
        <p>Beautiful Dinajpur - Connecting Sellers & Customers</p>
      </div>

      <div className="info-content">
        <div className="info-card">
          <h2>🌟 Our Story</h2>
          <p>
            Beautiful Dinajpur is an innovative online marketplace dedicated to showcasing the rich heritage, 
            traditional crafts, and agricultural excellence of the Dinajpur region. Our platform connects 
            local artisans, farmers, and businesses with customers who appreciate authentic, high-quality products.
          </p>
          <p>
            Founded in 2026, we've grown from a small local initiative to a thriving digital ecosystem that 
            supports hundreds of sellers and serves thousands of satisfied customers across Bangladesh.
          </p>
        </div>

        <div className="info-card">
          <h2>🎯 Our Mission</h2>
          <ul>
            <li>Empower local sellers and artisans with a digital platform</li>
            <li>Preserve and promote the cultural heritage of Dinajpur</li>
            <li>Provide customers with authentic, high-quality products</li>
            <li>Bridge the gap between rural producers and urban consumers</li>
            <li>Foster sustainable economic growth in the region</li>
          </ul>
        </div>

        <div className="info-grid">
          <div className="info-feature">
            <div className="info-feature-icon">🏪</div>
            <h4>500+ Sellers</h4>
            <p>Trusted local vendors</p>
          </div>
          <div className="info-feature">
            <div className="info-feature-icon">🛍️</div>
            <h4>10,000+ Products</h4>
            <p>Wide selection available</p>
          </div>
          <div className="info-feature">
            <div className="info-feature-icon">😊</div>
            <h4>50,000+ Customers</h4>
            <p>Satisfied shoppers</p>
          </div>
          <div className="info-feature">
            <div className="info-feature-icon">🚚</div>
            <h4>Fast Delivery</h4>
            <p>Nationwide shipping</p>
          </div>
        </div>

        <div className="info-card">
          <h2>💡 What Makes Us Different</h2>
          <h3>✅ Authentic Products</h3>
          <p>Every product on our platform is verified for authenticity and quality. We work directly with local producers to ensure you receive genuine items.</p>

          <h3>✅ Seller Support</h3>
          <p>We provide comprehensive support to our sellers including training, marketing assistance, and fair commission rates.</p>

          <h3>✅ Customer First</h3>
          <p>Our customer service team is available 24/7 to assist with any queries, returns, or concerns.</p>

          <h3>✅ Secure Transactions</h3>
          <p>Multiple payment options including Cash on Delivery, bKash, and secure online payment gateways.</p>
        </div>

        <div className="info-card">
          <h2>🌱 Our Vision</h2>
          <p>
            To become the leading digital marketplace for regional products in Bangladesh, 
            empowering local communities while providing customers with an exceptional 
            shopping experience that celebrates the unique culture and craftsmanship of Dinajpur.
          </p>
        </div>
      </div>

      <div className="info-footer">
        <p>© 2026 Beautiful Dinajpur. All rights reserved.</p>
        <p>Connecting Sellers & Customers</p>
      </div>
    </div>
  );
}

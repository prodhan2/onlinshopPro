import { useState } from 'react';
import './information.css';

export default function ContactUsPage({ onBack }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
    }, 3000);
  };

  return (
    <div className="info-page-container">
      <div className="info-header">
        <button className="info-back-btn" onClick={onBack || (() => window.history.back())}>
          ← Back
        </button>
        <h1>Contact Us</h1>
        <p>We'd love to hear from you!</p>
      </div>

      <div className="info-content">
        {submitted && (
          <div className="info-card" style={{ background: '#d1fae5', border: '2px solid #10b981' }}>
            <h2 style={{ color: '#059669', borderBottom: 'none' }}>✅ Message Sent Successfully!</h2>
            <p style={{ color: '#065f46' }}>Thank you for contacting us. We'll get back to you soon.</p>
          </div>
        )}

        <div className="info-grid">
          <div className="info-card">
            <h2>📞 Get in Touch</h2>
            
            <div className="info-contact-item">
              <div className="info-contact-icon">📍</div>
              <div>
                <h4>Address</h4>
                <p>Dinajpur Sadar, Dinajpur-5200<br />Bangladesh</p>
              </div>
            </div>

            <div className="info-contact-item">
              <div className="info-contact-icon">📱</div>
              <div>
                <h4>Phone</h4>
                <p>+880-XXX-XXXXXXX<br />+880-XXX-XXXXXXX</p>
              </div>
            </div>

            <div className="info-contact-item">
              <div className="info-contact-icon">✉️</div>
              <div>
                <h4>Email</h4>
                <p>info@beautifuldinajpur.com<br />support@beautifuldinajpur.com</p>
              </div>
            </div>

            <div className="info-contact-item">
              <div className="info-contact-icon">🕐</div>
              <div>
                <h4>Business Hours</h4>
                <p>Saturday - Thursday: 9:00 AM - 8:00 PM<br />Friday: 10:00 AM - 6:00 PM</p>
              </div>
            </div>
          </div>

          <div className="info-card">
            <h2>📝 Send Us a Message</h2>
            <form onSubmit={handleSubmit}>
              <label style={{ display: 'block', marginBottom: '1rem' }}>
                <span style={{ fontWeight: 600, color: '#374151' }}>Your Name *</span>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter your name"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    marginTop: '0.5rem',
                    fontSize: '1rem',
                  }}
                />
              </label>

              <label style={{ display: 'block', marginBottom: '1rem' }}>
                <span style={{ fontWeight: 600, color: '#374151' }}>Email Address *</span>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="your@email.com"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    marginTop: '0.5rem',
                    fontSize: '1rem',
                  }}
                />
              </label>

              <label style={{ display: 'block', marginBottom: '1rem' }}>
                <span style={{ fontWeight: 600, color: '#374151' }}>Phone Number</span>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+880-XXX-XXXXXXX"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    marginTop: '0.5rem',
                    fontSize: '1rem',
                  }}
                />
              </label>

              <label style={{ display: 'block', marginBottom: '1rem' }}>
                <span style={{ fontWeight: 600, color: '#374151' }}>Subject *</span>
                <input
                  type="text"
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="What is this about?"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    marginTop: '0.5rem',
                    fontSize: '1rem',
                  }}
                />
              </label>

              <label style={{ display: 'block', marginBottom: '1rem' }}>
                <span style={{ fontWeight: 600, color: '#374151' }}>Message *</span>
                <textarea
                  required
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Tell us how we can help you..."
                  rows="5"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    marginTop: '0.5rem',
                    fontSize: '1rem',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                  }}
                />
              </label>

              <button
                type="submit"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'linear-gradient(90deg, #1e40af 0%, #3b82f6 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                Send Message 📤
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="info-footer">
        <p>© 2026 Beautiful Dinajpur. All rights reserved.</p>
        <p>Connecting Sellers & Customers</p>
      </div>
    </div>
  );
}

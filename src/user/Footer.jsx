import { FaMapMarkerAlt, FaPhone } from 'react-icons/fa';
import logo from '../bstoreapp/assets/images/logo.png';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="pro-store-footer">
      <div className="pro-footer-main">
        {/* Left: Brand Info */}
        <div className="pro-footer-brand-section">
          <div className="pro-footer-logo-wrapper">
            <img src={logo} alt="Beautiful Dinajpur" className="pro-footer-logo" />
            {/* <h3>Beautiful Dinajpur</h3> */}
          </div>
          <p className="pro-footer-description">
            Beautiful Dinajpur is an e-commerce platform dedicated to providing quality products to every home.
          </p>
          <div className="pro-footer-contact">
            <div className="pro-footer-contact-item">
              <FaMapMarkerAlt className="pro-footer-contact-icon" />
              <span>Dinajpur, Bangladesh</span>
            </div>
            <div className="pro-footer-contact-item">
              <FaPhone className="pro-footer-contact-icon" />
              <span>01234567890</span>
            </div>
            <div className="pro-footer-contact-item">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pro-footer-contact-icon">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <span>contact@beautifuldinajpur.com</span>
            </div>
          </div>
          <div className="pro-footer-social">
            <a href="#" className="pro-footer-social-icon" title="Facebook">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </a>
            <a href="#" className="pro-footer-social-icon" title="Twitter">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
              </svg>
            </a>
            <a href="#" className="pro-footer-social-icon" title="Instagram">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678a6.162 6.162 0 100 12.324 6.162 6.162 0 100-12.324zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405a1.441 1.441 0 11-2.88 0 1.441 1.441 0 012.88 0z" />
              </svg>
            </a>
          </div>
          <div className="pro-footer-app-download">
            <p className="pro-footer-app-title">Download App on Mobile:</p>
            <div className="pro-footer-app-buttons">
              <a href="#" className="pro-footer-app-btn" title="Google Play">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.199l2.302 2.302a1 1 0 010 1.38l-2.302 2.302L15.396 12l2.302-2.492zM5.864 2.658L16.8 8.99l-2.302 2.302-8.634-8.634z" />
                </svg>
                <div>
                  <small>GET IT ON</small>
                  <strong>Google Play</strong>
                </div>
              </a>
              <a href="#" className="pro-footer-app-btn" title="App Store">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
                <div>
                  <small>Download on the</small>
                  <strong>App Store</strong>
                </div>
              </a>
            </div>
          </div>
        </div>

        {/* Right: Footer Links */}
        <div className="pro-footer-links-section">
          <div className="pro-footer-column">
            <h4>Information</h4>
            <ul>
              <li><a href="#">About us</a></li>
              <li><a href="#">Contact us</a></li>
              <li><a href="#">Company Information</a></li>
              <li><a href="#">Beautiful Dinajpur Stories</a></li>
              <li><a href="#">Terms & Conditions</a></li>
              <li><a href="#">Privacy Policy</a></li>
              <li><a href="#">Careers</a></li>
            </ul>
          </div>

          <div className="pro-footer-column">
            <h4>Shop By</h4>
            <ul>
              <li><a href="#">Rice & Grains</a></li>
              <li><a href="#">Oil & Ghee</a></li>
              <li><a href="#">Honey</a></li>
              <li><a href="#">Spices</a></li>
              <li><a href="#">Tea & Coffee</a></li>
              <li><a href="#">Snacks</a></li>
              <li><a href="#">Fresh Products</a></li>
            </ul>
          </div>

          <div className="pro-footer-column">
            <h4>Support</h4>
            <ul>
              <li><a href="#">Support Center</a></li>
              <li><a href="#">How to Order</a></li>
              <li><a href="#">Order Tracking</a></li>
              <li><a href="#">Payment</a></li>
              <li><a href="#">Shipping</a></li>
              <li><a href="#">FAQ</a></li>
            </ul>
          </div>

          <div className="pro-footer-column">
            <h4>Consumer Policy</h4>
            <ul>
              <li><a href="#">Happy Return</a></li>
              <li><a href="#">Refund Policy</a></li>
              <li><a href="#">Exchange</a></li>
              <li><a href="#">Cancellation</a></li>
              <li><a href="#">Pre-Order</a></li>
              <li><a href="#">Extra Discount</a></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Footer Bottom */}
      <div className="pro-footer-bottom">
        <p>© 2026 Beautiful Dinajpur. All rights reserved.</p>
      </div>
    </footer>
  );
}

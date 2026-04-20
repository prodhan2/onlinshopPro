import { useNavigate, useLocation } from 'react-router-dom';
import './BottomNav.css';

export default function BottomNav({ cartItemCount = 0 }) {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    if (path === '/cart') return location.pathname === '/cart';
    if (path === '/account') return location.pathname === '/account' || location.pathname === '/profile';
    return false;
  };

  const handleMenuClick = () => {
    window.dispatchEvent(new CustomEvent('open-drawer'));
  };

  const handleSearchClick = () => {
    window.dispatchEvent(new CustomEvent('toggle-search'));
  };

  return (
    <nav className="bottom-nav">
      {/* HOME */}
      <button
        className={`bottom-nav-item ${isActive('/') ? 'active' : ''}`}
        onClick={() => navigate('/')}
      >
        <div className="bottom-nav-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </div>
        <span className="bottom-nav-label">HOME</span>
      </button>

      {/* MENU */}
      <button
        className="bottom-nav-item"
        onClick={handleMenuClick}
      >
        <div className="bottom-nav-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
        </div>
        <span className="bottom-nav-label">MENU</span>
      </button>

      {/* CART */}
      <button
        className={`bottom-nav-item ${isActive('/cart') ? 'active' : ''}`}
        onClick={() => navigate('/cart')}
      >
        <div className="bottom-nav-icon">
          <div className="bottom-nav-icon-relative">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            {cartItemCount > 0 && (
              <span className="bottom-nav-badge">{cartItemCount > 99 ? '99+' : cartItemCount}</span>
            )}
          </div>
        </div>
        <span className="bottom-nav-label">CART</span>
      </button>

      {/* SEARCH */}
      <button
        className="bottom-nav-item"
        onClick={handleSearchClick}
      >
        <div className="bottom-nav-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
        <span className="bottom-nav-label">SEARCH</span>
      </button>

      {/* ACCOUNT */}
      <button
        className={`bottom-nav-item ${isActive('/account') ? 'active' : ''}`}
        onClick={() => navigate('/account')}
      >
        <div className="bottom-nav-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <span className="bottom-nav-label">ACCOUNT</span>
      </button>
    </nav>
  );
}

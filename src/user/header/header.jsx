import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaBars } from 'react-icons/fa';
import { FiSun, FiMoon, FiSearch } from 'react-icons/fi';
import logo from '../../bstoreapp/assets/images/logo.png';
import './header.css';

export default function StoreHeader({
  logo,
  currentUser,
  onOpenLogin,
  onOpenProfile,
  onOpenCart,
  onOpenMenu,
  cartState,
  cartButtonRef,
  isCartHot,
  toggleDarkMode,
  darkMode,
  searchFocused,
  onSearchFocusChange,
}) {
  const navigate = useNavigate();

  // Listen for toggle-search event from BottomNav
  useEffect(() => {
    const handleToggleSearch = () => navigate('/search');
    window.addEventListener('toggle-search', handleToggleSearch);
    return () => window.removeEventListener('toggle-search', handleToggleSearch);
  }, [navigate]);

  return (
    <header className="store-header">
      {/* Mobile Header */}
      <div className="main-header-content">
        <button className="header-menu-btn" onClick={onOpenMenu}>
          <FaBars />
        </button>

        <div className="header-logo">
          <img src={logo} alt="Beautiful Dinajpur" className="header-logo-img" />
        </div>

        {/* Actions */}
        <div className="header-actions">
          <button className="header-icon-btn" onClick={toggleDarkMode}>
            {darkMode ? <FiSun /> : <FiMoon />}
          </button>

          {currentUser && (
            <button className="header-user-btn" onClick={onOpenProfile}>
              {currentUser.photoURL ? (
                <img src={currentUser.photoURL} alt="Profile" className="header-user-avatar" />
              ) : (
                <span className="header-user-initials">
                  {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Desktop Search (hidden on mobile) */}
      <div className="header-search" onClick={() => navigate('/search')} style={{ cursor: 'pointer' }}>
        <div className="header-search-wrapper">
          <FiSearch className="header-search-icon" />
          <input
            type="text"
            className="header-search-input"
            placeholder="Search products, categories..."
            readOnly
            style={{ cursor: 'pointer' }}
          />
          <img src={logo} alt="" className="header-search-watermark" />
        </div>
      </div>
    </header>
  );
}
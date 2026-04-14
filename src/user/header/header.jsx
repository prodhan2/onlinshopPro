import { useState, useRef, useEffect } from 'react';
import { FaBars, FaSearch, FaPhone, FaMapMarkerAlt } from 'react-icons/fa';
import { FiShoppingCart, FiLogIn, FiSun, FiMoon } from 'react-icons/fi';
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
  onSearch,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [location, setLocation] = useState("Detecting location...");
  const [locationError, setLocationError] = useState(false);
  const searchInputRef = useRef(null);

  // Auto Location Detection
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          try {
            // Using OpenStreetMap Nominatim (Free & No API Key needed)
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
            );
            const data = await response.json();

            let city = data.address.city || 
                      data.address.town || 
                      data.address.village || 
                      data.address.suburb || 
                      data.address.district;

            const country = data.address.country || "Bangladesh";

            if (city) {
              setLocation(`${city}, ${country}`);
            } else {
              setLocation("Bangladesh");
            }
          } catch (error) {
            console.error("Location fetch error:", error);
            setLocation("Dinajpur, Bangladesh"); // Fallback
          }
        },
        (error) => {
          console.error("Geolocation error:", error);
          setLocation("Dinajpur, Bangladesh"); // Fallback
          setLocationError(true);
        }
      );
    } else {
      setLocation("Dinajpur, Bangladesh");
    }
  }, []);

  const toggleSearch = () => {
    setIsSearchExpanded(!isSearchExpanded);
    if (!isSearchExpanded) {
      setTimeout(() => searchInputRef.current?.focus(), 150);
    }
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    if (onSearch) onSearch(value);
  };

  return (
    <header className="store-header">
      {/* Top Info Bar */}
      <div className="header-top-bar">
        <div className="header-top-content">
          <div className="header-top-left">
            <span className="header-top-item">
              <FaMapMarkerAlt /> {location}
            </span>
            <span className="header-top-divider">|</span>
            <span className="header-top-item">
              <FaPhone /> 24/7 Support
            </span>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="main-header-content">
        <button className="header-menu-btn" onClick={onOpenMenu}>
          <FaBars />
        </button>

        <div className="header-logo">
          <img src={logo} alt="Beautiful Dinajpur" className="header-logo-img" />
        </div>

        {/* Desktop Search */}
        <div className="header-search">
          <div className="header-search-wrapper">
            <FaSearch className="header-search-icon" />
            <input
              type="text"
              className="header-search-input"
              placeholder="Search products, categories..."
              value={searchQuery}
              onChange={handleSearchChange}
            />
            {searchQuery && (
              <button className="header-search-clear" onClick={() => setSearchQuery('')}>
                ×
              </button>
            )}
          </div>
        </div>

        {/* Mobile Search Icon */}
        <button className="header-search-icon-btn" onClick={toggleSearch}>
          <FaSearch />
        </button>

        {/* Actions */}
        <div className="header-actions">
          <button className="header-icon-btn" onClick={toggleDarkMode}>
            {darkMode ? <FiSun /> : <FiMoon />}
          </button>

          {currentUser ? (
            <>
              <button
                ref={cartButtonRef}
                className={`header-icon-btn ${isCartHot || cartState.totalItems > 0 ? 'header-cart-hot' : ''}`}
                onClick={onOpenCart}
              >
                <FiShoppingCart />
                {cartState.totalItems > 0 && <span className="header-cart-badge">{cartState.totalItems}</span>}
              </button>

              <button className="header-user-btn" onClick={onOpenProfile}>
                {currentUser.photoURL ? (
                  <img src={currentUser.photoURL} alt="Profile" className="header-user-avatar" />
                ) : (
                  <span className="header-user-initials">
                    {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                  </span>
                )}
              </button>
            </>
          ) : (
            <button className="header-login-btn" onClick={onOpenLogin}>
              <FiLogIn /> Login
            </button>
          )}
        </div>
      </div>

      {/* Mobile Expandable Search */}
      <div className={`header-search-expanded ${isSearchExpanded ? 'active' : ''}`}>
        <div className="header-search-wrapper">
          <FaSearch className="header-search-icon" />
          <input
            ref={searchInputRef}
            type="text"
            className="header-search-input"
            placeholder="Search products, categories..."
            value={searchQuery}
            onChange={handleSearchChange}
          />
          {searchQuery && (
            <button className="header-search-clear" onClick={() => setSearchQuery('')}>
              ×
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
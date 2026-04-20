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
  searchFocused,
  onSearchFocusChange,
}) {
  const [searchQuery, setSearchQuery] = useState('');
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
    if (onSearchFocusChange) {
      onSearchFocusChange(!searchFocused);
    }
    if (!searchFocused) {
      setTimeout(() => searchInputRef.current?.focus(), 150);
    }
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  // Focus search input when searchFocused becomes true
  useEffect(() => {
    if (searchFocused && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchFocused]);

  // Listen for toggle-search event from BottomNav
  useEffect(() => {
    const handleToggleSearch = () => {
      if (onSearchFocusChange) {
        onSearchFocusChange(prev => !prev);
      }
    };
    
    window.addEventListener('toggle-search', handleToggleSearch);
    
    return () => {
      window.removeEventListener('toggle-search', handleToggleSearch);
    };
  }, [onSearchFocusChange]);

  return (
    <header className="store-header">
      {/* Mobile Header - Minimal */}
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

      {/* Mobile Popup Search Overlay */}
      <div className={`header-search-popup-overlay ${searchFocused ? 'active' : ''}`} onClick={() => onSearchFocusChange(false)}>
        <div className="header-search-popup" onClick={(e) => e.stopPropagation()}>
          <div className="header-search-popup-header">
            <h3>Search Products</h3>
            <button className="header-search-popup-close" onClick={() => onSearchFocusChange(false)}>×</button>
          </div>
          <div className="header-search-popup-body">
            <div className="header-search-popup-wrapper">
              <FaSearch className="header-search-popup-icon" />
              <input
                ref={searchInputRef}
                type="text"
                className="header-search-popup-input"
                placeholder="Search products, categories..."
                value={searchQuery}
                onChange={handleSearchChange}
              />
              {searchQuery && (
                <button className="header-search-popup-clear" onClick={() => setSearchQuery('')}>
                  ×
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
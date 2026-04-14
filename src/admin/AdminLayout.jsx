import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { 
  FiHome, 
  FiUsers, 
  FiShield, 
  FiAward, 
  FiShoppingBag, 
  FiBarChart2, 
  FiPackage, 
  FiGrid, 
  FiLogOut, 
  FiMenu, 
  FiX,
  FiBell,
  FiChevronRight
} from 'react-icons/fi';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import logo from '../bstoreapp/assets/images/logo.png';
import './admin.css';

export default function AdminLayout({ currentUser }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 1024;
      setIsMobile(mobile);
      if (!mobile) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navItems = [
    { name: 'Dashboard', path: '/admin-dashboard', icon: FiGrid },
    { name: 'User Management', path: '/admin-users', icon: FiUsers },
    { name: 'Admin List', path: '/admin-list', icon: FiShield },
    { name: 'Role Management', path: '/admin-roles', icon: FiAward },
    { name: 'Seller Overview', path: '/admin-sellers', icon: FiAward },
    { name: 'Order Status', path: '/admin-orders', icon: FiShoppingBag },
    { name: 'Analytics', path: '/admin-analytics', icon: FiBarChart2 },
    { name: 'Banner Management', path: '/admin-banners', icon: FiPackage },
    { name: 'Catalog Manager', path: '/catalog-admin', icon: FiPackage },
    { name: 'Poster Builder', path: '/poster-builder', icon: FiBarChart2 },
  ];

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to logout?')) {
      await signOut(auth);
      navigate('/');
    }
  };

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const closeSidebarOnMobile = () => {
    if (isMobile) setIsSidebarOpen(false);
  };

  const activeItem = navItems.find(item => location.pathname === item.path) || { name: 'Admin' };

  return (
    <div className="admin-layout">
      {/* Sidebar Overlay for Mobile */}
      {isMobile && isSidebarOpen && (
        <div className="admin-sidebar-overlay" onClick={toggleSidebar} />
      )}

      {/* Sidebar */}
      <aside className={`admin-sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
        <div className="admin-sidebar-header">
          <div className="admin-logo-container" onClick={() => navigate('/')}>
            <img src={logo} alt="Logo" className="admin-sidebar-logo" />
            <div className="admin-logo-text">
              <span className="admin-logo-title">Beautiful Dinajpur</span>
              <span className="admin-logo-tag">Admin Panel</span>
            </div>
          </div>
          {isMobile && (
            <button className="admin-sidebar-close" onClick={toggleSidebar}>
              <FiX />
            </button>
          )}
        </div>

        <nav className="admin-sidebar-nav">
          <div className="admin-nav-section">MAIN MENU</div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <div 
                key={item.path} 
                className={`admin-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => {
                  navigate(item.path);
                  closeSidebarOnMobile();
                }}
              >
                <div className="admin-nav-item-icon">
                  <Icon />
                </div>
                <span className="admin-nav-item-text">{item.name}</span>
                {isActive && <FiChevronRight className="admin-nav-item-arrow" />}
              </div>
            );
          })}
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-user-profile">
            <div className="admin-user-avatar">
              {currentUser?.photoURL ? (
                <img src={currentUser.photoURL} alt="User" />
              ) : (
                <span>{currentUser?.displayName?.[0] || currentUser?.email?.[0] || 'A'}</span>
              )}
            </div>
            <div className="admin-user-info">
              <span className="admin-user-name">{currentUser?.displayName || 'Admin User'}</span>
              <span className="admin-user-role">Administrator</span>
            </div>
          </div>
          <button className="admin-btn-logout" onClick={handleLogout}>
            <FiLogOut />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`admin-main ${isSidebarOpen && !isMobile ? 'sidebar-open' : 'sidebar-closed'}`}>
        {/* Topbar */}
        <header className="admin-topbar">
          <div className="admin-topbar-left">
            <button className="admin-menu-toggle" onClick={toggleSidebar}>
              {isSidebarOpen && isMobile ? <FiX /> : <FiMenu />}
            </button>
            <h1 className="admin-page-title">{activeItem.name}</h1>
          </div>
          
          <div className="admin-topbar-right">
            <button className="admin-icon-btn" title="Go to Website" onClick={() => navigate('/')}>
              <FiHome />
            </button>
            <button className="admin-icon-btn" title="Notifications">
              <FiBell />
              <span className="admin-notification-badge"></span>
            </button>
            <div className="admin-topbar-divider" />
            <div className="admin-topbar-user" onClick={() => navigate('/profile')}>
              <div className="admin-topbar-avatar">
                {currentUser?.photoURL ? (
                  <img src={currentUser.photoURL} alt="User" />
                ) : (
                  <span>{currentUser?.displayName?.[0] || 'A'}</span>
                )}
              </div>
              <span className="admin-topbar-username">{currentUser?.displayName?.split(' ')[0] || 'Admin'}</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="admin-content-wrapper">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

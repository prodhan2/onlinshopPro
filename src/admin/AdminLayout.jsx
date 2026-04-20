import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  FiAward,
  FiBarChart2,
  FiBell,
  FiChevronRight,
  FiGrid,
  FiHome,
  FiLogOut,
  FiMenu,
  FiPackage,
  FiShield,
  FiShoppingBag,
  FiUsers,
  FiX,
} from 'react-icons/fi';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import logo from '../bstoreapp/assets/images/logo.png';
import './admin.css';

const navItems = [
  { name: 'Dashboard', path: '/admin-dashboard', icon: FiGrid, accent: 'from-sky-500 to-cyan-400' },
  { name: 'Users', path: '/admin-users', icon: FiUsers, accent: 'from-violet-500 to-fuchsia-500' },
  { name: 'Admins', path: '/admin-list', icon: FiShield, accent: 'from-rose-500 to-orange-400' },
  { name: 'Roles', path: '/admin-roles', icon: FiAward, accent: 'from-amber-500 to-yellow-400' },
  { name: 'Sellers', path: '/admin-sellers', icon: FiAward, accent: 'from-emerald-500 to-teal-400' },
  { name: 'Orders', path: '/admin-orders', icon: FiShoppingBag, accent: 'from-pink-500 to-rose-500' },
  { name: 'Analytics', path: '/admin-analytics', icon: FiBarChart2, accent: 'from-indigo-500 to-blue-500' },
  { name: 'Banners', path: '/admin-banners', icon: FiPackage, accent: 'from-cyan-500 to-sky-500' },
  { name: 'Catalog', path: '/catalog-admin', icon: FiPackage, accent: 'from-slate-700 to-slate-500' },
  { name: 'Poster', path: '/poster-builder', icon: FiBarChart2, accent: 'from-purple-500 to-indigo-500' },
];

export default function AdminLayout({ currentUser }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.innerWidth >= 1024);

  useEffect(() => {
    function handleResize() {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      setIsSidebarOpen(!mobile);
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  }, [location.pathname, isMobile]);

  useEffect(() => {
    document.body.style.overflow = isMobile && isSidebarOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobile, isSidebarOpen]);

  const activeItem = useMemo(
    () => navItems.find((item) => location.pathname === item.path) || navItems[0],
    [location.pathname],
  );

  async function handleLogout() {
    const ok = window.confirm('Do you want to logout from admin?');
    if (!ok) return;
    await signOut(auth);
    navigate('/');
  }

  const userInitial = (currentUser?.displayName || currentUser?.email || 'A').slice(0, 1).toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-none">
        {isMobile && isSidebarOpen ? (
          <button
            type="button"
            aria-label="Close navigation"
            className="fixed inset-0 z-40 bg-slate-950/20"
            onClick={() => setIsSidebarOpen(false)}
          />
        ) : null}

        <aside
          className={[
            'fixed inset-y-0 left-0 z-50 flex w-[320px] max-w-[88vw] flex-col border-r border-slate-200',
            'bg-white text-slate-900',
            'transition-transform duration-300 lg:static lg:z-auto lg:w-[290px] lg:max-w-none lg:translate-x-0',
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full',
          ].join(' ')}
        >
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="flex items-center gap-3 text-left"
              >
                <div className="flex h-12 w-12 items-center justify-center">
                  <img src={logo} alt="Logo" className="h-11 w-11 object-contain" />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-sky-600">Admin Workspace</p>
                  <h2 className="text-lg font-bold leading-tight text-slate-900">Beautiful Dinajpur</h2>
                  <p className="text-xs text-slate-500">Simple control center</p>
                </div>
              </button>
              {isMobile ? (
                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center text-xl text-slate-500"
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <FiX />
                </button>
              ) : null}
            </div>
          </div>

          <div className="border-b border-slate-200 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center overflow-hidden bg-slate-100 text-sm font-bold text-slate-700">
                {currentUser?.photoURL ? (
                  <img src={currentUser.photoURL} alt="User" className="h-full w-full object-cover" />
                ) : (
                  <span>{userInitial}</span>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{currentUser?.displayName || 'Admin User'}</p>
                <p className="truncate text-xs text-slate-500">{currentUser?.email || 'Signed in'}</p>
              </div>
            </div>
          </div>

          <nav className="admin-scrollbar flex-1 overflow-y-auto px-5 py-4">
            <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">
              Navigation
            </div>
            <div>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => navigate(item.path)}
                    className={[
                      'group flex w-full items-center gap-3 border-b border-slate-200 py-3 text-left transition-colors',
                      isActive
                        ? 'text-slate-950'
                        : 'text-slate-600 hover:text-slate-950',
                    ].join(' ')}
                  >
                    <span className="inline-flex h-8 w-8 flex-none items-center justify-center text-base">
                      <Icon />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{item.name}</span>
                      <span className={`block text-xs ${isActive ? 'text-slate-500' : 'text-slate-400'}`}>
                        Open {item.name.toLowerCase()}
                      </span>
                    </span>
                    <FiChevronRight className={isActive ? 'text-slate-400' : 'text-slate-300'} />
                  </button>
                );
              })}
            </div>
          </nav>

          <div className="border-t border-slate-200 px-5 py-4">
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center justify-between gap-3 border-b border-rose-200 py-2 text-sm font-semibold text-rose-600 transition hover:text-rose-700"
            >
              <span className="inline-flex items-center gap-3">
                <FiLogOut />
                Logout
              </span>
              <FiChevronRight />
            </button>
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col lg:pl-0">
          <header className="sticky top-0 z-30 border-b border-slate-200 bg-sky-100/95 px-4 py-3 backdrop-blur sm:px-5">
            <div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsSidebarOpen((value) => !value)}
                    className="inline-flex h-10 w-10 flex-none items-center justify-center border-b border-slate-300 text-xl text-slate-700"
                  >
                    {isSidebarOpen && isMobile ? <FiX /> : <FiMenu />}
                  </button>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-[0.26em] text-sky-600">Admin Workspace</p>
                    <h1 className="truncate text-lg font-black tracking-[-0.04em] text-slate-900 sm:text-2xl">
                      {activeItem?.name || 'Dashboard'}
                    </h1>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => navigate('/')}
                    className="inline-flex h-10 w-10 items-center justify-center border-b border-slate-300 text-slate-700 transition hover:text-slate-950"
                    title="Go Home"
                  >
                    <FiHome />
                  </button>
                  <button
                    type="button"
                    className="relative inline-flex h-10 w-10 items-center justify-center border-b border-slate-300 text-slate-700 transition hover:text-slate-950"
                    title="Notifications"
                  >
                    <FiBell />
                    <span className="absolute right-2 top-2 h-2 w-2 bg-rose-500" />
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/profile')}
                    className="flex items-center gap-2 border-b border-slate-300 px-1 py-1 text-slate-800"
                  >
                    <span className="flex h-8 w-8 items-center justify-center overflow-hidden bg-slate-100 text-xs font-bold">
                      {currentUser?.photoURL ? (
                        <img src={currentUser.photoURL} alt="User" className="h-full w-full object-cover" />
                      ) : (
                        userInitial
                      )}
                    </span>
                    <span className="hidden max-w-[110px] truncate text-sm font-semibold sm:block">
                      {currentUser?.displayName?.split(' ')[0] || 'Admin'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </header>

          <div className="flex-1 px-0 pb-24 lg:pb-8">
            <div className="admin-content-wrapper">
              <Outlet />
            </div>
          </div>

          {isMobile ? (
            <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-3 py-2 backdrop-blur">
              <div className="grid grid-cols-4 gap-2">
                {navItems.slice(0, 4).map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <button
                      key={`bottom-${item.path}`}
                      type="button"
                      onClick={() => navigate(item.path)}
                      className={[
                        'flex flex-col items-center justify-center border-b px-2 py-2 text-[11px] font-bold transition',
                        isActive ? 'border-slate-950 text-slate-950' : 'border-slate-200 text-slate-500',
                      ].join(' ')}
                    >
                      <Icon className="mb-1 text-base" />
                      <span className="truncate">{item.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}

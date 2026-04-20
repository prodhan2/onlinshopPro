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
    <div className="min-h-screen bg-[linear-gradient(180deg,#e0f2fe_0%,#eef2ff_32%,#f8fafc_100%)] text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-[1800px]">
        {isMobile && isSidebarOpen ? (
          <button
            type="button"
            aria-label="Close navigation"
            className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-[2px]"
            onClick={() => setIsSidebarOpen(false)}
          />
        ) : null}

        <aside
          className={[
            'fixed inset-y-0 left-0 z-50 flex w-[320px] max-w-[88vw] flex-col border-r border-white/50',
            'bg-[linear-gradient(180deg,#0f172a_0%,#172554_48%,#111827_100%)] text-white shadow-[0_24px_80px_rgba(15,23,42,0.45)]',
            'transition-transform duration-300 lg:static lg:z-auto lg:w-[290px] lg:max-w-none lg:translate-x-0',
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full',
          ].join(' ')}
        >
          <div className="border-b border-white/10 p-5">
            <div className="flex items-start justify-between gap-3">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="flex items-center gap-3 text-left"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 shadow-inner shadow-white/10">
                  <img src={logo} alt="Logo" className="h-11 w-11 object-contain" />
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-200/80">Mobile Admin</p>
                  <h2 className="text-lg font-black leading-tight text-white">Beautiful Dinajpur</h2>
                  <p className="text-xs text-slate-300">App-style control center</p>
                </div>
              </button>
              {isMobile ? (
                <button
                  type="button"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-xl text-white"
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <FiX />
                </button>
              ) : null}
            </div>
          </div>

          <div className="px-4 pb-4 pt-5">
            <div className="rounded-[28px] border border-white/10 bg-white/10 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 text-lg font-black text-white">
                  {currentUser?.photoURL ? (
                    <img src={currentUser.photoURL} alt="User" className="h-full w-full object-cover" />
                  ) : (
                    <span>{userInitial}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-white">{currentUser?.displayName || 'Admin User'}</p>
                  <p className="truncate text-xs text-slate-300">{currentUser?.email || 'Signed in'}</p>
                  <span className="mt-2 inline-flex rounded-full bg-emerald-400/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-200">
                    Active Session
                  </span>
                </div>
              </div>
            </div>
          </div>

          <nav className="admin-scrollbar flex-1 overflow-y-auto px-4 pb-4">
            <div className="mb-3 px-2 text-[11px] font-bold uppercase tracking-[0.28em] text-slate-400">
              Navigation
            </div>
            <div className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => navigate(item.path)}
                    className={[
                      'group relative flex w-full items-center gap-3 overflow-hidden rounded-2xl px-3 py-3.5 text-left transition-all',
                      isActive
                        ? 'bg-white text-slate-950 shadow-[0_16px_32px_rgba(15,23,42,0.22)]'
                        : 'bg-white/[0.03] text-slate-200 hover:bg-white/[0.08]',
                    ].join(' ')}
                  >
                    <span className={`inline-flex h-11 w-11 flex-none items-center justify-center rounded-2xl bg-gradient-to-br ${item.accent} text-lg text-white shadow-lg`}>
                      <Icon />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">{item.name}</span>
                      <span className={`block text-xs ${isActive ? 'text-slate-500' : 'text-slate-400'}`}>
                        Open {item.name.toLowerCase()}
                      </span>
                    </span>
                    <FiChevronRight className={isActive ? 'text-slate-400' : 'text-slate-500'} />
                  </button>
                );
              })}
            </div>
          </nav>

          <div className="border-t border-white/10 p-4">
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-3 rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3.5 text-sm font-bold text-rose-100 transition hover:bg-rose-400/20"
            >
              <FiLogOut />
              Logout
            </button>
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col lg:pl-0">
          <header className="sticky top-0 z-30 px-3 pb-3 pt-3 sm:px-5">
            <div className="rounded-[30px] border border-white/60 bg-white/75 px-4 py-3 shadow-[0_18px_40px_rgba(148,163,184,0.16)] backdrop-blur-xl sm:px-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsSidebarOpen((value) => !value)}
                    className="inline-flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-slate-950 text-xl text-white shadow-lg lg:bg-slate-100 lg:text-slate-800"
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
                    className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 transition hover:bg-slate-200"
                    title="Go Home"
                  >
                    <FiHome />
                  </button>
                  <button
                    type="button"
                    className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 transition hover:bg-slate-200"
                    title="Notifications"
                  >
                    <FiBell />
                    <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-rose-500" />
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/profile')}
                    className="flex items-center gap-2 rounded-2xl bg-slate-950 px-2 py-2 text-white shadow-lg"
                  >
                    <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-xl bg-white/15 text-xs font-bold">
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

          <div className="flex-1 px-3 pb-24 sm:px-5 lg:pb-8">
            <div className="admin-content-wrapper rounded-[32px] border border-white/60 bg-white/55 p-3 shadow-[0_20px_50px_rgba(148,163,184,0.14)] backdrop-blur-xl sm:p-5">
              <Outlet />
            </div>
          </div>

          {isMobile ? (
            <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/60 bg-white/90 px-3 py-3 backdrop-blur-xl">
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
                        'flex flex-col items-center justify-center rounded-2xl px-2 py-2 text-[11px] font-bold transition',
                        isActive ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-600',
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

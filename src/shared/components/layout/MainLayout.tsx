import React, { useEffect, useRef, useState } from 'react';
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/core/state/store';
import { ConfirmModal, Toast } from '@/shared/components/ui';

type MenuIcon = 'dashboard' | 'contracts' | 'assets' | 'members' | 'calendar' | 'support' | 'notice' | 'reports' | 'api' | 'settings';

type MenuItem = {
  path: string;
  label: string;
  icon: MenuIcon;
};

const publicMenuItems: MenuItem[] = [
  { path: '/', label: '대시보드', icon: 'dashboard' },
  { path: '/notices', label: '공지사항', icon: 'notice' },
  { path: '/contracts', label: '계약 관리', icon: 'contracts' },
  { path: '/assets', label: '자산 조회', icon: 'assets' },
  { path: '/project-members', label: '프로젝트 현황', icon: 'members' },
  { path: '/calendar', label: '일정 관리', icon: 'calendar' },
  { path: '/client-support-report', label: '고객지원보고서', icon: 'support' },
  { path: '/client-support', label: '고객지원현황', icon: 'support' },
  { path: '/reports', label: '보고서', icon: 'reports' }
];

const apiTestMenuItem: MenuItem = { path: '/api-test', label: 'API 테스트', icon: 'api' };
const adminMenuItems: MenuItem[] = [{ path: '/settings', label: '설정', icon: 'settings' }];

function MenuIconView({ icon }: { icon: MenuIcon }) {
  const cls = 'w-5 h-5';
  switch (icon) {
    case 'dashboard':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l9-9 9 9M4 10v10h6v-6h4v6h6V10" />
        </svg>
      );
    case 'contracts':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 3h10a2 2 0 012 2v14l-4-2-3 2-3-2-4 2V5a2 2 0 012-2z" />
        </svg>
      );
    case 'assets':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0v10l-8 4m8-14l-8 4m0 10L4 17V7m8 14V11" />
        </svg>
      );
    case 'members':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11a4 4 0 10-8 0m12 10a6 6 0 00-12 0m14-8a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    case 'calendar':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 2v4m8-4v4M3 10h18M5 6h14a2 2 0 012 2v11a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" />
        </svg>
      );
    case 'support':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h8m-8 4h5m-7 7a2 2 0 01-2-2V5a2 2 0 012-2h8a2 2 0 012 2v4l4 4v6a2 2 0 01-2 2H6z" />
        </svg>
      );
    case 'notice':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.5-1.5a2 2 0 01-.5-1.4V10a6 6 0 10-12 0v4.1a2 2 0 01-.5 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      );
    case 'reports':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-6m4 6V7m4 10v-3M4 21h16" />
        </svg>
      );
    case 'api':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h8m-6-4h4m-7 8h10M4 5h16v14H4z" />
        </svg>
      );
    case 'settings':
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.983 5.5a1.5 1.5 0 012.034 0l.752.658a1.5 1.5 0 001.535.29l.959-.37a1.5 1.5 0 011.93.9l.37.959a1.5 1.5 0 001.12.94l.99.18a1.5 1.5 0 011.22 1.48v1.066a1.5 1.5 0 01-1.22 1.48l-.99.18a1.5 1.5 0 00-1.12.94l-.37.959a1.5 1.5 0 01-1.93.9l-.959-.37a1.5 1.5 0 00-1.535.29l-.752.658a1.5 1.5 0 01-2.034 0l-.752-.658a1.5 1.5 0 00-1.535-.29l-.959.37a1.5 1.5 0 01-1.93-.9l-.37-.959a1.5 1.5 0 00-1.12-.94l-.99-.18a1.5 1.5 0 01-1.22-1.48v-1.066a1.5 1.5 0 011.22-1.48l.99-.18a1.5 1.5 0 001.12-.94l.37-.959a1.5 1.5 0 011.93-.9l.959.37a1.5 1.5 0 001.535-.29l.752-.658z" />
          <circle cx="12" cy="12" r="2.5" strokeWidth={2} />
        </svg>
      );
  }
}

const MainLayout: React.FC = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const user = useAppStore((state) => state.user);
  const role = useAppStore((state) => state.role);
  const logout = useAppStore((state) => state.logout);
  const showToast = useAppStore((state) => state.showToast);

  const roleLabel = role === 'admin' ? '관리자' : role === 'manager' ? '중간 관리자' : '일반 사용자';
  const defaultBrandLogoSrc = `${import.meta.env.BASE_URL}icon-192x192.png`;
  const [brandLogoSrc, setBrandLogoSrc] = useState(defaultBrandLogoSrc);
  const brandLogoInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const checkScreenSize = () => setIsMobile(window.innerWidth < 900);
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  useEffect(() => {
    const savedLogo = localStorage.getItem('ims-brand-logo');
    if (savedLogo) setBrandLogoSrc(savedLogo);
  }, []);

  if (location.pathname === '/settings' && role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  const hasApiAccess = role === 'admin' || role === 'manager';
  const menuItems = [...publicMenuItems, ...(role === 'admin' ? adminMenuItems : []), ...(hasApiAccess ? [apiTestMenuItem] : [])];

  const handleLogoutConfirm = () => {
    setIsLogoutConfirmOpen(false);
    logout();
    showToast('로그아웃했습니다', 'success');
    navigate('/login');
  };

  const handleBrandLogoClick = () => {
    if (role !== 'admin') return;
    brandLogoInputRef.current?.click();
  };

  const handleBrandLogoChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('이미지 파일만 업로드할 수 있습니다', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result) return;
      setBrandLogoSrc(result);
      localStorage.setItem('ims-brand-logo', result);
      showToast('로고가 변경되었습니다', 'success');
    };
    reader.onerror = () => {
      showToast('로고 업로드 중 오류가 발생했습니다', 'error');
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <input ref={brandLogoInputRef} type="file" accept="image/*" className="hidden" onChange={handleBrandLogoChange} />
      {isMobile && (
        <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBrandLogoClick}
              className={role === 'admin' ? 'cursor-pointer' : 'cursor-default'}
              aria-label="브랜드 로고"
              title={role === 'admin' ? '클릭하여 로고 업로드' : '브랜드 로고'}
            >
              <img src={brandLogoSrc} alt="INTRUEVINE logo" className="w-9 h-9 rounded-lg object-cover border border-slate-200" />
            </button>
            <span className="font-bold text-slate-900 text-sm">INTRUEVINE 통합 고객지원관리시스템</span>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            className="w-10 h-10 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded-lg"
            aria-label="Toggle menu"
            type="button"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <title>{isMobileMenuOpen ? 'Close menu' : 'Open menu'}</title>
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </header>
      )}

      {!isMobile && (
        <aside className="w-64 bg-white border-r border-slate-200 fixed h-full flex flex-col">
          <div className="h-16 flex items-center px-5 border-b border-slate-200">
            <button
              type="button"
              onClick={handleBrandLogoClick}
              className={`mr-3 ${role === 'admin' ? 'cursor-pointer' : 'cursor-default'}`}
              aria-label="브랜드 로고"
              title={role === 'admin' ? '클릭하여 로고 업로드' : '브랜드 로고'}
            >
              <img src={brandLogoSrc} alt="INTRUEVINE logo" className="w-9 h-9 rounded-lg object-cover border border-slate-200" />
            </button>
            <div>
              <h1 className="font-bold text-slate-900 text-sm">INTRUEVINE</h1>
              <p className="text-xs text-slate-400">통합 고객지원관리시스템</p>
            </div>
          </div>

          <nav className="flex-1 py-4 px-3">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-all ${
                    isActive ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <MenuIconView icon={item.icon} />
                  <span className="font-medium text-sm">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A9 9 0 1118.88 17.8M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 text-sm truncate">{user?.display_name || '사용자'}</p>
                <p className="text-xs text-slate-500">{roleLabel}</p>
              </div>
              <button
                onClick={() => setIsLogoutConfirmOpen(true)}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                aria-label="Logout"
                type="button"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <title>Logout</title>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11V3m6.364 2.636a9 9 0 11-12.728 0" />
                </svg>
              </button>
            </div>
          </div>
        </aside>
      )}

      {isMobile && isMobileMenuOpen && (
        <>
          <button onClick={() => setIsMobileMenuOpen(false)} className="fixed inset-0 z-40 bg-slate-900/50" aria-label="Close menu" type="button" />
          <div className="fixed top-16 right-0 bottom-0 w-64 bg-white border-l border-slate-200 z-50">
            <div className="p-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A9 9 0 1118.88 17.8M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <p className="font-bold text-slate-900">{user?.display_name || '사용자'}</p>
                  <p className="text-xs text-slate-500">{roleLabel}</p>
                </div>
              </div>
            </div>

            <nav className="p-3">
              {menuItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-all ${
                      isActive ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <MenuIconView icon={item.icon} />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200">
              <button
                onClick={() => setIsLogoutConfirmOpen(true)}
                className="flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg w-full transition-colors"
                type="button"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <title>Logout</title>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11V3m6.364 2.636a9 9 0 11-12.728 0" />
                </svg>
                <span className="font-medium">로그아웃</span>
              </button>
            </div>
          </div>
        </>
      )}

      <main className="flex-1 min-h-screen" style={{ marginLeft: isMobile ? 0 : 256 }}>
        <div className="p-6 max-w-7xl mx-auto" style={{ paddingTop: isMobile ? 88 : 24 }}>
          <Outlet />
        </div>
      </main>

      <Toast />
      <ConfirmModal
        isOpen={isLogoutConfirmOpen}
        onClose={() => setIsLogoutConfirmOpen(false)}
        onConfirm={handleLogoutConfirm}
        title="로그아웃"
        message="로그아웃 하시겠습니까?"
        confirmText="로그아웃"
        cancelText="취소"
        icon="logout"
      />
    </div>
  );
};

export default MainLayout;

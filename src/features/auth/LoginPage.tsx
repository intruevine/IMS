import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAppStore } from '@/core/state/store';
import { hasAuthToken } from '@/core/api/client';
import { Button } from '@/shared/components/ui';

const LoginPage: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerPasswordConfirm, setRegisterPasswordConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const login = useAppStore((state) => state.login);
  const registerUserRequest = useAppStore((state) => state.registerUserRequest);
  const authError = useAppStore((state) => state.authError);
  const clearAuthError = useAppStore((state) => state.clearAuthError);
  const showToast = useAppStore((state) => state.showToast);
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);

  if (isAuthenticated && hasAuthToken()) {
    return <Navigate to="/" replace />;
  }

  const handleLoginSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    clearAuthError();

    if (!username.trim() || !password) {
      showToast('아이디와 비밀번호를 입력해 주세요.', 'warning');
      return;
    }

    setIsLoading(true);
    const success = await login(username.trim(), password);
    setIsLoading(false);

    if (!success) {
      const latestError = useAppStore.getState().authError;
      showToast(latestError || '로그인에 실패했습니다.', 'error');
    }
  };

  const handleRegisterSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    clearAuthError();

    if (!username.trim() || !registerName.trim() || !registerPassword) {
      showToast('아이디, 이름, 비밀번호를 모두 입력해 주세요.', 'warning');
      return;
    }
    if (registerPassword !== registerPasswordConfirm) {
      showToast('비밀번호 확인이 일치하지 않습니다.', 'warning');
      return;
    }
    if (registerPassword.length < 4) {
      showToast('비밀번호는 4자 이상이어야 합니다.', 'warning');
      return;
    }

    setIsLoading(true);
    try {
      await registerUserRequest({
        username: username.trim(),
        display_name: registerName.trim(),
        password: registerPassword,
      });
      showToast('가입 요청이 접수되었습니다. 관리자 승인 후 로그인할 수 있습니다.', 'success');
      setMode('login');
      setPassword('');
      setRegisterPassword('');
      setRegisterPasswordConfirm('');
    } catch (error) {
      const message = error instanceof Error ? error.message : '가입 요청에 실패했습니다.';
      showToast(message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50">
      <div className="absolute left-[-10%] top-[-10%] h-96 w-96 animate-blob rounded-full bg-blue-300 opacity-40 blur-[80px] filter" />
      <div className="absolute bottom-[-10%] right-[-10%] h-96 w-96 animate-blob rounded-full bg-indigo-300 opacity-40 blur-[80px] filter animation-delay-2000" />

      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-3xl border border-white/60 bg-white/80 p-10 shadow-2xl backdrop-blur-xl">
          <div className="mb-10 text-center">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-2xl text-white shadow-lg shadow-indigo-200">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">통합 고객지원관리시스템</h1>
            <p className="mt-2 text-sm text-slate-500">관리자 승인 기반 사용자 관리</p>
          </div>

          <div className="mb-5 grid grid-cols-2 gap-2">
            <button
              type="button"
              className={`rounded-lg py-2 text-sm font-semibold ${mode === 'login' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}
              onClick={() => {
                setMode('login');
                clearAuthError();
              }}
            >
              로그인
            </button>
            <button
              type="button"
              className={`rounded-lg py-2 text-sm font-semibold ${mode === 'register' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}
              onClick={() => {
                setMode('register');
                clearAuthError();
              }}
            >
              가입 요청
            </button>
          </div>

          <form onSubmit={mode === 'login' ? handleLoginSubmit : handleRegisterSubmit} className="space-y-4">
            <div>
              <label className="ml-1 block text-xs font-bold uppercase tracking-tight text-slate-500">아이디</label>
              <input
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="아이디 입력"
                className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-3 font-semibold text-slate-800 outline-none transition focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {mode === 'register' && (
              <div>
                <label className="ml-1 block text-xs font-bold uppercase tracking-tight text-slate-500">이름</label>
                <input
                  type="text"
                  value={registerName}
                  onChange={(event) => setRegisterName(event.target.value)}
                  placeholder="표시 이름 입력"
                  className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-3 font-semibold text-slate-800 outline-none transition focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            <div>
              <label className="ml-1 block text-xs font-bold uppercase tracking-tight text-slate-500">비밀번호</label>
              <input
                type="password"
                value={mode === 'login' ? password : registerPassword}
                onChange={(event) => (mode === 'login' ? setPassword(event.target.value) : setRegisterPassword(event.target.value))}
                placeholder={mode === 'login' ? '비밀번호 입력' : '신청 비밀번호 입력'}
                className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-3 font-semibold text-slate-800 outline-none transition focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {mode === 'register' && (
              <div>
                <label className="ml-1 block text-xs font-bold uppercase tracking-tight text-slate-500">비밀번호 확인</label>
                <input
                  type="password"
                  value={registerPasswordConfirm}
                  onChange={(event) => setRegisterPasswordConfirm(event.target.value)}
                  placeholder="비밀번호 확인 입력"
                  className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-3 font-semibold text-slate-800 outline-none transition focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {mode === 'login' && authError && <p className="text-sm text-red-600">{authError}</p>}

            <Button type="submit" variant="primary" size="lg" isLoading={isLoading} className="mt-2 w-full">
              {mode === 'login' ? '시스템 접속' : '가입 요청 보내기'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

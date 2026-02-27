import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
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

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAuthError();

    if (!username.trim() || !password) {
      showToast('아이디와 비밀번호를 입력해 주세요', 'warning');
      return;
    }

    setIsLoading(true);
    const success = await login(username.trim(), password);
    setIsLoading(false);

    if (!success) {
      const latestError = useAppStore.getState().authError;
      showToast(latestError || '로그인에 실패했습니다', 'error');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAuthError();

    if (!username.trim() || !registerName.trim() || !registerPassword) {
      showToast('아이디, 이름, 비밀번호를 모두 입력해 주세요', 'warning');
      return;
    }
    if (registerPassword !== registerPasswordConfirm) {
      showToast('비밀번호 확인이 일치하지 않습니다', 'warning');
      return;
    }
    if (registerPassword.length < 4) {
      showToast('비밀번호는 4자 이상이어야 합니다', 'warning');
      return;
    }

    setIsLoading(true);
    try {
      await registerUserRequest({
        username: username.trim(),
        display_name: registerName.trim(),
        password: registerPassword
      });
      showToast('가입 요청이 접수되었습니다. 관리자 승인 후 로그인 가능합니다.', 'success');
      setMode('login');
      setPassword('');
      setRegisterPassword('');
      setRegisterPasswordConfirm('');
    } catch (error) {
      const message = error instanceof Error ? error.message : '가입 요청에 실패했습니다';
      showToast(message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden">
      <div className="absolute w-96 h-96 bg-blue-300 rounded-full filter blur-[80px] opacity-40 top-[-10%] left-[-10%] animate-blob" />
      <div className="absolute w-96 h-96 bg-indigo-300 rounded-full filter blur-[80px] opacity-40 bottom-[-10%] right-[-10%] animate-blob animation-delay-2000" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-white/80 backdrop-blur-xl p-10 rounded-3xl shadow-2xl border border-white/60">
          <div className="text-center mb-10">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white text-2xl mb-4 shadow-lg shadow-indigo-200"
            >
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </motion.div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">통합 고객지원관리시스템</h1>
            <p className="text-slate-500 mt-2 text-sm">관리자 승인 기반 사용자 관리</p>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-5">
            <button
              type="button"
              className={`py-2 rounded-lg text-sm font-semibold ${mode === 'login' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}
              onClick={() => {
                setMode('login');
                clearAuthError();
              }}
            >
              로그인
            </button>
            <button
              type="button"
              className={`py-2 rounded-lg text-sm font-semibold ${mode === 'register' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}
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
              <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1 tracking-tight uppercase">아이디</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="아이디 입력"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition bg-white/50 text-slate-800 font-semibold"
              />
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1 tracking-tight uppercase">이름</label>
                <input
                  type="text"
                  value={registerName}
                  onChange={(e) => setRegisterName(e.target.value)}
                  placeholder="표시 이름 입력"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition bg-white/50 text-slate-800 font-semibold"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1 tracking-tight uppercase">비밀번호</label>
              <input
                type="password"
                value={mode === 'login' ? password : registerPassword}
                onChange={(e) => (mode === 'login' ? setPassword(e.target.value) : setRegisterPassword(e.target.value))}
                placeholder={mode === 'login' ? '비밀번호 입력' : '신청 비밀번호 입력'}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition bg-white/50 text-slate-800 font-semibold"
              />
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1 tracking-tight uppercase">비밀번호 확인</label>
                <input
                  type="password"
                  value={registerPasswordConfirm}
                  onChange={(e) => setRegisterPasswordConfirm(e.target.value)}
                  placeholder="비밀번호 확인 입력"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition bg-white/50 text-slate-800 font-semibold"
                />
              </div>
            )}

            {mode === 'login' && authError && <p className="text-sm text-red-600">{authError}</p>}

            <Button type="submit" variant="primary" size="lg" isLoading={isLoading} className="w-full mt-2">
              {mode === 'login' ? '시스템 접속' : '가입 요청 보내기'}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;

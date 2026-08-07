'use client';

import React, { useEffect, useState } from 'react';

export default function RedirectClient({ redirectData, error }) {
  const [countdown, setCountdown] = useState(1);
  const [isVisible, setIsVisible] = useState(false);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (redirectData) {
      setIsActive(redirectData.active !== false);
    }
    // 페이드인 애니메이션 지연
    setTimeout(() => setIsVisible(true), 100);
  }, [redirectData]);

  useEffect(() => {
    if (!error && redirectData && isActive && countdown <= 0) {
      window.location.href = redirectData.url;
    }
  }, [redirectData, countdown, isActive, error]);

  useEffect(() => {
    if (!error && redirectData && isActive) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [error, redirectData, isActive]);

  if (error) {
    return (
      <main className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-50">
        <div className={`max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-100 p-8 flex flex-col items-center text-center transition-all duration-500 transform ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <img src="/assets/img/favicon.png" alt="Luverse" className="w-[72px] h-[72px] mb-6 drop-shadow-sm transition-transform duration-300 hover:scale-105" />
          <h1 className="text-xl font-bold text-slate-800 mb-2 leading-tight break-keep">{error}</h1>
          <p className="text-slate-500 text-sm font-medium mb-8">
            입력하신 주소를 다시 확인해주세요.
          </p>
          <div className="mt-2 text-xs text-slate-400 font-medium">
            <p>© 2026 Luverse, All rights reserved</p>
          </div>
        </div>
      </main>
    );
  }

  if (!isActive) {
    return (
      <main className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-50">
        <div className={`max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-100 p-8 flex flex-col items-center text-center transition-all duration-500 transform ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <img src="/assets/img/favicon.png" alt="Luverse" className="w-[72px] h-[72px] mb-6 drop-shadow-sm transition-transform duration-300 hover:scale-105" />
          <h1 className="text-xl font-bold text-slate-800 mb-2 leading-tight">사용할 수 없는 링크입니다</h1>
          <p className="text-slate-500 text-sm font-medium mb-8 break-keep">
            이 단축 URL은 현재 비활성화되어 접근할 수 없습니다.
          </p>
          <div className="mt-2 text-xs text-slate-400 font-medium">
            <p>© 2026 Luverse, All rights reserved</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-50">
      <div className={`relative max-w-md w-full rounded-[28px] p-[3px] shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-700 transform overflow-hidden ${isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'}`}>
        
        {/* Animated spinning gradient background for the border */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] bg-[conic-gradient(from_0deg,#3b82f6,#ec4899,#eab308,#14b8a6,#f97316,#3b82f6)] animate-[spin_3s_linear_infinite]"></div>

        {/* Inner white card */}
        <div className="relative bg-white w-full rounded-[25px] px-8 py-10 flex flex-col items-center text-center z-10">
          
          <img src="/assets/img/favicon.png" alt="Luverse" className="w-[72px] h-[72px] mb-6 drop-shadow-sm transition-transform duration-300 hover:scale-105" />

          <h1 className="text-[22px] font-bold text-slate-900 mb-8 tracking-tight break-keep">
            원하시는 페이지로 이동하고 있어요
          </h1>
          
          <div className="w-full bg-slate-100 rounded-full px-6 py-4 mb-10 overflow-hidden flex items-center justify-center shadow-inner">
            <p className="text-base font-semibold text-slate-500 truncate" title={redirectData.url}>
              {redirectData.url}
            </p>
          </div>

          <div className="text-xs text-slate-400 font-medium">
            <p>© 2026 Luverse, All rights reserved</p>
          </div>
        </div>
      </div>
    </main>
  );
}

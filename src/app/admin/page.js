'use client';
import React, { useState, useEffect } from 'react';
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth, db } from '../../firebaseConfig';
import { collection, addDoc, getDocs, deleteDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import Modal from '../../components/Modal';

export default function AdminPage() {
  const [user, setUser] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [redirects, setRedirects] = useState([]);
  const [newSlug, setNewSlug] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingRedirect, setEditingRedirect] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setUser(user);
        const isAllowed = await checkAuthorization(user.email);
        setIsAuthorized(isAllowed);
        setIsLoading(false);
        if (isAllowed) {
          fetchRedirects();
        }
      } else {
        setUser(null);
        setIsAuthorized(false);
        setIsLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const checkAuthorization = async (email) => {
    try {
      const idTokenResult = await auth.currentUser.getIdTokenResult();
      if (idTokenResult.claims.admin) return true;

      const settingsRef = doc(db, 'settings', 'allowedEmails');
      const settingsSnap = await getDoc(settingsRef);
      if (settingsSnap.exists()) {
        const allowedEmails = settingsSnap.data().emails;
        return allowedEmails.includes(email);
      } else {
        return false;
      }
    } catch (error) {
      console.error('Authorization check failed:', error);
      return false;
    }
  };

  const signIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('로그인 실패:', error);
      showNotification('로그인에 실패했습니다.', 'error');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('로그아웃 실패:', error);
      showNotification('로그아웃에 실패했습니다.', 'error');
    }
  };

  const fetchRedirects = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'redirects'));
      const redirectsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRedirects(redirectsList);
    } catch (error) {
      console.error('리다이렉트 목록 불러오기 실패:', error);
      showNotification('목록을 불러오는데 실패했습니다.', 'error');
    }
  };

  const validateSlugAndUrl = (slug, url) => {
    const slugPattern = /^[a-zA-Z0-9-_]+$/;
    const urlPattern = /^(https?:\/\/[^\s$.?#].[^\s]*)$/;

    if (!slugPattern.test(slug)) {
      showNotification('슬러그는 알파벳, 숫자, 하이픈, 언더스코어만 포함할 수 있습니다.', 'error');
      return false;
    }
    if (!urlPattern.test(url)) {
      showNotification('유효한 URL을 입력하세요.', 'error');
      return false;
    }
    return true;
  };

  const addRedirect = async (e) => {
    e.preventDefault();
    if (!validateSlugAndUrl(newSlug, newUrl)) return;

    try {
      const isSlugTaken = redirects.some(redirect => redirect.slug === newSlug);
      if (isSlugTaken) {
        showNotification('이미 사용 중인 슬러그입니다.', 'error');
        return;
      }

      await addDoc(collection(db, 'redirects'), {
        slug: newSlug,
        url: newUrl,
        active: true
      });
      setNewSlug('');
      setNewUrl('');
      fetchRedirects();
      showNotification('새 URL이 추가되었습니다.', 'success');
    } catch (error) {
      showNotification('추가에 실패했습니다.', 'error');
    }
  };

  const openEditModal = (redirect) => {
    setEditingRedirect({
      ...redirect,
      active: redirect.active !== undefined ? redirect.active : true
    });
    setIsEditing(true);
  };

  const closeEditModal = () => {
    setIsEditing(false);
    setEditingRedirect(null);
  };

  const updateRedirect = async (e) => {
    e.preventDefault();
    if (!validateSlugAndUrl(editingRedirect.slug, editingRedirect.url)) return;

    try {
      const slugExists = redirects.some(r => r.slug === editingRedirect.slug && r.id !== editingRedirect.id);
      if (slugExists) {
        showNotification('이미 사용 중인 슬러그입니다.', 'error');
        return;
      }

      await updateDoc(doc(db, 'redirects', editingRedirect.id), {
        slug: editingRedirect.slug,
        url: editingRedirect.url,
        active: editingRedirect.active
      });

      closeEditModal();
      fetchRedirects();
      showNotification('수정되었습니다.', 'success');
    } catch (error) {
      showNotification('수정에 실패했습니다.', 'error');
    }
  };

  const toggleRedirectActive = async (id, currentActive) => {
    try {
      await updateDoc(doc(db, 'redirects', id), { active: !currentActive });
      fetchRedirects();
      showNotification(
        !currentActive ? '활성화되었습니다.' : '비활성화되었습니다.',
        'success'
      );
    } catch (error) {
      showNotification('상태 변경에 실패했습니다.', 'error');
    }
  };

  const deleteRedirect = async () => {
    if (!deleteModal.id) return;
    try {
      await deleteDoc(doc(db, 'redirects', deleteModal.id));
      fetchRedirects();
      showNotification('삭제되었습니다.', 'success');
    } catch (error) {
      showNotification('삭제에 실패했습니다.', 'error');
    } finally {
      setDeleteModal({ isOpen: false, id: null });
    }
  };

  const openDeleteModal = (id) => {
    setDeleteModal({ isOpen: true, id });
  };

  const showNotification = (message, type) => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: '' });
    }, 3000);
  };

  const filteredRedirects = redirects.filter(redirect =>
    redirect.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
    redirect.url.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openRedirectUrl = (slug) => {
    const redirectUrl = `${window.location.origin}/${slug}`;
    window.open(redirectUrl, '_blank');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-500">
        <svg className="animate-spin h-10 w-10 text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="font-medium text-lg tracking-tight">로딩 중...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 max-w-md w-full p-8 md:p-10 text-center">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2 tracking-tight">관리자 로그인</h1>
          <p className="text-slate-500 mb-8 font-medium">단축 URL 관리를 위해 로그인해주세요.</p>

          <button
            onClick={signIn}
            className="w-full bg-white border border-slate-200 text-slate-700 py-3.5 px-4 rounded-xl font-semibold hover:bg-slate-50 active:bg-slate-100 transition-colors flex items-center justify-center gap-3 shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
            Google 계정으로 계속하기
          </button>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 max-w-md w-full p-8 md:p-10 text-center">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">접근 권한이 없습니다</h2>
          <p className="text-slate-500 mb-4 font-medium text-sm leading-relaxed">이 시스템에 접근하려면 관리자 권한이 필요합니다.</p>
          <div className="bg-slate-50 p-3 rounded-lg text-slate-700 font-medium text-sm mb-6 truncate">{user.email}</div>

          <button
            onClick={handleSignOut}
            className="w-full bg-slate-800 text-white py-3.5 px-4 rounded-xl font-semibold hover:bg-slate-700 transition-colors"
          >
            다른 계정으로 로그인
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">URL 링크 관리</h1>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-slate-500 hidden sm:block">{user.email}</span>
            <button
              onClick={handleSignOut}
              className="text-sm font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          <div className="lg:col-span-4">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sticky top-24">
              <h2 className="text-lg font-bold text-slate-800 mb-5 tracking-tight">새 URL 만들기</h2>

              <form onSubmit={addRedirect} className="space-y-4">
                <div>
                  <label htmlFor="newSlug" className="block text-sm font-semibold text-slate-700 mb-1.5">단축 단어 (슬러그)</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-slate-400 font-medium">/</span>
                    </div>
                    <input
                      id="newSlug"
                      type="text"
                      value={newSlug}
                      onChange={(e) => setNewSlug(e.target.value)}
                      placeholder="example"
                      required
                      className="block w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="newUrl" className="block text-sm font-semibold text-slate-700 mb-1.5">연결할 목적지 URL</label>
                  <input
                    id="newUrl"
                    type="url"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder="https://example.com"
                    required
                    className="block w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full bg-blue-600 text-white font-semibold py-3 px-4 rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm flex items-center justify-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    URL 생성
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="lg:col-span-8">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full lg:min-h-[600px]">
              <div className="p-6 border-b border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h2 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
                    URL 목록
                    <span className="bg-slate-100 text-slate-600 text-xs py-1 px-2.5 rounded-full font-semibold">{redirects.length}</span>
                  </h2>

                  <div className="relative w-full sm:w-64">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-4 w-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="슬러그 또는 URL 검색..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="block w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-slate-400 transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2">
                {filteredRedirects.length > 0 ? (
                  <ul className="space-y-1">
                    {filteredRedirects.map((redirect) => (
                      <li
                        key={redirect.id}
                        className={`group rounded-xl p-3 sm:p-4 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-transparent hover:border-slate-100 ${redirect.active === false ? 'opacity-60 bg-slate-50/50' : ''
                          }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-slate-400 font-medium text-sm">/</span>
                            <span className="text-slate-900 font-bold tracking-tight truncate">
                              {redirect.slug}
                            </span>
                            {redirect.active === false && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-200 text-slate-600">
                                정지됨
                              </span>
                            )}
                          </div>
                          <p className="text-slate-500 text-sm font-medium truncate group-hover:text-slate-700 transition-colors">
                            {redirect.url}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0 bg-white sm:bg-transparent rounded-lg border sm:border-none border-slate-200 p-1 sm:p-0 shadow-sm sm:shadow-none">
                          <button
                            onClick={() => openRedirectUrl(redirect.slug)}
                            title="새 탭에서 열기"
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </button>

                          <button
                            onClick={() => toggleRedirectActive(redirect.id, redirect.active !== false)}
                            title={redirect.active !== false ? '비활성화' : '활성화'}
                            className={`p-2 rounded-lg transition-colors ${redirect.active !== false
                                ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                                : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                              }`}
                          >
                            {redirect.active !== false ? (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                          </button>

                          <button
                            onClick={() => openEditModal(redirect)}
                            title="수정"
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>

                          <button
                            onClick={() => openDeleteModal(redirect.id)}
                            title="삭제"
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 px-4 text-center h-full">
                    <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    </div>
                    <p className="text-slate-800 font-bold mb-1">
                      {searchTerm ? '검색 결과가 없습니다' : '아직 생성된 URL이 없습니다'}
                    </p>
                    <p className="text-slate-500 text-sm font-medium">
                      {searchTerm ? '다른 검색어를 입력해보세요.' : '왼쪽에서 첫 번째 URL을 만들어보세요.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Edit Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={closeEditModal}></div>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full relative z-10 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">URL 수정</h3>
              <button onClick={closeEditModal} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            <form onSubmit={updateRedirect} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">단축 단어 (슬러그)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-slate-400 font-medium">/</span>
                  </div>
                  <input
                    type="text"
                    value={editingRedirect?.slug || ''}
                    onChange={(e) => setEditingRedirect({ ...editingRedirect, slug: e.target.value })}
                    required
                    className="block w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">대상 URL</label>
                <input
                  type="url"
                  value={editingRedirect?.url || ''}
                  onChange={(e) => setEditingRedirect({ ...editingRedirect, url: e.target.value })}
                  required
                  className="block w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={editingRedirect?.active !== false}
                      onChange={(e) => setEditingRedirect({ ...editingRedirect, active: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </div>
                  <span className="ml-3 text-sm font-medium text-slate-700">활성화 상태 (클릭 시 사용 가능)</span>
                </label>
              </div>

              <div className="pt-6 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="px-4 py-2 text-slate-600 font-medium bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-white font-medium bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  저장하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {notification.show && (
        <div className="fixed bottom-6 right-6 z-50 animate-[modalFadeIn_0.2s_ease-out]">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border ${notification.type === 'error'
              ? 'bg-red-50 border-red-100 text-red-800'
              : 'bg-slate-800 border-slate-700 text-white'
            }`}>
            {notification.type === 'error' ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
            <span className="font-medium text-sm">{notification.message}</span>
          </div>
        </div>
      )}

      <Modal
        isOpen={deleteModal.isOpen}
        title="단축 URL 삭제"
        description="정말 이 URL을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
        confirmText="삭제하기"
        cancelText="취소"
        type="danger"
        onConfirm={deleteRedirect}
        onCancel={() => setDeleteModal({ isOpen: false, id: null })}
      />
    </div>
  );
}

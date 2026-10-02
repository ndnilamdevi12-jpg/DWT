import React, { useState, useEffect } from 'react';
import {
  Menu,
  X,
  ShoppingBag,
  LogIn,
  LogOut,
  ShieldCheck,
  ExternalLink,
  Edit3,
  Check,
  User as UserIcon,
} from 'lucide-react';
import { PageRoute, SiteSettings, SocialLinkItem } from '../types';
import { DwtLogo } from './DwtLogo';

interface HeaderProps {
  settings: SiteSettings;
  currentRoute: PageRoute;
  onNavigate: (route: PageRoute) => void;
  socialLinks: SocialLinkItem[];
  userEmail: string | null;
  userDisplayName: string;
  userPhotoUrl: string | null;
  isAdmin: boolean;
  authLoading: boolean;
  showGoogleAccountPicker: boolean;
  onLogin: () => void;
  onDirectGoogleSignIn: (email: string, name?: string) => Promise<void>;
  onCloseGooglePicker: () => void;
  onLogout: () => void;
  onUpdateDisplayName: (newName: string) => Promise<void>;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  currentRoute,
  onNavigate,
  socialLinks,
  userEmail,
  userDisplayName,
  userPhotoUrl,
  isAdmin,
  authLoading,
  showGoogleAccountPicker,
  onLogin,
  onDirectGoogleSignIn,
  onCloseGooglePicker,
  onLogout,
  onUpdateDisplayName,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileExpanded, setProfileExpanded] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(userDisplayName);
  const [savingName, setSavingName] = useState(false);
  const [nameSavedMsg, setNameSavedMsg] = useState(false);

  // Custom Google account input inside Menu picker
  const [useCustomAccount, setUseCustomAccount] = useState(false);
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');

  useEffect(() => {
    setNameInput(userDisplayName);
  }, [userDisplayName]);

  const navItems: { label: string; route: PageRoute; active: boolean }[] = [
    { label: 'Home', route: { page: 'home' }, active: currentRoute.page === 'home' },
    { label: 'More Videos', route: { page: 'videos' }, active: currentRoute.page === 'videos' },
    {
      label: 'Explain',
      route: { page: 'explain' },
      active: currentRoute.page === 'explain' || currentRoute.page === 'article',
    },
    { label: 'Shopping', route: { page: 'shopping' }, active: currentRoute.page === 'shopping' },
    {
      label: 'About',
      route: { page: 'about' },
      active: currentRoute.page === 'about' || currentRoute.page === 'disclaimer',
    },
  ];

  const handleNav = (route: PageRoute) => {
    onNavigate(route);
    setMenuOpen(false);
  };

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = nameInput.trim().slice(0, 80);
    if (!cleaned) return;
    setSavingName(true);
    try {
      await onUpdateDisplayName(cleaned);
      setEditingName(false);
      setNameSavedMsg(true);
      window.setTimeout(() => setNameSavedMsg(false), 2500);
    } finally {
      setSavingName(false);
    }
  };

  const handleCustomAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = customEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) return;
    await onDirectGoogleSignIn(
      cleanEmail,
      customName.trim() || cleanEmail.split('@')[0] || 'Google User'
    );
    setUseCustomAccount(false);
    setCustomEmail('');
    setCustomName('');
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-gradient-to-r from-[#FF6B00] via-[#F97316] to-[#EA580C] text-white shadow-[0_4px_20px_rgba(234,88,12,0.18)] border-b border-white/15">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Zone 1: Brand Title (Single line with DWT Logo) */}
          <button
            type="button"
            onClick={() => handleNav({ page: 'home' })}
            className="flex items-center gap-3 text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 rounded-xl py-1 cursor-pointer"
          >
            <DwtLogo
              svgMarkup={settings.logo_svg}
              className="w-10 h-10 rounded-xl shadow-xs transition-transform duration-150 group-hover:scale-105"
            />
            <span className="text-lg sm:text-xl font-bold tracking-tight text-white font-display whitespace-nowrap">
              {settings.brand_name || 'DecodeWithTech'}
            </span>
          </button>

          {/* Zone 2: Clean Desktop Navigation Links */}
          <nav
            className="hidden md:flex items-center gap-7 text-sm font-medium text-white/90"
            aria-label="Primary Navigation"
          >
            {navItems.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => handleNav(item.route)}
                className={`relative py-1 transition-colors whitespace-nowrap shrink-0 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 rounded cursor-pointer ${
                  item.active ? 'text-white font-semibold' : 'text-white/85'
                }`}
              >
                {item.label}
                {item.active && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-yellow-300 rounded-full" />
                )}
              </button>
            ))}
          </nav>

          {/* Zone 3: Shopping Button + Menu Icon */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => handleNav({ page: 'shopping' })}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
                currentRoute.page === 'shopping'
                  ? 'bg-neutral-950 text-yellow-300 shadow-sm'
                  : 'bg-white text-neutral-950 hover:bg-yellow-50 shadow-xs'
              }`}
              aria-label="Shopping"
            >
              <ShoppingBag className="w-4 h-4 text-[#EA580C]" />
              <span>Shop</span>
            </button>

            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-black/15 hover:bg-black/25 text-white transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Slide-in Navigation & Profile Menu Drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="fixed inset-0 bg-black/35 backdrop-blur-[2px] transition-opacity"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />

          <aside
            className="relative z-10 w-full max-w-xs bg-white text-neutral-950 h-full shadow-2xl border-l border-orange-100 flex flex-col justify-between overflow-y-auto"
            aria-label="Site Menu"
          >
            <div>
              {/* Drawer Top Bar */}
              <div className="px-5 py-4 bg-gradient-to-r from-[#FF6B00] to-[#EA580C] text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <DwtLogo svgMarkup={settings.logo_svg} className="w-8 h-8" />
                  <span className="font-bold font-display text-base tracking-tight">
                    {settings.brand_name || 'DecodeWithTech'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  className="w-9 h-9 rounded-lg bg-black/15 hover:bg-black/25 flex items-center justify-center text-white cursor-pointer"
                  aria-label="Close Menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* ========================================================= */}
              {/* GOOGLE LOGIN & PROFILE SECTION (STRICTLY INSIDE MENU)     */}
              {/* ========================================================= */}
              <div className="p-4 border-b border-orange-100 bg-orange-50/40">
                {userEmail ? (
                  <div className="rounded-2xl bg-white border border-orange-200/80 p-3.5 shadow-2xs">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {userPhotoUrl ? (
                          <img
                            src={userPhotoUrl}
                            alt={userDisplayName}
                            referrerPolicy="no-referrer"
                            className="w-10 h-10 rounded-full object-cover border border-orange-300 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF6B00] to-[#EA580C] text-white flex items-center justify-center shrink-0 font-bold text-sm shadow-2xs">
                            {(userDisplayName || userEmail || 'U').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-neutral-950 truncate">
                              {userDisplayName || 'Google User'}
                            </p>
                            {isAdmin && (
                              <span className="px-1.5 py-0.5 rounded bg-orange-100 text-[#EA580C] text-[9px] font-bold shrink-0">
                                ADMIN
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-neutral-500 truncate">{userEmail}</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setProfileExpanded((prev) => !prev);
                          setEditingName(false);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-[#EA580C] text-[11px] font-semibold transition-colors cursor-pointer shrink-0"
                      >
                        {profileExpanded ? 'Hide' : 'Profile'}
                      </button>
                    </div>

                    {/* Profile Section inside Menu — ONLY Name Edit Option */}
                    {profileExpanded && (
                      <div className="mt-3.5 pt-3.5 border-t border-neutral-100 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-neutral-600 flex items-center gap-1">
                            <UserIcon className="w-3.5 h-3.5 text-[#FF6B00]" />
                            <span>My Profile</span>
                          </span>
                          {!editingName && (
                            <button
                              type="button"
                              onClick={() => {
                                setNameInput(userDisplayName);
                                setEditingName(true);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-50 hover:bg-orange-100 text-[11px] font-semibold text-[#EA580C] transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Edit Name</span>
                            </button>
                          )}
                        </div>

                        {editingName ? (
                          <form onSubmit={handleSaveName} className="space-y-2">
                            <label className="block text-[11px] font-semibold text-neutral-700">
                              Your Name
                            </label>
                            <input
                              type="text"
                              value={nameInput}
                              onChange={(e) => setNameInput(e.target.value)}
                              maxLength={80}
                              placeholder="Enter your name"
                              className="w-full px-3 py-2 rounded-xl border border-orange-300 text-xs text-neutral-900 focus:outline-none focus:border-[#FF6B00]"
                              autoFocus
                            />
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingName(false);
                                  setNameInput(userDisplayName);
                                }}
                                className="px-2.5 py-1.5 rounded-lg border border-neutral-200 text-[11px] font-semibold text-neutral-600 hover:bg-neutral-50 cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                disabled={savingName || !nameInput.trim()}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#FF6B00] hover:bg-[#EA580C] text-white text-[11px] font-semibold cursor-pointer disabled:opacity-50"
                              >
                                <Check className="w-3 h-3" />
                                <span>{savingName ? 'Saving...' : 'Save Name'}</span>
                              </button>
                            </div>
                          </form>
                        ) : (
                          <div className="px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200/70 flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-[10px] text-neutral-400">Display Name</p>
                              <p className="text-xs font-semibold text-neutral-900 truncate">
                                {userDisplayName || 'Google User'}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setNameInput(userDisplayName);
                                setEditingName(true);
                              }}
                              className="text-neutral-400 hover:text-[#EA580C] p-1 cursor-pointer"
                              aria-label="Edit Name"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        {nameSavedMsg && (
                          <p className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            <span>Profile name updated!</span>
                          </p>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            onLogout();
                            setMenuOpen(false);
                          }}
                          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 transition-colors cursor-pointer"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-2xl bg-white border border-orange-200/80 p-4 shadow-2xs space-y-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-orange-100 text-[#EA580C] flex items-center justify-center shrink-0 font-bold text-sm">
                        G
                      </div>
                      <div>
                        <p className="text-xs font-bold text-neutral-950">Sign in with Google</p>
                        <p className="text-[11px] text-neutral-500">
                          Access your profile & channel controls
                        </p>
                      </div>
                    </div>

                    {!showGoogleAccountPicker ? (
                      <button
                        type="button"
                        disabled={authLoading}
                        onClick={onLogin}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#FF6B00] hover:bg-[#EA580C] shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        <span>
                          {authLoading ? 'Connecting Google...' : 'Continue with Google'}
                        </span>
                      </button>
                    ) : (
                      <div className="pt-2 border-t border-neutral-100 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-neutral-700">
                            Choose a Google Account
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              onCloseGooglePicker();
                              setUseCustomAccount(false);
                            }}
                            className="text-[11px] text-neutral-400 hover:text-neutral-700 cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>

                        {/* Verified Owner / Admin Google Account Option */}
                        <button
                          type="button"
                          onClick={() =>
                            onDirectGoogleSignIn('ndnilamdevi12@gmail.com', 'DecodeWithTech Admin')
                          }
                          className="w-full flex items-center gap-2.5 p-2.5 rounded-xl border border-orange-200 bg-orange-50/50 hover:bg-orange-100/70 text-left transition-colors cursor-pointer"
                        >
                          <div className="w-8 h-8 rounded-full bg-[#FF6B00] text-white flex items-center justify-center font-bold text-xs shrink-0">
                            N
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-neutral-950 truncate">
                              DecodeWithTech Admin
                            </p>
                            <p className="text-[11px] text-neutral-600 truncate">
                              ndnilamdevi12@gmail.com
                            </p>
                          </div>
                        </button>

                        {!useCustomAccount ? (
                          <button
                            type="button"
                            onClick={() => setUseCustomAccount(true)}
                            className="w-full py-2 px-3 rounded-xl border border-neutral-200 hover:bg-neutral-50 text-[11px] font-semibold text-neutral-700 transition-colors cursor-pointer"
                          >
                            Use another Google Account
                          </button>
                        ) : (
                          <form onSubmit={handleCustomAccountSubmit} className="space-y-2 pt-1">
                            <input
                              type="email"
                              required
                              value={customEmail}
                              onChange={(e) => setCustomEmail(e.target.value)}
                              placeholder="yourname@gmail.com"
                              className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-[#FF6B00]"
                            />
                            <input
                              type="text"
                              value={customName}
                              onChange={(e) => setCustomName(e.target.value)}
                              placeholder="Your Name (optional)"
                              maxLength={80}
                              className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs text-neutral-900 focus:outline-none focus:border-[#FF6B00]"
                            />
                            <button
                              type="submit"
                              className="w-full py-2 px-3 rounded-xl bg-[#FF6B00] hover:bg-[#EA580C] text-white text-xs font-semibold cursor-pointer"
                            >
                              Continue with Google
                            </button>
                          </form>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Primary 5 Menu Sections (PRD Section 11) */}
              <nav className="p-4 space-y-1.5" aria-label="Menu Sections">
                {navItems.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => handleNav(item.route)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left text-sm font-semibold transition-colors cursor-pointer ${
                      item.active
                        ? 'bg-orange-50 text-[#EA580C] border border-orange-200/80'
                        : 'text-neutral-800 hover:bg-neutral-50'
                    }`}
                  >
                    <span>{item.label}</span>
                    {item.active && <span className="w-2 h-2 rounded-full bg-[#FF6B00]" />}
                  </button>
                ))}

                {/* Admin Panel Option — strictly visible ONLY when authorized Admin (ndnilamdevi12@gmail.com) is logged in */}
                {isAdmin && (
                  <div className="pt-3 mt-3 border-t border-neutral-100">
                    <button
                      type="button"
                      onClick={() => handleNav({ page: 'admin' })}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left text-sm font-bold transition-colors cursor-pointer ${
                        currentRoute.page === 'admin'
                          ? 'bg-[#FF6B00] text-white shadow-xs'
                          : 'bg-orange-500/10 text-[#EA580C] hover:bg-orange-500/20 border border-orange-300/60'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4" />
                        <span>ADMIN PANEL</span>
                      </span>
                      <span className="text-xs font-mono-num">CMS</span>
                    </button>
                  </div>
                )}
              </nav>

              {/* Available Social Links */}
              {socialLinks.length > 0 && (
                <div className="px-5 py-4 border-t border-neutral-100">
                  <p className="text-xs font-semibold text-neutral-400 mb-2.5">
                    Official Channels
                  </p>
                  <div className="space-y-2">
                    {socialLinks.map((social) => (
                      <a
                        key={social.id}
                        href={social.profile_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-neutral-50 hover:bg-orange-50/70 text-xs font-medium text-neutral-800 border border-neutral-200/60 transition-colors"
                      >
                        <span>
                          {social.platform} · {social.display_name}
                        </span>
                        <ExternalLink className="w-3.5 h-3.5 text-[#EA580C]" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Menu Sign Out / Quick Status */}
            {userEmail && !profileExpanded && (
              <div className="p-4 border-t border-neutral-100 bg-neutral-50/60 flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium text-neutral-500 truncate">
                  {isAdmin ? 'Admin Access Enabled' : 'Signed in via Google'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onLogout();
                    setMenuOpen(false);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-neutral-700 bg-white hover:bg-neutral-100 border border-neutral-200 transition-colors cursor-pointer shrink-0"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </aside>
        </div>
      )}
    </>
  );
};

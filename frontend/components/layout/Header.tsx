import React, { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { UserIcon, LogoIcon, MenuIcon, XIcon, ChevronDownIcon } from '../Icons';
import NotificationBell from './NotificationBell';
import AboutModal from './AboutModal';

const Header: React.FC<{ variant?: 'main' | 'auth' }> = ({ variant = 'main' }) => {
  const { user, isSuperAdmin, isAdmin, isFaculty, isUser, signOut } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Dropdown states
  const [isAdminDropdownOpen, setIsAdminDropdownOpen] = useState(false);
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  
  const adminDropdownRef = useRef<HTMLDivElement>(null);
  const accountDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (adminDropdownRef.current && !adminDropdownRef.current.contains(event.target as Node)) {
            setIsAdminDropdownOpen(false);
        }
        if (accountDropdownRef.current && !accountDropdownRef.current.contains(event.target as Node)) {
            setIsAccountDropdownOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Base styles for navigation items based on Brandkit
  const navItemClass = "font-menu text-[13.68px] font-bold text-ccad-black uppercase px-5 py-4 hover:text-ccad-red transition-all duration-200 ease-in-out hover:scale-110 cursor-pointer flex items-center h-full transform origin-center";
  const activeNavItemClass = "text-ccad-red";
  
  // Dropdown menu styles
  const dropdownContainerClass = "absolute top-full left-0 mt-0 w-64 bg-white shadow-xl border-t-2 border-ccad-red z-50 flex flex-col py-2";
  const dropdownItemClass = "font-sans text-[13px] text-ccad-text-primary hover:text-ccad-red px-6 py-3 block transition-colors border-b border-gray-100 last:border-0 text-left font-medium";

  // Mobile menu styles
  const mobileLinkClass = "block px-5 py-3 font-menu text-[13.68px] font-bold text-ccad-black uppercase hover:bg-gray-50 hover:text-ccad-red border-b border-gray-100";

  const handleProfileClick = () => {
      setIsAccountDropdownOpen(false);
      navigate('/profile');
  };

  const handleAboutClick = () => {
      setIsAccountDropdownOpen(false);
      setIsAboutModalOpen(true);
  };

  const handleLogoutClick = () => {
      setIsAccountDropdownOpen(false);
      signOut();
  };

  return (
    <>
    <header className="bg-white shadow-sm sticky top-0 z-40">
      <nav className="container mx-auto px-6">
        <div className="flex items-center justify-between h-[80px]">
          
          {/* Logo Section */}
          <Link to="/" target="_self" className="flex items-center group">
            <LogoIcon className="w-10 h-10 mr-3 text-ccad-red group-hover:opacity-90 transition-opacity" />
            <div className="flex flex-col">
                <span className="font-sans font-bold text-xl leading-none text-ccad-black tracking-tight">CCAD PIMS</span>
                <span className="font-sans text-[10px] text-ccad-text-secondary uppercase tracking-widest mt-1">UP Cebu</span>
            </div>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center h-full">
            {user && variant === 'main' ? (
              <>
                 <NavLink 
                    to="/" 
                    target="_self" 
                    className={({ isActive }) => `${navItemClass} ${isActive ? activeNavItemClass : ''}`}
                 >
                    Home
                 </NavLink>

                {/* User & Faculty Links */}
                {(isUser || isFaculty) && (
                  <>
                    <NavLink 
                        to="/catalog" 
                        target="_self" 
                        className={({ isActive }) => `${navItemClass} ${isActive ? activeNavItemClass : ''}`}
                    >
                        Catalog
                    </NavLink>
                    <NavLink 
                        to="/my-reservations" 
                        target="_self" 
                        className={({ isActive }) => `${navItemClass} ${isActive ? activeNavItemClass : ''}`}
                    >
                        My Reservations
                    </NavLink>
                  </>
                )}
                
                {/* Faculty Links */}
                {isFaculty && (
                  <NavLink 
                      to="/my-endorsements" 
                      target="_self" 
                      className={({ isActive }) => `${navItemClass} ${isActive ? activeNavItemClass : ''}`}
                  >
                      My Endorsements
                  </NavLink>
                )}

                {/* Admin Dropdown */}
                {(isSuperAdmin || isAdmin) && (
                  <div className="relative h-full flex items-center" ref={adminDropdownRef}>
                        <button 
                            onClick={() => setIsAdminDropdownOpen(!isAdminDropdownOpen)}
                            className={`${navItemClass} ${isAdminDropdownOpen ? 'text-ccad-red' : ''}`}
                        >
                            Management
                            <ChevronDownIcon className="w-3 h-3 ml-2 stroke-2" />
                        </button>
                        {isAdminDropdownOpen && (
                            <div className={dropdownContainerClass}>
                                <NavLink to="/all-requests" onClick={() => setIsAdminDropdownOpen(false)} className={dropdownItemClass}>Reservations</NavLink>
                                <NavLink to="/inventory" onClick={() => setIsAdminDropdownOpen(false)} className={dropdownItemClass}>Inventory Management</NavLink>
                                <NavLink to="/admin" onClick={() => setIsAdminDropdownOpen(false)} className={dropdownItemClass}>
                                    Areas & Administrators
                                </NavLink>
                            </div>
                        )}
                  </div>
                )}

                {/* Notifications */}
                <div className="px-2">
                    <NotificationBell />
                </div>
                
                {/* Account Dropdown - Icon based */}
                <div className="relative h-full flex items-center" ref={accountDropdownRef}>
                    <button 
                        onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
                        className={`${navItemClass} ${isAccountDropdownOpen ? 'text-ccad-red' : ''}`}
                        title="Account"
                    >
                        <UserIcon className="w-6 h-6" />
                        <ChevronDownIcon className="w-3 h-3 ml-1 stroke-2" />
                    </button>

                    {isAccountDropdownOpen && (
                        <div className={`${dropdownContainerClass} right-0 left-auto`}>
                            <div className="px-6 py-3 border-b border-gray-100 bg-gray-50">
                                <p className="text-[11px] font-bold text-ccad-text-secondary uppercase tracking-wider">Signed in as</p>
                                <p className="text-sm font-bold text-ccad-black truncate max-w-[200px]">{user.emailAddress}</p>
                            </div>
                            
                            <button onClick={handleProfileClick} className={dropdownItemClass}>
                                Profile Settings
                            </button>
                            
                            <button onClick={handleAboutClick} className={dropdownItemClass}>
                                System Guide
                            </button>

                            <button onClick={handleLogoutClick} className={`${dropdownItemClass} text-ccad-red hover:bg-red-50`}>
                                Logout
                            </button>
                        </div>
                    )}
                </div>

              </>
            ) : (
              <>
                <Link to="/login" target="_self" className={navItemClass}>Login</Link>
                <Link to="/register" target="_self" className={`${navItemClass} text-ccad-red`}>Register</Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-4">
             {user && variant === 'main' && <NotificationBell />}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-md text-ccad-black hover:text-ccad-red focus:outline-none"
              aria-controls="mobile-menu"
              aria-expanded={isMenuOpen}
            >
              <span className="sr-only">Open main menu</span>
              {isMenuOpen ? <XIcon className="block h-6 w-6" /> : <MenuIcon className="block h-6 w-6" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white absolute w-full shadow-lg z-50" id="mobile-menu">
          <div className="py-2">
            {user && variant === 'main' ? (
              <>
                 <NavLink to="/" target="_self" className={mobileLinkClass} onClick={() => setIsMenuOpen(false)}>Home</NavLink>
                
                {/* User & Faculty-specific links */}
                {(isUser || isFaculty) && (
                  <>
                    <NavLink to="/catalog" target="_self" className={mobileLinkClass} onClick={() => setIsMenuOpen(false)}>Catalog</NavLink>
                    <NavLink to="/my-reservations" target="_self" className={mobileLinkClass} onClick={() => setIsMenuOpen(false)}>My Reservations</NavLink>
                  </>
                )}

                {/* Faculty-specific links */}
                {isFaculty && (
                    <NavLink to="/my-endorsements" target="_self" className={mobileLinkClass} onClick={() => setIsMenuOpen(false)}>My Endorsements</NavLink>
                )}

                {/* Admin-specific links */}
                {(isAdmin || isSuperAdmin) && (
                  <>
                    <div className="px-5 py-2 text-[11px] font-bold text-ccad-text-secondary uppercase tracking-wider bg-gray-50">Management</div>
                    <NavLink to="/all-requests" target="_self" className={mobileLinkClass} onClick={() => setIsMenuOpen(false)}>Reservations</NavLink>
                    <NavLink to="/inventory" target="_self" className={mobileLinkClass} onClick={() => setIsMenuOpen(false)}>Inventory Management</NavLink>
                    <NavLink to="/admin" target="_self" className={mobileLinkClass} onClick={() => setIsMenuOpen(false)}>
                      Areas & Administrators
                    </NavLink>
                  </>
                )}

                {/* Common links for all logged-in users */}
                <div className="border-t-4 border-gray-100 mt-2">
                    <div className="px-5 py-2 text-[11px] font-bold text-ccad-text-secondary uppercase tracking-wider bg-gray-50">Account</div>
                    <NavLink to="/profile" target="_self" className={mobileLinkClass} onClick={() => setIsMenuOpen(false)}>Settings</NavLink>
                    <button onClick={handleAboutClick} className={`w-full text-left ${mobileLinkClass}`}>Guide</button>
                    <button onClick={() => { setIsMenuOpen(false); signOut(); }} className={`w-full text-left ${mobileLinkClass} text-ccad-red`}>Logout</button>
                </div>
              </>
            ) : (
              <>
                <Link to="/login" target="_self" className={mobileLinkClass} onClick={() => setIsMenuOpen(false)}>Login</Link>
                <Link to="/register" target="_self" className={mobileLinkClass} onClick={() => setIsMenuOpen(false)}>Register</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
    
    {isAboutModalOpen && <AboutModal onClose={() => setIsAboutModalOpen(false)} />}
    </>
  );
};

export default Header;
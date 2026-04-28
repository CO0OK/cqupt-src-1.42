import React, { useRef, useState } from 'react';
import { 
  ShieldAlert, 
  ChevronDown, 
  Sun, 
  Moon, 
  LogOut, 
  User as UserIcon, 
  Coins,
  Home,
  ClipboardCheck,
  Database,
  Award,
  ShoppingBag,
  Users,
  Megaphone,
  FileText,
  ShieldPlus,
  Trophy,
  Bell,
  BookOpen
} from 'lucide-react';
import { User, NavItem } from '../types';
import { NAV_ITEMS } from '../constants';
import logoImg from '../CQUPT/CQUPT_01_logo_8.png';

interface NavbarProps {
  user: User;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const iconMap: Record<string, any> = {
  Home, ClipboardCheck, Database, Award, ShoppingBag, Users, Megaphone, FileText, ShieldPlus, Trophy, Bell, BookOpen
};

export default function Navbar({ user, activeTab, setActiveTab, onLogout, isDarkMode, toggleTheme }: NavbarProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);
  const filteredNav = NAV_ITEMS.filter(item => item.roles.includes(user.role));

  const handleNavWheel = (e: React.WheelEvent<HTMLElement>) => {
    const container = navRef.current;
    if (!container) return;
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
    container.scrollLeft += e.deltaY;
    e.preventDefault();
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex shrink-0 items-center gap-2 cursor-pointer" onClick={() => setActiveTab('home')}>
          <img src={logoImg} alt="Logo" className="w-45 h-12" />
        </div>

        <nav
          ref={navRef}
          onWheel={handleNavWheel}
          className="hidden lg:flex flex-1 min-w-0 mx-4 items-center gap-1 overflow-x-auto whitespace-nowrap scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {filteredNav.map(item => {
            const Icon = iconMap[item.icon] || Home;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive 
                    ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20' 
                    : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-4">
          {user.role === 'user' && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
              <Coins className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-bold dark:text-white">{user.points.toLocaleString()}</span>
            </div>
          )}

          <button 
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-all duration-300 text-gray-600 dark:text-slate-400 group"
          >
            {isDarkMode ? (
              <Sun className="w-5 h-5 text-amber-400 group-hover:rotate-45 transition-transform" />
            ) : (
              <Moon className="w-5 h-5 group-hover:-rotate-12 transition-transform" />
            )}
          </button>

          <div className="relative">
            <button 
              onMouseEnter={() => setShowDropdown(true)}
              className="flex items-center gap-2 p-1 rounded-full border border-gray-200 dark:border-slate-800 hover:ring-2 hover:ring-primary-500/20 transition-all"
            >
              <img 
                src={user.avatar || `https://ui-avatars.com/api/?name=${user.username}&background=random`} 
                className="w-8 h-8 rounded-full" 
                alt="Avatar" 
              />
              <div className="hidden md:block text-left px-1">
                <p className="text-xs font-semibold dark:text-white">{user.username}</p>
                <p className="text-[10px] text-gray-500 dark:text-slate-400 uppercase">{user.role}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>

            {showDropdown && (
              <div 
                onMouseLeave={() => setShowDropdown(false)}
                className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden animate-fade-in"
              >
                <div className="py-1">
                  <button 
                    onClick={() => setActiveTab('profile_center')}
                    className="flex items-center gap-2 px-4 py-2 text-sm w-full text-left hover:bg-gray-50 dark:hover:bg-slate-800 dark:text-white text-gray-700"
                  >
                    <UserIcon className="w-4 h-4" /> 个人中心
                  </button>
                  <hr className="border-gray-100 dark:border-slate-800" />
                  <button 
                    onClick={onLogout}
                    className="flex items-center gap-2 px-4 py-2 text-sm w-full text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <LogOut className="w-4 h-4" /> 退出登录
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

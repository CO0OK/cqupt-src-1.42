/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, UserRole } from './types';
import Login from './views/Login';
import Register from './views/Register';
import Dashboard from './views/Dashboard';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const handleLogin = (userData: User) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    fetch('/api/logout', { method: 'POST' }).catch(() => undefined);
    setUser(null);
    localStorage.removeItem('user');
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  useEffect(() => {
    const bootstrapSession = async () => {
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }

      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          setUser(null);
          localStorage.removeItem('user');
          return;
        }
        const data = await res.json();
        if (data.success) {
          setUser(data.user);
          localStorage.setItem('user', JSON.stringify(data.user));
        }
      } catch {
        // Keep local user if network is temporarily unavailable.
      }
    };

    bootstrapSession();
  }, []);

  if (!user) {
    return isRegistering ? (
      <Register 
        onSwitchToLogin={() => setIsRegistering(false)} 
        isDarkMode={isDarkMode}
        toggleTheme={() => setIsDarkMode(!isDarkMode)}
      />
    ) : (
      <Login 
        onLogin={handleLogin} 
        onSwitchToRegister={() => setIsRegistering(true)}
        isDarkMode={isDarkMode}
        toggleTheme={() => setIsDarkMode(!isDarkMode)}
      />
    );
  }

  return (
    <Dashboard 
      user={user} 
      onLogout={handleLogout} 
      onUpdateUser={handleUpdateUser}
      isDarkMode={isDarkMode}
      toggleTheme={() => setIsDarkMode(!isDarkMode)}
    />
  );
}

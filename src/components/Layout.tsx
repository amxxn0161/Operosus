import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import { useAuth } from '../contexts/AuthContext';

const Layout: React.FC = () => {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';
  const { isAuthenticated } = useAuth();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  
  // Update userEmail whenever auth changes
  useEffect(() => {
    if (isAuthenticated) {
      const email = localStorage.getItem('userEmail');
      setUserEmail(email);
    } else {
      setUserEmail(null);
    }
  }, [isAuthenticated]);
  
  return (
    <>
      {!isLoginPage && <Header key={`header-${userEmail || 'guest'}`} />}
      <main>
        <Outlet />
      </main>
    </>
  );
};

export default Layout; 
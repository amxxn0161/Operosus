import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';

const Layout: React.FC = () => {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';
  
  return (
    <>
      {!isLoginPage && <Header />}
      <main>
        <Outlet />
      </main>
    </>
  );
};

export default Layout; 
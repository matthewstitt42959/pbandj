// DashboardLayout.jsx
import React from 'react';
import Navbar from './Navbar';

/*
  DEV NOTE:
  This layout component wraps core pages like Home, Characters, and Journal.
  It ensures consistent layout (e.g. navbar, padding) across all pages.
  Responsive-first. Designed with mobile in mind.
*/

const DashboardLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-slate-100">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;
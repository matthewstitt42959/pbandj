// HomePage.jsx
import React from 'react';
import DashboardLayout from '../components/DashboardLayout';
import Dashboard from '../components/Dashboard';

const HomePage = () => {
  return (
    <DashboardLayout>
      <Dashboard />
    </DashboardLayout>
  );
};

export default HomePage;
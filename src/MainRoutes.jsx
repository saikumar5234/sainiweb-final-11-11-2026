import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import TableView from './TableView.jsx';
import PriceAnalytics from './PriceAnalytics.jsx';
import UserManagement from './UserManagement.jsx';
import Profile from './Profile.jsx';
import SuperAdminDashboard from './SuperAdminDashboard.jsx';

function MainRoutes({ user }) {
  return (
    <Routes>
      <Route path="/" element={<TableView user={user} />} />
      <Route path="/analytics/:productId?" element={<PriceAnalytics />} />
      <Route path="/users" element={<UserManagement />} />
      <Route path="/profile" element={<Profile user={user} />} />
      <Route 
        path="/super-admin" 
        element={
          user?.isSuperAdmin || user?.user?.isSuperAdmin ? (
            <SuperAdminDashboard />
          ) : (
            <Navigate to="/" replace />
          )
        } 
      />
    </Routes>
  );
}

export default MainRoutes; 
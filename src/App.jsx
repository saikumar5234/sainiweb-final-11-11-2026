import React, { useState, useEffect } from 'react';
import MainLayout from './MainLayout.jsx';
import MainRoutes from './MainRoutes.jsx';
import AdminSignup from './AdminSignup.jsx';
import AdminLogin from './AdminLogin.jsx';
import OTPVerification from './OTPVerification.jsx';

function App() {
  const [user, setUser] = useState(null);
  const [showAdminSignup, setShowAdminSignup] = useState(false);
  const [otpData, setOtpData] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleAdminLoginSuccess = (user) => {
    setUser(user);
    setShowAdminSignup(false);
    setOtpData(null);
  };

  const handleAdminSignupSuccess = (data) => {
    // Admin signup is just a request, so we don't log them in
    // Just show success message and return to login
    setShowAdminSignup(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    setUser(null);
    setOtpData(null);
    setShowAdminSignup(false);
  };

  const handleShowOTP = (data) => {
    setOtpData(data);
  };

  const handleOTPVerifySuccess = (data) => {
    // After OTP verification, save user data and proceed
    if (otpData) {
      // Merge the OTP verification response with the original userData
      const userEmail = data.email || otpData.userData?.email || otpData.email;
      const userName = data.username || otpData.userData?.username || data.name || otpData.userData?.name || userEmail;
      const userDataToSave = {
        success: true,
        token: data.token,
        user: {
          ...(otpData.userData?.user || {}),
          ...(data.user || {}),
          username: userName,
          name: userName,
          email: userEmail,
          isAdmin: true
        },
        username: userName,
        name: userName,
        email: userEmail,
        role: data.role || 'ADMIN',
        isAdmin: true
      };
      
      localStorage.setItem('currentUser', JSON.stringify(userDataToSave));
      setUser(userDataToSave);
      setOtpData(null);
      setShowAdminSignup(false);
    }
  };

  const handleOTPCancel = () => {
    setOtpData(null);
    // Always go back to admin login
    setShowAdminSignup(false);
  };

  if (!user) {
    // Show OTP verification if needed
    if (otpData) {
      return (
        <OTPVerification
          mobile={otpData.mobile || otpData.phone}
          userId={otpData.userId}
          onVerifySuccess={handleOTPVerifySuccess}
          onCancel={handleOTPCancel}
          isAdminLogin={otpData.isAdminLogin}
          userData={otpData.userData}
          email={otpData.email}
        />
      );
    }

    // Show admin signup or admin login by default
    return showAdminSignup ? (
      <AdminSignup
        onToggleAuth={() => setShowAdminSignup(false)}
        onAdminSignupSuccess={handleAdminSignupSuccess}
      />
    ) : (
      <AdminLogin
        onToggleAuth={() => setShowAdminSignup(false)}
        onAdminLoginSuccess={handleAdminLoginSuccess}
        onShowOTP={handleShowOTP}
        onShowAdminSignup={() => setShowAdminSignup(true)}
      />
    );
  }

  return (
    <MainLayout user={user} onLogout={handleLogout}>
      <MainRoutes />
    </MainLayout>
  );
}

export default App;

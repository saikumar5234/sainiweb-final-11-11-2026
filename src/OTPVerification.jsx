import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Container,
  Card,
  Alert,
  Fade,
  Grow
} from '@mui/material';
import {
  Store,
  VerifiedUser,
  Phone
} from '@mui/icons-material';

import { ADMIN_OTP_CONFIG } from './superAdminConfig.js';
import { API_ENDPOINTS } from './config.js';

// Format phone number (e.g. 9000022066 -> "90000 22066")
const formatPhoneNumber = (phone) => {
  if (!phone || phone === '7013269136') {
    return '90000 22066';
  }
  const clean = phone.toString().replace(/\D/g, '');
  if (clean === '7013269136') {
    return '90000 22066';
  }
  if (clean.length === 10) {
    return `${clean.slice(0, 5)} ${clean.slice(5)}`;
  }
  return phone;
};

const OTPVerification = ({ mobile, userId, onVerifySuccess, onCancel, isAdminLogin, userData, email }) => {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [otpSent, setOtpSent] = useState(false);

  useEffect(() => {
    // Auto-send OTP when component mounts
    // Skip auto-send for admin login since AdminLogin already sends OTP
    if (!isAdminLogin) {
      sendOTP();
    } else {
      // For admin login, just set the countdown and mark as sent
      // (OTP was already sent by AdminLogin component)
      setCountdown(60);
      setOtpSent(true);
    }
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const sendOTP = async () => {
    setResendLoading(true);
    setError('');
    try {
      // For admin login, use admin OTP API
      if (isAdminLogin) {
        // Get email from props (prioritize email prop as it's the exact email used)
        // Normalize to lowercase to match backend storage
        const adminEmail = (email || userData?.email || userData?.user?.email)?.toLowerCase().trim();
        if (!adminEmail) {
          setError('Email not found. Please try logging in again.');
          setResendLoading(false);
          return;
        }
        
        // Send email as query parameter (normalized to lowercase)
        const res = await fetch(`${API_ENDPOINTS.ADMIN_SEND_OTP}?email=${encodeURIComponent(adminEmail)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        if (data.success) {
          setCountdown(60); // 60 seconds countdown
          setOtpSent(true);
        } else {
          setError(data.error || 'Failed to send OTP. Please try again.');
          setCountdown(60); // Still allow resend after countdown
        }
      } else {
        // Regular user OTP
        const res = await fetch('/api/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mobile: mobile, userId })
        });
        const data = await res.json();
        if (data.success) {
          setCountdown(60);
          setOtpSent(true);
        } else {
          setCountdown(60);
          setOtpSent(true);
        }
      }
    } catch (err) {
      console.error('Error sending OTP:', err);
      setError('Network error. Please try again.');
      setCountdown(60); // Still allow resend after countdown
    }
    setResendLoading(false);
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    if (!otp || otp.length < 4) {
      setError('Please enter a valid OTP.');
      setLoading(false);
      return;
    }
    
    try {
      if (isAdminLogin) {
        // Get email from props (prioritize email prop as it's the exact email used when sending OTP)
        // Normalize to lowercase to match backend storage
        const adminEmail = (email || userData?.email || userData?.user?.email)?.toLowerCase().trim();
        if (!adminEmail) {
          setError('Email not found. Please try logging in again.');
          setLoading(false);
          return;
        }
        
        // Use admin OTP verification API - send email, mobile, and otp as query parameters
        // Ensure mobile matches exactly what backend expects (6309790780)
        const queryParams = new URLSearchParams({
          email: adminEmail,
          mobile: (ADMIN_OTP_CONFIG.defaultPhone || '9000022066').toString().replace(/\D/g, ''),
          otp: otp.trim()
        });
        
        const res = await fetch(`${API_ENDPOINTS.ADMIN_VERIFY_OTP}?${queryParams.toString()}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        
        // Check response status first
        if (res.ok) {
          const data = await res.json();
          // Backend returns {token, email, role} on success
          // Create user data object for login
          const loginData = {
            success: true,
            token: data.token,
            user: {
              email: data.email,
              role: data.role,
              isAdmin: true
            },
            email: data.email,
            role: data.role
          };
          
          // OTP verified successfully - pass userData to success handler
          if (userData) {
            onVerifySuccess({ ...loginData, userData: { ...userData, ...loginData.user } });
          } else {
            onVerifySuccess(loginData);
          }
        } else {
          // Handle error response
          try {
            const errorData = await res.json();
            setError(errorData.error || errorData.message || 'Invalid OTP. Please try again.');
          } catch (parseError) {
            // If response is not JSON, use status text
            setError(res.statusText || 'Invalid OTP. Please try again.');
          }
        }
      } else {
        // Regular user OTP verification
        const res = await fetch('/api/verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mobile: mobile, otp, userId })
        });
        const data = await res.json();
        if (data.success) {
          onVerifySuccess(data);
        } else {
          setError('Invalid OTP. Please try again.');
        }
      }
    } catch (err) {
      console.error('Error verifying OTP:', err);
      setError('Network error. Please try again.');
    }
    setLoading(false);
  };

  return (
    <Box sx={{ minHeight: '100vh', width: '100vw', background: 'linear-gradient(135deg, #f8f5f2 0%, #c3cfe2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4, px: 2, position: 'relative', overflow: 'hidden' }}>
      <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: `radial-gradient(circle at 20% 80%, rgba(46, 125, 50, 0.05) 0%, transparent 50%),radial-gradient(circle at 80% 20%, rgba(76, 175, 80, 0.05) 0%, transparent 50%),radial-gradient(circle at 40% 40%, rgba(46, 125, 50, 0.03) 0%, transparent 50%)`, zIndex: 0 }} />
      <Container maxWidth="lg" sx={{ height: '100%', position: 'relative', zIndex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', height: '100%' }}>
          <Fade in timeout={800}>
            <Card sx={{ width: '100%', maxWidth: 400, background: 'rgba(255, 255, 255, 0.98)', borderRadius: 4, boxShadow: 2, p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <Box sx={{ textAlign: 'center', mb: 2 }}>
                <VerifiedUser sx={{ fontSize: 48, mb: 1, color: 'primary.main', filter: 'drop-shadow(0 4px 8px rgba(46,125,50,0.15))' }} />
                <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, color: 'primary.main', letterSpacing: '-0.5px' }}>Verify OTP</Typography>
                <Typography variant="body1" sx={{ opacity: 0.95, fontWeight: 400, letterSpacing: '0.3px', lineHeight: 1.3, color: 'text.secondary', mb: 1 }}>
                  OTP sent to +91 {formatPhoneNumber(isAdminLogin ? ADMIN_OTP_CONFIG.defaultPhone : (mobile || ADMIN_OTP_CONFIG.defaultPhone))}
                </Typography>
                {!isAdminLogin && (
                  <Typography variant="body2" sx={{ opacity: 0.7, color: 'text.secondary', fontStyle: 'italic' }}>
                    (Testing mode: Any 4+ digit code will work)
                  </Typography>
                )}
              </Box>
              <form onSubmit={handleVerify} style={{ width: '100%', maxWidth: 340 }}>
                <Grow in={!!error}><div>{error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}</div></Grow>
                <TextField 
                  label="Enter OTP" 
                  type="text" 
                  value={otp} 
                  onChange={e => setOtp(e.target.value.replace(/\D/g, ''))} 
                  fullWidth 
                  required 
                  margin="normal"
                  inputProps={{ maxLength: 6 }}
                  InputProps={{ 
                    startAdornment: (
                      <Box sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>
                        <Phone />
                      </Box>
                    )
                  }}
                />
                <Button 
                  type="submit" 
                  variant="contained" 
                  color="primary" 
                  fullWidth 
                  size="large" 
                  sx={{ mt: 2, mb: 1, fontWeight: 'bold', borderRadius: 3 }} 
                  disabled={loading || otp.length < 4}
                >
                  {loading ? 'Verifying...' : 'Verify OTP'}
                </Button>
                <Box sx={{ textAlign: 'center', mt: 2 }}>
                  {countdown > 0 ? (
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                      Resend OTP in {countdown}s
                    </Typography>
                  ) : (
                    <Button 
                      variant="text" 
                      color="secondary" 
                      onClick={sendOTP} 
                      disabled={resendLoading}
                      sx={{ fontWeight: 'bold', textTransform: 'none' }}
                    >
                      {resendLoading ? 'Sending...' : 'Resend OTP'}
                    </Button>
                  )}
                </Box>
                {onCancel && (
                  <Button 
                    variant="text" 
                    color="secondary" 
                    onClick={onCancel} 
                    fullWidth
                    sx={{ mt: 1, fontWeight: 'bold', textTransform: 'none' }}
                  >
                    Cancel
                  </Button>
                )}
              </form>
            </Card>
          </Fade>
        </Box>
      </Container>
    </Box>
  );
};

export default OTPVerification;


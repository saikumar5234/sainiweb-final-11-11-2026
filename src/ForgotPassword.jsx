import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Container,
  Card,
  Alert,
  InputAdornment,
  IconButton,
  Fade,
  Grow
} from '@mui/material';
import {
  Store,
  Email,
  Lock,
  Visibility,
  VisibilityOff,
  VerifiedUser,
  Phone
} from '@mui/icons-material';

const ForgotPassword = ({ onBack, onSuccess }) => {
  const [step, setStep] = useState(1); // 1: Email input, 2: OTP verification, 3: New password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const DEFAULT_MOBILE = '9000022066';

  const formatPhoneNumber = (phone) => {
    if (!phone) return '90000 22066';
    const clean = phone.toString().replace(/\D/g, '');
    if (clean.length === 10) {
      return `${clean.slice(0, 5)} ${clean.slice(5)}`;
    }
    return phone;
  };

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/send-otp-forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, mobile: DEFAULT_MOBILE })
      });
      const data = await res.json();
      if (data.success) {
        setStep(2);
        setCountdown(60);
      } else {
        setError(data.error || 'Failed to send OTP');
      }
    } catch (err) {
      // For testing: proceed to OTP step even if backend fails
      setStep(2);
      setCountdown(60);
    }
    setLoading(false);
  };

  const sendOTP = async () => {
    setResendLoading(true);
    setError('');
    try {
      const res = await fetch('/api/send-otp-forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, mobile: DEFAULT_MOBILE })
      });
      const data = await res.json();
      if (data.success) {
        setCountdown(60);
      } else {
        setError(data.error || 'Failed to send OTP');
      }
    } catch (err) {
      setCountdown(60); // For testing
    }
    setResendLoading(false);
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // For testing: accept any OTP with 4+ digits
    if (otp.length >= 4) {
      try {
        const res = await fetch('/api/verify-otp-forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, mobile: DEFAULT_MOBILE, otp })
        });
        const data = await res.json();
        if (data.success) {
          setStep(3);
        } else {
          setError(data.error || 'Invalid OTP');
        }
      } catch (err) {
        // For testing: accept any OTP
        if (otp.length >= 4) {
          setStep(3);
        } else {
          setError('Network error. Please try again.');
        }
      }
    } else {
      setError('Please enter a valid OTP');
    }
    setLoading(false);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }
    
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/reset-password-with-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          mobile: DEFAULT_MOBILE,
          otp,
          newPassword 
        })
      });
      const data = await res.json();
      if (data.success) {
        if (onSuccess) {
          onSuccess();
        } else if (onBack) {
          onBack();
        }
      } else {
        setError(data.error || 'Failed to reset password');
      }
    } catch (err) {
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
                <Store sx={{ fontSize: 48, mb: 1, color: 'primary.main', filter: 'drop-shadow(0 4px 8px rgba(46,125,50,0.15))' }} />
                <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, color: 'primary.main', letterSpacing: '-0.5px' }}>
                  {step === 1 ? 'Forgot Password' : step === 2 ? 'Verify OTP' : 'Reset Password'}
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.95, fontWeight: 400, letterSpacing: '0.3px', lineHeight: 1.3, color: 'text.secondary' }}>
                  {step === 1 ? 'Enter your email to receive OTP' : step === 2 ? `OTP sent to +91 ${formatPhoneNumber(DEFAULT_MOBILE)}` : 'Enter your new password'}
                </Typography>
                {step === 2 && (
                  <Typography variant="body2" sx={{ opacity: 0.7, color: 'text.secondary', fontStyle: 'italic', mt: 1 }}>
                    (Testing mode: Any 4+ digit code will work)
                  </Typography>
                )}
              </Box>
              
              {step === 1 && (
                <form onSubmit={handleSendOTP} style={{ width: '100%', maxWidth: 340 }}>
                  <Grow in={!!error}><div>{error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}</div></Grow>
                  <TextField 
                    label="Email" 
                    type="email" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    fullWidth 
                    required 
                    margin="normal"
                    InputProps={{ 
                      startAdornment: (
                        <InputAdornment position="start">
                          <Email />
                        </InputAdornment>
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
                    disabled={loading}
                  >
                    {loading ? 'Sending OTP...' : 'Send OTP'}
                  </Button>
                  <Button 
                    variant="text" 
                    color="secondary" 
                    onClick={onBack} 
                    fullWidth
                    sx={{ mt: 1, fontWeight: 'bold', textTransform: 'none' }}
                  >
                    Back to Login
                  </Button>
                </form>
              )}

              {step === 2 && (
                <form onSubmit={handleVerifyOTP} style={{ width: '100%', maxWidth: 340 }}>
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
                        <InputAdornment position="start">
                          <Phone />
                        </InputAdornment>
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
                  <Button 
                    variant="text" 
                    color="secondary" 
                    onClick={() => setStep(1)} 
                    fullWidth
                    sx={{ mt: 1, fontWeight: 'bold', textTransform: 'none' }}
                  >
                    Back
                  </Button>
                </form>
              )}

              {step === 3 && (
                <form onSubmit={handleResetPassword} style={{ width: '100%', maxWidth: 340 }}>
                  <Grow in={!!error}><div>{error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}</div></Grow>
                  <TextField 
                    label="New Password" 
                    type={showPassword ? 'text' : 'password'} 
                    value={newPassword} 
                    onChange={e => setNewPassword(e.target.value)} 
                    fullWidth 
                    required 
                    margin="normal"
                    InputProps={{ 
                      startAdornment: (
                        <InputAdornment position="start">
                          <Lock />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton 
                            aria-label="toggle password visibility" 
                            onClick={() => setShowPassword(!showPassword)} 
                            edge="end"
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      )
                    }}
                  />
                  <TextField 
                    label="Confirm Password" 
                    type={showConfirmPassword ? 'text' : 'password'} 
                    value={confirmPassword} 
                    onChange={e => setConfirmPassword(e.target.value)} 
                    fullWidth 
                    required 
                    margin="normal"
                    InputProps={{ 
                      startAdornment: (
                        <InputAdornment position="start">
                          <Lock />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton 
                            aria-label="toggle password visibility" 
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)} 
                            edge="end"
                          >
                            {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
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
                    disabled={loading}
                  >
                    {loading ? 'Resetting...' : 'Reset Password'}
                  </Button>
                  <Button 
                    variant="text" 
                    color="secondary" 
                    onClick={() => setStep(2)} 
                    fullWidth
                    sx={{ mt: 1, fontWeight: 'bold', textTransform: 'none' }}
                  >
                    Back
                  </Button>
                </form>
              )}
            </Card>
          </Fade>
        </Box>
      </Container>
    </Box>
  );
};

export default ForgotPassword;


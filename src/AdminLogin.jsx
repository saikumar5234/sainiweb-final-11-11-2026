import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Container,
  Alert,
  InputAdornment,
  IconButton,
  Divider,
  Card,
  Fade,
  Grow
} from '@mui/material';
import {
  Email,
  Lock,
  Visibility,
  VisibilityOff,
  AdminPanelSettings,
  Login as LoginIcon
} from '@mui/icons-material';
import { API_ENDPOINTS } from './config.js';
import { SUPER_ADMIN, ADMIN_OTP_CONFIG } from './superAdminConfig.js';

const AdminLogin = ({ onToggleAuth, onAdminLoginSuccess, onShowOTP, onShowAdminSignup }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      // Check for Super Admin first
      if (email.toLowerCase() === SUPER_ADMIN.email.toLowerCase() && password === SUPER_ADMIN.password) {
        // Super admin login - no OTP required
        const superAdminData = {
          success: true,
          user: {
            email: SUPER_ADMIN.email,
            isAdmin: true,
            isSuperAdmin: true
          },
          isSuperAdmin: true
        };
        localStorage.setItem('currentUser', JSON.stringify(superAdminData));
        onAdminLoginSuccess(superAdminData);
        setLoading(false);
        return;
      }

      // Check for Sub Admin - validate credentials first
      const res = await fetch(API_ENDPOINTS.ADMIN_LOGIN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      
      if (data.success) {
        // Sub-admin credentials validated - send OTP first
        try {
          // Send email as query parameter (normalize to lowercase to match backend)
          const normalizedEmail = email.toLowerCase().trim();
          const otpResponse = await fetch(`${API_ENDPOINTS.ADMIN_SEND_OTP}?email=${encodeURIComponent(normalizedEmail)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          
          const otpData = await otpResponse.json();
          
          // Show OTP verification screen regardless of OTP send response
          // (backend will handle the actual sending)
          if (onShowOTP) {
            onShowOTP({
              email: normalizedEmail, // Use normalized email
              userData: data,
              phone: ADMIN_OTP_CONFIG.defaultPhone,
              mobile: ADMIN_OTP_CONFIG.defaultPhone,
              isAdminLogin: true
            });
          } else {
            // Fallback: if OTP handler not provided, proceed with login
            localStorage.setItem('currentUser', JSON.stringify(data));
            onAdminLoginSuccess(data);
          }
        } catch (otpErr) {
          console.error('Error sending OTP:', otpErr);
          // Still show OTP screen even if sending fails (user can resend)
          if (onShowOTP) {
            const normalizedEmail = email.toLowerCase().trim();
            onShowOTP({
              email: normalizedEmail, // Use normalized email
              userData: data,
              phone: ADMIN_OTP_CONFIG.defaultPhone,
              mobile: ADMIN_OTP_CONFIG.defaultPhone,
              isAdminLogin: true
            });
          } else {
            setError('Failed to send OTP. Please try again.');
          }
        }
      } else {
        setError(data.error || 'Invalid email or password');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    }
    setLoading(false);
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Box sx={{ minHeight: '100vh', width: '100vw', background: 'linear-gradient(135deg, #f8f5f2 0%, #c3cfe2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4, px: 2, position: 'relative', overflow: 'hidden' }}>
      <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: `radial-gradient(circle at 20% 80%, rgba(46, 125, 50, 0.05) 0%, transparent 50%),radial-gradient(circle at 80% 20%, rgba(76, 175, 80, 0.05) 0%, transparent 50%),radial-gradient(circle at 40% 40%, rgba(46, 125, 50, 0.03) 0%, transparent 50%)`, zIndex: 0 }} />
      <Container maxWidth="lg" sx={{ height: '100%', position: 'relative', zIndex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', height: '100%' }}>
          <Fade in timeout={800}>
            <Card sx={{ width: '100%', maxWidth: 400, background: 'rgba(255, 255, 255, 0.98)', borderRadius: 4, boxShadow: 2, p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <Box sx={{ textAlign: 'center', mb: 2 }}>
                <AdminPanelSettings sx={{ fontSize: 48, mb: 1, color: 'primary.main', filter: 'drop-shadow(0 4px 8px rgba(46,125,50,0.15))' }} />
                <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, color: 'primary.main', letterSpacing: '-0.5px' }}>Admin Login</Typography>
                <Typography variant="body1" sx={{ opacity: 0.95, fontWeight: 400, letterSpacing: '0.3px', lineHeight: 1.3, color: 'text.secondary' }}>Sign in to your admin account</Typography>
              </Box>
              <form onSubmit={handleAdminLogin} style={{ width: '100%', maxWidth: 340 }}>
                <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 2, color: 'primary.main', textAlign: 'center' }}>Admin Sign In</Typography>
                <Grow in={!!error}><div>{error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}</div></Grow>
                <TextField label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} fullWidth required margin="normal" InputProps={{ startAdornment: (<InputAdornment position="start"><Email /></InputAdornment>) }} />
                <TextField label="Password" type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} fullWidth required margin="normal" InputProps={{ startAdornment: (<InputAdornment position="start"><Lock /></InputAdornment>), endAdornment: (<InputAdornment position="end"><IconButton aria-label="toggle password visibility" onClick={handleTogglePasswordVisibility} onMouseDown={e => e.preventDefault()} edge="end" tabIndex={0}>{showPassword ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment>) }} />
                <Button type="submit" variant="contained" color="primary" fullWidth size="large" sx={{ mt: 2, mb: 1, fontWeight: 'bold', borderRadius: 3 }} disabled={loading}>{loading ? <Fade in={loading}><LoginIcon sx={{ animation: 'spin 1s linear infinite' }} /></Fade> : 'Admin Sign In'}</Button>
                <Divider sx={{ my: 2 }} />
                {onShowAdminSignup && (
                  <Typography variant="body2" sx={{ textAlign: 'center', mb: 1 }}>
                    Need admin access?{' '}
                    <Button variant="text" color="secondary" onClick={onShowAdminSignup} sx={{ fontWeight: 'bold', textTransform: 'none', p: 0 }} tabIndex={0}>
                      Admin Signup
                    </Button>
                  </Typography>
                )}
              </form>
            </Card>
          </Fade>
        </Box>
      </Container>
    </Box>
  );
};

export default AdminLogin;


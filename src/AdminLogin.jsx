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
  Login as LoginIcon,
  Person
} from '@mui/icons-material';
import { API_ENDPOINTS } from './config.js';
import { ADMIN_OTP_CONFIG } from './superAdminConfig.js';
import SuperAdminForgotPassword from './SuperAdminForgotPassword.jsx';

const AdminLogin = ({ onAdminLoginSuccess, onShowOTP, onShowAdminSignup }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError('');
    setSuccessMessage('');

    const trimmedIdentifier = identifier.trim();

    try {
      // 1. Authenticate against Superadmin login API (never hardcoded)
      const superAdminPayload = {
        username: trimmedIdentifier,
        password: password
      };
      if (trimmedIdentifier.includes('@')) {
        superAdminPayload.email = trimmedIdentifier;
      }

      let superAdminError = '';

      try {
        let superRes = await fetch(API_ENDPOINTS.SUPERADMIN_LOGIN, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(superAdminPayload)
        });

        // If configured URL returned 404 (e.g. remote backend doesn't have the endpoint yet),
        // try local server fallback at http://localhost:8080
        if (superRes.status === 404 && !API_ENDPOINTS.SUPERADMIN_LOGIN.includes('localhost:8080')) {
          try {
            const localFallbackRes = await fetch('http://localhost:8080/api/superadmin/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
              body: JSON.stringify(superAdminPayload)
            });
            if (localFallbackRes.ok || localFallbackRes.status !== 404) {
              superRes = localFallbackRes;
            }
          } catch {
            // Local fallback unreachable
          }
        }

        if (superRes.ok) {
          const superData = await superRes.json();
          if (superData.success !== false) {
            const superAdminData = {
              ...superData,
              success: true,
              token: superData.token,
              user: {
                ...(superData.user || {}),
                username: superData.username || superData.user?.username || trimmedIdentifier,
                name: superData.username || superData.user?.username || trimmedIdentifier,
                email: superData.email || superData.user?.email || (trimmedIdentifier.includes('@') ? trimmedIdentifier : undefined),
                role: superData.role || superData.user?.role || 'SUPER_ADMIN',
                isAdmin: true,
                isSuperAdmin: true
              },
              username: superData.username || superData.user?.username || trimmedIdentifier,
              name: superData.username || superData.user?.username || trimmedIdentifier,
              isAdmin: true,
              isSuperAdmin: true
            };
            localStorage.setItem('currentUser', JSON.stringify(superAdminData));
            onAdminLoginSuccess(superAdminData);
            setLoading(false);
            return;
          } else {
            superAdminError = superData.error || superData.message || '';
          }
        } else {
          try {
            const errData = await superRes.json();
            superAdminError = errData.error || errData.message || '';
          } catch {
            superAdminError = '';
          }
        }
      } catch (superErr) {
        console.error('Superadmin login check error:', superErr);
      }

      // 2. If not Superadmin, check for Sub Admin if an email was entered (preserving existing functionality)
      if (trimmedIdentifier.includes('@')) {
        let subRes;
        try {
          subRes = await fetch(API_ENDPOINTS.ADMIN_LOGIN, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ email: trimmedIdentifier, password })
          });
        } catch {
          // If remote failed, try localhost:8080 fallback
          try {
            subRes = await fetch('http://localhost:8080/api/admin-login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
              body: JSON.stringify({ email: trimmedIdentifier, password })
            });
          } catch {
            // Ignore
          }
        }

        if (subRes && subRes.ok) {
          const data = await subRes.json();
          if (data.success) {
            // Sub-admin credentials validated - send OTP first
            try {
              const normalizedEmail = trimmedIdentifier.toLowerCase();
              await fetch(`${API_ENDPOINTS.ADMIN_SEND_OTP}?email=${encodeURIComponent(normalizedEmail)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
              });

              if (onShowOTP) {
                onShowOTP({
                  email: normalizedEmail,
                  userData: data,
                  phone: ADMIN_OTP_CONFIG.defaultPhone,
                  mobile: ADMIN_OTP_CONFIG.defaultPhone,
                  isAdminLogin: true
                });
              } else {
                localStorage.setItem('currentUser', JSON.stringify(data));
                onAdminLoginSuccess(data);
              }
            } catch (otpErr) {
              console.error('Error sending OTP:', otpErr);
              if (onShowOTP) {
                const normalizedEmail = trimmedIdentifier.toLowerCase();
                onShowOTP({
                  email: normalizedEmail,
                  userData: data,
                  phone: ADMIN_OTP_CONFIG.defaultPhone,
                  mobile: ADMIN_OTP_CONFIG.defaultPhone,
                  isAdminLogin: true
                });
              } else {
                setError('Failed to send OTP. Please try again.');
              }
            }
            setLoading(false);
            return;
          } else {
            setError(superAdminError || data.error || data.message || 'Invalid username/email or password');
          }
        } else {
          setError(superAdminError || 'Invalid username/email or password');
        }
      } else {
        // Entered a username without '@' and Superadmin login failed
        const displayErr =
          superAdminError && superAdminError !== 'Not Found'
            ? superAdminError
            : 'Invalid username or password';
        setError(displayErr);
      }
    } catch {
      setError('Network error. Please try again.');
    }
    setLoading(false);
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // If "Forgot Password?" was clicked, render the OTP-based Credential Reset screen
  if (showForgotPassword) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          width: '100vw',
          background: 'linear-gradient(135deg, #f8f5f2 0%, #c3cfe2 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 4,
          px: 2,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `radial-gradient(circle at 20% 80%, rgba(46, 125, 50, 0.05) 0%, transparent 50%),radial-gradient(circle at 80% 20%, rgba(76, 175, 80, 0.05) 0%, transparent 50%),radial-gradient(circle at 40% 40%, rgba(46, 125, 50, 0.03) 0%, transparent 50%)`,
            zIndex: 0
          }}
        />
        <Container maxWidth="lg" sx={{ height: '100%', position: 'relative', zIndex: 1 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '100vh',
              height: '100%'
            }}
          >
            <SuperAdminForgotPassword
              onBackToLogin={() => {
                setError('');
                setShowForgotPassword(false);
              }}
              onResetSuccess={({ message, username }) => {
                setShowForgotPassword(false);
                setError('');
                setSuccessMessage(
                  message ||
                    'Superadmin username and password updated successfully. Please log in with your new credentials.'
                );
                if (username) {
                  setIdentifier(username);
                }
                setPassword('');
              }}
            />
          </Box>
        </Container>
      </Box>
    );
  }

  // Step 1: Superadmin Login Screen - using original app theme colors
  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100vw',
        background: 'linear-gradient(135deg, #f8f5f2 0%, #c3cfe2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 4,
        px: 2,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `radial-gradient(circle at 20% 80%, rgba(46, 125, 50, 0.05) 0%, transparent 50%),radial-gradient(circle at 80% 20%, rgba(76, 175, 80, 0.05) 0%, transparent 50%),radial-gradient(circle at 40% 40%, rgba(46, 125, 50, 0.03) 0%, transparent 50%)`,
          zIndex: 0
        }}
      />
      <Container maxWidth="lg" sx={{ height: '100%', position: 'relative', zIndex: 1 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            height: '100%'
          }}
        >
          <Fade in timeout={800}>
            <Card
              sx={{
                width: '100%',
                maxWidth: 400,
                background: 'rgba(255, 255, 255, 0.98)',
                borderRadius: 4,
                boxShadow: 2,
                p: 4,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Box sx={{ textAlign: 'center', mb: 2 }}>
                <AdminPanelSettings
                  sx={{
                    fontSize: 48,
                    mb: 1,
                    color: 'primary.main',
                    filter: 'drop-shadow(0 4px 8px rgba(46,125,50,0.15))'
                  }}
                />
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 800,
                    mb: 1,
                    color: 'primary.main',
                    letterSpacing: '-0.5px'
                  }}
                >
                  Admin Login
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    opacity: 0.95,
                    fontWeight: 400,
                    letterSpacing: '0.3px',
                    lineHeight: 1.3,
                    color: 'text.secondary'
                  }}
                >
                  Sign in to your admin account
                </Typography>
              </Box>

              <form onSubmit={handleAdminLogin} style={{ width: '100%', maxWidth: 340 }}>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 'bold',
                    mb: 2,
                    color: 'primary.main',
                    textAlign: 'center'
                  }}
                >
                  Admin Sign In
                </Typography>

                {/* Success Notification after Credential Reset */}
                <Grow in={!!successMessage}>
                  <Box sx={{ mb: successMessage ? 2 : 0 }}>
                    {successMessage && (
                      <Alert
                        severity="success"
                        onClose={() => setSuccessMessage('')}
                        sx={{ mb: 2 }}
                      >
                        {successMessage}
                      </Alert>
                    )}
                  </Box>
                </Grow>

                {/* Error Notification */}
                <Grow in={!!error}>
                  <Box sx={{ mb: error ? 2 : 0 }}>
                    {error && (
                      <Alert
                        severity="error"
                        onClose={() => setError('')}
                        sx={{ mb: 2 }}
                      >
                        {error}
                      </Alert>
                    )}
                  </Box>
                </Grow>

                {/* Username or Email Input Field */}
                <TextField
                  label="Username or Email"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  fullWidth
                  required
                  margin="normal"
                  autoComplete="username"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        {identifier.includes('@') ? <Email /> : <Person />}
                      </InputAdornment>
                    )
                  }}
                />

                {/* Password Input Field */}
                <TextField
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  fullWidth
                  required
                  margin="normal"
                  autoComplete="current-password"
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
                          onClick={handleTogglePasswordVisibility}
                          onMouseDown={(e) => e.preventDefault()}
                          edge="end"
                          tabIndex={0}
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />

                {/* Step 1: "Forgot Password?" Link Below Password Field */}
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    mt: 0.5,
                    mb: 1
                  }}
                >
                  <Button
                    variant="text"
                    color="secondary"
                    onClick={() => {
                      setError('');
                      setSuccessMessage('');
                      setShowForgotPassword(true);
                    }}
                    sx={{
                      fontWeight: 'bold',
                      textTransform: 'none',
                      fontSize: '0.875rem'
                    }}
                  >
                    Forgot Password?
                  </Button>
                </Box>

                {/* Submit Sign In Button using original primary color */}
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  fullWidth
                  size="large"
                  disabled={loading}
                  sx={{
                    mt: 2,
                    mb: 1,
                    fontWeight: 'bold',
                    borderRadius: 3
                  }}
                >
                  {loading ? (
                    <Fade in={loading}>
                      <LoginIcon sx={{ animation: 'spin 1s linear infinite' }} />
                    </Fade>
                  ) : (
                    'Admin Sign In'
                  )}
                </Button>

                <Divider sx={{ my: 2 }} />

                {onShowAdminSignup && (
                  <Typography variant="body2" sx={{ textAlign: 'center', mb: 1 }}>
                    Need admin access?{' '}
                    <Button
                      variant="text"
                      color="secondary"
                      onClick={onShowAdminSignup}
                      sx={{
                        fontWeight: 'bold',
                        textTransform: 'none',
                        p: 0
                      }}
                      tabIndex={0}
                    >
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

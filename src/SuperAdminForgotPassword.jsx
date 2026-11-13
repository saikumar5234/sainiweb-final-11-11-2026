import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Card,
  Alert,
  InputAdornment,
  IconButton,
  CircularProgress,
  Fade,
  Grow
} from '@mui/material';
import {
  AdminPanelSettings,
  Lock,
  Visibility,
  VisibilityOff,
  ArrowBack,
  Send,
  VpnKey,
  Person,
  Schedule,
  Refresh,
  PhoneAndroid
} from '@mui/icons-material';
import { API_ENDPOINTS } from './config.js';

/**
 * Superadmin credential reset flow:
 * Step 2: Send OTP to registered mobile
 * Step 3: Verify OTP (6 digits) with 5-minute countdown and resend
 * Step 4: Reset Username and Password
 * Uses the project's original theme colors (primary green #2E7D32, secondary brown #8D6748)
 */
const SuperAdminForgotPassword = ({ onBackToLogin, onResetSuccess }) => {
  // Step state: 2 = Send OTP, 3 = Verify OTP, 4 = Reset Credentials
  const [step, setStep] = useState(2);

  // Sensitive temporary state - stored ONLY in component memory
  const [resetToken, setResetToken] = useState(null);
  const [otp, setOtp] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password visibility
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Masked mobile received from backend in Step 2 / Resend
  const [maskedMobile, setMaskedMobile] = useState('');

  // 5-minute countdown timer (default 300 seconds)
  const [countdown, setCountdown] = useState(300);
  const timerRef = useRef(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  // Countdown timer effect
  useEffect(() => {
    if (step === 3 && countdown > 0) {
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [step, countdown]);

  // Clean up all sensitive state on unmount
  useEffect(() => {
    return () => {
      setResetToken(null);
      setOtp('');
      setNewUsername('');
      setNewPassword('');
      setConfirmPassword('');
    };
  }, []);

  // Format seconds into mm:ss
  const formatTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Safely exit and clear sensitive state
  const handleCancel = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setResetToken(null);
    setOtp('');
    setNewUsername('');
    setNewPassword('');
    setConfirmPassword('');
    setMaskedMobile('');
    setError('');
    setSuccess('');
    onBackToLogin();
  };

  // Helper to fetch with automatic localhost fallback if remote 404s
  const fetchWithFallback = async (primaryUrl, localPath, options) => {
    let res = await fetch(primaryUrl, options);
    if (res.status === 404 && !primaryUrl.includes('localhost:8080')) {
      try {
        const fallbackRes = await fetch(`http://localhost:8080${localPath}`, options);
        if (fallbackRes.ok || fallbackRes.status !== 404) {
          res = fallbackRes;
        }
      } catch {
        // Fallback unreachable, keep original
      }
    }
    return res;
  };

  // ==========================================
  // Step 2: Send OTP
  // ==========================================
  const handleSendOTP = async (e) => {
    if (e) e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetchWithFallback(
        API_ENDPOINTS.SUPERADMIN_FORGOT_PASSWORD,
        '/api/superadmin/forgot-password',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );

      const data = await res.json();

      if (res.ok && data.success !== false) {
        const receivedMobile = data.mobile || data.maskedMobile || 'registered mobile';
        setMaskedMobile(receivedMobile);

        const expiry = Number(data.expiresInSeconds) || 300;
        setCountdown(expiry);

        setSuccess(data.message || `OTP sent successfully to ${receivedMobile}`);
        setStep(3);
      } else {
        const msg = data.error || data.message;
        setError(msg && msg !== 'Not Found' ? msg : 'Failed to send OTP. Please try again.');
      }
    } catch {
      setError('Network error while requesting OTP. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // Step 3: Resend OTP
  // ==========================================
  const handleResendOTP = async () => {
    if (resendLoading || loading) return;

    setResendLoading(true);
    setError('');
    setSuccess('');
    setOtp('');

    try {
      const res = await fetchWithFallback(
        API_ENDPOINTS.SUPERADMIN_FORGOT_PASSWORD,
        '/api/superadmin/forgot-password',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );

      const data = await res.json();

      if (res.ok && data.success !== false) {
        if (data.mobile || data.maskedMobile) {
          setMaskedMobile(data.mobile || data.maskedMobile);
        }
        const expiry = Number(data.expiresInSeconds) || 300;
        setCountdown(expiry);
        setSuccess(data.message || 'A new OTP has been sent successfully.');
      } else {
        const msg = data.error || data.message;
        setError(msg && msg !== 'Not Found' ? msg : 'Failed to resend OTP. Please try again.');
      }
    } catch {
      setError('Network error while resending OTP. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  // ==========================================
  // Step 3: Verify OTP
  // ==========================================
  const handleVerifyOTP = async (e) => {
    if (e) e.preventDefault();
    if (loading) return;

    const cleanOtp = otp.trim();
    if (cleanOtp.length !== 6) {
      setError('Please enter the full 6-digit OTP.');
      return;
    }

    if (countdown === 0) {
      setError('OTP has expired. Please click "Resend OTP" to receive a new code.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetchWithFallback(
        API_ENDPOINTS.SUPERADMIN_VERIFY_OTP,
        '/api/superadmin/verify-otp',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ otp: cleanOtp })
        }
      );

      const data = await res.json();

      if (res.ok && data.success !== false && data.resetToken) {
        setResetToken(data.resetToken);
        setOtp('');
        if (timerRef.current) clearInterval(timerRef.current);
        setSuccess(data.message || 'OTP verified successfully.');
        setStep(4);
      } else {
        const msg = data.error || data.message;
        setError(msg && msg !== 'Not Found' ? msg : 'Invalid or expired OTP. Please try again.');
      }
    } catch {
      setError('Network error while verifying OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // Step 4: Reset Username & Password
  // ==========================================
  const validateForm = () => {
    const errors = {};

    const trimmedUsername = newUsername.trim();
    if (!trimmedUsername) {
      errors.username = 'New Username is mandatory.';
    } else if (trimmedUsername.length > 100) {
      errors.username = 'Username must not exceed 100 characters.';
    }

    if (!newPassword) {
      errors.password = 'New Password is mandatory.';
    } else if (newPassword.length < 8) {
      errors.password = 'Password must contain at least 8 characters.';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Confirm New Password is mandatory.';
    } else if (confirmPassword !== newPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleResetPassword = async (e) => {
    if (e) e.preventDefault();
    if (loading) return;

    if (!resetToken) {
      setError('Session expired or reset token missing. Please restart verification.');
      setStep(2);
      return;
    }

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetchWithFallback(
        API_ENDPOINTS.SUPERADMIN_RESET_PASSWORD,
        '/api/superadmin/reset-password',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            resetToken: resetToken,
            newUsername: newUsername.trim(),
            newPassword: newPassword
          })
        }
      );

      const data = await res.json();

      if (res.ok && data.success !== false) {
        const updatedUsername = data.username || newUsername.trim();
        const successMsg =
          data.message ||
          'Superadmin username and password updated successfully. Please log in with your new credentials.';

        setResetToken(null);
        setOtp('');
        setNewUsername('');
        setNewPassword('');
        setConfirmPassword('');

        onResetSuccess({
          message: successMsg,
          username: updatedUsername
        });
      } else {
        const msg = data.error || data.message;
        setError(msg && msg !== 'Not Found' ? msg : 'Failed to reset credentials. Please try again.');
      }
    } catch {
      setError('Network error while resetting credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Fade in timeout={500}>
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
          alignItems: 'center'
        }}
      >
        {/* Header Icon & Title matching existing app theme */}
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
            {step === 4 ? 'Set Credentials' : 'Reset Credentials'}
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
            {step === 2 && 'Verify your registered mobile to reset your username and password.'}
            {step === 3 && (
              <>
                Enter the 6-digit OTP sent to registered mobile{' '}
                <Box
                  component="span"
                  sx={{
                    fontWeight: 700,
                    color: 'primary.main',
                    bgcolor: 'rgba(46, 125, 50, 0.08)',
                    px: 1,
                    py: 0.2,
                    borderRadius: 1
                  }}
                >
                  {maskedMobile || '******2066'}
                </Box>
              </>
            )}
            {step === 4 && 'Enter your new Superadmin username and secure password.'}
          </Typography>
        </Box>

        {/* Global Notifications */}
        <Grow in={!!error}>
          <Box sx={{ width: '100%', mb: error ? 2 : 0 }}>
            {error && (
              <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
          </Box>
        </Grow>
        <Grow in={!!success}>
          <Box sx={{ width: '100%', mb: success ? 2 : 0 }}>
            {success && (
              <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 2 }}>
                {success}
              </Alert>
            )}
          </Box>
        </Grow>

        {/* ======================================================== */}
        {/* STEP 2: Send OTP Form                                    */}
        {/* ======================================================== */}
        {step === 2 && (
          <Box component="form" onSubmit={handleSendOTP} style={{ width: '100%', maxWidth: 340 }}>
            <Box
              sx={{
                p: 2,
                my: 2,
                borderRadius: 2,
                bgcolor: 'rgba(46, 125, 50, 0.05)',
                border: '1px dashed rgba(46, 125, 50, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: 2
              }}
            >
              <PhoneAndroid sx={{ fontSize: 36, color: 'primary.main' }} />
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                  Mobile OTP Verification
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  A one-time code will be sent to the Superadmin's registered mobile number.
                </Typography>
              </Box>
            </Box>

            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              size="large"
              disabled={loading}
              endIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Send />}
              sx={{
                mt: 2,
                mb: 1,
                fontWeight: 'bold',
                borderRadius: 3
              }}
            >
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </Button>

            <Button
              type="button"
              variant="text"
              color="secondary"
              fullWidth
              onClick={handleCancel}
              startIcon={<ArrowBack />}
              sx={{
                mt: 1,
                fontWeight: 'bold',
                textTransform: 'none'
              }}
            >
              Back to Login
            </Button>
          </Box>
        )}

        {/* ======================================================== */}
        {/* STEP 3: OTP Verification Form                            */}
        {/* ======================================================== */}
        {step === 3 && (
          <Box component="form" onSubmit={handleVerifyOTP} style={{ width: '100%', maxWidth: 340 }}>
            {/* Countdown Banner */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                p: 1.5,
                mb: 2,
                borderRadius: 2,
                bgcolor: countdown > 0 ? 'rgba(46, 125, 50, 0.08)' : 'rgba(211, 47, 47, 0.08)',
                color: countdown > 0 ? 'primary.main' : 'error.main'
              }}
            >
              <Schedule sx={{ fontSize: 20 }} />
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {countdown > 0 ? `Expires in ${formatTime(countdown)}` : 'OTP Expired'}
              </Typography>
            </Box>

            {/* 6-Digit OTP Field */}
            <TextField
              label="6-Digit OTP"
              placeholder="123456"
              type="text"
              value={otp}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                setOtp(val);
                if (error) setError('');
              }}
              fullWidth
              required
              margin="normal"
              autoFocus
              inputProps={{
                maxLength: 6,
                inputMode: 'numeric',
                pattern: '[0-9]*',
                style: {
                  textAlign: 'center',
                  fontSize: '1.4rem',
                  letterSpacing: '0.35em',
                  fontWeight: 700
                }
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <VpnKey />
                  </InputAdornment>
                )
              }}
              helperText={`${otp.length}/6 digits entered`}
            />

            {/* Verify OTP Button */}
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              size="large"
              disabled={loading || otp.length !== 6 || countdown === 0}
              endIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
              sx={{
                mt: 2,
                mb: 1,
                fontWeight: 'bold',
                borderRadius: 3
              }}
            >
              {loading ? 'Verifying OTP...' : 'Verify OTP'}
            </Button>

            {/* Resend OTP & Back Options */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mt: 1.5
              }}
            >
              <Button
                type="button"
                variant="text"
                color="secondary"
                onClick={handleResendOTP}
                disabled={resendLoading || loading}
                startIcon={
                  resendLoading ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <Refresh />
                  )
                }
                sx={{
                  fontWeight: 'bold',
                  textTransform: 'none',
                  fontSize: '0.875rem'
                }}
              >
                {resendLoading ? 'Resending...' : 'Resend OTP'}
              </Button>

              <Button
                type="button"
                variant="text"
                color="secondary"
                onClick={handleCancel}
                sx={{
                  fontWeight: 'bold',
                  textTransform: 'none',
                  fontSize: '0.875rem'
                }}
              >
                Back to Login
              </Button>
            </Box>
          </Box>
        )}

        {/* ======================================================== */}
        {/* STEP 4: Reset Username & Password Form                   */}
        {/* ======================================================== */}
        {step === 4 && (
          <Box component="form" onSubmit={handleResetPassword} style={{ width: '100%', maxWidth: 340 }}>
            {/* New Username Field */}
            <TextField
              label="New Username"
              type="text"
              value={newUsername}
              onChange={(e) => {
                setNewUsername(e.target.value.slice(0, 100));
                if (validationErrors.username) {
                  setValidationErrors((prev) => ({ ...prev, username: null }));
                }
              }}
              fullWidth
              required
              margin="normal"
              autoFocus
              error={!!validationErrors.username}
              helperText={validationErrors.username || `${newUsername.length}/100 characters`}
              inputProps={{ maxLength: 100 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Person />
                  </InputAdornment>
                )
              }}
            />

            {/* New Password Field */}
            <TextField
              label="New Password"
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                if (validationErrors.password) {
                  setValidationErrors((prev) => ({ ...prev, password: null }));
                }
              }}
              fullWidth
              required
              margin="normal"
              error={!!validationErrors.password}
              helperText={validationErrors.password || 'Minimum 8 characters'}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle new password visibility"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      edge="end"
                    >
                      {showNewPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />

            {/* Confirm New Password Field */}
            <TextField
              label="Confirm New Password"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (validationErrors.confirmPassword) {
                  setValidationErrors((prev) => ({ ...prev, confirmPassword: null }));
                }
              }}
              fullWidth
              required
              margin="normal"
              error={!!validationErrors.confirmPassword}
              helperText={validationErrors.confirmPassword || 'Must match new password'}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle confirm password visibility"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      edge="end"
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />

            {/* Submit Button */}
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              size="large"
              disabled={loading}
              endIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
              sx={{
                mt: 2,
                mb: 1,
                fontWeight: 'bold',
                borderRadius: 3
              }}
            >
              {loading ? 'Updating Credentials...' : 'Update Credentials'}
            </Button>

            <Button
              type="button"
              variant="text"
              color="secondary"
              fullWidth
              onClick={handleCancel}
              startIcon={<ArrowBack />}
              sx={{
                mt: 1,
                fontWeight: 'bold',
                textTransform: 'none'
              }}
            >
              Cancel & Return to Login
            </Button>
          </Box>
        )}
      </Card>
    </Fade>
  );
};

export default SuperAdminForgotPassword;

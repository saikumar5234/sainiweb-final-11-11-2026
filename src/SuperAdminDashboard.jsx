import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Card,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  InputAdornment
} from '@mui/material';
import {
  Add,
  Email,
  Delete,
  AdminPanelSettings,
  PersonAdd
} from '@mui/icons-material';
import CircularProgress from '@mui/material/CircularProgress';
import { API_ENDPOINTS, BACKEND_BASE_URL } from './config.js';

// Helper to retrieve current Superadmin JWT token from localStorage
const getAuthToken = () => {
  try {
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
      const u = JSON.parse(userStr);
      return u?.token || u?.user?.token || '';
    }
  } catch {
    return '';
  }
  return '';
};

const SuperAdminDashboard = () => {
  const [subAdmins, setSubAdmins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [emailError, setEmailError] = useState('');

  useEffect(() => {
    loadSubAdmins();
  }, []);

  const loadSubAdmins = async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      };

      // Try /api/admin/subadmins first (matches SubAdminManagementController)
      let response = await fetch(API_ENDPOINTS.SUBADMINS || `${BACKEND_BASE_URL}/api/admin/subadmins`, {
        method: 'GET',
        headers
      });

      // If 404, fallback to /api/admin/sub-admins (with hyphen)
      if (response.status === 404 && API_ENDPOINTS.SUB_ADMINS) {
        response = await fetch(API_ENDPOINTS.SUB_ADMINS, {
          method: 'GET',
          headers
        });
      }

      // If remote returned 404, try localhost:8080 fallback in development
      if (response.status === 404) {
        try {
          const localRes = await fetch('http://localhost:8080/api/admin/subadmins', {
            method: 'GET',
            headers
          });
          if (localRes.ok) {
            response = localRes;
          } else {
            const localHyphen = await fetch('http://localhost:8080/api/admin/sub-admins', {
              method: 'GET',
              headers
            });
            if (localHyphen.ok) response = localHyphen;
          }
        } catch {
          // Ignore
        }
      }

      if (response.ok) {
        const data = await response.json();
        // Handle different response formats
        if (Array.isArray(data)) {
          setSubAdmins(data);
        } else if (data.subAdmins && Array.isArray(data.subAdmins)) {
          setSubAdmins(data.subAdmins);
        } else if (data.data && Array.isArray(data.data)) {
          setSubAdmins(data.data);
        } else {
          setSubAdmins([]);
        }
      } else {
        setSubAdmins([]);
      }
    } catch (e) {
      console.error('Error loading sub-admins:', e);
      setSubAdmins([]);
    } finally {
      setLoading(false);
    }
  };

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleCreateSubAdmin = async () => {
    setEmailError('');
    setError('');
    setLoading(true);

    if (!newEmail || !validateEmail(newEmail)) {
      setEmailError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    // Check if email already exists locally
    if (subAdmins.some((admin) => admin.email.toLowerCase() === newEmail.toLowerCase())) {
      setEmailError('This email is already registered');
      setLoading(false);
      return;
    }

    try {
      const token = getAuthToken();
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      };

      // Try /api/admin/subadmins first
      let response = await fetch(API_ENDPOINTS.SUBADMINS || `${BACKEND_BASE_URL}/api/admin/subadmins`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ email: newEmail.toLowerCase() })
      });

      if (response.status === 404 && API_ENDPOINTS.SUB_ADMINS) {
        response = await fetch(API_ENDPOINTS.SUB_ADMINS, {
          method: 'POST',
          headers,
          body: JSON.stringify({ email: newEmail.toLowerCase() })
        });
      }

      const data = await response.json();

      if (response.ok && data.success !== false) {
        // Reload the list of sub-admins from the API
        await loadSubAdmins();
        setSuccess(`Sub-admin email "${newEmail}" created successfully!`);
        setNewEmail('');
        setOpenDialog(false);
      } else {
        const errorMessage = data.error || data.message || 'Failed to create sub-admin email. Please try again.';
        if (errorMessage.toLowerCase().includes('already') || errorMessage.toLowerCase().includes('exists')) {
          setEmailError(errorMessage);
        } else {
          setError(errorMessage);
        }
      }
    } catch (err) {
      console.error('Error creating sub-admin:', err);
      setError('Network error. Failed to create sub-admin email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSubAdmin = async (id) => {
    if (!window.confirm('Are you sure you want to delete this sub-admin email?')) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = getAuthToken();
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      };

      // Call DELETE /api/admin/subadmins/{id} with Authorization: Bearer <token>
      const deleteUrl = API_ENDPOINTS.SUBADMIN_DELETE
        ? API_ENDPOINTS.SUBADMIN_DELETE(id)
        : `${BACKEND_BASE_URL}/api/admin/subadmins/${id}`;

      let response = await fetch(deleteUrl, {
        method: 'DELETE',
        headers
      });

      // If remote 404s, try localhost:8080 fallback
      if (response.status === 404 && !deleteUrl.includes('localhost:8080')) {
        try {
          const fallbackRes = await fetch(`http://localhost:8080/api/admin/subadmins/${id}`, {
            method: 'DELETE',
            headers
          });
          if (fallbackRes.ok || fallbackRes.status !== 404) {
            response = fallbackRes;
          }
        } catch {
          // Ignore
        }
      }

      // If still 404, try /api/admin/sub-admins/{id} (with hyphen)
      if (response.status === 404 && API_ENDPOINTS.SUB_ADMINS) {
        try {
          const hyphenRes = await fetch(`${API_ENDPOINTS.SUB_ADMINS}/${id}`, {
            method: 'DELETE',
            headers
          });
          if (hyphenRes.ok || hyphenRes.status !== 404) {
            response = hyphenRes;
          }
        } catch {
          // Ignore
        }
      }

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        // Reload the list from the database so it reflects actual database state
        await loadSubAdmins();
        setSuccess(data.message || 'Sub-admin deleted successfully!');
      } else {
        const data = await response.json().catch(() => ({}));
        const errorMsg =
          data.message ||
          data.error ||
          (response.status === 401
            ? 'Superadmin authentication required. Please log in again.'
            : response.status === 403
            ? 'Only Superadmin can delete Subadmins.'
            : response.status === 404
            ? 'Subadmin not found in database.'
            : 'Failed to delete sub-admin.');
        setError(errorMsg);
      }
    } catch (err) {
      console.error('Error deleting sub-admin:', err);
      setError('Network error. Failed to delete sub-admin. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main', mb: 1 }}>
            Super Admin Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage sub-admin accounts
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<Add />}
          onClick={() => setOpenDialog(true)}
          sx={{ fontWeight: 'bold' }}
          disabled={loading}
        >
          Create Sub-Admin Email
        </Button>
      </Box>

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert onClose={() => setError('')} severity="error">
          {error}
        </Alert>
      </Snackbar>
      <Snackbar
        open={!!success}
        autoHideDuration={4000}
        onClose={() => setSuccess('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert onClose={() => setSuccess('')} severity="success">
          {success}
        </Alert>
      </Snackbar>

      <Card sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
          Sub-Admin Emails
        </Typography>

        {loading && subAdmins.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography variant="body2" color="text.secondary">
              Loading sub-admins...
            </Typography>
          </Box>
        ) : subAdmins.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <AdminPanelSettings sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              No sub-admin emails created yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Click "Create Sub-Admin Email" to add a new sub-admin email address.
            </Typography>
          </Box>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: 'primary.main' }}>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Email</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Created At</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold', textAlign: 'center' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {subAdmins.map((admin) => (
                  <TableRow key={admin.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Email fontSize="small" color="primary" />
                        {admin.email}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {admin.createdAt ? new Date(admin.createdAt).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Delete">
                        <IconButton
                          color="error"
                          size="small"
                          onClick={() => handleDeleteSubAdmin(admin.id)}
                          disabled={loading}
                        >
                          <Delete />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      {/* Create Sub-Admin Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonAdd color="primary" />
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              Create Sub-Admin Email
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Enter the email address that will be used by the sub-admin to register and login.
          </Alert>
          <TextField
            label="Sub-Admin Email"
            type="email"
            fullWidth
            value={newEmail}
            onChange={(e) => {
              setNewEmail(e.target.value);
              setEmailError('');
            }}
            error={!!emailError}
            helperText={emailError || 'This email will be used by sub-admin for registration'}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Email />
                </InputAdornment>
              )
            }}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setOpenDialog(false);
              setNewEmail('');
              setEmailError('');
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateSubAdmin}
            variant="contained"
            color="primary"
            disabled={!newEmail || !!emailError || loading}
          >
            {loading ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SuperAdminDashboard;

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  Typography,
  Avatar,
  Grid,
  Chip,
  Divider,
  Paper,
  Container,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  AdminPanelSettings as AdminIcon,
  CalendarToday as CalendarIcon,
  VerifiedUser as VerifiedIcon,
  Pending as PendingIcon,
  Block as BlockedIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from './config.js';

const Profile = ({ user }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userDetails, setUserDetails] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    // Fetch user details from /api/users endpoint
    fetchUserDetails();
  }, [user]);

  const fetchUserDetails = async () => {
    setLoading(true);
    setError('');
    try {
      // Get current user ID or email from the logged-in user
      const currentUserId = user?.userId || user?.user?.id || user?.id;
      const currentUserEmail = user?.user?.email || user?.email || user?.userName;

      // Fetch all users from /api/users endpoint
      const response = await fetch(API_ENDPOINTS.USERS);
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      
      const allUsers = await response.json();
      
      // Find the current user from the list
      const foundUser = allUsers.find(u => 
        (currentUserId && u.id === currentUserId) || 
        (currentUserEmail && u.email === currentUserEmail)
      );

      if (foundUser) {
        // Combine backend user data with login user data (for isAdmin flag)
        setUserDetails({
          ...foundUser,
          isAdmin: user?.isAdmin || foundUser.email === 'admin@sainistores.com'
        });
      } else {
        // If user not found in the list, use the logged-in user data
        setUserDetails(user);
      }
    } catch (err) {
      setError('Failed to load user details');
      console.error('Error fetching user details:', err);
      // Fallback to logged-in user data
      setUserDetails(user);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  const displayUser = userDetails || user;
  if (!displayUser) {
    return null;
  }

  // Extract user data from /api/users response structure
  const userId = displayUser.id || displayUser.userId || displayUser.user?.id;
  const email = displayUser.email || displayUser.user?.email || displayUser.userName;
  const mobile = displayUser.mobile || displayUser.user?.mobile || '9000022066';
  const firstName = displayUser.firstName || displayUser.user?.firstName || '';
  const lastName = displayUser.lastName || displayUser.user?.lastName || '';
  const fullName = firstName && lastName 
    ? `${firstName} ${lastName}` 
    : (displayUser.name || displayUser.user?.name || email || 'User');
  const status = displayUser.status || displayUser.user?.status || (displayUser.isAdmin ? 'APPROVED' : 'PENDING');
  const isAdmin = displayUser.isAdmin || email === 'admin@sainistores.com';
  const createdAt = displayUser.createdAt || displayUser.user?.createdAt;
  
  // Get initial for avatar
  const getInitials = () => {
    if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase();
    if (fullName && fullName !== email) return fullName[0].toUpperCase();
    if (email) return email[0].toUpperCase();
    return 'U';
  };

  // Format phone number
  const formatPhoneNumber = (phone) => {
    if (!phone) return '90000 22066';
    const clean = phone.toString().replace(/\D/g, '');
    if (clean === '7013269136') return '90000 22066';
    if (clean.length === 10) {
      return `${clean.slice(0, 5)} ${clean.slice(5)}`;
    }
    return phone;
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateString;
    }
  };

  // Get status chip
  const getStatusChip = () => {
    switch (status?.toUpperCase()) {
      case 'APPROVED':
        return <Chip icon={<VerifiedIcon />} label="Approved" color="success" size="small" />;
      case 'PENDING':
        return <Chip icon={<PendingIcon />} label="Pending" color="warning" size="small" />;
      case 'REJECTED':
        return <Chip icon={<BlockedIcon />} label="Rejected" color="error" size="small" />;
      default:
        return <Chip label={status || 'Unknown'} size="small" />;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1, color: 'primary.main' }}>
          Profile
        </Typography>
        <Typography variant="body1" color="text.secondary">
          View and manage your account information
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Profile Header Card */}
        <Grid item xs={12}>
          <Card sx={{ p: 4, borderRadius: 3, boxShadow: 3 }}>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { xs: 'center', md: 'flex-start' }, gap: 3 }}>
              <Avatar
                sx={{
                  width: { xs: 120, md: 150 },
                  height: { xs: 120, md: 150 },
                  fontSize: { xs: '3rem', md: '4rem' },
                  bgcolor: 'primary.main',
                  boxShadow: 4
                }}
              >
                {getInitials()}
              </Avatar>
              <Box sx={{ flex: 1, textAlign: { xs: 'center', md: 'left' } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: { xs: 'center', md: 'flex-start' }, gap: 2, mb: 2 }}>
                  <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    {fullName}
                  </Typography>
                  {isAdmin && (
                    <Chip
                      icon={<AdminIcon />}
                      label="Admin"
                      color="primary"
                      sx={{ fontWeight: 'bold' }}
                    />
                  )}
                  {getStatusChip()}
                </Box>
                <Divider sx={{ my: 2 }} />
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                      <EmailIcon color="primary" />
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Email Address
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {email || 'N/A'}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                      <PhoneIcon color="primary" />
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Mobile Number
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          +91 {formatPhoneNumber(mobile)}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                  {userId && (
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                        <PersonIcon color="primary" />
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            User ID
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            #{userId}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                  )}
                  {createdAt && (
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                        <CalendarIcon color="primary" />
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Member Since
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {formatDate(createdAt)}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                  )}
                </Grid>
              </Box>
            </Box>
          </Card>
        </Grid>

        {/* Additional Information */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 3, boxShadow: 2, height: '100%' }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <PersonIcon color="primary" />
              Personal Information
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  First Name
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {firstName || 'Not provided'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Last Name
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {lastName || 'Not provided'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Full Name
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {fullName}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Account Information */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 3, boxShadow: 2, height: '100%' }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <AdminIcon color="primary" />
              Account Information
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Account Type
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {isAdmin ? 'Administrator' : 'Regular User'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Account Status
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  {getStatusChip()}
                </Box>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Email Verified
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {email ? 'Yes' : 'No'}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Profile;


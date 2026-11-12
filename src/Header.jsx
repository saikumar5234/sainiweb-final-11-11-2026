import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS, TRANSLATION_CONFIG } from './config.js';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Box,
  Drawer,
  List,
  ListItem,
  ListItemText,
  Divider,
  FormControl,
  Select,
  MenuItem,
  useTheme,
  useMediaQuery,
  Badge,
  Menu,
  Chip,
  Grow,
  Slide,
  Popover,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Snackbar
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import CelebrationIcon from '@mui/icons-material/Celebration';
import NotificationsIcon from '@mui/icons-material/Notifications';
import PersonIcon from '@mui/icons-material/Person';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import PeopleIcon from '@mui/icons-material/People';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import PendingIcon from '@mui/icons-material/Pending';
import BlockIcon from '@mui/icons-material/Block';
import CampaignIcon from '@mui/icons-material/Campaign';
import LabelIcon from '@mui/icons-material/Label';
import DeleteIcon from '@mui/icons-material/Delete';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Avatar from '@mui/material/Avatar';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemIcon from '@mui/material/ListItemIcon';

const appName = 'Saini Dry Fruits';

function Header({ user, onLogout, onHomeClick, onUpdatePriceClick, onAddGreetingsClick }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [language, setLanguage] = useState('en');
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const [profileAnchorEl, setProfileAnchorEl] = useState(null);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [notificationAnchorEl, setNotificationAnchorEl] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const notificationOpen = Boolean(notificationAnchorEl);
  const profileOpen = Boolean(profileAnchorEl);
  const [bannerDialogOpen, setBannerDialogOpen] = useState(false);
  const [bannerText, setBannerText] = useState({ en: '', hi: '', te: '' });
  const [bannerLoading, setBannerLoading] = useState(false);
  const [bannerError, setBannerError] = useState('');
  const [bannerSuccess, setBannerSuccess] = useState('');
  const [bannerTranslating, setBannerTranslating] = useState(false);
  const translationTimeoutRef = React.useRef(null);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [categoryError, setCategoryError] = useState('');
  const [categorySuccess, setCategorySuccess] = useState('');
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [deletingCategoryId, setDeletingCategoryId] = useState(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();

  // Function to fetch pending approvals
  const fetchPendingApprovals = () => {
    if (user?.isAdmin) {
      fetch(API_ENDPOINTS.USERS_PENDING)
        .then(res => res.json())
        .then(data => setPendingApprovals(data))
        .catch(() => setPendingApprovals([]));
    } else {
      setPendingApprovals([]);
    }
  };

  // Fetch pending approvals if admin
  useEffect(() => {
    fetchPendingApprovals();
  }, [user]);

  // Listen for approval/rejection events from UserManagement
  useEffect(() => {
    const handleApprovalChange = () => {
      fetchPendingApprovals();
    };
    
    window.addEventListener('userApprovalChanged', handleApprovalChange);
    
    return () => {
      window.removeEventListener('userApprovalChanged', handleApprovalChange);
    };
  }, [user]);

  // Fetch user details when profile opens
  useEffect(() => {
    if (profileOpen && user) {
      fetchUserDetails();
    }
  }, [profileOpen, user]);

  const fetchUserDetails = async () => {
    try {
      const currentUserId = user?.userId || user?.user?.id || user?.id;
      const currentUserEmail = user?.user?.email || user?.email || user?.userName;

      const response = await fetch(API_ENDPOINTS.USERS);
      if (response.ok) {
        const allUsers = await response.json();
        const foundUser = allUsers.find(u => 
          (currentUserId && u.id === currentUserId) || 
          (currentUserEmail && u.email === currentUserEmail)
        );

        if (foundUser) {
          setUserDetails({
            ...foundUser,
            isAdmin: user?.isAdmin || foundUser.email === 'admin@sainistores.com'
          });
        } else {
          setUserDetails(user);
        }
      }
    } catch (err) {
      console.error('Error fetching user details:', err);
      setUserDetails(user);
    }
  };

  const pendingApprovalsCount = pendingApprovals.length;

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLanguageChange = (event) => {
    setLanguage(event.target.value);
    i18n.changeLanguage(event.target.value);
  };

  const handleUserMenuOpen = (event) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleProfile = () => {
    // Store the menu anchor before closing it
    const menuAnchor = userMenuAnchor;
    handleUserMenuClose();
    // Use the menu anchor for positioning the profile popover
    setProfileAnchorEl(menuAnchor);
  };

  const handleProfileClose = () => {
    setProfileAnchorEl(null);
  };

  const handleLogout = () => {
    handleUserMenuClose();
    onLogout && onLogout();
  };

  const handleNotificationClick = (event) => {
    setNotificationAnchorEl(event.currentTarget);
  };
  const handleNotificationClose = () => {
    setNotificationAnchorEl(null);
  };

  const handleApproveUser = async (userId) => {
    if (!userId || userId === 'anonymous' || userId === 'N/A') {
      console.error('Invalid user ID. Cannot approve this user.');
      return;
    }

    try {
      const response = await fetch(API_ENDPOINTS.USER_APPROVE(userId), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      if (response.ok) {
        // Refresh pending approvals
        fetchPendingApprovals();
        // Notify UserManagement to refresh data
        window.dispatchEvent(new CustomEvent('userApprovalChanged'));
      } else {
        const responseData = await response.json().catch(() => ({}));
        console.error('Error approving user from notification:', {
          status: response.status,
          statusText: response.statusText,
          data: responseData
        });
      }
    } catch (error) {
      console.error('Error approving user:', error);
    }
  };

  const handleRejectUser = async (userId) => {
    if (!userId || userId === 'anonymous' || userId === 'N/A') {
      console.error('Invalid user ID. Cannot reject this user.');
      return;
    }

    try {
      const response = await fetch(API_ENDPOINTS.USER_REJECT(userId), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      if (response.ok) {
        // Refresh pending approvals
        fetchPendingApprovals();
        // Notify UserManagement to refresh data
        window.dispatchEvent(new CustomEvent('userApprovalChanged'));
      } else {
        const responseData = await response.json().catch(() => ({}));
        console.error('Error rejecting user from notification:', {
          status: response.status,
          statusText: response.statusText,
          data: responseData
        });
      }
    } catch (error) {
      console.error('Error rejecting user:', error);
    }
  };
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Just now';
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`;
    return date.toLocaleDateString();
  };

  const userName = user?.name || user?.email || 'User';

  // Function to translate text using MyMemory API
  const translateBannerText = async (text, targetLang) => {
    try {
      const langMap = {
        'hi': 'hi',
        'te': 'te'
      };
      
      const targetLangCode = langMap[targetLang];
      if (!targetLangCode) return '';
      
      const response = await fetch(`${TRANSLATION_CONFIG.MYMEMORY_API}?q=${encodeURIComponent(text)}&langpair=en|${targetLangCode}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.responseStatus === 200) {
          return data.responseData.translatedText;
        }
      }
      return '';
    } catch (error) {
      console.error('Translation error:', error);
      return '';
    }
  };

  const handleBannerDialogOpen = () => {
    setBannerDialogOpen(true);
    setBannerText({ en: '', hi: '', te: '' });
    setBannerError('');
    setBannerSuccess('');
  };

  const handleBannerDialogClose = () => {
    // Clear any pending translation timeout
    if (translationTimeoutRef.current) {
      clearTimeout(translationTimeoutRef.current);
      translationTimeoutRef.current = null;
    }
    setBannerDialogOpen(false);
    setBannerText({ en: '', hi: '', te: '' });
    setBannerError('');
    setBannerSuccess('');
    setBannerTranslating(false);
  };

  const handleBannerTextChange = (lang, value) => {
    // Update the text immediately for responsive typing
    setBannerText(prev => ({ ...prev, [lang]: value }));
    
    // Auto-translate when English text is changed (debounced)
    if (lang === 'en') {
      // Clear previous timeout
      if (translationTimeoutRef.current) {
        clearTimeout(translationTimeoutRef.current);
      }
      
      // Set new timeout - translate after user stops typing for 800ms
      translationTimeoutRef.current = setTimeout(async () => {
        if (value.trim()) {
          setBannerTranslating(true);
          
          try {
            const [hindiText, teluguText] = await Promise.all([
              translateBannerText(value, 'hi'),
              translateBannerText(value, 'te')
            ]);
            
            setBannerText(current => ({
              ...current,
              en: value,
              hi: hindiText || current.hi,
              te: teluguText || current.te
            }));
          } catch (error) {
            console.error('Translation error:', error);
          } finally {
            setBannerTranslating(false);
          }
        }
      }, 800); // Wait 800ms after user stops typing
    }
  };

  const handleBannerSubmit = async () => {
    // Validate that English text is provided
    if (!bannerText.en || !bannerText.en.trim()) {
      setBannerError('Please enter banner text in English (EN)');
      return;
    }

    setBannerLoading(true);
    setBannerError('');
    setBannerSuccess('');

    try {
      const response = await fetch(API_ENDPOINTS.BANNER_TEXT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: {
            en: bannerText.en.trim(),
            hi: bannerText.hi?.trim() || '',
            te: bannerText.te?.trim() || ''
          },
          isActive: true
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setBannerSuccess('Banner text updated successfully!');
        setBannerText({ en: '', hi: '', te: '' });
        setTimeout(() => {
          handleBannerDialogClose();
        }, 1500);
      } else {
        setBannerError(data.message || data.error || 'Failed to update banner text. Please try again.');
      }
    } catch (err) {
      console.error('Error updating banner text:', err);
      setBannerError('Network error. Please try again.');
    } finally {
      setBannerLoading(false);
    }
  };

  // Fetch categories
  const fetchCategories = async () => {
    setCategoriesLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.CATEGORIES);
      if (response.ok) {
        const data = await response.json();
        const categoriesList = Array.isArray(data) ? data : (data.categories || data.data || []);
        setCategories(categoriesList);
      } else {
        console.error('Failed to fetch categories');
        setCategories([]);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const handleCategoryDialogOpen = () => {
    setCategoryDialogOpen(true);
    setCategoryName('');
    setCategoryError('');
    setCategorySuccess('');
    fetchCategories(); // Fetch categories when dialog opens
  };

  const handleCategoryDialogClose = () => {
    setCategoryDialogOpen(false);
    setCategoryName('');
    setCategoryError('');
    setCategorySuccess('');
  };

  const handleCategorySubmit = async () => {
    // Validate category name
    if (!categoryName || !categoryName.trim()) {
      setCategoryError('Please enter a category name');
      return;
    }

    setCategoryLoading(true);
    setCategoryError('');
    setCategorySuccess('');

    try {
      const response = await fetch(API_ENDPOINTS.CATEGORY_CREATE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: categoryName.trim()
        })
      });

      const data = await response.json();

      if (response.ok && (data.success || data.id || data.name)) {
        setCategorySuccess('Category created successfully!');
        setCategoryName('');
        // Refresh categories list
        await fetchCategories();
        // Notify other components to refresh categories
        window.dispatchEvent(new CustomEvent('categoryCreated'));
        setTimeout(() => {
          handleCategoryDialogClose();
        }, 1500);
      } else {
        setCategoryError(data.message || data.error || 'Failed to create category. Please try again.');
      }
    } catch (err) {
      console.error('Error creating category:', err);
      setCategoryError('Network error. Please try again.');
    } finally {
      setCategoryLoading(false);
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    if (!categoryId) {
      setCategoryError('Invalid category ID');
      return;
    }

    // Confirm deletion
    if (!window.confirm('Are you sure you want to delete this category?')) {
      return;
    }

    setDeletingCategoryId(categoryId);
    setCategoryError('');
    setCategorySuccess('');

    try {
      const response = await fetch(API_ENDPOINTS.CATEGORY_DELETE(categoryId), {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (response.ok && (data.success || data.message)) {
        setCategorySuccess('Category deleted successfully!');
        // Refresh categories list
        await fetchCategories();
        // Notify other components to refresh categories
        window.dispatchEvent(new CustomEvent('categoryCreated'));
      } else {
        setCategoryError(data.message || data.error || 'Failed to delete category. Please try again.');
      }
    } catch (err) {
      console.error('Error deleting category:', err);
      setCategoryError('Network error. Please try again.');
    } finally {
      setDeletingCategoryId(null);
    }
  };

  const navButtons = [
    { label: t('home'), icon: <HomeIcon />, path: '/' },
    // { label: t('analytics'), icon: <AnalyticsIcon />, path: '/analytics' },
    { label: t('users'), icon: <PeopleIcon />, path: '/users' },
    { label: t('add_greetings'), icon: <CelebrationIcon />, action: onAddGreetingsClick },
    { label: 'Add Banner', icon: <CampaignIcon />, action: handleBannerDialogOpen },
    { label: 'Add Category', icon: <LabelIcon />, action: handleCategoryDialogOpen },
    // Show Super Admin Dashboard link only for super admin
    ...(user?.isSuperAdmin || user?.user?.isSuperAdmin ? [
      { label: 'Super Admin', icon: <AdminPanelSettingsIcon />, path: '/super-admin' }
    ] : [])
    // User management is handled through notification bell icon
  ];

  const drawer = (
    <Box sx={{ width: 250 }}>
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold', color: theme.palette.primary.main }}>
          {appName}
        </Typography>
      </Box>
      <Divider />
      <List>
        {navButtons.map((btn, idx) => (
          <ListItem
            button
            key={btn.label}
            onClick={() => {
              setMobileOpen(false);
              btn.path ? navigate(btn.path) : btn.action && btn.action();
            }}
            selected={btn.path && location.pathname === btn.path}
            sx={btn.path && location.pathname === btn.path ? {
              backgroundColor: theme.palette.primary.main,
              color: '#fff',
              fontWeight: 700,
              '&:hover': { backgroundColor: theme.palette.primary.dark }
            } : {}}
          >
            {btn.icon}
            <ListItemText primary={btn.label} sx={{ ml: 1 }} />
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <>
      <Slide in direction="down" appear mountOnEnter unmountOnExit>
        <AppBar position="fixed" elevation={2} sx={{ backgroundColor: theme.palette.primary.main, boxShadow: theme.shadows[2] }}>
          <Toolbar>
            {isMobile && (
              <IconButton
                color="inherit"
                aria-label="open drawer"
                edge="start"
                onClick={handleDrawerToggle}
                sx={{ mr: 2 }}
              >
                <MenuIcon />
              </IconButton>
            )}
            <Typography
              variant="h6"
              component="div"
              sx={{ flexGrow: 1, fontWeight: 'bold', cursor: 'pointer', letterSpacing: 1 }}
              onClick={() => navigate('/')}
            >
              {appName}
            </Typography>
            {!isMobile && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {navButtons.map((btn, idx) => btn.path ? (
                  <Button
                    key={btn.label}
                    color="inherit"
                    startIcon={btn.icon}
                    onClick={() => navigate(btn.path)}
                    sx={{
                      fontWeight: location.pathname === btn.path ? 700 : 600,
                      color: location.pathname === btn.path ? '#111' : 'inherit',
                      borderBottom: location.pathname === btn.path ? '3px solid #111' : 'none',
                      borderRadius: 2,
                      px: 2.5,
                      py: 1.2,
                      transition: 'all 0.2s',
                      backgroundColor: location.pathname === btn.path ? 'rgba(0,0,0,0.04)' : 'transparent',
                      '&:hover': {
                        backgroundColor: theme.palette.action.hover,
                        transform: 'scale(1.05)',
                        boxShadow: theme.shadows[2],
                        color: '#111',
                      },
                    }}
                  >
                    {btn.label}
                  </Button>
                ) : (
                  <Button
                    key={btn.label}
                    color="inherit"
                    startIcon={btn.icon}
                    onClick={btn.action}
                    sx={{ fontWeight: 600, borderRadius: 2, px: 2.5, py: 1.2, transition: 'all 0.2s', '&:hover': { backgroundColor: theme.palette.action.hover, transform: 'scale(1.05)', boxShadow: theme.shadows[2] } }}
                  >
                    {btn.label}
                  </Button>
                ))}
              </Box>
            )}
            <FormControl size="small" sx={{ minWidth: 100, mx: 2 }}>
              <Select
                value={language}
                onChange={handleLanguageChange}
                sx={{
                  color: 'white',
                  '& .MuiSelect-icon': { color: 'white' },
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' }
                }}
              >
                <MenuItem value="en">English</MenuItem>
                <MenuItem value="hi">हिंदी</MenuItem>
                <MenuItem value="te">తెలుగు</MenuItem>
              </Select>
            </FormControl>
            {user?.isAdmin && (
              <Grow in timeout={600}>
                <IconButton color="inherit" sx={{ mx: 1 }} onClick={handleNotificationClick}>
                  <Badge badgeContent={pendingApprovalsCount} color="error">
                    <NotificationsIcon />
                  </Badge>
                </IconButton>
              </Grow>
            )}
            {/* User Name Chip */}
            <Chip
              icon={<PersonIcon />}
              label={userName}
              onClick={handleUserMenuOpen}
              sx={{
                backgroundColor: 'rgba(255,255,255,0.1)',
                color: 'white',
                fontWeight: 600,
                ml: 1,
                cursor: 'pointer',
                '&:hover': { backgroundColor: 'rgba(255,255,255,0.2)' }
              }}
            />
            <Menu
              anchorEl={userMenuAnchor}
              open={Boolean(userMenuAnchor)}
              onClose={handleUserMenuClose}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
              <MenuItem onClick={handleProfile}>Profile</MenuItem>
              <MenuItem onClick={handleLogout}>Logout</MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>
      </Slide>
      <Slide in={mobileOpen} direction="right" mountOnEnter unmountOnExit>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 250 },
          }}
        >
          {drawer}
        </Drawer>
      </Slide>
      {/* Toolbar spacer for fixed AppBar */}
      <Toolbar />
      {user?.isAdmin && (
        <Popover
          open={notificationOpen}
          anchorEl={notificationAnchorEl}
          onClose={handleNotificationClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          PaperProps={{
            sx: {
              width: 400,
              maxHeight: 500,
              mt: 2,
              boxShadow: 4,
              borderRadius: 3
            }
          }}
        >
          <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <NotificationsIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                Notifications
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              {pendingApprovalsCount} pending approvals
            </Typography>
          </Box>
          <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <WarningAmberIcon color="warning" />
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                Pending Approvals ({pendingApprovalsCount})
              </Typography>
            </Box>
            <List
              sx={{
                p: 0,
                maxHeight: 260,
                overflowY: 'auto',
                pr: 1,
                // Hide scrollbar for Chrome, Safari and Opera
                '&::-webkit-scrollbar': {
                  width: '6px',
                  background: 'transparent',
                },
                '&::-webkit-scrollbar-thumb': {
                  background: '#e0e0e0',
                  borderRadius: '8px',
                },
                // Hide scrollbar for IE, Edge and Firefox
                scrollbarWidth: 'thin',
                scrollbarColor: '#e0e0e0 transparent',
              }}
            >
              {pendingApprovals.map((user) => {
                // Construct user name from firstName and lastName
                const firstName = user.firstName || '';
                const lastName = user.lastName || '';
                const userName = (firstName && lastName) 
                  ? `${firstName} ${lastName}`.trim()
                  : firstName || lastName || user.name || 'Unknown User';
                
                // Get mobile number
                const mobile = user.mobile || 'N/A';
                
                // Get initials for avatar
                const getInitials = () => {
                  if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase();
                  if (userName && userName !== 'Unknown User') return userName[0].toUpperCase();
                  if (user.email) return user.email[0].toUpperCase();
                  return '?';
                };
                
                return (
                  <ListItem key={user.id} sx={{ flexDirection: 'column', alignItems: 'flex-start', p: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', mb: 1 }}>
                      <ListItemAvatar>
                        <Avatar>{getInitials()}</Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={userName}
                        secondary={`+91 ${mobile}`}
                      />
                      <Chip label="Pending" color="warning" size="small" />
                    </Box>
                  <Box sx={{ display: 'flex', gap: 1, width: '100%', justifyContent: 'flex-end' }}>
                    <Button
                      size="small"
                      variant="contained"
                      color="success"
                      startIcon={<CheckCircleIcon />}
                      onClick={() => handleApproveUser(user.id)}
                      sx={{ minWidth: 'auto', px: 1 }}
                    >
                      Approve
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      color="error"
                      startIcon={<CancelIcon />}
                      onClick={() => handleRejectUser(user.id)}
                      sx={{ minWidth: 'auto', px: 1 }}
                    >
                      Reject
                    </Button>
                  </Box>
                </ListItem>
                );
              })}
            </List>
          </Box>
        </Popover>
      )}
      {/* Profile Popover */}
      <Popover
        open={profileOpen}
        anchorEl={profileAnchorEl}
        onClose={handleProfileClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          sx: {
            width: 350,
            maxWidth: '90vw',
            mt: 2,
            boxShadow: 4,
            borderRadius: 3,
            overflow: 'hidden'
          }
        }}
      >
        {userDetails ? (() => {
          const displayUser = userDetails;
          const userId = displayUser.id || displayUser.userId;
          const email = displayUser.email || displayUser.user?.email || displayUser.userName;
          const mobile = displayUser.mobile || displayUser.user?.mobile || '9000022066';
          const firstName = displayUser.firstName || displayUser.user?.firstName || '';
          const lastName = displayUser.lastName || displayUser.user?.lastName || '';
          const fullName = firstName && lastName ? `${firstName} ${lastName}` : (displayUser.name || email || 'User');
          const status = displayUser.status || displayUser.user?.status || (displayUser.isAdmin ? 'APPROVED' : 'PENDING');
          const isAdmin = displayUser.isAdmin || email === 'admin@sainistores.com';
          const createdAt = displayUser.createdAt || displayUser.user?.createdAt;
          
          const getInitials = () => {
            if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase();
            if (fullName && fullName !== email) return fullName[0].toUpperCase();
            if (email) return email[0].toUpperCase();
            return 'U';
          };

          const formatPhoneNumber = (phone) => {
            if (!phone) return '90000 22066';
            const clean = phone.toString().replace(/\D/g, '');
            if (clean === '7013269136') return '90000 22066';
            if (clean.length === 10) {
              return `${clean.slice(0, 5)} ${clean.slice(5)}`;
            }
            return phone;
          };

          const getStatusChip = () => {
            switch (status?.toUpperCase()) {
              case 'APPROVED':
                return <Chip icon={<VerifiedUserIcon />} label="Approved" color="success" size="small" />;
              case 'PENDING':
                return <Chip icon={<PendingIcon />} label="Pending" color="warning" size="small" />;
              case 'REJECTED':
                return <Chip icon={<BlockIcon />} label="Rejected" color="error" size="small" />;
              default:
                return <Chip label={status || 'Unknown'} size="small" />;
            }
          };

          return (
            <Box>
              {/* Profile Header */}
              <Box sx={{ p: 3, background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`, color: 'white' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Avatar sx={{ width: 60, height: 60, bgcolor: 'rgba(255,255,255,0.2)', fontSize: '1.5rem', fontWeight: 'bold' }}>
                    {getInitials()}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                      {fullName}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
                      {isAdmin && (
                        <Chip icon={<AdminPanelSettingsIcon />} label="Admin" size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontSize: '0.7rem' }} />
                      )}
                      {getStatusChip()}
                    </Box>
                  </Box>
                </Box>
              </Box>

              {/* Profile Details */}
              <Box sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <EmailIcon color="primary" fontSize="small" />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Email
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {email || 'N/A'}
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <PhoneIcon color="primary" fontSize="small" />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Mobile
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        +91 {formatPhoneNumber(mobile)}
                      </Typography>
                    </Box>
                  </Box>

                  {firstName && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <PersonIcon color="primary" fontSize="small" />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          Name
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {firstName} {lastName}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                </Box>
              </Box>
            </Box>
          );
        })() : (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <CircularProgress size={24} />
            <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
              Loading profile...
            </Typography>
          </Box>
        )}
      </Popover>
      
      {/* Add Banner Dialog */}
      <Dialog 
        open={bannerDialogOpen} 
        onClose={handleBannerDialogClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CampaignIcon color="primary" />
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              Add Banner Text
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {bannerError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setBannerError('')}>
              {bannerError}
            </Alert>
          )}
          {bannerSuccess && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setBannerSuccess('')}>
              {bannerSuccess}
            </Alert>
          )}
          <Box sx={{ mb: 2, p: 1.5, bgcolor: 'info.light', borderRadius: 1, border: '1px solid', borderColor: 'info.main' }}>
            <Typography variant="body2" sx={{ color: 'info.contrastText', fontSize: 13 }}>
              💡 <strong>Auto-translation:</strong> When you enter banner text in English, it will automatically translate to Hindi and Telugu.
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Banner Text (EN) *"
              multiline
              rows={3}
              fullWidth
              value={bannerText.en}
              onChange={(e) => handleBannerTextChange('en', e.target.value)}
              placeholder="Enter banner text in English..."
              disabled={bannerLoading}
              required
              InputProps={{
                endAdornment: bannerTranslating && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
                    <CircularProgress size={16} />
                    <Typography variant="caption" sx={{ ml: 0.5, color: 'text.secondary' }}>
                      Translating...
                    </Typography>
                  </Box>
                )
              }}
            />
            <TextField
              label="Banner Text (HI)"
              multiline
              rows={3}
              fullWidth
              value={bannerText.hi}
              onChange={(e) => handleBannerTextChange('hi', e.target.value)}
              placeholder="Enter banner text in Hindi (auto-translated)..."
              disabled={bannerLoading || bannerTranslating}
            />
            <TextField
              label="Banner Text (TE)"
              multiline
              rows={3}
              fullWidth
              value={bannerText.te}
              onChange={(e) => handleBannerTextChange('te', e.target.value)}
              placeholder="Enter banner text in Telugu (auto-translated)..."
              disabled={bannerLoading || bannerTranslating}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleBannerDialogClose}
            disabled={bannerLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleBannerSubmit}
            variant="contained"
            color="primary"
            disabled={bannerLoading || !bannerText.en?.trim() || bannerTranslating}
          >
            {bannerLoading ? 'Updating...' : 'Update Banner'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Add Category Dialog */}
      <Dialog 
        open={categoryDialogOpen} 
        onClose={handleCategoryDialogClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LabelIcon color="primary" />
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              Add Category
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {categoryError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setCategoryError('')}>
              {categoryError}
            </Alert>
          )}
          {categorySuccess && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setCategorySuccess('')}>
              {categorySuccess}
            </Alert>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Category Type"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="Enter category name (e.g., Nuts, Dried Fruits, etc.)"
              fullWidth
              disabled={categoryLoading}
              required
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !categoryLoading && categoryName.trim()) {
                  handleCategorySubmit();
                }
              }}
            />
            
            {/* Display existing categories */}
            {categories.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: 'text.secondary' }}>
                  Existing Categories:
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: 200, overflowY: 'auto' }}>
                  {categories.map((category) => (
                    <Box
                      key={category.id || category.name}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        p: 1.5,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        backgroundColor: 'background.paper',
                        '&:hover': {
                          backgroundColor: 'action.hover'
                        }
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {category.name || category}
                      </Typography>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteCategory(category.id)}
                        disabled={deletingCategoryId === category.id || categoryLoading}
                        sx={{
                          '&:hover': {
                            backgroundColor: 'error.light',
                            color: 'error.contrastText'
                          }
                        }}
                      >
                        {deletingCategoryId === category.id ? (
                          <CircularProgress size={20} />
                        ) : (
                          <DeleteIcon fontSize="small" />
                        )}
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
            
            {categoriesLoading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <CircularProgress size={24} />
              </Box>
            )}
            
            {!categoriesLoading && categories.length === 0 && (
              <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic', textAlign: 'center', py: 2 }}>
                No categories created yet
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleCategoryDialogClose}
            disabled={categoryLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCategorySubmit}
            variant="contained"
            color="primary"
            disabled={categoryLoading || !categoryName?.trim()}
          >
            {categoryLoading ? 'Creating...' : 'Create Category'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default Header; 
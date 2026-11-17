import React, { useMemo, useState, useEffect } from 'react';
import { Box, Typography, IconButton, Tooltip, TextField, Button, Alert, Snackbar } from '@mui/material';
import { MaterialReactTable } from 'material-react-table';
import { CheckCircle, Cancel, Download } from '@mui/icons-material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format } from 'date-fns';
import { API_ENDPOINTS } from './config.js';
import * as XLSX from 'xlsx';

// helper: format seconds → hh:mm:ss
const formatTime = (seconds) => {
  if (!seconds || seconds <= 0) return '0s';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h ? h + 'h ' : ''}${m ? m + 'm ' : ''}${s ? s + 's' : ''}`.trim();
};

const formatDate = (date) => format(date, 'dd/MM/yyyy');

const UserManagement = () => {
  // Load approval status from localStorage on mount
  const [approvalStatus, setApprovalStatus] = useState(() => {
    try {
      const saved = localStorage.getItem('userApprovalStatus');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedRange, setSelectedRange] = useState('1d');
  const [data, setData] = useState([]);   
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Save approval status to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('userApprovalStatus', JSON.stringify(approvalStatus));
    } catch (e) {
      console.error('Error saving approval status to localStorage:', e);
    }
  }, [approvalStatus]);

  const rangeOptions = [
    { label: '1D', value: '1d' },
    { label: '1W', value: '1w' },
    { label: '1M', value: '1m' },
    { label: '3M', value: '3m' },
    { label: '6M', value: '6m' },
  ];

  // Fetch user data including pending approvals
  const fetchUserData = async (targetDate = selectedDate, range = selectedRange) => {
    try {
      setLoading(true);
      
      // fetch user details from /api/users to get firstName and lastName
      let usersData = [];
      try {
        const usersRes = await fetch(API_ENDPOINTS.USERS);
        usersData = await usersRes.json();
        if (!Array.isArray(usersData)) {
          usersData = [];
        }
      } catch (usersErr) {
        console.warn('Could not fetch users:', usersErr);
      }
      
      // fetch summaries from the API
      const summaryRes = await fetch(API_ENDPOINTS.USER_SUMMARY);
      const summaryJson = await summaryRes.json();

      // fetch sessions (if available)
      let sessionsJson = { success: true, sessions: [] };
      try {
        const sessionsRes = await fetch(API_ENDPOINTS.USER_SESSIONS);
        sessionsJson = await sessionsRes.json();
      } catch (sessionErr) {
        console.warn('Could not fetch sessions:', sessionErr);
      }

      // fetch pending approvals
      let pendingJson = [];
      try {
        const pendingRes = await fetch(API_ENDPOINTS.USERS_PENDING);
        pendingJson = await pendingRes.json();
      } catch (pendingErr) {
        console.warn('Could not fetch pending approvals:', pendingErr);
      }

      // Calculate date range based on selected date and range
        const startDate = new Date(targetDate);
        const endDate = new Date(targetDate);
        
        // Adjust end date based on range
        switch (range) {
          case '1d':
            // Single day - start and end date are the same
            break;
          case '1w':
            // 7 days from selected date
            endDate.setDate(startDate.getDate() + 6);
            break;
          case '1m':
            // 1 month from selected date
            endDate.setMonth(startDate.getMonth() + 1);
            endDate.setDate(startDate.getDate() - 1);
            break;
          case '3m':
            // 3 months from selected date
            endDate.setMonth(startDate.getMonth() + 3);
            endDate.setDate(startDate.getDate() - 1);
            break;
          case '6m':
            // 6 months from selected date
            endDate.setMonth(startDate.getMonth() + 6);
            endDate.setDate(startDate.getDate() - 1);
            break;
          default:
            break;
        }

        // Format dates for comparison (YYYY-MM-DD)
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];

        console.log(`Filtering sessions from ${startDateStr} to ${endDateStr} for range: ${range}`);

        // Start with all users from /api/users and merge summary data
        // Only show users that exist in the users table (from /api/users)
        const allUsersMap = new Map();
        
        // First, add all users from /api/users (these are the actual users in the database)
        usersData.forEach(userDetail => {
          const mobile = String(userDetail.mobile || '').replace(/\D/g, '');
          
          // Create user object with data from /api/users
          const user = {
            id: userDetail.id,
            userId: userDetail.id,
            userMobile: userDetail.mobile,
            userEmail: null, // Will be filled from summary if available
            userGstNumber: userDetail.gstNumber,
            firstName: userDetail.firstName,
            lastName: userDetail.lastName,
            status: userDetail.status,
            createdAt: userDetail.createdAt,
            // Summary data will be merged below
            totalTimeSpent: 0,
            totalTimeFormatted: '0s',
            totalSessions: 0
          };

          if (mobile) {
            allUsersMap.set(mobile, user);
          }
          if (userDetail.id != null) {
            allUsersMap.set(`id_${userDetail.id}`, user);
          }
          if (!mobile && userDetail.id == null) {
            allUsersMap.set(`user_${allUsersMap.size}`, user);
          }
        });

        // Merge summary data into users (only for users that exist in /api/users)
        if (summaryJson.success && Array.isArray(summaryJson.users)) {
          summaryJson.users.forEach(summaryUser => {
            const mobile = String(summaryUser.userMobile || '').replace(/\D/g, '');
            const summaryUserId = summaryUser.userId == null ? '' : String(summaryUser.userId);
            const existingUser = (mobile && allUsersMap.get(mobile)) ||
              (summaryUserId && (
                allUsersMap.get(`id_${summaryUserId}`) ||
                allUsersMap.get(summaryUserId)
              ));
            
            // Only merge if user exists in /api/users (don't add new users from summary)
            if (existingUser) {
              // Merge summary data
              existingUser.totalTimeSpent = summaryUser.totalTimeSpent || 0;
              existingUser.totalTimeFormatted = summaryUser.totalTimeFormatted || '0s';
              existingUser.totalSessions = summaryUser.totalSessions || 0;
              existingUser.lastSessionFormatted = summaryUser.lastSessionFormatted;
              if (summaryUser.userEmail) {
                existingUser.userEmail = summaryUser.userEmail;
              }
            }
            // Note: We don't add users from summary if they don't exist in /api/users
            // This ensures we only show users that are actually in the database
          });
        }
        
        // Convert map to array - only users from /api/users (actual database users)
        const uniqueUsers = Array.from(new Set(allUsersMap.values()));

        const transformed = uniqueUsers.map((user, index) => {
          // Construct userName from firstName and lastName (already in user object)
          const firstName = user.firstName || '';
          const lastName = user.lastName || '';
          const userName = (firstName && lastName) 
            ? `${firstName} ${lastName}`.trim()
            : firstName || lastName || user.userName || 'Unknown User';
          
          // Get GST number
          const gstNumber = user.userGstNumber || user.gstNumber || 'N/A';
          
          // Get mobile number
          const userMobile = user.userMobile || user.mobile || 'N/A';
          
          const userSessions = (Array.isArray(sessionsJson.sessions) ? sessionsJson.sessions : []).filter((s) => {
            const sessionUserId = s.userId == null ? '' : String(s.userId);
            const userId = user.userId == null ? '' : String(user.userId);
            const sessionMobile = String(s.userMobile || '').replace(/\D/g, '');
            const userMobile = String(user.userMobile || '').replace(/\D/g, '');
            const sessionEmail = String(s.userEmail || '').toLowerCase();
            const userEmail = String(user.userEmail || '').toLowerCase();

            return (sessionUserId && sessionUserId === userId) ||
              (sessionMobile && sessionMobile === userMobile) ||
              (sessionEmail && sessionEmail === userEmail);
          });

          const getSessionDuration = (session) => parseInt(session.sessionDuration, 10) || 0;
          const totalSessionSeconds = userSessions.reduce(
            (sum, session) => sum + getSessionDuration(session),
            0
          );

          // Filter this user's sessions for the selected date range.
          const rangeSessions = userSessions.filter((s) => {
            
            const sessionDate = s.sessionStart?.split('T')[0] || s.lastSessionDate?.split('T')[0];
            if (!sessionDate) return false;
            return sessionDate >= startDateStr && sessionDate <= endDateStr;
          });

          // sum session durations for the selected range
          const rangeSeconds = rangeSessions.reduce((sum, s) => {
            return sum + getSessionDuration(s);
          }, 0);
          const summaryTotalSeconds = Number(user.totalTimeSpent);
          const totalTimeSpent = summaryTotalSeconds > 0
            ? (user.totalTimeFormatted && user.totalTimeFormatted !== '0s'
              ? user.totalTimeFormatted
              : formatTime(summaryTotalSeconds))
            : formatTime(totalSessionSeconds);

          // Check if user is in pending approvals (match by mobile, email, or id)
          const pendingUser = Array.isArray(pendingJson) ? 
            pendingJson.find(p => 
              (p.mobile && userMobile && p.mobile === userMobile) ||
              (p.email && user.userEmail && p.email === user.userEmail) ||
              (p.id && user.id && p.id === user.id) ||
              (p.id && user.userId && p.id === user.userId)
            ) : null;

          return {
            id: user.id || user.userId || `user_${index + 1}`, 
            userId: user.id || user.userId, 
            userName: userName, 
            userMobile: userMobile, 
            userEmail: user.userEmail || userMobile || 'N/A',
            userGstNumber: gstNumber, 
            todaysTimeSpent: formatTime(rangeSeconds || 0),
            totalTimeSpent,
            isPending: !!pendingUser || (user.status === 'PENDING'),
            pendingId: pendingUser?.id || (user.status === 'PENDING' ? (user.id || user.userId) : null), // Store pending approval ID if exists
            rangeSeconds: rangeSeconds, // Store raw seconds for sorting/filtering
            sessionCount: rangeSessions.length, // Number of sessions in range
            totalSessions: user.totalSessions || 0, // Total sessions from API
            lastSession: user.lastSessionFormatted || 'Never',
            createdAt: user.createdAt
          };
        });

        // Filter out users with no activity in the selected range (optional)
        // Uncomment the next line if you want to show only users with activity
        // const filteredData = transformed.filter(user => user.rangeSeconds > 0);
        
        // For now, show all users but sort by activity
        const sortedData = transformed.sort((a, b) => b.rangeSeconds - a.rangeSeconds);

        setData(sortedData);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
    
    // Listen for approval/rejection events from Header notifications
    const handleApprovalChange = () => {
      fetchUserData();
    };
    
    window.addEventListener('userApprovalChanged', handleApprovalChange);
    
    return () => {
      window.removeEventListener('userApprovalChanged', handleApprovalChange);
    };
  }, []);

  // Handle date change
  const handleDateChange = (newDate) => {
    setSelectedDate(newDate);
    setLoading(true);
    fetchUserData(newDate, selectedRange);
  };

  // Handle range change
  const handleRangeChange = (newRange) => {
    setSelectedRange(newRange);
    setLoading(true);
    fetchUserData(selectedDate, newRange);
  };

  const handleApproveUser = async (userId) => {
    if (!userId || userId === 'anonymous' || userId === 'N/A') {
      setErrorMessage('Invalid user ID. Cannot approve this user.');
      return;
    }

    try {
      const url = API_ENDPOINTS.USER_APPROVE(userId);
      console.log('Approving user with URL:', url);
      console.log('User ID:', userId);

      // Try with empty body object first - some APIs require body even if empty
      const response = await fetch(url, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });

      const responseData = await response.json().catch(() => ({}));
      
      if (response.ok) {
        const newStatus = { ...approvalStatus, [userId]: 'approved' };
        setApprovalStatus(newStatus);
        // Save to localStorage immediately
        try {
          localStorage.setItem('userApprovalStatus', JSON.stringify(newStatus));
        } catch (e) {
          console.error('Error saving to localStorage:', e);
        }
        setSuccessMessage(`User approved successfully`);
        // Refresh data to update pending status
        await fetchUserData();
        // Notify Header to refresh notifications
        window.dispatchEvent(new CustomEvent('userApprovalChanged'));
      } else {
        console.error('Approve error - Full response data:', JSON.stringify(responseData, null, 2));
        const errorMsg = responseData.error || responseData.message || responseData.detail || `Failed to approve user. Status: ${response.status}`;
        console.error('Approve error response:', {
          status: response.status,
          statusText: response.statusText,
          data: responseData
        });
        setErrorMessage(errorMsg);
      }
    } catch (error) {
      console.error('Error approving user:', error);
      setErrorMessage(`Network error: ${error.message || 'Failed to approve user'}`);
    }
  };

  const handleRejectUser = async (userId) => {
    if (!userId || userId === 'anonymous' || userId === 'N/A') {
      setErrorMessage('Invalid user ID. Cannot reject this user.');
      return;
    }

    try {
      const url = API_ENDPOINTS.USER_REJECT(userId);
      console.log('Rejecting user with URL:', url);
      console.log('User ID:', userId);

      // Try with empty body object first - some APIs require body even if empty
      const response = await fetch(url, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });

      const responseData = await response.json().catch(() => ({}));
      
      if (response.ok) {
        const newStatus = { ...approvalStatus, [userId]: 'rejected' };
        setApprovalStatus(newStatus);
        // Save to localStorage immediately
        try {
          localStorage.setItem('userApprovalStatus', JSON.stringify(newStatus));
        } catch (e) {
          console.error('Error saving to localStorage:', e);
        }
        setSuccessMessage(`User rejected successfully`);
        // Refresh data to update pending status
        await fetchUserData();
        // Notify Header to refresh notifications
        window.dispatchEvent(new CustomEvent('userApprovalChanged'));
      } else {
        console.error('Reject error - Full response data:', JSON.stringify(responseData, null, 2));
        const errorMsg = responseData.error || responseData.message || responseData.detail || `Failed to reject user. Status: ${response.status}`;
        console.error('Reject error response:', {
          status: response.status,
          statusText: response.statusText,
          data: responseData
        });
        setErrorMessage(errorMsg);
      }
    } catch (error) {
      console.error('Error rejecting user:', error);
      setErrorMessage(`Network error: ${error.message || 'Failed to reject user'}`);
    }
  };

  // Function to generate dynamic header text based on selected range and date
  const getTimeSpentHeader = () => {
    const today = new Date();
    const isToday = selectedDate.toDateString() === today.toDateString();
    
    switch (selectedRange) {
      case '1d':
        return isToday ? "Today's Time Spent" : `${formatDate(selectedDate)} Time Spent`;
      case '1w':
        return "1 Week Time Spent";
      case '1m':
        return "1 Month Time Spent";
      case '3m':
        return "3 Months Time Spent";
      case '6m':
        return "6 Months Time Spent";
      default:
        return "Time Spent";
    }
  };

  // Function to download table data as Excel
  const handleDownloadExcel = () => {
    try {
      // Calculate date range
      const endDate = new Date(selectedDate);
      switch (selectedRange) {
        case '1w': endDate.setDate(endDate.getDate() + 6); break;
        case '1m': endDate.setMonth(endDate.getMonth() + 1); endDate.setDate(endDate.getDate() - 1); break;
        case '3m': endDate.setMonth(endDate.getMonth() + 3); endDate.setDate(endDate.getDate() - 1); break;
        case '6m': endDate.setMonth(endDate.getMonth() + 6); endDate.setDate(endDate.getDate() - 1); break;
        default: break;
      }
      
      // Generate date string for filename
      const dateStr = new Date().toISOString().split('T')[0];
      
      // Prepare header row
      const timeSpentHeader = getTimeSpentHeader();
      const headers = [
        'S. No.',
        'User Name',
        'Mobile',
        'GST Number',
        timeSpentHeader,
        'Total Time Spent',
        'Status'
      ];
      
      // Prepare data rows
      const rows = data.map((user, index) => {
        // Get approval status
        const userId = user.pendingId || user.userId;
        let status = 'No Action';
        if (user.isPending) {
          status = 'Pending';
        } else if (approvalStatus[userId] === 'approved') {
          status = 'Approved';
        } else if (approvalStatus[userId] === 'rejected') {
          status = 'Rejected';
        }
        
        // Format time spent with session count
        const timeSpent = user.todaysTimeSpent;
        const sessionCount = user.sessionCount;
        const timeSpentWithSessions = sessionCount > 0 
          ? `${timeSpent} (${sessionCount} sessions)`
          : timeSpent;
        
        return [
          index + 1,
          user.userName || 'N/A',
          user.userMobile || 'N/A',
          user.userGstNumber || 'N/A',
          timeSpentWithSessions,
          user.totalTimeSpent || '0s',
          status
        ];
      });
      
      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      
      // Add metadata rows (title and date range)
      const dateRangeText = `Date Range: ${formatDate(selectedDate)}${selectedRange !== '1d' ? ` - ${formatDate(endDate)}` : ''} (${selectedRange.toUpperCase()})`;
      const metadata = [
        ['User Management Report'],
        [dateRangeText],
        [], // Empty row
        headers // Header row
      ];
      
      // Combine metadata and data
      const allData = [...metadata, ...rows];
      
      // Create worksheet
      const ws = XLSX.utils.aoa_to_sheet(allData);
      
      // Set column widths for better readability
      ws['!cols'] = [
        { wch: 8 },   // S. No.
        { wch: 20 },  // User Name
        { wch: 15 },  // Mobile
        { wch: 18 },  // GST Number
        { wch: 25 },  // Time Spent
        { wch: 18 },  // Total Time Spent
        { wch: 12 }   // Status
      ];
      
      // Merge cells for title and date range
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }, // Title row
        { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } }  // Date range row
      ];
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'User Management');
      
      // Generate Excel file
      const fileName = `User_Management_Report_${dateStr}_${selectedRange.toUpperCase()}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      setSuccessMessage('Excel file downloaded successfully!');
    } catch (error) {
      console.error('Error generating Excel file:', error);
      setErrorMessage('Failed to download Excel file. Please try again.');
    }
  };

  const columns = useMemo(
    () => [
      {
        header: 'S. No.',
        id: 'serial',
        size: 80,
        Cell: ({ row }) => row.index + 1,
      },
      { accessorKey: 'userName', header: 'User Name', size: 200 },
      { accessorKey: 'userMobile', header: 'Mobile', size: 150 },
      { accessorKey: 'userGstNumber', header: 'GST Number', size: 200 },
      { 
        accessorKey: 'todaysTimeSpent', 
        header: getTimeSpentHeader(),
        size: 150,
        Cell: ({ row }) => {
          const timeSpent = row.original.todaysTimeSpent;
          const sessionCount = row.original.sessionCount;
          return (
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Typography variant="body2">{timeSpent}</Typography>
              {sessionCount > 0 && (
                <Typography variant="caption" color="text.secondary">
                  ({sessionCount} sessions)
                </Typography>
              )}
            </Box>
          );
        }
      },
      { accessorKey: 'totalTimeSpent', header: 'Total Time Spent', size: 150 },
      {
        header: 'Approvals',
        id: 'approvals',
        size: 200,
        Cell: ({ row }) => {
          const user = row.original;
          const userId = user.pendingId || user.userId; // Use pending ID if available, otherwise user ID
          const isPending = user.isPending;
          
          // Determine status: prioritize isPending from API, then check localStorage approvalStatus
          let status = null;
          if (isPending) {
            status = 'pending';
          } else {
            // Check approval status from localStorage/state
            status = approvalStatus[userId] || null;
          }

          return (
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              '& > .MuiTypography-root': { minWidth: 90, flexShrink: 0 }
            }}>
              {status === 'pending' ? (
                <>
                  <Typography variant="body2" color="warning.main" sx={{ fontWeight: 'bold' }}>
                    Pending
                  </Typography>
                  <Tooltip title="Approve">
                    <IconButton 
                      size="small" 
                      color="success" 
                      onClick={() => handleApproveUser(userId)} 
                      sx={{ p: 0.5 }}
                    >
                      <CheckCircle fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Reject">
                    <IconButton 
                      size="small" 
                      color="error" 
                      onClick={() => handleRejectUser(userId)} 
                      sx={{ p: 0.5 }}
                    >
                      <Cancel fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </>
              ) : status === 'approved' ? (
                <>
                  <Typography variant="body2" color="success.main" sx={{ fontWeight: 'bold' }}>
                    Approved
                  </Typography>
                  <Tooltip title="Cancel Approval">
                    <IconButton 
                      size="small" 
                      color="error" 
                      onClick={() => handleRejectUser(userId)} 
                      sx={{ p: 0.5 }}
                    >
                      <Cancel fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </>
              ) : status === 'rejected' ? (
                <>
                  <Typography variant="body2" color="error.main" sx={{ fontWeight: 'bold' }}>
                    Rejected
                  </Typography>
                  <Tooltip title="Approve">
                    <IconButton 
                      size="small" 
                      color="success" 
                      onClick={() => handleApproveUser(userId)} 
                      sx={{ p: 0.5 }}
                    >
                      <CheckCircle fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </>
              ) : (
                <>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                    No Action
                  </Typography>
                  <Tooltip title="Approve">
                    <IconButton 
                      size="small" 
                      color="success" 
                      onClick={() => handleApproveUser(userId)} 
                      sx={{ p: 0.5 }}
                    >
                      <CheckCircle fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Reject">
                    <IconButton 
                      size="small" 
                      color="error" 
                      onClick={() => handleRejectUser(userId)} 
                      sx={{ p: 0.5 }}
                    >
                      <Cancel fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </>
              )}
            </Box>
          );
        },
      },
    ],
    [approvalStatus, selectedRange, selectedDate] // Added dependencies here
  );

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main', mb: 2}}>
        User Management
      </Typography>

      {/* Error and Success Messages */}
      <Snackbar
        open={!!errorMessage}
        autoHideDuration={6000}
        onClose={() => setErrorMessage('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert onClose={() => setErrorMessage('')} severity="error" sx={{ width: '100%' }}>
          {errorMessage}
        </Alert>
      </Snackbar>
      <Snackbar
        open={!!successMessage}
        autoHideDuration={4000}
        onClose={() => setSuccessMessage('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert onClose={() => setSuccessMessage('')} severity="success" sx={{ width: '100%' }}>
          {successMessage}
        </Alert>
      </Snackbar>
      
      {/* Date Picker */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <DatePicker
            label="Select Date"
            value={selectedDate}
            onChange={handleDateChange}
            format="dd/MM/yyyy"
            slotProps={{
              textField: { size: 'small', sx: { minWidth: 150 } }
            }}
          />
        </LocalizationProvider>
      </Box>

      {/* Date Range Buttons */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
        {rangeOptions.map(opt => (
          <Button
            key={opt.value}
            variant={selectedRange === opt.value ? 'contained' : 'outlined'}
            size="small"
            sx={{ 
              minWidth: 48, 
              fontWeight: 'bold', 
              borderRadius: 2,
              textTransform: 'none'
            }}
            onClick={() => handleRangeChange(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
      </Box>

      {/* Date Range Display and Download Button */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ p: 2, backgroundColor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider', flex: 1 }}>
          <Typography variant="body2" color="text.secondary">
            <strong>Showing data for:</strong> {formatDate(selectedDate)}
            {selectedRange !== '1d' && (
              <span> to {(() => {
                const endDate = new Date(selectedDate);
                switch (selectedRange) {
                  case '1w': endDate.setDate(endDate.getDate() + 6); break;
                  case '1m': endDate.setMonth(endDate.getMonth() + 1); endDate.setDate(endDate.getDate() - 1); break;
                  case '3m': endDate.setMonth(endDate.getMonth() + 3); endDate.setDate(endDate.getDate() - 1); break;
                  case '6m': endDate.setMonth(endDate.getMonth() + 6); endDate.setDate(endDate.getDate() - 1); break;
                  default: break;
                }
                return formatDate(endDate);
              })()}
            </span>
            )}
            <span style={{ marginLeft: 8, color: 'primary.main', fontWeight: 'bold' }}>
              ({selectedRange.toUpperCase()} range)
            </span>
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<Download />}
          onClick={handleDownloadExcel}
          disabled={loading || data.length === 0}
          sx={{
            fontWeight: 600,
            borderRadius: 2,
            px: 3,
            py: 1.2,
            textTransform: 'none',
            boxShadow: 2,
            '&:hover': {
              boxShadow: 4,
            }
          }}
        >
          Download Excel
        </Button>
      </Box>
      
      <MaterialReactTable
        columns={columns}
        data={data}
        state={{ isLoading: loading }}
        enablePagination={false}
        initialState={{ density: 'compact' }}
        muiTableBodyRowProps={{
          sx: {
            '&:nth-of-type(odd)': { backgroundColor: 'background.default' },
            '&:nth-of-type(even)': { backgroundColor: 'background.paper' },
            '&:hover': {
              backgroundColor: 'rgba(46,125,50,0.08)',
              transition: 'background 0.2s',
            },
          },
        }}
        muiTableHeadCellProps={{
          sx: {
            backgroundColor: 'primary.main',
            color: 'primary.contrastText',
            fontWeight: 700,
            position: 'sticky',
            top: 0,
            zIndex: 1,
          },
        }}
      />
    </Box>
  );
};

export default UserManagement;

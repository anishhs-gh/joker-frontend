import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Box,
  ThemeProvider,
  createTheme,
  IconButton,
  Menu,
  MenuItem,
  Typography,
  Divider,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Alert,
  Tooltip,
  CircularProgress,
  TextField,
} from '@mui/material';
import { deepOrange } from '@mui/material/colors';
import LogoutIcon from '@mui/icons-material/Logout';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LockIcon from '@mui/icons-material/Lock';
import VerifiedIcon from '@mui/icons-material/Verified';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import EmailIcon from '@mui/icons-material/Email';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { authApi } from '../services/api';

const navTheme = createTheme({
  palette: {
    primary: {
      main: '#ffffff',
    },
  },
});

const formatTokenDate = (timestamp: number | null | undefined): string => {
  if (!timestamp) return 'Never generated';
  return new Date(timestamp).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout, regenerateToken, updateUserName } = useAuth();
  const { showError, showSuccess } = useNotification();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);

  // Regenerate token dialog state
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  // Token display modal state
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [newApiToken, setNewApiToken] = useState('');
  const [tokenCopied, setTokenCopied] = useState(false);

  // Legacy user name prompt state
  const [nameDialogOpen, setNameDialogOpen] = useState(false);
  const [legacyName, setLegacyName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);

  // Change password dialog state
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);

  // Email verification state
  const [resendingVerification, setResendingVerification] = useState(false);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleMenuClose();
    logout();
    navigate('/login');
  };

  const handleRegenerateClick = () => {
    handleMenuClose();
    // Check if user has a name set (legacy user check)
    if (!user?.name) {
      setNameDialogOpen(true);
    } else {
      setConfirmDialogOpen(true);
    }
  };

  const handleNameSubmit = () => {
    if (!legacyName.trim()) {
      setNameError('Name is required');
      return;
    }
    if (legacyName.trim().length < 2) {
      setNameError('Name must be at least 2 characters');
      return;
    }
    setNameError(null);
    setNameDialogOpen(false);
    setConfirmDialogOpen(true);
  };

  const handleConfirmRegenerate = async () => {
    setRegenerating(true);
    const isFirstGeneration = !user?.apiTokenCreatedAt;
    try {
      // If legacy user provided a name, pass it to regenerateToken
      const nameToUse = !user?.name ? legacyName.trim() : undefined;
      const response = await regenerateToken(nameToUse);

      // Update user name in context if it was a legacy user
      if (nameToUse) {
        updateUserName(nameToUse);
      }

      setNewApiToken(response.apiToken);
      setConfirmDialogOpen(false);
      setShowTokenModal(true);
      setLegacyName('');
      showSuccess(isFirstGeneration ? 'API token generated successfully' : 'API token regenerated successfully');
    } catch (err) {
      showError(isFirstGeneration ? 'Failed to generate API token' : 'Failed to regenerate API token');
    } finally {
      setRegenerating(false);
    }
  };

  const handleCopyToken = async () => {
    try {
      await navigator.clipboard.writeText(newApiToken);
      setTokenCopied(true);
      setTimeout(() => setTokenCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy token:', err);
    }
  };

  const handleCloseTokenModal = () => {
    setShowTokenModal(false);
    setNewApiToken('');
    setTokenCopied(false);
  };

  const handleChangePasswordClick = () => {
    handleMenuClose();
    setChangePasswordOpen(true);
  };

  const handleChangePasswordSubmit = async () => {
    if (!newPassword) {
      setPasswordError('New password is required');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    setPasswordError(null);
    setChangingPassword(true);
    try {
      const token = localStorage.getItem('joker_auth_token');
      if (!token) throw new Error('Not authenticated');
      await authApi.updatePassword({ idToken: token, newPassword });
      showSuccess('Password updated successfully');
      setChangePasswordOpen(false);
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err) {
      showError('Failed to update password');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleResendVerification = async () => {
    setResendingVerification(true);
    try {
      const token = localStorage.getItem('joker_auth_token');
      if (!token) throw new Error('Not authenticated');
      await authApi.resendVerificationEmail({ idToken: token });
      showSuccess('Verification email sent! Check your inbox.');
    } catch (err) {
      showError('Failed to send verification email');
    } finally {
      setResendingVerification(false);
    }
  };

  // Get display name - prefer name over email
  const displayName = user?.name || user?.email || 'User';
  const avatarLetter = (user?.name?.charAt(0) || user?.email?.charAt(0) || 'U').toUpperCase();
  const avatarBgColor = user?.avatarColor || deepOrange[400];

  return (
    <ThemeProvider theme={navTheme}>
      <AppBar position="static" elevation={0}>
        <Toolbar>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <Box
              sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              onClick={() => navigate('/')}
            >
              <img src="/assets/joker-api-logo.png" alt="Joker API Logo" style={{ height: '46px', marginRight: '10px' }} />
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {isAuthenticated ? (
                <>
                  <IconButton
                    onClick={handleMenuOpen}
                    size="small"
                    sx={{ color: 'text.primary' }}
                    aria-controls={menuOpen ? 'account-menu' : undefined}
                    aria-haspopup="true"
                    aria-expanded={menuOpen ? 'true' : undefined}
                  >
                    <Avatar sx={{ width: 32, height: 32, bgcolor: avatarBgColor }}>{avatarLetter}</Avatar>
                  </IconButton>
                  <Menu
                    id="account-menu"
                    anchorEl={anchorEl}
                    open={menuOpen}
                    onClose={handleMenuClose}
                    transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                    anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                    slotProps={{
                      paper: {
                        elevation: 3,
                        sx: { minWidth: 250, mt: 1 },
                      },
                    }}
                  >
                    <Box sx={{ px: 2, py: 1 }}>
                      <Typography variant="body1" fontWeight="medium" noWrap>
                        {displayName}
                      </Typography>
                      {user?.name && user?.email && (
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {user.email}
                        </Typography>
                      )}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                        {user?.emailVerified ? (
                          <>
                            <VerifiedIcon sx={{ fontSize: 14, color: 'success.main' }} />
                            <Typography variant="caption" color="success.main">
                              Verified
                            </Typography>
                          </>
                        ) : (
                          <>
                            <ErrorOutlineIcon sx={{ fontSize: 14, color: 'warning.main' }} />
                            <Typography variant="caption" color="warning.main">
                              Not verified
                            </Typography>
                          </>
                        )}
                      </Box>
                    </Box>
                    {!user?.emailVerified && (
                      <>
                        <Divider />
                        <MenuItem onClick={handleResendVerification} disabled={resendingVerification}>
                          <EmailIcon sx={{ mr: 1, fontSize: 20 }} />
                          {resendingVerification ? 'Sending...' : 'Resend Verification Email'}
                        </MenuItem>
                      </>
                    )}
                    <Divider />
                    <Box sx={{ px: 2, py: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <AccessTimeIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary">
                          API Token Created
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        {formatTokenDate(user?.apiTokenCreatedAt)}
                      </Typography>
                    </Box>
                    <Divider />
                    <MenuItem onClick={handleRegenerateClick}>
                      <VpnKeyIcon sx={{ mr: 1, fontSize: 20 }} />
                      {user?.apiTokenCreatedAt ? 'Regenerate API Token' : 'Generate API Token'}
                    </MenuItem>
                    <MenuItem onClick={handleChangePasswordClick}>
                      <LockIcon sx={{ mr: 1, fontSize: 20 }} />
                      Change Password
                    </MenuItem>
                    <Divider />
                    <MenuItem onClick={handleLogout}>
                      <LogoutIcon sx={{ mr: 1, fontSize: 20 }} />
                      Sign out
                    </MenuItem>
                  </Menu>
                </>
              ) : (
                <img src="/assets/anishhs_nobg_512px.png" alt="Anishh S" style={{ height: '32px', marginLeft: '8px' }} />
              )}
            </Box>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Legacy User Name Dialog */}
      <Dialog
        open={nameDialogOpen}
        onClose={() => {
          setNameDialogOpen(false);
          setLegacyName('');
          setNameError(null);
        }}
      >
        <DialogTitle>Enter Your Name</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            To generate an API token, we need your name. This will be associated with your account.
          </DialogContentText>
          <TextField
            autoFocus
            fullWidth
            label="Name"
            value={legacyName}
            onChange={(e) => setLegacyName(e.target.value)}
            error={!!nameError}
            helperText={nameError || 'Min 2 characters'}
            placeholder="Enter your name"
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setNameDialogOpen(false);
              setLegacyName('');
              setNameError(null);
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleNameSubmit} variant="contained">
            Continue
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialogOpen}
        onClose={() => !regenerating && setConfirmDialogOpen(false)}
      >
        <DialogTitle>
          {user?.apiTokenCreatedAt ? 'Regenerate API Token?' : 'Generate API Token?'}
        </DialogTitle>
        <DialogContent>
          {user?.apiTokenCreatedAt ? (
            <>
              <Alert severity="warning" sx={{ mb: 2 }}>
                This will invalidate your existing API token immediately.
              </Alert>
              <DialogContentText>
                Any applications or scripts using your current token will stop working.
                You'll need to update them with the new token.
              </DialogContentText>
            </>
          ) : (
            <DialogContentText>
              This will create a new API token for authenticating requests to your mock endpoints.
            </DialogContentText>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setConfirmDialogOpen(false)}
            disabled={regenerating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmRegenerate}
            color={user?.apiTokenCreatedAt ? 'warning' : 'primary'}
            variant="contained"
            disabled={regenerating}
            startIcon={regenerating ? <CircularProgress size={16} color="inherit" /> : <VpnKeyIcon />}
          >
            {regenerating
              ? (user?.apiTokenCreatedAt ? 'Regenerating...' : 'Generating...')
              : (user?.apiTokenCreatedAt ? 'Regenerate Token' : 'Generate Token')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Token Display Modal */}
      <Dialog
        open={showTokenModal}
        onClose={handleCloseTokenModal}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningAmberIcon color="warning" />
          Your API Token
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This is the only time your API token will be shown. Copy it now and store it securely!
          </Alert>
          <DialogContentText sx={{ mb: 2 }}>
            Use this token to authenticate requests to your mock endpoints via the <code>X-API-Key</code> header.
          </DialogContentText>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              p: 2,
              bgcolor: 'grey.100',
              borderRadius: 1,
              fontFamily: 'monospace',
              wordBreak: 'break-all',
            }}
          >
            <Typography
              variant="body2"
              sx={{ flexGrow: 1, fontFamily: 'monospace', color: 'text.primary' }}
            >
              {newApiToken}
            </Typography>
            <Tooltip title={tokenCopied ? 'Copied!' : 'Copy to clipboard'}>
              <IconButton onClick={handleCopyToken} size="small" color={tokenCopied ? 'success' : 'default'}>
                <ContentCopyIcon />
              </IconButton>
            </Tooltip>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
            Example usage:
          </Typography>
          <Box
            sx={{
              p: 1.5,
              bgcolor: 'grey.900',
              borderRadius: 1,
              mt: 1,
              overflow: 'auto',
            }}
          >
            <Typography
              variant="body2"
              component="pre"
              sx={{ fontFamily: 'monospace', color: 'grey.100', m: 0, fontSize: '0.75rem' }}
            >
{`curl -X GET https://api.joker.com/your-project/endpoint \\
  -H "X-API-Key: ${newApiToken}"`}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCopyToken} startIcon={<ContentCopyIcon />}>
            {tokenCopied ? 'Copied!' : 'Copy Token'}
          </Button>
          <Button onClick={handleCloseTokenModal} variant="contained">
            I've Saved My Token
          </Button>
        </DialogActions>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog
        open={changePasswordOpen}
        onClose={() => {
          if (!changingPassword) {
            setChangePasswordOpen(false);
            setNewPassword('');
            setConfirmNewPassword('');
            setPasswordError(null);
          }
        }}
      >
        <DialogTitle>Change Password</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Enter your new password below.
          </DialogContentText>
          {passwordError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {passwordError}
            </Alert>
          )}
          <TextField
            autoFocus
            fullWidth
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter new password"
            sx={{ mb: 2 }}
            disabled={changingPassword}
          />
          <TextField
            fullWidth
            label="Confirm New Password"
            type="password"
            value={confirmNewPassword}
            onChange={(e) => setConfirmNewPassword(e.target.value)}
            placeholder="Confirm new password"
            disabled={changingPassword}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setChangePasswordOpen(false);
              setNewPassword('');
              setConfirmNewPassword('');
              setPasswordError(null);
            }}
            disabled={changingPassword}
          >
            Cancel
          </Button>
          <Button
            onClick={handleChangePasswordSubmit}
            variant="contained"
            disabled={changingPassword}
            startIcon={changingPassword ? <CircularProgress size={16} color="inherit" /> : <LockIcon />}
          >
            {changingPassword ? 'Updating...' : 'Update Password'}
          </Button>
        </DialogActions>
      </Dialog>
    </ThemeProvider>
  );
};

export default Navbar;

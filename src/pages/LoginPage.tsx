import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  Box,
  CircularProgress,
  Link,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/api';
import { useNotification } from '../context/NotificationContext';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Forgot password state
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);
  const [sendingReset, setSendingReset] = useState(false);

  const { login, error: authError, clearError } = useAuth();
  const { showSuccess, showError } = useNotification();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    // Validate
    if (!email.trim()) {
      setLocalError('Email is required');
      return;
    }
    if (!password) {
      setLocalError('Password is required');
      return;
    }

    setSubmitting(true);
    try {
      await login({ email: email.trim(), password });
      navigate('/');
    } catch (err) {
      // Error is handled by AuthContext
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPasswordClick = () => {
    setResetEmail(email); // Pre-fill with login email if entered
    setForgotPasswordOpen(true);
  };

  const handleSendResetEmail = async () => {
    if (!resetEmail.trim()) {
      setResetError('Email is required');
      return;
    }

    setResetError(null);
    setSendingReset(true);
    try {
      await authApi.resetPassword({ email: resetEmail.trim() });
      showSuccess('Password reset email sent! Check your inbox.');
      setForgotPasswordOpen(false);
      setResetEmail('');
    } catch (err) {
      showError('Failed to send reset email. Please check the email address.');
    } finally {
      setSendingReset(false);
    }
  };

  const displayError = localError || authError;

  return (
    <>
      <Container maxWidth="xs" sx={{ py: 8 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Box sx={{ mb: 3, textAlign: 'center' }}>
            <Typography variant="h4" component="h1" gutterBottom>
              Login
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Sign in to your Joker API account
            </Typography>
          </Box>

          {displayError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {displayError}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              variant="outlined"
              disabled={submitting}
              autoComplete="email"
              autoFocus
            />
            <TextField
              fullWidth
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              variant="outlined"
              disabled={submitting}
              autoComplete="current-password"
            />
            <Box sx={{ textAlign: 'right', mt: -1 }}>
              <Link
                component="button"
                type="button"
                variant="body2"
                onClick={handleForgotPasswordClick}
                underline="hover"
              >
                Forgot password?
              </Link>
            </Box>
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={submitting}
              startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {submitting ? 'Signing in...' : 'Sign In'}
            </Button>
          </Box>

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Don't have an account?{' '}
              <Link component={RouterLink} to="/signup" underline="hover">
                Sign up
              </Link>
            </Typography>
          </Box>
        </Paper>
      </Container>

      {/* Forgot Password Dialog */}
      <Dialog
        open={forgotPasswordOpen}
        onClose={() => {
          if (!sendingReset) {
            setForgotPasswordOpen(false);
            setResetEmail('');
            setResetError(null);
          }
        }}
      >
        <DialogTitle>Reset Password</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Enter your email address and we'll send you a link to reset your password.
          </DialogContentText>
          {resetError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {resetError}
            </Alert>
          )}
          <TextField
            autoFocus
            fullWidth
            label="Email"
            type="email"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
            placeholder="Enter your email"
            disabled={sendingReset}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setForgotPasswordOpen(false);
              setResetEmail('');
              setResetError(null);
            }}
            disabled={sendingReset}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSendResetEmail}
            variant="contained"
            disabled={sendingReset}
            startIcon={sendingReset ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {sendingReset ? 'Sending...' : 'Send Reset Link'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default LoginPage;

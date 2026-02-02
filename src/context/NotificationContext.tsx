import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Snackbar, Alert, AlertColor } from '@mui/material';

interface Notification {
  message: string;
  severity: AlertColor;
  duration?: number;
}

interface NotificationContextType {
  showNotification: (message: string, severity?: AlertColor, duration?: number) => void;
  showError: (message: string) => void;
  showSuccess: (message: string) => void;
  showWarning: (message: string) => void;
  showInfo: (message: string) => void;
  showRateLimitError: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notification, setNotification] = useState<Notification | null>(null);
  const [open, setOpen] = useState(false);

  const showNotification = useCallback((
    message: string,
    severity: AlertColor = 'info',
    duration: number = 4000
  ) => {
    setNotification({ message, severity, duration });
    setOpen(true);
  }, []);

  const showError = useCallback((message: string) => {
    showNotification(message, 'error', 6000);
  }, [showNotification]);

  const showSuccess = useCallback((message: string) => {
    showNotification(message, 'success', 4000);
  }, [showNotification]);

  const showWarning = useCallback((message: string) => {
    showNotification(message, 'warning', 5000);
  }, [showNotification]);

  const showInfo = useCallback((message: string) => {
    showNotification(message, 'info', 4000);
  }, [showNotification]);

  const showRateLimitError = useCallback(() => {
    showNotification(
      'You are being rate limited. Please wait a moment before trying again.',
      'warning',
      8000
    );
  }, [showNotification]);

  const handleClose = useCallback((_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpen(false);
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        showNotification,
        showError,
        showSuccess,
        showWarning,
        showInfo,
        showRateLimitError,
      }}
    >
      {children}
      <Snackbar
        open={open}
        autoHideDuration={notification?.duration}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleClose}
          severity={notification?.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {notification?.message}
        </Alert>
      </Snackbar>
    </NotificationContext.Provider>
  );
};

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

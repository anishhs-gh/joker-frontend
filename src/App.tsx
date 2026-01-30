import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material';
import { NotificationProvider } from './context/NotificationContext';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import ProjectPage from './pages/ProjectPage';
import EndpointPage from './pages/EndpointPage';
import EndpointLogsPage from './pages/EndpointLogsPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';

// Shared theme configuration
const theme = createTheme({
  palette: {
    primary: {
      main: '#0070f3',
    },
  },
});

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <AuthProvider>
        <NotificationProvider>
          <Layout>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />

              {/* Protected routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <HomePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/project/:projectId"
                element={
                  <ProtectedRoute>
                    <ProjectPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/project/:projectId/endpoint/:endpointId"
                element={
                  <ProtectedRoute>
                    <EndpointPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/project/:projectId/endpoint/new"
                element={
                  <ProtectedRoute>
                    <EndpointPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/project/:projectId/logs"
                element={
                  <ProtectedRoute>
                    <EndpointLogsPage />
                  </ProtectedRoute>
                }
              />

              {/* Catch-all redirect */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;

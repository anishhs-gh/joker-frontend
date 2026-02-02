import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Alert,
  IconButton,
  Paper,
  Chip,
  Divider,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  Button,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CodeIcon from '@mui/icons-material/Code';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import { projectsApi, getLogsWebSocketUrl, ApiRequestError } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import { Project, LogEntry, WsClientCommand } from '../types';

const MAX_RECONNECT_ATTEMPTS = 5;
const INITIAL_RECONNECT_DELAY = 1000;

const getMethodColor = (method: string) => {
  switch (method) {
    case 'GET': return 'success';
    case 'POST': return 'primary';
    case 'PUT': return 'warning';
    case 'DELETE': return 'error';
    default: return 'default';
  }
};

const getStatusColor = (status: number) => {
  if (status >= 200 && status < 300) return 'success';
  if (status >= 300 && status < 400) return 'primary';
  if (status >= 400 && status < 500) return 'warning';
  if (status >= 500) return 'error';
  return 'default';
};

const getStatusText = (status: number) => {
  if (status >= 200 && status < 300) return 'Success';
  if (status >= 300 && status < 400) return 'Redirect';
  if (status >= 400 && status < 500) return 'Client Error';
  if (status >= 500) return 'Server Error';
  return 'Unknown';
};

const EndpointLogsPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'reconnecting'>('connecting');

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { showError, showSuccess, showWarning, showRateLimitError } = useNotification();

  // WebSocket connection with auto-reconnect
  const connectWebSocket = useCallback(() => {
    if (!projectId) return;

    // Clean up existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    const wsUrl = getLogsWebSocketUrl(projectId);
    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      console.log('WebSocket connection established');
      setConnectionStatus('connected');
      setError(null);
      reconnectAttemptsRef.current = 0;

      // Request history on connect
      const historyCommand: WsClientCommand = { command: 'getHistory', limit: 50 };
      websocket.send(JSON.stringify(historyCommand));
    };

    websocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        // Handle history response
        if (message.type === 'history' && Array.isArray(message.logs)) {
          setLogs(message.logs);
          return;
        }

        // Handle cleared confirmation
        if (message.type === 'cleared') {
          setLogs([]);
          showSuccess('Logs cleared');
          return;
        }

        // Handle pong (keep-alive)
        if (message.type === 'pong') {
          return;
        }

        // Handle new log entry
        if (message.timestamp && message.method && message.path && message.projectId &&
          message.hasOwnProperty('responseStatus') && message.hasOwnProperty('responseBody')) {
          const logEntry: LogEntry = message;
          setLogs((prevLogs) => [logEntry, ...prevLogs]);
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    websocket.onclose = (event) => {
      console.log('WebSocket connection closed:', event.code, event.reason);
      setConnectionStatus('disconnected');

      // Attempt to reconnect if not a clean close
      if (!event.wasClean && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
        const delay = INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current);
        reconnectAttemptsRef.current++;
        setConnectionStatus('reconnecting');
        showWarning(`Connection lost. Reconnecting in ${delay / 1000}s...`);

        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, delay);
      } else if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
        setError('Unable to maintain connection. Please refresh the page.');
        showError('Connection failed after multiple attempts');
      }
    };

    wsRef.current = websocket;
  }, [projectId, showError, showSuccess, showWarning]);

  // Fetch project data
  useEffect(() => {
    const fetchProject = async () => {
      if (!projectId) {
        setError('No project ID provided.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const projectData = await projectsApi.get(projectId);
        setProject(projectData);
      } catch (error) {
        console.error('Error fetching project data:', error);
        if (error instanceof ApiRequestError) {
          if (error.isRateLimited) {
            showRateLimitError();
          }
          setError(error.message);
        } else {
          setError('An unexpected error occurred');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [projectId, showRateLimitError]);

  // Initialize WebSocket connection
  useEffect(() => {
    if (!projectId || loading) return;

    connectWebSocket();

    // Cleanup on unmount
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [projectId, loading, connectWebSocket]);

  const handleClearLogs = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const clearCommand: WsClientCommand = { command: 'clearLogs' };
      wsRef.current.send(JSON.stringify(clearCommand));
    }
  };

  const handleReconnect = () => {
    reconnectAttemptsRef.current = 0;
    connectWebSocket();
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const formatJson = (data: any) => {
    try {
      return JSON.stringify(data, null, 2);
    } catch (e) {
      return String(data);
    }
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'success';
      case 'connecting':
      case 'reconnecting': return 'warning';
      case 'disconnected': return 'error';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>Loading project details...</Typography>
      </Container>
    );
  }

  if (error && !wsRef.current) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (!project) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="info">Project not found.</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
          <IconButton
            onClick={() => navigate(`/project/${projectId}`)}
            sx={{ mr: 1 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5" component="h1" sx={{ flexGrow: 1 }}>
            Live Logs: {project.name}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={connectionStatus}
              color={getConnectionStatusColor() as any}
              size="small"
              variant="outlined"
            />
            {connectionStatus === 'disconnected' && (
              <Tooltip title="Reconnect">
                <IconButton onClick={handleReconnect} size="small">
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Clear Logs">
              <IconButton
                onClick={handleClearLogs}
                size="small"
                disabled={connectionStatus !== 'connected'}
              >
                <DeleteSweepIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {error && wsRef.current && (
          <Alert
            severity="warning"
            sx={{ mb: 3 }}
            action={
              <Button color="inherit" size="small" onClick={handleReconnect}>
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        )}

        <Paper elevation={3}>
          {logs.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">
                No logs yet. Trigger an endpoint to see live logs here.
              </Typography>
            </Box>
          ) : (
            <List sx={{ p: 0 }}>
              {logs.map((log, index) => (
                <React.Fragment key={`${log.timestamp}-${index}`}>
                  <Accordion>
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon />}
                      sx={{
                        '&:hover': {
                          backgroundColor: 'action.hover',
                        },
                      }}
                    >
                      <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        width: '100%',
                        pr: 2,
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
                          <Tooltip title={formatTimestamp(log.timestamp)}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                              <AccessTimeIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                              <Typography variant="caption" color="text.secondary">
                                {new Date(log.timestamp).toLocaleTimeString()}
                              </Typography>
                            </Box>
                          </Tooltip>

                          <Chip
                            label={log.method}
                            color={getMethodColor(log.method) as any}
                            size="small"
                            sx={{ mr: 1 }}
                          />

                          <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                            {log.path}
                          </Typography>
                        </Box>

                        <Tooltip title={getStatusText(log.responseStatus)}>
                          <Chip
                            label={`${log.responseStatus}`}
                            color={getStatusColor(log.responseStatus) as any}
                            size="small"
                          />
                        </Tooltip>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <CodeIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                            <Typography variant="subtitle2" color="text.secondary">
                              Request Body
                            </Typography>
                          </Box>
                          <Paper
                            variant="outlined"
                            sx={{
                              p: 2,
                              bgcolor: 'grey.50',
                              fontFamily: 'monospace',
                              fontSize: '0.875rem',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                              color: 'crimson'
                            }}
                          >
                            {formatJson(log.requestBody)}
                          </Paper>
                        </Box>
                        <Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <CodeIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                            <Typography variant="subtitle2" color="text.secondary">
                              Response Body
                            </Typography>
                          </Box>
                          <Paper
                            variant="outlined"
                            sx={{
                              p: 2,
                              bgcolor: 'grey.50',
                              fontFamily: 'monospace',
                              fontSize: '0.875rem',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                              color: 'crimson'
                            }}
                          >
                            {formatJson(log.responseBody)}
                          </Paper>
                        </Box>
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                  {index < logs.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </Paper>
      </Container>
  );
};

export default EndpointLogsPage;

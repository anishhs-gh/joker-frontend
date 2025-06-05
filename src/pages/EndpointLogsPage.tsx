import React, { useEffect, useState } from 'react';
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
  ThemeProvider,
  createTheme,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CodeIcon from '@mui/icons-material/Code';
import Navbar from '../components/Navbar';
import axios from 'axios';

interface Project {
  id: string;
  name: string;
}

interface LogEntry {
  timestamp: string;
  method: string;
  path: string;
  projectId: string;
  requestBody: any;
  responseStatus: number;
  responseBody: any;
}

const theme = createTheme({
  palette: {
    primary: {
      main: '#0070f3',
    },
  },
});

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
  const [ws, setWs] = useState<WebSocket | null>(null);

  const baseUrl = 'http://localhost:3000/_mock-api';
  const wsUrl = 'ws://localhost:3000';

  useEffect(() => {
    const fetchProject = async () => {
      try {
        setLoading(true);
        const response = await axios.get<Project>(`${baseUrl}/projects/${projectId}`);
        setProject(response.data);
      } catch (error) {
        console.error('Error fetching project data for logs page:', error);
        if (axios.isAxiosError(error)) {
          setError(error.response?.data?.error || 'Failed to fetch project data');
        } else {
          setError('An unexpected error occurred');
        }
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
      fetchProject();
    } else {
      setError('No project ID provided.');
      setLoading(false);
    }
  }, [projectId, baseUrl]);

  useEffect(() => {
    if (!projectId) return;

    const websocket = new WebSocket(`${wsUrl}/ws/logs?projectId=${projectId}`);

    websocket.onopen = () => {
      console.log('WebSocket connection established');
      setError(null);
    };

    websocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('Received message:', message);

        if (message.timestamp && message.method && message.path && message.projectId && 
            message.hasOwnProperty('responseStatus') && message.hasOwnProperty('responseBody')) {
          const logEntry: LogEntry = message;
          console.log('Received log entry:', logEntry);
          setLogs((prevLogs) => [logEntry, ...prevLogs]);
        } else {
          console.log('Received non-log message:', message);
          if (message.message) {
            // Handle status messages if needed
          }
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error, 'Raw data:', event.data);
      }
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error, 'WebSocket state:', websocket.readyState);
    };

    websocket.onclose = (event) => {
      console.log('WebSocket connection closed:', event.code, event.reason, 'WebSocket state:', websocket.readyState);
      if (!event.wasClean) {
        setError('WebSocket connection unexpectedly closed.');
      }
    };

    setWs(websocket);

    return () => {
      console.log('Closing WebSocket connection');
      websocket.close();
    };
  }, [projectId, wsUrl]);

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

  if (loading) {
    return (
      <>
        <Navbar />
        <Container maxWidth="md" sx={{ py: 4, textAlign: 'center' }}>
          <CircularProgress />
          <Typography variant="h6" sx={{ mt: 2 }}>Loading project details...</Typography>
        </Container>
      </>
    );
  }

  if (error && !ws) {
    return (
      <>
        <Navbar />
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Alert severity="error">{error}</Alert>
        </Container>
      </>
    );
  }

  if (!project) {
    return (
      <>
        <Navbar />
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Alert severity="info">Project not found.</Alert>
        </Container>
      </>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <Navbar />
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
          <IconButton 
            onClick={() => navigate(`/project/${projectId}`)} 
            sx={{ mr: 1 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5" component="h1" sx={{ flexGrow: 1 }}>
            Live Logs for Project: {project.name}
          </Typography>
        </Box>

        {error && ws && (
          <Alert 
            severity="warning" 
            sx={{ mb: 3 }}
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
    </ThemeProvider>
  );
};

export default EndpointLogsPage; 
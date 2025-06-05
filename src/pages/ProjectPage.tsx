import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Container,
  Paper,
  Typography,
  Button,
  Alert,
  Box,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Chip,
  Divider,
  CircularProgress,
  Tooltip,
  Snackbar,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  ListItemSecondaryAction,
  ThemeProvider,
  createTheme,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EditIcon from '@mui/icons-material/Edit';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import Navbar from '../components/Navbar';

interface Endpoint {
  id: string;
  projectId: string;
  path: string;
  method: string;
  response: {
    status: number;
    body: any;
  };
  statusCode: number;
  delay: number;
  createdAt: number;
  updatedAt: number;
}

interface Project {
  id: string;
  name: string;
  nameLower: string;
  createdAt: number;
  updatedAt: number;
  baseUrl: string;
}

const theme = createTheme({
  palette: {
    primary: {
      main: '#0070f3',
    },
  },
});

const ProjectPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);

  const baseUrl = 'http://localhost:3000/_mock-api';
  const projectApiPath = `http://localhost:3000/${projectId}`;

  const handleCopyPath = async () => {
    try {
      await navigator.clipboard.writeText(projectApiPath);
      setCopySuccess(true);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  useEffect(() => {
    const fetchProjectData = async () => {
      try {
        setLoading(true);
        console.log('Fetching project data for:', projectId);
        const projectResponse = await axios.get<Project>(`${baseUrl}/projects/${projectId}`);
        console.log('Project response:', projectResponse.data);
        setProject(projectResponse.data);

        const endpointsResponse = await axios.get<Endpoint[]>(`${baseUrl}/projects/${projectId}/endpoints`);
        console.log('Endpoints response:', endpointsResponse.data);
        setEndpoints(endpointsResponse.data);
      } catch (error) {
        console.error('Error fetching project data:', error);
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
      fetchProjectData();
    } else {
      console.error('No project ID provided in URL');
      setLoading(false);
    }
  }, [projectId]);

  const handleDeleteEndpoint = async (endpointId: string) => {
    if (window.confirm('Are you sure you want to delete this endpoint?')) {
      try {
        await axios.delete(`${baseUrl}/projects/${projectId}/endpoints/${endpointId}`);
        setEndpoints(endpoints.filter(endpoint => endpoint.id !== endpointId));
      } catch (error) {
        console.error('Error deleting endpoint:', error);
        if (axios.isAxiosError(error)) {
          setError(error.response?.data?.error || 'Failed to delete endpoint');
        } else {
          setError('An unexpected error occurred while deleting');
        }
      }
    }
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'success';
      case 'POST': return 'primary';
      case 'PUT': return 'warning';
      case 'DELETE': return 'error';
      default: return 'default';
    }
  };

  const formatResponseBody = (body: any): string => {
    try {
      return JSON.stringify(body, null, 2);
    } catch (error) {
      return String(body);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <Container maxWidth="md" sx={{ py: 4, textAlign: 'center' }}>
          <CircularProgress />
          <Typography variant="h6" sx={{ mt: 2 }}>Loading project data...</Typography>
        </Container>
      </>
    );
  }

  if (error) {
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
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
          <IconButton onClick={() => navigate('/')} sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5" component="h1" sx={{ flexGrow: 1 }}>
            Project: {project.name}
          </Typography>
          <Box>
            <Button
              sx={{ mr: 1 }}
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                console.log('Creating new endpoint for project:', projectId);
                navigate(`/project/${projectId}/endpoint/new`);
              }}
              disabled={loading}
            >
              New Endpoint
            </Button>
            <Button
              variant="outlined"
              onClick={() => navigate(`/project/${projectId}/logs`)}
              startIcon={<ReceiptLongIcon />}
              disabled={loading}
            >
              View Logs
            </Button>
          </Box>
        </Box>

        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="subtitle1" color="text.secondary">
              API Base URL:
            </Typography>
            <Typography
              variant="body1"
              sx={{
                fontFamily: 'monospace',
                bgcolor: 'grey.100',
                px: 1,
                py: 0.5,
                borderRadius: 1,
                flexGrow: 1,
                color: 'crimson'
              }}
            >
              {projectApiPath}
            </Typography>
            <Tooltip title="Copy to clipboard">
              <IconButton onClick={handleCopyPath} size="small">
                <ContentCopyIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Paper elevation={3}>
          {loading ? (
            <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
              <CircularProgress />
            </Box>
          ) : endpoints.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">
                No endpoints found. Create your first endpoint to get started.
              </Typography>
            </Box>
          ) : (
            <List sx={{ p: 0 }}>
              {endpoints.map((endpoint, index) => (
                <React.Fragment key={endpoint.id}>
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
                          <Chip
                            label={endpoint.method}
                            color={getMethodColor(endpoint.method) as any}
                            size="small"
                            sx={{ mr: 1 }}
                          />
                          <Typography variant="body1">
                            {endpoint.path}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                            Status: {endpoint.statusCode} | Delay: {endpoint.delay}ms
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteEndpoint(endpoint.id);
                            }}
                            disabled={loading}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Response Body
                          </Typography>
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
                            {formatResponseBody(endpoint.response.body)}
                          </Paper>
                        </Box>
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Full URL
                          </Typography>
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1,
                            bgcolor: 'grey.100',
                            p: 1,
                            borderRadius: 1,
                          }}>
                            <Typography
                              variant="body2"
                              sx={{
                                fontFamily: 'monospace',
                                flexGrow: 1,
                                color: 'crimson'
                              }}
                            >
                              {projectApiPath}{endpoint.path}
                            </Typography>
                            <Tooltip title="Copy URL">
                              <IconButton 
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard.writeText(`${projectApiPath}${endpoint.path}`);
                                  setCopySuccess(true);
                                }}
                              >
                                <ContentCopyIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </Box>
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                  {index < endpoints.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </Paper>
      </Container>

      <Snackbar
        open={copySuccess}
        autoHideDuration={2000}
        onClose={() => setCopySuccess(false)}
        message="URL copied to clipboard"
      />
    </ThemeProvider>
  );
};

export default ProjectPage; 
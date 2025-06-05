import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  Box,
  ThemeProvider,
  createTheme,
  CircularProgress,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  TextareaAutosize,
  IconButton,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
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

const theme = createTheme({
  palette: {
    primary: {
      main: '#0070f3',
    },
  },
});

const EndpointPage: React.FC = () => {
  const { projectId, endpointId } = useParams<{ projectId: string; endpointId?: string }>();
  const navigate = useNavigate();
  const [path, setPath] = useState('');
  const [method, setMethod] = useState('GET');
  const [statusCode, setStatusCode] = useState<number | ''>('');
  const [responseBody, setResponseBody] = useState('');
  const [delay, setDelay] = useState<number | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isEditMode = !!endpointId;

  const baseUrl = 'http://localhost:3000/_mock-api';

  useEffect(() => {
    if (isEditMode) {
      const fetchEndpoint = async () => {
        try {
          setLoading(true);
          const response = await axios.get<Endpoint>(`${baseUrl}/projects/${projectId}/endpoints/${endpointId}`);
          const endpoint = response.data;
          setPath(endpoint.path);
          setMethod(endpoint.method);
          setStatusCode(endpoint.statusCode);
          setResponseBody(JSON.stringify(endpoint.response.body, null, 2));
          setDelay(endpoint.delay);
        } catch (error) {
          console.error('Error fetching endpoint:', error);
          if (axios.isAxiosError(error)) {
            setError(error.response?.data?.error || 'Failed to fetch endpoint');
          } else {
            setError('An unexpected error occurred');
          }
        } finally {
          setLoading(false);
        }
      };
      fetchEndpoint();
    }
  }, [endpointId, isEditMode, projectId, baseUrl]);

  const handleSubmit = async () => {
    try {
      setError(null);
      setLoading(true);

      let parsedResponseBody: any;
      try {
        parsedResponseBody = JSON.parse(responseBody);
      } catch (e) {
        setError('Invalid JSON in Response Body');
        setLoading(false);
        return;
      }

      const endpointData = {
        projectId: projectId!,
        path,
        method,
        response: {
          status: statusCode || 200, // Default to 200 if not set
          body: parsedResponseBody,
        },
        statusCode: statusCode || 200, // Default to 200 if not set
        delay: delay || 0, // Default to 0 if not set
      };

      if (isEditMode) {
        await axios.put(`${baseUrl}/projects/${projectId}/endpoints/${endpointId}`, endpointData);
      } else {
        await axios.post(`${baseUrl}/projects/${projectId}/endpoints`, endpointData);
      }

      navigate(`/project/${projectId}`);
    } catch (error) {
      console.error('Error saving endpoint:', error);
      if (axios.isAxiosError(error)) {
        setError(error.response?.data?.error || `Failed to ${isEditMode ? 'update' : 'create'} endpoint`);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <Navbar />
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
          {!isEditMode && (
            <IconButton onClick={() => navigate(`/project/${projectId}`)} sx={{ mr: 1 }}>
              <ArrowBackIcon />
            </IconButton>
          )}
          <Typography variant="h5" component="span">
            {isEditMode ? 'Edit Endpoint' : 'Create New Endpoint'}
          </Typography>
        </Box>
        <Paper elevation={3} sx={{ p: 4, mb: 3 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Path"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="e.g., /users"
              variant="outlined"
              disabled={loading}
            />
            <FormControl fullWidth variant="outlined" disabled={loading}>
              <InputLabel>Method</InputLabel>
              <Select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                label="Method"
              >
                <MenuItem value="GET">GET</MenuItem>
                <MenuItem value="POST">POST</MenuItem>
                <MenuItem value="PUT">PUT</MenuItem>
                <MenuItem value="DELETE">DELETE</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Status Code"
              type="number"
              value={statusCode}
              onChange={(e) => setStatusCode(Number(e.target.value))}
              placeholder="e.g., 200"
              variant="outlined"
              disabled={loading}
            />
             <TextField
              fullWidth
              label="Delay (ms)"
              type="number"
              value={delay}
              onChange={(e) => setDelay(Number(e.target.value))}
              placeholder="e.g., 0"
              variant="outlined"
              disabled={loading}
              InputProps={{
                inputProps: { min: 0 }
              }}
            />
            <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mt: 1 }}>
              Response Body (JSON)
            </Typography>
            <TextareaAutosize
              minRows={10}
              maxRows={20}
              placeholder="Enter JSON response body here"
              value={responseBody}
              onChange={(e) => setResponseBody(e.target.value)}
              disabled={loading}
              style={{
                padding: '10px',
                borderColor: '#ced4da',
                borderRadius: '4px',
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                outline: 'none',
                resize: 'vertical',
                backgroundColor: loading ? '#f5f5f5' : '#fff',
                cursor: loading ? 'not-allowed' : 'auto',
              }}
            />
            <Button
              variant="contained"
              onClick={handleSubmit}
              size="large"
              disabled={loading || !path || !statusCode || !responseBody}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {loading ? (isEditMode ? 'Saving...' : 'Creating...') : (isEditMode ? 'Save Endpoint' : 'Create Endpoint')}
            </Button>
          </Box>
        </Paper>
      </Container>
    </ThemeProvider>
  );
};

export default EndpointPage; 
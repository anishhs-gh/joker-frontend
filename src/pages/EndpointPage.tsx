import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  Box,
  CircularProgress,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  IconButton,
  Slider,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Editor from '@monaco-editor/react';
import { endpointsApi, ApiRequestError } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import { HttpMethod } from '../types';

const DELAY_MARKS = [
  { value: 0, label: '0' },
  { value: 1000, label: '1s' },
  { value: 2000, label: '2s' },
  { value: 3000, label: '3s' },
  { value: 4000, label: '4s' },
  { value: 5000, label: '5s' },
];

const EndpointPage: React.FC = () => {
  const { projectId, endpointId } = useParams<{ projectId: string; endpointId?: string }>();
  const navigate = useNavigate();
  const [path, setPath] = useState('');
  const [method, setMethod] = useState<HttpMethod>('GET');
  const [statusCode, setStatusCode] = useState<number | ''>('');
  const [responseBody, setResponseBody] = useState('{\n  \n}');
  const [delay, setDelay] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const isEditMode = !!endpointId;

  const { showSuccess, showRateLimitError } = useNotification();

  useEffect(() => {
    if (isEditMode && projectId && endpointId) {
      const fetchEndpoint = async () => {
        try {
          setLoading(true);
          const endpoint = await endpointsApi.get(projectId, endpointId);
          setPath(endpoint.path);
          setMethod(endpoint.method as HttpMethod);
          setStatusCode(endpoint.statusCode);
          setResponseBody(JSON.stringify(endpoint.response.body, null, 2));
          setDelay(endpoint.delay);
        } catch (error) {
          console.error('Error fetching endpoint:', error);
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
      fetchEndpoint();
    }
  }, [endpointId, isEditMode, projectId, showRateLimitError]);

  // Auto-prefix path with leading slash
  const normalizePath = (inputPath: string): string => {
    const trimmed = inputPath.trim();
    if (trimmed && !trimmed.startsWith('/')) {
      return '/' + trimmed;
    }
    return trimmed;
  };

  const handleSubmit = async () => {
    if (!projectId) return;

    try {
      setError(null);
      setSubmitting(true);

      // Normalize path (auto-add leading slash)
      const normalizedPath = normalizePath(path);

      let parsedResponseBody: any;
      try {
        parsedResponseBody = JSON.parse(responseBody);
      } catch (e) {
        setError('Invalid JSON in Response Body');
        setSubmitting(false);
        return;
      }

      const endpointData = {
        path: normalizedPath,
        method,
        response: {
          status: statusCode || 200,
          body: parsedResponseBody,
        },
        delay: delay,
      };

      if (isEditMode && endpointId) {
        await endpointsApi.update(projectId, endpointId, endpointData);
        showSuccess('Endpoint updated successfully');
      } else {
        await endpointsApi.create(projectId, endpointData);
        showSuccess('Endpoint created successfully');
      }

      navigate(`/project/${projectId}`);
    } catch (error) {
      console.error('Error saving endpoint:', error);
      if (error instanceof ApiRequestError) {
        if (error.isRateLimited) {
          showRateLimitError();
        } else {
          setError(error.message);
        }
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelaySliderChange = (_event: Event, newValue: number | number[]) => {
    setDelay(newValue as number);
  };

  const handleDelayInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value === '' ? 0 : Number(event.target.value);
    setDelay(Math.min(Math.max(value, 0), 5000));
  };

  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>Loading endpoint...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
        <IconButton onClick={() => navigate(`/project/${projectId}`)} sx={{ mr: 1 }}>
          <ArrowBackIcon />
        </IconButton>
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
            placeholder="e.g., /users or users (leading / auto-added)"
            variant="outlined"
            disabled={submitting}
            helperText="Leading slash will be auto-added if missing"
          />
          <FormControl fullWidth variant="outlined" disabled={submitting}>
            <InputLabel>Method</InputLabel>
            <Select
              value={method}
              onChange={(e) => setMethod(e.target.value as HttpMethod)}
              label="Method"
            >
              <MenuItem value="GET">GET</MenuItem>
              <MenuItem value="POST">POST</MenuItem>
              <MenuItem value="PUT">PUT</MenuItem>
              <MenuItem value="DELETE">DELETE</MenuItem>
              <MenuItem value="PATCH">PATCH</MenuItem>
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
            disabled={submitting}
          />

          {/* Delay Slider with Input */}
          <Box sx={{ mt: 1 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Response Delay
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ flexGrow: 1 }}>
                <Slider
                  value={delay}
                  onChange={handleDelaySliderChange}
                  min={0}
                  max={5000}
                  step={100}
                  marks={DELAY_MARKS}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(value) => `${value}ms`}
                  disabled={submitting}
                />
              </Box>
              <TextField
                value={delay}
                onChange={handleDelayInputChange}
                type="number"
                size="small"
                disabled={submitting}
                InputProps={{
                  inputProps: { min: 0, max: 5000 },
                  endAdornment: <Typography variant="caption" sx={{ ml: 0.5 }}>ms</Typography>,
                }}
                sx={{ width: 100 }}
              />
            </Box>
          </Box>

          {/* Monaco Editor for JSON */}
          <Box sx={{ mt: 1 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Response Body (JSON)
            </Typography>
            <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
              <Editor
                height="300px"
                defaultLanguage="json"
                value={responseBody}
                onChange={(value) => setResponseBody(value || '')}
                theme="vs-light"
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 2,
                  wordWrap: 'on',
                  readOnly: submitting,
                  formatOnPaste: true,
                  formatOnType: true,
                }}
              />
            </Paper>
          </Box>

          <Button
            variant="contained"
            onClick={handleSubmit}
            size="large"
            disabled={submitting || !path || !statusCode || !responseBody}
            startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : null}
          >
            {submitting ? (isEditMode ? 'Saving...' : 'Creating...') : (isEditMode ? 'Save Endpoint' : 'Create Endpoint')}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default EndpointPage;

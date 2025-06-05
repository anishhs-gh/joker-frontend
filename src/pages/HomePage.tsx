import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
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
  List,
  ListItem,
  ListItemText,
  Divider,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Tooltip,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import Navbar from '../components/Navbar';

interface Project {
  id: string;
  name: string;
  nameLower: string;
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

const STORAGE_KEY = 'mock-api-projects';

const HomePage: React.FC = () => {
  const [projectName, setProjectName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const navigate = useNavigate();

  const baseUrl = 'http://localhost:3000/_mock-api';

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        // Get stored project IDs
        const storedProjectIds = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        if (storedProjectIds.length === 0) {
          setProjects([]);
          setLoadingProjects(false);
          return;
        }

        // Fetch only the stored projects
        const response = await axios.get<Project[]>(`${baseUrl}/projects`);
        const filteredProjects = response.data.filter(project => 
          storedProjectIds.includes(project.nameLower)
        );
        setProjects(filteredProjects);
      } catch (error) {
        console.error('Error fetching projects:', error);
      } finally {
        setLoadingProjects(false);
      }
    };

    fetchProjects();
  }, []);

  const handleCreateProject = async () => {
    try {
      setError(null);
      setLoading(true);
      const trimmedName = projectName.trim();
      console.log('Creating project with name:', trimmedName);
      
      // Validate project name
      if (!trimmedName) {
        setError('Project name is required');
        return;
      }

      // Validate project name format
      if (!/^[a-z0-9-_]+$/.test(trimmedName)) {
        setError('Project name can only contain lowercase letters, numbers, hyphens, and underscores');
        return;
      }

      const response = await axios.post<Project>(`${baseUrl}/projects`, { 
        name: trimmedName 
      });
      console.log('Project creation response:', response.data);

      if (!response.data.nameLower) {
        console.error('Invalid response from server:', response.data);
        setError('Invalid response from server');
        return;
      }

      // Store the new project ID
      const storedProjectIds = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      if (!storedProjectIds.includes(response.data.nameLower)) {
        storedProjectIds.push(response.data.nameLower);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(storedProjectIds));
      }

      // Update projects list
      setProjects(prev => [...prev, response.data]);

      // Use the nameLower from the response for navigation
      const projectNameLower = response.data.nameLower;
      console.log('Navigating to project with nameLower:', projectNameLower);
      navigate(`/project/${projectNameLower}`);
    } catch (error) {
      console.error('Error creating project:', error);
      if (axios.isAxiosError(error)) {
        setError(error.response?.data?.error || 'Failed to create project');
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      setLoading(true);
      await axios.delete(`${baseUrl}/projects/${projectId}`);
      
      // Remove from localStorage
      const storedProjectIds = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      const updatedProjectIds = storedProjectIds.filter((id: string) => id !== projectId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedProjectIds));
      
      // Update projects list
      setProjects(projects.filter(project => project.nameLower !== projectId));
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setError(error.response?.data?.error || 'Failed to delete project');
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
      setDeleteDialogOpen(false);
      setProjectToDelete(null);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <Navbar />
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Paper elevation={3} sx={{ p: 4, mb: 3 }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 0 }}>
              Create a New Project
            </Typography>
          </Box>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Project Name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Enter project name (lowercase letters, numbers, hyphens, and underscores only)"
              variant="outlined"
              disabled={loading}
            />
            <Button
              variant="contained"
              onClick={handleCreateProject}
              size="large"
              disabled={!projectName.trim() || loading}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {loading ? 'Creating...' : 'Create Project'}
            </Button>
          </Box>
        </Paper>

        <Paper elevation={3}>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="h6">Your Projects</Typography>
          </Box>
          {loadingProjects ? (
            <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
              <CircularProgress />
            </Box>
          ) : projects.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">
                No projects found. Create your first project to get started.
              </Typography>
            </Box>
          ) : (
            <List>
              {projects.map((project, index) => (
                <React.Fragment key={project.id}>
                  <ListItem
                    component="div"
                    sx={{ 
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: 'action.hover',
                      },
                    }}
                    onClick={() => navigate(`/project/${project.nameLower}`)}
                    secondaryAction={
                      <Tooltip title="Delete Project">
                        <IconButton
                          edge="end"
                          aria-label="delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            setProjectToDelete(project.nameLower);
                            setDeleteDialogOpen(true);
                          }}
                          size="small"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    }
                  >
                    <ListItemText
                      primary={project.name}
                      secondary={`Created: ${new Date(project.createdAt).toLocaleString()}`}
                    />
                  </ListItem>
                  {index < projects.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </Paper>
      </Container>

      <Dialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setProjectToDelete(null);
        }}
      >
        <DialogTitle>Delete Project</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this project? This action cannot be undone and will delete all associated endpoints.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setDeleteDialogOpen(false);
              setProjectToDelete(null);
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={() => projectToDelete && handleDeleteProject(projectToDelete)}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </ThemeProvider>
  );
};

export default HomePage; 
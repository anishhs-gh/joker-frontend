import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  Box,
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
import { projectsApi, ApiRequestError } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import { Project } from '../types';

const HomePage: React.FC = () => {
  const [projectName, setProjectName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [deletingProject, setDeletingProject] = useState(false);
  const navigate = useNavigate();
  const { showError, showSuccess, showRateLimitError } = useNotification();

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        // Fetch all projects directly from backend (source of truth)
        const projectList = await projectsApi.list();
        setProjects(projectList);
      } catch (error) {
        console.error('Error fetching projects:', error);
        if (error instanceof ApiRequestError) {
          if (error.isRateLimited) {
            showRateLimitError();
          } else {
            showError(error.message);
          }
        }
      } finally {
        setLoadingProjects(false);
      }
    };

    fetchProjects();
  }, [showError, showRateLimitError]);

  const handleCreateProject = async () => {
    try {
      setError(null);
      setLoading(true);
      const trimmedName = projectName.trim();

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

      const newProject = await projectsApi.create({ name: trimmedName });

      if (!newProject.nameLower) {
        console.error('Invalid response from server:', newProject);
        setError('Invalid response from server');
        return;
      }

      // Update projects list
      setProjects(prev => [...prev, newProject]);
      showSuccess('Project created successfully');

      // Navigate to the new project
      navigate(`/project/${newProject.nameLower}`);
    } catch (error) {
      console.error('Error creating project:', error);
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
      setLoading(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      setDeletingProject(true);
      await projectsApi.delete(projectId);

      // Update projects list
      setProjects(projects.filter(project => project.nameLower !== projectId));
      showSuccess('Project deleted successfully');
    } catch (error) {
      if (error instanceof ApiRequestError) {
        if (error.isRateLimited) {
          showRateLimitError();
        } else {
          showError(error.message);
        }
      } else {
        showError('An unexpected error occurred');
      }
    } finally {
      setDeletingProject(false);
      setDeleteDialogOpen(false);
      setProjectToDelete(null);
    }
  };

  return (
    <>
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
          if (!deletingProject) {
            setDeleteDialogOpen(false);
            setProjectToDelete(null);
          }
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
            disabled={deletingProject}
          >
            Cancel
          </Button>
          <Button
            onClick={() => projectToDelete && handleDeleteProject(projectToDelete)}
            color="error"
            variant="contained"
            disabled={deletingProject}
            startIcon={deletingProject ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {deletingProject ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default HomePage;

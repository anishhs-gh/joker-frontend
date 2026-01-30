import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  Project,
  Endpoint,
  CreateProjectRequest,
  CreateEndpointRequest,
  UpdateEndpointRequest,
  ApiError,
  AuthResponse,
  LoginRequest,
  SignupRequest,
  User,
} from '../types';

// Environment configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';
const WS_BASE_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:3000';

// Control plane base path
const CONTROL_PLANE_PATH = '/_mock-api';

// Create axios instance with defaults
const apiClient: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}${CONTROL_PLANE_PATH}`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Error handler utility
export class ApiRequestError extends Error {
  status?: number;
  isRateLimited: boolean;
  isNetworkError: boolean;
  originalError: AxiosError;

  constructor(error: AxiosError<ApiError>) {
    const message = error.response?.data?.error
      || error.response?.data?.message
      || error.message
      || 'An unexpected error occurred';

    super(message);
    this.name = 'ApiRequestError';
    this.status = error.response?.status;
    this.isRateLimited = error.response?.status === 429;
    this.isNetworkError = !error.response;
    this.originalError = error;
  }
}

// Helper to handle API errors consistently
const handleApiError = (error: unknown): never => {
  if (axios.isAxiosError(error)) {
    throw new ApiRequestError(error as AxiosError<ApiError>);
  }
  throw error;
};

// ============ Project APIs ============

export const projectsApi = {
  /**
   * List all projects
   */
  list: async (): Promise<Project[]> => {
    try {
      const response = await apiClient.get<Project[]>('/projects');
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Get a single project by ID
   */
  get: async (projectId: string): Promise<Project> => {
    try {
      const response = await apiClient.get<Project>(`/projects/${projectId}`);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Create a new project
   */
  create: async (data: CreateProjectRequest): Promise<Project> => {
    try {
      const response = await apiClient.post<Project>('/projects', data);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Update a project
   */
  update: async (projectId: string, data: Partial<CreateProjectRequest>): Promise<Project> => {
    try {
      const response = await apiClient.patch<Project>(`/projects/${projectId}`, data);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Delete a project (cascades to endpoints)
   */
  delete: async (projectId: string): Promise<void> => {
    try {
      await apiClient.delete(`/projects/${projectId}`);
    } catch (error) {
      return handleApiError(error);
    }
  },
};

// ============ Endpoint APIs ============

export const endpointsApi = {
  /**
   * List all endpoints for a project
   */
  list: async (projectId: string): Promise<Endpoint[]> => {
    try {
      const response = await apiClient.get<Endpoint[]>(`/projects/${projectId}/endpoints`);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Get a single endpoint
   */
  get: async (projectId: string, endpointId: string): Promise<Endpoint> => {
    try {
      const response = await apiClient.get<Endpoint>(`/projects/${projectId}/endpoints/${endpointId}`);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Create a new endpoint
   */
  create: async (projectId: string, data: CreateEndpointRequest): Promise<Endpoint> => {
    try {
      const response = await apiClient.post<Endpoint>(`/projects/${projectId}/endpoints`, data);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Update an endpoint
   */
  update: async (projectId: string, endpointId: string, data: UpdateEndpointRequest): Promise<Endpoint> => {
    try {
      const response = await apiClient.put<Endpoint>(`/projects/${projectId}/endpoints/${endpointId}`, data);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Delete an endpoint
   */
  delete: async (projectId: string, endpointId: string): Promise<void> => {
    try {
      await apiClient.delete(`/projects/${projectId}/endpoints/${endpointId}`);
    } catch (error) {
      return handleApiError(error);
    }
  },
};

// ============ URL Utilities ============

/**
 * Get the mock API base URL for a project (used for calling mock endpoints)
 */
export const getMockApiUrl = (projectId: string): string => {
  return `${API_BASE_URL}/${projectId}`;
};

/**
 * Get the WebSocket URL for project logs
 */
export const getLogsWebSocketUrl = (projectId: string): string => {
  return `${WS_BASE_URL}/ws/logs?projectId=${projectId}`;
};

/**
 * Get the full URL for a specific mock endpoint
 */
export const getMockEndpointUrl = (projectId: string, path: string): string => {
  return `${API_BASE_URL}/${projectId}${path}`;
};

// ============ Auth Token Management ============

/**
 * Set the auth token for API requests
 */
export const setAuthToken = (token: string | null): void => {
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
  }
};

// ============ Auth APIs ============

export const authApi = {
  /**
   * Sign up a new user
   */
  signup: async (data: SignupRequest): Promise<AuthResponse> => {
    try {
      const response = await apiClient.post<AuthResponse>('/auth/signup', data);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Log in an existing user
   */
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    try {
      const response = await apiClient.post<AuthResponse>('/auth/login', data);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Get the current authenticated user
   */
  getMe: async (): Promise<User> => {
    try {
      const response = await apiClient.get<User>('/auth/me');
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
};

// Export the base URLs for components that need them
export { API_BASE_URL, WS_BASE_URL };

// Export the axios instance for advanced use cases
export { apiClient };

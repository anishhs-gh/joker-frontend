// Shared type definitions for the Joker Frontend

export interface Project {
  id: string;
  name: string;
  nameLower: string;
  createdAt: number;
  updatedAt: number;
  baseUrl?: string;
  userId?: string;
}

export interface EndpointResponse {
  status: number;
  body: any;
  headers?: Record<string, string>;
}

export interface Endpoint {
  id: string;
  projectId: string;
  path: string;
  method: HttpMethod;
  response: EndpointResponse;
  statusCode: number;
  delay: number;
  createdAt: number;
  updatedAt: number;
  userId?: string;
}

export interface LogEntry {
  timestamp: string;
  method: string;
  path: string;
  projectId: string;
  requestBody: any;
  responseStatus: number;
  responseBody: any;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

// API request/response types
export interface CreateProjectRequest {
  name: string;
  description?: string;
}

export interface CreateEndpointRequest {
  path: string;
  method: HttpMethod;
  response: {
    status: number;
    body: any;
    headers?: Record<string, string>;
  };
  delay?: number;
}

export interface UpdateEndpointRequest extends Partial<CreateEndpointRequest> {}

// API error response
export interface ApiError {
  error?: string;
  message?: string;
}

// WebSocket message types
export interface WsLogMessage extends LogEntry {
  type?: 'log';
}

export interface WsHistoryMessage {
  type: 'history';
  logs: LogEntry[];
}

export interface WsClearedMessage {
  type: 'cleared';
  message: string;
}

export interface WsPongMessage {
  type: 'pong';
}

export type WsServerMessage = WsLogMessage | WsHistoryMessage | WsClearedMessage | WsPongMessage;

export interface WsGetHistoryCommand {
  command: 'getHistory';
  limit?: number;
}

export interface WsClearLogsCommand {
  command: 'clearLogs';
}

export interface WsPingCommand {
  command: 'ping';
}

export type WsClientCommand = WsGetHistoryCommand | WsClearLogsCommand | WsPingCommand;

// ============ Auth Types ============

export interface User {
  uid: string;
  email: string;
  name?: string;
  apiTokenCreatedAt?: number | null;
  avatarColor?: string;
  emailVerified?: boolean;
}

// Email verification
export interface ResendVerificationRequest {
  idToken: string;
}

// Password management
export interface PasswordResetRequest {
  email: string;
}

export interface PasswordUpdateRequest {
  idToken: string;
  newPassword: string;
}

export interface AuthTokens {
  idToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  name: string;
}

export interface SignupResponse {
  idToken: string;
  email: string;
  localId: string;
  name: string;
  apiToken: string;
}

export interface RegenerateTokenRequest {
  name?: string;
}

export interface RegenerateTokenResponse {
  apiToken: string;
  createdAt: number;
  message: string;
}

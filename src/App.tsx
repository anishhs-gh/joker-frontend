import React from 'react';
import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ProjectPage from './pages/ProjectPage';
import EndpointPage from './pages/EndpointPage';
import EndpointLogsPage from './pages/EndpointLogsPage';

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/project/:projectId" element={<ProjectPage />} />
      <Route path="/project/:projectId/endpoint/:endpointId" element={<EndpointPage />} />
      <Route path="/project/:projectId/endpoint/new" element={<EndpointPage />} />
      <Route path="/project/:projectId/logs" element={<EndpointLogsPage />} />
    </Routes>
  );
};

export default App; 
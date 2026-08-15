import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { RootLayout } from './components/layout/RootLayout';
import { ProtectedRoute } from './components/ProtectedRoute';

import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Onboarding } from './pages/Onboarding';
import { Dashboard } from './pages/Dashboard';
import { People } from './pages/People';
import { Activities } from './pages/Activities';
import { AiCompanion } from './pages/AiCompanion';
import { Connections } from './pages/Connections';
import { Family } from './pages/Family';
import { Profile } from './pages/Profile';
import { PublicProfile } from './pages/PublicProfile';
import { Events } from './pages/Events';
import { AdminDashboard } from './pages/AdminDashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<RootLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/people" element={<People />} />
            <Route path="/activities" element={<Activities />} />
            <Route path="/events" element={<Events />} />
            <Route path="/ai-companion" element={<AiCompanion />} />
            <Route path="/connections" element={<Connections />} />
            <Route path="/family" element={<Family />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/users/:id" element={<PublicProfile />} />
            <Route path="/admin" element={<AdminDashboard />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

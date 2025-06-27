import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';
import WorkflowDemo from './pages/WorkflowDemo';
import LayoutDemo from './pages/LayoutDemo';
import ComponentShowcase from './pages/ComponentShowcase';

// Import placeholder pages (we'll create these)
import Dashboard from './pages/dashboard/Dashboard';
import Templates from './pages/templates/Templates';
import Prospects from './pages/prospects/Prospects';
import Batches from './pages/batches/Batches';
import Analytics from './pages/analytics/Analytics';
import Settings from './pages/settings/Settings';
import Profile from './pages/profile/Profile';
import SimpleWorkflow from './pages/workflow/SimpleWorkflow';
import Login from './pages/auth/Login';
import AddUser from './pages/auth/AddUser';

function App() {
  return (
    <AuthProvider>
      <Router basename='/cold-outreach'>
        <Routes>
          {/* Authentication routes (no layout) */}
          <Route path='/login' element={<Login />} />

          {/* Demo routes (keep these for development) */}
          <Route path='/demo/workflow' element={<WorkflowDemo />} />
          <Route path='/demo/layout' element={<LayoutDemo />} />
          <Route path='/demo/components' element={<ComponentShowcase />} />

          {/* Main application routes (protected) */}
          <Route
            path='/'
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to='/dashboard' replace />} />
            <Route path='dashboard' element={<Dashboard />} />

            {/* Template routes */}
            <Route path='templates' element={<Templates />} />
            <Route path='templates/create' element={<Templates />} />

            {/* Prospect routes */}
            <Route path='prospects' element={<Prospects />} />

            {/* Batch routes */}
            <Route path='batches' element={<Batches />} />

            {/* Workflow routes */}
            <Route path='workflow' element={<SimpleWorkflow />} />

            {/* Other routes */}
            <Route path='analytics' element={<Analytics />} />
            <Route path='profile' element={<Profile />} />
            <Route path='settings' element={<Settings />} />
          </Route>

          {/* Admin-only route */}
          <Route
            path='/add-user'
            element={
              <ProtectedRoute requireAdmin={true}>
                <AddUser />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

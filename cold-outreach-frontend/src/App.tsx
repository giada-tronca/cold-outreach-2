import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import WorkflowDemo from './pages/WorkflowDemo';
import LayoutDemo from './pages/LayoutDemo';
import ComponentShowcase from './pages/ComponentShowcase';

// Import placeholder pages (we'll create these)
import Dashboard from './pages/dashboard/Dashboard';
import Campaigns from './pages/campaigns/Campaigns';
import CreateCampaign from './pages/campaigns/CreateCampaign';
import CampaignTemplates from './pages/campaigns/CampaignTemplates';
import Prospects from './pages/prospects/Prospects';
import ImportProspects from './pages/prospects/ImportProspects';
import ProspectEnrichment from './pages/prospects/ProspectEnrichment';
import EmailGeneration from './pages/emails/EmailGeneration';
import Analytics from './pages/analytics/Analytics';
import Settings from './pages/settings/Settings';
import SimpleWorkflow from './pages/workflow/SimpleWorkflow';

function App() {
  return (
    <Router basename="/cold-outreach">
      <Routes>
        {/* Demo routes (keep these for development) */}
        <Route path='/demo/workflow' element={<WorkflowDemo />} />
        <Route path='/demo/layout' element={<LayoutDemo />} />
        <Route path='/demo/components' element={<ComponentShowcase />} />

        {/* Main application routes */}
        <Route path='/' element={<AppLayout />}>
          <Route index element={<Navigate to='/dashboard' replace />} />
          <Route path='dashboard' element={<Dashboard />} />

          {/* Campaign routes */}
          <Route path='campaigns' element={<Campaigns />} />
          <Route path='campaigns/new' element={<CreateCampaign />} />
          <Route path='campaigns/templates' element={<CampaignTemplates />} />

          {/* Prospect routes */}
          <Route path='prospects' element={<Prospects />} />
          <Route path='prospects/import' element={<ImportProspects />} />
          <Route path='prospects/enrichment' element={<ProspectEnrichment />} />

          {/* Workflow routes */}
          <Route path='workflow' element={<SimpleWorkflow />} />

          {/* Other routes */}
          <Route path='emails' element={<EmailGeneration />} />
          <Route path='analytics' element={<Analytics />} />
          <Route path='settings' element={<Settings />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;

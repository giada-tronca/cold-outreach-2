import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Mail,
  TrendingUp,
  Activity,
  Zap,
  Upload,
  Sparkles,
  FileText,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ProspectService } from '@/services/prospectService';
import { formatNumber, formatPercentage } from '@/lib/utils';

interface ProspectStats {
  totalProspects: number;
  enrichedProspects: number;
  emailsGenerated: number;
  changes: {
    totalProspects: number;
    enrichedProspects: number;
    emailsGenerated: number;
  };
}

export default function Dashboard() {
  const [stats, setStats] = useState<ProspectStats>({
    totalProspects: 0,
    enrichedProspects: 0,
    emailsGenerated: 0,
    changes: {
      totalProspects: 0,
      enrichedProspects: 0,
      emailsGenerated: 0,
    },
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await ProspectService.getProspectStats();
        if (response.success && response.data) {
          setStats(response.data);
        }
      } catch (error) {
        console.error('Error fetching prospect stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const handleStartEmailGeneration = () => {
    window.location.href = '/cold-outreach/workflow';
  };

  const handleBatchClick = () => {
    window.location.href = '/cold-outreach/batches';
  };

  return (
    <div className='p-6 space-y-8'>
      {/* Header */}
      <div className='mb-6'>
        <h1 className='text-3xl font-bold'>Dashboard</h1>
        <p className='text-muted-foreground'>
          Welcome to Cold Outreach AI - Enhance your sales with AI-powered Email generation
        </p>
      </div>

      {/* Email Generation Section */}
      <div className='bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-indigo-500/10 rounded-lg p-6 border border-blue-200/20'>
        <div className='flex items-center justify-between'>
          <div className='space-y-4'>
            <div className='flex items-center gap-2'>
              <Sparkles className='h-6 w-6 text-blue-600' />
              <h2 className='text-2xl font-bold'>Email Generation</h2>
              <Badge variant='secondary' className='ml-2'>
                AI-Powered
              </Badge>
            </div>
            <p className='text-muted-foreground max-w-md'>
              Transform your prospect data with AI-powered enrichment. Upload a
              CSV, configure settings, and generate personalized outreach emails
              in minutes.
            </p>
            <div className='flex gap-3'>
              <Button
                onClick={handleStartEmailGeneration}
                size='lg'
                className='flex items-center gap-2 cursor-pointer'
              >
                <Upload className='h-4 w-4' />
                Start Email Generation
              </Button>
            </div>
          </div>
          <div className='hidden md:block'>
            <div className='text-8xl opacity-20'>
              <Zap className='h-32 w-32 text-blue-600' />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Total Prospects
            </CardTitle>
            <Users className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {loading ? '...' : formatNumber(stats.totalProspects)}
            </div>
            <p className='text-xs text-muted-foreground'>
              {loading ? '...' : formatPercentage(stats.changes.totalProspects)} from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Prospects Enriched
            </CardTitle>
            <Activity className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {loading ? '...' : formatNumber(stats.enrichedProspects)}
            </div>
            <p className='text-xs text-muted-foreground'>
              {loading ? '...' : formatPercentage(stats.changes.enrichedProspects)} from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Emails Generated</CardTitle>
            <Mail className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {loading ? '...' : formatNumber(stats.emailsGenerated)}
            </div>
            <p className='text-xs text-muted-foreground'>
              {loading ? '...' : formatPercentage(stats.changes.emailsGenerated)} from last month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Section */}
      <div className='grid gap-6 md:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle>Recent Batches</CardTitle>
            <CardDescription>Your latest prospect batches</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='space-y-3'>
              <div
                className='flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors'
                onClick={() => handleBatchClick()}
              >
                <div>
                  <p className='font-medium'>Tech Prospects Q4</p>
                  <p className='text-sm text-muted-foreground'>
                    245 prospects • Completed
                  </p>
                </div>
                <Badge variant='default'>Complete</Badge>
              </div>
              <div
                className='flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors'
                onClick={() => handleBatchClick()}
              >
                <div>
                  <p className='font-medium'>SaaS Companies</p>
                  <p className='text-sm text-muted-foreground'>
                    189 prospects • In Progress
                  </p>
                </div>
                <Badge variant='secondary'>Processing</Badge>
              </div>
              <div
                className='flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors'
                onClick={() => handleBatchClick()}
              >
                <div>
                  <p className='font-medium'>Healthcare Leads</p>
                  <p className='text-sm text-muted-foreground'>
                    156 prospects • Paused
                  </p>
                </div>
                <Badge variant='outline'>Paused</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='space-y-4'>
              <Link to="/workflow">
                <Button variant='outline' className='w-full justify-start cursor-pointer'>
                  <Upload className='mr-2 h-4 w-4' />
                  Upload New CSV
                </Button>
              </Link>
              <Link to="/prospects">
                <Button variant='outline' className='w-full justify-start cursor-pointer'>
                  <Users className='mr-2 h-4 w-4' />
                  View All Prospects
                </Button>
              </Link>
              <Link to="/templates">
                <Button variant='outline' className='w-full justify-start cursor-pointer'>
                  <FileText className='mr-2 h-4 w-4' />
                  Manage Templates
                </Button>
              </Link>
              <Link to="/analytics">
                <Button variant='outline' className='w-full justify-start cursor-pointer'>
                  <TrendingUp className='mr-2 h-4 w-4' />
                  View Analytics
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

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
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export default function Dashboard() {
  const handleStartEnrichment = () => {
    window.location.href = '/workflow';
  };

  return (
    <div className='p-6 space-y-8'>
      {/* Header */}
      <div className='mb-6'>
        <h1 className='text-3xl font-bold'>Dashboard</h1>
        <p className='text-muted-foreground'>
          Welcome to Cold Outreach AI - Enhance your sales with AI-powered
          prospect enrichment
        </p>
      </div>

      {/* Prospect Enrichment Section */}
      <div className='bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-indigo-500/10 rounded-lg p-6 border border-blue-200/20'>
        <div className='flex items-center justify-between'>
          <div className='space-y-4'>
            <div className='flex items-center gap-2'>
              <Sparkles className='h-6 w-6 text-blue-600' />
              <h2 className='text-2xl font-bold'>Prospect Enrichment</h2>
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
                onClick={handleStartEnrichment}
                size='lg'
                className='flex items-center gap-2'
              >
                <Upload className='h-4 w-4' />
                Start Prospect Enrichment
                <ArrowRight className='h-4 w-4' />
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
      <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-4'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Total Prospects
            </CardTitle>
            <Users className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>1,234</div>
            <p className='text-xs text-muted-foreground'>
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Active Campaigns
            </CardTitle>
            <Activity className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>3</div>
            <p className='text-xs text-muted-foreground'>2 running, 1 paused</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Emails Sent</CardTitle>
            <Mail className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>456</div>
            <p className='text-xs text-muted-foreground'>+23% from last week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Response Rate</CardTitle>
            <TrendingUp className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>24%</div>
            <p className='text-xs text-muted-foreground'>+4% from last month</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Section */}
      <div className='grid gap-6 md:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle>Recent Workflows</CardTitle>
            <CardDescription>Your latest enrichment workflows</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='space-y-3'>
              <div className='flex items-center justify-between p-3 border rounded-lg'>
                <div>
                  <p className='font-medium'>Tech Prospects Q4</p>
                  <p className='text-sm text-muted-foreground'>
                    245 prospects • Completed
                  </p>
                </div>
                <Badge variant='default'>Complete</Badge>
              </div>
              <div className='flex items-center justify-between p-3 border rounded-lg'>
                <div>
                  <p className='font-medium'>SaaS Companies</p>
                  <p className='text-sm text-muted-foreground'>
                    189 prospects • In Progress
                  </p>
                </div>
                <Badge variant='secondary'>Processing</Badge>
              </div>
              <div className='flex items-center justify-between p-3 border rounded-lg'>
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
            <div className='space-y-3'>
              <Button variant='outline' className='w-full justify-start'>
                <Upload className='mr-2 h-4 w-4' />
                Upload New CSV
              </Button>
              <Button variant='outline' className='w-full justify-start'>
                <Users className='mr-2 h-4 w-4' />
                View All Prospects
              </Button>
              <Button variant='outline' className='w-full justify-start'>
                <Activity className='mr-2 h-4 w-4' />
                Manage Campaigns
              </Button>
              <Button variant='outline' className='w-full justify-start'>
                <TrendingUp className='mr-2 h-4 w-4' />
                View Analytics
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// useState not needed for this demo
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Users,
  Target,
  Mail,
  TrendingUp,
  Plus,
  ArrowRight,
  Zap,
  Clock,
  CheckCircle,
} from 'lucide-react';

export default function LayoutDemo() {
  return (
    <div className='space-y-8'>
      {/* Page Header */}
      <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>Dashboard</h1>
          <p className='text-muted-foreground'>
            Welcome back! Here's what's happening with your cold outreach
            campaigns.
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <Button>
            <Plus className='mr-2 h-4 w-4' />
            New Campaign
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Total Prospects
            </CardTitle>
            <Users className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>1,284</div>
            <p className='text-xs text-muted-foreground'>
              +20.1% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Active Campaigns
            </CardTitle>
            <Target className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>23</div>
            <p className='text-xs text-muted-foreground'>+3 new this week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Emails Generated
            </CardTitle>
            <Mail className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>856</div>
            <p className='text-xs text-muted-foreground'>+12% from last week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Response Rate</CardTitle>
            <TrendingUp className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>24.5%</div>
            <p className='text-xs text-muted-foreground'>
              +2.3% from last month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className='grid gap-6 lg:grid-cols-2'>
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest updates on your campaigns and prospects
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='flex items-center gap-3'>
              <div className='flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-600'>
                <CheckCircle className='h-4 w-4' />
              </div>
              <div className='flex-1 space-y-1'>
                <p className='text-sm font-medium'>
                  Campaign "Q1 Outreach" completed
                </p>
                <p className='text-xs text-muted-foreground'>
                  Generated 45 emails for SaaS prospects
                </p>
              </div>
              <Badge variant='secondary'>2m ago</Badge>
            </div>

            <div className='flex items-center gap-3'>
              <div className='flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600'>
                <Zap className='h-4 w-4' />
              </div>
              <div className='flex-1 space-y-1'>
                <p className='text-sm font-medium'>150 prospects enriched</p>
                <p className='text-xs text-muted-foreground'>
                  Added LinkedIn profiles and company data
                </p>
              </div>
              <Badge variant='secondary'>15m ago</Badge>
            </div>

            <div className='flex items-center gap-3'>
              <div className='flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-orange-600'>
                <Clock className='h-4 w-4' />
              </div>
              <div className='flex-1 space-y-1'>
                <p className='text-sm font-medium'>New prospects uploaded</p>
                <p className='text-xs text-muted-foreground'>
                  CSV file with 89 new prospects processed
                </p>
              </div>
              <Badge variant='secondary'>1h ago</Badge>
            </div>

            <Button variant='outline' className='w-full'>
              View All Activity
              <ArrowRight className='ml-2 h-4 w-4' />
            </Button>
          </CardContent>
        </Card>

        {/* Current Campaign Progress */}
        <Card>
          <CardHeader>
            <CardTitle>Current Campaign Progress</CardTitle>
            <CardDescription>
              "Enterprise SaaS Q1 2024" campaign status
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-6'>
            <div className='space-y-3'>
              <div className='flex justify-between text-sm'>
                <span>Prospects Enriched</span>
                <span>156/200</span>
              </div>
              <Progress value={78} className='h-2' />
            </div>

            <div className='space-y-3'>
              <div className='flex justify-between text-sm'>
                <span>Emails Generated</span>
                <span>134/156</span>
              </div>
              <Progress value={86} className='h-2' />
            </div>

            <div className='space-y-3'>
              <div className='flex justify-between text-sm'>
                <span>Campaign Completion</span>
                <span>67%</span>
              </div>
              <Progress value={67} className='h-2' />
            </div>

            <div className='grid grid-cols-2 gap-3'>
              <Button variant='outline' size='sm'>
                View Details
              </Button>
              <Button size='sm'>Continue Workflow</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Prospect Enrichment Section */}
      <Card className='bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 border-blue-200 dark:border-blue-800'>
        <CardHeader>
          <div className='flex items-center gap-3'>
            <div className='flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400'>
              <Users className='h-6 w-6' />
            </div>
            <div>
              <CardTitle className='text-xl'>Prospect Enrichment</CardTitle>
              <CardDescription>
                Enhance your prospect data with AI-powered enrichment
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className='space-y-6'>
          <div className='grid gap-4 md:grid-cols-3'>
            <div className='space-y-2'>
              <h4 className='font-medium flex items-center gap-2'>
                <div className='h-2 w-2 rounded-full bg-green-500'></div>
                LinkedIn Profiles
              </h4>
              <p className='text-sm text-muted-foreground'>
                Automatically find and enrich LinkedIn profiles
              </p>
            </div>
            <div className='space-y-2'>
              <h4 className='font-medium flex items-center gap-2'>
                <div className='h-2 w-2 rounded-full bg-blue-500'></div>
                Company Data
              </h4>
              <p className='text-sm text-muted-foreground'>
                Gather detailed company information and insights
              </p>
            </div>
            <div className='space-y-2'>
              <h4 className='font-medium flex items-center gap-2'>
                <div className='h-2 w-2 rounded-full bg-purple-500'></div>
                AI Analysis
              </h4>
              <p className='text-sm text-muted-foreground'>
                Generate personalized insights and talking points
              </p>
            </div>
          </div>

          <div className='flex gap-3'>
            <Button>Start Enrichment</Button>
            <Button variant='outline'>Learn More</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BarChart3, TrendingUp, Mail, Users } from 'lucide-react';

export default function Analytics() {
  return (
    <div className='p-6'>
      <div className='mb-6'>
        <h1 className='text-3xl font-bold'>Analytics</h1>
        <p className='text-muted-foreground'>
          Track your outreach performance and metrics
        </p>
      </div>

      <div className='grid gap-6'>
        {/* KPI Cards */}
        <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-4'>
          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>Open Rate</CardTitle>
              <Mail className='h-4 w-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>68%</div>
              <p className='text-xs text-muted-foreground'>
                +5% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                Response Rate
              </CardTitle>
              <TrendingUp className='h-4 w-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>24%</div>
              <p className='text-xs text-muted-foreground'>
                +2% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>Click Rate</CardTitle>
              <BarChart3 className='h-4 w-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>12%</div>
              <p className='text-xs text-muted-foreground'>
                +1% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                Meetings Booked
              </CardTitle>
              <Users className='h-4 w-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>18</div>
              <p className='text-xs text-muted-foreground'>
                +6 from last month
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Campaign Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Campaign Performance</CardTitle>
            <CardDescription>
              Performance metrics for your active campaigns
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-6'>
            <div>
              <div className='flex justify-between text-sm mb-2'>
                <span>Summer Product Launch</span>
                <span>78% open rate</span>
              </div>
              <Progress value={78} className='h-2' />
            </div>

            <div>
              <div className='flex justify-between text-sm mb-2'>
                <span>Q1 Lead Generation</span>
                <span>65% open rate</span>
              </div>
              <Progress value={65} className='h-2' />
            </div>

            <div>
              <div className='flex justify-between text-sm mb-2'>
                <span>Partnership Outreach</span>
                <span>45% open rate</span>
              </div>
              <Progress value={45} className='h-2' />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

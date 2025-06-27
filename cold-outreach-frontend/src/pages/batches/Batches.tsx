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
  Calendar,
  TrendingUp,
  Eye,
  Download,
  Play,
  Pause,
  MoreHorizontal,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function Batches() {
  const batches = [
    {
      id: 1,
      name: 'Tech Prospects Q4',
      status: 'completed',
      totalProspects: 245,
      enrichedProspects: 245,
      generatedEmails: 230,
      createdAt: '2024-01-15',
      completedAt: '2024-01-16',
    },
    {
      id: 2,
      name: 'SaaS Companies',
      status: 'processing',
      totalProspects: 189,
      enrichedProspects: 156,
      generatedEmails: 89,
      createdAt: '2024-01-14',
      completedAt: null,
    },
    {
      id: 3,
      name: 'Healthcare Leads',
      status: 'paused',
      totalProspects: 156,
      enrichedProspects: 78,
      generatedEmails: 45,
      createdAt: '2024-01-13',
      completedAt: null,
    },
    {
      id: 4,
      name: 'Financial Services',
      status: 'completed',
      totalProspects: 312,
      enrichedProspects: 312,
      generatedEmails: 295,
      createdAt: '2024-01-10',
      completedAt: '2024-01-12',
    },
    {
      id: 5,
      name: 'E-commerce Startups',
      status: 'failed',
      totalProspects: 89,
      enrichedProspects: 23,
      generatedEmails: 0,
      createdAt: '2024-01-09',
      completedAt: null,
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant='default'>Completed</Badge>;
      case 'processing':
        return <Badge variant='secondary'>Processing</Badge>;
      case 'paused':
        return <Badge variant='outline'>Paused</Badge>;
      case 'failed':
        return <Badge variant='destructive'>Failed</Badge>;
      default:
        return <Badge variant='outline'>{status}</Badge>;
    }
  };

  const getProgressPercentage = (enriched: number, total: number) => {
    return Math.round((enriched / total) * 100);
  };

  return (
    <div className='p-6 space-y-6'>
      {/* Header */}
      <div className='flex justify-between items-center'>
        <div>
          <h1 className='text-3xl font-bold'>Prospect Batches</h1>
          <p className='text-muted-foreground'>
            Manage and monitor your prospect enrichment batches
          </p>
        </div>
        <Button>
          <Users className='h-4 w-4 mr-2' />
          New Batch
        </Button>
      </div>

      {/* Stats Overview */}
      <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-4'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Total Batches</CardTitle>
            <Users className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{batches.length}</div>
            <p className='text-xs text-muted-foreground'>
              {batches.filter(b => b.status === 'completed').length} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Total Prospects
            </CardTitle>
            <Users className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {batches.reduce((sum, batch) => sum + batch.totalProspects, 0)}
            </div>
            <p className='text-xs text-muted-foreground'>Across all batches</p>
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
            <div className='text-2xl font-bold'>
              {batches.reduce((sum, batch) => sum + batch.generatedEmails, 0)}
            </div>
            <p className='text-xs text-muted-foreground'>Ready to send</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Success Rate</CardTitle>
            <TrendingUp className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>87%</div>
            <p className='text-xs text-muted-foreground'>
              Average completion rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Batches List */}
      <Card>
        <CardHeader>
          <CardTitle>All Batches</CardTitle>
          <CardDescription>
            View and manage your prospect enrichment batches
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            {batches.map(batch => (
              <div
                key={batch.id}
                className='flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors'
              >
                <div className='flex items-center space-x-4'>
                  <div className='flex-1'>
                    <div className='flex items-center gap-3'>
                      <h3 className='font-semibold'>{batch.name}</h3>
                      {getStatusBadge(batch.status)}
                    </div>
                    <div className='flex items-center gap-4 mt-2 text-sm text-muted-foreground'>
                      <span className='flex items-center gap-1'>
                        <Users className='h-3 w-3' />
                        {batch.totalProspects} prospects
                      </span>
                      <span className='flex items-center gap-1'>
                        <Mail className='h-3 w-3' />
                        {batch.generatedEmails} emails
                      </span>
                      <span className='flex items-center gap-1'>
                        <Calendar className='h-3 w-3' />
                        {new Date(batch.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className='flex items-center space-x-4'>
                  {/* Progress */}
                  <div className='text-right'>
                    <div className='text-sm font-medium'>
                      {getProgressPercentage(
                        batch.enrichedProspects,
                        batch.totalProspects
                      )}
                      % Complete
                    </div>
                    <div className='w-24 bg-muted rounded-full h-2 mt-1'>
                      <div
                        className='bg-primary h-2 rounded-full transition-all'
                        style={{
                          width: `${getProgressPercentage(batch.enrichedProspects, batch.totalProspects)}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className='flex items-center gap-2'>
                    <Button variant='outline' size='sm'>
                      <Eye className='h-4 w-4 mr-1' />
                      View
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant='outline' size='sm'>
                          <MoreHorizontal className='h-4 w-4' />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align='end'>
                        <DropdownMenuItem>
                          <Download className='h-4 w-4 mr-2' />
                          Download CSV
                        </DropdownMenuItem>
                        {batch.status === 'paused' && (
                          <DropdownMenuItem>
                            <Play className='h-4 w-4 mr-2' />
                            Resume
                          </DropdownMenuItem>
                        )}
                        {batch.status === 'processing' && (
                          <DropdownMenuItem>
                            <Pause className='h-4 w-4 mr-2' />
                            Pause
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Database, Zap, CheckCircle } from 'lucide-react';

export default function ProspectEnrichment() {
  return (
    <div className='p-6'>
      <div className='mb-6'>
        <h1 className='text-3xl font-bold'>Prospect Enrichment</h1>
        <p className='text-muted-foreground'>
          Enhance your prospect data with additional information
        </p>
      </div>

      <div className='grid gap-6 md:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Database className='h-5 w-5' />
              Enrichment Status
            </CardTitle>
            <CardDescription>
              Current enrichment progress for your prospects
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div>
              <div className='flex justify-between text-sm mb-2'>
                <span>Email Verification</span>
                <span>85%</span>
              </div>
              <Progress value={85} className='h-2' />
            </div>

            <div>
              <div className='flex justify-between text-sm mb-2'>
                <span>Job Title Enrichment</span>
                <span>67%</span>
              </div>
              <Progress value={67} className='h-2' />
            </div>

            <div>
              <div className='flex justify-between text-sm mb-2'>
                <span>Company Info</span>
                <span>92%</span>
              </div>
              <Progress value={92} className='h-2' />
            </div>

            <div>
              <div className='flex justify-between text-sm mb-2'>
                <span>Social Profiles</span>
                <span>45%</span>
              </div>
              <Progress value={45} className='h-2' />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Zap className='h-5 w-5' />
              Enrichment Actions
            </CardTitle>
            <CardDescription>
              Start enrichment processes for your prospects
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='space-y-3'>
              <div className='flex items-center justify-between p-3 border rounded-lg'>
                <div className='flex items-center gap-3'>
                  <CheckCircle className='h-4 w-4 text-green-500' />
                  <span className='text-sm'>Email Validation</span>
                </div>
                <Button size='sm' variant='outline'>
                  Start
                </Button>
              </div>

              <div className='flex items-center justify-between p-3 border rounded-lg'>
                <div className='flex items-center gap-3'>
                  <CheckCircle className='h-4 w-4 text-green-500' />
                  <span className='text-sm'>LinkedIn Lookup</span>
                </div>
                <Button size='sm' variant='outline'>
                  Start
                </Button>
              </div>

              <div className='flex items-center justify-between p-3 border rounded-lg'>
                <div className='flex items-center gap-3'>
                  <CheckCircle className='h-4 w-4 text-green-500' />
                  <span className='text-sm'>Company Research</span>
                </div>
                <Button size='sm' variant='outline'>
                  Start
                </Button>
              </div>
            </div>

            <Button className='w-full'>
              <Zap className='h-4 w-4 mr-2' />
              Enrich All Prospects
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

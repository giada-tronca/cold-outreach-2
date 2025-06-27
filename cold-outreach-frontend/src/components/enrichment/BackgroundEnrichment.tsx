import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { apiClient, handleApiResponse } from '@/services/api';

interface EnrichmentJob {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: {
    progress: number;
    status: string;
    startTime?: string;
  };
  prospect: {
    id: number;
    name: string;
    email: string;
    company?: string;
    position?: string;
    linkedinUrl: string;
  };
  result?: any;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

interface EnrichmentForm {
  linkedinUrl: string;
  aiProvider: 'gemini' | 'openrouter';
  email: string;
  name: string;
  company: string;
  position: string;
  phone: string;
}

const BackgroundEnrichment: React.FC = () => {
  const [form, setForm] = useState<EnrichmentForm>({
    linkedinUrl: '',
    aiProvider: 'gemini',
    email: '',
    name: '',
    company: '',
    position: '',
    phone: '',
  });

  const [jobs, setJobs] = useState<EnrichmentJob[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Poll for job updates
  useEffect(() => {
    const activeJobs = jobs.filter(
      job => job.status === 'pending' || job.status === 'processing'
    );

    if (activeJobs.length === 0) return;

    const interval = setInterval(async () => {
      for (const job of activeJobs) {
        try {
          const response = await apiClient.get(
            `/api/prospects/enrich/jobs/${job.jobId}`
          );
          const data = await handleApiResponse(response);

          if (data.success) {
            setJobs(prevJobs =>
              prevJobs.map(prevJob =>
                prevJob.jobId === job.jobId
                  ? { ...prevJob, ...data.data }
                  : prevJob
              )
            );
          }
        } catch (error) {
          console.error('Error polling job status:', error);
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [jobs]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await apiClient.post('/api/prospects/enrich/queue', {
        ...form,
        userId: 'user123', // In real app, get from auth context
        campaignId: 1,
      });

      const data = await handleApiResponse(response);

      if (data.success) {
        const newJob: EnrichmentJob = {
          jobId: data.data.jobId,
          status: 'pending',
          progress: {
            progress: 0,
            status: 'Queued for processing',
          },
          prospect: data.data.prospect,
          createdAt: new Date().toISOString(),
        };

        setJobs(prevJobs => [newJob, ...prevJobs]);

        // Reset form
        setForm({
          linkedinUrl: '',
          aiProvider: 'gemini',
          email: '',
          name: '',
          company: '',
          position: '',
          phone: '',
        });
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('Failed to queue enrichment job');
      console.error('Error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className='h-4 w-4 text-yellow-500' />;
      case 'processing':
        return <Loader2 className='h-4 w-4 text-blue-500 animate-spin' />;
      case 'completed':
        return <CheckCircle className='h-4 w-4 text-green-500' />;
      case 'failed':
        return <AlertCircle className='h-4 w-4 text-red-500' />;
      default:
        return null;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending':
        return 'default';
      case 'processing':
        return 'default';
      case 'completed':
        return 'default';
      case 'failed':
        return 'destructive';
      default:
        return 'default';
    }
  };

  return (
    <div className='max-w-4xl mx-auto p-6 space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle>Background Prospect Enrichment</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className='space-y-4'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <label className='text-sm font-medium'>LinkedIn URL *</label>
                <Input
                  type='url'
                  placeholder='https://linkedin.com/in/profile'
                  value={form.linkedinUrl}
                  onChange={e =>
                    setForm({ ...form, linkedinUrl: e.target.value })
                  }
                  required
                />
              </div>

              <div className='space-y-2'>
                <label className='text-sm font-medium'>AI Provider</label>
                <select
                  className='w-full p-2 border rounded-md'
                  value={form.aiProvider}
                  onChange={e =>
                    setForm({
                      ...form,
                      aiProvider: e.target.value as 'gemini' | 'openrouter',
                    })
                  }
                >
                  <option value='gemini'>Google Gemini Flash 2.0</option>
                  <option value='openrouter'>OpenRouter O1-mini</option>
                </select>
              </div>

              <div className='space-y-2'>
                <label className='text-sm font-medium'>Email</label>
                <Input
                  type='email'
                  placeholder='john@company.com'
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                />
              </div>

              <div className='space-y-2'>
                <label className='text-sm font-medium'>Name</label>
                <Input
                  placeholder='John Doe'
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div className='space-y-2'>
                <label className='text-sm font-medium'>Company</label>
                <Input
                  placeholder='TechCorp'
                  value={form.company}
                  onChange={e => setForm({ ...form, company: e.target.value })}
                />
              </div>

              <div className='space-y-2'>
                <label className='text-sm font-medium'>Position</label>
                <Input
                  placeholder='Senior Engineer'
                  value={form.position}
                  onChange={e => setForm({ ...form, position: e.target.value })}
                />
              </div>
            </div>

            {error && (
              <Alert>
                <AlertCircle className='h-4 w-4' />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type='submit'
              disabled={isSubmitting || !form.linkedinUrl}
              className='w-full'
            >
              {isSubmitting ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Queueing...
                </>
              ) : (
                'Queue Enrichment Job'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {jobs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Enrichment Jobs ({jobs.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='space-y-4'>
              {jobs.map(job => (
                <div
                  key={job.jobId}
                  className='border rounded-lg p-4 space-y-3'
                >
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center space-x-2'>
                      {getStatusIcon(job.status)}
                      <h3 className='font-medium'>
                        {job.prospect.name || 'Unknown'}
                      </h3>
                      <Badge variant={getStatusBadgeVariant(job.status)}>
                        {job.status.toUpperCase()}
                      </Badge>
                    </div>
                    <span className='text-sm text-gray-500'>
                      Job {job.jobId.slice(-8)}
                    </span>
                  </div>

                  <div className='grid grid-cols-1 md:grid-cols-2 gap-2 text-sm'>
                    <div>
                      <strong>Email:</strong> {job.prospect.email}
                    </div>
                    <div>
                      <strong>Company:</strong> {job.prospect.company || 'N/A'}
                    </div>
                    <div>
                      <strong>Position:</strong>{' '}
                      {job.prospect.position || 'N/A'}
                    </div>
                    <div>
                      <strong>Prospect ID:</strong> {job.prospect.id}
                    </div>
                  </div>

                  {(job.status === 'processing' ||
                    job.status === 'pending') && (
                      <div className='space-y-2'>
                        <div className='flex justify-between text-sm'>
                          <span>{job.progress.status}</span>
                          <span>{job.progress.progress}%</span>
                        </div>
                        <Progress
                          value={job.progress.progress}
                          className='w-full'
                        />
                      </div>
                    )}

                  {job.status === 'completed' && job.result && (
                    <Alert>
                      <CheckCircle className='h-4 w-4' />
                      <AlertDescription>
                        <strong>Enrichment Completed!</strong>
                        <br />
                        {job.result.data?.aiSummary && (
                          <div className='mt-2 p-2 bg-gray-50 rounded text-sm'>
                            <strong>AI Summary:</strong>{' '}
                            {job.result.data.aiSummary.slice(0, 200)}...
                          </div>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}

                  {job.status === 'failed' && (
                    <Alert>
                      <AlertCircle className='h-4 w-4' />
                      <AlertDescription>
                        <strong>Enrichment Failed:</strong> {job.error}
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className='text-xs text-gray-500'>
                    Created: {new Date(job.createdAt).toLocaleString()}
                    {job.completedAt && (
                      <>
                        {' '}
                        • Completed:{' '}
                        {new Date(job.completedAt).toLocaleString()}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BackgroundEnrichment;

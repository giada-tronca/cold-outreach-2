import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Mail, Sparkles, RefreshCw } from 'lucide-react';

export default function EmailGeneration() {
  return (
    <div className='p-6'>
      <div className='mb-6'>
        <h1 className='text-3xl font-bold'>AI Email Generation</h1>
        <p className='text-muted-foreground'>
          Generate personalized emails with AI
        </p>
      </div>

      <div className='grid gap-6 lg:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Sparkles className='h-5 w-5' />
              AI Email Generator
            </CardTitle>
            <CardDescription>
              Generate personalized emails for your prospects
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div>
              <label className='text-sm font-medium mb-2 block'>
                Prospect Information
              </label>
              <div className='text-sm text-muted-foreground mb-2'>
                <strong>John Smith</strong> - CEO at TechCorp Inc.
              </div>
            </div>

            <div>
              <label className='text-sm font-medium mb-2 block'>
                Email Purpose
              </label>
              <div className='flex gap-2 mb-4'>
                <Badge variant='secondary'>Product Introduction</Badge>
                <Badge variant='outline'>Meeting Request</Badge>
                <Badge variant='outline'>Follow-up</Badge>
              </div>
            </div>

            <Button className='w-full'>
              <Sparkles className='h-4 w-4 mr-2' />
              Generate Email
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Mail className='h-5 w-5' />
              Generated Email
            </CardTitle>
            <CardDescription>
              AI-generated personalized email content
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <Textarea
              className='min-h-[200px]'
              placeholder='Generated email will appear here...'
              defaultValue="Subject: Introducing Our Revolutionary CRM Solution for TechCorp

Hi John,

I hope this email finds you well. I came across TechCorp Inc. and was impressed by your recent expansion into the European market.

As CEO, I imagine you're constantly looking for ways to streamline operations and boost efficiency. Our AI-powered CRM solution has helped similar companies reduce customer acquisition costs by 40% while increasing sales productivity.

Would you be open to a brief 15-minute call next week to discuss how we could help TechCorp achieve similar results?

Best regards,
[Your Name]"
            />

            <div className='flex gap-2'>
              <Button variant='outline' size='sm'>
                <RefreshCw className='h-4 w-4 mr-2' />
                Regenerate
              </Button>
              <Button size='sm'>Use This Email</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function CampaignTemplates() {
  return (
    <div className='p-6'>
      <div className='flex justify-between items-center mb-6'>
        <div>
          <h1 className='text-3xl font-bold'>Campaign Templates</h1>
          <p className='text-muted-foreground'>
            Pre-built email templates for your campaigns
          </p>
        </div>
        <Button>
          <Plus className='h-4 w-4 mr-2' />
          New Template
        </Button>
      </div>

      <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
        <Card>
          <CardHeader>
            <CardTitle>Product Introduction</CardTitle>
            <CardDescription>
              Template for introducing new products
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className='text-sm text-muted-foreground mb-4'>
              "Hi &#123;firstName&#125;, I wanted to introduce you to our new
              product..."
            </div>
            <Button variant='outline' size='sm'>
              Use Template
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Follow-up Email</CardTitle>
            <CardDescription>Standard follow-up template</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='text-sm text-muted-foreground mb-4'>
              "Hi &#123;firstName&#125;, I wanted to follow up on my previous
              email..."
            </div>
            <Button variant='outline' size='sm'>
              Use Template
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Meeting Request</CardTitle>
            <CardDescription>Template for requesting meetings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='text-sm text-muted-foreground mb-4'>
              "Hi &#123;firstName&#125;, I'd love to schedule a brief 15-minute
              call..."
            </div>
            <Button variant='outline' size='sm'>
              Use Template
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

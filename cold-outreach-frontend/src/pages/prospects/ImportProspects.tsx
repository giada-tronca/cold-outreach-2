import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileText, Download } from 'lucide-react';

export default function ImportProspects() {
  return (
    <div className='p-6'>
      <div className='mb-6'>
        <h1 className='text-3xl font-bold'>Import Prospects</h1>
        <p className='text-muted-foreground'>
          Upload your prospect data from CSV or Excel files
        </p>
      </div>

      <div className='grid gap-6 md:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Upload className='h-5 w-5' />
              Upload File
            </CardTitle>
            <CardDescription>
              Upload a CSV or Excel file with your prospect data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className='border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center'>
              <Upload className='h-12 w-12 mx-auto text-muted-foreground mb-4' />
              <p className='text-sm text-muted-foreground mb-4'>
                Drag and drop your file here, or click to browse
              </p>
              <Button>Choose File</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <FileText className='h-5 w-5' />
              Template & Guidelines
            </CardTitle>
            <CardDescription>
              Download our template and follow the import guidelines
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div>
              <h4 className='font-medium mb-2'>Required Fields:</h4>
              <ul className='text-sm text-muted-foreground space-y-1'>
                <li>• First Name</li>
                <li>• Last Name</li>
                <li>• Email Address</li>
                <li>• Company Name</li>
              </ul>
            </div>

            <div>
              <h4 className='font-medium mb-2'>Optional Fields:</h4>
              <ul className='text-sm text-muted-foreground space-y-1'>
                <li>• Job Title</li>
                <li>• Phone Number</li>
                <li>• LinkedIn URL</li>
                <li>• Notes</li>
              </ul>
            </div>

            <Button variant='outline' className='w-full'>
              <Download className='h-4 w-4 mr-2' />
              Download Template
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

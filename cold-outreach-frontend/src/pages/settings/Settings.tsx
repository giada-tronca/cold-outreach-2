import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Settings as SettingsIcon, Mail, Bell, Shield } from 'lucide-react';

export default function Settings() {
  return (
    <div className='p-6'>
      <div className='mb-6'>
        <h1 className='text-3xl font-bold'>Settings</h1>
        <p className='text-muted-foreground'>
          Manage your account and application preferences
        </p>
      </div>

      <div className='grid gap-6'>
        {/* Account Settings */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <SettingsIcon className='h-5 w-5' />
              Account Settings
            </CardTitle>
            <CardDescription>
              Manage your personal account information
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='firstName'>First Name</Label>
                <Input id='firstName' defaultValue='John' />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='lastName'>Last Name</Label>
                <Input id='lastName' defaultValue='Doe' />
              </div>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='email'>Email Address</Label>
              <Input
                id='email'
                type='email'
                defaultValue='john.doe@example.com'
              />
            </div>

            <Button>Save Changes</Button>
          </CardContent>
        </Card>

        {/* Email Settings */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Mail className='h-5 w-5' />
              Email Settings
            </CardTitle>
            <CardDescription>
              Configure your email sending preferences
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='fromName'>From Name</Label>
              <Input id='fromName' defaultValue='John Doe' />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='fromEmail'>From Email</Label>
              <Input
                id='fromEmail'
                type='email'
                defaultValue='john@company.com'
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='signature'>Email Signature</Label>
              <Input id='signature' defaultValue='Best regards, John Doe' />
            </div>

            <Button>Update Email Settings</Button>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Bell className='h-5 w-5' />
              Notifications
            </CardTitle>
            <CardDescription>
              Manage your notification preferences
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='flex items-center justify-between'>
              <div>
                <Label htmlFor='emailNotifs'>Email Notifications</Label>
                <p className='text-sm text-muted-foreground'>
                  Receive email updates about your campaigns
                </p>
              </div>
              <Switch id='emailNotifs' defaultChecked />
            </div>

            <Separator />

            <div className='flex items-center justify-between'>
              <div>
                <Label htmlFor='responseNotifs'>Response Notifications</Label>
                <p className='text-sm text-muted-foreground'>
                  Get notified when prospects respond
                </p>
              </div>
              <Switch id='responseNotifs' defaultChecked />
            </div>

            <Separator />

            <div className='flex items-center justify-between'>
              <div>
                <Label htmlFor='weeklyReports'>Weekly Reports</Label>
                <p className='text-sm text-muted-foreground'>
                  Receive weekly performance summaries
                </p>
              </div>
              <Switch id='weeklyReports' />
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Shield className='h-5 w-5' />
              Security
            </CardTitle>
            <CardDescription>
              Manage your account security settings
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <Button variant='outline'>Change Password</Button>
            <Button variant='outline'>Enable Two-Factor Authentication</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

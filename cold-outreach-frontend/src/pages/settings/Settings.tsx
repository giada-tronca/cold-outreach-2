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
import { Textarea } from '@/components/ui/textarea';
import {
  Settings as SettingsIcon,
  Mail,
  Bell,
  Shield,
  Building,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { ConfigurationService } from '@/services/configurationService';

export default function Settings() {
  const [selfCompanyInfo, setSelfCompanyInfo] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load self company info on component mount
  useEffect(() => {
    const loadSelfCompanyInfo = async () => {
      try {
        setIsLoading(true);
        const companyInfo = await ConfigurationService.getSelfCompanyInfo();
        setSelfCompanyInfo(companyInfo || '');
      } catch (error) {
        console.error('Failed to load company info:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSelfCompanyInfo();
  }, []);

  const handleSaveCompanyInfo = async () => {
    try {
      setIsSaving(true);
      await ConfigurationService.updateSelfCompanyInfo(selfCompanyInfo);
      // You might want to show a success toast here
    } catch (error) {
      console.error('Failed to save company info:', error);
      // You might want to show an error toast here
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className='p-6'>
      <div className='mb-6'>
        <h1 className='text-3xl font-bold'>Settings</h1>
        <p className='text-muted-foreground'>
          Manage your account and application preferences
        </p>
      </div>

      <div className='grid gap-6'>
        {/* Company Information */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Building className='h-5 w-5' />
              Company Information
            </CardTitle>
            <CardDescription>
              Provide information about your company for AI-generated emails
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='selfCompanyInfo'>Company Description</Label>
              <Textarea
                id='selfCompanyInfo'
                placeholder='Describe your company, products, services, and value proposition. This information will be used to personalize outreach emails.'
                value={selfCompanyInfo}
                onChange={e => setSelfCompanyInfo(e.target.value)}
                disabled={isLoading}
                rows={6}
                className='resize-none'
              />
              <p className='text-sm text-muted-foreground'>
                This information helps the AI generate more personalized and
                relevant emails for your prospects. Maximum 5000 characters.
              </p>
            </div>

            <Button
              onClick={handleSaveCompanyInfo}
              disabled={isSaving || isLoading}
            >
              {isSaving ? 'Saving...' : 'Save Company Information'}
            </Button>
          </CardContent>
        </Card>

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

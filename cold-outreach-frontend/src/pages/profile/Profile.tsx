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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    User,
    Calendar,
    Edit3,
    Camera,
    Shield,
    Activity
} from 'lucide-react';

export default function Profile() {
    return (
        <div className='p-6'>
            <div className='mb-6'>
                <h1 className='text-3xl font-bold'>Profile</h1>
                <p className='text-muted-foreground'>
                    Manage your personal information and account details
                </p>
            </div>

            <div className='grid gap-6 lg:grid-cols-3'>
                {/* Profile Overview */}
                <div className='lg:col-span-1'>
                    <Card>
                        <CardHeader className='text-center'>
                            <div className='flex justify-center mb-4'>
                                <div className='relative'>
                                    <Avatar className='h-24 w-24'>
                                        <AvatarImage src='https://github.com/shadcn.png' alt='User' />
                                        <AvatarFallback className='text-lg'>JD</AvatarFallback>
                                    </Avatar>
                                    <Button
                                        size='icon'
                                        variant='outline'
                                        className='absolute -bottom-2 -right-2 h-8 w-8 rounded-full'
                                    >
                                        <Camera className='h-4 w-4' />
                                    </Button>
                                </div>
                            </div>
                            <CardTitle className='text-xl'>John Doe</CardTitle>
                            <CardDescription>john.doe@example.com</CardDescription>
                            <div className='flex justify-center mt-4'>
                                <Badge variant='secondary' className='bg-green-100 text-green-700'>
                                    Active
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className='space-y-4'>
                            <div className='space-y-3'>
                                <div className='flex items-center justify-between'>
                                    <div className='flex items-center gap-2'>
                                        <Calendar className='h-4 w-4 text-muted-foreground' />
                                        <span className='text-sm text-muted-foreground'>Joined</span>
                                    </div>
                                    <span className='text-sm font-medium'>Jan 15, 2024</span>
                                </div>
                                <div className='flex items-center justify-between'>
                                    <div className='flex items-center gap-2'>
                                        <Activity className='h-4 w-4 text-muted-foreground' />
                                        <span className='text-sm text-muted-foreground'>Last Active</span>
                                    </div>
                                    <span className='text-sm font-medium'>Today</span>
                                </div>
                                <div className='flex items-center justify-between'>
                                    <div className='flex items-center gap-2'>
                                        <Shield className='h-4 w-4 text-muted-foreground' />
                                        <span className='text-sm text-muted-foreground'>Account Type</span>
                                    </div>
                                    <span className='text-sm font-medium'>Premium</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Profile Details */}
                <div className='lg:col-span-2 space-y-6'>
                    {/* Personal Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle className='flex items-center gap-2'>
                                <User className='h-5 w-5' />
                                Personal Information
                            </CardTitle>
                            <CardDescription>
                                Update your personal details and contact information
                            </CardDescription>
                        </CardHeader>
                        <CardContent className='space-y-4'>
                            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
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

                            <div className='space-y-2'>
                                <Label htmlFor='phone'>Phone Number</Label>
                                <Input
                                    id='phone'
                                    type='tel'
                                    defaultValue='+1 (555) 123-4567'
                                    placeholder='+1 (555) 123-4567'
                                />
                            </div>

                            <div className='space-y-2'>
                                <Label htmlFor='company'>Company</Label>
                                <Input
                                    id='company'
                                    defaultValue='Acme Corp'
                                    placeholder='Your company name'
                                />
                            </div>

                            <div className='space-y-2'>
                                <Label htmlFor='position'>Position</Label>
                                <Input
                                    id='position'
                                    defaultValue='Sales Manager'
                                    placeholder='Your job title'
                                />
                            </div>

                            <div className='flex gap-3 pt-4'>
                                <Button>
                                    <Edit3 className='mr-2 h-4 w-4' />
                                    Save Changes
                                </Button>
                                <Button variant='outline'>Cancel</Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Account Security */}
                    <Card>
                        <CardHeader>
                            <CardTitle className='flex items-center gap-2'>
                                <Shield className='h-5 w-5' />
                                Account Security
                            </CardTitle>
                            <CardDescription>
                                Manage your password and security settings
                            </CardDescription>
                        </CardHeader>
                        <CardContent className='space-y-4'>
                            <div className='space-y-2'>
                                <Label htmlFor='currentPassword'>Current Password</Label>
                                <Input
                                    id='currentPassword'
                                    type='password'
                                    placeholder='Enter current password'
                                />
                            </div>

                            <div className='space-y-2'>
                                <Label htmlFor='newPassword'>New Password</Label>
                                <Input
                                    id='newPassword'
                                    type='password'
                                    placeholder='Enter new password'
                                />
                            </div>

                            <div className='space-y-2'>
                                <Label htmlFor='confirmPassword'>Confirm New Password</Label>
                                <Input
                                    id='confirmPassword'
                                    type='password'
                                    placeholder='Confirm new password'
                                />
                            </div>

                            <Separator />

                            <div className='space-y-4'>
                                <div>
                                    <h4 className='text-sm font-medium mb-2'>Two-Factor Authentication</h4>
                                    <p className='text-sm text-muted-foreground mb-3'>
                                        Add an extra layer of security to your account
                                    </p>
                                    <Button variant='outline' size='sm'>
                                        Enable 2FA
                                    </Button>
                                </div>

                                <div>
                                    <h4 className='text-sm font-medium mb-2'>Login Sessions</h4>
                                    <p className='text-sm text-muted-foreground mb-3'>
                                        Manage your active login sessions
                                    </p>
                                    <Button variant='outline' size='sm'>
                                        View Sessions
                                    </Button>
                                </div>
                            </div>

                            <div className='flex gap-3 pt-4'>
                                <Button>Update Password</Button>
                                <Button variant='outline'>Cancel</Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Account Statistics */}
                    <Card>
                        <CardHeader>
                            <CardTitle className='flex items-center gap-2'>
                                <Activity className='h-5 w-5' />
                                Account Activity
                            </CardTitle>
                            <CardDescription>
                                Overview of your account usage and activity
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                                <div className='text-center p-4 bg-muted/30 rounded-lg'>
                                    <div className='text-2xl font-bold text-primary'>127</div>
                                    <div className='text-sm text-muted-foreground'>Total Prospects</div>
                                </div>
                                <div className='text-center p-4 bg-muted/30 rounded-lg'>
                                    <div className='text-2xl font-bold text-primary'>89</div>
                                    <div className='text-sm text-muted-foreground'>Emails Generated</div>
                                </div>
                                <div className='text-center p-4 bg-muted/30 rounded-lg'>
                                    <div className='text-2xl font-bold text-primary'>12</div>
                                    <div className='text-sm text-muted-foreground'>Active Templates</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
} 
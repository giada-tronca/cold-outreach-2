import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Spinner,
  LoadingOverlay,
  LoadingInline,
} from '@/components/ui/spinner';
import {
  AlertCircle,
  Info,
  MoreHorizontal,
  Settings,
  User,
  Mail,
  Calendar,
  Trash2,
  X,
} from 'lucide-react';

export default function ComponentShowcase() {
  const [progress, setProgress] = useState(33);
  const [isLoading, setIsLoading] = useState(false);
  const [sliderValue, setSliderValue] = useState([50]);

  const handleLoadingDemo = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 3000);
  };

  return (
    <div className='min-h-screen bg-background p-8'>
      <div className='max-w-6xl mx-auto space-y-12'>
        {/* Header */}
        <div className='text-center space-y-4'>
          <h1 className='text-4xl font-bold tracking-tight'>
            Cold Outreach AI
          </h1>
          <h2 className='text-2xl font-semibold text-muted-foreground'>
            Design System Showcase
          </h2>
          <p className='text-lg text-muted-foreground max-w-2xl mx-auto'>
            A comprehensive collection of UI components built with shadcn/ui and
            Tailwind CSS v4.
          </p>
        </div>

        {/* Buttons */}
        <section className='space-y-6'>
          <h3 className='text-2xl font-semibold'>Buttons</h3>
          <Card>
            <CardHeader>
              <CardTitle>Button Variants</CardTitle>
              <CardDescription>
                Different button styles and sizes
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='flex flex-wrap gap-3'>
                <Button>Default</Button>
                <Button variant='secondary'>Secondary</Button>
                <Button variant='destructive'>Destructive</Button>
                <Button variant='outline'>Outline</Button>
                <Button variant='ghost'>Ghost</Button>
                <Button variant='link'>Link</Button>
              </div>
              <div className='flex flex-wrap gap-3 items-center'>
                <Button size='sm'>Small</Button>
                <Button size='default'>Default</Button>
                <Button size='lg'>Large</Button>
                <Button size='icon'>
                  <Settings className='h-4 w-4' />
                </Button>
              </div>

              {/* New section for danger buttons */}
              <div className='space-y-3'>
                <h4 className='text-lg font-medium'>Danger Button Showcase</h4>
                <div className='flex flex-wrap gap-3 items-center'>
                  <Button variant='destructive' size='sm'>
                    Delete (Small)
                  </Button>
                  <Button variant='destructive'>Delete (Default)</Button>
                  <Button variant='destructive' size='lg'>
                    Delete (Large)
                  </Button>
                  <Button variant='destructive' disabled>
                    Disabled
                  </Button>
                </div>
                <div className='flex flex-wrap gap-3 items-center'>
                  <Button variant='destructive'>
                    <Trash2 className='h-4 w-4 mr-2' />
                    Delete with Icon
                  </Button>
                  <Button variant='destructive' size='sm'>
                    <X className='h-4 w-4 mr-1' />
                    Remove
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Form Elements */}
        <section className='space-y-6'>
          <h3 className='text-2xl font-semibold'>Form Elements</h3>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            <Card>
              <CardHeader>
                <CardTitle>Input Fields</CardTitle>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='space-y-2'>
                  <Label htmlFor='email'>Email</Label>
                  <Input
                    id='email'
                    type='email'
                    placeholder='Enter your email'
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='message'>Message</Label>
                  <Textarea
                    id='message'
                    placeholder='Type your message here...'
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='select'>Select Option</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder='Choose an option' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='option1'>Option 1</SelectItem>
                      <SelectItem value='option2'>Option 2</SelectItem>
                      <SelectItem value='option3'>Option 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Form Controls</CardTitle>
              </CardHeader>
              <CardContent className='space-y-6'>
                <div className='flex items-center space-x-2'>
                  <Checkbox id='terms' />
                  <Label htmlFor='terms'>Accept terms and conditions</Label>
                </div>

                <div className='space-y-3'>
                  <Label>Choose your plan</Label>
                  <RadioGroup defaultValue='basic'>
                    <div className='flex items-center space-x-2'>
                      <RadioGroupItem value='basic' id='basic' />
                      <Label htmlFor='basic'>Basic Plan</Label>
                    </div>
                    <div className='flex items-center space-x-2'>
                      <RadioGroupItem value='pro' id='pro' />
                      <Label htmlFor='pro'>Pro Plan</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className='flex items-center space-x-2'>
                  <Switch id='notifications' />
                  <Label htmlFor='notifications'>Enable notifications</Label>
                </div>

                <div className='space-y-2'>
                  <Label>Volume: {sliderValue[0]}%</Label>
                  <Slider
                    value={sliderValue}
                    onValueChange={setSliderValue}
                    max={100}
                    step={1}
                    className='w-full'
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Loading States */}
        <section className='space-y-6'>
          <h3 className='text-2xl font-semibold'>Loading States</h3>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            <Card>
              <CardHeader>
                <CardTitle>Spinner Variants</CardTitle>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='flex items-center gap-4'>
                  <Spinner size='xs' />
                  <Spinner size='sm' />
                  <Spinner size='default' />
                  <Spinner size='lg' />
                  <Spinner size='xl' />
                </div>
                <div className='space-y-2'>
                  <LoadingInline text='Processing...' />
                  <LoadingInline size='lg' text='Generating emails...' />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Loading Overlay</CardTitle>
              </CardHeader>
              <CardContent>
                <Button onClick={handleLoadingDemo} disabled={isLoading}>
                  {isLoading ? (
                    <LoadingInline text='Loading...' />
                  ) : (
                    'Demo Loading Overlay'
                  )}
                </Button>
                <LoadingOverlay
                  isLoading={isLoading}
                  text='Processing your request...'
                >
                  <div className='p-6 bg-muted rounded-lg mt-4'>
                    <p>
                      This content is shown with loading overlay when button is
                      clicked.
                    </p>
                  </div>
                </LoadingOverlay>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Progress */}
        <section className='space-y-6'>
          <h3 className='text-2xl font-semibold'>Progress Indicators</h3>
          <Card>
            <CardHeader>
              <CardTitle>Progress Bars</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='space-y-2'>
                <div className='flex justify-between text-sm'>
                  <span>Upload Progress</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className='w-full' />
              </div>
              <div className='flex gap-2'>
                <Button
                  size='sm'
                  onClick={() => setProgress(Math.max(0, progress - 10))}
                >
                  Decrease
                </Button>
                <Button
                  size='sm'
                  onClick={() => setProgress(Math.min(100, progress + 10))}
                >
                  Increase
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Data Display */}
        <section className='space-y-6'>
          <h3 className='text-2xl font-semibold'>Data Display</h3>
          <Card>
            <CardHeader>
              <CardTitle>Data Table</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableCaption>Recent campaign prospects</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className='text-right'>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>John Doe</TableCell>
                    <TableCell>Acme Corp</TableCell>
                    <TableCell>
                      <Badge variant='default'>Completed</Badge>
                    </TableCell>
                    <TableCell className='text-right'>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant='ghost' size='icon'>
                            <MoreHorizontal className='h-4 w-4' />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end'>
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>View Details</DropdownMenuItem>
                          <DropdownMenuItem>Send Email</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Jane Smith</TableCell>
                    <TableCell>Tech Solutions</TableCell>
                    <TableCell>
                      <Badge variant='secondary'>Pending</Badge>
                    </TableCell>
                    <TableCell className='text-right'>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant='ghost' size='icon'>
                            <MoreHorizontal className='h-4 w-4' />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end'>
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>View Details</DropdownMenuItem>
                          <DropdownMenuItem>Send Email</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>

        {/* Alerts & Notifications */}
        <section className='space-y-6'>
          <h3 className='text-2xl font-semibold'>Alerts & Notifications</h3>
          <div className='space-y-4'>
            <Alert>
              <Info className='h-4 w-4' />
              <AlertTitle>Information</AlertTitle>
              <AlertDescription>
                This is an informational alert with some helpful details.
              </AlertDescription>
            </Alert>

            <Alert variant='destructive'>
              <AlertCircle className='h-4 w-4' />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                Something went wrong. Please try again later.
              </AlertDescription>
            </Alert>
          </div>
        </section>

        {/* Interactive Elements */}
        <section className='space-y-6'>
          <h3 className='text-2xl font-semibold'>Interactive Elements</h3>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            <Card>
              <CardHeader>
                <CardTitle>Dialogs & Popovers</CardTitle>
              </CardHeader>
              <CardContent className='space-y-4'>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>Open Dialog</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Confirm Action</DialogTitle>
                      <DialogDescription>
                        Are you sure you want to proceed with this action?
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button variant='outline'>Cancel</Button>
                      <Button>Confirm</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant='outline'>Open Popover</Button>
                  </PopoverTrigger>
                  <PopoverContent>
                    <div className='space-y-2'>
                      <h4 className='font-medium'>Quick Actions</h4>
                      <p className='text-sm text-muted-foreground'>
                        Choose an action from the options below.
                      </p>
                      <div className='space-y-1'>
                        <Button
                          size='sm'
                          variant='ghost'
                          className='w-full justify-start'
                        >
                          <Mail className='h-4 w-4 mr-2' />
                          Send Email
                        </Button>
                        <Button
                          size='sm'
                          variant='ghost'
                          className='w-full justify-start'
                        >
                          <Calendar className='h-4 w-4 mr-2' />
                          Schedule Meeting
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tooltips & Avatars</CardTitle>
              </CardHeader>
              <CardContent className='space-y-4'>
                <TooltipProvider>
                  <div className='flex items-center gap-4'>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant='outline'>Hover me</Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>This is a helpful tooltip</p>
                      </TooltipContent>
                    </Tooltip>

                    <div className='flex items-center gap-2'>
                      <Avatar>
                        <AvatarImage
                          src='https://github.com/shadcn.png'
                          alt='@shadcn'
                        />
                        <AvatarFallback>CN</AvatarFallback>
                      </Avatar>
                      <Avatar>
                        <AvatarFallback>JD</AvatarFallback>
                      </Avatar>
                      <Avatar>
                        <AvatarFallback>
                          <User className='h-4 w-4' />
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  </div>
                </TooltipProvider>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Badges */}
        <section className='space-y-6'>
          <h3 className='text-2xl font-semibold'>Badges</h3>
          <Card>
            <CardHeader>
              <CardTitle>Badge Variants</CardTitle>
              <CardDescription>
                Different badge styles and colors
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='flex flex-wrap gap-3'>
                <Badge>Default</Badge>
                <Badge variant='secondary'>Secondary</Badge>
                <Badge variant='destructive'>Destructive</Badge>
                <Badge variant='outline'>Outline</Badge>
              </div>
              <div className='flex flex-wrap gap-3'>
                <Badge variant='destructive'>Error</Badge>
                <Badge variant='destructive'>Critical</Badge>
                <Badge variant='destructive'>Failed</Badge>
                <Badge variant='destructive'>Deleted</Badge>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Footer */}
        <div className='text-center text-muted-foreground py-8'>
          <p>Design System powered by shadcn/ui and Tailwind CSS v4</p>
        </div>
      </div>
    </div>
  );
}

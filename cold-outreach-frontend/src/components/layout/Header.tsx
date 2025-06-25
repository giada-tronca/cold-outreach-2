import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Bell,
  Settings,
  User,
  LogOut,
  HelpCircle,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeaderProps {
  onMenuClick: () => void;
  onSidebarToggle: () => void;
  sidebarCollapsed: boolean;
  className?: string;
}

export function Header({
  onMenuClick,
  onSidebarToggle,
  sidebarCollapsed,
  className,
}: HeaderProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:px-6',
        className
      )}
    >
      {/* Left side - Mobile menu + Sidebar toggle */}
      <div className='flex items-center gap-2'>
        {/* Mobile menu button */}
        <Button
          variant='ghost'
          size='icon'
          className='lg:hidden'
          onClick={onMenuClick}
        >
          <Menu className='h-5 w-5' />
          <span className='sr-only'>Toggle navigation menu</span>
        </Button>

        {/* Desktop sidebar toggle */}
        <Button
          variant='ghost'
          size='icon'
          className='hidden lg:flex'
          onClick={onSidebarToggle}
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen className='h-5 w-5' />
          ) : (
            <PanelLeftClose className='h-5 w-5' />
          )}
          <span className='sr-only'>Toggle sidebar</span>
        </Button>

        {/* Logo and title */}
        <div className='flex items-center gap-2 lg:hidden'>
          <div className='flex items-center justify-center w-8 h-8 bg-primary text-primary-foreground rounded-lg'>
            <Zap className='h-4 w-4' />
          </div>
          <span className='font-semibold'>Cold Outreach AI</span>
        </div>
      </div>

      {/* Center - Search (on larger screens) */}
      <div className='hidden md:flex flex-1 max-w-md'>
        <div className='relative w-full'>
          <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
          <input
            type='search'
            placeholder='Search campaigns, prospects...'
            className='w-full rounded-md border border-input bg-background pl-10 pr-4 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
          />
        </div>
      </div>

      {/* Right side - Actions and user menu */}
      <div className='flex items-center gap-2 ml-auto'>
        {/* Search button for mobile */}
        <Button variant='ghost' size='icon' className='md:hidden'>
          <Search className='h-5 w-5' />
          <span className='sr-only'>Search</span>
        </Button>

        {/* Notifications */}
        <Button variant='ghost' size='icon' className='relative'>
          <Bell className='h-5 w-5' />
          <Badge
            variant='destructive'
            className='absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center'
          >
            3
          </Badge>
          <span className='sr-only'>Notifications</span>
        </Button>

        {/* Help */}
        <Button variant='ghost' size='icon'>
          <HelpCircle className='h-5 w-5' />
          <span className='sr-only'>Help</span>
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='ghost' className='relative h-8 w-8 rounded-full'>
              <Avatar className='h-8 w-8'>
                <AvatarImage src='https://github.com/shadcn.png' alt='User' />
                <AvatarFallback>JD</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className='w-56' align='end' forceMount>
            <DropdownMenuLabel className='font-normal'>
              <div className='flex flex-col space-y-1'>
                <p className='text-sm font-medium leading-none'>John Doe</p>
                <p className='text-xs leading-none text-muted-foreground'>
                  john@example.com
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className='mr-2 h-4 w-4' />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className='mr-2 h-4 w-4' />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <LogOut className='mr-2 h-4 w-4' />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

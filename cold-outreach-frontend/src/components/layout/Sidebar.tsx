import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  Users,
  Mail,
  Upload,
  BarChart3,
  Settings,
  FileText,
  Zap,
  X,
  ChevronDown,
  Database,
  Target,
  Workflow,
} from 'lucide-react';
import { useState } from 'react';

interface SidebarProps {
  open: boolean;
  collapsed: boolean;
  onOpenChange: (open: boolean) => void;
  onCollapsedChange: (collapsed: boolean) => void;
  className?: string;
}

interface NavigationItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  active?: boolean;
  children?: NavigationItem[];
}

const getNavigationItems = (currentPath: string): NavigationItem[] => [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: Home,
    active: currentPath === '/dashboard',
  },
  {
    title: 'Campaigns',
    href: '/campaigns',
    icon: Target,
    badge: '3',
    active: currentPath.startsWith('/campaigns'),
    children: [
      { title: 'All Campaigns', href: '/campaigns', icon: FileText },
      { title: 'Create Campaign', href: '/campaigns/new', icon: FileText },
      { title: 'Templates', href: '/campaigns/templates', icon: FileText },
    ],
  },
  {
    title: 'Prospects',
    href: '/prospects',
    icon: Users,
    badge: '1.2k',
    active: currentPath.startsWith('/prospects'),
    children: [
      { title: 'All Prospects', href: '/prospects', icon: Users },
      { title: 'Import Prospects', href: '/prospects/import', icon: Upload },
      { title: 'Enrichment', href: '/prospects/enrichment', icon: Database },
    ],
  },
  {
    title: 'Workflow',
    href: '/workflow',
    icon: Workflow,
    active: currentPath === '/workflow',
  },
  {
    title: 'Email Generation',
    href: '/emails',
    icon: Mail,
    badge: 'New',
    active: currentPath === '/emails',
  },
  {
    title: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
    active: currentPath === '/analytics',
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
    active: currentPath === '/settings',
  },
];

function NavigationLink({
  item,
  collapsed,
  level = 0,
}: {
  item: NavigationItem;
  collapsed: boolean;
  level?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = item.children && item.children.length > 0;
  const Icon = item.icon;

  const linkContent = hasChildren ? (
    <Button
      variant={item.active ? 'secondary' : 'ghost'}
      className={cn(
        'w-full justify-start gap-3 h-10 px-3',
        level > 0 && 'ml-6 h-8',
        item.active && 'bg-secondary text-secondary-foreground',
        collapsed && level === 0 && 'justify-center px-2'
      )}
      onClick={() => !collapsed && setExpanded(!expanded)}
    >
      <Icon className={cn('h-4 w-4 flex-shrink-0')} />
      {!collapsed && (
        <>
          <span className='flex-1 text-left'>{item.title}</span>
          {item.badge && (
            <Badge variant='secondary' className='h-5 px-1.5 text-xs'>
              {item.badge}
            </Badge>
          )}
          <ChevronDown
            className={cn(
              'h-4 w-4 transition-transform',
              expanded && 'rotate-180'
            )}
          />
        </>
      )}
    </Button>
  ) : (
    <Link to={item.href} className='block'>
      <Button
        variant={item.active ? 'secondary' : 'ghost'}
        className={cn(
          'w-full justify-start gap-3 h-10 px-3',
          level > 0 && 'ml-6 h-8',
          item.active && 'bg-secondary text-secondary-foreground',
          collapsed && level === 0 && 'justify-center px-2'
        )}
      >
        <Icon className={cn('h-4 w-4 flex-shrink-0')} />
        {!collapsed && (
          <>
            <span className='flex-1 text-left'>{item.title}</span>
            {item.badge && (
              <Badge variant='secondary' className='h-5 px-1.5 text-xs'>
                {item.badge}
              </Badge>
            )}
          </>
        )}
      </Button>
    </Link>
  );

  if (collapsed && level === 0) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
          <TooltipContent side='right'>
            <p>{item.title}</p>
            {item.badge && (
              <Badge variant='secondary' className='ml-2'>
                {item.badge}
              </Badge>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className='space-y-1'>
      {linkContent}
      {hasChildren && expanded && !collapsed && (
        <div className='space-y-1'>
          {item.children?.map(child => (
            <NavigationLink
              key={child.href}
              item={child}
              collapsed={collapsed}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function Sidebar({
  open,
  collapsed,
  onOpenChange,
  onCollapsedChange: _,
  className,
}: SidebarProps) {
  const location = useLocation();
  const navigationItems = getNavigationItems(location.pathname);

  return (
    <>
      {/* Mobile sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 transform bg-background border-r transition-transform duration-300 ease-in-out lg:hidden',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className='flex h-full flex-col'>
          {/* Mobile header */}
          <div className='flex h-16 items-center justify-between px-4 border-b'>
            <div className='flex items-center gap-2'>
              <div className='flex items-center justify-center w-8 h-8 bg-primary text-primary-foreground rounded-lg'>
                <Zap className='h-4 w-4' />
              </div>
              <span className='font-semibold'>Cold Outreach AI</span>
            </div>
            <Button
              variant='ghost'
              size='icon'
              onClick={() => onOpenChange(false)}
            >
              <X className='h-5 w-5' />
            </Button>
          </div>

          {/* Mobile navigation */}
          <nav className='flex-1 space-y-2 p-4 overflow-y-auto'>
            {navigationItems.map(item => (
              <NavigationLink key={item.href} item={item} collapsed={false} />
            ))}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-30 hidden lg:flex flex-col bg-background border-r transition-all duration-300 ease-in-out',
          collapsed ? 'w-16' : 'w-64',
          className
        )}
      >
        {/* Desktop header */}
        <div className='flex h-16 items-center px-4 border-b'>
          <div className='flex items-center gap-2'>
            <div className='flex items-center justify-center w-8 h-8 bg-primary text-primary-foreground rounded-lg'>
              <Zap className='h-4 w-4' />
            </div>
            {!collapsed && (
              <span className='font-semibold'>Cold Outreach AI</span>
            )}
          </div>
        </div>

        {/* Desktop navigation */}
        <nav className='flex-1 space-y-2 p-4 overflow-y-auto'>
          {navigationItems.map(item => (
            <NavigationLink key={item.href} item={item} collapsed={collapsed} />
          ))}
        </nav>

        {/* Footer */}
        <div className='border-t p-4'>
          <div
            className={cn(
              'text-xs text-muted-foreground',
              collapsed && 'text-center'
            )}
          >
            {collapsed ? 'v1.0' : 'Version 1.0.0'}
          </div>
        </div>
      </div>
    </>
  );
}

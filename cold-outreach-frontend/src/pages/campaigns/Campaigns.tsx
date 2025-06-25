import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingInline } from '@/components/ui/spinner';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Copy,
  Calendar,
  Users,
  Mail,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { campaignService } from '@/services/campaignService';
import type { Campaign, LoadingState } from '@/types';

export default function Campaigns() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState<LoadingState>({ isLoading: true });
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    campaign: Campaign | null;
    isDeleting: boolean;
  }>({
    isOpen: false,
    campaign: null,
    isDeleting: false,
  });

  const loadCampaigns = async (search?: string) => {
    try {
      setLoading({ isLoading: true });
      const params: any = {
        page: 1,
        limit: 50,
        sortBy: 'updatedAt',
        sortOrder: 'desc',
      };
      if (search) {
        params.search = search;
      }
      const response = await campaignService.getAllCampaigns(params);

      if (response.success && response.data) {
        setCampaigns(response.data);
      } else {
        throw new Error(response.error || 'Failed to load campaigns');
      }
    } catch (error) {
      console.error('Error loading campaigns:', error);
      setLoading({
        isLoading: false,
        error:
          error instanceof Error ? error.message : 'Failed to load campaigns',
      });
    } finally {
      setLoading({ isLoading: false });
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    // Debounce search
    const timeoutId = setTimeout(() => {
      loadCampaigns(value);
    }, 300);

    return () => clearTimeout(timeoutId);
  };

  const handleDeleteClick = (campaign: Campaign) => {
    setDeleteDialog({
      isOpen: true,
      campaign,
      isDeleting: false,
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.campaign) return;

    setDeleteDialog(prev => ({ ...prev, isDeleting: true }));

    try {
      await campaignService.deleteCampaign(deleteDialog.campaign.id);

      // Remove from local state
      setCampaigns(prev =>
        prev.filter(c => c.id !== deleteDialog.campaign?.id)
      );

      setDeleteDialog({
        isOpen: false,
        campaign: null,
        isDeleting: false,
      });
    } catch (error) {
      console.error('Error deleting campaign:', error);
      setDeleteDialog(prev => ({ ...prev, isDeleting: false }));
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({
      isOpen: false,
      campaign: null,
      isDeleting: false,
    });
  };

  const handleDuplicate = async (campaign: Campaign) => {
    try {
      await campaignService.duplicateCampaign(campaign.id);
      // Refresh campaigns to show the new duplicate
      loadCampaigns(searchTerm);
    } catch (error) {
      console.error('Error duplicating campaign:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (campaign: Campaign) => {
    // Simple status logic based on campaign data
    if (campaign._count?.prospects && campaign._count.prospects > 0) {
      return <Badge variant='default'>Active</Badge>;
    }
    return <Badge variant='secondary'>Draft</Badge>;
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  return (
    <div className='p-6'>
      <div className='flex justify-between items-center mb-6'>
        <div>
          <h1 className='text-3xl font-bold'>Campaigns</h1>
          <p className='text-muted-foreground'>
            Manage your outreach campaigns
          </p>
        </div>
        <Button onClick={() => navigate('/campaigns/create')}>
          <Plus className='h-4 w-4 mr-2' />
          New Campaign
        </Button>
      </div>

      {/* Search and Actions */}
      <div className='flex gap-4 mb-6'>
        <div className='relative flex-1 max-w-sm'>
          <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />
          <Input
            placeholder='Search campaigns...'
            value={searchTerm}
            onChange={e => handleSearch(e.target.value)}
            className='pl-10'
          />
        </div>
        <Button
          variant='outline'
          onClick={() => loadCampaigns(searchTerm)}
          disabled={loading.isLoading}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${loading.isLoading ? 'animate-spin' : ''}`}
          />
          Refresh
        </Button>
      </div>

      {/* Error State */}
      {loading.error && (
        <Alert variant='destructive' className='mb-6'>
          <AlertCircle className='h-4 w-4' />
          <AlertDescription>
            {loading.error}
            <Button
              variant='outline'
              size='sm'
              className='ml-4'
              onClick={() => loadCampaigns(searchTerm)}
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {loading.isLoading && (
        <div className='flex justify-center items-center py-12'>
          <LoadingInline text='Loading campaigns...' />
        </div>
      )}

      {/* Empty State */}
      {!loading.isLoading && !loading.error && campaigns.length === 0 && (
        <Card className='p-12 text-center'>
          <div className='space-y-4'>
            <Mail className='h-16 w-16 mx-auto text-muted-foreground' />
            <div>
              <h3 className='text-lg font-semibold'>No campaigns found</h3>
              <p className='text-muted-foreground'>
                {searchTerm
                  ? 'No campaigns match your search.'
                  : 'Create your first campaign to get started.'}
              </p>
            </div>
            <Button onClick={() => navigate('/campaigns/create')}>
              <Plus className='h-4 w-4 mr-2' />
              Create Campaign
            </Button>
          </div>
        </Card>
      )}

      {/* Campaigns Grid */}
      {!loading.isLoading && !loading.error && campaigns.length > 0 && (
        <div className='grid gap-6'>
          {campaigns.map(campaign => (
            <Card
              key={campaign.id}
              className='hover:shadow-md transition-shadow'
            >
              <CardHeader>
                <div className='flex justify-between items-start'>
                  <div className='flex-1'>
                    <div className='flex items-center gap-3 mb-2'>
                      <CardTitle className='text-xl'>{campaign.name}</CardTitle>
                      {getStatusBadge(campaign)}
                    </div>
                    <CardDescription className='text-base'>
                      {campaign.emailSubject || 'No email subject set'}
                    </CardDescription>
                  </div>
                  <div className='flex gap-2'>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => navigate(`/campaigns/${campaign.id}/edit`)}
                    >
                      <Edit className='h-4 w-4 mr-1' />
                      Edit
                    </Button>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => handleDuplicate(campaign)}
                    >
                      <Copy className='h-4 w-4 mr-1' />
                      Duplicate
                    </Button>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => handleDeleteClick(campaign)}
                      className='text-destructive hover:text-destructive/90 hover:bg-destructive/10'
                    >
                      <Trash2 className='h-4 w-4 mr-1' />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className='grid grid-cols-2 md:grid-cols-4 gap-4 text-sm'>
                  <div className='flex items-center gap-2'>
                    <Users className='h-4 w-4 text-muted-foreground' />
                    <span>{campaign._count?.prospects || 0} prospects</span>
                  </div>
                  <div className='flex items-center gap-2'>
                    <Mail className='h-4 w-4 text-muted-foreground' />
                    <span>{campaign._count?.batches || 0} batches</span>
                  </div>
                  <div className='flex items-center gap-2'>
                    <Calendar className='h-4 w-4 text-muted-foreground' />
                    <span>Created {formatDate(campaign.createdAt)}</span>
                  </div>
                  <div className='flex items-center gap-2'>
                    <Calendar className='h-4 w-4 text-muted-foreground' />
                    <span>Updated {formatDate(campaign.updatedAt)}</span>
                  </div>
                </div>

                {campaign.prompt && (
                  <div className='mt-4 p-3 bg-muted rounded-md'>
                    <p className='text-sm text-muted-foreground'>
                      {campaign.prompt.length > 200
                        ? `${campaign.prompt.substring(0, 200)}...`
                        : campaign.prompt}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={deleteDialog.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        isLoading={deleteDialog.isDeleting}
        title='Delete Campaign'
        description={
          deleteDialog.campaign
            ? `Are you sure you want to delete "${deleteDialog.campaign.name}"? This action cannot be undone and will also delete all associated prospects and batches.`
            : ''
        }
      />
    </div>
  );
}

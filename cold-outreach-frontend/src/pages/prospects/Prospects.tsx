import { useState, useEffect } from 'react';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  Search,
  Eye,
  Trash2,
  RefreshCw,
  User,
  Building2,
  BarChart3,
  Calendar,
  ExternalLink,
  Loader2,
  X,
  Save,
  Mail,
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { ProspectService } from '@/services/prospectService';
import type {
  Prospect,
  ProspectEnrichment,
  ProspectFilters,
  CreateProspectData,
  GeneratedEmail,
} from '@/types';

export default function Prospects() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(
    null
  );
  const [selectedEnrichment, setSelectedEnrichment] =
    useState<ProspectEnrichment | null>(null);
  const [generatedEmail, setGeneratedEmail] = useState<GeneratedEmail | null>(
    null
  );

  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [loadingProspectId, setLoadingProspectId] = useState<number | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [deleteProspectId, setDeleteProspectId] = useState<number | null>(null);
  const [isAddProspectOpen, setIsAddProspectOpen] = useState(false);
  const [addProspectData, setAddProspectData] = useState<
    Partial<CreateProspectData>
  >({
    campaignId: 1, // Default campaign ID - should be dynamic in real app
    email: '',
    name: '',
    company: '',
    position: '',
    linkedinUrl: '',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // Load prospects
  const loadProspects = async (filters: ProspectFilters = {}) => {
    try {
      setLoading(true);
      setError(null);

      const filterParams: ProspectFilters = {
        page: pagination.page,
        limit: pagination.limit,
        sortBy: 'createdAt',
        sortOrder: 'desc', // Ensure sorted by created time descending
        ...filters,
      };

      if (searchTerm) {
        filterParams.search = searchTerm;
      }

      if (statusFilter) {
        filterParams.status = statusFilter;
      }

      const response = await ProspectService.getAllProspects(filterParams);

      if (response.success && response.data) {
        setProspects(response.data);
        if (response.pagination) {
          setPagination(prev => ({
            ...prev,
            total: response.pagination!.totalItems,
            totalPages: response.pagination!.totalPages,
          }));
        }
      } else {
        setError('Failed to load prospects');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load prospects');
    } finally {
      setLoading(false);
    }
  };

  // Load prospect details
  const loadProspectDetails = async (prospectId: number) => {
    try {
      setDetailLoading(true);
      setSelectedEnrichment(null);
      setGeneratedEmail(null);

      // Load prospect details
      const prospectResponse =
        await ProspectService.getProspectById(prospectId);
      if (prospectResponse.success && prospectResponse.data) {
        setSelectedProspect(prospectResponse.data);

        // Debug logging for generated email
        console.log('🔍 [Frontend] Prospect response:', {
          prospectId: prospectResponse.data.id,
          hasGeneratedEmail: !!prospectResponse.data.generatedEmail,
          generatedEmailData: prospectResponse.data.generatedEmail,
        });

        // Extract generated email from prospect data if available
        if (prospectResponse.data.generatedEmail) {
          console.log(
            '✅ [Frontend] Setting generated email:',
            prospectResponse.data.generatedEmail
          );
          setGeneratedEmail(prospectResponse.data.generatedEmail);
        } else {
          console.log(
            '❌ [Frontend] No generated email found for prospect:',
            prospectId
          );
        }
      }

      // Load enrichment data if available
      try {
        const enrichmentResponse =
          await ProspectService.getEnrichmentByProspectId(prospectId);
        if (enrichmentResponse.success && enrichmentResponse.data) {
          setSelectedEnrichment(enrichmentResponse.data);
        }
      } catch (enrichmentError) {
        console.log('No enrichment data found for prospect:', prospectId);
      }
    } catch (err) {
      console.error('Error loading prospect details:', err);
    } finally {
      setDetailLoading(false);
      setLoadingProspectId(null);
    }
  };

  // Handle prospect row click with improved loading feedback
  const handleProspectClick = async (prospect: Prospect) => {
    setLoadingProspectId(prospect.id);
    setIsDetailDialogOpen(true);
    await loadProspectDetails(prospect.id);
  };

  // Handle delete prospect
  const handleDeleteProspect = async (prospectId: number) => {
    try {
      const response = await ProspectService.deleteProspect(prospectId);
      if (response.success) {
        setProspects(prev => prev.filter(p => p.id !== prospectId));
        setDeleteProspectId(null);
        // Reload the page to refresh pagination
        loadProspects();
        // If we're viewing this prospect, close the dialog
        if (selectedProspect?.id === prospectId) {
          setIsDetailDialogOpen(false);
          setSelectedProspect(null);
        }
      } else {
        setError('Failed to delete prospect');
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to delete prospect'
      );
    }
  };

  // Handle add prospect
  const handleAddProspect = async () => {
    try {
      if (!addProspectData.email) {
        setError('Email is required');
        return;
      }

      const response = await ProspectService.createProspect(
        addProspectData as CreateProspectData
      );
      if (response.success) {
        setIsAddProspectOpen(false);
        setAddProspectData({
          campaignId: 1,
          email: '',
          name: '',
          company: '',
          position: '',
          linkedinUrl: '',
        });
        // Reload prospects to show the new one
        loadProspects();
      } else {
        setError('Failed to create prospect');
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to create prospect'
      );
    }
  };

  // Handle search
  const handleSearch = () => {
    setPagination(prev => ({ ...prev, page: 1 }));
    loadProspects();
  };

  // Handle filter change
  const handleStatusFilter = (status: string) => {
    setStatusFilter(status);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  // Initial load
  useEffect(() => {
    loadProspects();
  }, [pagination.page, statusFilter]);

  // Debug generated email state
  useEffect(() => {
    console.log('🎯 [Frontend] Generated Email state changed:', {
      hasGeneratedEmail: !!generatedEmail,
      generatedEmailData: generatedEmail,
      selectedProspectId: selectedProspect?.id,
    });
  }, [generatedEmail, selectedProspect?.id]);

  // Format date with proper error handling and better formatting
  const formatDate = (dateInput: any) => {
    if (!dateInput) {
      return 'N/A';
    }

    // Debug logging (remove in production)
    // console.log('🗓️ [DateFormat] Input date:', dateInput, 'Type:', typeof dateInput);

    try {
      let date: Date;

      // Handle different input types
      if (dateInput instanceof Date) {
        date = dateInput;
      } else if (typeof dateInput === 'number') {
        // Handle timestamp (both seconds and milliseconds)
        const timestamp =
          dateInput.toString().length === 10 ? dateInput * 1000 : dateInput;
        date = new Date(timestamp);
      } else if (typeof dateInput === 'string') {
        // Handle ISO string or other string formats
        date = new Date(dateInput);

        // If invalid, try parsing as timestamp
        if (isNaN(date.getTime())) {
          const timestamp = parseInt(dateInput);
          if (!isNaN(timestamp)) {
            const timestampMs =
              timestamp.toString().length === 10 ? timestamp * 1000 : timestamp;
            date = new Date(timestampMs);
          }
        }
      } else {
        console.error(
          '🗓️ [DateFormat] Unexpected date type:',
          typeof dateInput,
          dateInput
        );
        return 'Invalid Date';
      }

      // Final validation
      if (!date || isNaN(date.getTime())) {
        console.error('🗓️ [DateFormat] Final date is invalid:', dateInput);
        return 'Invalid Date';
      }

      const formatted = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      // console.log('🗓️ [DateFormat] Successfully formatted:', dateInput, '->', formatted);
      return formatted;
    } catch (error) {
      console.error('🗓️ [DateFormat] Error formatting date:', dateInput, error);
      return 'Invalid Date';
    }
  };

  return (
    <div className='p-6'>
      {/* Header */}
      <div className='flex justify-between items-center mb-6'>
        <div>
          <h1 className='text-3xl font-bold'>Prospects</h1>
          <p className='text-muted-foreground'>Manage your prospect database</p>
        </div>
        <div className='flex gap-2'>
          <Button variant='outline' onClick={() => loadProspects()}>
            <RefreshCw className='h-4 w-4 mr-2' />
            Refresh
          </Button>
          <Button onClick={() => setIsAddProspectOpen(true)}>
            <Plus className='h-4 w-4 mr-2' />
            Add Prospect
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className='mb-6 flex gap-4'>
        <div className='relative flex-1 max-w-md'>
          <Search className='absolute left-3 top-3 h-4 w-4 text-muted-foreground' />
          <Input
            className='pl-10'
            placeholder='Search prospects...'
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <select
          className='px-3 py-2 border border-input bg-background rounded-md'
          value={statusFilter}
          onChange={e => handleStatusFilter(e.target.value)}
        >
          <option value=''>All Statuses</option>
          <option value='PENDING'>Pending</option>
          <option value='ENRICHING'>Enriching</option>
          <option value='ENRICHED'>Enriched</option>
          <option value='GENERATING'>Generating</option>
          <option value='COMPLETED'>Completed</option>
          <option value='FAILED'>Failed</option>
        </select>
        <Button onClick={handleSearch}>Search</Button>
      </div>

      {/* Error Display */}
      {error && (
        <div className='mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-md'>
          <p className='text-destructive'>{error}</p>
          <Button
            variant='ghost'
            size='sm'
            onClick={() => setError(null)}
            className='mt-2'
          >
            <X className='h-4 w-4 mr-1' />
            Dismiss
          </Button>
        </div>
      )}

      {/* Prospects Table */}
      <Card>
        <CardHeader>
          <CardTitle>Prospects ({pagination.total})</CardTitle>
          <CardDescription>
            Click on a prospect to view detailed information
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className='flex justify-center py-8'>
              <Loader2 className='h-8 w-8 animate-spin' />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prospects.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className='text-center py-8'>
                        <div className='flex flex-col items-center gap-2'>
                          <User className='h-8 w-8 text-muted-foreground' />
                          <p className='text-muted-foreground'>
                            No prospects found
                          </p>
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() => setIsAddProspectOpen(true)}
                          >
                            <Plus className='h-4 w-4 mr-1' />
                            Add your first prospect
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    prospects.map(prospect => (
                      <TableRow
                        key={prospect.id}
                        className='cursor-pointer hover:bg-muted/50'
                        onClick={() => handleProspectClick(prospect)}
                      >
                        <TableCell className='font-medium'>
                          <div className='flex items-center gap-2'>
                            {prospect.name || 'N/A'}
                            {loadingProspectId === prospect.id && (
                              <Loader2 className='h-4 w-4 animate-spin text-blue-500' />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{prospect.email}</TableCell>
                        <TableCell>{prospect.company || 'N/A'}</TableCell>
                        <TableCell>{prospect.position || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge
                            className={ProspectService.getStatusColor(
                              prospect.status
                            )}
                          >
                            {prospect.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(prospect.createdAt)}</TableCell>
                        <TableCell>
                          <div className='flex gap-2'>
                            <Button
                              variant='ghost'
                              size='sm'
                              disabled={loadingProspectId === prospect.id}
                              onClick={e => {
                                e.stopPropagation();
                                handleProspectClick(prospect);
                              }}
                            >
                              {loadingProspectId === prospect.id ? (
                                <Loader2 className='h-4 w-4 animate-spin' />
                              ) : (
                                <Eye className='h-4 w-4' />
                              )}
                            </Button>
                            <Button
                              variant='ghost'
                              size='sm'
                              disabled={loadingProspectId === prospect.id}
                              onClick={e => {
                                e.stopPropagation();
                                setDeleteProspectId(prospect.id);
                              }}
                            >
                              <Trash2 className='h-4 w-4' />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className='flex justify-between items-center mt-4'>
                  <p className='text-sm text-muted-foreground'>
                    Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                    {Math.min(
                      pagination.page * pagination.limit,
                      pagination.total
                    )}{' '}
                    of {pagination.total} prospects
                  </p>
                  <div className='flex gap-2'>
                    <Button
                      variant='outline'
                      size='sm'
                      disabled={pagination.page <= 1}
                      onClick={() => handlePageChange(pagination.page - 1)}
                    >
                      Previous
                    </Button>
                    <span className='flex items-center px-3 py-1 text-sm'>
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <Button
                      variant='outline'
                      size='sm'
                      disabled={pagination.page >= pagination.totalPages}
                      onClick={() => handlePageChange(pagination.page + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Add Prospect Dialog */}
      <Dialog open={isAddProspectOpen} onOpenChange={setIsAddProspectOpen}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              <Plus className='h-5 w-5' />
              Add New Prospect
            </DialogTitle>
            <DialogDescription>
              Create a new prospect in your database
            </DialogDescription>
          </DialogHeader>

          <div className='grid gap-4 py-4'>
            <div className='grid gap-2'>
              <Label htmlFor='email'>Email *</Label>
              <Input
                id='email'
                type='email'
                value={addProspectData.email || ''}
                onChange={e =>
                  setAddProspectData(prev => ({
                    ...prev,
                    email: e.target.value,
                  }))
                }
                placeholder='prospect@company.com'
              />
            </div>

            <div className='grid gap-2'>
              <Label htmlFor='name'>Name</Label>
              <Input
                id='name'
                value={addProspectData.name || ''}
                onChange={e =>
                  setAddProspectData(prev => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
                placeholder='John Smith'
              />
            </div>

            <div className='grid gap-2'>
              <Label htmlFor='company'>Company</Label>
              <Input
                id='company'
                value={addProspectData.company || ''}
                onChange={e =>
                  setAddProspectData(prev => ({
                    ...prev,
                    company: e.target.value,
                  }))
                }
                placeholder='TechCorp Inc.'
              />
            </div>

            <div className='grid gap-2'>
              <Label htmlFor='position'>Position</Label>
              <Input
                id='position'
                value={addProspectData.position || ''}
                onChange={e =>
                  setAddProspectData(prev => ({
                    ...prev,
                    position: e.target.value,
                  }))
                }
                placeholder='CEO'
              />
            </div>

            <div className='grid gap-2'>
              <Label htmlFor='linkedin'>LinkedIn URL</Label>
              <Input
                id='linkedin'
                type='url'
                value={addProspectData.linkedinUrl || ''}
                onChange={e =>
                  setAddProspectData(prev => ({
                    ...prev,
                    linkedinUrl: e.target.value,
                  }))
                }
                placeholder='https://linkedin.com/in/johnsmith'
              />
            </div>
          </div>

          <div className='flex gap-2 justify-end'>
            <Button
              variant='outline'
              onClick={() => setIsAddProspectOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleAddProspect}>
              <Save className='h-4 w-4 mr-2' />
              Create Prospect
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Prospect Detail Dialog - Ultra Wide Rectangular Modal */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className='w-[calc(100vw-2rem)] max-w-[1800px] h-[calc(100vh-2rem)] max-h-[1000px] p-0 gap-0 bg-background flex flex-col'>
          {/* Header Section - Clean Professional Design */}
          <div className='border-b bg-card flex-shrink-0'>
            <div className='p-4'>
              <DialogHeader>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-3'>
                    <div className='w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center border'>
                      <User className='h-5 w-5 text-primary' />
                    </div>
                    <div>
                      <DialogTitle className='text-xl font-semibold text-foreground'>
                        {selectedProspect?.name || 'Prospect Details'}
                      </DialogTitle>
                      <DialogDescription className='text-sm text-muted-foreground mt-1'>
                        {selectedProspect?.email ||
                          'Loading prospect information...'}
                      </DialogDescription>
                    </div>
                  </div>

                  {detailLoading && (
                    <div className='flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-md border'>
                      <Loader2 className='h-4 w-4 animate-spin text-muted-foreground' />
                      <span className='text-sm text-muted-foreground'>
                        Loading...
                      </span>
                    </div>
                  )}
                </div>

                {/* Quick Stats Bar */}
                {selectedProspect && (
                  <div className='flex items-center gap-6 mt-3 pt-3 border-t'>
                    <div className='flex items-center gap-2'>
                      <div className='w-2 h-2 bg-green-500 rounded-full'></div>
                      <span className='text-sm text-muted-foreground'>
                        Status:{' '}
                        <span className='text-foreground font-medium'>
                          {selectedProspect.status}
                        </span>
                      </span>
                    </div>
                    <div className='flex items-center gap-2'>
                      <Calendar className='h-4 w-4 text-muted-foreground' />
                      <span className='text-sm text-muted-foreground'>
                        Added:{' '}
                        <span className='text-foreground font-medium'>
                          {formatDate(selectedProspect.createdAt)}
                        </span>
                      </span>
                    </div>
                    {selectedEnrichment && (
                      <div className='flex items-center gap-2'>
                        <Building2 className='h-4 w-4 text-muted-foreground' />
                        <span className='text-sm text-muted-foreground'>
                          Enriched:{' '}
                          <span className='text-foreground font-medium'>
                            {selectedEnrichment.enrichmentStatus}
                          </span>
                        </span>
                      </div>
                    )}
                    {generatedEmail && (
                      <div className='flex items-center gap-2'>
                        <Mail className='h-4 w-4 text-muted-foreground' />
                        <span className='text-sm text-muted-foreground'>
                          Email:{' '}
                          <span className='text-foreground font-medium'>
                            {generatedEmail.generationStatus}
                          </span>
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </DialogHeader>
            </div>
          </div>

          {/* Content Area with Proper Scrolling */}
          <div className='flex-1 min-h-0 overflow-hidden'>
            {detailLoading ? (
              <div className='flex flex-col items-center justify-center h-full py-16'>
                <div className='w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 border'>
                  <Loader2 className='h-8 w-8 animate-spin text-primary' />
                </div>
                <h3 className='text-base font-semibold text-foreground mb-2'>
                  Loading prospect details
                </h3>
                <p className='text-sm text-muted-foreground'>
                  Please wait while we gather all the information...
                </p>
              </div>
            ) : (
              selectedProspect && (
                <Tabs defaultValue='prospect' className='h-full flex flex-col'>
                  {/* Clean Tab Navigation - 3 tabs now */}
                  <div className='border-b bg-muted/20 px-4 py-2 flex-shrink-0'>
                    <TabsList className='grid w-full max-w-lg grid-cols-3 bg-background border'>
                      <TabsTrigger
                        value='prospect'
                        className='flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-sm'
                      >
                        <User className='h-4 w-4' />
                        <span className='hidden sm:inline'>Prospect</span>
                      </TabsTrigger>
                      <TabsTrigger
                        value='enrichment'
                        className='flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-sm'
                      >
                        <Building2 className='h-4 w-4' />
                        <span className='hidden sm:inline'>Enrichment</span>
                      </TabsTrigger>
                      <TabsTrigger
                        value='email'
                        className='flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-sm'
                      >
                        <Mail className='h-4 w-4' />
                        <span className='hidden sm:inline'>
                          Generated Email
                        </span>
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  {/* Tab Content with Proper Scrolling */}
                  <div className='flex-1 min-h-0'>
                    {/* Prospect Details Tab - Clean Professional Design */}
                    <TabsContent
                      value='prospect'
                      className='h-full overflow-y-auto p-4 space-y-4 m-0 data-[state=inactive]:hidden'
                    >
                      {/* Contact Information Card */}
                      <Card className='border shadow-sm'>
                        <CardHeader className='pb-3'>
                          <CardTitle className='flex items-center gap-2 text-base font-semibold'>
                            <div className='w-6 h-6 bg-primary/10 rounded-lg flex items-center justify-center border'>
                              <User className='h-4 w-4 text-primary' />
                            </div>
                            Contact Information
                          </CardTitle>
                        </CardHeader>
                        <CardContent className='space-y-4'>
                          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                            <div className='space-y-2'>
                              <label className='text-xs font-medium text-muted-foreground uppercase tracking-wide'>
                                Full Name
                              </label>
                              <p className='text-sm font-medium text-foreground'>
                                {selectedProspect.name || 'Not provided'}
                              </p>
                            </div>
                            <div className='space-y-2'>
                              <label className='text-xs font-medium text-muted-foreground uppercase tracking-wide'>
                                Email Address
                              </label>
                              <p className='text-sm font-medium text-primary'>
                                {selectedProspect.email}
                              </p>
                            </div>
                            <div className='space-y-2'>
                              <label className='text-xs font-medium text-muted-foreground uppercase tracking-wide'>
                                Company
                              </label>
                              <p className='text-sm font-medium text-foreground'>
                                {selectedProspect.company || 'Not provided'}
                              </p>
                            </div>
                            <div className='space-y-2'>
                              <label className='text-xs font-medium text-muted-foreground uppercase tracking-wide'>
                                Position
                              </label>
                              <p className='text-sm font-medium text-foreground'>
                                {selectedProspect.position || 'Not provided'}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Status & Timeline Card */}
                      <Card className='border shadow-sm'>
                        <CardHeader className='pb-3'>
                          <CardTitle className='flex items-center gap-2 text-base font-semibold'>
                            <div className='w-6 h-6 bg-primary/10 rounded-lg flex items-center justify-center border'>
                              <BarChart3 className='h-4 w-4 text-primary' />
                            </div>
                            Status & Timeline
                          </CardTitle>
                        </CardHeader>
                        <CardContent className='space-y-3'>
                          <div className='flex items-center justify-between p-3 bg-muted/30 rounded-lg border'>
                            <div className='flex items-center gap-2'>
                              <div className='w-2 h-2 bg-green-500 rounded-full'></div>
                              <span className='text-sm font-medium text-foreground'>
                                Current Status
                              </span>
                            </div>
                            <Badge
                              className={`${ProspectService.getStatusColor(selectedProspect.status)} px-2 py-1 text-xs font-medium`}
                            >
                              {selectedProspect.status}
                            </Badge>
                          </div>
                          <div className='flex items-center justify-between p-3 bg-muted/30 rounded-lg border'>
                            <div className='flex items-center gap-2'>
                              <Calendar className='h-4 w-4 text-primary' />
                              <span className='text-sm font-medium text-foreground'>
                                Date Added
                              </span>
                            </div>
                            <span className='text-sm text-muted-foreground font-medium'>
                              {formatDate(selectedProspect.createdAt)}
                            </span>
                          </div>
                        </CardContent>
                      </Card>

                      {/* LinkedIn Profile Card */}
                      {selectedProspect.linkedinUrl && (
                        <Card className='border shadow-sm'>
                          <CardHeader className='pb-4'>
                            <CardTitle className='flex items-center gap-2 text-xl'>
                              <div className='w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center border'>
                                <ExternalLink className='h-4 w-4 text-primary' />
                              </div>
                              LinkedIn Profile
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <a
                              href={selectedProspect.linkedinUrl}
                              target='_blank'
                              rel='noopener noreferrer'
                              className='flex items-center gap-3 p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors group border'
                            >
                              <div className='w-10 h-10 bg-primary rounded-lg flex items-center justify-center'>
                                <ExternalLink className='h-5 w-5 text-primary-foreground' />
                              </div>
                              <div className='flex-1'>
                                <p className='font-medium text-foreground group-hover:text-primary'>
                                  View LinkedIn Profile
                                </p>
                                <p className='text-sm text-muted-foreground truncate'>
                                  {selectedProspect.linkedinUrl}
                                </p>
                              </div>
                              <ExternalLink className='h-4 w-4 text-muted-foreground group-hover:text-primary' />
                            </a>
                          </CardContent>
                        </Card>
                      )}

                      {/* Additional Data Card */}
                      {selectedProspect.additionalData && (
                        <Card className='border shadow-sm'>
                          <CardHeader className='pb-4'>
                            <CardTitle className='flex items-center gap-2 text-xl'>
                              <div className='w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center border'>
                                <BarChart3 className='h-4 w-4 text-primary' />
                              </div>
                              Additional Information
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className='bg-muted/30 rounded-lg p-4 border'>
                              <pre className='text-sm text-foreground whitespace-pre-wrap overflow-x-auto'>
                                {JSON.stringify(
                                  selectedProspect.additionalData,
                                  null,
                                  2
                                )}
                              </pre>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </TabsContent>

                    {/* Enrichment Data Tab - Clean Professional Design */}
                    <TabsContent
                      value='enrichment'
                      className='h-full overflow-y-auto p-4 space-y-4 m-0 data-[state=inactive]:hidden'
                    >
                      {selectedEnrichment ? (
                        <div className='space-y-4'>
                          {/* Enrichment Status Overview */}
                          <Card className='border shadow-sm'>
                            <CardHeader className='pb-3'>
                              <CardTitle className='flex items-center gap-2 text-base font-semibold'>
                                <div className='w-6 h-6 bg-primary/10 rounded-lg flex items-center justify-center border'>
                                  <Building2 className='h-4 w-4 text-primary' />
                                </div>
                                Enrichment Overview
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
                                <div className='bg-muted/30 p-3 rounded-lg border'>
                                  <div className='flex items-center gap-2 mb-2'>
                                    <div className='w-2 h-2 bg-green-500 rounded-full'></div>
                                    <span className='text-xs font-medium text-muted-foreground'>
                                      Status
                                    </span>
                                  </div>
                                  <Badge
                                    className={`${ProspectService.getEnrichmentStatusColor(selectedEnrichment.enrichmentStatus)} text-xs`}
                                  >
                                    {selectedEnrichment.enrichmentStatus}
                                  </Badge>
                                </div>
                                <div className='bg-muted/30 p-3 rounded-lg border'>
                                  <div className='flex items-center gap-2 mb-2'>
                                    <Calendar className='h-4 w-4 text-primary' />
                                    <span className='text-xs font-medium text-muted-foreground'>
                                      Last Updated
                                    </span>
                                  </div>
                                  <p className='text-sm font-medium text-foreground'>
                                    {formatDate(selectedEnrichment.updatedAt)}
                                  </p>
                                </div>
                                <div className='bg-muted/30 p-3 rounded-lg border'>
                                  <div className='flex items-center gap-2 mb-2'>
                                    <ExternalLink className='h-4 w-4 text-primary' />
                                    <span className='text-xs font-medium text-muted-foreground'>
                                      Company Website
                                    </span>
                                  </div>
                                  {selectedEnrichment.companyWebsite ? (
                                    <a
                                      href={selectedEnrichment.companyWebsite}
                                      target='_blank'
                                      rel='noopener noreferrer'
                                      className='text-sm text-primary hover:underline flex items-center gap-1'
                                    >
                                      Visit Website
                                      <ExternalLink className='h-3 w-3' />
                                    </a>
                                  ) : (
                                    <p className='text-sm text-muted-foreground'>
                                      Not available
                                    </p>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>

                          {/* Company Summary */}
                          <Card className='border shadow-sm'>
                            <CardHeader className='pb-3'>
                              <CardTitle className='flex items-center gap-2 text-base font-semibold'>
                                <div className='w-6 h-6 bg-primary/10 rounded-lg flex items-center justify-center border'>
                                  <Building2 className='h-4 w-4 text-primary' />
                                </div>
                                Company Summary
                              </CardTitle>
                              <CardDescription className='text-sm'>
                                AI-generated company overview and key insights
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className='bg-muted/30 p-4 rounded-lg border max-h-80 overflow-y-auto'>
                                {selectedEnrichment.companySummary ? (
                                  <p className='text-foreground leading-relaxed whitespace-pre-wrap text-sm'>
                                    {selectedEnrichment.companySummary}
                                  </p>
                                ) : (
                                  <div className='text-center py-6'>
                                    <div className='w-12 h-12 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-3 border'>
                                      <Building2 className='h-6 w-6 text-muted-foreground' />
                                    </div>
                                    <p className='text-sm text-muted-foreground'>
                                      No company summary available
                                    </p>
                                    <p className='text-xs text-muted-foreground mt-2'>
                                      Company information will appear here after
                                      enrichment
                                    </p>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>

                          {/* LinkedIn Summary - Full Width for Better Readability */}
                          <Card className='border shadow-sm'>
                            <CardHeader className='pb-4'>
                              <CardTitle className='flex items-center gap-2 text-xl'>
                                <div className='w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center border'>
                                  <User className='h-4 w-4 text-primary' />
                                </div>
                                LinkedIn Summary
                              </CardTitle>
                              <CardDescription>
                                AI-generated summary of LinkedIn profile and
                                professional background
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className='bg-muted/30 p-6 rounded-lg border max-h-96 overflow-y-auto'>
                                {selectedEnrichment.linkedinSummary ? (
                                  <p className='text-foreground leading-relaxed whitespace-pre-wrap text-sm'>
                                    {selectedEnrichment.linkedinSummary}
                                  </p>
                                ) : (
                                  <div className='text-center py-8'>
                                    <div className='w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4 border'>
                                      <User className='h-8 w-8 text-muted-foreground' />
                                    </div>
                                    <p className='text-muted-foreground'>
                                      No LinkedIn summary available
                                    </p>
                                    <p className='text-xs text-muted-foreground mt-2'>
                                      LinkedIn profile analysis will appear here
                                      after enrichment
                                    </p>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>

                          {/* Prospect Analysis Summary - Full Width for Better Readability */}
                          <Card className='border shadow-sm'>
                            <CardHeader className='pb-4'>
                              <CardTitle className='flex items-center gap-2 text-xl'>
                                <div className='w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center border'>
                                  <BarChart3 className='h-4 w-4 text-primary' />
                                </div>
                                Prospect Analysis Summary
                              </CardTitle>
                              <CardDescription>
                                AI-powered analysis of prospect opportunities
                                and outreach approach
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className='bg-muted/30 p-6 rounded-lg border max-h-96 overflow-y-auto'>
                                {selectedEnrichment.prospectAnalysisSummary ? (
                                  <p className='text-foreground leading-relaxed whitespace-pre-wrap text-sm'>
                                    {selectedEnrichment.prospectAnalysisSummary}
                                  </p>
                                ) : (
                                  <div className='text-center py-8'>
                                    <div className='w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4 border'>
                                      <BarChart3 className='h-8 w-8 text-muted-foreground' />
                                    </div>
                                    <p className='text-muted-foreground'>
                                      No prospect analysis available
                                    </p>
                                    <p className='text-xs text-muted-foreground mt-2'>
                                      AI-powered prospect analysis will appear
                                      here after enrichment
                                    </p>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>

                          {/* BuiltWith Summary - Full Width for Better Readability */}
                          <Card className='border shadow-sm'>
                            <CardHeader className='pb-4'>
                              <CardTitle className='flex items-center gap-2 text-xl'>
                                <div className='w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center border'>
                                  <Building2 className='h-4 w-4 text-primary' />
                                </div>
                                BuiltWith Technology Summary
                              </CardTitle>
                              <CardDescription>
                                Detailed analysis of company's technology stack
                                and infrastructure
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className='bg-muted/30 p-6 rounded-lg border max-h-96 overflow-y-auto'>
                                {selectedEnrichment.builtwithSummary ? (
                                  <p className='text-foreground leading-relaxed whitespace-pre-wrap text-sm'>
                                    {selectedEnrichment.builtwithSummary}
                                  </p>
                                ) : (
                                  <div className='text-center py-8'>
                                    <div className='w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4 border'>
                                      <Building2 className='h-8 w-8 text-muted-foreground' />
                                    </div>
                                    <p className='text-muted-foreground'>
                                      No BuiltWith technology summary available
                                    </p>
                                    <p className='text-xs text-muted-foreground mt-2'>
                                      Technology stack analysis will appear here
                                      after enrichment
                                    </p>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>

                          {/* Technology Stack - Clean Design */}
                          <Card className='border shadow-sm'>
                            <CardHeader className='pb-4'>
                              <CardTitle className='flex items-center gap-2 text-xl'>
                                <div className='w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center border'>
                                  <BarChart3 className='h-4 w-4 text-primary' />
                                </div>
                                Technology Stack
                              </CardTitle>
                              <CardDescription>
                                Technologies and tools identified for this
                                company
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className='max-h-96 overflow-y-auto'>
                                <div className='space-y-6'>
                                  {selectedEnrichment.techStack ? (
                                    (() => {
                                      try {
                                        if (
                                          typeof selectedEnrichment.techStack ===
                                            'object' &&
                                          selectedEnrichment.techStack !== null
                                        ) {
                                          const techStackEntries =
                                            Object.entries(
                                              selectedEnrichment.techStack as Record<
                                                string,
                                                any
                                              >
                                            );

                                          if (techStackEntries.length === 0) {
                                            return (
                                              <div className='text-center py-8'>
                                                <div className='w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4 border'>
                                                  <BarChart3 className='h-8 w-8 text-muted-foreground' />
                                                </div>
                                                <p className='text-muted-foreground'>
                                                  No technology data available
                                                </p>
                                              </div>
                                            );
                                          }

                                          return techStackEntries.map(
                                            ([category, techs]) => {
                                              try {
                                                return (
                                                  <div
                                                    key={category}
                                                    className='bg-muted/30 p-4 rounded-lg border'
                                                  >
                                                    <h4 className='text-lg font-semibold text-foreground mb-3 flex items-center gap-2'>
                                                      <div className='w-2 h-2 bg-primary rounded-full'></div>
                                                      {category
                                                        .replace(
                                                          /([A-Z])/g,
                                                          ' $1'
                                                        )
                                                        .trim()}
                                                    </h4>
                                                    <div className='flex flex-wrap gap-2'>
                                                      {Array.isArray(techs) ? (
                                                        techs.map(
                                                          (tech, index) => {
                                                            try {
                                                              return (
                                                                <Badge
                                                                  key={`${category}-${index}`}
                                                                  variant='outline'
                                                                  className='bg-background text-foreground border-border hover:bg-muted/50 break-words max-w-full'
                                                                >
                                                                  {String(tech)}
                                                                </Badge>
                                                              );
                                                            } catch (e) {
                                                              return (
                                                                <Badge
                                                                  key={`${category}-error-${index}`}
                                                                  variant='destructive'
                                                                  className='text-xs'
                                                                >
                                                                  Error
                                                                </Badge>
                                                              );
                                                            }
                                                          }
                                                        )
                                                      ) : (
                                                        <div className='w-full'>
                                                          <p className='text-foreground text-sm leading-relaxed break-words whitespace-pre-wrap'>
                                                            {String(techs)}
                                                          </p>
                                                        </div>
                                                      )}
                                                    </div>
                                                  </div>
                                                );
                                              } catch (e) {
                                                return (
                                                  <div
                                                    key={`error-${category}`}
                                                    className='bg-destructive/10 p-4 rounded-lg border border-destructive/20'
                                                  >
                                                    <p className='text-sm text-destructive'>
                                                      Error rendering category:{' '}
                                                      {category}
                                                    </p>
                                                  </div>
                                                );
                                              }
                                            }
                                          );
                                        } else {
                                          return (
                                            <div className='bg-muted/30 p-4 rounded-lg border'>
                                              <p className='text-foreground text-sm leading-relaxed break-words whitespace-pre-wrap'>
                                                {String(
                                                  selectedEnrichment.techStack
                                                )}
                                              </p>
                                            </div>
                                          );
                                        }
                                      } catch (e) {
                                        return (
                                          <div className='bg-destructive/10 p-4 rounded-lg border border-destructive/20'>
                                            <p className='text-destructive'>
                                              Error rendering tech stack data
                                            </p>
                                          </div>
                                        );
                                      }
                                    })()
                                  ) : (
                                    <div className='text-center py-8'>
                                      <div className='w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4 border'>
                                        <BarChart3 className='h-8 w-8 text-muted-foreground' />
                                      </div>
                                      <p className='text-muted-foreground'>
                                        No technology stack available
                                      </p>
                                      <p className='text-xs text-muted-foreground mt-2'>
                                        Technology stack details will appear
                                        here after enrichment
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>

                          {/* Error Message */}
                          {selectedEnrichment.errorMessage && (
                            <Card className='border-destructive/20 shadow-sm'>
                              <CardHeader className='pb-4'>
                                <CardTitle className='flex items-center gap-2 text-xl text-destructive'>
                                  <div className='w-8 h-8 bg-destructive/10 rounded-lg flex items-center justify-center border border-destructive/20'>
                                    <X className='h-4 w-4 text-destructive' />
                                  </div>
                                  Enrichment Error
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className='bg-destructive/10 p-4 rounded-lg border border-destructive/20'>
                                  <p className='text-destructive'>
                                    {selectedEnrichment.errorMessage}
                                  </p>
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </div>
                      ) : (
                        <div className='text-center py-16'>
                          <div className='w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 border'>
                            <Building2 className='h-12 w-12 text-primary' />
                          </div>
                          <h3 className='text-2xl font-bold text-foreground mb-2'>
                            No Enrichment Data
                          </h3>
                          <p className='text-muted-foreground mb-6 max-w-md mx-auto'>
                            Start the enrichment process to gather detailed
                            company information, technology stack, and prospect
                            insights.
                          </p>
                          <Button
                            size='lg'
                            className='bg-primary hover:bg-primary/90 text-primary-foreground'
                            onClick={() =>
                              selectedProspect &&
                              ProspectService.startEnrichment(
                                selectedProspect.id
                              )
                            }
                          >
                            <Building2 className='h-5 w-5 mr-2' />
                            Start Enrichment Process
                          </Button>
                        </div>
                      )}
                    </TabsContent>

                    {/* Generated Email Tab */}
                    <TabsContent
                      value='email'
                      className='h-full overflow-y-auto p-4 space-y-4 m-0 data-[state=inactive]:hidden'
                    >
                      {generatedEmail ? (
                        <div className='space-y-4'>
                          {/* Email Status Card */}
                          <Card className='border shadow-sm'>
                            <CardHeader className='pb-3'>
                              <CardTitle className='flex items-center gap-2 text-base font-semibold'>
                                <div className='w-6 h-6 bg-primary/10 rounded-lg flex items-center justify-center border'>
                                  <Mail className='h-4 w-4 text-primary' />
                                </div>
                                Email Status
                              </CardTitle>
                            </CardHeader>
                            <CardContent className='space-y-3'>
                              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                                <div className='flex items-center justify-between p-3 bg-muted/30 rounded-lg border'>
                                  <div className='flex items-center gap-2'>
                                    <div className='w-2 h-2 bg-green-500 rounded-full'></div>
                                    <span className='text-sm font-medium text-foreground'>
                                      Generation Status
                                    </span>
                                  </div>
                                  <Badge
                                    className={`px-2 py-1 text-xs font-medium ${
                                      generatedEmail.generationStatus ===
                                      'COMPLETED'
                                        ? 'bg-green-100 text-green-800'
                                        : generatedEmail.generationStatus ===
                                            'FAILED'
                                          ? 'bg-red-100 text-red-800'
                                          : 'bg-yellow-100 text-yellow-800'
                                    }`}
                                  >
                                    {generatedEmail.generationStatus}
                                  </Badge>
                                </div>
                                <div className='flex items-center justify-between p-3 bg-muted/30 rounded-lg border'>
                                  <div className='flex items-center gap-2'>
                                    <Calendar className='h-4 w-4 text-primary' />
                                    <span className='text-sm font-medium text-foreground'>
                                      Generated At
                                    </span>
                                  </div>
                                  <span className='text-sm text-muted-foreground font-medium'>
                                    {generatedEmail.generatedAt
                                      ? formatDate(generatedEmail.generatedAt)
                                      : 'N/A'}
                                  </span>
                                </div>
                                {generatedEmail.modelUsed && (
                                  <div className='flex items-center justify-between p-3 bg-muted/30 rounded-lg border'>
                                    <div className='flex items-center gap-2'>
                                      <BarChart3 className='h-4 w-4 text-primary' />
                                      <span className='text-sm font-medium text-foreground'>
                                        AI Model Used
                                      </span>
                                    </div>
                                    <span className='text-sm text-muted-foreground font-medium'>
                                      {generatedEmail.modelUsed}
                                    </span>
                                  </div>
                                )}
                                {generatedEmail.language && (
                                  <div className='flex items-center justify-between p-3 bg-muted/30 rounded-lg border'>
                                    <div className='flex items-center gap-2'>
                                      <Building2 className='h-4 w-4 text-primary' />
                                      <span className='text-sm font-medium text-foreground'>
                                        Language
                                      </span>
                                    </div>
                                    <span className='text-sm text-muted-foreground font-medium'>
                                      {generatedEmail.language}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>

                          {/* Email Subject Card */}
                          {generatedEmail.subject && (
                            <Card className='border shadow-sm'>
                              <CardHeader className='pb-3'>
                                <CardTitle className='flex items-center gap-2 text-base font-semibold'>
                                  <div className='w-6 h-6 bg-primary/10 rounded-lg flex items-center justify-center border'>
                                    <Mail className='h-4 w-4 text-primary' />
                                  </div>
                                  Email Subject
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className='bg-muted/30 p-4 rounded-lg border'>
                                  <p className='text-sm font-medium text-foreground'>
                                    {generatedEmail.subject}
                                  </p>
                                </div>
                              </CardContent>
                            </Card>
                          )}

                          {/* Email Body Card */}
                          {generatedEmail.body && (
                            <Card className='border shadow-sm'>
                              <CardHeader className='pb-3'>
                                <CardTitle className='flex items-center gap-2 text-base font-semibold'>
                                  <div className='w-6 h-6 bg-primary/10 rounded-lg flex items-center justify-center border'>
                                    <Mail className='h-4 w-4 text-primary' />
                                  </div>
                                  Email Body
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className='bg-muted/30 p-4 rounded-lg border max-h-96 overflow-y-auto'>
                                  <div className='text-sm text-foreground leading-relaxed whitespace-pre-wrap'>
                                    {generatedEmail.body}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )}

                          {/* Error Message */}
                          {generatedEmail.errorMessage && (
                            <Card className='border-destructive/20 shadow-sm'>
                              <CardHeader className='pb-3'>
                                <CardTitle className='flex items-center gap-2 text-base font-semibold text-destructive'>
                                  <div className='w-6 h-6 bg-destructive/10 rounded-lg flex items-center justify-center border border-destructive/20'>
                                    <X className='h-4 w-4 text-destructive' />
                                  </div>
                                  Generation Error
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className='bg-destructive/10 p-3 rounded-lg border border-destructive/20'>
                                  <p className='text-sm text-destructive'>
                                    {generatedEmail.errorMessage}
                                  </p>
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </div>
                      ) : (
                        <div className='text-center py-16'>
                          <div className='w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 border'>
                            <Mail className='h-12 w-12 text-primary' />
                          </div>
                          <h3 className='text-lg font-bold text-foreground mb-2'>
                            No Generated Email
                          </h3>
                          <p className='text-sm text-muted-foreground mb-6 max-w-md mx-auto'>
                            No email has been generated for this prospect yet.
                            Start the email generation process to create
                            personalized outreach content.
                          </p>
                          <Button
                            size='sm'
                            className='bg-primary hover:bg-primary/90 text-primary-foreground'
                            onClick={() => {
                              // Add email generation trigger here
                              console.log(
                                'Starting email generation for prospect:',
                                selectedProspect?.id
                              );
                            }}
                          >
                            <Mail className='h-4 w-4 mr-2' />
                            Generate Email
                          </Button>
                        </div>
                      )}
                    </TabsContent>
                  </div>
                </Tabs>
              )
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      {deleteProspectId && (
        <DeleteConfirmationDialog
          isOpen={!!deleteProspectId}
          onClose={() => setDeleteProspectId(null)}
          onConfirm={() => handleDeleteProspect(deleteProspectId)}
          title='Delete Prospect'
          description='Are you sure you want to delete this prospect? This action cannot be undone and will also delete all associated enrichment and analysis data.'
        />
      )}
    </div>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'; // Removed unused
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import {
  Plus,
  AlertCircle,
  CheckCircle,
  Building,
  Settings,
  Users,
  Mail,
  Globe,
  Linkedin,
  Calculator,
  Save,
  Trash2,
  Loader2,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { apiClient } from '@/services/api';
import { campaignService } from '@/services/campaignService';
import { serviceService, type Service } from '@/services/serviceService';

interface Campaign {
  id: number;
  name: string;
  emailSubject: string;
  prompt: string;
  enrichmentFlags: any;
  serviceId: number | null;
  createdAt: string;
}

interface EnrichmentService {
  id: string;
  name: string;
  description: string;
  pricePerProspect: number;
  icon: React.ReactNode;
  enabled: boolean;
}

// interface CampaignSettingsData { // Removed unused interface
//     selectedCampaign?: Campaign;
//     newCampaign?: {
//         name: string;
//         language: string;
//         calendarLink: string;
//         emailTemplatePrompt: string;
//         emailSignature: string;
//         subjectGenerationPrompt: string;
//     };
//     enrichmentServices: string[];
//     estimatedCost: number;
//     prospectCount: number;
// }

interface CampaignSettingsStepProps {
  workflowSessionId: string;
  prospectCount: number;
  onStepComplete?: (data: any) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
}

export default function CampaignSettingsStep({
  workflowSessionId,
  prospectCount = 0,
  onStepComplete,
  onError,
  disabled = false,
}: CampaignSettingsStepProps) {
  // Suppress unused parameter warning for onStepComplete
  void onStepComplete;
  // Suppress unused parameter warnings
  void onError;
  void disabled;
  // Campaign selection state
  const [campaignMode, setCampaignMode] = useState<'existing' | 'new'>('new');
  const [existingCampaigns, setExistingCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);

  // Services and model state
  const [availableServices, setAvailableServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [selectedLLMModel, setSelectedLLMModel] = useState('');

  // New campaign form state
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    email_subject: '',
    prompt: '',
    service_id: '',
  });

  // Enrichment services state
  const [enrichmentServices, setEnrichmentServices] = useState<EnrichmentService[]>([
    {
      id: 'proxycurl',
      name: 'Proxycurl',
      description: 'LinkedIn profiles and professional data',
      pricePerProspect: 0.02,
      icon: <Linkedin className='h-5 w-5' />,
      enabled: false,
    },
    {
      id: 'firecrawl',
      name: 'Firecrawl',
      description: 'Website content and company information',
      pricePerProspect: 0.01,
      icon: <Globe className='h-5 w-5' />,
      enabled: false,
    },
    {
      id: 'builtwith',
      name: 'BuiltWith',
      description: 'Technology stack and tools used',
      pricePerProspect: 0.015,
      icon: <Building className='h-5 w-5' />,
      enabled: false,
    },
  ]);

  // Validation and UI state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Delete dialog state
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    campaign: Campaign | null;
    isDeleting: boolean;
  }>({
    isOpen: false,
    campaign: null,
    isDeleting: false,
  });

  // Effect to update selectedCampaign when selectedCampaignId changes
  useEffect(() => {
    if (selectedCampaignId) {
      const campaign = existingCampaigns.find(c => c.id === selectedCampaignId);
      setSelectedCampaign(campaign || null);
    } else {
      setSelectedCampaign(null);
    }
  }, [selectedCampaignId, existingCampaigns]);

  // Load existing campaigns and services on component mount
  useEffect(() => {
    loadExistingCampaigns();
    loadAvailableServices();
    handleStepStart();
    console.log('CampaignSettingsStep received prospectCount:', prospectCount);
  }, [prospectCount]);

  const handleStepStart = async () => {
    if (!workflowSessionId || workflowSessionId === 'local-session') return;

    try {
      const response = await apiClient.post(
        `/api/workflow/sessions/${workflowSessionId}/steps/CAMPAIGN_SETTINGS/start`
      );

      if (response.ok) {
        const text = await response.text();
        if (text) {
          const data = JSON.parse(text);
          if (!data.success) {
            throw new Error(
              data.message || 'Failed to start campaign settings step'
            );
          }
        }
      }
    } catch (error) {
      console.warn('Failed to start campaign settings step:', error);
      // Continue without backend step tracking
    }
  };

  const loadExistingCampaigns = async () => {
    setLoadingCampaigns(true);
    try {
      console.log('🔍 Loading campaigns from API...');
      const response = await apiClient.get('/api/campaigns');
      console.log('🔍 Response status:', response.status);
      console.log(
        '🔍 Response headers:',
        Object.fromEntries(response.headers.entries())
      );

      if (response.ok) {
        const text = await response.text();
        console.log('🔍 Raw response text:', text.substring(0, 500) + '...');

        if (text) {
          const data = JSON.parse(text);
          console.log('🔍 Parsed response data:', data);
          console.log('🔍 data.success:', data.success);
          console.log(
            '🔍 data.data type:',
            typeof data.data,
            'isArray:',
            Array.isArray(data.data)
          );
          console.log('🔍 data.data length:', data.data?.length);

          if (data.success && Array.isArray(data.data)) {
            console.log('✅ Setting campaigns:', data.data);
            setExistingCampaigns(data.data);
            return;
          } else {
            console.error('❌ Invalid data format:', {
              success: data.success,
              dataType: typeof data.data,
            });
          }
        } else {
          console.error('❌ Empty response text');
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Failed to load campaigns from backend:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to load campaigns';
      setErrors({ campaignLoading: errorMessage });
      setExistingCampaigns([]);
    } finally {
      setLoadingCampaigns(false);
    }
  };

  const loadAvailableServices = async () => {
    setLoadingServices(true);
    try {
      console.log('🔍 Loading services from API...');
      const response = await serviceService.getAllServices();

      if (response.success && response.data) {
        console.log('✅ Setting services:', response.data);
        setAvailableServices(response.data);
      } else {
        console.error('❌ Failed to load services:', response.error);
        setAvailableServices([]);
      }
    } catch (error) {
      console.error('❌ Failed to load services from backend:', error);
      setAvailableServices([]);
    } finally {
      setLoadingServices(false);
    }
  };

  const handleCampaignModeChange = (mode: 'existing' | 'new') => {
    setCampaignMode(mode);
    setErrors({});
    setSuccessMessage('');
    if (mode === 'existing') {
      setSelectedCampaignId(null);
    } else {
      setNewCampaign({
        name: '',
        email_subject: '',
        prompt: '',
        service_id: '',
      });
    }
  };

  const handleCampaignSelect = (campaignId: number) => {
    setSelectedCampaignId(campaignId);

    // Populate the form with selected campaign data for editing
    const campaign = existingCampaigns.find(c => c.id === campaignId);
    if (campaign) {
      setNewCampaign({
        name: campaign.name,
        email_subject: campaign.emailSubject || '',
        prompt: campaign.prompt || '',
        service_id: campaign.serviceId?.toString() || '',
      });

      // Only set enrichment services if none are currently enabled
      // This preserves user's manual selections
      const hasEnabledServices = enrichmentServices.some(
        service => service.enabled
      );
      if (
        !hasEnabledServices &&
        campaign.enrichmentFlags &&
        Array.isArray(campaign.enrichmentFlags)
      ) {
        setEnrichmentServices(prev =>
          prev.map(service => ({
            ...service,
            enabled: campaign.enrichmentFlags.includes(service.id),
          }))
        );
      }
    }
  };

  const handleNewCampaignChange = (field: string, value: string) => {
    // Convert "none" to empty string for service_id
    const processedValue =
      field === 'service_id' && value === 'none' ? '' : value;

    setNewCampaign(prev => ({
      ...prev,
      [field]: processedValue,
    }));

    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const handleEnrichmentServiceToggle = (
    serviceId: string,
    enabled: boolean
  ) => {
    setEnrichmentServices(prev =>
      prev.map(service =>
        service.id === serviceId ? { ...service, enabled } : service
      )
    );

    // Clear enrichment error when user selects a service
    if (enabled && errors.enrichmentServices) {
      setErrors(prev => ({
        ...prev,
        enrichmentServices: '',
      }));
    }

    // Step readiness checked when Next button is clicked
  };

  const calculateTotalCost = () => {
    const totalCostPerProspect = enrichmentServices
      .filter((service) => service.enabled)
      .reduce((total, service) => total + service.pricePerProspect, 0);
    return totalCostPerProspect * (prospectCount || 0);
  };

  const getEnabledServicesCount = () => {
    return enrichmentServices.filter(service => service.enabled).length;
  };

  // Removed unused validateForm function

  const handleCreateCampaign = async (): Promise<number | null> => {
    setIsCreating(true);
    setErrors({}); // Clear previous errors

    try {
      const enabledServiceIds = enrichmentServices
        .filter(service => service.enabled)
        .map(service => service.id);

      const campaignData = {
        name: newCampaign.name,
        emailSubject: newCampaign.email_subject,
        prompt: newCampaign.prompt,
        enrichmentFlags: enabledServiceIds,
        serviceId: newCampaign.service_id
          ? parseInt(newCampaign.service_id)
          : undefined,
      };

      console.log('🚀 Creating campaign:', campaignData);
      const response = await apiClient.post('/api/campaigns', campaignData);

      const data = await response.json();

      if (response.ok && data.success) {
        console.log('✅ Campaign created successfully:', data.data);
        setSuccessMessage('Campaign created successfully!');
        // Refresh campaigns list
        await loadExistingCampaigns();
        // Don't switch modes or change selection - let user do it manually
        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(''), 3000);
        return data.data.id; // ✅ Return the campaign ID
      } else if (response.status === 422) {
        // Handle validation errors
        console.error('❌ Validation errors:', data.errors);
        if (data.errors && Array.isArray(data.errors)) {
          const validationErrors: Record<string, string> = {};

          data.errors.forEach((error: string) => {
            if (error.includes('Campaign name')) {
              validationErrors.name = error;
            } else if (error.includes('Email subject')) {
              validationErrors.email_subject = error;
            } else if (error.includes('Prompt')) {
              validationErrors.prompt = error;
            } else if (
              error.includes('enrichmentFlags') ||
              error.includes('Enrichment flags')
            ) {
              validationErrors.enrichmentServices = error;
            } else if (error.includes('Service ID')) {
              validationErrors.service_id = error;
            } else {
              validationErrors.general = error;
            }
          });

          setErrors(validationErrors);
        } else {
          setErrors({ general: data.message || 'Validation failed' });
        }
      } else {
        // Handle other errors
        setErrors({ general: data.message || 'Failed to create campaign' });
      }
    } catch (error) {
      console.error('❌ Network error creating campaign:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Network error occurred';
      setErrors({ general: `Network error: ${errorMessage}` });
    } finally {
      setIsCreating(false);
    }

    return null; // Return null if campaign creation failed
  };

  const handleUpdateCampaign = async () => {
    if (!selectedCampaignId) return;

    setIsUpdating(true);
    setErrors({}); // Clear previous errors

    try {
      const enabledServiceIds = enrichmentServices
        .filter(service => service.enabled)
        .map(service => service.id);

      const campaignData: any = {
        name: newCampaign.name,
        emailSubject: newCampaign.email_subject,
        prompt: newCampaign.prompt,
        enrichmentFlags: enabledServiceIds,
      };

      if (newCampaign.service_id) {
        campaignData.serviceId = parseInt(newCampaign.service_id);
      }

      console.log('🚀 Updating campaign:', campaignData);

      const response = await apiClient.put(
        `/api/campaigns/${selectedCampaignId}`,
        campaignData
      );

      const data = await response.json();

      if (response.ok && data.success) {
        console.log('✅ Campaign updated successfully');
        setSuccessMessage('Campaign updated successfully!');
        // Refresh campaigns list
        await loadExistingCampaigns();
        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(''), 3000);
      } else if (response.status === 422) {
        // Handle validation errors
        console.error('❌ Validation errors:', data.errors);
        if (data.errors && Array.isArray(data.errors)) {
          const validationErrors: Record<string, string> = {};

          data.errors.forEach((error: string) => {
            if (error.includes('Campaign name')) {
              validationErrors.name = error;
            } else if (error.includes('Email subject')) {
              validationErrors.email_subject = error;
            } else if (error.includes('Prompt')) {
              validationErrors.prompt = error;
            } else if (
              error.includes('enrichmentFlags') ||
              error.includes('Enrichment flags')
            ) {
              validationErrors.enrichmentServices = error;
            } else if (error.includes('Service ID')) {
              validationErrors.service_id = error;
            } else {
              validationErrors.general = error;
            }
          });

          setErrors(validationErrors);
        } else {
          setErrors({ general: data.message || 'Validation failed' });
        }
      } else {
        // Handle other errors
        setErrors({ general: data.message || 'Failed to update campaign' });
      }
    } catch (error) {
      console.error('❌ Network error updating campaign:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Network error occurred';
      setErrors({ general: `Network error: ${errorMessage}` });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteClick = () => {
    if (!selectedCampaignId) return;

    const campaign = existingCampaigns.find(c => c.id === selectedCampaignId);
    if (campaign) {
      setDeleteDialog({
        isOpen: true,
        campaign,
        isDeleting: false,
      });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.campaign) return;

    setDeleteDialog(prev => ({ ...prev, isDeleting: true }));

    try {
      console.log('🗑️ Deleting campaign:', deleteDialog.campaign.id);
      await campaignService.deleteCampaign(deleteDialog.campaign.id);

      console.log('✅ Campaign deleted successfully');
      // Refresh campaigns list and reset selection
      await loadExistingCampaigns();
      setSelectedCampaignId(null);

      setDeleteDialog({
        isOpen: false,
        campaign: null,
        isDeleting: false,
      });
    } catch (error) {
      console.error('❌ Failed to delete campaign:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to delete campaign';
      setErrors({ general: errorMessage });
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

  // Check if campaign step is ready to complete
  const isCampaignStepReady = (() => {
    const hasEnabledServices = getEnabledServicesCount() > 0;
    const hasLLMModel = selectedLLMModel && selectedLLMModel.trim() !== '';

    if (campaignMode === 'existing') {
      // For existing campaigns, need a selected campaign, enabled services, and LLM model
      return selectedCampaignId && hasEnabledServices && hasLLMModel;
    } else {
      // For new campaigns, need filled campaign form, enabled services, and LLM model
      const hasRequiredFields =
        newCampaign.name && newCampaign.email_subject && newCampaign.prompt;
      return hasRequiredFields && hasEnabledServices && hasLLMModel;
    }
  })();

  // Function to get campaign data when step is ready to complete
  const getCampaignStepData = useCallback(() => {
    console.log('🔍 [CampaignSettings] getCampaignStepData called');
    console.log('🔍 [CampaignSettings] selectedLLMModel:', selectedLLMModel);
    console.log('🔍 [CampaignSettings] isCampaignStepReady:', isCampaignStepReady);

    if (!isCampaignStepReady) {
      console.log('⚠️ [CampaignSettings] Campaign step not ready, returning null');
      return null;
    }

    // Prepare the data to pass to the parent workflow
    const campaignStepData = {
      campaignId: selectedCampaignId, // Will be null for new campaigns - that's ok
      campaignMode: campaignMode,
      campaignName: newCampaign.name,
      emailSubject: newCampaign.email_subject,
      prompt: newCampaign.prompt,
      serviceId: newCampaign.service_id ? parseInt(newCampaign.service_id) : null,
      enrichmentServices: enrichmentServices.filter(service => service.enabled),
      estimatedCost: calculateTotalCost(),
      prospectCount,
      aiProvider: selectedLLMModel,
    };

    // Call onStepComplete with the data
    onStepComplete?.(campaignStepData);

    console.log('✅ [CampaignSettings] Returning campaign step data:', campaignStepData);
    return campaignStepData;
  }, [
    isCampaignStepReady,
    selectedCampaignId,
    campaignMode,
    newCampaign.name,
    newCampaign.email_subject,
    newCampaign.prompt,
    newCampaign.service_id,
    enrichmentServices,
    prospectCount,
    selectedLLMModel,
    onStepComplete
  ]);

  // Expose the getCampaignStepData function globally for parent access
  useEffect(() => {
    console.log('🔧 [CampaignSettings] Setting up global __campaignStepData function');
    (window as any).__campaignStepData = getCampaignStepData;

    // Cleanup on unmount
    return () => {
      console.log('🧹 [CampaignSettings] Cleaning up global __campaignStepData function');
      delete (window as any).__campaignStepData;
    };
  }, [getCampaignStepData]);

  // Removed unused handleSubmit function

  return (
    <div className='max-w-4xl mx-auto space-y-6'>
      {/* Success Message */}
      {successMessage && (
        <Alert className='border-green-200 bg-green-50'>
          <CheckCircle className='h-4 w-4 text-green-600' />
          <AlertDescription className='text-green-700'>
            {successMessage}
          </AlertDescription>
        </Alert>
      )}

      {/* General Error */}
      {errors.general && (
        <Alert variant='destructive'>
          <AlertCircle className='h-4 w-4' />
          <AlertDescription>{errors.general}</AlertDescription>
        </Alert>
      )}

      {/* AI Model Selection */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Settings className='h-5 w-5' />
            AI Model
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='max-w-md'>
            <Label htmlFor='llm-model'>
              AI Model <span className='text-red-500'>*</span>
            </Label>
            <Select
              value={selectedLLMModel}
              onValueChange={setSelectedLLMModel}
            >
              <SelectTrigger
                className={!selectedLLMModel ? 'border-red-300' : ''}
              >
                <SelectValue placeholder='Select AI Model' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='gemini-2.0-flash'>
                  Google Gemini 2.0 Flash
                </SelectItem>
                <SelectItem value='openai-o1-mini'>OpenAI O1-mini</SelectItem>
                <SelectItem value='openrouter-gemini-2.5-pro'>
                  OpenRouter Gemini 2.5 Pro
                </SelectItem>
                <SelectItem value='openrouter-gemini-2.5-flash'>
                  OpenRouter Gemini 2.5 Flash
                </SelectItem>
              </SelectContent>
            </Select>
            {!selectedLLMModel && (
              <p className='text-sm text-red-600 mt-1'>
                Please select an AI model to continue
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Campaign Selection */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Mail className='h-5 w-5' />
            Campaign
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-6'>
          <RadioGroup
            value={campaignMode}
            onValueChange={(value: 'existing' | 'new') =>
              handleCampaignModeChange(value)
            }
            className='grid grid-cols-2 gap-4'
          >
            <Label
              htmlFor='existing'
              className={`flex items-center space-x-3 p-4 border rounded-lg cursor-pointer transition-colors ${campaignMode === 'existing'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
                }`}
            >
              <RadioGroupItem value='existing' id='existing' />
              <div>
                <div className='font-medium'>Use Existing</div>
              </div>
            </Label>

            <Label
              htmlFor='new'
              className={`flex items-center space-x-3 p-4 border rounded-lg cursor-pointer transition-colors ${campaignMode === 'new'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
                }`}
            >
              <RadioGroupItem value='new' id='new' />
              <div>
                <div className='font-medium'>Create New</div>
              </div>
            </Label>
          </RadioGroup>

          {/* Existing Campaign Selection */}
          {campaignMode === 'existing' && (
            <div className='space-y-4'>
              <div>
                <Label htmlFor='campaign-select'>Select Campaign</Label>
                {loadingCampaigns ? (
                  <div className='p-4 text-center text-gray-500'>
                    Loading campaigns...
                  </div>
                ) : errors.campaignLoading ? (
                  <Alert variant='destructive'>
                    <AlertCircle className='h-4 w-4' />
                    <AlertDescription>
                      <strong>Failed to load campaigns:</strong>{' '}
                      {errors.campaignLoading}
                    </AlertDescription>
                  </Alert>
                ) : existingCampaigns.length === 0 ? (
                  <Card className='p-8 text-center'>
                    <div className='space-y-2'>
                      <Building className='h-12 w-12 mx-auto text-muted-foreground' />
                      <h3 className='font-semibold'>No campaigns found</h3>
                      <Button
                        onClick={() => setCampaignMode('new')}
                        className='mt-4'
                      >
                        <Plus className='h-4 w-4 mr-2' />
                        Create Campaign
                      </Button>
                    </div>
                  </Card>
                ) : (
                  <Select
                    value={selectedCampaignId?.toString() || ''}
                    onValueChange={value =>
                      handleCampaignSelect(parseInt(value))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder='Choose campaign' />
                    </SelectTrigger>
                    <SelectContent>
                      {existingCampaigns.map(campaign => (
                        <SelectItem
                          key={campaign.id}
                          value={campaign.id.toString()}
                        >
                          <div className='flex items-center justify-between w-full'>
                            <span>{campaign.name}</span>
                            <Badge variant='outline' className='ml-2'>
                              ID: {campaign.id}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {errors.selectedCampaign && (
                  <p className='text-sm text-red-600 mt-1'>
                    {errors.selectedCampaign}
                  </p>
                )}
              </div>

              {/* Campaign Edit Form */}
              {selectedCampaign && (
                <Card className='bg-gray-50'>
                  <CardHeader>
                    <div className='flex items-center justify-between'>
                      <div>
                        <CardTitle className='text-lg'>
                          Edit: {selectedCampaign.name}
                        </CardTitle>
                      </div>
                      <div className='flex gap-2'>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={handleUpdateCampaign}
                          disabled={isSubmitting || isUpdating || isCreating}
                          className='min-w-[100px]'
                        >
                          {isUpdating ? (
                            <>
                              <Loader2 className='h-4 w-4 mr-1 animate-spin' />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className='h-4 w-4 mr-1' />
                              Save
                            </>
                          )}
                        </Button>
                        <Button
                          variant='destructive'
                          size='sm'
                          onClick={handleDeleteClick}
                          disabled={isSubmitting || isUpdating || isCreating}
                        >
                          <Trash2 className='h-4 w-4' />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className='space-y-4'>
                    <div>
                      <Label htmlFor='edit-campaign-name'>Campaign Name</Label>
                      <Input
                        id='edit-campaign-name'
                        value={selectedCampaign.name}
                        onChange={e => {
                          const updatedCampaigns = existingCampaigns.map(c =>
                            c.id === selectedCampaign.id
                              ? { ...c, name: e.target.value }
                              : c
                          );
                          setExistingCampaigns(updatedCampaigns);
                        }}
                        className={
                          errors.editCampaignName ? 'border-red-500' : ''
                        }
                      />
                      {errors.editCampaignName && (
                        <p className='text-sm text-red-600 mt-1'>
                          {errors.editCampaignName}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor='edit-email-subject'>Email Subject</Label>
                      <Input
                        id='edit-email-subject'
                        value={selectedCampaign.emailSubject}
                        onChange={e => {
                          const updatedCampaigns = existingCampaigns.map(c =>
                            c.id === selectedCampaign.id
                              ? { ...c, emailSubject: e.target.value }
                              : c
                          );
                          setExistingCampaigns(updatedCampaigns);
                        }}
                        className={
                          errors.editEmailSubject ? 'border-red-500' : ''
                        }
                      />
                      {errors.editEmailSubject && (
                        <p className='text-sm text-red-600 mt-1'>
                          {errors.editEmailSubject}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor='edit-prompt'>Email Prompt</Label>
                      <Textarea
                        id='edit-prompt'
                        value={selectedCampaign.prompt}
                        onChange={e => {
                          const updatedCampaigns = existingCampaigns.map(c =>
                            c.id === selectedCampaign.id
                              ? { ...c, prompt: e.target.value }
                              : c
                          );
                          setExistingCampaigns(updatedCampaigns);
                        }}
                        className={errors.editPrompt ? 'border-red-500' : ''}
                        rows={4}
                      />
                      {errors.editPrompt && (
                        <p className='text-sm text-red-600 mt-1'>
                          {errors.editPrompt}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* New Campaign Form */}
          {campaignMode === 'new' && (
            <div className='space-y-4'>
              <div>
                <Label htmlFor='campaign-name'>Campaign Name</Label>
                <Input
                  id='campaign-name'
                  value={newCampaign.name}
                  onChange={e =>
                    handleNewCampaignChange('name', e.target.value)
                  }
                  placeholder='Enter campaign name'
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && (
                  <p className='text-sm text-red-600 mt-1'>{errors.name}</p>
                )}
              </div>

              <div>
                <Label htmlFor='email-subject'>Email Subject</Label>
                <Input
                  id='email-subject'
                  value={newCampaign.email_subject}
                  onChange={e =>
                    handleNewCampaignChange('email_subject', e.target.value)
                  }
                  placeholder='Enter email subject'
                  className={errors.email_subject ? 'border-red-500' : ''}
                />
                {errors.email_subject && (
                  <p className='text-sm text-red-600 mt-1'>
                    {errors.email_subject}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor='prompt'>Email Prompt</Label>
                <Textarea
                  id='prompt'
                  value={newCampaign.prompt}
                  onChange={e =>
                    handleNewCampaignChange('prompt', e.target.value)
                  }
                  placeholder='Enter email prompt'
                  className={errors.prompt ? 'border-red-500' : ''}
                  rows={4}
                />
                {errors.prompt && (
                  <p className='text-sm text-red-600 mt-1'>{errors.prompt}</p>
                )}
              </div>

              <div>
                <Label htmlFor='service'>Service (Optional)</Label>
                {loadingServices ? (
                  <div className='p-3 text-center text-gray-500 border rounded-md'>
                    Loading services...
                  </div>
                ) : (
                  <Select
                    value={newCampaign.service_id}
                    onValueChange={value =>
                      handleNewCampaignChange('service_id', value)
                    }
                  >
                    <SelectTrigger
                      className={errors.service_id ? 'border-red-500' : ''}
                    >
                      <SelectValue placeholder='Select service (optional)' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='none'>No service</SelectItem>
                      {availableServices.map(service => (
                        <SelectItem
                          key={service.id}
                          value={service.id.toString()}
                        >
                          <div className='flex flex-col'>
                            <span className='font-medium'>{service.name}</span>
                            {service.description && (
                              <span className='text-xs text-muted-foreground'>
                                {service.description}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {errors.service_id && (
                  <p className='text-sm text-red-600 mt-1'>
                    {errors.service_id}
                  </p>
                )}
              </div>

              <div className='flex gap-2 pt-4'>
                <Button
                  variant='outline'
                  onClick={handleCreateCampaign}
                  disabled={isSubmitting || isCreating || isUpdating}
                  className='min-w-[140px]'
                >
                  {isCreating ? (
                    <>
                      <Loader2 className='h-4 w-4 mr-1 animate-spin' />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className='h-4 w-4 mr-1' />
                      Create
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enrichment Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Users className='h-5 w-5' />
            Enrichment Services
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-6'>
          {/* Service Cards */}
          <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
            {enrichmentServices.map(service => (
              <Card
                key={service.id}
                className={`cursor-pointer transition-all duration-200 ${service.enabled
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
                  }`}
                onClick={() =>
                  handleEnrichmentServiceToggle(service.id, !service.enabled)
                }
              >
                <CardHeader className='pb-3'>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-3'>
                      <div
                        className={`p-2 rounded-lg ${service.enabled ? 'bg-blue-100' : 'bg-gray-100'}`}
                      >
                        {service.icon}
                      </div>
                      <div>
                        <CardTitle className='text-lg'>
                          {service.name}
                        </CardTitle>
                        <CardDescription className='text-sm'>
                          ${service.pricePerProspect.toFixed(3)}/prospect
                        </CardDescription>
                      </div>
                    </div>
                    <Checkbox
                      checked={service.enabled}
                      onCheckedChange={checked =>
                        handleEnrichmentServiceToggle(service.id, !!checked)
                      }
                      className='pointer-events-none'
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className='text-sm text-gray-600'>{service.description}</p>
                  {service.enabled && (
                    <div className='mt-3 p-2 bg-white rounded border'>
                      <div className='flex items-center justify-between text-sm'>
                        <span className='text-gray-600'>
                          Cost for {prospectCount} prospects:
                        </span>
                        <span className='font-medium text-green-600'>
                          ${(service.pricePerProspect * (prospectCount || 0)).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Validation Error */}
          {errors.enrichmentServices && (
            <Alert variant='destructive'>
              <AlertCircle className='h-4 w-4' />
              <AlertDescription>{errors.enrichmentServices}</AlertDescription>
            </Alert>
          )}

          {/* Simple Cost Summary */}
          {getEnabledServicesCount() > 0 && (
            <Card className='bg-gradient-to-r from-blue-50 to-green-50 border-blue-200'>
              <CardHeader>
                <CardTitle className='flex items-center gap-2 text-blue-900'>
                  <Calculator className='h-5 w-5' />
                  Total Cost: ${calculateTotalCost().toFixed(2)}
                </CardTitle>
              </CardHeader>
            </Card>
          )}
        </CardContent>
      </Card>

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

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
  Linkedin,
  Calculator,
  Trash2,
  Loader2,
  Brain,
  FileText,
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
import { campaignService } from '@/services/campaignService';

// Use the Campaign type from the service
import type { Campaign } from '@/types/index';

interface NewCampaignData {
  name: string;
  emailSubjectPrompt: string;
  emailBodyPrompt: string;
  language: 'English' | 'Italian';
}

interface CampaignSettingsStepProps {
  workflowSessionId: string;
  prospectCount: number;
  csvData?: any;
  batchName?: string | undefined;
  onStepComplete?: (data: any) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
}

interface EnrichmentService {
  id: string;
  name: string;
  description: string;
  pricePerProspect: number;
  icon: React.ReactNode;
  enabled: boolean;
}

// AI Models with updated names and order
const llmModels = [
  {
    id: 'openrouter-gemini-2.5-pro',
    name: 'OpenRouter: Google Gemini 2.5 Pro',
    provider: 'openrouter',
  },
  {
    id: 'openrouter-gemini-2.5-flash',
    name: 'OpenRouter: Google Gemini 2.5 Flash',
    provider: 'openrouter',
  },
  {
    id: 'openrouter-o1-mini',
    name: 'OpenRouter: OpenAI o1-mini',
    provider: 'openrouter',
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Google: Gemini 2.0 Flash',
    provider: 'google',
  },
];

export default function CampaignSettingsStep({
  workflowSessionId,
  prospectCount = 0,
  csvData,
  batchName,
  onStepComplete,
  onError,
  disabled = false,
}: CampaignSettingsStepProps) {
  // Suppress unused parameter warnings
  void workflowSessionId;
  void onError;
  void disabled;
  // Campaign selection state
  const [templateMode, setTemplateMode] = useState<'existing' | 'new'>('existing');
  const [existingCampaigns, setExistingCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);

  // AI Model state - Default to OpenRouter Gemini 2.5 Pro
  const [selectedLLMModel, setSelectedLLMModel] = useState('openrouter-gemini-2.5-pro');

  // New campaign form state
  const [newCampaign, setNewCampaign] = useState<NewCampaignData>({
    name: '',
    emailSubjectPrompt: '',
    emailBodyPrompt: '',
    language: 'English' // Default to English
  });

  // Enrichment services state - Updated with the 3 requested services (PRE-SELECTED)
  const [enrichmentServices, setEnrichmentServices] = useState<EnrichmentService[]>([
    {
      id: 'company-data',
      name: 'Company website enrichment',
      description: 'Enrich company information, size, industry, and revenue data',
      pricePerProspect: 0.02,
      icon: <Building className='h-5 w-5' />,
      enabled: true, // PRE-SELECTED
    },
    {
      id: 'linkedin-profile',
      name: 'LinkedIn profile enrichment',
      description: 'Gather LinkedIn profiles, job titles, and professional background',
      pricePerProspect: 0.025,
      icon: <Linkedin className='h-5 w-5' />,
      enabled: true, // PRE-SELECTED
    },
    {
      id: 'website-technology',
      name: 'Company website technology analysis',
      description: 'Analyze technology stack, tools, and software used by companies',
      pricePerProspect: 0.015,
      icon: <Calculator className='h-5 w-5' />,
      enabled: true, // PRE-SELECTED
    },
  ]);

  // Validation and UI state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);
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

  // Load existing campaigns on component mount
  useEffect(() => {
    console.log('[Step 2] Component initialized with:');
    console.log('  • CSV Data:', csvData ? 'Available' : 'Not provided');
    console.log('  • Batch Name:', batchName || 'Not provided');
    console.log('  • Prospect Count:', prospectCount);
    loadExistingCampaigns();
  }, []);

  const loadExistingCampaigns = async () => {
    setLoadingCampaigns(true);
    try {
      const response = await campaignService.getAllCampaigns();
      // Handle the paginated response structure  
      const campaigns = (response.data || []) as Campaign[];
      setExistingCampaigns(campaigns);
      setErrors(prev => ({ ...prev, campaigns: '' }));
    } catch (error) {
      console.error('Failed to load campaigns:', error);
      setErrors(prev => ({
        ...prev,
        campaigns: 'Failed to load existing campaigns'
      }));
    } finally {
      setLoadingCampaigns(false);
    }
  };

  // Create new campaign
  const handleCreateCampaign = async () => {
    if (!newCampaign.name.trim() || !newCampaign.emailSubjectPrompt.trim() || !newCampaign.emailBodyPrompt.trim()) {
      setErrors(prev => ({ ...prev, createCampaign: 'Please fill in all required fields' }));
      return;
    }

    setIsCreatingCampaign(true);
    setErrors(prev => ({ ...prev, createCampaign: '' }));

    try {
      const campaignData = {
        name: newCampaign.name.trim(),
        emailSubject: newCampaign.emailSubjectPrompt.trim(),
        prompt: newCampaign.emailBodyPrompt.trim(),
        // Add additional fields as needed
      };

      console.log('[Step 2] Creating new campaign:', campaignData.name);
      const response = await campaignService.createCampaign(campaignData);

      if (response.success && response.data) {
        console.log('[Step 2] Campaign created successfully:', response.data.name, '(ID:', response.data.id + ')');

        // Show success message
        setSuccessMessage(`Campaign "${response.data.name}" created successfully!`);

        // Clear the form
        setNewCampaign({
          name: '',
          emailSubjectPrompt: '',
          emailBodyPrompt: '',
          language: 'English'
        });

        // Reload campaigns list
        await loadExistingCampaigns();

        // Auto-select the newly created campaign
        setSelectedCampaignId(response.data.id);
        setTemplateMode('existing');

        // Clear success message after 5 seconds
        setTimeout(() => setSuccessMessage(''), 5000);
      }
    } catch (error) {
      console.error('❌ Failed to create campaign:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create campaign';
      setErrors(prev => ({ ...prev, createCampaign: errorMessage }));
    } finally {
      setIsCreatingCampaign(false);
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
      console.log('[Step 2] Deleting campaign:', deleteDialog.campaign.name, '(ID:', deleteDialog.campaign.id + ')');
      await campaignService.deleteCampaign(deleteDialog.campaign.id);

      console.log('[Step 2] Campaign deleted successfully');

      // Show success message
      setSuccessMessage(`Campaign "${deleteDialog.campaign.name}" deleted successfully!`);

      // Reload campaigns and clear selection
      await loadExistingCampaigns();
      setSelectedCampaignId(null);

      // Close dialog
      setDeleteDialog({
        isOpen: false,
        campaign: null,
        isDeleting: false,
      });

      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error) {
      console.error('❌ Failed to delete campaign:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete campaign';
      setErrors(prev => ({ ...prev, general: errorMessage }));
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

  // Handle enrichment service toggle
  const handleEnrichmentServiceToggle = (serviceId: string, enabled: boolean) => {
    const serviceName = enrichmentServices.find(s => s.id === serviceId)?.name || serviceId;
    console.log('[Step 2] Enrichment service toggled:', serviceName, enabled ? 'enabled' : 'disabled');

    setEnrichmentServices(prev =>
      prev.map(service =>
        service.id === serviceId
          ? { ...service, enabled }
          : service
      )
    );
  };

  // Check if step is ready to complete
  const isStepReady = (() => {
    const hasLLMModel = selectedLLMModel && selectedLLMModel.trim() !== '';

    if (templateMode === 'existing') {
      return selectedCampaignId && hasLLMModel;
    } else {
      const hasRequiredFields =
        newCampaign.name.trim() &&
        newCampaign.emailSubjectPrompt.trim() &&
        newCampaign.emailBodyPrompt.trim();
      return hasRequiredFields && hasLLMModel;
    }
  })();

  // Function to get campaign data when step is ready to complete
  const getCampaignStepData = useCallback(() => {
    console.log('[Step 2] Preparing data for Step 3...');

    if (!isStepReady) {
      console.log('[Step 2] Validation failed - missing required fields');
      return null;
    }

    // Find the selected model details
    const selectedModel = llmModels.find(model => model.id === selectedLLMModel);

    // Get selected enrichment services
    const selectedEnrichmentServices = enrichmentServices.filter(service => service.enabled);
    const enrichmentCost = selectedEnrichmentServices.reduce(
      (total, service) => total + (service.pricePerProspect * prospectCount),
      0
    );

    // Get campaign data based on template mode
    let campaignData = {
      campaignName: '',
      emailSubject: '',
      prompt: '',
      language: 'English' as 'English' | 'Italian'
    };

    if (templateMode === 'existing' && selectedCampaignId) {
      // Find the selected existing campaign
      const selectedCampaign = existingCampaigns.find(c => c.id === selectedCampaignId);
      if (selectedCampaign) {
        campaignData = {
          campaignName: selectedCampaign.name,
          emailSubject: selectedCampaign.emailSubject || '',
          prompt: selectedCampaign.prompt || '',
          // Since Campaign type doesn't have language field, default to English for existing campaigns
          language: 'English' as 'English' | 'Italian'
        };
      }
    } else if (templateMode === 'new') {
      // Use new campaign form data
      campaignData = {
        campaignName: newCampaign.name,
        emailSubject: newCampaign.emailSubjectPrompt,
        prompt: newCampaign.emailBodyPrompt,
        language: newCampaign.language
      };
    }

    // Prepare the complete data package including Step 1 data
    const campaignStepData = {
      // Step 1 data (CSV and batch info)
      csvData: csvData,
      batchName: batchName,
      prospectCount: prospectCount,

      // Step 2 data (campaign configuration)
      campaignId: selectedCampaignId,
      templateMode: templateMode,
      campaignName: campaignData.campaignName,
      emailSubject: campaignData.emailSubject,
      prompt: campaignData.prompt,
      language: campaignData.language,

      // AI model configuration
      aiProvider: selectedLLMModel,
      selectedModel: selectedModel,

      // Enrichment services configuration
      enrichmentServices: selectedEnrichmentServices,
      enrichmentCost: enrichmentCost,
    };

    console.log('[Step 2] Data package prepared for Step 3:');
    console.log('  • CSV Data:', csvData ? 'Available' : 'Missing');
    console.log('  • Batch Name:', batchName || 'Not set');
    console.log('  • Prospect Count:', prospectCount);
    console.log('  • Campaign Mode:', templateMode);
    console.log('  • Campaign ID:', selectedCampaignId);
    console.log('  • Campaign Name:', campaignData.campaignName || 'Not set');
    console.log('  • Email Subject:', campaignData.emailSubject || 'Not set');
    console.log('  • Email Body Prompt:', campaignData.prompt || 'Not set');
    console.log('  • Language:', campaignData.language);
    console.log('  • AI Model:', selectedModel?.name || 'Not selected');
    console.log('  • Enrichment Services:', selectedEnrichmentServices.length, 'selected');
    console.log('  • Estimated Cost: $' + enrichmentCost.toFixed(2));

    // Call onStepComplete with the data
    onStepComplete?.(campaignStepData);

    return campaignStepData;
  }, [
    isStepReady,
    selectedCampaignId,
    templateMode,
    newCampaign.name,
    newCampaign.emailSubjectPrompt,
    newCampaign.emailBodyPrompt,
    newCampaign.language,
    prospectCount,
    selectedLLMModel,
    enrichmentServices,
    csvData,
    batchName,
    existingCampaigns,
    onStepComplete
  ]);

  // Expose the getCampaignStepData function globally for parent access
  useEffect(() => {
    console.log('[Step 2] Setting up global data access function');
    (window as any).__campaignStepData = getCampaignStepData;

    return () => {
      console.log('[Step 2] Cleaning up global data access function');
      delete (window as any).__campaignStepData;
    };
  }, [getCampaignStepData]);

  return (
    <div className='max-w-6xl mx-auto space-y-6'>
      {/* Page Title */}
      <div className='text-center space-y-2'>
        <h2 className='text-2xl font-bold text-gray-900'>Workflow Settings</h2>
        <p className='text-gray-600'>Configure AI models and campaign templates</p>
      </div>

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
            <Brain className='h-5 w-5' />
            AI Model
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='ai-model'>
              Select AI Model <span className='text-red-500'>*</span>
            </Label>
            <Select
              value={selectedLLMModel}
              onValueChange={(value) => {
                const modelName = llmModels.find(m => m.id === value)?.name || value;
                console.log('[Step 2] AI model changed to:', modelName);
                setSelectedLLMModel(value);
              }}
            >
              <SelectTrigger className='w-full'>
                <SelectValue placeholder='Select AI Model' />
              </SelectTrigger>
              <SelectContent>
                {llmModels.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!selectedLLMModel && (
              <p className='text-sm text-red-600'>
                Please select an AI model to continue
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Enrichment Services Section - HORIZONTAL CARDS */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Settings className='h-5 w-5' />
            Enrichment Services
          </CardTitle>
          <CardDescription>
            Select which enrichment services to apply to your prospects
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          {/* Horizontal Grid of 3 Cards */}
          <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
            {enrichmentServices.map((service) => (
              <Card
                key={service.id}
                className={`cursor-pointer transition-all border-2 ${service.enabled
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                  : 'border-gray-200 hover:border-gray-300'
                  }`}
                onClick={() => handleEnrichmentServiceToggle(service.id, !service.enabled)}
              >
                <CardContent className='p-4'>
                  <div className='space-y-3'>
                    <div className='flex items-center justify-between'>
                      <div className={`p-2 rounded-lg ${service.enabled
                        ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30'
                        : 'bg-gray-100 text-gray-600'
                        }`}>
                        {service.icon}
                      </div>
                      <Checkbox
                        checked={service.enabled}
                        onChange={() => handleEnrichmentServiceToggle(service.id, !service.enabled)}
                      />
                    </div>
                    <div>
                      <h4 className='font-medium text-gray-900 dark:text-gray-100 text-sm'>
                        {service.name}
                      </h4>
                      <p className='text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2'>
                        {service.description}
                      </p>
                    </div>
                    <div className='space-y-1'>
                      <Badge variant='secondary' className='text-xs'>
                        ${service.pricePerProspect.toFixed(3)} per prospect
                      </Badge>
                      <div className='text-xs text-gray-600'>
                        ~${(service.pricePerProspect * prospectCount).toFixed(2)} total
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Cost Summary */}
          {enrichmentServices.some(service => service.enabled) && (
            <div className='mt-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg'>
              <div className='flex justify-between items-center'>
                <span className='font-medium'>Estimated Cost:</span>
                <div className='text-right'>
                  <div className='font-bold text-lg'>
                    ${enrichmentServices
                      .filter(service => service.enabled)
                      .reduce((total, service) => total + (service.pricePerProspect * prospectCount), 0)
                      .toFixed(2)}
                  </div>
                  <div className='text-sm text-gray-600 dark:text-gray-400'>
                    for {prospectCount} prospects
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Templates Section */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <FileText className='h-5 w-5' />
            Templates
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-6'>
          {/* Template Mode Selection */}
          <div className='space-y-4'>
            <RadioGroup
              value={templateMode}
              onValueChange={(value: 'existing' | 'new') => {
                console.log('[Step 2] Template mode changed to:', value);
                setTemplateMode(value);
              }}
              className='space-y-4'
            >
              {/* Use Existing Option */}
              <div className='space-y-3'>
                <div className='flex items-center space-x-2'>
                  <RadioGroupItem value='existing' id='existing' />
                  <Label htmlFor='existing'>Use Existing</Label>
                </div>

                {/* Campaign Selection - Shows under "Use Existing" */}
                {templateMode === 'existing' && (
                  <div className='ml-6 space-y-2'>
                    <Label htmlFor='select-campaign'>
                      Select Campaign <span className='text-red-500'>*</span>
                    </Label>
                    <div className='flex gap-2'>
                      <Select
                        value={selectedCampaignId?.toString() || ''}
                        onValueChange={(value) => {
                          const campaignName = existingCampaigns.find(c => c.id === parseInt(value))?.name || value;
                          console.log('[Step 2] Campaign selected:', campaignName);
                          setSelectedCampaignId(parseInt(value));
                        }}
                        disabled={loadingCampaigns}
                      >
                        <SelectTrigger className='w-full'>
                          <SelectValue placeholder={
                            loadingCampaigns ? 'Loading campaigns...' : 'Select a campaign'
                          } />
                        </SelectTrigger>
                        <SelectContent>
                          {existingCampaigns.map((campaign) => (
                            <SelectItem key={campaign.id} value={campaign.id.toString()}>
                              {campaign.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedCampaignId && (
                        <Button
                          variant='outline'
                          size='icon'
                          onClick={handleDeleteClick}
                          className='shrink-0'
                          disabled={deleteDialog.isDeleting}
                        >
                          {deleteDialog.isDeleting ? (
                            <Loader2 className='h-4 w-4 animate-spin' />
                          ) : (
                            <Trash2 className='h-4 w-4' />
                          )}
                        </Button>
                      )}
                    </div>
                    {errors.campaigns && (
                      <p className='text-sm text-red-600'>{errors.campaigns}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Create New Option */}
              <div className='space-y-3'>
                <div className='flex items-center space-x-2'>
                  <RadioGroupItem value='new' id='new' />
                  <Label htmlFor='new'>Create New</Label>
                </div>

                {/* New Campaign Form - Shows under "Create New" */}
                {templateMode === 'new' && (
                  <div className='ml-6 space-y-4'>
                    {errors.createCampaign && (
                      <Alert variant='destructive'>
                        <AlertCircle className='h-4 w-4' />
                        <AlertDescription>{errors.createCampaign}</AlertDescription>
                      </Alert>
                    )}

                    <div className='space-y-2'>
                      <Label htmlFor='campaign-name'>
                        Name <span className='text-red-500'>*</span>
                      </Label>
                      <Input
                        id='campaign-name'
                        type='text'
                        placeholder='Enter campaign name'
                        value={newCampaign.name}
                        onChange={(e) => setNewCampaign(prev => ({ ...prev, name: e.target.value }))}
                        disabled={isCreatingCampaign}
                      />
                    </div>

                    <div className='space-y-2'>
                      <Label htmlFor='email-subject-prompt'>
                        Email subject generation prompt <span className='text-red-500'>*</span>
                      </Label>
                      <Textarea
                        id='email-subject-prompt'
                        placeholder='Enter the prompt for generating email subjects'
                        value={newCampaign.emailSubjectPrompt}
                        onChange={(e) => setNewCampaign(prev => ({ ...prev, emailSubjectPrompt: e.target.value }))}
                        disabled={isCreatingCampaign}
                        rows={3}
                      />
                    </div>

                    <div className='space-y-2'>
                      <Label htmlFor='email-body-prompt'>
                        Email body generation prompt <span className='text-red-500'>*</span>
                      </Label>
                      <Textarea
                        id='email-body-prompt'
                        placeholder='Enter the prompt for generating email body content'
                        value={newCampaign.emailBodyPrompt}
                        onChange={(e) => setNewCampaign(prev => ({ ...prev, emailBodyPrompt: e.target.value }))}
                        disabled={isCreatingCampaign}
                        rows={4}
                      />
                    </div>

                    <div className='space-y-2'>
                      <Label htmlFor='language'>
                        Language <span className='text-red-500'>*</span>
                      </Label>
                      <Select
                        value={newCampaign.language}
                        onValueChange={(value: 'English' | 'Italian') =>
                          setNewCampaign(prev => ({ ...prev, language: value }))
                        }
                        disabled={isCreatingCampaign}
                      >
                        <SelectTrigger className='w-full'>
                          <SelectValue placeholder='Select language' />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='English'>English</SelectItem>
                          <SelectItem value='Italian'>Italian</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Create Button */}
                    <Button
                      onClick={handleCreateCampaign}
                      disabled={isCreatingCampaign || !newCampaign.name.trim() || !newCampaign.emailSubjectPrompt.trim() || !newCampaign.emailBodyPrompt.trim()}
                      className='w-full'
                    >
                      {isCreatingCampaign ? (
                        <>
                          <Loader2 className='h-4 w-4 animate-spin mr-2' />
                          Creating Campaign...
                        </>
                      ) : (
                        <>
                          <Plus className='h-4 w-4 mr-2' />
                          Create Campaign
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </RadioGroup>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={deleteDialog.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title='Delete Campaign'
        description={`Are you sure you want to delete "${deleteDialog.campaign?.name}"? This action cannot be undone.`}
        isLoading={deleteDialog.isDeleting}
      />
    </div>
  );
}

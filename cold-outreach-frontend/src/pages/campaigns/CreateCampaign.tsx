import React, { useState } from 'react';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  Mail,
  Settings,
  Wand2,
} from 'lucide-react';
import { campaignService } from '@/services/campaignService';
import type { CreateCampaignData, FormErrors } from '@/types';

interface CampaignFormData {
  name: string;
  emailSubject: string;
  prompt: string;
  serviceId: string;
  enrichmentFlags: {
    includeTechStack: boolean;
    includeCompanyInfo: boolean;
    includeLinkedInData: boolean;
    includeMarketPosition: boolean;
  };
}

export default function CreateCampaign() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<CampaignFormData>({
    name: '',
    emailSubject: '',
    prompt: '',
    serviceId: '',
    enrichmentFlags: {
      includeTechStack: true,
      includeCompanyInfo: true,
      includeLinkedInData: true,
      includeMarketPosition: false,
    },
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleInputChange = (field: keyof CampaignFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const handleEnrichmentFlagChange = (
    flag: keyof CampaignFormData['enrichmentFlags'],
    value: boolean
  ) => {
    setFormData(prev => ({
      ...prev,
      enrichmentFlags: {
        ...prev.enrichmentFlags,
        [flag]: value,
      },
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Campaign name is required';
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'Campaign name must be at least 3 characters';
    } else if (formData.name.trim().length > 255) {
      newErrors.name = 'Campaign name must not exceed 255 characters';
    }

    // Email subject validation
    if (
      formData.emailSubject.trim() &&
      formData.emailSubject.trim().length > 500
    ) {
      newErrors.emailSubject = 'Email subject must not exceed 500 characters';
    }

    // Prompt validation
    if (formData.prompt.trim() && formData.prompt.trim().length < 10) {
      newErrors.prompt = 'Prompt must be at least 10 characters if provided';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSuccessMessage('');

    try {
      const campaignData: CreateCampaignData = {
        name: formData.name.trim(),
        enrichmentFlags: formData.enrichmentFlags,
      };

      if (formData.emailSubject.trim()) {
        campaignData.emailSubject = formData.emailSubject.trim();
      }

      if (formData.prompt.trim()) {
        campaignData.prompt = formData.prompt.trim();
      }

      if (formData.serviceId) {
        campaignData.serviceId = parseInt(formData.serviceId);
      }

      const response = await campaignService.createCampaign(campaignData);

      if (response.success && response.data) {
        setSuccessMessage('Campaign created successfully!');
        setTimeout(() => {
          navigate('/campaigns');
        }, 1500);
      } else {
        throw new Error(response.error || 'Failed to create campaign');
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
      setErrors({
        general:
          error instanceof Error ? error.message : 'Failed to create campaign',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!formData.name.trim()) {
      setErrors({ name: 'Campaign name is required to save draft' });
      return;
    }

    setIsSubmitting(true);

    try {
      const campaignData: CreateCampaignData = {
        name: `[DRAFT] ${formData.name.trim()}`,
        enrichmentFlags: formData.enrichmentFlags,
      };

      if (formData.emailSubject.trim()) {
        campaignData.emailSubject = formData.emailSubject.trim();
      }

      if (formData.prompt.trim()) {
        campaignData.prompt = formData.prompt.trim();
      }

      if (formData.serviceId) {
        campaignData.serviceId = parseInt(formData.serviceId);
      }

      const response = await campaignService.createCampaign(campaignData);

      if (response.success) {
        setSuccessMessage('Draft saved successfully!');
        setTimeout(() => {
          navigate('/campaigns');
        }, 1500);
      } else {
        throw new Error(response.error || 'Failed to save draft');
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      setErrors({
        general:
          error instanceof Error ? error.message : 'Failed to save draft',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='p-6'>
      <div className='mb-6'>
        <div className='flex items-center gap-4 mb-4'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => navigate('/campaigns')}
          >
            <ArrowLeft className='h-4 w-4 mr-2' />
            Back to Campaigns
          </Button>
        </div>
        <h1 className='text-3xl font-bold'>Create Campaign</h1>
        <p className='text-muted-foreground'>
          Set up a new outreach campaign with all the necessary details
        </p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <Alert className='mb-6 border-green-200 bg-green-50'>
          <CheckCircle className='h-4 w-4 text-green-600' />
          <AlertDescription className='text-green-700'>
            {successMessage}
          </AlertDescription>
        </Alert>
      )}

      {/* General Error */}
      {errors.general && (
        <Alert variant='destructive' className='mb-6'>
          <AlertCircle className='h-4 w-4' />
          <AlertDescription>{errors.general}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className='max-w-4xl space-y-6'>
        {/* Basic Campaign Information */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Mail className='h-5 w-5' />
              Campaign Details
            </CardTitle>
            <CardDescription>
              Configure the basic information for your campaign
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='name'>
                  Campaign Name <span className='text-red-500'>*</span>
                </Label>
                <Input
                  id='name'
                  value={formData.name}
                  onChange={e => handleInputChange('name', e.target.value)}
                  placeholder='Enter campaign name'
                  className={errors.name ? 'border-destructive' : ''}
                />
                {errors.name && (
                  <p className='text-sm text-destructive'>{errors.name}</p>
                )}
              </div>

              <div className='space-y-2'>
                <Label htmlFor='serviceId'>Service (Optional)</Label>
                <Select
                  value={formData.serviceId}
                  onValueChange={value => handleInputChange('serviceId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder='Select a service' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='1'>Email Service</SelectItem>
                    <SelectItem value='2'>LinkedIn Service</SelectItem>
                    <SelectItem value='3'>Mixed Outreach</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='emailSubject'>Email Subject Template</Label>
              <Input
                id='emailSubject'
                value={formData.emailSubject}
                onChange={e =>
                  handleInputChange('emailSubject', e.target.value)
                }
                placeholder="Enter email subject template (e.g., 'Partnership opportunity with {{company}}')"
                className={errors.emailSubject ? 'border-destructive' : ''}
              />
              {errors.emailSubject && (
                <p className='text-sm text-destructive'>
                  {errors.emailSubject}
                </p>
              )}
              <p className='text-xs text-muted-foreground'>
                Use variables like {'{{company}}'}, {'{{name}}'}, etc. to
                personalize the subject
              </p>
            </div>
          </CardContent>
        </Card>

        {/* AI Prompt Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Wand2 className='h-5 w-5' />
              AI Prompt Configuration
            </CardTitle>
            <CardDescription>
              Configure how the AI should generate personalized emails for this
              campaign
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='prompt'>Campaign Prompt</Label>
              <Textarea
                id='prompt'
                value={formData.prompt}
                onChange={e => handleInputChange('prompt', e.target.value)}
                placeholder="Describe how the AI should generate emails. For example: 'Create a professional outreach email for a software partnership. Focus on mutual benefits and include a clear call-to-action for a discovery call.'"
                rows={6}
                className={errors.prompt ? 'border-destructive' : ''}
              />
              {errors.prompt && (
                <p className='text-sm text-destructive'>{errors.prompt}</p>
              )}
              <p className='text-xs text-muted-foreground'>
                Provide detailed instructions for the AI to generate
                personalized and effective emails
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Enrichment Settings */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Settings className='h-5 w-5' />
              Data Enrichment Settings
            </CardTitle>
            <CardDescription>
              Configure what additional data should be collected for prospects
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div className='flex items-center space-x-2'>
                <input
                  type='checkbox'
                  id='includeTechStack'
                  checked={formData.enrichmentFlags.includeTechStack}
                  onChange={e =>
                    handleEnrichmentFlagChange(
                      'includeTechStack',
                      e.target.checked
                    )
                  }
                  className='rounded border-gray-300'
                />
                <Label
                  htmlFor='includeTechStack'
                  className='text-sm font-normal'
                >
                  Include Technology Stack
                </Label>
              </div>

              <div className='flex items-center space-x-2'>
                <input
                  type='checkbox'
                  id='includeCompanyInfo'
                  checked={formData.enrichmentFlags.includeCompanyInfo}
                  onChange={e =>
                    handleEnrichmentFlagChange(
                      'includeCompanyInfo',
                      e.target.checked
                    )
                  }
                  className='rounded border-gray-300'
                />
                <Label
                  htmlFor='includeCompanyInfo'
                  className='text-sm font-normal'
                >
                  Include Company Information
                </Label>
              </div>

              <div className='flex items-center space-x-2'>
                <input
                  type='checkbox'
                  id='includeLinkedInData'
                  checked={formData.enrichmentFlags.includeLinkedInData}
                  onChange={e =>
                    handleEnrichmentFlagChange(
                      'includeLinkedInData',
                      e.target.checked
                    )
                  }
                  className='rounded border-gray-300'
                />
                <Label
                  htmlFor='includeLinkedInData'
                  className='text-sm font-normal'
                >
                  Include LinkedIn Data
                </Label>
              </div>

              <div className='flex items-center space-x-2'>
                <input
                  type='checkbox'
                  id='includeMarketPosition'
                  checked={formData.enrichmentFlags.includeMarketPosition}
                  onChange={e =>
                    handleEnrichmentFlagChange(
                      'includeMarketPosition',
                      e.target.checked
                    )
                  }
                  className='rounded border-gray-300'
                />
                <Label
                  htmlFor='includeMarketPosition'
                  className='text-sm font-normal'
                >
                  Include Market Position Analysis
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Form Actions */}
        <div className='flex justify-end gap-3'>
          <Button
            type='button'
            variant='outline'
            onClick={handleSaveDraft}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            ) : (
              <Save className='mr-2 h-4 w-4' />
            )}
            Save as Draft
          </Button>
          <Button
            type='submit'
            disabled={isSubmitting}
            className='min-w-[120px]'
          >
            {isSubmitting ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Creating...
              </>
            ) : (
              <>
                <Save className='mr-2 h-4 w-4' />
                Create Campaign
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

import {
  Brain,
  Database,
  Globe,
  CheckCircle,
  AlertCircle,
  Loader2,
  Mail,
  Building,
  User,
  Phone,
} from 'lucide-react';

interface EnrichmentService {
  id: string;
  name: string;
  description: string;
  provider: string;
  category: 'linkedin' | 'company' | 'email' | 'phone' | 'social';
  pricePerLookup: number;
  accuracy: number;
  speed: 'fast' | 'medium' | 'slow';
  dataPoints: string[];
  icon: React.ReactNode;
  enabled: boolean;
}

interface LLMModel {
  id: string;
  name: string;
  provider: 'google' | 'openrouter';
  description: string;
  inputCostPer1M: number;
  outputCostPer1M: number;
  maxTokens: number;
  speed: 'fast' | 'medium' | 'slow';
  quality: 'high' | 'medium' | 'low';
  features: string[];
}

interface EnrichmentConfiguration {
  services: {
    linkedin: boolean;
    company: boolean;
    email: boolean;
    phone: boolean;
    social: boolean;
  };
  llmModel: string;
  batchSize: number;
  retryAttempts: number;
  timeout: number;
  priorityMode: 'speed' | 'accuracy' | 'cost';
  customPrompt: string;
  dataFilters: {
    requireEmail: boolean;
    requireCompany: boolean;
    skipDuplicates: boolean;
    validateEmails: boolean;
  };
}

interface EnrichmentConfigurationStepProps {
  workflowSessionId?: string;
  prospectCount?: number;
  onStepComplete?: (data: any) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
}

export default function EnrichmentConfigurationStep({
  workflowSessionId,
  prospectCount,
  onStepComplete,
  onError,
  disabled = false,
}: EnrichmentConfigurationStepProps) {
  // Validate prospect count
  if (!prospectCount || prospectCount <= 0) {
    return (
      <div className='max-w-4xl mx-auto space-y-6'>
        <div className='text-center space-y-2'>
          <h2 className='text-2xl font-bold text-gray-900'>
            Enrichment Configuration
          </h2>
          <p className='text-gray-600'>
            Configure AI models and enrichment processing settings
          </p>
        </div>

        <Alert variant='destructive'>
          <AlertCircle className='h-4 w-4' />
          <AlertDescription>
            <strong>Invalid prospect data:</strong> No valid prospect count
            found. Please return to Step 1 and upload a valid CSV file
            containing prospect information.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [,] = useState('services');
  const [configuration, setConfiguration] = useState<EnrichmentConfiguration>({
    services: {
      linkedin: true,
      company: true,
      email: false,
      phone: false,
      social: false,
    },
    llmModel: 'gemini-2.0-flash',
    batchSize: 50,
    retryAttempts: 3,
    timeout: 30,
    priorityMode: 'accuracy',
    customPrompt: '',
    dataFilters: {
      requireEmail: false,
      requireCompany: true,
      skipDuplicates: true,
      validateEmails: true,
    },
  });
  const [costEstimate, setCostEstimate] = useState({
    enrichmentCosts: 0,
    llmCosts: 0,
    totalCosts: 0,
    estimatedTime: 0,
  });

  // Mock enrichment services data
  const enrichmentServices: EnrichmentService[] = [
    {
      id: 'proxycurl-linkedin',
      name: 'LinkedIn Profile Data',
      description:
        'Comprehensive LinkedIn profile information including work history, education, and skills',
      provider: 'Proxycurl',
      category: 'linkedin',
      pricePerLookup: 0.03,
      accuracy: 95,
      speed: 'medium',
      dataPoints: [
        'Work History',
        'Education',
        'Skills',
        'Connections',
        'Profile Picture',
        'About Section',
      ],
      icon: <User className='h-4 w-4' />,
      enabled: true,
    },
    {
      id: 'clearbit-company',
      name: 'Company Enrichment',
      description:
        'Company information including size, industry, funding, and technology stack',
      provider: 'Clearbit',
      category: 'company',
      pricePerLookup: 0.02,
      accuracy: 90,
      speed: 'fast',
      dataPoints: [
        'Employee Count',
        'Industry',
        'Funding',
        'Technology Stack',
        'Revenue Range',
        'Founded Date',
      ],
      icon: <Building className='h-4 w-4' />,
      enabled: true,
    },
    {
      id: 'hunter-email',
      name: 'Email Finder',
      description: 'Find and verify professional email addresses',
      provider: 'Hunter.io',
      category: 'email',
      pricePerLookup: 0.01,
      accuracy: 85,
      speed: 'fast',
      dataPoints: [
        'Professional Email',
        'Email Confidence Score',
        'Email Pattern',
        'Personal Email',
      ],
      icon: <Mail className='h-4 w-4' />,
      enabled: true,
    },
    {
      id: 'truecaller-phone',
      name: 'Phone Number Lookup',
      description: 'Find and verify phone numbers with carrier information',
      provider: 'TrueCaller',
      category: 'phone',
      pricePerLookup: 0.05,
      accuracy: 80,
      speed: 'slow',
      dataPoints: [
        'Mobile Number',
        'Landline',
        'Carrier Info',
        'Country Code',
        'Number Type',
      ],
      icon: <Phone className='h-4 w-4' />,
      enabled: true,
    },
    {
      id: 'pipl-social',
      name: 'Social Media Profiles',
      description: 'Discover social media profiles across major platforms',
      provider: 'Pipl',
      category: 'social',
      pricePerLookup: 0.02,
      accuracy: 75,
      speed: 'medium',
      dataPoints: [
        'Facebook',
        'Twitter',
        'Instagram',
        'GitHub',
        'Personal Website',
        'Blog',
      ],
      icon: <Globe className='h-4 w-4' />,
      enabled: true,
    },
  ];

  // LLM Models data
  const llmModels: LLMModel[] = [
    {
      id: 'gemini-2.0-flash',
      name: 'Gemini 2.0 Flash',
      provider: 'google',
      description:
        'Latest Google Gemini model with superior reasoning and speed',
      inputCostPer1M: 0.075,
      outputCostPer1M: 0.3,
      maxTokens: 1000000,
      speed: 'fast',
      quality: 'high',
      features: [
        'Multimodal',
        'Code Generation',
        'Function Calling',
        'JSON Mode',
      ],
    },
    {
      id: 'openrouter-o1-mini',
      name: 'OpenAI O1-Mini',
      provider: 'openrouter',
      description:
        'Optimized reasoning model via OpenRouter with excellent problem-solving',
      inputCostPer1M: 3.0,
      outputCostPer1M: 12.0,
      maxTokens: 65536,
      speed: 'medium',
      quality: 'high',
      features: [
        'Advanced Reasoning',
        'Chain of Thought',
        'Problem Solving',
        'Complex Analysis',
      ],
    },
    {
      id: 'openrouter-gemini-2.5-pro',
      name: 'OpenRouter Gemini 2.5 Pro',
      provider: 'openrouter',
      description:
        'Google Gemini 2.5 Pro via OpenRouter - Premium model with enhanced reasoning',
      inputCostPer1M: 3.5,
      outputCostPer1M: 10.5,
      maxTokens: 1000000,
      speed: 'medium',
      quality: 'high',
      features: [
        'Advanced Multimodal',
        'Extended Context',
        'Premium Reasoning',
        'Enhanced Analysis',
      ],
    },
    {
      id: 'openrouter-gemini-2.5-flash',
      name: 'OpenRouter Gemini 2.5 Flash',
      provider: 'openrouter',
      description:
        'Google Gemini 2.5 Flash via OpenRouter - Fast and efficient with good quality',
      inputCostPer1M: 0.075,
      outputCostPer1M: 0.3,
      maxTokens: 1000000,
      speed: 'fast',
      quality: 'high',
      features: [
        'Multimodal',
        'High Speed',
        'Cost Effective',
        'Balanced Performance',
      ],
    },
  ];

  // Initialize step when component mounts
  useEffect(() => {
    if (workflowSessionId) {
      handleStepStart();
    }
    calculateCostEstimate();
  }, [workflowSessionId]);

  // Recalculate costs when configuration changes
  useEffect(() => {
    calculateCostEstimate();
  }, [configuration, prospectCount]);

  const handleStepStart = async () => {
    if (!workflowSessionId) return;

    try {
      const response = await fetch(
        `/api/workflow/sessions/${workflowSessionId}/steps/ENRICHMENT_CONFIG/start`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const data = await response.json();
      if (!data.success) {
        throw new Error(
          data.message || 'Failed to start enrichment configuration step'
        );
      }
    } catch (error) {
      console.error('Failed to start enrichment config step:', error);
      onError?.(
        error instanceof Error ? error.message : 'Failed to start step'
      );
    }
  };

  const calculateCostEstimate = useCallback(() => {
    let enrichmentCosts = 0;
    let estimatedTime = 0;

    // Calculate enrichment service costs
    enrichmentServices.forEach(service => {
      if (configuration.services[service.category]) {
        enrichmentCosts += service.pricePerLookup * prospectCount;

        // Estimate time based on batch size and speed
        const timeMultiplier =
          service.speed === 'fast' ? 1 : service.speed === 'medium' ? 2 : 3;
        estimatedTime = Math.max(
          estimatedTime,
          (prospectCount / configuration.batchSize) * timeMultiplier
        );
      }
    });

    // Calculate LLM costs (assuming 500 input tokens and 200 output tokens per prospect)
    const selectedModel = llmModels.find(m => m.id === configuration.llmModel);
    let llmCosts = 0;
    if (selectedModel) {
      const inputTokens = 500 * prospectCount;
      const outputTokens = 200 * prospectCount;
      llmCosts =
        (inputTokens / 1000000) * selectedModel.inputCostPer1M +
        (outputTokens / 1000000) * selectedModel.outputCostPer1M;
    }

    setCostEstimate({
      enrichmentCosts,
      llmCosts,
      totalCosts: enrichmentCosts + llmCosts,
      estimatedTime: Math.ceil(estimatedTime), // in minutes
    });
  }, [configuration, prospectCount]);

  const handleServiceToggle = (
    category: keyof typeof configuration.services
  ) => {
    setConfiguration(prev => ({
      ...prev,
      services: {
        ...prev.services,
        [category]: !prev.services[category],
      },
    }));
  };

  const handleCompleteStep = async () => {
    if (!workflowSessionId) return;

    // Validate configuration
    const enabledServices = Object.values(configuration.services).some(
      enabled => enabled
    );
    if (!enabledServices) {
      setError('Please enable at least one enrichment service');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/workflow/sessions/${workflowSessionId}/steps/ENRICHMENT_CONFIG/complete`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data: {
              configuration,
              costEstimate,
              enabledServices: enrichmentServices.filter(
                s => configuration.services[s.category]
              ),
              selectedModel: llmModels.find(
                m => m.id === configuration.llmModel
              ),
            },
          }),
        }
      );

      const data = await response.json();
      if (data.success) {
        onStepComplete?.(data.data);
      } else {
        throw new Error(data.message || 'Failed to complete step');
      }
    } catch (error) {
      onError?.(
        error instanceof Error ? error.message : 'Failed to complete step'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='space-y-6'>
      {/* Error Alert */}
      {error && (
        <Alert variant='destructive'>
          <AlertCircle className='h-4 w-4' />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Enrichment Services */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Database className='h-5 w-5' />
            Services
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          {enrichmentServices.map(service => (
            <Card
              key={service.id}
              className={`cursor-pointer transition-all ${
                configuration.services[service.category]
                  ? 'ring-2 ring-primary'
                  : 'hover:shadow-md'
              }`}
              onClick={() => handleServiceToggle(service.category)}
            >
              <CardContent className='p-4'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-start gap-3'>
                    <div className='flex items-center justify-center w-10 h-10 bg-muted rounded-lg'>
                      {service.icon}
                    </div>
                    <div className='space-y-1'>
                      <div className='flex items-center gap-2'>
                        <h4 className='font-medium'>{service.name}</h4>
                        <Badge variant='outline'>{service.provider}</Badge>
                      </div>
                      <p className='text-sm text-muted-foreground'>
                        {service.description}
                      </p>
                      <div className='flex items-center gap-4 text-xs text-muted-foreground'>
                        <span>${service.pricePerLookup}/lookup</span>
                      </div>
                    </div>
                  </div>
                  <div className='flex items-center gap-2'>
                    <Switch
                      checked={configuration.services[service.category]}
                      onCheckedChange={() =>
                        handleServiceToggle(service.category)
                      }
                      disabled={disabled}
                    />
                    {configuration.services[service.category] && (
                      <CheckCircle className='h-5 w-5 text-green-500' />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      {/* LLM Model Selection */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Brain className='h-5 w-5' />
            AI Model
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          {llmModels.map(model => (
            <Card
              key={model.id}
              className={`cursor-pointer transition-all ${
                configuration.llmModel === model.id
                  ? 'ring-2 ring-primary'
                  : 'hover:shadow-md'
              }`}
              onClick={() =>
                setConfiguration(prev => ({ ...prev, llmModel: model.id }))
              }
            >
              <CardContent className='p-4'>
                <div className='flex items-center justify-between'>
                  <div className='space-y-2'>
                    <div className='flex items-center gap-2'>
                      <h4 className='font-medium'>{model.name}</h4>
                      <Badge variant='outline'>{model.provider}</Badge>
                    </div>
                    <p className='text-sm text-muted-foreground'>
                      {model.description}
                    </p>
                  </div>
                  {configuration.llmModel === model.id && (
                    <CheckCircle className='h-5 w-5 text-green-500' />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      {/* Completion */}
      <Card>
        <CardContent className='p-6 text-center space-y-4'>
          <div className='flex items-center justify-center w-16 h-16 mx-auto bg-blue-100 text-blue-600 rounded-full'>
            <CheckCircle className='h-8 w-8' />
          </div>
          <div>
            <h3 className='text-lg font-semibold'>Ready to Begin</h3>
            <p className='text-muted-foreground'>Configuration complete</p>
          </div>
          <Button
            onClick={handleCompleteStep}
            disabled={
              disabled ||
              isLoading ||
              !Object.values(configuration.services).some(enabled => enabled)
            }
          >
            {isLoading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
            Begin Enrichment Process
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

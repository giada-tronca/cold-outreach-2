import { useState, useEffect, useRef } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Play,
  Pause,
  Square,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  Users,
  TrendingUp,
  Activity,
  AlertTriangle,
  XCircle,
  Loader2,
  BarChart3,
  Timer,
  Settings2,
  ArrowLeft,
} from 'lucide-react';

import ReactMarkdown from 'react-markdown';

import ProspectEnrichmentService from '@/services/prospectEnrichmentService';
import type { EnrichmentJobStatus } from '@/services/prospectEnrichmentService';

interface CSVPreviewRow {
  [key: string]: string;
}

interface CSVPreview {
  headers: string[];
  rows: CSVPreviewRow[];
  totalRows: number;
}

interface CSVFileInfo {
  uploadId: string;
  fileName: string;
  fileSize: number;
  preview?: CSVPreview;
}

interface EnrichmentConfig {
  selectedModel?: {
    id: string;
    name: string;
  };
  selectedServices?: string[];
}

interface ProspectData {
  id: number;
  name: string;
  email: string;
  company: string;
  position: string;
  linkedinUrl?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'retrying' | 'skipped';
  progress: number;
  enrichedData?: {
    linkedinSummary?: string;
    companySummary?: string;
    techStack?: any[];
    prospectAnalysisSummary?: string;
  };
  errors: string[];
  retryCount: number;
  processingTime?: number;
  completedAt?: string;
  batchId?: string;
  firstName?: string;
  lastName?: string;
  location?: string;
  phone?: string;
}

type ProspectEnrichmentStatus = ProspectData;

interface JobConfig {
  campaignId?: number;
  csvData?: Prospect[];
  filename?: string;
  fileId?: string;
  configuration: {
    aiProvider: 'gemini' | 'openrouter';
    llmModelId?: string;
    concurrency: number;
    retryAttempts: number;
    websitePages: number;
    services: string[];
  };
}

interface Prospect {
  name: string;
  email: string;
  company?: string;
  position?: string;
  [key: string]: any;
}

interface BeginEnrichmentStepProps {
  prospectCount: number;
  campaignId?: number;
  csvFileInfo?: CSVFileInfo;
  enrichmentConfig?: EnrichmentConfig;
  stepData?: any; // Complete data from previous steps
  onStepComplete?: (data: any) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
}

export default function BeginEnrichmentStep({
  prospectCount = 0,
  campaignId,
  csvFileInfo,
  enrichmentConfig,
  stepData,
  onStepComplete,
  onError,
  disabled = false,
}: BeginEnrichmentStepProps) {
  // Log configuration received from previous steps
  console.log('[Step 3] Initialized with configuration:');
  console.log('  • Prospect Count:', prospectCount);
  console.log('  • AI Model:', enrichmentConfig?.selectedModel?.name || 'Not specified');
  console.log('  • CSV Data:', csvFileInfo ? 'Available' : 'Missing');
  console.log('  • Campaign ID:', campaignId || 'Not specified');

  const [isStarted, setIsStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<EnrichmentJobStatus | null>(null);
  const [prospects, setProspects] = useState<ProspectEnrichmentStatus[]>([]);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'prospects' | 'errors' | 'settings'>('overview');
  const eventSourceRef = useRef<EventSource | null>(null);

  // SSE connection for real-time updates
  const userId = 'default-user'; // Use consistent userId - TODO: Get from auth context

  // Only keep the cleanup effect for SSE
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  // Show CSV preview data without making API calls
  useEffect(() => {
    if (!csvFileInfo?.preview?.rows || !csvFileInfo.preview.headers) {
      console.log('[Step 3] No CSV preview data available');
      return;
    }

    const { rows, headers } = csvFileInfo.preview;

    // Create a header mapping to standardize field names
    const headerMapping: { [key: string]: string } = {};
    headers.forEach((header: string) => {
      const lowerHeader = header.toLowerCase().trim();
      console.log('[Step 3] Processing header:', header);

      if (lowerHeader.includes('first') && lowerHeader.includes('name')) {
        headerMapping[header] = 'firstName';
      } else if (lowerHeader.includes('last') && lowerHeader.includes('name')) {
        headerMapping[header] = 'lastName';
      } else if (lowerHeader.includes('name') && !lowerHeader.includes('company')) {
        headerMapping[header] = 'name';
      } else if (lowerHeader.includes('email')) {
        headerMapping[header] = 'email';
      } else if (lowerHeader.includes('company')) {
        headerMapping[header] = 'company';
      } else if (lowerHeader.includes('title') || lowerHeader.includes('position') || lowerHeader.includes('role')) {
        headerMapping[header] = 'position';
      } else if (lowerHeader.includes('phone')) {
        headerMapping[header] = 'phone';
      } else if (lowerHeader.includes('linkedin')) {
        headerMapping[header] = 'linkedinUrl';
      } else if (lowerHeader.includes('location')) {
        headerMapping[header] = 'location';
      } else {
        headerMapping[header] = header;
      }
    });

    const previewProspects = rows.map((row: CSVPreviewRow, rowIndex: number) => {
      const rowData: ProspectData = {
        id: rowIndex + 1,
        name: '',
        email: '',
        company: '',
        position: '',
        status: 'pending',
        progress: 0,
        errors: [],
        retryCount: 0,
        processingTime: 0,
        firstName: '',
        lastName: '',
        linkedinUrl: '',
        location: '',
        phone: ''
      };

      // Map the CSV data using the same logic
      headers.forEach((header: string) => {
        const mappedField = headerMapping[header];
        const value = row[header] || '';
        if (mappedField) {
          (rowData as any)[mappedField] = value;
        }
      });

      // Create proper name field
      if (rowData.firstName && rowData.lastName && !rowData.name) {
        rowData.name = `${rowData.firstName} ${rowData.lastName}`.trim();
      }

      // Ensure we have fallback values for display
      rowData.name = rowData.name || rowData.firstName || 'Unknown Name';
      rowData.email = rowData.email || 'No Email';
      rowData.company = rowData.company || 'Unknown Company';
      rowData.position = rowData.position || 'Unknown Position';

      return rowData as ProspectEnrichmentStatus;
    });

    console.log('[Step 3] Preview prospects loaded:', previewProspects.length);
    setProspects(previewProspects);
  }, [csvFileInfo]);

  // Configuration state
  const [concurrency, setConcurrency] = useState([2]);
  const [retryAttempts, setRetryAttempts] = useState([2]);
  const [websitePages, setWebsitePages] = useState([3]);

  // Email generation states

  // Move loadProspects function definition here but don't call it on mount
  const startEnrichment = async () => {
    console.log('[Step 3] Starting enrichment process...');

    if (isStarted) {
      console.log('[Step 3] Enrichment already started, skipping...');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Try to get campaign ID from props first, then from stepData
      let finalCampaignId = campaignId || stepData?.campaignData?.campaignId || stepData?.campaignData?.id;

      console.log('[Step 3] Campaign ID sources:');
      console.log('  • From props:', campaignId);
      console.log('  • From stepData.campaignData.campaignId:', stepData?.campaignData?.campaignId);
      console.log('  • From stepData.campaignData.id:', stepData?.campaignData?.id);
      console.log('  • Final Campaign ID:', finalCampaignId);

      // Validate that we have either a campaign ID or CSV data
      if (!finalCampaignId && !csvFileInfo?.preview?.rows) {
        throw new Error('Either campaign ID or valid CSV data is required to start enrichment');
      }

      console.log('[Step 3] Configuring enrichment job:');
      console.log('  • Campaign ID:', finalCampaignId || 'will be created');
      console.log('  • Prospect Count:', prospects.length > 0 ? prospects.length : prospectCount);
      console.log('  • CSV Data:', csvFileInfo ? 'Available' : 'Missing');
      console.log('  • AI Model:', enrichmentConfig?.selectedModel?.name || 'Not specified');
      if (!enrichmentConfig) {
        console.log('[Step 3] Error: No enrichment configuration provided');
        throw new Error('No enrichment configuration provided. Please go back to Step 2 and select an AI model.');
      }

      if (!enrichmentConfig.selectedModel) {
        console.log('[Step 3] Error: No AI model selected in configuration');
        throw new Error('No LLM model selected. Please go back to Step 2 and select an AI model.');
      }

      if (!enrichmentConfig.selectedModel.id) {
        console.log('[Step 3] Error: No AI model ID found in configuration');
        throw new Error('No LLM model selected. Please go back to Step 2 and select an AI model.');
      }

      const selectedLLMModel = enrichmentConfig.selectedModel.id;

      console.log('[Step 3] AI Model configured:', selectedLLMModel);

      // Determine AI provider from the selected model
      const aiProvider = selectedLLMModel.startsWith('gemini-') ? 'gemini' : 'openrouter';
      console.log('[Step 3] AI Provider detected:', aiProvider);

      // Get services from previous step data (enrichment services)
      const enabledServices = stepData?.campaignData?.enrichmentServices?.filter((service: any) => service.enabled) || [];
      const serviceNames = enabledServices.map((service: any) => {
        switch (service.id) {
          case 'company-data': return 'Company';
          case 'linkedin-profile': return 'LinkedIn';
          case 'website-technology': return 'TechStack';
          default: return service.name;
        }
      });

      // Always include Analysis as the final step
      if (!serviceNames.includes('Analysis')) {
        serviceNames.push('Analysis');
      }

      console.log('[Step 3] Services from Step 2:', serviceNames);

      const jobConfig: JobConfig = {
        configuration: {
          aiProvider: aiProvider,
          llmModelId: selectedLLMModel,
          concurrency: concurrency[0] || 2, // Use slider value, default 2
          retryAttempts: retryAttempts[0] || 2, // Use slider value, default 2
          websitePages: websitePages[0] || 3, // Use slider value, default 3
          services: serviceNames,
        }
      };

      // Add CSV data if available
      if (csvFileInfo) {
        console.log('[Step 3] Processing CSV data for enrichment...');
        const isLocalFallback = csvFileInfo.uploadId?.includes('fallback');

        if (isLocalFallback && csvFileInfo.preview?.rows) {
          console.log('[Step 3] Using local CSV data with', csvFileInfo.preview.rows.length, 'rows');

          // Transform CSV data to match Prospect interface
          const csvData: Prospect[] = csvFileInfo.preview.rows.map((row: CSVPreviewRow) => {
            const name = row.name || `${row.firstName || ''} ${row.lastName || ''}`.trim();
            const email = row.email || '';

            if (!name || !email) {
              console.log('[Step 3] Warning: Row missing required name or email:', row);
            }

            const prospect: Prospect = {
              name: name || 'Unknown',
              email: email || 'unknown@example.com',
              ...(row.company && { company: row.company }),
              ...(row.position || row.title ? { position: row.position || row.title } : {}),
              ...(row.linkedinUrl || row.linkedin ? { linkedinUrl: row.linkedinUrl || row.linkedin } : {}),
              ...(row.phone && { phone: row.phone }),
              ...(row.location && { location: row.location }),
              // Add any additional fields that exist in the row
              ...Object.entries(row).reduce((acc, [key, value]) => {
                if (!['name', 'email', 'company', 'position', 'title', 'linkedinUrl', 'linkedin', 'phone', 'location'].includes(key) && value) {
                  acc[key] = value;
                }
                return acc;
              }, {} as Record<string, any>)
            };
            return prospect;
          });

          console.log('[Step 3] CSV data processed successfully');
          jobConfig.csvData = csvData;
          jobConfig.filename = csvFileInfo.fileName;
        } else if (!isLocalFallback) {
          jobConfig.fileId = csvFileInfo.uploadId;
          jobConfig.filename = csvFileInfo.fileName;
        } else {
          throw new Error('CSV preview data is missing. Please re-upload your CSV file.');
        }
      }

      // Check if we have CSV data from stepData instead
      if (!jobConfig.csvData && stepData?.csvData?.preview?.rows && stepData?.csvData?.preview?.headers) {
        console.log('[Step 3] Processing CSV data from stepData...');
        const { rows, headers } = stepData.csvData.preview;

        console.log('[Step 3] CSV Headers:', headers);
        console.log('[Step 3] CSV Rows:', rows.length);

        // Transform array-based CSV data to object-based format that backend expects
        const csvData: Prospect[] = rows.map((row: string[], index: number) => {
          // Create object from headers and row values
          const rowObj: Record<string, string> = {};
          headers.forEach((header: string, headerIndex: number) => {
            if (row[headerIndex]) {
              rowObj[header] = row[headerIndex];
            }
          });

          console.log('[Step 3] Row object created:', rowObj);

          // Create prospect object with proper field mapping
          const prospect: Prospect = {
            name: rowObj['First Name'] && rowObj['Last Name'] ?
              `${rowObj['First Name']} ${rowObj['Last Name']}`.trim() :
              (rowObj['name'] || rowObj['Name'] || `Prospect ${index + 1}`),
            email: rowObj['Emails'] || rowObj['Email'] || rowObj['email'] || '',
            ...(rowObj['Company'] && { company: rowObj['Company'] }),
            ...(rowObj['Title'] && { position: rowObj['Title'] }),
            ...(rowObj['LinkedIn URL'] && { linkedinUrl: rowObj['LinkedIn URL'] }),
            ...(rowObj['Phone'] && { phone: rowObj['Phone'] }),
            ...(rowObj['Location'] && { location: rowObj['Location'] }),
            // Add all other fields as additional data
            ...Object.entries(rowObj).reduce((acc, [key, value]) => {
              // Skip already mapped fields
              if (!['First Name', 'Last Name', 'Emails', 'Email', 'Company', 'Title', 'LinkedIn URL', 'Phone', 'Location', 'name', 'Name', 'email'].includes(key) && value) {
                acc[key] = value;
              }
              return acc;
            }, {} as Record<string, any>)
          };

          return prospect;
        });

        console.log('[Step 3] Transformed CSV data from stepData:', csvData);
        jobConfig.csvData = csvData;
        jobConfig.filename = stepData.csvData.filename || 'prospects.csv';
      }

      // Add campaign ID if available
      if (finalCampaignId) {
        jobConfig.campaignId = finalCampaignId;
      }

      // Validate that we have CSV data
      if (!jobConfig.csvData || jobConfig.csvData.length === 0) {
        throw new Error('No CSV data available for enrichment. Please ensure prospects were uploaded in Step 1.');
      }

      console.log('[Step 3] Creating enrichment job...');
      console.log('[Step 3] Final JobConfig being sent to API:', {
        ...jobConfig,
        csvData: jobConfig.csvData ? `${jobConfig.csvData.length} rows` : 'none'
      });

      // Create the enrichment job
      const jobResponse = await ProspectEnrichmentService.createEnrichmentJob(jobConfig);
      const job = jobResponse.data;

      console.log('[Step 3] Enrichment job created:', job.id);

      // Store the batch ID for prospect querying
      if (job.batchId) {
        sessionStorage.setItem('currentBatchId', job.batchId);
      }

      // Set job status from response
      setJobStatus(job);
      setIsStarted(true);

      // Set up SSE connection for real-time job updates
      setupSSEConnection(job.id);
    } catch (err) {
      console.error('Error starting enrichment:', err);
      const errorMessage = extractDetailedErrorMessage(err);
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Enhanced error message extraction
  const extractDetailedErrorMessage = (error: any): string => {
    // Handle network/connection errors
    if (
      error?.message?.includes('API server not available') ||
      error?.message?.includes('Failed to fetch') ||
      error?.message?.includes('ECONNREFUSED')
    ) {
      return `🔌 **Backend Server Not Running**
            
**Problem:** Cannot connect to the backend server (localhost:3001)

**Solutions:**
1. **Start the backend:** Open a terminal in the backend folder and run \`npm run dev\`
2. **Check if it's running:** Visit http://localhost:3001/api/health
3. **Check for port conflicts:** Make sure port 3001 is available
4. **Restart both servers:** Stop both frontend and backend, then restart them

**Quick Fix:** Run \`npm run dev\` from the project root directory`;
    }

    // Handle timeout errors
    if (error?.message?.includes('timeout')) {
      return `⏱️ **Request Timed Out**
            
**Problem:** The server took too long to respond

**Solutions:**
1. **Check backend performance:** Server might be overloaded
2. **Try again:** Sometimes temporary - click "Try Again"
3. **Reduce concurrency:** Lower the concurrency setting to reduce server load
4. **Check database:** Database connection might be slow`;
    }

    // Handle campaign/prospect validation errors
    if (
      error?.message?.includes('Campaign ID') ||
      error?.message?.includes('campaignId') ||
      error?.message?.includes('prospects') ||
      error?.message?.includes('No prospects found') ||
      error?.message?.includes('upload prospects via CSV') ||
      error?.message?.includes('duplicate') ||
      error?.message?.includes('already exist') ||
      error?.message?.includes('skipped because')
    ) {
      // Check if this is specifically a duplicate error
      if (
        error?.message?.includes('duplicate') ||
        error?.message?.includes('already exist') ||
        error?.message?.includes('skipped because')
      ) {
        return `🔄 **Duplicate Prospects Detected**
            
**Problem:** ${error?.message || 'Prospects with duplicate emails were found'}

**What Happened:** The system detected prospects in your CSV file that already exist in this campaign. All prospects were skipped to prevent duplicates.

**Solutions:**
1. **Use Different Emails:** Update your CSV file with prospects that have different email addresses
2. **Create New Campaign:** Start a new campaign for these prospects instead of using the existing one
3. **Remove Duplicates:** Edit your CSV file to remove the duplicate entries
4. **Enrich Existing Prospects:** If you want to re-enrich existing prospects, use the prospects management section

**Quick Fix Steps:**
1. Go back to Step 1 (CSV Upload)
2. Either upload a CSV with new prospect emails, or
3. Create a new campaign in Step 2 for your current prospects

**Note:** This prevents data corruption and ensures each prospect is only processed once per campaign.`;
      }

      return `📊 **Prospects Required for Enrichment**
            
**Problem:** ${error?.message || 'No prospect data found for enrichment'}

**Root Cause:** The system requires prospect data from a CSV file to perform enrichment.

**Step-by-Step Solution:**
1. **Go to Step 1:** Navigate back to the CSV upload step
2. **Upload CSV file:** Select a CSV file with prospect data (name, email, company, position columns)
3. **Wait for processing:** Let the system import and process your prospects
4. **Return here:** Come back to Step 3 to start enrichment

**CSV Format Required:**
\`\`\`
name,email,company,position
John Doe,john@example.com,Example Corp,CEO
Jane Smith,jane@company.com,Company Inc,CTO
\`\`\`

**Note:** A campaign is required for proper tracking and organization of your prospects.

**Quick Fix:** Click "Go Back to Step 1" button below to restart the workflow`;
    }

    // Handle API key/authentication errors
    if (
      error?.message?.includes('API key') ||
      error?.message?.includes('authentication') ||
      error?.message?.includes('unauthorized') ||
      error?.message?.includes('403') ||
      error?.message?.includes('401')
    ) {
      return `🔑 **API Key or Authentication Error**
            
**Problem:** ${error?.message || 'Missing or invalid API credentials'}

**Solutions:**
1. **Check environment variables:** Ensure .env file has all required API keys
2. **Contact administrator:** API keys might need to be updated
3. **Check service configuration:** Go to Settings → Services to verify API key setup
4. **Try different AI provider:** Switch between OpenRouter and Gemini

**Required Keys:** OPENROUTER_API_KEY, PROXYCURL_API_KEY, BUILTWITH_API_KEY`;
    }

    // Handle rate limiting errors
    if (
      error?.message?.includes('rate limit') ||
      error?.message?.includes('429') ||
      error?.message?.includes('quota') ||
      error?.message?.includes('Too Many Requests')
    ) {
      return `🚦 **Rate Limit Exceeded**
            
**Problem:** ${error?.message || 'API rate limits have been exceeded'}

**Solutions:**
1. **Wait and retry:** Rate limits reset after some time (usually 1 hour)
2. **Reduce concurrency:** Lower concurrent requests in settings
3. **Upgrade API plan:** Contact your API provider to increase limits
4. **Process in smaller batches:** Try enriching fewer prospects at once

**Quick Fix:** Wait 5-10 minutes, then reduce concurrency to 1 and try again`;
    }

    // Handle database errors
    if (
      error?.message?.includes('database') ||
      error?.message?.includes('Database is currently unavailable') ||
      error?.message?.includes('connection') ||
      error?.message?.includes('query') ||
      error?.message?.includes('SQLITE') ||
      error?.message?.includes('Prisma') ||
      error?.message?.includes("Can't reach database server")
    ) {
      return `💾 **Database Connection Error**
            
**Problem:** ${error?.message || 'Database connection or query failed'}

**Root Cause:** The backend cannot connect to the PostgreSQL database server.

**Solutions:**
1. **Check database server:** Ensure your PostgreSQL database is running and accessible
2. **Verify DATABASE_URL:** Check that your .env file has the correct DATABASE_URL
3. **Network connectivity:** Ensure the database server is reachable from your backend
4. **Database credentials:** Verify username, password, and connection string are correct
5. **Restart backend:** Database connection pool might need refresh

**For Remote Database (Render/Supabase/etc.):**
- Check if your database service is online
- Verify connection limits haven't been exceeded
- Check for any maintenance windows

**Quick Fix:** 
1. Restart the backend server
2. Check your database service status
3. Try again in a few minutes`;
    }

    // Handle service configuration errors
    if (
      error?.message?.includes('service') ||
      error?.message?.includes('configuration') ||
      error?.message?.includes('LinkedIn') ||
      error?.message?.includes('ProxyCurl') ||
      error?.message?.includes('BuiltWith')
    ) {
      return `⚙️ **Service Configuration Error**
            
**Problem:** ${error?.message || 'External service configuration issue'}

**Solutions:**
1. **Check API keys:** Verify all external service API keys are valid
2. **Test services individually:** Go to Settings → Services to test each service
3. **Update configuration:** Some services might need reconfiguration
4. **Contact support:** External service might be down

**Services to check:** LinkedIn (ProxyCurl), Company data (BuiltWith), AI providers`;
    }

    // Handle file/upload errors
    if (
      error?.message?.includes('file') ||
      error?.message?.includes('upload') ||
      error?.message?.includes('CSV') ||
      error?.message?.includes('413') ||
      error?.message?.includes('415')
    ) {
      return `📁 **File Processing Error**
            
**Problem:** ${error?.message || 'Issue with file upload or processing'}

**Solutions:**
1. **Check file size:** Files should be under 10MB
2. **Verify CSV format:** Use proper CSV format with headers
3. **Remove special characters:** Clean up prospect names/companies
4. **Re-upload file:** Try uploading the CSV file again

**Quick Fix:** Go back to Step 1 and re-upload your CSV file`;
    }

    // Handle generic HTTP errors
    if (
      error?.message?.includes('HTTP error') ||
      error?.message?.match(/\d{3}/)
    ) {
      const statusMatch = error?.message?.match(/(\d{3})/);
      const status = statusMatch ? statusMatch[1] : 'Unknown';

      return `🌐 **Server Error (${status})**
            
**Problem:** ${error?.message || `Server returned error code ${status}`}

**Solutions:**
1. **Try again:** Server error might be temporary
2. **Check backend logs:** Look for error details in the server console
3. **Restart services:** Both frontend and backend might need restart
4. **Contact support:** If error persists

**Quick Fix:** Wait a moment and click "Try Again"`;
    }

    // Generic error with original message
    const originalMessage =
      error?.message || error?.toString() || 'Unknown error occurred';
    return `❌ **Unexpected Error**
        
**Problem:** ${originalMessage}

**Solutions:**
1. **Try again:** Click "Try Again" - issue might be temporary
2. **Check console:** Open browser developer tools for more details
3. **Restart app:** Refresh the page and try the process again
4. **Report issue:** If error persists, report this error message

**Error Details:** ${originalMessage}`;
  };

  const setupSSEConnection = (jobId: string) => {
    try {
      console.log(`📡 [Step 3] Setting up SSE connection for user: ${userId}, job: ${jobId}`);

      // Use the user-specific SSE connection for more reliable updates
      eventSourceRef.current = ProspectEnrichmentService.createSSEConnection(
        userId,
        event => {
          try {
            const data = JSON.parse(event.data);
            console.log('📡 [Step 3] SSE event received:', data.type, data);

            switch (data.type) {
              case 'job-progress':
                // Handle job progress updates (batch completion)
                console.log('[Step 3] Job progress update:', data.status);

                if (data.status === 'completed' || data.status === 'completed_with_errors' || data.status === 'failed') {
                  // Job completed - prepare data for Step 4
                  const jobResult = {
                    id: data.jobId,
                    status: data.status,
                    totalProspects: data.totalProspects,
                    completedProspects: data.completedProspects,
                    failedProspects: data.failedProspects,
                    prospects: data.prospects || prospects,
                    progress: Math.min(100, data.progress || 100),
                    message: data.status === 'completed' ? 'Enrichment completed successfully' :
                      data.status === 'failed' ? 'Enrichment failed' :
                        'Enrichment completed with some errors'
                  };

                  setJobStatus(prev => {
                    if (!prev) return null;
                    return {
                      ...prev,
                      id: data.jobId || prev.id,
                      status: data.status as any,
                      totalProspects: data.totalProspects,
                      processedProspects: data.completedProspects + data.failedProspects,
                      completedProspects: data.completedProspects,
                      failedProspects: data.failedProspects,
                      progress: Math.min(100, data.progress || 100),
                      metrics: prev.metrics || {
                        averageProcessingTime: 0,
                        successRate: data.totalProspects > 0 ? (data.completedProspects / data.totalProspects * 100) : 0,
                        enrichmentQuality: 0,
                        costPerProspect: 0.12,
                        totalCost: data.totalProspects * 0.12,
                      }
                    };
                  });

                  // Update prospects list
                  if (data.prospects) {
                    setProspects(data.prospects);
                  }

                  // Prepare complete data package for Step 4
                  const completeStepData = {
                    enrichmentResults: jobResult,
                    enrichmentSettings: {
                      concurrency: concurrency[0],
                      retryAttempts: retryAttempts[0],
                      websitePages: websitePages[0],
                      selectedModel: enrichmentConfig?.selectedModel
                    },
                    ...stepData
                  };

                  console.log(`[Step 3] Enrichment ${data.status} - proceeding to Step 4`);
                  console.log(`  • Total: ${data.totalProspects}, Completed: ${data.completedProspects}, Failed: ${data.failedProspects}`);

                  if (data.status === 'failed') {
                    setError(`Enrichment failed: ${jobResult.message}`);
                    onError?.(jobResult.message);
                  } else {
                    onStepComplete?.(completeStepData);
                  }
                }
                break;

              case 'prospect-enrichment':
                // Handle individual prospect updates
                console.log(`[Step 3] Prospect update: ${data.prospectId} - ${data.status}`);

                // Update specific prospect in the list
                setProspects(prev =>
                  prev.map(p => {
                    if (p.id.toString() === data.prospectId || `csv-${p.id - 1}` === data.prospectId) {
                      return {
                        ...p,
                        status: data.isDuplicate ? 'skipped' :
                          data.status === 'duplicate_found' ? 'skipped' :
                            data.status === 'completed' ? 'completed' :
                              data.status === 'error' ? 'failed' : p.status,
                        progress: data.progress || p.progress,
                        enrichedData: data.enrichmentData || p.enrichedData,
                        errors: data.error ? [data.error] : p.errors,
                        completedAt: data.status === 'completed' ? new Date().toISOString() : p.completedAt
                      } as ProspectData;
                    }
                    return p;
                  })
                );

                // Update job status counters
                setJobStatus(prev => {
                  if (!prev) return prev;

                  const updatedStatus = { ...prev };

                  if (data.status === 'completed' || data.status === 'duplicate_skipped') {
                    updatedStatus.completedProspects = (prev.completedProspects || 0) + 1;
                  } else if (data.status === 'error') {
                    updatedStatus.failedProspects = (prev.failedProspects || 0) + 1;
                  }

                  const processed = (updatedStatus.completedProspects || 0) + (updatedStatus.failedProspects || 0);
                  // Cap progress at 100% to fix the 150% issue
                  updatedStatus.progress = Math.min(100, prev.totalProspects > 0 ? Math.round((processed / prev.totalProspects) * 100) : 0);

                  // TEMPORARY FIX: Auto-transition to Step 4 when progress >= 100%
                  if (updatedStatus.progress >= 100 && processed >= prev.totalProspects) {
                    console.log('[Step 3] Progress reached 100%, auto-transitioning to Step 4');

                    const completeStepData = {
                      enrichmentResults: {
                        id: prev.id,
                        status: 'completed',
                        totalProspects: prev.totalProspects,
                        completedProspects: updatedStatus.completedProspects || 0,
                        failedProspects: updatedStatus.failedProspects || 0,
                        prospects: prospects,
                        progress: 100,
                        message: 'Enrichment completed successfully'
                      },
                      enrichmentSettings: {
                        concurrency: concurrency[0],
                        retryAttempts: retryAttempts[0],
                        websitePages: websitePages[0],
                        selectedModel: enrichmentConfig?.selectedModel
                      },
                      ...stepData
                    };

                    setTimeout(() => {
                      onStepComplete?.(completeStepData);
                    }, 1000); // Small delay to ensure UI updates
                  }

                  return updatedStatus;
                });
                break;

              case 'batch-progress':
                // Handle batch progress updates
                console.log('[Step 3] Batch progress:', data.progress);
                setJobStatus(prev => ({
                  ...prev,
                  progress: Math.min(100, data.progress || 0),
                  processedProspects: data.processed,
                  totalProspects: data.total,
                  failedProspects: data.failed,
                  status: data.status
                } as EnrichmentJobStatus));
                break;

              case 'connected':
                console.log('[Step 3] SSE connection established successfully');
                break;

              case 'heartbeat':
                // Ignore heartbeat messages
                break;

              default:
                console.log('[Step 3] Unknown SSE event type:', data.type);
                break;
            }
          } catch (parseError) {
            console.error('Error parsing SSE data:', parseError, event.data);
          }
        },
        error => {
          console.error('SSE connection error:', error);
          // Don't show error immediately, try to reconnect silently
          setTimeout(() => {
            if (jobStatus?.id) {
              setupSSEConnection(jobStatus.id);
            }
          }, 3000);
        }
      );

      // Add a polling fallback to check job status periodically
      const pollInterval = setInterval(async () => {
        if (!jobStatus?.id) return;

        try {
          // Check if all prospects are completed by polling the prospects endpoint
          const response = await fetch(`/api/prospects?campaignId=${campaignId || stepData?.campaignData?.campaignId}&limit=100`);
          if (response.ok) {
            const data = await response.json();
            const allProspects = data.prospects || [];

            if (allProspects.length > 0) {
              const enrichedCount = allProspects.filter((p: any) => p.status === 'ENRICHED' || p.status === 'COMPLETED').length;
              const failedCount = allProspects.filter((p: any) => p.status === 'FAILED').length;
              const totalCount = allProspects.length;

              // Check if all prospects are done (enriched or failed)
              if (enrichedCount + failedCount >= totalCount && totalCount > 0) {
                console.log('[Step 3] Polling detected completion:', { enrichedCount, failedCount, totalCount });

                // Clear the polling interval
                clearInterval(pollInterval);

                // Prepare completion data
                const jobResult = {
                  id: jobStatus.id,
                  status: failedCount === 0 ? 'completed' : 'completed_with_errors',
                  totalProspects: totalCount,
                  completedProspects: enrichedCount,
                  failedProspects: failedCount,
                  prospects: allProspects,
                  progress: 100,
                  message: failedCount === 0 ? 'Enrichment completed successfully' : 'Enrichment completed with some errors'
                };

                setJobStatus(prev => {
                  if (!prev) return null;
                  return {
                    ...prev,
                    status: jobResult.status as any,
                    totalProspects: totalCount,
                    processedProspects: enrichedCount + failedCount,
                    completedProspects: enrichedCount,
                    failedProspects: failedCount,
                    progress: 100,
                    metrics: prev.metrics || {
                      averageProcessingTime: 0,
                      successRate: totalCount > 0 ? (enrichedCount / totalCount * 100) : 0,
                      enrichmentQuality: 0,
                      costPerProspect: 0.12,
                      totalCost: totalCount * 0.12,
                    }
                  };
                });

                // Update prospects list
                setProspects(allProspects.map((p: any) => ({
                  id: p.id,
                  name: p.name,
                  email: p.email,
                  company: p.company,
                  position: p.position,
                  status: p.status === 'ENRICHED' ? 'completed' : p.status === 'FAILED' ? 'failed' : 'pending',
                  progress: p.status === 'ENRICHED' || p.status === 'FAILED' ? 100 : 0,
                  enrichedData: p.enrichment ? {
                    linkedinSummary: p.enrichment.linkedinSummary,
                    companySummary: p.enrichment.companySummary,
                    techStack: p.enrichment.techStackData,
                    prospectAnalysisSummary: p.enrichment.prospectAnalysisSummary
                  } : undefined,
                  errors: [],
                  retryCount: 0,
                  completedAt: p.updatedAt
                })));

                // Prepare complete data package for Step 4
                const completeStepData = {
                  enrichmentResults: jobResult,
                  enrichmentSettings: {
                    concurrency: concurrency[0],
                    retryAttempts: retryAttempts[0],
                    websitePages: websitePages[0],
                    selectedModel: enrichmentConfig?.selectedModel
                  },
                  ...stepData
                };

                console.log(`[Step 3] Polling-based completion - proceeding to Step 4`);

                // Show success message and update UI
                setError(null);
                setIsLoading(false);

                // Auto-proceed to Step 4 after a brief delay to show completion
                setTimeout(() => {
                  onStepComplete?.(completeStepData);
                }, 1500);
              }
            }
          }
        } catch (error) {
          console.error('[Step 3] Polling error:', error);
        }
      }, 5000); // Poll every 5 seconds

      // Store the cleanup function for polling
      const cleanupPolling = () => {
        clearInterval(pollInterval);
      };

      // Store cleanup function for later use
      if (eventSourceRef.current) {
        const originalClose = eventSourceRef.current.close;
        eventSourceRef.current.close = () => {
          originalClose.call(eventSourceRef.current);
          cleanupPolling();
        };
      }

    } catch (err) {
      console.error('Failed to setup SSE connection:', err);
      setError('Failed to establish real-time connection');
    }
  };

  const pauseEnrichment = async () => {
    if (!jobStatus?.id) return;

    try {
      await ProspectEnrichmentService.controlEnrichmentJob(
        jobStatus.id,
        'pause'
      );
      console.log('⏸️ Paused enrichment job');
    } catch (err) {
      console.error('Failed to pause job:', err);
      setError('Failed to pause enrichment');
    }
  };

  const resumeEnrichment = async () => {
    if (!jobStatus?.id) return;

    try {
      await ProspectEnrichmentService.controlEnrichmentJob(
        jobStatus.id,
        'resume'
      );
      console.log('▶️ Resumed enrichment job');
    } catch (err) {
      console.error('Failed to resume job:', err);
      setError('Failed to resume enrichment');
    }
  };

  const cancelEnrichment = async () => {
    if (!jobStatus?.id) return;

    try {
      await ProspectEnrichmentService.controlEnrichmentJob(
        jobStatus.id,
        'cancel'
      );
      console.log('⏹️ Cancelled enrichment job');

      // Close SSE connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    } catch (err) {
      console.error('Failed to cancel job:', err);
      setError('Failed to cancel enrichment');
    }
  };

  const retryFailedProspects = async () => {
    if (!jobStatus?.id) return;

    const failedProspects = prospects.filter(p => p.status === 'failed');
    if (failedProspects.length === 0) {
      setError('No failed prospects to retry');
      return;
    }

    try {
      await ProspectEnrichmentService.controlEnrichmentJob(
        jobStatus.id,
        'retry'
      );
      console.log(`🔄 Retrying ${failedProspects.length} failed prospects`);
    } catch (err) {
      console.error('Failed to retry prospects:', err);
      setError('Failed to retry failed prospects');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'completed_with_errors':
        return 'text-yellow-600';
      case 'running':
      case 'processing':
        return 'text-blue-600';
      case 'paused':
        return 'text-yellow-600';
      case 'failed':
      case 'cancelled':
        return 'text-red-600';
      case 'skipped':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className='h-4 w-4' />;
      case 'completed_with_errors':
        return <AlertTriangle className='h-4 w-4' />;
      case 'running':
      case 'processing':
        return <Activity className='h-4 w-4 animate-pulse' />;
      case 'paused':
        return <Pause className='h-4 w-4' />;
      case 'failed':
        return <XCircle className='h-4 w-4' />;
      case 'cancelled':
        return <Square className='h-4 w-4' />;
      case 'retrying':
        return <RefreshCw className='h-4 w-4 animate-spin' />;
      case 'skipped':
        return <AlertTriangle className='h-4 w-4' />;
      default:
        return <Clock className='h-4 w-4' />;
    }
  };

  const renderJobOverview = () => (
    <div className='space-y-6'>
      {/* Status Cards */}
      <div className='grid gap-4 md:grid-cols-4'>
        <Card>
          <CardContent className='p-4'>
            <div className='flex items-center gap-3'>
              <div className='flex items-center justify-center w-10 h-10 bg-blue-100 text-blue-600 rounded-lg'>
                <Users className='h-5 w-5' />
              </div>
              <div>
                <div className='text-2xl font-bold'>
                  {jobStatus?.totalProspects || prospectCount}
                </div>
                <div className='text-sm text-muted-foreground'>
                  Total Prospects
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className='p-4'>
            <div className='flex items-center gap-3'>
              <div className='flex items-center justify-center w-10 h-10 bg-green-100 text-green-600 rounded-lg'>
                <CheckCircle className='h-5 w-5' />
              </div>
              <div>
                <div className='text-2xl font-bold'>
                  {jobStatus?.completedProspects || 0}
                </div>
                <div className='text-sm text-muted-foreground'>Completed</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className='p-4'>
            <div className='flex items-center gap-3'>
              <div className='flex items-center justify-center w-10 h-10 bg-red-100 text-red-600 rounded-lg'>
                <AlertCircle className='h-5 w-5' />
              </div>
              <div>
                <div className='text-2xl font-bold'>
                  {jobStatus?.failedProspects || 0}
                </div>
                <div className='text-sm text-muted-foreground'>Failed</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className='p-4'>
            <div className='flex items-center gap-3'>
              <div className='flex items-center justify-center w-10 h-10 bg-purple-100 text-purple-600 rounded-lg'>
                <TrendingUp className='h-5 w-5' />
              </div>
              <div>
                <div className='text-2xl font-bold'>
                  {jobStatus?.processingRate?.toFixed(0) || '0'}
                </div>
                <div className='text-sm text-muted-foreground'>Per Minute</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Section */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Activity className='h-5 w-5' />
            Enrichment Progress
            {jobStatus?.status === 'running' && (
              <Badge variant='outline' className='text-green-600 ml-2'>
                <div className='w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse'></div>
                Live Updates
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Real-time progress of prospect enrichment processing
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='space-y-2'>
            <div className='flex justify-between text-sm'>
              <span>Overall Progress</span>
              <span>{jobStatus?.progress || 0}%</span>
            </div>
            <Progress value={jobStatus?.progress || 0} className='h-3' />
          </div>

          <div className='grid gap-4 md:grid-cols-2'>
            <div className='space-y-2'>
              <div className='flex justify-between text-sm'>
                <span>Processed</span>
                <span>
                  {jobStatus?.processedProspects || 0} of{' '}
                  {jobStatus?.totalProspects || prospectCount}
                </span>
              </div>
              <Progress
                value={
                  jobStatus && jobStatus.totalProspects > 0
                    ? (jobStatus.processedProspects /
                      jobStatus.totalProspects) *
                    100
                    : 0
                }
                className='h-2'
              />
            </div>
            <div className='space-y-2'>
              <div className='flex justify-between text-sm'>
                <span>Success Rate</span>
                <span>
                  {jobStatus?.processedProspects
                    ? Math.floor(
                      (jobStatus.completedProspects /
                        jobStatus.processedProspects) *
                      100
                    )
                    : 0}
                  %
                </span>
              </div>
              <Progress
                value={
                  jobStatus?.processedProspects
                    ? (jobStatus.completedProspects /
                      jobStatus.processedProspects) *
                    100
                    : 0
                }
                className='h-2'
              />
            </div>
          </div>

          {/* Timing Information */}
          {jobStatus?.startedAt && (
            <div className='grid gap-4 md:grid-cols-2 pt-4 border-t text-sm'>
              <div className='flex items-center gap-2'>
                <Timer className='h-4 w-4 text-blue-600' />
                <span className='text-muted-foreground'>Started:</span>
                <span>
                  {new Date(jobStatus.startedAt).toLocaleTimeString()}
                </span>
              </div>
              {jobStatus.estimatedCompletion &&
                jobStatus.status === 'running' && (
                  <div className='flex items-center gap-2'>
                    <Clock className='h-4 w-4 text-orange-600' />
                    <span className='text-muted-foreground'>
                      Est. Completion:
                    </span>
                    <span>
                      {new Date(
                        jobStatus.estimatedCompletion
                      ).toLocaleTimeString()}
                    </span>
                  </div>
                )}
            </div>
          )}

          {/* Status and Controls */}
          <div className='flex items-center justify-between pt-4 border-t'>
            <div className='flex items-center gap-3'>
              <div
                className={`flex items-center gap-2 ${getStatusColor(jobStatus?.status || 'pending')}`}
              >
                {getStatusIcon(jobStatus?.status || 'pending')}
                <span className='font-medium capitalize'>
                  {jobStatus?.status || 'Not Started'}
                </span>
              </div>
            </div>

            <div className='flex gap-2'>
              {!isStarted && (
                <Button
                  onClick={startEnrichment}
                  disabled={
                    disabled ||
                    isLoading ||
                    (prospects.length === 0 && prospectCount === 0)
                  }
                  className='gap-2'
                  size='lg'
                >
                  {isLoading ? (
                    <Loader2 className='h-4 w-4 animate-spin' />
                  ) : (
                    <Play className='h-4 w-4' />
                  )}
                  Start Enrichment
                </Button>
              )}

              {isStarted && jobStatus?.status === 'running' && (
                <Button
                  variant='outline'
                  onClick={pauseEnrichment}
                  className='gap-2'
                >
                  <Pause className='h-4 w-4' />
                  Pause
                </Button>
              )}

              {isStarted && jobStatus?.status === 'paused' && (
                <Button onClick={resumeEnrichment} className='gap-2'>
                  <Play className='h-4 w-4' />
                  Resume
                </Button>
              )}

              {isStarted &&
                ['running', 'paused'].includes(jobStatus?.status || '') && (
                  <Button
                    variant='destructive'
                    onClick={cancelEnrichment}
                    className='gap-2'
                  >
                    <Square className='h-4 w-4' />
                    Cancel
                  </Button>
                )}

              {jobStatus?.failedProspects && jobStatus.failedProspects > 0 && (
                <Button
                  variant='outline'
                  onClick={retryFailedProspects}
                  className='gap-2'
                >
                  <RefreshCw className='h-4 w-4' />
                  Retry Failed ({jobStatus.failedProspects})
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics */}
      {jobStatus?.metrics && (
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <BarChart3 className='h-5 w-5' />
              Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
              <div className='space-y-1'>
                <div className='text-sm text-muted-foreground'>
                  Avg Processing Time
                </div>
                <div className='text-2xl font-bold'>
                  {jobStatus.metrics?.averageProcessingTime?.toFixed(1) ||
                    '0.0'}
                  s
                </div>
              </div>
              <div className='space-y-1'>
                <div className='text-sm text-muted-foreground'>
                  Success Rate
                </div>
                <div className='text-2xl font-bold text-green-600'>
                  {jobStatus.metrics?.successRate || '0'}%
                </div>
              </div>
              <div className='space-y-1'>
                <div className='text-sm text-muted-foreground'>
                  Quality Score
                </div>
                <div className='text-2xl font-bold text-blue-600'>
                  {jobStatus.metrics?.enrichmentQuality || '0'}%
                </div>
              </div>
              <div className='space-y-1'>
                <div className='text-sm text-muted-foreground'>Total Cost</div>
                <div className='text-2xl font-bold text-purple-600'>
                  ${jobStatus.metrics?.totalCost?.toFixed(2) || '0.00'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderProspectDetails = () => (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <h3 className='text-lg font-semibold'>Prospect Details</h3>
        <div className='text-sm text-muted-foreground'>
          Showing {prospects.length} prospects
        </div>
      </div>

      <div className='space-y-2'>
        {prospects.map(prospect => (
          <Card key={prospect.id} className='p-4'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-4'>
                <div
                  className={`flex items-center gap-2 ${getStatusColor(prospect.status)}`}
                >
                  {getStatusIcon(prospect.status)}
                </div>
                <div>
                  <div className='font-medium'>{prospect.name}</div>
                  <div className='text-sm text-muted-foreground'>
                    {prospect.position} at {prospect.company}
                  </div>
                  <div className='text-xs text-muted-foreground'>
                    {prospect.email}
                  </div>
                </div>
              </div>

              <div className='flex items-center gap-4'>
                <Badge variant='outline'>{prospect.progress}% Complete</Badge>

                {prospect.enrichedData && (
                  <div className='flex gap-1'>
                    {prospect.enrichedData.linkedinSummary && (
                      <Badge variant='secondary' className='text-xs'>
                        LinkedIn ✓
                      </Badge>
                    )}
                    {prospect.enrichedData.companySummary && (
                      <Badge variant='secondary' className='text-xs'>
                        Company ✓
                      </Badge>
                    )}
                    {prospect.enrichedData.techStack && (
                      <Badge variant='secondary' className='text-xs'>
                        TechStack ✓
                      </Badge>
                    )}
                    {prospect.enrichedData.prospectAnalysisSummary && (
                      <Badge variant='secondary' className='text-xs'>
                        Analysis ✓
                      </Badge>
                    )}
                  </div>
                )}

                <div className='w-20'>
                  <Progress value={prospect.progress} className='h-2' />
                </div>

                <div className='text-right text-sm'>
                  <div
                    className={`font-medium ${getStatusColor(prospect.status)}`}
                  >
                    {prospect.status.charAt(0).toUpperCase() +
                      prospect.status.slice(1)}
                  </div>
                  {prospect.processingTime && (
                    <div className='text-xs text-muted-foreground'>
                      {(prospect.processingTime / 1000).toFixed(1)}s
                    </div>
                  )}
                </div>
              </div>
            </div>

            {prospect.errors && prospect.errors.length > 0 && (
              <div className='mt-2 pt-2 border-t'>
                <div className='text-sm text-red-600'>
                  Errors: {prospect.errors.join(', ')}
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );

  const renderErrors = () => (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <h3 className='text-lg font-semibold'>Errors & Issues</h3>
        <Badge variant='destructive' className='text-sm'>
          {jobStatus?.errors?.length || 0} total errors
        </Badge>
      </div>

      {(jobStatus?.errors?.length || 0) === 0 ? (
        <Card className='p-8 text-center'>
          <CheckCircle className='h-12 w-12 mx-auto text-green-500 mb-4' />
          <h3 className='font-semibold mb-2'>No Errors</h3>
          <p className='text-sm text-muted-foreground'>
            Enrichment is running smoothly without any errors.
          </p>
        </Card>
      ) : (
        <div className='space-y-2'>
          {jobStatus?.errors.map(error => (
            <Alert
              key={error.id}
              variant={error.severity === 'error' ? 'destructive' : 'default'}
            >
              {error.severity === 'error' ? (
                <AlertCircle className='h-4 w-4' />
              ) : (
                <AlertTriangle className='h-4 w-4' />
              )}
              <AlertDescription>
                <div className='flex justify-between items-start'>
                  <div>
                    <div className='font-medium'>{error.message}</div>
                    {error.prospectId && (
                      <div className='text-sm text-muted-foreground'>
                        Prospect: {error.prospectId}
                      </div>
                    )}
                  </div>
                  <div className='text-xs text-muted-foreground'>
                    {new Date(error.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}
    </div>
  );

  const renderSettings = () => (
    <div className='space-y-6'>
      <div>
        <h3 className='text-lg font-semibold mb-4'>Processing Configuration</h3>
        <div className='space-y-6'>
          <div className='space-y-2'>
            <Label htmlFor='concurrency'>
              Concurrency: {concurrency[0]} parallel requests
            </Label>
            <Slider
              id='concurrency'
              min={1}
              max={10}
              step={1}
              value={concurrency}
              onValueChange={setConcurrency}
              className='w-full'
              disabled={isStarted}
            />
            <p className='text-sm text-muted-foreground'>
              Number of prospects to enrich simultaneously. Higher concurrency
              increases speed but may hit rate limits.
            </p>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='retry-attempts'>
              LLM API Retry Limit: {retryAttempts[0]}
            </Label>
            <Slider
              id='retry-attempts'
              min={0}
              max={5}
              step={1}
              value={retryAttempts}
              onValueChange={setRetryAttempts}
              className='w-full'
              disabled={isStarted}
            />
            <p className='text-sm text-muted-foreground'>
              Number of times to retry failed LLM API calls before marking
              as failed.
            </p>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='website-pages'>
              Website Pages to Scrape: {websitePages[0]}
            </Label>
            <Slider
              id='website-pages'
              min={1}
              max={10}
              step={1}
              value={websitePages}
              onValueChange={setWebsitePages}
              className='w-full'
              disabled={isStarted}
            />
            <p className='text-sm text-muted-foreground'>
              Maximum number of pages to scrape from each company website.
            </p>
          </div>
        </div>
      </div>

      {isStarted && (
        <Alert>
          <AlertCircle className='h-4 w-4' />
          <AlertDescription>
            Configuration changes cannot be applied to a running job. Cancel the
            current job or wait for completion to modify settings.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );

  // Render the initial view before enrichment starts
  const renderInitialView = () => (
    <div className='max-w-6xl mx-auto space-y-6'>
      {/* Page Title */}
      <div className='text-center space-y-2'>
        <h2 className='text-2xl font-bold text-gray-900'>Prospect Enrichment</h2>
        <p className='text-gray-600'>Configure and start the enrichment process for {prospectCount} prospects</p>
      </div>

      {/* Enrichment Settings Section */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Enrichment Settings
          </CardTitle>
          <CardDescription>
            Configure how the enrichment process will run
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label>Parallel Processing (1-5)</Label>
              <Slider
                value={concurrency}
                onValueChange={setConcurrency}
                max={5}
                min={1}
                step={1}
              />
              <p className="text-sm text-muted-foreground">
                Current: {concurrency[0]} parallel processes
              </p>
            </div>
            <div className="space-y-2">
              <Label>LLM API Retry Limit (0-3)</Label>
              <Slider
                value={retryAttempts}
                onValueChange={setRetryAttempts}
                max={3}
                min={0}
                step={1}
              />
              <p className="text-sm text-muted-foreground">
                Current: {retryAttempts[0]} retries
              </p>
            </div>
            <div className="space-y-2">
              <Label>Website Pages to Scrape (1-10)</Label>
              <Slider
                value={websitePages}
                onValueChange={setWebsitePages}
                max={10}
                min={1}
                step={1}
              />
              <p className="text-sm text-muted-foreground">
                Current: {websitePages[0]} pages
              </p>
            </div>
          </div>

          {/* Start Enrichment Button - Bottom Right */}
          <div className="flex justify-end pt-4">
            <Button
              onClick={startEnrichment}
              disabled={disabled || isLoading}
              className="flex items-center gap-2"
              size="lg"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Start Enrichment
            </Button>
          </div>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // Render the progress view after enrichment starts
  const renderProgressView = () => (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Enrichment Progress</CardTitle>
        <CardDescription>
          Real-time progress of prospect enrichment processing
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={selectedTab} onValueChange={(value: any) => setSelectedTab(value)}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="prospects">Prospects</TabsTrigger>
            <TabsTrigger value="errors">Errors</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          <TabsContent value="overview">{renderJobOverview()}</TabsContent>
          <TabsContent value="prospects">{renderProspectDetails()}</TabsContent>
          <TabsContent value="errors">{renderErrors()}</TabsContent>
          <TabsContent value="settings">{renderSettings()}</TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );

  const renderErrorView = () => (
    <div className='space-y-6'>
      <div className='bg-red-50 border border-red-200 rounded-lg p-6'>
        <div className='flex items-start gap-3'>
          <AlertCircle className='h-6 w-6 text-red-500 flex-shrink-0 mt-0.5' />
          <div className='flex-1'>
            <h3 className='text-lg font-semibold text-red-800 mb-3'>
              Enrichment Job Failed
            </h3>
            <div className='prose prose-sm max-w-none text-red-700'>
              <ReactMarkdown>{extractDetailedErrorMessage(error)}</ReactMarkdown>
            </div>
          </div>
        </div>
      </div>

      <div className='flex gap-3'>
        <Button
          onClick={() => {
            setError(null);
            setIsStarted(false);
            window.history.back(); // Go back to previous step
          }}
          variant='outline'
          className='flex items-center gap-2'
        >
          <ArrowLeft className='h-4 w-4' />
          Go Back to Step 1
        </Button>

        <Button
          onClick={async () => {
            setError(null);
            setIsStarted(false);
            // Try to load existing prospects for this campaign
            try {
              const existingProspects = await ProspectEnrichmentService.getProspects(
                campaignId,
                undefined
              );
              if (existingProspects.length > 0) {
                setProspects(existingProspects);
                console.log('[Step 3] Loaded', existingProspects.length, 'existing prospects');
              }
            } catch (err) {
              console.warn('Could not load existing prospects:', err);
            }
          }}
          variant='default'
          className='flex items-center gap-2'
          disabled={!campaignId}
        >
          <Users className='h-4 w-4' />
          Try with Existing Prospects
        </Button>

        <Button
          onClick={() => {
            setError(null);
            setIsStarted(false);
          }}
          variant='secondary'
        >
          Try Again
        </Button>
      </div>
    </div>
  );

  if (prospectCount <= 0) {
    return (
      <div className='max-w-4xl mx-auto space-y-6'>
        <Alert variant='destructive'>
          <AlertCircle className='h-4 w-4' />
          <AlertDescription>
            No prospects found to enrich. Please return to previous steps and
            upload prospect data.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Show error view if there's a critical error that prevents enrichment
  if (error && (
    error.includes('duplicate') ||
    error.includes('already exist') ||
    error.includes('No new prospects were created') ||
    error.includes('No prospects found to enrich')
  )) {
    return renderErrorView();
  }

  return isStarted ? renderProgressView() : renderInitialView();
}

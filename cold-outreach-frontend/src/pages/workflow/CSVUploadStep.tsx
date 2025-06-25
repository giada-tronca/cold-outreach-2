import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Upload, CheckCircle, AlertCircle, Eye, Loader2 } from 'lucide-react';
import FileUpload from '@/components/forms/FileUpload';

interface CSVPreviewData {
  headers: string[];
  rows: string[][];
  totalRows: number;
  validRows: number;
  invalidRows: number;
  requiredColumns: {
    name: string;
    found: boolean;
    mapping: string | null;
  }[];
}

interface UploadProgress {
  uploadId: string;
  filename: string;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  message?: string;
  createdAt: string;
}

interface ValidationError {
  row: number;
  column: string;
  value: string;
  error: string;
  severity: 'error' | 'warning';
}

interface CSVUploadStepProps {
  workflowSessionId?: string;
  onStepComplete?: (data: any) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
}

export default function CSVUploadStep({
  workflowSessionId,
  onStepComplete,
  onError,
  disabled = false,
}: CSVUploadStepProps) {
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(
    null
  );
  const [csvPreview, setCsvPreview] = useState<CSVPreviewData | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>(
    []
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [stepStatus, setStepStatus] = useState<
    'idle' | 'uploading' | 'validating' | 'completed' | 'error'
  >('idle');

  // Start the CSV upload step when component mounts
  useEffect(() => {
    if (workflowSessionId) {
      handleStepStart();
    }
  }, [workflowSessionId]);

  const handleStepStart = async () => {
    if (!workflowSessionId) return;

    try {
      const response = await fetch(
        `/api/workflow/sessions/${workflowSessionId}/steps/UPLOAD_CSV/start`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to start upload step');
      }
    } catch (error) {
      console.error('Failed to start upload step:', error);
      onError?.(
        error instanceof Error ? error.message : 'Failed to start upload step'
      );
    }
  };

  const handleUploadComplete = useCallback(
    async (result: any) => {
      setUploadProgress({
        uploadId: result.uploadId,
        filename: result.filename,
        progress: 100,
        status: 'processing',
        message: 'Processing CSV file...',
        createdAt: new Date().toISOString(),
      });

      setStepStatus('validating');
      setIsProcessing(true);

      try {
        // Fetch CSV preview and validation
        await fetchCSVPreview(result.uploadId);

        // Update workflow session with upload info
        if (workflowSessionId) {
          await updateWorkflowSession(result);
        }

        setStepStatus('completed');
      } catch (error) {
        setStepStatus('error');
        onError?.(
          error instanceof Error ? error.message : 'Failed to process CSV'
        );
      } finally {
        setIsProcessing(false);
      }
    },
    [workflowSessionId, onError]
  );

  const handleUploadProgress = useCallback((progress: UploadProgress) => {
    setUploadProgress(progress);

    if (progress.status === 'uploading') {
      setStepStatus('uploading');
    }
  }, []);

  const handleUploadError = useCallback(
    (error: string) => {
      setStepStatus('error');
      onError?.(error);
    },
    [onError]
  );

  const fetchCSVPreview = async (uploadId: string) => {
    try {
      const response = await fetch(`/api/uploads/${uploadId}/preview`);
      const data = await response.json();

      if (data.success) {
        setCsvPreview(data.data.preview);
        setValidationErrors(data.data.validation?.errors || []);
        setShowPreview(true);
      } else {
        throw new Error(data.message || 'Failed to fetch CSV preview');
      }
    } catch (error) {
      console.error('Failed to fetch CSV preview:', error);
      throw error;
    }
  };

  const updateWorkflowSession = async (uploadResult: any) => {
    if (!workflowSessionId) return;

    try {
      const response = await fetch(
        `/api/workflow/sessions/${workflowSessionId}/step`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            step: 'UPLOAD_CSV',
            data: {
              uploadId: uploadResult.uploadId,
              filename: uploadResult.filename,
              fileSize: uploadResult.fileSize,
              rowCount: csvPreview?.totalRows || 0,
              validRows: csvPreview?.validRows || 0,
              invalidRows: csvPreview?.invalidRows || 0,
            },
          }),
        }
      );

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to update workflow session');
      }
    } catch (error) {
      console.error('Failed to update workflow session:', error);
      throw error;
    }
  };

  const handleCompleteStep = async () => {
    if (!workflowSessionId || !uploadProgress) return;

    try {
      const response = await fetch(
        `/api/workflow/sessions/${workflowSessionId}/steps/UPLOAD_CSV/complete`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            data: {
              uploadId: uploadProgress.uploadId,
              filename: uploadProgress.filename,
              preview: csvPreview,
              validationErrors: validationErrors,
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
    }
  };

  const getStepStatusBadge = () => {
    switch (stepStatus) {
      case 'uploading':
        return (
          <Badge variant='secondary' className='animate-pulse'>
            Uploading
          </Badge>
        );
      case 'validating':
        return (
          <Badge variant='secondary' className='animate-pulse'>
            Validating
          </Badge>
        );
      case 'completed':
        return <Badge variant='default'>Ready</Badge>;
      case 'error':
        return <Badge variant='destructive'>Error</Badge>;
      default:
        return <Badge variant='outline'>Waiting for file</Badge>;
    }
  };

  const renderUploadZone = () => (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <Upload className='h-5 w-5' />
          Upload Prospect Data
          {getStepStatusBadge()}
        </CardTitle>
        <CardDescription>
          Upload a CSV file containing your prospect information. The file will
          be validated and previewed before processing.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FileUpload
          onUploadComplete={handleUploadComplete}
          onUploadProgress={handleUploadProgress}
          onUploadError={handleUploadError}
          maxFiles={1}
          acceptedFileTypes={['text/csv', 'application/vnd.ms-excel']}
          disabled={
            disabled ||
            stepStatus === 'uploading' ||
            stepStatus === 'validating'
          }
        />
      </CardContent>
    </Card>
  );

  const renderValidationSummary = () => {
    if (!csvPreview) return null;

    const errorCount = validationErrors.filter(
      e => e.severity === 'error'
    ).length;
    const warningCount = validationErrors.filter(
      e => e.severity === 'warning'
    ).length;

    return (
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <CheckCircle className='h-5 w-5 text-green-500' />
            Validation Summary
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
            <div className='text-center space-y-1'>
              <div className='text-2xl font-bold text-blue-600'>
                {csvPreview.totalRows}
              </div>
              <div className='text-sm text-muted-foreground'>Total Rows</div>
            </div>
            <div className='text-center space-y-1'>
              <div className='text-2xl font-bold text-green-600'>
                {csvPreview.validRows}
              </div>
              <div className='text-sm text-muted-foreground'>Valid Rows</div>
            </div>
            <div className='text-center space-y-1'>
              <div className='text-2xl font-bold text-red-600'>
                {errorCount}
              </div>
              <div className='text-sm text-muted-foreground'>Errors</div>
            </div>
            <div className='text-center space-y-1'>
              <div className='text-2xl font-bold text-yellow-600'>
                {warningCount}
              </div>
              <div className='text-sm text-muted-foreground'>Warnings</div>
            </div>
          </div>

          {/* Required Columns Check */}
          <div className='space-y-2'>
            <h4 className='font-medium'>Required Columns</h4>
            <div className='grid gap-2 md:grid-cols-2'>
              {csvPreview.requiredColumns.map((col, index) => (
                <div
                  key={index}
                  className='flex items-center gap-2 p-2 bg-muted rounded'
                >
                  {col.found ? (
                    <CheckCircle className='h-4 w-4 text-green-500' />
                  ) : (
                    <AlertCircle className='h-4 w-4 text-red-500' />
                  )}
                  <span className='text-sm'>
                    {col.name} {col.mapping && `(found as: ${col.mapping})`}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className='space-y-2'>
              <h4 className='font-medium'>Validation Issues</h4>
              <div className='space-y-1 max-h-32 overflow-y-auto'>
                {validationErrors.slice(0, 10).map((error, index) => (
                  <Alert
                    key={index}
                    variant={
                      error.severity === 'error' ? 'destructive' : 'default'
                    }
                  >
                    <AlertCircle className='h-4 w-4' />
                    <AlertDescription className='text-xs'>
                      Row {error.row}, Column "{error.column}": {error.error}
                      {error.value && ` (Value: "${error.value}")`}
                    </AlertDescription>
                  </Alert>
                ))}
                {validationErrors.length > 10 && (
                  <p className='text-xs text-muted-foreground'>
                    And {validationErrors.length - 10} more issues...
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderCSVPreview = () => {
    if (!csvPreview || !showPreview) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Eye className='h-5 w-5' />
            CSV Preview
          </CardTitle>
          <CardDescription>
            Preview of the first 5 rows from your uploaded CSV file
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='overflow-x-auto'>
            <table className='w-full text-sm border-collapse border border-gray-200 dark:border-gray-700'>
              <thead>
                <tr className='bg-muted'>
                  {csvPreview.headers.map((header, index) => (
                    <th
                      key={index}
                      className='border border-gray-200 dark:border-gray-700 p-2 text-left font-medium'
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {csvPreview.rows.slice(0, 5).map((row, rowIndex) => (
                  <tr key={rowIndex} className='hover:bg-muted/50'>
                    {row.map((cell, cellIndex) => (
                      <td
                        key={cellIndex}
                        className='border border-gray-200 dark:border-gray-700 p-2 max-w-32 truncate'
                      >
                        {cell || '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {csvPreview.totalRows > 5 && (
            <p className='text-xs text-muted-foreground mt-2'>
              Showing 5 of {csvPreview.totalRows} total rows
            </p>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderProgressIndicator = () => {
    if (!uploadProgress || !isProcessing) return null;

    return (
      <Card>
        <CardContent className='p-4'>
          <div className='flex items-center gap-3'>
            <Loader2 className='h-5 w-5 animate-spin text-blue-500' />
            <div className='flex-1'>
              <div className='flex items-center justify-between mb-1'>
                <span className='text-sm font-medium'>
                  {uploadProgress.message}
                </span>
                <span className='text-sm text-muted-foreground'>
                  {uploadProgress.progress}%
                </span>
              </div>
              <Progress value={uploadProgress.progress} className='h-2' />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const canCompleteStep = () => {
    return (
      stepStatus === 'completed' &&
      csvPreview &&
      csvPreview.validRows > 0 &&
      validationErrors.filter(e => e.severity === 'error').length === 0
    );
  };

  return (
    <div className='space-y-6'>
      {/* Upload Zone */}
      {stepStatus === 'idle' && renderUploadZone()}

      {/* Progress Indicator */}
      {renderProgressIndicator()}

      {/* Validation Summary */}
      {csvPreview && renderValidationSummary()}

      {/* CSV Preview */}
      {renderCSVPreview()}

      {/* Step Completion */}
      {stepStatus === 'completed' && (
        <Card>
          <CardContent className='p-6 text-center space-y-4'>
            <div className='flex items-center justify-center w-16 h-16 mx-auto bg-green-100 text-green-600 rounded-full'>
              <CheckCircle className='h-8 w-8' />
            </div>
            <div>
              <h3 className='text-lg font-semibold'>CSV Upload Complete!</h3>
              <p className='text-muted-foreground'>
                Your file has been validated and is ready for the next step
              </p>
            </div>
            <div className='flex gap-3 justify-center'>
              <Button
                variant='outline'
                onClick={() => setShowPreview(!showPreview)}
              >
                <Eye className='mr-2 h-4 w-4' />
                {showPreview ? 'Hide' : 'Show'} Preview
              </Button>
              <Button
                onClick={handleCompleteStep}
                disabled={!canCompleteStep()}
              >
                Continue to Campaign Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {stepStatus === 'error' && (
        <Alert variant='destructive'>
          <AlertCircle className='h-4 w-4' />
          <AlertDescription>
            There was an error processing your CSV file. Please try uploading
            again or contact support if the problem persists.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

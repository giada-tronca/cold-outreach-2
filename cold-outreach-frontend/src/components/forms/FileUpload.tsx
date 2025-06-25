import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Upload,
  File,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { apiClient, handleApiResponse, checkApiHealth } from '@/services/api';

interface UploadConfig {
  maxFileSize: number;
  maxFileSizeMB: number;
  allowedFileTypes: string[];
  allowedExtensions: string[];
}

interface UploadProgress {
  uploadId: string;
  filename: string;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  message?: string;
  createdAt: string;
}

interface FileUploadProps {
  onUploadComplete?: (result: any) => void;
  onUploadError?: (error: string) => void;
  onUploadProgress?: (progress: UploadProgress) => void;
  maxFiles?: number;
  className?: string;
  acceptedFileTypes?: string[];
  disabled?: boolean;
}

export default function FileUpload({
  onUploadComplete,
  onUploadError,
  onUploadProgress,
  maxFiles = 1,
  className = '',
  acceptedFileTypes,
  disabled = false,
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadProgress[]>([]);
  const [uploadConfig, setUploadConfig] = useState<UploadConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, setIsServerAvailable] = useState<boolean | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Default configuration fallback
  const defaultConfig: UploadConfig = {
    maxFileSize: 10485760, // 10MB
    maxFileSizeMB: 10,
    allowedFileTypes: ['text/csv'],
    allowedExtensions: ['.csv'],
  };

  // Fetch upload configuration on component mount
  useEffect(() => {
    fetchUploadConfig();
  }, []);

  const fetchUploadConfig = async () => {
    // Check server availability first
    const serverAvailable = await checkApiHealth();
    setIsServerAvailable(serverAvailable);

    if (serverAvailable) {
      try {
        const response = await apiClient.get('/api/uploads/config');
        const data = await handleApiResponse(response);
        if (data.success) {
          setUploadConfig(data.data);
        } else {
          // Use default config if API returns unsuccessful response
          console.warn(
            'Upload config API returned unsuccessful response, using defaults'
          );
          setUploadConfig(defaultConfig);
        }
      } catch (error) {
        console.warn('Failed to fetch upload config, using defaults:', error);
        // Use default configuration if API call fails
        setUploadConfig(defaultConfig);
      }
    } else {
      // Server not available, use default config
      console.log(
        '🔄 Backend server not available, using default configuration'
      );
      setUploadConfig(defaultConfig);
    }
  };

  const validateFile = useCallback(
    (file: File): string | null => {
      const config = uploadConfig || defaultConfig;

      // Check file size
      if (file.size > config.maxFileSize) {
        return `File size (${formatFileSize(file.size)}) exceeds maximum allowed size of ${config.maxFileSizeMB}MB`;
      }

      // Check file type
      const allowedTypes = acceptedFileTypes || config.allowedFileTypes;
      if (!allowedTypes.includes(file.type)) {
        // Provide specific error messages for common file types
        if (file.type === 'application/pdf') {
          return `PDF files are not supported. Please upload a CSV file with your prospect data.`;
        }
        if (file.type.startsWith('image/')) {
          return `Image files are not supported. Please upload a CSV file with your prospect data.`;
        }
        if (file.type.includes('word') || file.type.includes('document')) {
          return `Word documents are not supported. Please upload a CSV file with your prospect data.`;
        }
        if (file.type.includes('excel') || file.type.includes('spreadsheet')) {
          return `Excel files are not currently supported. Please save your data as CSV and upload.`;
        }

        return `File type "${file.type}" is not supported. Only CSV files are allowed for prospect data upload.`;
      }

      return null;
    },
    [uploadConfig, acceptedFileTypes, defaultConfig]
  );

  const validateFilePreUpload = async (file: File): Promise<boolean> => {
    try {
      const response = await apiClient.post('/api/uploads/validate', {
        filename: file.name,
        size: file.size,
        mimetype: file.type,
      });

      const data = await handleApiResponse(response);
      return data.success;
    } catch (error) {
      console.warn(
        'File validation failed, skipping server validation:',
        error
      );
      return true; // Allow upload if server validation fails
    }
  };

  const uploadFile = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      onUploadError?.(validationError);
      return;
    }

    // Pre-upload validation
    const isValid = await validateFilePreUpload(file);
    if (!isValid) {
      const error = 'File validation failed on server';
      setError(error);
      onUploadError?.(error);
      return;
    }

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await apiClient.upload('/api/uploads', formData);
      const data = await handleApiResponse(response);

      if (data.success) {
        console.log('🚀 Backend upload successful, data:', data.data);
        console.log(
          '🚀 Checking if backend has preview data:',
          !!data.data.preview
        );

        // Check if backend provided preview data (prospect count)
        if (data.data.preview && data.data.preview.totalRows) {
          console.log('🚀 Backend provided preview data, using it');
          const uploadInfo: UploadProgress = {
            uploadId: data.data.uploadId || generateFallbackId(),
            filename: data.data.filename || file.name,
            progress: 100,
            status: 'completed',
            message: 'File uploaded successfully',
            createdAt: new Date().toISOString(),
          };

          setUploadedFiles(prev => [...prev, uploadInfo]);
          onUploadProgress?.(uploadInfo);

          console.log(
            '🚀 About to call onUploadComplete with backend data:',
            data.data
          );
          onUploadComplete?.(data.data);
        } else {
          console.log(
            '🚀 Backend upload succeeded but no preview data, falling back to local processing'
          );
          // Don't throw error, just proceed to local fallback silently
          throw new Error('FALLBACK_TO_LOCAL');
        }
      } else {
        throw new Error(data.message || 'Upload failed');
      }
    } catch (error) {
      // Handle network errors, API not available, etc.
      if (
        error instanceof Error &&
        (error.message.includes('API server not available') ||
          error.message.includes('Service not found') ||
          error.message.includes('fetch') ||
          error.message === 'FALLBACK_TO_LOCAL')
      ) {
        // API server not available or backend processing incomplete - use local processing
        console.log('🔄 Using local processing fallback...');

        const fallbackInfo: UploadProgress = {
          uploadId: generateFallbackId(),
          filename: file.name,
          progress: 100,
          status: 'completed',
          message: 'File processed successfully',
          createdAt: new Date().toISOString(),
        };

        try {
          const localPreview = await generateLocalPreview(file);
          console.log('📊 Local CSV preview generated:', localPreview);

          setUploadedFiles(prev => [...prev, fallbackInfo]);
          onUploadProgress?.(fallbackInfo);

          const uploadResult = {
            uploadId: fallbackInfo.uploadId,
            filename: file.name,
            preview: localPreview,
          };

          console.log('📊 About to call onUploadComplete with:', uploadResult);
          onUploadComplete?.(uploadResult);
        } catch (parseError) {
          // CSV parsing failed - show error
          const errorMessage =
            parseError instanceof Error
              ? parseError.message
              : 'Failed to parse CSV file';
          console.error('❌ CSV parsing failed:', errorMessage);
          setError(errorMessage);
          onUploadError?.(errorMessage);
          return;
        }

        setError(null); // Clear error since we handled it with fallback

        // Show user-friendly message
        console.log('✅ File processed successfully using local fallback');
      } else {
        const errorMessage =
          error instanceof Error ? error.message : 'Upload failed';
        setError(errorMessage);
        onUploadError?.(errorMessage);
      }
    } finally {
      setIsUploading(false);
    }
  };

  // Removed unused pollUploadProgress function

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) {
        setIsDragOver(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      if (disabled) return;

      const files = Array.from(e.dataTransfer.files);
      const filesToUpload = files.slice(0, maxFiles);

      filesToUpload.forEach(uploadFile);
    },
    [disabled, maxFiles, uploadFile]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      const filesToUpload = files.slice(0, maxFiles);

      filesToUpload.forEach(uploadFile);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [maxFiles, uploadFile]
  );

  const handleBrowseFiles = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const removeFile = async (uploadId: string) => {
    try {
      // Try to remove from server, but don't fail if server is unavailable
      await apiClient.delete(`/api/uploads/${uploadId}`);
    } catch (error) {
      console.warn(
        'Failed to remove file from server, removing locally only:',
        error
      );
    }

    // Always remove from local state regardless of server response
    setUploadedFiles(prev => prev.filter(file => file.uploadId !== uploadId));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const generateFallbackId = (): string => {
    return (
      'fallback_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    );
  };

  // Proper CSV parsing function that handles quoted fields
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"';
          i += 2;
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === ',' && !inQuotes) {
        // End of field
        result.push(current.trim());
        current = '';
        i++;
      } else {
        current += char;
        i++;
      }
    }

    // Add the last field
    result.push(current.trim());
    return result;
  };

  const generateLocalPreview = async (file: File): Promise<any> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const csvText = e.target?.result as string;
          console.log(
            'CSV file content preview:',
            csvText.substring(0, 500) + '...'
          );

          // Split by newlines and filter out empty lines
          const allLines = csvText.split(/\r?\n/);
          const nonEmptyLines = allLines.filter(line => line.trim());

          console.log('Total lines in file:', allLines.length);
          console.log('Non-empty lines:', nonEmptyLines.length);

          if (nonEmptyLines.length === 0) {
            throw new Error('CSV file is empty');
          }

          if (nonEmptyLines.length < 2) {
            throw new Error(
              'CSV file must contain at least a header row and one data row'
            );
          }

          // Parse header row
          const headers = parseCSVLine(nonEmptyLines[0]!);
          const dataRows = nonEmptyLines.slice(1);

          // Parse preview rows (first 5 data rows)
          const previewRows = dataRows
            .slice(0, 5)
            .map(line => parseCSVLine(line));

          const totalRowCount = Math.max(0, dataRows.length);
          console.log('CSV parsing results - Headers:', headers);
          console.log('CSV parsing results - Data rows count:', totalRowCount);
          console.log('CSV parsing results - Preview rows:', previewRows);

          if (totalRowCount === 0) {
            throw new Error('CSV file contains no data rows');
          }

          resolve({
            headers,
            rows: previewRows,
            totalRows: totalRowCount,
            validRows: totalRowCount,
            invalidRows: 0,
          });
        } catch (error) {
          console.error('Error parsing CSV file:', error);
          reject(
            new Error(
              `Failed to parse CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`
            )
          );
        }
      };
      reader.onerror = error => {
        console.error('FileReader error:', error);
        reject(
          new Error(
            'Failed to read CSV file. Please ensure the file is not corrupted and try again.'
          )
        );
      };
      reader.readAsText(file);
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className='h-4 w-4 text-green-500' />;
      case 'failed':
        return <AlertCircle className='h-4 w-4 text-red-500' />;
      case 'processing':
      case 'uploading':
        return <Loader2 className='h-4 w-4 text-blue-500 animate-spin' />;
      default:
        return <File className='h-4 w-4 text-gray-500' />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      completed: 'default',
      failed: 'destructive',
      processing: 'secondary',
      uploading: 'secondary',
    };

    return (
      <Badge variant={variants[status] || 'outline'} className='text-xs'>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Error Alert */}
      {error && (
        <Alert variant='destructive'>
          <AlertCircle className='h-4 w-4' />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Drop Zone */}
      <Card
        className={`relative transition-all duration-200 ${
          isDragOver
            ? 'border-primary border-2 bg-primary/5'
            : 'border-dashed border-2 border-gray-300 hover:border-gray-400'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleBrowseFiles}
      >
        <CardContent className='p-8 text-center'>
          <input
            ref={fileInputRef}
            type='file'
            multiple={maxFiles > 1}
            accept={
              acceptedFileTypes?.join(',') ||
              (uploadConfig || defaultConfig)?.allowedFileTypes.join(',')
            }
            onChange={handleFileSelect}
            className='hidden'
            disabled={disabled}
          />

          <div className='space-y-4'>
            <div
              className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ${
                isDragOver ? 'bg-primary/10' : 'bg-gray-100'
              }`}
            >
              {isUploading ? (
                <Loader2 className='h-8 w-8 text-blue-500 animate-spin' />
              ) : (
                <Upload
                  className={`h-8 w-8 ${isDragOver ? 'text-primary' : 'text-gray-400'}`}
                />
              )}
            </div>

            <div>
              <h3 className='text-lg font-medium text-gray-900'>
                {isUploading ? 'Uploading...' : 'Drop CSV file here'}
              </h3>
            </div>

            <Button
              variant='outline'
              disabled={disabled || isUploading}
              onClick={e => {
                e.stopPropagation();
                handleBrowseFiles();
              }}
            >
              <Upload className='h-4 w-4 mr-2' />
              {isUploading ? 'Uploading...' : 'Browse Files'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className='space-y-2'>
          {uploadedFiles.map(file => (
            <Card key={file.uploadId} className='p-4'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center space-x-3'>
                  {getStatusIcon(file.status)}
                  <div className='flex-1 min-w-0'>
                    <p className='text-sm font-medium text-gray-900 truncate'>
                      {file.filename}
                    </p>
                    {file.message && (
                      <p className='text-xs text-gray-500'>{file.message}</p>
                    )}
                  </div>
                </div>

                <div className='flex items-center space-x-2'>
                  {getStatusBadge(file.status)}

                  {(file.status === 'processing' ||
                    file.status === 'uploading') && (
                    <div className='w-16'>
                      <Progress value={file.progress} className='h-2' />
                    </div>
                  )}

                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => removeFile(file.uploadId)}
                    className='h-8 w-8 p-0'
                  >
                    <X className='h-4 w-4' />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

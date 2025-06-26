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
// Removed API imports for local-only processing

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
  className = '',
  acceptedFileTypes,
  disabled = false,
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadProgress[]>([]);
  const [uploadConfig, setUploadConfig] = useState<UploadConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Removed server availability check for local-only processing
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Default configuration fallback
  const defaultConfig: UploadConfig = {
    maxFileSize: 10485760, // 10MB
    maxFileSizeMB: 10,
    allowedFileTypes: ['text/csv'],
    allowedExtensions: ['.csv'],
  };

  // Use default configuration for local processing
  useEffect(() => {
    setUploadConfig(defaultConfig);
    console.log('🔧 Using local file processing configuration');
  }, []);

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

  // Removed server-side validation - using local validation only

  const uploadFile = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      onUploadError?.(validationError);
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      console.log('🔄 Processing CSV file locally (no server upload)...');

      const localId = generateFallbackId();
      const uploadInfo: UploadProgress = {
        uploadId: localId,
        filename: file.name,
        progress: 50,
        status: 'processing',
        message: 'Processing CSV file locally...',
        createdAt: new Date().toISOString(),
      };

      setUploadedFiles(prev => [...prev, uploadInfo]);
      onUploadProgress?.(uploadInfo);

      // Generate local preview with enhanced validation
      const localPreview = await generateLocalPreview(file);
      console.log('📊 Local CSV preview generated:', localPreview);

      // Update progress to completed
      uploadInfo.progress = 100;
      uploadInfo.status = 'completed';
      uploadInfo.message = 'CSV processed successfully';

      setUploadedFiles(prev =>
        prev.map(f => f.uploadId === localId ? uploadInfo : f)
      );
      onUploadProgress?.(uploadInfo);

      const uploadResult = {
        localId: localId,
        filename: file.name,
        fileSize: file.size,
        preview: localPreview,
        // Store the raw file for later upload in step 3
        rawFileData: file,
        processedLocally: true,
        processedAt: new Date().toISOString(),
      };

      console.log('📊 Local processing complete, calling onUploadComplete with:', uploadResult);
      onUploadComplete?.(uploadResult);

    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to process CSV file';
      console.error('❌ Local CSV processing failed:', errorMessage);
      setError(errorMessage);
      onUploadError?.(errorMessage);
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

      if (disabled || uploadedFiles.length > 0) return; // Prevent drop if file already uploaded

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0 && files[0]) {
        uploadFile(files[0]); // Only upload the first file
      }
    },
    [disabled, uploadedFiles.length, uploadFile]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (uploadedFiles.length > 0) return; // Prevent selection if file already uploaded

      const files = Array.from(e.target.files || []);
      if (files.length > 0 && files[0]) {
        uploadFile(files[0]); // Only upload the first file
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [uploadedFiles.length, uploadFile]
  );

  const handleBrowseFiles = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const removeFile = async (uploadId: string) => {
    // Remove from local state only (no server interaction in step 1)
    console.log('🗑️ Removing locally processed file:', uploadId);
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
          console.log('📄 Processing CSV file locally...');

          // Split by newlines and filter out empty lines
          const allLines = csvText.split(/\r?\n/);
          const nonEmptyLines = allLines.filter(line => line.trim());

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

          // Validate required columns
          const requiredColumns = [
            { name: 'Name', found: false, mapping: null as string | null },
            { name: 'Email', found: false, mapping: null as string | null },
            { name: 'Company', found: false, mapping: null as string | null },
          ];

          // Check for required columns
          headers.forEach(header => {
            const normalizedHeader = header.toLowerCase().trim();

            requiredColumns.forEach(req => {
              const normalizedRequired = req.name.toLowerCase();
              if (normalizedHeader.includes(normalizedRequired) ||
                normalizedRequired.includes(normalizedHeader)) {
                req.found = true;
                req.mapping = header;
              }
            });
          });

          // Basic validation - count valid vs invalid rows
          let validRows = 0;
          let invalidRows = 0;

          dataRows.forEach(line => {
            const rowData = parseCSVLine(line);
            let hasRequiredData = false;

            // Check if row has some basic required data
            for (let i = 0; i < headers.length; i++) {
              const header = headers[i]?.toLowerCase() || '';
              const value = rowData[i]?.trim() || '';

              if ((header.includes('name') || header.includes('email')) && value) {
                hasRequiredData = true;
                break;
              }
            }

            if (hasRequiredData) {
              validRows++;
            } else {
              invalidRows++;
            }
          });

          console.log('📊 Local CSV processing complete:', {
            headers: headers.length,
            totalRows: totalRowCount,
            validRows,
            invalidRows,
            requiredColumnsFound: requiredColumns.filter(c => c.found).length
          });

          if (totalRowCount === 0) {
            throw new Error('CSV file contains no data rows');
          }

          resolve({
            headers,
            rows: previewRows,
            totalRows: totalRowCount,
            validRows: Math.max(validRows, 1), // Ensure at least 1 valid row
            invalidRows,
            requiredColumns,
          });
        } catch (error) {
          console.error('❌ Error parsing CSV file:', error);
          reject(
            new Error(
              `Failed to parse CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`
            )
          );
        }
      };
      reader.onerror = error => {
        console.error('❌ FileReader error:', error);
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

      {/* Drop Zone - Only show if no files uploaded */}
      {uploadedFiles.length === 0 && (
        <Card
          className={`relative transition-all duration-200 ${isDragOver
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
                className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ${isDragOver ? 'bg-primary/10' : 'bg-gray-100'
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
                  {isUploading ? 'Processing...' : 'Drop CSV file here'}
                </h3>
                <p className='text-sm text-gray-500 mt-1'>
                  Only one CSV file is allowed. Drag and drop or click to browse.
                </p>
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
                {isUploading ? 'Processing...' : 'Browse Files'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => removeFile(file.uploadId)}
                    className='h-8 w-8 p-0 text-gray-400 hover:text-red-500'
                  >
                    <X className='h-4 w-4' />
                  </Button>
                </div>
              </div>

              {/* Progress bar for processing */}
              {file.status === 'processing' && (
                <div className='mt-3'>
                  <Progress value={file.progress} className='h-2' />
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

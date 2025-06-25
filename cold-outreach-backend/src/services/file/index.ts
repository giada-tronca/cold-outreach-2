// File Management Services Export
export { FileStorageService } from './fileStorageService';
export type {
    FileStorageConfig,
    StorageResult,
    FileInfo
} from './fileStorageService';

// Note: FileMetadataService temporarily commented out due to database dependency
// export { FileMetadataService } from './fileMetadataService';
// export type { 
//   FileMetadata, 
//   CreateFileMetadataOptions, 
//   UpdateFileMetadataOptions, 
//   FileSearchOptions 
// } from './fileMetadataService';

export { FileCleanupService } from './fileCleanupService';
export type {
    CleanupConfig,
    CleanupResult,
    CleanupOptions
} from './fileCleanupService';

export { FileDownloadService } from './fileDownloadService';
export type {
    DownloadOptions,
    DownloadResult,
    SecureDownloadLink,
    DownloadStats
} from './fileDownloadService';

export { FileManagementService } from './fileManagementService';
export type {
    FileUploadOptions,
    FileManagementConfig,
    FileOperationResult
} from './fileManagementService'; 
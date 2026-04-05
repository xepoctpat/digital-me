import type { CommonResponse, EmptyResponse } from '../types/responseModal';
import { Request } from '../utils/request';

// Memory processing status
export type EmbeddingStatus = 'INITIALIZED' | 'PROCESSING' | 'SUCCESS' | 'FAILED';
export type ExtractStatus = 'INITIALIZED' | 'PROCESSING' | 'SUCCESS' | 'FAILED';

// Basic interface definition for Memory
export interface MemoryResource {
  url: string;
  title?: string;
  type?: string;
  process?: string;
}

export interface MemoryImportPreviewFile {
  selection_index?: number;
  relative_path?: string;
  name: string;
  title: string;
  size: number;
  size_label: string;
  supported: boolean;
  can_import: boolean;
  is_duplicate: boolean;
  is_hosted_export: boolean;
  has_batch_name_conflict?: boolean;
  source_export_kind?: string | null;
  source_memory_type?: string | null;
  source_created_time?: string | null;
  source_modified_time?: string | null;
  tag_count: number;
  source_date_count: number;
  linked_resource_count: number;
  tags: string[];
  resources: MemoryResource[];
  warnings: string[];
  content_preview?: string | null;
}

export interface MemoryImportPreviewSummary {
  total_files: number;
  note_count: number;
  importable_files: number;
  blocked_files: number;
  duplicate_files: number;
  unsupported_files: number;
  hosted_export_files: number;
  name_conflict_files: number;
  suspicious_files: number;
  tag_count: number;
  source_date_count: number;
  linked_resource_count: number;
}

export interface MemoryImportPreviewResponse {
  files: MemoryImportPreviewFile[];
  summary: MemoryImportPreviewSummary;
}

export interface MemoryFile {
  id: string;
  name: string;
  title: string | null;
  create_time: string;
  document_size: number;
  embedding_status: EmbeddingStatus;
  extract_status: ExtractStatus;
  insight: string | null;
  mime_type: string;
  raw_content: string;
  summary: string | null;
  url: string;
  user_description: string;
  source_is_hosted_export?: boolean;
  source_export_version?: string | null;
  source_doc_id?: string | null;
  source_title?: string | null;
  source_type?: string | null;
  source_export_kind?: string | null;
  source_memory_type?: string | null;
  source_created_time?: string | null;
  source_modified_time?: string | null;
  source_tags?: string[];
  source_resources?: MemoryResource[];
}

interface MetaData {
  description: string;
  name: string;
}

interface UploadMemoryRes {
  created_at: string;
  id: string;
  meta_data: MetaData;
  name: string;
  path: string;
  type: string;
}

export const getMemoryList = () => {
  return Request<CommonResponse<MemoryFile[]>>({
    method: 'get',
    url: '/api/documents/list'
  });
};

export const previewMemoryImports = (formData: FormData) => {
  return Request<CommonResponse<MemoryImportPreviewResponse>>({
    method: 'post',
    url: '/api/memories/file/preview',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
};

export const previewMountedMemoryScan = () => {
  return Request<CommonResponse<MemoryImportPreviewResponse>>({
    method: 'post',
    url: '/api/documents/scan/preview'
  });
};

export const uploadMemory = (formData: FormData) => {
  return Request<CommonResponse<UploadMemoryRes>>({
    method: 'post',
    url: '/api/memories/file',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
};

export const deleteMemory = (name: string) => {
  return Request<EmptyResponse>({
    method: 'delete',
    url: `/api/memories/file/${name}`
  });
};

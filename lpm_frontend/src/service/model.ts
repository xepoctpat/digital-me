import type { MemoryResource } from './memory';
import type { AxiosResponse } from 'axios';
import { Request } from '../utils/request';
import type { CommonResponse } from '../types/responseModal';

type ServiceResponse<T> = Promise<AxiosResponse<CommonResponse<T>>>;

export interface ShadeTimelineEntry {
  createTime: string;
  refMemoryId: number | null;
  descThirdView: string;
  descSecondView: string;
}

export interface ShadeClusterInfo {
  clusterId?: number | string | null;
  memoryIds?: (number | string)[];
  clusterSize?: number;
  centerEmbedding?: number[];
}

export interface GlobalBioShade {
  id: number;
  name: string;
  aspect: string;
  icon: string;
  desc_third_view: string;
  content_third_view: string;
  desc_second_view: string;
  content_second_view: string;
  timelines: ShadeTimelineEntry[];
  cluster_info: ShadeClusterInfo;
  timeline_count: number;
  cluster_memory_count: number;
}

export interface GlobalBio {
  content: string;
  content_third_view: string;
  shades: GlobalBioShade[];
  summary: string;
  summary_third_view: string;
}

interface ChunkTopic {
  chunk_id: string;
  tags: string[];
  topic: string;
}

interface Cluster {
  cluster_center: unknown;
  cluster_id: number | string | null;
  memory_ids: string[];
}

export interface GlobalBioResponse {
  bio: GlobalBio;
  chunk_topics: ChunkTopic[];
  clusters: Cluster[];
  version: number;
}

export interface RelatedShadeMemory {
  id: number;
  name: string;
  title?: string | null;
  extract_status?: string | null;
  embedding_status?: string | null;
  analyze_status?: string | null;
  mime_type?: string | null;
  raw_content?: string | null;
  user_description?: string | null;
  create_time?: string | null;
  url?: string | null;
  document_size?: number;
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
  timeline_entries: ShadeTimelineEntry[];
}

export interface GlobalBioShadeDetailResponse {
  version: number;
  shade: GlobalBioShade;
  related_memories: RelatedShadeMemory[];
  related_memory_count: number;
  missing_memory_ids: number[];
}

export interface StatusBioResponse {
  content: string;
  content_third_view: string;
  create_time: string;
  summary: string;
  summary_third_view: string;
  update_time: string;
}

export interface BioVersion {
  create_time: string;
  description: string;
  status: string;
  version: number;
}

export const getGlobalBioVersion = (): ServiceResponse<BioVersion[]> => {
  return Request<CommonResponse<BioVersion[]>>({
    method: 'get',
    url: '/api/kernel/l1/global/versions'
  });
};

export const getGlobalBio = (version: number): ServiceResponse<GlobalBioResponse> => {
  return Request<CommonResponse<GlobalBioResponse>>({
    method: 'get',
    url: `/api/kernel/l1/global/version/${version}`
  });
};

export const getGlobalBioShadeDetail = (
  version: number,
  shadeId: number
): ServiceResponse<GlobalBioShadeDetailResponse> => {
  return Request<CommonResponse<GlobalBioShadeDetailResponse>>({
    method: 'get',
    url: `/api/kernel/l1/global/version/${version}/shade/${shadeId}`
  });
};

export const getStatusBio = (): ServiceResponse<StatusBioResponse> => {
  return Request<CommonResponse<StatusBioResponse>>({
    method: 'get',
    url: '/api/kernel/l1/status_bio/get'
  });
};

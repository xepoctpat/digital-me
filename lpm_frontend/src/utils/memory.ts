import type { Memory } from '@/app/dashboard/train/memories/page';
import type { MemoryFile } from '@/service/memory';

export type MemorySortField = 'source' | 'imported';
export type MemorySortDirection = 'desc' | 'asc';
export type MemoryResourceFilter = 'all' | 'linked' | 'image' | 'none';

export interface MemoryBrowserFilters {
  query: string;
  tag: string;
  memoryType: string;
  resourceFilter: MemoryResourceFilter;
  startDate: string;
  endDate: string;
  sortField: MemorySortField;
  sortDirection: MemorySortDirection;
}

export const toTimestamp = (value?: string | null): number => {
  if (!value) {
    return 0;
  }

  const normalizedValue =
    value.includes(' ') && !value.includes('T') ? value.replace(' ', 'T') : value;
  const timestamp = Date.parse(normalizedValue);

  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const toStartOfDayTimestamp = (value?: string): number => {
  if (!value) {
    return 0;
  }

  const timestamp = Date.parse(`${value}T00:00:00`);

  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const toEndOfDayTimestamp = (value?: string): number => {
  if (!value) {
    return 0;
  }

  const timestamp = Date.parse(`${value}T23:59:59.999`);

  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const isImageResource = (resource?: NonNullable<Memory['resources']>[number]): boolean => {
  if (!resource) {
    return false;
  }

  if (resource.type === 'IMAGE') {
    return true;
  }

  return /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(resource.url || '');
};

export const getMemoryTypeValue = (memory: Memory): string => {
  return memory.sourceMemoryType || memory.type.toUpperCase();
};

export const getMemorySourceTimestamp = (memory: Memory): number => {
  return toTimestamp(memory.sourceCreatedAt || memory.uploadedAt);
};

export const getMemoryImportTimestamp = (memory: Memory): number => {
  return toTimestamp(memory.uploadedAt);
};

export const getMemoryTimestampForField = (memory: Memory, sortField: MemorySortField): number => {
  return sortField === 'imported'
    ? getMemoryImportTimestamp(memory)
    : getMemorySourceTimestamp(memory);
};

const matchesQuery = (memory: Memory, normalizedQuery: string): boolean => {
  if (!normalizedQuery) {
    return true;
  }

  const searchableText = [memory.title, memory.name, memory.content]
    .filter(Boolean)
    .join('\n')
    .toLowerCase();

  return searchableText.includes(normalizedQuery);
};

const matchesResourceFilter = (memory: Memory, resourceFilter: MemoryResourceFilter): boolean => {
  const hasResources = Boolean(memory.resources?.length);
  const hasImageResources = Boolean(
    memory.resources?.some((resource) => isImageResource(resource))
  );

  switch (resourceFilter) {
    case 'linked':
      return hasResources;
    case 'image':
      return hasImageResources;
    case 'none':
      return !hasResources;
    default:
      return true;
  }
};

export const sortMemories = (
  memories: Memory[],
  sortField: MemorySortField,
  sortDirection: MemorySortDirection
): Memory[] => {
  const direction = sortDirection === 'asc' ? 1 : -1;

  return [...memories].sort((a, b) => {
    const primaryDifference =
      (getMemoryTimestampForField(a, sortField) - getMemoryTimestampForField(b, sortField)) *
      direction;

    if (primaryDifference !== 0) {
      return primaryDifference;
    }

    return a.name.localeCompare(b.name) * direction;
  });
};

export const fileTransformToMemory: (file: MemoryFile) => Memory = (file: MemoryFile) => {
  return {
    id: file.id,
    type: 'file',
    name: file.name,
    title: file.title || file.source_title || file.name,
    content: file.raw_content,
    size: `${(file.document_size / 1024).toFixed(1)} KB`,
    uploadedAt: file.create_time,
    sourceCreatedAt: file.source_created_time || undefined,
    sourceModifiedAt: file.source_modified_time || undefined,
    sourceMemoryType: file.source_memory_type || undefined,
    tags: file.source_tags || [],
    resources: file.source_resources || [],
    isHostedImport: Boolean(file.source_is_hosted_export),
    isTrained: file.embedding_status === 'SUCCESS'
  };
};

export const sortMemoriesByTimeline = (memories: Memory[]): Memory[] => {
  return sortMemories(memories, 'source', 'desc');
};

export const filterAndSortMemories = (
  memories: Memory[],
  filters: MemoryBrowserFilters
): Memory[] => {
  const normalizedQuery = filters.query.trim().toLowerCase();
  const startTimestamp = filters.startDate ? toStartOfDayTimestamp(filters.startDate) : 0;
  const endTimestamp = filters.endDate ? toEndOfDayTimestamp(filters.endDate) : 0;

  return sortMemories(
    memories.filter((memory) => {
      const memoryTimestamp = getMemoryTimestampForField(memory, filters.sortField);
      const matchesDateRange =
        (!startTimestamp || memoryTimestamp >= startTimestamp) &&
        (!endTimestamp || memoryTimestamp <= endTimestamp);

      return (
        matchesQuery(memory, normalizedQuery) &&
        (!filters.tag || Boolean(memory.tags?.includes(filters.tag))) &&
        (!filters.memoryType || getMemoryTypeValue(memory) === filters.memoryType) &&
        matchesResourceFilter(memory, filters.resourceFilter) &&
        matchesDateRange
      );
    }),
    filters.sortField,
    filters.sortDirection
  );
};

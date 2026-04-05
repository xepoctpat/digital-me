'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import InfoModal from '@/components/InfoModal';
import MemoryList from '@/components/train/MemoryList';
import UploadMemories from '@/components/train/UploadMemories';
import { message } from 'antd';
import { deleteMemory, getMemoryList } from '@/service/memory';
import { useTrainingStore } from '@/store/useTrainingStore';
import {
  fileTransformToMemory,
  filterAndSortMemories,
  getMemoryTypeValue,
  type MemoryBrowserFilters,
  sortMemoriesByTimeline
} from '@/utils/memory';
import { ROUTER_PATH } from '@/utils/router';
import { EVENT } from '@/utils/event';

interface TrainSectionInfo {
  name: string;
  description: string;
  features: string[];
}

const trainSectionInfo: Record<string, TrainSectionInfo> = {
  upload: {
    name: 'Upload Memories',
    description:
      'Share your experiences with your SecondMe so it can learn to think and respond like you. ' +
      "Each memory you upload becomes part of your AI's lived experience, helping it understand your perspective, values, and communication style. " +
      'The more personal context you provide, the more authentic your digital twin becomes.',
    features: [
      'Drag-and-drop file upload',
      'Bulk folder upload support',
      'Text input for direct content',
      'File size and type validation',
      'Upload progress tracking'
    ]
  },
  'memory-list': {
    name: 'Memory List',
    description:
      'View and manage all your uploaded training materials. Organize and review your memories before starting the training process.',
    features: [
      'Filterable note browsing by tag, type, resource state, and date range',
      'Text search across note title, filename, and body',
      'Source-date versus import-date sorting toggles',
      'Memory content preview',
      'Delete and manage memories'
    ]
  }
};

const createDefaultMemoryBrowserFilters = (): MemoryBrowserFilters => ({
  query: '',
  tag: '',
  memoryType: '',
  resourceFilter: 'all',
  startDate: '',
  endDate: '',
  sortField: 'source',
  sortDirection: 'desc'
});

const formatFilterLabel = (value: string) => {
  return value
    .toLowerCase()
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
};

interface UploadedMemoryLike {
  name: string;
  size?: number | null;
}

export interface Memory {
  id: string;
  type: 'text' | 'file' | 'folder';
  name: string;
  title?: string;
  content?: string;
  size: string;
  uploadedAt: string;
  sourceCreatedAt?: string;
  sourceModifiedAt?: string;
  sourceMemoryType?: string;
  tags?: string[];
  resources?: {
    url: string;
    title?: string;
    type?: string;
    process?: string;
  }[];
  isHostedImport?: boolean;
  isTrained?: boolean;
}

export default function TrainPage(): JSX.Element {
  // Title and explanation section
  const pageTitle = 'Upload Memories';
  const pageDescription =
    "Upload content that helps your AI understand you better. These aren't just files—they're experiences and ideas for your Second Me to live through. By processing these memories, your AI learns to see the world as you do, adopting your unique perspective and decision-making patterns.";

  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedInfo, setSelectedInfo] = useState<string | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [memoryFilters, setMemoryFilters] = useState<MemoryBrowserFilters>(
    createDefaultMemoryBrowserFilters
  );

  const setStatus = useTrainingStore((state) => state.setStatus);

  const availableTags = useMemo(() => {
    return Array.from(new Set(memories.flatMap((memory) => memory.tags || []))).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [memories]);

  const availableMemoryTypes = useMemo(() => {
    return Array.from(new Set(memories.map((memory) => getMemoryTypeValue(memory)))).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [memories]);

  const filteredMemories = useMemo(() => {
    return filterAndSortMemories(memories, memoryFilters);
  }, [memories, memoryFilters]);

  const hasActiveMemoryFilters = useMemo(() => {
    return (
      memoryFilters.query.trim().length > 0 ||
      Boolean(memoryFilters.tag) ||
      Boolean(memoryFilters.memoryType) ||
      memoryFilters.resourceFilter !== 'all' ||
      Boolean(memoryFilters.startDate) ||
      Boolean(memoryFilters.endDate) ||
      memoryFilters.sortField !== 'source' ||
      memoryFilters.sortDirection !== 'desc'
    );
  }, [memoryFilters]);

  useEffect(() => {
    const fetchMemories = async () => {
      getMemoryList()
        .then((res) => {
          if (res.data.code !== 0) {
            throw new Error(res.data.message);
          } else {
            const fileList = res.data.data;
            const newMemories = sortMemoriesByTimeline(
              fileList.map((file) => fileTransformToMemory(file))
            );

            setMemories(newMemories);
            // Only update status when there are no training steps
            const trainingProgress = useTrainingStore.getState().trainingProgress;

            if (trainingProgress.overall_progress === 0) {
              setStatus(newMemories.length > 0 ? 'memory_upload' : 'seed_identity');
            }
          }
        })
        .catch((error: Error) => {
          message.error(error.message);
        });
    };

    fetchMemories();
    addEventListener(EVENT.REFRESH_MEMORIES, fetchMemories);

    return () => {
      removeEventListener(EVENT.REFRESH_MEMORIES, fetchMemories);
    };
  }, [setStatus]);

  const scrollToBottom = () => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  const handleFileUpload = (files: UploadedMemoryLike[]) => {
    const newMemories: Memory[] = Array.from(files).map((file) => ({
      id: Math.random().toString(),
      type: 'file',
      name: file.name,
      title: file.name,
      size: `${((file.size || 0) / 1024).toFixed(1)} KB`,
      uploadedAt: new Date().toLocaleString(),
      isTrained: false
    }));

    setMemories((prev) => {
      const updatedMemories = sortMemoriesByTimeline([...newMemories, ...prev]);
      const trainingProgress = useTrainingStore.getState().trainingProgress;

      if (trainingProgress.overall_progress === 0) {
        setStatus(newMemories.length > 0 ? 'memory_upload' : 'seed_identity');
      }

      setTimeout(scrollToBottom, 100);

      return updatedMemories;
    });
  };

  const handleDeleteMemory = async (id: string, name: string) => {
    const res = await deleteMemory(name);

    if (res.data.code === 0) {
      setMemories((prev) => {
        const updatedMemories = prev.filter((memory) => memory.id !== id);
        const trainingProgress = useTrainingStore.getState().trainingProgress;

        if (trainingProgress.overall_progress === 0) {
          setStatus(updatedMemories.length > 0 ? 'memory_upload' : 'seed_identity');
        }

        return updatedMemories;
      });
      message.success(`Memory "${name}" deleted successfully!`);
    } else {
      message.error(res.data.message);
    }
  };

  const updateMemoryFilter = <K extends keyof MemoryBrowserFilters>(
    key: K,
    value: MemoryBrowserFilters[K]
  ) => {
    setMemoryFilters((previousFilters) => ({
      ...previousFilters,
      [key]: value
    }));
  };

  const handleResetMemoryFilters = () => {
    setMemoryFilters(createDefaultMemoryBrowserFilters());
  };

  const renderInfoButton = (section: string) => (
    <button
      className="ml-auto p-1.5 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors"
      onClick={() => setSelectedInfo(section)}
      title={`Learn more about ${trainSectionInfo[section].name}`}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
      </svg>
    </button>
  );

  return (
    <>
      <div
        ref={containerRef}
        className="max-w-6xl mx-auto px-6 py-8 space-y-8 overflow-y-auto h-full"
      >
        {/* Page Title and Description */}
        <div className="mb-4">
          <h1 className="text-xl font-semibold text-gray-900 mb-1">{pageTitle}</h1>
          <p className="text-gray-600 max-w-6xl">{pageDescription}</p>
        </div>
        {/* Upload Memories Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-lg font-semibold text-gray-900 mb-0">Upload Memories</h2>
            {renderInfoButton('upload')}
          </div>
          <UploadMemories onFileUpload={handleFileUpload} />
        </div>

        {/* Memory List Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-xl font-semibold tracking-tight text-gray-900">Memory List</h2>
            {renderInfoButton('memory-list')}
          </div>

          <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50/80 p-4">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Browse imported notes</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Search title, body, or filename, then narrow by tags, memory type, linked
                    resources, and chronology.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                  <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 font-medium text-gray-700">
                    Showing {filteredMemories.length} of {memories.length} notes
                  </span>
                  {hasActiveMemoryFilters ? (
                    <button
                      className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 font-medium text-gray-700 transition-colors hover:border-blue-200 hover:text-blue-600"
                      onClick={handleResetMemoryFilters}
                      type="button"
                    >
                      Clear filters
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <label className="xl:col-span-2">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Search notes
                  </span>
                  <input
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition-colors placeholder:text-gray-400 focus:border-blue-400"
                    onChange={(event) => updateMemoryFilter('query', event.target.value)}
                    placeholder="Search title, filename, or body"
                    type="search"
                    value={memoryFilters.query}
                  />
                </label>

                <label>
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Tag
                  </span>
                  <select
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition-colors focus:border-blue-400"
                    onChange={(event) => updateMemoryFilter('tag', event.target.value)}
                    value={memoryFilters.tag}
                  >
                    <option value="">All tags</option>
                    {availableTags.map((tag) => (
                      <option key={tag} value={tag}>
                        {tag}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Memory type
                  </span>
                  <select
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition-colors focus:border-blue-400"
                    onChange={(event) => updateMemoryFilter('memoryType', event.target.value)}
                    value={memoryFilters.memoryType}
                  >
                    <option value="">All types</option>
                    {availableMemoryTypes.map((memoryType) => (
                      <option key={memoryType} value={memoryType}>
                        {formatFilterLabel(memoryType)}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Linked resources
                  </span>
                  <select
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition-colors focus:border-blue-400"
                    onChange={(event) =>
                      updateMemoryFilter(
                        'resourceFilter',
                        event.target.value as MemoryBrowserFilters['resourceFilter']
                      )
                    }
                    value={memoryFilters.resourceFilter}
                  >
                    <option value="all">Any resource state</option>
                    <option value="linked">Has linked resources</option>
                    <option value="image">Image-backed notes</option>
                    <option value="none">No linked resources</option>
                  </select>
                </label>

                <label>
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                    From date
                  </span>
                  <input
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition-colors focus:border-blue-400"
                    max={memoryFilters.endDate || undefined}
                    onChange={(event) => updateMemoryFilter('startDate', event.target.value)}
                    type="date"
                    value={memoryFilters.startDate}
                  />
                </label>

                <label>
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                    To date
                  </span>
                  <input
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition-colors focus:border-blue-400"
                    min={memoryFilters.startDate || undefined}
                    onChange={(event) => updateMemoryFilter('endDate', event.target.value)}
                    type="date"
                    value={memoryFilters.endDate}
                  />
                </label>

                <div className="md:col-span-2">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Sort by
                  </span>
                  <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-gray-200 bg-white">
                    <button
                      className={`px-3 py-2 text-sm font-medium transition-colors ${
                        memoryFilters.sortField === 'source'
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                      onClick={() => updateMemoryFilter('sortField', 'source')}
                      type="button"
                    >
                      Source date
                    </button>
                    <button
                      className={`border-l border-gray-200 px-3 py-2 text-sm font-medium transition-colors ${
                        memoryFilters.sortField === 'imported'
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                      onClick={() => updateMemoryFilter('sortField', 'imported')}
                      type="button"
                    >
                      Import date
                    </button>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Order
                  </span>
                  <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-gray-200 bg-white">
                    <button
                      className={`px-3 py-2 text-sm font-medium transition-colors ${
                        memoryFilters.sortDirection === 'desc'
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                      onClick={() => updateMemoryFilter('sortDirection', 'desc')}
                      type="button"
                    >
                      Newest first
                    </button>
                    <button
                      className={`border-l border-gray-200 px-3 py-2 text-sm font-medium transition-colors ${
                        memoryFilters.sortDirection === 'asc'
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                      onClick={() => updateMemoryFilter('sortDirection', 'asc')}
                      type="button"
                    >
                      Oldest first
                    </button>
                  </div>
                </div>
              </div>

              <p className="text-xs text-gray-500">
                The date range follows the selected date basis, so you can inspect either original
                note chronology or the timing of a specific import batch.
              </p>
            </div>
          </div>

          <MemoryList
            emptyStateDescription={
              memories.length === 0
                ? 'Upload notes, files, or folders to start building your local memory timeline.'
                : hasActiveMemoryFilters
                  ? 'Try broadening the search, date range, or resource filters to surface more notes.'
                  : 'No memories are available yet.'
            }
            emptyStateTitle={
              memories.length === 0
                ? 'No memories uploaded yet'
                : hasActiveMemoryFilters
                  ? 'No notes match the current filters'
                  : 'No memories found'
            }
            memories={filteredMemories}
            onDelete={handleDeleteMemory}
          />
        </div>

        {/* Next Button */}
        <div className="flex justify-end mt-4">
          <button
            className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors flex items-center gap-2"
            onClick={() => router.push(ROUTER_PATH.TRAIN_TRAINING)}
          >
            Next: Training
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
            </svg>
          </button>
        </div>
      </div>

      <InfoModal
        content={
          selectedInfo ? (
            <div className="space-y-4">
              <p className="text-gray-600">{trainSectionInfo[selectedInfo].description}</p>
              <div>
                <h4 className="font-medium mb-2">Key Features:</h4>
                <ul className="list-disc pl-5 space-y-1.5">
                  {trainSectionInfo[selectedInfo].features.map((feature, index) => (
                    <li key={index} className="text-gray-600">
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null
        }
        onClose={() => setSelectedInfo(null)}
        open={!!selectedInfo && !!trainSectionInfo[selectedInfo]}
        title={selectedInfo ? trainSectionInfo[selectedInfo].name : ''}
      />
    </>
  );
}

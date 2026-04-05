'use client';

import { useState } from 'react';
import { Modal } from 'antd';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import 'github-markdown-css/github-markdown.css';

interface Memory {
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

interface MemoryListProps {
  memories: Memory[];
  onDelete: (id: string, name: string) => void;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
}

const formatMemoryTypeLabel = (memory: Memory) => {
  const typeValue = memory.sourceMemoryType || memory.type.toUpperCase();

  return typeValue
    .toLowerCase()
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
};

export default function MemoryList({
  memories,
  onDelete,
  emptyStateTitle = 'No memories found',
  emptyStateDescription = 'Try adjusting your filters or upload a new memory batch.'
}: MemoryListProps): JSX.Element {
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const formatDisplayDate = (value?: string) => {
    if (!value) {
      return '—';
    }

    const normalizedValue =
      value.includes(' ') && !value.includes('T') ? value.replace(' ', 'T') : value;
    const parsedDate = new Date(normalizedValue);

    return Number.isNaN(parsedDate.getTime()) ? value : parsedDate.toLocaleString();
  };

  const primaryDate = (memory: Memory) => memory.sourceCreatedAt || memory.uploadedAt;

  const showDetails = (record: Memory) => {
    setSelectedMemory(record);
    setIsModalVisible(true);
  };

  const getIcon = (type: string, sourceMemoryType?: string) => {
    if (sourceMemoryType === 'IMAGE') {
      return (
        <svg
          className="w-5 h-5 text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
        </svg>
      );
    }

    switch (type) {
      case 'text':
        return (
          <svg
            className="w-5 h-5 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
          </svg>
        );
      case 'folder':
        return (
          <svg
            className="w-5 h-5 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
          </svg>
        );
      default:
        return (
          <svg
            className="w-5 h-5 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
          </svg>
        );
    }
  };

  return (
    <div>
      <div className="border rounded-lg overflow-hidden bg-gray-50 bg-opacity-30">
        <table className="min-w-full divide-y divide-gray-200 table-fixed">
          <thead className="bg-gray-100">
            <tr>
              <th className="w-[12%] px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Type
              </th>
              <th className="w-[33%] px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Note
              </th>
              <th className="w-[12%] px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Size
              </th>
              <th className="w-[22%] px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Timeline
              </th>
              <th className="w-[10%] px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Actions
              </th>
              <th className="w-[9%] px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Details
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {memories.map((memory) => (
              <tr key={memory.id} className="hover:bg-gray-50 transition-colors duration-150">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center truncate">
                    {getIcon(memory.type, memory.sourceMemoryType)}
                  </div>
                </td>
                <td className="px-6 py-4 max-w-0">
                  <div
                    className="text-sm font-medium text-gray-900 truncate"
                    title={memory.title || memory.name}
                  >
                    {memory.title || memory.name}
                  </div>
                  {memory.title && memory.title !== memory.name ? (
                    <div className="text-xs text-gray-500 truncate" title={memory.name}>
                      {memory.name}
                    </div>
                  ) : null}
                  {memory.tags?.length ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {memory.tags.slice(0, 3).map((tag) => (
                        <span
                          key={`${memory.id}-${tag}`}
                          className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700"
                        >
                          {tag}
                        </span>
                      ))}
                      {memory.tags.length > 3 ? (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                          +{memory.tags.length - 3}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-1">
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                      {formatMemoryTypeLabel(memory)}
                    </span>
                    {memory.resources?.length ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                        {memory.resources.length} linked resource
                        {memory.resources.length === 1 ? '' : 's'}
                      </span>
                    ) : null}
                    {memory.isHostedImport ? (
                      <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                        Hosted import
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 truncate">
                  {memory.size}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  <div className="truncate">{formatDisplayDate(primaryDate(memory))}</div>
                  {memory.sourceCreatedAt ? (
                    <div className="truncate text-xs text-gray-400">
                      Imported {formatDisplayDate(memory.uploadedAt)}
                    </div>
                  ) : null}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium truncate">
                  <button
                    className="text-red-600 hover:text-red-900 hover:underline focus:outline-none"
                    onClick={() => onDelete(memory.id, memory.name)}
                  >
                    Delete
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium truncate">
                  <button
                    className="text-blue-600 hover:text-blue-900 hover:underline focus:outline-none"
                    onClick={() => showDetails(memory)}
                  >
                    Details
                  </button>
                </td>
              </tr>
            ))}
            {memories.length === 0 ? (
              <tr>
                <td className="px-6 py-12 text-center" colSpan={6}>
                  <div className="mx-auto max-w-md">
                    <div className="text-sm font-semibold text-gray-900">{emptyStateTitle}</div>
                    <p className="mt-1 text-sm text-gray-500">{emptyStateDescription}</p>
                  </div>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Modal
        footer={null}
        onCancel={() => setIsModalVisible(false)}
        open={isModalVisible}
        title={selectedMemory?.title || selectedMemory?.name}
        width={800}
      >
        <div className="space-y-4 p-2">
          {selectedMemory ? (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
              <div className="grid gap-2 md:grid-cols-2">
                <div>
                  <span className="font-medium text-gray-700">Source date:</span>{' '}
                  {formatDisplayDate(selectedMemory.sourceCreatedAt || selectedMemory.uploadedAt)}
                </div>
                <div>
                  <span className="font-medium text-gray-700">Imported:</span>{' '}
                  {formatDisplayDate(selectedMemory.uploadedAt)}
                </div>
                {selectedMemory.sourceModifiedAt ? (
                  <div>
                    <span className="font-medium text-gray-700">Modified:</span>{' '}
                    {formatDisplayDate(selectedMemory.sourceModifiedAt)}
                  </div>
                ) : null}
                {selectedMemory.sourceMemoryType ? (
                  <div>
                    <span className="font-medium text-gray-700">Memory type:</span>{' '}
                    {selectedMemory.sourceMemoryType}
                  </div>
                ) : null}
              </div>
              {selectedMemory.tags?.length ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {selectedMemory.tags.map((tag) => (
                    <span
                      key={`detail-${selectedMemory.id}-${tag}`}
                      className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {selectedMemory?.resources?.length ? (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-800">Linked resources</h3>
              <div className="grid gap-3 md:grid-cols-2">
                {selectedMemory.resources.map((resource) => (
                  <a
                    key={`${selectedMemory.id}-${resource.url}`}
                    className="overflow-hidden rounded-lg border border-gray-200 bg-white transition-shadow hover:shadow-sm"
                    href={resource.url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {resource.type === 'IMAGE' ? (
                      <img
                        alt={resource.title || selectedMemory.title || selectedMemory.name}
                        className="h-40 w-full object-cover"
                        src={resource.url}
                      />
                    ) : null}
                    <div className="p-3 text-xs text-gray-600">
                      <div className="font-medium text-gray-800">
                        {resource.title || resource.type || 'Resource'}
                      </div>
                      <div className="mt-1 truncate">{resource.url}</div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          ) : null}

          <div className="markdown-body p-6">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {selectedMemory?.content || ''}
            </ReactMarkdown>
          </div>
        </div>
      </Modal>
    </div>
  );
}

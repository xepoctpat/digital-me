'use client';

import { useState } from 'react';
import type { UploadProps } from 'antd';
import { Upload, Input, Button, Modal, message } from 'antd';
import {
  CheckCircleFilled,
  InboxOutlined,
  FileOutlined,
  FolderOutlined,
  DesktopOutlined
} from '@ant-design/icons';
import {
  previewMemoryImports,
  type MemoryImportPreviewFile,
  type MemoryImportPreviewResponse,
  uploadMemory
} from '@/service/memory';
import { EVENT } from '@/utils/event';

interface UploadMemoriesProps {
  onFileUpload: (files: File[]) => void;
}

type UploadSelectionSource = 'file' | 'folder';

const { TextArea } = Input;

// Use regular components instead of styled-components
const GlobalStyle: React.FC<{ children?: React.ReactNode }> = ({
  children
}: {
  children?: React.ReactNode;
}) => (
  <div className="[&_.custom-message-success_.ant-message-notice-content]:bg-[#f6ffed] [&_.custom-message-success_.ant-message-notice-content]:border [&_.custom-message-success_.ant-message-notice-content]:border-[#b7eb8f] [&_.custom-message-success_.ant-message-notice-content]:rounded [&_.custom-message-success_.ant-message-notice-content]:p-2 [&_.custom-message-success_.ant-message-notice-content]:shadow-md">
    {children}
  </div>
);

const UploadTypeContainer: React.FC<{ children: React.ReactNode }> = ({
  children
}: {
  children: React.ReactNode;
}) => <div className="flex w-full gap-2 mb-4">{children}</div>;

interface UploadTypeBoxProps {
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  handleClick?: () => void;
}

const UploadTypeBox: React.FC<UploadTypeBoxProps> = ({
  active,
  disabled,
  children,
  handleClick
}: UploadTypeBoxProps) => (
  <div
    className={`
      flex-1 p-4 rounded-lg cursor-pointer flex flex-col items-center gap-2 transition-all duration-300
      ${disabled ? 'opacity-50 pointer-events-none' : 'opacity-100'}
      ${
        active
          ? 'bg-gradient-to-b from-[#F8FAFF] to-[#EEF3FF] border border-[#4080FF] shadow-[0_2px_8px_rgba(64,128,255,0.15)]'
          : 'bg-white border border-[#E5E6EB] hover:border-[#4080FF] hover:bg-[#F8F9FC] hover:shadow-[0_2px_6px_rgba(0,0,0,0.05)]'
      }
      [&_.icon]:text-2xl [&_.icon]:${active ? 'text-[#4080FF]' : 'text-[#86909C]'}
      [&_.text]:text-sm [&_.text]:font-medium [&_.text]:${active ? 'text-[#4080FF]' : 'text-[#4E5969]'}
    `}
    onClick={handleClick}
  >
    {children}
  </div>
);

interface TabContentProps {
  isTextArea?: boolean;
  children: React.ReactNode;
}

const TabContent: React.FC<TabContentProps> = ({ isTextArea, children }: TabContentProps) => (
  <div
    className={`
    bg-white rounded-lg p-4 shadow-[0_4px_16px_rgba(0,0,0,0.08)]
    ${isTextArea ? 'min-h-[240px] items-start' : 'min-h-[200px] items-center'}
    flex justify-center border border-[#F0F0F0]
  `}
  >
    {children}
  </div>
);

const UploadArea: React.FC<{ children: React.ReactNode }> = ({
  children
}: {
  children: React.ReactNode;
}) => (
  <div
    className="
    border-2 border-dashed border-[#E5E6EB] rounded-lg bg-[#FAFBFC] p-6 text-center cursor-pointer transition-all duration-300 w-full
    hover:border-[#4080FF] hover:bg-[#F5F8FF] hover:shadow-[0_0_0_4px_rgba(64,128,255,0.08)]
    [&_.upload-icon]:text-2xl [&_.upload-icon]:text-[#4080FF] [&_.upload-icon]:mb-2
    [&_.upload-text]:text-[#4E5969] [&_.upload-text]:mb-1 [&_.upload-text]:font-medium
    [&_.browse-link]:text-[#4080FF] [&_.browse-link]:font-medium [&_.browse-link]:no-underline hover:[&_.browse-link]:underline
    [&_.file-types]:text-[#86909C] [&_.file-types]:text-xs [&_.file-types]:mt-2
  "
  >
    {children}
  </div>
);

const TextContainer: React.FC<{ children: React.ReactNode }> = ({
  children
}: {
  children: React.ReactNode;
}) => <div className="flex flex-col gap-3 w-full h-full">{children}</div>;

const SaveButton: React.FC<React.ComponentProps<typeof Button>> = (props) => (
  <Button
    {...props}
    className="self-start px-4 h-8 flex items-center justify-center rounded-lg shadow-sm hover:shadow-md transition-all duration-300 font-medium bg-gradient-to-r from-[#4080FF] to-[#3A75E6] hover:from-[#3A75E6] hover:to-[#3369D3]"
  />
);

export default function UploadMemories({ onFileUpload }: UploadMemoriesProps): JSX.Element {
  const [text, setText] = useState('');
  const [activeTab, setActiveTab] = useState('text');
  const [previewData, setPreviewData] = useState<MemoryImportPreviewResponse | null>(null);
  const [previewFiles, setPreviewFiles] = useState<File[]>([]);
  const [previewSource, setPreviewSource] = useState<UploadSelectionSource>('file');
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isImportingSelection, setIsImportingSelection] = useState(false);

  const showSuccessMessage = (count = 1) => {
    message.success({
      content:
        count === 1 ? 'Successfully imported 1 file' : `Successfully imported ${count} files`,
      icon: <CheckCircleFilled style={{ color: '#52c41a' }} />,
      className: 'custom-message-success'
    });
  };

  const getErrorMessage = (error: unknown) => {
    return error instanceof Error ? error.message : 'Upload failed';
  };

  const createUploadFormData = (file: File) => {
    const formData = new FormData();
    const sanitizedFile = new File([file], file.name, { type: file.type });

    formData.append('file', sanitizedFile);

    return formData;
  };

  const createPreviewFormData = (files: File[]) => {
    const formData = new FormData();

    files.forEach((file) => {
      formData.append('files', new File([file], file.name, { type: file.type }));
    });

    return formData;
  };

  const uploadSingleFile = async (file: File) => {
    const response = await uploadMemory(createUploadFormData(file));

    if (response.data.code !== 0) {
      throw new Error(response.data.message);
    }

    return response.data.data;
  };

  const resetPreviewState = () => {
    setPreviewData(null);
    setPreviewFiles([]);
    setPreviewSource('file');
    setIsPreviewVisible(false);
    setIsPreviewLoading(false);
    setIsImportingSelection(false);
  };

  const formatDisplayDate = (value?: string | null) => {
    if (!value) {
      return '—';
    }

    const normalizedValue =
      value.includes(' ') && !value.includes('T') ? value.replace(' ', 'T') : value;
    const parsedDate = new Date(normalizedValue);

    return Number.isNaN(parsedDate.getTime()) ? value : parsedDate.toLocaleString();
  };

  const handlePreviewSelection = async (files: File[], source: UploadSelectionSource) => {
    if (!files.length) {
      return;
    }

    setPreviewFiles(files);
    setPreviewSource(source);
    setPreviewData(null);
    setIsPreviewVisible(true);
    setIsPreviewLoading(true);

    try {
      const response = await previewMemoryImports(createPreviewFormData(files));

      if (response.data.code !== 0) {
        throw new Error(response.data.message);
      }

      setPreviewData(response.data.data);
    } catch (error: unknown) {
      resetPreviewState();
      message.error(`Could not generate an import preview: ${getErrorMessage(error)}`);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleConfirmPreviewImport = async () => {
    if (!previewData) {
      return;
    }

    const importableEntries = previewData.files.filter((preview) => preview.can_import);

    if (!importableEntries.length) {
      message.warning('No files in this selection are safe to import yet.');

      return;
    }

    setIsImportingSelection(true);

    const successfulFiles: File[] = [];
    const failedFiles: string[] = [];

    for (const previewEntry of importableEntries) {
      const selectedIndex = previewEntry.selection_index;
      const fileToImport =
        typeof selectedIndex === 'number' ? previewFiles[selectedIndex] : undefined;

      if (!fileToImport) {
        failedFiles.push(previewEntry.name);

        continue;
      }

      try {
        await uploadSingleFile(fileToImport);
        successfulFiles.push(fileToImport);
      } catch (error: unknown) {
        message.warning(`${fileToImport.name} was not imported: ${getErrorMessage(error)}`);
        failedFiles.push(fileToImport.name);
      }
    }

    if (successfulFiles.length) {
      dispatchEvent(new Event(EVENT.REFRESH_MEMORIES));
      onFileUpload(successfulFiles);
      showSuccessMessage(successfulFiles.length);
    }

    if (!successfulFiles.length && failedFiles.length) {
      message.error('No files were imported from this selection.');
    } else if (failedFiles.length) {
      message.warning(
        `Imported ${successfulFiles.length} file(s); ${failedFiles.length} failed during commit.`
      );
    }

    resetPreviewState();
  };

  const handleTextSubmit = async () => {
    if (text.trim()) {
      const blob = new Blob([text], { type: 'text/plain' });
      const file = new File([blob], `note_${new Date().getTime()}.txt`, {
        type: 'text/plain'
      });

      try {
        await uploadSingleFile(file);

        dispatchEvent(new Event(EVENT.REFRESH_MEMORIES));
        onFileUpload([file]);
        showSuccessMessage();
        setText('');
      } catch (error: unknown) {
        message.error(`Upload failed: ${getErrorMessage(error)}`);
      }
    }
  };

  // Single file upload configuration
  const fileProps: UploadProps = {
    multiple: false,
    showUploadList: false,
    beforeUpload: (file) => {
      void handlePreviewSelection([file as File], 'file');

      return Upload.LIST_IGNORE;
    }
  };

  // Configuration for folder upload
  const folderProps: UploadProps = {
    multiple: true,
    showUploadList: false,
    directory: true,
    beforeUpload: (file, fileList) => {
      if (file.uid !== fileList[0]?.uid) {
        return Upload.LIST_IGNORE;
      }

      void handlePreviewSelection(fileList as File[], 'folder');

      return Upload.LIST_IGNORE;
    }
  };

  const renderPreviewCard = (preview: MemoryImportPreviewFile, index: number) => {
    return (
      <div
        key={`${preview.name}-${index}`}
        className={`rounded-xl border p-4 ${preview.can_import ? 'border-gray-200 bg-white' : 'border-amber-200 bg-amber-50/60'}`}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-gray-900">{preview.title}</div>
            <div className="text-xs text-gray-500">{preview.relative_path || preview.name}</div>
          </div>
          <div className="text-xs font-medium text-gray-500">{preview.size_label}</div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] font-medium">
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-700">
            {preview.is_hosted_export ? 'Hosted export' : 'Standard file'}
          </span>
          {preview.source_memory_type ? (
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700">
              {preview.source_memory_type}
            </span>
          ) : null}
          {preview.source_export_kind ? (
            <span className="rounded-full bg-purple-50 px-2 py-0.5 text-purple-700">
              {preview.source_export_kind}
            </span>
          ) : null}
          {preview.is_duplicate ? (
            <span className="rounded-full bg-rose-50 px-2 py-0.5 text-rose-700">
              Duplicate locally
            </span>
          ) : null}
          {preview.has_batch_name_conflict ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">
              Name conflict in selection
            </span>
          ) : null}
          {!preview.supported ? (
            <span className="rounded-full bg-red-50 px-2 py-0.5 text-red-700">Unsupported</span>
          ) : null}
        </div>

        <div className="mt-3 grid gap-2 text-xs text-gray-600 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <span className="font-semibold text-gray-700">Tags:</span> {preview.tag_count}
          </div>
          <div>
            <span className="font-semibold text-gray-700">Source dates:</span>{' '}
            {preview.source_date_count}
          </div>
          <div>
            <span className="font-semibold text-gray-700">Resources:</span>{' '}
            {preview.linked_resource_count}
          </div>
          <div>
            <span className="font-semibold text-gray-700">Created:</span>{' '}
            {formatDisplayDate(preview.source_created_time)}
          </div>
        </div>

        {preview.tags.length ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {preview.tags.slice(0, 6).map((tag) => (
              <span
                key={`${preview.name}-${tag}`}
                className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700"
              >
                {tag}
              </span>
            ))}
            {preview.tags.length > 6 ? (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                +{preview.tags.length - 6}
              </span>
            ) : null}
          </div>
        ) : null}

        {preview.content_preview ? (
          <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-xs leading-5 text-gray-600">
            {preview.content_preview}
          </p>
        ) : null}

        {preview.warnings.length ? (
          <ul className="mt-3 space-y-1 text-xs text-amber-700">
            {preview.warnings.map((warning) => (
              <li key={`${preview.name}-${warning}`} className="flex gap-2">
                <span>•</span>
                <span>{warning}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  };

  const uploadTypes = [
    { key: 'text', icon: <FileOutlined className="icon" />, text: 'Text', disabled: false },
    { key: 'file', icon: <InboxOutlined className="icon" />, text: 'File', disabled: false },
    { key: 'folder', icon: <FolderOutlined className="icon" />, text: 'Folder', disabled: false },
    {
      key: 'software',
      icon: <DesktopOutlined className="icon" />,
      text: 'Software Integration',
      disabled: true
    },
    {
      key: 'wearable',
      icon: (
        <svg
          aria-hidden="true"
          className="icon"
          fill="currentColor"
          height="1em"
          viewBox="0 0 24 24"
          width="1em"
        >
          <path d="M6 10c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm12-6c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm-6-5.99h-2v2h2v-2z" />
        </svg>
      ),
      text: 'Wearable Integration',
      disabled: true
    }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'text':
        return (
          <TabContent isTextArea>
            <TextContainer>
              <TextArea
                className="hover:border-[#4080FF] focus:border-[#4080FF] focus:shadow-[0_0_0_2px_rgba(64,128,255,0.2),inset_0_2px_4px_rgba(0,0,0,0.03)] flex-1"
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter your text here..."
                style={{
                  resize: 'none',
                  minHeight: '180px',
                  padding: '16px',
                  fontSize: '14px',
                  lineHeight: '1.6',
                  border: '1px solid #E5E6EB',
                  borderRadius: '12px',
                  backgroundColor: '#FAFAFA',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.03)',
                  transition: 'all 0.3s ease'
                }}
                value={text}
              />
              <SaveButton onClick={handleTextSubmit} size="large" type="primary">
                Save Text
              </SaveButton>
            </TextContainer>
          </TabContent>
        );
      case 'file':
        return (
          <TabContent>
            <Upload {...fileProps}>
              <UploadArea>
                <div className="upload-icon">
                  <InboxOutlined style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.1))' }} />
                </div>
                <div className="upload-text">
                  Drag and drop file, or <span className="browse-link">Browse</span>
                </div>
                <div className="file-types">Supports PDF, TXT, MARKDOWN, Max 15MB each.</div>
              </UploadArea>
            </Upload>
          </TabContent>
        );
      case 'folder':
        return (
          <TabContent>
            <Upload {...folderProps}>
              <UploadArea>
                <div className="upload-icon">
                  <FolderOutlined style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.1))' }} />
                </div>
                <div className="upload-text">
                  Drag and drop folder, or <span className="browse-link">Browse</span>
                </div>
                <div className="file-types">Supports TXT, MARKDOWN, PDF. Max 15MB each.</div>
              </UploadArea>
            </Upload>
          </TabContent>
        );
      case 'software':
      case 'wearable':
        return (
          <TabContent>
            <div style={{ textAlign: 'center', color: '#86909C' }}>
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} upload coming soon
            </div>
          </TabContent>
        );
      default:
        return null;
    }
  };

  const previewImportDisabled =
    isPreviewLoading || !previewData || previewData.summary.importable_files === 0;
  const previewImportButtonProps = { disabled: previewImportDisabled };

  return (
    <>
      <GlobalStyle />
      <div className="p-1">
        <div className="mb-2 text-[15px] font-medium text-gray-700">Upload Method</div>
        <UploadTypeContainer>
          {uploadTypes.map((type) => (
            <UploadTypeBox
              key={type.key}
              active={activeTab === type.key}
              disabled={type.disabled}
              handleClick={() => !type.disabled && setActiveTab(type.key)}
            >
              {type.icon}
              <span className="text">{type.text}</span>
            </UploadTypeBox>
          ))}
        </UploadTypeContainer>
        {renderContent()}
      </div>

      <Modal
        cancelButtonProps={{ disabled: isImportingSelection }}
        cancelText="Cancel"
        confirmLoading={isImportingSelection}
        okButtonProps={previewImportButtonProps}
        okText={
          previewData
            ? `Import ${previewData.summary.importable_files} file${previewData.summary.importable_files === 1 ? '' : 's'}`
            : 'Import'
        }
        onCancel={() => !isImportingSelection && resetPreviewState()}
        onOk={() => void handleConfirmPreviewImport()}
        open={isPreviewVisible}
        title={previewSource === 'folder' ? 'Review folder import' : 'Review file import'}
        width={920}
      >
        {isPreviewLoading ? (
          <div className="py-12 text-center text-sm text-gray-500">Generating import preview…</div>
        ) : previewData ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    Preview hosted-export metadata before commit
                  </h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Review duplicate warnings, name collisions, dates, tags, and linked resources
                    before these files touch local state.
                  </p>
                </div>
                <div className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700">
                  {previewData.summary.importable_files} importable /{' '}
                  {previewData.summary.total_files} selected
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-lg bg-white p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Notes
                  </div>
                  <div className="mt-1 text-lg font-semibold text-gray-900">
                    {previewData.summary.note_count}
                  </div>
                </div>
                <div className="rounded-lg bg-white p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Tags
                  </div>
                  <div className="mt-1 text-lg font-semibold text-gray-900">
                    {previewData.summary.tag_count}
                  </div>
                </div>
                <div className="rounded-lg bg-white p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Source dates
                  </div>
                  <div className="mt-1 text-lg font-semibold text-gray-900">
                    {previewData.summary.source_date_count}
                  </div>
                </div>
                <div className="rounded-lg bg-white p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Linked resources
                  </div>
                  <div className="mt-1 text-lg font-semibold text-gray-900">
                    {previewData.summary.linked_resource_count}
                  </div>
                </div>
              </div>

              {previewData.summary.blocked_files > 0 ? (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  {previewData.summary.blocked_files} file
                  {previewData.summary.blocked_files === 1 ? '' : 's'} will be blocked unless you
                  fix the warnings first.
                  {previewData.summary.name_conflict_files > 0 ? (
                    <span>
                      {' '}
                      The most serious current hazard is filename collision inside the selected
                      batch.
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
              {previewData.files.map((preview, index) => renderPreviewCard(preview, index))}
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}

import { updateModelConfig, type IBaseModelParams } from '../../service/modelConfig';
import { useModelConfigStore } from '../../store/useModelConfigStore';
import { Input, Modal, Radio } from 'antd';
import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { QuestionCircleOutlined } from '@ant-design/icons';

interface IProps {
  open: boolean;
  onClose: () => void;
}

const OLLAMA_LOCAL_BASE_URL = 'http://127.0.0.1:11434/v1';
const OLLAMA_DOCKER_BASE_URL = 'http://host.docker.internal:11434/v1';
const OLLAMA_PLACEHOLDER_API_KEY = 'ollama';

const ensureOllamaConfig = (
  config: IBaseModelParams,
  endpoint?: string
): IBaseModelParams => {
  const sharedKey =
    config.chat_api_key ||
    config.embedding_api_key ||
    config.key ||
    OLLAMA_PLACEHOLDER_API_KEY;
  const resolvedEndpoint =
    endpoint ||
    config.chat_endpoint ||
    config.embedding_endpoint ||
    OLLAMA_LOCAL_BASE_URL;

  return {
    ...config,
    provider_type: 'ollama',
    key: sharedKey,
    chat_api_key: sharedKey,
    embedding_api_key: sharedKey,
    chat_endpoint: resolvedEndpoint,
    embedding_endpoint: resolvedEndpoint
  };
};

const options = [
  {
    label: 'None',
    value: ''
  },
  {
    label: 'OpenAI',
    value: 'openai'
  },
  {
    label: 'Ollama',
    value: 'ollama'
  },
  {
    label: 'Custom',
    value: 'litellm'
  }
];

const ModelConfigModal = (props: IProps) => {
  const { open, onClose } = props;
  const modelConfig = useModelConfigStore((store) => store.modelConfig);
  const baseModelConfig = useModelConfigStore((store) => store.baseModelConfig);
  const updateBaseModelConfig = useModelConfigStore((store) => store.updateBaseModelConfig);
  const fetchModelConfig = useModelConfigStore((store) => store.fetchModelConfig);
  const localProviderType = useModelConfigStore((store) => store.modelConfig.provider_type);
  const [modelType, setModelType] = useState<string>('');

  useEffect(() => {
    if (open) {
      fetchModelConfig();
    }
  }, [open]);

  useEffect(() => {
    setModelType(localProviderType);
  }, [localProviderType]);

  const renderEmpty = () => {
    return (
      <div className="flex flex-col items-center">
        <Image
          alt="SecondMe Logo"
          className="object-contain"
          height={40}
          src="/images/single_logo.png"
          width={120}
        />
        <div className="text-gray-500 text-[18px] leading-[32px]">
          Please Choose OpenAI, Ollama, or Custom
        </div>
      </div>
    );
  };

  const renderOpenai = useCallback(() => {
    return (
      <div className="flex flex-col w-full gap-4">
        <div className="p-4 border rounded-lg hover:shadow-md transition-shadow">
          <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
          <Input.Password
            onChange={(e) => {
              updateBaseModelConfig({ ...baseModelConfig, key: e.target.value });
            }}
            placeholder="Enter your OpenAI API key"
            value={baseModelConfig.key}
          />
          <div className="mt-2 text-sm text-gray-500">
            You can get your API key from{' '}
            <a
              className="text-blue-500 hover:underline"
              href="https://platform.openai.com/settings/organization/api-keys"
              rel="noopener noreferrer"
              target="_blank"
            >
              OpenAI API Keys page
            </a>
            .
          </div>
        </div>
      </div>
    );
  }, [baseModelConfig]);

  const applyOllamaPreset = useCallback(
    (endpoint: string) => {
      updateBaseModelConfig(ensureOllamaConfig(baseModelConfig, endpoint));
    },
    [baseModelConfig, updateBaseModelConfig]
  );

  const renderOllama = useCallback(() => {
    const ollamaBaseUrl =
      baseModelConfig.chat_endpoint ||
      baseModelConfig.embedding_endpoint ||
      OLLAMA_LOCAL_BASE_URL;

    return (
      <div className="flex flex-col w-full gap-6 p-4">
        <div className="p-4 rounded-lg border border-blue-100 bg-blue-50 text-sm text-gray-600">
          <div className="font-medium text-gray-800">Ollama gives Second Me a simple local model server.</div>
          <div className="mt-1">
            Start the service with <code>ollama serve</code>, then pull the chat and embedding models you want Second Me
            to use.
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Example: <code>ollama pull qwen2.5:1.5b</code> and <code>ollama pull snowflake-arctic-embed:110m</code>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              className="px-3 py-1.5 text-xs font-medium rounded-md border border-blue-200 bg-white text-blue-700 hover:bg-blue-100 transition-colors"
              onClick={() => applyOllamaPreset(OLLAMA_LOCAL_BASE_URL)}
              type="button"
            >
              Second Me runs locally
            </button>
            <button
              className="px-3 py-1.5 text-xs font-medium rounded-md border border-blue-200 bg-white text-blue-700 hover:bg-blue-100 transition-colors"
              onClick={() => applyOllamaPreset(OLLAMA_DOCKER_BASE_URL)}
              type="button"
            >
              Second Me runs in Docker
            </button>
            <a
              className="px-3 py-1.5 text-xs font-medium rounded-md border border-blue-200 bg-white text-blue-700 hover:bg-blue-100 transition-colors"
              href="https://ollama.com/library"
              rel="noopener noreferrer"
              target="_blank"
            >
              Ollama model library
            </a>
          </div>
        </div>

        <div className="p-4 border rounded-lg hover:shadow-md transition-shadow">
          <label className="block text-sm font-medium text-gray-700 mb-1">Base URL</label>
          <Input
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            className="w-full"
            onChange={(e) => {
              updateBaseModelConfig(
                ensureOllamaConfig(
                  {
                    ...baseModelConfig,
                    chat_endpoint: e.target.value,
                    embedding_endpoint: e.target.value
                  },
                  e.target.value
                )
              );
            }}
            placeholder={OLLAMA_LOCAL_BASE_URL}
            spellCheck="false"
            value={ollamaBaseUrl}
          />
          <div className="mt-2 text-sm text-gray-500">
            Use <code>127.0.0.1</code> when the Second Me backend runs locally. Use <code>host.docker.internal</code>{' '}
            when the backend runs inside Docker.
          </div>
        </div>

        <div className="p-4 border rounded-lg hover:shadow-md transition-shadow">
          <label className="block text-sm font-medium text-gray-700 mb-1">Chat</label>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col">
              <div className="text-sm font-medium text-gray-700 mb-1">Model Name</div>
              <Input
                autoCapitalize="off"
                autoComplete="off"
                autoCorrect="off"
                className="w-full"
                onChange={(e) => {
                  updateBaseModelConfig(ensureOllamaConfig({ ...baseModelConfig, chat_model_name: e.target.value }));
                }}
                placeholder="Example: qwen2.5:1.5b"
                spellCheck="false"
                value={baseModelConfig.chat_model_name}
              />
            </div>
          </div>
        </div>

        <div className="p-4 border rounded-lg hover:shadow-md transition-shadow">
          <label className="block text-sm font-medium text-gray-700 mb-1">Embedding</label>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col">
              <div className="text-sm font-medium text-gray-700 mb-1">Model Name</div>
              <Input
                autoCapitalize="off"
                autoComplete="off"
                autoCorrect="off"
                className="w-full"
                onChange={(e) => {
                  updateBaseModelConfig(
                    ensureOllamaConfig({ ...baseModelConfig, embedding_model_name: e.target.value })
                  );
                }}
                placeholder="Example: snowflake-arctic-embed:110m"
                spellCheck="false"
                value={baseModelConfig.embedding_model_name}
              />
            </div>
          </div>

          <div className="mt-4 text-sm text-gray-500">
            Ollama does not require a real API key here; Second Me stores a local placeholder automatically.
          </div>
        </div>
      </div>
    );
  }, [applyOllamaPreset, baseModelConfig, updateBaseModelConfig]);

  const renderCustom = useCallback(() => {
    return (
      <div className="flex flex-col w-full gap-6 p-4">
        <div className="p-4 border rounded-lg hover:shadow-md transition-shadow">
          <label className="block text-sm font-medium text-gray-700 mb-1">Chat</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col">
              <div className="text-sm font-medium text-gray-700 mb-1">Model Name</div>
              <Input
                autoCapitalize="off"
                autoComplete="off"
                autoCorrect="off"
                className="w-full"
                data-form-type="other"
                onChange={(e) => {
                  updateBaseModelConfig({ ...baseModelConfig, chat_model_name: e.target.value });
                }}
                spellCheck="false"
                value={baseModelConfig.chat_model_name}
              />
            </div>

            <div className="flex flex-col">
              <div className="text-sm font-medium text-gray-700 mb-1">API Key</div>
              <Input.Password
                autoCapitalize="off"
                autoComplete="new-password"
                autoCorrect="off"
                className="w-full"
                data-form-type="other"
                onChange={(e) => {
                  updateBaseModelConfig({ ...baseModelConfig, chat_api_key: e.target.value });
                }}
                spellCheck="false"
                value={baseModelConfig.chat_api_key}
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">API Endpoint</label>
            <Input
              autoComplete="off"
              className="w-full"
              onChange={(e) => {
                updateBaseModelConfig({ ...baseModelConfig, chat_endpoint: e.target.value });
              }}
              value={baseModelConfig.chat_endpoint}
            />
          </div>
        </div>

        <div className="p-4 border rounded-lg hover:shadow-md transition-shadow">
          <label className="block text-sm font-medium text-gray-700 mb-1">Embedding</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Model Name</label>
              <Input
                className="w-full"
                onChange={(e) => {
                  updateBaseModelConfig({
                    ...baseModelConfig,
                    embedding_model_name: e.target.value
                  });
                }}
                value={baseModelConfig.embedding_model_name}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
              <Input.Password
                className="w-full"
                onChange={(e) => {
                  updateBaseModelConfig({ ...baseModelConfig, embedding_api_key: e.target.value });
                }}
                value={baseModelConfig.embedding_api_key}
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">API Endpoint</label>
            <Input
              className="w-full"
              onChange={(e) => {
                updateBaseModelConfig({ ...baseModelConfig, embedding_endpoint: e.target.value });
              }}
              value={baseModelConfig.embedding_endpoint}
            />
          </div>
        </div>
      </div>
    );
  }, [baseModelConfig, updateBaseModelConfig]);

  const handleUpdate = () => {
    updateModelConfig(modelConfig)
      .then((res) => {
        if (res.data.code == 0) {
          onClose();
        } else {
          throw new Error(res.data.message);
        }
      })
      .catch((error) => {
        console.error(error.message || 'Failed to update model config');
      });
  };

  const renderMainContent = useCallback(() => {
    if (!modelType) {
      return renderEmpty();
    }

    if (modelType === 'openai') {
      return renderOpenai();
    }

    if (modelType === 'ollama') {
      return renderOllama();
    }

    return renderCustom();
  }, [modelType, renderOpenai, renderOllama, renderCustom]);

  return (
    <Modal
      centered
      destroyOnClose
      okButtonProps={{ disabled: !modelType }}
      onCancel={onClose}
      onOk={handleUpdate}
      open={open}
      title={
        <div className="flex items-center gap-2">
          <div className="text-xl font-semibold leading-6 text-gray-900">
            Support Model Configuration
          </div>
          <a
            className="text-gray-500 hover:text-gray-700"
            href="https://secondme.gitbook.io/secondme/guides/create-second-me/support-model-config"
            rel="noreferrer"
            target="_blank"
          >
            <QuestionCircleOutlined />
          </a>
        </div>
      }
    >
      <div className="flex flex-col items-center">
        <div className="flex flex-col items-center gap-2">
          <p className="mb-1 text-sm text-gray-500">
            Configure models used for training data synthesis for Second Me, and as external
            reference models that Second Me can consult during usage.
          </p>
          <Radio.Group
            buttonStyle="solid"
            onChange={(e) => {
              const nextProviderType = e.target.value;

              setModelType(nextProviderType);

              if (nextProviderType === 'ollama') {
                updateBaseModelConfig(ensureOllamaConfig({ ...baseModelConfig, provider_type: nextProviderType }));

                return;
              }

              updateBaseModelConfig({ ...baseModelConfig, provider_type: nextProviderType });
            }}
            optionType="button"
            options={options}
            value={modelType ? modelType : ''}
          />
        </div>
        <div className="w-full border-t border-gray-200 mt-1 mb-2" />
        {renderMainContent()}
        <div className="w-full border-t border-gray-200 mt-4" />
      </div>
    </Modal>
  );
};

export default ModelConfigModal;

'use client';

import { Badge, Button, Input } from 'antd';
import { CheckCircleFilled, CopyOutlined } from '@ant-design/icons';
import { useState, useMemo } from 'react';
import { useLoadInfoStore } from '@/store/useLoadInfoStore';
import { copyToClipboard } from '@/utils/copy';
import {
  PUBLIC_NETWORK_ENABLED,
  getLocalChatApiUrl,
  getPublicChatApiUrl
} from '@/utils/networkMode';

const SecondMeChatAPI = () => {
  const [copied, setCopied] = useState(false);
  const loadInfo = useLoadInfoStore((state) => state.loadInfo);
  const isRegistered = useMemo(() => {
    return loadInfo?.status === 'online';
  }, [loadInfo]);
  const endpoint = useMemo(() => {
    return PUBLIC_NETWORK_ENABLED
      ? getPublicChatApiUrl(loadInfo?.instance_id)
      : getLocalChatApiUrl();
  }, [loadInfo?.instance_id]);

  const referenceUrl = useMemo(() => {
    return PUBLIC_NETWORK_ENABLED
      ? 'https://github.com/mindverse/Second-Me/blob/master/docs/Public%20Chat%20API.md'
      : 'https://github.com/mindverse/Second-Me/blob/master/docs/Local%20Chat%20API.md';
  }, []);

  const handleCopyEndpoint = () => {
    copyToClipboard(endpoint)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        console.error('Failed to copy endpoint');
      });
  };

  return (
    <div className="space-y-4">
      <div className="bg-[#FEFCFB] border border-solid border-gray-200 rounded-md shadow-sm">
        <div className="flex items-center justify-between gap-2 p-4">
          <div className="flex items-center text-center gap-2">
            <div className="bg-blue-50 rounded-md p-2">⚡️</div>
            <div className="font-extrabold text-xl">Second Me Chat API</div>
          </div>
          <div className="flex items-center">
            <Badge
              status={PUBLIC_NETWORK_ENABLED ? (isRegistered ? 'success' : 'error') : 'processing'}
            />
            {PUBLIC_NETWORK_ENABLED ? (
              isRegistered ? (
                <div className="ml-2 text-[#5EC268] font-medium">PUBLIC MODE</div>
              ) : (
                <div className="ml-2 text-[#ff4d4f] font-medium">NOT IN SERVICE</div>
              )
            ) : (
              <div className="ml-2 text-[#1677ff] font-medium">LOCAL MODE</div>
            )}
          </div>
        </div>
        <div className="border-b border-gray-200" />
        <div className="p-4 bg-[#F8F9FA]">
          <div className="text-sm font-medium mb-2">Chat Endpoint</div>
          <div className="flex items-center mb-2">
            <Input
              className="font-mono"
              readOnly
              suffix={
                <div
                  className="ml-2 cursor-pointer flex items-center justify-center hover:bg-gray-100 p-1 rounded-md transition-colors"
                  onClick={handleCopyEndpoint}
                >
                  {copied ? <CheckCircleFilled className="text-[#5EC268]" /> : <CopyOutlined />}
                </div>
              }
              value={endpoint}
            />
          </div>
        </div>

        <div className="border-b border-gray-200" />
        <div className="flex p-4">
          <Button
            className="min-w-[160px] flex items-center justify-center"
            icon={<span className="mr-2">📄</span>}
            onClick={() => {
              window.open(referenceUrl, '_blank');
            }}
            size="large"
          >
            {PUBLIC_NETWORK_ENABLED ? 'Public API Reference' : 'Local API Reference'}
          </Button>
        </div>
      </div>

      <div className="bg-[#FEFCFB] flex flex-col border border-solid border-gray-200 rounded-md shadow-sm p-4 gap-4">
        <div className="text-lg font-medium">Second Me Chat API Documentation</div>
        <div className="text-sm">
          {PUBLIC_NETWORK_ENABLED
            ? 'This public API is used to create chat completions, process provided messages, and generate responses for your published Second Me. The API supports streaming responses and is compatible with OpenAI format.'
            : 'This local API lets you inspect and test your own Second Me privately on your machine before you enable any public network exposure.'}
        </div>
      </div>
    </div>
  );
};

export default SecondMeChatAPI;

'use client';

import { useLoadInfoStore } from '@/store/useLoadInfoStore';
import { copyToClipboard } from '@/utils/copy';
import { Modal, message } from 'antd';
import { useEffect, useState } from 'react';
import { PRIVATE_MODE_MESSAGE, PUBLIC_NETWORK_ENABLED, getPublicAppUrl } from '@/utils/networkMode';

interface ShareRoleModalProps {
  open: boolean;
  onClose: () => void;
  uuid: string;
  isRegistered: boolean;
}

export default function ShareRoleModal({ open, onClose, uuid, isRegistered }: ShareRoleModalProps) {
  const [shareUrl, setShareUrl] = useState('');
  const loadInfo = useLoadInfoStore((state) => state.loadInfo);

  useEffect(() => {
    if (!PUBLIC_NETWORK_ENABLED) {
      setShareUrl('');

      return;
    }

    if (isRegistered) {
      if (!loadInfo) {
        message.error('Oops, something went wrong');

        return;
      }

      // TODO Later replace with IP address returned from backend
      setShareUrl(getPublicAppUrl(`/role/${loadInfo.name}/${loadInfo.instance_id}/${uuid}`));
    }
  }, [isRegistered, uuid, loadInfo]);

  const handleCopyLink = async () => {
    copyToClipboard(shareUrl)
      .then(() => {
        message.success({
          content: 'Link copied.'
        });
      })
      .catch(() => {
        message.error({
          content: 'Copy failed, please copy manually.'
        });
      });
  };

  return (
    <Modal centered footer={null} onCancel={onClose} open={open} title="Share">
      {!PUBLIC_NETWORK_ENABLED ? (
        <div className="text-center text-gray-600">{PRIVATE_MODE_MESSAGE}</div>
      ) : isRegistered ? (
        <div className="space-y-4">
          <input
            className="w-full px-3 py-2 border rounded-lg bg-gray-50"
            readOnly
            value={shareUrl}
          />
          <button
            className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            onClick={handleCopyLink}
          >
            Copy Link
          </button>
        </div>
      ) : (
        <div className="text-center text-red-500">Please register this Upload before sharing</div>
      )}
    </Modal>
  );
}

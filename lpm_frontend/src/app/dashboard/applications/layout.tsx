'use client';

import RegisterUploadModal from '@/components/upload/RegisterUploadModal';
import { EVENT } from '@/utils/event';
import { Modal } from 'antd';
import { useEffect, useState } from 'react';
import { PRIVATE_MODE_MESSAGE, PUBLIC_NETWORK_ENABLED } from '@/utils/networkMode';

export default function ApplicationsLayout({ children }: { children: React.ReactNode }) {
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);

  useEffect(() => {
    const handleShowRegister = () => {
      setShowRegisterModal(true);
    };

    addEventListener(EVENT.SHOW_REGISTER_MODAL, handleShowRegister);

    return () => {
      removeEventListener(EVENT.SHOW_REGISTER_MODAL, handleShowRegister);
    };
  }, []);

  return (
    <div className="h-full bg-secondme-warm-bg">
      {children}
      {/* Register AI Modal */}
      <Modal
        footer={
          PUBLIC_NETWORK_ENABLED
            ? [
                <button
                  key="close"
                  className="px-4 py-2 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors mr-2"
                  onClick={() => setShowRegisterModal(false)}
                >
                  Cancel
                </button>,
                <button
                  key="register"
                  className="px-4 py-2 text-sm font-medium bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  onClick={() => {
                    setShowRegisterModal(false);
                    setShowPublishModal(true);
                  }}
                >
                  Go to Register
                </button>
              ]
            : [
                <button
                  key="close"
                  className="px-4 py-2 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  onClick={() => setShowRegisterModal(false)}
                >
                  Close
                </button>
              ]
        }
        onCancel={() => setShowRegisterModal(false)}
        open={showRegisterModal}
        title={PUBLIC_NETWORK_ENABLED ? 'AI Registration Required' : 'Private Mode Enabled'}
      >
        <div className="py-4">
          {PUBLIC_NETWORK_ENABLED ? (
            <>
              <p className="text-gray-600 mb-4">
                You need to register (publish) your AI before you can access this feature.
              </p>
              <p className="text-gray-600">
                Registration allows your AI to be fully activated and enables all application
                features.
              </p>
            </>
          ) : (
            <>
              <p className="text-gray-600 mb-4">
                Public-facing network features are currently turned off so you can learn how your
                Second Me behaves locally first.
              </p>
              <p className="text-gray-600">{PRIVATE_MODE_MESSAGE}</p>
            </>
          )}
        </div>
      </Modal>

      {/* Publish Second Me Modal */}
      <RegisterUploadModal
        onClose={() => {
          setShowPublishModal(false);
        }}
        open={showPublishModal}
      />
    </div>
  );
}

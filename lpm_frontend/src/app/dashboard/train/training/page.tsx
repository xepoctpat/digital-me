'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import InfoModal from '@/components/InfoModal';
import type { TrainingConfig } from '@/service/train';
import {
  startTrain,
  stopTrain,
  retrain,
  getTrainingParams,
  checkCudaAvailability,
  resetProgress
} from '@/service/train';
import { useTrainingStore } from '@/store/useTrainingStore';
import { getMemoryList } from '@/service/memory';
import { message, Modal } from 'antd';
import { useModelConfigStore } from '@/store/useModelConfigStore';
import CelebrationEffect from '@/components/Celebration';
import TrainingLog from '@/components/train/TrainingLog';
import TrainingProgress from '@/components/train/TrainingProgress';
import TrainingConfiguration from '@/components/train/TrainingConfiguration';
import GlobalBioPanel from '@/components/train/shades/GlobalBioPanel';
import { ROUTER_PATH } from '@/utils/router';
interface TrainInfo {
  name: string;
  description: string;
  features: string[];
}

const trainInfo: TrainInfo = {
  name: 'Training Process',
  description:
    'Transform your memories into a personalized AI model through a multi-stage training process',
  features: [
    'Automated multi-stage training process',
    'Real-time progress monitoring',
    'Detailed training logs',
    'Training completion notification',
    'Model performance metrics'
  ]
};

const POLLING_INTERVAL = 3000;

interface TrainingDetail {
  message: string;
  timestamp: string;
}

const baseModelOptions = [
  {
    value: 'Qwen2.5-0.5B-Instruct',
    label: 'Qwen2.5-0.5B-Instruct (8GB+ RAM Recommended)'
  },
  {
    value: 'Qwen2.5-1.5B-Instruct',
    label: 'Qwen2.5-1.5B-Instruct (16GB+ RAM Recommended)'
  },
  {
    value: 'Qwen2.5-3B-Instruct',
    label: 'Qwen2.5-3B-Instruct (32GB+ RAM Recommended)'
  },
  {
    value: 'Qwen2.5-7B-Instruct',
    label: 'Qwen2.5-7B-Instruct (64GB+ RAM Recommended)'
  }
];

// Title and explanation section
const pageTitle = 'Training Process';
const pageDescription =
  'Transform your memories into a personalized AI model that thinks and communicates like you.';

export default function TrainingPage(): JSX.Element {
  const checkTrainStatus = useTrainingStore((state) => state.checkTrainStatus);
  const resetTrainingState = useTrainingStore((state) => state.resetTrainingState);
  const trainingError = useTrainingStore((state) => state.error);
  const setStatus = useTrainingStore((state) => state.setStatus);
  const fetchModelConfig = useModelConfigStore((state) => state.fetchModelConfig);
  const modelConfig = useModelConfigStore((store) => store.modelConfig);
  const status = useTrainingStore((state) => state.status);
  const trainingProgress = useTrainingStore((state) => state.trainingProgress);
  const serviceStarted = useTrainingStore((state) => state.serviceStarted);

  const router = useRouter();

  const [selectedInfo, setSelectedInfo] = useState<boolean>(false);
  const isTraining = useTrainingStore((state) => state.isTraining);
  const setIsTraining = useTrainingStore((state) => state.setIsTraining);
  const [trainingParams, setTrainingParams] = useState<TrainingConfig>({} as TrainingConfig);
  const [trainActionLoading, setTrainActionLoading] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showMemoryModal, setShowMemoryModal] = useState(false);

  const cleanupEventSourceRef = useRef<(() => void) | undefined>();
  const containerRef = useRef<HTMLDivElement>(null);
  const firstLoadRef = useRef<boolean>(true);
  const pollingStopRef = useRef<boolean>(false);

  const [cudaAvailable, setCudaAvailable] = useState<boolean>(false);
  const trainSuspended = useTrainingStore((state) => state.trainSuspended);
  const setTrainSuspended = useTrainingStore((state) => state.setTrainSuspended);

  const stopPolling = useCallback(() => {
    pollingStopRef.current = true;
  }, []);

  const startPolling = useCallback(() => {
    if (pollingStopRef.current) {
      return;
    }

    checkTrainStatus()
      .then(() => {
        if (pollingStopRef.current) {
          return;
        }

        setTimeout(() => {
          startPolling();
        }, POLLING_INTERVAL);
      })
      .catch((error) => {
        console.error('Training status check failed:', error);
        stopPolling();
        setIsTraining(false);
        message.error('Training status check failed, monitoring stopped');
      });
  }, [checkTrainStatus, setIsTraining, stopPolling]);

  const startGetTrainingProgress = useCallback(() => {
    pollingStopRef.current = false;
    setStatus('training');
    setIsTraining(true);
    startPolling();
  }, [setIsTraining, setStatus, startPolling]);

  const scrollPageToBottom = useCallback(() => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: 'smooth'
    });

    firstLoadRef.current = false;
  }, []);

  const getDetails = useCallback(() => {
    const eventSource = new EventSource(`/api/trainprocess/logs`);

    eventSource.onmessage = (event) => {
      const logMessage = event.data;

      setTrainingDetails((prev) => {
        const newLogs = [
          ...prev.slice(-500),
          {
            message: logMessage,
            timestamp: new Date().toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            })
          }
        ];

        localStorage.setItem('trainingLogs', JSON.stringify(newLogs));

        return newLogs;
      });
    };

    eventSource.onerror = (error) => {
      console.error('EventSource failed:', error);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const updateTrainLog = useCallback(() => {
    if (cleanupEventSourceRef.current) {
      cleanupEventSourceRef.current();
    }

    cleanupEventSourceRef.current = getDetails();
  }, [getDetails]);

  useEffect(() => {
    fetchModelConfig();
  }, [fetchModelConfig]);

  useEffect(() => {
    // Check CUDA availability once on load
    checkCudaAvailability()
      .then((res) => {
        if (res.data.code === 0) {
          const { cuda_available } = res.data.data;

          setCudaAvailable(cuda_available);
        } else {
          message.error(res.data.message || 'Failed to check CUDA availability');
        }
      })
      .catch((err) => {
        console.error('CUDA availability check failed', err);
        message.error('CUDA availability check failed');
      });
  }, []);

  useEffect(() => {
    if (status === 'trained' || trainingError) {
      stopPolling();
      setIsTraining(false);

      const hasShownTrainingComplete = localStorage.getItem('hasShownTrainingComplete');

      if (hasShownTrainingComplete !== 'true' && status === 'trained' && !trainingError) {
        setTimeout(() => {
          setShowCelebration(true);
          localStorage.setItem('hasShownTrainingComplete', 'true');
        }, 1000);
      }
    }
  }, [setIsTraining, status, stopPolling, trainingError]);

  // Check training status once when component loads
  useEffect(() => {
    // Check if user has at least 3 memories
    const checkMemoryCount = async () => {
      try {
        const memoryResponse = await getMemoryList();

        if (memoryResponse.data.code === 0) {
          const memories = memoryResponse.data.data;

          if (memories.length < 3) {
            // Show modal instead of direct redirect
            setShowMemoryModal(true);

            return;
          }
        }
      } catch (error) {
        console.error('Error checking memory count:', error);
      }

      // Only proceed with training status check if memory check passes
      await checkTrainStatus();
    };

    void checkMemoryCount();
  }, [checkTrainStatus]);

  // Monitor training status changes and manage log connections
  useEffect(() => {
    // If training is in progress, start polling and establish log connection
    if (trainingProgress.status === 'in_progress') {
      setIsTraining(true);

      if (firstLoadRef.current) {
        scrollPageToBottom();

        // On first load, start polling and get training progress.
        startGetTrainingProgress();
      }
    }
    // If training is completed or failed, stop polling
    else if (
      trainingProgress.status === 'completed' ||
      trainingProgress.status === 'failed' ||
      trainingProgress.status === 'suspended'
    ) {
      stopPolling();
      setIsTraining(false);
    }
  }, [scrollPageToBottom, setIsTraining, startGetTrainingProgress, stopPolling, trainingProgress]);

  useEffect(() => {
    if (isTraining) {
      updateTrainLog();
    }
  }, [isTraining, updateTrainLog]);

  // Cleanup when component unmounts
  useEffect(() => {
    return () => {
      stopPolling();
      cleanupEventSourceRef.current?.();
    };
  }, [stopPolling]);

  const [trainingDetails, setTrainingDetails] = useState<TrainingDetail[]>([]);

  //get training params
  useEffect(() => {
    getTrainingParams()
      .then((res) => {
        if (res.data.code === 0) {
          const data = res.data.data;

          setTrainingParams(data);

          localStorage.setItem('trainingParams', JSON.stringify(data));
        } else {
          throw new Error(res.data.message);
        }
      })
      .catch((error) => {
        console.error(error.message);
      });
  }, []);

  useEffect(() => {
    const savedLogs = localStorage.getItem('trainingLogs');

    setTrainingDetails(savedLogs ? JSON.parse(savedLogs) : []);
  }, []);

  const updateTrainingParams = (params: TrainingConfig) => {
    setTrainingParams((state: TrainingConfig) => ({ ...state, ...params }));
  };

  // Handler function for stopping training
  const handleStopTraining = async () => {
    try {
      const res = await stopTrain();

      if (res.data.code === 0) {
        setIsTraining(false);
        setTrainSuspended(true);
      } else {
        message.error(res.data.message || 'Failed to stop training');
      }
    } catch (error) {
      console.error('Error stopping training:', error);
      message.error('Failed to stop training');
    }
  };

  const handleResetProgress = () => {
    setTrainActionLoading(true);

    resetProgress()
      .then((res) => {
        if (res.data.code === 0) {
          setTrainSuspended(false);
          resetTrainingState();
          localStorage.removeItem('trainingLogs');
        } else {
          throw new Error(res.data.message || 'Failed to reset progress');
        }
      })
      .catch((error) => {
        console.error('Error resetting progress:', error);
      })
      .finally(() => {
        setTrainActionLoading(false);
      });
  };

  // Start new training
  const handleStartNewTraining = async () => {
    setIsTraining(true);
    // Clear training logs
    setTrainingDetails([]);
    localStorage.removeItem('trainingLogs');
    // Reset training status to initial state
    resetTrainingState();

    try {
      const res = await startTrain({
        ...trainingParams,
        model_name: trainingParams.model_name
      });

      if (res.data.code === 0) {
        // Save training configuration and start polling
        localStorage.setItem('trainingParams', JSON.stringify(trainingParams));
        scrollPageToBottom();
        startGetTrainingProgress();
      } else {
        message.error(res.data.message || 'Failed to start training');
        setIsTraining(false);
      }
    } catch (error: unknown) {
      console.error('Error starting training:', error);
      setIsTraining(false);

      if (error instanceof Error) {
        message.error(error.message || 'Failed to start training');
      } else {
        message.error('Failed to start training');
      }
    }
  };

  // Retrain existing model
  const handleRetrainModel = async () => {
    setIsTraining(true);
    // Clear training logs
    setTrainingDetails([]);
    localStorage.removeItem('trainingLogs');
    // Reset training status to initial state
    resetTrainingState();

    try {
      const res = await retrain(trainingParams);

      if (res.data.code === 0) {
        // Save training configuration and start polling
        localStorage.setItem('trainingParams', JSON.stringify(trainingParams));
        scrollPageToBottom();
        startGetTrainingProgress();
      } else {
        message.error(res.data.message || 'Failed to retrain model');
        setIsTraining(false);
      }
    } catch (error: unknown) {
      console.error('Error retraining model:', error);
      setIsTraining(false);

      if (error instanceof Error) {
        message.error(error.message || 'Failed to retrain model');
      } else {
        message.error('Failed to retrain model');
      }
    }
  };

  // Call the appropriate handler function based on status
  const handleTrainingAction = async () => {
    if (trainActionLoading) {
      message.info('Please wait a moment...');

      return;
    }

    if (!isTraining && serviceStarted) {
      message.error('Model is already running, please stop it first');

      return;
    }

    setTrainActionLoading(true);

    // If training is in progress, stop it
    if (isTraining) {
      await handleStopTraining();
      setTrainActionLoading(false);

      return;
    }

    // If the same model has already been trained and status is 'trained' or 'running', perform retraining
    if (status === 'trained') {
      await handleRetrainModel();
    } else {
      // Otherwise start new training
      await handleStartNewTraining();
    }

    setTrainActionLoading(false);
  };

  const renderTrainingProgress = () => {
    return (
      <div className="space-y-6">
        {/* Training Progress Component */}
        <TrainingProgress status={status} trainingProgress={trainingProgress} />
      </div>
    );
  };

  const renderTrainingLog = () => {
    return (
      <div className="space-y-6">
        {/* Training Log Console */}
        <TrainingLog trainingDetails={trainingDetails} />
      </div>
    );
  };

  // Handle memory modal confirmation
  const handleMemoryModalConfirm = () => {
    setShowMemoryModal(false);
    router.push(ROUTER_PATH.TRAIN_MEMORIES);
  };

  return (
    <div ref={containerRef} className="h-full overflow-auto">
      {/* Memory count warning modal */}
      <Modal
        cancelText="Stay Here"
        okText="Go to Memories Page"
        onCancel={() => setShowMemoryModal(false)}
        onOk={handleMemoryModalConfirm}
        open={showMemoryModal}
        title="More Memories Needed"
      >
        <p>You need to add at least 3 memories before you can train your model.</p>
        <p>Would you like to go to the memories page to add more?</p>
      </Modal>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Page Title and Description */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">{pageTitle}</h1>
          <p className="text-gray-600 max-w-3xl">{pageDescription}</p>
        </div>
        {/* Training Configuration Component */}
        <TrainingConfiguration
          baseModelOptions={baseModelOptions}
          cudaAvailable={cudaAvailable}
          isTraining={isTraining}
          modelConfig={modelConfig}
          onResetProgress={handleResetProgress}
          onTrainingAction={handleTrainingAction}
          setSelectedInfo={setSelectedInfo}
          status={status}
          trainActionLoading={trainActionLoading}
          trainSuspended={trainSuspended}
          trainingParams={trainingParams}
          updateTrainingParams={updateTrainingParams}
        />

        {/* Only show training progress after training starts */}
        {(status === 'training' || status === 'trained') && renderTrainingProgress()}

        <GlobalBioPanel />

        {/* Always show training log regardless of training status */}
        {renderTrainingLog()}

        <InfoModal
          content={
            <div className="space-y-4">
              <p className="text-gray-600">{trainInfo.description}</p>
              <div>
                <h4 className="font-medium mb-2">Key Features:</h4>
                <ul className="list-disc pl-5 space-y-1.5">
                  {trainInfo.features.map((feature, index) => (
                    <li key={index} className="text-gray-600">
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          }
          onClose={() => setSelectedInfo(false)}
          open={!!selectedInfo && !!trainInfo}
          title={trainInfo.name}
        />

        {/* Training completion celebration effect */}
        <CelebrationEffect isVisible={showCelebration} onClose={() => setShowCelebration(false)} />
      </div>
    </div>
  );
}

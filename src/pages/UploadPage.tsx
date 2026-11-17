import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  Camera,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  RefreshCw,
  ArrowRight,
  Sparkles,
  FileText,
  X,
  ScanLine,
  SwitchCamera,
  Edit3,
  Save,
  Calendar,
  Store,
  CreditCard,
  Tag,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.tsx';
import { apiFetch } from '../utils/api.ts';
import { CATEGORY_CONFIG, formatCurrency } from '../utils/categories.ts';

interface FileQueueItem {
  id: string;
  file: File;
  previewUrl: string;
  status: 'pending' | 'uploading' | 'processing' | 'done' | 'failed';
  error?: string;
  imageUrl?: string;
  result?: any;
  saving?: boolean;
  saved?: boolean;
  saveError?: string;
}

export const UploadPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [queue, setQueue] = useState<FileQueueItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const maxUploadSizeMb = __VERCEL__ ? 4 : 10;

  // Live Camera Modal State
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);

  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCameraStream = useCallback(
    async (targetFacing: 'environment' | 'user') => {
      stopCameraStream();
      setCameraError(null);
      setCameraLoading(true);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraLoading(false);
        setCameraError(t('cameraPermissionError'));
        return;
      }

      try {
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: targetFacing },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            },
            audio: false,
          });
        } catch {
          // Fallback to any available video device
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
      } catch (err: any) {
        console.error('Camera start failed:', err);
        setCameraError(t('cameraPermissionError'));
      } finally {
        setCameraLoading(false);
      }
    },
    [stopCameraStream, t]
  );

  useEffect(() => {
    if (cameraOpen && !capturedPhotoUrl) {
      void startCameraStream(facingMode);
    }
    return () => {
      stopCameraStream();
    };
  }, [cameraOpen, facingMode, capturedPhotoUrl, startCameraStream, stopCameraStream]);

  const openCameraModal = () => {
    setCapturedPhotoUrl(null);
    setCapturedBlob(null);
    setCameraError(null);
    setCameraOpen(true);
  };

  const closeCameraModal = () => {
    stopCameraStream();
    if (capturedPhotoUrl) {
      URL.revokeObjectURL(capturedPhotoUrl);
    }
    setCapturedPhotoUrl(null);
    setCapturedBlob(null);
    setCameraError(null);
    setCameraOpen(false);
  };

  const handleCapturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.videoWidth === 0) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        stopCameraStream();
        const url = URL.createObjectURL(blob);
        setCapturedBlob(blob);
        setCapturedPhotoUrl(url);
      },
      'image/jpeg',
      0.92
    );
  };

  const handleRetakePhoto = () => {
    if (capturedPhotoUrl) {
      URL.revokeObjectURL(capturedPhotoUrl);
    }
    setCapturedPhotoUrl(null);
    setCapturedBlob(null);
  };

  const handleUseCapturedPhoto = () => {
    if (!capturedBlob) return;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const photoFile = new File([capturedBlob], `camera_receipt_${timestamp}.jpg`, {
      type: 'image/jpeg',
    });
    closeCameraModal();
    handleFiles([photoFile]);
  };

  const handleFiles = (fileList: FileList | File[]) => {
    const newItems: FileQueueItem[] = [];
    const files = Array.from(fileList);

    for (const file of files) {
      if (file.size > maxUploadSizeMb * 1024 * 1024) {
        setQueue((prev) => [
          ...prev,
          {
            id: Math.random().toString(36).substring(2, 9),
            file,
            previewUrl: '',
            status: 'failed',
            error: `${file.name} exceeds ${maxUploadSizeMb}MB limit.`,
          },
        ]);
        continue;
      }
      const previewUrl = URL.createObjectURL(file);
      newItems.push({
        id: Math.random().toString(36).substring(2, 9),
        file,
        previewUrl,
        status: 'pending',
      });
    }

    if (newItems.length > 0) {
      setQueue((prev) => [...prev, ...newItems]);
      void processBatch(newItems);
    }
  };

  const processBatch = async (items: FileQueueItem[]) => {
    for (const item of items) {
      setQueue((prev) =>
        prev.map((q) => (q.id === item.id ? { ...q, status: 'uploading', error: undefined } : q))
      );

      const formData = new FormData();
      formData.append('files', item.file);

      try {
        setQueue((prev) =>
          prev.map((q) => (q.id === item.id ? { ...q, status: 'processing' } : q))
        );

        const res = await apiFetch('/api/v1/receipts/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();

        if (res.ok && data.results?.[0]?.success) {
          const resItem = data.results[0];
          setQueue((prev) =>
            prev.map((q) =>
              q.id === item.id
                ? {
                    ...q,
                    status: 'done',
                    imageUrl: resItem.imageUrl,
                    result: resItem,
                  }
                : q
            )
          );
        } else {
          const resItem = data.results?.[0];
          const errorMsg =
            resItem?.error || data.error || 'Failed to extract receipt data';
          setQueue((prev) =>
            prev.map((q) =>
              q.id === item.id
                ? {
                    ...q,
                    status: 'failed',
                    imageUrl: resItem?.imageUrl,
                    error: errorMsg,
                  }
                : q
            )
          );
        }
      } catch (err: any) {
        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id ? { ...q, status: 'failed', error: err.message || 'Upload error' } : q
          )
        );
      }
    }
  };

  const retryItem = (id: string) => {
    const item = queue.find((q) => q.id === id);
    if (item) {
      void processBatch([item]);
    }
  };

  const removeItem = (id: string) => {
    setQueue((prev) => prev.filter((q) => q.id !== id));
  };

  const handleReview = (item: FileQueueItem) => {
    if (item.result) {
      navigate('/review', {
        state: {
          scannedData: item.result.extraction,
          imageUrl: item.result.imageUrl,
          mathCheck: item.result.mathCheck,
        },
      });
    }
  };

  const handleDirectSave = async (item: FileQueueItem) => {
    const ext = item.result?.extraction;
    if (!ext || item.saving || item.saved) return;

    setQueue((prev) =>
      prev.map((q) => (q.id === item.id ? { ...q, saving: true, saveError: undefined } : q))
    );

    try {
      const cleanItems = Array.isArray(ext.items)
        ? ext.items.filter((it: any) => String(it?.name || '').trim().length > 0)
        : [];
      const payload = {
        merchant: String(ext.merchant || 'Store').trim(),
        date: ext.date || new Date().toISOString().split('T')[0],
        time: ext.time || '',
        items: cleanItems,
        subtotal: Number(ext.subtotal) || 0,
        tax: Number(ext.tax) || 0,
        discount: Number(ext.discount) || 0,
        serviceCharge: Number(ext.serviceCharge) || 0,
        total: Number(ext.total) || 0,
        currency: ext.currency || 'THB',
        paymentMethod: ext.paymentMethod || '',
        category: ext.category || 'other',
        imageUrl: item.result?.imageUrl || item.imageUrl || '',
        notes: ext.notes || '',
        confidence: typeof ext.confidence === 'number' ? ext.confidence : 0.95,
        status: 'confirmed',
      };

      const res = await apiFetch('/api/v1/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save receipt');
      }

      setQueue((prev) =>
        prev.map((q) => (q.id === item.id ? { ...q, saving: false, saved: true } : q))
      );
    } catch (err: any) {
      setQueue((prev) =>
        prev.map((q) =>
          q.id === item.id
            ? { ...q, saving: false, saveError: err.message || 'Failed to save receipt' }
            : q
        )
      );
    }
  };

  const handleManualReview = (item: FileQueueItem) => {
    navigate('/review', {
      state: {
        scannedData: {
          merchant: item.file.name.replace(/\.[^/.]+$/, ''),
          date: new Date().toISOString().split('T')[0],
          time: '',
          items: [],
          subtotal: 0,
          tax: 0,
          discount: 0,
          serviceCharge: 0,
          total: 0,
          currency: 'THB',
          paymentMethod: '',
          category: 'other',
          confidence: 0,
          isReceipt: true,
          notes: item.error || '',
        },
        imageUrl: item.imageUrl || item.previewUrl,
        mathCheck: { isBalanced: true, itemSum: 0, grandTotal: 0, difference: 0 },
      },
    });
  };

  // Sample receipt generator for quick demonstration
  const handleSampleReceipt = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 900;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#fdfbf7';
      ctx.fillRect(0, 0, 600, 900);
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('7-ELEVEN (THAILAND)', 300, 70);
      ctx.font = '16px monospace';
      ctx.fillText('TAX INVOICE / RECEIPT (ABB)', 300, 105);
      ctx.fillText('BRANCH #08422 SILOM COMPLEX', 300, 130);
      ctx.fillText('TAX ID: 0107542000011', 300, 155);
      ctx.fillText('DATE: 15/11/2569  TIME: 14:25', 300, 185);

      ctx.beginPath();
      ctx.setLineDash([6, 4]);
      ctx.moveTo(40, 210);
      ctx.lineTo(560, 210);
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.font = '18px sans-serif';
      ctx.fillText('1x ICED AMERICANO 16oz', 50, 260);
      ctx.textAlign = 'right';
      ctx.fillText('45.00', 550, 260);

      ctx.textAlign = 'left';
      ctx.fillText('1x HAM & CHEESE TOAST', 50, 310);
      ctx.textAlign = 'right';
      ctx.fillText('37.00', 550, 310);

      ctx.textAlign = 'left';
      ctx.fillText('2x BOTTLED WATER 600ml', 50, 360);
      ctx.textAlign = 'right';
      ctx.fillText('14.00', 550, 360);

      ctx.beginPath();
      ctx.moveTo(40, 410);
      ctx.lineTo(560, 410);
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText('SUBTOTAL', 50, 460);
      ctx.textAlign = 'right';
      ctx.fillText('89.72', 550, 460);

      ctx.textAlign = 'left';
      ctx.fillText('VAT 7%', 50, 500);
      ctx.textAlign = 'right';
      ctx.fillText('6.28', 550, 500);

      ctx.textAlign = 'left';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText('GRAND TOTAL', 50, 560);
      ctx.textAlign = 'right';
      ctx.fillText('THB 96.00', 550, 560);

      ctx.textAlign = 'center';
      ctx.font = '16px monospace';
      ctx.fillText('PAID VIA: PROMPTPAY QR', 300, 620);
      ctx.fillText('THANK YOU FOR SHOPPING WITH US', 300, 720);

      canvas.toBlob((blob) => {
        if (blob) {
          const sampleFile = new File([blob], 'thai_7eleven_receipt.jpg', {
            type: 'image/jpeg',
          });
          handleFiles([sampleFile]);
        }
      }, 'image/jpeg');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#160029] dark:text-[#F5E9E2] tracking-tight flex items-center gap-2.5">
            <ScanLine className="h-7 w-7 text-[#D44D5C]" />
            <span>{t('uploadTitle')}</span>
          </h1>
          <p className="mt-1 text-sm text-[#773344] dark:text-[#E3B5A4]">
            {t('uploadSubtitle')}
          </p>
        </div>

        {/* Try sample receipt button */}
        <button
          onClick={handleSampleReceipt}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl border border-[#E3B5A4] bg-[#F5E9E2] text-xs font-bold text-[#773344] hover:bg-[#E3B5A4]/40 dark:border-[#773344] dark:bg-[#240E38] dark:text-[#F5E9E2] transition shrink-0"
        >
          <Sparkles className="h-4 w-4 text-[#D44D5C]" />
          <span>ทดลองใบเสร็จตัวอย่าง (Demo Receipt)</span>
        </button>
      </div>

      {/* Upload Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files) {
            handleFiles(e.dataTransfer.files);
          }
        }}
        className={`relative rounded-3xl border-2 border-dashed p-8 sm:p-12 text-center transition-all ${
          isDragging
            ? 'border-[#D44D5C] bg-[#F5E9E2]/60 dark:bg-[#240E38] scale-[0.99]'
            : 'border-[#E3B5A4] hover:border-[#D44D5C] bg-white dark:border-[#773344] dark:bg-[#160029]'
        }`}
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F5E9E2] text-[#D44D5C] dark:bg-[#240E38] mb-4 shadow-sm">
          <UploadCloud className="h-8 w-8" />
        </div>

        <h3 className="text-base sm:text-lg font-bold text-[#160029] dark:text-[#F5E9E2]">
          {t('dropzoneText')}
        </h3>
        <p className="mt-1.5 text-xs sm:text-sm text-[#773344]/80 dark:text-[#E3B5A4]/80 max-w-md mx-auto">
          {t('dropzoneSubtext')}
        </p>

        {/* Buttons */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#D44D5C] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#BF3F4E] transition"
          >
            <ImageIcon className="h-4 w-4" />
            <span>{t('chooseFiles')}</span>
          </button>

          <button
            type="button"
            onClick={openCameraModal}
            className="inline-flex items-center gap-2 rounded-2xl border border-[#E3B5A4] bg-white px-5 py-2.5 text-xs font-bold text-[#773344] shadow-sm hover:bg-[#F5E9E2] dark:border-[#773344] dark:bg-[#240E38] dark:text-[#F5E9E2] transition"
          >
            <Camera className="h-4 w-4 text-[#D44D5C]" />
            <span>{t('takePhoto')}</span>
          </button>
        </div>

        {/* Hidden inputs */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/heic"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files);
            e.target.value = '';
          }}
        />

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {/* Queue & Status List */}
      {queue.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#160029] dark:text-[#F5E9E2] flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#D44D5C]" />
              <span>{t('batchUploadSummary')} ({queue.length})</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {queue.map((item) => {
              const ext = item.result?.extraction;
              const catConfig = ext?.category
                ? CATEGORY_CONFIG[ext.category as keyof typeof CATEGORY_CONFIG] || CATEGORY_CONFIG.other
                : CATEGORY_CONFIG.other;

              return (
                <div
                  key={item.id}
                  className="rounded-3xl border border-[#E3B5A4]/50 bg-white p-5 shadow-sm dark:border-[#773344]/50 dark:bg-[#160029] transition space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Thumbnail & Name */}
                    <div className="flex items-center gap-3.5">
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-[#E3B5A4]/40 dark:border-[#773344]/50 bg-[#F5E9E2]/40 dark:bg-[#240E38] flex items-center justify-center">
                        {item.previewUrl ? (
                          <img
                            src={item.previewUrl}
                            alt="Thumbnail"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="h-5 w-5 text-[#773344]/50" />
                        )}
                      </div>

                      <div>
                        <p className="text-sm font-bold text-[#160029] dark:text-[#F5E9E2] truncate max-w-xs">
                          {item.file.name}
                        </p>
                        <p className="text-xs text-[#773344]/70 dark:text-[#E3B5A4]/70">
                          {(item.file.size / 1024 / 1024).toFixed(2)} MB
                        </p>

                        {/* Status badges */}
                        <div className="mt-1 flex items-center gap-1.5">
                          {item.status === 'uploading' && (
                            <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-medium">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              {t('uploadingStatus')}
                            </span>
                          )}
                          {item.status === 'processing' && (
                            <span className="inline-flex items-center gap-1 text-xs text-[#D44D5C] font-semibold animate-pulse">
                              <Sparkles className="h-3 w-3 text-[#D44D5C] animate-spin" />
                              {t('processingStatus')}
                            </span>
                          )}
                          {item.status === 'done' && (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {item.saved ? t('savedSuccess') : t('successStatus')}
                            </span>
                          )}
                          {item.status === 'failed' && (
                            <span className="inline-flex items-center gap-1 text-xs text-[#D44D5C] font-medium">
                              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                              <span>{item.error || t('failedStatus')}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Top Actions */}
                    <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
                      {item.status === 'failed' && (
                        <>
                          <button
                            onClick={() => retryItem(item.id)}
                            className="inline-flex items-center gap-1 rounded-xl border border-[#E3B5A4] px-3 py-1.5 text-xs font-semibold text-[#773344] hover:bg-[#F5E9E2] dark:border-[#773344] dark:text-[#E3B5A4] dark:hover:bg-[#240E38] transition"
                          >
                            <RefreshCw className="h-3 w-3" />
                            <span>{t('retryUpload')}</span>
                          </button>
                          {(item.imageUrl || item.previewUrl) && (
                            <button
                              onClick={() => handleManualReview(item)}
                              className="inline-flex items-center gap-1 rounded-xl bg-[#773344] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#5C2734] transition"
                            >
                              <Edit3 className="h-3 w-3" />
                              <span>{t('fillManually')}</span>
                            </button>
                          )}
                        </>
                      )}

                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-1.5 text-[#773344]/50 hover:text-[#D44D5C] dark:text-[#E3B5A4]/50 rounded-lg"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Extracted Receipt Details Card (Shown automatically after scan finishes) */}
                  {item.status === 'done' && ext && (
                    <div className="rounded-2xl border border-[#E3B5A4]/40 bg-[#FBF6F3] dark:border-[#773344]/40 dark:bg-[#240E38]/70 p-4 sm:p-5 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E3B5A4]/30 dark:border-[#773344]/30">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-[#D44D5C]" />
                          <span className="text-xs font-extrabold uppercase tracking-wider text-[#773344] dark:text-[#E3B5A4]">
                            {t('extractedInfoTitle')}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                          <span className="tabular-nums">
                            AI Confidence: {Math.round((ext.confidence ?? 0.9) * 100)}%
                          </span>
                        </div>
                      </div>

                      {/* Key Receipt Metadata Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div className="rounded-xl bg-white dark:bg-[#160029] p-3 border border-[#E3B5A4]/30 dark:border-[#773344]/30">
                          <span className="text-[10px] font-bold uppercase text-[#773344]/60 dark:text-[#E3B5A4]/60 flex items-center gap-1">
                            <Store className="h-3 w-3 text-[#D44D5C]" />
                            {t('tableMerchant')}
                          </span>
                          <p className="mt-1 font-extrabold text-[#160029] dark:text-[#F5E9E2] truncate">
                            {ext.merchant || '-'}
                          </p>
                        </div>

                        <div className="rounded-xl bg-white dark:bg-[#160029] p-3 border border-[#E3B5A4]/30 dark:border-[#773344]/30">
                          <span className="text-[10px] font-bold uppercase text-[#773344]/60 dark:text-[#E3B5A4]/60 flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-[#D44D5C]" />
                            {t('tableDate')}
                          </span>
                          <p className="mt-1 font-bold text-[#160029] dark:text-[#F5E9E2] tabular-nums">
                            {ext.date} {ext.time ? `· ${ext.time}` : ''}
                          </p>
                        </div>

                        <div className="rounded-xl bg-white dark:bg-[#160029] p-3 border border-[#E3B5A4]/30 dark:border-[#773344]/30">
                          <span className="text-[10px] font-bold uppercase text-[#773344]/60 dark:text-[#E3B5A4]/60 flex items-center gap-1">
                            <Tag className="h-3 w-3 text-[#D44D5C]" />
                            {t('tableCategory')}
                          </span>
                          <p className="mt-1 font-bold text-[#160029] dark:text-[#F5E9E2] flex items-center gap-1.5">
                            <catConfig.icon
                              className="h-3.5 w-3.5 shrink-0"
                              style={{ color: catConfig.chartColor }}
                            />
                            <span className="truncate">{t(`cat_${ext.category || 'other'}` as any)}</span>
                          </p>
                        </div>

                        <div className="rounded-xl bg-white dark:bg-[#160029] p-3 border border-[#D44D5C]/30 dark:border-[#D44D5C]/40">
                          <span className="text-[10px] font-bold uppercase text-[#773344]/60 dark:text-[#E3B5A4]/60 flex items-center gap-1">
                            <CreditCard className="h-3 w-3 text-[#D44D5C]" />
                            {t('tableTotal')}
                          </span>
                          <p className="mt-1 text-base font-black text-[#D44D5C] tabular-nums">
                            {formatCurrency(Number(ext.total) || 0, ext.currency || 'THB')}
                          </p>
                        </div>
                      </div>

                      {/* Extracted Line Items */}
                      {Array.isArray(ext.items) && ext.items.length > 0 && (
                        <div className="rounded-xl bg-white dark:bg-[#160029] border border-[#E3B5A4]/30 dark:border-[#773344]/30 overflow-hidden">
                          <div className="px-3.5 py-2 bg-[#F5E9E2]/60 dark:bg-[#301748] text-[11px] font-bold text-[#773344] dark:text-[#E3B5A4] flex items-center justify-between">
                            <span>{t('lineItemsTitle')} ({ext.items.length})</span>
                            {ext.paymentMethod && <span>{ext.paymentMethod}</span>}
                          </div>
                          <div className="divide-y divide-[#E3B5A4]/20 dark:divide-[#773344]/20 max-h-48 overflow-y-auto">
                            {ext.items.map((it: any, idx: number) => (
                              <div
                                key={idx}
                                className="px-3.5 py-2 flex items-center justify-between gap-3 text-xs"
                              >
                                <div className="min-w-0 flex-1">
                                  <span className="font-semibold text-[#160029] dark:text-[#F5E9E2] truncate block">
                                    {it.name}
                                  </span>
                                  <span className="text-[11px] text-[#773344]/70 dark:text-[#E3B5A4]/70 tabular-nums">
                                    {it.quantity} × {formatCurrency(Number(it.unitPrice) || 0, ext.currency || 'THB')}
                                  </span>
                                </div>
                                <span className="font-bold text-[#160029] dark:text-[#F5E9E2] shrink-0 tabular-nums">
                                  {formatCurrency(Number(it.total) || 0, ext.currency || 'THB')}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Financial Summary */}
                      <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold text-[#773344] dark:text-[#E3B5A4] tabular-nums">
                        {Number(ext.subtotal) > 0 && (
                          <span>Subtotal: {formatCurrency(Number(ext.subtotal), ext.currency || 'THB')}</span>
                        )}
                        {Number(ext.tax) > 0 && (
                          <span>VAT/Tax: {formatCurrency(Number(ext.tax), ext.currency || 'THB')}</span>
                        )}
                        {Number(ext.discount) > 0 && (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            Discount: -{formatCurrency(Number(ext.discount), ext.currency || 'THB')}
                          </span>
                        )}
                        {Number(ext.serviceCharge) > 0 && (
                          <span>Service: {formatCurrency(Number(ext.serviceCharge), ext.currency || 'THB')}</span>
                        )}
                      </div>

                      {item.saveError && (
                        <div className="flex items-center gap-2 rounded-xl bg-[#F9E8EA] p-2.5 text-xs font-semibold text-[#D44D5C] border border-[#D44D5C]/30">
                          <AlertTriangle className="h-4 w-4 shrink-0" />
                          <span>{item.saveError}</span>
                        </div>
                      )}

                      {/* Prominent Action Bar */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-2">
                        {item.saved ? (
                          <button
                            type="button"
                            onClick={() => navigate('/receipts')}
                            className="inline-flex items-center justify-center gap-2 min-h-[44px] rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-extrabold text-white shadow-md shadow-emerald-600/25 hover:bg-emerald-700 transition whitespace-nowrap cursor-pointer"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            <span>{t('viewInReceipts')}</span>
                            <ArrowRight className="h-4 w-4" />
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => handleReview(item)}
                              className="inline-flex items-center justify-center gap-2 min-h-[44px] rounded-2xl border border-[#E3B5A4] bg-white px-5 py-3 text-xs font-bold text-[#773344] hover:bg-[#F5E9E2] dark:border-[#773344] dark:bg-[#160029] dark:text-[#E3B5A4] transition whitespace-nowrap cursor-pointer"
                            >
                              <Edit3 className="h-4 w-4" />
                              <span>{t('editDetails')}</span>
                            </button>

                            <button
                              type="button"
                              disabled={item.saving}
                              onClick={() => handleDirectSave(item)}
                              className="inline-flex items-center justify-center gap-2 min-h-[44px] rounded-2xl bg-[#D44D5C] px-7 py-3 text-sm font-extrabold text-white shadow-lg shadow-[#D44D5C]/35 hover:bg-[#BF3F4E] disabled:opacity-50 transition whitespace-nowrap cursor-pointer"
                            >
                              {item.saving ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Save className="h-4 w-4" />
                              )}
                              <span>{item.saving ? t('savingReceipt') : t('saveReceiptNow')}</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Live Camera Capture Modal */}
      {cameraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#160029]/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-3xl border border-[#E3B5A4]/50 bg-white dark:bg-[#160029] dark:border-[#773344] shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E3B5A4]/30 dark:border-[#773344]/40">
              <div>
                <h3 className="text-base font-extrabold text-[#160029] dark:text-[#F5E9E2] flex items-center gap-2">
                  <Camera className="h-4 w-4 text-[#D44D5C]" />
                  <span>{t('cameraTitle')}</span>
                </h3>
                <p className="text-xs text-[#773344]/80 dark:text-[#E3B5A4]/80">
                  {t('cameraSubtitle')}
                </p>
              </div>
              <button
                type="button"
                onClick={closeCameraModal}
                className="p-2 rounded-xl text-[#773344] hover:bg-[#F5E9E2] dark:text-[#E3B5A4] dark:hover:bg-[#240E38]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Viewfinder / Captured Photo */}
            <div className="relative bg-[#160029] aspect-[4/3] w-full flex items-center justify-center overflow-hidden">
              {capturedPhotoUrl ? (
                <img
                  src={capturedPhotoUrl}
                  alt="Captured receipt"
                  className="h-full w-full object-contain"
                />
              ) : cameraError ? (
                <div className="p-6 text-center space-y-4 max-w-sm">
                  <AlertTriangle className="h-10 w-10 text-[#E3B5A4] mx-auto" />
                  <p className="text-xs font-medium text-[#F5E9E2] leading-relaxed">
                    {cameraError}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      closeCameraModal();
                      cameraInputRef.current?.click();
                    }}
                    className="inline-flex items-center gap-2 rounded-2xl bg-[#D44D5C] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#BF3F4E] transition"
                  >
                    <ImageIcon className="h-4 w-4" />
                    <span>{t('useFilePickerFallback')}</span>
                  </button>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="h-full w-full object-cover"
                  />
                  {/* Receipt Guide Overlay */}
                  <div className="pointer-events-none absolute inset-6 sm:inset-10 rounded-2xl border-2 border-dashed border-[#F5E9E2]/60" />
                  {cameraLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#160029]/70 text-[#F5E9E2]">
                      <Loader2 className="h-7 w-7 animate-spin text-[#D44D5C]" />
                      <span className="text-xs font-semibold">{t('cameraStarting')}</span>
                    </div>
                  )}
                </>
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Modal Footer Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 bg-[#FBF6F3] dark:bg-[#240E38]">
              {!capturedPhotoUrl ? (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))
                    }
                    disabled={cameraLoading || Boolean(cameraError)}
                    className="inline-flex items-center gap-1.5 rounded-2xl border border-[#E3B5A4] bg-white px-3.5 py-2 text-xs font-bold text-[#773344] hover:bg-[#F5E9E2] disabled:opacity-40 dark:border-[#773344] dark:bg-[#160029] dark:text-[#E3B5A4] transition"
                  >
                    <SwitchCamera className="h-4 w-4 text-[#D44D5C]" />
                    <span>{t('switchCamera')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCapturePhoto}
                    disabled={cameraLoading || Boolean(cameraError)}
                    className="inline-flex items-center gap-2 rounded-2xl bg-[#D44D5C] px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-[#D44D5C]/30 hover:bg-[#BF3F4E] disabled:opacity-40 transition"
                  >
                    <Camera className="h-4 w-4" />
                    <span>{t('capturePhoto')}</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleRetakePhoto}
                    className="inline-flex items-center gap-1.5 rounded-2xl border border-[#E3B5A4] bg-white px-4 py-2 text-xs font-bold text-[#773344] hover:bg-[#F5E9E2] dark:border-[#773344] dark:bg-[#160029] dark:text-[#E3B5A4] transition"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>{t('retakePhoto')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleUseCapturedPhoto}
                    className="inline-flex items-center gap-2 rounded-2xl bg-[#D44D5C] px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-[#D44D5C]/30 hover:bg-[#BF3F4E] transition"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>{t('useAndExtract')}</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

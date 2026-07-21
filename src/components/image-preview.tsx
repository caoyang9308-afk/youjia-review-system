'use client';

import { useEffect, useCallback } from 'react';

export interface ImagePreviewData {
  url: string;
  id: string;
  submissionId: string;
  category: string;
  storeName: string;
  area: string;
  reviewStatus?: string;
  priority?: string;
}

interface ImagePreviewProps {
  data: ImagePreviewData;
  allImages: ImagePreviewData[];
  onClose: () => void;
  onNavigate: (imageId: string) => void;
  onReview?: (imageId: string, status: string, priority?: string, submissionId?: string, category?: string) => void;
}

export function ImagePreview({ data, allImages, onClose, onNavigate, onReview }: ImagePreviewProps) {
  const currentIndex = allImages.findIndex(img => img.id === data.id);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      onNavigate(allImages[currentIndex - 1].id);
    }
  }, [currentIndex, allImages, onNavigate]);

  const goNext = useCallback(() => {
    if (currentIndex < allImages.length - 1) {
      onNavigate(allImages[currentIndex + 1].id);
    }
  }, [currentIndex, allImages, onNavigate]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [onClose, goPrev, goNext]);

  // Touch swipe support
  useEffect(() => {
    let startX = 0;
    const handleTouchStart = (e: TouchEvent) => { startX = e.touches[0].clientX; };
    const handleTouchEnd = (e: TouchEvent) => {
      const diff = e.changedTouches[0].clientX - startX;
      if (Math.abs(diff) > 50) {
        if (diff > 0) goPrev();
        else goNext();
      }
    };
    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchend', handleTouchEnd);
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [goPrev, goNext]);

  const status = data.reviewStatus || 'pending';
  const priority = data.priority || 'urgent';

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Top bar: info + navigation */}
      <div className="flex items-center justify-between px-4 py-3 text-white" onClick={e => e.stopPropagation()}>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{data.storeName}</div>
          <div className="text-xs text-gray-400">{data.area} · {data.category} · {currentIndex + 1}/{allImages.length}</div>
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors ml-2"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Image with prev/next */}
      <div className="flex-1 flex items-center justify-center relative min-h-0 px-2" onClick={e => e.stopPropagation()}>
        {currentIndex > 0 && (
          <button
            onClick={goPrev}
            className="absolute left-2 z-10 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        )}
        <img
          src={data.url}
          alt="预览"
          className="max-w-full max-h-full object-contain rounded-lg"
        />
        {currentIndex < allImages.length - 1 && (
          <button
            onClick={goNext}
            className="absolute right-2 z-10 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        )}
      </div>

      {/* Bottom bar: review actions */}
      {onReview && (
      <div className="px-4 py-3 bg-gray-900/80 border-t border-white/10" onClick={e => e.stopPropagation()}>
        <div className="flex gap-2 max-w-lg mx-auto">
          <button
            onClick={() => onReview(data.id, 'approved', undefined, data.submissionId, data.category)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              status === 'approved'
                ? 'bg-[#52c41a] text-white'
                : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
            }`}
          >
            ✓ 维持现状
          </button>
          <button
            onClick={() => onReview(data.id, 'rejected', 'urgent', data.submissionId, data.category)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              status === 'rejected' && priority === 'urgent'
                ? 'bg-[#1677ff] text-white'
                : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
            }`}
          >
             立即更换
          </button>
          <button
            onClick={() => onReview(data.id, 'rejected', 'scheduled', data.submissionId, data.category)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              status === 'rejected' && priority === 'scheduled'
                ? 'bg-[#faad14] text-white'
                : 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
            }`}
          >
             择期更换
          </button>
        </div>
      </div>
      )}
    </div>
  );
}

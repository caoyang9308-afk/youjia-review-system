'use client';

import { useState, useEffect, useCallback } from 'react';
import { ImagePreview } from './image-preview';

interface Image {
  id: string;
  category: string;
  image_url: string;
}

interface Submission {
  id: string;
  area: string;
  store_name: string;
  remark: string | null;
  status: string;
  images: Image[];
}

interface ReviewItem {
  id: string;
  submission_id: string;
  image_id: string;
  category: string;
  review_status: string;
  review_note: string | null;
}

const AREAS = ['全部', '苏州一区', '苏州二区', '苏州三区', '苏州四区', '苏州五区', '南京区域', '无锡区域', '浙江区域'];
const CATEGORIES = ['门头', '吧台', '墙面', '菜单', '灯箱', '外卖窗口', '其他'];

export function ReviewPanel({ onDataChange }: { onDataChange: () => void }) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [activeArea, setActiveArea] = useState('全部');
  const [expandedStore, setExpandedStore] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [subRes, revRes] = await Promise.all([
        fetch(`/api/submissions${activeArea !== '全部' ? `?area=${encodeURIComponent(activeArea)}` : ''}`),
        fetch('/api/review'),
      ]);
      const subJson = await subRes.json();
      const revJson = await revRes.json();
      if (subJson.success) setSubmissions(subJson.data);
      if (revJson.success) setReviewItems(revJson.data);
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }, [activeArea]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getReviewStatus = (imageId: string): string => {
    const item = reviewItems.find(r => r.image_id === imageId);
    return item?.review_status ?? 'pending';
  };

  const getReviewItemId = (imageId: string): string | undefined => {
    return reviewItems.find(r => r.image_id === imageId)?.id;
  };

  const handleReview = async (imageId: string, status: 'approved' | 'rejected' | 'skipped') => {
    const reviewItemId = getReviewItemId(imageId);
    if (!reviewItemId) return;

    setSaving(true);
    try {
      const res = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          items: [{ id: reviewItemId, review_status: status }],
        }),
      });
      const json = await res.json();
      if (json.success) {
        setReviewItems(prev =>
          prev.map(r => r.image_id === imageId ? { ...r, review_status: status } : r)
        );
        onDataChange();
      }
    } catch {
      // silently handle
    } finally {
      setSaving(false);
    }
  };

  const handleInitReview = async (submissionId: string) => {
    setSaving(true);
    try {
      const res = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'batch_create',
          items: [{ submission_id: submissionId }],
        }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchData();
        onDataChange();
      }
    } catch {
      // silently handle
    } finally {
      setSaving(false);
    }
  };

  const handleBatchApprove = async (_submissionId: string, images: Image[]) => {
    // Get pending items
    const pendingItems = images
      .filter(img => getReviewStatus(img.id) === 'pending')
      .map(img => ({
        id: getReviewItemId(img.id),
        review_status: 'approved' as const,
      }))
      .filter(item => item.id);

    if (pendingItems.length === 0) return;

    setSaving(true);
    try {
      const res = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'batch_update',
          items: pendingItems,
        }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchData();
        onDataChange();
      }
    } catch {
      // silently handle
    } finally {
      setSaving(false);
    }
  };

  // Stats
  const totalImages = submissions.reduce((acc, s) => acc + s.images.length, 0);
  const reviewedCount = submissions.reduce(
    (acc, s) => acc + s.images.filter(img => getReviewStatus(img.id) !== 'pending').length,
    0
  );
  const needUpdateCount = submissions.reduce(
    (acc, s) => acc + s.images.filter(img => getReviewStatus(img.id) === 'rejected').length,
    0
  );
  const pendingCount = totalImages - reviewedCount;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        加载中...
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
          <polyline points="13 2 13 9 20 9" />
        </svg>
        <p className="mt-4 text-sm">暂无门店上传数据</p>
        <p className="text-xs mt-1">请先让门店通过上传入口提交图片</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Area Filter Tabs */}
      <div className="bg-white rounded-xl p-4 border border-gray-100">
        <div className="flex flex-wrap gap-2">
          {AREAS.map(area => (
            <button
              key={area}
              onClick={() => setActiveArea(area)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeArea === area
                  ? 'bg-[#1677ff] text-white'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {area}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-white rounded-xl p-4 border border-gray-100 flex flex-wrap gap-6">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">总图片数</span>
          <span className="text-lg font-bold text-gray-900">{totalImages}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">已审核</span>
          <span className="text-lg font-bold text-[#52c41a]">{reviewedCount - pendingCount}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">待审核</span>
          <span className="text-lg font-bold text-[#faad14]">{pendingCount}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">需要更新</span>
          <span className="text-lg font-bold text-[#ff4d4f]">{needUpdateCount}</span>
        </div>
      </div>

      {/* Store List */}
      <div className="space-y-3">
        {submissions.map(submission => {
          const isExpanded = expandedStore === submission.id;
          const storeReviewed = submission.images.filter(img => getReviewStatus(img.id) !== 'pending').length;
          const storeTotal = submission.images.length;
          const hasReviewItems = submission.images.some(img => getReviewItemId(img.id));

          return (
            <div key={submission.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              {/* Store Header */}
              <button
                onClick={() => setExpandedStore(isExpanded ? null : submission.id)}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#e6f4ff] flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1677ff" strokeWidth="2">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                      <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-gray-900">{submission.store_name}</div>
                    <div className="text-xs text-gray-500">{submission.area} · {storeTotal} 张图片</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-700">{storeReviewed}/{storeTotal}</div>
                    <div className="text-xs text-gray-400">已审核</div>
                  </div>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="px-5 pb-5 border-t border-gray-50">
                  {/* Init review / Batch approve */}
                  <div className="flex items-center gap-3 py-3">
                    {!hasReviewItems ? (
                      <button
                        onClick={() => handleInitReview(submission.id)}
                        disabled={saving}
                        className="px-4 py-2 bg-[#1677ff] text-white text-sm rounded-lg hover:bg-[#4096ff] disabled:opacity-50 transition-colors"
                      >
                        初始化审核
                      </button>
                    ) : (
                      <button
                        onClick={() => handleBatchApprove(submission.id, submission.images)}
                        disabled={saving}
                        className="px-4 py-2 bg-[#52c41a] text-white text-sm rounded-lg hover:bg-[#73d13d] disabled:opacity-50 transition-colors"
                      >
                        一键全选通过
                      </button>
                    )}
                    {submission.remark && (
                      <span className="text-xs text-gray-400">备注: {submission.remark}</span>
                    )}
                  </div>

                  {/* Images by Category */}
                  {CATEGORIES.map(category => {
                    const categoryImages = submission.images.filter(img => img.category === category);
                    if (categoryImages.length === 0) return null;

                    return (
                      <div key={category} className="mb-4">
                        <div className="text-sm font-medium text-gray-700 mb-2">{category}</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {categoryImages.map(img => {
                            const status = getReviewStatus(img.id);
                            return (
                              <div key={img.id} className="border border-gray-100 rounded-lg overflow-hidden">
                                <div
                                  className="relative aspect-[4/3] bg-gray-50 cursor-pointer overflow-hidden"
                                  onClick={() => setPreviewImage(img.image_url)}
                                >
                                  <img
                                    src={img.image_url}
                                    alt={`${category} - ${submission.store_name}`}
                                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                                  />
                                  {status !== 'pending' && (
                                    <div className={`absolute top-2 right-2 px-2 py-0.5 rounded text-xs font-medium text-white ${
                                      status === 'approved' ? 'bg-[#52c41a]' :
                                      status === 'rejected' ? 'bg-[#ff4d4f]' :
                                      'bg-gray-400'
                                    }`}>
                                      {status === 'approved' ? '已通过' : status === 'rejected' ? '需更新' : '已跳过'}
                                    </div>
                                  )}
                                </div>
                                <div className="p-2 flex gap-1.5">
                                  <button
                                    onClick={() => handleReview(img.id, 'approved')}
                                    disabled={saving || !getReviewItemId(img.id)}
                                    className={`flex-1 py-1.5 text-xs rounded-md font-medium transition-colors ${
                                      status === 'approved'
                                        ? 'bg-[#52c41a] text-white'
                                        : 'bg-green-50 text-[#52c41a] hover:bg-green-100'
                                    } disabled:opacity-40`}
                                  >
                                    ✅ 通过
                                  </button>
                                  <button
                                    onClick={() => handleReview(img.id, 'rejected')}
                                    disabled={saving || !getReviewItemId(img.id)}
                                    className={`flex-1 py-1.5 text-xs rounded-md font-medium transition-colors ${
                                      status === 'rejected'
                                        ? 'bg-[#ff4d4f] text-white'
                                        : 'bg-red-50 text-[#ff4d4f] hover:bg-red-100'
                                    } disabled:opacity-40`}
                                  >
                                    🔄 需更新
                                  </button>
                                  <button
                                    onClick={() => handleReview(img.id, 'skipped')}
                                    disabled={saving || !getReviewItemId(img.id)}
                                    className={`flex-1 py-1.5 text-xs rounded-md font-medium transition-colors ${
                                      status === 'skipped'
                                        ? 'bg-gray-400 text-white'
                                        : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                                    } disabled:opacity-40`}
                                  >
                                    ❌ 跳过
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Image Preview */}
      {previewImage && (
        <ImagePreview url={previewImage} onClose={() => setPreviewImage(null)} />
      )}
    </div>
  );
}

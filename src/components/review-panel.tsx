'use client';

import { useState, useEffect, useCallback } from 'react';
import { ImagePreview, type ImagePreviewData } from './image-preview';
import { CATEGORIES_ZH, CATEGORY_REVERSE_MAP, CATEGORY_MAP, AREAS, smartSearchMatch } from '@/lib/constants';

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
  priority: string;
  review_note: string | null;
}

// Map English category key to Chinese display name
function categoryDisplay(cat: string): string {
  const reverseMap = CATEGORY_REVERSE_MAP;
  // If it's already Chinese, return as-is
  if (CATEGORIES_ZH.includes(cat)) return cat;
  // If it's English key, look up in reverse map (zh->en), find the en->zh mapping
  const entry = Object.entries(reverseMap).find(([, en]) => en === cat);
  return entry ? entry[0] : cat;
}

export function ReviewPanel({ onDataChange }: { onDataChange: () => void }) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [activeArea, setActiveArea] = useState('全部');
  const [expandedStore, setExpandedStore] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState<ImagePreviewData | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [subRes, revRes] = await Promise.all([
        fetch(`/api/submissions${activeArea !== '全部' ? `?area=${encodeURIComponent(activeArea)}` : ''}`, {
          cache: 'no-store',
        }),
        fetch('/api/review', { cache: 'no-store' }),
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
    return item?.review_status ?? 'uninitialized';
  };

  const getReviewItemId = (imageId: string): string | undefined => {
    return reviewItems.find(r => r.image_id === imageId)?.id;
  };

  const getReviewPriority = (imageId: string): string => {
    return reviewItems.find(r => r.image_id === imageId)?.priority ?? 'urgent';
  };

  // Build flat list of all images for navigation
  const allImages: ImagePreviewData[] = submissions.flatMap(s =>
    s.images.map(img => ({
      url: img.image_url,
      id: img.id,
      submissionId: s.id,
      category: CATEGORY_MAP[img.category] || img.category,
      storeName: s.store_name,
      area: s.area,
      reviewStatus: getReviewStatus(img.id),
      priority: getReviewPriority(img.id),
    }))
  );

  const handleReview = async (imageId: string, status: 'approved' | 'rejected', priority: string = 'urgent') => {
    const reviewItemId = getReviewItemId(imageId);
    if (!reviewItemId) return;

    setSaving(true);
    try {
      const res = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          items: [{ id: reviewItemId, review_status: status, priority }],
        }),
      });
      const json = await res.json();
      if (json.success) {
        setReviewItems(prev =>
          prev.map(r => r.image_id === imageId ? { ...r, review_status: status, priority: priority || 'urgent' } : r)
        );
        onDataChange();
      }
    } catch {
      // silently handle
    } finally {
      setSaving(false);
    }
  };

  const handlePreviewReview = async (imageId: string, status: string, priority?: string, submissionId?: string, category?: string) => {
    setSaving(true);
    try {
      const res = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          items: [{ image_id: imageId, review_status: status, priority, submission_id: submissionId, category }],
        }),
      });
      const json = await res.json();
      if (json.success) {
        // Update local state if review item exists, otherwise refresh
        const existed = reviewItems.some(r => r.image_id === imageId);
        if (existed) {
          setReviewItems(prev =>
            prev.map(r => r.image_id === imageId ? { ...r, review_status: status, priority } as ReviewItem : r)
          );
        } else {
          await fetchData();
        }
        onDataChange();
        // Update the preview data to reflect new status
        setPreviewImage(prev => prev ? { ...prev, reviewStatus: status, priority } : prev);
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

  const handleBatchApprove = async (images: Image[]) => {
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
  const reviewedCount = reviewItems.filter(r =>
    submissions.some(s => s.id === r.submission_id) && r.review_status !== 'pending'
  ).length;
  const urgentCount = reviewItems.filter(r =>
    submissions.some(s => s.id === r.submission_id) && r.review_status === 'rejected' && r.priority === 'urgent'
  ).length;
  const scheduledCount = reviewItems.filter(r =>
    submissions.some(s => s.id === r.submission_id) && r.review_status === 'rejected' && r.priority === 'scheduled'
  ).length;
  const pendingCount = reviewItems.filter(r =>
    submissions.some(s => s.id === r.submission_id) && r.review_status === 'pending'
  ).length;

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

      {/* Smart Search */}
      <div className="bg-white rounded-xl p-4 border border-gray-100">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="智能搜索：输入门店名、区域、或图片类型（如玻璃贴、灯箱、门招）..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:border-[#1677ff] focus:ring-2 focus:ring-[#1677ff]/20 outline-none text-sm transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        {searchQuery && (
          <div className="mt-2 text-xs text-gray-500">
            搜索 "{searchQuery}" - 智能匹配门店名、区域、图片类型
          </div>
        )}
      </div>

      {/* Stats Bar */}
      <div className="bg-white rounded-xl p-4 border border-gray-100 flex flex-wrap gap-6">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">总图片数</span>
          <span className="text-lg font-bold text-gray-900">{totalImages}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">已审核</span>
          <span className="text-lg font-bold text-[#52c41a]">{reviewedCount}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">待审核</span>
          <span className="text-lg font-bold text-[#faad14]">{pendingCount}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">立即更换</span>
          <span className="text-lg font-bold text-[#1677ff]">{urgentCount}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">择期更换</span>
          <span className="text-lg font-bold text-[#faad14]">{scheduledCount}</span>
        </div>
      </div>

      {/* Store List */}
      <div className="space-y-3">
        {submissions
          .filter(s => {
            if (!searchQuery) return true;
            const q = searchQuery.toLowerCase();
            // 智能匹配：门店名、区域、分类、备注
            return (
              s.store_name?.toLowerCase().includes(q) ||
              s.area?.toLowerCase().includes(q) ||
              s.remark?.toLowerCase().includes(q) ||
              s.images.some(img => smartSearchMatch(searchQuery, categoryDisplay(img.category)))
            );
          })
          .map(submission => {
          const isExpanded = expandedStore === submission.id;
          // 搜索时只显示匹配的图片
          const storeImages = searchQuery
            ? submission.images.filter(img => smartSearchMatch(searchQuery, categoryDisplay(img.category)))
            : submission.images;
          const storeReviewItems = reviewItems.filter(r => r.submission_id === submission.id);
          const storeReviewed = storeReviewItems.filter(r => r.review_status !== 'pending').length;
          const storeTotal = storeImages.length;
          const hasReviewItems = storeReviewItems.length > 0;

          // 搜索时如果没有匹配的图片，跳过该门店
          if (searchQuery && storeImages.length === 0) return null;

          return (
            <div key={submission.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              {/* Store Header */}
              <button
                onClick={() => {
                  setExpandedStore(isExpanded ? null : submission.id);
                  // Auto-init review when expanding
                  if (!isExpanded && !hasReviewItems && storeTotal > 0) {
                    handleInitReview(submission.id);
                  }
                }}
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
                    <div className="text-sm font-medium text-gray-700">
                      {hasReviewItems ? `${storeReviewed}/${storeTotal}` : '未审核'}
                    </div>
                    <div className="text-xs text-gray-400">
                      {hasReviewItems ? '已审核' : '点击初始化'}
                    </div>
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
                  {/* Actions */}
                  <div className="flex items-center gap-3 py-3">
                    {hasReviewItems && (
                      <button
                        onClick={() => handleBatchApprove(storeImages)}
                        disabled={saving}
                        className="px-4 py-2 bg-[#52c41a] text-white text-sm rounded-lg hover:bg-[#73d13d] disabled:opacity-50 transition-colors"
                      >
                        一键全选不更新
                      </button>
                    )}
                    {submission.remark && (
                      <span className="text-xs text-gray-400">备注: {submission.remark}</span>
                    )}
                  </div>

                  {/* Images by Category */}
                  {CATEGORIES_ZH.map(category => {
                    // Map Chinese category name to English key for filtering
                    const enKey = CATEGORY_REVERSE_MAP[category] || category;
                    const categoryImages = storeImages.filter(img => img.category === enKey || img.category === category);
                    if (categoryImages.length === 0) return null;

                    return (
                      <div key={category} className="mb-4">
                        <div className="text-sm font-medium text-gray-700 mb-2">{category} ({categoryImages.length})</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {categoryImages.map(img => {
                            const status = getReviewStatus(img.id);
                            const priority = getReviewPriority(img.id);
                            const hasItem = getReviewItemId(img.id) !== undefined;
                            return (
                              <div key={img.id} className="border border-gray-100 rounded-lg overflow-hidden">
                                <div
                                  className="relative aspect-[4/3] bg-gray-50 cursor-pointer overflow-hidden"
                                  onClick={() => setPreviewImage({ url: img.image_url, id: img.id, submissionId: submission.id, category: img.category, storeName: submission.store_name, area: submission.area })}
                                >
                                  <img
                                    src={img.image_url}
                                    alt={`${category} - ${submission.store_name}`}
                                    loading="lazy"
                                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                                  />
                                  {status !== 'uninitialized' && status !== 'pending' && (
                                    <div className={`absolute top-2 right-2 px-2 py-0.5 rounded text-xs font-medium text-white ${
                                      status === 'approved' ? 'bg-[#52c41a]' :
                                      priority === 'scheduled' ? 'bg-[#faad14]' :
                                      'bg-[#1677ff]'
                                    }`}>
                                      {status === 'approved' ? '✓ 维持现状' : priority === 'scheduled' ? '📅 择期更换' : '🔄 立即更换'}
                                    </div>
                                  )}
                                </div>
                                <div className="p-2 flex gap-1">
                                  <button
                                    onClick={() => handleReview(img.id, 'approved')}
                                    disabled={saving || !hasItem}
                                    className={`flex-1 py-1.5 text-xs rounded-md font-medium transition-colors ${
                                      status === 'approved'
                                        ? 'bg-[#52c41a] text-white'
                                        : 'bg-green-50 text-[#52c41a] hover:bg-green-100'
                                    } disabled:opacity-40`}
                                  >
                                    ✓ 维持现状
                                  </button>
                                  <button
                                    onClick={() => handleReview(img.id, 'rejected', 'urgent')}
                                    disabled={saving || !hasItem}
                                    className={`flex-1 py-1.5 text-xs rounded-md font-medium transition-colors ${
                                      status === 'rejected' && priority === 'urgent'
                                        ? 'bg-[#1677ff] text-white'
                                        : 'bg-[#e6f4ff] text-[#1677ff] hover:bg-[#bae0ff]'
                                    } disabled:opacity-40`}
                                  >
                                    🔄 立即更换
                                  </button>
                                  <button
                                    onClick={() => handleReview(img.id, 'rejected', 'scheduled')}
                                    disabled={saving || !hasItem}
                                    className={`flex-1 py-1.5 text-xs rounded-md font-medium transition-colors ${
                                      status === 'rejected' && priority === 'scheduled'
                                        ? 'bg-[#faad14] text-white'
                                        : 'bg-[#fffbe6] text-[#faad14] hover:bg-[#fff1b8]'
                                    } disabled:opacity-40`}
                                  >
                                    📅 择期更换
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {storeTotal === 0 && (
                    <div className="text-center py-8 text-gray-400 text-sm">该门店暂无上传图片</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Image Preview */}
      {previewImage && (
        <ImagePreview
          data={previewImage}
          allImages={allImages}
          onClose={() => setPreviewImage(null)}
          onNavigate={(id) => setPreviewImage(allImages.find(i => i.id === id) || null)}
          onReview={handlePreviewReview}
        />
      )}
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { ImagePreview, type ImagePreviewData } from './image-preview';
import { toChineseCategory } from '@/lib/constants';

interface DesignTask {
  id: string;
  review_item_id: string;
  design_status: string;
  design_url: string | null;
  designer_note: string | null;
  created_at: string | null;
  updated_at: string | null;
  review_items: {
    id: string;
    category: string;
    review_status: string;
    priority?: string;
    submissions: { id: string; area: string; store_name: string };
    images: { id: string; image_url: string };
  };
  _priority?: string;
}

interface StoreGroup {
  submissionId: string;
  storeName: string;
  area: string;
  tasks: DesignTask[];
}

const STATUS_OPTIONS = [
  { value: 'pending', label: '待设计', color: '#faad14', bg: '#fffbe6' },
  { value: 'designing', label: '设计中', color: '#722ed1', bg: '#f9f0ff' },
  { value: 'completed', label: '已完成', color: '#1677ff', bg: '#e6f4ff' },
  { value: 'confirmed', label: '已确认', color: '#52c41a', bg: '#f6ffed' },
];

const STATUS_FILTER = ['all', 'pending', 'designing', 'completed', 'confirmed'];
const STATUS_LABELS: Record<string, string> = {
  all: '全部',
  pending: '待设计',
  designing: '设计中',
  completed: '已完成',
  confirmed: '已确认',
};

export function DesignPanel({ onDataChange }: { onDataChange: () => void }) {
  const [tasks, setTasks] = useState<DesignTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [previewImage, setPreviewImage] = useState<ImagePreviewData | null>(null);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [saving, setSaving] = useState(false);
  const [expandedStore, setExpandedStore] = useState<string | null>(null);

  const allImages = tasks.map(t => ({
    id: t.review_items?.images?.id || '',
    submissionId: t.review_items?.submissions?.id || '',
    url: t.review_items?.images?.image_url || '',
    category: t.review_items?.category || '',
    storeName: t.review_items?.submissions?.store_name || '',
    area: t.review_items?.submissions?.area || '',
  }));
  const handleNavigateImage = (imageId: string) => {
    const img = allImages.find(i => i.id === imageId);
    if (img) setPreviewImage(img);
  };

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (priorityFilter !== 'all') params.set('priority', priorityFilter);
      const res = await fetch(`/api/design${params.toString() ? `?${params}` : ''}`);
      const json = await res.json();
      if (json.success) setTasks(json.data);
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    setSaving(true);
    try {
      const res = await fetch('/api/design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', id: taskId, design_status: newStatus }),
      });
      const json = await res.json();
      if (json.success) {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, design_status: newStatus } : t));
        onDataChange();
      }
    } catch {
      // silently handle
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNote = async (taskId: string) => {
    setSaving(true);
    try {
      const res = await fetch('/api/design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', id: taskId, designer_note: noteText }),
      });
      const json = await res.json();
      if (json.success) {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, designer_note: noteText } : t));
        setEditingNote(null);
      }
    } catch {
      // silently handle
    } finally {
      setSaving(false);
    }
  };

  const handleUploadDesign = async (taskId: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp,image/gif';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setSaving(true);
      try {
        // Upload file
        const formData = new FormData();
        formData.append('file', file);
        formData.append('bucket', 'design-files');
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
        const uploadJson = await uploadRes.json();
        if (!uploadJson.success) {
          alert(uploadJson.error || '上传失败');
          return;
        }
        const url = uploadJson.data.url;

        // Update design task
        const res = await fetch('/api/design', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'update', id: taskId, design_url: url }),
        });
        const json = await res.json();
        if (json.success) {
          setTasks(prev => prev.map(t => t.id === taskId ? { ...t, design_url: url } : t));
        }
      } catch {
        alert('上传失败，请重试');
      } finally {
        setSaving(false);
      }
    };
    input.click();
  };

  const handleMarkUrgent = async (reviewItemId: string) => {
    setSaving(true);
    try {
      const res = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_priority', review_item_id: reviewItemId, priority: 'urgent' }),
      });
      if (!res.ok) throw new Error('Failed');
      await fetchTasks();
    } catch (error) {
      console.error('Mark urgent error:', error);
      alert('标记失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  // Group by store
  const storeMap = new Map<string, StoreGroup>();
  tasks.forEach(task => {
    const submission = task.review_items?.submissions;
    if (!submission) return;
    const storeId = submission.id;
    if (!storeMap.has(storeId)) {
      storeMap.set(storeId, {
        submissionId: storeId,
        storeName: submission.store_name,
        area: submission.area,
        tasks: [],
      });
    }
    storeMap.get(storeId)!.tasks.push(task);
  });
  const storeGroups = Array.from(storeMap.values());

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

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <line x1="3" y1="9" x2="21" y2="9" />
          <line x1="9" y1="21" x2="9" y2="9" />
        </svg>
        <p className="mt-4 text-sm">暂无设计任务</p>
        <p className="text-xs mt-1">完成画面审核后，标记为"需要更新"的项目会自动流入此步骤</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-xl p-4 border border-gray-100 space-y-2">
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-gray-400 self-center mr-1">状态:</span>
          {STATUS_FILTER.map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-[#1677ff] text-white'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {STATUS_LABELS[status]}
              {status !== 'all' && (
                <span className="ml-1 text-xs opacity-75">
                  ({tasks.filter(t => t.design_status === status).length})
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-gray-400 self-center mr-1">优先级:</span>
          {[
            { value: 'all', label: '全部' },
            { value: 'urgent', label: '🔄 立即更换' },
            { value: 'scheduled', label: ' 择期更换' },
          ].map(p => (
            <button
              key={p.value}
              onClick={() => setPriorityFilter(p.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                priorityFilter === p.value
                  ? 'bg-[#1677ff] text-white'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {p.label}
              {p.value !== 'all' && (
                <span className="ml-1 text-xs opacity-75">
                  ({tasks.filter(t => t._priority === p.value).length})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Stores */}
      {storeGroups.map(store => {
        const isExpanded = expandedStore === store.submissionId;
        const completedCount = store.tasks.filter(t => t.design_status === 'confirmed').length;
        const totalCount = store.tasks.length;

        return (
          <div key={store.submissionId} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            {/* Store Header */}
            <button
              onClick={() => setExpandedStore(isExpanded ? null : store.submissionId)}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#f9f0ff] flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#722ed1" strokeWidth="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                </div>
                <div className="text-left">
                  <div className="font-medium text-gray-900">{store.storeName}</div>
                  <div className="text-xs text-gray-500">{store.area} · {totalCount} 个设计任务</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-700">{completedCount}/{totalCount}</div>
                  <div className="text-xs text-gray-400">已确认</div>
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
                <div className="divide-y divide-gray-50">
                  {store.tasks.map(task => {
                    const image = task.review_items?.images;
                    const category = toChineseCategory(task.review_items?.category ?? '其他');
                    const statusInfo = STATUS_OPTIONS.find(s => s.value === task.design_status) ?? STATUS_OPTIONS[0];

                    return (
                      <div key={task.id} className="py-4">
                        <div className="flex flex-col sm:flex-row gap-4">
                          {/* Original Image */}
                          <div className="shrink-0">
                            <div
                              className="w-24 h-24 rounded-lg overflow-hidden bg-gray-50 cursor-pointer"
                              onClick={() => image?.image_url && setPreviewImage({ id: image.id, submissionId: store.submissionId, url: image.image_url, category: task.review_items?.category || '', storeName: store.storeName, area: store.area })}
                            >
                              {image?.image_url ? (
                                <img src={image.image_url} alt="原图" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-300">
                                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                    <circle cx="8.5" cy="8.5" r="1.5" />
                                    <polyline points="21 15 16 10 5 21" />
                                  </svg>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div>
                                <div className="text-sm font-medium text-gray-700">{category}</div>
                                <div className="flex items-center gap-1.5 mt-1">
                                  {task._priority === 'scheduled' && (
                                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#fffbe6] text-[#faad14]">
                                      📅 择期更换
                                    </span>
                                  )}
                                  <span
                                    className="px-2.5 py-0.5 rounded-full text-xs font-medium"
                                    style={{ backgroundColor: statusInfo.bg, color: statusInfo.color }}
                                  >
                                    {statusInfo.label}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Actions */}
                            {task._priority === 'scheduled' ? (
                              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                                <span className="text-xs text-gray-400">📅 择期更换 — 暂不设计，仅标记</span>
                                <button
                                  onClick={() => handleMarkUrgent(task.review_item_id)}
                                  disabled={saving}
                                  className="ml-auto px-3 py-1.5 bg-[#ff4d4f] text-white text-xs rounded-lg hover:bg-[#ff7875] disabled:opacity-50 transition-colors"
                                >
                                  标记为立即更换
                                </button>
                              </div>
                            ) : (
                            <>
                            {/* Design Preview */}
                            <div className="flex items-center gap-3 mb-2">
                              {task.design_url ? (
                                <div
                                  className="w-16 h-16 rounded-lg overflow-hidden bg-gray-50 cursor-pointer border-2 border-[#1677ff]"
                                  onClick={() => setPreviewImage({ id: task.id, submissionId: store.submissionId, url: task.design_url!, category: task.review_items?.category || '', storeName: store.storeName, area: store.area })}
                                >
                                  <img src={task.design_url} alt="设计稿" className="w-full h-full object-cover" />
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleUploadDesign(task.id)}
                                  disabled={saving}
                                  className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 hover:border-[#1677ff] hover:text-[#1677ff] transition-colors"
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="12" y1="5" x2="12" y2="19" />
                                    <line x1="5" y1="12" x2="19" y2="12" />
                                  </svg>
                                  <span className="text-[10px] mt-0.5">上传</span>
                                </button>
                              )}

                              {/* Status Selector */}
                              <select
                                value={task.design_status}
                                onChange={(e) => handleStatusChange(task.id, e.target.value)}
                                disabled={saving}
                                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1677ff]/20 focus:border-[#1677ff]"
                              >
                                {STATUS_OPTIONS.map(opt => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                              </select>
                            </div>

                            {/* Note */}
                            <div className="flex items-center gap-2">
                              {editingNote === task.id ? (
                                <div className="flex items-center gap-2 flex-1">
                                  <input
                                    type="text"
                                    value={noteText}
                                    onChange={(e) => setNoteText(e.target.value)}
                                    placeholder="输入设计师备注..."
                                    className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#1677ff]/20 focus:border-[#1677ff]"
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => handleSaveNote(task.id)}
                                    disabled={saving}
                                    className="px-3 py-1.5 bg-[#1677ff] text-white text-xs rounded-lg hover:bg-[#4096ff] disabled:opacity-50"
                                  >
                                    保存
                                  </button>
                                  <button
                                    onClick={() => setEditingNote(null)}
                                    className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs rounded-lg hover:bg-gray-200"
                                  >
                                    取消
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => { setEditingNote(task.id); setNoteText(task.designer_note ?? ''); }}
                                  className="text-xs text-gray-400 hover:text-[#1677ff] transition-colors"
                                >
                                  {task.designer_note ? `备注：${task.designer_note}` : '+ 添加备注'}
                                </button>
                              )}
                            </div>
                            </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Image Preview */}
      {previewImage && (
        <ImagePreview
          data={previewImage}
          allImages={allImages}
          onClose={() => setPreviewImage(null)}
          onNavigate={handleNavigateImage}
          onReview={async () => {}}
        />
      )}
    </div>
  );
}

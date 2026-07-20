'use client';

import { useState, useEffect, useCallback } from 'react';
import { ImagePreview } from './image-preview';
import { toChineseCategory } from '@/lib/constants';

interface InstallationTask {
  id: string;
  install_status: string;
  company_name: string | null;
  dispatch_date: string | null;
  install_date: string | null;
  return_photo_url: string | null;
  return_note: string | null;
  design_tasks: {
    id: string;
    design_status: string;
    design_url: string | null;
    review_items: {
      id: string;
      category: string;
      submissions: { id: string; area: string; store_name: string };
      images: { id: string; image_url: string };
    };
  };
}

const STATUS_OPTIONS = [
  { value: 'pending', label: '待派发', color: '#faad14', bg: '#fffbe6' },
  { value: 'dispatched', label: '已派发', color: '#13c2c2', bg: '#e6fffb' },
  { value: 'installing', label: '安装中', color: '#722ed1', bg: '#f9f0ff' },
  { value: 'completed', label: '已完成', color: '#52c41a', bg: '#f6ffed' },
];

const STATUS_FILTER = ['all', 'pending', 'dispatched', 'installing', 'completed'];
const STATUS_LABELS: Record<string, string> = {
  all: '全部',
  pending: '待派发',
  dispatched: '已派发',
  installing: '安装中',
  completed: '已完成',
};

const COMPANIES = ['广告公司A', '广告公司B', '广告公司C', '广告公司D', '广告公司E'];

export function InstallationPanel({ onDataChange }: { onDataChange: () => void }) {
  const [tasks, setTasks] = useState<InstallationTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    company_name: '',
    dispatch_date: '',
    install_date: '',
    return_photo_url: '',
    return_note: '',
  });
  const [saving, setSaving] = useState(false);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/installation${statusFilter !== 'all' ? `?status=${statusFilter}` : ''}`);
      const json = await res.json();
      if (json.success) setTasks(json.data);
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    setSaving(true);
    try {
      const res = await fetch('/api/installation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', id: taskId, install_status: newStatus }),
      });
      const json = await res.json();
      if (json.success) {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, install_status: newStatus } : t));
        onDataChange();
      }
    } catch {
      // silently handle
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async (taskId: string) => {
    setSaving(true);
    try {
      const res = await fetch('/api/installation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          id: taskId,
          company_name: editForm.company_name || null,
          dispatch_date: editForm.dispatch_date || null,
          install_date: editForm.install_date || null,
          return_photo_url: editForm.return_photo_url || null,
          return_note: editForm.return_note || null,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...editForm } : t));
        setEditingTask(null);
        onDataChange();
      }
    } catch {
      // silently handle
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (task: InstallationTask) => {
    setEditingTask(task.id);
    setEditForm({
      company_name: task.company_name ?? '',
      dispatch_date: task.dispatch_date ?? '',
      install_date: task.install_date ?? '',
      return_photo_url: task.return_photo_url ?? '',
      return_note: task.return_note ?? '',
    });
  };

  const handleUploadReturnPhoto = async (taskId: string) => {
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
        formData.append('bucket', 'return-photos');
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
        const uploadJson = await uploadRes.json();
        if (!uploadJson.success) {
          alert(uploadJson.error || '上传失败');
          return;
        }
        const url = uploadJson.data.url;

        // Update installation task
        const res = await fetch('/api/installation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'update', id: taskId, return_photo_url: url }),
        });
        const json = await res.json();
        if (json.success) {
          setTasks(prev => prev.map(t => t.id === taskId ? { ...t, return_photo_url: url } : t));
        }
      } catch {
        alert('上传失败，请重试');
      } finally {
        setSaving(false);
      }
    };
    input.click();
  };

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
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
        <p className="mt-4 text-sm">暂无安装任务</p>
        <p className="text-xs mt-1">设计稿确认后会自动流入此步骤</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status Filter */}
      <div className="bg-white rounded-xl p-4 border border-gray-100">
        <div className="flex flex-wrap gap-2">
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
            </button>
          ))}
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {tasks.map(task => {
          const reviewItem = task.design_tasks?.review_items;
          const submission = reviewItem?.submissions;
          const image = reviewItem?.images;
          const statusInfo = STATUS_OPTIONS.find(s => s.value === task.install_status) ?? STATUS_OPTIONS[0];
          const isEditing = editingTask === task.id;

          return (
            <div key={task.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Design Preview */}
                  <div className="shrink-0 flex gap-2">
                    {/* Original */}
                    <div
                      className="w-20 h-20 rounded-lg overflow-hidden bg-gray-50 cursor-pointer"
                      onClick={() => image?.image_url && setPreviewImage(image.image_url)}
                    >
                      {image?.image_url ? (
                        <img src={image.image_url} alt="原图" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                          </svg>
                        </div>
                      )}
                    </div>
                    {/* Design */}
                    {task.design_tasks?.design_url && (
                      <div
                        className="w-20 h-20 rounded-lg overflow-hidden bg-gray-50 cursor-pointer border-2 border-[#1677ff]"
                        onClick={() => setPreviewImage(task.design_tasks!.design_url!)}
                      >
                        <img src={task.design_tasks.design_url} alt="设计稿" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="font-medium text-gray-900">{submission?.store_name ?? '未知门店'}</div>
                        <div className="text-xs text-gray-500">
                          {submission?.area} · {toChineseCategory(reviewItem?.category ?? '')}
                          {task.company_name && ` · ${task.company_name}`}
                        </div>
                      </div>
                      <span
                        className="shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium"
                        style={{ backgroundColor: statusInfo.bg, color: statusInfo.color }}
                      >
                        {statusInfo.label}
                      </span>
                    </div>

                    {/* Dates */}
                    <div className="flex flex-wrap gap-4 text-xs text-gray-500 mb-2">
                      {task.dispatch_date && <span>派发日期: {task.dispatch_date}</span>}
                      {task.install_date && <span>安装日期: {task.install_date}</span>}
                    </div>

                    {/* Status & Actions */}
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={task.install_status}
                        onChange={(e) => handleStatusChange(task.id, e.target.value)}
                        disabled={saving}
                        className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1677ff]/20 focus:border-[#1677ff]"
                      >
                        {STATUS_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>

                      {!isEditing ? (
                        <button
                          onClick={() => openEdit(task)}
                          className="px-3 py-1.5 text-sm text-[#1677ff] bg-[#e6f4ff] rounded-lg hover:bg-[#bae0ff] transition-colors"
                        >
                          编辑详情
                        </button>
                      ) : null}

                      {!task.return_photo_url && (
                        <button
                          onClick={() => handleUploadReturnPhoto(task.id)}
                          disabled={saving}
                          className="px-3 py-1.5 text-sm text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          上传返图
                        </button>
                      )}

                      {task.return_photo_url && (
                        <div
                          className="w-10 h-10 rounded-lg overflow-hidden cursor-pointer border border-gray-200"
                          onClick={() => setPreviewImage(task.return_photo_url!)}
                        >
                          <img src={task.return_photo_url} alt="返图" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>

                    {/* Return Note */}
                    {task.return_note && (
                      <div className="mt-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                        安装备注: {task.return_note}
                      </div>
                    )}
                  </div>
                </div>

                {/* Edit Form */}
                {isEditing && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">广告公司</label>
                        <select
                          value={editForm.company_name}
                          onChange={(e) => setEditForm(prev => ({ ...prev, company_name: e.target.value }))}
                          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#1677ff]/20 focus:border-[#1677ff]"
                        >
                          <option value="">请选择</option>
                          {COMPANIES.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">派发日期</label>
                        <input
                          type="date"
                          value={editForm.dispatch_date}
                          onChange={(e) => setEditForm(prev => ({ ...prev, dispatch_date: e.target.value }))}
                          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#1677ff]/20 focus:border-[#1677ff]"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">安装日期</label>
                        <input
                          type="date"
                          value={editForm.install_date}
                          onChange={(e) => setEditForm(prev => ({ ...prev, install_date: e.target.value }))}
                          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#1677ff]/20 focus:border-[#1677ff]"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">返图照片</label>
                        <div className="flex items-center gap-2">
                          {editForm.return_photo_url ? (
                            <img src={editForm.return_photo_url} alt="返图" className="w-10 h-10 rounded object-cover" />
                          ) : null}
                          <button
                            type="button"
                            onClick={() => {
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.accept = 'image/jpeg,image/png,image/webp';
                              input.onchange = async (e) => {
                                const file = (e.target as HTMLInputElement).files?.[0];
                                if (!file) return;
                                const fd = new FormData();
                                fd.append('file', file);
                                fd.append('bucket', 'return-photos');
                                const res = await fetch('/api/upload', { method: 'POST', body: fd });
                                const json = await res.json();
                                if (json.success) {
                                  setEditForm(prev => ({ ...prev, return_photo_url: json.data.url }));
                                }
                              };
                              input.click();
                            }}
                            className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            {editForm.return_photo_url ? '更换' : '选择图片'}
                          </button>
                        </div>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-xs text-gray-500 mb-1 block">安装备注</label>
                        <input
                          type="text"
                          value={editForm.return_note}
                          onChange={(e) => setEditForm(prev => ({ ...prev, return_note: e.target.value }))}
                          placeholder="输入安装备注"
                          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#1677ff]/20 focus:border-[#1677ff]"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleSaveEdit(task.id)}
                        disabled={saving}
                        className="px-4 py-2 bg-[#1677ff] text-white text-sm rounded-lg hover:bg-[#4096ff] disabled:opacity-50 transition-colors"
                      >
                        保存
                      </button>
                      <button
                        onClick={() => setEditingTask(null)}
                        className="px-4 py-2 bg-gray-100 text-gray-600 text-sm rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                )}
              </div>
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

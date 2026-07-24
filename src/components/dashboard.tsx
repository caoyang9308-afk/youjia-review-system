'use client';

import { CATEGORIES_ZH, STORE_TYPES } from '@/lib/constants';
import { useState } from 'react';

export interface DashboardData {
  totalStores: number;
  totalImages: number;
  review: { pending: number; approved: number; rejected: number; total: number };
  design: { pending: number; designing: number; completed: number; confirmed: number; total: number };
  installation: { pending: number; dispatched: number; installing: number; completed: number; total: number };
  areas: Record<string, { total: number }>;
  categories: Record<string, { total: number; reviewed: number; pending: number }>;
}

export function Dashboard({ data, storeType, onStoreTypeChange }: { data: DashboardData | null; storeType?: string; onStoreTypeChange?: (type: string) => void }) {
  if (!data || (data.totalStores === 0 && data.totalImages === 0)) {
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

  const statCards = [
    { label: '总门店数', value: data.totalStores, color: '#1677ff', bg: '#e6f4ff' },
    { label: '总图片数', value: data.totalImages, color: '#13c2c2', bg: '#e6fffb' },
    { label: '待审核', value: data.review.pending, color: '#faad14', bg: '#fffbe6' },
    { label: '设计中', value: data.design.designing + data.design.pending, color: '#722ed1', bg: '#f9f0ff' },
    { label: '安装中', value: data.installation.installing + data.installation.dispatched, color: '#1677ff', bg: '#e6f4ff' },
    { label: '已完成', value: data.installation.completed, color: '#52c41a', bg: '#f6ffed' },
  ];

  const areaEntries = Object.entries(data.areas);
  const maxAreaTotal = Math.max(...areaEntries.map(([, v]) => v.total), 1);

  return (
    <div className="space-y-6">
      {/* Store Type Filter */}
      {onStoreTypeChange && (
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-500">门店标签:</span>
            {STORE_TYPES.map(type => (
              <button
                key={type}
                onClick={() => onStoreTypeChange(type)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  storeType === type
                    ? 'bg-[#1677ff] text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map(card => (
          <div key={card.label} className="bg-white rounded-xl p-5 border border-gray-100">
            <div className="text-sm text-gray-500 mb-2">{card.label}</div>
            <div className="text-3xl font-bold" style={{ color: card.color }}>
              {card.value}
            </div>
          </div>
        ))}
      </div>

      {/* Flow Visualization */}
      <div className="bg-white rounded-xl p-6 border border-gray-100">
        <h3 className="text-base font-semibold text-gray-900 mb-4">流程概览</h3>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <FlowStep
            label="画面审核"
            counts={[
              { label: '待审核', value: data.review.pending, color: '#faad14' },
              { label: '已通过', value: data.review.approved, color: '#52c41a' },
              { label: '需更新', value: data.review.rejected, color: '#ff4d4f' },
            ]}
          />
          <FlowArrow />
          <FlowStep
            label="设计跟踪"
            counts={[
              { label: '待设计', value: data.design.pending, color: '#faad14' },
              { label: '设计中', value: data.design.designing, color: '#722ed1' },
              { label: '已完成', value: data.design.completed, color: '#1677ff' },
              { label: '已确认', value: data.design.confirmed, color: '#52c41a' },
            ]}
          />
          <FlowArrow />
          <FlowStep
            label="安装派发"
            counts={[
              { label: '待派发', value: data.installation.pending, color: '#faad14' },
              { label: '已派发', value: data.installation.dispatched, color: '#13c2c2' },
              { label: '安装中', value: data.installation.installing, color: '#722ed1' },
              { label: '已完成', value: data.installation.completed, color: '#52c41a' },
            ]}
          />
        </div>
      </div>

      {/* Area Progress */}
      {areaEntries.length > 0 && (
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <h3 className="text-base font-semibold text-gray-900 mb-4">各区域门店数</h3>
          <div className="space-y-3">
            {areaEntries.map(([area, info]) => (
              <div key={area} className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-20 shrink-0">{area}</span>
                <div className="flex-1 h-6 bg-gray-50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#1677ff] rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                    style={{ width: `${Math.max((info.total / maxAreaTotal) * 100, 8)}%` }}
                  >
                    <span className="text-xs text-white font-medium">{info.total}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category Stats */}
      {Object.keys(data.categories).length > 0 && (
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <h3 className="text-base font-semibold text-gray-900 mb-4">分类上传统计</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">分类</th>
                  <th className="text-center py-2 px-3 text-gray-500 font-medium">图片总数</th>
                  <th className="text-center py-2 px-3 text-gray-500 font-medium">已审核</th>
                  <th className="text-center py-2 px-3 text-gray-500 font-medium">待审核</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium w-40">进度</th>
                </tr>
              </thead>
              <tbody>
                {CATEGORIES_ZH.map(cat => {
                  const catData = data.categories[cat] || { total: 0, reviewed: 0, pending: 0 };
                  const progress = catData.total > 0 ? (catData.reviewed / catData.total) * 100 : 0;
                  if (catData.total === 0) return null;
                  return (
                    <tr key={cat} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="py-2.5 px-3 text-gray-700">{cat}</td>
                      <td className="py-2.5 px-3 text-center text-gray-600">{catData.total}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="text-[#52c41a]">{catData.reviewed}</span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="text-[#faad14]">{catData.pending}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#1677ff] rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function FlowStep({ label, counts }: { label: string; counts: Array<{ label: string; value: number; color: string }> }) {
  return (
    <div className="flex-1 bg-gray-50 rounded-xl p-4 min-w-0">
      <div className="text-sm font-medium text-gray-700 mb-3 text-center">{label}</div>
      <div className="grid grid-cols-2 gap-2">
        {counts.map(c => (
          <div key={c.label} className="text-center">
            <div className="text-lg font-bold" style={{ color: c.color }}>{c.value}</div>
            <div className="text-xs text-gray-400">{c.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FlowArrow() {
  return (
    <div className="text-gray-300 shrink-0 hidden sm:block">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M5 12h14M12 5l7 7-7 7" />
      </svg>
    </div>
  );
}

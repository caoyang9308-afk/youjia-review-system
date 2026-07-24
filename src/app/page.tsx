'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dashboard, DashboardData } from '@/components/dashboard';
import { ReviewPanel } from '@/components/review-panel';
import { DesignPanel } from '@/components/design-panel';
import { InstallationPanel } from '@/components/installation-panel';

const TABS = [
  { key: 'dashboard', label: '概览' },
  { key: 'review', label: '画面审核' },
  { key: 'design', label: '设计跟踪' },
  { key: 'installation', label: '安装派发' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [badges, setBadges] = useState({ review: 0, design: 0, installation: 0 });
  const [storeType, setStoreType] = useState('全部');

  const fetchDashboard = useCallback(async (type?: string) => {
    try {
      const params = new URLSearchParams();
      if (type && type !== '全部') {
        params.set('storeType', type);
      }
      const res = await fetch(`/api/dashboard?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setDashboardData(json.data);
        setBadges({
          review: json.data.review.pending,
          design: json.data.design.pending + json.data.design.designing,
          installation: json.data.installation.pending + json.data.installation.dispatched + json.data.installation.installing,
        });
      }
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard(storeType);
  }, [fetchDashboard, storeType]);

  const refreshData = useCallback(() => {
    fetchDashboard(storeType);
  }, [fetchDashboard, storeType]);

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#1677ff] flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">有家酸菜鱼</h1>
                <p className="text-xs text-gray-500 -mt-0.5">品宣画面更新管理系统</p>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              共 {dashboardData?.totalStores ?? 0} 家门店
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex gap-1 overflow-x-auto">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`
                  relative px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors
                  ${activeTab === tab.key
                    ? 'text-[#1677ff]'
                    : 'text-gray-500 hover:text-gray-700'
                  }
                `}
              >
                <span className="flex items-center gap-1.5">
                  {tab.label}
                  {tab.key !== 'dashboard' && badges[tab.key] > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-medium rounded-full bg-[#1677ff] text-white">
                      {badges[tab.key]}
                    </span>
                  )}
                </span>
                {activeTab === tab.key && (
                  <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#1677ff] rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center gap-3 text-gray-400">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>加载中...</span>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && <Dashboard data={dashboardData} storeType={storeType} onStoreTypeChange={setStoreType} />}
            {activeTab === 'review' && <ReviewPanel onDataChange={refreshData} />}
            {activeTab === 'design' && <DesignPanel onDataChange={refreshData} />}
            {activeTab === 'installation' && <InstallationPanel onDataChange={refreshData} />}
          </>
        )}
      </main>
    </div>
  );
}

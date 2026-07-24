import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/storage/database/supabase-client-simple';
import { toChineseCategory, CATEGORIES_EN } from '@/lib/constants';

const REMOTE_API = 'https://5880716d-e978-4840-8f0f-1438eebd70f6.dev.coze.site/api/public/submissions';

// 缓存远程数据，5秒内不重复请求
let cachedRemoteData: any[] | null = null;
let cachedRemoteAt = 0;
const CACHE_TTL = 5000;

async function fetchRemoteSubmissions(): Promise<any[]> {
  const now = Date.now();
  if (cachedRemoteData && now - cachedRemoteAt < CACHE_TTL) {
    return cachedRemoteData;
  }
  try {
    const resp = await fetch(REMOTE_API, {
      signal: AbortSignal.timeout(30000),
      next: { revalidate: 5 },
    });
    const json = await resp.json();
    const data = json.data ?? [];
    // 远程API返回空时，降级到本地数据库
    if (data.length === 0) {
      return await fetchLocalSubmissions();
    }
    cachedRemoteData = data;
    cachedRemoteAt = now;
    return data;
  } catch {
    // 远程失败时降级到本地数据
    return await fetchLocalSubmissions();
  }
}

async function fetchLocalSubmissions(): Promise<any[]> {
  const client = supabaseAdmin;
  const { data: submissions } = await client
    .from('submissions')
    .select('id, area, store_name')
    .order('created_at', { ascending: false });
  if (!submissions) return [];

  const result = [];
  for (const s of submissions) {
    const { data: images } = await client
      .from('images')
      .select('id')
      .eq('submission_id', s.id);
    result.push({
      ...s,
      images: images || [],
    });
  }
  return result;
}

export async function GET() {
  try {
    const client = supabaseAdmin;

    // 实时从远程 API 获取最新门店和图片数据
    const submissions = await fetchRemoteSubmissions();
    const totalStores = submissions.length;
    const totalImages = submissions.reduce((sum: number, s: any) => sum + (s.images?.length || 0), 0);

    // Get review stats from local DB
    const { data: reviewItems, error: reviewErr } = await client
      .from('review_items')
      .select('review_status, category, priority')
      .limit(10000);
    if (reviewErr) throw new Error(`统计审核失败: ${reviewErr.message}`);

    const pendingReview = reviewItems?.filter(r => r.review_status === 'pending').length ?? 0;
    const approvedReview = reviewItems?.filter(r => r.review_status === 'approved').length ?? 0;
    const rejectedReview = reviewItems?.filter(r => r.review_status === 'rejected').length ?? 0;

    // Get design stats
    const { data: designItems, error: designErr } = await client
      .from('design_tasks')
      .select('design_status');
    if (designErr) throw new Error(`统计设计失败: ${designErr.message}`);

    const pendingDesign = designItems?.filter(d => d.design_status === 'pending').length ?? 0;
    const designing = designItems?.filter(d => d.design_status === 'designing').length ?? 0;
    const completedDesign = designItems?.filter(d => d.design_status === 'completed').length ?? 0;
    const confirmedDesign = designItems?.filter(d => d.design_status === 'confirmed').length ?? 0;

    // Get installation stats
    const { data: installItems, error: installErr } = await client
      .from('installation_tasks')
      .select('install_status');
    if (installErr) throw new Error(`统计安装失败: ${installErr.message}`);

    const pendingInstall = installItems?.filter(i => i.install_status === 'pending').length ?? 0;
    const dispatched = installItems?.filter(i => i.install_status === 'dispatched').length ?? 0;
    const installing = installItems?.filter(i => i.install_status === 'installing').length ?? 0;
    const completedInstall = installItems?.filter(i => i.install_status === 'completed').length ?? 0;

    // Get area progress from remote data
    const areaMap: Record<string, { total: number }> = {};
    submissions.forEach((s: any) => {
      if (!areaMap[s.area]) areaMap[s.area] = { total: 0 };
      areaMap[s.area].total++;
    });

    // Get category stats from remote data
    const categoryMap: Record<string, { total: number; reviewed: number; pending: number }> = {};
    CATEGORIES_EN.forEach(cat => {
      categoryMap[toChineseCategory(cat)] = { total: 0, reviewed: 0, pending: 0 };
    });

    submissions.forEach((s: any) => {
      (s.images || []).forEach((img: any) => {
        const zh = toChineseCategory(img.category);
        if (categoryMap[zh]) {
          categoryMap[zh].total++;
        }
      });
    });

    // Count reviewed images per category from local review_items
    reviewItems?.forEach(r => {
      const catZh = toChineseCategory(r.category);
      if (categoryMap[catZh]) {
        if (r.review_status !== 'pending') {
          categoryMap[catZh].reviewed++;
        }
      }
    });

    // Calculate pending per category
    Object.keys(categoryMap).forEach(cat => {
      categoryMap[cat].pending = categoryMap[cat].total - categoryMap[cat].reviewed;
    });

    return NextResponse.json({
      success: true,
      data: {
        totalStores,
        totalImages,
        review: {
          pending: pendingReview,
          approved: approvedReview,
          rejected: rejectedReview,
          total: reviewItems?.length ?? 0,
        },
        design: {
          pending: pendingDesign,
          designing: designing,
          completed: completedDesign,
          confirmed: confirmedDesign,
          total: designItems?.length ?? 0,
        },
        installation: {
          pending: pendingInstall,
          dispatched: dispatched,
          installing: installing,
          completed: completedInstall,
          total: installItems?.length ?? 0,
        },
        areas: areaMap,
        categories: categoryMap,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

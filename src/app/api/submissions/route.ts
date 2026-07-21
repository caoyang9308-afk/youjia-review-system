import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

const REMOTE_API = 'https://5880716d-e978-4840-8f0f-1438eebd70f6.dev.coze.site/api/public/submissions';

// 缓存远程数据，5秒内不重复请求
let cachedData: any[] | null = null;
let cachedAt = 0;
const CACHE_TTL = 5000;

async function fetchRemoteSubmissions(): Promise<any[]> {
  const now = Date.now();
  if (cachedData && now - cachedAt < CACHE_TTL) {
    return cachedData;
  }
  try {
    const resp = await fetch(REMOTE_API, {
      signal: AbortSignal.timeout(30000),
      next: { revalidate: 5 },
    });
    const json = await resp.json();
    const data = json.data ?? [];
    cachedData = data;
    cachedAt = now;
    return data;
  } catch {
    // 远程失败时降级到本地数据
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const area = searchParams.get('area');

    // 实时从远程 API 拉取最新数据
    let submissions = await fetchRemoteSubmissions();

    // 区域筛选
    if (area && area !== '全部') {
      submissions = submissions.filter((s: any) => s.area === area);
    }

    // 从本地数据库获取审核状态
    const client = getSupabaseClient();
    const { data: reviewItems } = await client
      .from('review_items')
      .select('image_id, review_status, priority')
      .in('image_id', submissions.flatMap((s: any) => (s.images || []).map((img: any) => img.id)));

    const reviewMap = new Map<string, { review_status: string; priority: string }>();
    (reviewItems || []).forEach((r: any) => {
      reviewMap.set(r.image_id, { review_status: r.review_status, priority: r.priority });
    });

    // 将审核状态注入到 submissions 数据中
    const result = submissions.map((s: any) => ({
      ...s,
      images: (s.images || []).map((img: any) => ({
        ...img,
        review_status: reviewMap.get(img.id)?.review_status || 'pending',
        priority: reviewMap.get(img.id)?.priority || 'urgent',
      })),
    }));

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

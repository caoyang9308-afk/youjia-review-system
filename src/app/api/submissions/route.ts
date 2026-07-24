import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/storage/database/supabase-client-simple';

// 直接从本地数据库获取数据，不依赖远程 API
async function fetchLocalSubmissions(): Promise<any[]> {
  const client = supabaseAdmin;
  const { data: submissions, error: subErr } = await client
    .from('submissions')
    .select('id, area, store_name, store_type, review_tags, remark, status, created_at, updated_at')
    .order('created_at', { ascending: false });
  if (subErr || !submissions) return [];

  // 逐个查询每个门店的图片，避免 1000 条限制
  const result = [];
  for (const s of submissions) {
    const { data: images } = await client
      .from('images')
      .select('id, submission_id, category, image_url, created_at')
      .eq('submission_id', s.id);
    result.push({
      ...s,
      images: images || [],
    });
  }

  return result;
}

export async function GET(request: NextRequest) {
  try {
    const client = supabaseAdmin;
    const { searchParams } = new URL(request.url);
    const area = searchParams.get('area');
    const storeType = searchParams.get('storeType');

    // 从本地数据库获取数据
    let submissions = await fetchLocalSubmissions();

    // 区域筛选
    if (area && area !== '全部') {
      submissions = submissions.filter((s: any) => s.area === area);
    }

    // 门店类型筛选（支持 store_type 和 review_tags）
    if (storeType && storeType !== '全部') {
      submissions = submissions.filter((s: any) => {
        // 检查 store_type 字段（逗号分隔的字符串）
        const storeTypeStr = s.store_type || '';
        if (storeTypeStr.includes(storeType)) return true;
        
        // 检查 review_tags 字段（逗号分隔的字符串）
        const reviewTagsStr = s.review_tags || '';
        if (reviewTagsStr.includes(storeType)) return true;
        
        // 检查 store_types 数组（兼容旧数据）
        const storeTypes = s.store_types || s.storeTypes || [];
        if (storeTypes.includes(storeType)) return true;
        
        return false;
      });
    }

    // 从本地数据库获取审核状态
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

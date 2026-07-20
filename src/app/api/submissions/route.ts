import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const area = searchParams.get('area');

    let query = client
      .from('submissions')
      .select('*, images(*)')
      .order('created_at', { ascending: false })
      .limit(10000);

    if (area && area !== '全部') {
      query = query.eq('area', area);
    }

    const { data, error } = await query;
    if (error) throw new Error(`查询提交数据失败: ${error.message}`);

    return NextResponse.json({ success: true, data: data ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = client
      .from('installation_tasks')
      .select(`
        *,
        design_tasks!inner(
          id,
          design_status,
          design_url,
          designer_note,
          review_items!inner(
            id,
            category,
            submissions!inner(id, area, store_name),
            images!inner(id, image_url)
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('install_status', status);
    }

    const { data, error } = await query;
    if (error) throw new Error(`查询安装任务失败: ${error.message}`);

    return NextResponse.json({ success: true, data: data ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();
    const { action, id, install_status, company_name, dispatch_date, install_date, return_photo_url, return_note } = body as {
      action: 'update';
      id: string;
      install_status?: string;
      company_name?: string;
      dispatch_date?: string;
      install_date?: string;
      return_photo_url?: string;
      return_note?: string;
    };

    if (action === 'update') {
      const updateData: Record<string, string | null> = {
        updated_at: new Date().toISOString(),
      };
      if (install_status !== undefined) updateData.install_status = install_status;
      if (company_name !== undefined) updateData.company_name = company_name;
      if (dispatch_date !== undefined) updateData.dispatch_date = dispatch_date;
      if (install_date !== undefined) updateData.install_date = install_date;
      if (return_photo_url !== undefined) updateData.return_photo_url = return_photo_url;
      if (return_note !== undefined) updateData.return_note = return_note;

      const { data, error: updateErr } = await client
        .from('installation_tasks')
        .update(updateData)
        .eq('id', id)
        .select()
        .maybeSingle();
      if (updateErr) throw new Error(`更新安装任务失败: ${updateErr.message}`);

      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json({ success: false, error: '无效的操作' }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

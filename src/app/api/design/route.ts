import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = client
      .from('design_tasks')
      .select(`
        *,
        review_items!inner(
          id,
          category,
          review_status,
          submissions!inner(id, area, store_name),
          images!inner(id, image_url)
        )
      `)
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('design_status', status);
    }

    const { data, error } = await query;
    if (error) throw new Error(`查询设计任务失败: ${error.message}`);

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
    const { action, id, design_status, design_url, designer_note } = body as {
      action: 'update';
      id: string;
      design_status?: string;
      design_url?: string;
      designer_note?: string;
    };

    if (action === 'update') {
      const updateData: Record<string, string | null> = {
        updated_at: new Date().toISOString(),
      };
      if (design_status !== undefined) updateData.design_status = design_status;
      if (design_url !== undefined) updateData.design_url = design_url;
      if (designer_note !== undefined) updateData.designer_note = designer_note;

      const { data, error: updateErr } = await client
        .from('design_tasks')
        .update(updateData)
        .eq('id', id)
        .select()
        .maybeSingle();
      if (updateErr) throw new Error(`更新设计任务失败: ${updateErr.message}`);

      // If confirmed, auto-create installation task
      if (design_status === 'confirmed') {
        const { data: existingInstall } = await client
          .from('installation_tasks')
          .select('id')
          .eq('design_task_id', id)
          .maybeSingle();

        if (!existingInstall) {
          const { error: installErr } = await client
            .from('installation_tasks')
            .insert({ design_task_id: id, install_status: 'pending' });
          if (installErr) throw new Error(`创建安装任务失败: ${installErr.message}`);
        }
      }

      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json({ success: false, error: '无效的操作' }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

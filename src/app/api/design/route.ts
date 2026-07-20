import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');

    // Fetch design tasks (from "立即更换" items)
    let query = client
      .from('design_tasks')
      .select(`
        *,
        review_items!inner(
          id,
          category,
          review_status,
          priority,
          submissions!inner(id, area, store_name),
          images!inner(id, image_url)
        )
      `)
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('design_status', status);
    }

    const { data: designTasks, error } = await query;
    if (error) throw new Error(`查询设计任务失败: ${error.message}`);

    // Also fetch "择期更换" review items (no design task yet)
    let scheduledQuery = client
      .from('review_items')
      .select(`
        id,
        category,
        review_status,
        priority,
        submissions!inner(id, area, store_name),
        images!inner(id, image_url)
      `)
      .eq('review_status', 'rejected')
      .eq('priority', 'scheduled')
      .order('reviewed_at', { ascending: false, nullsFirst: true });

    const { data: scheduledItems, error: schedErr } = await scheduledQuery;
    if (schedErr) throw new Error(`查询择期更换项失败: ${schedErr.message}`);

    // Combine: design tasks + scheduled items (as pseudo design tasks)
    const tasks = (designTasks ?? []).map(t => ({
      ...t,
      _source: 'design_task' as const,
      _priority: t.review_items?.priority ?? 'urgent',
    }));

    const scheduled = (scheduledItems ?? []).map(item => ({
      id: `scheduled-${item.id}`,
      review_item_id: item.id,
      design_status: 'scheduled',
      design_url: null,
      designer_note: null,
      created_at: null,
      updated_at: null,
      review_items: item,
      _source: 'scheduled' as const,
      _priority: 'scheduled',
    }));

    let combined = [...tasks, ...scheduled];

    // Filter by priority if requested
    if (priority && priority !== 'all') {
      combined = combined.filter(item => item._priority === priority);
    }

    return NextResponse.json({ success: true, data: combined });
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

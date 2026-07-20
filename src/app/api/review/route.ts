import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const submissionId = searchParams.get('submission_id');

    let query = client
      .from('review_items')
      .select(`
        *,
        submissions!inner(id, area, store_name),
        images!inner(id, image_url, category)
      `)
      .order('reviewed_at', { ascending: false });

    if (submissionId) {
      query = query.eq('submission_id', submissionId);
    }

    const { data, error } = await query;
    if (error) throw new Error(`查询审核项失败: ${error.message}`);

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
    const { action, items } = body as {
      action: 'create' | 'update' | 'batch_update' | 'batch_create';
      items: Array<{
        id?: string;
        submission_id?: string;
        image_id?: string;
        category?: string;
        review_status?: string;
        review_note?: string;
      }>;
    };

    if (action === 'batch_create') {
      // Create review items for all images in a submission
      const submissionId = items[0]?.submission_id;
      if (!submissionId) throw new Error('缺少 submission_id');

      // Get all images for this submission
      const { data: images, error: imgErr } = await client
        .from('images')
        .select('id, category')
        .eq('submission_id', submissionId);
      if (imgErr) throw new Error(`查询图片失败: ${imgErr.message}`);
      if (!images?.length) throw new Error('该门店暂无上传图片');

      // Check existing review items
      const { data: existing, error: existErr } = await client
        .from('review_items')
        .select('image_id')
        .eq('submission_id', submissionId);
      if (existErr) throw new Error(`查询已有审核项失败: ${existErr.message}`);

      const existingImageIds = new Set(existing?.map(e => e.image_id) ?? []);
      const newItems = images
        .filter(img => !existingImageIds.has(img.id))
        .map(img => ({
          submission_id: submissionId,
          image_id: img.id,
          category: img.category,
          review_status: 'pending',
        }));

      if (newItems.length > 0) {
        const { error: insertErr } = await client.from('review_items').insert(newItems);
        if (insertErr) throw new Error(`创建审核项失败: ${insertErr.message}`);
      }

      return NextResponse.json({ success: true, data: { created: newItems.length } });
    }

    if (action === 'batch_update') {
      // Batch update review statuses
      const updates = items.filter(item => item.id && item.review_status);
      if (updates.length === 0) throw new Error('无有效更新项');

      for (const item of updates) {
        const { error: updateErr } = await client
          .from('review_items')
          .update({
            review_status: item.review_status,
            review_note: item.review_note ?? null,
            reviewed_at: new Date().toISOString(),
          })
          .eq('id', item.id!);
        if (updateErr) throw new Error(`更新审核项失败: ${updateErr.message}`);
      }

      // Auto-create design tasks for rejected items (需要更新)
      const rejectedIds = updates.filter(u => u.review_status === 'rejected').map(u => u.id!);
      if (rejectedIds.length > 0) {
        const { data: rejectedItems, error: fetchErr } = await client
          .from('review_items')
          .select('id')
          .in('id', rejectedIds);
        if (fetchErr) throw new Error(`查询需更新项失败: ${fetchErr.message}`);

        if (rejectedItems && rejectedItems.length > 0) {
          // Check which already have design tasks
          const { data: existingDesigns } = await client
            .from('design_tasks')
            .select('review_item_id')
            .in('review_item_id', rejectedIds);

          const existingDesignIds = new Set(existingDesigns?.map(d => d.review_item_id) ?? []);
          const newDesignItems = rejectedItems
            .filter(r => !existingDesignIds.has(r.id))
            .map(r => ({
              review_item_id: r.id,
              design_status: 'pending',
            }));

          if (newDesignItems.length > 0) {
            const { error: designErr } = await client.from('design_tasks').insert(newDesignItems);
            if (designErr) throw new Error(`创建设计任务失败: ${designErr.message}`);
          }
        }
      }

      return NextResponse.json({ success: true, data: { updated: updates.length } });
    }

    if (action === 'update' && items[0]?.id) {
      const item = items[0];
      const { data, error: updateErr } = await client
        .from('review_items')
        .update({
          review_status: item.review_status,
          review_note: item.review_note ?? null,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', item.id)
        .select()
        .maybeSingle();
      if (updateErr) throw new Error(`更新审核项失败: ${updateErr.message}`);
      return NextResponse.json({ success: true, data });
    }

    if (action === 'create' && items[0]) {
      const item = items[0];
      const { data, error: insertErr } = await client
        .from('review_items')
        .insert({
          submission_id: item.submission_id!,
          image_id: item.image_id!,
          category: item.category!,
          review_status: item.review_status ?? 'pending',
        })
        .select()
        .maybeSingle();
      if (insertErr) throw new Error(`创建审核项失败: ${insertErr.message}`);
      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json({ success: false, error: '无效的操作' }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

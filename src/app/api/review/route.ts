import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/storage/database/supabase-client-simple';

export async function GET(request: NextRequest) {
  try {
    const client = supabaseAdmin;
    const { searchParams } = new URL(request.url);
    const submissionId = searchParams.get('submission_id');
    const status = searchParams.get('status');

    let query = client
      .from('review_items')
      .select(`
        *,
        submissions!inner(id, area, store_name),
        images!inner(id, image_url, category)
      `)
      .order('reviewed_at', { ascending: false, nullsFirst: true });

    if (submissionId) {
      query = query.eq('submission_id', submissionId);
    }
    if (status && status !== 'all') {
      query = query.eq('review_status', status);
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
    const client = supabaseAdmin;
    const body = await request.json();
    const { action, items } = body as {
      action: 'batch_create' | 'batch_update' | 'update';
      items: Array<{
        id?: string;
        submission_id?: string;
        image_id?: string;
        category?: string;
        review_status?: string;
        priority?: string;
        review_note?: string;
      }>;
    };

    if (action === 'batch_create') {
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
      const updates = items.filter(item => item.id && item.review_status);
      if (updates.length === 0) throw new Error('无有效更新项');

      for (const item of updates) {
        const { error: updateErr } = await client
          .from('review_items')
          .update({
            review_status: item.review_status!,
            priority: item.priority ?? 'urgent',
            review_note: item.review_note ?? null,
            reviewed_at: new Date().toISOString(),
          })
          .eq('id', item.id!);
        if (updateErr) throw new Error(`更新审核项失败: ${updateErr.message}`);
      }

      // Auto-create design tasks ONLY for urgent rejected items (立即更换)
      const urgentRejectedIds = updates
        .filter(u => u.review_status === 'rejected' && (u.priority ?? 'urgent') === 'urgent')
        .map(u => u.id!);
      if (urgentRejectedIds.length > 0) {
        // Check which already have design tasks
        const { data: existingDesigns } = await client
          .from('design_tasks')
          .select('review_item_id')
          .in('review_item_id', urgentRejectedIds);

        const existingDesignIds = new Set(existingDesigns?.map(d => d.review_item_id) ?? []);
        const newDesignItems = urgentRejectedIds
          .filter(id => !existingDesignIds.has(id))
          .map(id => ({
            review_item_id: id,
            design_status: 'pending',
          }));

        if (newDesignItems.length > 0) {
          const { error: designErr } = await client.from('design_tasks').insert(newDesignItems);
          if (designErr) throw new Error(`创建设计任务失败: ${designErr.message}`);
        }
      }

      return NextResponse.json({ success: true, data: { updated: updates.length } });
    }

    if (action === 'update' && items[0]?.id) {
      const item = items[0];
      const priority = item.priority ?? 'urgent';
      const { data, error: updateErr } = await client
        .from('review_items')
        .update({
          review_status: item.review_status!,
          priority,
          review_note: item.review_note ?? null,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', item.id)
        .select()
        .maybeSingle();
      if (updateErr) throw new Error(`更新审核项失败: ${updateErr.message}`);

      // Update submission with review tags if provided
      if (item.review_tags && item.review_tags.length > 0) {
        const { error: tagErr } = await client
          .from('submissions')
          .update({ review_tags: item.review_tags.join(',') })
          .eq('id', item.submission_id || (data as any)?.submission_id);
        if (tagErr) console.error('更新审核标签失败:', tagErr.message);
      }

      // If rejected with urgent priority, auto-create design task
      if (item.review_status === 'rejected' && priority === 'urgent' && data) {
        const { data: existingDesign } = await client
          .from('design_tasks')
          .select('id')
          .eq('review_item_id', item.id)
          .maybeSingle();

        if (!existingDesign) {
          const { error: designErr } = await client
            .from('design_tasks')
            .insert({ review_item_id: item.id, design_status: 'pending' });
          if (designErr) throw new Error(`创建设计任务失败: ${designErr.message}`);
        }
      }

      return NextResponse.json({ success: true, data });
    }

    // Update by image_id (used from image preview modal)
    if (action === 'update' && items[0]?.image_id) {
      const item = items[0];
      const priority = item.priority ?? 'urgent';

      // Look up existing review_item by image_id
      const { data: existing } = await client
        .from('review_items')
        .select('id, submission_id')
        .eq('image_id', item.image_id)
        .maybeSingle();

      let reviewItemId: string;

      if (existing) {
        // Update existing review item
        reviewItemId = existing.id;
        const { error: updateErr } = await client
          .from('review_items')
          .update({
            review_status: item.review_status!,
            priority,
            review_note: item.review_note ?? null,
            reviewed_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
        if (updateErr) throw new Error(`更新审核项失败: ${updateErr.message}`);

        // Update submission with review tags if provided
        if (item.review_tags && item.review_tags.length > 0) {
          const { error: tagErr } = await client
            .from('submissions')
            .update({ review_tags: item.review_tags.join(',') })
            .eq('id', item.submission_id || existing.submission_id);
          if (tagErr) console.error('更新审核标签失败:', tagErr.message);
        }
      } else {
        // Create new review item using submission_id from request
        if (!item.submission_id) throw new Error('缺少 submission_id');
        
        // Ensure submission exists locally (for FK constraint)
        const { data: existingSub } = await client
          .from('submissions')
          .select('id')
          .eq('id', item.submission_id)
          .maybeSingle();
        if (!existingSub) {
          // Insert a stub submission record
          await client.from('submissions').insert({
            id: item.submission_id,
            area: '',
            store_name: '',
            status: 'submitted',
          });
        }

        // Ensure image exists locally (for FK constraint)
        const { data: existingImg } = await client
          .from('images')
          .select('id')
          .eq('id', item.image_id)
          .maybeSingle();
        if (!existingImg) {
          await client.from('images').insert({
            id: item.image_id,
            submission_id: item.submission_id,
            category: item.category || '',
            image_url: '',
          });
        }
        
        const category = item.category || '';
        
        const { data: newItem, error: insertErr } = await client
          .from('review_items')
          .insert({
            submission_id: item.submission_id,
            image_id: item.image_id,
            category,
            review_status: item.review_status!,
            priority,
            review_note: item.review_note ?? null,
            reviewed_at: new Date().toISOString(),
          })
          .select()
          .single();
        if (insertErr || !newItem) throw new Error(`创建审核项失败: ${insertErr?.message ?? '未知错误'}`);
        reviewItemId = newItem.id;
      }

      // If rejected with urgent priority, auto-create design task
      if (item.review_status === 'rejected' && priority === 'urgent') {
        const { data: existingDesign } = await client
          .from('design_tasks')
          .select('id')
          .eq('review_item_id', reviewItemId)
          .maybeSingle();

        if (!existingDesign) {
          const { error: designErr } = await client
            .from('design_tasks')
            .insert({ review_item_id: reviewItemId, design_status: 'pending' });
          if (designErr) throw new Error(`创建设计任务失败: ${designErr.message}`);
        }
      }

      return NextResponse.json({ success: true, data: { review_item_id: reviewItemId } });
    }

    // Update priority action (change from scheduled to urgent)
    if (body.action === 'update_priority') {
      const { review_item_id, priority } = body;
      if (!review_item_id || !priority) {
        return NextResponse.json({ success: false, error: '缺少参数' }, { status: 400 });
      }

      // Update the priority
      const { data, error: updateErr } = await client
        .from('review_items')
        .update({ priority })
        .eq('id', review_item_id)
        .select()
        .maybeSingle();
      if (updateErr) throw new Error(`更新优先级失败: ${updateErr.message}`);

      // If changing to urgent, auto-create design task if not exists
      if (priority === 'urgent' && data?.review_status === 'rejected') {
        const { data: existingDesign } = await client
          .from('design_tasks')
          .select('id')
          .eq('review_item_id', review_item_id)
          .maybeSingle();

        if (!existingDesign) {
          await client.from('design_tasks').insert({ review_item_id, design_status: 'pending' });
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

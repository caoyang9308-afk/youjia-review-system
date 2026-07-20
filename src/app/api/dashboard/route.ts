import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET() {
  try {
    const client = getSupabaseClient();

    // Get total submissions count
    const { count: totalStores, error: storeErr } = await client
      .from('submissions')
      .select('*', { count: 'exact', head: true });
    if (storeErr) throw new Error(`统计门店数失败: ${storeErr.message}`);

    // Get review stats
    const { data: reviewItems, error: reviewErr } = await client
      .from('review_items')
      .select('review_status');
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

    // Get area progress
    const { data: submissions, error: subErr } = await client
      .from('submissions')
      .select('area, id');
    if (subErr) throw new Error(`获取区域数据失败: ${subErr.message}`);

    const areaMap: Record<string, { total: number; completed: number }> = {};
    submissions?.forEach(s => {
      if (!areaMap[s.area]) areaMap[s.area] = { total: 0, completed: 0 };
      areaMap[s.area].total++;
    });

    // Get category stats from review items
    const { data: reviewWithCategory, error: catErr } = await client
      .from('review_items')
      .select('category, review_status');
    if (catErr) throw new Error(`获取分类统计失败: ${catErr.message}`);

    const categoryMap: Record<string, { total: number; approved: number; rejected: number; pending: number }> = {};
    reviewWithCategory?.forEach(r => {
      if (!categoryMap[r.category]) categoryMap[r.category] = { total: 0, approved: 0, rejected: 0, pending: 0 };
      categoryMap[r.category].total++;
      if (r.review_status === 'approved') categoryMap[r.category].approved++;
      else if (r.review_status === 'rejected') categoryMap[r.category].rejected++;
      else categoryMap[r.category].pending++;
    });

    return NextResponse.json({
      success: true,
      data: {
        totalStores: totalStores ?? 0,
        review: {
          pending: pendingReview,
          approved: approvedReview,
          rejected: rejectedReview,
          total: reviewItems?.length ?? 0,
        },
        design: {
          pending: pendingDesign,
          designing,
          completed: completedDesign,
          confirmed: confirmedDesign,
          total: designItems?.length ?? 0,
        },
        installation: {
          pending: pendingInstall,
          dispatched,
          installing,
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

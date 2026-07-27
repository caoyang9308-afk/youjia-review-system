import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/storage/database/supabase-client-simple';
import ExcelJS from 'exceljs';

export async function GET() {
  try {
    // 获取所有设计任务
    const { data: designTasks, error: designError } = await supabaseAdmin
      .from('design_tasks')
      .select('id, review_item_id, design_status, design_url, designer_note, priority, created_at, completed_at')
      .order('created_at', { ascending: false });

    if (designError) {
      console.error('Design tasks error:', designError);
      return NextResponse.json({ error: '获取设计任务失败' }, { status: 500 });
    }

    console.log('Design tasks count:', designTasks?.length || 0);

    // 创建工作簿
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('设计跟踪');

    // 设置列
    sheet.columns = [
      { header: '门店名称', width: 25 },
      { header: '区域', width: 15 },
      { header: '分类', width: 20 },
      { header: '原图', width: 40 },
      { header: '设计图', width: 40 },
      { header: '状态', width: 12 },
      { header: '优先级', width: 10 },
      { header: '提交时间', width: 20 },
      { header: '完成时间', width: 20 },
    ];

    // 设置表头样式
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // 添加数据
    if (designTasks && designTasks.length > 0) {
      for (const task of designTasks) {
        // 获取关联的审核项和图片
        const { data: reviewItem } = await supabaseAdmin
          .from('review_items')
          .select('category, submission_id, images(image_url, category)')
          .eq('id', task.review_item_id)
          .single();

        // 获取门店信息
        let storeName = '';
        let area = '';
        if (reviewItem?.submission_id) {
          const { data: submission } = await supabaseAdmin
            .from('submissions')
            .select('store_name, area')
            .eq('id', reviewItem.submission_id)
            .single();
          storeName = submission?.store_name || '';
          area = submission?.area || '';
        }

        // 获取原图 URL
        const originalImage = reviewItem?.images?.[0]?.image_url || '';

        // 状态映射
        const statusMap: Record<string, string> = {
          pending: '待设计',
          designing: '设计中',
          completed: '设计完成',
        };

        // 优先级映射
        const priorityMap: Record<string, string> = {
          high: '高',
          medium: '中',
          low: '低',
        };

        sheet.addRow([
          storeName,
          area,
          reviewItem?.category || '',
          originalImage,
          task.design_url || '',
          statusMap[task.design_status] || task.design_status,
          priorityMap[task.priority || 'medium'] || '中',
          task.created_at ? new Date(task.created_at).toLocaleString('zh-CN') : '',
          task.completed_at ? new Date(task.completed_at).toLocaleString('zh-CN') : '',
        ]);
      }
    }

    // 生成 Excel 文件
    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename=设计跟踪_${new Date().toISOString().split('T')[0]}.xlsx`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: '导出失败' }, { status: 500 });
  }
}

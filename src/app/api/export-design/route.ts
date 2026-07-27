import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/storage/database/supabase-client-simple';
import ExcelJS from 'exceljs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const storeName = searchParams.get('storeName');
    const category = searchParams.get('category');

    // 获取所有设计任务
    let query = supabaseAdmin
      .from('design_tasks')
      .select(`
        id,
        review_item_id,
        design_status,
        design_url,
        designer_note,
        created_at,
        updated_at,
        review_items!inner (
          id,
          category,
          review_status,
          submission_id,
          images!inner (
            id,
            image_url,
            category,
            submissions!inner (
              id,
              store_name,
              area
            )
          )
        )
      `);

    const { data: designTasks, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 创建工作簿
    const workbook = new ExcelJS.Workbook();
    workbook.creator = '有家酸菜鱼品宣管理系统';
    workbook.created = new Date();

    // 按门店分组
    const storeGroups: { [key: string]: any[] } = {};
    designTasks?.forEach(task => {
      const reviewItem = task.review_items as any;
      const image = reviewItem?.images as any;
      const submission = image?.submissions as any;
      
      if (submission) {
        const storeKey = submission.store_name;
        if (!storeGroups[storeKey]) {
          storeGroups[storeKey] = [];
        }
        storeGroups[storeKey].push({
          task,
          reviewItem,
          image,
          submission
        });
      }
    });

    // 为每个门店创建工作表
    for (const [storeName, tasks] of Object.entries(storeGroups)) {
      const worksheet = workbook.addWorksheet(storeName.substring(0, 31)); // Excel 工作表名最长 31 字符

      // 设置列
      worksheet.columns = [
        { header: '门店名称', key: 'storeName', width: 20 },
        { header: '区域', key: 'area', width: 15 },
        { header: '图片分类', key: 'category', width: 15 },
        { header: '审核状态', key: 'reviewStatus', width: 12 },
        { header: '设计状态', key: 'designStatus', width: 12 },
        { header: '原图 URL', key: 'imageUrl', width: 40 },
        { header: '设计稿 URL', key: 'designUrl', width: 40 },
        { header: '设计师备注', key: 'designerNote', width: 30 },
        { header: '创建时间', key: 'createdAt', width: 18 },
        { header: '更新时间', key: 'updatedAt', width: 18 }
      ];

      // 添加数据
      tasks.forEach(({ task, reviewItem, image, submission }) => {
        worksheet.addRow({
          storeName: submission.store_name,
          area: submission.area,
          category: image.category,
          reviewStatus: reviewItem.review_status,
          designStatus: task.design_status,
          imageUrl: image.image_url,
          designUrl: task.design_url || '',
          designerNote: task.designer_note || '',
          createdAt: task.created_at ? new Date(task.created_at).toLocaleString('zh-CN') : '',
          updatedAt: task.updated_at ? new Date(task.updated_at).toLocaleString('zh-CN') : ''
        });
      });

      // 设置样式
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1677FF' }
      };
      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    }

    // 如果没有数据，创建一个空工作表
    if (Object.keys(storeGroups).length === 0) {
      const worksheet = workbook.addWorksheet('设计任务');
      worksheet.columns = [
        { header: '门店名称', key: 'storeName', width: 20 },
        { header: '区域', key: 'area', width: 15 },
        { header: '图片分类', key: 'category', width: 15 },
        { header: '设计状态', key: 'designStatus', width: 12 }
      ];
    }

    // 生成 Excel 文件
    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="设计跟踪_${new Date().toISOString().split('T')[0]}.xlsx"`
      }
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: '导出失败' }, { status: 500 });
  }
}

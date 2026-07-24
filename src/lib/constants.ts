// English category keys from the remote system -> Chinese display names
export const CATEGORY_MAP: Record<string, string> = {
  storefront: '店招门头',
  indoorLightbox: '店内软膜灯箱',
  indoorGlow: '店内发光字',
  honorWall: '品牌荣誉墙',
  storeMaterial: '门店物料',
  mallLightbox: '商场内品牌灯箱广告',
  outdoorAd: '商场外/户外广告画面',
};

// Reverse map: Chinese -> English
export const CATEGORY_REVERSE_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(CATEGORY_MAP).map(([en, zh]) => [zh, en])
);

// Ordered list of Chinese category names
export const CATEGORIES_ZH = [
  '店招门头',
  '店内软膜灯箱',
  '店内发光字',
  '品牌荣誉墙',
  '门店物料',
  '商场内品牌灯箱广告',
  '商场外/户外广告画面',
];

// Ordered list of English category keys
export const CATEGORIES_EN = Object.keys(CATEGORY_MAP);

// Helper: translate English category to Chinese
export function toChineseCategory(en: string): string {
  return CATEGORY_MAP[en] ?? en;
}

// Helper: translate Chinese category to English
export function toEnglishCategory(zh: string): string {
  return CATEGORY_REVERSE_MAP[zh] ?? zh;
}

// Area list
export const AREAS = ['全部', '苏州一区', '苏州二区', '苏州三区', '苏州四区', '苏州五区', '南京区域', '无锡区域', '浙江区域'];

// Store types for filtering
export const STORE_TYPES = ['全部', '多灯箱门店', '大户外广告', '老店', '荣誉牌不一致'];

// Smart search keywords mapping (用户搜索词 -> 匹配的分类关键词)
export const SEARCH_KEYWORD_MAP: Record<string, string[]> = {
  '玻璃贴': ['灯箱', '软膜'],
  '玻璃': ['灯箱', '软膜'],
  '贴': ['灯箱', '软膜', '门招'],
  '灯箱': ['灯箱'],
  '软膜': ['软膜灯箱'],
  '门招': ['店招门头', '门头'],
  '门头': ['店招门头', '门头'],
  '招牌': ['店招门头'],
  '发光字': ['发光字'],
  '字': ['发光字'],
  '荣誉墙': ['荣誉墙'],
  '荣誉': ['荣誉墙'],
  '物料': ['门店物料'],
  '商场': ['商场', '灯箱广告'],
  '户外': ['户外广告'],
  '广告': ['广告', '灯箱'],
};

// 智能搜索：将用户输入映射到相关分类
export function smartSearchMatch(query: string, categoryZh: string): boolean {
  const q = query.toLowerCase();
  const cat = categoryZh.toLowerCase();
  
  // 直接匹配
  if (cat.includes(q)) return true;
  
  // 通过关键词映射匹配
  for (const [keyword, targets] of Object.entries(SEARCH_KEYWORD_MAP)) {
    if (q.includes(keyword.toLowerCase())) {
      return targets.some(t => cat.includes(t.toLowerCase()));
    }
  }
  
  return false;
}

// Review actions
export const REVIEW_ACTIONS = {
  keep: { label: '维持现状', icon: '✓', color: 'text-gray-600 bg-gray-50 hover:bg-gray-100' },
  urgent: { label: '立即更换', icon: '🔄', color: 'text-[#1677ff] bg-[#e6f4ff] hover:bg-[#bae0ff]' },
  scheduled: { label: '择期更换', icon: '📅', color: 'text-[#faad14] bg-[#fffbe6] hover:bg-[#fff1b8]' },
} as const;

// Priority labels for display
export const PRIORITY_LABELS: Record<string, string> = {
  urgent: '立即更换',
  scheduled: '择期更换',
};

export const PRIORITY_TAG_STYLES: Record<string, string> = {
  urgent: 'bg-[#e6f4ff] text-[#1677ff]',
  scheduled: 'bg-[#fffbe6] text-[#faad14]',
};

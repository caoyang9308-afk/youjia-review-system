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
export const STORE_TYPES = ['全部', '多灯箱门店', '大户外广告', '最新装修', '次新装修', '老装修', '荣誉牌不一致', '1.0 更换门店', '2.0 更换门店', '3.0 更换门店', '不整改', '不改造门店', '70+ 元素'];

// 审核标签（与 STORE_TYPES 保持一致，去掉"全部"）
export const REVIEW_TAGS = [
  { id: "multi_lightbox", label: "多灯箱门店", color: "bg-blue-100 text-blue-700" },
  { id: "large_outdoor", label: "大户外广告", color: "bg-blue-100 text-blue-700" },
  { id: "new_renovation", label: "最新装修", color: "bg-green-100 text-green-700" },
  { id: "semi_new_renovation", label: "次新装修", color: "bg-cyan-100 text-cyan-700" },
  { id: "old_renovation", label: "老装修", color: "bg-gray-100 text-gray-700" },
  { id: "honor_mismatch", label: "荣誉牌不一致", color: "bg-purple-100 text-purple-700" },
  { id: "1.0_replacement", label: "1.0 更换门店", color: "bg-red-100 text-red-700" },
  { id: "2.0_replacement", label: "2.0 更换门店", color: "bg-orange-100 text-orange-700" },
  { id: "3.0_replacement", label: "3.0 更换门店", color: "bg-yellow-100 text-yellow-700" },
  { id: "no_reform", label: "不整改", color: "bg-gray-200 text-gray-700" },
  { id: "no_renovation", label: "不改造门店", color: "bg-gray-200 text-gray-700" },
  { id: "70_plus_elements", label: "70+ 元素", color: "bg-pink-100 text-pink-700" },
] as const;

export type ReviewTagId = typeof REVIEW_TAGS[number]["id"];

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

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

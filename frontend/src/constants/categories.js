export const CATEGORIES = [
  { id: 1, name: '전자기기', icon: '📱' },
  { id: 2, name: '의류·신발', icon: '👕' },
  { id: 3, name: '가방·지갑', icon: '👜' },
  { id: 4, name: '액세서리', icon: '⌚' },
  { id: 5, name: '책·문구', icon: '📚' },
  { id: 6, name: '기타', icon: '📦' },
];

export const getCategoryName = (categoryId) => {
  const category = CATEGORIES.find((c) => c.id === categoryId);
  return category?.name || '기타';
};

export const getCategoryIcon = (categoryId) => {
  const category = CATEGORIES.find((c) => c.id === categoryId);
  return category?.icon || '📦';
};

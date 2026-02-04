import { envConfig } from '../config/environment';

/**
 * بناء URL كامل للصور من المسار النسبي
 * @param relativePath - المسار النسبي للصورة (مثل: /uploads/companies/logo.png)
 * @returns URL كامل للصورة
 */
export const getImageUrl = (relativePath: string | null | undefined): string | null => {
  if (!relativePath) return null;
  
  // إذا كان المسار كامل بالفعل (يبدأ بـ http أو https)
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    return relativePath;
  }
  
  // إزالة الـ slash الأولى إذا كانت موجودة لتجنب التكرار
  const cleanPath = relativePath.startsWith('/') ? relativePath.substring(1) : relativePath;
  
  // بناء URL كامل
  return `${envConfig.backendUrl}/${cleanPath}`;
};

/**
 * بناء URL للوجو الشركة
 * @param logoPath - مسار اللوجو
 * @returns URL كامل أو null
 */
export const getCompanyLogoUrl = (logoPath: string | null | undefined): string | null => {
  return getImageUrl(logoPath);
};

/**
 * بناء URL لصورة المنتج
 * @param imagePath - مسار الصورة
 * @returns URL كامل أو null
 */
export const getProductImageUrl = (imagePath: string | null | undefined): string | null => {
  return getImageUrl(imagePath);
};

/**
 * بناء URL لصورة المستخدم
 * @param avatarPath - مسار الصورة الشخصية
 * @returns URL كامل أو null
 */
export const getUserAvatarUrl = (avatarPath: string | null | undefined): string | null => {
  return getImageUrl(avatarPath);
};

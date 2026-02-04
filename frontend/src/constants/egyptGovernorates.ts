export interface Governorate {
  id: string;
  nameAr: string;
  nameEn: string;
  region: 'cairo' | 'delta' | 'canal' | 'sinai' | 'upper' | 'red-sea';
  regionNameAr: string;
  popular: boolean;
}

export const EGYPT_REGIONS = {
  cairo: 'القاهرة الكبرى',
  delta: 'الوجه البحري',
  canal: 'منطقة القناة',
  sinai: 'سيناء',
  upper: 'الصعيد',
  'red-sea': 'البحر الأحمر',
} as const;

export const EGYPT_GOVERNORATES: Governorate[] = [
  // القاهرة الكبرى
  { id: 'cairo', nameAr: 'القاهرة', nameEn: 'Cairo', region: 'cairo', regionNameAr: 'القاهرة الكبرى', popular: true },
  { id: 'giza', nameAr: 'الجيزة', nameEn: 'Giza', region: 'cairo', regionNameAr: 'القاهرة الكبرى', popular: true },
  { id: 'qalyubia', nameAr: 'القليوبية', nameEn: 'Qalyubia', region: 'cairo', regionNameAr: 'القاهرة الكبرى', popular: true },
  { id: '6th-october', nameAr: '6 أكتوبر', nameEn: '6th of October', region: 'cairo', regionNameAr: 'القاهرة الكبرى', popular: true },
  { id: 'sheikh-zayed', nameAr: 'الشيخ زايد', nameEn: 'Sheikh Zayed', region: 'cairo', regionNameAr: 'القاهرة الكبرى', popular: true },
  { id: 'new-cairo', nameAr: 'القاهرة الجديدة', nameEn: 'New Cairo', region: 'cairo', regionNameAr: 'القاهرة الكبرى', popular: true },
  { id: 'helwan', nameAr: 'حلوان', nameEn: 'Helwan', region: 'cairo', regionNameAr: 'القاهرة الكبرى', popular: false },
  { id: '15th-may', nameAr: '15 مايو', nameEn: '15th of May', region: 'cairo', regionNameAr: 'القاهرة الكبرى', popular: false },

  // الوجه البحري
  { id: 'alexandria', nameAr: 'الإسكندرية', nameEn: 'Alexandria', region: 'delta', regionNameAr: 'الوجه البحري', popular: true },
  { id: 'beheira', nameAr: 'البحيرة', nameEn: 'Beheira', region: 'delta', regionNameAr: 'الوجه البحري', popular: false },
  { id: 'gharbia', nameAr: 'الغربية', nameEn: 'Gharbia', region: 'delta', regionNameAr: 'الوجه البحري', popular: false },
  { id: 'kafr-el-sheikh', nameAr: 'كفر الشيخ', nameEn: 'Kafr El Sheikh', region: 'delta', regionNameAr: 'الوجه البحري', popular: false },
  { id: 'dakahlia', nameAr: 'الدقهلية', nameEn: 'Dakahlia', region: 'delta', regionNameAr: 'الوجه البحري', popular: false },
  { id: 'damietta', nameAr: 'دمياط', nameEn: 'Damietta', region: 'delta', regionNameAr: 'الوجه البحري', popular: false },
  { id: 'sharqia', nameAr: 'الشرقية', nameEn: 'Sharqia', region: 'delta', regionNameAr: 'الوجه البحري', popular: false },
  { id: 'monufia', nameAr: 'المنوفية', nameEn: 'Monufia', region: 'delta', regionNameAr: 'الوجه البحري', popular: false },

  // منطقة القناة
  { id: 'port-said', nameAr: 'بورسعيد', nameEn: 'Port Said', region: 'canal', regionNameAr: 'منطقة القناة', popular: true },
  { id: 'ismailia', nameAr: 'الإسماعيلية', nameEn: 'Ismailia', region: 'canal', regionNameAr: 'منطقة القناة', popular: true },
  { id: 'suez', nameAr: 'السويس', nameEn: 'Suez', region: 'canal', regionNameAr: 'منطقة القناة', popular: true },

  // سيناء
  { id: 'north-sinai', nameAr: 'شمال سيناء', nameEn: 'North Sinai', region: 'sinai', regionNameAr: 'سيناء', popular: false },
  { id: 'south-sinai', nameAr: 'جنوب سيناء', nameEn: 'South Sinai', region: 'sinai', regionNameAr: 'سيناء', popular: false },

  // الصعيد
  { id: 'giza-upper', nameAr: 'الجيزة (الصعيد)', nameEn: 'Giza (Upper)', region: 'upper', regionNameAr: 'الصعيد', popular: false },
  { id: 'fayoum', nameAr: 'الفيوم', nameEn: 'Fayoum', region: 'upper', regionNameAr: 'الصعيد', popular: false },
  { id: 'beni-suef', nameAr: 'بني سويف', nameEn: 'Beni Suef', region: 'upper', regionNameAr: 'الصعيد', popular: false },
  { id: 'minya', nameAr: 'المنيا', nameEn: 'Minya', region: 'upper', regionNameAr: 'الصعيد', popular: false },
  { id: 'asyut', nameAr: 'أسيوط', nameEn: 'Asyut', region: 'upper', regionNameAr: 'الصعيد', popular: false },
  { id: 'sohag', nameAr: 'سوهاج', nameEn: 'Sohag', region: 'upper', regionNameAr: 'الصعيد', popular: false },
  { id: 'qena', nameAr: 'قنا', nameEn: 'Qena', region: 'upper', regionNameAr: 'الصعيد', popular: false },
  { id: 'luxor', nameAr: 'الأقصر', nameEn: 'Luxor', region: 'upper', regionNameAr: 'الصعيد', popular: false },
  { id: 'aswan', nameAr: 'أسوان', nameEn: 'Aswan', region: 'upper', regionNameAr: 'الصعيد', popular: false },

  // البحر الأحمر
  { id: 'red-sea', nameAr: 'البحر الأحمر', nameEn: 'Red Sea', region: 'red-sea', regionNameAr: 'البحر الأحمر', popular: false },
  { id: 'new-valley', nameAr: 'الوادي الجديد', nameEn: 'New Valley', region: 'red-sea', regionNameAr: 'البحر الأحمر', popular: false },
  { id: 'matrouh', nameAr: 'مطروح', nameEn: 'Matrouh', region: 'red-sea', regionNameAr: 'البحر الأحمر', popular: false },
];

export const getGovernoratesByRegion = (region: string) => {
  return EGYPT_GOVERNORATES.filter(gov => gov.region === region);
};

export const getPopularGovernorates = () => {
  return EGYPT_GOVERNORATES.filter(gov => gov.popular);
};

export const getGovernorateById = (id: string) => {
  return EGYPT_GOVERNORATES.find(gov => gov.id === id);
};

export const getGovernorateByName = (name: string) => {
  const normalized = name.trim().toLowerCase();
  return EGYPT_GOVERNORATES.find(gov => 
    gov.nameAr.toLowerCase() === normalized || 
    gov.nameEn.toLowerCase() === normalized
  );
};

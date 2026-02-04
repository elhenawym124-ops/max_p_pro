import { apiClient } from './apiClient';

export interface HomepageSection {
  id: string;
  type: 'hero' | 'features' | 'products' | 'banner' | 'categories' | 'testimonials' | 'custom';
  [key: string]: any;
}

export interface HomepageContent {
  sections: HomepageSection[];
  settings: {
    containerWidth: 'full' | 'contained';
    spacing: 'compact' | 'normal' | 'relaxed';
    animation: boolean;
  };
}

export interface HomepageTemplate {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  content: HomepageContent;
  thumbnail?: string;
  isActive: boolean;
  isSystem?: boolean; // New field to identify global system templates
  createdAt: string;
  updatedAt: string;
}

// Mock Data
const MOCK_SYSTEM_TEMPLATES: HomepageTemplate[] = [
  {
    id: 'sys_1',
    companyId: 'system',
    name: 'متجر إلكترونيات عصري',
    description: 'قالب مثالي للمتاجر التقنية، يركز على المواصفات والصور الكبيرة.',
    content: {
      sections: [
        { id: 's1', type: 'hero' },
        { id: 's2', type: 'features' },
        { id: 's3', type: 'products' }
      ],
      settings: {
        containerWidth: 'full',
        spacing: 'normal',
        animation: true
      }
    },
    thumbnail: 'https://placehold.co/600x400/10b981/ffffff?text=Electronics+Theme',
    isActive: false,
    isSystem: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'sys_2',
    companyId: 'system',
    name: 'بوتيك أزياء',
    description: 'تصميم أنيق وبسيط لعرض الملابس والموضة.',
    content: {
      sections: [
        { id: 's1', type: 'banner' },
        { id: 's2', type: 'categories' },
        { id: 's3', type: 'products' }
      ],
      settings: {
        containerWidth: 'contained',
        spacing: 'relaxed',
        animation: true
      }
    },
    thumbnail: 'https://placehold.co/600x400/8b5cf6/ffffff?text=Fashion+Boutique',
    isActive: false,
    isSystem: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'sys_woodmart',
    companyId: 'system',
    name: 'WoodMart Clone (النسخة الاحترافية)',
    description: 'تصميم متكامل يحاكي قالب WoodMart الشهير، مع قوائم سفلية للموبايل وتصميم متجاوب.',
    content: {
      sections: [
        {
          id: 'hero',
          type: 'hero_grid',
          title: 'Hero Banners',
          items: [
            // Left Banner (Tall)
            {
              id: 'banner_1',
              type: 'tall',
              image: '/woodmart_temp/Marketplace WordPress theme _ WoodMart_files/market-banner-4.jpg',
              title: 'MEIZU BACKPACK',
              price: '$49.00',
              link: '#',
              position: 'left' // Logic for rendering order
            },
            // Middle Top
            {
              id: 'banner_2',
              type: 'small',
              image: '/woodmart_temp/Marketplace WordPress theme _ WoodMart_files/market-banner-2.jpg',
              title: 'WOOL SCARVES',
              link: '#',
              linkText: 'View More',
              position: 'center-top'
            },
            // Middle Bottom
            {
              id: 'banner_3',
              type: 'small',
              image: '/woodmart_temp/Marketplace WordPress theme _ WoodMart_files/market-banner-3.jpg',
              title: 'APPLE MACBOOK',
              link: '#',
              linkText: 'View More',
              position: 'center-bottom'
            },
            // Right Large
            {
              id: 'banner_4',
              type: 'large',
              image: '/woodmart_temp/Marketplace WordPress theme _ WoodMart_files/market-banner-1.jpg',
              title: 'MODERN DINING CHAIR',
              subtitle: 'It is a long established fact that a reader will be distracted.',
              price: '$189.00',
              link: '#',
              position: 'right'
            }
          ]
        },
        {
          id: 'categories',
          type: 'categories',
          title: 'Product Categories',
          items: [
            { title: 'FURNITURE', icon: '🪑' },
            { title: 'MOBILE PHONES', icon: '📱' },
            { title: 'FASHION', icon: '👔' },
            { title: 'BAGS & SHOES', icon: '👜' },
            { title: 'WATCHES', icon: '⌚' },
            { title: 'OUTDOOR', icon: '🚴' },
            { title: 'GAMING', icon: '🎮' },
            { title: 'BABY & KIDS', icon: '👶' }
          ]
        },
        {
          id: 'products',
          type: 'products',
          title: 'Best of the Week',
          count: 6
        },
        {
          id: 'newsletter',
          type: 'custom',
          title: 'Newsletter',
          content: {
            html: `
              <div class="bg-[#DB3340] p-8 text-white text-center rounded my-8">
                <h3 class="font-bold text-2xl mb-2">SIGN UP TO OUR NEWSLETTER</h3>
                <p class="text-sm mb-6 text-white/90">It is a long established fact that a reader will be distracted.</p>
                <div class="flex gap-2 justify-center max-w-md mx-auto">
                    <input type="email" placeholder="Your email address" class="flex-1 px-4 py-3 text-gray-800 rounded-sm" />
                    <button class="bg-black text-white px-6 py-3 font-bold rounded-sm hover:bg-gray-900 transition-colors">Sign up</button>
                </div>
              </div>`
          }
        }
      ],
      settings: {
        containerWidth: 'full',
        spacing: 'normal',
        animation: true,
        themeId: 'woodmart'
      }
    },
    thumbnail: 'https://placehold.co/600x400/83b735/ffffff?text=WoodMart+Replica',
    isActive: false,
    isSystem: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const homepageService = {
  // Get all homepage templates (Company specific)
  getTemplates: async () => {
    return apiClient.get<{ data: HomepageTemplate[] }>('/homepage/templates');
  },

  // Get system templates (Global) - Mocked for now
  getSystemTemplates: async () => {
    // In a real app, this would be GET /homepage/templates/system
    // returning templates where isSystem = true
    return new Promise<{ data: HomepageTemplate[] }>((resolve) => {
      setTimeout(() => {
        resolve({
          data: MOCK_SYSTEM_TEMPLATES
        });
      }, 500);
    });
  },

  // Simulate harvesting/promoting a template
  promoteToSystem: async (templateId: string) => {
    // POST /admin/homepage/promote/${templateId}
    return new Promise((resolve) => setTimeout(resolve, 800));
  },

  // Import a system template to company
  importSystemTemplate: async (systemTemplateId: string) => {
    // This effectively duplicates a system template into the company's templates
    // POST /homepage/templates/import/${systemTemplateId}
    // We can simulate this by calling duplicate but assuming backend handles the source
    return apiClient.post<{ data: HomepageTemplate }>(`/homepage/templates/import-system`, { systemTemplateId });
  },

  // Get active homepage template
  getActiveTemplate: async () => {
    return apiClient.get<{ data: HomepageTemplate }>('/homepage/active');
  },

  // Get public active homepage (for storefront) - NO AUTH REQUIRED
  getPublicActiveTemplate: async (companyId: string) => {
    // apiClient base URL includes /api/v1
    return apiClient.get<{ data: HomepageTemplate }>(`/homepage/public/${companyId}`);
  },

  // Create new homepage template
  createTemplate: async (data: Partial<HomepageTemplate>) => {
    return apiClient.post<{ data: HomepageTemplate }>('/homepage/templates', data);
  },

  // Create demo template
  createDemoTemplate: async () => {
    return apiClient.post<{ data: HomepageTemplate }>('/homepage/templates/demo', {});
  },

  // Update homepage template
  updateTemplate: async (id: string, data: Partial<HomepageTemplate>) => {
    return apiClient.put<{ data: HomepageTemplate }>(`/homepage/templates/${id}`, data);
  },

  // Set active homepage template
  setActiveTemplate: async (id: string) => {
    return apiClient.put<{ data: HomepageTemplate }>(`/homepage/templates/${id}/activate`, {});
  },

  // Duplicate homepage template
  duplicateTemplate: async (id: string) => {
    return apiClient.post<{ data: HomepageTemplate }>(`/homepage/templates/${id}/duplicate`, {});
  },

  // Delete homepage template
  deleteTemplate: async (id: string) => {
    return apiClient.delete(`/homepage/templates/${id}`);
  },

  // Get a single system template by ID (Mock)
  getSystemTemplateById: async (id: string) => {
    // In a real app, GET /homepage/templates/system/${id}
    return new Promise<{ data: HomepageTemplate }>((resolve, reject) => {
      setTimeout(() => {
        // Reuse the same mock data for consistency
        homepageService.getSystemTemplates().then(response => {
          const template = response.data.find(t => t.id === id);
          if (template) {
            resolve({ data: template });
          } else {
            reject(new Error('Template not found'));
          }
        });
      }, 300);
    });
  },

  // Update a system template (Mock)
  updateSystemTemplate: async (id: string, data: Partial<HomepageTemplate>) => {
    // In a real app, PUT /homepage/templates/system/${id}
    return new Promise<{ data: HomepageTemplate }>((resolve) => {
      setTimeout(() => {
        console.log(`📝 [System Template] Updated ${id}:`, data);
        resolve({
          data: {
            id,
            companyId: 'system',
            name: data.name || 'Updated Template',
            isActive: false,
            isSystem: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            content: data.content as HomepageContent,
            ...data
          } as HomepageTemplate
        });
      }, 500);
    });
  }
};

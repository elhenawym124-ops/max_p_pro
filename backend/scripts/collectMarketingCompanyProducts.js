/**
 * سكريبت لجمع معلومات منتجات شركة التسويق
 * يجمع معلومات المنتجات ويحفظها في ملف JSON
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');
const fs = require('fs').promises;
const path = require('path');

async function collectMarketingCompanyProducts() {
  try {
    // const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues
    
    console.log('\n🔍 البحث عن شركة "شركة التسويق"...\n');

    // البحث عن شركة التسويق
    const companies = await getSharedPrismaClient().company.findMany({
      where: {
        OR: [
          { name: { contains: 'التسويق' } },
          { name: { contains: 'تسويق' } },
          { email: { contains: 'marketing' } }
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        website: true,
        isActive: true,
        plan: true,
        currency: true,
        createdAt: true
      }
    });

    if (companies.length === 0) {
      console.log('❌ لم يتم العثور على شركة "شركة التسويق"');
      console.log('\n📋 جميع الشركات الموجودة:\n');
      
      const allCompanies = await getSharedPrismaClient().company.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          isActive: true
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      });

      allCompanies.forEach((company, index) => {
        console.log(`${index + 1}. ${company.name}`);
        console.log(`   ID: ${company.id}`);
        console.log(`   Email: ${company.email}`);
        console.log(`   Active: ${company.isActive ? '✅' : '❌'}`);
        console.log('');
      });

      throw new Error('لم يتم العثور على شركة التسويق');
    }

    // استخدام أول شركة نشطة أو أول شركة
    const company = companies.find(c => c.isActive) || companies[0];
    console.log(`✅ تم العثور على الشركة: ${company.name} (${company.id})\n`);

    // جلب جميع المنتجات
    console.log('📦 جلب منتجات الشركة...\n');
    
    const products = await getSharedPrismaClient().product.findMany({
      where: {
        companyId: company.id
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            description: true
          }
        },
        variants: {
          where: { isActive: true },
          orderBy: [
            { type: 'asc' },
            { sortOrder: 'asc' }
          ]
        },
        _count: {
          select: {
            orderItems: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`✅ تم جلب ${products.length} منتج\n`);

    // جلب الفئات
    const categories = await getSharedPrismaClient().category.findMany({
      where: {
        companyId: company.id
      },
      include: {
        _count: {
          select: {
            products: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    // تحضير البيانات
    const companyData = {
      company: {
        id: company.id,
        name: company.name,
        email: company.email,
        phone: company.phone,
        website: company.website,
        isActive: company.isActive,
        plan: company.plan,
        currency: company.currency,
        createdAt: company.createdAt,
        totalProducts: products.length,
        totalCategories: categories.length
      },
      categories: categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        description: cat.description,
        productCount: cat._count.products
      })),
      products: products.map(product => {
        // معالجة الصور
        let images = [];
        if (product.images) {
          try {
            images = JSON.parse(product.images);
          } catch (e) {
            if (typeof product.images === 'string') {
              images = [product.images];
            }
          }
        }

        // معالجة metadata
        let metadata = {};
        if (product.metadata) {
          try {
            metadata = JSON.parse(product.metadata);
          } catch (e) {
            metadata = {};
          }
        }

        // معالجة tags
        let tags = [];
        if (product.tags) {
          try {
            tags = JSON.parse(product.tags);
          } catch (e) {
            if (typeof product.tags === 'string') {
              tags = product.tags.split(',').map(t => t.trim());
            }
          }
        }

        return {
          id: product.id,
          name: product.name,
          description: product.description,
          sku: product.sku,
          barcode: product.barcode,
          price: parseFloat(product.price),
          comparePrice: product.comparePrice ? parseFloat(product.comparePrice) : null,
          cost: product.cost ? parseFloat(product.cost) : null,
          stock: product.stock,
          trackInventory: product.trackInventory,
          weight: product.weight ? parseFloat(product.weight) : null,
          dimensions: product.dimensions,
          images: images,
          tags: tags,
          metadata: metadata,
          isActive: product.isActive,
          isFeatured: product.isFeatured,
          hasPromotedAd: product.hasPromotedAd,
          category: product.category ? {
            id: product.category.id,
            name: product.category.name,
            description: product.category.description
          } : null,
          categoryId: product.categoryId,
          variants: product.variants.map(variant => {
            let variantImages = [];
            if (variant.images) {
              try {
                variantImages = JSON.parse(variant.images);
              } catch (e) {
                if (typeof variant.images === 'string') {
                  variantImages = [variant.images];
                }
              }
            }

            let variantMetadata = {};
            if (variant.metadata) {
              try {
                variantMetadata = JSON.parse(variant.metadata);
              } catch (e) {
                variantMetadata = {};
              }
            }

            return {
              id: variant.id,
              name: variant.name,
              type: variant.type,
              sku: variant.sku,
              price: variant.price ? parseFloat(variant.price) : null,
              comparePrice: variant.comparePrice ? parseFloat(variant.comparePrice) : null,
              cost: variant.cost ? parseFloat(variant.cost) : null,
              stock: variant.stock,
              trackInventory: variant.trackInventory,
              images: variantImages,
              metadata: variantMetadata,
              isActive: variant.isActive,
              sortOrder: variant.sortOrder
            };
          }),
          orderCount: product._count.orderItems,
          createdAt: product.createdAt,
          updatedAt: product.updatedAt
        };
      }),
      summary: {
        totalProducts: products.length,
        activeProducts: products.filter(p => p.isActive).length,
        inactiveProducts: products.filter(p => !p.isActive).length,
        featuredProducts: products.filter(p => p.isFeatured).length,
        productsWithImages: products.filter(p => {
          if (!p.images) return false;
          try {
            const imgs = JSON.parse(p.images);
            return Array.isArray(imgs) && imgs.length > 0;
          } catch {
            return typeof p.images === 'string' && p.images.length > 0;
          }
        }).length,
        productsWithVariants: products.filter(p => p.variants.length > 0).length,
        totalCategories: categories.length,
        productsInStock: products.filter(p => p.stock > 0).length,
        productsOutOfStock: products.filter(p => p.stock === 0).length,
        averagePrice: products.length > 0 
          ? products.reduce((sum, p) => sum + parseFloat(p.price), 0) / products.length 
          : 0,
        minPrice: products.length > 0 
          ? Math.min(...products.map(p => parseFloat(p.price))) 
          : 0,
        maxPrice: products.length > 0 
          ? Math.max(...products.map(p => parseFloat(p.price))) 
          : 0
      },
      collectedAt: new Date().toISOString()
    };

    // حفظ البيانات في ملف JSON
    const outputDir = path.join(__dirname, '..', 'data');
    await fs.mkdir(outputDir, { recursive: true });
    
    const outputFile = path.join(outputDir, 'marketing-company-products.json');
    await fs.writeFile(outputFile, JSON.stringify(companyData, null, 2), 'utf8');

    console.log('✅ تم حفظ البيانات في:', outputFile);
    console.log('\n📊 ملخص البيانات:\n');
    console.log(`   الشركة: ${companyData.company.name}`);
    console.log(`   إجمالي المنتجات: ${companyData.summary.totalProducts}`);
    console.log(`   المنتجات النشطة: ${companyData.summary.activeProducts}`);
    console.log(`   المنتجات غير النشطة: ${companyData.summary.inactiveProducts}`);
    console.log(`   المنتجات المميزة: ${companyData.summary.featuredProducts}`);
    console.log(`   المنتجات مع صور: ${companyData.summary.productsWithImages}`);
    console.log(`   المنتجات مع variants: ${companyData.summary.productsWithVariants}`);
    console.log(`   إجمالي الفئات: ${companyData.summary.totalCategories}`);
    console.log(`   المنتجات المتوفرة: ${companyData.summary.productsInStock}`);
    console.log(`   المنتجات غير المتوفرة: ${companyData.summary.productsOutOfStock}`);
    console.log(`   متوسط السعر: ${companyData.summary.averagePrice.toFixed(2)} ${company.currency}`);
    console.log(`   أقل سعر: ${companyData.summary.minPrice.toFixed(2)} ${company.currency}`);
    console.log(`   أعلى سعر: ${companyData.summary.maxPrice.toFixed(2)} ${company.currency}`);
    console.log(`\n✅ تم جمع البيانات بنجاح!\n`);

    return companyData;

  } catch (error) {
    console.error('\n❌ خطأ في جمع البيانات:', error);
    console.error(error.stack);
    throw error;
  }
}

// تشغيل إذا كان مستدعى مباشرة
if (require.main === module) {
  collectMarketingCompanyProducts()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ فشل في جمع البيانات:', error);
      process.exit(1);
    });
}

module.exports = { collectMarketingCompanyProducts };



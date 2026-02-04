/**
 * فحص وضع مفاتيح شركة "شركة التسويق"
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

async function checkCompanyKeys() {
    try {
        console.log('\n🔍 ========== فحص وضع مفاتيح "شركة التسويق" ==========\n');

        // 1. البحث عن الشركة
        const companies = await getSharedPrismaClient().company.findMany({
            where: {
                OR: [
                    { name: { contains: 'التسويق' } },
                    { name: { contains: 'تسويق' } }
                ]
            },
            select: {
                id: true,
                name: true,
                useCentralKeys: true,
                isActive: true
            }
        });

        if (companies.length === 0) {
            console.log('❌ لم يتم العثور على شركة "شركة التسويق"');
            return;
        }

        console.log(`✅ تم العثور على ${companies.length} شركة:\n`);
        
        for (const company of companies) {
            console.log(`📊 الشركة: ${company.name}`);
            console.log(`   ID: ${company.id}`);
            console.log(`   Active: ${company.isActive ? '✅' : '❌'}`);
            console.log(`   useCentralKeys: ${company.useCentralKeys ? '✅ نعم' : '❌ لا'}`);
            console.log('');

            // 2. فحص مفاتيح الشركة
            const companyKeys = await getSharedPrismaClient().geminiKey.findMany({
                where: {
                    companyId: company.id,
                    keyType: 'COMPANY'
                },
                select: {
                    id: true,
                    name: true,
                    isActive: true,
                    priority: true,
                    _count: {
                        select: {
                            models: true
                        }
                    }
                }
            });

            console.log(`   🔑 مفاتيح الشركة: ${companyKeys.length}`);
            companyKeys.forEach(key => {
                console.log(`      - ${key.name} (Active: ${key.isActive ? '✅' : '❌'}, Priority: ${key.priority}, Models: ${key._count.models})`);
            });
            console.log('');

            // 3. فحص المفاتيح المركزية
            const centralKeys = await getSharedPrismaClient().geminiKey.findMany({
                where: {
                    keyType: 'CENTRAL',
                    isActive: true
                },
                select: {
                    id: true,
                    name: true,
                    priority: true,
                    _count: {
                        select: {
                            models: true
                        }
                    }
                }
            });

            console.log(`   🔑 المفاتيح المركزية النشطة: ${centralKeys.length}`);
            if (centralKeys.length === 0) {
                console.log('      ⚠️ لا توجد مفاتيح مركزية نشطة!');
                console.log('');
                
                // فحص جميع المفاتيح المركزية (حتى غير النشطة)
                const allCentralKeys = await getSharedPrismaClient().geminiKey.findMany({
                    where: {
                        keyType: 'CENTRAL'
                    },
                    select: {
                        id: true,
                        name: true,
                        isActive: true
                    }
                });
                
                console.log(`   📋 إجمالي المفاتيح المركزية (جميع الحالات): ${allCentralKeys.length}`);
                allCentralKeys.forEach(key => {
                    console.log(`      - ${key.name} (Active: ${key.isActive ? '✅' : '❌'})`);
                });
            } else {
                centralKeys.forEach(key => {
                    console.log(`      - ${key.name} (Priority: ${key.priority}, Models: ${key._count.models})`);
                });
            }
            console.log('');

            // 4. التحقق من النماذج المتاحة في المفاتيح المركزية
            if (centralKeys.length > 0) {
                for (const centralKey of centralKeys) {
                    const availableModels = await getSharedPrismaClient().geminiKeyModel.findMany({
                        where: {
                            keyId: centralKey.id,
                            isEnabled: true
                        },
                        select: {
                            id: true,
                            model: true,
                            isEnabled: true,
                            usage: true
                        },
                        take: 3
                    });

                    console.log(`   📦 نماذج متاحة في المفتاح المركزي "${centralKey.name}": ${availableModels.length}`);
                    if (availableModels.length === 0) {
                        console.log('      ⚠️ لا توجد نماذج مفعلة في هذا المفتاح!');
                    } else {
                        availableModels.forEach(model => {
                            try {
                                const usage = JSON.parse(model.usage || '{}');
                                console.log(`      - ${model.model} (Enabled: ${model.isEnabled ? '✅' : '❌'})`);
                            } catch (e) {
                                console.log(`      - ${model.model} (Error parsing usage)`);
                            }
                        });
                    }
                }
            }
        }

        console.log('\n✅ ========== انتهى الفحص ==========\n');

    } catch (error) {
        console.error('❌ خطأ في الفحص:', error);
    } finally {
        await getSharedPrismaClient().$disconnect();
    }
}

checkCompanyKeys();



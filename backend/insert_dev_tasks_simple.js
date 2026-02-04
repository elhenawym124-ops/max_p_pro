const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function insertDevTasksSimple() {
  try {
    console.log('🚀 بدء إدخال مهام التطوير (بدون reporterId)...');

    // البحث عن مستخدم موجود أولاً
    const existingUser = await prisma.user.findFirst({
      where: {
        role: 'SUPER_ADMIN'
      }
    });

    if (!existingUser) {
      console.log('❌ لا يوجد مستخدم Super Admin في النظام');
      return;
    }

    console.log('✅ تم العثور على مستخدم:', existingUser.firstName, existingUser.lastName);

    // البحث عن عضو فريق تطوير موجود
    let devTeamMember = await prisma.devTeamMember.findFirst({
      where: {
        userId: existingUser.id
      }
    });

    if (!devTeamMember) {
      // إنشاء عضو فريق التطوير
      devTeamMember = await prisma.devTeamMember.create({
        data: {
          userId: existingUser.id,
          role: 'tech_lead',
          department: 'Development',
          skills: 'System Administration,Documentation,Project Management',
          availability: 'available',
          isActive: true
        }
      });
      console.log('✅ تم إنشاء عضو فريق التطوير:', devTeamMember.id);
    } else {
      console.log('✅ تم العثور على عضو فريق التطوير:', devTeamMember.id);
    }

    // إنشاء مشروع جديد لتوثيق المشروع
    const project = await prisma.devProject.create({
      data: {
        name: 'توثيق وشرح المشروع',
        description: 'مشروع لإنشاء وثائق شاملة تشرح هيكل وأقسام المنصة المتكاملة للتواصل والتجارة الإلكترونية',
        status: 'COMPLETED',
        priority: 'HIGH',
        color: '#10b981',
        icon: '📋',
        startDate: new Date('2026-01-03T08:44:00Z'),
        endDate: new Date('2026-01-03T11:50:00Z'),
        progress: 100,
        managerId: devTeamMember.id,
        tags: 'documentation,project-overview,analysis,backend,frontend',
        repository: null
      }
    });

    console.log('✅ تم إنشاء المشروع:', project.name);

    // إنشاء المهام المكتملة
    const tasks = [
      {
        title: 'استكشاف هيكل المشروع وفهم الأقسام الرئيسية',
        description: 'تحليل شامل لهيكل المشروع وفهم الأقسام الرئيسية العشرة: الذكاء الاصطناعي، إدارة المحادثات، التجارة الإلكترونية، إدارة العملاء، التسويق الرقمي، استوديو الصور، الدعم الفني، الموارد البشرية، لوحة الإدارة العامة، والإعدادات والتخصيص.',
        type: 'DOCUMENTATION',
        status: 'DONE',
        priority: 'HIGH',
        component: 'Project Structure',
        estimatedHours: 2.0,
        actualHours: 1.5,
        progress: 100,
        tags: 'analysis,structure,backend,frontend',
        startDate: new Date('2026-01-03T08:44:00Z'),
        completedDate: new Date('2026-01-03T09:15:00Z')
      },
      {
        title: 'تحليل Backend APIs والخدمات',
        description: 'فحص وتحليل جميع الـ APIs والخدمات في الـ Backend بما في ذلك 103 ملف مسار، 144 خدمة، 78 وحدة تحكم. تم تحليل الخدمات الرئيسية مثل aiService، ragService، conversationAIService، وغيرها من الخدمات المهمة.',
        type: 'DOCUMENTATION',
        status: 'DONE',
        priority: 'HIGH',
        component: 'Backend',
        estimatedHours: 3.0,
        actualHours: 2.0,
        progress: 100,
        tags: 'backend,api,services,analysis',
        startDate: new Date('2026-01-03T09:15:00Z'),
        completedDate: new Date('2026-01-03T10:30:00Z')
      },
      {
        title: 'تحليل Frontend Components والصفحات',
        description: 'تحليل شامل لجميع مكونات وصفحات الـ Frontend بما في ذلك 258 صفحة، 207 مكون، 25 خدمة. تم فحص الصفحات الرئيسية مثل لوحات التحكم، إدارة المنتجات، المحادثات، والإعلانات.',
        type: 'DOCUMENTATION',
        status: 'DONE',
        priority: 'HIGH',
        component: 'Frontend',
        estimatedHours: 2.5,
        actualHours: 1.8,
        progress: 100,
        tags: 'frontend,components,pages,analysis',
        startDate: new Date('2026-01-03T10:30:00Z'),
        completedDate: new Date('2026-01-03T11:20:00Z')
      },
      {
        title: 'إنشاء ملف PROJECT_OVERVIEW.md شامل',
        description: 'إنشاء وثيقة شاملة تشرح المشروع بالكامل تتضمن: نظرة عامة، الهيكل العام، الأقسام الرئيسية العشرة، التقنيات المستخدمة، إحصائيات المشروع، تعليمات التشغيل، الأمان والحماية، والمميزات المتقدمة.',
        type: 'DOCUMENTATION',
        status: 'DONE',
        priority: 'MEDIUM',
        component: 'Documentation',
        estimatedHours: 2.0,
        actualHours: 1.5,
        progress: 100,
        tags: 'documentation,overview,markdown,project-guide',
        startDate: new Date('2026-01-03T11:20:00Z'),
        completedDate: new Date('2026-01-03T11:50:00Z')
      }
    ];

    // إدخال المهام واحدة تلو الأخرى
    for (let i = 0; i < tasks.length; i++) {
      const taskData = {
        ...tasks[i],
        projectId: project.id,
        reporterId: devTeamMember.id, // استخدام عضو فريق التطوير كمُبلغ
        assigneeId: devTeamMember.id, // تعيين نفس الشخص كمنفذ
        order: i + 1
      };

      const task = await prisma.devTask.create({
        data: taskData
      });

      console.log(`✅ تم إنشاء المهمة ${i + 1}: ${task.title}`);
    }

    // إنشاء إصدار للمشروع
    const release = await prisma.devRelease.create({
      data: {
        version: 'v1.0.0',
        name: 'إصدار التوثيق الأولي',
        description: 'الإصدار الأول من وثائق المشروع الشاملة',
        status: 'RELEASED',
        releaseDate: new Date('2026-01-03T11:50:00Z'),
        changelog: `
# إصدار التوثيق الأولي v1.0.0

## ✅ المهام المكتملة:
- استكشاف هيكل المشروع وفهم الأقسام الرئيسية
- تحليل Backend APIs والخدمات (103 مسار، 144 خدمة)
- تحليل Frontend Components والصفحات (258 صفحة، 207 مكون)
- إنشاء ملف PROJECT_OVERVIEW.md شامل

## 📋 الوثائق المُنشأة:
- PROJECT_OVERVIEW.md - وثيقة شاملة تشرح المشروع بالكامل

## 🎯 الأقسام المُوثقة:
1. نظام الذكاء الاصطناعي
2. إدارة المحادثات
3. التجارة الإلكترونية
4. إدارة العملاء (CRM)
5. التسويق الرقمي
6. استوديو الصور
7. الدعم الفني
8. الموارد البشرية
9. لوحة الإدارة العامة
10. الإعدادات والتخصيص
        `,
        projectId: project.id
      }
    });

    console.log('✅ تم إنشاء الإصدار:', release.name);

    console.log('\n🎉 تم إدخال جميع المهام بنجاح!');
    console.log(`📊 الإحصائيات:`);
    console.log(`   - المشاريع: 1`);
    console.log(`   - المهام: ${tasks.length}`);
    console.log(`   - الإصدارات: 1`);
    console.log(`   - حالة المشروع: مكتمل 100%`);
    console.log(`   - المدير: ${existingUser.firstName} ${existingUser.lastName}`);

  } catch (error) {
    console.error('❌ خطأ في إدخال المهام:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// تشغيل الدالة
insertDevTasksSimple()
  .then(() => {
    console.log('✅ تم الانتهاء من إدخال المهام بنجاح');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ فشل في إدخال المهام:', error);
    process.exit(1);
  });

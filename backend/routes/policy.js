const express = require('express');
const router = express.Router();
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { requireAuth } = require('../middleware/auth');

const getPrisma = () => getSharedPrismaClient();

// Get all policies
router.get('/', async (req, res) => {
  try {
    const { category, isActive } = req.query;
    const companyId = req.user?.companyId;

    const where = {};
    if (companyId) where.companyId = companyId;
    if (category) where.category = category;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const policies = await getPrisma().policy.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    res.json(policies);
  } catch (error) {
    console.error('Error fetching policies:', error);
    res.status(500).json({ error: 'فشل تحميل السياسات' });
  }
});

// Create policy
router.post('/', requireAuth, async (req, res) => {
  try {
    const { title, content, category, tags, isActive, effectiveAt, expiresAt } = req.body;
    const companyId = req.user.companyId;

    const policy = await getPrisma().policy.create({
      data: {
        title,
        content,
        category: category || 'general',
        tags: tags || [],
        isActive: isActive !== undefined ? isActive : true,
        effectiveAt: effectiveAt ? new Date(effectiveAt) : new Date(),
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        companyId,
        version: 1
      }
    });

    res.status(201).json(policy);
  } catch (error) {
    console.error('Error creating policy:', error);
    res.status(500).json({ error: 'فشل إنشاء السياسة' });
  }
});

// Update policy
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, category, tags, isActive, effectiveAt, expiresAt } = req.body;

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (category !== undefined) updateData.category = category;
    if (tags !== undefined) updateData.tags = tags;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (effectiveAt !== undefined) updateData.effectiveAt = new Date(effectiveAt);
    if (expiresAt !== undefined) updateData.expiresAt = expiresAt ? new Date(expiresAt) : null;

    const policy = await getPrisma().policy.update({
      where: { id },
      data: updateData
    });

    res.json(policy);
  } catch (error) {
    console.error('Error updating policy:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'السياسة غير موجودة' });
    }
    res.status(500).json({ error: 'فشل تحديث السياسة' });
  }
});

// Delete policy
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    await getPrisma().policy.delete({ where: { id } });

    res.json({ message: 'تم حذف السياسة بنجاح' });
  } catch (error) {
    console.error('Error deleting policy:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'السياسة غير موجودة' });
    }
    res.status(500).json({ error: 'فشل حذف السياسة' });
  }
});

module.exports = router;

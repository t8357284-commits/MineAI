const express = require('express');
const router = express.Router();
const prisma = require('../utils/prisma');
const { requireUser } = require('../middleware/userAuth');
const { requireAdmin } = require('../middleware/adminAuth');
const { body, query, validationResult } = require('express-validator');

// Get all templates (with search, filter, pagination)
router.get('/', async (req, res, next) => {
  try {
    const { q, category, isPremium, page = 1, pageSize = 12 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const take = parseInt(pageSize);

    const where = {};
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } }
      ];
    }
    if (category) {
      where.category = category;
    }
    if (isPremium !== undefined) {
      where.isPremium = isPremium === 'true';
    }

    const [templates, total] = await Promise.all([
      prisma.template.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { favorites: true }
          }
        }
      }),
      prisma.template.count({ where })
    ]);

    res.json({
      templates,
      pagination: {
        total,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPages: Math.ceil(total / pageSize)
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get single template
router.get('/:id', async (req, res, next) => {
  try {
    const template = await prisma.template.findUnique({
      where: { id: req.params.id },
      include: {
        _count: {
          select: { favorites: true }
        }
      }
    });

    if (!template) {
      return res.status(404).json({ error: 'القالب غير موجود' });
    }

    res.json({ template });
  } catch (error) {
    next(error);
  }
});

// Create template (Admin only)
router.post('/', requireUser, requireAdmin, [
  body('title').notEmpty().withMessage('العنوان مطلوب'),
  body('description').notEmpty().withMessage('الوصف مطلوب'),
  body('category').notEmpty().withMessage('الفئة مطلوبة'),
  body('thumbnail').notEmpty().withMessage('الصورة المصغرة مطلوبة'),
  body('prompt').notEmpty().withMessage('البرومبت مطلوب'),
  body('scriptStructure').isObject().withMessage('هيكل السكريبت يجب أن يكون JSON'),
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const template = await prisma.template.create({
      data: {
        title: req.body.title,
        description: req.body.description,
        category: req.body.category,
        thumbnail: req.body.thumbnail,
        prompt: req.body.prompt,
        scriptStructure: req.body.scriptStructure,
        recommendedHashtags: req.body.recommendedHashtags || [],
        isPremium: req.body.isPremium || false
      }
    });

    res.status(201).json({ template, message: 'تم إنشاء القالب بنجاح' });
  } catch (error) {
    next(error);
  }
});

// Update template (Admin only)
router.patch('/:id', requireUser, requireAdmin, async (req, res, next) => {
  try {
    const template = await prisma.template.update({
      where: { id: req.params.id },
      data: req.body
    });

    res.json({ template, message: 'تم تحديث القالب بنجاح' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'القالب غير موجود' });
    }
    next(error);
  }
});

// Delete template (Admin only)
router.delete('/:id', requireUser, requireAdmin, async (req, res, next) => {
  try {
    await prisma.template.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'تم حذف القالب بنجاح' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'القالب غير موجود' });
    }
    next(error);
  }
});

// Favorite / Unfavorite template
router.post('/:id/favorite', requireUser, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const templateId = req.params.id;

    const existing = await prisma.favoriteTemplate.findUnique({
      where: {
        userId_templateId: { userId, templateId }
      }
    });

    if (existing) {
      await prisma.favoriteTemplate.delete({
        where: { id: existing.id }
      });
      return res.json({ favorited: false, message: 'تمت الإزالة من المفضلة' });
    } else {
      await prisma.favoriteTemplate.create({
        data: { userId, templateId }
      });
      return res.json({ favorited: true, message: 'تمت الإضافة إلى المفضلة' });
    }
  } catch (error) {
    next(error);
  }
});

// Clone template to project
router.post('/:id/clone', requireUser, async (req, res, next) => {
  try {
    const template = await prisma.template.findUnique({
      where: { id: req.params.id }
    });

    if (!template) {
      return res.status(404).json({ error: 'القالب غير موجود' });
    }

    // Check if user is premium if template is premium
    if (template.isPremium && req.user.plan === 'free') {
      return res.status(403).json({ error: 'هذا القالب مخصص للمشتركين فقط' });
    }

    const script = await prisma.script.create({
      data: {
        userId: req.user.id,
        title: `${template.title} (نسخة)`,
        platform: 'tiktok', // Default or from request
        content: {
          templateId: template.id,
          prompt: template.prompt,
          structure: template.scriptStructure,
          recommendedHashtags: template.recommendedHashtags
        }
      }
    });

    res.status(201).json({ script, message: 'تم نسخ القالب إلى السكريبتات الخاصة بك' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

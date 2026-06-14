const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../utils/prisma');
const { requireUser } = require('../middleware/userAuth');
const router = express.Router();

router.use(requireUser);

router.get('/', async (req, res, next) => {
  try {
    const scripts = await prisma.script.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, scripts });
  } catch (err) { next(err); }
});

router.post('/', [
  body('title').isString().trim().isLength({ min: 2, max: 150 }),
  body('platform').isIn(['tiktok','instagram','twitter','facebook','snapchat']),
  body('content').exists(),
  body('projectId').optional().isString().trim().isLength({ max: 80 }),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    let projectId = req.body.projectId || null;
    if (projectId) {
      const project = await prisma.project.findFirst({ where: { id: projectId, userId: req.user.id } });
      if (!project) return res.status(404).json({ error: 'المشروع المرتبط غير موجود' });
    }

    const script = await prisma.script.create({
      data: {
        userId: req.user.id,
        projectId,
        title: req.body.title.trim(),
        platform: req.body.platform,
        content: req.body.content,
      },
    });
    res.status(201).json({ success: true, script });
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const script = await prisma.script.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!script) return res.status(404).json({ error: 'السكريبت غير موجود' });
    await prisma.script.delete({ where: { id: script.id } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;

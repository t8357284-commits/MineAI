const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../utils/prisma');
const { requireUser } = require('../middleware/userAuth');
const router = express.Router();

router.use(requireUser);

router.get('/', async (req, res, next) => {
  try {
    const projects = await prisma.project.findMany({
      where: { userId: req.user.id },
      orderBy: { updatedAt: 'desc' },
    });
    res.json({ success: true, projects });
  } catch (err) { next(err); }
});

router.post('/', [
  body('title').isString().trim().isLength({ min: 2, max: 120 }),
  body('platform').optional().isIn(['tiktok','instagram','twitter','facebook','snapchat']),
  body('description').optional().isString().trim().isLength({ max: 1000 }),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const project = await prisma.project.create({
      data: {
        userId: req.user.id,
        title: req.body.title.trim(),
        platform: req.body.platform || 'tiktok',
        description: req.body.description || '',
        status: 'active',
      },
    });
    res.status(201).json({ success: true, project });
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const project = await prisma.project.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!project) return res.status(404).json({ error: 'المشروع غير موجود' });
    await prisma.project.delete({ where: { id: project.id } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { Category } = require('../models');
const auth = require('../middleware/auth');

// 获取所有分类
router.get('/', async (req, res) => {
  try {
    const categories = await Category.findAll({
      where: { status: 'active' },
      order: [['sort', 'ASC']]
    });

    // 直接返回扁平的分类列表，不构建树形结构
    res.status(200).json(categories);
  } catch (error) {
    console.error('获取分类列表失败:', error);
    res.status(400).json({ message: '获取分类列表失败' });
  }
});

// 获取分类详情
router.get('/:id', async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id);
    if (!category) {
      return res.status(400).json({ message: '分类不存在' });
    }
    res.status(200).json(category);
  } catch (error) {
    console.error('获取分类详情失败:', error);
    res.status(400).json({ message: '获取分类详情失败' });
  }
});

// 创建分类 (需要管理员权限)
router.post('/', auth, async (req, res) => {
  try {
    // 判断用户是否为管理员
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: '没有权限' });
    }

    const { name, description, icon, sort, status } = req.body;

    if (!name) {
      return res.status(400).json({ message: '分类名称不能为空' });
    }

    const category = await Category.create({
      name,
      description,
      icon,
      sort: sort || 0,
      status: status || 'active'
    });

    res.status(200).json(category);
  } catch (error) {
    console.error('创建分类失败:', error);
    res.status(400).json({ message: '创建分类失败' });
  }
});

// 更新分类 (需要管理员权限)
router.put('/:id', auth, async (req, res) => {
  try {
    // 判断用户是否为管理员
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: '没有权限' });
    }

    const { name, description, icon, sort, status } = req.body;
    const category = await Category.findByPk(req.params.id);

    if (!category) {
      return res.status(400).json({ message: '分类不存在' });
    }

    if (name) category.name = name;
    if (description !== undefined) category.description = description;
    if (icon !== undefined) category.icon = icon;
    if (sort !== undefined) category.sort = sort;
    if (status !== undefined) category.status = status;

    await category.save();
    res.status(200).json(category);
  } catch (error) {
    console.error('更新分类失败:', error);
    res.status(400).json({ message: '更新分类失败' });
  }
});

// 删除分类 (需要管理员权限)
router.delete('/:id', auth, async (req, res) => {
  try {
    // 判断用户是否为管理员
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: '没有权限' });
    }

    const category = await Category.findByPk(req.params.id);

    if (!category) {
      return res.status(400).json({ message: '分类不存在' });
    }

    await category.destroy();
    res.status(200).json({ message: '删除成功' });
  } catch (error) {
    console.error('删除分类失败:', error);
    res.status(400).json({ message: '删除分类失败' });
  }
});

module.exports = router;

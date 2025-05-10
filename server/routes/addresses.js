const express = require('express');
const router = express.Router();
const { Address } = require('../models');
const auth = require('../middleware/auth');

// 获取用户的所有收货地址
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const addresses = await Address.findAll({
      where: { userId },
      order: [['isDefault', 'DESC'], ['createdAt', 'DESC']]
    });

    res.status(200).json(addresses);
  } catch (error) {
    console.error('获取收货地址失败:', error);
    res.status(400).json({ message: '获取收货地址失败' });
  }
});

// 获取默认收货地址
router.get('/default', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const address = await Address.findOne({
      where: { userId, isDefault: true }
    });

    if (!address) {
      // 如果没有默认地址，返回最新添加的地址
      const latestAddress = await Address.findOne({
        where: { userId },
        order: [['createdAt', 'DESC']]
      });

      return res.status(200).json(latestAddress || null);
    }

    res.status(200).json(address);
  } catch (error) {
    console.error('获取默认收货地址失败:', error);
    res.status(400).json({ message: '获取默认收货地址失败' });
  }
});

// 获取单个收货地址详情
router.get('/:id', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const address = await Address.findOne({
      where: {
        id: req.params.id,
        userId
      }
    });

    if (!address) {
      return res.status(400).json({ message: '收货地址不存在' });
    }

    res.status(200).json(address);
  } catch (error) {
    console.error('获取收货地址详情失败:', error);
    res.status(400).json({ message: '获取收货地址详情失败' });
  }
});

// 添加收货地址
router.post('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, phone, province, city, district, detail, isDefault } = req.body;

    // 验证必填字段
    if (!name || !phone || !province || !city || !district || !detail) {
      return res.status(400).json({ message: '收货地址信息不完整' });
    }

    // 如果设置为默认地址，将其他地址设为非默认
    if (isDefault) {
      await Address.update(
        { isDefault: false },
        { where: { userId } }
      );
    }

    // 如果是第一个地址，自动设为默认地址
    const addressCount = await Address.count({ where: { userId } });
    const shouldBeDefault = isDefault || addressCount === 0;

    const address = await Address.create({
      userId,
      name,
      phone,
      province,
      city,
      district,
      detail,
      isDefault: shouldBeDefault
    });

    res.status(200).json(address);
  } catch (error) {
    console.error('添加收货地址失败:', error);
    res.status(400).json({ message: '添加收货地址失败' });
  }
});

// 更新收货地址
router.put('/:id', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, phone, province, city, district, detail, isDefault } = req.body;

    const address = await Address.findOne({
      where: {
        id: req.params.id,
        userId
      }
    });

    if (!address) {
      return res.status(400).json({ message: '收货地址不存在' });
    }

    // 如果设置为默认地址，将其他地址设为非默认
    if (isDefault && !address.isDefault) {
      await Address.update(
        { isDefault: false },
        { where: { userId } }
      );
    }

    // 更新地址信息
    if (name !== undefined) address.name = name;
    if (phone !== undefined) address.phone = phone;
    if (province !== undefined) address.province = province;
    if (city !== undefined) address.city = city;
    if (district !== undefined) address.district = district;
    if (detail !== undefined) address.detail = detail;
    if (isDefault !== undefined) address.isDefault = isDefault;

    await address.save();
    res.status(200).json(address);
  } catch (error) {
    console.error('更新收货地址失败:', error);
    res.status(400).json({ message: '更新收货地址失败' });
  }
});

// 删除收货地址
router.delete('/:id', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const address = await Address.findOne({
      where: {
        id: req.params.id,
        userId
      }
    });

    if (!address) {
      return res.status(400).json({ message: '收货地址不存在' });
    }

    const wasDefault = address.isDefault;

    await address.destroy();

    // 如果删除的是默认地址，则将最新的地址设为默认
    if (wasDefault) {
      const latestAddress = await Address.findOne({
        where: { userId },
        order: [['createdAt', 'DESC']]
      });

      if (latestAddress) {
        latestAddress.isDefault = true;
        await latestAddress.save();
      }
    }

    res.status(200).json({ message: '删除成功' });
  } catch (error) {
    console.error('删除收货地址失败:', error);
    res.status(400).json({ message: '删除收货地址失败' });
  }
});

// 设置默认收货地址
router.put('/:id/default', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const address = await Address.findOne({
      where: {
        id: req.params.id,
        userId
      }
    });

    if (!address) {
      return res.status(400).json({ message: '收货地址不存在' });
    }

    // 将其他地址设为非默认
    await Address.update(
      { isDefault: false },
      { where: { userId } }
    );

    // 设置当前地址为默认
    address.isDefault = true;
    await address.save();

    res.status(200).json(address);
  } catch (error) {
    console.error('设置默认地址失败:', error);
    res.status(400).json({ message: '设置默认地址失败' });
  }
});

module.exports = router;

const ActivationCode = require('../models/ActivationCode');

async function generateInitialCode() {
  try {
    // 创建一个初始激活码
    const activationCode = await ActivationCode.create({
      code: 'ADMIN2024',  // 使用一个固定的激活码
      isUsed: true,       // 标记为已使用
      usedBy: 'o5Nph7O-nTFL5F5c9_hWRyaVI_sA'  // 指定的 openid
    });

    console.log('初始激活码创建成功:', activationCode.toJSON());
    process.exit(0);
  } catch (error) {
    console.error('创建激活码失败:', error);
    process.exit(1);
  }
}

generateInitialCode();
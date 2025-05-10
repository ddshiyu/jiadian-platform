/**
 * 响应格式化中间件
 * 重写res.json方法，统一API响应格式
 *
 * 错误响应格式：
 * {
 *   code: HTTP状态码,
 *   success: false,
 *   message: 错误消息
 * }
 *
 * 成功响应格式：
 * {
 *   code: 0,
 *   success: true,
 *   data: 响应数据
 * }
 */
const formatResponse = (req, res, next) => {
  // 保存原始的json方法
  const originalJson = res.json;

  // 重写json方法
  res.json = function(data) {
    // 处理错误响应（HTTP状态码大于等于400）
    if (res.statusCode >= 400) {
      const errorResponse = {
        code: res.statusCode,
        success: false,
        message: data.message || '请求失败'
      };
      return originalJson.call(this, errorResponse);
    }

    // 处理成功响应（HTTP状态码200）
    if (res.statusCode === 200 || res.statusCode === 201) {
      const successResponse = {
        code: 0,
        success: true,
        data: data
      };
      return originalJson.call(this, successResponse);
    }

    // 其他情况，直接返回原始数据
    return originalJson.call(this, data);
  };

  next();
};

module.exports = formatResponse;

/**
 * 分页中间件
 * 提供分页参数获取和分页响应格式化功能
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件函数
 */
const formatPagination = (req, res, next) => {
  // 保存原始的res.json方法
  const originalJson = res.json;

  /**
   * 分页响应方法
   * @param {Array} data - 分页数据列表
   * @param {Object} options - 分页选项
   * @param {Number} options.total - 总记录数
   * @param {Number} options.page - 当前页码
   * @param {Number} options.size - 每页大小
   * @param {String} [options.message] - 响应消息
   * @param {Object} [options.custom] - 自定义字段，用于支持不同的命名约定
   * @param {Boolean} [options.removeDefaults=false] - 是否移除默认的page和size字段
   * @returns {Object} 格式化后的响应对象
   */
  res.paginate = function(data, {
    total,
    page,
    size,
    message = '获取列表成功',
    custom = {},
    removeDefaults = false
  }) {
    let response = {
      list: data,
      total          // 总条数永远保留
    };

    // 如果不移除默认字段，则添加page和size
    if (!removeDefaults) {
      response = {
        ...response,
        page,           // 当前页码
        size,           // 每页条数
        totalPages: Math.ceil(total / size)  // 总页数
      };
    }

    // 添加消息和自定义字段
    response = {
      ...response,
      message,
      ...custom       // 添加自定义字段，支持不同的命名约定
    };

    return originalJson.call(this, response);
  };

  /**
   * 获取分页参数的辅助方法
   * @param {Object} [options] - 自定义选项
   * @param {String} [options.pageName='page'] - 页码参数名
   * @param {String} [options.sizeName='size'] - 每页大小参数名
   * @param {Number} [options.defaultPage=1] - 默认页码
   * @param {Number} [options.defaultSize=10] - 默认每页大小
   * @param {Number} [options.maxSize=100] - 最大每页大小
   * @returns {Object} 分页参数对象，包含page, size, offset
   */
  req.getPaginationParams = function(options = {}) {
    const {
      pageName = 'page',
      sizeName = 'size',
      defaultPage = 1,
      defaultSize = 10,
      maxSize = 100 // 防止恶意请求大量数据
    } = options;

    let page = parseInt(this.query[pageName]) || defaultPage;
    let size = parseInt(this.query[sizeName]) || defaultSize;

    // 确保页码为正数
    page = page < 1 ? 1 : page;

    // 限制每页大小
    size = size < 1 ? defaultSize : (size > maxSize ? maxSize : size);

    const offset = (page - 1) * size;

    return {
      page,
      size,
      offset
    };
  };

  next();
};

module.exports = formatPagination;

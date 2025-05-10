var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

// 中间件
const auth = require('./middleware/auth');
const adminAuth = require('./middleware/adminAuth');
const formatResponse = require('./middleware/response');
const formatPagination = require('./middleware/pagination');

// 小程序路由
var usersRouter = require('./routes/users');
const userInfoRouter = require('./routes/userInfo');
const productsRouter = require('./routes/products');
const categoriesRouter = require('./routes/categories');
const cartsRouter = require('./routes/carts');
const ordersRouter = require('./routes/orders');
const addressesRouter = require('./routes/addresses');
const bannersRouter = require('./routes/banners');

// 管理系统路由
const adminAuthRouter = require('./routes/admin/auth');
const adminProductsRouter = require('./routes/admin/products');
const adminCategoriesRouter = require('./routes/admin/categories');
const adminOrdersRouter = require('./routes/admin/orders');
const adminUsersRouter = require('./routes/admin/users');
const adminDashboardRouter = require('./routes/admin/dashboard');
const adminMiniUserRouter = require('./routes/admin/miniUser');
const adminBannersRouter = require('./routes/admin/banners');
const adminCommissionRouter = require('./routes/admin/commission');

// 通用路由
const uploadRouter = require('./routes/common/upload');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// 注册全局中间件
app.use(require('cors')())
app.use(logger('dev'));
app.use(express.json({ limit: '50mb' })); // 增加请求体大小限制
app.use(express.urlencoded({ extended: false, limit: '50mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/admin', express.static(path.join(__dirname, '/dist')))

// 注册自定义中间件
app.use(formatResponse);
app.use(formatPagination);

// 这些路由不需要验证token
app.use('/user', usersRouter);
app.use('/admin/auth', adminAuthRouter);

// 通用上传接口（需要验证token）
app.use('/upload', auth, uploadRouter);

// 小程序接口路由 - 需要token验证
app.use('/userInfo', auth, userInfoRouter);
app.use('/products', productsRouter);
app.use('/categories', categoriesRouter);
app.use('/carts', auth, cartsRouter);
app.use('/orders', auth, ordersRouter);
app.use('/addresses', auth, addressesRouter);
app.use('/banners', bannersRouter);

// 管理系统接口路由 - 需要管理员token验证
app.use('/admin/products', adminAuth, adminProductsRouter);
app.use('/admin/categories', adminAuth, adminCategoriesRouter);
app.use('/admin/orders', adminAuth, adminOrdersRouter);
app.use('/admin/users', adminAuth, adminUsersRouter);
app.use('/admin/dashboard', adminAuth, adminDashboardRouter);
app.use('/admin/mini-users', adminAuth, adminMiniUserRouter);
app.use('/admin/banners', adminAuth, adminBannersRouter);
app.use('/admin/commissions', adminAuth, adminCommissionRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;

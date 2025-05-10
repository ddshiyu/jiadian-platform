const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// 确保上传目录存在
const UPLOAD_DIR = path.join(__dirname, '../../public/static');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// 按日期创建目录
const createDateDir = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  const dirPath = path.join(UPLOAD_DIR, `${year}${month}${day}`);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  return `${year}${month}${day}`;
};

// 配置存储引擎
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dateDir = createDateDir();
    const dirPath = path.join(UPLOAD_DIR, dateDir);
    cb(null, dirPath);
  },
  filename: (req, file, cb) => {
    // 生成唯一文件名
    const fileExt = path.extname(file.originalname);
    const fileName = `${uuidv4()}${fileExt}`;
    cb(null, fileName);
  }
});

// 文件过滤器
const fileFilter = (req, file, cb) => {
  // 允许的文件类型
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('不支持的文件类型'), false);
  }
};

// 创建上传中间件
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 限制文件大小为10MB
  }
});

/**
 * @api {post} /upload/file 上传单个文件
 * @apiDescription 上传单个文件
 * @apiHeader {String} Authorization Bearer JWT
 */
router.post('/file', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '请选择要上传的文件' });
    }

    const dateDir = req.file.destination.split('/').pop();
    const fileUrl = `/static/${dateDir}/${req.file.filename}`;

    res.status(200).json({
      message: '文件上传成功',
      file: {
        url: fileUrl,
        filename: req.file.filename,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      }
    });
  } catch (error) {
    console.error('文件上传失败:', error);
    res.status(500).json({
      message: '文件上传失败',
      error: error.message
    });
  }
});

/**
 * @api {post} /upload/files 上传多个文件
 * @apiDescription 上传多个文件(最多10个)
 * @apiHeader {String} Authorization Bearer JWT
 */
router.post('/files', upload.array('files', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: '请选择要上传的文件' });
    }

    const filesInfo = req.files.map(file => {
      const dateDir = file.destination.split('/').pop();
      const fileUrl = `/static/${dateDir}/${file.filename}`;

      return {
        url: fileUrl,
        filename: file.filename,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size
      };
    });

    res.status(200).json({
      message: '文件上传成功',
      files: filesInfo
    });
  } catch (error) {
    console.error('文件上传失败:', error);
    res.status(500).json({
      message: '文件上传失败',
      error: error.message
    });
  }
});

/**
 * @api {post} /upload/image 上传图片
 * @apiDescription 上传图片(仅支持jpg、png、gif、webp格式)
 * @apiHeader {String} Authorization Bearer JWT
 */
router.post('/image', (req, res, next) => {
  // 自定义图片过滤器
  const imageUpload = multer({
    storage,
    fileFilter: (req, file, cb) => {
      const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('只支持jpg、png、gif、webp格式的图片'), false);
      }
    },
    limits: {
      fileSize: 5 * 1024 * 1024 // 限制图片大小为5MB
    }
  }).single('image');

  imageUpload(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: '图片大小不能超过5MB' });
      }
      return res.status(400).json({ message: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ message: '请选择要上传的图片' });
    }

    const dateDir = req.file.destination.split('/').pop();
    const fileUrl = `/static/${dateDir}/${req.file.filename}`;

    res.status(200).json({
      message: '图片上传成功',
      image: {
        url: fileUrl,
        filename: req.file.filename,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      }
    });
  });
});

/**
 * @api {post} /upload/base64 上传Base64编码的图片
 * @apiDescription 上传Base64编码的图片
 * @apiHeader {String} Authorization Bearer JWT
 */
router.post('/base64', (req, res) => {
  try {
    const { base64Data, filename = 'image' } = req.body;

    if (!base64Data) {
      return res.status(400).json({ message: '请提供base64编码的图片数据' });
    }

    // 解析Base64数据
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ message: 'Base64数据格式无效' });
    }

    const mimeType = matches[1];
    const base64 = matches[2];
    const buffer = Buffer.from(base64, 'base64');

    // 检查MIME类型
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(mimeType)) {
      return res.status(400).json({ message: '只支持jpg、png、gif、webp格式的图片' });
    }

    // 检查文件大小
    if (buffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({ message: '图片大小不能超过5MB' });
    }

    // 获取正确的文件扩展名
    let ext;
    switch (mimeType) {
      case 'image/jpeg':
        ext = '.jpg';
        break;
      case 'image/png':
        ext = '.png';
        break;
      case 'image/gif':
        ext = '.gif';
        break;
      case 'image/webp':
        ext = '.webp';
        break;
      default:
        ext = '.jpg';
    }

    // 创建日期目录并生成文件名
    const dateDir = createDateDir();
    const fileName = `${uuidv4()}${ext}`;
    const filePath = path.join(UPLOAD_DIR, dateDir, fileName);

    // 保存文件
    fs.writeFileSync(filePath, buffer);

    const fileUrl = `/static/${dateDir}/${fileName}`;

    res.status(200).json({
      message: '图片上传成功',
      image: {
        url: fileUrl,
        filename: fileName,
        originalname: `${filename}${ext}`,
        mimetype: mimeType,
        size: buffer.length
      }
    });
  } catch (error) {
    console.error('Base64图片上传失败:', error);
    res.status(500).json({
      message: 'Base64图片上传失败',
      error: error.message
    });
  }
});

// 错误处理中间件
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // Multer错误处理
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: '文件大小不能超过10MB' });
    }
    return res.status(400).json({ message: `上传错误: ${err.message}` });
  }

  console.error('文件上传发生错误:', err);
  res.status(500).json({
    message: '文件上传失败',
    error: err.message
  });
});

module.exports = router;

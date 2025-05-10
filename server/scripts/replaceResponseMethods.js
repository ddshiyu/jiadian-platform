/**
 * 批量替换响应方法的脚本
 * 将res.fail和res.success替换为标准的res.status().json()
 */
const fs = require('fs');
const path = require('path');

// 需要处理的目录
const dirsToProcess = [
  path.join(__dirname, '../routes'),
  path.join(__dirname, '../middleware')
];

// 递归获取目录下所有js文件
function getAllJsFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      getAllJsFiles(filePath, fileList);
    } else if (file.endsWith('.js')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

// 替换文件内容
function replaceFileContent(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;

  // 替换res.fail方法
  content = content.replace(/res\.fail\((['"])(.+?)\1(?:\s*,\s*(\d+))?\)/g, (match, quote, message, statusCode) => {
    const code = statusCode || 400;
    return `res.status(${code}).json({ message: ${quote}${message}${quote} })`;
  });

  // 替换res.success方法
  content = content.replace(/res\.success\(([^)]+)\)/g, 'res.status(200).json($1)');

  // 如果内容有变化，写入文件
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`已更新文件: ${filePath}`);
    return true;
  }

  return false;
}

// 主函数
function main() {
  let jsFiles = [];
  dirsToProcess.forEach(dir => {
    jsFiles = jsFiles.concat(getAllJsFiles(dir));
  });

  console.log(`共找到 ${jsFiles.length} 个JS文件需要处理`);

  let updatedCount = 0;
  jsFiles.forEach(file => {
    if (replaceFileContent(file)) {
      updatedCount++;
    }
  });

  console.log(`处理完成, 共更新了 ${updatedCount} 个文件`);
}

main();

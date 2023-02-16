const multer = require('multer');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1000 * 1024 * 1024 }, // 1000MB
});

module.exports = {
  upload,
};

const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: err.message });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ message: 'Não autorizado' });
  }

  res.status(500).json({ message: 'Erro interno do servidor' });
};

module.exports = errorHandler;

C:\Temp\ccer\backend\middlewares\upload.js
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
destination: (req, file, cb) => {
  cb(null, 'uploads/');
},
filename: (req, file, cb) => {
  cb(null, `${Date.now()}-${file.originalname}`);
}
});

const fileFilter = (req, file, cb) => {
const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
if (allowedTypes.includes(file.mimetype)) {
  cb(null, true);
} else {
  cb(new Error('Apenas imagens (JPEG/PNG/GIF) são permitidas'));
}
};

module.exports = multer({
storage,
fileFilter,
limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

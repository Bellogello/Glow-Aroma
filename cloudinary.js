const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const streamifier = require('streamifier'); // ADD THIS

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const imageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'glow-aroma/products',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
  },
});

const uploadImage = multer({ storage: imageStorage });

// Use memory storage for models so we can stream the buffer
const modelStorage = multer.memoryStorage();
const uploadModelWithThumbnail = multer({ storage: modelStorage }).fields([
    { name: 'model', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 }
]);

const uploadToCloudinary = (fileBuffer, options) => {
  return new Promise((resolve, reject) => {
    const cld_upload_stream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (result) resolve(result);
        else {
          console.error("Cloudinary Error:", error);
          reject(error);
        }
      }
    );
    // This is the magic part for large files
    streamifier.createReadStream(fileBuffer).pipe(cld_upload_stream);
  });
};

module.exports = {
  cloudinary,
  uploadImage,
  uploadModelWithThumbnail,
  uploadToCloudinary
};
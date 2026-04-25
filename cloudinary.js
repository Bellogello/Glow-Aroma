const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const streamifier = require('streamifier');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Image storage — for product images
const imageStorage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: 'glow-aroma/products',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [{ width: 800, height: 800, crop: 'limit', quality: 'auto' }],
    },
});

// Model storage — for .glb 3D model files
const modelStorage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: 'glow-aroma/models',
        allowed_formats: ['glb', 'gltf'],
        resource_type: 'raw', // required for non-image files
    },
});

// Thumbnail storage — for model preview images
const thumbnailStorage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: 'glow-aroma/thumbnails',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [{ width: 400, height: 400, crop: 'limit', quality: 'auto' }],
    },
});

const uploadImage     = multer({ storage: imageStorage });
const uploadModel     = multer({ storage: modelStorage });
const uploadThumbnail = multer({ storage: thumbnailStorage });

// Multi-file upload for model + thumbnail together
const uploadModelWithThumbnail = multer({
    storage: multer.memoryStorage(),
}).fields([
    { name: 'model',     maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 },
]);

// Manual Cloudinary upload from buffer (used for multi-file)
const uploadToCloudinary = (fileBuffer, options) => {
  return new Promise((resolve, reject) => {
    const cld_upload_stream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (result) resolve(result);
        else reject(error);
      }
    );
    // This streams the 7MB file instead of trying to send it in one chunk
    streamifier.createReadStream(fileBuffer).pipe(cld_upload_stream);
  });
};

module.exports = {
    cloudinary,
    uploadImage,
    uploadModel,
    uploadThumbnail,
    uploadModelWithThumbnail,
    uploadToCloudinary,
};
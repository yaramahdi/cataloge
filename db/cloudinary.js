const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

async function uploadImage(filePath) {
  const result = await cloudinary.uploader.upload(filePath, {
    folder: 'cataloge-products',
    resource_type: 'auto'
  });
  return result.secure_url;
}

async function deleteImage(imageUrl) {
  if (!imageUrl) return;
  const parts = imageUrl.split('/');
  const folderIndex = parts.indexOf('cataloge-products');
  if (folderIndex === -1) return;
  const publicId = parts.slice(folderIndex).join('/').replace(/\.[^.]+$/, '');
  await cloudinary.uploader.destroy(publicId);
}

module.exports = { cloudinary, uploadImage, deleteImage };

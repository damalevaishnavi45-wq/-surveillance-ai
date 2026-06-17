const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadBase64Image = (base64String, folder = 'surveillance') => {
  return new Promise((resolve, reject) => {
    const dataUri = base64String.startsWith('data:')
      ? base64String
      : `data:image/jpeg;base64,${base64String}`;

    cloudinary.uploader.upload(dataUri, {
      folder,
      resource_type: 'image',
      quality: 'auto',
      fetch_format: 'auto'
    }, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
};

const uploadImageBuffer = (buffer, folder = 'surveillance') => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image', quality: 'auto' },
      (err, result) => {
        if (err) return reject(err);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
};

const deleteImage = (publicId) => cloudinary.uploader.destroy(publicId);

module.exports = { uploadBase64Image, uploadImageBuffer, deleteImage };

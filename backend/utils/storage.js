const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let cloudinary = null;
function isCloudinaryConfigured() {
  return Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
}

function getCloudinary() {
  if (!isCloudinaryConfigured()) return null;
  if (!cloudinary) {
    cloudinary = require('cloudinary').v2;
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
  }
  return cloudinary;
}

function safeExt(originalName = '', mimeType = '') {
  const ext = path.extname(originalName).toLowerCase();
  const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.mp4', '.mov'];
  if (allowed.includes(ext)) return ext;
  if (mimeType === 'application/pdf') return '.pdf';
  if (mimeType === 'image/png') return '.png';
  if (mimeType === 'image/webp') return '.webp';
  if (mimeType === 'video/mp4') return '.mp4';
  return '.jpg';
}

function resourceType(mimetype = '') {
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype === 'application/pdf') return 'raw';
  return 'image';
}

function uploadBufferToCloudinary(buffer, options) {
  const cld = getCloudinary();
  if (!cld) return null;
  return new Promise((resolve, reject) => {
    const stream = cld.uploader.upload_stream({
      folder: options.folder || 'socialpulse',
      resource_type: resourceType(options.mimetype),
      public_id: options.publicId,
      overwrite: false,
    }, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
    stream.end(buffer);
  });
}

async function saveUpload(file, options = {}) {
  const providerPreference = (process.env.FILE_STORAGE || 'auto').toLowerCase();
  const folder = options.folder || 'socialpulse';
  const id = crypto.randomUUID();
  const ext = safeExt(file.originalname, file.mimetype);
  const publicId = `${folder.replace(/\//g, '_')}_${id}`;

  if (providerPreference !== 'local' && isCloudinaryConfigured()) {
    const result = await uploadBufferToCloudinary(file.buffer, {
      folder,
      publicId,
      mimetype: file.mimetype,
    });
    return {
      provider: 'cloudinary',
      url: result.secure_url,
      publicId: result.public_id,
      bytes: result.bytes,
      format: result.format,
      resourceType: result.resource_type,
    };
  }

  const baseDir = path.join(__dirname, '../../uploads', folder);
  fs.mkdirSync(baseDir, { recursive: true });
  const filename = `${Date.now()}-${id}${ext}`;
  fs.writeFileSync(path.join(baseDir, filename), file.buffer);
  return {
    provider: 'local',
    url: `/uploads/${folder}/${filename}`,
    publicId: filename,
    bytes: file.size,
    format: ext.replace('.', ''),
    resourceType: resourceType(file.mimetype),
  };
}

module.exports = { saveUpload, isCloudinaryConfigured };

/**
 * Image to WebP Converter Utility
 * Supports ALL file types - attempts conversion for any file
 * Converts uploaded images to WebP format before upload
 * Reduces file size and improves loading speed
 */

/**
 * Check if file might be an image (permissive check)
 * @param {File} file - File to check
 * @returns {boolean} - True if it could be an image
 */
export function isSupportedImage(file) {
  if (!file) return false;
  
  // Accept anything that looks like it could be an image
  if (file.type) {
    // Any image MIME type
    if (file.type.startsWith('image/') || file.type.startsWith('data:image')) {
      return true;
    }
    // Binary/octet-stream could be an image
    if (file.type.startsWith('application/octet-stream')) {
      return true;
    }
  }
  
  // Check file extension (very permissive)
  const ext = file.name.split('.').pop().toLowerCase();
  const imageExtensions = [
    'jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'tif',
    'webp', 'avif', 'ico', 'svg', 'heic', 'heif',
    'jfif', 'pjpeg', 'pjp', 'apng', 'cur', 'ani',
    'eps', 'ai', 'psd', 'raw', 'arw', 'cr2',
    'nef', 'orf', 'sr2', 'dng', 'jp2', 'jxr',
    'wdp', 'hdp', 'pfm', 'exr', 'tga', 'pcx',
  ];
  
  return imageExtensions.includes(ext) || ext.length <= 5;
}

/**
 * Convert an image file to WebP format
 * @param {File} file - The image file to convert
 * @param {number} quality - WebP quality (0.1 to 1.0, default: 0.8)
 * @param {number} maxWidth - Maximum width in pixels (default: 1920)
 * @returns {Promise<File>} - Converted WebP file
 */
export async function convertToWebP(file, quality = 0.8, maxWidth = 1920) {
  return new Promise((resolve, reject) => {
    // Check if file is already WebP
    if (file.type === 'image/webp' || file.name.endsWith('.webp')) {
      console.log(`Already WebP: ${file.name}`);
      resolve(file);
      return;
    }

    // Accept all files - try to convert everything
    // If it's not an image, browser will fail gracefully
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        // Create canvas
        const canvas = document.createElement('canvas');

        // Calculate new dimensions while maintaining aspect ratio
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        // Draw image on canvas
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to WebP blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              // Create new file with WebP format
              const webpFile = new File(
                [blob],
                file.name.replace(/\.[^.]+$/, '.webp'),
                {
                  type: 'image/webp',
                  lastModified: Date.now(),
                }
              );

              console.log(
                `Image converted: ${file.name} → ${webpFile.name} (${(file.size / 1024).toFixed(1)}KB → ${(webpFile.size / 1024).toFixed(1)}KB)`
              );

              resolve(webpFile);
            } else {
              // If conversion fails, return original file
              console.warn(`Could not convert ${file.name} to WebP, using original`);
              resolve(file);
            }
          },
          'image/webp',
          quality
        );
      };

      img.onerror = () => {
        // If loading fails, return original file
        console.warn(`Could not load ${file.name} for conversion, using original`);
        resolve(file);
      };
      img.src = e.target.result;
    };

    reader.onerror = () => {
      // If reading fails, return original file
      console.warn(`Could not read ${file.name}, using original`);
      resolve(file);
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Convert multiple images to WebP
 * @param {File[]} files - Array of image files
 * @param {number} quality - WebP quality
 * @returns {Promise<File[]>} - Array of converted WebP files
 */
export async function convertMultipleToWebP(files, quality = 0.8) {
  const results = [];

  for (const file of files) {
    try {
      const webpFile = await convertToWebP(file, quality);
      results.push(webpFile);
    } catch (error) {
      console.warn(`Failed to convert ${file.name}:`, error);
      results.push(file); // Keep original if conversion fails
    }
  }

  return results;
}

/**
 * Check if browser supports WebP
 * @returns {Promise<boolean>} - True if WebP is supported
 */
export function isWebPSupported() {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    if (canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0) {
      resolve(true);
    } else {
      resolve(false);
    }
  });
}

/**
 * Compress image without format conversion
 * Supports ALL image types - returns original if compression fails
 * @param {File} file - Image file
 * @param {number} quality - Quality (0.1 to 1.0)
 * @param {number} maxWidth - Maximum width
 * @returns {Promise<File>} - Compressed file
 */
export async function compressImage(file, quality = 0.8, maxWidth = 1920) {
  return new Promise((resolve) => {
    // Determine output format - default to jpeg for unknown types
    let mimeType = file.type || 'image/jpeg';
    if (mimeType === 'image/jpg') {
      mimeType = 'image/jpeg';
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Keep original format
        const mimeType = file.type || 'image/jpeg';
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const ext = mimeType.split('/')[1];
              const compressedFile = new File(
                [blob],
                file.name.replace(/\.[^.]+$/, `.${ext}`),
                {
                  type: mimeType,
                  lastModified: Date.now(),
                }
              );

              console.log(
                `Image compressed: ${file.name} (${(file.size / 1024).toFixed(1)}KB → ${(compressedFile.size / 1024).toFixed(1)}KB)`
              );

              resolve(compressedFile);
            } else {
              // If compression fails, return original file
              console.warn(`Could not compress ${file.name}, using original`);
              resolve(file);
            }
          },
          mimeType,
          quality
        );
      };

      img.onerror = () => {
        // If loading fails, return original file
        console.warn(`Could not load ${file.name} for compression, using original`);
        resolve(file);
      };
      img.src = e.target.result;
    };

    reader.onerror = () => {
      // If reading fails, return original file
      console.warn(`Could not read ${file.name}, using original`);
      resolve(file);
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Utility Kompresi Gambar Otomatis untuk Frontend RentalHub
 * - Mengompresi file foto secara otomatis di browser sebelum di-upload ke server
 * - Memastikan ukuran file foto maksimal 2MB per gambar
 * - Mempertahankan kualitas visual jernih (Max Resolution: 1920px, Quality initial: 85%)
 */
export const compressImage = (file, maxMB = 2.0) => {
  return new Promise((resolve) => {
    if (!file || !file.type || !file.type.startsWith('image/')) {
      return resolve(file);
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;

      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Limiting max dimension to 1920px (Full HD) agar foto jernih & tajam
        const MAX_DIM = 1920;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.85;

        const attemptCompress = (q) => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                return resolve(file);
              }

              const maxBytes = maxMB * 1024 * 1024;
              if (blob.size > maxBytes && q > 0.4) {
                attemptCompress(q - 0.1);
              } else {
                const compressedFile = new File(
                  [blob],
                  file.name.replace(/\.[^/.]+$/, '') + '.jpg',
                  {
                    type: 'image/jpeg',
                    lastModified: Date.now(),
                  }
                );
                resolve(compressedFile);
              }
            },
            'image/jpeg',
            q
          );
        };

        attemptCompress(quality);
      };

      img.onerror = () => resolve(file);
    };

    reader.onerror = () => resolve(file);
  });
};

/**
 * Kompresi Multiple Foto sekaligus secara Async
 */
export const compressMultipleImages = async (files, maxMB = 2.0, onProgress = null) => {
  const result = [];
  for (let i = 0; i < files.length; i++) {
    const compressed = await compressImage(files[i], maxMB);
    result.push(compressed);
    if (onProgress) {
      onProgress(Math.round(((i + 1) / files.length) * 100));
    }
  }
  return result;
};

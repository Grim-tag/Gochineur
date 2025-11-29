/**
 * Compresses an image file using Canvas API
 * Reduces file size significantly while maintaining acceptable quality
 */
export async function compressImage(file: File, maxSizeMB: number = 2, maxWidthOrHeight: number = 1920): Promise<File> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            const img = new Image();

            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Calculate new dimensions while maintaining aspect ratio
                if (width > height) {
                    if (width > maxWidthOrHeight) {
                        height = (height * maxWidthOrHeight) / width;
                        width = maxWidthOrHeight;
                    }
                } else {
                    if (height > maxWidthOrHeight) {
                        width = (width * maxWidthOrHeight) / height;
                        height = maxWidthOrHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Failed to get canvas context'));
                    return;
                }

                // Draw and compress
                ctx.drawImage(img, 0, 0, width, height);

                // Try different quality levels to hit target size
                let quality = 0.8;
                const tryCompress = () => {
                    canvas.toBlob(
                        (blob) => {
                            if (!blob) {
                                reject(new Error('Failed to compress image'));
                                return;
                            }

                            const sizeMB = blob.size / (1024 * 1024);

                            // If still too large and quality can be reduced, try again
                            if (sizeMB > maxSizeMB && quality > 0.3) {
                                quality -= 0.1;
                                tryCompress();
                            } else {
                                // Create new File from blob
                                const compressedFile = new File([blob], file.name, {
                                    type: 'image/jpeg',
                                    lastModified: Date.now()
                                });

                                console.log(`📦 Compressed: ${(file.size / (1024 * 1024)).toFixed(2)}MB → ${sizeMB.toFixed(2)}MB`);
                                resolve(compressedFile);
                            }
                        },
                        'image/jpeg',
                        quality
                    );
                };

                tryCompress();
            };

            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = e.target?.result as string;
        };

        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
}

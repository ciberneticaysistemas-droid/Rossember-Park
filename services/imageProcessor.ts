/**
 * Image Preprocessing Service for License Plate OCR
 * 
 * This service enhances images before OCR to improve recognition accuracy.
 * Techniques used:
 * - Grayscale conversion
 * - Contrast enhancement
 * - Sharpening
 * - Binarization (black & white)
 */

/**
 * Preprocesses an image to improve OCR accuracy for license plates
 * @param base64Image - Base64 encoded image data
 * @returns Promise<string> - Preprocessed base64 image
 */
export const preprocessImageForOCR = async (base64Image: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";

        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                reject(new Error('Could not get canvas context'));
                return;
            }

            // Set canvas size to image size
            canvas.width = img.width;
            canvas.height = img.height;

            // Draw original image
            ctx.drawImage(img, 0, 0);

            // Get image data for manipulation
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            // Step 1: Convert to grayscale and enhance contrast
            for (let i = 0; i < data.length; i += 4) {
                // Grayscale conversion using luminosity method
                const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];

                // Apply contrast enhancement (increase contrast by 30%)
                const contrast = 1.3;
                const factor = (259 * (contrast * 100 + 255)) / (255 * (259 - contrast * 100));
                const enhanced = factor * (gray - 128) + 128;

                // Clamp values between 0-255
                const final = Math.max(0, Math.min(255, enhanced));

                data[i] = final;     // R
                data[i + 1] = final; // G
                data[i + 2] = final; // B
                // Alpha channel (i + 3) remains unchanged
            }

            // Put enhanced grayscale image back
            ctx.putImageData(imageData, 0, 0);

            // Step 2: Apply sharpening filter
            const sharpenedData = applySharpen(ctx, canvas.width, canvas.height);
            ctx.putImageData(sharpenedData, 0, 0);

            // Step 3: Apply adaptive binarization (Otsu's method approximation)
            const binarizedData = applyBinarization(ctx, canvas.width, canvas.height);
            ctx.putImageData(binarizedData, 0, 0);

            // Convert to high-quality base64
            const processedBase64 = canvas.toDataURL('image/png'); // PNG for lossless quality
            resolve(processedBase64);
        };

        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = base64Image;
    });
};

/**
 * Apply sharpening filter to enhance edges
 */
const applySharpen = (ctx: CanvasRenderingContext2D, width: number, height: number): ImageData => {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const output = ctx.createImageData(width, height);

    // Sharpening kernel
    const kernel = [
        0, -1, 0,
        -1, 5, -1,
        0, -1, 0
    ];

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            let sum = 0;

            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const idx = ((y + ky) * width + (x + kx)) * 4;
                    const kernelIdx = (ky + 1) * 3 + (kx + 1);
                    sum += data[idx] * kernel[kernelIdx];
                }
            }

            const idx = (y * width + x) * 4;
            const clamped = Math.max(0, Math.min(255, sum));

            output.data[idx] = clamped;
            output.data[idx + 1] = clamped;
            output.data[idx + 2] = clamped;
            output.data[idx + 3] = 255;
        }
    }

    return output;
};

/**
 * Apply binarization using Otsu's method approximation
 * Converts image to pure black and white for better OCR
 */
const applyBinarization = (ctx: CanvasRenderingContext2D, width: number, height: number): ImageData => {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Calculate histogram
    const histogram = new Array(256).fill(0);
    for (let i = 0; i < data.length; i += 4) {
        histogram[data[i]]++;
    }

    // Calculate threshold using Otsu's method
    const total = width * height;
    let sum = 0;
    for (let i = 0; i < 256; i++) {
        sum += i * histogram[i];
    }

    let sumB = 0;
    let wB = 0;
    let wF = 0;
    let maxVariance = 0;
    let threshold = 0;

    for (let i = 0; i < 256; i++) {
        wB += histogram[i];
        if (wB === 0) continue;

        wF = total - wB;
        if (wF === 0) break;

        sumB += i * histogram[i];
        const mB = sumB / wB;
        const mF = (sum - sumB) / wF;

        const variance = wB * wF * (mB - mF) * (mB - mF);

        if (variance > maxVariance) {
            maxVariance = variance;
            threshold = i;
        }
    }

    // Apply threshold
    for (let i = 0; i < data.length; i += 4) {
        const value = data[i] > threshold ? 255 : 0;
        data[i] = value;
        data[i + 1] = value;
        data[i + 2] = value;
    }

    return imageData;
};

/**
 * Creates a simple preprocessed version (just high contrast grayscale)
 * Used as fallback if full preprocessing fails
 */
export const simplePreprocess = async (base64Image: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";

        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                reject(new Error('Could not get canvas context'));
                return;
            }

            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            // High contrast grayscale only
            for (let i = 0; i < data.length; i += 4) {
                const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                const enhanced = Math.max(0, Math.min(255, gray * 1.5));

                data[i] = enhanced;
                data[i + 1] = enhanced;
                data[i + 2] = enhanced;
            }

            ctx.putImageData(imageData, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };

        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = base64Image;
    });
};

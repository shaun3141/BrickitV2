import type { MosaicData } from '@/types/mosaic.types';
import type { BrickPlacement } from '@/types';

/**
 * Parses a hex color string to RGB values
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

/**
 * Draws a LEGO stud with 3D shading effect
 */
function drawLegoStud(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  baseColor: string
) {
  const centerX = x + size / 2;
  const centerY = y + size / 2;
  const studRadius = size * 0.35;

  // Draw the stud with gradient for 3D effect
  const gradient = ctx.createRadialGradient(
    centerX - studRadius * 0.3,
    centerY - studRadius * 0.3,
    0,
    centerX,
    centerY,
    studRadius
  );

  const rgb = hexToRgb(baseColor);
  const lighter = `rgb(${Math.min(255, rgb.r + 40)}, ${Math.min(255, rgb.g + 40)}, ${Math.min(255, rgb.b + 40)})`;
  const darker = `rgb(${Math.max(0, rgb.r - 30)}, ${Math.max(0, rgb.g - 30)}, ${Math.max(0, rgb.b - 30)})`;

  gradient.addColorStop(0, lighter);
  gradient.addColorStop(0.6, baseColor);
  gradient.addColorStop(1, darker);

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(centerX, centerY, studRadius, 0, Math.PI * 2);
  ctx.fill();

  // Add a subtle highlight on top
  const highlightGradient = ctx.createRadialGradient(
    centerX - studRadius * 0.4,
    centerY - studRadius * 0.4,
    0,
    centerX - studRadius * 0.4,
    centerY - studRadius * 0.4,
    studRadius * 0.5
  );
  highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
  highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

  ctx.fillStyle = highlightGradient;
  ctx.beginPath();
  ctx.arc(centerX, centerY, studRadius, 0, Math.PI * 2);
  ctx.fill();
}

interface RenderMosaicOptions {
  /** Pixel size for each stud (default: 20) */
  pixelSize?: number;
  /** Whether to show brick boundaries (default: true) */
  showBrickBoundaries?: boolean;
  /** Brick placements for showing boundaries */
  placements?: BrickPlacement[];
}

/**
 * Renders a mosaic to a canvas with LEGO-style 3D studs and optional brick boundaries
 */
export function renderMosaicToCanvas(
  mosaicData: MosaicData,
  options: RenderMosaicOptions = {}
): HTMLCanvasElement {
  const { pixelSize = 20, showBrickBoundaries = true, placements } = options;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  canvas.width = mosaicData.width * pixelSize;
  canvas.height = mosaicData.height * pixelSize;

  // Draw each pixel with brick base and stud
  for (let row = 0; row < mosaicData.height; row++) {
    for (let col = 0; col < mosaicData.width; col++) {
      const color = mosaicData.pixels[row][col];
      const x = col * pixelSize;
      const y = row * pixelSize;

      // Draw brick base
      ctx.fillStyle = color.hex;
      ctx.fillRect(x, y, pixelSize, pixelSize);

      // Add subtle edge shading to brick base
      if (pixelSize >= 8) {
        // Top-left lighter edge
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.fillRect(x, y, pixelSize, 1);
        ctx.fillRect(x, y, 1, pixelSize);

        // Bottom-right darker edge
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(x, y + pixelSize - 1, pixelSize, 1);
        ctx.fillRect(x + pixelSize - 1, y, 1, pixelSize);
      }

      // Draw the LEGO stud if pixel size is large enough
      if (pixelSize >= 10) {
        drawLegoStud(ctx, x, y, pixelSize, color.hex);
      }
    }
  }

  // Draw brick boundaries if placements are provided
  if (showBrickBoundaries && placements && placements.length > 0) {
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.lineWidth = 2;

    for (const placement of placements) {
      const x = placement.x * pixelSize;
      const y = placement.y * pixelSize;
      const width = placement.brickType.width * pixelSize;
      const height = placement.brickType.height * pixelSize;

      ctx.strokeRect(x, y, width, height);
    }
  }

  return canvas;
}

/**
 * Downloads a mosaic as a PNG image with LEGO-style rendering
 */
export function downloadMosaicAsPng(
  mosaicData: MosaicData,
  filename: string = 'brickit-mosaic.png',
  options: RenderMosaicOptions = {}
): void {
  const canvas = renderMosaicToCanvas(mosaicData, options);

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}

/**
 * Gets a blob URL for a rendered mosaic (for preview purposes)
 */
export async function getMosaicBlobUrl(
  mosaicData: MosaicData,
  options: RenderMosaicOptions = {}
): Promise<string> {
  const canvas = renderMosaicToCanvas(mosaicData, options);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Failed to create blob'));
        return;
      }
      resolve(URL.createObjectURL(blob));
    }, 'image/png');
  });
}



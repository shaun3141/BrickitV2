import { useState, useEffect, useRef } from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { MosaicData } from '@/utils/imageProcessor';
import type { BrickPlacement } from '@/types';

interface MosaicPreviewProps {
  mosaicData: MosaicData;
  placements?: BrickPlacement[];
  showOptimized?: boolean;
  initialPixelSize?: number;
}

export function MosaicPreview({ mosaicData, placements, showOptimized = false, initialPixelSize = 12 }: MosaicPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pixelSize, setPixelSize] = useState(initialPixelSize);
  const [showGrid, setShowGrid] = useState(true);

  // Helper function to draw a LEGO stud with 3D shading effect
  const drawLegoStud = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    baseColor: string
  ) => {
    const centerX = x + size / 2;
    const centerY = y + size / 2;
    const studRadius = size * 0.35; // Stud takes up 70% of the brick width

    // Draw the stud with gradient for 3D effect
    const gradient = ctx.createRadialGradient(
      centerX - studRadius * 0.3, // Offset for highlight
      centerY - studRadius * 0.3,
      0,
      centerX,
      centerY,
      studRadius
    );

    // Parse the base color and create lighter/darker variations
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : { r: 0, g: 0, b: 0 };
    };

    const rgb = hexToRgb(baseColor);
    const lighter = `rgb(${Math.min(255, rgb.r + 40)}, ${Math.min(255, rgb.g + 40)}, ${Math.min(255, rgb.b + 40)})`;
    const darker = `rgb(${Math.max(0, rgb.r - 30)}, ${Math.max(0, rgb.g - 30)}, ${Math.max(0, rgb.b - 30)})`;

    gradient.addColorStop(0, lighter); // Highlight
    gradient.addColorStop(0.6, baseColor); // Base color
    gradient.addColorStop(1, darker); // Shadow

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
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = mosaicData.width * pixelSize;
    canvas.height = mosaicData.height * pixelSize;

    // Draw each pixel with brick base and stud
    for (let row = 0; row < mosaicData.height; row++) {
      for (let col = 0; col < mosaicData.width; col++) {
        const color = mosaicData.pixels[row][col];
        const x = col * pixelSize;
        const y = row * pixelSize;
        
        // Draw brick base with subtle gradient
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

    // Draw grid or brick boundaries
    if (showGrid) {
      if (showOptimized && placements && placements.length > 0) {
        // Draw brick boundaries (thicker lines)
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.lineWidth = 2;

        for (const placement of placements) {
          const x = placement.x * pixelSize;
          const y = placement.y * pixelSize;
          const width = placement.brickType.width * pixelSize;
          const height = placement.brickType.height * pixelSize;

          ctx.strokeRect(x, y, width, height);
        }
      } else {
        // Draw regular grid
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.lineWidth = 1;

        for (let row = 0; row <= mosaicData.height; row++) {
          ctx.beginPath();
          ctx.moveTo(0, row * pixelSize);
          ctx.lineTo(mosaicData.width * pixelSize, row * pixelSize);
          ctx.stroke();
        }

        for (let col = 0; col <= mosaicData.width; col++) {
          ctx.beginPath();
          ctx.moveTo(col * pixelSize, 0);
          ctx.lineTo(col * pixelSize, mosaicData.height * pixelSize);
          ctx.stroke();
        }
      }
    }
  }, [mosaicData, pixelSize, showGrid, showOptimized, placements]);

  const handleZoomIn = () => {
    setPixelSize((prev) => Math.min(prev + 4, 32));
  };

  const handleZoomOut = () => {
    setPixelSize((prev) => Math.max(prev - 4, 4));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>LEGO Mosaic Preview</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowGrid(!showGrid)}
            >
              {showGrid ? 'Hide' : 'Show'} Grid
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleZoomOut}
              disabled={pixelSize <= 4}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleZoomIn}
              disabled={pixelSize >= 32}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Dimensions: {mosaicData.width} × {mosaicData.height} studs
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-auto max-h-[600px] border rounded-md bg-muted/20 p-4">
          <canvas
            ref={canvasRef}
            className="mx-auto"
            style={{ imageRendering: 'pixelated' }}
          />
        </div>
      </CardContent>
    </Card>
  );
}


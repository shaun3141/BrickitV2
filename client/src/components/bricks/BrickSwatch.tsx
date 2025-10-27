import { useEffect, useRef } from 'react';

interface BrickSwatchProps {
  hex: string;
  brickWidth?: number;  // Width in studs (e.g., 2 for a 2x4 brick)
  brickHeight?: number; // Height in studs (e.g., 4 for a 2x4 brick)
  className?: string;
}

/**
 * Renders a small canvas showing a top-down view of a LEGO brick with studs
 */
export function BrickSwatch({ 
  hex, 
  brickWidth = 1, 
  brickHeight = 1, 
  className = '' 
}: BrickSwatchProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fixed pixels per stud
    const pixelsPerStud = 16;
    const padding = 4;
    
    // Always render bricks horizontally (wider dimension as width)
    const displayWidth = Math.max(brickWidth, brickHeight);
    const displayHeight = Math.min(brickWidth, brickHeight);
    
    // Calculate canvas dimensions based on brick size
    const canvasWidth = displayWidth * pixelsPerStud + padding * 2;
    const canvasHeight = displayHeight * pixelsPerStud + padding * 2;
    
    // Set canvas size
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Parse hex color to RGB
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    // Calculate brick dimensions (using display dimensions for horizontal rendering)
    const studSpacing = pixelsPerStud;
    const brickPixelWidth = displayWidth * studSpacing;
    const brickPixelHeight = displayHeight * studSpacing;
    const offsetX = padding;
    const offsetY = padding;

    // Draw brick base with gradient
    const gradient = ctx.createLinearGradient(offsetX, offsetY, offsetX + brickPixelWidth, offsetY + brickPixelHeight);
    gradient.addColorStop(0, `rgb(${Math.min(r + 20, 255)}, ${Math.min(g + 20, 255)}, ${Math.min(b + 20, 255)})`);
    gradient.addColorStop(0.5, hex);
    gradient.addColorStop(1, `rgb(${Math.max(r - 20, 0)}, ${Math.max(g - 20, 0)}, ${Math.max(b - 20, 0)})`);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(offsetX, offsetY, brickPixelWidth, brickPixelHeight);

    // Draw subtle edge shadow for depth
    ctx.strokeStyle = `rgba(0, 0, 0, 0.3)`;
    ctx.lineWidth = 2;
    ctx.strokeRect(offsetX, offsetY, brickPixelWidth, brickPixelHeight);

    // Draw studs (using display dimensions)
    const studRadius = studSpacing * 0.28; // Stud takes up about 56% of the stud spacing diameter
    const studCenterOffset = studSpacing / 2;

    for (let row = 0; row < displayHeight; row++) {
      for (let col = 0; col < displayWidth; col++) {
        const studX = offsetX + col * studSpacing + studCenterOffset;
        const studY = offsetY + row * studSpacing + studCenterOffset;

        // Draw stud with radial gradient for 3D effect
        const studGradient = ctx.createRadialGradient(
          studX - studRadius * 0.3,
          studY - studRadius * 0.3,
          0,
          studX,
          studY,
          studRadius
        );
        studGradient.addColorStop(0, `rgb(${Math.min(r + 60, 255)}, ${Math.min(g + 60, 255)}, ${Math.min(b + 60, 255)})`);
        studGradient.addColorStop(0.5, `rgb(${Math.min(r + 30, 255)}, ${Math.min(g + 30, 255)}, ${Math.min(b + 30, 255)})`);
        studGradient.addColorStop(1, hex);

        ctx.fillStyle = studGradient;
        ctx.beginPath();
        ctx.arc(studX, studY, studRadius, 0, Math.PI * 2);
        ctx.fill();

        // Draw stud outline for definition
        ctx.strokeStyle = `rgba(0, 0, 0, 0.2)`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

  }, [hex, brickWidth, brickHeight]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
    />
  );
}


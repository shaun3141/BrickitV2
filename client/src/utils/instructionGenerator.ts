import type { MosaicData } from './imageProcessor';
import type { BrickPlacement } from '@/types';
import type { LegoColor } from './legoColors';

export interface Region {
  id: string;
  label: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface InstructionStep {
  stepNumber: number;
  regionId: string;
  regionLabel: string;
  placements: BrickPlacement[]; // Multiple placements per step
  previousPlacements: BrickPlacement[];
}

export interface RegionWithPlacements {
  region: Region;
  placements: BrickPlacement[];
}

/**
 * Divides the mosaic into a grid of regions
 */
export function divideIntoRegions(
  mosaicWidth: number,
  mosaicHeight: number,
  gridSize: number = 2
): Region[] {
  const regions: Region[] = [];
  const regionWidth = Math.ceil(mosaicWidth / gridSize);
  const regionHeight = Math.ceil(mosaicHeight / gridSize);

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const x1 = col * regionWidth;
      const y1 = row * regionHeight;
      const x2 = Math.min((col + 1) * regionWidth, mosaicWidth);
      const y2 = Math.min((row + 1) * regionHeight, mosaicHeight);

      // Label regions like "A1", "A2", "B1", "B2", etc.
      const rowLabel = String.fromCharCode(65 + row); // A, B, C...
      const colLabel = (col + 1).toString();

      regions.push({
        id: `region-${row}-${col}`,
        label: `${rowLabel}${colLabel}`,
        x1,
        y1,
        x2,
        y2,
      });
    }
  }

  return regions;
}

/**
 * Checks if a brick placement overlaps with a region
 */
function placementInRegion(placement: BrickPlacement, region: Region): boolean {
  const px1 = placement.x;
  const py1 = placement.y;
  const px2 = placement.x + placement.brickType.width;
  const py2 = placement.y + placement.brickType.height;

  // Check if brick overlaps with region
  // A brick belongs to a region if its top-left corner is in that region
  return px1 >= region.x1 && px1 < region.x2 && py1 >= region.y1 && py1 < region.y2;
}

/**
 * Groups brick placements by region
 */
export function assignPlacementsToRegions(
  placements: BrickPlacement[],
  regions: Region[]
): RegionWithPlacements[] {
  const result: RegionWithPlacements[] = regions.map((region) => ({
    region,
    placements: [],
  }));

  for (const placement of placements) {
    for (const regionData of result) {
      if (placementInRegion(placement, regionData.region)) {
        regionData.placements.push(placement);
        break;
      }
    }
  }

  return result;
}

/**
 * Orders placements within a region for building (left-to-right, top-to-bottom)
 */
export function orderPlacementsForBuilding(
  placements: BrickPlacement[]
): BrickPlacement[] {
  return [...placements].sort((a, b) => {
    // Sort by row first (top to bottom)
    if (a.y !== b.y) {
      return a.y - b.y;
    }
    // Then by column (left to right)
    return a.x - b.x;
  });
}

/**
 * Generates step-by-step instructions from placements and regions
 * Groups placements into batches of 5-10 pieces per step
 */
export function generateInstructions(
  placements: BrickPlacement[],
  regions: Region[],
  minPiecesPerStep: number = 5,
  maxPiecesPerStep: number = 10
): InstructionStep[] {
  const steps: InstructionStep[] = [];
  const regionsWithPlacements = assignPlacementsToRegions(placements, regions);

  let stepNumber = 1;
  const allPreviousPlacements: BrickPlacement[] = [];

  for (const { region, placements: regionPlacements } of regionsWithPlacements) {
    const orderedPlacements = orderPlacementsForBuilding(regionPlacements);

    // Batch placements into groups
    for (let i = 0; i < orderedPlacements.length; i += maxPiecesPerStep) {
      const batchSize = Math.min(maxPiecesPerStep, orderedPlacements.length - i);
      const batch = orderedPlacements.slice(i, i + batchSize);

      steps.push({
        stepNumber,
        regionId: region.id,
        regionLabel: region.label,
        placements: batch,
        previousPlacements: [...allPreviousPlacements],
      });

      allPreviousPlacements.push(...batch);
      stepNumber++;
    }
  }

  return steps;
}

/**
 * Generates a standalone HTML file with all instructions
 */
export function generateInstructionHTML(
  mosaicData: MosaicData,
  placements: BrickPlacement[],
  regions: Region[],
  steps: InstructionStep[]
): string {
  const partsCounts = new Map<string, { color: LegoColor; brickType: string; count: number }>();
  
  for (const placement of placements) {
    const key = `${placement.color.id}-${placement.brickType.id}`;
    const existing = partsCounts.get(key);
    if (existing) {
      existing.count++;
    } else {
      partsCounts.set(key, {
        color: placement.color,
        brickType: placement.brickType.displayName,
        count: 1,
      });
    }
  }

  const partsListHTML = Array.from(partsCounts.values())
    .map(
      (part) => `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;">
          <div style="width: 30px; height: 30px; background-color: ${part.color.hex}; border: 1px solid #333; display: inline-block; vertical-align: middle;"></div>
        </td>
        <td style="padding: 8px; border: 1px solid #ddd;">${part.color.name}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${part.brickType}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center; font-weight: bold;">${part.count}</td>
      </tr>
    `
    )
    .join('');

  const stepsHTML = steps
    .map(
      (step) => {
        // Group placements by brick type and color
        const grouped = new Map<string, { 
          color: any;
          brickType: any;
          count: number;
        }>();
        
        step.placements.forEach(placement => {
          const key = `${placement.color.id}-${placement.brickType.id}`;
          const existing = grouped.get(key);
          if (existing) {
            existing.count++;
          } else {
            grouped.set(key, {
              color: placement.color,
              brickType: placement.brickType,
              count: 1,
            });
          }
        });
        
        // Sort by count (descending)
        const sortedGroups = Array.from(grouped.values()).sort((a, b) => b.count - a.count);
        
        const bricksHTML = sortedGroups
          .map(
            (group) => `
          <div style="display: flex; gap: 10px; align-items: center; padding: 10px; border-bottom: 1px solid #eee;">
            <div style="width: 50px; height: 50px; background-color: ${group.color.hex}; border: 2px solid #333; flex-shrink: 0;"></div>
            <div style="flex: 1;">
              <p style="margin: 0; font-weight: bold;">${group.color.name} ${group.brickType.displayName}</p>
              <p style="margin: 2px 0 0 0; font-size: 0.9em; color: #666;">${group.brickType.width}×${group.brickType.height} studs</p>
            </div>
            <div style="text-align: right; flex-shrink: 0;">
              <p style="margin: 0; font-weight: bold; font-size: 1.2em;">×${group.count}</p>
              <p style="margin: 2px 0 0 0; font-size: 0.8em; color: #666;">piece${group.count !== 1 ? 's' : ''}</p>
            </div>
          </div>
        `
          )
          .join('');

        return `
    <div class="step-page" style="page-break-after: always; padding: 20px;">
      <div class="step-header" style="margin-bottom: 20px;">
        <h2 style="margin: 0;">Step ${step.stepNumber} of ${steps.length}</h2>
        <p style="margin: 5px 0; color: #666;">Region: ${step.regionLabel} • Place ${step.placements.length} pieces</p>
      </div>
      
      <div class="step-content" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: start;">
        <div class="diagram-container" style="border: 2px solid #ddd; padding: 10px; background: #f9f9f9;">
          <canvas id="step-${step.stepNumber}" width="400" height="400"></canvas>
        </div>
        
        <div class="brick-info" style="border: 2px solid #ddd; padding: 20px; background: white;">
          <h3 style="margin-top: 0;">Place These Bricks:</h3>
          <div style="margin-top: 15px; max-height: 400px; overflow-y: auto;">
            ${bricksHTML}
          </div>
        </div>
      </div>
    </div>
  `;
      }
    )
    .join('');

  // Serialize data for JavaScript
  const mosaicDataJSON = JSON.stringify({
    width: mosaicData.width,
    height: mosaicData.height,
    pixels: mosaicData.pixels,
  });

  const stepsJSON = JSON.stringify(
    steps.map((step) => ({
      stepNumber: step.stepNumber,
      placements: step.placements.map((p) => ({
        x: p.x,
        y: p.y,
        width: p.brickType.width,
        height: p.brickType.height,
        color: p.color.hex,
      })),
      previousPlacements: step.previousPlacements.map((p) => ({
        x: p.x,
        y: p.y,
        width: p.brickType.width,
        height: p.brickType.height,
        color: p.color.hex,
      })),
    }))
  );

  const regionsJSON = JSON.stringify(regions);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LEGO Mosaic Building Instructions</title>
  <style>
    * {
      box-sizing: border-box;
    }
    
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 20px;
      background: white;
    }
    
    .cover-page {
      text-align: center;
      padding: 60px 20px;
      page-break-after: always;
    }
    
    .cover-page h1 {
      font-size: 2.5em;
      margin-bottom: 20px;
    }
    
    .parts-list-page {
      page-break-after: always;
      padding: 20px;
    }
    
    .parts-list-page h2 {
      margin-top: 0;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    
    th {
      background-color: #333;
      color: white;
      padding: 10px;
      text-align: left;
      border: 1px solid #ddd;
    }
    
    canvas {
      max-width: 100%;
      height: auto;
      image-rendering: pixelated;
    }
    
    @media print {
      body {
        padding: 0;
      }
      
      .step-page {
        page-break-after: always;
      }
      
      .no-print {
        display: none;
      }
    }
    
    @media screen {
      .step-page {
        max-width: 900px;
        margin: 0 auto 40px;
        border: 1px solid #ddd;
        background: white;
      }
    }
  </style>
</head>
<body>
  <div class="cover-page">
    <h1>LEGO Mosaic Building Instructions</h1>
    <p style="font-size: 1.2em; color: #666;">Dimensions: ${mosaicData.width} × ${mosaicData.height} studs</p>
    <p style="color: #666;">Total Pieces: ${placements.length}</p>
    <p style="margin-top: 40px; font-size: 0.9em; color: #999;">
      LEGO® is a trademark of the LEGO Group of companies which does not sponsor, authorize or endorse this guide.
    </p>
  </div>
  
  <div class="parts-list-page">
    <h2>Parts List</h2>
    <p>Gather all these pieces before you begin:</p>
    <table>
      <thead>
        <tr>
          <th>Color</th>
          <th>Color Name</th>
          <th>Brick Type</th>
          <th>Quantity</th>
        </tr>
      </thead>
      <tbody>
        ${partsListHTML}
      </tbody>
    </table>
  </div>
  
  ${stepsHTML}
  
  <script>
    const mosaicData = ${mosaicDataJSON};
    const steps = ${stepsJSON};
    const regions = ${regionsJSON};
    
    function drawStep(stepNumber) {
      const canvas = document.getElementById('step-' + stepNumber);
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      const step = steps[stepNumber - 1];
      
      const pixelSize = Math.min(
        Math.floor(canvas.width / mosaicData.width),
        Math.floor(canvas.height / mosaicData.height)
      );
      
      // Draw base mosaic (faded)
      ctx.globalAlpha = 0.3;
      for (let row = 0; row < mosaicData.height; row++) {
        for (let col = 0; col < mosaicData.width; col++) {
          const color = mosaicData.pixels[row][col];
          ctx.fillStyle = color.hex;
          ctx.fillRect(col * pixelSize, row * pixelSize, pixelSize, pixelSize);
        }
      }
      ctx.globalAlpha = 1.0;
      
      // Draw previous placements
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.lineWidth = 1;
      for (const placement of step.previousPlacements) {
        ctx.fillStyle = placement.color;
        ctx.fillRect(
          placement.x * pixelSize,
          placement.y * pixelSize,
          placement.width * pixelSize,
          placement.height * pixelSize
        );
        ctx.strokeRect(
          placement.x * pixelSize,
          placement.y * pixelSize,
          placement.width * pixelSize,
          placement.height * pixelSize
        );
      }
      
      // Draw current placements (highlighted)
      for (const placement of step.placements) {
        ctx.fillStyle = placement.color;
        ctx.fillRect(
          placement.x * pixelSize,
          placement.y * pixelSize,
          placement.width * pixelSize,
          placement.height * pixelSize
        );
        
        // Highlight border
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3;
        ctx.strokeRect(
          placement.x * pixelSize,
          placement.y * pixelSize,
          placement.width * pixelSize,
          placement.height * pixelSize
        );
        
        // Add semi-transparent overlay
        ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
        ctx.fillRect(
          placement.x * pixelSize,
          placement.y * pixelSize,
          placement.width * pixelSize,
          placement.height * pixelSize
        );
      }
    }
    
    // Draw all steps
    for (let i = 1; i <= steps.length; i++) {
      drawStep(i);
    }
  </script>
</body>
</html>`;
}


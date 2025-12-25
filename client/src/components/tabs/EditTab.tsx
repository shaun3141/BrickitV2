import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ZoomIn, ZoomOut, Pipette, Pencil, PaintBucket, Minus, Square, Circle, Undo2, Redo2, Replace, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LEGO_COLORS, findClosestColorInPalette } from '@/utils/bricks/colors';
import type { MosaicData } from '@/types/mosaic.types';
import type { LegoColor } from '@/utils/bricks/colors';
import MobileEditToolbar from '@/components/editor/MobileEditToolbar';
import MobileControlsSheet from '@/components/editor/MobileControlsSheet';
import { fetchColorPalette } from '@/services/colors.service';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type Tool = 'pencil' | 'fill' | 'eyedropper' | 'line' | 'rectangle' | 'circle' | 'replace';
type ShapeMode = 'filled' | 'outline';

interface EditTabProps {
  mosaicData: MosaicData;
  onMosaicUpdate: (updatedMosaic: MosaicData) => void;
  onSave?: () => void;
  showBricks: boolean;
  onShowBricksChange: (showBricks: boolean) => void;
}

export function EditTab({ mosaicData, onMosaicUpdate, onSave, showBricks, onShowBricksChange }: EditTabProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  
  // Calculate initial pixel size to fit the canvas width in the container
  const calculateInitialPixelSize = () => {
    // The canvas container is lg:col-span-3 (75% width in a 4-column grid)
    // Assuming a reasonable container width of ~900px for the larger edit canvas area
    const estimatedContainerWidth = 900;
    const padding = 32; // p-4 = 16px on each side
    const border = 2;
    const availableWidth = estimatedContainerWidth - padding - border;
    
    // Calculate pixel size that fits the full mosaic width
    const calculatedPixelSize = Math.floor(availableWidth / mosaicData.width);
    
    // Clamp between 8 and 32 (the zoom limits for edit canvas)
    return Math.max(8, Math.min(32, calculatedPixelSize));
  };
  
  const [pixelSize, setPixelSize] = useState(calculateInitialPixelSize());
  const [showGrid, setShowGrid] = useState(true);
  const [selectedColor, setSelectedColor] = useState<LegoColor>(LEGO_COLORS[0]);
  const [activeTool, setActiveTool] = useState<Tool>('pencil');
  const [isDrawing, setIsDrawing] = useState(false);
  const [shapeMode, setShapeMode] = useState<ShapeMode>('filled');
  const [startPoint, setStartPoint] = useState<{row: number, col: number} | null>(null);
  const [currentPoint, setCurrentPoint] = useState<{row: number, col: number} | null>(null);
  const [isMobileControlsOpen, setIsMobileControlsOpen] = useState(false);
  // View transform state for pan/zoom on mobile (and desktop)
  const [viewScale, setViewScale] = useState(1);
  const [viewOffset, setViewOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const activePointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const panZoomState = useRef<{
    isPanZoom: boolean;
    initialDistance: number;
    initialScale: number;
    initialCenter: { x: number; y: number };
    initialOffset: { x: number; y: number };
  }>({ isPanZoom: false, initialDistance: 0, initialScale: 1, initialCenter: { x: 0, y: 0 }, initialOffset: { x: 0, y: 0 } });
  const lastPaintedCell = useRef<{ row: number; col: number } | null>(null);
  const rafScheduled = useRef(false);
  const nextTransform = useRef<{ scale: number; offset: { x: number; y: number } } | null>(null);
  const nextPaintCell = useRef<{ row: number; col: number } | null>(null);

  const scheduleTransformUpdate = (scale: number, offset: { x: number; y: number }) => {
    nextTransform.current = { scale, offset };
    if (rafScheduled.current) return;
    rafScheduled.current = true;
    requestAnimationFrame(() => {
      rafScheduled.current = false;
      if (nextTransform.current) {
        setViewScale(nextTransform.current.scale);
        setViewOffset(nextTransform.current.offset);
        nextTransform.current = null;
      }
    });
  };

  const schedulePaint = () => {
    if (rafScheduled.current) return;
    rafScheduled.current = true;
    requestAnimationFrame(() => {
      rafScheduled.current = false;
      const cell = nextPaintCell.current;
      if (!cell) return;
      if (!lastPaintedCell.current || cell.row !== lastPaintedCell.current.row || cell.col !== lastPaintedCell.current.col) {
        paintPixel(cell.row, cell.col);
        lastPaintedCell.current = cell;
      }
      nextPaintCell.current = null;
    });
  };
  
  // History management
  const [history, setHistory] = useState<MosaicData[]>([mosaicData]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  // Replace mode state
  const [showReplaceMode, setShowReplaceMode] = useState(false);
  const [replaceFromColor, setReplaceFromColor] = useState<LegoColor | null>(null);
  
  // Hover state for color palette
  const [hoveredColor, setHoveredColor] = useState<LegoColor | null>(null);
  
  // Available colors based on toggle (bricks or plates)
  const [availableColors, setAvailableColors] = useState<LegoColor[]>(LEGO_COLORS);
  const [isLoadingColors, setIsLoadingColors] = useState(true);
  
  // Remap modal state
  const [showRemapModal, setShowRemapModal] = useState(false);
  const [colorMappings, setColorMappings] = useState<Map<string, LegoColor>>(new Map());
  const isToggleChangeRef = useRef(false);

  // Check if colors need remapping when availableColors changes
  const checkColorRemapping = useCallback(async (newColors: LegoColor[]) => {
    // Get all unique colors currently in the mosaic
    const colorMap = new Map<string, LegoColor>();
    for (let row = 0; row < mosaicData.height; row++) {
      for (let col = 0; col < mosaicData.width; col++) {
        const pixel = mosaicData.pixels[row][col];
        if (!colorMap.has(pixel.name)) {
          colorMap.set(pixel.name, pixel);
        }
      }
    }

    console.log('[EditTab] Checking remapping - colors in mosaic:', Array.from(colorMap.keys()));
    console.log('[EditTab] Checking remapping - colors in new palette:', newColors.map(c => c.name));

    // Check which colors are not available in the new palette
    const colorsToRemap: Map<string, LegoColor> = new Map();
    const newColorNames = new Set(newColors.map(c => c.name));
    
    for (const [colorName, color] of colorMap.entries()) {
      if (!newColorNames.has(colorName)) {
        console.log('[EditTab] Color needs remapping:', colorName, '-> finding closest match');
        // This color needs remapping - find closest match
        const closestMatch = findClosestColorInPalette(color, newColors);
        console.log('[EditTab] Closest match for', colorName, ':', closestMatch.name);
        colorsToRemap.set(colorName, closestMatch);
      } else {
        console.log('[EditTab] Color', colorName, 'exists in new palette, no remapping needed');
      }
    }

    console.log('[EditTab] Total colors to remap:', colorsToRemap.size);
    return colorsToRemap;
  }, [mosaicData]);

  // Fetch colors when toggle changes or on initial mount
  useEffect(() => {
    const type = showBricks ? 'brick' : 'plate';
    const isToggleChange = isToggleChangeRef.current;
    console.log('[EditTab] useEffect triggered, showBricks:', showBricks, 'type:', type, 'isToggleChange:', isToggleChange);
    setIsLoadingColors(true);
    
    // Reset the ref for next time
    isToggleChangeRef.current = false;
    
    const fetchColors = async () => {
      try {
        console.log('[EditTab] Fetching colors for type:', type);
        const colors = await fetchColorPalette(type);
        console.log('[EditTab] Colors fetched:', colors.length, 'colors');
        // Service already returns a new array reference, so this will trigger re-render
        setAvailableColors(colors);
        setIsLoadingColors(false);
        
        // Check if remapping is needed
        const mappings = await checkColorRemapping(colors);
        if (mappings.size > 0) {
          console.log('[EditTab] Colors need remapping:', mappings.size);
          setColorMappings(mappings);
          // Don't show modal on initial mount, only when toggle changes
          if (isToggleChange) {
            console.log('[EditTab] Showing remap modal because this is a toggle change');
            setShowRemapModal(true);
          } else {
            console.log('[EditTab] Not showing remap modal - initial mount');
          }
        } else {
          // No remapping needed, proceed normally
          console.log('[EditTab] No remapping needed');
        }
        
        // Update selected color if current selection is not in new colors
        setSelectedColor(prevColor => {
          if (!colors.find(c => c.name === prevColor.name)) {
            return colors[0] || LEGO_COLORS[0];
          }
          return prevColor;
        });
      } catch (error) {
        console.error('[EditTab] Failed to fetch colors:', error);
        // Fallback to LEGO_COLORS on error
        setAvailableColors(LEGO_COLORS);
        setIsLoadingColors(false);
      }
    };
    
    fetchColors();
  }, [showBricks, checkColorRemapping]);

  // Calculate color counts
  const colorCounts = useMemo(() => {
    const counts: { [colorId: string]: number } = {};
    
    for (let row = 0; row < mosaicData.height; row++) {
      for (let col = 0; col < mosaicData.width; col++) {
        const color = mosaicData.pixels[row][col];
        counts[color.name] = (counts[color.name] || 0) + 1;
      }
    }
    
    return counts;
  }, [mosaicData]);

  // Add to history when mosaic changes
  const addToHistory = useCallback((newMosaicData: MosaicData) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newMosaicData);
    // Limit history to 50 states
    if (newHistory.length > 50) {
      newHistory.shift();
    } else {
      setHistoryIndex(historyIndex + 1);
    }
    setHistory(newHistory);
    onMosaicUpdate(newMosaicData);
  }, [history, historyIndex, onMosaicUpdate]);

  // Remap colors in the mosaic
  const remapColors = useCallback((mappings: Map<string, LegoColor>) => {
    const updatedPixels = mosaicData.pixels.map(row =>
      row.map(pixel => {
        const mappedColor = mappings.get(pixel.name);
        return mappedColor || pixel;
      })
    );

    addToHistory({
      ...mosaicData,
      pixels: updatedPixels,
    });
  }, [mosaicData, addToHistory]);

  // Handle toggle button click
  const handleToggleClick = useCallback((newValue: boolean) => {
    if (newValue === showBricks) return; // No change needed
    
    console.log('[EditTab] Toggle clicked - changing from', showBricks, 'to', newValue);
    // Mark that this is a toggle change (not initial mount)
    isToggleChangeRef.current = true;
    // Update showBricks which will trigger useEffect
    onShowBricksChange(newValue);
  }, [showBricks, onShowBricksChange]);

  // Handle remap confirmation
  const handleRemapConfirm = useCallback(() => {
    remapColors(colorMappings);
    setShowRemapModal(false);
    setColorMappings(new Map());
  }, [remapColors, colorMappings]);

  // Handle remap cancel
  const handleRemapCancel = useCallback(() => {
    // Revert toggle to previous value
    onShowBricksChange(!showBricks);
    setShowRemapModal(false);
    setColorMappings(new Map());
  }, [showBricks, onShowBricksChange]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      onMosaicUpdate(history[newIndex]);
    }
  }, [historyIndex, history, onMosaicUpdate]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      onMosaicUpdate(history[newIndex]);
    }
  }, [historyIndex, history, onMosaicUpdate]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        redo();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        undo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  // Update history when external mosaicData changes
  useEffect(() => {
    if (history[historyIndex] !== mosaicData) {
      setHistory([mosaicData]);
      setHistoryIndex(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    drawMosaic();
    drawPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mosaicData, pixelSize, showGrid, startPoint, currentPoint, activeTool, selectedColor, shapeMode, viewScale, viewOffset]);

  const drawMosaic = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = mosaicData.width * pixelSize;
    canvas.height = mosaicData.height * pixelSize;

    // Reset and clear
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Apply view transform
    ctx.setTransform(viewScale, 0, 0, viewScale, viewOffset.x, viewOffset.y);

    // Draw each pixel with brick base and stud
    for (let row = 0; row < mosaicData.height; row++) {
      for (let col = 0; col < mosaicData.width; col++) {
        const color = mosaicData.pixels[row][col];
        
        // Skip if color is undefined or doesn't have hex property
        if (!color || !color.hex) {
          console.warn(`[EditTab] Invalid color at [${row}][${col}]:`, color);
          continue;
        }
        
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

    // Draw grid
    if (showGrid) {
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
  };

  const drawPreview = () => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear preview
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(viewScale, 0, 0, viewScale, viewOffset.x, viewOffset.y);

    if (!startPoint || !currentPoint || !['line', 'rectangle', 'circle'].includes(activeTool)) {
      return;
    }

    // Draw preview shape
    const pixels = getShapePixels(startPoint, currentPoint, activeTool as 'line' | 'rectangle' | 'circle', shapeMode);
    
    ctx.fillStyle = selectedColor.hex;
    ctx.globalAlpha = 0.5;
    
    pixels.forEach(([row, col]) => {
      if (row >= 0 && row < mosaicData.height && col >= 0 && col < mosaicData.width) {
        ctx.fillRect(col * pixelSize, row * pixelSize, pixelSize, pixelSize);
      }
    });
    
    ctx.globalAlpha = 1.0;
  };

  // Bresenham's line algorithm
  const getLinePixels = (x0: number, y0: number, x1: number, y1: number): [number, number][] => {
    const pixels: [number, number][] = [];
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    let x = x0;
    let y = y0;

    while (true) {
      pixels.push([y, x]);

      if (x === x1 && y === y1) break;

      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }

    return pixels;
  };

  // Get rectangle pixels
  const getRectanglePixels = (x0: number, y0: number, x1: number, y1: number, mode: ShapeMode): [number, number][] => {
    const pixels: [number, number][] = [];
    const minX = Math.min(x0, x1);
    const maxX = Math.max(x0, x1);
    const minY = Math.min(y0, y1);
    const maxY = Math.max(y0, y1);

    if (mode === 'filled') {
      for (let row = minY; row <= maxY; row++) {
        for (let col = minX; col <= maxX; col++) {
          pixels.push([row, col]);
        }
      }
    } else {
      // Outline mode
      for (let col = minX; col <= maxX; col++) {
        pixels.push([minY, col]);
        pixels.push([maxY, col]);
      }
      for (let row = minY + 1; row < maxY; row++) {
        pixels.push([row, minX]);
        pixels.push([row, maxX]);
      }
    }

    return pixels;
  };

  // Midpoint circle algorithm
  const getCirclePixels = (cx: number, cy: number, radius: number, mode: ShapeMode): [number, number][] => {
    const pixels: [number, number][] = [];
    const pixelSet = new Set<string>();

    const addCirclePoints = (x: number, y: number) => {
      const points: [number, number][] = [
        [cy + y, cx + x], [cy + y, cx - x],
        [cy - y, cx + x], [cy - y, cx - x],
        [cy + x, cx + y], [cy + x, cx - y],
        [cy - x, cx + y], [cy - x, cx - y],
      ];

      points.forEach(([row, col]) => {
        const key = `${row},${col}`;
        if (!pixelSet.has(key)) {
          pixelSet.add(key);
          pixels.push([row, col]);
        }
      });
    };

    if (mode === 'outline') {
      let x = 0;
      let y = radius;
      let d = 1 - radius;

      addCirclePoints(x, y);

      while (x < y) {
        x++;
        if (d < 0) {
          d += 2 * x + 1;
        } else {
          y--;
          d += 2 * (x - y) + 1;
        }
        addCirclePoints(x, y);
      }
    } else {
      // Filled mode - draw filled circle
      for (let y = -radius; y <= radius; y++) {
        for (let x = -radius; x <= radius; x++) {
          if (x * x + y * y <= radius * radius) {
            const key = `${cy + y},${cx + x}`;
            if (!pixelSet.has(key)) {
              pixelSet.add(key);
              pixels.push([cy + y, cx + x]);
            }
          }
        }
      }
    }

    return pixels;
  };

  const getShapePixels = (
    start: {row: number, col: number},
    end: {row: number, col: number},
    tool: 'line' | 'rectangle' | 'circle',
    mode: ShapeMode
  ): [number, number][] => {
    if (tool === 'line') {
      return getLinePixels(start.col, start.row, end.col, end.row);
    } else if (tool === 'rectangle') {
      return getRectanglePixels(start.col, start.row, end.col, end.row, mode);
    } else if (tool === 'circle') {
      const radius = Math.round(Math.sqrt(
        Math.pow(end.col - start.col, 2) + Math.pow(end.row - start.row, 2)
      ));
      return getCirclePixels(start.col, start.row, radius, mode);
    }
    return [];
  };

  const floodFill = (startRow: number, startCol: number, targetColor: LegoColor, replacementColor: LegoColor) => {
    if (targetColor.name === replacementColor.name) return mosaicData.pixels;

    const pixels = mosaicData.pixels.map(row => [...row]);
    const queue: [number, number][] = [[startRow, startCol]];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const [row, col] = queue.shift()!;
      const key = `${row},${col}`;

      if (visited.has(key)) continue;
      if (row < 0 || row >= mosaicData.height || col < 0 || col >= mosaicData.width) continue;
      if (pixels[row][col].name !== targetColor.name) continue;

      visited.add(key);
      pixels[row][col] = replacementColor;

      queue.push([row - 1, col]);
      queue.push([row + 1, col]);
      queue.push([row, col - 1]);
      queue.push([row, col + 1]);
    }

    return pixels;
  };

  const replaceAllColors = (targetColor: LegoColor, replacementColor: LegoColor) => {
    if (targetColor.name === replacementColor.name) return;

    const pixels = mosaicData.pixels.map(row => 
      row.map(pixel => pixel.name === targetColor.name ? replacementColor : pixel)
    );

    addToHistory({
      ...mosaicData,
      pixels,
    });
  };

  const getPixelCoordinatesFromClient = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    // Invert view transform
    const worldX = (x - viewOffset.x) / viewScale;
    const worldY = (y - viewOffset.y) / viewScale;
    const col = Math.floor(worldX / pixelSize);
    const row = Math.floor(worldY / pixelSize);

    if (col >= 0 && col < mosaicData.width && row >= 0 && row < mosaicData.height) {
      return { row, col };
    }
    return null;
  };

  const applyPixels = (pixelsToApply: [number, number][]) => {
    const updatedPixels = mosaicData.pixels.map(row => [...row]);
    
    pixelsToApply.forEach(([row, col]) => {
      if (row >= 0 && row < mosaicData.height && col >= 0 && col < mosaicData.width) {
        updatedPixels[row][col] = selectedColor;
      }
    });

    addToHistory({
      ...mosaicData,
      pixels: updatedPixels,
    });
  };

  const paintPixel = (row: number, col: number) => {
    const updatedPixels = mosaicData.pixels.map((pixelRow, r) =>
      r === row
        ? pixelRow.map((pixel, c) => (c === col ? selectedColor : pixel))
        : pixelRow
    );

    addToHistory({
      ...mosaicData,
      pixels: updatedPixels,
    });
  };

  const handleCanvasPrimaryDownAt = (clientX: number, clientY: number) => {
    const coords = getPixelCoordinatesFromClient(clientX, clientY);
    if (!coords) return;

    const { row, col } = coords;

    if (activeTool === 'eyedropper') {
      const pickedColor = mosaicData.pixels[row][col];
      setSelectedColor(pickedColor);
      setActiveTool('pencil');
    } else if (activeTool === 'pencil') {
      setIsDrawing(true);
      paintPixel(row, col);
    } else if (activeTool === 'fill') {
      const targetColor = mosaicData.pixels[row][col];
      const updatedPixels = floodFill(row, col, targetColor, selectedColor);
      addToHistory({
        ...mosaicData,
        pixels: updatedPixels,
      });
    } else if (activeTool === 'replace') {
      if (!replaceFromColor) {
        // First click - select the color to replace
        setReplaceFromColor(mosaicData.pixels[row][col]);
      } else {
        // Second click - replace with selected color
        replaceAllColors(replaceFromColor, selectedColor);
        setReplaceFromColor(null);
        setShowReplaceMode(false);
        setActiveTool('pencil');
      }
    } else if (['line', 'rectangle', 'circle'].includes(activeTool)) {
      setIsDrawing(true);
      setStartPoint({ row, col });
      setCurrentPoint({ row, col });
    }
  };

  const handleCanvasPrimaryMoveAt = (clientX: number, clientY: number) => {
    const coords = getPixelCoordinatesFromClient(clientX, clientY);
    if (!coords || !isDrawing) return;

    if (activeTool === 'pencil') {
      nextPaintCell.current = { row: coords.row, col: coords.col };
      schedulePaint();
    } else if (['line', 'rectangle', 'circle'].includes(activeTool)) {
      setCurrentPoint(coords);
    }
  };

  const handleCanvasPrimaryUp = () => {
    if (!isDrawing) return;

    if (['line', 'rectangle', 'circle'].includes(activeTool) && startPoint && currentPoint) {
      const pixels = getShapePixels(
        startPoint,
        currentPoint,
        activeTool as 'line' | 'rectangle' | 'circle',
        shapeMode
      );
      applyPixels(pixels);
      setStartPoint(null);
      setCurrentPoint(null);
    }

    setIsDrawing(false);
    lastPaintedCell.current = null;
  };

  const handleCanvasPointerLeaveDrawing = () => {
    if (isDrawing && ['line', 'rectangle', 'circle'].includes(activeTool)) {
      setStartPoint(null);
      setCurrentPoint(null);
    }
    setIsDrawing(false);
  };

  // Pointer events for touch and mouse (unified)
  const getCanvasRelative = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: clientX, y: clientY };
    const rect = canvas.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    const rel = getCanvasRelative(e.clientX, e.clientY);
    activePointers.current.set(e.pointerId, { x: rel.x, y: rel.y });

    if (activePointers.current.size === 2) {
      // Begin pan/zoom
      const pts = Array.from(activePointers.current.values());
      const dx = pts[1].x - pts[0].x;
      const dy = pts[1].y - pts[0].y;
      const distance = Math.hypot(dx, dy);
      const center = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
      panZoomState.current = {
        isPanZoom: true,
        initialDistance: distance,
        initialScale: viewScale,
        initialCenter: center,
        initialOffset: { ...viewOffset },
      };
    } else if (activePointers.current.size === 1) {
      // Primary draw interaction
      handleCanvasPrimaryDownAt(e.clientX, e.clientY);
    }
  };

  const clamp = (val: number, min: number, max: number) => Math.min(max, Math.max(min, val));

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rel = getCanvasRelative(e.clientX, e.clientY);
    if (activePointers.current.has(e.pointerId)) {
      activePointers.current.set(e.pointerId, { x: rel.x, y: rel.y });
    }

    if (panZoomState.current.isPanZoom && activePointers.current.size >= 2) {
      const pts = Array.from(activePointers.current.values());
      const dx = pts[1].x - pts[0].x;
      const dy = pts[1].y - pts[0].y;
      const distance = Math.hypot(dx, dy);
      const center = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };

      const s0 = panZoomState.current.initialScale;
      const newScale = clamp(s0 * (distance / Math.max(1, panZoomState.current.initialDistance)), 0.5, 4);
      const worldAtCenterX = (panZoomState.current.initialCenter.x - panZoomState.current.initialOffset.x) / s0;
      const worldAtCenterY = (panZoomState.current.initialCenter.y - panZoomState.current.initialOffset.y) / s0;
      const newOffsetX = center.x - newScale * worldAtCenterX;
      const newOffsetY = center.y - newScale * worldAtCenterY;

      scheduleTransformUpdate(newScale, { x: newOffsetX, y: newOffsetY });
    } else if (activePointers.current.size === 1 && !panZoomState.current.isPanZoom) {
      handleCanvasPrimaryMoveAt(e.clientX, e.clientY);
    }
  };

  const onPointerUpOrCancel = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas && canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }
    activePointers.current.delete(e.pointerId);
    if (activePointers.current.size < 2) {
      panZoomState.current.isPanZoom = false;
    }
    if (activePointers.current.size === 0) {
      handleCanvasPrimaryUp();
    }
  };

  const handleZoomIn = () => {
    setPixelSize((prev) => Math.min(prev + 4, 32));
  };

  const handleZoomOut = () => {
    setPixelSize((prev) => Math.max(prev - 4, 8));
  };

  const getCursorClass = () => {
    if (activeTool === 'eyedropper') return 'cursor-crosshair';
    if (activeTool === 'pencil') return 'cursor-crosshair';
    if (activeTool === 'fill') return 'cursor-pointer';
    if (activeTool === 'replace') return replaceFromColor ? 'cursor-copy' : 'cursor-crosshair';
    if (['line', 'rectangle', 'circle'].includes(activeTool)) return 'cursor-crosshair';
    return 'cursor-default';
  };

  return (
    <div className="space-y-6 pb-24 lg:pb-0">
      <div role="status" aria-live="polite" className="sr-only">
        {activeTool === 'pencil' && 'Pencil tool selected'}
        {activeTool === 'fill' && 'Fill tool selected'}
        {activeTool === 'eyedropper' && 'Eyedropper tool selected'}
        {activeTool === 'replace' && 'Replace color tool selected'}
        {activeTool === 'line' && 'Line tool selected'}
        {activeTool === 'rectangle' && 'Rectangle tool selected'}
        {activeTool === 'circle' && 'Circle tool selected'}
        {activeTool === 'replace' && replaceFromColor && `Replacing color ${replaceFromColor.name}`}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Tools & Color Palette */}
        <div className="lg:col-span-1 hidden lg:block">
          <Card>
            <CardHeader>
              <CardTitle>Tools & Colors</CardTitle>
              <p className="text-xs text-muted-foreground">
                Select a tool and color to edit your mosaic
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Drawing Tools */}
                <div className="border rounded-md p-2 bg-card">
                  <div className="text-xs font-medium mb-2">Draw Tools:</div>
                  <div className="grid grid-cols-3 gap-1 mb-2">
                    <Button
                      variant={activeTool === 'pencil' ? 'default' : 'outline'}
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setActiveTool('pencil');
                        setReplaceFromColor(null);
                        setShowReplaceMode(false);
                      }}
                      title="Pencil - Paint pixels by dragging"
                      aria-label="Pencil tool - Paint pixels by dragging"
                      aria-pressed={activeTool === 'pencil'}
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <Button
                      variant={activeTool === 'line' ? 'default' : 'outline'}
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setActiveTool('line');
                        setReplaceFromColor(null);
                        setShowReplaceMode(false);
                      }}
                      title="Line - Draw straight lines"
                      aria-label="Line tool - Draw straight lines"
                      aria-pressed={activeTool === 'line'}
                    >
                      <Minus className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <Button
                      variant={activeTool === 'rectangle' ? 'default' : 'outline'}
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setActiveTool('rectangle');
                        setReplaceFromColor(null);
                        setShowReplaceMode(false);
                      }}
                      title="Rectangle - Draw rectangles"
                      aria-label="Rectangle tool - Draw rectangles"
                      aria-pressed={activeTool === 'rectangle'}
                    >
                      <Square className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <Button
                      variant={activeTool === 'circle' ? 'default' : 'outline'}
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setActiveTool('circle');
                        setReplaceFromColor(null);
                        setShowReplaceMode(false);
                      }}
                      title="Circle - Draw circles"
                      aria-label="Circle tool - Draw circles"
                      aria-pressed={activeTool === 'circle'}
                    >
                      <Circle className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <Button
                      variant={activeTool === 'fill' ? 'default' : 'outline'}
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setActiveTool('fill');
                        setReplaceFromColor(null);
                        setShowReplaceMode(false);
                      }}
                      title="Fill - Replace connected pixels of same color"
                      aria-label="Fill tool - Replace connected pixels of same color"
                      aria-pressed={activeTool === 'fill'}
                    >
                      <PaintBucket className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <Button
                      variant={activeTool === 'eyedropper' ? 'default' : 'outline'}
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setActiveTool('eyedropper');
                        setReplaceFromColor(null);
                        setShowReplaceMode(false);
                      }}
                      title="Eyedropper - Pick a color from canvas"
                      aria-label="Eyedropper tool - Pick a color from canvas"
                      aria-pressed={activeTool === 'eyedropper'}
                    >
                      <Pipette className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                </div>

                {/* Shape Mode Toggle */}
                {['rectangle', 'circle'].includes(activeTool) && (
                  <div className="border rounded-md p-2 bg-card">
                    <div className="text-xs font-medium mb-2">Shape Mode:</div>
                    <div className="grid grid-cols-2 gap-1">
                      <Button
                        variant={shapeMode === 'filled' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setShapeMode('filled')}
                      >
                        Filled
                      </Button>
                      <Button
                        variant={shapeMode === 'outline' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setShapeMode('outline')}
                      >
                        Outline
                      </Button>
                    </div>
                  </div>
                )}

                {/* Color Replace Tool */}
                <div className="border rounded-md p-2 bg-card">
                  <div className="text-xs font-medium mb-2">Color Tools:</div>
                  <Button
                    variant={activeTool === 'replace' ? 'default' : 'outline'}
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setActiveTool('replace');
                      setShowReplaceMode(true);
                      setReplaceFromColor(null);
                    }}
                    title="Replace - Change all instances of a color"
                  >
                    <Replace className="h-4 w-4 mr-2" />
                    Replace Color
                  </Button>
                  {showReplaceMode && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      {!replaceFromColor ? (
                        <p>Click a pixel to select the color to replace</p>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span>Replacing:</span>
                            <div
                              className="w-4 h-4 rounded border"
                              style={{ backgroundColor: replaceFromColor.hex }}
                            />
                            <span className="font-medium">{replaceFromColor.name}</span>
                          </div>
                          <p>Click again to replace with selected color</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full"
                            onClick={() => {
                              setReplaceFromColor(null);
                              setActiveTool('pencil');
                              setShowReplaceMode(false);
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Selected Color */}
                <div className="border rounded-md p-2 bg-card">
                  <div className="text-xs font-medium mb-1">Selected Color:</div>
                  <div className="flex items-center gap-2 p-2 border rounded">
                    <div
                      className="w-8 h-8 rounded border-2"
                      style={{ backgroundColor: selectedColor.hex }}
                    />
                    <div className="text-xs">
                      <div className="font-medium">{selectedColor.name}</div>
                      <div className="text-muted-foreground">{selectedColor.hex}</div>
                    </div>
                  </div>
                </div>

                {/* Color Palette */}
                <div className="relative">
                  {/* Bricks vs Plates Toggle */}
                  <div className="mb-3">
                    <div className="text-xs font-medium mb-2">
                      Part Type: <span className="font-bold text-primary">{showBricks ? 'Bricks' : 'Plates'}</span>
                      {isLoadingColors && <span className="ml-2 text-muted-foreground">(Loading...)</span>}
                      {!isLoadingColors && <span className="ml-2 text-muted-foreground">({availableColors.length} colors)</span>}
                    </div>
                    <div className="flex gap-1 border rounded-md p-1 bg-muted/50">
                      <Button
                        variant={showBricks ? "default" : "ghost"}
                        size="sm"
                        onClick={() => {
                          console.log('[EditTab] Bricks button clicked, current showBricks:', showBricks);
                          handleToggleClick(true);
                        }}
                        className="h-7 px-3 text-xs flex-1"
                      >
                        Bricks
                      </Button>
                      <Button
                        variant={!showBricks ? "default" : "ghost"}
                        size="sm"
                        onClick={() => {
                          console.log('[EditTab] Plates button clicked, current showBricks:', showBricks);
                          handleToggleClick(false);
                        }}
                        className="h-7 px-3 text-xs flex-1"
                      >
                        Plates
                      </Button>
                    </div>
                  </div>

                  {/* Hover tooltip */}
                  {hoveredColor && (
                    <div className="absolute -top-8 left-0 right-0 z-10 flex justify-center">
                      <div className="bg-popover text-popover-foreground px-3 py-1 rounded-md text-xs font-medium shadow-md border">
                        {hoveredColor.name}
                      </div>
                    </div>
                  )}
                  
                  {isLoadingColors && (
                    <div className="text-xs text-muted-foreground text-center py-2">
                      Loading colors...
                    </div>
                  )}
                  
                  <div 
                    key={`colors-${showBricks ? 'brick' : 'plate'}`}
                    className="grid grid-cols-4 gap-1 max-h-[400px] overflow-y-auto p-1"
                  >
                    {availableColors.map((color) => {
                      const count = colorCounts[color.name] || 0;
                      return (
                        <button
                          key={color.name}
                          className={`relative w-full aspect-square rounded border-2 transition-all hover:scale-110 ${
                            selectedColor.name === color.name
                              ? 'ring-2 ring-primary ring-offset-2'
                              : 'border-border'
                          }`}
                          style={{ backgroundColor: color.hex }}
                          onMouseEnter={() => setHoveredColor(color)}
                          onMouseLeave={() => setHoveredColor(null)}
                          onClick={() => setSelectedColor(color)}
                        >
                          {count > 0 && (
                            <span className="absolute top-0 right-0 bg-black/70 text-white text-[9px] font-bold px-1 rounded-bl rounded-tr leading-tight">
                              x{count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Canvas */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Edit Your Mosaic</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Use tools to draw, paint, fill, or replace colors • {mosaicData.width} × {mosaicData.height} studs
                  </p>
                </div>
                <div className="flex gap-2">
                  {onSave && (
                    <>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={onSave}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Save
                      </Button>
                      <div className="border-l mx-1" />
                    </>
                  )}
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={undo}
                    disabled={historyIndex <= 0}
                    title="Undo (Cmd/Ctrl+Z)"
                    aria-label="Undo last action (Cmd/Ctrl+Z)"
                  >
                    <Undo2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={redo}
                    disabled={historyIndex >= history.length - 1}
                    title="Redo (Cmd/Ctrl+Shift+Z)"
                    aria-label="Redo last undone action (Cmd/Ctrl+Shift+Z)"
                  >
                    <Redo2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <div className="border-l mx-1" aria-hidden="true" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowGrid(!showGrid)}
                    aria-label={showGrid ? 'Hide grid' : 'Show grid'}
                  >
                    {showGrid ? 'Hide' : 'Show'} Grid
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleZoomOut}
                    disabled={pixelSize <= 8}
                    aria-label="Zoom out"
                  >
                    <ZoomOut className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleZoomIn}
                    disabled={pixelSize >= 32}
                    aria-label="Zoom in"
                  >
                    <ZoomIn className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md bg-muted/20 p-4">
                <div className="relative inline-block">
                  <canvas
                    ref={canvasRef}
                    className={getCursorClass()}
                    style={{ imageRendering: 'pixelated', touchAction: 'none' }}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUpOrCancel}
                    onPointerCancel={onPointerUpOrCancel}
                    onPointerLeave={onPointerUpOrCancel}
                    aria-label={`Mosaic editor canvas, ${mosaicData.width} by ${mosaicData.height} studs`}
                    role="img"
                    tabIndex={0}
                  />
                  <canvas
                    ref={previewCanvasRef}
                    className="absolute top-0 left-0 pointer-events-none"
                    style={{ 
                      imageRendering: 'pixelated',
                      width: mosaicData.width * pixelSize,
                      height: mosaicData.height * pixelSize,
                    }}
                    width={mosaicData.width * pixelSize}
                    height={mosaicData.height * pixelSize}
                    aria-hidden="true"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Mobile toolbar */}
      <MobileEditToolbar
        activeTool={activeTool}
        onToolChange={(tool) => { setActiveTool(tool); setReplaceFromColor(null); setShowReplaceMode(false); }}
        onUndo={undo}
        onRedo={redo}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        showGrid={showGrid}
        onToggleGrid={() => setShowGrid(!showGrid)}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        selectedColor={selectedColor}
        onColorSelect={(c) => setSelectedColor(c)}
        onOpenControls={() => setIsMobileControlsOpen(true)}
      />

      {/* Mobile controls sheet */}
      <MobileControlsSheet open={isMobileControlsOpen} onOpenChange={setIsMobileControlsOpen} title="Tools & Colors">
        <div className="space-y-3">
          {/* Mirror the desktop card content in a compact layout */}
          <div className="border rounded-md p-2 bg-card">
            <div className="text-xs font-medium mb-2">Draw Tools:</div>
            <div className="grid grid-cols-3 gap-1 mb-2">
              <Button
                variant={activeTool === 'pencil' ? 'default' : 'outline'}
                size="sm"
                className="w-full"
                onClick={() => { setActiveTool('pencil'); setReplaceFromColor(null); setShowReplaceMode(false); }}
                title="Pencil - Paint pixels by dragging"
                aria-label="Pencil tool - Paint pixels by dragging"
                aria-pressed={activeTool === 'pencil'}
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button
                variant={activeTool === 'line' ? 'default' : 'outline'}
                size="sm"
                className="w-full"
                onClick={() => { setActiveTool('line'); setReplaceFromColor(null); setShowReplaceMode(false); }}
                title="Line - Draw straight lines"
                aria-label="Line tool - Draw straight lines"
                aria-pressed={activeTool === 'line'}
              >
                <Minus className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button
                variant={activeTool === 'rectangle' ? 'default' : 'outline'}
                size="sm"
                className="w-full"
                onClick={() => { setActiveTool('rectangle'); setReplaceFromColor(null); setShowReplaceMode(false); }}
                title="Rectangle - Draw rectangles"
                aria-label="Rectangle tool - Draw rectangles"
                aria-pressed={activeTool === 'rectangle'}
              >
                <Square className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-1">
              <Button
                variant={activeTool === 'circle' ? 'default' : 'outline'}
                size="sm"
                className="w-full"
                onClick={() => { setActiveTool('circle'); setReplaceFromColor(null); setShowReplaceMode(false); }}
                title="Circle - Draw circles"
                aria-label="Circle tool - Draw circles"
                aria-pressed={activeTool === 'circle'}
              >
                <Circle className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button
                variant={activeTool === 'fill' ? 'default' : 'outline'}
                size="sm"
                className="w-full"
                onClick={() => { setActiveTool('fill'); setReplaceFromColor(null); setShowReplaceMode(false); }}
                title="Fill - Replace connected pixels of same color"
                aria-label="Fill tool - Replace connected pixels of same color"
                aria-pressed={activeTool === 'fill'}
              >
                <PaintBucket className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button
                variant={activeTool === 'eyedropper' ? 'default' : 'outline'}
                size="sm"
                className="w-full"
                onClick={() => { setActiveTool('eyedropper'); setReplaceFromColor(null); setShowReplaceMode(false); }}
                title="Eyedropper - Pick a color from canvas"
                aria-label="Eyedropper tool - Pick a color from canvas"
                aria-pressed={activeTool === 'eyedropper'}
              >
                <Pipette className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>

          {['rectangle', 'circle'].includes(activeTool) && (
            <div className="border rounded-md p-2 bg-card">
              <div className="text-xs font-medium mb-2">Shape Mode:</div>
              <div className="grid grid-cols-2 gap-1">
                <Button variant={shapeMode === 'filled' ? 'default' : 'outline'} size="sm" onClick={() => setShapeMode('filled')}>Filled</Button>
                <Button variant={shapeMode === 'outline' ? 'default' : 'outline'} size="sm" onClick={() => setShapeMode('outline')}>Outline</Button>
              </div>
            </div>
          )}

          <div className="border rounded-md p-2 bg-card">
            <div className="text-xs font-medium mb-2">Color Tools:</div>
            <Button
              variant={activeTool === 'replace' ? 'default' : 'outline'}
              size="sm"
              className="w-full"
              onClick={() => { setActiveTool('replace'); setShowReplaceMode(true); setReplaceFromColor(null); }}
              title="Replace - Change all instances of a color"
            >
              <Replace className="h-4 w-4 mr-2" />
              Replace Color
            </Button>
            {showReplaceMode && (
              <div className="mt-2 text-xs text-muted-foreground">
                {!replaceFromColor ? (
                  <p>Click a pixel to select the color to replace</p>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span>Replacing:</span>
                      <div className="w-4 h-4 rounded border" style={{ backgroundColor: replaceFromColor.hex }} />
                      <span className="font-medium">{replaceFromColor.name}</span>
                    </div>
                    <p>Click again to replace with selected color</p>
                    <Button variant="ghost" size="sm" className="w-full" onClick={() => { setReplaceFromColor(null); setActiveTool('pencil'); setShowReplaceMode(false); }}>Cancel</Button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="border rounded-md p-2 bg-card">
            <div className="text-xs font-medium mb-1">Selected Color:</div>
            <div className="flex items-center gap-2 p-2 border rounded">
              <div className="w-8 h-8 rounded border-2" style={{ backgroundColor: selectedColor.hex }} />
              <div className="text-xs">
                <div className="font-medium">{selectedColor.name}</div>
                <div className="text-muted-foreground">{selectedColor.hex}</div>
              </div>
            </div>
          </div>

          {/* Bricks vs Plates Toggle */}
          <div className="border rounded-md p-2 bg-card">
            <div className="text-xs font-medium mb-2">
              Part Type: <span className="font-bold text-primary">{showBricks ? 'Bricks' : 'Plates'}</span>
              {isLoadingColors && <span className="ml-2 text-muted-foreground">(Loading...)</span>}
              {!isLoadingColors && <span className="ml-2 text-muted-foreground">({availableColors.length} colors)</span>}
            </div>
            <div className="flex gap-1 border rounded-md p-1 bg-muted/50">
              <Button
                variant={showBricks ? "default" : "ghost"}
                size="sm"
                onClick={() => {
                  console.log('[EditTab] Mobile Bricks button clicked, current showBricks:', showBricks);
                  handleToggleClick(true);
                }}
                className="h-7 px-3 text-xs flex-1"
              >
                Bricks
              </Button>
              <Button
                variant={!showBricks ? "default" : "ghost"}
                size="sm"
                onClick={() => {
                  console.log('[EditTab] Mobile Plates button clicked, current showBricks:', showBricks);
                  handleToggleClick(false);
                }}
                className="h-7 px-3 text-xs flex-1"
              >
                Plates
              </Button>
            </div>
          </div>

          <div className="relative">
            {isLoadingColors && (
              <div className="text-xs text-muted-foreground text-center py-2">
                Loading colors...
              </div>
            )}
            <div 
              key={`colors-mobile-${showBricks ? 'brick' : 'plate'}`}
              className="grid grid-cols-5 gap-1 max-h-[280px] overflow-y-auto p-1"
            >
              {availableColors.map((color) => (
                <button
                  key={color.name}
                  className={`relative w-full aspect-square rounded border-2 transition-all ${selectedColor.name === color.name ? 'ring-2 ring-primary ring-offset-2' : 'border-border'}`}
                  style={{ backgroundColor: color.hex }}
                  onClick={() => setSelectedColor(color)}
                  aria-label={`Select ${color.name}`}
                />
              ))}
            </div>
          </div>
        </div>
      </MobileControlsSheet>

      {/* Color Remap Confirmation Modal */}
      <Dialog open={showRemapModal} onOpenChange={(open) => {
        if (!open) {
          handleRemapCancel();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remap Colors?</DialogTitle>
            <DialogDescription>
              Some colors in your mosaic are not available in the {showBricks ? 'bricks' : 'plates'} palette. 
              Would you like to automatically remap them to the closest matching colors?
            </DialogDescription>
          </DialogHeader>
          
          <div className="max-h-[300px] overflow-y-auto space-y-2 py-4">
            {Array.from(colorMappings.entries()).map(([oldColorName, newColor]) => {
              const oldColor = mosaicData.pixels.flat().find(p => p.name === oldColorName);
              if (!oldColor) return null;
              
              const count = colorCounts[oldColorName] || 0;
              
              return (
                <div key={oldColorName} className="flex items-center gap-3 p-2 border rounded">
                  <div className="flex items-center gap-2 flex-1">
                    <div
                      className="w-8 h-8 rounded border-2"
                      style={{ backgroundColor: oldColor.hex }}
                      title={oldColor.name}
                    />
                    <div className="text-sm">
                      <div className="font-medium">{oldColor.name}</div>
                      <div className="text-xs text-muted-foreground">{count} pixel{count !== 1 ? 's' : ''}</div>
                    </div>
                  </div>
                  <div className="text-muted-foreground">→</div>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded border-2"
                      style={{ backgroundColor: newColor.hex }}
                      title={newColor.name}
                    />
                    <div className="text-sm font-medium">{newColor.name}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleRemapCancel}>
              Cancel
            </Button>
            <Button onClick={handleRemapConfirm}>
              Remap Colors
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

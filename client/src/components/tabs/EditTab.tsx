import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ZoomIn, ZoomOut, Pipette, Pencil, PaintBucket, Minus, Square, Circle, Undo2, Redo2, Replace, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LEGO_COLORS } from '@/utils/legoColors';
import type { MosaicData } from '@/utils/imageProcessor';
import type { LegoColor } from '@/utils/legoColors';

type Tool = 'pencil' | 'fill' | 'eyedropper' | 'line' | 'rectangle' | 'circle' | 'replace';
type ShapeMode = 'filled' | 'outline';

interface EditTabProps {
  mosaicData: MosaicData;
  onMosaicUpdate: (updatedMosaic: MosaicData) => void;
  onSave?: () => void;
}

export function EditTab({ mosaicData, onMosaicUpdate, onSave }: EditTabProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const [pixelSize, setPixelSize] = useState(16);
  const [showGrid, setShowGrid] = useState(true);
  const [selectedColor, setSelectedColor] = useState<LegoColor>(LEGO_COLORS[0]);
  const [activeTool, setActiveTool] = useState<Tool>('pencil');
  const [isDrawing, setIsDrawing] = useState(false);
  const [shapeMode, setShapeMode] = useState<ShapeMode>('filled');
  const [startPoint, setStartPoint] = useState<{row: number, col: number} | null>(null);
  const [currentPoint, setCurrentPoint] = useState<{row: number, col: number} | null>(null);
  
  // History management
  const [history, setHistory] = useState<MosaicData[]>([mosaicData]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  // Replace mode state
  const [showReplaceMode, setShowReplaceMode] = useState(false);
  const [replaceFromColor, setReplaceFromColor] = useState<LegoColor | null>(null);
  
  // Hover state for color palette
  const [hoveredColor, setHoveredColor] = useState<LegoColor | null>(null);

  // Calculate color counts
  const colorCounts = useMemo(() => {
    const counts: { [colorId: string]: number } = {};
    
    for (let row = 0; row < mosaicData.height; row++) {
      for (let col = 0; col < mosaicData.width; col++) {
        const color = mosaicData.pixels[row][col];
        counts[color.id] = (counts[color.id] || 0) + 1;
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
  }, [mosaicData, pixelSize, showGrid, startPoint, currentPoint, activeTool, selectedColor, shapeMode]);

  const drawMosaic = () => {
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
    ctx.clearRect(0, 0, canvas.width, canvas.height);

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
    if (targetColor.id === replacementColor.id) return mosaicData.pixels;

    const pixels = mosaicData.pixels.map(row => [...row]);
    const queue: [number, number][] = [[startRow, startCol]];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const [row, col] = queue.shift()!;
      const key = `${row},${col}`;

      if (visited.has(key)) continue;
      if (row < 0 || row >= mosaicData.height || col < 0 || col >= mosaicData.width) continue;
      if (pixels[row][col].id !== targetColor.id) continue;

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
    if (targetColor.id === replacementColor.id) return;

    const pixels = mosaicData.pixels.map(row => 
      row.map(pixel => pixel.id === targetColor.id ? replacementColor : pixel)
    );

    addToHistory({
      ...mosaicData,
      pixels,
    });
  };

  const getPixelCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const col = Math.floor(x / pixelSize);
    const row = Math.floor(y / pixelSize);

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

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getPixelCoordinates(e);
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

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getPixelCoordinates(e);
    if (!coords || !isDrawing) return;

    if (activeTool === 'pencil') {
      paintPixel(coords.row, coords.col);
    } else if (['line', 'rectangle', 'circle'].includes(activeTool)) {
      setCurrentPoint(coords);
    }
  };

  const handleCanvasMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
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
  };

  const handleCanvasMouseLeave = () => {
    if (isDrawing && ['line', 'rectangle', 'circle'].includes(activeTool)) {
      setStartPoint(null);
      setCurrentPoint(null);
    }
    setIsDrawing(false);
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
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Tools & Color Palette */}
        <div className="lg:col-span-1">
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
                    >
                      <Pencil className="h-4 w-4" />
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
                    >
                      <Minus className="h-4 w-4" />
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
                    >
                      <Square className="h-4 w-4" />
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
                    >
                      <Circle className="h-4 w-4" />
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
                    >
                      <PaintBucket className="h-4 w-4" />
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
                    >
                      <Pipette className="h-4 w-4" />
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
                  {/* Hover tooltip */}
                  {hoveredColor && (
                    <div className="absolute -top-8 left-0 right-0 z-10 flex justify-center">
                      <div className="bg-popover text-popover-foreground px-3 py-1 rounded-md text-xs font-medium shadow-md border">
                        {hoveredColor.name}
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-4 gap-1 max-h-[400px] overflow-y-auto p-1">
                    {LEGO_COLORS.map((color) => {
                      const count = colorCounts[color.id] || 0;
                      return (
                        <button
                          key={color.id}
                          className={`relative w-full aspect-square rounded border-2 transition-all hover:scale-110 ${
                            selectedColor.id === color.id
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
                  >
                    <Undo2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={redo}
                    disabled={historyIndex >= history.length - 1}
                    title="Redo (Cmd/Ctrl+Shift+Z)"
                  >
                    <Redo2 className="h-4 w-4" />
                  </Button>
                  <div className="border-l mx-1" />
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
                    disabled={pixelSize <= 8}
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
            </CardHeader>
            <CardContent>
              <div className="border rounded-md bg-muted/20 p-4">
                <div className="relative inline-block">
                  <canvas
                    ref={canvasRef}
                    className={getCursorClass()}
                    style={{ imageRendering: 'pixelated' }}
                    onMouseDown={handleCanvasMouseDown}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={handleCanvasMouseUp}
                    onMouseLeave={handleCanvasMouseLeave}
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
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

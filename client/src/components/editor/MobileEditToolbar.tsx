import { Button } from '@/components/ui/button';
import { LEGO_COLORS } from '@/utils/bricks/colors';
import type { LegoColor } from '@/utils/bricks/colors';
import { Pencil, PaintBucket, Pipette, Minus, Square, Circle, Undo2, Redo2, Grid, ZoomIn, ZoomOut, Settings } from 'lucide-react';
import { useMemo } from 'react';

type Tool = 'pencil' | 'fill' | 'eyedropper' | 'line' | 'rectangle' | 'circle' | 'replace';

interface MobileEditToolbarProps {
  activeTool: Tool;
  onToolChange: (tool: Tool) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  showGrid: boolean;
  onToggleGrid: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  selectedColor: LegoColor;
  onColorSelect: (color: LegoColor) => void;
  onOpenControls: () => void;
}

export function MobileEditToolbar({
  activeTool,
  onToolChange,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  showGrid,
  onToggleGrid,
  onZoomIn,
  onZoomOut,
  selectedColor,
  onColorSelect,
  onOpenControls,
}: MobileEditToolbarProps) {
  const quickColors = useMemo(() => LEGO_COLORS.slice(0, 8), []);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t bg-background shadow-lg" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom))' }}>
      <div className="px-3 py-2 flex items-center gap-2 overflow-x-auto">
        <div className="flex items-center gap-1">
          <Button
            variant={activeTool === 'pencil' ? 'default' : 'outline'}
            size="icon"
            className="h-9 w-9"
            onClick={() => onToolChange('pencil')}
            aria-label="Pencil tool"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant={activeTool === 'fill' ? 'default' : 'outline'}
            size="icon"
            className="h-9 w-9"
            onClick={() => onToolChange('fill')}
            aria-label="Fill tool"
          >
            <PaintBucket className="h-4 w-4" />
          </Button>
          <Button
            variant={activeTool === 'eyedropper' ? 'default' : 'outline'}
            size="icon"
            className="h-9 w-9"
            onClick={() => onToolChange('eyedropper')}
            aria-label="Eyedropper tool"
          >
            <Pipette className="h-4 w-4" />
          </Button>
          <Button
            variant={activeTool === 'line' ? 'default' : 'outline'}
            size="icon"
            className="h-9 w-9"
            onClick={() => onToolChange('line')}
            aria-label="Line tool"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button
            variant={activeTool === 'rectangle' ? 'default' : 'outline'}
            size="icon"
            className="h-9 w-9"
            onClick={() => onToolChange('rectangle')}
            aria-label="Rectangle tool"
          >
            <Square className="h-4 w-4" />
          </Button>
          <Button
            variant={activeTool === 'circle' ? 'default' : 'outline'}
            size="icon"
            className="h-9 w-9"
            onClick={() => onToolChange('circle')}
            aria-label="Circle tool"
          >
            <Circle className="h-4 w-4" />
          </Button>
        </div>

        <div className="h-6 w-px bg-border" />

        <div className="flex items-center gap-1">
          {quickColors.map((color) => (
            <button
              key={color.name}
              className={`h-7 w-7 rounded-full border ${selectedColor.name === color.name ? 'ring-2 ring-primary ring-offset-1' : ''}`}
              style={{ backgroundColor: color.hex }}
              onClick={() => onColorSelect(color)}
              aria-label={`Select ${color.name}`}
            />
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1">
          <Button variant={showGrid ? 'default' : 'outline'} size="icon" className="h-9 w-9" onClick={onToggleGrid} aria-label="Toggle grid">
            <Grid className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={onZoomOut} aria-label="Zoom out">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={onZoomIn} aria-label="Zoom in">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={onUndo} disabled={!canUndo} aria-label="Undo">
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={onRedo} disabled={!canRedo} aria-label="Redo">
            <Redo2 className="h-4 w-4" />
          </Button>
          <Button variant="default" size="icon" className="h-9 w-9" onClick={onOpenControls} aria-label="Open controls">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default MobileEditToolbar;




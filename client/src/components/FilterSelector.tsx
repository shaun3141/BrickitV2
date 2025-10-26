import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { ALL_FILTERS, getFiltersByCategory } from '@/utils/filters';
import type { FilterConfig, FilterParameter } from '@/utils/filterTypes';
import type { FilterOptions } from '@/utils/imageProcessor';
import { LEGO_COLORS } from '@/utils/legoColors';
import { MOSAIC_SIZES } from '@/types';
import type { MosaicSize } from '@/types';
import { 
  Zap, 
  Palette, 
  Settings, 
  Grid3X3, 
  Pen, 
  Sparkles, 
  Brain,
  X,
  RotateCcw,
  ChevronDown,
  Info,
  Maximize2
} from 'lucide-react';

interface FilterSelectorProps {
  filterOptions: FilterOptions;
  onFilterOptionsChange: (options: FilterOptions) => void;
  selectedSize: MosaicSize;
  customWidth: number;
  onSizeChange: (size: MosaicSize) => void;
  onCustomWidthChange: (width: number) => void;
}

const CATEGORIES = [
  { id: 'basic', label: 'Basic', icon: Zap, description: 'Brightness, contrast, saturation' },
  { id: 'palette', label: 'Palette', icon: Palette, description: 'Color manipulation & reduction' },
  { id: 'dither', label: 'Dither', icon: Settings, description: 'Dithering algorithms' },
  { id: 'geometry', label: 'Geometry', icon: Grid3X3, description: 'Shape & structure effects' },
  { id: 'edge', label: 'Edge', icon: Pen, description: 'Edge detection & enhancement' },
  { id: 'pattern', label: 'Pattern', icon: Sparkles, description: 'Pattern-based effects' },
  { id: 'content', label: 'Smart', icon: Brain, description: 'Content-aware filters' },
];

export function FilterSelector({ 
  filterOptions, 
  onFilterOptionsChange,
  selectedSize,
  customWidth,
  onSizeChange,
  onCustomWidthChange
}: FilterSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('basic');
  const [showFilterList, setShowFilterList] = useState(false);

  const categoryFilters = selectedCategory === 'basic' ? [] : getFiltersByCategory(selectedCategory);
  const activeFilter = filterOptions.selectedFilter 
    ? ALL_FILTERS.find(f => f.metadata.id === filterOptions.selectedFilter!.filterId)
    : undefined;

  const hasBasicFilters = ((filterOptions.brightness || 0) !== 0 || (filterOptions.contrast || 0) !== 0 || (filterOptions.saturation || 0) !== 0);
  const hasArtisticFilter = !!filterOptions.selectedFilter;

  const handleFilterSelect = (filterId: string) => {
    const filter = ALL_FILTERS.find(f => f.metadata.id === filterId);
    if (!filter) return;

    // Initialize with default parameters
    const params: Record<string, any> = {};
    filter.metadata.parameters.forEach(param => {
      params[param.name] = param.default;
    });

    onFilterOptionsChange({
      ...filterOptions,
      selectedFilter: { filterId, params },
    });
    setShowFilterList(false);
  };

  const handleParamChange = (paramName: string, value: any) => {
    if (!filterOptions.selectedFilter) return;
    
    onFilterOptionsChange({
      ...filterOptions,
      selectedFilter: {
        ...filterOptions.selectedFilter,
        params: {
          ...filterOptions.selectedFilter.params,
          [paramName]: value,
        },
      },
    });
  };

  const handleBasicFilterChange = (key: 'brightness' | 'contrast' | 'saturation', value: number) => {
    onFilterOptionsChange({
      ...filterOptions,
      [key]: value,
    });
  };

  const handleClearArtisticFilter = () => {
    onFilterOptionsChange({
      ...filterOptions,
      selectedFilter: undefined,
    });
    setShowFilterList(false);
  };

  const handleResetAll = () => {
    onFilterOptionsChange({
      brightness: 0,
      contrast: 0,
      saturation: 0,
      selectedFilter: undefined,
    });
    setSelectedCategory('basic');
    setShowFilterList(false);
  };

  const renderParameterControl = (param: FilterParameter) => {
    const currentValue = filterOptions.selectedFilter?.params[param.name] ?? param.default;

    switch (param.type) {
      case 'number':
        return (
          <div key={param.name} className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium">{param.label}</label>
              <span className="text-xs text-muted-foreground">{currentValue}</span>
            </div>
            <Slider
              value={[currentValue]}
              onValueChange={(values: number[]) => handleParamChange(param.name, values[0])}
              min={param.min}
              max={param.max}
              step={param.step}
              className="w-full"
            />
          </div>
        );

      case 'boolean':
        return (
          <div key={param.name} className="flex items-center justify-between">
            <label className="text-xs font-medium">{param.label}</label>
            <Button
              variant={currentValue ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleParamChange(param.name, !currentValue)}
              className="h-6 text-xs px-2"
            >
              {currentValue ? 'On' : 'Off'}
            </Button>
          </div>
        );

      case 'select':
        return (
          <div key={param.name} className="space-y-1">
            <label className="text-xs font-medium">{param.label}</label>
            <div className="grid grid-cols-2 gap-1">
              {param.options?.map(option => (
                <Button
                  key={option.value}
                  variant={currentValue === option.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleParamChange(param.name, option.value)}
                  className="text-[10px] h-7 px-1"
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        );

      case 'color':
        return (
          <div key={param.name} className="space-y-1">
            <label className="text-xs font-medium">{param.label}</label>
            <div className="grid grid-cols-6 gap-1">
              {LEGO_COLORS.slice(0, 12).map(color => (
                <button
                  key={color.id}
                  className={`aspect-square rounded border transition-all ${
                    currentValue === color.id
                      ? 'border-primary border-2'
                      : 'border-border hover:border-primary/50'
                  }`}
                  style={{ backgroundColor: color.hex }}
                  onClick={() => handleParamChange(param.name, color.id)}
                  title={color.name}
                />
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const selectedCategoryData = CATEGORIES.find(c => c.id === selectedCategory);

  return (
    <Card className="h-fit">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle>Settings & Filters</CardTitle>
            {(hasBasicFilters || hasArtisticFilter) && (
              <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full font-medium">
                <Sparkles className="h-3 w-3" />
                Active
              </span>
            )}
          </div>
          {(hasBasicFilters || hasArtisticFilter) && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleResetAll} 
              className="h-8 text-xs gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Mosaic Size Selection Section */}
        <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2">
            <Maximize2 className="h-4 w-4 text-muted-foreground" />
            <label className="text-sm font-semibold">Mosaic Dimensions</label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(MOSAIC_SIZES) as MosaicSize[]).map((size) => (
              <Button
                key={size}
                variant={selectedSize === size ? 'default' : 'outline'}
                onClick={() => onSizeChange(size)}
                className="w-full h-auto py-2 flex flex-col gap-0.5"
              >
                <span className="text-xs font-semibold">
                  {size.charAt(0).toUpperCase() + size.slice(1)}
                </span>
                <span className="text-[10px] opacity-80">
                  {MOSAIC_SIZES[size].width} wide
                </span>
              </Button>
            ))}
          </div>
          <div className="pt-2">
            <label className="text-xs font-medium mb-2 block text-muted-foreground">
              Custom Width: {customWidth} bricks
            </label>
            <Slider
              value={[customWidth]}
              onValueChange={(value: number[]) => onCustomWidthChange(value[0])}
              min={16}
              max={512}
              step={4}
              className="w-full"
            />
          </div>
        </div>

        {/* Filters Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-muted-foreground" />
              <label className="text-sm font-semibold">Image Filters</label>
            </div>
            {selectedCategoryData && (
              <p className="text-xs text-muted-foreground">
                {selectedCategoryData.description}
              </p>
            )}
          </div>
          
          {/* Category Grid */}
          <div className="grid grid-cols-2 gap-2">
          {CATEGORIES.map(category => {
            const count = category.id === 'basic' ? 3 : getFiltersByCategory(category.id).length;
            const isActive = selectedCategory === category.id;
            const Icon = category.icon;
            return (
              <button
                key={category.id}
                onClick={() => {
                  setSelectedCategory(category.id);
                  if (category.id !== 'basic') setShowFilterList(true);
                  else setShowFilterList(false);
                }}
                className={`flex items-center gap-2 p-2 rounded-md border transition-all ${
                  isActive
                    ? 'border-primary bg-primary/10 shadow-sm'
                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                }`}
                title={category.description}
              >
                <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                <div className="flex-1 text-left min-w-0">
                  <div className={`text-xs font-medium truncate ${isActive ? 'text-primary' : ''}`}>
                    {category.label}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {count} {count === 1 ? 'option' : 'options'}
                  </div>
                </div>
              </button>
            );
          })}
          </div>
        </div>

        {/* Divider - only show between filters and controls */}
        {selectedCategory === 'basic' && <div className="border-t" />}

        {/* Basic Filters */}
        {selectedCategory === 'basic' && (
          <div className="space-y-4">
            <div className="space-y-3">
              {/* Brightness */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium flex items-center gap-1">
                    Brightness
                  </label>
                  <span className={`text-sm font-mono ${
                    (filterOptions.brightness || 0) !== 0 ? 'text-primary font-medium' : 'text-muted-foreground'
                  }`}>
                    {(filterOptions.brightness || 0) > 0 ? '+' : ''}{filterOptions.brightness || 0}
                  </span>
                </div>
                <Slider
                  value={[filterOptions.brightness || 0]}
                  onValueChange={(v: number[]) => handleBasicFilterChange('brightness', v[0])}
                  min={-50}
                  max={50}
                  step={5}
                  className="w-full"
                />
              </div>

              {/* Contrast */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium flex items-center gap-1">
                    Contrast
                  </label>
                  <span className={`text-sm font-mono ${
                    (filterOptions.contrast || 0) !== 0 ? 'text-primary font-medium' : 'text-muted-foreground'
                  }`}>
                    {(filterOptions.contrast || 0) > 0 ? '+' : ''}{filterOptions.contrast || 0}
                  </span>
                </div>
                <Slider
                  value={[filterOptions.contrast || 0]}
                  onValueChange={(v: number[]) => handleBasicFilterChange('contrast', v[0])}
                  min={-50}
                  max={50}
                  step={5}
                  className="w-full"
                />
              </div>

              {/* Saturation */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium flex items-center gap-1">
                    Saturation
                  </label>
                  <span className={`text-sm font-mono ${
                    (filterOptions.saturation || 0) !== 0 ? 'text-primary font-medium' : 'text-muted-foreground'
                  }`}>
                    {(filterOptions.saturation || 0) > 0 ? '+' : ''}{filterOptions.saturation || 0}
                  </span>
                </div>
                <Slider
                  value={[filterOptions.saturation || 0]}
                  onValueChange={(v: number[]) => handleBasicFilterChange('saturation', v[0])}
                  min={-100}
                  max={100}
                  step={10}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        )}

        {/* Artistic Filters */}
        {selectedCategory !== 'basic' && (
          <div className="space-y-3">
            {/* Active Filter Display */}
            {activeFilter ? (
              <div className="space-y-3">
                <div className="p-3 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border-2 border-primary/30">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate text-primary">
                        {activeFilter.metadata.hashtag || activeFilter.metadata.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {activeFilter.metadata.description}
                      </p>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearArtisticFilter}
                        className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive"
                        title="Remove filter"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Change Filter Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFilterList(!showFilterList)}
                    className="w-full text-xs gap-1 bg-background/50 hover:bg-background"
                  >
                    <ChevronDown className={`h-3 w-3 transition-transform ${showFilterList ? 'rotate-180' : ''}`} />
                    {showFilterList ? 'Hide' : 'Change'} Filter
                  </Button>
                </div>

                {/* Parameters */}
                {activeFilter.metadata.parameters.length > 0 && !showFilterList && (
                  <div className="space-y-3 p-3 bg-muted/30 rounded-lg border">
                    <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                      <Settings className="h-3 w-3" />
                      Parameters
                    </div>
                    {activeFilter.metadata.parameters.map(renderParameterControl)}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center p-6 border-2 border-dashed rounded-lg">
                <Info className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-medium mb-1">No filter selected</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Choose a {selectedCategoryData?.label.toLowerCase()} filter to enhance your image
                </p>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setShowFilterList(true)}
                  className="gap-1"
                >
                  <Sparkles className="h-3 w-3" />
                  Browse Filters
                </Button>
              </div>
            )}

            {/* Filter List */}
            {showFilterList && (
              <div className="space-y-1 max-h-64 overflow-y-auto border rounded-lg p-2 bg-muted/20">
                <div className="text-xs font-medium text-muted-foreground px-2 py-1">
                  Available Filters ({categoryFilters.length})
                </div>
                {categoryFilters.map(filter => (
                  <button
                    key={filter.metadata.id}
                    onClick={() => handleFilterSelect(filter.metadata.id)}
                    className={`w-full px-3 py-2 text-left rounded-md transition-all ${
                      filterOptions.selectedFilter?.filterId === filter.metadata.id
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'hover:bg-background/80 hover:shadow-sm'
                    }`}
                  >
                    <span className="font-medium text-sm block">
                      {filter.metadata.hashtag || filter.metadata.name}
                    </span>
                    <span className="text-xs opacity-80 line-clamp-1">
                      {filter.metadata.description}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}


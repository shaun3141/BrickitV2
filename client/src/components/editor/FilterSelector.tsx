import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ALL_FILTERS } from '@/utils/image/filters';
import type { FilterParameter } from '@/types/filter.types';
import type { FilterOptions } from '@/types/mosaic.types';
import { LEGO_COLORS } from '@/utils/bricks/colors';
import { getLuminance } from '@/utils/image/helpers';
import { MOSAIC_SIZES } from '@/constants/mosaic.constants';
import type { MosaicSize } from '@/types';
import { 
  Zap, 
  Settings, 
  Sparkles, 
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


export function FilterSelector({ 
  filterOptions, 
  onFilterOptionsChange,
  selectedSize,
  customWidth,
  onSizeChange,
  onCustomWidthChange
}: FilterSelectorProps) {
  const [showFilterList, setShowFilterList] = useState(false);
  const activeFilter = filterOptions.selectedFilter 
    ? ALL_FILTERS.find(f => f.metadata.id === filterOptions.selectedFilter!.filterId)
    : undefined;

  const hasBasicFilters = ((filterOptions.brightness || 0) !== 0 || (filterOptions.contrast || 0) !== 0 || (filterOptions.saturation || 0) !== 0);
  const hasArtisticFilter = !!filterOptions.selectedFilter;

  // Validate tricolor filter color values are in correct groups
  useEffect(() => {
    if (activeFilter?.metadata.id === 'tricolor' && filterOptions.selectedFilter) {
      const colorsWithLum = LEGO_COLORS.map(color => ({
        color,
        luminance: getLuminance(color.rgb[0], color.rgb[1], color.rgb[2])
      }));
      colorsWithLum.sort((a, b) => a.luminance - b.luminance);
      const thirdPoint = Math.floor(colorsWithLum.length / 3);
      const twoThirdPoint = Math.floor(colorsWithLum.length * 2 / 3);
      const darkColors = colorsWithLum.slice(0, thirdPoint);
      const midColors = colorsWithLum.slice(thirdPoint, twoThirdPoint);
      const lightColors = colorsWithLum.slice(twoThirdPoint);

      const darkColorParam = activeFilter.metadata.parameters.find(p => p.name === 'darkColor');
      const midColorParam = activeFilter.metadata.parameters.find(p => p.name === 'midColor');
      const lightColorParam = activeFilter.metadata.parameters.find(p => p.name === 'lightColor');

      const params = { ...filterOptions.selectedFilter.params };
      let needsUpdate = false;

      if (darkColorParam) {
        const currentValue = params[darkColorParam.name] ?? darkColorParam.default;
        if (!darkColors.some(({ color }) => color.name === currentValue)) {
          params[darkColorParam.name] = darkColors[0]?.color.name ?? darkColorParam.default;
          needsUpdate = true;
        }
      }
      if (midColorParam) {
        const currentValue = params[midColorParam.name] ?? midColorParam.default;
        if (!midColors.some(({ color }) => color.name === currentValue)) {
          params[midColorParam.name] = midColors[0]?.color.name ?? midColorParam.default;
          needsUpdate = true;
        }
      }
      if (lightColorParam) {
        const currentValue = params[lightColorParam.name] ?? lightColorParam.default;
        if (!lightColors.some(({ color }) => color.name === currentValue)) {
          params[lightColorParam.name] = lightColors[0]?.color.name ?? lightColorParam.default;
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        onFilterOptionsChange({
          ...filterOptions,
          selectedFilter: { ...filterOptions.selectedFilter, params },
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter?.metadata.id, filterOptions.selectedFilter?.filterId]);

  const handleFilterSelect = (filterId: string) => {
    const filter = ALL_FILTERS.find(f => f.metadata.id === filterId);
    if (!filter) return;

    // Initialize with default parameters
    const params: Record<string, unknown> = {};
    
    // Special handling for tricolor filter to ensure defaults are in correct groups
    if (filterId === 'tricolor') {
      // Split colors by luminance into three groups
      const colorsWithLum = LEGO_COLORS.map(color => ({
        color,
        luminance: getLuminance(color.rgb[0], color.rgb[1], color.rgb[2])
      }));
      colorsWithLum.sort((a, b) => a.luminance - b.luminance);
      const thirdPoint = Math.floor(colorsWithLum.length / 3);
      const twoThirdPoint = Math.floor(colorsWithLum.length * 2 / 3);
      const darkColors = colorsWithLum.slice(0, thirdPoint);
      const midColors = colorsWithLum.slice(thirdPoint, twoThirdPoint);
      const lightColors = colorsWithLum.slice(twoThirdPoint);
      
      filter.metadata.parameters.forEach(param => {
        if (param.name === 'darkColor') {
          // Check if default is in dark colors, otherwise use first dark color
          const defaultInGroup = darkColors.some(({ color }) => color.name === param.default);
          params[param.name] = defaultInGroup ? param.default : darkColors[0]?.color.name ?? param.default;
        } else if (param.name === 'midColor') {
          // Check if default is in mid colors, otherwise use first mid color
          const defaultInGroup = midColors.some(({ color }) => color.name === param.default);
          params[param.name] = defaultInGroup ? param.default : midColors[0]?.color.name ?? param.default;
        } else if (param.name === 'lightColor') {
          // Check if default is in light colors, otherwise use first light color
          const defaultInGroup = lightColors.some(({ color }) => color.name === param.default);
          params[param.name] = defaultInGroup ? param.default : lightColors[0]?.color.name ?? param.default;
        } else {
          params[param.name] = param.default;
        }
      });
    } else {
      filter.metadata.parameters.forEach(param => {
        params[param.name] = param.default;
      });
    }

    onFilterOptionsChange({
      ...filterOptions,
      selectedFilter: { filterId, params },
    });
    setShowFilterList(false);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        // Special handling for duotone filter color selection
        if (activeFilter?.metadata.id === 'duotone' && (param.name === 'colorA' || param.name === 'colorB')) {
          // Split colors by luminance
          const colorsWithLum = LEGO_COLORS.map(color => ({
            color,
            luminance: getLuminance(color.rgb[0], color.rgb[1], color.rgb[2])
          }));
          
          // Sort by luminance
          colorsWithLum.sort((a, b) => a.luminance - b.luminance);
          
          // Split into dark (bottom 50%) and light (top 50%)
          const midPoint = Math.floor(colorsWithLum.length / 2);
          const darkColors = colorsWithLum.slice(0, midPoint);
          const lightColors = colorsWithLum.slice(midPoint);
          
          const isColorA = param.name === 'colorA';
          const colorsToShow = isColorA ? darkColors : lightColors;
          
          return (
            <div key={param.name} className="space-y-1">
              <label className="text-xs font-medium">{param.label}</label>
              <div className="grid grid-cols-1 gap-1 max-h-48 overflow-y-auto">
                {colorsToShow.map(({ color }) => (
                  <button
                    key={color.name}
                    className={`w-full flex items-center gap-2 p-1.5 rounded border transition-all text-left ${
                      currentValue === color.name
                        ? 'border-primary border-2 bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => handleParamChange(param.name, color.name)}
                    title={color.name}
                  >
                    <div
                      className="w-6 h-6 rounded border flex-shrink-0"
                      style={{ backgroundColor: color.hex }}
                    />
                    <span className="text-xs truncate">{color.name}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        }
        
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
                  key={color.name}
                  className={`aspect-square rounded border transition-all ${
                    currentValue === color.name
                      ? 'border-primary border-2'
                      : 'border-border hover:border-primary/50'
                  }`}
                  style={{ backgroundColor: color.hex }}
                  onClick={() => handleParamChange(param.name, color.name)}
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
        <div className="space-y-3 p-3 bg-muted/30 rounded-lg border">
          <div className="flex items-center gap-2">
            <Maximize2 className="h-4 w-4 text-muted-foreground" />
            <label className="text-sm font-semibold">Mosaic Dimensions</label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(MOSAIC_SIZES) as MosaicSize[]).map((size) => {
              const sizeLabel = size === 'xl' ? 'Extra Large' : size.charAt(0).toUpperCase() + size.slice(1);
              return (
                <Button
                  key={size}
                  variant={selectedSize === size ? 'default' : 'outline'}
                  onClick={() => onSizeChange(size)}
                  className="w-full h-auto py-2 flex flex-col gap-0.5"
                >
                  <span className="text-xs font-semibold">
                    {sizeLabel}
                  </span>
                  <span className="text-[10px] opacity-80">
                    {MOSAIC_SIZES[size].width} studs wide
                  </span>
                </Button>
              );
            })}
          </div>
          <div className="pt-2">
            <label className="text-xs font-medium mb-2 block text-muted-foreground">
              Custom Width: {customWidth} studs
            </label>
            <Slider
              value={[customWidth]}
              onValueChange={(value: number[]) => onCustomWidthChange(value[0])}
              min={16}
              max={512}
              step={16}
              className="w-full"
            />
          </div>
        </div>

        {/* Quick Filters Section */}
        <div className="space-y-3 p-3 bg-muted/30 rounded-lg border">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-muted-foreground" />
            <label className="text-sm font-semibold">Quick Filters</label>
          </div>
          <div className="space-y-4">
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

        {/* Photo Effects Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            <label className="text-sm font-semibold">Photo Effects</label>
          </div>

          {/* Artistic Filters */}
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

                  {/* Select Filter Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFilterList(!showFilterList)}
                    className="w-full text-xs gap-1 bg-background/50 hover:bg-background"
                  >
                    <ChevronDown className={`h-3 w-3 transition-transform ${showFilterList ? 'rotate-180' : ''}`} />
                    {showFilterList ? 'Hide' : 'Select'} Filter
                  </Button>
                </div>

                {/* Parameters */}
                {activeFilter.metadata.parameters.length > 0 && !showFilterList && (
                  <div className="space-y-3 p-3 bg-muted/30 rounded-lg border">
                    <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                      <Settings className="h-3 w-3" />
                      Parameters
                    </div>
                    {activeFilter.metadata.id === 'duotone' ? (
                      // Special layout for duotone: two columns side by side
                      (() => {
                        const thresholdParam = activeFilter.metadata.parameters.find(p => p.name === 'threshold');
                        const colorAParam = activeFilter.metadata.parameters.find(p => p.name === 'colorA');
                        const colorBParam = activeFilter.metadata.parameters.find(p => p.name === 'colorB');
                        
                        // Split colors by luminance
                        const colorsWithLum = LEGO_COLORS.map(color => ({
                          color,
                          luminance: getLuminance(color.rgb[0], color.rgb[1], color.rgb[2])
                        }));
                        colorsWithLum.sort((a, b) => a.luminance - b.luminance);
                        const midPoint = Math.floor(colorsWithLum.length / 2);
                        const darkColors = colorsWithLum.slice(0, midPoint);
                        const lightColors = colorsWithLum.slice(midPoint);
                        
                        return (
                          <div className="space-y-3">
                            {thresholdParam && renderParameterControl(thresholdParam)}
                            <div className="grid grid-cols-2 gap-3">
                              {colorAParam && (
                                <div className="space-y-1">
                                  <label className="text-xs font-medium">{colorAParam.label}</label>
                                  <div className="grid grid-cols-1 gap-1 max-h-48 overflow-y-auto">
                                    {darkColors.map(({ color }) => {
                                      const currentValue = filterOptions.selectedFilter?.params[colorAParam.name] ?? colorAParam.default;
                                      return (
                                        <button
                                          key={color.name}
                                          className={`w-full flex items-center gap-2 p-1.5 rounded border transition-all text-left ${
                                            currentValue === color.name
                                              ? 'border-primary border-2 bg-primary/10'
                                              : 'border-border hover:border-primary/50'
                                          }`}
                                          onClick={() => handleParamChange(colorAParam.name, color.name)}
                                          title={color.name}
                                        >
                                          <div
                                            className="w-6 h-6 rounded border flex-shrink-0"
                                            style={{ backgroundColor: color.hex }}
                                          />
                                          <span className="text-xs truncate" title={color.name}>{color.name}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                              {colorBParam && (
                                <div className="space-y-1">
                                  <label className="text-xs font-medium">{colorBParam.label}</label>
                                  <div className="grid grid-cols-1 gap-1 max-h-48 overflow-y-auto">
                                    {lightColors.map(({ color }) => {
                                      const currentValue = filterOptions.selectedFilter?.params[colorBParam.name] ?? colorBParam.default;
                                      return (
                                        <button
                                          key={color.name}
                                          className={`w-full flex items-center gap-2 p-1.5 rounded border transition-all text-left ${
                                            currentValue === color.name
                                              ? 'border-primary border-2 bg-primary/10'
                                              : 'border-border hover:border-primary/50'
                                          }`}
                                          onClick={() => handleParamChange(colorBParam.name, color.name)}
                                          title={color.name}
                                        >
                                          <div
                                            className="w-6 h-6 rounded border flex-shrink-0"
                                            style={{ backgroundColor: color.hex }}
                                          />
                                          <span className="text-xs truncate" title={color.name}>{color.name}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()
                    ) : activeFilter.metadata.id === 'tricolor' ? (
                      // Special layout for tricolor: three columns side by side
                      (() => {
                        const darkColorParam = activeFilter.metadata.parameters.find(p => p.name === 'darkColor');
                        const midColorParam = activeFilter.metadata.parameters.find(p => p.name === 'midColor');
                        const lightColorParam = activeFilter.metadata.parameters.find(p => p.name === 'lightColor');
                        
                        // Split colors by luminance into three groups
                        const colorsWithLum = LEGO_COLORS.map(color => ({
                          color,
                          luminance: getLuminance(color.rgb[0], color.rgb[1], color.rgb[2])
                        }));
                        colorsWithLum.sort((a, b) => a.luminance - b.luminance);
                        const thirdPoint = Math.floor(colorsWithLum.length / 3);
                        const twoThirdPoint = Math.floor(colorsWithLum.length * 2 / 3);
                        const darkColors = colorsWithLum.slice(0, thirdPoint);
                        const midColors = colorsWithLum.slice(thirdPoint, twoThirdPoint);
                        const lightColors = colorsWithLum.slice(twoThirdPoint);
                        
                        // Get current values (should be validated by useEffect)
                        const darkColorValue = filterOptions.selectedFilter?.params[darkColorParam?.name || ''] ?? darkColorParam?.default;
                        const midColorValue = filterOptions.selectedFilter?.params[midColorParam?.name || ''] ?? midColorParam?.default;
                        const lightColorValue = filterOptions.selectedFilter?.params[lightColorParam?.name || ''] ?? lightColorParam?.default;
                        
                        return (
                          <div className="grid grid-cols-3 gap-3">
                            {darkColorParam && (
                              <div className="space-y-1">
                                <label className="text-xs font-medium">{darkColorParam.label}</label>
                                <div className="grid grid-cols-1 gap-1 max-h-48 overflow-y-auto">
                                  {darkColors.map(({ color }) => {
                                    const currentValue = darkColorValue;
                                    return (
                                      <button
                                        key={color.name}
                                        className={`w-full flex items-center gap-2 p-1.5 rounded border transition-all text-left ${
                                          currentValue === color.name
                                            ? 'border-primary border-2 bg-primary/10'
                                            : 'border-border hover:border-primary/50'
                                        }`}
                                        onClick={() => handleParamChange(darkColorParam.name, color.name)}
                                        title={color.name}
                                      >
                                        <div
                                          className="w-6 h-6 rounded border flex-shrink-0"
                                          style={{ backgroundColor: color.hex }}
                                        />
                                        <span className="text-xs truncate" title={color.name}>{color.name}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                            {midColorParam && (
                              <div className="space-y-1">
                                <label className="text-xs font-medium">{midColorParam.label}</label>
                                <div className="grid grid-cols-1 gap-1 max-h-48 overflow-y-auto">
                                  {midColors.map(({ color }) => {
                                    const currentValue = midColorValue;
                                    return (
                                      <button
                                        key={color.name}
                                        className={`w-full flex items-center gap-2 p-1.5 rounded border transition-all text-left ${
                                          currentValue === color.name
                                            ? 'border-primary border-2 bg-primary/10'
                                            : 'border-border hover:border-primary/50'
                                        }`}
                                        onClick={() => handleParamChange(midColorParam.name, color.name)}
                                        title={color.name}
                                      >
                                        <div
                                          className="w-6 h-6 rounded border flex-shrink-0"
                                          style={{ backgroundColor: color.hex }}
                                        />
                                        <span className="text-xs truncate" title={color.name}>{color.name}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                            {lightColorParam && (
                              <div className="space-y-1">
                                <label className="text-xs font-medium">{lightColorParam.label}</label>
                                <div className="grid grid-cols-1 gap-1 max-h-48 overflow-y-auto">
                                  {lightColors.map(({ color }) => {
                                    const currentValue = lightColorValue;
                                    return (
                                      <button
                                        key={color.name}
                                        className={`w-full flex items-center gap-2 p-1.5 rounded border transition-all text-left ${
                                          currentValue === color.name
                                            ? 'border-primary border-2 bg-primary/10'
                                            : 'border-border hover:border-primary/50'
                                        }`}
                                        onClick={() => handleParamChange(lightColorParam.name, color.name)}
                                        title={color.name}
                                      >
                                        <div
                                          className="w-6 h-6 rounded border flex-shrink-0"
                                          style={{ backgroundColor: color.hex }}
                                        />
                                        <span className="text-xs truncate" title={color.name}>{color.name}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()
                    ) : (
                      activeFilter.metadata.parameters.map(renderParameterControl)
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center p-6 border-2 border-dashed rounded-lg">
                <Info className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-medium mb-1">No filter selected</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Choose a filter to enhance your image
                </p>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setShowFilterList(true)}
                  className="gap-1"
                >
                  <Sparkles className="h-3 w-3" />
                  Select Filter
                </Button>
              </div>
            )}

            {/* Filter List */}
            {showFilterList && (
              <div className="space-y-1 max-h-64 overflow-y-auto border rounded-lg p-2 bg-muted/20">
                <div className="text-xs font-medium text-muted-foreground px-2 py-1">
                  Available Filters ({ALL_FILTERS.length})
                </div>
                {ALL_FILTERS.map(filter => (
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
        </div>
      </CardContent>
    </Card>
  );
}


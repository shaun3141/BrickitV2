import { useState } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { ALL_FILTERS, getFiltersByCategory } from '@/utils/filters';
import type { FilterConfig, FilterParameter } from '@/utils/filterTypes';
import type { FilterOptions } from '@/utils/imageProcessor';
import { LEGO_COLORS } from '@/utils/legoColors';

interface FilterSelectorProps {
  filterOptions: FilterOptions;
  onFilterOptionsChange: (options: FilterOptions) => void;
}

const CATEGORIES = [
  { id: 'basic', label: 'Basic', icon: '⚡' },
  { id: 'palette', label: 'Palette', icon: '🎨' },
  { id: 'dither', label: 'Dither', icon: '⚙️' },
  { id: 'geometry', label: 'Geometry', icon: '🔷' },
  { id: 'edge', label: 'Edge', icon: '✏️' },
  { id: 'pattern', label: 'Pattern', icon: '🎭' },
  { id: 'content', label: 'Smart', icon: '🧠' },
];

export function FilterSelector({ filterOptions, onFilterOptionsChange }: FilterSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('basic');
  const [showFilterList, setShowFilterList] = useState(false);

  const categoryFilters = selectedCategory === 'basic' ? [] : getFiltersByCategory(selectedCategory);
  const activeFilter = filterOptions.selectedFilter 
    ? ALL_FILTERS.find(f => f.metadata.id === filterOptions.selectedFilter!.filterId)
    : undefined;

  const hasBasicFilters = (filterOptions.brightness !== 0 || filterOptions.contrast !== 0 || filterOptions.saturation !== 0);
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

  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="space-y-3">
          {/* Header with Status & Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium">Filters</h3>
              {(hasBasicFilters || hasArtisticFilter) && (
                <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                  Active
                </span>
              )}
            </div>
            {(hasBasicFilters || hasArtisticFilter) && (
              <Button variant="ghost" size="sm" onClick={handleResetAll} className="h-7 text-xs">
                Reset All
              </Button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex gap-1 p-1 bg-muted rounded-md overflow-x-auto">
            {CATEGORIES.map(category => {
              const count = category.id === 'basic' ? 3 : getFiltersByCategory(category.id).length;
              const isActive = selectedCategory === category.id;
              return (
                <button
                  key={category.id}
                  onClick={() => {
                    setSelectedCategory(category.id);
                    if (category.id !== 'basic') setShowFilterList(true);
                    else setShowFilterList(false);
                  }}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-background shadow-sm'
                      : 'hover:bg-background/50'
                  }`}
                >
                  <span>{category.icon}</span>
                  <span>{category.label}</span>
                  <span className="text-[10px] opacity-60">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Basic Filters */}
          {selectedCategory === 'basic' && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Brightness</label>
                  <div className="text-xs text-muted-foreground text-center">{filterOptions.brightness || 0}</div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Contrast</label>
                  <div className="text-xs text-muted-foreground text-center">{filterOptions.contrast || 0}</div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Saturation</label>
                  <div className="text-xs text-muted-foreground text-center">{filterOptions.saturation || 0}</div>
                </div>
              </div>
              <div className="space-y-2">
                <Slider
                  value={[filterOptions.brightness || 0]}
                  onValueChange={(v: number[]) => handleBasicFilterChange('brightness', v[0])}
                  min={-50}
                  max={50}
                  step={5}
                />
                <Slider
                  value={[filterOptions.contrast || 0]}
                  onValueChange={(v: number[]) => handleBasicFilterChange('contrast', v[0])}
                  min={-50}
                  max={50}
                  step={5}
                />
                <Slider
                  value={[filterOptions.saturation || 0]}
                  onValueChange={(v: number[]) => handleBasicFilterChange('saturation', v[0])}
                  min={-100}
                  max={100}
                  step={10}
                />
              </div>
            </div>
          )}

          {/* Artistic Filters */}
          {selectedCategory !== 'basic' && (
            <>
              {/* Active Filter Display */}
              {activeFilter ? (
                <div className="space-y-2">
                  <div className="flex items-start justify-between p-2 bg-primary/5 rounded border border-primary/20">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-xs truncate">
                        {activeFilter.metadata.hashtag || activeFilter.metadata.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground line-clamp-1">
                        {activeFilter.metadata.description}
                      </p>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowFilterList(!showFilterList)}
                        className="h-6 w-6 p-0"
                      >
                        ⚙️
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearArtisticFilter}
                        className="h-6 w-6 p-0"
                      >
                        ✕
                      </Button>
                    </div>
                  </div>

                  {/* Parameters */}
                  {activeFilter.metadata.parameters.length > 0 && !showFilterList && (
                    <div className="space-y-2 pl-2 border-l-2 border-primary/20">
                      {activeFilter.metadata.parameters.map(renderParameterControl)}
                    </div>
                  )}
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilterList(true)}
                  className="w-full text-xs"
                >
                  Choose a filter...
                </Button>
              )}

              {/* Filter List (Compact) */}
              {showFilterList && (
                <div className="max-h-48 overflow-y-auto space-y-1 border rounded-md p-2 bg-muted/30">
                  {categoryFilters.map(filter => (
                    <button
                      key={filter.metadata.id}
                      onClick={() => handleFilterSelect(filter.metadata.id)}
                      className={`w-full px-2 py-1.5 text-left rounded text-xs transition-colors ${
                        filterOptions.selectedFilter?.filterId === filter.metadata.id
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-background'
                      }`}
                    >
                      <span className="font-medium">
                        {filter.metadata.hashtag || filter.metadata.name}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}


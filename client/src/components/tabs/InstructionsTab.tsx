import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Download, Grid3x3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InstructionStep as InstructionStepComponent } from '@/components/bricks/InstructionStep';
import {
  divideIntoRegions,
  generateInstructions,
  generateInstructionHTML,
} from '@/utils/bricks/instructions';
import type { MosaicData } from '@/types/mosaic.types';
import type { BrickPlacement } from '@/types';

interface InstructionsTabProps {
  mosaicData: MosaicData;
  placements: BrickPlacement[];
}

export function InstructionsTab({ mosaicData, placements }: InstructionsTabProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [gridSize, setGridSize] = useState(2); // 2x2 or 3x3

  // Generate regions and instructions
  const { regions, steps } = useMemo(() => {
    const regions = divideIntoRegions(mosaicData.width, mosaicData.height, gridSize);
    const steps = generateInstructions(placements, regions);
    return { regions, steps };
  }, [mosaicData.width, mosaicData.height, placements, gridSize]);

  const currentStep = steps[currentStepIndex];

  const handlePrevious = () => {
    setCurrentStepIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentStepIndex((prev) => Math.min(steps.length - 1, prev + 1));
  };

  const handleExportHTML = () => {
    const html = generateInstructionHTML(mosaicData, placements, regions, steps);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lego-mosaic-instructions-${mosaicData.width}x${mosaicData.height}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleGridSize = () => {
    setGridSize((prev) => (prev === 2 ? 3 : 2));
    setCurrentStepIndex(0); // Reset to first step when changing grid
  };

  // Group steps by region for the region overview
  const stepsByRegion = useMemo(() => {
    const grouped = new Map<string, number>();
    steps.forEach((step) => {
      grouped.set(step.regionId, (grouped.get(step.regionId) || 0) + 1);
    });
    return grouped;
  }, [steps]);

  if (!currentStep) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No instructions available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-2xl font-bold">Building Instructions</h2>
          <p className="text-muted-foreground mt-1">
            Follow these step-by-step instructions to build your mosaic
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={toggleGridSize} aria-label={`Toggle grid size between 2x2 and 3x3, currently ${gridSize}x${gridSize}`}>
            <Grid3x3 className="h-4 w-4 mr-2" aria-hidden="true" />
            {gridSize}×{gridSize} Grid
          </Button>
          <Button onClick={handleExportHTML} aria-label="Export instructions as HTML file">
            <Download className="h-4 w-4 mr-2" aria-hidden="true" />
            Export as HTML
          </Button>
        </div>
      </div>

      {/* Region Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Region Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {regions.map((region) => {
              const stepsInRegion = stepsByRegion.get(region.id) || 0;
              const isCurrentRegion = currentStep.regionId === region.id;
              return (
                <div
                  key={region.id}
                  className={`p-3 border rounded-md text-center ${
                    isCurrentRegion
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-card'
                  }`}
                >
                  <div className="font-semibold text-lg">{region.label}</div>
                  <div className="text-sm text-muted-foreground">
                    {stepsInRegion} steps
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Step Progress */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              Step {currentStep.stepNumber} of {steps.length} • {currentStep.placements.length} piece{currentStep.placements.length !== 1 ? 's' : ''}
            </span>
            <span className="text-sm text-muted-foreground">
              Region {currentStep.regionLabel}
            </span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{
                width: `${((currentStep.stepNumber) / steps.length) * 100}%`,
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Current Step */}
      <InstructionStepComponent step={currentStep} mosaicData={mosaicData} />

      {/* Navigation */}
      <div className="flex justify-between items-center pt-4">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStepIndex === 0}
          aria-label="Go to previous step"
        >
          <ChevronLeft className="h-4 w-4 mr-2" aria-hidden="true" />
          Previous
        </Button>
        
        <div className="text-sm text-muted-foreground" role="status" aria-live="polite">
          Step {currentStepIndex + 1} of {steps.length}
        </div>

        <Button
          onClick={handleNext}
          disabled={currentStepIndex === steps.length - 1}
          aria-label="Go to next step"
        >
          Next
          <ChevronRight className="h-4 w-4 ml-2" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}


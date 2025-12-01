import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PhotoSelectionTab } from '@/components/tabs/PhotoSelectionTab';
import { EditTab } from '@/components/tabs/EditTab';
import { PartsListTab } from '@/components/tabs/PartsListTab';
import { BuyItTab } from '@/components/tabs/BuyItTab';
import { InstructionsTab } from '@/components/tabs/InstructionsTab';
import { ShareTab } from '@/components/tabs/ShareTab';
import { LoginButton } from '@/features/auth/LoginButton';
import { SiteLayout } from '@/components/layout/SiteLayout';
import { SaveCreationDialog } from '@/components/dialogs/SaveCreationDialog';
import { processImage } from '@/utils/image/processor';
import type { MosaicData, FilterOptions } from '@/types/mosaic.types';
import { MOSAIC_SIZES } from '@/constants/mosaic.constants';
import type { MosaicSize, BrickPlacement, Creation } from '@/types';
import { optimizeBrickPlacement } from '@/utils/bricks/optimizer';
import { buildBrickColorAvailabilityMap, type BrickColorAvailabilityMap } from '@/services/bricks.service';
import { saveCreation, uploadOriginalImage } from '@/services/creation.service';
import { useAuth } from '@/features/auth/AuthContext';
import { trackEvent, posthog } from '@/services/analytics.service';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';

export function Home() {
  const { user } = useAuth();
  
  // Capture initial pageview
  useEffect(() => {
    posthog.capture('$pageview');
  }, []);
  const [mosaicData, setMosaicData] = useState<MosaicData | null>(null);
  const [placements, setPlacements] = useState<BrickPlacement[]>([]);
  const [optimizationStats, setOptimizationStats] = useState<{ colorsWithLimitedSizes: Set<string>; availabilityConstrainedCount: number } | null>(null);
  const [availabilityMap, setAvailabilityMap] = useState<BrickColorAvailabilityMap | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedSize, setSelectedSize] = useState<MosaicSize>('medium');
  const [customWidth, setCustomWidth] = useState(64);
  const [activeTab, setActiveTab] = useState('photo-selection');
  const [showBricks, setShowBricks] = useState(true); // Shared state for Bricks vs Plates toggle
  
  // Track tab changes
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    if (newTab !== 'photo-selection') {
      trackEvent('tab_changed', { tab: newTab });
    }
  };
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    brightness: 0,
    contrast: 0,
    saturation: 0,
    selectedFilter: undefined,
  });
  
  // Save/Load state
  const [currentCreationId, setCurrentCreationId] = useState<string | null>(null);
  const [currentCreationTitle, setCurrentCreationTitle] = useState<string>('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  // Handle Stripe donation redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const donation = params.get('donation');
    
    if (donation === 'success') {
      toast.success('Thank you for your donation! Your support means the world! ❤️');
      
      // Track successful donation
      trackEvent('donation_completed', {
        user_id: user?.id,
      });
      
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (donation === 'cancelled') {
      // Track cancelled donation
      trackEvent('donation_cancelled', {
        user_id: user?.id,
      });
      
      // Clean up URL silently
      window.history.replaceState({}, '', window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load availability map when showBricks changes
  useEffect(() => {
    buildBrickColorAvailabilityMap(showBricks)
      .then(map => setAvailabilityMap(map))
      .catch(error => console.error('Failed to load availability map:', error));
  }, [showBricks]);

  // Run optimization whenever mosaicData or availability changes
  useEffect(() => {
    if (mosaicData && availabilityMap) {
      const result = optimizeBrickPlacement(mosaicData, {
        availabilityMap,
        useBricks: showBricks,
      });
      setPlacements(result.placements);
      setOptimizationStats({
        colorsWithLimitedSizes: result.colorsWithLimitedSizes,
        availabilityConstrainedCount: result.availabilityConstrainedCount,
      });
    } else if (mosaicData) {
      // Fallback: run without availability checking while map loads
      const result = optimizeBrickPlacement(mosaicData);
      setPlacements(result.placements);
      setOptimizationStats(null);
    } else {
      setPlacements([]);
      setOptimizationStats(null);
    }
  }, [mosaicData, availabilityMap, showBricks]);

  const handleImageSelect = async (file: File) => {
    setUploadedImage(file);
    setIsProcessing(true);
    try {
      const data = await processImage(file, {
        targetWidth: customWidth,
        maintainAspectRatio: true,
        filters: filterOptions,
      });

      setMosaicData(data);
      
      // Track image upload
      trackEvent('image_uploaded', {
        width: data.width,
        height: data.height,
        pixel_count: data.width * data.height,
        file_size: file.size,
      });
      
      // Stay on photo selection tab to allow filter adjustments
    } catch (error) {
      console.error('Error processing image:', error);
      toast.error('Failed to process image. Please try again.');
      trackEvent('image_upload_failed', { error: String(error) });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFilterChange = async (newFilters: FilterOptions) => {
    if (!uploadedImage) return;
    
    setFilterOptions(newFilters);
    setIsProcessing(true);
    
    try {
      const data = await processImage(uploadedImage, {
        targetWidth: customWidth,
        maintainAspectRatio: true,
        filters: newFilters,
      });

      setMosaicData(data);
      
      // Track filter changes
      trackEvent('filter_applied', {
        brightness: newFilters.brightness,
        contrast: newFilters.contrast,
        saturation: newFilters.saturation,
        selected_filter: newFilters.selectedFilter,
      });
    } catch (error) {
      console.error('Error processing image with filters:', error);
      toast.error('Failed to apply filters. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSizeChange = async (size: MosaicSize) => {
    setSelectedSize(size);
    const newWidth = MOSAIC_SIZES[size].width;
    setCustomWidth(newWidth);
    
    if (!uploadedImage) return;
    
    setIsProcessing(true);
    try {
      const data = await processImage(uploadedImage, {
        targetWidth: newWidth,
        maintainAspectRatio: true,
        filters: filterOptions,
      });

      setMosaicData(data);
      
      // Track size change
      trackEvent('mosaic_size_changed', {
        size,
        width: newWidth,
        brick_count: data.width * data.height,
      });
    } catch (error) {
      console.error('Error processing image with new size:', error);
      toast.error('Failed to process image with new size. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCustomWidthChange = async (width: number) => {
    setCustomWidth(width);
    
    if (!uploadedImage) return;
    
    setIsProcessing(true);
    try {
      const data = await processImage(uploadedImage, {
        targetWidth: width,
        maintainAspectRatio: true,
        filters: filterOptions,
      });

      setMosaicData(data);
    } catch (error) {
      console.error('Error processing image with new width:', error);
      toast.error('Failed to process image with new width. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleContinueToEdit = () => {
    handleTabChange('edit');
  };

  const handleMosaicUpdate = (updatedMosaic: MosaicData) => {
    setMosaicData(updatedMosaic);
    // Optimization will be triggered by the useEffect
  };

  const handleSaveCreation = async (data: {
    title: string;
    description?: string;
    sharingStatus: 'private' | 'link' | 'gallery';
  }) => {
    if (!user || !mosaicData) return;

    try {
      // Upload original image if available
      let imageUrl: string | undefined;
      if (uploadedImage) {
        console.log('[handleSaveCreation] Uploading original image...');
        const { url, error } = await uploadOriginalImage(uploadedImage, user.id);
        console.log('[handleSaveCreation] Upload result:', { url, error });
        if (error) {
          console.error('Failed to upload image:', error);
        } else {
          imageUrl = url || undefined;
        }
      }

      // Save creation
      console.log('[handleSaveCreation] Calling saveCreation...');
      const { data: savedCreation, error } = await saveCreation(
        user.id,
        {
          title: data.title,
          description: data.description,
          width: mosaicData.width,
          height: mosaicData.height,
          pixel_data: mosaicData.pixels,
          original_image_url: imageUrl,
          sharing_status: data.sharingStatus,
          filter_options: filterOptions,
        },
        currentCreationId || undefined
      );

      if (error) throw error;

      if (savedCreation) {
        setCurrentCreationId(savedCreation.id);
        setCurrentCreationTitle(savedCreation.title);
        toast.success('Creation saved successfully!');
        
        // Track save event
        trackEvent('creation_saved', {
          creation_id: savedCreation.id,
          sharing_status: data.sharingStatus,
          has_description: !!data.description,
        });
      }
    } catch (error) {
      console.error('Error saving creation:', error);
      throw error;
    }
  };

  const handleLoadCreation = (creation: Creation) => {
    // Validate that pixel_data has been reconstructed
    if (!creation.pixel_data) {
      console.error('[handleLoadCreation] Creation has no pixel_data:', creation);
      toast.error('Failed to load creation: pixel data is missing. This should not happen.');
      return;
    }
    
    // Check if there's unsaved work
    if (mosaicData) {
      const confirmed = window.confirm(
        'You have unsaved work. Loading this creation will replace it. Do you want to continue?'
      );
      
      if (!confirmed) {
        return; // User cancelled, don't load
      }
    }
    
    // Load the creation data into the editor
    setMosaicData({
      width: creation.width,
      height: creation.height,
      pixels: creation.pixel_data,
      originalImage: creation.original_image_url || '',
    });
    
    setCurrentCreationId(creation.id);
    setCurrentCreationTitle(creation.title);
    setFilterOptions(creation.filter_options || {
      brightness: 0,
      contrast: 0,
      saturation: 0,
      selectedFilter: undefined,
    });
    
    // Track load event
    trackEvent('creation_loaded', {
      creation_id: creation.id,
      sharing_status: creation.sharing_status,
    });
    
    // Navigate to edit tab
    setActiveTab('edit');
  };

  return (
    <SiteLayout
      tabsList={
        <TabsList className="grid grid-cols-6 flex-1 max-w-4xl" role="tablist">
          <TabsTrigger value="photo-selection" role="tab" aria-controls="photo-selection-panel">1. Photo Selection</TabsTrigger>
          <TabsTrigger value="edit" disabled={!mosaicData} role="tab" aria-controls="edit-panel">
            2. Edit
          </TabsTrigger>
          <TabsTrigger value="parts-list" disabled={!mosaicData} role="tab" aria-controls="parts-list-panel">
            3. Parts List
          </TabsTrigger>
          <TabsTrigger value="buy-it" disabled={!mosaicData} role="tab" aria-controls="buy-it-panel">
            4. Buy it
          </TabsTrigger>
          <TabsTrigger value="instructions" disabled={!mosaicData} role="tab" aria-controls="instructions-panel">
            5. Build it
          </TabsTrigger>
          <TabsTrigger value="share" disabled={!mosaicData} role="tab" aria-controls="share-panel">
            6. Share it
          </TabsTrigger>
        </TabsList>
      }
      headerActions={
        <>
          <Link to="/gallery">
            <Button variant="ghost" size="sm">
              Gallery
            </Button>
          </Link>
          <LoginButton onLoadCreation={handleLoadCreation} />
        </>
      }
      activeTab={activeTab}
      onTabChange={handleTabChange}
    >
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md">
        Skip to main content
      </a>
      <main id="main-content" className="mt-0" role="main">

          <TabsContent value="photo-selection" id="photo-selection-panel" className="mt-0" role="tabpanel" aria-labelledby="photo-selection-tab">
            <PhotoSelectionTab
              isProcessing={isProcessing}
              selectedSize={selectedSize}
              customWidth={customWidth}
              mosaicData={mosaicData}
              filterOptions={filterOptions}
              onSizeChange={handleSizeChange}
              onCustomWidthChange={handleCustomWidthChange}
              onImageSelect={handleImageSelect}
              onFilterChange={handleFilterChange}
              onContinueToEdit={handleContinueToEdit}
            />
          </TabsContent>

          <TabsContent value="edit" id="edit-panel" className="mt-0" role="tabpanel" aria-labelledby="edit-tab">
            {mosaicData && (
              <EditTab
                mosaicData={mosaicData}
                onMosaicUpdate={handleMosaicUpdate}
                onSave={() => setShowSaveDialog(true)}
                showBricks={showBricks}
                onShowBricksChange={setShowBricks}
              />
            )}
          </TabsContent>

          <TabsContent value="instructions" id="instructions-panel" className="mt-0" role="tabpanel" aria-labelledby="instructions-tab">
            {mosaicData && (
              <InstructionsTab mosaicData={mosaicData} placements={placements} />
            )}
          </TabsContent>

          <TabsContent value="parts-list" id="parts-list-panel" className="mt-0" role="tabpanel" aria-labelledby="parts-list-tab">
            {mosaicData && (
              <PartsListTab mosaicData={mosaicData} placements={placements} showBricks={showBricks} colorsWithLimitedSizes={optimizationStats?.colorsWithLimitedSizes} />
            )}
          </TabsContent>

          <TabsContent value="buy-it" id="buy-it-panel" className="mt-0" role="tabpanel" aria-labelledby="buy-it-tab">
            {mosaicData && (
              <BuyItTab mosaicData={mosaicData} placements={placements} showBricks={showBricks} />
            )}
          </TabsContent>

          <TabsContent value="share" id="share-panel" className="mt-0" role="tabpanel" aria-labelledby="share-tab">
            {mosaicData && (
              <ShareTab 
                mosaicData={mosaicData} 
                placements={placements}
                creationId={currentCreationId}
                onSave={() => setShowSaveDialog(true)}
              />
            )}
          </TabsContent>
      </main>

      {/* Save Creation Dialog */}
      <SaveCreationDialog
        open={showSaveDialog}
        onOpenChange={setShowSaveDialog}
        onSave={handleSaveCreation}
        defaultTitle={currentCreationTitle}
        existingCreation={!!currentCreationId}
      />
    </SiteLayout>
  );
}


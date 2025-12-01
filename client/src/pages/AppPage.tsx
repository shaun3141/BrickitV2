import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
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
import { Monitor, Sparkles } from 'lucide-react';
import { useCanonical } from '@/hooks/useCanonical';

export function AppPage() {
  const { user } = useAuth();
  const location = useLocation();
  useCanonical();
  
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

  // Handle creation loaded from location state (e.g., from ProfileDialog or Gallery)
  useEffect(() => {
    const creationToLoad = (location.state as { creationToLoad?: Creation })?.creationToLoad;
    if (creationToLoad) {
      console.log('[AppPage] Detected creation in location state, loading...');
      handleLoadCreation(creationToLoad);
      // Clear location state to prevent re-loading on re-renders
      window.history.replaceState({}, '', window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

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
      headerActions={<LoginButton onLoadCreation={handleLoadCreation} />}
      activeTab={activeTab}
      onTabChange={handleTabChange}
    >
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md">
        Skip to main content
      </a>
      <main id="main-content" className="mt-0" role="main">
          {/* Mobile prompt */}
          <div className="lg:hidden min-h-[calc(100vh-320px)] sm:min-h-[calc(100vh-290px)] md:min-h-[calc(100vh-270px)] flex items-center justify-center px-4 py-8 sm:py-12">
            <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
              {/* Header with gradient */}
              <div className="bg-gradient-to-br from-orange-500 via-orange-600 to-red-500 px-8 py-8 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('/hero_img1.png')] opacity-10 bg-cover bg-center" />
                <div className="relative z-10">
                  <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                    Desktop Experience Required
                  </h2>
                  <p className="text-orange-50 text-sm sm:text-base max-w-md mx-auto">
                    Creating LEGO mosaics requires precise controls and a larger screen
                  </p>
                </div>
              </div>

              {/* Image section */}
              <div className="px-8 py-6 bg-gradient-to-b from-gray-50 to-white">
                <img 
                  src="/DesktopOnly.png" 
                  alt="Desktop-only editing" 
                  className="w-full h-auto rounded-lg"
                />
              </div>

              {/* Content section */}
              <div className="px-8 py-6 space-y-6">
                {/* Why desktop section */}
                <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                      <Monitor className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 pt-0.5">
                      <h3 className="font-semibold text-gray-900 mb-1.5 text-sm sm:text-base">
                        Why Desktop?
                      </h3>
                      <p className="text-gray-600 text-sm leading-relaxed">
                        Our pixel-perfect editor, real-time preview, and precise color controls work best on tablets and desktop computers.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Gallery CTA section */}
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-5 border border-purple-100">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 pt-0.5">
                      <h3 className="font-semibold text-gray-900 mb-1.5 text-sm sm:text-base">
                        Get Inspired!
                      </h3>
                      <p className="text-gray-600 text-sm leading-relaxed">
                      Meanwhile, browse amazing LEGO mosaics created by our community. You can view the gallery on any device!
                      </p>
                    </div>
                  </div>
                  <Link 
                    to="/gallery" 
                    className="inline-flex w-full items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0"
                  >
                    Browse Gallery
                  </Link>
                </div>
              </div>

              {/* Footer */}
              <div className="px-8 py-6 bg-gray-50 border-t border-gray-100">
                <p className="text-center text-xs sm:text-sm text-gray-500">
                  Access the creator on a tablet or desktop to start building your mosaic
                </p>
              </div>
            </div>
          </div>

          <div className="hidden lg:block">
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
          </div>
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


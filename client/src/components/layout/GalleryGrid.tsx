import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Creation } from '@/types';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { getPublicCreation } from '@/services/creation.service';
import { loadPixelDataFromPng } from '@/utils/image/pngToPixelData';
import { toast } from '@/lib/toast';

interface GalleryGridProps {
  creations: Creation[];
  loading: boolean;
  error: string | null;
  page: number;
  totalPages: number;
  hasMore: boolean;
  onPageChange: (newPage: number) => void;
  emptyMessage?: string;
  emptyDescription?: string;
}

export function GalleryGrid({
  creations,
  loading,
  error,
  page,
  totalPages,
  hasMore,
  onPageChange,
  emptyMessage = 'No Creations Yet',
  emptyDescription = 'Be the first to share your creation!',
}: GalleryGridProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loadingCreationId, setLoadingCreationId] = useState<string | null>(null);

  const handleLoadCreation = async (creation: Creation) => {
    console.log('[GalleryGrid] Loading creation:', creation.id);
    setLoadingCreationId(creation.id);
    
    try {
      // Fetch the full creation
      const { data: fullCreation, error: fetchError } = await getPublicCreation(creation.id);
      
      if (fetchError || !fullCreation) {
        console.error('[GalleryGrid] Error fetching creation:', fetchError);
        toast.error(`Failed to load creation: ${fetchError?.message || 'Unknown error'}`);
        return;
      }
      
      // Reconstruct pixel_data from preview PNG
      if (!fullCreation.preview_image_url) {
        toast.error('This creation has no preview image and cannot be loaded.');
        return;
      }
      
      console.log('[GalleryGrid] Reconstructing pixel data from preview PNG...');
      const pixelData = await loadPixelDataFromPng(
        fullCreation.preview_image_url,
        fullCreation.width,
        fullCreation.height
      );
      
      if (!pixelData || !Array.isArray(pixelData) || pixelData.length === 0) {
        toast.error('Failed to reconstruct pixel data from preview image.');
        return;
      }
      
      // Add reconstructed pixel_data to creation
      const creationWithPixelData: Creation = {
        ...fullCreation,
        pixel_data: pixelData,
      };
      
      console.log('[GalleryGrid] Successfully loaded creation, navigating to /app');
      // Navigate to /app with creation data in location state
      navigate('/app', { state: { creationToLoad: creationWithPixelData } });
    } catch (error) {
      console.error('[GalleryGrid] Unexpected error:', error);
      toast.error(`Failed to load creation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoadingCreationId(null);
    }
  };
  if (loading && creations.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading gallery...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <h3 className="text-xl font-semibold mb-2">Error Loading Gallery</h3>
        <p className="text-muted-foreground mb-6">{error}</p>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    );
  }

  if (creations.length === 0) {
    return (
      <div className="text-center py-20">
        <h3 className="text-xl font-semibold mb-2">{emptyMessage}</h3>
        <p className="text-muted-foreground mb-6">{emptyDescription}</p>
        <Link to="/app">
          <Button size="lg">Create Your First Mosaic</Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Gallery Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
        {creations.map((creation) => (
          <div key={creation.id} className="group">
            <div className="bg-card border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
              <Link to={`/creations/${creation.id}`}>
                {creation.rendered_image_url ? (
                  <div className="aspect-square overflow-hidden bg-muted">
                    <img
                      src={creation.rendered_image_url}
                      alt={creation.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ) : creation.preview_image_url ? (
                  <div className="aspect-square overflow-hidden bg-muted">
                    <img
                      src={creation.preview_image_url}
                      alt={creation.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ) : (
                  <div className="aspect-square bg-muted flex items-center justify-center">
                    <p className="text-sm text-muted-foreground">No image</p>
                  </div>
                )}
              </Link>

              <div className="p-4">
                <Link to={`/creations/${creation.id}`}>
                  <h3 className="font-semibold mb-1 truncate group-hover:text-primary transition-colors">
                    {creation.title}
                  </h3>
                </Link>
                {creation.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                    {creation.description}
                  </p>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <span>
                    {creation.width} × {creation.height}
                  </span>
                  <span>•</span>
                  <span>{new Date(creation.created_at).toLocaleDateString()}</span>
                </div>
                <div className="text-xs">
                  <span className="text-muted-foreground">by </span>
                  <Link
                    to={`/creators/${creation.user_id}`}
                    className="text-muted-foreground hover:text-primary transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {creation.display_name || 'Anonymous'}
                  </Link>
                </div>
                {user && (
                  <div className="mt-3 pt-3 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleLoadCreation(creation);
                      }}
                      disabled={loadingCreationId === creation.id}
                    >
                      {loadingCreationId === creation.id ? 'Loading...' : 'Load'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          <div className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={!hasMore}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </>
  );
}


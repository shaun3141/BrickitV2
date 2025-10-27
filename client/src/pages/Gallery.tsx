import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getPublicCreations } from '@/services/creation.service';
import type { Creation } from '@/types';
import { SiteLayout } from '@/components/layout/SiteLayout';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';

const ITEMS_PER_PAGE = 20;

export function Gallery() {
  const [creations, setCreations] = useState<Creation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    async function fetchCreations() {
      setLoading(true);
      setError(null);
      
      try {
        const { data, error: fetchError } = await getPublicCreations(page, ITEMS_PER_PAGE);
        
        if (fetchError) {
          setError(fetchError.message);
        } else if (data) {
          setCreations(data.creations);
          setTotal(data.total);
          setHasMore(data.creations.length === ITEMS_PER_PAGE);
        }
      } catch (err) {
        setError('Failed to load gallery');
        console.error('Error loading gallery:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchCreations();
  }, [page]);

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  return (
    <SiteLayout
      headerActions={
        <Link to="/app">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>
      }
    >
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Public Gallery</h2>
          <p className="text-muted-foreground">
            Browse amazing mosaic creations from the BrickIt community you can build with LEGO® bricks
          </p>
        </div>

        {loading && creations.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading gallery...</p>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <h3 className="text-xl font-semibold mb-2">Error Loading Gallery</h3>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        ) : creations.length === 0 ? (
          <div className="text-center py-20">
            <h3 className="text-xl font-semibold mb-2">No Creations Yet</h3>
            <p className="text-muted-foreground mb-6">
              Be the first to share your creation!
            </p>
            <Link to="/app">
              <Button size="lg">
                Create Your First Mosaic
              </Button>
            </Link>
          </div>
        ) : (
          <>
            {/* Gallery Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
              {creations.map((creation) => (
                <Link
                  key={creation.id}
                  to={`/creations/${creation.id}`}
                  className="group"
                >
                  <div className="bg-card border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
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
                    
                    <div className="p-4">
                      <h3 className="font-semibold mb-1 truncate group-hover:text-primary transition-colors">
                        {creation.title}
                      </h3>
                      {creation.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {creation.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{creation.width} × {creation.height}</span>
                        <span>•</span>
                        <span>{new Date(creation.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
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
                  onClick={() => setPage(p => p + 1)}
                  disabled={!hasMore}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
    </SiteLayout>
  );
}


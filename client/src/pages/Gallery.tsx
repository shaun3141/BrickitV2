import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getPublicCreations } from '@/services/creation.service';
import type { Creation } from '@/types';
import { SiteLayout } from '@/components/layout/SiteLayout';
import { GalleryGrid } from '@/components/layout/GalleryGrid';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

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
        <Link to="/">
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

      <GalleryGrid
        creations={creations}
        loading={loading}
        error={error}
        page={page}
        totalPages={totalPages}
        hasMore={hasMore}
        onPageChange={setPage}
      />
    </SiteLayout>
  );
}


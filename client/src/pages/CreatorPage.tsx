import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getCreatorPublicCreations } from '@/services/creation.service';
import type { Creation } from '@/types';
import { SiteLayout } from '@/components/layout/SiteLayout';
import { GalleryGrid } from '@/components/layout/GalleryGrid';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useCanonical } from '@/hooks/useCanonical';

const ITEMS_PER_PAGE = 20;

export function CreatorPage() {
  const { creatorId } = useParams<{ creatorId: string }>();
  useCanonical();
  const [creations, setCreations] = useState<Creation[]>([]);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    async function fetchCreatorCreations() {
      if (!creatorId) {
        setError('Invalid creator ID');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await getCreatorPublicCreations(
          creatorId,
          page,
          ITEMS_PER_PAGE
        );

        if (fetchError) {
          setError(fetchError.message);
        } else if (data) {
          setCreations(data.creations);
          setTotal(data.total);
          setDisplayName(data.displayName);
          setHasMore(data.creations.length === ITEMS_PER_PAGE);
        }
      } catch (err) {
        setError('Failed to load creator gallery');
        console.error('Error loading creator gallery:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchCreatorCreations();
  }, [creatorId, page]);

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
  const creatorName = displayName || 'Anonymous Creator';

  // Show loading state until we have the initial data
  if (loading && !displayName) {
    return (
      <SiteLayout
        headerActions={
          <Link to="/gallery">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Gallery
            </Button>
          </Link>
        }
      >
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading creator gallery...</p>
          </div>
        </div>
      </SiteLayout>
    );
  }

  // Show error state
  if (error && !displayName) {
    return (
      <SiteLayout
        headerActions={
          <Link to="/gallery">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Gallery
            </Button>
          </Link>
        }
      >
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </div>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout
      headerActions={
        <Link to="/gallery">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Gallery
          </Button>
        </Link>
      }
    >
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">{creatorName}'s Creations</h2>
        <p className="text-muted-foreground">
          Browse amazing mosaic creations from {creatorName} that you can build with LEGO® bricks
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
        emptyMessage="No Public Creations Yet"
        emptyDescription={`${creatorName} hasn't shared any public creations yet.`}
      />
    </SiteLayout>
  );
}


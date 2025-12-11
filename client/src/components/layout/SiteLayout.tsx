import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { DonationBanner } from './DonationBanner';
import { Tabs } from '@/components/ui/tabs';

interface SiteLayoutProps {
  children: ReactNode;
  headerActions?: ReactNode;
  tabsList?: ReactNode;
  activeTab?: string;
  onTabChange?: (value: string) => void;
}

export function SiteLayout({ children, headerActions, tabsList, activeTab, onTabChange }: SiteLayoutProps) {
  const location = useLocation();
  const isHomePage = location.pathname === '/app';

  const headerContent = (
    <header className="border-b" role="banner">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-2 md:gap-8">
          <Link to="/" className="flex items-center gap-2 md:gap-3 hover:opacity-80 transition-opacity shrink-0">
            <img src="/brickit_logo.png" alt="BrickIt Logo" className="h-8 w-8 md:h-10 md:w-10 object-contain" />
            <h1 className="text-xl md:text-2xl font-bold">BrickIt</h1>
          </Link>
          
          {isHomePage && tabsList && (
            <nav className="flex-1 max-w-3xl hidden lg:block" role="navigation" aria-label="Editor navigation">
              {tabsList}
            </nav>
          )}
          
          {headerActions && (
            <div className="flex items-center gap-1 md:gap-2 shrink-0">
              {headerActions}
            </div>
          )}
        </div>
      </div>
    </header>
  );

  // If on home page with tabs, wrap everything in Tabs component
  if (isHomePage && tabsList && activeTab && onTabChange) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <DonationBanner />
        <Tabs value={activeTab} onValueChange={onTabChange} className="w-full flex-1 flex flex-col">
          {headerContent}
          <main className="container mx-auto px-4 py-8 flex-1 min-h-[calc(100vh-280px)] sm:min-h-[calc(100vh-250px)] md:min-h-[calc(100vh-240px)] lg:min-h-[calc(100vh-220px)]" role="main">
            {children}
          </main>
        </Tabs>
        <footer className="border-t mt-8" role="contentinfo">
          <div className="container mx-auto px-4 py-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              {/* Left side - Logo, name, and attribution */}
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                  <img src="/brickit_logo.png" alt="BrickIt Logo" className="h-8 w-8 object-contain" />
                  <span className="text-lg font-bold">BrickIt</span>
                </Link>
                <div className="text-sm text-muted-foreground">
                  <p>Built with love by Shaun VanWeelden</p>
                  <p className="mt-1">
                    LEGO® is a trademark of the LEGO Group of companies which does not
                    sponsor, authorize or endorse this site.
                  </p>
                </div>
              </div>
              
              {/* Right side - Navigation links */}
              <nav className="flex items-center gap-4">
                <Link to="/gallery" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Gallery
                </Link>
                <Link to="/app" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Create Mosaic
                </Link>
                <Link to="/donate" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                  <Heart className="h-4 w-4" />
                  Donate
                </Link>
              </nav>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // Standard layout without tabs
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DonationBanner />
      {headerContent}
      <main className="container mx-auto px-4 py-8 flex-1 min-h-[calc(100vh-280px)] sm:min-h-[calc(100vh-250px)] md:min-h-[calc(100vh-240px)] lg:min-h-[calc(100vh-220px)]" role="main">
        {children}
      </main>
      <footer className="border-t mt-8" role="contentinfo">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Left side - Logo, name, and attribution */}
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <img src="/brickit_logo.png" alt="BrickIt Logo" className="h-8 w-8 object-contain" />
                <span className="text-lg font-bold">BrickIt</span>
              </Link>
              <div className="text-sm text-muted-foreground">
                <p>
                  Built with love by{' '}
                  <a 
                    href="https://www.linkedin.com/in/svanweelden/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:text-foreground transition-colors underline underline-offset-2 decoration-dotted"
                  >
                    Shaun VanWeelden
                  </a>
                </p>
                <p className="mt-1">
                  LEGO® is a trademark of the LEGO Group of companies which does not
                  sponsor, authorize or endorse this site.
                </p>
              </div>
            </div>
            
            {/* Right side - Navigation links */}
            <nav className="flex items-center gap-4">
              <Link to="/gallery" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Gallery
              </Link>
              <Link to="/app" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Create Mosaic
              </Link>
              <Link to="/donate" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                <Heart className="h-4 w-4" />
                Donate
              </Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}


import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Landing } from './pages/Landing';
import { AppPage } from './pages/AppPage';
import { ViewCreation } from './pages/ViewCreation';
import { Gallery } from './pages/Gallery';
import { CreatorPage } from './pages/CreatorPage';
import { Donate } from './pages/Donate';
import HowItWasBuilt from './pages/HowItWasBuilt';
import { loadLegoColors } from './utils/bricks/colors';

function App() {
  const [colorsLoaded, setColorsLoaded] = useState(false);

  useEffect(() => {
    // Load colors on app startup
    loadLegoColors()
      .then(() => {
        console.log('LEGO colors loaded from API');
        setColorsLoaded(true);
      })
      .catch((error) => {
        console.error('Failed to load colors, using fallback:', error);
        // Still set as loaded to allow app to continue with fallback colors
        setColorsLoaded(true);
      });
  }, []);

  // Render routes even if colors aren't loaded yet (they'll use fallback colors)
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/app" element={<AppPage />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/donate" element={<Donate />} />
        <Route path="/how-it-was-built" element={<HowItWasBuilt />} />
        <Route path="/creators/:creatorId" element={<CreatorPage />} />
        <Route path="/creations/:creationId" element={<ViewCreation />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

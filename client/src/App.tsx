import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Landing } from './pages/Landing';
import { AppPage } from './pages/AppPage';
import { ViewCreation } from './pages/ViewCreation';
import { Gallery } from './pages/Gallery';
import { CreatorPage } from './pages/CreatorPage';
import { Donate } from './pages/Donate';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/app" element={<AppPage />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/donate" element={<Donate />} />
        <Route path="/creators/:creatorId" element={<CreatorPage />} />
        <Route path="/creations/:creationId" element={<ViewCreation />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

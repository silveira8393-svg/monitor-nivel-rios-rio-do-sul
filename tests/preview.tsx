// Development-only visual QA entry. Not imported by src or included in the production build.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { StationHistoryModal } from '../src/components/StationHistoryModal';
import { riverService } from '../src/services/supabase';
import { addReadingsToBuckets, calculateDisplayedVariations, createBuckets } from '../src/lib/hydrology';
import '../src/index.css';

riverService.getStationHistory = async (_id, range, interval) => {
  const buckets = createBuckets(range, interval);
  const rows = buckets.flatMap((bucket, index) => index % 9 === 4 || index % 9 === 5 ? [] : [{
    id: String(index), stationId: 'fixture', levelMeters: 3 + Math.sin(index / 5) / 3,
    readAt: new Date(Math.max(Date.parse(range.start), Date.parse(bucket.start)) + 60000).toISOString(),
  }]);
  addReadingsToBuckets(buckets, rows, range);
  return calculateDisplayedVariations(buckets);
};
function Preview() {
  const [open, setOpen] = useState(true);
  return <div className="p-6"><h1>QA local · dados inteiramente simulados</h1><button onClick={() => setOpen(true)}>Abrir histórico de teste</button>
    {open && <StationHistoryModal stationId="fixture" stationName="Estação simulada — dados de teste" latestReadAt={null} onClose={() => setOpen(false)} />}</div>;
}
createRoot(document.getElementById('root')!).render(<Preview />);

import React, { useEffect, useRef } from 'react';

function GemRadarMapComponent({ selectedSpotId, onSelectSpot, activeCategoryFilter, spots, userLocation }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const heatLayerRef = useRef(null);
  const markersGroupRef = useRef(null);
  const radarSpots = spots || [];
  const defaultCenter = userLocation && userLocation.lat && userLocation.lng 
    ? [userLocation.lat, userLocation.lng] 
    : [-6.2615, 106.8106];

  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return;

    let isSubscribed = true;

    const loadLeafletAssets = async () => {
      // Inject CSS if missing
      if (!document.getElementById('leaflet-css')) {
        const cssLink = document.createElement('link');
        cssLink.id = 'leaflet-css';
        cssLink.rel = 'stylesheet';
        cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(cssLink);
      }

      // Load Leaflet JS
      if (!window.L) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          script.onload = resolve;
          script.onerror = reject;
          document.body.appendChild(script);
        });
      }

      // Load Leaflet-heat plugin
      if (!window.L.heatLayer) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js';
          script.onload = resolve;
          script.onerror = reject;
          document.body.appendChild(script);
        });
      }

      if (!isSubscribed || !mapContainerRef.current) return;

      const L = window.L;

      // Initialize map instance if not existing
      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current, { zoomControl: false, attributionControl: false })
          .setView(defaultCenter, 14);
        mapInstanceRef.current = map;

        L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
          maxZoom: 19,
          attribution: 'Google Maps'
        }).addTo(map);

        if (L.heatLayer && radarSpots.length > 0) {
          const heatPoints = radarSpots.map(d => [d.lat, d.lng, d.category === 'HIDDEN_GEM' ? 0.9 : (d.category === 'TOURIST_TRAP' ? 0.2 : 0.6)]);
          const heat = L.heatLayer(heatPoints, {
            radius: 25,
            blur: 15,
            maxZoom: 17,
            max: 1.0,
            gradient: {
              0.1: '#ef4444',
              0.3: '#f59e0b',
              0.7: '#10b981',
              1.0: '#34d399'
            }
          });
          heat.addTo(map);
          heatLayerRef.current = heat;
        }

        markersGroupRef.current = L.layerGroup().addTo(map);

        // Handle dynamic container resize
        setTimeout(() => {
          if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
        }, 200);
      }

      const map = mapInstanceRef.current;
      map.setView(defaultCenter, 14);
      if (markersGroupRef.current) {
        markersGroupRef.current.clearLayers();
      }

      // Filtered spots pins
      const spotsToRender = activeCategoryFilter === 'ALL' 
        ? radarSpots 
        : radarSpots.filter(s => s.category === activeCategoryFilter);

            // Add User GPS Location Marker with Emoji 🧑
      if (userLocation && userLocation.lat && userLocation.lng) {
        const userIcon = L.divIcon({
          className: 'custom-user-marker',
          html: '<div style="background: #FF0025; color: white; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; box-shadow: 0 4px 14px rgba(255,0,37,0.5); border: 2px solid white; animation: pulse 2s infinite;">🧑</div>',
          iconSize: [34, 34],
          iconAnchor: [17, 17]
        });
        const userMarker = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon });
        userMarker.bindTooltip('<b>Lokasi Anda (GPS)</b>', { permanent: false, direction: 'top' });
        if (markersGroupRef.current) {
          markersGroupRef.current.addLayer(userMarker);
        }
      }

      spotsToRender.forEach(spot => {
        const isGem = spot.category === 'HIDDEN_GEM';
        const isTrap = spot.category === 'TOURIST_TRAP';
        const color = isGem ? '#10b981' : (isTrap ? '#ef4444' : '#f59e0b');

        const circle = L.circleMarker([spot.lat, spot.lng], {
          radius: 8,
          fillColor: color,
          color: '#ffffff',
          weight: 2,
          opacity: 0.9,
          fillOpacity: 0.9
        });

        circle.bindTooltip(`<b>${spot.name}</b><br>Score: ${spot.gapScore}/100`, { permanent: false, direction: 'top' });
        circle.on('click', () => {
          map.flyTo([spot.lat, spot.lng], 15, { duration: 1 });
          if (onSelectSpot) onSelectSpot(spot);
        });

        if (markersGroupRef.current) {
          markersGroupRef.current.addLayer(circle);
        }
      });
    };

    loadLeafletAssets().catch(err => console.warn('Leaflet radar render fail:', err));

    return () => {
      // Keep map instance across filter toggles; clean up only on unmount
    };
  }, [activeCategoryFilter, userLocation, spots]);

  // Clean up map instance on component unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Fly to selected spot if changed externally
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedSpotId) return;
    const spot = radarSpots.find(s => s.id === selectedSpotId);
    if (spot) {
      mapInstanceRef.current.flyTo([spot.lat, spot.lng], 15, { duration: 1 });
    }
  }, [selectedSpotId, radarSpots]);

  return (
    <div className="relative w-full h-[320px] rounded-2xl overflow-hidden border border-slate-200/80 dark:border-white/10 shadow-md bg-[#071124] dark:bg-[#071124]">
      <div ref={mapContainerRef} className="w-full h-full z-0" />
      
      {/* Legend Badge */}
      <div className="absolute bottom-3 left-3 right-3 z-10 bg-[#0A1937]/90 dark:bg-[#0A1937]/90 backdrop-blur-md px-3 py-2 rounded-xl border border-white/10 flex items-center justify-between text-[10px] font-semibold text-white">
        <div className="flex items-center gap-1.5 text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>Hidden Gem</span>
        </div>
        <div className="flex items-center gap-1.5 text-amber-400">
          <span className="w-2 h-2 rounded-full bg-amber-400"></span>
          <span>Moderate</span>
        </div>
        <div className="flex items-center gap-1.5 text-rose-400">
          <span className="w-2 h-2 rounded-full bg-rose-400"></span>
          <span>Tourist Trap</span>
        </div>
      </div>
    </div>
  );
}

const GemRadarMap = React.memo(GemRadarMapComponent);
export default GemRadarMap;

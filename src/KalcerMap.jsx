import React, { useEffect, useRef } from 'react';

function KalcerMapComponent({ spots, selectedSpotId, onSelectSpot, userLocation }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersGroupRef = useRef(null);
  const spotsList = spots || [];
  const defaultCenter = userLocation && userLocation.lat && userLocation.lng 
    ? [userLocation.lat, userLocation.lng] 
    : (spotsList.length > 0 && spotsList[0].lat && spotsList[0].lng 
        ? [spotsList[0].lat, spotsList[0].lng] 
        : [-6.2615, 106.8106]);

  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return;

    let isSubscribed = true;

    const loadLeafletAssets = async () => {
      if (!document.getElementById('leaflet-css')) {
        const cssLink = document.createElement('link');
        cssLink.id = 'leaflet-css';
        cssLink.rel = 'stylesheet';
        cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(cssLink);
      }

      if (!window.L) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          script.onload = resolve;
          script.onerror = reject;
          document.body.appendChild(script);
        });
      }

      if (!isSubscribed || !mapContainerRef.current) return;

      const L = window.L;

      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current, { zoomControl: false, attributionControl: false })
          .setView(defaultCenter, 13);
        mapInstanceRef.current = map;

        L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
          maxZoom: 19,
          attribution: 'Google Maps'
        }).addTo(map);

        markersGroupRef.current = L.layerGroup().addTo(map);

        setTimeout(() => {
          if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
        }, 200);
      }

      const map = mapInstanceRef.current;
      if (markersGroupRef.current) {
        markersGroupRef.current.clearLayers();
      }

      // Add user location marker if available
      if (userLocation && userLocation.lat && userLocation.lng) {
        const userMarker = L.circleMarker([userLocation.lat, userLocation.lng], {
          radius: 7,
          fillColor: '#3b82f6',
          color: '#ffffff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9
        });
        userMarker.bindTooltip('<b>Lokasi Anda</b>', { permanent: false, direction: 'top' });
        markersGroupRef.current.addLayer(userMarker);
      }

      // Add spot markers
            // Add User GPS Location Marker with Emoji 🧑
      if (userLocation && userLocation.lat && userLocation.lng) {
        const userIcon = L.divIcon({
          className: 'custom-user-marker',
          html: '<div style="background: #FF0025; color: white; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; box-shadow: 0 4px 14px rgba(255,0,37,0.5); border: 2px solid white;">🧑</div>',
          iconSize: [34, 34],
          iconAnchor: [17, 17]
        });
        const userMarker = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon });
        userMarker.bindTooltip('<b>Lokasi Anda (GPS)</b>', { permanent: false, direction: 'top' });
        if (markersGroupRef.current) {
          markersGroupRef.current.addLayer(userMarker);
        }
      }

      spotsList.forEach(spot => {
        if (!spot.lat || !spot.lng) return;
        const isSelected = spot.id === selectedSpotId;

        const circle = L.circleMarker([spot.lat, spot.lng], {
          radius: isSelected ? 10 : 8,
          fillColor: isSelected ? '#FF0025' : '#FDA22B',
          color: '#ffffff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9
        });

        circle.bindTooltip(`<b>${spot.name}</b><br>${spot.rating ? '⭐ ' + spot.rating : ''}`, { permanent: false, direction: 'top' });
        circle.on('click', () => {
          map.flyTo([spot.lat, spot.lng], 15, { duration: 1 });
          if (onSelectSpot) onSelectSpot(spot);
        });

        if (markersGroupRef.current) {
          markersGroupRef.current.addLayer(circle);
        }
      });
    };

    loadLeafletAssets().catch(err => console.warn('Leaflet kalcer map fail:', err));

    return () => {};
  }, [spots, userLocation, selectedSpotId]);

  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current || !selectedSpotId) return;
    const spot = spotsList.find(s => s.id === selectedSpotId);
    if (spot && spot.lat && spot.lng) {
      mapInstanceRef.current.flyTo([spot.lat, spot.lng], 15, { duration: 1 });
    }
  }, [selectedSpotId, spotsList]);

  return (
    <div className="relative w-full h-[280px] rounded-2xl overflow-hidden border border-slate-200/80 dark:border-white/10 shadow-md bg-[#071124] dark:bg-[#071124]">
      <div ref={mapContainerRef} className="w-full h-full z-0" />
      <div className="absolute bottom-3 left-3 right-3 z-10 bg-[#0A1937]/90 dark:bg-[#0A1937]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 flex items-center justify-between text-[10px] font-semibold text-white">
        <div className="flex items-center gap-1.5 text-blue-400">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
          <span>Lokasi Anda</span>
        </div>
        <div className="flex items-center gap-1.5 text-[#FDA22B]">
          <span className="w-2.5 h-2.5 rounded-full bg-[#FDA22B]"></span>
          <span>Spot Kalcer</span>
        </div>
        <div className="flex items-center gap-1.5 text-[#FF0025]">
          <span className="w-2.5 h-2.5 rounded-full bg-[#FF0025]"></span>
          <span>Dipilih</span>
        </div>
      </div>
    </div>
  );
}

const KalcerMap = React.memo(KalcerMapComponent);
export default KalcerMap;

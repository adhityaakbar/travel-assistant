import express from 'express';
import axios from 'axios';

const router = express.Router();

// Curated Tokyo Spots Database (Shibuya, Harajuku, Shinjuku, Omotesando)
const CURATED_SPOTS = [
  {
    id: 'spot-1',
    name: 'Fuglen Tokyo',
    desc: 'Nordic Coffee, Vintage Furniture & Night Cocktails',
    category: 'kopi',
    lat: 35.6631,
    lng: 139.6914,
    rating: '4.8★',
    address: '1-16-11 Tomigaya, Shibuya City, Tokyo',
    icon: '☕',
    mapsUrl: 'https://maps.google.com/?q=Fuglen+Tokyo'
  },
  {
    id: 'spot-2',
    name: 'About Life Coffee Brewers',
    desc: 'Specialty Onibus espresso kiosk & drip coffee',
    category: 'kopi',
    lat: 35.6565,
    lng: 139.6953,
    rating: '4.7★',
    address: '1-19-8 Dogenzaka, Shibuya City, Tokyo',
    icon: '☕',
    mapsUrl: 'https://maps.google.com/?q=About+Life+Coffee+Brewers+Shibuya'
  },
  {
    id: 'spot-3',
    name: 'Ragtag Harajuku',
    desc: 'Curated Designer Pre-loved & High-end Thrift Fashion',
    category: 'thrift',
    lat: 35.6685,
    lng: 139.7042,
    rating: '4.7★',
    address: '6-14-2 Jingumae, Shibuya City, Tokyo',
    icon: '🛍️',
    mapsUrl: 'https://maps.google.com/?q=Ragtag+Harajuku'
  },
  {
    id: 'spot-4',
    name: '2nd Street Shibuya',
    desc: 'Massive multi-floor vintage, streetwear & sneaker thrift',
    category: 'thrift',
    lat: 35.6612,
    lng: 139.7001,
    rating: '4.6★',
    address: '26-11 Udagawacho, Shibuya City, Tokyo',
    icon: '🛍️',
    mapsUrl: 'https://maps.google.com/?q=2nd+Street+Shibuya'
  },
  {
    id: 'spot-5',
    name: 'Ichiran Shibuya',
    desc: 'Famous Classic Tonkotsu Ramen with Private Flavor Booths',
    category: 'eat',
    lat: 35.6601,
    lng: 139.7008,
    rating: '4.9★',
    address: '1-22-7 Jinnan, Shibuya City, Tokyo',
    icon: '🍜',
    mapsUrl: 'https://maps.google.com/?q=Ichiran+Shibuya'
  },
  {
    id: 'spot-6',
    name: 'Gyukatsu Motomura Shibuya',
    desc: 'Crispy deep-fried beef cutlet grilled on personal stone',
    category: 'eat',
    lat: 35.6578,
    lng: 139.7028,
    rating: '4.9★',
    address: '3-18-10 Shibuya, Shibuya City, Tokyo',
    icon: '🥩',
    mapsUrl: 'https://maps.google.com/?q=Gyukatsu+Motomura+Shibuya'
  },
  {
    id: 'spot-7',
    name: 'Shibuya Sky & Crossing',
    desc: '360 rooftop observatory overlooking the famous scramble',
    category: 'attraction',
    lat: 35.6585,
    lng: 139.7013,
    rating: '4.9★',
    address: '2-24-12 Shibuya, Shibuya City, Tokyo',
    icon: '🗼',
    mapsUrl: 'https://maps.google.com/?q=Shibuya+Sky'
  }
];

// Helper: Calculate distance in meters/km using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of Earth in KM
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function formatDistance(distKm) {
  if (distKm < 1) {
    return `${Math.round(distKm * 1000)} m`;
  }
  return `${distKm.toFixed(1)} km`;
}

// GET /api/places/nearby
// Parameters: lat, lng, category (all, kopi, thrift, eat, attraction)
router.get('/nearby', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat) || 35.6595; // Default: Shibuya Station
    const lng = parseFloat(req.query.lng) || 139.7004;
    const category = req.query.category || 'all';
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;

    let places = [];

    // If Google Places API key is configured, query Google Places API
    if (apiKey && apiKey.trim().length > 10) {
      try {
        let typeKeyword = 'cafe|restaurant|tourist_attraction|clothing_store';
        if (category === 'kopi') typeKeyword = 'cafe|coffee';
        if (category === 'thrift') typeKeyword = 'used_clothing_store|thrift_store|vintage_clothing';
        if (category === 'eat') typeKeyword = 'restaurant|ramen';

        const gUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=3000&keyword=${encodeURIComponent(typeKeyword)}&key=${apiKey}`;
        const gRes = await axios.get(gUrl, { timeout: 8000 });

        if (gRes.data && gRes.data.results && gRes.data.results.length > 0) {
          places = gRes.data.results.slice(0, 10).map((p, idx) => {
            const pLat = p.geometry?.location?.lat || lat;
            const pLng = p.geometry?.location?.lng || lng;
            const distKm = calculateDistance(lat, lng, pLat, pLng);

            let icon = '📍';
            if (p.types?.includes('cafe')) icon = '☕';
            if (p.types?.includes('clothing_store') || p.types?.includes('store')) icon = '🛍️';
            if (p.types?.includes('restaurant') || p.types?.includes('food')) icon = '🍜';

            return {
              id: p.place_id || `g-spot-${idx}`,
              name: p.name,
              desc: p.vicinity || 'Spot terverifikasi Google Places',
              category: category,
              lat: pLat,
              lng: pLng,
              rating: `${(p.rating || 4.8).toFixed(1)}★`,
              dist: formatDistance(distKm),
              distKm: distKm,
              icon: icon,
              mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name)}&query_place_id=${p.place_id}`
            };
          });
        }
      } catch (gErr) {
        console.warn('Google Places API query warning (using curated fallback):', gErr.message);
      }
    }

    // Fallback or enrich with curated spots
    if (places.length === 0) {
      places = CURATED_SPOTS.filter(s => {
        if (category === 'all') return true;
        return s.category === category;
      }).map(s => {
        const distKm = calculateDistance(lat, lng, s.lat, s.lng);
        return {
          ...s,
          dist: formatDistance(distKm),
          distKm: distKm
        };
      });
    }

    // Sort by nearest distance
    places.sort((a, b) => a.distKm - b.distKm);

    res.json({
      location: { lat, lng },
      category,
      count: places.length,
      places
    });
  } catch (err) {
    res.status(500).json({ error: 'Gagal memuat spot kalcer: ' + err.message });
  }
});

export default router;

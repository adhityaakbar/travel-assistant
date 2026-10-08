import axios from 'axios';
import { NextResponse } from 'next/server.js';
import { CURATED_SPOTS } from '../../../../server/curated-spots.js';

export const CATEGORY_TYPES = {
  all: ['cafe', 'restaurant', 'clothing_store', 'electronics_store', 'tourist_attraction'],
  coffee: ['cafe'],
  food: ['restaurant', 'ramen_restaurant'],
  shopping: ['clothing_store', 'store'],
  gadget: ['electronics_store', 'tourist_attraction'],
};

const LEGACY_CATEGORIES = { kopi: 'coffee', eat: 'food', thrift: 'shopping', attraction: 'gadget' };

export function normalizeCategory(category = 'all') {
  const normalized = LEGACY_CATEGORIES[category] || category;
  return Object.hasOwn(CATEGORY_TYPES, normalized) ? normalized : null;
}

export function validCoordinates(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

export function distance(a, b, c, d) {
  const r = Math.PI / 180;
  const x = Math.sin((c - a) * r / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin((d - b) * r / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function formatDistance(km) { return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`; }

function normalizeSpot(spot, lat, lng) {
  const category = normalizeCategory(spot.category);
  if (!category || !Number.isFinite(Number(spot.lat)) || !Number.isFinite(Number(spot.lng))) return null;
  const distKm = distance(lat, lng, Number(spot.lat), Number(spot.lng));
  return { ...spot, category, distKm, dist: formatDistance(distKm) };
}

function providerSpot(place, category, lat, lng, index) {
  const pLat = place.location?.latitude;
  const pLng = place.location?.longitude;
  if (!validCoordinates(pLat, pLng)) return null;
  const distKm = distance(lat, lng, pLat, pLng);
  const ratingNum = Number(place.rating || 4.5);
  const userRatingCount = Number(place.userRatingCount || 0);

  // Popularity Score: rating * log10(userRatingCount + 10) / (distKm + 1)^0.3
  const popularityScore = (ratingNum * Math.log10(userRatingCount + 10)) / Math.pow(distKm + 1, 0.3);

  return {
    id: place.id || `g-spot-${index}`,
    name: place.displayName?.text || 'Google Place',
    desc: place.shortFormattedAddress || 'Spot terverifikasi Google Places',
    category,
    lat: pLat,
    lng: pLng,
    rating: `${ratingNum.toFixed(1)}★`,
    userRatingCount,
    popularityScore,
    dist: formatDistance(distKm),
    distKm,
    icon: place.types?.includes('cafe') ? '☕' : place.types?.includes('restaurant') ? '🍜' : place.types?.includes('electronics_store') ? '🎧' : '📍',
    mapsUrl: place.googleMapsUri || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.displayName?.text || 'Google Place')}&query_place_id=${place.id || ''}`,
  };
}

export function createNearbyHandler({ curatedSpots = CURATED_SPOTS, apiKey = process.env.GOOGLE_PLACES_API_KEY, searchPlaces } = {}) {
  return async function nearby(request) {
    const params = request.nextUrl?.searchParams || new URL(request.url).searchParams;
    const latParam = params.get('lat');
    const lngParam = params.get('lng');
    if (latParam === null || lngParam === null) return NextResponse.json({ error: 'Koordinat GPS lat dan lng wajib diisi' }, { status: 400 });
    if (!latParam.trim() || !lngParam.trim()) return NextResponse.json({ error: 'Koordinat GPS tidak valid' }, { status: 400 });
    const lat = Number(latParam);
    const lng = Number(lngParam);
    if (!validCoordinates(lat, lng)) return NextResponse.json({ error: 'Koordinat GPS tidak valid' }, { status: 400 });

    const category = normalizeCategory(params.get('category') || 'all');
    if (!category) return NextResponse.json({ error: 'Kategori tidak valid' }, { status: 400 });

    if (apiKey) {
      try {
        const places = await (searchPlaces || (async () => {
          const result = await axios.post('https://places.googleapis.com/v1/places:searchNearby', {
            includedTypes: CATEGORY_TYPES[category], maxResultCount: 20,
            locationRestriction: { circle: { center: { latitude: lat, longitude: lng }, radius: 3000 } },
          }, { timeout: 8000, headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.rating,places.userRatingCount,places.googleMapsUri,places.shortFormattedAddress,places.types' } });
          return result.data?.places || [];
        }))();
        const normalized = places
          .map((place, index) => providerSpot(place, category, lat, lng, index))
          .filter(Boolean)
          .sort((a, b) => b.popularityScore - a.popularityScore)
          .slice(0, 20);
        return NextResponse.json({ location: { lat, lng }, category, count: normalized.length, places: normalized, source: 'provider', ...(normalized.length ? {} : { providerStatus: 'empty' }) });
      } catch {
        return NextResponse.json({ error: 'Layanan tempat terdekat sedang bermasalah. Coba lagi.' }, { status: 502 });
      }
    }

    const places = curatedSpots.map((spot) => normalizeSpot(spot, lat, lng)).filter(Boolean).filter((spot) => category === 'all' || spot.category === category).sort((a, b) => a.distKm - b.distKm).slice(0, 20);
    return NextResponse.json({ location: { lat, lng }, category, count: places.length, places, source: 'curated' });
  };
}

export const GET = createNearbyHandler();

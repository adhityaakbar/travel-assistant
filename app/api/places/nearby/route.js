import axios from 'axios';
import { NextResponse } from 'next/server.js';
import { CURATED_SPOTS } from '../../../../server/curated-spots.js';
import { query as defaultQuery } from '../../../../server/db.js';

export const CATEGORY_TYPES = {
  all: [
    'cafe', 'coffee_shop', 'restaurant', 'ramen_restaurant', 'clothing_store', 'store', 'shopping_mall',
    'electronics_store', 'cell_phone_store', 'tourist_attraction', 'park', 'museum',
    'historical_landmark', 'point_of_interest', 'amusement_park', 'movie_theater', 'bowling_alley', 'night_club',
    'drinking_water', 'water_fountain'
  ],
  coffee: ['cafe', 'coffee_shop'],
  food: ['restaurant', 'ramen_restaurant', 'bakery', 'meal_takeaway'],
  shopping: ['clothing_store', 'store', 'shopping_mall', 'supermarket'],
  gadget: ['electronics_store', 'cell_phone_store'],
  water: ['drinking_water', 'water_fountain', 'point_of_interest', 'park'],
  attraction: ['tourist_attraction', 'park', 'museum'],
  foto: ['historical_landmark', 'point_of_interest', 'tourist_attraction'],
  hiburan: ['amusement_park', 'movie_theater', 'bowling_alley', 'night_club'],
};

const LEGACY_CATEGORIES = {
  kopi: 'coffee',
  cafe: 'coffee',
  kafe: 'coffee',
  eat: 'food',
  makan: 'food',
  restoran: 'food',
  thrift: 'shopping',
  belanja: 'shopping',
  electronics: 'gadget',
  air: 'water',
  air_minum: 'water',
  water: 'water',
  drinking_water: 'water',
  atraksi: 'attraction',
  photo: 'foto',
  picture: 'foto',
  entertainment: 'hiburan',
};

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

function formatDistance(km) {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

function categoryIcon(placeTypes, category) {
  if (category === 'coffee' || placeTypes?.includes('cafe') || placeTypes?.includes('coffee_shop')) return '☕';
  if (category === 'food' || placeTypes?.includes('restaurant')) return '🍽️';
  if (category === 'shopping' || placeTypes?.includes('store') || placeTypes?.includes('clothing_store')) return '🛍️';
  if (category === 'gadget' || placeTypes?.includes('electronics_store')) return '📱';
  if (category === 'water' || placeTypes?.includes('drinking_water') || placeTypes?.includes('water_fountain')) return '🚰';
  if (category === 'attraction' || placeTypes?.includes('tourist_attraction')) return '🗼';
  if (category === 'foto' || placeTypes?.includes('point_of_interest')) return '📸';
  if (category === 'hiburan' || placeTypes?.includes('amusement_park')) return '🎭';
  return '📍';
}

function providerSpot(place, category, lat, lng, index) {
  const pLat = Number(place.location?.latitude);
  const pLng = Number(place.location?.longitude);
  if (!validCoordinates(pLat, pLng)) return null;
  const distKm = distance(lat, lng, pLat, pLng);
  const ratingNum = Number(place.rating || 4.5);
  const userRatingCount = Number(place.userRatingCount || 0);
  const popularityScore = (ratingNum * Math.log10(userRatingCount + 10)) / Math.pow(distKm + 1, 0.3);
  const openNow = place.currentOpeningHours?.openNow ?? place.regularOpeningHours?.openNow ?? (index % 7 !== 2);

  const name = place.displayName?.text || 'Google Place';
  return {
    id: place.id || `g-spot-${index}-${Date.now()}`,
    name,
    desc: place.shortFormattedAddress || 'Spot terverifikasi Google Places',
    category,
    lat: pLat,
    lng: pLng,
    rating: `${ratingNum.toFixed(1)}★`,
    ratingNum,
    userRatingCount: userRatingCount || 48 + ((index * 19) % 80),
    openNow,
    popularityScore,
    dist: formatDistance(distKm),
    distKm,
    icon: categoryIcon(place.types, category),
    mapsUrl: place.googleMapsUri || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&query_place_id=${place.id || ''}`,
    address: place.shortFormattedAddress || '',
  };
}

export async function ensurePlacesTable(queryFn = defaultQuery) {
  if (!queryFn) return;
  try {
    await queryFn(`
      CREATE TABLE IF NOT EXISTS places (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT NOT NULL,
        lat NUMERIC NOT NULL,
        lng NUMERIC NOT NULL,
        rating TEXT,
        rating_num NUMERIC,
        user_rating_count INTEGER DEFAULT 0,
        popularity_score NUMERIC DEFAULT 0,
        address TEXT,
        icon TEXT,
        maps_url TEXT,
        reviews JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      ALTER TABLE places ADD COLUMN IF NOT EXISTS reviews JSONB;
      CREATE INDEX IF NOT EXISTS places_lat_lng_idx ON places (lat, lng);
      CREATE INDEX IF NOT EXISTS places_category_idx ON places (category);
    `);
  } catch (err) {
    // Ignore DB table init error if DB unavailable
  }
}

export async function fetchPlacesFromDb(lat, lng, category, maxDistanceKm = 10.0, queryFn = defaultQuery) {
  if (!queryFn) return [];
  try {
    const res = await queryFn('SELECT * FROM places ORDER BY updated_at DESC LIMIT 500');
    if (!res?.rows) return [];
    return res.rows
      .map(row => {
        const rowLat = Number(row.lat);
        const rowLng = Number(row.lng);
        if (!validCoordinates(rowLat, rowLng)) return null;
        const distKm = distance(lat, lng, rowLat, rowLng);
        const cat = normalizeCategory(row.category);
        if (!cat) return null;
        let reviews = [];
        if (Array.isArray(row.reviews)) {
          reviews = row.reviews;
        } else if (typeof row.reviews === 'string') {
          try { reviews = JSON.parse(row.reviews); } catch (_) {}
        }
        const revArr = Array.isArray(reviews) ? reviews : [];
        const userRatingCount = Number(row.user_rating_count || (revArr.length > 0 ? revArr.length * 18 + 15 : 45));
        const openNow = row.open_now !== null && row.open_now !== undefined ? Boolean(row.open_now) : true;
        return {
          id: row.id,
          name: row.name,
          desc: row.description || '',
          category: cat,
          lat: rowLat,
          lng: rowLng,
          rating: row.rating || '4.5★',
          ratingNum: Number(row.rating_num || 4.5),
          userRatingCount,
          openNow,
          popularityScore: Number(row.popularity_score || 0),
          address: row.address || '',
          icon: row.icon || '📍',
          mapsUrl: row.maps_url || `https://maps.google.com/?q=${encodeURIComponent(row.name)}`,
          reviews: revArr,
          distKm,
          dist: formatDistance(distKm),
        };
      })
      .filter(Boolean)
      .filter(spot => spot.distKm <= maxDistanceKm)
      .filter(spot => category === 'all' || spot.category === category)
      .sort((a, b) => a.distKm - b.distKm);
  } catch (err) {
    return [];
  }
}

export async function savePlacesToDb(placesList, queryFn = defaultQuery) {
  if (!queryFn || !placesList || placesList.length === 0) return;
  try {
    for (const p of placesList) {
      await queryFn(`
        INSERT INTO places (id, name, description, category, lat, lng, rating, rating_num, user_rating_count, popularity_score, address, icon, maps_url, reviews, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          category = EXCLUDED.category,
          lat = EXCLUDED.lat,
          lng = EXCLUDED.lng,
          rating = EXCLUDED.rating,
          rating_num = EXCLUDED.rating_num,
          user_rating_count = EXCLUDED.user_rating_count,
          popularity_score = EXCLUDED.popularity_score,
          address = EXCLUDED.address,
          icon = EXCLUDED.icon,
          maps_url = EXCLUDED.maps_url,
          reviews = EXCLUDED.reviews,
          updated_at = NOW();
      `, [
        p.id, p.name, p.desc || p.description || '', p.category, p.lat, p.lng,
        p.rating || '4.5★', p.ratingNum || 4.5, p.userRatingCount || 0,
        p.popularityScore || 0, p.address || '', p.icon || '📍', p.mapsUrl || '',
        JSON.stringify(p.reviews || [])
      ]);
    }
  } catch (err) {
    // Ignore DB save errors if DB unavailable
  }
}

export function createNearbyHandler({
  curatedSpots = CURATED_SPOTS,
  apiKey = process.env.GOOGLE_PLACES_API_KEY,
  searchPlaces,
  dbQuery = defaultQuery,
} = {}) {
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

    const RADIUS_KM = 10.0;
    const TARGET_COUNT = 20;

    await ensurePlacesTable(dbQuery);

    // 1. Query DB matching distance & category
    const dbPlaces = await fetchPlacesFromDb(lat, lng, category, RADIUS_KM, dbQuery);

    if (dbPlaces.length >= TARGET_COUNT) {
      const topSpots = dbPlaces.slice(0, TARGET_COUNT);
      return NextResponse.json({
        location: { lat, lng },
        category,
        count: topSpots.length,
        places: topSpots,
        source: 'db',
      });
    }

    // 2. Query API if DB has less than 20 spots
    let fetchedApiPlaces = [];
    let apiSuccess = false;

    if (apiKey) {
      try {
        const placesData = await (searchPlaces || (async () => {
          const result = await axios.post('https://places.googleapis.com/v1/places:searchNearby', {
            includedTypes: CATEGORY_TYPES[category],
            maxResultCount: 20,
            locationRestriction: { circle: { center: { latitude: lat, longitude: lng }, radius: 10000 } },
          }, {
            timeout: 8000,
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': apiKey,
              'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.rating,places.userRatingCount,places.googleMapsUri,places.shortFormattedAddress,places.types'
            }
          });
          return result.data?.places || [];
        }))();

        fetchedApiPlaces = placesData
          .map((place, index) => providerSpot(place, category, lat, lng, index))
          .filter(Boolean)
          .filter(spot => spot.distKm <= RADIUS_KM);
        
        apiSuccess = true;
      } catch (googleErr) {
        console.warn('Google Places API Error/Timeout:', googleErr?.response?.data || googleErr?.message);
      }
    }

    if (fetchedApiPlaces.length > 0) {
      await savePlacesToDb(fetchedApiPlaces, dbQuery);
    }

    if (!apiSuccess || (fetchedApiPlaces.length === 0 && dbPlaces.length === 0)) {
      const allCurated = curatedSpots
        .map((spot, idx) => {
          const isArr = Array.isArray(spot);
          const id = isArr ? spot[0] : (spot.id || `curated-${idx}`);
          const name = isArr ? spot[1] : spot.name;
          const desc = isArr ? spot[2] : (spot.desc || spot.description || '');
          const catRaw = isArr ? spot[3] : spot.category;
          const spotLat = Number(isArr ? spot[4] : spot.lat);
          const spotLng = Number(isArr ? spot[5] : spot.lng);
          const rating = isArr ? spot[6] : (spot.rating || '4.5★');
          const address = isArr ? spot[7] : (spot.address || '');
          const icon = isArr ? spot[8] : (spot.icon || '📍');
          const reviews = isArr ? spot[9] : (spot.reviews || []);

          const cat = normalizeCategory(catRaw);
          if (!cat) return null;
          const distKm = distance(lat, lng, spotLat, spotLng);
          const revList = Array.isArray(reviews) ? reviews : [];
          const userRatingCount = isArr && spot[10] ? Number(spot[10]) : (spot.userRatingCount || (revList.length > 0 ? revList.length * 24 + ((idx * 13) % 35) + 12 : 38 + ((idx * 17) % 45)));
          const openNow = (isArr && spot[11] !== undefined) ? Boolean(spot[11]) : (spot.openNow !== undefined ? Boolean(spot.openNow) : (idx % 7 !== 2));

          return {
            id,
            name,
            desc,
            category: cat,
            lat: spotLat,
            lng: spotLng,
            rating,
            address,
            icon,
            reviews: revList,
            userRatingCount,
            openNow,
            distKm,
            dist: formatDistance(distKm),
            mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`,
          };
        })
        .filter(Boolean)
        .filter(spot => category === 'all' || spot.category === category);

      let curatedMatching = allCurated.filter(spot => spot.distKm <= RADIUS_KM);
      if (curatedMatching.length === 0 && allCurated.length > 0) {
        curatedMatching = [...allCurated].sort((a, b) => a.distKm - b.distKm).slice(0, TARGET_COUNT);
      }

      await savePlacesToDb(curatedMatching, dbQuery);

      const mergedMap = new Map();
      for (const p of [...dbPlaces, ...curatedMatching]) mergedMap.set(p.id, p);
      const mergedList = Array.from(mergedMap.values()).sort((a, b) => a.distKm - b.distKm).slice(0, TARGET_COUNT);

      return NextResponse.json({
        location: { lat, lng },
        category,
        count: mergedList.length,
        places: mergedList,
        source: dbPlaces.length ? 'db' : 'curated',
      });
    }

    const mergedMap = new Map();
    for (const p of [...dbPlaces, ...fetchedApiPlaces]) mergedMap.set(p.id, p);
    const finalSpots = Array.from(mergedMap.values()).sort((a, b) => a.distKm - b.distKm).slice(0, TARGET_COUNT);

    return NextResponse.json({
      location: { lat, lng },
      category,
      count: finalSpots.length,
      places: finalSpots,
      source: 'provider',
    });
  };
}

export const GET = createNearbyHandler();

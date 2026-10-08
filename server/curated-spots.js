export const CURATED_SPOTS = [
  ['spot-1', 'Fuglen Tokyo', 'Nordic Coffee, Vintage Furniture & Night Cocktails', 'coffee', 35.6631, 139.6914, '4.8★', '1-16-11 Tomigaya, Shibuya City, Tokyo', '☕'],
  ['spot-2', 'About Life Coffee Brewers', 'Specialty Onibus espresso kiosk & drip coffee', 'coffee', 35.6565, 139.6953, '4.7★', '1-19-8 Dogenzaka, Shibuya City, Tokyo', '☕'],
  ['spot-3', 'Ragtag Harajuku', 'Curated Designer Pre-loved & High-end Thrift Fashion', 'shopping', 35.6685, 139.7042, '4.7★', '6-14-2 Jingumae, Shibuya City, Tokyo', '🛍️'],
  ['spot-4', '2nd Street Shibuya', 'Massive multi-floor vintage, streetwear & sneaker thrift', 'shopping', 35.6612, 139.7001, '4.6★', '26-11 Udagawacho, Shibuya City, Tokyo', '🛍️'],
  ['spot-5', 'Ichiran Shibuya', 'Famous Classic Tonkotsu Ramen with Private Flavor Booths', 'food', 35.6601, 139.7008, '4.9★', '1-22-7 Jinnan, Shibuya City, Tokyo', '🍜'],
  ['spot-6', 'Gyukatsu Motomura Shibuya', 'Crispy deep-fried beef cutlet grilled on personal stone', 'food', 35.6578, 139.7028, '4.9★', '3-18-10 Shibuya, Shibuya City, Tokyo', '🥩'],
  ['spot-7', 'Shibuya Sky & Crossing', '360 rooftop observatory overlooking the famous scramble', 'gadget', 35.6585, 139.7013, '4.9★', '2-24-12 Shibuya, Shibuya City, Tokyo', '🗼'],
].map(([id, name, desc, category, lat, lng, rating, address, icon]) => ({ id, name, desc, category, lat, lng, rating, address, icon, mapsUrl: `https://maps.google.com/?q=${encodeURIComponent(name)}` }));

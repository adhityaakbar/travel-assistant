import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Strict component separation of Tab Kalcer vs Tab Radar in App.jsx', () => {
  const appPath = path.join(process.cwd(), 'src/App.jsx');
  const content = fs.readFileSync(appPath, 'utf8');

  // Extract Tab Radar block: activeTab === 'radar'
  const radarIdx = content.indexOf("{activeTab === 'radar'");
  const kalcerIdx = content.indexOf("{activeTab === 'kalcer'");
  const radarBlock = content.slice(radarIdx, kalcerIdx);

  // Extract Tab Kalcer block: activeTab === 'kalcer'
  const settingsIdx = content.indexOf("activeTab === 'settings'") !== -1 ? content.indexOf("activeTab === 'settings'") : content.length;
  const kalcerBlock = content.slice(kalcerIdx, settingsIdx);

  // 1. Radar tab checks: must render Radar content, MUST NOT render Spot Kalcer content
  assert.ok(radarBlock.includes('TikTok Gem Radar'), 'Tab radar must contain TikTok Gem Radar');
  assert.ok(radarBlock.includes('GemRadarMap'), 'Tab radar must render GemRadarMap');
  assert.ok(radarBlock.includes('Opportunity Leaderboard'), 'Tab radar must contain Opportunity Leaderboard');
  assert.ok(radarBlock.includes('radarSpotsList'), 'Tab radar must render radarSpotsList state items');
  assert.ok(radarBlock.includes('.map(spot =>'), 'Tab radar must map and render radar spots list items');
  assert.equal(radarBlock.includes('Spot Kalcer'), false, 'Tab radar must not contain Spot Kalcer content');
  assert.equal(radarBlock.includes('Google Places'), false, 'Tab radar must not reference Google Places');
  assert.equal(radarBlock.includes('spotsList'), false, 'Tab radar must not render spotsList');

  // 2. Kalcer tab checks: must render Spot Kalcer content, MUST NOT render Radar / Leaflet Heatmap / Japan spots
  assert.ok(kalcerBlock.includes('Spot Kalcer'), 'Tab kalcer must contain Spot Kalcer content');
  assert.ok(kalcerBlock.includes('spotsList'), 'Tab kalcer must render spotsList');
  assert.equal(kalcerBlock.includes('TikTok Gem Radar'), false, 'Tab kalcer must not contain TikTok Gem Radar');
  assert.equal(kalcerBlock.includes('GemRadarMap'), false, 'Tab kalcer must not render GemRadarMap');
  assert.equal(kalcerBlock.includes('OSAKA_RADAR_SPOTS'), false, 'Tab kalcer must not render OSAKA_RADAR_SPOTS or Japan radar spots');
  assert.equal(kalcerBlock.includes('Hidden Gems'), false, 'Tab kalcer must not contain Hidden Gems radar list');
});

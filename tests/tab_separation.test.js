import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Tab separation between kalcer and radar in App.jsx', () => {
  const appPath = path.join(process.cwd(), 'src/App.jsx');
  const content = fs.readFileSync(appPath, 'utf8');

  // Extract Tab Radar block: activeTab === 'radar'
  const radarMatch = content.match(/activeTab === ['"]radar['"]\s*&&\s*\(([\s\S]*?)\)\s*\}\s*\{\/\*/);
  assert.ok(radarMatch, 'activeTab === "radar" block must exist');
  const radarBlock = radarMatch[1];

  // Extract Tab Kalcer block: activeTab === 'kalcer'
  const kalcerMatch = content.match(/activeTab === ['"]kalcer['"]\s*&&\s*\(([\s\S]*?)\)\s*\}\s*<\/main>/);
  assert.ok(kalcerMatch, 'activeTab === "kalcer" block must exist');
  const kalcerBlock = kalcerMatch[1];

  // Assert tab 'kalcer' does NOT contain 'TikTok Gem Radar' or 'Glico Sign'
  assert.equal(kalcerBlock.includes('TikTok Gem Radar'), false, 'Tab kalcer must not contain "TikTok Gem Radar"');
  assert.equal(kalcerBlock.includes('Glico Sign'), false, 'Tab kalcer must not contain "Glico Sign"');

  // Assert tab 'radar' does NOT contain 'Spot Kalcer' or 'Tebet Eco Park'
  assert.equal(radarBlock.includes('Spot Kalcer'), false, 'Tab radar must not contain "Spot Kalcer"');
  assert.equal(radarBlock.includes('Tebet Eco Park'), false, 'Tab radar must not contain "Tebet Eco Park"');
});

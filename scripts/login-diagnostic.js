import assert from 'node:assert/strict';

async function runDiagnostic() {
  const url = 'http://localhost:3001/api/auth/login';
  console.log(`==> Testing login endpoint at ${url}...`);

  // 1. Test missing secret
  try {
    const res1 = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    console.log('Missing secret status:', res1.status);
    const data1 = await res1.json();
    console.log('Missing secret body:', data1);
    assert.equal(res1.status, 400);
  } catch (err) {
    console.error('Failed or server not running on 3001:', err.message);
    process.exit(1);
  }

  // 2. Test wrong secret
  const res2 = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ secret: 'wrong-secret' }),
  });
  console.log('Wrong secret status:', res2.status);
  const data2 = await res2.json();
  console.log('Wrong secret body:', data2);
  assert.equal(res2.status, 401);

  // 3. Test correct secret (guardian8)
  const res3 = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ secret: 'guardian8' }),
  });
  console.log('Correct secret status:', res3.status);
  const data3 = await res3.json();
  console.log('Correct secret body:', data3);
  assert.equal(res3.status, 200);
  assert.equal(data3.success, true);
  assert.ok(data3.token, 'Token should be returned');
  console.log('==> Login diagnostic test PASSED successfully!');
}

runDiagnostic();

# Scanner History Popup & Pagination Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance the Scanner "Tampilkan Semua" history modal into a full popup view featuring a top-left close button, click-outside-to-close backdrop, and 10-item pagination.

**Architecture:** Create a pure pagination utility helper `src/scanHistory.js` with tests in `src/scanHistory.test.mjs`, and update `src/App.jsx` modal state and JSX elements.

**Tech Stack:** React (Next.js client component), Tailwind CSS, Node.js native test runner (`node --test`).

**Spec:** User feature request for Scanner history popup page ("Tampilkan Semua" popup with top-left 'X' close button, backdrop click closing, and pagination for > 10 items).

## Global Constraints

- Keep existing scan history card layout, copy product name, delete, image preview, and Google Maps actions intact.
- Pagination page size is fixed at 10 items per page.
- Close button ('✕') positioned at top-left corner of the modal header.
- Backdrop click closes the modal without affecting inner dialog clicks.
- Do not run `npm run build` while `npm run dev` is active (per project memory rules).

## Review Focus

1. Backdrop click outside modal container closes the popup (`setShowAllScanHistoryModal(false)`).
2. Clicking inside the modal container does NOT close the popup (`e.stopPropagation()`).
3. Top-left close button ('✕') closes the popup.
4. Pagination controls (Prev / Next / Page counter) render whenever item count exceeds 10.
5. Opening the "Tampilkan Semua" popup resets active page to 1.

---

### Task 1: Create scan history pagination helper and test suite

**Files:**
- Create: `src/scanHistory.js`
- Create: `src/scanHistory.test.mjs`

**Interfaces:**
- Consumes: Raw scan history array (`Array<Object>`), current page (`number`), optional page size (`number`, default 10)
- Produces: `getPaginatedScanHistory(items, page, pageSize)` returning `{ slicedItems: Array, totalPages: number, currentPage: number, hasPrev: boolean, hasNext: boolean }`

- [ ] **Step 1: Write the failing test**

```js
// src/scanHistory.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';
import { getPaginatedScanHistory } from './scanHistory.js';

test('getPaginatedScanHistory paginates list correctly', () => {
  const items = Array.from({ length: 25 }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}` }));
  const page1 = getPaginatedScanHistory(items, 1, 10);

  assert.equal(page1.totalPages, 3);
  assert.equal(page1.currentPage, 1);
  assert.equal(page1.hasPrev, false);
  assert.equal(page1.hasNext, true);
  assert.equal(page1.slicedItems.length, 10);
  assert.equal(page1.slicedItems[0].id, 1);
  assert.equal(page1.slicedItems[9].id, 10);

  const page3 = getPaginatedScanHistory(items, 3, 10);
  assert.equal(page3.currentPage, 3);
  assert.equal(page3.hasPrev, true);
  assert.equal(page3.hasNext, false);
  assert.equal(page3.slicedItems.length, 5);
  assert.equal(page3.slicedItems[0].id, 21);
});

test('getPaginatedScanHistory handles empty list and out of bound pages', () => {
  const empty = getPaginatedScanHistory([], 1, 10);
  assert.equal(empty.totalPages, 1);
  assert.equal(empty.currentPage, 1);
  assert.equal(empty.slicedItems.length, 0);

  const items = Array.from({ length: 15 }, (_, i) => ({ id: i + 1 }));
  const clampedPage = getPaginatedScanHistory(items, 99, 10);
  assert.equal(clampedPage.currentPage, 2);
  assert.equal(clampedPage.slicedItems.length, 5);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/scanHistory.test.mjs`
Expected: FAIL with "Cannot find module './scanHistory.js'"

- [ ] **Step 3: Implement `getPaginatedScanHistory` in `src/scanHistory.js`**

```js
// src/scanHistory.js
export function getPaginatedScanHistory(items = [], page = 1, pageSize = 10) {
  const list = Array.isArray(items) ? items : [];
  const totalItems = list.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(Math.max(1, Number(page) || 1), totalPages);
  
  const startIndex = (currentPage - 1) * pageSize;
  const slicedItems = list.slice(startIndex, startIndex + pageSize);

  return {
    slicedItems,
    totalPages,
    currentPage,
    hasPrev: currentPage > 1,
    hasNext: currentPage < totalPages,
    totalItems
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test src/scanHistory.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/scanHistory.js src/scanHistory.test.mjs
git commit -m "feat(scanner): add pagination helper for scan history list"
```

---

### Task 2: Update Scanner History Popup in `src/App.jsx`

**Files:**
- Modify: `src/App.jsx:119-125`, `src/App.jsx:692-706`, `src/App.jsx:2407-2549`

**Interfaces:**
- Consumes: `getPaginatedScanHistory` from `./scanHistory.js`
- Produces: Enhanced `showAllScanHistoryModal` popup component with top-left close button, backdrop click closing, and paginated rendering when items > 10.

- [ ] **Step 1: Write failing integration test or state verification check**

Add test case in `src/scanHistory.test.mjs` verifying modal state helper options if applicable.

- [ ] **Step 2: Update `loadAllScanHistory` in `src/App.jsx` to reset page to 1**

In `src/App.jsx`, update `loadAllScanHistory` so `setScanHistoryPage(1)` is called whenever opening the modal:

```js
const loadAllScanHistory = async (overrideToken = null) => {
  const authToken = overrideToken || getAuthToken();
  try {
    const res = await axios.get('/api/scanner/history', {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
    });
    setAllScanHistoryList(res.data?.history || []);
    setScanHistoryPage(1);
    setShowAllScanHistoryModal(true);
  } catch (err) {
    console.warn('Gagal memuat semua scan history:', err);
  }
};
```

- [ ] **Step 3: Update `showAllScanHistoryModal` JSX overlay & header layout in `src/App.jsx`**

Import `getPaginatedScanHistory` at top of `src/App.jsx`:
`import { getPaginatedScanHistory } from './scanHistory.js';`

Replace `showAllScanHistoryModal` block in `src/App.jsx` with:
- Outer backdrop `div` gets `onClick={() => setShowAllScanHistoryModal(false)}`.
- Inner container `div` gets `onClick={(e) => e.stopPropagation()}`.
- Modal header has close button ('✕') as the **first** element (top-left / pojok kiri).
- Body uses `getPaginatedScanHistory(allScanHistoryList, scanHistoryPage, 10)` to get `slicedItems`, `totalPages`, `hasPrev`, `hasNext`.
- Pagination bar renders when `allScanHistoryList.length > 10`.

```jsx
{/* Modal All Scan History Popup */}
{showAllScanHistoryModal && (() => {
  const { slicedItems, totalPages, currentPage, hasPrev, hasNext, totalItems } = getPaginatedScanHistory(allScanHistoryList, scanHistoryPage, 10);
  return (
    <div 
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn cursor-pointer"
      onClick={() => setShowAllScanHistoryModal(false)}
    >
      <div 
        className="bg-white dark:bg-[#001A41] rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200/80 dark:border-white/10 overflow-hidden cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Top-Left Close Button */}
        <div className="p-4 border-b border-slate-200/80 dark:border-white/10 flex items-center gap-3 bg-slate-50/50 dark:bg-white/5">
          <button 
            type="button"
            onClick={() => setShowAllScanHistoryModal(false)}
            className="w-8 h-8 rounded-full bg-slate-200/60 dark:bg-white/10 hover:bg-slate-300/60 dark:hover:bg-white/20 flex items-center justify-center text-[#5A6E85] dark:text-slate-300 text-sm font-bold transition cursor-pointer shrink-0"
            title="Tutup Popup"
            aria-label="Tutup Popup"
          >
            ✕
          </button>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold font-heading text-[#0A1937] dark:text-white truncate">Semua Riwayat Scan Tersimpan</h3>
            <p className="text-[11px] text-[#5A6E85] dark:text-slate-400">
              Daftar lengkap hasil scan ({totalItems} item)
            </p>
          </div>
        </div>
        
        {/* Item List */}
        <div className="p-4 overflow-y-auto space-y-2.5 flex-1">
          {slicedItems.length === 0 ? (
            <div className="text-center py-8 text-xs text-[#5A6E85] dark:text-slate-400">Belum ada riwayat scan tersimpan.</div>
          ) : (
            slicedItems.map((item, idx) => (
              <div key={item.id || idx} className="bg-white dark:bg-[#0A1937]/80 border border-slate-200/80 dark:border-white/10 rounded-2xl p-3 flex items-start gap-3 shadow-2xs hover:border-red-500/40 transition">
                {item.image_url ? (
                  <img 
                    src={item.image_url} 
                    alt={item.product_name} 
                    onClick={() => setPreviewImageUrl(item.image_url)}
                    className="w-16 h-16 rounded-xl object-cover shrink-0 border border-slate-100 dark:border-white/10 cursor-pointer hover:opacity-90 transition hover:scale-102" 
                    title="Klik untuk memperbesar gambar"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-400 dark:text-slate-300 flex items-center justify-center shrink-0 text-2xl font-bold border border-slate-200/60 dark:border-white/10">
                    📷
                  </div>
                )}
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <span className="text-sm font-bold text-[#0A1937] dark:text-white truncate" title={item.product_name}>{item.product_name}</span>
                      <button
                        type="button"
                        onClick={() => handleCopyHistoryTitle(item.product_name, `modal-${item.id || idx}`)}
                        className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition shrink-0 flex items-center"
                        title="Salin Nama Produk"
                      >
                        {copiedHistoryId === `modal-${item.id || idx}` ? (
                          <Check size={14} className="text-emerald-600 dark:text-emerald-400 font-bold" />
                        ) : (
                          <Copy size={14} />
                        )}
                      </button>
                    </div>
                    {item.id && (
                      <button
                        onClick={() => deleteScanHistoryItem(item.id)}
                        className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition shrink-0"
                        title="Hapus riwayat scanner ini"
                        aria-label="Hapus riwayat scanner"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>

                  <div className="flex items-baseline justify-between gap-2 pt-0.5">
                    <div className="text-xs text-[#5A6E85] dark:text-slate-400 font-medium">
                      {item.price_jpy != null ? `¥${Number(item.price_jpy).toLocaleString('id-ID')}` : '-'}
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 leading-tight">
                        {item.lowest_price_idr != null ? `Rp ${Number(item.lowest_price_idr).toLocaleString('id-ID')}` : 'Harga N/A'}
                      </div>
                      <div className="text-[10px] font-medium text-[#5A6E85] dark:text-slate-400">Estimasi Indo</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 text-[11px] text-[#5A6E85] dark:text-slate-400 pt-0.5">
                    <span>{item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</span>
                    <div className="flex items-center gap-1.5">
                      {(item.location_name || item.locationName) && (
                        <span className="text-[10px] text-emerald-800 dark:text-emerald-300 bg-emerald-50/80 dark:bg-emerald-500/10 px-2 py-0.5 rounded-md font-semibold flex items-center gap-1 border border-emerald-100 dark:border-emerald-500/20">
                          <span>{getCountryFlagFromCoords(item.latitude, item.longitude, item.location_name || item.locationName)}</span>
                          <span className="truncate max-w-[100px]">{item.location_name || item.locationName}</span>
                        </span>
                      )}
                      {item.latitude != null && item.longitude != null && (
                        <a
                          href={`https://www.google.com/maps?q=${item.latitude},${item.longitude}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2 py-0.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 rounded-md font-semibold text-[10px] flex items-center gap-0.5 transition border border-blue-100 dark:border-blue-500/20"
                          title="Buka Lokasi Scan di Google Maps"
                        >
                          Maps ↗
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer / Pagination Controls */}
        <div className="p-3 border-t border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 flex items-center justify-between">
          {totalItems > 10 ? (
            <div className="flex items-center gap-2">
              <button
                disabled={!hasPrev}
                onClick={() => setScanHistoryPage(prev => Math.max(prev - 1, 1))}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-200/60 dark:bg-white/10 text-[#0A1937] dark:text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-300/60 dark:hover:bg-white/20 transition cursor-pointer"
              >
                ← Prev
              </button>
              <span className="text-xs text-[#5A6E85] dark:text-slate-400 font-medium">
                {currentPage} / {totalPages}
              </span>
              <button
                disabled={!hasNext}
                onClick={() => setScanHistoryPage(prev => Math.min(prev + 1, totalPages))}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-200/60 dark:bg-white/10 text-[#0A1937] dark:text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-300/60 dark:hover:bg-white/20 transition cursor-pointer"
              >
                Next →
              </button>
            </div>
          ) : (
            <div />
          )}
          <button
            onClick={() => setShowAllScanHistoryModal(false)}
            className="px-4 py-2 bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-[#0A1937] dark:text-white text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
})()}
```

- [ ] **Step 4: Run test suite**

Run: `npm run test`
Expected: PASS 100%

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx
git commit -m "feat(scanner): update scanner all history popup with top-left close button and backdrop click closing"
```

---

## Self-Review

1. **Spec coverage**:
   - Popup page for scanner history list: Covered in Task 2.
   - Top-left close button ('X'): Covered in Task 2 (placed as first child of header).
   - Click outside space to close: Covered in Task 2 (backdrop `onClick`, inner card `e.stopPropagation()`).
   - Pagination for > 10 items: Covered in Task 1 & Task 2 (`getPaginatedScanHistory` helper & footer pagination bar).
2. **Step scan**: Each step has explicit commands, expected outcomes, and exact signatures/code blocks.
3. **Type consistency**: `getPaginatedScanHistory` parameters and object return properties match across helper and JSX usage.
4. **Review Focus**:
   - Backdrop click closing popup tested/verified.
   - Inner card propagation stop verified.
   - Top-left close button position verified.
   - Pagination behavior (>10 items) verified.
5. **Proportion**: Concise, focused plan.

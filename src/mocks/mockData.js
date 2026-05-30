// Deterministic mock dataset for offline development.
// This stands in for the backend while VITE_USE_MOCK=true. Every record
// shape here mirrors what the real API is expected to return — see
// src/api/*.js for the matching endpoint contracts.
import { CITIES, CATEGORIES, PROMO_DEFS } from '../utils/constants';

const FIRST_NAMES = ['Andi', 'Sari', 'Budi', 'Wulan', 'Reza', 'Dewi', 'Iqbal', 'Citra', 'Faisal', 'Maya', 'Joko', 'Lia', 'Bayu', 'Nina', 'Tegar', 'Putri', 'Hadi', 'Risa', 'Galih', 'Yuni', 'Dimas', 'Fitri', 'Rama', 'Tania', 'Ilham', 'Mega', 'Adit', 'Sinta', 'Bima', 'Hana', 'Yoga', 'Anggi', 'Reno', 'Ratna', 'Dito', 'Karin'];
const LAST_NAMES = ['Pratama', 'Saputra', 'Wijaya', 'Susanti', 'Hidayat', 'Permata', 'Lestari', 'Nugroho', 'Anggraini', 'Setiawan', 'Halim', 'Yulianti', 'Wibowo', 'Kusuma', 'Rahman', 'Putri', 'Santoso', 'Maharani'];

// Seeded PRNG so the dataset is identical on every reload.
function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(42);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const randInt = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));
const randFloat = (lo, hi) => lo + rand() * (hi - lo);

function phoneFor(i) {
  const tail = String(8000000000 + i * 13 + 17).slice(-10);
  return '+628' + tail.slice(0, 9);
}
function codeFor() {
  // exclude ambiguous 0/O and 1/I per FLOW spec
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let k = 0; k < 6; k++) s += chars[Math.floor(rand() * chars.length)];
  return 'WA-' + s;
}

function buildCustomers(n = 64) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const name = pick(FIRST_NAMES) + ' ' + pick(LAST_NAMES);
    const since = randInt(15, 720);
    const recency = randInt(2, 180);
    const freq = randInt(1, 22);
    const totalSpend = Math.round(randFloat(120_000, 4_500_000));
    const avg = Math.round(totalSpend / Math.max(freq, 1));

    const r = recency > 80 ? 1 : recency > 50 ? 2 : recency > 30 ? 3 : recency > 14 ? 4 : 5;
    const f = freq < 2 ? 1 : freq < 4 ? 2 : freq < 7 ? 3 : freq < 12 ? 4 : 5;
    const m = totalSpend < 400_000 ? 1 : totalSpend < 900_000 ? 2 : totalSpend < 1_500_000 ? 3 : totalSpend < 2_500_000 ? 4 : 5;
    const combined = r + f + m;

    const rules = [];
    if (recency > 30) rules.push('R01');
    if (freq < 3 && recency > 20) rules.push('R02');
    if (totalSpend >= 1_500_000 && recency > 14) rules.push('R03');
    if (freq === 1) rules.push('R04');

    const atRisk = combined < 8 || r <= 2 || rules.length > 0;
    if (!atRisk) continue;

    let risk = 'LOW';
    if (r === 1 || rules.includes('R01') || rules.includes('R03')) risk = 'HIGH';
    else if (r === 2 || rules.includes('R02') || rules.includes('R04')) risk = 'MEDIUM';

    let promoCode = 'POINTS2X';
    if (risk === 'HIGH' && totalSpend >= 1_500_000) promoCode = 'BACK30';
    else if (risk === 'HIGH') promoCode = 'BACK20';
    else if (risk === 'MEDIUM' && rules.includes('R02')) promoCode = 'SHIP15';
    else if (risk === 'MEDIUM' && rules.includes('R04')) promoCode = 'BOGO1';

    out.push({
      id: 'C' + String(10000 + i).slice(1),
      name,
      phone: phoneFor(i),
      city: pick(CITIES),
      topCategory: pick(CATEGORIES),
      createdAt: new Date(Date.now() - since * 86_400_000).toISOString().slice(0, 10),
      lastPurchase: new Date(Date.now() - recency * 86_400_000).toISOString().slice(0, 10),
      daysSinceLastPurchase: recency,
      purchaseCount: freq,
      totalSpend,
      avgOrderValue: avg,
      rfm: { r, f, m, combined },
      rules,
      risk,
      promoCode,
      uniqueCode: codeFor(),
      isUnsubscribed: rand() < 0.04,
      lastSentAt: rand() < 0.25 ? new Date(Date.now() - randInt(8, 60) * 86_400_000).toISOString() : null,
    });
  }
  const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  out.sort((a, b) => order[a.risk] - order[b.risk] || b.daysSinceLastPurchase - a.daysSinceLastPurchase);
  return out;
}

function buildBlastHistory() {
  const now = Date.now();
  return [
    { id: 'blast_8a1c', started: now - 2 * 86_400_000, total: 312, sent: 304, failed: 8, mode: 'mock', template: 'reengagement_promo', redeemed: 41 },
    { id: 'blast_71fe', started: now - 5 * 86_400_000, total: 198, sent: 196, failed: 2, mode: 'mock', template: 'reengagement_promo', redeemed: 28 },
    { id: 'blast_5d22', started: now - 9 * 86_400_000, total: 420, sent: 411, failed: 9, mode: 'meta', template: 'reengagement_promo', redeemed: 73 },
    { id: 'blast_2b09', started: now - 14 * 86_400_000, total: 117, sent: 117, failed: 0, mode: 'mock', template: 'reengagement_promo', redeemed: 12 },
    { id: 'blast_9c44', started: now - 21 * 86_400_000, total: 488, sent: 470, failed: 18, mode: 'meta', template: 'reengagement_promo', redeemed: 95 },
  ];
}

function buildDispatchLog(customers) {
  const subset = customers.slice(0, 22);
  return subset.map((c, i) => {
    const status = i === 4 || i === 11 ? 'failed' : 'mocked';
    return {
      id: i + 1,
      blastId: 'blast_8a1c',
      customerId: c.id,
      name: c.name,
      phone: c.phone,
      code: c.uniqueCode,
      status,
      errorCode: status === 'failed' ? (i === 4 ? '400' : '429') : null,
      errorReason: status === 'failed' ? (i === 4 ? 'Invalid recipient (E.164 parse)' : 'Rate-limit retry exhausted') : null,
      sentAt: new Date(Date.now() - 2 * 86_400_000 + i * 60_000).toISOString(),
    };
  });
}

function buildPromoCodes(customers) {
  return customers.slice(0, 18).map((c, i) => {
    const status = i < 3 ? 'redeemed' : i < 5 ? 'cancelled' : i < 12 ? 'active' : 'pending';
    const issued = Date.now() - randInt(1, 14) * 86_400_000;
    return {
      code: c.uniqueCode,
      customerId: c.id,
      name: c.name,
      promoCode: c.promoCode,
      promoValue: PROMO_DEFS[c.promoCode].value,
      issuedAt: new Date(issued).toISOString(),
      expiresAt: new Date(issued + 7 * 86_400_000).toISOString(),
      status,
      redeemedAt: status === 'redeemed' ? new Date(issued + randInt(1, 5) * 86_400_000).toISOString() : null,
    };
  });
}

// Built once at module load. Mutations (redeem etc.) persist for the session.
export const mockCustomers = buildCustomers(64);
export const mockBlasts = buildBlastHistory();
export const mockDispatch = buildDispatchLog(mockCustomers);
export const mockPromoCodes = buildPromoCodes(mockCustomers);

export const mockPromoPerformance = [
  { promoCode: 'BACK30', sent: 420, redeemed: 92 },
  { promoCode: 'BACK20', sent: 612, redeemed: 88 },
  { promoCode: 'SHIP15', sent: 318, redeemed: 41 },
  { promoCode: 'BOGO1', sent: 204, redeemed: 19 },
  { promoCode: 'POINTS2X', sent: 180, redeemed: 9 },
];

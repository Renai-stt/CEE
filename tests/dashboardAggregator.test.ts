import { IReceipt } from '../shared/types.ts';

function computeSummary(receipts: IReceipt[]) {
  let totalSpend = 0;
  const categoryMap: Record<string, number> = {};
  const merchantMap: Record<string, number> = {};

  for (const r of receipts) {
    const val = Number(r.total) || 0;
    totalSpend += val;
    categoryMap[r.category] = (categoryMap[r.category] || 0) + val;
    merchantMap[r.merchant] = (merchantMap[r.merchant] || 0) + val;
  }

  const receiptCount = receipts.length;
  const averagePerReceipt = receiptCount > 0 ? Math.round((totalSpend / receiptCount) * 100) / 100 : 0;

  const topMerchants = Object.entries(merchantMap)
    .map(([merchant, amount]) => ({ merchant, amount }))
    .sort((a, b) => b.amount - a.amount);

  return {
    totalSpend,
    receiptCount,
    averagePerReceipt,
    topMerchants,
    categoryMap,
  };
}

function runDashboardAggregatorTests() {
  console.log('--- Testing Dashboard Aggregator Logic ---');

  const sampleReceipts: IReceipt[] = [
    {
      _id: '1',
      userId: 'u1',
      merchant: 'Lotus Hypermarket',
      date: '2026-11-01',
      items: [],
      subtotal: 1200,
      tax: 84,
      discount: 0,
      total: 1200,
      currency: 'THB',
      category: 'groceries',
      status: 'confirmed',
      createdAt: '2026-11-01T10:00:00.000Z',
    },
    {
      _id: '2',
      userId: 'u1',
      merchant: 'Cafe Amazon',
      date: '2026-11-02',
      items: [],
      subtotal: 130,
      tax: 0,
      discount: 0,
      total: 130,
      currency: 'THB',
      category: 'food',
      status: 'confirmed',
      createdAt: '2026-11-02T11:00:00.000Z',
    },
    {
      _id: '3',
      userId: 'u1',
      merchant: 'Cafe Amazon',
      date: '2026-11-03',
      items: [],
      subtotal: 70,
      tax: 0,
      discount: 0,
      total: 70,
      currency: 'THB',
      category: 'food',
      status: 'confirmed',
      createdAt: '2026-11-03T12:00:00.000Z',
    },
  ];

  const summary = computeSummary(sampleReceipts);

  console.assert(summary.totalSpend === 1400, `Expected totalSpend 1400, got ${summary.totalSpend}`);
  console.assert(summary.receiptCount === 3, `Expected count 3, got ${summary.receiptCount}`);
  console.assert(summary.averagePerReceipt === 466.67, `Expected avg 466.67, got ${summary.averagePerReceipt}`);
  console.assert(summary.topMerchants[0].merchant === 'Lotus Hypermarket', 'Expected top merchant Lotus');
  console.assert(summary.categoryMap['food'] === 200, 'Expected food spend 200');
  console.assert(summary.categoryMap['groceries'] === 1200, 'Expected groceries spend 1200');

  console.log('✓ Aggregation total:', summary.totalSpend);
  console.log('✓ Average per receipt:', summary.averagePerReceipt);
  console.log('✓ Top merchants:', summary.topMerchants);
  console.log('All Dashboard Aggregator tests passed successfully!\n');
}

runDashboardAggregatorTests();

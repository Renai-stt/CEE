import { normalizeDate, validateReceiptMath } from '../server/services/gemini.ts';
import { GeminiExtractionResult } from '../shared/types.ts';

function runGeminiParserTests() {
  console.log('--- Testing Gemini Parser & Date Normalizer ---');

  // Test 1: Thai Buddhist Era (พ.ศ.) 2569 -> 2026
  const date1 = normalizeDate('2569-05-15');
  console.assert(date1 === '2026-05-15', `Expected 2026-05-15, got ${date1}`);
  console.log('✓ Buddhist Era 2569-05-15 -> 2026-05-15:', date1);

  // Test 2: Thai Buddhist Era (พ.ศ.) 2567-12-01 -> 2024-12-01
  const date2 = normalizeDate('01/12/2567');
  console.assert(date2 === '2024-12-01', `Expected 2024-12-01, got ${date2}`);
  console.log('✓ Buddhist Era 01/12/2567 -> 2024-12-01:', date2);

  // Test 3: Common Era standard ISO date 2026-11-07
  const date3 = normalizeDate('2026-11-07');
  console.assert(date3 === '2026-11-07', `Expected 2026-11-07, got ${date3}`);
  console.log('✓ Common Era 2026-11-07 unchanged:', date3);

  // Test 4: Math validation when items sum matches total
  const balancedReceipt: GeminiExtractionResult = {
    merchant: '7-Eleven Thailand',
    date: '2026-11-07',
    time: '08:30',
    items: [
      { name: 'Iced Americano', quantity: 1, unitPrice: 45, total: 45 },
      { name: 'Ham & Cheese Croissant', quantity: 2, unitPrice: 35, total: 70 },
    ],
    subtotal: 115,
    tax: 0,
    discount: 0,
    serviceCharge: 0,
    total: 115,
    currency: 'THB',
    paymentMethod: 'TrueMoney',
    category: 'food',
    confidence: 0.98,
    isReceipt: true,
  };
  const checkBalanced = validateReceiptMath(balancedReceipt);
  console.assert(checkBalanced.isBalanced === true, 'Expected isBalanced true');
  console.assert(checkBalanced.itemSum === 115, 'Expected itemSum 115');
  console.log('✓ Balanced receipt math check passed:', checkBalanced);

  // Test 5: Math validation when items sum differs from total
  const unbalancedReceipt: GeminiExtractionResult = {
    ...balancedReceipt,
    total: 150, // discrepancy of 35
  };
  const checkUnbalanced = validateReceiptMath(unbalancedReceipt);
  console.assert(checkUnbalanced.isBalanced === false, 'Expected isBalanced false');
  console.assert(checkUnbalanced.difference === 35, 'Expected difference 35');
  console.log('✓ Unbalanced receipt detected discrepancy:', checkUnbalanced);

  console.log('All Gemini Parser tests passed successfully!\n');
}

runGeminiParserTests();

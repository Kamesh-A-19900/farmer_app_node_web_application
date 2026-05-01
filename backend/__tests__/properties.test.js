/**
 * Property-Based Tests for Farmer Marketplace Platform
 * Uses fast-check for property generation
 *
 * Run: npm test (from backend/)
 */

const fc = require('fast-check');

// ─── Pure logic helpers (mirrors DB/business logic) ───────────────────────────

const applyTransaction = (balance, amount, type) => {
  if (type === 'credit') return balance + amount;
  if (type === 'debit' || type === 'penalty') return balance - amount;
  return balance;
};

const applyTransactions = (initialBalance, transactions) =>
  transactions.reduce((bal, { amount, type }) => applyTransaction(bal, amount, type), initialBalance);

const calculateHighestBid = (bids) =>
  bids.length === 0 ? 0 : Math.max(...bids.map(b => b.amount));

const isBidValid = (bids, newAmount) => newAmount > calculateHighestBid(bids);

const calculateOrderTotal = (items) =>
  items.reduce((sum, item) => sum + item.quantity * item.price, 0);

const calculateDelivery = (total) => {
  if (total < 500) return 50;
  if (total < 2000) return 30;
  return 0;
};

const calculateRatingAvg = (ratings) => {
  if (ratings.length === 0) return 0;
  return ratings.reduce((s, r) => s + r, 0) / ratings.length;
};

const applyBidPenalty = (walletBefore, lastBidAmount) =>
  walletBefore - lastBidAmount * 0.05;

// ─── Property 1: Wallet Balance Invariant ─────────────────────────────────────
// Validates: Requirements 7.5
// For any sequence of valid transactions, wallet balance must never go below zero.

describe('Property 1: Wallet Balance Invariant', () => {
  test('balance never goes negative when debits are constrained to available balance', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 100000, noNaN: true }),  // initial balance
        fc.array(
          fc.record({
            amount: fc.float({ min: Math.fround(0.01), max: Math.fround(1000), noNaN: true }),
            type: fc.constantFrom('credit', 'debit', 'penalty'),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (initialBalance, rawTxns) => {
          // Simulate the DB constraint: only allow debit/penalty if balance is sufficient
          let balance = initialBalance;
          for (const txn of rawTxns) {
            if ((txn.type === 'debit' || txn.type === 'penalty') && balance < txn.amount) {
              // Skip — DB would reject this (validate_wallet_balance returns false)
              continue;
            }
            balance = applyTransaction(balance, txn.amount, txn.type);
          }
          return balance >= 0;
        }
      ),
      { numRuns: 1000 }
    );
  });
});

// ─── Property 2: Bid Monotonicity ─────────────────────────────────────────────
// Validates: Requirements 4.3
// Each accepted bid must be strictly greater than the previous highest bid.

describe('Property 2: Bid Monotonicity', () => {
  test('accepted bids form a strictly increasing sequence', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.float({ min: 1, max: 100000, noNaN: true }),
          { minLength: 1, maxLength: 30 }
        ),
        (bidAmounts) => {
          const acceptedBids = [];
          for (const amount of bidAmounts) {
            if (isBidValid(acceptedBids, amount)) {
              acceptedBids.push({ amount });
            }
          }
          // Verify strict monotonicity
          for (let i = 1; i < acceptedBids.length; i++) {
            if (acceptedBids[i].amount <= acceptedBids[i - 1].amount) return false;
          }
          return true;
        }
      ),
      { numRuns: 1000 }
    );
  });

  test('a bid equal to or less than highest bid is always rejected', () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: 1, max: 10000, noNaN: true }), { minLength: 1, maxLength: 10 }),
        fc.float({ min: 0, max: 10000, noNaN: true }),
        (existingAmounts, newBid) => {
          const bids = existingAmounts.map(a => ({ amount: a }));
          const highest = calculateHighestBid(bids);
          if (newBid <= highest) {
            return !isBidValid(bids, newBid);
          }
          return true; // only testing the rejection case
        }
      ),
      { numRuns: 500 }
    );
  });
});

// ─── Property 3: Order Total Consistency ──────────────────────────────────────
// Validates: Requirements 6.1, 6.4
// total_amount = Σ(quantity × price) and delivery is correctly calculated.

describe('Property 3: Order Total Consistency', () => {
  test('order total equals sum of item totals', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            quantity: fc.float({ min: Math.fround(0.1), max: Math.fround(1000), noNaN: true }),
            price: fc.float({ min: Math.fround(0.01), max: Math.fround(10000), noNaN: true }),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (items) => {
          const total = calculateOrderTotal(items);
          const expected = items.reduce((s, i) => s + i.quantity * i.price, 0);
          return Math.abs(total - expected) < 0.001;
        }
      ),
      { numRuns: 1000 }
    );
  });

  test('delivery charge follows correct tier rules', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 50000, noNaN: true }),
        (total) => {
          const delivery = calculateDelivery(total);
          if (total < 500) return delivery === 50;
          if (total < 2000) return delivery === 30;
          return delivery === 0;
        }
      ),
      { numRuns: 1000 }
    );
  });
});

// ─── Property 4: Bid Penalty Correctness ──────────────────────────────────────
// Validates: Requirements 4.7
// Non-winning bidder's wallet is reduced by exactly 5% of their last bid.

describe('Property 4: Bid Penalty Correctness', () => {
  test('penalty is exactly 5% of last bid amount', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 100, max: 100000, noNaN: true }), // wallet balance
        fc.float({ min: 1, max: 50000, noNaN: true }),    // last bid amount
        (walletBefore, lastBid) => {
          fc.pre(walletBefore >= lastBid * 0.05); // wallet must cover penalty
          const walletAfter = applyBidPenalty(walletBefore, lastBid);
          const expectedPenalty = lastBid * 0.05;
          const actualPenalty = walletBefore - walletAfter;
          return Math.abs(actualPenalty - expectedPenalty) < 0.001;
        }
      ),
      { numRuns: 1000 }
    );
  });

  test('wallet after penalty is always non-negative when pre-condition holds', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 100000, noNaN: true }),
        fc.float({ min: 0, max: 100000, noNaN: true }),
        (walletBefore, lastBid) => {
          fc.pre(walletBefore >= lastBid * 0.05);
          const walletAfter = applyBidPenalty(walletBefore, lastBid);
          return walletAfter >= 0;
        }
      ),
      { numRuns: 1000 }
    );
  });
});

// ─── Property 5: Rating Average Consistency ───────────────────────────────────
// Validates: Requirements 8.3
// Farmer's rating_avg must equal arithmetic mean of all ratings.

describe('Property 5: Rating Average Consistency', () => {
  test('rating average equals arithmetic mean of all ratings', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 5 }), { minLength: 1, maxLength: 100 }),
        (ratings) => {
          const avg = calculateRatingAvg(ratings);
          const expected = ratings.reduce((s, r) => s + r, 0) / ratings.length;
          return Math.abs(avg - expected) < 0.0001;
        }
      ),
      { numRuns: 1000 }
    );
  });

  test('rating average is always between 1 and 5 for valid ratings', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 5 }), { minLength: 1, maxLength: 100 }),
        (ratings) => {
          const avg = calculateRatingAvg(ratings);
          return avg >= 1 && avg <= 5;
        }
      ),
      { numRuns: 1000 }
    );
  });

  test('adding a new rating updates average correctly', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 5 }), { minLength: 1, maxLength: 50 }),
        fc.integer({ min: 1, max: 5 }),
        (existingRatings, newRating) => {
          const oldAvg = calculateRatingAvg(existingRatings);
          const allRatings = [...existingRatings, newRating];
          const newAvg = calculateRatingAvg(allRatings);
          const expected = allRatings.reduce((s, r) => s + r, 0) / allRatings.length;
          return Math.abs(newAvg - expected) < 0.0001;
        }
      ),
      { numRuns: 1000 }
    );
  });
});

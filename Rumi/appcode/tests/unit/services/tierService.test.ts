/**
 * Unit Tests for Tier Service Helper Functions
 *
 * Tests the exported helper functions from tierService.ts:
 * - formatSalesValue()
 * - formatProgressText()
 * - formatSalesDisplayText()
 * - generateRewardDisplayText()
 * - getRewardPriority()
 * - getExpirationInfo()
 *
 * References:
 * - API_CONTRACTS.md lines 5604-6190 (GET /api/tiers formatting rules)
 * - tierService.ts lines 136-326 (helper function implementations)
 */

import {
  formatSalesValue,
  formatProgressText,
  formatSalesDisplayText,
  generateRewardDisplayText,
  getRewardPriority,
  getExpirationInfo,
} from '@/lib/services/tierService';

// ============================================================================
// formatSalesValue() Tests
// ============================================================================
describe('formatSalesValue', () => {
  describe('sales_dollars mode', () => {
    it('formats zero as "$0"', () => {
      expect(formatSalesValue(0, 'sales_dollars')).toBe('$0');
    });

    it('formats small numbers with $ prefix', () => {
      expect(formatSalesValue(320, 'sales_dollars')).toBe('$320');
    });

    it('formats thousands with comma separator', () => {
      expect(formatSalesValue(1000, 'sales_dollars')).toBe('$1,000');
    });

    it('formats large numbers with multiple commas', () => {
      expect(formatSalesValue(1000000, 'sales_dollars')).toBe('$1,000,000');
    });

    it('formats decimal values', () => {
      // toLocaleString may round or preserve decimals based on locale
      const result = formatSalesValue(1234.56, 'sales_dollars');
      expect(result).toMatch(/^\$1,234/);
    });
  });

  describe('sales_units mode', () => {
    it('formats zero as "0 units"', () => {
      expect(formatSalesValue(0, 'sales_units')).toBe('0 units');
    });

    it('formats small numbers with units suffix', () => {
      expect(formatSalesValue(320, 'sales_units')).toBe('320 units');
    });

    it('formats thousands with comma separator', () => {
      expect(formatSalesValue(1000, 'sales_units')).toBe('1,000 units');
    });

    it('formats large numbers with multiple commas', () => {
      expect(formatSalesValue(1000000, 'sales_units')).toBe('1,000,000 units');
    });
  });
});

// ============================================================================
// formatProgressText() Tests
// ============================================================================
describe('formatProgressText', () => {
  describe('sales_dollars mode', () => {
    it('formats zero remaining as "$0 to go"', () => {
      expect(formatProgressText(0, 'sales_dollars')).toBe('$0 to go');
    });

    it('formats amount with $ and "to go"', () => {
      expect(formatProgressText(680, 'sales_dollars')).toBe('$680 to go');
    });

    it('formats thousands with comma', () => {
      expect(formatProgressText(1500, 'sales_dollars')).toBe('$1,500 to go');
    });
  });

  describe('sales_units mode', () => {
    it('formats zero remaining as "0 units to go"', () => {
      expect(formatProgressText(0, 'sales_units')).toBe('0 units to go');
    });

    it('formats amount with "units to go"', () => {
      expect(formatProgressText(680, 'sales_units')).toBe('680 units to go');
    });

    it('formats thousands with comma', () => {
      expect(formatProgressText(1500, 'sales_units')).toBe('1,500 units to go');
    });
  });
});

// ============================================================================
// formatSalesDisplayText() Tests
// ============================================================================
describe('formatSalesDisplayText', () => {
  describe('sales_dollars mode', () => {
    it('formats zero threshold as "$0+ in sales"', () => {
      expect(formatSalesDisplayText(0, 'sales_dollars')).toBe('$0+ in sales');
    });

    it('formats threshold with $ and "in sales"', () => {
      expect(formatSalesDisplayText(1000, 'sales_dollars')).toBe('$1,000+ in sales');
    });

    it('formats large thresholds with commas', () => {
      expect(formatSalesDisplayText(5000, 'sales_dollars')).toBe('$5,000+ in sales');
    });
  });

  describe('sales_units mode', () => {
    it('formats zero threshold as "0+ in units sold"', () => {
      expect(formatSalesDisplayText(0, 'sales_units')).toBe('0+ in units sold');
    });

    it('formats threshold with "in units sold"', () => {
      expect(formatSalesDisplayText(1000, 'sales_units')).toBe('1,000+ in units sold');
    });

    it('formats large thresholds with commas', () => {
      expect(formatSalesDisplayText(5000, 'sales_units')).toBe('5,000+ in units sold');
    });
  });
});

// ============================================================================
// generateRewardDisplayText() Tests
// ============================================================================
describe('generateRewardDisplayText', () => {
  describe('raffle rewards', () => {
    it('formats physical_gift raffle with display_text', () => {
      const result = generateRewardDisplayText(
        'physical_gift',
        true,
        { display_text: 'AirPods Pro' },
        null,
        null
      );
      expect(result).toBe('Chance to win AirPods Pro!');
    });

    it('formats physical_gift raffle with displayText (camelCase fallback)', () => {
      const result = generateRewardDisplayText(
        'physical_gift',
        true,
        { displayText: 'AirPods Pro' },
        null,
        null
      );
      expect(result).toBe('Chance to win AirPods Pro!');
    });

    it('formats physical_gift raffle with description fallback', () => {
      const result = generateRewardDisplayText(
        'physical_gift',
        true,
        null,
        null,
        'Wireless Earbuds'
      );
      expect(result).toBe('Chance to win Wireless Earbuds!');
    });

    it('formats physical_gift raffle with default fallback', () => {
      const result = generateRewardDisplayText('physical_gift', true, null, null, null);
      expect(result).toBe('Chance to win Prize!');
    });

    it('formats experience raffle with display_text', () => {
      const result = generateRewardDisplayText(
        'experience',
        true,
        { display_text: 'Mystery Trip' },
        null,
        null
      );
      expect(result).toBe('Chance to win Mystery Trip!');
    });

    it('formats gift_card raffle with name', () => {
      const result = generateRewardDisplayText(
        'gift_card',
        true,
        { amount: 200 },
        '$200 Gift Card',
        null
      );
      expect(result).toBe('Chance to win $200 Gift Card!');
    });

    it('formats gift_card raffle with default fallback', () => {
      const result = generateRewardDisplayText('gift_card', true, null, null, null);
      expect(result).toBe('Chance to win Gift Card!');
    });
  });

  describe('non-raffle rewards', () => {
    it('formats gift_card with name', () => {
      const result = generateRewardDisplayText(
        'gift_card',
        false,
        { amount: 50 },
        '$50 Gift Card',
        null
      );
      expect(result).toBe('$50 Gift Card');
    });

    it('formats gift_card with default fallback', () => {
      const result = generateRewardDisplayText('gift_card', false, null, null, null);
      expect(result).toBe('Gift Card');
    });

    it('formats commission_boost with name', () => {
      const result = generateRewardDisplayText(
        'commission_boost',
        false,
        { percent: 5, duration_days: 30 },
        '5% Pay Boost',
        null
      );
      expect(result).toBe('5% Pay Boost');
    });

    it('formats commission_boost with default fallback', () => {
      const result = generateRewardDisplayText('commission_boost', false, null, null, null);
      expect(result).toBe('Pay Boost');
    });

    it('formats spark_ads from valueData.amount', () => {
      const result = generateRewardDisplayText(
        'spark_ads',
        false,
        { amount: 100 },
        null,
        null
      );
      expect(result).toBe('$100 Ads Boost');
    });

    it('formats spark_ads with zero amount', () => {
      const result = generateRewardDisplayText('spark_ads', false, { amount: 0 }, null, null);
      expect(result).toBe('$0 Ads Boost');
    });

    it('formats spark_ads with null valueData', () => {
      const result = generateRewardDisplayText('spark_ads', false, null, null, null);
      expect(result).toBe('$0 Ads Boost');
    });

    it('formats discount with name', () => {
      const result = generateRewardDisplayText(
        'discount',
        false,
        { percent: 15 },
        '15% Deal Boost',
        null
      );
      expect(result).toBe('15% Deal Boost');
    });

    it('formats discount with default fallback', () => {
      const result = generateRewardDisplayText('discount', false, null, null, null);
      expect(result).toBe('Deal Boost');
    });

    it('formats physical_gift with display_text', () => {
      const result = generateRewardDisplayText(
        'physical_gift',
        false,
        { display_text: 'Branded Hoodie' },
        null,
        null
      );
      expect(result).toBe('Gift Drop: Branded Hoodie');
    });

    it('formats physical_gift with description fallback', () => {
      const result = generateRewardDisplayText(
        'physical_gift',
        false,
        null,
        null,
        'Water Bottle'
      );
      expect(result).toBe('Gift Drop: Water Bottle');
    });

    it('formats physical_gift with default fallback', () => {
      const result = generateRewardDisplayText('physical_gift', false, null, null, null);
      expect(result).toBe('Gift Drop: Gift');
    });

    it('formats experience with display_text', () => {
      const result = generateRewardDisplayText(
        'experience',
        false,
        { display_text: 'VIP Event Access' },
        null,
        null
      );
      expect(result).toBe('VIP Event Access');
    });

    it('formats experience with description fallback', () => {
      const result = generateRewardDisplayText(
        'experience',
        false,
        null,
        null,
        'Concert Tickets'
      );
      expect(result).toBe('Concert Tickets');
    });

    it('formats experience with default fallback', () => {
      const result = generateRewardDisplayText('experience', false, null, null, null);
      expect(result).toBe('Experience');
    });

    it('formats unknown type with name', () => {
      const result = generateRewardDisplayText('unknown_type', false, null, 'Custom Reward', null);
      expect(result).toBe('Custom Reward');
    });

    it('formats unknown type with description fallback', () => {
      const result = generateRewardDisplayText('unknown_type', false, null, null, 'Mystery Prize');
      expect(result).toBe('Mystery Prize');
    });

    it('formats unknown type with default fallback', () => {
      const result = generateRewardDisplayText('unknown_type', false, null, null, null);
      expect(result).toBe('Reward');
    });
  });
});

// ============================================================================
// getRewardPriority() Tests
// ============================================================================
describe('getRewardPriority', () => {
  describe('raffle rewards (highest priority)', () => {
    it('returns 1 for physical_gift raffle', () => {
      expect(getRewardPriority('physical_gift', true)).toBe(1);
    });

    it('returns 2 for experience raffle', () => {
      expect(getRewardPriority('experience', true)).toBe(2);
    });

    it('returns 3 for gift_card raffle', () => {
      expect(getRewardPriority('gift_card', true)).toBe(3);
    });
  });

  describe('non-raffle rewards', () => {
    it('returns 4 for experience', () => {
      expect(getRewardPriority('experience', false)).toBe(4);
    });

    it('returns 5 for physical_gift', () => {
      expect(getRewardPriority('physical_gift', false)).toBe(5);
    });

    it('returns 6 for gift_card', () => {
      expect(getRewardPriority('gift_card', false)).toBe(6);
    });

    it('returns 7 for commission_boost', () => {
      expect(getRewardPriority('commission_boost', false)).toBe(7);
    });

    it('returns 8 for spark_ads', () => {
      expect(getRewardPriority('spark_ads', false)).toBe(8);
    });

    it('returns 9 for discount', () => {
      expect(getRewardPriority('discount', false)).toBe(9);
    });
  });

  describe('unknown types', () => {
    it('returns 10 for unknown raffle type', () => {
      expect(getRewardPriority('unknown', true)).toBe(10);
    });

    it('returns 10 for unknown non-raffle type', () => {
      expect(getRewardPriority('unknown', false)).toBe(10);
    });
  });
});

// ============================================================================
// getExpirationInfo() Tests
// ============================================================================
describe('getExpirationInfo', () => {
  describe('Bronze tier (level 1)', () => {
    it('returns null expiration for tier level 1', () => {
      const result = getExpirationInfo(1, '2025-08-10T00:00:00Z');
      expect(result.expirationDate).toBeNull();
      expect(result.expirationDateFormatted).toBeNull();
      expect(result.showExpiration).toBe(false);
    });

    it('returns null even when nextCheckpointAt is null', () => {
      const result = getExpirationInfo(1, null);
      expect(result.expirationDate).toBeNull();
      expect(result.expirationDateFormatted).toBeNull();
      expect(result.showExpiration).toBe(false);
    });
  });

  describe('higher tiers (level > 1)', () => {
    it('returns expiration info for tier level 2', () => {
      const result = getExpirationInfo(2, '2025-08-10T00:00:00Z');
      expect(result.expirationDate).toBe('2025-08-10T00:00:00Z');
      // Use regex to match format "Month Day, Year" (timezone-independent)
      expect(result.expirationDateFormatted).toMatch(/^(August 9|August 10), 2025$/);
      expect(result.showExpiration).toBe(true);
    });

    it('returns expiration info for tier level 3', () => {
      const result = getExpirationInfo(3, '2025-12-25T00:00:00Z');
      expect(result.expirationDate).toBe('2025-12-25T00:00:00Z');
      expect(result.expirationDateFormatted).toMatch(/^December 2[45], 2025$/);
      expect(result.showExpiration).toBe(true);
    });

    it('returns expiration info for tier level 4', () => {
      const result = getExpirationInfo(4, '2026-03-15T00:00:00Z');
      expect(result.expirationDate).toBe('2026-03-15T00:00:00Z');
      expect(result.expirationDateFormatted).toMatch(/^March 1[45], 2026$/);
      expect(result.showExpiration).toBe(true);
    });

    it('handles null nextCheckpointAt gracefully for non-Bronze', () => {
      const result = getExpirationInfo(2, null);
      expect(result.expirationDate).toBeNull();
      expect(result.expirationDateFormatted).toBeNull();
      expect(result.showExpiration).toBe(true); // Still show section
    });

    it('formats date in "Month Day, Year" format', () => {
      // Use noon UTC to avoid timezone edge cases
      const result = getExpirationInfo(2, '2025-01-15T12:00:00Z');
      // Should match pattern like "January 15, 2025" or "January 14, 2025" depending on TZ
      expect(result.expirationDateFormatted).toMatch(/^\w+ \d{1,2}, 2025$/);
    });

    it('returns showExpiration true for all non-Bronze tiers', () => {
      [2, 3, 4, 5, 6].forEach(level => {
        const result = getExpirationInfo(level, '2025-06-15T12:00:00Z');
        expect(result.showExpiration).toBe(true);
      });
    });
  });
});

/**
 * Tests for Data Transformation Utility
 *
 * Covers all transformation patterns from ARCHITECTURE.md Section 7:
 * 1. snake_case → camelCase conversion
 * 2. Discount duration transformation (10080 minutes → 7 days)
 * 3. Nested JSON transformations
 * 4. Encrypted field handling (field name transform only)
 */

import {
  snakeToCamel,
  camelToSnake,
  transformToCamelCase,
  transformToSnakeCase,
  transformDurationMinutesToDays,
  transformDurationDaysToMinutes,
  transformValueData,
  transformDatabaseRow,
  transformDatabaseRows,
  pickAndTransform,
} from '@/lib/utils/transformers';

describe('snakeToCamel', () => {
  it('converts simple snake_case to camelCase', () => {
    expect(snakeToCamel('current_tier')).toBe('currentTier');
  });

  it('converts multiple underscores', () => {
    expect(snakeToCamel('tier_achieved_at')).toBe('tierAchievedAt');
  });

  it('handles single word (no underscores)', () => {
    expect(snakeToCamel('id')).toBe('id');
  });

  it('handles empty string', () => {
    expect(snakeToCamel('')).toBe('');
  });

  it('handles consecutive underscores', () => {
    expect(snakeToCamel('some__field')).toBe('some_Field');
  });
});

describe('camelToSnake', () => {
  it('converts simple camelCase to snake_case', () => {
    expect(camelToSnake('currentTier')).toBe('current_tier');
  });

  it('converts multiple capitals', () => {
    expect(camelToSnake('tierAchievedAt')).toBe('tier_achieved_at');
  });

  it('handles single word (no capitals)', () => {
    expect(camelToSnake('id')).toBe('id');
  });

  it('handles empty string', () => {
    expect(camelToSnake('')).toBe('');
  });
});

describe('transformToCamelCase', () => {
  it('transforms flat object keys from snake_case to camelCase', () => {
    const input = {
      current_tier: 'tier_3',
      tier_achieved_at: '2025-01-01T00:00:00Z',
      total_sales: 5000,
    };

    const expected = {
      currentTier: 'tier_3',
      tierAchievedAt: '2025-01-01T00:00:00Z',
      totalSales: 5000,
    };

    expect(transformToCamelCase(input)).toEqual(expected);
  });

  it('transforms nested objects recursively', () => {
    const input = {
      user_data: {
        first_name: 'John',
        last_name: 'Doe',
      },
    };

    const expected = {
      userData: {
        firstName: 'John',
        lastName: 'Doe',
      },
    };

    expect(transformToCamelCase(input)).toEqual(expected);
  });

  it('transforms arrays of objects', () => {
    const input = [
      { user_id: '1', user_name: 'Alice' },
      { user_id: '2', user_name: 'Bob' },
    ];

    const expected = [
      { userId: '1', userName: 'Alice' },
      { userId: '2', userName: 'Bob' },
    ];

    expect(transformToCamelCase(input)).toEqual(expected);
  });

  it('handles null and undefined', () => {
    expect(transformToCamelCase(null)).toBeNull();
    expect(transformToCamelCase(undefined)).toBeUndefined();
  });

  it('handles primitive values', () => {
    expect(transformToCamelCase('string')).toBe('string');
    expect(transformToCamelCase(123)).toBe(123);
    expect(transformToCamelCase(true)).toBe(true);
  });
});

describe('transformToSnakeCase', () => {
  it('transforms flat object keys from camelCase to snake_case', () => {
    const input = {
      currentTier: 'tier_3',
      tierAchievedAt: '2025-01-01T00:00:00Z',
    };

    const expected = {
      current_tier: 'tier_3',
      tier_achieved_at: '2025-01-01T00:00:00Z',
    };

    expect(transformToSnakeCase(input)).toEqual(expected);
  });

  it('transforms nested objects recursively', () => {
    const input = {
      userData: {
        firstName: 'John',
        lastName: 'Doe',
      },
    };

    const expected = {
      user_data: {
        first_name: 'John',
        last_name: 'Doe',
      },
    };

    expect(transformToSnakeCase(input)).toEqual(expected);
  });
});

describe('transformDurationMinutesToDays', () => {
  it('converts 10080 minutes to 7 days (one week)', () => {
    expect(transformDurationMinutesToDays(10080)).toBe(7);
  });

  it('converts 1440 minutes to 1 day', () => {
    expect(transformDurationMinutesToDays(1440)).toBe(1);
  });

  it('floors partial days (720 minutes = 0.5 days → 0)', () => {
    expect(transformDurationMinutesToDays(720)).toBe(0);
  });

  it('handles zero', () => {
    expect(transformDurationMinutesToDays(0)).toBe(0);
  });

  it('handles large values (30 days)', () => {
    expect(transformDurationMinutesToDays(43200)).toBe(30);
  });
});

describe('transformDurationDaysToMinutes', () => {
  it('converts 7 days to 10080 minutes', () => {
    expect(transformDurationDaysToMinutes(7)).toBe(10080);
  });

  it('converts 1 day to 1440 minutes', () => {
    expect(transformDurationDaysToMinutes(1)).toBe(1440);
  });

  it('handles zero', () => {
    expect(transformDurationDaysToMinutes(0)).toBe(0);
  });
});

describe('transformValueData', () => {
  it('transforms JSONB value_data with standard fields', () => {
    const input = {
      coupon_code: 'GOLD15',
      max_uses: 100,
    };

    const expected = {
      couponCode: 'GOLD15',
      maxUses: 100,
    };

    expect(transformValueData(input)).toEqual(expected);
  });

  it('converts duration_minutes to durationDays (special case)', () => {
    const input = {
      coupon_code: 'SUMMER20',
      duration_minutes: 10080, // 7 days
    };

    const expected = {
      couponCode: 'SUMMER20',
      durationDays: 7,
    };

    expect(transformValueData(input)).toEqual(expected);
  });

  it('handles nested objects in value_data', () => {
    const input = {
      discount_info: {
        percentage_off: 15,
        valid_until: '2025-12-31',
      },
    };

    const expected = {
      discountInfo: {
        percentageOff: 15,
        validUntil: '2025-12-31',
      },
    };

    expect(transformValueData(input)).toEqual(expected);
  });

  it('handles null and undefined', () => {
    expect(transformValueData(null)).toBeNull();
    expect(transformValueData(undefined)).toBeNull();
  });

  it('handles arrays in value_data', () => {
    const input = {
      eligible_items: [
        { item_id: '1', item_name: 'Product A' },
        { item_id: '2', item_name: 'Product B' },
      ],
    };

    const expected = {
      eligibleItems: [
        { itemId: '1', itemName: 'Product A' },
        { itemId: '2', itemName: 'Product B' },
      ],
    };

    expect(transformValueData(input)).toEqual(expected);
  });
});

describe('transformDatabaseRow', () => {
  it('transforms a complete database row', () => {
    const input = {
      id: 'uuid-123',
      current_tier: 'tier_3',
      tier_achieved_at: '2025-01-01T00:00:00Z',
      total_sales: 5000,
    };

    const expected = {
      id: 'uuid-123',
      currentTier: 'tier_3',
      tierAchievedAt: '2025-01-01T00:00:00Z',
      totalSales: 5000,
    };

    expect(transformDatabaseRow(input)).toEqual(expected);
  });

  it('transforms value_data JSONB field with special handling', () => {
    const input = {
      id: 'reward-123',
      name: 'Summer Discount',
      value_data: {
        coupon_code: 'SUMMER20',
        duration_minutes: 10080,
      },
    };

    const expected = {
      id: 'reward-123',
      name: 'Summer Discount',
      valueData: {
        couponCode: 'SUMMER20',
        durationDays: 7,
      },
    };

    expect(transformDatabaseRow(input)).toEqual(expected);
  });

  it('handles JOINed data (nested objects)', () => {
    const input = {
      id: 'mission-123',
      mission_type: 'sales',
      rewards: {
        id: 'reward-456',
        reward_type: 'discount',
      },
    };

    const expected = {
      id: 'mission-123',
      missionType: 'sales',
      rewards: {
        id: 'reward-456',
        rewardType: 'discount',
      },
    };

    expect(transformDatabaseRow(input)).toEqual(expected);
  });

  it('excludes specified fields', () => {
    const input = {
      id: 'user-123',
      email: 'test@example.com',
      password_hash: 'secret_hash',
    };

    const result = transformDatabaseRow(input, {
      excludeFields: ['password_hash'],
    });

    expect(result).toEqual({
      id: 'user-123',
      email: 'test@example.com',
    });
  });

  it('handles encrypted field names (payment_account → paymentAccount)', () => {
    // Note: Actual decryption happens in Repository Layer
    // Transformer just converts the field name
    const input = {
      id: 'boost-123',
      payment_method: 'venmo',
      payment_account: 'decrypted_user@email.com', // Already decrypted by Repository
    };

    const expected = {
      id: 'boost-123',
      paymentMethod: 'venmo',
      paymentAccount: 'decrypted_user@email.com',
    };

    expect(transformDatabaseRow(input)).toEqual(expected);
  });

  it('handles null and undefined', () => {
    expect(transformDatabaseRow(null)).toBeNull();
    expect(transformDatabaseRow(undefined)).toBeNull();
  });
});

describe('transformDatabaseRows', () => {
  it('transforms an array of database rows', () => {
    const input = [
      { user_id: '1', user_name: 'Alice' },
      { user_id: '2', user_name: 'Bob' },
    ];

    const expected = [
      { userId: '1', userName: 'Alice' },
      { userId: '2', userName: 'Bob' },
    ];

    expect(transformDatabaseRows(input)).toEqual(expected);
  });

  it('handles empty array', () => {
    expect(transformDatabaseRows([])).toEqual([]);
  });

  it('handles null and undefined', () => {
    expect(transformDatabaseRows(null)).toEqual([]);
    expect(transformDatabaseRows(undefined)).toEqual([]);
  });
});

describe('pickAndTransform', () => {
  it('picks specified fields and transforms to camelCase', () => {
    const input = {
      id: 'uuid',
      current_tier: 'tier_3',
      secret_field: 'hidden',
      internal_data: 'private',
    };

    const result = pickAndTransform(input, ['id', 'current_tier']);

    expect(result).toEqual({
      id: 'uuid',
      currentTier: 'tier_3',
    });
  });

  it('handles missing fields gracefully', () => {
    const input = {
      id: 'uuid',
      name: 'Test',
    };

    const result = pickAndTransform(input, ['id', 'missing_field']);

    expect(result).toEqual({
      id: 'uuid',
    });
  });

  it('handles null and undefined', () => {
    expect(pickAndTransform(null, ['id'])).toBeNull();
    expect(pickAndTransform(undefined, ['id'])).toBeNull();
  });
});

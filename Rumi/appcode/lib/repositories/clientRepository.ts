/**
 * Client Repository
 *
 * Data access layer for clients table.
 * Uses RPC function for findById to bypass RLS for unauthenticated routes.
 *
 * References:
 * - ARCHITECTURE.md Section 5 (Repository Layer, lines 528-640)
 * - ARCHITECTURE.md Section 9 (Multitenancy - clients table is the exception)
 * - SecurityDefiner.md Section 3.3 (Repository Changes)
 * - SchemaFinalv2.md (clients table)
 */

import { createAdminClient } from '@/lib/supabase/admin-client';
import { createClient } from '@/lib/supabase/server-client';
import type { Database } from '@/lib/types/database';

type ClientRow = Database['public']['Tables']['clients']['Row'];

/**
 * Client data returned from repository
 */
export interface ClientData {
  id: string;
  name: string;
  subdomain: string | null;
  logoUrl: string | null;
  primaryColor: string;
  tierCalculationMode: string;
  checkpointMonths: number;
  vipMetric: string;
  createdAt: string;
  updatedAt: string | null;
}

/**
 * Map database row to domain object
 */
function mapToClientData(row: ClientRow): ClientData {
  return {
    id: row.id,
    name: row.name,
    subdomain: row.subdomain,
    logoUrl: row.logo_url,
    primaryColor: row.primary_color ?? '#6366f1',
    tierCalculationMode: row.tier_calculation_mode ?? 'fixed_checkpoint',
    checkpointMonths: row.checkpoint_months ?? 4,
    vipMetric: row.vip_metric,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at,
  };
}

/**
 * Map RPC result to domain object
 * RPC function returns limited columns for security
 */
function mapRpcResultToClientData(row: {
  id: string;
  name: string;
  subdomain: string | null;
  logo_url: string | null;
  primary_color: string | null;
}): ClientData {
  return {
    id: row.id,
    name: row.name,
    subdomain: row.subdomain,
    logoUrl: row.logo_url,
    primaryColor: row.primary_color ?? '#6366f1',
    // These fields are not returned by RPC, use defaults
    tierCalculationMode: 'fixed_checkpoint',
    checkpointMonths: 4,
    vipMetric: 'units',
    createdAt: new Date().toISOString(),
    updatedAt: null,
  };
}

export const clientRepository = {
  /**
   * Find client by ID
   *
   * Uses RPC function to bypass RLS for unauthenticated routes.
   *
   * @param id - Client UUID
   * @returns Client data or null if not found
   */
  async findById(id: string): Promise<ClientData | null> {
    const supabase = createAdminClient();

    const { data, error } = await supabase.rpc('auth_get_client_by_id', {
      p_client_id: id,
    });

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      return null;
    }

    return mapRpcResultToClientData(data[0]);
  },

  /**
   * Find client by subdomain
   *
   * NOT converted to RPC - Future multi-tenant feature, not used in current auth flow.
   * MVP uses CLIENT_ID env var instead.
   *
   * @param subdomain - Client subdomain
   * @returns Client data or null if not found
   */
  async findBySubdomain(subdomain: string): Promise<ClientData | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('subdomain', subdomain)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }

    return data ? mapToClientData(data) : null;
  },
};

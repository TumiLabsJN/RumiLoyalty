"use client"

import { createContext, useContext } from "react"

interface ClientConfig {
  logoUrl: string
  privacyPolicyUrl: string
  clientName: string
  primaryColor: string
}

const ClientConfigContext = createContext<ClientConfig | null>(null)

/**
 * Context Provider for Client Configuration
 *
 * Receives config from server layout, makes it available to all child pages
 * Usage: const { logoUrl, privacyPolicyUrl } = useClientConfig()
 */
export function ClientConfigProvider({
  config,
  children
}: {
  config: ClientConfig
  children: React.ReactNode
}) {
  return (
    <ClientConfigContext.Provider value={config}>
      {children}
    </ClientConfigContext.Provider>
  )
}

/**
 * Hook to access client configuration in auth pages
 *
 * @throws Error if used outside ClientConfigProvider
 * @returns ClientConfig object with logoUrl, privacyPolicyUrl, clientName, primaryColor
 */
export function useClientConfig() {
  const context = useContext(ClientConfigContext)

  if (!context) {
    throw new Error('useClientConfig must be used within ClientConfigProvider (inside /app/login/* pages)')
  }

  return context
}

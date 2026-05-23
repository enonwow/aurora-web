import type { AuthSessionFactoryPort } from "../ports/authSessionFactoryPort";

export function createDefaultAuthSessionFactoryPort(): AuthSessionFactoryPort {
  return {
    createSession(identity) {
      const issuedAt = new Date();
      const expiresAt = new Date(issuedAt.getTime() + 1000 * 60 * 60);

      return {
        accessToken: `mock-token-${identity.id}-${issuedAt.getTime()}`,
        issuedAt: issuedAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
        user: {
          id: identity.id,
          username: identity.username,
          displayName: identity.displayName,
          role: identity.role
        }
      };
    }
  };
}

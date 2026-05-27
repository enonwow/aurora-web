import type { AuthCredentials } from "../contracts";
import { mockUsers, type MockUserRecord } from "../domain/mockUsers";
import type { AuthIdentity, AuthIdentityPort } from "../ports/authIdentityPort";

function toAuthIdentity(record: MockUserRecord): AuthIdentity {
  return {
    id: record.id,
    username: record.username,
    displayName: record.displayName,
    role: record.role
  };
}

export function createStaticMockAuthIdentityPort(
  sourceUsers: MockUserRecord[] = mockUsers
): AuthIdentityPort {
  return {
    findByCredentials(credentials: AuthCredentials) {
      const record = sourceUsers.find(
        (entry) =>
          entry.username === credentials.username &&
          entry.password === credentials.password
      );

      if (!record) {
        return null;
      }
      return toAuthIdentity(record);
    }
  };
}

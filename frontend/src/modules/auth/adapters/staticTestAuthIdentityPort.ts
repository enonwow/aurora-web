import type { AuthCredentials } from "../contracts";
import { testUsers, type TestUserRecord } from "../domain/testUsers";
import type { AuthIdentity, AuthIdentityPort } from "../ports/authIdentityPort";

function toAuthIdentity(record: TestUserRecord): AuthIdentity {
  return {
    id: record.id,
    username: record.username,
    displayName: record.displayName,
    role: record.role
  };
}

export function createStaticTestAuthIdentityPort(
  sourceUsers: TestUserRecord[] = testUsers
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

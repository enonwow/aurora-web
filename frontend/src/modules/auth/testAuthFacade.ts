import type { IAuthFacade } from "./contracts";
import { createTestAuthFacade } from "./composition/createTestAuthFacade";

export const testAuthFacade: IAuthFacade = createTestAuthFacade();

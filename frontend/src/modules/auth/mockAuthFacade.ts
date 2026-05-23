import type { IAuthFacade } from "./contracts";
import { createMockAuthFacade } from "./composition/createMockAuthFacade";

export const mockAuthFacade: IAuthFacade = createMockAuthFacade();

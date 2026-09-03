export const AREA_UPDATE_AUTHORIZATION = Symbol("AREA_UPDATE_AUTHORIZATION");

export interface AreaUpdateAuthorizationPort {
  authorize(input: Readonly<{
    actorId: string;
    moduleId: string;
    permission: "area.materialize.update";
  }>): Promise<boolean>;
}

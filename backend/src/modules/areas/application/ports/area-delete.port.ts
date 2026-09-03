export const AREA_DELETE_AUTHORIZATION = Symbol("AREA_DELETE_AUTHORIZATION");

export interface AreaDeleteAuthorizationPort {
  authorize(input: Readonly<{
    actorId: string;
    moduleId: string;
    permission: "area.materialize.delete";
  }>): Promise<boolean>;
}

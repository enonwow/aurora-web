import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthApplicationService } from "../../../application/auth.application.service";
import { IS_PUBLIC_KEY } from "./public.decorator";
import {
  hasRequiredPermissions,
  type Permission
} from "../../../domain/auth.policy";
import { PERMISSIONS_KEY } from "./permissions.decorator";
import { ROLES_KEY } from "./roles.decorator";
import type { UserRole } from "../../../domain/auth.types";
import type { AppRequest } from "../../../../../common/http/request.types";
import { AppException } from "../../../../../common/http/app-exception";

@Injectable()
export class AccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthApplicationService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AppRequest>();
    const authorization = request.headers.authorization;
    const token = extractBearerToken(authorization);
    if (!token) {
      throw new AppException({
        status: 401,
        code: "UNAUTHORIZED",
        message: "Missing or invalid bearer token."
      });
    }

    const auth = await this.authService.resolveSession(token);
    if (!auth) {
      throw new AppException({
        status: 401,
        code: "INVALID_SESSION",
        message: "Session is invalid or expired."
      });
    }

    request.auth = auth;

    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    // Deny by default when route is not explicitly role-mapped.
    if (!requiredRoles || requiredRoles.length === 0) {
      throw new AppException({
        status: 403,
        code: "FORBIDDEN_ROLE",
        message: "Access denied by default policy."
      });
    }

    if (!requiredRoles.includes(auth.user.role)) {
      throw new AppException({
        status: 403,
        code: "FORBIDDEN_ROLE",
        message: "Role is not allowed to access this resource."
      });
    }

    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()]
    ) ?? [];
    if (!hasRequiredPermissions(auth.permissions, requiredPermissions)) {
      throw new AppException({
        status: 403,
        code: "FORBIDDEN_PERMISSION",
        message: "User does not have required permissions for this action."
      });
    }

    return true;
  }
}

function extractBearerToken(value: string | string[] | undefined): string | null {
  if (!value || Array.isArray(value)) {
    return null;
  }
  const [scheme, token] = value.split(" ");
  if (scheme !== "Bearer" || !token) {
    return null;
  }
  return token.trim() || null;
}

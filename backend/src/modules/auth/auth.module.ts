import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { AppConfigService } from "../../common/config/app-config.service";
import { AuthApplicationService } from "./application/auth.application.service";
import {
  AUTH_REPOSITORY
} from "./application/ports/auth-repository.port";
import { AccessGuard } from "./adapters/inbound/http/access.guard";
import { AuthController } from "./adapters/inbound/http/auth.controller";
import {
  MemoryAuthRepository
} from "./adapters/outbound/memory/memory-auth.repository";
import {
  MySqlAuthRepository
} from "./adapters/outbound/mysql/mysql-auth.repository";

@Module({
  controllers: [AuthController],
  providers: [
    AuthApplicationService,
    MemoryAuthRepository,
    MySqlAuthRepository,
    {
      provide: AUTH_REPOSITORY,
      inject: [AppConfigService, MemoryAuthRepository, MySqlAuthRepository],
      useFactory: (
        config: AppConfigService,
        memoryRepository: MemoryAuthRepository,
        mysqlRepository: MySqlAuthRepository
      ) => {
        if (config.authRepositoryDriver === "memory") {
          return memoryRepository;
        }
        return mysqlRepository;
      }
    },
    {
      provide: APP_GUARD,
      useClass: AccessGuard
    }
  ],
  exports: [AuthApplicationService]
})
export class AuthModule {}

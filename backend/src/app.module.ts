import { Module } from "@nestjs/common";
import { APP_FILTER, APP_INTERCEPTOR } from "@nestjs/core";
import { AppConfigModule } from "./common/config/app-config.module";
import { HttpErrorFilter } from "./common/http/http-error.filter";
import { RequestContextInterceptor } from "./common/http/request-context.interceptor";
import { DatabaseModule } from "./database/database.module";
import { AuthModule } from "./modules/auth/auth.module";
import { HealthModule } from "./health/health.module";

@Module({
  imports: [AppConfigModule, DatabaseModule, AuthModule, HealthModule],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpErrorFilter
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestContextInterceptor
    }
  ]
})
export class AppModule {}

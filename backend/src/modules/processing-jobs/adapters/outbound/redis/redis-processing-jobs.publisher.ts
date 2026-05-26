import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";
import { AppConfigService } from "../../../../../common/config/app-config.service";
import type { ProcessingJobsPublisherPort } from "../../../application/ports/processing-jobs-publisher.port";
import type { ProcessingJobRecord } from "../../../domain/processing-job.types";

@Injectable()
export class RedisProcessingJobsPublisher
  implements ProcessingJobsPublisherPort, OnModuleDestroy
{
  private readonly logger = new Logger(RedisProcessingJobsPublisher.name);
  private readonly redis: Redis;
  private connectingPromise: Promise<void> | null = null;

  constructor(private readonly config: AppConfigService) {
    this.redis = new Redis(this.config.redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableReadyCheck: true
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit().catch(() => undefined);
  }

  async publishQueued(job: ProcessingJobRecord): Promise<number> {
    await this.ensureConnected();
    const payloadKey = `aurora:jobs:payload:${job.jobId}`;
    const payload = JSON.stringify(buildQueuePayload(job));

    await this.redis.set(
      payloadKey,
      payload,
      "EX",
      this.config.processingJobsPayloadTtlSeconds
    );
    return this.redis.publish(this.config.processingJobsRedisChannel, payloadKey);
  }

  async publishDeadLetter(job: ProcessingJobRecord): Promise<number> {
    await this.ensureConnected();
    const payloadKey = `aurora:jobs:dead-letter:${job.jobId}`;
    const payload = JSON.stringify(buildQueuePayload(job));

    await this.redis.set(
      payloadKey,
      payload,
      "EX",
      this.config.processingJobsPayloadTtlSeconds
    );
    return this.redis.publish(this.config.processingJobsRedisDeadLetterChannel, payloadKey);
  }

  private async ensureConnected(): Promise<void> {
    if (this.redis.status === "ready") {
      return;
    }

    if (this.connectingPromise) {
      return this.connectingPromise;
    }

    this.connectingPromise = this.redis.connect().then(
      () => {
        this.logger.log("Connected Redis processing jobs publisher.");
      },
      (error) => {
        this.logger.warn(
          `Redis processing jobs publisher connection failed: ${
            error instanceof Error ? error.message : "unknown error"
          }`
        );
        throw error;
      }
    );

    try {
      await this.connectingPromise;
    } finally {
      this.connectingPromise = null;
    }
  }
}

function buildQueuePayload(job: ProcessingJobRecord) {
  return {
    jobId: job.jobId,
    status: job.status,
    attemptCount: job.attemptCount,
    maxAttempts: job.maxAttempts,
    triggeredBy: job.triggeredBy,
    task: job.command.task,
    targetId: job.command.targetId,
    options: job.command.options,
    idempotencyKey: job.idempotencyKey,
    traceId: job.traceId,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    nextRetryAt: job.nextRetryAt,
    error: job.error
  };
}

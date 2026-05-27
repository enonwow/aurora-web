import { Injectable } from "@nestjs/common";
import type { ProcessingJobsPublisherPort } from "../../../application/ports/processing-jobs-publisher.port";
import type { ProcessingJobRecord } from "../../../domain/processing-job.types";

@Injectable()
export class NoopProcessingJobsPublisher implements ProcessingJobsPublisherPort {
  async publishQueued(_job: ProcessingJobRecord): Promise<number> {
    return 0;
  }

  async publishDeadLetter(_job: ProcessingJobRecord): Promise<number> {
    return 0;
  }
}

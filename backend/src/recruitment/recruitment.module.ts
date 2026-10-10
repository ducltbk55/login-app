import { Module } from '@nestjs/common';

import { MailModule } from '../mail/mail.module';
import { CandidateMailer } from './candidate-mailer';
import { BatchesService } from './batches.service';
import { CandidatesService } from './candidates.service';
import { JobsService } from './jobs.service';
import {
  BatchesController,
  CandidatesController,
  JobsController,
} from './recruitment.controller';

@Module({
  imports: [MailModule],
  controllers: [BatchesController, JobsController, CandidatesController],
  providers: [BatchesService, JobsService, CandidatesService, CandidateMailer],
})
export class RecruitmentModule {}

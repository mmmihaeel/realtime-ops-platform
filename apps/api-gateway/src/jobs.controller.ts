import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { OperatorId } from '@app/auth/operator-id.decorator';
import { JobService } from '@app/application/jobs/job.service';
import { CreateJobDto } from './dto/create-job.dto';
import { ListJobsQueryDto } from './dto/list-jobs-query.dto';

@ApiTags('jobs')
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobService: JobService) {}

  @Post()
  createJob(@Body() dto: CreateJobDto, @OperatorId() operatorId: string) {
    return this.jobService.create({
      name: dto.name,
      type: dto.type,
      payload: dto.payload,
      priority: dto.priority ?? 3,
      maxAttempts: dto.maxAttempts ?? 3,
      operatorId,
    });
  }

  @Get()
  listJobs(@Query() query: ListJobsQueryDto) {
    return this.jobService.list({
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      status: query.status,
      type: query.type,
      search: query.search,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder ?? 'desc',
    });
  }

  @Get(':id')
  getJob(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.jobService.getById(id);
  }

  @Get(':id/status')
  getJobStatus(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.jobService.getStatus(id);
  }

  @Post(':id/retry')
  retryJob(@Param('id', new ParseUUIDPipe()) id: string, @OperatorId() operatorId: string) {
    return this.jobService.retry(id, operatorId);
  }
}

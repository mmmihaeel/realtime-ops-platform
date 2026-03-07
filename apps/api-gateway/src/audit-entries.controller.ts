import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuditService } from '@app/application/audit/audit.service';
import { ListAuditEntriesQueryDto } from './dto/list-audit-entries-query.dto';

@ApiTags('audit')
@Controller('audit-entries')
export class AuditEntriesController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  listAuditEntries(@Query() query: ListAuditEntriesQueryDto) {
    return this.auditService.list({
      actorType: query.actorType,
      entityType: query.entityType,
      entityId: query.entityId,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
    });
  }
}

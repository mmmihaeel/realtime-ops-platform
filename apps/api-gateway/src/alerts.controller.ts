import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { OperatorId } from '@app/auth/operator-id.decorator';
import { AlertService } from '@app/application/alerts/alert.service';
import { CreateAlertDto } from './dto/create-alert.dto';
import { ListAlertsQueryDto } from './dto/list-alerts-query.dto';

@ApiTags('alerts')
@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertService: AlertService) {}

  @Post()
  createAlert(@Body() dto: CreateAlertDto, @OperatorId() operatorId: string) {
    return this.alertService.create({
      jobId: dto.jobId,
      source: 'operator',
      severity: dto.severity,
      title: dto.title,
      description: dto.description,
      operatorId,
      createIncident: dto.createIncident ?? false,
    });
  }

  @Get()
  listAlerts(@Query() query: ListAlertsQueryDto) {
    return this.alertService.list({
      status: query.status,
      severity: query.severity,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
    });
  }

  @Get(':id')
  getAlert(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.alertService.getById(id);
  }
}

import { Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { OperatorId } from '@app/auth/operator-id.decorator';
import { IncidentService } from '@app/application/incidents/incident.service';

@ApiTags('incidents')
@Controller('incidents')
export class IncidentsController {
  constructor(private readonly incidentService: IncidentService) {}

  @Post(':id/acknowledge')
  acknowledgeIncident(
    @Param('id', new ParseUUIDPipe()) id: string,
    @OperatorId() operatorId: string,
  ) {
    return this.incidentService.acknowledge(id, operatorId);
  }

  @Post(':id/resolve')
  resolveIncident(@Param('id', new ParseUUIDPipe()) id: string, @OperatorId() operatorId: string) {
    return this.incidentService.resolve(id, operatorId);
  }
}

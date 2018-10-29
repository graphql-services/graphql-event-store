import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthCheckController {
  @Get('healthcheck')
  public async check() {
    return { status: 'OK' };
    // const errors = this.healthcheckerService.check();

    // if (!!errors.length) {
    //   return InternalServerErrorException(errors); // or more configured low-level response, like failStatusCode or whatever
    // }
  }
}

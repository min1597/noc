import { Controller, Get, HttpException, Next, Request, Response } from '@nestjs/common'
import { AppService } from '../service/app.service'
import Express, { NextFunction } from 'express'
import { Exception } from 'src/resource/plugin/error.plugin'
import { EntityManager } from 'typeorm'

@Controller()
export class FirewallController {
  constructor (
  ) {  }

  @Get()
  getFirewalls (@Request() _request: Express.Request, @Next() _next: NextFunction): void {
    
  }
  
  @Get('asdf')
  getHello2(@Request() _request: Express.Request, @Response() _response: Express.Response, @Next() _next: NextFunction): void {
    _response.status(201).json({ success: true, data: { ff: true }, error: null })
  }
}

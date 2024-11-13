import { Body, Controller, Get, Headers, HttpException, Next, Param, Post, Request, Response } from '@nestjs/common'
import { AppService } from '../service/app.service'
import Express, { NextFunction } from 'express'
import { Exception } from 'src/resource/plugin/error.plugin'
import tokenPlugin from 'src/resource/plugin/token.plugin'
import utilityPlugin from 'src/resource/plugin/utility.plugin'

@Controller()
export class ManageController {
  constructor (

  ) {  }

  @Get('v0/manage')
  async getMenus (@Request() _request: Express.Request, @Response() _response: Express.Response, @Headers('authorization') _authorization: string, @Next() _next: Express.NextFunction) {
    try {
      const _sessionToken = tokenPlugin.Session.getSummary(utilityPlugin.tokenParser(_authorization))
    } catch(_error) {  }
  }
  
  @Post('v0/manage')
  async signin (@Request() _request: Express.Request, @Param('action') _action: 'user' | 'contract' | 'network', @Body() _body: {  }, @Response() _response: Express.Response, @Headers('authorization') _authorization: string, @Next() _next: Express.NextFunction) {
    _response.status(201).json({ success: true, data: { ff: true }, error: null })
  }
}

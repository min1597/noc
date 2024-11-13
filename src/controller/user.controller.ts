import { Controller, Get, Post, Body, Patch, Param, Delete, Put, Request, Response, Headers, Next, HttpStatus } from '@nestjs/common'
import * as dayjs from 'dayjs'
import * as Express from 'express'
import { getDatabaseClient } from 'src/resource/database/main'
import { Exception } from 'src/resource/plugin/error.plugin'
import utilityPlugin from 'src/resource/plugin/utility.plugin'
import { EntityManager } from 'typeorm'

@Controller()
export class UserController {
  constructor (
  ) {  }

  
  // @Get('v0/userinfo')
  // async userinfo (@Request() _request: Express.Request, @Response() _response: Express.Response, @Headers('authorization') _authorization: string, @Next() _next: Express.NextFunction) {
  //   try {
  //     const _sessionToken = await tokenPlugin.Session.getSummary(utilityPlugin.tokenParser(_authorization))
  //     if(_sessionToken.success == false) return _next(new Exception(_request, 'Failed to load session token.', HttpStatus.FORBIDDEN, _sessionToken.error))

  //     if(typeof _sessionToken.userId !== 'string') return _next(new Exception(_request, 'Not authenticated.', HttpStatus.UNAUTHORIZED))

  //     const _userinfo = await userPlugin.User.search(_sessionToken.userId)
  //     if(_userinfo.success == false) return _next(new Exception(_request, 'Failed to fetch user data.', HttpStatus.INTERNAL_SERVER_ERROR, _userinfo.error))

  //     return _response.status(200).json({ success: true, data: {
  //       id: _userinfo.id,

  //       full_name: _userinfo.fullName,
  //       nickname: _userinfo.nickname,
  //       username: _userinfo.username,

  //       phone_number: _userinfo.phoneNumber,
  //       email_address: _userinfo.emailAddress
  //     }, error: null, requested_at: new Date().toISOString() })
  //   } catch(_error) { console.log(_error); return _next(new Exception(_request, 'An unknown error has occured.', HttpStatus.INTERNAL_SERVER_ERROR, _error)) }
  // }

  // @Get('v0/user/statistics')
  // async statistics (@Request() _request: Express.Request, @Response() _response: Express.Response, @Headers('authorization') _authorization: string, @Next() _next: Express.NextFunction) {
  //   try {
  //     const _sessionToken = await tokenPlugin.Session.getSummary(utilityPlugin.tokenParser(_authorization))
  //     if(_sessionToken.success == false) return _next(new Exception(_request, 'Failed to load session token.', HttpStatus.FORBIDDEN, _sessionToken.error))

  //     if(typeof _sessionToken.userId !== 'string') return _next(new Exception(_request, 'Not authenticated.', HttpStatus.UNAUTHORIZED))

  //     const _userinfo = await userPlugin.User.search(_sessionToken.userId)
  //     if(_userinfo.success == false) return _next(new Exception(_request, 'Failed to fetch user data.', HttpStatus.INTERNAL_SERVER_ERROR, _userinfo.error))

  //     const _invoices = await getDatabaseClient().manager.getRepository(Invoice).find({ where: { user_id: _userinfo.id, is_active: true } })
  //     const _provisions = await getDatabaseClient().manager.getRepository(Provision).find({ where: { user_id: _userinfo.id, is_active: true } })

  //     return _response.status(200).json({ success: true, data: {
  //       service: {
  //         pending: _provisions.filter(_provision => _provision.status == ProvisionStatus.Pending).length,
  //         deploying: _provisions.filter(_provision => _provision.status == ProvisionStatus.Deploying).length,
  //         normal: _provisions.filter(_provision => _provision.status == ProvisionStatus.Normal).length,
  //         expired: _provisions.filter(_provision => _provision.status == ProvisionStatus.Expired).length,
  //         terminated: _provisions.filter(_provision => _provision.status == ProvisionStatus.Terminated).length
  //       },
  //       invoice: {
  //         unpaid: _invoices.filter(_invoice => _invoice.status == InvoiceStatus.Issued).length,
  //         paid: _invoices.filter(_invoice => _invoice.status == InvoiceStatus.Paid).length,
  //         refunded: _invoices.filter(_invoice => _invoice.status == InvoiceStatus.Refunded).length
  //       }
  //     }, error: null, requested_at: new Date().toISOString() })
  //   } catch(_error) { console.log(_error); return _next(new Exception(_request, 'An unknown error has occured.', HttpStatus.INTERNAL_SERVER_ERROR, _error)) }
  // }

  // @Get('v0/map')
  // async map (@Request() _request: Express.Request, @Response() _response: Express.Response, @Headers('authorization') _authorization: string, @Next() _next: Express.NextFunction) {
  //   try {
  //     const _sessionToken = await tokenPlugin.Session.getSummary(utilityPlugin.tokenParser(_authorization))
  //     if(_sessionToken.success == false) return _next(new Exception(_request, 'Failed to load session token.', HttpStatus.FORBIDDEN, _sessionToken.error))

  //     if(typeof _sessionToken.userId !== 'string') return _next(new Exception(_request, 'Not authenticated.', HttpStatus.UNAUTHORIZED))

  //     const _userinfo = await userPlugin.User.search(_sessionToken.userId)
  //     if(_userinfo.success == false) return _next(new Exception(_request, 'Failed to fetch user data.', HttpStatus.INTERNAL_SERVER_ERROR, _userinfo.error))

  //     const _providers = await getDatabaseClient().manager.getRepository(Provider).find({ where: { is_active: true }, order: { srl: 'asc' } })
  //     const _services = await Promise.all(
  //       _providers.filter(
  //         _provider =>
  //           _provider.status == ProviderStatus.Released
  //           || (_provider.status == ProviderStatus.Privated
  //             && Array.from(new Set([ ... _userinfo.permissions.map(_permission => _permission.id), ... _provider.permission ])).length !== (_userinfo.permissions.length + _provider.permission.length))
  //       ).map(async _provider => {
  //         return {
  //           id: _provider.uuid,
  //           name: _provider.name,
  //           description: _provider.description,
  //           icon: _provider.icon,
  //           route: _provider.route,
  //           permissions: _provider.permission,
  //           status: _provider.status,

  //           services: (await getDatabaseClient().manager.getRepository(Service).find({ where: { provider_id: _provider.uuid, is_active: true }, order: { srl: 'asc' } }))
  //             .map(_service => {
  //               return {
  //                 id: _service.uuid,
  //                 name: _service.name,
  //                 description: _service.description,
  //                 icon: _service.icon,
  //                 frontPath: _service.front_path,
  //                 frontAlias: [ _service.front_path, ... _service.front_alias ],
  //                 apiVersion: _service.api_version,
  //                 permissions: _service.permission,
  //                 status: _service.status
  //               }
  //             })
  //         }
  //       })
  //     )
  //     return _response.status(200).json({
  //       success: true,
  //       data:
  //         _services.filter(
  //           _provider =>
  //             _provider.status == ProviderStatus.Released
  //             || (_provider.status == ProviderStatus.Privated
  //               && Array.from(new Set([ ... _userinfo.permissions.map(_permission => _permission.id), ... _provider.permissions ])).length !== (_userinfo.permissions.length + _provider.permissions.length))
  //         ).map(_provider => {
  //           return {
  //             id: _provider.id,
  //             name: _provider.name,
  //             description: _provider.description,
  //             icon: _provider.icon,
  //             route: _provider.route,
  //             services: _provider.services.filter(
  //               _service => 
  //                 _service.status == ServiceStatus.Released
  //                 || ([ ServiceStatus.Development, ServiceStatus.Testing, ServiceStatus.Privated ].includes(_service.status)
  //                   && Array.from(new Set([ ... _userinfo.permissions.map(_permission => _permission.id), ... _service.permissions ])).length !== (_userinfo.permissions.length + _service.permissions.length))
  //             ).map(_service => {
  //               return {
  //                 id: _service.id,
  //                 name: _service.name,
  //                 description: _service.description,
  //                 icon: _service.icon,
  //                 front_path: _service.frontPath,
  //                 front_alias: _service.frontAlias,
  //                 api_version: _service.apiVersion
  //               }
  //             })
  //           }
  //         }),
  //       error: null, requested_at: new Date().toISOString() })
  //   } catch(_error) { console.log(_error); return _next(new Exception(_request, 'An unknown error has occured.', HttpStatus.INTERNAL_SERVER_ERROR, _error)) }
  // }
}

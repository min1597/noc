// import { Controller, Get, Post, Body, Patch, Param, Delete, Put, Request, Response, Headers, Next, HttpStatus } from '@nestjs/common'
// import * as dayjs from 'dayjs'
// import * as Express from 'express'
// import { User } from 'src/resource/database/entity/User.entity'
// import { Exception } from 'src/resource/plugin/error.plugin'
// import userPlugin from 'src/resource/plugin/user.plugin'
// import utilityPlugin from 'src/resource/plugin/utility.plugin'
// import * as CryptoJS from 'crypto-js'
// import { getDatabaseClient } from 'src/resource/database/main'
// import tokenPlugin from 'src/resource/plugin/token.plugin'
// import { ArrayContains } from 'typeorm'

// @Controller()
// export class ContractController {
//     constructor (
        
//     ) {  }

//     @Post('v0/contract')
//     async signin (@Request() _request: Express.Request, @Body() _body: { type: 'authorization_code', code: string, state: string } | { type: 'token', token: string }, @Response() _response: Express.Response, @Headers('authorization') _authorization: string, @Next() _next: Express.NextFunction) {
//         try {
//             const _token = utilityPlugin.tokenParser(_authorization)
//             const _sessionToken = await tokenPlugin.Session.getSummary(_token.token, _token.tokenType)
//             if(_sessionToken.success == false) return _next(new Exception(_request, 'Failed to load session token.', HttpStatus.FORBIDDEN, _sessionToken.error))
//             if(_sessionToken.userId == undefined) return _next(new Exception(_request, 'Req', HttpStatus.BAD_REQUEST))

//             const _contracts = await getDatabaseClient().manager.getRepository(Contract).find({ where: { manager_id: ArrayContains([ _sessionToken.userId ]), is_active: true } })

//             return _response.status(200).json({ success: true, data: _contracts.map(_contract => {
//                 return {
//                     id: _contract.uuid,
                    
//                 }
//             }), error: null, requested_at: new Date().toISOString() })
//         } catch(_error) { return _next(new Exception(_request, 'An unknown error has occured.', HttpStatus.INTERNAL_SERVER_ERROR, _error)) }
//     }
// }

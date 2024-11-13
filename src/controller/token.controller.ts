import { Controller, Get, Post, Body, Patch, Param, Delete, Put, Request, Response, Headers, Next, HttpStatus } from '@nestjs/common'
import * as dayjs from 'dayjs'
import * as Express from 'express'
import { Gender, User, UserStatus } from 'src/resource/database/entity/User.entity'
import { Exception } from 'src/resource/plugin/error.plugin'
import userPlugin from 'src/resource/plugin/user.plugin'
import utilityPlugin from 'src/resource/plugin/utility.plugin'
import { TokenService } from 'src/service/token.service'
import { EntityManager } from 'typeorm'
import * as useragent from 'useragent'
import * as CryptoJS from 'crypto-js'
import { getDatabaseClient } from 'src/resource/database/main'
import { Permission } from 'src/resource/database/entity/Permission.entity'

@Controller()
export class TokenController {
  constructor (
    private readonly _tokenService: TokenService
  ) { }

  @Post('v0/session')
  async newSession (@Request() _request: Express.Request, @Response() _response: Express.Response, @Next() _next: Express.NextFunction) {
    try {
      const _sessionToken = await this._tokenService.tokenPlugin.Session.createSession({ ipAddress: _request.header["x-forwarded-for"] || _request.connection.remoteAddress, agent: JSON.stringify(useragent.parse(_request.headers['user-agent']).toJSON()) })
      if(_sessionToken.success == false) return _next(new Exception(_request, 'Failed to issue session token.', HttpStatus.UNAUTHORIZED, _sessionToken.error))
      return _response.status(200).json({ success: true, data: { token: _sessionToken.token, token_type: _sessionToken.tokenType }, error: null, requested_at: new Date().toISOString() })
    } catch(_error) { return _next(new Exception(_request, 'An unknown error has occured.', HttpStatus.INTERNAL_SERVER_ERROR, _error)) }
  }

  @Get('v0/session')
  async getSession (@Request() _request: Express.Request, @Response() _response: Express.Response, @Headers('authorization') _authorization: string, @Next() _next: Express.NextFunction) {
    try {
      const _sessionToken = await this._tokenService.tokenPlugin.Session.getSummary(utilityPlugin.tokenParser(_authorization))
      if(_sessionToken.success == false) return _next(new Exception(_request, 'Failed to load session token.', HttpStatus.FORBIDDEN, _sessionToken.error))
      let _approved = false
      if(_sessionToken.userId) {
        const _users = await getDatabaseClient().manager.getRepository(User).find({ where: { uuid: _sessionToken.userId, is_active: true } })
        if(_users.length !== 1) return _next(new Exception(_request, 'Failed to load user data.', HttpStatus.INTERNAL_SERVER_ERROR))
        if(_users[0].status == UserStatus.Normal) _approved = true
      }
      return _response.status(200).json({ success: true, data: { token: _sessionToken.token, token_type: _sessionToken.tokenType, expires_in: dayjs(_sessionToken.expiresDate).diff(), is_authorized: _approved }, error: null, requested_at: new Date().toISOString() })
    } catch(_error) { return _next(new Exception(_request, 'An unknown error has occured.', HttpStatus.INTERNAL_SERVER_ERROR, _error)) }
  }

  @Post('v0/signin')
  async signin (@Request() _request: Express.Request, @Body() _body: { type: 'authorization_code', code: string, state: string } | { type: 'token', token: string }, @Response() _response: Express.Response, @Headers('authorization') _authorization: string, @Next() _next: Express.NextFunction) {
    try {
      const _sessionToken = await this._tokenService.tokenPlugin.Session.getSummary(utilityPlugin.tokenParser(_authorization))
      if(_sessionToken.success == false) return _next(new Exception(_request, 'Failed to load session token.', HttpStatus.FORBIDDEN, _sessionToken.error))
      if(typeof _sessionToken.userId == 'string') return _next(new Exception(_request, 'Already authorized.', HttpStatus.BAD_REQUEST))

      let _accessToken: { tokenType: 'Bearer' | 'Basic', accessToken: string & { __brand: 'TOKEN' }, refreshToken: string & { __brand: 'TOKEN' } } | null = null
      switch (_body.type) {
        case 'authorization_code':
          try {
            const _state: { provider: string, code_verifier: string, redirect_uri: string } = JSON.parse(CryptoJS.enc.Utf8.stringify(CryptoJS.enc.Base64.parse(_body.state)))
            if(_state.provider !== 'luna_accounts') return _next(new Exception(_request, 'Wrong provider.', HttpStatus.BAD_REQUEST))
            const _result = await this._tokenService.tokenPlugin.Authorization.issueToken({ type: 'code', code: _body.code, redirectUri: _state.redirect_uri, codeVerifier: _state.code_verifier })
            if(_result.success !== true) return _next(new Exception(_request, 'Failed to issue access token.', HttpStatus.INTERNAL_SERVER_ERROR, _result.error))

            _accessToken = { tokenType: _result.token.tokenType, accessToken: _result.token.accessToken, refreshToken: _result.token.refreshToken }
          } catch (_error) { return _next(new Exception(_request, 'Failed to parse Authorization code.', HttpStatus.INTERNAL_SERVER_ERROR, _error)) }
          break
        case 'token':
          try {
            const _result = await this._tokenService.tokenPlugin.Authorization.issueToken({ type: 'token', token: _body.token })
            if(_result.success !== true) return _next(new Exception(_request, 'Failed to issue access token.', HttpStatus.INTERNAL_SERVER_ERROR, _result.error))

            _accessToken = { tokenType: _result.token.tokenType, accessToken: _result.token.accessToken, refreshToken: _result.token.refreshToken }
          } catch (_error) { return _next(new Exception(_request, 'Failed to parse Authorization code.', HttpStatus.INTERNAL_SERVER_ERROR, _error)) }
          break
      }
      
      const _userinfo = await userPlugin.oAuth.getUser({ tokenType: _accessToken.tokenType, accessToken: _accessToken.accessToken })
      if(_userinfo.success == false) return _next(new Exception(_request, 'Failed to fetch user data.', HttpStatus.FORBIDDEN, _userinfo.error))

      const _users = await getDatabaseClient().manager.getRepository(User).find({ where: { related_id: _userinfo.id, is_active: true } })
      if(_users.length !== 1) {
        const _temporaryToken = await this._tokenService.tokenPlugin.Temporary.createToken({ ... _accessToken, session: _sessionToken.id })
        if(_temporaryToken.success == false) return _next(new Exception(_request, 'Failed to issue signup token.', HttpStatus.INTERNAL_SERVER_ERROR, _temporaryToken.error))
        _response.setHeader('Access-Control-Expose-Headers', 'X-Signup-Token')
        _response.setHeader('X-Signup-Token', `${ _temporaryToken.tokenType } ${ _temporaryToken.token }`)
        return _next(new Exception(_request, 'Registration is required.', HttpStatus.FORBIDDEN))
      }

      if(_users[0].status !== UserStatus.Normal) {
        switch (_users[0].status) {
          case UserStatus.Pending:
            return _next(new Exception(_request, 'Pending approval.', HttpStatus.UNAUTHORIZED))
          case UserStatus.Suspended:
            return _next(new Exception(_request, 'Suspended.', HttpStatus.FORBIDDEN))
        }
      }
      const _result = await _sessionToken.signin(_users[0].uuid)
      if(_result.success == false) return _next(new Exception(_request, 'Failed to modify token.', HttpStatus.INTERNAL_SERVER_ERROR, _result.error))

      return _response.status(200).json({ success: true, data: null, error: null, requested_at: new Date().toISOString() })
    } catch(_error) { return _next(new Exception(_request, 'An unknown error has occured.', HttpStatus.INTERNAL_SERVER_ERROR, _error)) }
  }

  @Post('v0/signup')
  async signup (@Request() _request: Express.Request, @Body() _body: { signup_token: string }, @Response() _response: Express.Response, @Headers('authorization') _authorization: string, @Next() _next: Express.NextFunction) {
    try {
      const _sessionToken = await this._tokenService.tokenPlugin.Session.getSummary(utilityPlugin.tokenParser(_authorization))
      if(_sessionToken.success == false) return _next(new Exception(_request, 'Failed to load session token.', HttpStatus.FORBIDDEN, _sessionToken.error))
      if(typeof _sessionToken.userId == 'string') return _next(new Exception(_request, 'Already signed up.', HttpStatus.BAD_REQUEST))

      const _signupToken = await this._tokenService.tokenPlugin.Temporary.getSummary(utilityPlugin.tokenParser(_body.signup_token))
      if(_signupToken.success == false) return _next(new Exception(_request, 'Failed to fetch signup token.', HttpStatus.BAD_REQUEST, _signupToken.error))

      const _accessToken = _signupToken.data as { tokenType: 'Bearer' | 'Basic', accessToken: string & { __brand: 'TOKEN' }, refreshToken: string & { __brand: 'TOKEN' }, session: string & { __brand: 'UUID' } }
      const _userinfo = await userPlugin.oAuth.getUser(_accessToken)
      if(_userinfo.success == false) return _next(new Exception(_request, 'Failed to fetch user data.', HttpStatus.BAD_REQUEST, _userinfo.error))

      const _permissions = await getDatabaseClient().manager.getRepository(Permission).find({ where: { is_default: true, is_active: true } })

      const _User = new User()
      _User.related_id = _userinfo.id
      _User.username = _userinfo.username
      _User.full_name = `${ _userinfo.profile.lastName } ${ _userinfo.profile.firstName }`
      _User.nickname = _userinfo.profile.nickname
      _User.birthday = dayjs(_userinfo.birthday).format('YYYY-MM-DD')
      _User.gender = _userinfo.gender == 'male' ? Gender.Male : Gender.Female
      _User.email_address = _userinfo.emails.filter(_email => _email.isVerified)[0].emailAddress
      _User.phone_number = _userinfo.phones.filter(_phone => _phone.isVerified)[0].phoneNumber
      _User.permission = _permissions.map(_permission => _permission.uuid)

      const _user = await getDatabaseClient().manager.save(_User)
      if(_user.status == UserStatus.Normal) {
        const _result = await _sessionToken.signin(_user.uuid)
        if(_result.success == false) return _next(new Exception(_request, 'Failed to sign in.', HttpStatus.INTERNAL_SERVER_ERROR, _result.error))
      }

      return _response.status(200).json({ success: true, data: null, error: null, requested_at: new Date().toISOString() })
    } catch(_error) { return _next(new Exception(_request, 'An unknown error has occured.', HttpStatus.INTERNAL_SERVER_ERROR, _error)) }
  }
}
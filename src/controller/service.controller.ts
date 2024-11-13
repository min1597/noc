import { Controller, Get, Post, Body, Patch, Param, Delete, Put, Request, Response, Headers, Next, HttpStatus } from '@nestjs/common'
import * as dayjs from 'dayjs'
import * as Express from 'express'
import { Additional } from 'src/resource/database/entity/product/Additional.entity'
import { Plan } from 'src/resource/database/entity/product/Plan.entity'
import { Product } from 'src/resource/database/entity/product/Product.entity'
import { Provider, ProviderStatus } from 'src/resource/database/entity/product/Provider.entity'
import { Service, ServiceStatus } from 'src/resource/database/entity/product/Service.entity'
import { Provision, ProvisionStatus } from 'src/resource/database/entity/Provision.entity'
import { getDatabaseClient } from 'src/resource/database/main'
import { Exception } from 'src/resource/plugin/error.plugin'
import paymentPlugin from 'src/resource/plugin/payment.plugin'
import tokenPlugin from 'src/resource/plugin/token.plugin'
import userPlugin from 'src/resource/plugin/user.plugin'
import utilityPlugin from 'src/resource/plugin/utility.plugin'

@Controller()
    export class ServiceController {
    constructor (
    ) {  }

    @Get('v0/:provider_id/statistics')
    async statistics (@Request() _request: Express.Request, @Response() _response: Express.Response, @Headers('authorization') _authorization: string, @Param('provider_id') _providerId: string, @Next() _next: Express.NextFunction) {
        try {
            const _sessionToken = await tokenPlugin.Session.getSummary(utilityPlugin.tokenParser(_authorization))
            if(_sessionToken.success == false) return _next(new Exception(_request, 'Failed to load session token.', HttpStatus.FORBIDDEN, _sessionToken.error))

            if(typeof _sessionToken.userId !== 'string') return _next(new Exception(_request, 'Not authenticated.', HttpStatus.UNAUTHORIZED))

            const _userinfo = await userPlugin.User.search(_sessionToken.userId)
            if(_userinfo.success == false) return _next(new Exception(_request, 'Failed to fetch user data.', HttpStatus.INTERNAL_SERVER_ERROR, _userinfo.error))

            const _provisions = await getDatabaseClient().manager.getRepository(Provision).find({ where: { provider_id: utilityPlugin.validateUUID(_providerId), user_id: _userinfo.id, is_active: true } })

            let _expiresDate: string | null = null
            switch (_providerId) {
                case '271b8c57-880b-4f5a-9400-6b57d8bb2728':
                    return _response.status(200).json({ success: true, data: {
                        activated_provision: _provisions.filter(_provision => [ ProvisionStatus.Deploying, ProvisionStatus.Normal ].includes(_provision.status)),
                        next_expires_date: [
                            ... _provisions
                                .filter(_provision => _provision.expires_date !== null)
                                .sort((_a, _b) => _a.expires_date.getTime() - _b.expires_date.getTime())
                                .map(_provision => dayjs(_provision.expires_date).format('YYYY-MM-DD'))
                            , null
                        ][0],
                        rank: 'normal'
                    }, error: null, requested_at: new Date().toISOString() })
                default:
                    return _response.status(200).json({ success: true, data: {
                        activated_provision: _provisions.filter(_provision => [ ProvisionStatus.Deploying, ProvisionStatus.Normal ].includes(_provision.status)),
                        next_expires_date: [
                            ... _provisions
                                .filter(_provision => _provision.expires_date !== null)
                                .sort((_a, _b) => _a.expires_date.getTime() - _b.expires_date.getTime())
                                .map(_provision => dayjs(_provision.expires_date).format('YYYY-MM-DD'))
                            , null
                        ][0],
                        rank: 'normal'
                    }, error: null, requested_at: new Date().toISOString() })
            }
        } catch(_error) { console.log(_error); return _next(new Exception(_request, 'An unknown error has occured.', HttpStatus.INTERNAL_SERVER_ERROR, _error)) }
    }

    @Get('v0/:service_id/provisions')
    async provisions (@Request() _request: Express.Request, @Response() _response: Express.Response, @Headers('authorization') _authorization: string, @Param('service_id') _serviceId: string, @Next() _next: Express.NextFunction) {
        try {
            const _sessionToken = await tokenPlugin.Session.getSummary(utilityPlugin.tokenParser(_authorization))
            if(_sessionToken.success == false) return _next(new Exception(_request, 'Failed to load session token.', HttpStatus.FORBIDDEN, _sessionToken.error))

            if(typeof _sessionToken.userId !== 'string') return _next(new Exception(_request, 'Not authenticated.', HttpStatus.UNAUTHORIZED))

            const _userinfo = await userPlugin.User.search(_sessionToken.userId)
            if(_userinfo.success == false) return _next(new Exception(_request, 'Failed to fetch user data.', HttpStatus.INTERNAL_SERVER_ERROR, _userinfo.error))

            const _provisions = await getDatabaseClient().manager.getRepository(Provision).find({ where: { service_id: utilityPlugin.validateUUID(_serviceId), is_active: true } })

            return _response.status(200).json({ success: true, data: await Promise.all(_provisions.map(async _provision => {
                return {
                    id: _provision.uuid,
                    name: (await getDatabaseClient().manager.getRepository(Service).find({ where: { uuid: _provision.service_id, is_active: true } }))[0].name,
                    description: _provision.description,
                    additional: _provision.additional_data,
                    status: _provision.status.toLowerCase()
                }
            })), error: null, requested_at: new Date().toISOString() })
        } catch(_error) { console.log(_error); return _next(new Exception(_request, 'An unknown error has occured.', HttpStatus.INTERNAL_SERVER_ERROR, _error)) }
    }
    
    @Get('v0/products')
    async getProducts (@Request() _request: Express.Request, @Response() _response: Express.Response, @Headers('authorization') _authorization: string, @Next() _next: Express.NextFunction) {
        try {
            const _sessionToken = await tokenPlugin.Session.getSummary(utilityPlugin.tokenParser(_authorization))
            if(_sessionToken.success == false) return _next(new Exception(_request, 'Failed to load session token.', HttpStatus.FORBIDDEN, _sessionToken.error))

            if(typeof _sessionToken.userId !== 'string') return _next(new Exception(_request, 'Not authenticated.', HttpStatus.UNAUTHORIZED))

            const _userinfo = await userPlugin.User.search(_sessionToken.userId)
            if(_userinfo.success == false) return _next(new Exception(_request, 'Failed to fetch user data.', HttpStatus.INTERNAL_SERVER_ERROR, _userinfo.error))

            const _products = await Promise.all((await getDatabaseClient().manager.getRepository(Provider).find({ where: { is_active: true }, order: { name: 'asc' } }))
                .filter(_provider => _provider.status == ProviderStatus.Released || Array.from(new Set([ ... _provider.permission, ... _userinfo.permissions.map(_permission => _permission.id) ])).length !== (_provider.permission.length + _userinfo.permissions.length))
                .map(async _provider => {
                    return {
                        id: _provider.uuid,
                        name: _provider.name,
                        icon: _provider.icon,
                        description: _provider.description,
                        services: await Promise.all((await getDatabaseClient().manager.getRepository(Service).find({ where: { provider_id: _provider.uuid, is_active: true }, order: { name: 'asc' } }))
                            .filter(_service => _service.status == ServiceStatus.Released || Array.from(new Set([ ... _service.permission, ... _userinfo.permissions.map(_permission => _permission.id) ])).length !== (_service.permission.length + _userinfo.permissions.length))
                            .map(async _service => {
                                return {
                                    id: _service.uuid,
                                    name: _service.name,
                                    icon: _service.icon,
                                    description: _service.description,
                                    plans: await Promise.all((await getDatabaseClient().manager.getRepository(Plan).find({ where: { service_id: _service.uuid, is_active: true }, order: { name: 'asc' } }))
                                        .map(async _plan => {
                                            return {
                                                id: _plan.uuid,
                                                name: _plan.name,
                                                description: _plan.description,
                                                products: await Promise.all((await getDatabaseClient().manager.getRepository(Product).find({ where: { plan_id: _plan.uuid, is_active: true }, order: { price: 'asc' } }))
                                                    .map(async _product => {
                                                        return {
                                                            id: _product.uuid,
                                                            name: _product.name,
                                                            description: _product.description,
                                                            price: _product.price,
                                                            disabled: _product.is_disabled
                                                        }
                                                    })
                                                ),
                                                additional: await Promise.all(_plan.additional.map(async _additional => {
                                                    const _additionals = await getDatabaseClient().manager.getRepository(Additional).find({ where: { uuid: _additional, is_active: true } })
                                                    if(_additionals.length !== 1) return null
                                                    return {
                                                        id: _additionals[0].uuid,
                                                        name: _additionals[0].name,
                                                        type: _additionals[0].type,
                                                        option: _additionals[0].options
                                                    }
                                                }))
                                            }
                                        })
                                    )
                                }
                            })
                        )
                    }
                })
            )

            return _response.status(200).json({ success: true, data: _products, error: null, requested_at: new Date().toISOString() })
        } catch(_error) { console.log(_error); return _next(new Exception(_request, 'An unknown error has occured.', HttpStatus.INTERNAL_SERVER_ERROR, _error)) }
    }

    @Post('v0/purchase')
    async purchase (@Request() _request: Express.Request, @Response() _response: Express.Response, @Body() _body: { provider_id: string, service_id: string, plan_id: string, product_id: string, additional: { [ name in string ]: { value: string, additional?: string } } }, @Headers('authorization') _authorization: string, @Next() _next: Express.NextFunction) {
        try {
            const _sessionToken = await tokenPlugin.Session.getSummary(utilityPlugin.tokenParser(_authorization))
            if(_sessionToken.success == false) return _next(new Exception(_request, 'Failed to load session token.', HttpStatus.FORBIDDEN, _sessionToken.error))

            if(typeof _sessionToken.userId !== 'string') return _next(new Exception(_request, 'Not authenticated.', HttpStatus.UNAUTHORIZED))

            const _userinfo = await userPlugin.User.search(_sessionToken.userId)
            if(_userinfo.success == false) return _next(new Exception(_request, 'Failed to fetch user data.', HttpStatus.INTERNAL_SERVER_ERROR, _userinfo.error))

            const _providers = await getDatabaseClient().manager.getRepository(Provider).find({ where: { uuid: utilityPlugin.validateUUID(_body.provider_id), is_active: true } })
            if(_providers.length !== 1) return _next(new Exception(_request, 'Wrong provider id.', HttpStatus.BAD_REQUEST))
            if(
                (_providers[0].status == ProviderStatus.Released
                || (Array.from(new Set([ ... _providers[0].permission, ... _userinfo.permissions.map(_permission => _permission.id) ])).length !== (_providers[0].permission.length + _userinfo.permissions.length)))
                == false
            ) return _next(new Exception(_request, 'Unauthorized provider.', HttpStatus.UNAUTHORIZED))

            const _services = await getDatabaseClient().manager.getRepository(Service).find({ where: { uuid: utilityPlugin.validateUUID(_body.service_id), is_active: true } })
            if(_services.length !== 1) return _next(new Exception(_request, 'Wrong service id.', HttpStatus.BAD_REQUEST))
            if(
                (_services[0].status == ServiceStatus.Released
                || (Array.from(new Set([ ... _services[0].permission, ... _userinfo.permissions.map(_permission => _permission.id) ])).length !== (_services[0].permission.length + _userinfo.permissions.length)))
                == false
            ) return _next(new Exception(_request, 'Unauthorized service.', HttpStatus.UNAUTHORIZED))
    

            const _plans = await getDatabaseClient().manager.getRepository(Plan).find({ where: { uuid: utilityPlugin.validateUUID(_body.plan_id), is_active: true } })
            if(_plans.length !== 1) return _next(new Exception(_request, 'Wrong plan id.', HttpStatus.BAD_REQUEST))

            const _products = await getDatabaseClient().manager.getRepository(Product).find({ where: { uuid: utilityPlugin.validateUUID(_body.product_id), is_active: true } })
            if(_products.length !== 1) return _next(new Exception(_request, 'Wrong product id.', HttpStatus.BAD_REQUEST))

            const _Provision = new Provision()
            _Provision.provider_id = _providers[0].uuid
            _Provision.service_id = _services[0].uuid
            _Provision.plan_id = _plans[0].uuid
            _Provision.product_id = _products[0].uuid
            _Provision.description = ''
            _Provision.additional_data = {  }
            _Provision.user_id = _userinfo.id
            const _provision = await getDatabaseClient().manager.getRepository(Provision).save(_Provision)

            const _suppliedAmount = Math.round(_products[0].price / 1.1)

            const _invoice = await paymentPlugin.Invoice.issue(`${ _products[0].name } 신규`, [ { name: _products[0].name, suppliedAmount: _suppliedAmount, vat: (_products[0].price - _suppliedAmount), provisionId: _provision.uuid } ], _userinfo.id)
            if(_invoice.success == false) return _next(new Exception(_request, 'Failed to issue invoice.', HttpStatus.FORBIDDEN, _invoice.error))

            return _response.status(200).json({ success: true, data: {
                id: _provision.uuid,
                invoice_id: _invoice.id
            }, error: null, requested_at: new Date().toISOString() })
        } catch(_error) { console.log(_error); return _next(new Exception(_request, 'An unknown error has occured.', HttpStatus.INTERNAL_SERVER_ERROR, _error)) }
    }
}

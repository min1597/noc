import { Controller, Get, Post, Body, Patch, Param, Delete, Put, Request, Response, Headers, Next, HttpStatus } from '@nestjs/common'
import * as dayjs from 'dayjs'
import * as Express from 'express'
import { Invoice } from 'src/resource/database/entity/Invoice.entity'
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
    export class PaymentController {
    constructor (
    ) {  }

    @Get('v0/invoices')
    async invoices (@Request() _request: Express.Request, @Response() _response: Express.Response, @Headers('authorization') _authorization: string, @Next() _next: Express.NextFunction) {
        try {
            const _sessionToken = await tokenPlugin.Session.getSummary(utilityPlugin.tokenParser(_authorization))
            if(_sessionToken.success == false) return _next(new Exception(_request, 'Failed to load session token.', HttpStatus.FORBIDDEN, _sessionToken.error))

            if(typeof _sessionToken.userId !== 'string') return _next(new Exception(_request, 'Not authenticated.', HttpStatus.UNAUTHORIZED))

            const _userinfo = await userPlugin.User.search(_sessionToken.userId)
            if(_userinfo.success == false) return _next(new Exception(_request, 'Failed to fetch user data.', HttpStatus.INTERNAL_SERVER_ERROR, _userinfo.error))

            const _invoices = await getDatabaseClient().manager.getRepository(Invoice).find({ where: { user_id: _userinfo.id, is_active: true } })


            return _response.status(200).json({ success: true, data: {
                invoices: _invoices.map(_invoice => {
                    return {
                        id: _invoice.uuid,
                        name: _invoice.name,
                        total_amount: _invoice.supplied_amount + _invoice.vat,
                        supplied_amount: _invoice.supplied_amount,
                        vat: _invoice.vat,
                        created_at: _invoice.created_date.toISOString(),
                        expires_at: _invoice.expires_date.toISOString(),
                        status: dayjs(_invoice.expires_date).diff() <= 0 ? 'EXPIRED' : _invoice.status.toUpperCase(),
                        issuer: 'Luna Payments',
                        products: _invoice.products.map(_product => { return { name: _product.name, supplied_amount: _product.supplied_amount, vat: _product.vat } })
                    }
                })
            }, error: null, requested_at: new Date().toISOString() })
        } catch(_error) { return _next(new Exception(_request, 'An unknown error has occured.', HttpStatus.INTERNAL_SERVER_ERROR, _error)) }
    }
}

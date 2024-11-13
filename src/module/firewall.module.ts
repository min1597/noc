import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common'
import { EntityManager } from 'typeorm'

@Module({
    imports: [  ],
    controllers: [  ],
    providers: [  ],
})

export class FirewallModule implements NestModule {
    configure(_consumer: MiddlewareConsumer) {
        // _consumer
        //     .apply(externalMiddleware)
        //     .forRoutes('*')
    }
}
  
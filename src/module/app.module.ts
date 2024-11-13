import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { AppController } from '../controller/main.controller'
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm'
import { typeOrmConfig } from 'src/resource/config/typeorm.config'
import { ConfigModule } from '@nestjs/config'
import { RequestMiddleware } from 'src/middleware/request.middleware'

@Module({
  imports: [ ConfigModule.forRoot({ isGlobal: true }), TypeOrmModule.forRoot(typeOrmConfig as TypeOrmModuleOptions) ],
  controllers: [ AppController ],
  providers: [  ]
})
export class AppModule implements NestModule {
  configure(_consumer: MiddlewareConsumer) {
    _consumer
      .apply(RequestMiddleware)
      .forRoutes('*')
  }
}

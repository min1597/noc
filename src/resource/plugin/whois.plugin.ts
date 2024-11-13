import { getDatabaseClient } from '../database/main'
import utilityPlugin from './utility.plugin'
import CryptoJS from 'crypto-js'
import dayjs from 'dayjs'
import rpki from 'rpki-validator'

export default {
    pluginName: 'whoisPlugin',
    
    rpkiValidate: async (_cidr: string, _origin: string): Promise<
        { success: true }
        | { success: false, error?: Error }
    > => {
        try {
            const _rpkiValidate = await rpki.validate(_cidr, _origin, true)
            if(_rpkiValidate.valid !== true) return { success: false, error: new Error('Invalid RPKI.') }

            return { success: true }
        } catch(_error) { return _error instanceof Error ? { success: false, error: new Error('An unknown error has occured.', { cause: _error }) } : (typeof _error == 'string' ? { success: false, error: new Error(_error) } : { success: false, error: new Error('An unknown error has occured.') }) }
    }
}
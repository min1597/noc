import * as yaml from 'yaml'
import * as fs from 'fs'
import * as child from 'child_process'

async function exec (_command: string): Promise<{ success: true, result: string } | { success: false, error?: Error } > {
    try {
        const _result = await new Promise(function (_resolve: (value: string) => void, _reject) {
            child.exec(_command, (_error: child.ExecException, _stdResult: string, _stdError: string) => {
                if (_error) _reject(_error)
                else _resolve(_stdResult)
            })
        })
        return { success: true, result: _result }
    } catch(_error) { return _error instanceof Error ? { success: false, error: new Error('An unknown error has occured', { cause: _error }) } : (typeof _error == 'string' ? { success: false, error: new Error(_error) } : { success: false, error: new Error('An unknown error has occured.') }) }
}

export default {
    Link: {
        load: async (): Promise<
            { success: true, links: Array<{ name: string, mtu: number, status: 'UP' | 'DOWN' | 'UNKNOWN', addresses: Array<{ type: 'ether' | 'gre' | 'loopback', address: string, brd: string | null, peer: string | null }> }> }
            | { success: false, error?: Error }
        > => {
            try {
                const _command = `ip link show`
                const _result = await exec(_command)
                if(_result.success == false) return { success: false, error: new Error('Failed to load static route', { cause: _result.error }) }
                const _links = _result.result.replace(/\n    /g, ' ').split('\n').filter(_link => _link).map(_link => {
                    const _parsedLink = _link.split(' ')
                    return {
                        name: _parsedLink[1].split('@')[0],
                        mtu: Number(_parsedLink[_parsedLink.indexOf('mtu') + 1]),
                        status: _parsedLink[_parsedLink.indexOf('state') + 1] as 'UP' | 'DOWN' | 'UNKNOWN',
                        addresses: _link.match(/link\/(ether|loopback|gre) (([A-Za-z0-9]+(:[A-Za-z0-9]+)+)|\b(?:(?:2(?:[0-4][0-9]|5[0-5])|[0-1]?[0-9]?[0-9])\.){3}(?:(?:2([0-4][0-9]|5[0-5])|[0-1]?[0-9]?[0-9]))\b) (brd|peer) (([A-Za-z0-9]+(:[A-Za-z0-9]+)+)|\b(?:(?:2(?:[0-4][0-9]|5[0-5])|[0-1]?[0-9]?[0-9])\.){3}(?:(?:2([0-4][0-9]|5[0-5])|[0-1]?[0-9]?[0-9]))\b)/g).map(_address => {
                            const _parsedAddress = _address.split(' ')
                            return {
                                type: _parsedAddress[0].split('/')[1] as 'ether' | 'gre' | 'loopback',
                                address: _parsedAddress[1],
                                brd: _parsedAddress[2] == 'brd' ? _parsedAddress[3] : null,
                                peer: _parsedAddress[2] == 'peer' ? _parsedAddress[3] : null
                            }
                        })
                    }
                })
                return { success: true, links: _links }
            } catch(_error) { return _error instanceof Error ? { success: false, error: new Error('An unknown error has occured', { cause: _error }) } : (typeof _error == 'string' ? { success: false, error: new Error(_error) } : { success: false, error: new Error('An unknown error has occured.') }) }
        },
        set: async (_interfaceName: string, _data: { type: 'status', status: 'UP' | 'DOWN' }): Promise<
            { success: true }
            | { success: false, error?: Error }
        > => {
            try {
                switch(_data.type) {
                    case 'status':
                        try {
                            const _command = `ip link set ${ _interfaceName } ${ _data.status.toLowerCase() }`
                            const _result = await exec(_command)
                            if(_result.success == true) return { success: true }
                            return { success: false, error: new Error('Failed to execute command.', { cause: _result.error }) }
                        } catch(_error) { return { success: false, error: new Error('Failed to execute command.', { cause: _error }) } }
                    default: return { success: false, error: new Error('An unknown error has occured.') }
                }
            } catch(_error) { return _error instanceof Error ? { success: false, error: new Error('An unknown error has occured', { cause: _error }) } : (typeof _error == 'string' ? { success: false, error: new Error(_error) } : { success: false, error: new Error('An unknown error has occured.') }) }
        },
        Address: {
            add: async (_interfaceName: string, _cidr: string): Promise<
                { success: true }
                | { success: false, error?: Error }
            > => {
                try {
                    const _command = `ip addr add ${ _cidr } dev ${ _interfaceName }`
                    const _result = await exec(_command)
                    if(_result.success == false) return { success: false, error: new Error('Failed to add address', { cause: _result.error }) }

                    return { success: true }
                } catch(_error) { return _error instanceof Error ? { success: false, error: new Error('An unknown error has occured', { cause: _error }) } : (typeof _error == 'string' ? { success: false, error: new Error(_error) } : { success: false, error: new Error('An unknown error has occured.') }) }
            },
            delete: async (_interfaceName: string, _cidr: string): Promise<
                { success: true }
                | { success: false, error?: Error }
            > => {
                try {
                    const _command = `ip addr del ${ _cidr } dev ${ _interfaceName }`
                    const _result = await exec(_command)
                    if(_result.success == false) return { success: false, error: new Error('Failed to delete address', { cause: _result.error }) }

                    return { success: true }
                } catch(_error) { return _error instanceof Error ? { success: false, error: new Error('An unknown error has occured', { cause: _error }) } : (typeof _error == 'string' ? { success: false, error: new Error(_error) } : { success: false, error: new Error('An unknown error has occured.') }) }
            },
        }
    },
    Tunnel: {
        GRE: {
            add: async (_name: string, _localAddress: string, _remoteAddress: string): Promise<
                { success: true }
                | { success: false, error?: Error }
            > => {
                try {
                    const _command = `ip link add name ${ _name } type gre local ${ _localAddress } remote ${ _remoteAddress }`
                    const _result = await exec(_command)
                    if(_result.success == false) return { success: false, error: new Error('Failed to add static route', { cause: _result.error }) }
    
                    return { success: true }
                } catch(_error) { return _error instanceof Error ? { success: false, error: new Error('An unknown error has occured', { cause: _error }) } : (typeof _error == 'string' ? { success: false, error: new Error(_error) } : { success: false, error: new Error('An unknown error has occured.') }) }
            }
        }
    },
    Route: {
        load: async (): Promise<
            { success: true, routes: Array<{ destination: string, gateway: string, interface: string }> }
            | { success: false, error?: Error }
        > => {
            try {
                const _command = `ip route show proto static`
                const _result = await exec(_command)
                if(_result.success == false) return { success: false, error: new Error('Failed to load static route', { cause: _result.error }) }

                const _routes = _result.result.split('\n').map(_route => {
                    const _decodedRoute = _route.split(/ /gi)
                    return {
                        destination: _decodedRoute[0],
                        gateway: _decodedRoute[2],
                        interface: _decodedRoute[4]
                    }
                })

                return { success: true, routes: _routes }
            } catch(_error) { return _error instanceof Error ? { success: false, error: new Error('An unknown error has occured', { cause: _error }) } : (typeof _error == 'string' ? { success: false, error: new Error(_error) } : { success: false, error: new Error('An unknown error has occured.') }) }
        },
        add: async (_destination: string, _gateway: string, _interface: string): Promise<
            { success: true }
            | { success: false, error?: Error }
        > => {
            try {
                const _command = `ip route add ${ _destination } via ${ _gateway } dev ${ _interface } proto static`
                const _result = await exec(_command)
                if(_result.success == false) return { success: false, error: new Error('Failed to add static route', { cause: _result.error }) }

                return { success: true }
            } catch(_error) { return _error instanceof Error ? { success: false, error: new Error('An unknown error has occured', { cause: _error }) } : (typeof _error == 'string' ? { success: false, error: new Error(_error) } : { success: false, error: new Error('An unknown error has occured.') }) }
        },
        delete: async (_destination: string, _gateway: string, _interface: string): Promise<
            { success: true }
            | { success: false, error?: Error }
        > => {
            try {
                const _command = `ip route del ${ _destination } via ${ _gateway } dev ${ _interface } proto static`
                const _result = await exec(_command)
                if(_result.success == false) return { success: false, error: new Error('Failed to delete static route', { cause: _result.error }) }

                return { success: true }
            } catch(_error) { return _error instanceof Error ? { success: false, error: new Error('An unknown error has occured', { cause: _error }) } : (typeof _error == 'string' ? { success: false, error: new Error(_error) } : { success: false, error: new Error('An unknown error has occured.') }) }
        }
    },
}
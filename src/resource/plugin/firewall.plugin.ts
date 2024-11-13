import * as fs from 'fs'
import * as path from 'path'

export default {
    XDP: {
        loadRule: (): { success: true, rules: Array<{
            filter: { source?: string, destination?: string, protocol?: 'TCP' | 'UDP' | 'ICMP' },
            limit: { bps?: number, pps?: number },
            action: 'ACCEPT' | 'DROP',
            isActive: boolean
        }> } | { success: false, error?: Error } => {
            try {
                if(fs.existsSync(path.resolve(process.env.XDP_CONFIG_PATH, './xdpfw.conf')) == false) return { success: false, error: new Error('Failed to fetch xdp firewall configuration file.') }
                const _rawConfiguration = fs.readFileSync(path.resolve(process.env.BIRD_CONFIG_PATH, './xdpfw.conf'), 'utf-8')
                const _rules = _rawConfiguration.match(/\{ enabled = (true|false), action = (0|1)(, (src_ip|src_ip6|dst_ip|dst_ip6) = \"[^"]*\"){0,4}(, (bps|pps) = [0-9]+){0,2}(, tcp_enabled = true(, (tcp_sport|tcp_dport) = [0-9]+){0,2}?(, (tcp_syn|tcp_ack|tcp_rst|tcp_psh|tcp_urg|tcp_fin|tcp_ece|tcp_cwr) = (true|false)){0,8})?(, udp_enabled = true(, (udp_sport|udp_dport) = [0-9]+){0,2})? \} +\# [^ ]+/g)
                return { success: true, rules: _rules.map(_rule => {
                    return {
                        id: _rule.match(/\# [^ ]+/)[0].split(' ')[1],
                        filter: {
                            source: `${ _rule.includes('src_ip') ? _rule.match(/(src_ip|src_ip6) = \"[^"]*\"/)[0].match(/\"[^"]*\"/)[0].replace(/"/g, '') : '0.0.0.0/0' }${ _rule.includes('sport') ? `:${ _rule.match(/(tcp_sport|udp_sport) = [0-9]+/)[0].match(/[0-9]+/)[0] }` : '' }`,
                            destination: `${ _rule.includes('dst_ip') ? _rule.match(/(dst_ip|dst_ip6) = \"[^"]*\"/)[0].match(/\"[^"]*\"/)[0].replace(/"/g, '') : '0.0.0.0/0' }${ _rule.includes('dport') ? `:${ _rule.match(/(tcp_dport|udp_dport) = [0-9]+/)[0].match(/[0-9]+/)[0] }` : '' }`,
                            protocol: ((_rule.match(/(tcp|udp|icmp)_enabled = true/) ?? [ undefined, '' ])[1].toUpperCase() ?? undefined) as 'TCP' | 'UDP' | 'ICMP' | undefined
                        },
                        limit: {
                            bps: _rule.includes('bps') ? Number(_rule.match(/bps = [0-9]+/)[0].match(/[0-9]+/)[0]) : undefined,
                            pps: _rule.includes('pps') ? Number(_rule.match(/pps = [0-9]+/)[0].match(/[0-9]+/)[0]) : undefined,
                        },
                        action: _rule.match(/action = (0|1)/)[1] == '0' ? 'DROP' : 'ACCEPT',
                        isActive: _rule.match(/enabled = (true|false)/)[1] == 'true' ? true : false
                    }
                }) }
            } catch(_error) { return _error instanceof Error ? { success: false, error: new Error('An unknown error has occured', { cause: _error }) } : (typeof _error == 'string' ? { success: false, error: new Error(_error) } : { success: false, error: new Error('An unknown error has occured.') }) }
        },
        deleteRule: (_id: string): { success: true } | { success: false, error?: Error } => {
            try {
                if(fs.existsSync(path.resolve(process.env.XDP_CONFIG_PATH, './xdpfw.conf')) == false) return { success: false, error: new Error('Failed to fetch xdp firewall configuration file.') }
                const _rawConfiguration = fs.readFileSync(path.resolve(process.env.BIRD_CONFIG_PATH, './xdpfw.conf'), 'utf-8')
                fs.writeFileSync(path.resolve(process.env.BIRD_CONFIG_PATH, './xdpfw.conf'), _rawConfiguration.split('\n').filter(_rule => _rule.includes(_id) == false).join('\n'), 'utf-8')
                return { success: true }
            } catch(_error) { return _error instanceof Error ? { success: false, error: new Error('An unknown error has occured', { cause: _error }) } : (typeof _error == 'string' ? { success: false, error: new Error(_error) } : { success: false, error: new Error('An unknown error has occured.') }) }
        },
        addRule: (
            _id: string,
            _filter: { source?: string, destination?: string, protocol?: 'TCP' | 'UDP' | 'ICMP' },
            _limit: { bps?: number, pps?: number },
            _action: 'ACCEPT' | 'DROP'
        ): { success: true } | { success: false, error?: Error } => {
            try {
                if(fs.existsSync(path.resolve(process.env.XDP_CONFIG_PATH, './xdpfw.conf')) == false) return { success: false, error: new Error('Failed to fetch xdp firewall configuration file.') }
                const _rawConfiguration = fs.readFileSync(path.resolve(process.env.BIRD_CONFIG_PATH, './xdpfw.conf'), 'utf-8')
                const _SRZ = _rawConfiguration.match(/ +\# LUNA-NETWORKS-SRZ/)
                if(_SRZ == null) return { success: false, error: new Error('SRZ setup is required.') }
                const _source = (_filter.source ?? '').split(':')
                const _destination = (_filter.destination ?? '').split(':')
                let _rule = `{ enabled = true, action = ${ _action == 'ACCEPT' ? '1' : '0' }, ${ _source[0] !== '' ? (`${ /^([0-9]{1,3}\.){3}[0-9]{1,3}(\/([0-9]|[1-2][0-9]|3[0-2]))?$/.test(_source[0]) ? 'src_ip' : 'src_ip6' } = "${ _source[0] }", `) : '' }${ _destination[0] !== '' ? (`${ /^([0-9]{1,3}\.){3}[0-9]{1,3}(\/([0-9]|[1-2][0-9]|3[0-2]))?$/.test(_destination[0]) ? 'dst_ip' : 'dst_ip6' } = "${ _destination[0] }", `) : '' }${ _limit.bps ? `bps = ${ _limit.bps }, ` : '' }${ _limit.pps ? `pps = ${ _limit.pps }, ` : '' }${ _filter.protocol ? `${ _filter.protocol.toLowerCase() }_enabled = true, ` : '' }${ _source.length == 2 ? `${ [ 'TCP', 'UDP' ].includes(_filter.protocol) ? `${ _filter.protocol.toLowerCase() }_sport = ${ _source[1] }, ` : '' }` : '' }${ _destination.length == 2 ? `${ [ 'TCP', 'UDP' ].includes(_filter.protocol) ? `${ _filter.protocol.toLowerCase() }_dport = ${ _destination[1] }, ` : '' }` : '' } }, # ${ _id }`.replace(',  }', ' }')
                fs.writeFileSync(path.resolve(process.env.XDP_CONFIG_PATH, './xdpfw.conf'), _rawConfiguration.replace(/ +\# SRZ \:\: Insert here/, `\t\t${ _rule }\n${ _SRZ[0] }`), 'utf-8')

                return { success: true }
            } catch(_error) { return _error instanceof Error ? { success: false, error: new Error('An unknown error has occured', { cause: _error }) } : (typeof _error == 'string' ? { success: false, error: new Error(_error) } : { success: false, error: new Error('An unknown error has occured.') }) }
        }
    }
}

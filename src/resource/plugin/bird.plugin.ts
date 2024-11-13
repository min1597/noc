import * as fs from 'fs'
import * as child from 'child_process'
import axios from 'axios'
import path from 'path'

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
    BGP: {
        Protocol: {
            loadConfig: (): { success: true, protocols: Array<{ 
                name: string,
                localAS: string,
                localIpAddress: string,
                neighborAS: string,
                neighborIpAddress: string,
                password: string | null,
                multihop: number,
                import: {
                    filter: Array<{
                        conditionType: 'asn' | 'prefix' | 'bgp_community',
                        conditionValue: string,
                        bgpCommunity: Array<string>,
                        action: 'accept' | 'reject'
                    }> | null,
                    defaultPolicy: 'accept' | 'reject'
                },
                export: {
                    filter: Array<{
                        conditionType: 'asn' | 'prefix' | 'bgp_community',
                        conditionValue: string,
                        bgpCommunity: Array<string>,
                        action: 'accept' | 'reject'
                    }> | null,
                    defaultPolicy: 'accept' | 'reject'
                }
            }> } | { success: false, error?: Error } => {
                try {
                    const _birdRawConfig = fs.readFileSync(process.env.BIRD_CONFIG_PATH, 'utf-8')
                    const _parsedConfiguration = _birdRawConfig
                        .replace(/\n        /gi, ' ')
                        .replace(/\n +/gi, '\n')
                        .replace(/\n\}/gi, ' }')
                        .replace(/ +/gi, ' ')
                        .split('protocol')
                        .filter(_protocol => _protocol.includes('bgp'))
                        .map(_protocol => {
                            const _parsedProtocol = _protocol.split('\n').map(_splittedProtocol => _splittedProtocol.replace(/;/gi, '').split(' '))
                            const _importFilter = _parsedProtocol.find(_data => _data.includes('import')) as Array<string>
                            const _exportFilter = _parsedProtocol.find(_data => _data.includes('export')) as Array<string>
                            return {
                                name: (_parsedProtocol.find(_data => _data.includes('bgp')) as Array<string>)[2],
                                localAS: (_parsedProtocol.find(_data => _data.includes('local')) as Array<string>)[2],
                                localIpAddress: (_parsedProtocol.find(_data => _data.includes('source')) as Array<string>)[2],
                                neighborAS: (_parsedProtocol.find(_data => _data.includes('neighbor')) as Array<string>)[1],
                                neighborIpAddress: (_parsedProtocol.find(_data => _data.includes('neighbor')) as Array<string>)[3],
                                password: _protocol.includes('password') ? (_parsedProtocol.find(_data => _data.includes('password')) as Array<string>)[1].replace(/"/gi, '') : null,
                                multihop: Number((_parsedProtocol.find(_data => _data.includes('multihop')) as Array<string>)[1]),
                                import: {
                                    filter: (_importFilter[1] !== 'all' && _importFilter[3] !== 'reject') ? (_importFilter.join(' ').match(/if \([^)]*\) then \{[^}]*\}/gi) as Array<string>).map(_filter => {
                                        const _conditionType = (_filter.match(/\b(?:\d{1,3}\.){3}\d{1,3}\/\d{1,2}\b/g) !== null ? 'prefix'
                                            : ( _filter.match(/bgp_path\.first = [0-9]+/g) !== null ? 'asn'
                                            : ( _filter.match(/\([^)]*\) ~ bgp_community/g) !== null ? 'bgp_community' : 'prefix' ))) as 'prefix' | 'asn' | 'bgp_community'
                                        return {
                                            conditionType: _conditionType,
                                            conditionValue: _filter.match({
                                                prefix: /\b(?:\d{1,3}\.){3}\d{1,3}\/\d{1,2}\b/g,
                                                asn: /[0-9]+/g,
                                                bgp_community: /\([0-9]+,[0-9]+\)/g,
                                                unknown: /./g
                                            }[_conditionType])[0],
                                            bgpCommunity: ((_filter.match(/bgp_community\.add \(\([^)]*\)\)/g) ?? [  ]) as Array<string>).map(_bgpCommunity => (_bgpCommunity.match(/\([0-9]+,[0-9]+\)/g) as Array<string>)[0]),
                                            action: (_filter.match(/(accept|reject)/g) as Array<string>)[0] as 'accept' | 'reject'
                                        }
                                    }) : null,
                                    defaultPolicy: (_importFilter[1] !== 'all' ? _importFilter[_importFilter.length - 2] : 'accept') as 'accept' | 'reject'
                                },
                                export: {
                                    filter: _exportFilter[1] !== 'all' ? (_exportFilter.join(' ').match(/(if \([^)]*\) then \{[^}]*\}|if \([^)]*\) ~ bgp_community then \{[^}]*\})/gi) as Array<string>).map(_filter => {
                                        const _conditionType = (_filter.match(/\b(?:\d{1,3}\.){3}\d{1,3}\/\d{1,2}\b/g) !== null ? 'prefix'
                                            : ( _filter.match(/bgp_path\.first = [0-9]+/g) !== null ? 'asn'
                                            : ( _filter.match(/\([^)]*\) ~ bgp_community/g) !== null ? 'bgp_community' : 'prefix' ))) as 'prefix' | 'asn' | 'bgp_community'
                                        return {
                                            conditionType: _conditionType,
                                            conditionValue: _filter.match({
                                                prefix: /\b(?:\d{1,3}\.){3}\d{1,3}\/\d{1,2}\b/g,
                                                asn: /[0-9]+/g,
                                                bgp_community: /\([0-9]+,[0-9]+\)/g,
                                                unknown: /./g
                                            }[_conditionType])[0],
                                            bgpCommunity: ((_filter.match(/bgp_community\.add \(\([^)]*\)\)/g) ?? [  ]) as Array<string>).map(_bgpCommunity => (_bgpCommunity.match(/\([0-9]+,[0-9]+\)/g) as Array<string>)[0]),
                                            action: (_filter.match(/(accept|reject)/g) as Array<string>)[0] as 'accept' | 'reject'
                                        }
                                    }) : null,
                                    defaultPolicy: (_exportFilter[1] !== 'all' ? _exportFilter[_exportFilter.length - 2] : 'accept')  as 'accept' | 'reject'
                                }
                            }
                        })
                    return { success: true, protocols: _parsedConfiguration }
                } catch(_error) { return _error instanceof Error ? { success: false, error: new Error('An unknown error has occured', { cause: _error }) } : (typeof _error == 'string' ? { success: false, error: new Error(_error) } : { success: false, error: new Error('An unknown error has occured.') }) }
            },
            saveConfig: async (_protocols: Array<{
                name: string,
                localAS: string,
                localIpAddress: string,
                neighborAS: string,
                neighborIpAddress: string,
                password: string | null,
                multihop: number,
                import: {
                    filter: Array<{
                        conditionType: 'prefix' | 'asn' | 'bgp_community',
                        conditionValue: string,
                        bgpCommunity: Array<string> | null,
                        action: 'accept' | 'reject'
                    }> | null,
                    defaultPolicy: 'accept' | 'reject'
                },
                export: {
                    filter: Array<{
                        conditionType: 'prefix' | 'asn' | 'bgp_community',
                        conditionValue: string,
                        bgpCommunity: Array<string> | null,
                        action: 'accept' | 'reject'
                    }> | null,
                    defaultPolicy: 'accept' | 'reject'
                }
            }>): Promise<{ success: true } | { success: false, error?: Error }> => {
                try {
                    const _rawConfiguration = _protocols.map(_protocol => {
                        return `protocol bgp ${ _protocol.name } {
    local as ${ _protocol.localAS };
    source address ${ _protocol.localIpAddress };
    import ${ _protocol.import.filter == null ? (
        _protocol.import.defaultPolicy == 'accept' ? 'all' : 'filter { reject; }'
    ) : `filter {
        ${ _protocol.import.filter.map(_filter => `if ${
            {
                'asn': `(bgp_path.first = ${ _filter.conditionValue })`,
                'prefix': `(net = ${ _filter.conditionValue })`,
                'bgp_community': `${ _filter.conditionValue } ~ bgp_community`
            }[_filter.conditionType]
        } then {${ (_filter.bgpCommunity ?? [  ]).length !== 0 ? `\n            ${ _filter.bgpCommunity.map(_bgpCommunity => `bgp_community.add (${ _bgpCommunity })`).join(';\n            ') };` : '' }
            ${ _filter.action };
        }`).join(';\n        ') }
        ${ _protocol.import.defaultPolicy }
    }` };
    export ${ _protocol.export.filter == null ? (
        _protocol.export.defaultPolicy == 'accept' ? 'all' : 'filter { reject; }'
    ) : `filter {
        ${ _protocol.export.filter.map(_filter => `if ${
            {
                'asn': `(bgp_path.first = ${ _filter.conditionValue })`,
                'prefix': `(net = ${ _filter.conditionValue }+)`,
                'bgp_community': `${ _filter.conditionValue } ~ bgp_community`
            }[_filter.conditionType]
        } then {${ (_filter.bgpCommunity ?? [  ]).length !== 0 ? `\n            ${ _filter.bgpCommunity.map(_bgpCommunity => `bgp_community.add (${ _bgpCommunity })`).join(';\n            ') };` : '' }
            ${ _filter.action };
        }`).join(';\n        ') }
        ${ _protocol.export.defaultPolicy }
    }` };
    graceful restart on;
    neighbor ${ _protocol.neighborIpAddress } as ${ _protocol.neighborAS };
    multihop ${ _protocol.multihop };
}`
                    }).join('\n')
                    fs.writeFileSync(process.env.BIRD_CONFIG_PATH, `router id ${ (await axios.get('https://ifconfig.me')).data };
protocol direct {
    interface "gre*";
    import all;
}
protocol static announcements {
    import all;
    include "${ path.resolve(process.env.BIRD_CONFIG_PATH, './announcements.conf') }";
}
protocol device {
    scan time 10;
    export all;
}
${ _rawConfiguration }`)
                    if(fs.existsSync(path.resolve(process.env.BIRD_CONFIG_PATH, './announcements.conf')) == false) {
                        fs.writeFileSync(path.resolve(process.env.BIRD_CONFIG_PATH, './announcements.conf'), `# /etc/bird/announcements.conf\n`, 'utf-8')
                    }
                    exec('birdc configure')
                    return { success: true }
                } catch(_error) { return _error instanceof Error ? { success: false, error: new Error('An unknown error has occured', { cause: _error }) } : (typeof _error == 'string' ? { success: false, error: new Error(_error) } : { success: false, error: new Error('An unknown error has occured.') }) }
            }
        },
        Announcement: {
            loadSubnet: (): { success: true, cidr: Array<string> } | { success: false, error?: Error } => {
                try {
                    if(fs.existsSync(path.resolve(process.env.BIRD_CONFIG_PATH, './announcements.conf')) == false) {
                        fs.writeFileSync(path.resolve(process.env.BIRD_CONFIG_PATH, './announcements.conf'), `# /etc/bird/announcements.conf\n`, 'utf-8')
                    }
                    const _rawConfiguration = fs.readFileSync(path.resolve(process.env.BIRD_CONFIG_PATH, './announcements.conf'), 'utf-8')
                    return { success: true, cidr: _rawConfiguration.match(/\b(?:\d{1,3}\.){3}\d{1,3}\/\d{1,2}\b/g) ?? [  ] }
                } catch(_error) { return _error instanceof Error ? { success: false, error: new Error('An unknown error has occured', { cause: _error }) } : (typeof _error == 'string' ? { success: false, error: new Error(_error) } : { success: false, error: new Error('An unknown error has occured.') }) }
            },
            addSubnet: (_cidr: string): { success: true } | { success: false, error?: Error } => {
                try {
                    if(fs.existsSync(path.resolve(process.env.BIRD_CONFIG_PATH, './announcements.conf')) == false) {
                        fs.writeFileSync(path.resolve(process.env.BIRD_CONFIG_PATH, './announcements.conf'), `# /etc/bird/announcements.conf\n`, 'utf-8')
                    }
                    const _rawConfiguration = fs.readFileSync(path.resolve(process.env.BIRD_CONFIG_PATH, './announcements.conf'), 'utf-8')
                    fs.writeFileSync(path.resolve(process.env.BIRD_CONFIG_PATH, './announcements.conf'), `# /etc/bird/announcements.conf\n${ [ ... new Set([ ... (_rawConfiguration.match(/\b(?:\d{1,3}\.){3}\d{1,3}\/\d{1,2}\b/g) ?? [  ]), ... _cidr ]) ].map(_subnet => `route ${ _subnet } reject;`).join('\n') }`, 'utf-8')
                    return { success: true }
                } catch(_error) { return _error instanceof Error ? { success: false, error: new Error('An unknown error has occured', { cause: _error }) } : (typeof _error == 'string' ? { success: false, error: new Error(_error) } : { success: false, error: new Error('An unknown error has occured.') }) }
            },
            deleteSubnet: (_cidr: string): { success: true } | { success: false, error?: Error } => {
                try {
                    if(fs.existsSync(path.resolve(process.env.BIRD_CONFIG_PATH, './announcements.conf')) == false) {
                        fs.writeFileSync(path.resolve(process.env.BIRD_CONFIG_PATH, './announcements.conf'), `# /etc/bird/announcements.conf\n`, 'utf-8')
                    }
                    const _rawConfiguration = fs.readFileSync(path.resolve(process.env.BIRD_CONFIG_PATH, './announcements.conf'), 'utf-8')
                    fs.writeFileSync(path.resolve(process.env.BIRD_CONFIG_PATH, './announcements.conf'), `# /etc/bird/announcements.conf\n${ [ ... new Set([ ... (_rawConfiguration.match(/\b(?:\d{1,3}\.){3}\d{1,3}\/\d{1,2}\b/g) ?? [  ]).filter(_subnet => _subnet !== _cidr) ]) ].map(_subnet => `route ${ _subnet } reject;`).join('\n') }`, 'utf-8')
                    return { success: true }
                } catch(_error) { return _error instanceof Error ? { success: false, error: new Error('An unknown error has occured', { cause: _error }) } : (typeof _error == 'string' ? { success: false, error: new Error(_error) } : { success: false, error: new Error('An unknown error has occured.') }) }
            }
        }
    }
}
// import dayjs from 'dayjs'
// import { Prefix } from '../database/entity/luna-shield/Prefix.entity'
import { Attack, AttackMethod, AttackStatus } from '../database/entity/Attack.entity'
import { ActionType, Firewall } from '../database/entity/Firewall.entity'
import { getDatabaseClient } from '../database/main'
import firewallPlugin from './firewall.plugin'
import monitorPlugin from './monitor.plugin'
// import utilityPlugin from './utility.plugin'

let packet: {
    [ ipAddress in string ]: {
        inboundPacket: number,
        inboundTraffic: number,
        outboundPacket: number,
        outboundTraffic: number,
        record: {
            tcp: {
                inboundPacket: number,
                inboundTraffic: number,
                outboundPacket: number,
                outboundTraffic: number,
                flags: {
                    SYN: number,
                    ACK: number
                }
            },
            udp: {
                inboundPacket: number,
                inboundTraffic: number,
                outboundPacket: number,
                outboundTraffic: number
            },
            icmp: {
                inboundPacket: number,
                inboundTraffic: number,
                outboundPacket: number,
                outboundTraffic: number
            }
        },
        flows: {
            [ flow in string ]: {
                flow: 'INBOUND' | 'OUTBOUND',
                inboundPacket: number,
                inboundTraffic: number,
                outboundPacket: number,
                outboundTraffic: number,
            }
        }
    }
} = {  }

const attacks: {
    [ uuid in string ]: {
        method: AttackMethod,
        target: string,
        startedDate: Date,

        record: {
            peakPPS: number,
            peakBPS: number
        },

        firewallRules: Array<string & { __brand: 'UUID' }>
    }
} = {  }

export default {
    pluginName: 'intervalPlugin',

    measure: async function () {
        try {
            monitorPlugin.PacketCapture('enp1s0', _rawPacket => {
                try {
                    const _packet = 
                        _rawPacket.protocolName == 'ICMP' || _rawPacket.subpackets.length == 0
                            ? _rawPacket
                            : _rawPacket.subpackets[_rawPacket.subpackets.length - 1]
                    const _ipAddress = _packet[{ 'INBOUND': 'destinationIpAddress', 'OUTBOUND': 'sourceIpAddress' }[_rawPacket.flow]]

                    if(packet[_ipAddress] == undefined) {
                        packet[_ipAddress] = {
                            inboundPacket: 0,
                            inboundTraffic: 0,
                            outboundPacket: 0,
                            outboundTraffic: 0,
                            record: {
                                tcp: {
                                    inboundPacket: 0,
                                    inboundTraffic: 0,
                                    outboundPacket: 0,
                                    outboundTraffic: 0,
                                    flags: {
                                        SYN: 0,
                                        ACK: 0
                                    }
                                },
                                udp: {
                                    inboundPacket: 0,
                                    inboundTraffic: 0,
                                    outboundPacket: 0,
                                    outboundTraffic: 0
                                },
                                icmp: {
                                    inboundPacket: 0,
                                    inboundTraffic: 0,
                                    outboundPacket: 0,
                                    outboundTraffic: 0
                                }
                            },
                            flows: {  }
                        }
                    }
                    const _flowName = `${ _packet.sourceIpAddress }${ [ 'TCP', 'UDP' ].includes(_packet.protocolName) ? `:${ _packet.sourcePort }` : '' }>${ _packet.protocolName }>${ _packet.destinationIpAddress }${ [ 'TCP', 'UDP' ].includes(_packet.protocolName) ? `:${ _packet.destinationPort }` : '' }`
                    if(packet[_ipAddress].flows[_flowName] == undefined) {
                        packet[_ipAddress].flows[_flowName] = {
                            flow: _rawPacket.flow,
                            inboundPacket: 0,
                            inboundTraffic: 0,
                            outboundPacket: 0,
                            outboundTraffic: 0
                        }
                    }

                    packet[_ipAddress][{ 'INBOUND': 'inboundPacket', 'OUTBOUND': 'outboundPacket' }[_rawPacket.flow]] ++
                    packet[_ipAddress][{ 'INBOUND': 'inboundTraffic', 'OUTBOUND': 'outboundTraffic' }[_rawPacket.flow]] += _rawPacket.size

                    packet[_ipAddress].flows[_flowName][{ 'INBOUND': 'inboundPacket', 'OUTBOUND': 'outboundPacket' }[_rawPacket.flow]] ++
                    packet[_ipAddress].flows[_flowName][{ 'INBOUND': 'inboundTraffic', 'OUTBOUND': 'outboundTraffic' }[_rawPacket.flow]] += _rawPacket.size

                    switch (_rawPacket.protocolName) {
                        case 'TCP':
                            packet[_ipAddress].record.tcp[{ 'INBOUND': 'inboundPacket', 'OUTBOUND': 'outboundPacket' }[_rawPacket.flow]] ++
                            packet[_ipAddress].record.tcp[{ 'INBOUND': 'inboundTraffic', 'OUTBOUND': 'outboundTraffic' }[_rawPacket.flow]] += _rawPacket.size
                            for (const _flag of _packet.flags) {
                                switch (_flag) {
                                    case 'ACK':
                                        packet[_ipAddress].record.tcp.flags.ACK ++
                                        break
                                    case 'SYN':
                                        packet[_ipAddress].record.tcp.flags.SYN ++
                                        break
                                }
                            }
                            break
                        case 'UDP':
                            packet[_ipAddress].record.udp[{ 'INBOUND': 'inboundPacket', 'OUTBOUND': 'outboundPacket' }[_rawPacket.flow]] ++
                            packet[_ipAddress].record.udp[{ 'INBOUND': 'inboundTraffic', 'OUTBOUND': 'outboundTraffic' }[_rawPacket.flow]] += _rawPacket.size
                            break
                        case 'ICMP':
                            packet[_ipAddress].record.icmp[{ 'INBOUND': 'inboundPacket', 'OUTBOUND': 'outboundPacket' }[_rawPacket.flow]] ++
                            packet[_ipAddress].record.icmp[{ 'INBOUND': 'inboundTraffic', 'OUTBOUND': 'outboundTraffic' }[_rawPacket.flow]] += _rawPacket.size
                            break
                    }
                } catch(_error) {
                    console.log(_error)
                }
            })
            setInterval(async () => {
                try {
                    for (const _ipAddress of Object.keys(packet)) {
                        if(Object.values(attacks).filter(_attack => _attack.method == AttackMethod.FLOW_THRESHOLD && _attack.target == _ipAddress).length == 0) {
                            if((Object.values(packet[_ipAddress]?.flows) ?? [  ]).filter(_flow => _flow.flow == 'INBOUND').length >= Number(process.env.THRESHOLD_FLOW)) {
                                const _Firewall = new Firewall()
                                _Firewall.description = _ipAddress
                                _Firewall.action = ActionType.DROP
                                _Firewall.description = 'Flow threshold reached'
                                _Firewall.server_id = process.env.SERVER_ID

                                const _firewall = await getDatabaseClient().manager.save(_Firewall)

                                firewallPlugin.XDP.addRule(_firewall.uuid, { destination: _firewall.destination_cidr }, {  }, 'DROP')

                                const _Attack = new Attack()
                                _Attack.target_ip_address = _ipAddress
                                _Attack.method = AttackMethod.FLOW_THRESHOLD
                                _Attack.triggered_bps = packet[_ipAddress]?.inboundTraffic ?? 0
                                _Attack.triggered_pps = packet[_ipAddress]?.inboundPacket ?? 0
                                _Attack.server_id = process.env.SERVER_ID
                                _Attack.firewall_rule_id = [ _firewall.uuid ]

                                const _attack = await getDatabaseClient().manager.save(_Attack)
                                attacks[_attack.uuid] = {
                                    method: _attack.method,
                                    target: _ipAddress,
                                    startedDate: _attack.created_date,
                            
                                    record: {
                                        peakPPS: _attack.triggered_pps,
                                        peakBPS: _attack.triggered_bps
                                    },

                                    firewallRules: _attack.firewall_rule_id
                                }
                            }
                        }
                    }
                    for (const _attackId of Object.keys(attacks) as Array<string & { __brand: 'UUID' }>) {
                        if(packet[attacks[_attackId].target]) {
                            attacks[_attackId].record.peakBPS = packet[attacks[_attackId].target].inboundTraffic >= attacks[_attackId].record.peakBPS ? packet[attacks[_attackId].target].inboundTraffic : attacks[_attackId].record.peakBPS
                            attacks[_attackId].record.peakPPS = packet[attacks[_attackId].target].inboundPacket >= attacks[_attackId].record.peakPPS ? packet[attacks[_attackId].target].inboundPacket : attacks[_attackId].record.peakPPS
                        }
                        switch (attacks[_attackId].method) {
                            case AttackMethod.FLOW_THRESHOLD:
                                if((Object.values(packet[attacks[_attackId].target]?.flows) ?? [  ]).filter(_flow => _flow.flow == 'INBOUND').length <= Number(process.env.THRESHOLD_FLOW) * 0.9) {
                                    await getDatabaseClient().manager.getRepository(Attack).update({ uuid: _attackId }, { peak_bps: attacks[_attackId].record.peakBPS, peak_pps: attacks[_attackId].record.peakPPS, status: AttackStatus.Mitigated })
                                    for (const _firewallRuleId of attacks[_attackId].firewallRules) {
                                        await getDatabaseClient().manager.getRepository(Firewall).update({ uuid: _firewallRuleId }, { is_active: false, deleted_date: new Date() })
                                        firewallPlugin.XDP.deleteRule(_firewallRuleId)
                                    }
                                    delete attacks[_attackId]
                                }
                                break
                        }
                    }
                    packet = {  }
                } catch(_error) {
                    console.log(_error)
                }
            }, 1000)
        } catch(_error) {
            console.error(_error)
            console.error('Failed to measure services.')
        }
    }
}
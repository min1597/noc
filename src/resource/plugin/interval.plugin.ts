// import dayjs from 'dayjs'
// import { Prefix } from '../database/entity/luna-shield/Prefix.entity'
import { getDatabaseClient } from '../database/main'
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
            }
        }
    }
} = {  }

const attacks: {
    [ uuid in string ]: {
        method: 'SYN_FLOOD' | 'ACK_FLOOD' | 'UDP_FLOOD' | 'HIGH_PPS' | 'UNKNOWN',
        target: string,
        startedDate: Date,

        record: {
            peakPPS: number,
            peakBPS: number
        }
    }
} = {  }

export default {
    pluginName: 'intervalPlugin',

    measure: async function () {
        try {
            monitorPlugin.PacketCapture('enp1s0', _rawPacket => {
                try {
                    const _ipAddress =
                        _rawPacket.subpackets.length == 0
                            ? _rawPacket[{ 'INBOUND': 'destinationIpAddress', 'OUTBOUND': 'sourceIpAddress' }[_rawPacket.flow]]
                            : _rawPacket.subpackets[_rawPacket.subpackets.length - 1][{ 'INBOUND': 'destinationIpAddress', 'OUTBOUND': 'sourceIpAddress' }[_rawPacket.flow]]
                    console.log(`${ _rawPacket.sourceIpAddress } -(${ _rawPacket.flow })-> ${ _rawPacket.destinationIpAddress }`)
                    console.log(`[${ { 'INBOUND': 'destinationIpAddress', 'OUTBOUND': 'sourceIpAddress' }[_rawPacket.flow] }] ${ _ipAddress }`)
                    console.log(`subpacket ${ _rawPacket.subpackets.length !== 0 ? _rawPacket.subpackets[_rawPacket.subpackets.length - 1][{ 'INBOUND': 'destinationIpAddress', 'OUTBOUND': 'sourceIpAddress' }[_rawPacket.flow]] : '' }`)
                    const _packet = 
                        _rawPacket.subpackets.length == 0
                            ? _rawPacket
                            : _rawPacket.subpackets[_rawPacket.subpackets.length - 1]

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
                                }
                            }
                        }
                    }
                    packet[_ipAddress][{ 'INBOUND': 'inboundPacket', 'OUTBOUND': 'outboundPacket' }[_rawPacket.flow]] ++
                    packet[_ipAddress][{ 'INBOUND': 'inboundTraffic', 'OUTBOUND': 'outboundTraffic' }[_rawPacket.flow]] += _rawPacket.size

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
                    }
                } catch(_error) {
                    console.log(_error)
                }
            })
            setInterval(async () => {
                try {
                    console.log(JSON.stringify(packet))
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
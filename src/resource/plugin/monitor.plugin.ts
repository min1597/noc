import * as child from 'child_process'
import * as dayjs from 'dayjs'
import * as fs from 'fs'
import * as osUtils from 'os-utils'
import * as os from 'os'
import * as path from 'path'
import monitorPlugin from './monitor.plugin'

export const _protocols: { [ protocolCode in string ]: string } = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../../protocols.json'), 'utf-8'))

export default {
    PacketCapture: (_interface: string, _callback: (_parsedPacket: {
        issuedDate: Date,
        flow: 'INBOUND' | 'OUTBOUND',
        id: string,
        protocol: number,
        protocolName: string,
        length: number,
        size: number,
        sourceIpAddress: string,
        sourcePort: number | undefined,
        destinationIpAddress: string,
        destinationPort: number | undefined,
        flags: Array<'SYN' | 'FIN' | 'RST' | 'PSH' | 'URG' | 'ECE' | 'CWR' | 'NS' | 'ACK' | 'DONT_FRAGMENTS' | 'MORE_FRAGMENTS'>,
        subpackets: Array<{
            id: string,
            protocol: number,
            protocolName: string,
            length: number,
            size: number,
            sourceIpAddress: string,
            sourcePort: number | undefined,
            destinationIpAddress: string,
            destinationPort: number | undefined,
            flags: Array<'SYN' | 'FIN' | 'RST' | 'PSH' | 'URG' | 'ECE' | 'CWR' | 'NS' | 'ACK' | 'DONT_FRAGMENTS' | 'MORE_FRAGMENTS'>
        }>
    }) => void): { success: true } | { success: false, error?: Error } => {
        try {
            // const _xdpdump = child.spawn('xdpdump', ['-i', _interface, '-w', '-'])
            // const _inboundTcpdump = child.spawn('tcpdump', ['-r', '-', '-n', '-vv'])
            const _inboundTcpdump = child.spawn('tcpdump', ['-i', _interface, '-Q', 'in', '-n', '-vv'])
            const _outboundTcpdump = child.spawn('tcpdump', ['-i', _interface, '-Q', 'out', '-n', '-vv'])
            // _xdpdump.stdout.pipe(_inboundTcpdump.stdin)

            let _packetCache = ''
            function _flagParser (_flag: string): Array<'SYN' | 'FIN' | 'RST' | 'PSH' | 'URG' | 'ECE' | 'CWR' | 'NS' | 'ACK' | 'DONT_FRAGMENTS' | 'MORE_FRAGMENTS'> {
                const _flagMap = {
                    S: 'SYN',
                    F: 'FIN',
                    R: 'RST',
                    P: 'PSH',
                    U: 'URG',
                    E: 'ECE',
                    W: 'CWR',
                    N: 'NS',
                    '.': 'ACK',
                    DF: 'DONT_FRAGMENTS',
                    MF: 'MORE_FRAGMENTS'
                }
                const _parsedFlags = _flag.match(/\b\w+\b/g) || [  ]
                return _parsedFlags.map((_flag: string) => _flagMap[_flag] || _flag)
            }
            function _packetParser (_bufferData: Buffer, _flow: 'INBOUND' | 'OUTBOUND') {
                const _packets: Array<string> = _bufferData.toString().replace(/\n +/gi, ' ').replace(/\n\t/gi, ' ').replace(/ +/gi, ' ').split('\n')
                const _decodedPacket = _packets
                    .filter(_packet => _packet !== '' && _packet.includes('    ') == false)
                    .filter(_packet => _packet.split(' ')[1] == 'IP')
                    .filter(_packet => _packet.split(' ').length > 17)
                    .filter(_packet => _packet.match(/IP \(tos [A-Za-z0-9]+,(ECT\(0\),)? ttl [0-9]+, id [0-9]+, offset [0-9]+, flags \[[A-Za-z,]+\], proto [A-Za-z]+ \([0-9]+\), length [0-9]+\) \b(?:\d{1,3}\.){3}\d{1,3}(.\d{1,5})? > \b(?:\d{1,3}\.){3}\d{1,3}(.\d{1,5})?: (\[[^\]]*\])?( )?[A-Za-z0-9]+(\,)? (Flags \[[^\]]*\])?(\[[[A-Za-z.]+\])?(\, cksum [A-Za-z0-9]+)?( \([^)]*\),)?( seq [\d]+(\:[\d]+)?,)?( ack [\d]+,)?( win [\d]+,)?( (options \[[A-Za-z0-9, ]+\])?)?([^*] )?(length \d+)?/gi) !== null)
                    .filter(_packet => typeof _packet == 'string')
                    .map(_packet => {
                        const _connectedPacket = _packet.split(' ').length <= 17 ? `${ _packetCache } ${ _packet }` : _packet
                        const _decodedPacket = _connectedPacket.match(/IP \(tos [A-Za-z0-9]+,(ECT\(0\),)? ttl [0-9]+, id [0-9]+, offset [0-9]+, flags \[[A-Za-z,]+\], proto [A-Za-z]+ \([0-9]+\), length [0-9]+\) \b(?:\d{1,3}\.){3}\d{1,3}(.\d{1,5})? > \b(?:\d{1,3}\.){3}\d{1,3}(.\d{1,5})?: (\[[^\]]*\])?( )?[A-Za-z0-9]+(\,)? (Flags \[[^\]]*\])?(\[[[A-Za-z.]+\])?(\, cksum [A-Za-z0-9]+)?( \([^)]*\),)?( seq [\d]+(\:[\d]+)?,)?( ack [\d]+,)?( win [\d]+,)?( (options \[[A-Za-z0-9, ]+\])?)?([^*] )?(length \d+)?/gi)
                        const _mainIpAddresses = _decodedPacket[0].match(/\b(?:\d{1,3}\.){3}\d{1,3}(.\d{1,5})? > \b(?:\d{1,3}\.){3}\d{1,3}(.\d{1,5})?/)[0]
                        console.log(`${ _mainIpAddresses.match(/\b(?:\d{1,3}\.){3}\d{1,3}/g)[0] } -${ _flow }-> ${ _mainIpAddresses.match(/\b(?:\d{1,3}\.){3}\d{1,3}/g)[1] }`)
                        return {
                            issuedDate: new Date(`${ dayjs().format('YYYY-MM-DD') } ${ _connectedPacket.split(' ')[0] }`),
                            flow: _flow,
                            id: _decodedPacket[0].match(/id [\d]+/)[0].match(/[\d]+/)[0],
                            protocol: Number(_decodedPacket[0].match(/proto [A-Za-z0-9-]+ \([\d]+\)/)[0].match(/[\d]+/)[0]),
                            protocolName: _protocols[_decodedPacket[0].match(/proto [A-Za-z0-9-]+ \([\d]+\)/)[0].match(/[\d]+/)[0]],
                            length: Number(_decodedPacket[0].match(/length [\d]+/)[0].match(/[\d]+/)[0]),
                            size: Number(_decodedPacket[0].match(/length [\d]+/)[0].match(/[\d]+/)[0]) * 8,
                            sourceIpAddress: _mainIpAddresses.match(/\b(?:\d{1,3}\.){3}\d{1,3}/g)[0],
                            sourcePort: _mainIpAddresses.match(/\b(?:\d{1,3}\.){3}\d{1,3}(.\d{1,5})?/g)[0].split('.').length == 5 ? Number(_mainIpAddresses.match(/\b(?:\d{1,3}\.){3}\d{1,3}(.\d{1,5})?/g)[0].split('.')[4]) : undefined,
                            destinationIpAddress: _mainIpAddresses.match(/\b(?:\d{1,3}\.){3}\d{1,3}/g)[1],
                            destinationPort: _mainIpAddresses.match(/\b(?:\d{1,3}\.){3}\d{1,3}(.\d{1,5})?/g)[1].split('.').length == 5 ? Number(_mainIpAddresses.match(/\b(?:\d{1,3}\.){3}\d{1,3}(.\d{1,5})?/g)[1].split('.')[4]) : undefined,
                            flags: _decodedPacket[0].match(/Flags \[([^\]]+)\]/) ? _flagParser(_decodedPacket[0].match(/Flags \[([^\]]+)\]/)[1].match(/[A-Za-z.]+/)[0]) : [  ],
                            subpackets: _decodedPacket.filter(_packet => _decodedPacket[0].match(/id [\d]+/)[0].match(/[\d]+/)[0] !== _packet.match(/id [\d]+/)[0].match(/[\d]+/)[0]).map(_packet => {
                                const _subIpAddresses = _packet.match(/\b(?:\d{1,3}\.){3}\d{1,3}(.\d{1,5})? > \b(?:\d{1,3}\.){3}\d{1,3}(.\d{1,5})?/)[0]
                                return {
                                    id: _packet.match(/id [\d]+/)[0].match(/[\d]+/)[0],
                                    protocol: Number(_packet.match(/proto [A-Za-z0-9-]+ \([\d]+\)/)[0].match(/[\d]+/)[0]),
                                    protocolName: _protocols[_packet.match(/proto [A-Za-z0-9-]+ \([\d]+\)/)[0].match(/[\d]+/)[0]],
                                    length: Number(_packet.match(/length [\d]+/)[0].match(/[\d]+/)[0]),
                                    size: Number(_packet.match(/length [\d]+/)[0].match(/[\d]+/)[0]) * 8,
                                    sourceIpAddress: _subIpAddresses.match(/\b(?:\d{1,3}\.){3}\d{1,3}/g)[0],
                                    sourcePort: _subIpAddresses.match(/\b(?:\d{1,3}\.){3}\d{1,3}(.\d{1,5})?/g)[0].split('.').length == 5 ? Number(_subIpAddresses.match(/\b(?:\d{1,3}\.){3}\d{1,3}(.\d{1,5})?/g)[0].split('.')[4]) : undefined,
                                    destinationIpAddress: _subIpAddresses.match(/\b(?:\d{1,3}\.){3}\d{1,3}/g)[1],
                                    destinationPort: _subIpAddresses.match(/\b(?:\d{1,3}\.){3}\d{1,3}(.\d{1,5})?/g)[1].split('.').length == 5 ? Number(_subIpAddresses.match(/\b(?:\d{1,3}\.){3}\d{1,3}(.\d{1,5})?/g)[1].split('.')[4]) : undefined,
                                    flags: _packet.match(/Flags \[([^\]]+)\]/) ? _flagParser(_packet.match(/Flags \[([^\]]+)\]/)[1].match(/[A-Za-z.]+/)[0]) : undefined,
                                }
                            })
                        }
                    })
                for(const _packet of _decodedPacket) { _callback(_packet) }
                _packetCache = _packets[_packets.length - 1]
            }
            _inboundTcpdump.stdout.on('data', _data => _packetParser(_data, 'INBOUND'))
            _outboundTcpdump.stdout.on('data', _data => _packetParser(_data, 'OUTBOUND'))
            return { success: true }
        } catch(_error) { return _error instanceof Error ? { success: false, error: new Error('An unknown error has occured', { cause: _error }) } : (typeof _error == 'string' ? { success: false, error: new Error(_error) } : { success: false, error: new Error('An unknown error has occured.') }) }
    },
    getPerformance: async (): Promise<
        { success: true, cpuUsage: number, memoryUsage: number, networkFilterUsage: number }
        | { success: false, error?: Error }
    > => {
        try {
            const _cpuUsage = Number(await (new Promise((_resolve, _reject) => {
                osUtils.cpuUsage(_resolve)
            })))
            const _memoryUsage = os.freemem() / os.totalmem()
            const _networkFilterUsage = Number(fs.readFileSync('/proc/sys/net/netfilter/nf_conntrack_count', 'utf-8')) / Number(fs.readFileSync('/proc/sys/net/nf_conntrack_max', 'utf-8'))

            return { success: true, cpuUsage: _cpuUsage, memoryUsage: _memoryUsage, networkFilterUsage: _networkFilterUsage }
        } catch(_error) { return _error instanceof Error ? { success: false, error: new Error('An unknown error has occured', { cause: _error }) } : (typeof _error == 'string' ? { success: false, error: new Error(_error) } : { success: false, error: new Error('An unknown error has occured.') }) }
    },
    getFlows: (
        _interface: string,
        _callback: (_flows: Array<{
            flow: 'INBOUND' | 'OUTBOUND' | 'UNKNOWN',
            protocol: string,
            sourceIpAddress: string,
            sourcePort?: number,
            destinationIpAddress: string,
            destinationPort?: number,

            pps: number,
            bps: number,
            
            lastUpdatedDate: Date
        }>, _capturedDate: Date) => void
    ): void => {
        const _flows: Array<{
            flow: 'INBOUND' | 'OUTBOUND' | 'UNKNOWN',
            protocol: string,
            sourceIpAddress: string,
            sourcePort?: number,
            destinationIpAddress: string,
            destinationPort?: number,

            pps: number,
            bps: number,

            lastUpdatedDate: Date
        }> = new Array()
        function _processFlow (
            _flow: 'INBOUND' | 'OUTBOUND' | 'UNKNOWN',
            _packet: {
                id: string,
                protocol: number,
                protocolName: string,
                length: number,
                size: number,
                sourceIpAddress: string,
                sourcePort: number | undefined,
                destinationIpAddress: string,
                destinationPort: number | undefined
            }
        ): void {
            const _flowIdx = _flows.findIndex(_flow => (
                [ 'TCP', 'UDP' ].includes(_packet.protocolName) ?
                    _flow.sourceIpAddress == _packet.sourceIpAddress
                    && _flow.destinationIpAddress == _packet.destinationIpAddress
                    
                    && _flow.sourcePort == _packet.sourcePort
                    && _flow.destinationPort == _packet.destinationPort

                    && _flow.protocol == _packet.protocolName
                : (
                    _flow.sourceIpAddress == _packet.sourceIpAddress
                    && _flow.destinationIpAddress == _packet.destinationIpAddress

                    && _flow.protocol == _packet.protocolName
                )
            ))
            if(_flowIdx == -1) {
                _flows.push({
                    flow: _flow,
                    protocol: _packet.protocolName,
                    sourceIpAddress: _packet.sourceIpAddress,
                    sourcePort: _packet.sourcePort,
                    destinationIpAddress: _packet.destinationIpAddress,
                    destinationPort: _packet.destinationPort,

                    bps: _packet.size,
                    pps: 1,

                    lastUpdatedDate: new Date()
                })
            } else {
                _flows[_flowIdx].bps += _packet.size,
                _flows[_flowIdx].pps ++
                _flows[_flowIdx].lastUpdatedDate = new Date()
            }
        }
        const _pcaketCapture = monitorPlugin.PacketCapture(_interface, (_packet) => {
            _processFlow(_packet.flow, _packet.subpackets ? _packet.subpackets[_packet.subpackets.length =- 1] : _packet)
        })
        setInterval(() => {
            _callback(_flows, new Date())
            _flows.length = 0
        }, 1000)
    }
}
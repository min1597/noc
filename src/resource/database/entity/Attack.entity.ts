import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

export enum AttackFlow { INBOUND = 'INBOUND', OUTBOUND = 'OUTBOUND' }
export enum AttackMethod { SYN_FLOOD = 'SYN_FLOOD', 'ACK_FLOOD' = 'ACK_FLOOD', 'UDP_FLOOD' = 'UDP_FLOOD', 'HIGH_PPS' = 'HIGH_PPS', 'FLOW_THRESHOLD' = 'FLOW_THRESHOLD', 'UNKNOWN' = 'UNKNOWN' }
export enum AttackStatus { Mitigating = 'Mitigating', Mitigated = 'Mitigated' }
@Entity()
export class Attack {
    @PrimaryGeneratedColumn('increment', { comment: 'Serial number' })
    srl: number

    @PrimaryGeneratedColumn('uuid', { comment: 'Row ID' })
    uuid: string & { __brand: 'UUID' }


    @Column({ type: 'enum', enum: AttackFlow, nullable: false, default: AttackFlow.INBOUND, comment: 'Attack flow' })
    flow: AttackFlow

    @Column({ type: 'text', nullable: false, comment: 'Target IP Address' })
    target_ip_address: string

    @Column({ type: 'enum', enum: AttackMethod, nullable: false, comment: 'Attack method' })
    method: AttackMethod

    @Column({ type: 'int', nullable: false, comment: 'Triggered bps' })
    triggered_bps: number

    @Column({ type: 'int', nullable: false, comment: 'Triggered pps' })
    triggered_pps: number

    @Column({ type: 'int', nullable: true, default: null, comment: 'Peak bps' })
    peak_bps: number | null

    @Column({ type: 'int', nullable: true, default: null, comment: 'Peak pps' })
    peak_pps: number | null

    @Column({ type: 'text', nullable: false, comment: 'Server ID' })
    server_id: string

    @Column({ type: 'uuid', array: true, nullable: false, comment: 'Firewall rule IDs' })
    firewall_rule_id: Array<string & { __brand: 'UUID' }>


    @Column({ type: 'enum', enum: AttackStatus, nullable: false, default: AttackStatus.Mitigating, comment: 'Status' })
    status: AttackStatus


    @Column({ type: 'boolean', default: true, comment: 'Data validity' })
    is_active: boolean

    @CreateDateColumn({ type: 'timestamptz', comment: 'Creation date' })
    created_date: Date

    @UpdateDateColumn({ type: 'timestamptz', comment: 'Update date' })
    updated_date: Date

    @Column({ type: 'timestamptz', nullable: true, default: null, comment: 'Delete date' })
    deleted_date: Date | null
}
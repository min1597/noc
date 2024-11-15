import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

export enum ActionType { ACCEPT = 'ACCEPT', DROP = 'DROP', FILTER = 'FILTER' }
export enum Protocol { TCP = 'TCP', UDP = 'UDP', ICMP = 'ICMP' }

@Entity()
export class Firewall {
    @PrimaryGeneratedColumn('increment', { comment: 'Serial number' })
    srl: number

    @PrimaryGeneratedColumn('uuid', { comment: 'Row ID' })
    uuid: string & { __brand: 'UUID' }


    @Column({ type: 'text', nullable: true, default: null, comment: 'Source CIDR' })
    source_cidr: string | null

    @Column({ type: 'int', nullable: true, default: null, comment: 'Source port' })
    source_port: number | null

    @Column({ type: 'text', nullable: true, default: null, comment: 'Destination CIDR' })
    destination_cidr: string | null

    @Column({ type: 'int', nullable: true, default: null, comment: 'Destination port' })
    destination_port: number | null

    @Column({ type: 'enum', enum: Protocol, array: true, nullable: true, default: null, comment: 'Protocol' })
    protocol: Array<Protocol> | null

    @Column({ type: 'enum', enum: ActionType, nullable: false, default: ActionType.FILTER, comment: 'Action type' })
    action: ActionType

    @Column({ type: 'text', nullable: false, comment: 'Rule description' })
    description: string

    @Column({ type: 'text', nullable: false, comment: 'Server ID' })
    server_id: string


    @Column({ type: 'boolean', default: true, comment: 'Data validity' })
    is_active: boolean
    
    @CreateDateColumn({ type: 'timestamptz', comment: 'Creation date' })
    created_date: Date

    @UpdateDateColumn({ type: 'timestamptz', comment: 'Update date' })
    updated_date: Date

    @Column({ type: 'timestamptz', nullable: true, default: null, comment: 'Delete date' })
    deleted_date: Date | null
}
export type EstadoReto = 'asignado' | 'en_progreso' | 'abandonado' | 'completado' | 'vencido';

export class Reto {
    constructor(
        public codReto: number,
        public nombreReto: string,
        public descripcionReto: string,
        public tiempoEstimadoSegReto: number,
        public fechaInicioReto: string, // YYYY-MM-DD
        public fechaFinReto: string,    // YYYY-MM-DD
        public estado: EstadoReto,
        public fechaObjetivo: string,
        public esAutomatico?: boolean,
    ) {}

    // 👇 NUEVO: campos provenientes de usuarios_retos (opcionalmente seteados desde la Home)
    codUsuarioReto?: number | null;
    ventanaInicio?: string | null;
    ventanaFin?: string | null;

    get completadoReto() { return this.estado === 'completado'; }

    static toYMD(d: Date) {
        const y = d.getFullYear();
        const m = `${d.getMonth() + 1}`.padStart(2, '0');
        const day = `${d.getDate()}`.padStart(2, '0');
        return `${y}-${m}-${day}`;
    }
    static parseYMD(s?: string | null): Date | null {
        if (!s) return null;
        const d = new Date(s);
        return isNaN(d.getTime()) ? null : d;
    }

    // ⚠️ Estos dos getters se mantienen, pero reflejan SOLO la plantilla
    get disponibleHoy(): boolean {
        const hoy = Reto.toYMD(new Date());
        return hoy >= this.fechaInicioReto && hoy <= this.fechaFinReto;
    }
    get estadoTemporal(): 'Disponible' | 'Aún no disponible' | 'Vencido' {
        const hoy = Reto.toYMD(new Date());
        if (hoy < this.fechaInicioReto) return 'Aún no disponible';
        if (hoy > this.fechaFinReto) return 'Vencido';
        return 'Disponible';
    }

    static fromApi(api: any): Reto {
        const fechaInicio: string = (api.fechaInicioReto ?? api.fecha_inicio ?? api.inicio ?? '').slice(0, 10);
        const fechaFin: string = (api.fechaFinReto ?? api.fecha_fin ?? api.fin ?? '').slice(0, 10);
        let estado: EstadoReto = (api.estado as EstadoReto) ?? 'asignado';
        const hoy = Reto.toYMD(new Date());
        if (fechaFin && hoy > fechaFin) estado = 'vencido';
        if (api.estado === 'completado') estado = 'completado';

        return new Reto(
            api.codReto,
            api.nombreReto,
            api.descripcionReto,
            api.tiempoEstimadoSegReto ?? 0,
            fechaInicio || hoy,
            fechaFin || hoy,
            estado,
            api.fechaObjetivo ?? api.fecha_objetivo ?? api.fechaFinReto ?? hoy,
            api.esAutomaticoReto === 1 || api.esAutomatico === 1 || api.esAutomatico === true
        );
    }
}

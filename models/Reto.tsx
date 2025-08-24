// models/Reto.ts (reemplaza si quieres)
export class Reto {
    constructor(
        public codReto: number,
        public nombreReto: string,
        public descripcionReto: string,
        public tiempoEstimadoSegReto: number,
        public fechaInicioReto: string,
        public fechaFinReto: string,
        public estado: 'asignado'|'en_progreso'|'abandonado'|'completado'|'vencido',
        public fechaObjetivo?: string,
        public esAutomatico?: boolean,
    ) {}
    get completadoReto() { return this.estado === 'completado'; }
}

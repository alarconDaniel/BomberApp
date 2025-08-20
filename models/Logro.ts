export class Logro {
    constructor(
        public codLogro: number,
        public nombre: string,
        public descripcion: string,
        public icono: string,
        public recompensa: string,
        public unlocked: boolean,
        public fechaObtencion: string | null,
    ) {}


    static fromJSON(j: any): Logro {
        return new Logro(
            Number(j.codLogro),
            String(j.nombre ?? ''),
            String(j.descripcion ?? ''),
            String(j.icono ?? ''),
            String(j.recompensa ?? ''),
            Boolean(j.unlocked),
            j.fechaObtencion ?? null,
        );
    }


    get bloqueado(): boolean { return !this.unlocked; }
    get fechaFormateada(): string {
        if (!this.fechaObtencion) return '';
        const d = new Date(this.fechaObtencion);
        return isNaN(d.getTime()) ? '' : d.toLocaleDateString();
    }
}
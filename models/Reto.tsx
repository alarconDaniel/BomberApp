export class Reto{

    public codReto: number;
    public nombreReto: string;
    public descripcionReto: string;
    public tiempoEstimadoSegReto: number;
    public fechaInicioReto: Date;
    public fechaFinReto: Date;
    public completadoReto: Boolean;

    constructor(cod: number, nombre: string, desc: string, tiempo: number, fechaInicio: Date, fechaFin: Date, completado: Boolean) {
        this.codReto = cod;
        this.nombreReto = nombre;
        this.descripcionReto = desc;
        this.tiempoEstimadoSegReto = tiempo;
        this.fechaInicioReto = fechaInicio;
        this.fechaFinReto = fechaFin;
        this.completadoReto = completado;
    }

}
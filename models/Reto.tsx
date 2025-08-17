export class Reto{

    public codReto: number;
    public nombreReto: string;
    public descripcionReto: string;
    public tiempoReto: number;
    public fechaInicioReto: Date;
    public fechaFinReto: Date;

    constructor(cod: number, nombre: string, desc: string, tiempo: number, fechaInicio: Date, fechaFin: Date) {
        this.codReto = cod;
        this.nombreReto = nombre;
        this.descripcionReto = desc;
        this.tiempoReto = tiempo;
        this.fechaInicioReto = fechaInicio;
        this.fechaFinReto = fechaFin;
    }

}
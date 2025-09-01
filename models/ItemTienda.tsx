export class ItemTienda {
    public codItem: number;
    public nombreItem: string;
    public descripcionItem: string;
    public precioItem: number;
    public tipoItem: string;
    public metadataItem: any;
    public yaPosee?: boolean;

    constructor(
        cod: number,
        nom: string,
        desc: string,
        precio: number,
        tipo: string,
        meta: any,
        yaPosee?: boolean,
    ) {
        this.codItem = cod;
        this.nombreItem = nom;
        this.descripcionItem = desc;
        this.precioItem = precio;
        this.tipoItem = tipo;
        this.metadataItem = meta;
        this.yaPosee = yaPosee;
    }
}
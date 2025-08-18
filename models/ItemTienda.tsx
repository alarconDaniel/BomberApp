export class ItemTienda{

    public codItem: number;
    public nombreItem: string;
    public descripcionItem: string;
    public precioItem: number;
    public tipoItem: string;
    public metadataItem: JSON;

    constructor(cod: number, nom: string, desc: string, precio: number, tipo: string, meta: JSON) {
        this.codItem = cod;
        this.nombreItem = nom;
        this.descripcionItem = desc;
        this.precioItem = precio;
        this.tipoItem = tipo;
        this.metadataItem = meta;

    }

} 
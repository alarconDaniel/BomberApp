// models/ItemInventario.ts
export type ItemInventario = {
    usuario: {
        codUsuario: number;
    };
    item: {
        codItem: number;
        nombre: string;
        descripcion: string;
        tipo: string;
        icon: string;
    };
    cod: number;
    cantidad: number;
    fecha: string; // ISO string que viene del backend
};

// NUEVO: shape de la respuesta del backend
export type InventarioResponse = {
    usuario: { codUsuario: number };
    items: ItemInventario[];
    total: number;
};

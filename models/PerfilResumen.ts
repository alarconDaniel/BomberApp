export type PerfilResumen = {
    usuario: {
        nombre: string;
        apellido: string;
        cedula: string;
        nickname: string;
        email: string;
    };
    stats: {
        racha: number;
        monedas: number;
        xp: number;
        nivel: number;
        xpEnNivel: number;
        faltante: number;
        xpPorNivel: number;
        progreso: number; // 0..1
    };
    logros: Array<{
        codLogro: number;
        nombre: string;
        icono: string;      // ruta imagen (puede ser absoluta o relativa al backend)
        recompensa: string; // p.ej. "+83 xp"
    }>;
};

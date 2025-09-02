// models/PerfilResumen.ts
export type PerfilResumen = {
    usuario: {
        nombre: string;
        apellido: string;
        cedula: string;
        nickname: string;
        email: string;
        cargo: string | null; // 👈 NUEVO
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
        icono: string;
        recompensa: string; // p.ej. "+83 xp"
    }>;
};

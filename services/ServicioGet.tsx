export class ServicioGet {

    public static async peticionGet(urlSerivicio: string) {
        const datosEnviar = {
            method: "GET",
            headers: { "Content-Type": "application/json; charset=UTF-8" },
        };

        const respuesta = fetch(urlSerivicio, datosEnviar)
            .then((respuesta) => respuesta.json())
            .then((datos) => { return datos; })
            .catch((miError) => { return miError; });
        return respuesta;
    }
}
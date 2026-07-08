// Se deja vacío para que el proxy de package.json intercepte la ruta relativa
const http_api = "https://localhost:44351"; 

const OrdenTrabajoServicio = {};

OrdenTrabajoServicio.CreateOrdenTrabajo = async (datos) => {
    let url = http_api + '/api/OrdenTrabajo/Crear';
 
    console.log("url :" + url);
    console.log("json:" + JSON.stringify(datos));
    

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos)
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
};

OrdenTrabajoServicio.CrearDetalleOrdenTrabajo = async (detalle) => {
    let url = http_api + '/api/ordentrabajo/CrearDetalleOrdenTrabajoAsync';

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(detalle)
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
};

OrdenTrabajoServicio.CrearImagenesOrdenTrabajo = async (imagen) => {
    let url = http_api + '/api/ordentrabajo/CrearImagenesOrdenTrabajoAsync';

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(imagen)
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
};

export default OrdenTrabajoServicio;
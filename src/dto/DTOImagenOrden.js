class DTOImagenOrden {
  constructor({
    IdImagen = '0',
    Idorden = '0',
    RutaImagen = ''
  } = {}) {
    this.IdImagen = IdImagen;
    this.Idorden = Idorden;
    this.RutaImagen = RutaImagen;
  }
}

export default DTOImagenOrden;
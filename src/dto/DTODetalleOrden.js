class DTODetalleOrden {
  constructor({
    IdDetalle = '0',
    Idorden = '0',
    IdTipo = '0',
    Codigo = '',
    Descripcion = '',
    Cantidad = '0',
    ValorUnitario = '0',
    DescuentoPorcentaje = '0',
    SubTotal = '0'
  } = {}) {
    this.IdDetalle = IdDetalle;
    this.Idorden = Idorden;
    this.IdTipo = IdTipo;
    this.Codigo = Codigo;
    this.Descripcion = Descripcion;
    this.Cantidad = Cantidad;
    this.ValorUnitario = ValorUnitario;
    this.DescuentoPorcentaje = DescuentoPorcentaje;
    this.SubTotal = SubTotal;
  }
}

export default DTODetalleOrden;
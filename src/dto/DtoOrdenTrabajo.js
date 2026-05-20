class DtoOrdenTrabajo {
  constructor({
    // --- 1. DATOS DE IDENTIFICACIÓN ---
    IdOrden = '0',
    IdCliente = '0',
    NombreCliente = '',
    NroNotaVenta = '',
    NroCotizacionAprobada = '',
    UsuarioModificaOT = '',
    IngresoOrdenCompra = '',
    ReferenciaDTE = '', // Aseguramos que calce exacto

    // --- 2. CONFIGURACIÓN Y LOGÍSTICA ---
    Sucursal = '', // Agregado aquí arriba para solucionar el error
    Bodega = '',
    Vendedor = '',
    EncargadoOT = '',
    EstadoOT = '',
    SinRebajaStock = false,

    // --- 3. TIEMPOS Y FECHAS ---
    FechaIngreso = '',
    HoraIngreso = '',
    HoraEntrega = '',
    FechaRealEntrega = '',
    HoraTermino = '',
    FechaEntregaCotizacionAprox = '',

    // --- 4. COMENTARIOS ---
    Observaciones = '',

    // --- 5. ENTRADA TEMPORAL DE PRODUCTOS/SERVICIOS ---
    TmpProductoCodigo = '',
    TmpProductoCantidad = 0,
    TmpProductoValorNeto = 0,
    TmpProductoDescuentoPorc = 0,
    TmpProductoTotalNeto = 0,
    TmpProductoComisionPorc = 0,
    TmpProductoTotalComision = 0,
    TmpProductoStock = '',

    // --- 6. TOTALES Y VALORES DE LA OT ---
    SubTotal = 0,
    DescuentoPorcGlobal = 0,
    DescuentoMontoGlobal = 0,
    TotalNeto = 0,
    TotalIVA = 0,
    TotalOT = 0,
    AbonadoOT = 0,
    UsuarioCrea = '',

    // --- 7. TABLAS DE DETALLES ---
    DetalleProductos = [],
    DetalleServicios = []
  } = {}) {
    // Asignaciones de identificación
    this.IdOrden = IdOrden;
    this.IdCliente = IdCliente;
    this.NombreCliente = NombreCliente;
    this.NroNotaVenta = NroNotaVenta;
    this.NroCotizacionAprobada = NroCotizacionAprobada;
    this.UsuarioModificaOT = UsuarioModificaOT;
    this.IngresoOrdenCompra = IngresoOrdenCompra;
    this.ReferenciaDTE = ReferenciaDTE; 

    // Asignaciones de logística
    this.Sucursal = Sucursal; 
    this.Bodega = Bodega;
    this.Vendedor = Vendedor;
    this.EncargadoOT = EncargadoOT;
    this.EstadoOT = EstadoOT;
    this.SinRebajaStock = SinRebajaStock;

    // Asignaciones de fechas
    this.FechaIngreso = FechaIngreso;
    this.HoraIngreso = HoraIngreso;
    this.HoraEntrega = HoraEntrega;
    this.FechaRealEntrega = FechaRealEntrega;
    this.HoraTermino = HoraTermino;
    this.FechaEntregaCotizacionAprox = FechaEntregaCotizacionAprox;

    // Comentarios (Corregido el error de tipeo en inglés)
    this.Observaciones = Observaciones; 

    // Campos temporales para la fila que se está digitando
    this.TmpProductoCodigo = TmpProductoCodigo;
    this.TmpProductoCantidad = TmpProductoCantidad;
    this.TmpProductoValorNeto = TmpProductoValorNeto;
    this.TmpProductoDescuentoPorc = TmpProductoDescuentoPorc;
    this.TmpProductoTotalNeto = TmpProductoTotalNeto;
    this.TmpProductoComisionPorc = TmpProductoComisionPorc;
    this.TmpProductoTotalComision = TmpProductoTotalComision;
    this.TmpProductoStock = TmpProductoStock;

    // Totales
    this.SubTotal = SubTotal;
    this.DescuentoPorcGlobal = DescuentoPorcGlobal;
    this.DescuentoMontoGlobal = DescuentoMontoGlobal;
    this.TotalNeto = TotalNeto;
    this.TotalIVA = TotalIVA;
    this.TotalOT = TotalOT;
    this.AbonadoOT = AbonadoOT;
    this.UsuarioCrea = UsuarioCrea;

    // Listas para las tablas
    this.DetalleProductos = DetalleProductos;
    this.DetalleServicios = DetalleServicios;
  }
}

export default DtoOrdenTrabajo;
import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Checkbox,
  FormControlLabel,
  TextField,
  Button,
  Typography,
  Tabs,
  Tab,
  MenuItem,
  Select,
  IconButton,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
  CircularProgress,
  InputAdornment
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import DeleteIcon from '@mui/icons-material/Delete';
import ClearIcon from '@mui/icons-material/Clear';
import SaveIcon from '@mui/icons-material/Save';
import BlockIcon from '@mui/icons-material/Block';
import PrintIcon from '@mui/icons-material/Print';

import OrdenTrabajoServicio from '../../apiservicios/servicio.ordentrabajo';
import DTODetalleOrden from "../../dto/DTODetalleOrden.js";
import DTOImagenOrden from "../../dto/DTOImagenOrden.js";

export default function GenerarOT({ valores = {}, handleChange = () => { }, limpiarValores = () => { } }) {


  const listado = [
  { id: 1, nombre: 'Bodega Central' },
  { id: 2, nombre: 'Bodega Norte' },
  { id: 3, nombre: 'Bodega Repuestos' }
];


const [listadobodega, setlistadobodega] = useState(listado);

  const [subTab, setSubTab] = useState(0);

  const [detalles, setdetalles] = useState([
    {
      "IdDetalle": "101",
      "Idorden": "12018",
      "IdTipo": "2",
      "Codigo": "REP-FILT01",
      "Descripcion": "FILTRO DE AIRE INDUSTRIAL TIPO A",
      "Cantidad": "2",
      "ValorUnitario": "6450",
      "DescuentoPorcentaje": "0",
      "SubTotal": "12900"
    }
  ]);
  const [imagenes, setimagenes] = useState([]);
  const [confirmarGuardar, setConfirmarGuardar] = useState(false);


  const [modalBuscar, setModalBuscar] = useState({
    abierto: false,
    tipo: '', // 'cliente', 'sucursal', 'bodega', 'encargado', 'vendedor', 'producto'
    titulo: ''
  });
  const [filtroTexto, setFiltroTexto] = useState('');
  const [datosBusqueda, setDatosBusqueda] = useState([]);
  const [cargandoModal, setCargandoModal] = useState(false);


  const handleChangeRef = useRef(handleChange);
  useEffect(() => {
    handleChangeRef.current = handleChange;
  }, [handleChange]);

  const stringDetalles = JSON.stringify(detalles);
  const valorDescuentoPorc = valores.DescuentoPorc || '0';


  const  cargarBodegas = ()=>{
 

  };
 
  const  cargarVendedores = ()=>{


  };

  useEffect(()=>{
    cargarBodegas();
    cargarVendedores();

  }, [])

  // --- CÁLCULO SEGURO DE TOTALES ---
  useEffect(() => {
    const netoAcumulado = detalles.reduce((acumulado, item) => {
      const subtotalItem = parseFloat(item.SubTotal) || 0;
      return acumulado + subtotalItem;
    }, 0);

    const descPorcGlobal = parseFloat(valorDescuentoPorc) || 0;
    const descuentoDinero = Math.round(netoAcumulado * (descPorcGlobal / 100));

    const netoConDescuento = netoAcumulado - descuentoDinero;
    const iva = Math.round(netoConDescuento * 0.19);
    const totalOT = netoConDescuento + iva;

    // Llamamos de forma segura mediante la referencia sin activar el bucle
    const guardar = handleChangeRef.current;
    if (guardar) {
      guardar('SubTotal', Math.round(netoAcumulado).toString());
      guardar('TotalNeto', Math.round(netoConDescuento).toString());
      guardar('DescuentoS', descuentoDinero.toString());
      guardar('TotalIVA', iva.toString());
      guardar('TotalOT', Math.round(totalOT).toString());
    }
  }, [detalles, valorDescuentoPorc]);

  const handleAbrirBuscador = async (tipo, titulo) => {
    setModalBuscar({ abierto: true, tipo, titulo });
    setCargandoModal(true);
    setFiltroTexto('');
    try {
      let datos = [];
      switch (tipo) {
        case 'cliente':
          datos = await OrdenTrabajoServicio.obtenerClientes();
          break;
        case 'sucursal':
          datos = await OrdenTrabajoServicio.obtenerSucursales(valores.NombreCliente);
          break;
        case 'bodega':
          datos = await OrdenTrabajoServicio.obtenerBodegas();
          break;
        case 'encargado':
          datos = await OrdenTrabajoServicio.obtenerEncargados();
          break;
        case 'vendedor':
          datos = await OrdenTrabajoServicio.obtenerVendedores();
          break;
        case 'producto':
          datos = await OrdenTrabajoServicio.obtenerProductos();
          break;
        default:
          datos = [];
      }
      setDatosBusqueda(datos || []);
    } catch (error) {
      console.error(`Error al cargar datos de ${tipo} desde la BD:`, error);
      setDatosBusqueda([]);
    } finally {
      setCargandoModal(false);
    }
  };

  const handleSeleccionarElemento = (item) => {
    switch (modalBuscar.tipo) {
      case 'cliente':
        handleChange('NombreCliente', item.nombre || item.Nombre || item.Descripcion || '');
        if (item.sucursal || item.Sucursal) {
          handleChange('Sucursal', item.sucursal || item.Sucursal);
        }
        break;
      case 'sucursal':
        handleChange('Sucursal', item.nombre || item.Nombre || item.Descripcion || '');
        break;
      case 'bodega':
        handleChange('Bodega', item.nombre || item.Nombre || item.Descripcion || '');
        break;
      case 'encargado':
        handleChange('EncargadoOT', item.nombre || item.Nombre || item.Descripcion || '');
        break;
      case 'vendedor':
        handleChange('Vendedor', item.nombre || item.Nombre || item.Descripcion || '');
        break;
      case 'producto':
        handleChange('TmpProductoCodigo', item.codigo || item.Codigo || '');
        handleChange('TmpProductoDescripcion', item.descripcion || item.Descripcion || '');
        handleChange('TmpProductoValorNeto', (item.precioNeto || item.PrecioNeto || item.ValorUnitario || 0).toString());
        handleChange('TmpProductoStock', (item.stock || item.Stock || 0).toString());
        break;
      default:
        break;
    }
    setModalBuscar({ abierto: false, tipo: '', titulo: '' });
    setDatosBusqueda([]);
    setFiltroTexto('');
  };

  const validarSoloNumerosKeyDown = (e) => {
    if (
      ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key) ||
      (e.ctrlKey === true || e.metaKey === true)
    ) {
      return;
    }
    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault();
    }
  };

  const agregarProductoALaTabla = () => {
    const codigo = valores.TmpProductoCodigo || '';
    const cantidad = valores.TmpProductoCantidad || '';
    const valorNeto = valores.TmpProductoValorNeto || '';
    const descPorc = valores.TmpProductoDescuentoPorc || '0';
    const totalNeto = valores.TmpProductoTotalNeto || '0';

    if (!codigo.trim() || !cantidad || !valorNeto) {
      alert("Por favor, ingrese el Producto, Cantidad y Valor Neto antes de agregar.");
      return;
    }

    const nuevoDetalle = {
      "IdDetalle": String(Date.now()),
      "Idorden": valores.IdOrden || "12018",
      "IdTipo": subTab === 0 ? "2" : "1",
      "Codigo": codigo,
      "Descripcion": valores.TmpProductoDescripcion || `PRODUCTO / REPUESTO: ${codigo}`,
      "Cantidad": cantidad,
      "ValorUnitario": valorNeto,
      "DescuentoPorcentaje": descPorc,
      "SubTotal": totalNeto
    };

    setdetalles(prev => [...prev, nuevoDetalle]);

    const camposALimpiar = [
      'TmpProductoCodigo', 'TmpProductoCantidad', 'TmpProductoValorNeto',
      'TmpProductoDescuentoPorc', 'TmpProductoTotalNeto', 'TmpProductoStock', 'TmpProductoDescripcion'
    ];
    camposALimpiar.forEach(campo => handleChange(campo, ''));
  };

  const handleCalculosYCambios = (campo, valor) => {
    const valorLimpio = valor.replace(/[^0-9]/g, '');
    handleChange(campo, valorLimpio);

    const datosActualizados = { ...valores, [campo]: valorLimpio };

    if (['TmpProductoCantidad', 'TmpProductoValorNeto', 'TmpProductoDescuentoPorc'].includes(campo)) {
      const cant = parseFloat(datosActualizados.TmpProductoCantidad) || 0;
      const netoUnitario = parseFloat(datosActualizados.TmpProductoValorNeto) || 0;
      const descPorc = parseFloat(datosActualizados.TmpProductoDescuentoPorc) || 0;

      const totalNetoItem = cant * netoUnitario;
      const descuentoItem = totalNetoItem * (descPorc / 100);
      const finalNetoItem = totalNetoItem - descuentoItem;

      handleChange('TmpProductoTotalNeto', Math.round(finalNetoItem).toString());
    }
  };

  const verificarEnter = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      agregarProductoALaTabla();
    }
  };

  const eliminarDetalle = (idDetalle) => {
    setdetalles(prev => prev.filter(item => item.IdDetalle !== idDetalle));
  };

  const GuardarOrden = async () => {
    try {
      var datos = {
        "Cabecera": valores,
        "Detalles": (detalles || []).map(d => new DTODetalleOrden(d)),
        "Imagenes": (imagenes || []).map(d => new DTOImagenOrden(d))
      };
      const response = await OrdenTrabajoServicio.CreateOrdenTrabajo(datos);
      const idOT = response?.Id;
      alert(`¡Orden de Trabajo guardada correctamente! ID OT: ${idOT || valores.IdOrden}`);
    } catch (error) {
      console.error('Error al guardar la orden:', error);
      alert(`Error al guardar la orden: ${error.message || 'Problema en el servidor'}`);
    }
  };

  const ConfirmarGuardarOrden = () => {
    setConfirmarGuardar(true);
  };

  const LimpiarFormulario = () => {
    setdetalles([]);
    setimagenes([]);
    setSubTab(0);
    const emptyVal = '';
    const fieldsToClear = [
      'NombreCliente', 'Sucursal', 'FechaIngreso', 'HoraIngreso', 'FechaEntrega', 'HoraEntrega', 'Bodega',
      'FechaRealEntrega', 'HoraTermino', 'FechaEntregaCotiz', 'IdOrden', 'NroNotaVenta', 'EncargadoOT',
      'UsuarioModifica', 'Vendedor', 'Observaciones', 'SubTotal', 'TotalNeto', 'DescuentoPorc',
      'TotalIVA', 'DescuentoS', 'TotalOT', 'TmpProductoCantidad', 'TmpProductoValorNeto',
      'TmpProductoDescuentoPorc', 'TmpProductoTotalNeto', 'TmpProductoComisionPorc', 'TmpProductoTotalComision',
      'TmpProductoCodigo', 'TmpProductoStock', 'TmpProductoDescripcion'
    ];
    fieldsToClear.forEach((key) => {
      if (handleChange) handleChange(key, emptyVal);
    });
    if (limpiarValores) limpiarValores();
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>

      {/* SECCIÓN 1: DATOS DE IDENTIFICACIÓN Y TIEMPOS */}
      <Box sx={{ border: '1px solid #cfd8dc', borderRadius: '6px', p: 2.5, pt: 2, position: 'relative', backgroundColor: '#fff' }}>
        <Typography variant="body2" sx={{ position: 'absolute', top: '-10px', left: '15px', backgroundColor: '#fff', px: 1, color: '#005cb2', fontWeight: 'bold', fontSize: '12px' }}>
          Datos de Identificación y Tiempos
        </Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 2, mt: 0.5 }}>
          {/* LUPA: CLIENTE */}
          <TextField
            label="Cliente"
            size="small"
            value={valores.NombreCliente || ''}
            onChange={(e) => handleChange('NombreCliente', e.target.value)}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => handleAbrirBuscador('cliente', 'Buscar Cliente')}>
                      <SearchIcon sx={{ color: '#0066cc' }} />
                    </IconButton>
                  </InputAdornment>
                )
              }
            }}
            sx={{ gridColumn: 'span 7' }}
          />

          {/* LUPA: SUCURSAL */}
          <TextField
            label="Sucursal"
            size="small"
            value={valores.Sucursal || ''}
            onChange={(e) => handleChange('Sucursal', e.target.value)}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => handleAbrirBuscador('sucursal', 'Buscar Sucursal')}>
                      <SearchIcon sx={{ color: '#0066cc' }} />
                    </IconButton>
                  </InputAdornment>
                )
              }
            }}
            sx={{ gridColumn: 'span 5' }}
          />

          <TextField label="Ingreso OT" type="date" size="small" value={valores.FechaIngreso || ''} onChange={(e) => handleChange('FechaIngreso', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ gridColumn: 'span 3' }} />
          <TextField label="Hora Ingreso" type="time" size="small" value={valores.HoraIngreso || ''} onChange={(e) => handleChange('HoraIngreso', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ gridColumn: 'span 3' }} />
          <TextField label="Fecha Entrega" type="date" size="small" value={valores.FechaEntrega || ''} onChange={(e) => handleChange('FechaEntrega', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ gridColumn: 'span 3' }} />
          <TextField label="Hora Entrega" type="time" size="small" value={valores.HoraEntrega || ''} onChange={(e) => handleChange('HoraEntrega', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ gridColumn: 'span 3' }} />

           <FormControl size="small" sx={{ gridColumn: 'span 4' }}>
  <InputLabel id="bodega-select-label">Bodega</InputLabel>
  <Select
    labelId="bodega-select-label"
    id="bodega-select"
    value={valores.Bodega || ''}
    label="Bodega"
    onChange={(e) => handleChange('Bodega', e.target.value)}
  >
    {listadobodega && listadobodega.length > 0 ? (
      listadobodega.map((item, index) => (
        <MenuItem 
          key={item.id || item.codigo || item.Codigo || index} 
          value={item.id || item.codigo || item.Codigo || item.nombre || item.Nombre}
        >
          {item.nombre || item.Nombre || item.descripcion || item.Descripcion}
        </MenuItem>
      ))
    ) : (
      <MenuItem disabled value="">
        <em>Sin bodegas disponibles</em>
      </MenuItem>
    )}
  </Select>
</FormControl>

          <TextField label="Fecha Real Entrega OT" type="date" size="small" value={valores.FechaRealEntrega || ''} onChange={(e) => handleChange('FechaRealEntrega', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ gridColumn: 'span 4' }} />
          <TextField label="Hora Término OT" type="time" size="small" value={valores.HoraTermino || ''} onChange={(e) => handleChange('HoraTermino', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ backgroundColor: '#f4fbf4', gridColumn: 'span 4' }} />

          <TextField label="Fecha Entrega Cotización Aproximadamente" type="date" size="small" value={valores.FechaEntregaCotizacionAprox || ''} onChange={(e) => handleChange('FechaEntregaCotizacionAprox', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ gridColumn: 'span 12' }} />
        </Box>
      </Box>

      {/* SECCIÓN 2: GESTIÓN INTERNA */}
      <Box sx={{ border: '1px solid #cfd8dc', borderRadius: '6px', p: 2.5, pt: 2, position: 'relative', backgroundColor: '#fff', width: '100%' }}>
        <Typography variant="body2" sx={{ position: 'absolute', top: '-10px', left: '15px', backgroundColor: '#fff', px: 1, color: '#005cb2', fontWeight: 'bold', fontSize: '12px' }}>
          Gestión Interna
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 0.5, width: '100%' }}>

          {/* FILA 1 */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 2, width: '100%' }}>
            <Box sx={{ gridColumn: 'span 3', display: 'flex', alignItems: 'center', gap: 1 }}>
              <Button variant="contained" size="small" sx={{ textTransform: 'none', backgroundColor: '#0066cc', minWidth: '120px', fontSize: '11px', whiteSpace: 'nowrap' }}>
                Cambiar N° OT
              </Button>
              <Checkbox checked={valores.SinRebajaStock || false} onChange={(e) => handleChange('SinRebajaStock', e.target.checked)} size="small" />
            </Box>

            <TextField
              label="Número OT"
              size="small"
              value={valores.IdOrden || ''}
              onKeyDown={validarSoloNumerosKeyDown}
              onChange={(e) => handleChange('IdOrden', e.target.value.replace(/[^0-9]/g, ''))}
              sx={{ '& .MuiInputBase-input': { fontWeight: 'bold', color: '#0066cc', textAlign: 'center' }, gridColumn: 'span 2' }}
            />

            <TextField
              label="N° Nota de Venta"
              size="small"
              value={valores.NroNotaVenta || ''}
              onChange={(e) => handleChange('NroNotaVenta', e.target.value)}
              sx={{ gridColumn: 'span 3' }}
            />

            <Box sx={{ gridColumn: 'span 4' }}>
              <FormControl size="small" fullWidth variant="outlined">
                <InputLabel id="estado-ot-select-label">Estado OT</InputLabel>
                <Select
                  labelId="estado-ot-select-label"
                  label="Estado OT"
                  value={valores.EstadoOT || 'MANTENIMIENTO'}
                  onChange={(e) => handleChange('EstadoOT', e.target.value)}
                >
                  <MenuItem value="MANTENIMIENTO">MANTENIMIENTO</MenuItem>
                  <MenuItem value="APROBADO">APROBADO</MenuItem>
                  <MenuItem value="RECHAZADO">RECHAZADO</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>

          {/* FILA 2: LUPAS ENCARGADO Y VENDEDOR */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 2, width: '100%' }}>
            <TextField
              label="Encargado OT"
              size="small"
              value={valores.EncargadoOT || ''}
              onChange={(e) => handleChange('EncargadoOT', e.target.value)}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => handleAbrirBuscador('encargado', 'Buscar Encargado OT')}>
                        <SearchIcon sx={{ color: '#0066cc' }} />
                      </IconButton>
                    </InputAdornment>
                  )
                }
              }}
              sx={{ gridColumn: 'span 6' }}
            />

            <TextField
              label="Vendedor"
              size="small"
              value={valores.Vendedor || ''}
              onChange={(e) => handleChange('Vendedor', e.target.value)}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => handleAbrirBuscador('vendedor', 'Buscar Vendedor')}>
                        <SearchIcon sx={{ color: '#0066cc' }} />
                      </IconButton>
                    </InputAdornment>
                  )
                }
              }}
              sx={{ gridColumn: 'span 6' }}
            />
          </Box>

          {/* FILA 3 */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 2, width: '100%' }}>
            <TextField
              label="Ingreso Orden de Compra"
              size="small"
              value={valores.IngresoOrdenCompra || ''}
              onChange={(e) => handleChange('IngresoOrdenCompra', e.target.value)}
              sx={{ gridColumn: 'span 6' }}
            />

            <Button variant="outlined" size="medium" sx={{ textTransform: 'none', height: '38px', gridColumn: 'span 3', fontSize: '11.5px', fontWeight: 'bold' }}>
              Referencias DTE
            </Button>

            <TextField
              label="Usuario Modifica"
              size="small"
              value={valores.UsuarioModifica || '--'}
              slotProps={{ input: { readOnly: true } }}
              sx={{ gridColumn: 'span 3' }}
            />
          </Box>

          {/* FILA 4 */}
          <Box sx={{ width: '100%', mt: 0.5 }}>
            <TextField label="Observaciones" size="small" fullWidth multiline rows={1.5} value={valores.Observaciones || ''} onChange={(e) => handleChange('Observaciones', e.target.value)} sx={{ backgroundColor: '#fffbe6' }} />
          </Box>

        </Box>
      </Box>

      {/* SECCIÓN 3: TABLA DE PRODUCTOS / SERVICIOS */}
      <Box sx={{ border: '1px solid #cfd8dc', borderRadius: '6px', backgroundColor: '#eaeff4', overflow: 'hidden' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#cfd8dc', px: 2, py: 0.5 }}>
          <Tabs value={subTab} onChange={(e, val) => setSubTab(val)} sx={{ minHeight: '36px', '& .MuiTab-root': { minHeight: '36px', py: 0.5, fontSize: '13px' } }}>
            <Tab label="Productos" sx={{ textTransform: 'none', fontWeight: 'bold' }} />
            <Tab label="Servicios" sx={{ textTransform: 'none', fontWeight: 'bold' }} />
          </Tabs>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'green', fontSize: '12px' }}>N° Cotización Aprobada:</Typography>
            <Select size="small" value={valores.NroCotizacionAprobada || '0'} onChange={(e) => handleChange('NroCotizacionAprobada', e.target.value)} sx={{ height: '26px', backgroundColor: '#fff', minWidth: '60px', fontSize: '12px' }}>
              <MenuItem value="0">0</MenuItem>
            </Select>
          </Box>
        </Box>

        {subTab === 0 ? (
          <Box sx={{ p: 1.5, display: 'flex', gap: 1.5, alignItems: 'center', backgroundColor: '#f5f5f5', flexWrap: 'wrap', borderBottom: '1px solid #e0e0e0' }}>

            {/* LUPA: PRODUCTO */}
            <TextField
              label="Producto"
              size="small"
              value={valores.TmpProductoCodigo || ''}
              onChange={(e) => handleChange('TmpProductoCodigo', e.target.value)}
              sx={{ width: '35%', backgroundColor: '#fff' }}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => handleAbrirBuscador('producto', 'Buscar Producto / Repuesto')}>
                        <SearchIcon sx={{ color: '#0066cc' }} />
                      </IconButton>
                    </InputAdornment>
                  )
                }
              }}
            />

            <TextField label="Stock" type="text" size="small" value={valores.TmpProductoStock || '0'} slotProps={{ input: { readOnly: true } }} sx={{ width: '65px', backgroundColor: '#e0e0e0' }} />
            <FormControlLabel control={<Checkbox checked={valores.SinRebajaStock || false} onChange={(e) => handleChange('SinRebajaStock', e.target.checked)} color="error" size="small" />} label={<Typography variant="caption" sx={{ color: 'red', fontWeight: 'bold' }}>Sin rebaja de stock</Typography>} />

            <Box sx={{ width: '100%', display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 1, mt: 0.5 }}>
              <TextField
                label="Cantidad"
                type="text"
                size="small"
                value={valores.TmpProductoCantidad || ''}
                onKeyDown={validarSoloNumerosKeyDown}
                onChange={(e) => handleCalculosYCambios('TmpProductoCantidad', e.target.value)}
                onKeyDownCapture={verificarEnter}
                sx={{ backgroundColor: '#fff' }}
              />
              <TextField
                label="Valor Neto"
                type="text"
                size="small"
                value={valores.TmpProductoValorNeto || ''}
                onKeyDown={validarSoloNumerosKeyDown}
                onChange={(e) => handleCalculosYCambios('TmpProductoValorNeto', e.target.value)}
                onKeyDownCapture={verificarEnter}
                sx={{ backgroundColor: '#fff' }}
              />
              <TextField
                label="Descto.(%)"
                type="text"
                size="small"
                value={valores.TmpProductoDescuentoPorc || ''}
                onKeyDown={validarSoloNumerosKeyDown}
                onChange={(e) => handleCalculosYCambios('TmpProductoDescuentoPorc', e.target.value)}
                onKeyDownCapture={verificarEnter}
                sx={{ backgroundColor: '#fff' }}
              />
              <TextField label="Total Neto" type="text" size="small" value={valores.TmpProductoTotalNeto || ''} slotProps={{ input: { readOnly: true } }} sx={{ backgroundColor: '#e0e0e0' }} />
              <TextField
                label="Comisión (%)"
                type="text"
                size="small"
                value={valores.TmpProductoComisionPorc || ''}
                onKeyDown={validarSoloNumerosKeyDown}
                onChange={(e) => handleCalculosYCambios('TmpProductoComisionPorc', e.target.value)}
                sx={{ backgroundColor: '#fff' }}
              />
              <TextField
                label="Total Comisión ($)"
                type="text"
                size="small"
                value={valores.TmpProductoTotalComision || ''}
                onKeyDown={validarSoloNumerosKeyDown}
                onChange={(e) => handleCalculosYCambios('TmpProductoTotalComision', e.target.value)}
                sx={{ backgroundColor: '#fff' }}
              />
            </Box>

            <Box sx={{ width: '100%', display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
              <Button variant="contained" size="small" onClick={agregarProductoALaTabla} sx={{ textTransform: 'none', backgroundColor: '#0066cc' }}>
                + Insertar Producto
              </Button>
            </Box>
          </Box>
        ) : (
          <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5, backgroundColor: '#f5f5f5', borderBottom: '1px solid #e0e0e0' }}>
            <TextField label="Servicio (texto libre)" size="small" fullWidth multiline rows={2} sx={{ backgroundColor: '#fffbe6' }} placeholder="Escribe la descripción del servicio técnico aquí..." />
            <Box sx={{ width: '100%', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 1 }}>
              <TextField label="Cantidad" type="text" size="small" onKeyDown={validarSoloNumerosKeyDown} onChange={(e) => handleChange('TmpServicioCantidad', e.target.value.replace(/[^0-9]/g, ''))} sx={{ backgroundColor: '#fff' }} />
              <TextField label="Valor Unitario $" type="text" size="small" onKeyDown={validarSoloNumerosKeyDown} onChange={(e) => handleChange('TmpServicioValor', e.target.value.replace(/[^0-9]/g, ''))} sx={{ backgroundColor: '#fff' }} />
              <TextField label="Descuento (%)" type="text" size="small" onKeyDown={validarSoloNumerosKeyDown} onChange={(e) => handleChange('TmpServicioDesc', e.target.value.replace(/[^0-9]/g, ''))} sx={{ backgroundColor: '#fff' }} />
              <TextField label="Total Neto $" type="text" size="small" sx={{ backgroundColor: '#e0e0e0' }} slotProps={{ input: { readOnly: true } }} />
              <TextField label="Comisión (%)" type="text" size="small" onKeyDown={validarSoloNumerosKeyDown} onChange={(e) => handleChange('TmpServicioComision', e.target.value.replace(/[^0-9]/g, ''))} sx={{ backgroundColor: '#fff' }} />
            </Box>
          </Box>
        )}

        <Box sx={{ overflowX: 'auto', backgroundColor: '#fff' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'sans-serif', fontSize: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: '#0056b3', color: '#fff', height: '32px' }}>
                <th style={{ padding: '0 8px', width: '40px' }}>N°</th>
                <th style={{ textAlign: 'left', padding: '0 8px' }}>Código</th>
                <th style={{ textAlign: 'left', padding: '0 8px' }}>Descripción / Servicio</th>
                <th style={{ textAlign: 'center', padding: '0 8px' }}>Cantidad</th>
                <th style={{ textAlign: 'right', padding: '0 8px' }}>Valor Unit.</th>
                <th style={{ textAlign: 'center', padding: '0 8px' }}>Desc. (%)</th>
                <th style={{ textAlign: 'right', padding: '0 8px' }}>Sub Total</th>
                <th style={{ textAlign: 'center', padding: '0 8px' }}>Comisión (%)</th>
                <th style={{ textAlign: 'right', padding: '0 8px' }}>Comisión ($)</th>
                <th style={{ textAlign: 'center', padding: '0 8px', width: '50px' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {detalles
                .filter(item => (subTab === 0 ? item.IdTipo === "2" : item.IdTipo === "1"))
                .map((item, index) => (
                  <tr key={item.IdDetalle} style={{ height: '36px', borderBottom: '1px solid #e0e0e0', backgroundColor: index % 2 === 0 ? '#f9fbfd' : '#fff' }}>
                    <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#0066cc' }}>{index + 1}</td>
                    <td style={{ padding: '0 8px', fontFamily: 'monospace' }}>{item.Codigo}</td>
                    <td style={{ padding: '0 8px' }}>{item.Descripcion}</td>
                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{item.Cantidad}</td>
                    <td style={{ textAlign: 'right', padding: '0 8px' }}>${parseFloat(item.ValorUnitario).toLocaleString('es-CL')}</td>
                    <td style={{ textAlign: 'center' }}>{item.DescuentoPorcentaje}%</td>
                    <td style={{ textAlign: 'right', padding: '0 8px', fontWeight: 'bold', color: '#0056b3' }}>${parseFloat(item.SubTotal).toLocaleString('es-CL')}</td>
                    <td style={{ textAlign: 'center' }}>0%</td>
                    <td style={{ textAlign: 'right', padding: '0 8px' }}>$0</td>
                    <td style={{ textAlign: 'center' }}>
                      <IconButton size="small" color="error" onClick={() => eliminarDetalle(item.IdDetalle)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </Box>
      </Box>

      {/* PIE DE PANEL Y TOTALES */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 3, mt: 0.5, flexWrap: 'wrap-reverse' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: '400px' }}>
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
            <TextField label="Usuario crea OT" size="small" value={valores.UsuarioCrea || 'ADMINISTRADOR'} slotProps={{ input: { readOnly: true } }} sx={{ width: '160px' }} />
            <Box sx={{ border: '1px solid #0066cc', borderRadius: '4px', p: '2px 10px', display: 'flex', alignItems: 'center', gap: 1, backgroundColor: '#f0f7ff' }}>
              <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#0066cc' }}>Abonado OT:</Typography>
              <input
                type="text"
                value={valores.AbonadoOT || '0'}
                onKeyDown={validarSoloNumerosKeyDown}
                onChange={(e) => handleChange('AbonadoOT', e.target.value.replace(/[^0-9]/g, ''))}
                style={{ width: '55px', border: '1px solid #ccc', borderRadius: '4px', textAlign: 'center', padding: '2px' }}
              />
              <Button variant="contained" color="success" size="small" sx={{ textTransform: 'none', py: 0.1, px: 1, fontSize: '11px' }}>Abonar $</Button>
            </Box>
          </Box>

          <Typography variant="caption" sx={{ color: 'text.secondary', fontStyle: 'italic', pl: 0.5, fontSize: '11px' }}>
            * Presione F5 para ingresar las series de los productos / Presione F6 para buscar productos por series.
          </Typography>

          <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
            <Button variant="contained" size="small" sx={{ backgroundColor: '#1976d2', textTransform: 'none', fontSize: '12px' }} startIcon={<SearchIcon />}>Buscar</Button>
            <Button variant="outlined" size="small" sx={{ backgroundColor: '#757575', textTransform: 'none', fontSize: '12px' }} startIcon={<ClearIcon />} onClick={LimpiarFormulario}>Limpiar</Button>
            <Button variant="contained" size="small" sx={{ backgroundColor: '#2e7d32', textTransform: 'none', fontSize: '12px' }} startIcon={<SaveIcon />} onClick={ConfirmarGuardarOrden}>Grabar</Button>
            <Button variant="contained" size="small" sx={{ backgroundColor: '#d32f2f', textTransform: 'none', fontSize: '12px' }} startIcon={<BlockIcon />}>Anular</Button>
            <Button variant="contained" size="small" sx={{ backgroundColor: '#37474f', textTransform: 'none', fontSize: '12px' }} startIcon={<PrintIcon />}>Imprimir</Button>
          </Box>
        </Box>

        <Box sx={{ border: '1px solid #ccc', borderRadius: '6px', p: 1.5, backgroundColor: '#f8fafc', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1.5, flexGrow: 1, maxWidth: '650px' }}>
          <TextField label="Sub Total $" type="text" size="small" value={valores.SubTotal || '0'} slotProps={{ input: { readOnly: true } }} />
          <TextField
            label="Total Neto $"
            type="text"
            size="small"
            value={valores.TotalNeto || '0'}
            slotProps={{ input: { readOnly: true } }}
          />
          <TextField
            label="Descuento (%)"
            type="text"
            size="small"
            value={valores.DescuentoPorc || '0'}
            onKeyDown={validarSoloNumerosKeyDown}
            onChange={(e) => handleChange('DescuentoPorc', e.target.value)}
          />
          <TextField label="Total IVA $" type="text" size="small" value={valores.TotalIVA || '0'} slotProps={{ input: { readOnly: true } }} />
          <TextField
            label="Descuento $"
            type="text"
            size="small"
            value={valores.DescuentoS || '0'}
            slotProps={{ input: { readOnly: true } }}
          />
          <TextField label="Total OT $" type="text" size="small" value={valores.TotalOT || '0'} slotProps={{ input: { readOnly: true } }} sx={{ '& .MuiInputBase-input': { fontWeight: 'bold', backgroundColor: '#e2e8f0' } }} />
        </Box>
      </Box>

      {/* BOTÓN GENERAL DE CERRAR */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
        <Button variant="contained" size="small" sx={{ backgroundColor: '#212121', color: '#fff', px: 3, fontSize: '12px', '&:hover': { backgroundColor: '#424242' } }}>
          X CERRAR
        </Button>
      </Box>


      <Dialog open={confirmarGuardar} onClose={()=>setConfirmarGuardar(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Confirmación</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Desea guardar este documento?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" color="success" onClick={async()=>{setConfirmarGuardar(false); await GuardarOrden();}}>Sí</Button>
          <Button variant="outlined" onClick={()=>setConfirmarGuardar(false)}>No</Button>
        </DialogActions>
      </Dialog>

      {/* --- DIÁLOGO / MODAL DE BÚSQUEDA INTEGRADO CON BASE DE DATOS --- */}
      <Dialog
        open={modalBuscar.abierto}
        onClose={() => { setModalBuscar({ abierto: false, tipo: '', titulo: '' }); setFiltroTexto(''); setDatosBusqueda([]); }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 'bold', color: '#005cb2', fontSize: '16px' }}>
          {modalBuscar.titulo}
        </DialogTitle>

        <DialogContent dividers sx={{ minHeight: '300px' }}>
          <TextField
            fullWidth
            size="small"
            label={`Buscar registros...`}
            value={filtroTexto}
            onChange={(e) => setFiltroTexto(e.target.value)}
            sx={{ mb: 2 }}
          />

          {cargandoModal ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 5 }}>
              <CircularProgress size={35} />
            </Box>
          ) : (
            <List sx={{ maxHeight: '350px', overflowY: 'auto' }}>
              {datosBusqueda
                ?.filter(item => {
                  const valorAFiltrar = (
                    item.nombre || item.Nombre ||
                    item.codigo || item.Codigo ||
                    item.descripcion || item.Descripcion || ''
                  ).toLowerCase();
                  return valorAFiltrar.includes(filtroTexto.toLowerCase());
                })
                .map((item, idx) => {
                  const primario = item.nombre || item.Nombre || item.Descripcion || item.Codigo || 'Sin Nombre';
                  const secundario = item.codigo || item.Codigo
                    ? `Código: ${item.codigo || item.Codigo}`
                    : item.cargo || item.Cargo || '';

                  return (
                    <Box key={item.id || item.Id || idx}>
                      <ListItem disablePadding>
                        <ListItemButton onClick={() => handleSeleccionarElemento(item)}>
                          <ListItemText
                            primary={<Typography sx={{ fontWeight: 'bold', fontSize: '13.5px' }}>{primario}</Typography>}
                            secondary={secundario}
                          />
                        </ListItemButton>
                      </ListItem>
                      <Divider />
                    </Box>
                  );
                })}
              {!cargandoModal && datosBusqueda.length === 0 && (
                <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', mt: 4 }}>
                  No se encontraron registros en la base de datos para esta selección.
                </Typography>
              )}
            </List>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
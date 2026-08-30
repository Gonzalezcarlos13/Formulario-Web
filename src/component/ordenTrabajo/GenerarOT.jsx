import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
  CircularProgress,
  InputAdornment,
  Autocomplete,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  TableContainer
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import BlockIcon from '@mui/icons-material/Block';
import PrintIcon from '@mui/icons-material/Print';
import EditIcon from '@mui/icons-material/Edit';

import OrdenTrabajoServicio from '../../apiservicios/servicio.ordentrabajo';
import DTODetalleOrden from "../../dto/DTODetalleOrden.js";
import DTOImagenOrden from "../../dto/DTOImagenOrden.js";

const BASE_API_URL = process.env.REACT_APP_API_URL || 'http://localhost/apichess';

const listaOpcionesOT = ['DESPACHADO', 'EMPAQUE', 'ENTREGADO', 'LABORATORIO'];
const opcionesVendedores = ['PAUL CELERY', 'VALENZUELA G. XIMENA', 'RAUL CASTILLO'];

const listadoBodegasInicial = [
  { id: 1, nombre: 'Bodega Central' },
  { id: 2, nombre: 'Bodega Norte' },
  { id: 3, nombre: 'Bodega Repuestos' }
];

export default function GenerarOT({ valores = {}, handleChange = () => { }, limpiarValores = () => { } }) {
  const [listadobodega] = useState(listadoBodegasInicial);
  const [, setListadoSucursales] = useState([]);
  const [subTab, setSubTab] = useState(0);

  const [detalles, setDetalles] = useState([
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
  const [imagenes] = useState([]);
  const [confirmarGuardar, setConfirmarGuardar] = useState(false);

  const [modalBuscar, setModalBuscar] = useState({ abierto: false, tipo: '', titulo: '' });
  const [filtroTexto, setFiltroTexto] = useState('');
  const [datosBusqueda, setDatosBusqueda] = useState([]);
  const [cargandoModal, setCargandoModal] = useState(false);

  // Auxiliar para obtener fecha y hora actual
  const obtenerFechaYHoraActuales = useCallback(() => {
    const ahora = new Date();
    const anio = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const dia = String(ahora.getDate()).padStart(2, '0');
    const horas = String(ahora.getHours()).padStart(2, '0');
    const minutos = String(ahora.getMinutes()).padStart(2, '0');

    return {
      fechaActual: `${anio}-${mes}-${dia}`,
      horaActual: `${horas}:${minutos}`
    };
  }, []);

  // Setear valores iniciales de fecha/hora si no existen
  useEffect(() => {
    const { fechaActual, horaActual } = obtenerFechaYHoraActuales();
    if (!valores.FechaIngreso) handleChange('FechaIngreso', fechaActual);
    if (!valores.HoraIngreso) handleChange('HoraIngreso', horaActual);
  }, [valores.FechaIngreso, valores.HoraIngreso, handleChange, obtenerFechaYHoraActuales]);

  // Carga de sucursales inicial
  useEffect(() => {
    let mounted = true;
    const fetchSucursales = async () => {
      try {
        const { data } = await OrdenTrabajoServicio.obtenerSucursales();
        if (mounted) setListadoSucursales(data || []);
      } catch (e) {
        console.error('Error al cargar sucursales:', e);
        if (mounted) setListadoSucursales([]);
      }
    };
    fetchSucursales();
    return () => { mounted = false; };
  }, []);

  // Cálculo de totales Memoizado
  const valorDescuentoPorc = valores.DescuentoPorc || '0';
  
  const totalesCalculados = useMemo(() => {
    const netoAcumulado = detalles.reduce((acumulado, item) => acumulado + (parseFloat(item.SubTotal) || 0), 0);
    const descPorcGlobal = parseFloat(valorDescuentoPorc) || 0;
    const descuentoDinero = Math.round(netoAcumulado * (descPorcGlobal / 100));
    const netoConDescuento = netoAcumulado - descuentoDinero;
    const iva = Math.round(netoConDescuento * 0.19);
    const totalOT = netoConDescuento + iva;

    return {
      SubTotal: Math.round(netoAcumulado).toString(),
      TotalNeto: Math.round(netoConDescuento).toString(),
      DescuentoS: descuentoDinero.toString(),
      TotalIVA: iva.toString(),
      TotalOT: Math.round(totalOT).toString()
    };
  }, [detalles, valorDescuentoPorc]);

  // Actualización de campos globales cuando cambien los totales calculados
  useEffect(() => {
    Object.entries(totalesCalculados).forEach(([key, val]) => {
      if (valores[key] !== val) {
        handleChange(key, val);
      }
    });
  }, [totalesCalculados, handleChange, valores]);

  const handleImprimir = async () => {
    try {
      const response = await fetch(`${BASE_API_URL}/clientes.php/guardarImpresion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(valores),
      });

      if (!response.ok) throw new Error('Error en el servidor al procesar la información.');
      window.print();
    } catch (error) {
      console.error('Error al enviar e imprimir:', error);
      alert('Ocurrió un error al enviar la información.');
    }
  };

  const handleAbrirBuscador = async (tipo, titulo) => {
    setModalBuscar({ abierto: true, tipo, titulo });
    setCargandoModal(true);
    setFiltroTexto('');
    try {
      let datos = [];
      if (tipo === 'cliente') {
        const resp = await fetch(`${BASE_API_URL}/clientes.php/getAllClientes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idsucursal: '1', busqueda: '', id: 0 })
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const jsonResp = await resp.json();
        const items = Array.isArray(jsonResp) ? jsonResp : (jsonResp.data || Object.values(jsonResp) || []);

        datos = items.map(item => ({
          ...item,
          nombre: item.nombre || item.Nombre || item.ClienteNombre || item.RazonSocial || '',
          codigo: item.codigo || item.Codigo || item.IDCliente || item.RUT || '',
          Descripcion: item.Descripcion || item.Direccion || '',
          sucursal: item.sucursal || item.Sucursal || ''
        }));
      } else if (tipo === 'producto') {
        const resp = await fetch(`${BASE_API_URL}/productos.php/GetAllProductosPaginado`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idsucursal: '1', busqueda: '', pagina: 1, registro: 17 })
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const json = await resp.json();
        const items = Array.isArray(json.listado) ? json.listado : [];

        datos = items.map(item => {
          const nombreLimpio = item.Descripcion ? item.Descripcion.replace(/^\t+/, '').trim() : (item.nombre || 'Sin Descripción');
          const valorNeto = item.Neto ? parseFloat(item.Neto) : (item.precioNeto || item.PrecioNeto || 0);
          const valorStock = item.Stock !== undefined ? parseInt(item.Stock, 10) : (item.stock || 0);

          return {
            ...item,
            id: item.id || item.Id,
            codigo: item.Codigo || item.codigo || '',
            nombre: nombreLimpio,
            descripcion: nombreLimpio,
            Neto: valorNeto,
            stock: valorStock,
            Stock: valorStock
          };
        });
      }
      setDatosBusqueda(datos);
    } catch (error) {
      console.error(`Error al cargar datos de ${tipo}:`, error);
      setDatosBusqueda([]);
    } finally {
      setCargandoModal(false);
    }
  };

  const handleSeleccionarElemento = (item) => {
    const formatearFechaInput = (cadenaFecha) => {
      if (!cadenaFecha) return '';
      const d = new Date(cadenaFecha);
      if (!isNaN(d.getTime())) {
        return d.toISOString().split('T')[0];
      }
      return '';
    };

    if (modalBuscar.tipo === 'cliente') {
      const clienteNombre = item.RazonSocial || item.nombre || item.Nombre || item.Descripcion || '';
      if (clienteNombre) handleChange('NombreCliente', clienteNombre);

      if (item.FechaIngreso) handleChange('FechaIngreso', formatearFechaInput(item.FechaIngreso));
      if (item.FechaVencto) handleChange('FechaEntrega', formatearFechaInput(item.FechaVencto));
      if (item.Fechainicio) handleChange('FechaRealEntrega', formatearFechaInput(item.Fechainicio));

      if (item.FechaVencto && item.FechaVencto.includes(' ')) {
        handleChange('HoraEntrega', item.FechaVencto.split(' ')[1]);
      }

      handleChange('HoraTermino', '');
      if (item.Vendedor) handleChange('Vendedor', item.Vendedor);
      if (item.Observaciones) handleChange('Observaciones', item.Observaciones);

      const valSucursal = (item.sucursal || item.Sucursal || item.IdSucursal)?.toString();
      if (valSucursal) {
        handleChange('Sucursal', (valSucursal === '1' || valSucursal === 'Casa Matriz (1)') ? 'INTERNA' : valSucursal);
      }
    } else if (modalBuscar.tipo === 'producto') {
      const cod = item.codigo || item.Codigo || '';
      const desc = item.descripcion || item.nombre || item.Descripcion || '';
      const netoVal = item.Neto !== undefined ? item.Neto : (item.precio || item.ValorUnitario || 0);
      const stockVal = item.Stock !== undefined ? item.Stock : (item.stock || 0);

      handleChange('TmpProductoCodigo', cod);
      handleChange('TmpProductoDescripcion', desc);
      handleChange('TmpProductoValorNeto', Math.round(parseFloat(netoVal) || 0).toString());
      handleChange('TmpProductoStock', stockVal.toString());

      let cantidadActual = parseFloat(valores.TmpProductoCantidad) || 1;
      handleChange('TmpProductoCantidad', cantidadActual.toString());

      const descPorcActual = parseFloat(valores.TmpProductoDescuentoPorc) || 0;
      const totalNetoItem = cantidadActual * (parseFloat(netoVal) || 0);
      const descuentoItem = totalNetoItem * (descPorcActual / 100);
      const finalNetoItem = totalNetoItem - descuentoItem;

      handleChange('TmpProductoTotalNeto', Math.round(finalNetoItem).toString());
    }

    setModalBuscar({ abierto: false, tipo: '', titulo: '' });
    setDatosBusqueda([]);
    setFiltroTexto('');
  };

  const validarSoloNumerosKeyDown = (e) => {
    if (
      ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key) ||
      e.ctrlKey || e.metaKey
    ) {
      return;
    }
    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault();
    }
  };

  const agregarProductoALaTabla = () => {
    const codigo = valores.TmpProductoCodigo || '';
    const descripcion = valores.TmpProductoDescripcion || `PRODUCTO / REPUESTO: ${codigo}`;
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
      "Descripcion": descripcion,
      "Cantidad": cantidad,
      "ValorUnitario": valorNeto,
      "DescuentoPorcentaje": descPorc,
      "SubTotal": totalNeto
    };

    setDetalles(prev => [...prev, nuevoDetalle]);

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
    setDetalles(prev => prev.filter(item => item.IdDetalle !== idDetalle));
  };

  const GuardarOrden = async () => {
    try {
      const datos = {
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

  const LimpiarFormulario = () => {
    setDetalles([]);
    setSubTab(0);
    const fieldsToClear = [
      'NombreCliente', 'Sucursal', 'FechaIngreso', 'HoraIngreso', 'FechaEntrega', 'HoraEntrega', 'Bodega',
      'FechaRealEntrega', 'HoraTermino', 'FechaEntregaCotiz', 'IdOrden', 'NroNotaVenta', 'EncargadoOT',
      'UsuarioModifica', 'Vendedor', 'Observaciones', 'SubTotal', 'TotalNeto', 'DescuentoPorc',
      'TotalIVA', 'DescuentoS', 'TotalOT', 'TmpProductoCantidad', 'TmpProductoValorNeto',
      'TmpProductoDescuentoPorc', 'TmpProductoTotalNeto', 'TmpProductoComisionPorc', 'TmpProductoTotalComision',
      'TmpProductoCodigo', 'TmpProductoStock', 'TmpProductoDescripcion'
    ];
    fieldsToClear.forEach(key => handleChange(key, ''));
    if (limpiarValores) limpiarValores();

    const { fechaActual, horaActual } = obtenerFechaYHoraActuales();
    handleChange('FechaIngreso', fechaActual);
    handleChange('HoraIngreso', horaActual);
  };

  const styleInputIcons = {
    '& input::-webkit-calendar-picker-indicator': {
      display: 'block !important',
      cursor: 'pointer'
    }
  };

  const detallesFiltrados = useMemo(() => {
    return detalles.filter(item => (subTab === 0 ? item.IdTipo === "2" : item.IdTipo === "1"));
  }, [detalles, subTab]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1.5, sm: 2, md: 2.5 }, width: '100%', p: { xs: 1, sm: 2 } }}>
      
      {/* SECCIÓN IDENTIFICACIÓN Y TIEMPOS */}
      <Box sx={{ border: '1px solid #cfd8dc', borderRadius: '6px', p: { xs: 1.5, sm: 2.5 }, pt: 2, position: 'relative', backgroundColor: '#fff', width: '100%' }}>
        <Typography variant="body2" sx={{ position: 'absolute', top: '-10px', left: '15px', backgroundColor: '#fff', px: 1, color: '#005cb2', fontWeight: 'bold', fontSize: '12px' }}>
          Datos de Identificación y Tiempos
        </Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(6, 1fr)', md: 'repeat(12, 1fr)' }, gap: { xs: 1.5, sm: 2 }, mt: 0.5, width: '100%' }}>
          <TextField
            label="Cliente"
            size="small"
            fullWidth
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
            sx={{ gridColumn: { xs: '1 / -1', sm: 'span 6', md: 'span 7' } }}
          />

          <FormControl size="small" fullWidth sx={{ gridColumn: { xs: '1 / -1', sm: 'span 6', md: 'span 5' } }}>
            <TextField
              size="small"
              id="sucursal-input"
              label="Sucursal"
              value={valores.Sucursal || 'INTERNA'}
              slotProps={{ input: { readOnly: true } }}
              variant="outlined"
              fullWidth
            />
          </FormControl>

          <TextField label="Ingreso OT" type="date" size="small" fullWidth value={valores.FechaIngreso || ''} onChange={(e) => handleChange('FechaIngreso', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ ...styleInputIcons, gridColumn: { xs: '1 / -1', sm: 'span 3', md: 'span 3' } }} />
          <TextField label="Hora Ingreso" type="time" size="small" fullWidth value={valores.HoraIngreso || ''} onChange={(e) => handleChange('HoraIngreso', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ ...styleInputIcons, gridColumn: { xs: '1 / -1', sm: 'span 3', md: 'span 3' } }} />
          <TextField label="Fecha Entrega" type="date" size="small" fullWidth value={valores.FechaEntrega || ''} onChange={(e) => handleChange('FechaEntrega', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ ...styleInputIcons, gridColumn: { xs: '1 / -1', sm: 'span 3', md: 'span 3' } }} />
          <TextField label="Hora Entrega" type="time" size="small" fullWidth value={valores.HoraEntrega || ''} onChange={(e) => handleChange('HoraEntrega', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ ...styleInputIcons, gridColumn: { xs: '1 / -1', sm: 'span 3', md: 'span 3' } }} />

          <FormControl size="small" fullWidth sx={{ gridColumn: { xs: '1 / -1', sm: 'span 6', md: 'span 4' } }}>
            <InputLabel id="bodega-select-label">Bodega</InputLabel>
            <Select
              labelId="bodega-select-label"
              id="bodega-select"
              value={valores.Bodega || ''}
              label="Bodega"
              onChange={(e) => handleChange('Bodega', e.target.value)}
            >
              {listadobodega.length > 0 ? (
                listadobodega.map((item, index) => (
                  <MenuItem key={item.id || index} value={item.id || item.nombre}>
                    {item.nombre}
                  </MenuItem>
                ))
              ) : (
                <MenuItem disabled value=""><em>Sin bodegas disponibles</em></MenuItem>
              )}
            </Select>
          </FormControl>

          <TextField label="Fecha Real Entrega OT" type="date" size="small" fullWidth value={valores.FechaRealEntrega || ''} onChange={(e) => handleChange('FechaRealEntrega', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ ...styleInputIcons, gridColumn: { xs: '1 / -1', sm: 'span 3', md: 'span 4' } }} />
          <TextField label="Hora Término OT" type="time" size="small" fullWidth value={valores.HoraTermino || ''} onChange={(e) => handleChange('HoraTermino', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ ...styleInputIcons, backgroundColor: '#f4fbf4', gridColumn: { xs: '1 / -1', sm: 'span 3', md: 'span 4' } }} />
          <TextField label="Fecha Entrega Cotización Aprox." type="date" size="small" fullWidth value={valores.FechaEntregaCotizacionAprox || ''} onChange={(e) => handleChange('FechaEntregaCotizacionAprox', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ ...styleInputIcons, gridColumn: '1 / -1' }} />
        </Box>
      </Box>

      {/* SECCIÓN GESTIÓN INTERNA */}
      <Box sx={{ border: '1px solid #cfd8dc', borderRadius: '6px', p: { xs: 1.5, sm: 2.5 }, pt: 2, position: 'relative', backgroundColor: '#fff', width: '100%' }}>
        <Typography variant="body2" sx={{ position: 'absolute', top: '-10px', left: '15px', backgroundColor: '#fff', px: 1, color: '#005cb2', fontWeight: 'bold', fontSize: '12px' }}>
          Gestión Interna
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1.5, sm: 2 }, mt: 0.5, width: '100%' }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(6, 1fr)', md: 'repeat(12, 1fr)' }, gap: { xs: 1.5, sm: 2 }, width: '100%' }}>
            <Box sx={{ gridColumn: { xs: '1 / -1', sm: 'span 6', md: 'span 3' }, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
              <Button variant="contained" size="small" sx={{ textTransform: 'none', backgroundColor: '#0066cc', minWidth: '110px', fontSize: '11px', whiteSpace: 'nowrap' }}>
                Cambiar N° OT
              </Button>
              <FormControlLabel
                control={<Checkbox checked={valores.SinRebajaStock || false} onChange={(e) => handleChange('SinRebajaStock', e.target.checked)} size="small" />}
                label={<Typography variant="caption">Sin Rebaja</Typography>}
                sx={{ m: 0 }}
              />
            </Box>

            <TextField
              label="Número OT"
              size="small"
              fullWidth
              value={valores.IdOrden || ''}
              onKeyDown={validarSoloNumerosKeyDown}
              onChange={(e) => handleChange('IdOrden', e.target.value.replace(/[^0-9]/g, ''))}
              sx={{ '& .MuiInputBase-input': { fontWeight: 'bold', color: '#0066cc', textAlign: 'center' }, gridColumn: { xs: '1 / -1', sm: 'span 3', md: 'span 2' } }}
            />

            <TextField
              label="N° Nota de Venta"
              size="small"
              fullWidth
              value={valores.NroNotaVenta || ''}
              onChange={(e) => handleChange('NroNotaVenta', e.target.value)}
              sx={{ gridColumn: { xs: '1 / -1', sm: 'span 3', md: 'span 3' } }}
            />

            <Box sx={{ gridColumn: { xs: '1 / -1', sm: 'span 6', md: 'span 4' } }}>
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

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: { xs: 1.5, sm: 2 }, width: '100%' }}>
            <Autocomplete
              size="small"
              fullWidth
              options={listaOpcionesOT}
              value={valores.EncargadoOT || null}
              onChange={(e, newValue) => handleChange('EncargadoOT', newValue || '')}
              renderInput={(params) => <TextField {...params} label="Encargado OT" placeholder="Seleccione o busque..." />}
            />

            <Autocomplete
              size="small"
              fullWidth
              options={opcionesVendedores}
              value={valores.Vendedor || null}
              onChange={(e, newValue) => handleChange('Vendedor', newValue || '')}
              renderInput={(params) => <TextField {...params} label="Vendedor" placeholder="Seleccione o busque..." />}
            />
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(6, 1fr)', md: 'repeat(12, 1fr)' }, gap: { xs: 1.5, sm: 2 }, width: '100%' }}>
            <TextField
              label="Ingreso Orden de Compra"
              size="small"
              fullWidth
              value={valores.IngresoOrdenCompra || ''}
              onChange={(e) => handleChange('IngresoOrdenCompra', e.target.value)}
              sx={{ gridColumn: { xs: '1 / -1', sm: 'span 6', md: 'span 6' } }}
            />

            <Button variant="outlined" size="medium" fullWidth sx={{ textTransform: 'none', height: '38px', gridColumn: { xs: '1 / -1', sm: 'span 3', md: 'span 3' }, fontSize: '11.5px', fontWeight: 'bold' }}>
              Referencias DTE
            </Button>

            <TextField
              label="Usuario Modifica"
              size="small"
              fullWidth
              value={valores.UsuarioModifica || '--'}
              slotProps={{ input: { readOnly: true } }}
              sx={{ gridColumn: { xs: '1 / -1', sm: 'span 3', md: 'span 3' } }}
            />
          </Box>

          <Box sx={{ width: '100%', mt: 0.5 }}>
            <TextField label="Observaciones" size="small" fullWidth multiline rows={1.5} value={valores.Observaciones || ''} onChange={(e) => handleChange('Observaciones', e.target.value)} sx={{ backgroundColor: '#fffbe6' }} />
          </Box>
        </Box>
      </Box>

      {/* SECCIÓN TABLA PRODUCTOS Y SERVICIOS CON MUI */}
      <Box sx={{ border: '1px solid #cfd8dc', borderRadius: '6px', backgroundColor: '#eaeff4', overflow: 'hidden', width: '100%' }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, backgroundColor: '#cfd8dc', px: 2, py: 0.5, gap: 1 }}>
          <Tabs value={subTab} onChange={(e, val) => setSubTab(val)} sx={{ minHeight: '36px', '& .MuiTab-root': { minHeight: '36px', py: 0.5, fontSize: '13px' } }}>
            <Tab label="Productos" sx={{ textTransform: 'none', fontWeight: 'bold' }} />
            <Tab label="Servicios" sx={{ textTransform: 'none', fontWeight: 'bold' }} />
          </Tabs>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: { xs: 'space-between', sm: 'flex-end' }, gap: 1, pb: { xs: 0.5, sm: 0 } }}>
            <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'green', fontSize: '12px' }}>N° Cotización Aprobada:</Typography>
            <Select size="small" value={valores.NroCotizacionAprobada || '0'} onChange={(e) => handleChange('NroCotizacionAprobada', e.target.value)} sx={{ height: '26px', backgroundColor: '#fff', minWidth: '60px', fontSize: '12px' }}>
              <MenuItem value="0">0</MenuItem>
            </Select>
          </Box>
        </Box>

        {subTab === 0 ? (
          <Box sx={{ p: { xs: 1, sm: 1.5 }, display: 'flex', flexDirection: 'column', gap: 1.5, backgroundColor: '#f5f5f5', borderBottom: '1px solid #e0e0e0' }}>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 1.5, alignItems: { xs: 'stretch', md: 'center' }, width: '100%' }}>
              <TextField
                label="Producto"
                size="small"
                fullWidth
                value={valores.TmpProductoDescripcion || valores.TmpProductoCodigo || ''}
                onChange={(e) => handleChange('TmpProductoDescripcion', e.target.value)}
                sx={{ backgroundColor: '#fff', flexGrow: 1 }}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => handleAbrirBuscador('producto', 'Mantenedor de Productos')}>
                          <SearchIcon sx={{ color: '#0066cc' }} />
                        </IconButton>
                      </InputAdornment>
                    )
                  }
                }}
              />

              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <TextField label="Stock" type="text" size="small" value={valores.TmpProductoStock || '0'} slotProps={{ input: { readOnly: true } }} sx={{ width: { xs: '50%', md: '80px' }, backgroundColor: '#e0e0e0' }} />
                <FormControlLabel control={<Checkbox checked={valores.SinRebajaStock || false} onChange={(e) => handleChange('SinRebajaStock', e.target.checked)} color="error" size="small" />} label={<Typography variant="caption" sx={{ color: 'red', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Sin rebaja</Typography>} />
              </Box>
            </Box>

            <Box sx={{ width: '100%', display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(6, 1fr)' }, gap: 1 }}>
              <TextField label="Cantidad" type="text" size="small" fullWidth value={valores.TmpProductoCantidad || ''} onKeyDown={validarSoloNumerosKeyDown} onChange={(e) => handleCalculosYCambios('TmpProductoCantidad', e.target.value)} onKeyDownCapture={verificarEnter} sx={{ backgroundColor: '#fff' }} />
              <TextField label="Valor Neto" type="text" size="small" fullWidth value={valores.TmpProductoValorNeto || ''} onKeyDown={validarSoloNumerosKeyDown} onChange={(e) => handleCalculosYCambios('TmpProductoValorNeto', e.target.value)} onKeyDownCapture={verificarEnter} sx={{ backgroundColor: '#fff' }} />
              <TextField label="Descto.(%)" type="text" size="small" fullWidth value={valores.TmpProductoDescuentoPorc || ''} onKeyDown={validarSoloNumerosKeyDown} onChange={(e) => handleCalculosYCambios('TmpProductoDescuentoPorc', e.target.value)} onKeyDownCapture={verificarEnter} sx={{ backgroundColor: '#fff' }} />
              <TextField label="Total Neto" type="text" size="small" fullWidth value={valores.TmpProductoTotalNeto || ''} slotProps={{ input: { readOnly: true } }} sx={{ backgroundColor: '#e0e0e0' }} />
              <TextField label="Comisión (%)" type="text" size="small" fullWidth value={valores.TmpProductoComisionPorc || ''} onKeyDown={validarSoloNumerosKeyDown} onChange={(e) => handleCalculosYCambios('TmpProductoComisionPorc', e.target.value)} sx={{ backgroundColor: '#fff' }} />
              <TextField label="Total Comisión ($)" type="text" size="small" fullWidth value={valores.TmpProductoTotalComision || ''} onKeyDown={validarSoloNumerosKeyDown} onChange={(e) => handleCalculosYCambios('TmpProductoTotalComision', e.target.value)} sx={{ backgroundColor: '#fff' }} />
            </Box>

            <Box sx={{ width: '100%', display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
              <Button variant="contained" size="small" fullWidth sx={{ display: { xs: 'block', sm: 'none' }, textTransform: 'none', backgroundColor: '#0066cc' }} onClick={agregarProductoALaTabla}>
                + Insertar Producto
              </Button>
              <Button variant="contained" size="small" sx={{ display: { xs: 'none', sm: 'inline-flex' }, textTransform: 'none', backgroundColor: '#0066cc' }} onClick={agregarProductoALaTabla}>
                + Insertar Producto
              </Button>
            </Box>
          </Box>
        ) : (
          <Box sx={{ p: { xs: 1, sm: 1.5 }, display: 'flex', flexDirection: 'column', gap: 1.5, backgroundColor: '#f5f5f5', borderBottom: '1px solid #e0e0e0' }}>
            <TextField label="Servicio (texto libre)" size="small" fullWidth multiline rows={2} sx={{ backgroundColor: '#fffbe6' }} placeholder="Escribe la descripción del servicio técnico aquí..." />
            <Box sx={{ width: '100%', display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(5, 1fr)' }, gap: 1 }}>
              <TextField label="Cantidad" type="text" size="small" fullWidth onKeyDown={validarSoloNumerosKeyDown} onChange={(e) => handleChange('TmpServicioCantidad', e.target.value.replace(/[^0-9]/g, ''))} sx={{ backgroundColor: '#fff' }} />
              <TextField label="Valor Unitario $" type="text" size="small" fullWidth onKeyDown={validarSoloNumerosKeyDown} onChange={(e) => handleChange('TmpServicioValor', e.target.value.replace(/[^0-9]/g, ''))} sx={{ backgroundColor: '#fff' }} />
              <TextField label="Descuento (%)" type="text" size="small" fullWidth onKeyDown={validarSoloNumerosKeyDown} onChange={(e) => handleChange('TmpServicioDesc', e.target.value.replace(/[^0-9]/g, ''))} sx={{ backgroundColor: '#fff' }} />
              <TextField label="Total Neto $" type="text" size="small" fullWidth sx={{ backgroundColor: '#e0e0e0' }} slotProps={{ input: { readOnly: true } }} />
              <TextField label="Comisión (%)" type="text" size="small" fullWidth onKeyDown={validarSoloNumerosKeyDown} onChange={(e) => handleChange('TmpServicioComision', e.target.value.replace(/[^0-9]/g, ''))} sx={{ backgroundColor: '#fff' }} />
            </Box>
          </Box>
        )}

        <TableContainer component={Paper} elevation={0} sx={{ width: '100%', overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 700 }}>
            <TableHead sx={{ backgroundColor: '#0056b3' }}>
              <TableRow>
                <TableCell align="center" sx={{ color: '#fff', fontWeight: 'bold' }}>N°</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Código</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Descripción / Servicio</TableCell>
                <TableCell align="center" sx={{ color: '#fff', fontWeight: 'bold' }}>Cantidad</TableCell>
                <TableCell align="right" sx={{ color: '#fff', fontWeight: 'bold' }}>Valor Unit.</TableCell>
                <TableCell align="center" sx={{ color: '#fff', fontWeight: 'bold' }}>Desc. (%)</TableCell>
                <TableCell align="right" sx={{ color: '#fff', fontWeight: 'bold' }}>Sub Total</TableCell>
                <TableCell align="center" sx={{ color: '#fff', fontWeight: 'bold' }}>Comisión (%)</TableCell>
                <TableCell align="right" sx={{ color: '#fff', fontWeight: 'bold' }}>Comisión ($)</TableCell>
                <TableCell align="center" sx={{ color: '#fff', fontWeight: 'bold' }}>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {detallesFiltrados.map((item, index) => (
                <TableRow key={item.IdDetalle} sx={{ backgroundColor: index % 2 === 0 ? '#f9fbfd' : '#fff' }}>
                  <TableCell align="center" sx={{ fontWeight: 'bold', color: '#0066cc' }}>{index + 1}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace' }}>{item.Codigo}</TableCell>
                  <TableCell>{item.Descripcion}</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>{item.Cantidad}</TableCell>
                  <TableCell align="right">${parseFloat(item.ValorUnitario || 0).toLocaleString('es-CL')}</TableCell>
                  <TableCell align="center">{item.DescuentoPorcentaje}%</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', color: '#0056b3' }}>
                    ${parseFloat(item.SubTotal || 0).toLocaleString('es-CL')}
                  </TableCell>
                  <TableCell align="center">0%</TableCell>
                  <TableCell align="right">$0</TableCell>
                  <TableCell align="center">
                    <IconButton size="small" color="error" onClick={() => eliminarDetalle(item.IdDetalle)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* SECCIÓN ACCIONES Y TOTALES */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, justifyContent: 'space-between', alignItems: 'stretch', gap: 2, mt: 0.5 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, flex: 1, minWidth: { xs: '100%', lg: 'auto' } }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1.5, alignItems: { xs: 'stretch', sm: 'center' } }}>
            <TextField label="Usuario crea OT" size="small" value={valores.UsuarioCrea || 'ADMINISTRADOR'} slotProps={{ input: { readOnly: true } }} sx={{ width: { xs: '100%', sm: '160px' } }} />
            <Box sx={{ border: '1px solid #0066cc', borderRadius: '4px', p: '4px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, backgroundColor: '#f0f7ff' }}>
              <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#0066cc', whiteSpace: 'nowrap' }}>Abonado OT:</Typography>
              <input
                type="text"
                value={valores.AbonadoOT || '0'}
                onKeyDown={validarSoloNumerosKeyDown}
                onChange={(e) => handleChange('AbonadoOT', e.target.value.replace(/[^0-9]/g, ''))}
                style={{ width: '60px', border: '1px solid #ccc', borderRadius: '4px', textAlign: 'center', padding: '2px' }}
              />
              <Button variant="contained" color="success" size="small" sx={{ textTransform: 'none', py: 0.1, px: 1, fontSize: '11px', whiteSpace: 'nowrap' }}>Abonar $</Button>
            </Box>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(5, 1fr)' }, gap: 1, width: '100%' }}>
            <Button
              variant="contained"
              size="small"
              fullWidth
              startIcon={<SearchIcon />}
              onClick={() => handleAbrirBuscador('producto', 'Mantenedor de Productos')}
              sx={{ backgroundColor: '#1e88e5', textTransform: 'none', fontWeight: 600, borderRadius: '8px', '&:hover': { backgroundColor: '#1565c0' } }}
            >
              Buscar
            </Button>
            <Button
              variant="outlined"
              size="small"
              fullWidth
              startIcon={<DeleteIcon />}
              onClick={LimpiarFormulario}
              sx={{ color: '#546e7a', borderColor: '#cfd8dc', textTransform: 'none', fontWeight: 600, borderRadius: '8px', '&:hover': { backgroundColor: '#eceff1' } }}
            >
              Limpiar
            </Button>
            <Button
              variant="contained"
              size="small"
              fullWidth
              startIcon={<SaveIcon />}
              onClick={() => setConfirmarGuardar(true)}
              sx={{ backgroundColor: '#2e7d32', textTransform: 'none', fontWeight: 600, borderRadius: '8px', '&:hover': { backgroundColor: '#1b5e20' } }}
            >
              Grabar
            </Button>
            <Button
              variant="contained"
              size="small"
              fullWidth
              startIcon={<BlockIcon />}
              sx={{ backgroundColor: '#d32f2f', textTransform: 'none', fontWeight: 600, borderRadius: '8px', '&:hover': { backgroundColor: '#c62828' } }}
            >
              Anular
            </Button>
            <Button
              variant="outlined"
              size="small"
              fullWidth
              startIcon={<PrintIcon />}
              onClick={handleImprimir}
              sx={{ color: '#37474f', borderColor: '#b0bec5', textTransform: 'none', fontWeight: 600, borderRadius: '8px', gridColumn: { xs: 'span 2', sm: 'span 1' }, '@media print': { display: 'none' } }}
            >
              Imprimir
            </Button>
          </Box>
        </Box>

        <Box sx={{ border: '1px solid #ccc', borderRadius: '6px', p: 1.5, backgroundColor: '#f8fafc', display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(6, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 1.5, flex: 1, width: '100%' }}>
          <TextField label="Sub Total $" type="text" size="small" fullWidth value={valores.SubTotal || '0'} slotProps={{ input: { readOnly: true } }} />
          <TextField label="Total Neto $" type="text" size="small" fullWidth value={valores.TotalNeto || '0'} slotProps={{ input: { readOnly: true } }} />
          <TextField label="Descuento (%)" type="text" size="small" fullWidth value={valores.DescuentoPorc || '0'} onKeyDown={validarSoloNumerosKeyDown} onChange={(e) => handleChange('DescuentoPorc', e.target.value)} />
          <TextField label="Total IVA $" type="text" size="small" fullWidth value={valores.TotalIVA || '0'} slotProps={{ input: { readOnly: true } }} />
          <TextField label="Descuento $" type="text" size="small" fullWidth value={valores.DescuentoS || '0'} slotProps={{ input: { readOnly: true } }} />
          <TextField label="Total OT $" type="text" size="small" fullWidth value={valores.TotalOT || '0'} slotProps={{ input: { readOnly: true } }} sx={{ '& .MuiInputBase-input': { fontWeight: 'bold', backgroundColor: '#e2e8f0' } }} />
        </Box>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
        <Button variant="contained" size="small" sx={{ backgroundColor: '#212121', color: '#fff', px: 3, width: { xs: '100%', sm: 'auto' }, fontSize: '12px', '&:hover': { backgroundColor: '#424242' } }}>
          X CERRAR
        </Button>
      </Box>

      {/* DIÁLOGOS DE CONFIRMACIÓN Y BÚSQUEDA */}
      <Dialog open={confirmarGuardar} onClose={() => setConfirmarGuardar(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Confirmación</DialogTitle>
        <DialogContent>
          <Typography variant="body2">¿Desea guardar este documento?</Typography>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" color="success" onClick={async () => { setConfirmarGuardar(false); await GuardarOrden(); }}>Sí</Button>
          <Button variant="outlined" onClick={() => setConfirmarGuardar(false)}>No</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={modalBuscar.abierto}
        onClose={() => { setModalBuscar({ abierto: false, tipo: '', titulo: '' }); setFiltroTexto(''); setDatosBusqueda([]); }}
        fullWidth
        maxWidth={modalBuscar.tipo === 'producto' ? 'md' : 'sm'}
      >
        <DialogTitle sx={{ fontWeight: 'bold', color: '#005cb2', fontSize: '18px' }}>
          {modalBuscar.titulo || 'Búsqueda'}
        </DialogTitle>

        <DialogContent dividers sx={{ minHeight: '350px', p: { xs: 1, sm: 2 } }}>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField
              fullWidth
              size="small"
              placeholder={modalBuscar.tipo === 'producto' ? "Buscar por código o descripción..." : "Buscar cliente..."}
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
            />
          </Box>

          {cargandoModal ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 5 }}>
              <CircularProgress size={35} />
            </Box>
          ) : modalBuscar.tipo === 'producto' ? (
            <TableContainer component={Paper} elevation={0} sx={{ overflowX: 'auto', width: '100%' }}>
              <Table size="small" sx={{ minWidth: 500 }}>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableCell sx={{ fontWeight: 'bold' }}>Nro</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Código</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Descripción</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Stock</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Neto</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Bruto</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Ver / Seleccionar</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {datosBusqueda
                    .filter(item => {
                      const busqueda = (
                        (item.codigo || item.Codigo || '') + ' ' +
                        (item.descripcion || item.nombre || item.Descripcion || '')
                      ).toLowerCase();
                      return busqueda.includes(filtroTexto.toLowerCase());
                    })
                    .map((item, idx) => {
                      const netoVal = parseFloat(item.Neto || item.precio || 0);
                      const brutoVal = Math.round(netoVal * 1.19);

                      return (
                        <TableRow key={item.id || item.Id || idx} hover>
                          <TableCell>{idx + 1}</TableCell>
                          <TableCell sx={{ color: '#0066cc', fontWeight: 600, fontFamily: 'monospace' }}>
                            {item.codigo || item.Codigo || '--'}
                          </TableCell>
                          <TableCell>{item.descripcion || item.nombre || item.Descripcion || 'Sin Descripción'}</TableCell>
                          <TableCell>{item.Stock ?? item.stock ?? 0}</TableCell>
                          <TableCell align="right">${netoVal.toLocaleString('es-CL')}</TableCell>
                          <TableCell align="right">${brutoVal.toLocaleString('es-CL')}</TableCell>
                          <TableCell align="center">
                            <IconButton size="small" color="primary" onClick={() => handleSeleccionarElemento(item)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>

              {datosBusqueda.length === 0 && (
                <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', mt: 4 }}>
                  No se encontraron productos registrados.
                </Typography>
              )}
            </TableContainer>
          ) : (
            <List sx={{ maxHeight: '350px', overflowY: 'auto' }}>
              {datosBusqueda
                .filter(item => {
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
                    ? `Código/RUT: ${item.codigo || item.Codigo}`
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

              {datosBusqueda.length === 0 && (
                <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', mt: 4 }}>
                  No se encontraron clientes o registros.
                </Typography>
              )}
            </List>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setModalBuscar({ abierto: false, tipo: '', titulo: '' })} color="inherit">
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
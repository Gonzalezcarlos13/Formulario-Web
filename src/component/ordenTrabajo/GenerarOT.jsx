import React, { useState } from 'react';
import { Box, Checkbox, FormControlLabel, TextField, Button, Typography, Tabs, Tab, MenuItem, Select, IconButton } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import DeleteIcon from '@mui/icons-material/Delete';
import ClearIcon from '@mui/icons-material/Clear';
import SaveIcon from '@mui/icons-material/Save';
import BlockIcon from '@mui/icons-material/Block';
import PrintIcon from '@mui/icons-material/Print';

import OrdenTrabajoServicio from '../../apiservicios/servicio.ordentrabajo';
import DTODetalleOrden from "../../dto/DTODetalleOrden.js"
import DTOImagenOrden from "../../dto/DTOImagenOrden.js"



export default function GenerarOT({ valores = {}, handleChange = () => { }, limpiarValores = () => { } }) {
  const [subTab, setSubTab] = useState(0);

  const [detalles, setdetalles] = useState([
  {
    "IdDetalle": "101",
    "Idorden": "12018",
    "IdTipo": "1",
    "Codigo": "SERV-MANT",
    "Descripcion": "MANO DE OBRA MANTENIMIENTO GENERAL",
    "Cantidad": "1",
    "ValorUnitario": "35000",
    "DescuentoPorcentaje": "0",
    "SubTotal": "35000"
  },
  {
    "IdDetalle": "102",
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

const [imagenes, setimagenes] = useState([
  {
    "IdImagen": "5001",
    "Idorden": "12018",
    "RutaImagen": "https://tu-servidor.com/uploads/orden_12018_antes.jpg"
  },
  {
    "IdImagen": "5002",
    "Idorden": "12018",
    "RutaImagen": "https://tu-servidor.com/uploads/orden_12018_despues.jpg"
  }
]);




  const GuardarOrden = async () => {
    try {
      console.log("Enviando cabecera de la orden...", valores);

      // Enviamos SOLO los datos de la cabecera (valores) 

       var datos = {
          "Cabecera": valores, 
          "Detalles": (detalles || []).map(d => new DTODetalleOrden(d)),
          "Imagenes": (imagenes || []).map(d => new DTOImagenOrden(d))
      };

      const response = await OrdenTrabajoServicio.CreateOrdenTrabajo(datos);
      
      // 2. Capturamos el ID de forma flexible según cómo responda(.id, .IdOrden o el texto directo)
      const idOT = response?.Id ;
      alert(`¡Orden de Trabajo guardada correctamente! ID OT: ${idOT || valores.IdOrden}`);
    } catch (error) {
      console.error('Error al guardar la orden:', error);
      alert(`Error al guardar la orden: ${error.message || 'Problema en el servidor'}`);
    }
  };

  const LimpiarFormulario = () => {
    setdetalles([]);
    setimagenes([]);
    setSubTab(0);

    const emptyVal = '';
    const fieldsToClear = [
      'NombreCliente', 'Sucursal', 'FechaIngreso',
      'HoraIngreso', 'HoraEntrega', 'Bodega',
      'FechaRealEntrega', 'HoraTermino', 'FechaEntregaCotiz',
      'IdOrden', 'NroNotaVenta', 'EncargadoOT',
      'UsuarioModifica', 'Vendedor', 'Observaciones',
      'SubTotal', 'TotalNeto', 'DescuentoPorc',
      'TotalIVA', 'DescuentoS', 'TotalOT'
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
          <TextField label="Cliente" size="small" value={valores.NombreCliente || ''} onChange={(e) => handleChange('NombreCliente', e.target.value)} slotProps={{ input: { endAdornment: <SearchIcon sx={{ color: '#0066cc', cursor: 'pointer' }} /> } }} sx={{ gridColumn: 'span 3' }} />
          <TextField label="Sucursal" size="small" value={valores.Sucursal || ''} onChange={(e) => handleChange('Sucursal', e.target.value)} slotProps={{ input: { endAdornment: <SearchIcon sx={{ color: '#0066cc', cursor: 'pointer' }} /> } }} sx={{ gridColumn: 'span 2' }} />
          
          <TextField 
            label="Ingreso OT" 
            type="date" 
            size="small" 
            value={valores.FechaIngreso || ''} 
            onChange={(e) => handleChange('FechaIngreso', e.target.value)} 
            slotProps={{ inputLabel: { shrink: true } }} 
            sx={{ gridColumn: 'span 2' }} 
          />
          
          <TextField 
            label="Hora Ingreso" 
            type="time" 
            size="small" 
            value={valores.HoraIngreso || ''} 
            onChange={(e) => handleChange('HoraIngreso', e.target.value)} 
            slotProps={{ inputLabel: { shrink: true } }} 
            sx={{ gridColumn: 'span 1.5' }} 
          />
          
          <TextField 
            label="Hora Entrega" 
            type="time" 
            size="small" 
            value={valores.HoraEntrega || ''} 
            onChange={(e) => handleChange('HoraEntrega', e.target.value)} 
            slotProps={{ inputLabel: { shrink: true } }} 
            sx={{ gridColumn: 'span 1.5' }} 
          />
          
          <TextField label="Bodega" size="small" value={valores.Bodega || ''} onChange={(e) => handleChange('Bodega', e.target.value)} slotProps={{ input: { endAdornment: <SearchIcon sx={{ color: '#0066cc', cursor: 'pointer' }} /> } }} sx={{ gridColumn: 'span 2' }} />

          <TextField 
            label="Fecha Real Entrega OT" 
            type="date" 
            size="small" 
            value={valores.FechaRealEntrega || ''} 
            onChange={(e) => handleChange('FechaRealEntrega', e.target.value)} 
            slotProps={{ inputLabel: { shrink: true } }} 
            sx={{ gridColumn: 'span 3' }} 
          />
          
          <TextField 
            label="Hora Término OT" 
            type="time" 
            size="small" 
            value={valores.HoraTermino || ''} 
            onChange={(e) => handleChange('HoraTermino', e.target.value)} 
            slotProps={{ inputLabel: { shrink: true } }} 
            sx={{ backgroundColor: '#f4fbf4', gridColumn: 'span 2' }} 
          />
          
          <TextField 
            label="Fecha Entrega Cotización Aproximadamente" 
            type="date" 
            size="small" 
            value={valores.FechaEntregaCotizacionAprox || ''} 
            onChange={(e) => handleChange('FechaEntregaCotizacionAprox', e.target.value)} 
            slotProps={{ inputLabel: { shrink: true } }} 
            sx={{ gridColumn: 'span 4' }} 
          />
        </Box>
      </Box>

      {/* SECCIÓN 2: GESTIÓN INTERNA */}
      <Box sx={{ border: '1px solid #cfd8dc', borderRadius: '6px', p: 2.5, pt: 2, position: 'relative', backgroundColor: '#fff' }}>
        <Typography variant="body2" sx={{ position: 'absolute', top: '-10px', left: '15px', backgroundColor: '#fff', px: 1, color: '#005cb2', fontWeight: 'bold', fontSize: '12px' }}>
          Gestión Interna
        </Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 2, mt: 0.5, alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, gridColumn: 'span 2' }}>
            <Button variant="contained" size="small" sx={{ textTransform: 'none', backgroundColor: '#0066cc', minWidth: '95px', fontSize: '11px', px: 1 }}>Cambiar N° OT</Button>
            <Checkbox defaultChecked size="small" />
          </Box>
          <TextField label="Número OT" size="small" value={valores.IdOrden || ''} onChange={(e) => handleChange('IdOrden', e.target.value)} sx={{ '& .MuiInputBase-input': { fontWeight: 'bold', color: '#0066cc', textAlign: 'center' }, gridColumn: 'span 1.5' }} />
          <TextField label="N° Nota de Venta" size="small" value={valores.NroNotaVenta || ''} onChange={(e) => handleChange('NroNotaVenta', e.target.value)} sx={{ gridColumn: 'span 1.5' }} />
          <TextField label="Encargado OT" size="small" value={valores.EncargadoOT || ''} onChange={(e) => handleChange('EncargadoOT', e.target.value)} InputProps={{ endAdornment: <SearchIcon sx={{ color: '#0066cc', cursor: 'pointer' }} /> }} sx={{ gridColumn: 'span 2.5' }} />
          <TextField label="Usuario Modifica" size="small" value={valores.UsuarioModifica || '--'} InputProps={{ readOnly: true }} sx={{ gridColumn: 'span 1.5' }} />
          <TextField label="Vendedor" size="small" value={valores.Vendedor || ''} onChange={(e) => handleChange('Vendedor', e.target.value)} InputProps={{ endAdornment: <SearchIcon sx={{ color: '#0066cc', cursor: 'pointer' }} /> }} sx={{ gridColumn: 'span 2' }} />

          <Box sx={{ display: 'flex', alignItems: 'flex-start', flexDirection: 'column', gridColumn: 'span 1.5' }}>
            <Typography variant="caption" sx={{ ml: 0.5, color: 'text.secondary', fontSize: '10px' }}>Estado OT</Typography>
            <Select size="small" value={valores.EstadoOT || 'MANTENIMIENTO'} onChange={(e) => handleChange('EstadoOT', e.target.value)} sx={{ height: '38px', width: '100%' }}>
              <MenuItem value="MANTENIMIENTO">MANTENIMIENTO</MenuItem>
              <MenuItem value="APROBADO">APROBADO</MenuItem>
              <MenuItem value="RECHAZADO">RECHAZADO</MenuItem>
            </Select>
          </Box>

          <Button variant="outlined" size="medium" sx={{ textTransform: 'none', height: '38px', gridColumn: 'span 2', fontSize: '12px' }}>Referencias DTE</Button>
          <TextField label="Ingreso Orden de Compra" size="small" value={valores.IngresoOrdenCompra || ''} onChange={(e) => handleChange('IngresoOrdenCompra', e.target.value)} sx={{ gridColumn: 'span 3' }} />

          <Box sx={{ gridColumn: '1 / -1', mt: 0.5 }}>
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
            <TextField label="Producto" size="small" sx={{ width: '35%', backgroundColor: '#fff' }} slotProps={{ input: { endAdornment: <SearchIcon sx={{ color: '#0066cc' }} /> } }} />
            <TextField label="Stock" size="small" value="15" slotProps={{ input: { readOnly: true } }} sx={{ width: '65px', backgroundColor: '#e0e0e0' }} />
            <FormControlLabel control={<Checkbox defaultChecked color="error" size="small" />} label={<Typography variant="caption" sx={{ color: 'red', fontWeight: 'bold' }}>Sin rebaja de stock</Typography>} />

            <Box sx={{ width: '100%', display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 1, mt: 0.5 }}>
              {['Cantidad', 'Valor Neto', 'Descto.(%)', 'Total Neto', 'Comisión (%)', 'Total Comisión ($)'].map((h) => (
                <TextField key={h} label={h} size="small" sx={{ backgroundColor: '#fff' }} />
              ))}
            </Box>
          </Box>
        ) : (
          <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5, backgroundColor: '#f5f5f5', borderBottom: '1px solid #e0e0e0' }}>
            <TextField label="Servicio (texto libre)" size="small" fullWidth multiline rows={2} sx={{ backgroundColor: '#fffbe6' }} placeholder="Escribe la descripción del servicio técnico aquí..." />
            <Box sx={{ width: '100%', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 1 }}>
              {['Cantidad', 'Valor Unitario $', 'Descuento (%)', 'Total Neto $', 'Comisión (%)'].map((h) => (
                <TextField key={h} label={h} size="small" sx={{ backgroundColor: '#fff' }} />
              ))}
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
              <tr style={{ height: '36px', borderBottom: '1px solid #e0e0e0', backgroundColor: '#f9fbfd' }}>
                <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#0066cc' }}>1</td>
                <td style={{ padding: '0 8px', fontFamily: 'monospace' }}>0000 350 3500</td>
                <td style={{ padding: '0 8px' }}>ASPIRADOR STHIL BENCINA MS</td>
                <td style={{ textAlign: 'center', fontWeight: 'bold' }}>10</td>
                <td style={{ textAlign: 'right', padding: '0 8px' }}>$4.790</td>
                <td style={{ textAlign: 'center' }}>0%</td>
                <td style={{ textAlign: 'right', padding: '0 8px', fontWeight: 'bold', color: '#0056b3' }}>$47.900</td>
                <td style={{ textAlign: 'center' }}>0%</td>
                <td style={{ textAlign: 'right', padding: '0 8px' }}>$0</td>
                <td style={{ textAlign: 'center' }}>
                  <IconButton size="small" color="error"><DeleteIcon fontSize="small" /></IconButton>
                </td>
              </tr>
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
              <input type="number" value={valores.AbonadoOT || '0'} onChange={(e) => handleChange('AbonadoOT', e.target.value)} style={{ width: '45px', border: '1px solid #ccc', borderRadius: '4px', textAlign: 'center', padding: '2px' }} />
              <Button variant="contained" color="success" size="small" sx={{ textTransform: 'none', py: 0.1, px: 1, fontSize: '11px' }}>Abonar $</Button>
            </Box>
          </Box>

          <Typography variant="caption" sx={{ color: 'text.secondary', fontStyle: 'italic', pl: 0.5, fontSize: '11px' }}>
            * Presione F5 para ingresar las series de los productos / Presione F6 para buscar productos por series.
          </Typography>

          <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
            <Button variant="contained" size="small" sx={{ backgroundColor: '#1976d2', textTransform: 'none', fontSize: '12px' }} startIcon={<SearchIcon />}>Buscar</Button>
            <Button variant="outlined" size="small" sx={{ backgroundColor: '#757575', textTransform: 'none', fontSize: '12px' }} startIcon={<ClearIcon />} onClick={LimpiarFormulario}>Limpiar</Button>
            <Button variant="contained" size="small" sx={{ backgroundColor: '#2e7d32', textTransform: 'none', fontSize: '12px' }} startIcon={<SaveIcon />} onClick={GuardarOrden}>Grabar</Button>
            <Button variant="contained" size="small" sx={{ backgroundColor: '#d32f2f', textTransform: 'none', fontSize: '12px' }} startIcon={<BlockIcon />}>Anular</Button>
            <Button variant="contained" size="small" sx={{ backgroundColor: '#37474f', textTransform: 'none', fontSize: '12px' }} startIcon={<PrintIcon />}>Imprimir</Button>
          </Box>
        </Box>

        <Box sx={{ border: '1px solid #ccc', borderRadius: '6px', p: 1.5, backgroundColor: '#f8fafc', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1.5, flexGrow: 1, maxWidth: '650px' }}>
          <TextField label="Sub Total $" size="small" value={valores.SubTotal || '0'} slotProps={{ input: { readOnly: true } }} />
          <TextField label="Total Neto $" size="small" value={valores.TotalNeto || '0'} slotProps={{ input: { readOnly: true } }} />
          <TextField label="Descuento (%)" size="small" value={valores.DescuentoPorc || '0'} onChange={(e) => handleChange('DescuentoPorc', e.target.value)} />
          <TextField label="Total IVA $" size="small" value={valores.TotalIVA || '0'} slotProps={{ input: { readOnly: true } }} />
          <TextField label="Descuento $" size="small" value={valores.DescuentoS || '0'} onChange={(e) => handleChange('DescuentoS', e.target.value)} />
          <TextField label="Total OT $" size="small" value={valores.TotalOT || '0'} slotProps={{ input: { readOnly: true } }} sx={{ '& .MuiInputBase-input': { fontWeight: 'bold', backgroundColor: '#e2e8f0' } }} />
        </Box>
      </Box>

      {/* Botón Cerrar */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
        <Button variant="contained" size="small" sx={{ backgroundColor: '#212121', color: '#fff', px: 3, fontSize: '12px', '&:hover': { backgroundColor: '#424242' } }}>
          X CERRAR
        </Button>
      </Box>

    </Box>
  );
}
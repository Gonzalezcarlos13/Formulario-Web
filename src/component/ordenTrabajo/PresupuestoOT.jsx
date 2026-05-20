// src/component/ordenTrabajo/PresupuestoOT.jsx
import React, { useState, useEffect } from 'react';
import {
  Box, Grid, TextField, Typography, Button, Tabs, Tab,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper
} from '@mui/material';
import { Search, Save, Print } from '@mui/icons-material';

export default function PresupuestoOT({ formOrden = {} }) {
  const [subTab, setSubTab] = useState(0);

  // Estado local editable para manejar toda la información del formulario sin bloqueos
  const [datosPresupuesto, setDatosPresupuesto] = useState({
    IdOrden: '',
    NombreCliente: '',
    FechaIngreso: '',
    HoraIngreso: '',
    FechaEntrega: '',
    HoraEntrega: '',
    Bodega: '',
    EncargadoOT: '',
    Observaciones: '',
    // Campos para la sección de Detalles Insumos
    InsumoBodega: '',
    InsumoProducto: '',
    InsumoCantidad: '',
    // Valores monetarios editables de recaudación
    Neto: 0,
    Iva: 0,
    Total: 0
  });

  // Sincronizar el estado editable cuando cambia el DTO principal desde el formulario padre
  useEffect(() => {
    if (formOrden) {
      setDatosPresupuesto((prev) => ({
        ...prev,
        IdOrden: formOrden.IdOrden || '',
        NombreCliente: formOrden.NombreCliente || '',
        FechaIngreso: formOrden.FechaIngreso || '',
        HoraIngreso: formOrden.HoraIngreso || '',
        FechaEntrega: formOrden.FechaIngreso || '', // Inicializa con fecha disponible
        HoraEntrega: formOrden.HoraEntrega || '',
        Bodega: formOrden.Bodega || '',
        EncargadoOT: formOrden.EncargadoOT || '',
        Observaciones: formOrden.Observaciones || ''
      }));
    }
  }, [formOrden]);

  // Manejador genérico para actualizar dinámicamente cualquier campo modificado
  const handleChange = (campo, valor) => {
    setDatosPresupuesto((prev) => ({
      ...prev,
      [campo]: valor
    }));
  };

  // Fila de la grilla principal superior (simulando los datos cargados)
  const filasGrillaSuperior = [
    {
      codigo: '0000 350 3500',
      producto: 'ASPIRADOR STHIL BENCINA MS',
      cantidad: 10,
      valorNeto: 4790,
      dsctoValor: 0,
      dsctoPorc: 0,
      totalNeto: 47900,
      comision: 0
    }
  ];

  return (
    <Box sx={{ backgroundColor: '#f0f0f0', p: 1.5, borderRadius: 1, border: '1px solid #b0b0b0' }}>
      
      {/* ================= SECCIÓN 1: CABECERA GRIS SUPERIOR (DATOS EDITABLES) ================= */}
      <Box sx={{ backgroundColor: '#dcdcdc', p: 1.5, borderRadius: 1, border: '1px solid #b8b8b8', mb: 1.5 }}>
        <Grid container spacing={1} alignItems="center">
          
          {/* Número OT */}
          <Grid item xs={12} sm={3} display="flex" alignItems="center">
            <Typography variant="caption" sx={{ backgroundColor: '#0070d2', color: 'white', px: 1, py: 0.5, fontWeight: 'bold', minWidth: '100px', textAlign: 'center', fontSize: '11px' }}>
              Número O.T.:
            </Typography>
            <TextField 
              size="small" 
              fullWidth 
              value={datosPresupuesto.IdOrden} 
              onChange={(e) => handleChange('IdOrden', e.target.value)}
              sx={{ '& .MuiInputBase-input': { p: '4px', textAlign: 'center', backgroundColor: 'white', color: 'black', fontWeight: 'bold' } }} 
            />
          </Grid>

          {/* Cliente */}
          <Grid item xs={12} sm={6} display="flex" alignItems="center">
            <Typography variant="caption" sx={{ backgroundColor: '#0070d2', color: 'white', px: 1, py: 0.5, fontWeight: 'bold', minWidth: '100px', textAlign: 'center', fontSize: '11px' }}>
              Cliente:
            </Typography>
            <TextField 
              size="small" 
              fullWidth 
              value={datosPresupuesto.NombreCliente} 
              onChange={(e) => handleChange('NombreCliente', e.target.value)}
              sx={{ '& .MuiInputBase-input': { p: '4px', backgroundColor: 'white', color: 'black' } }} 
            />
          </Grid>

          <Grid item xs={12} sm={3}>
            <Button variant="contained" size="small" fullWidth sx={{ backgroundColor: '#0070d2', textTransform: 'none', fontWeight: 'bold', fontSize: '11px', height: '27px' }}>
              Observaciones
            </Button>
          </Grid>

          {/* Bloque de Fechas, Horas y Asignaciones (Todos Editables) */}
          <Grid item xs={12} sm={6}>
            <Grid container spacing={1}>
              
              <Grid item xs={6} display="flex" alignItems="center">
                <Typography variant="caption" sx={{ backgroundColor: '#0070d2', color: 'white', px: 1, py: 0.5, fontWeight: 'bold', minWidth: '90px', textAlign: 'center', fontSize: '11px' }}>
                  Fecha ingreso:
                </Typography>
                <TextField size="small" fullWidth value={datosPresupuesto.FechaIngreso} onChange={(e) => handleChange('FechaIngreso', e.target.value)} sx={{ '& .MuiInputBase-input': { p: '4px', backgroundColor: 'white', textAlign: 'center' } }} />
              </Grid>

              <Grid item xs={6} display="flex" alignItems="center">
                <Typography variant="caption" sx={{ backgroundColor: '#0070d2', color: 'white', px: 1, py: 0.5, fontWeight: 'bold', minWidth: '90px', textAlign: 'center', fontSize: '11px' }}>
                  Hora ingreso:
                </Typography>
                <TextField size="small" fullWidth value={datosPresupuesto.HoraIngreso} onChange={(e) => handleChange('HoraIngreso', e.target.value)} sx={{ '& .MuiInputBase-input': { p: '4px', backgroundColor: 'white', textAlign: 'center' } }} />
              </Grid>

              <Grid item xs={6} display="flex" alignItems="center">
                <Typography variant="caption" sx={{ backgroundColor: '#0070d2', color: 'white', px: 1, py: 0.5, fontWeight: 'bold', minWidth: '90px', textAlign: 'center', fontSize: '11px' }}>
                  Fecha entrega:
                </Typography>
                <TextField size="small" fullWidth value={datosPresupuesto.FechaEntrega} onChange={(e) => handleChange('FechaEntrega', e.target.value)} sx={{ '& .MuiInputBase-input': { p: '4px', backgroundColor: 'white', textAlign: 'center' } }} />
              </Grid>

              <Grid item xs={6} display="flex" alignItems="center">
                <Typography variant="caption" sx={{ backgroundColor: '#0070d2', color: 'white', px: 1, py: 0.5, fontWeight: 'bold', minWidth: '90px', textAlign: 'center', fontSize: '11px' }}>
                  Hora entrega:
                </Typography>
                <TextField size="small" fullWidth value={datosPresupuesto.HoraEntrega} onChange={(e) => handleChange('HoraEntrega', e.target.value)} sx={{ '& .MuiInputBase-input': { p: '4px', backgroundColor: 'white', textAlign: 'center' } }} />
              </Grid>

              <Grid item xs={6} display="flex" alignItems="center">
                <Typography variant="caption" sx={{ backgroundColor: '#0070d2', color: 'white', px: 1, py: 0.5, fontWeight: 'bold', minWidth: '90px', textAlign: 'center', fontSize: '11px' }}>
                  Bodega:
                </Typography>
                <TextField size="small" fullWidth value={datosPresupuesto.Bodega} onChange={(e) => handleChange('Bodega', e.target.value)} sx={{ '& .MuiInputBase-input': { p: '4px', backgroundColor: 'white', textAlign: 'center' } }} />
              </Grid>

              <Grid item xs={6} display="flex" alignItems="center">
                <Typography variant="caption" sx={{ backgroundColor: '#0070d2', color: 'white', px: 1, py: 0.5, fontWeight: 'bold', minWidth: '90px', textAlign: 'center', fontSize: '11px' }}>
                  Encargado:
                </Typography>
                <TextField size="small" fullWidth value={datosPresupuesto.EncargadoOT} onChange={(e) => handleChange('EncargadoOT', e.target.value)} sx={{ '& .MuiInputBase-input': { p: '4px', backgroundColor: 'white', textAlign: 'center' } }} />
              </Grid>

            </Grid>
          </Grid>

          {/* Cuadro de Texto de Observaciones Libre */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              multiline
              rows={3}
              value={datosPresupuesto.Observaciones}
              onChange={(e) => handleChange('Observaciones', e.target.value)}
              placeholder="Escribe observaciones o comentarios técnicos aquí..."
              sx={{ '& .MuiOutlinedInput-root': { backgroundColor: 'white' } }}
            />
          </Grid>
        </Grid>
      </Box>

      {/* ================= SECCIÓN 2: TABLA PRINCIPAL SUPERIOR ================= */}
      <TableContainer component={Paper} variant="outlined" sx={{ mb: 2, borderColor: '#b8b8b8', maxHeight: '120px' }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow sx={{ '& th': { backgroundColor: '#f0f0f0', color: 'black', fontWeight: 'bold', p: '4px', fontSize: '11px', border: '1px solid #b8b8b8' } }}>
              <TableCell></TableCell>
              <TableCell>Código</TableCell>
              <TableCell>Producto</TableCell>
              <TableCell>Cantidad</TableCell>
              <TableCell>Valor Neto</TableCell>
              <TableCell>Dscto.($)</TableCell>
              <TableCell>Dscto.(%)</TableCell>
              <TableCell>Total Neto</TableCell>
              <TableCell>Comisión</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filasGrillaSuperior.map((row, idx) => (
              <TableRow key={idx} sx={{ backgroundColor: 'white', '& td': { p: '4px', fontSize: '11px', border: '1px solid #e0e0e0' } }}>
                <TableCell sx={{ width: '20px', textAlign: 'center' }}>▶</TableCell>
                <TableCell>{row.codigo}</TableCell>
                <TableCell>{row.producto}</TableCell>
                <TableCell>{row.gridCantidad || row.cantidad}</TableCell>
                <TableCell>{row.valorNeto.toLocaleString('es-CL')}</TableCell>
                <TableCell>{row.dsctoValor}</TableCell>
                <TableCell>{row.dsctoPorc}</TableCell>
                <TableCell>{row.totalNeto.toLocaleString('es-CL')}</TableCell>
                <TableCell>{row.comision}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ================= SECCIÓN 3: DETALLES INSUMOS (CAMPOS ABIERTOS PARA ESCRIBIR) ================= */}
      <Box sx={{ border: '1px solid #b8b8b8', p: 1, borderRadius: 1, backgroundColor: '#e0e0e0' }}>
        <Typography variant="caption" sx={{ color: '#000080', fontWeight: 'bold', display: 'block', mb: 0.5, fontSize: '12px' }}>
          Detalles Insumos
        </Typography>
        
        <Grid container spacing={1.5}>
          {/* Columna Izquierda: Formulario Manual de Selección */}
          <Grid item xs={12} sm={5.5}>
            <Box sx={{ backgroundColor: '#f0f0f0', border: '1px solid #b8b8b8', borderRadius: 1, p: 1 }}>
              
              <Tabs value={subTab} onChange={(e, v) => setSubTab(v)} sx={{ minHeight: '26px', mb: 1, borderBottom: '1px solid #b8b8b8' }}>
                <Tab label="Productos" sx={{ textTransform: 'none', fontWeight: 'bold', fontSize: '11px', minHeight: '26px', p: '2px 12px' }} />
                <Tab label="Servicio" sx={{ textTransform: 'none', fontWeight: 'bold', fontSize: '11px', minHeight: '26px', p: '2px 12px' }} />
              </Tabs>

              {/* Inputs de Búsqueda Manuales */}
              <Grid container spacing={1} sx={{ mb: 2 }}>
                <Grid item xs={12} display="flex" alignItems="center">
                  <Typography variant="caption" sx={{ backgroundColor: '#0070d2', color: 'white', px: 0.5, py: 0.5, fontWeight: 'bold', minWidth: '70px', textAlign: 'center', fontSize: '11px' }}>
                    Bodega:
                  </Typography>
                  <TextField 
                    size="small" 
                    fullWidth 
                    value={datosPresupuesto.InsumoBodega} 
                    onChange={(e) => handleChange('InsumoBodega', e.target.value)}
                    sx={{ '& .MuiInputBase-input': { p: '4px', backgroundColor: 'white' } }} 
                  />
                  <Button variant="contained" sx={{ minWidth: '30px', p: 0, ml: 0.5, backgroundColor: '#dcdcdc', color: 'black', border: '1px solid #999' }}>🔍</Button>
                </Grid>
                <Grid item xs={12} display="flex" alignItems="center">
                  <Typography variant="caption" sx={{ backgroundColor: '#0070d2', color: 'white', px: 0.5, py: 0.5, fontWeight: 'bold', minWidth: '70px', textAlign: 'center', fontSize: '11px' }}>
                    Producto:
                  </Typography>
                  <TextField 
                    size="small" 
                    fullWidth 
                    value={datosPresupuesto.InsumoProducto} 
                    onChange={(e) => handleChange('InsumoProducto', e.target.value)}
                    sx={{ '& .MuiInputBase-input': { p: '4px', backgroundColor: 'white' } }} 
                  />
                  <Button variant="contained" sx={{ minWidth: '30px', p: 0, ml: 0.5, backgroundColor: '#dcdcdc', color: 'black', border: '1px solid #999' }}>🔍</Button>
                </Grid>
              </Grid>

              {/* Renglon de Stock y Cantidades con Input activo */}
              <TableContainer component={Paper} variant="outlined" sx={{ borderColor: '#b8b8b8', mb: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ '& th': { backgroundColor: '#0070d2', color: 'white', fontWeight: 'bold', p: '2px', fontSize: '10px', textAlign: 'center' } }}>
                      <TableCell sx={{ color: 'white' }}>Stock</TableCell>
                      <TableCell sx={{ color: 'white' }}>P.Venta Neto</TableCell>
                      <TableCell sx={{ color: 'white' }}>Cantidad</TableCell>
                      <TableCell sx={{ color: 'white' }}>Iva</TableCell>
                      <TableCell sx={{ color: 'white' }}>Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow sx={{ backgroundColor: 'white', '& td': { p: '2px', height: '24px', border: '1px solid #e0e0e0' } }}>
                      <TableCell align="center"><Typography variant="caption">15</Typography></TableCell>
                      <TableCell align="center"><Typography variant="caption">4790</Typography></TableCell>
                      <TableCell>
                        <input 
                          type="number"
                          value={datosPresupuesto.InsumoCantidad}
                          onChange={(e) => handleChange('InsumoCantidad', e.target.value)}
                          style={{ width: '100%', border: 'none', textAlign: 'center', outline: 'none', fontSize: '12px', fontWeight: 'bold' }} 
                        />
                      </TableCell>
                      <TableCell align="center"><Typography variant="caption">910</Typography></TableCell>
                      <TableCell align="center"><Typography variant="caption">5700</Typography></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>

              <Box display="flex" gap={1}>
                <Button variant="contained" size="small" sx={{ backgroundColor: '#e0e0e0', color: 'black', border: '1px solid #999', textTransform: 'none', fontSize: '11px', py: 0.2 }}>Limpiar</Button>
                <Button variant="contained" size="small" sx={{ backgroundColor: '#e0e0e0', color: 'black', border: '1px solid #999', textTransform: 'none', fontSize: '11px', py: 0.2 }}>OK</Button>
              </Box>
            </Box>
          </Grid>

          {/* Columna Derecha: Tabla Secundaria */}
          <Grid item xs={12} sm={6.5}>
            <TableContainer component={Paper} variant="outlined" sx={{ borderColor: '#b8b8b8', height: '100%', minHeight: '185px', backgroundColor: '#a0a0a0' }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow sx={{ '& th': { backgroundColor: '#f0f0f0', color: 'black', fontWeight: 'bold', p: '3px', fontSize: '11px', border: '1px solid #b8b8b8' } }}>
                    <TableCell>N°</TableCell>
                    <TableCell>Producto</TableCell>
                    <TableCell>Cant.</TableCell>
                    <TableCell>P.Venta Neto</TableCell>
                    <TableCell>SubTotal</TableCell>
                    <TableCell>Iva</TableCell>
                    <TableCell>C.Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={7} sx={{ height: '130px', backgroundColor: '#a0a0a0', border: 'none' }} />
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </Grid>
      </Box>

      {/* ================= SECCIÓN 4: ACCIONES Y TOTALES DE RECAUDACIÓN EDITABLES ================= */}
      <Grid container spacing={2} alignItems="center" sx={{ mt: 1 }}>
        <Grid item xs={12} sm={7} display="flex" gap={0.5}>
          <Button startIcon={<Search />} variant="contained" size="small" sx={{ backgroundColor: '#e0e0e0', color: 'black', border: '1px solid #999', textTransform: 'none', fontSize: '11px', fontWeight: 'bold' }}>Buscar</Button>
          <Button startIcon={<Save />} variant="contained" size="small" sx={{ backgroundColor: '#e0e0e0', color: 'black', border: '1px solid #999', textTransform: 'none', fontSize: '11px', fontWeight: 'bold' }}>Grabar</Button>
          <Button disabled variant="contained" size="small" sx={{ backgroundColor: '#f5f5f5', color: '#bcbcbc', border: '1px solid #d3d3d3', textTransform: 'none', fontSize: '11px', fontWeight: 'bold' }}>Eliminar</Button>
          <Button startIcon={<Print />} variant="contained" size="small" sx={{ backgroundColor: '#e0e0e0', color: 'black', border: '1px solid #999', textTransform: 'none', fontSize: '11px', fontWeight: 'bold' }}>Imprimir</Button>
        </Grid>

        {/* Bloque Final de Totales habilitados para escritura o modificaciones manuales */}
        <Grid item xs={12} sm={5}>
          <Box display="flex" flexDirection="column" gap={0.5} alignItems="flex-end">
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="caption" sx={{ fontWeight: 'bold', fontSize: '11px', minWidth: '40px', textAlign: 'right' }}>Neto:</Typography>
              <TextField 
                size="small" 
                value={datosPresupuesto.Neto} 
                onChange={(e) => handleChange('Neto', e.target.value)}
                sx={{ width: '100px', '& .MuiInputBase-input': { p: '2px 6px', textAlign: 'right', backgroundColor: 'white', color: 'black', fontWeight: 'bold', height: '18px' } }} 
              />
            </Box>
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="caption" sx={{ fontWeight: 'bold', fontSize: '11px', minWidth: '40px', textAlign: 'right' }}>Iva:</Typography>
              <TextField 
                size="small" 
                value={datosPresupuesto.Iva} 
                onChange={(e) => handleChange('Iva', e.target.value)}
                sx={{ width: '100px', '& .MuiInputBase-input': { p: '2px 6px', textAlign: 'right', backgroundColor: 'white', color: 'black', fontWeight: 'bold', height: '18px' } }} 
              />
            </Box>
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="caption" sx={{ fontWeight: 'bold', fontSize: '11px', minWidth: '40px', textAlign: 'right' }}>Total:</Typography>
              <TextField 
                size="small" 
                value={datosPresupuesto.Total} 
                onChange={(e) => handleChange('Total', e.target.value)}
                sx={{ width: '100px', '& .MuiInputBase-input': { p: '2px 6px', textAlign: 'right', backgroundColor: 'white', color: 'black', fontWeight: 'bold', height: '18px' } }} 
              />
            </Box>
          </Box>
        </Grid>
      </Grid>

    </Box>
  );
}
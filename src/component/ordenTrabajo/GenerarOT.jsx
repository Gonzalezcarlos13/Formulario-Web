import React, { useState } from 'react';
import {
  Box, Grid, TextField, Typography, Button, Tabs, Tab,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Select, MenuItem, FormControl, Checkbox, FormControlLabel, InputLabel, IconButton
} from '@mui/material';
import {
  Clear, Search, Save, Delete, Print, Close
} from '@mui/icons-material';

export default function GenerarOT({ formOrden, setFormOrden }) {
  const [subTab, setSubTab] = useState(0);

  const [servicioTexto, setServicioTexto] = useState('');
  const [cantidadServicio, setCantidadServicio] = useState(1);
  const [valorUnitarioServicio, setValorUnitarioServicio] = useState(0);
  const [descServicio, setDescServicio] = useState(0);
  const [comisionPorcServicio, setComisionPorcServicio] = useState(0);
  const [abonadoValor, setAbonadoValor] = useState(0);
  const netoPrevio = cantidadServicio * valorUnitarioServicio;
  const descuentoCalculado = netoPrevio * (descServicio / 100);
  const totalNetoLinea = Math.max(0, netoPrevio - descuentoCalculado);
  const totalComisionLinea = totalNetoLinea * (comisionPorcServicio / 100);

  const [filasGrilla, setFilasGrilla] = useState([
    {
      no: 1,
      codigo: '0000 350 3500',
      descripcion: 'ASPIRADOR STHIL BENCINA MS',
      cantidad: 10,
      valorUnit: 4790,
      descPorc: 0,
      subTotal: 47900,
      comisionPorc: 0,
      comisionValue: 0
    }
  ]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (setFormOrden) {
      setFormOrden(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleAgregarServicio = () => {
    if (!servicioTexto.trim() || valorUnitarioServicio <= 0) return;

    const nuevoServio = {
      no: filasGrilla.length + 1,
      codigo: 'SERV-INTERNO',
      descripcion: servicioTexto.toUpperCase(),
      cantidad: parseInt(cantidadServicio) || 1,
      valorUnit: parseFloat(valorUnitarioServicio) || 0,
      descPorc: parseFloat(descServicio) || 0,
      subTotal: totalNetoLinea, 
      comisionPorc: parseFloat(comisionPorcServicio) || 0,
      comisionValue: totalComisionLinea
    };

    setFilasGrilla([...filasGrilla, nuevoServio]);
    
    setServicioTexto('');
    setCantidadServicio(1);
    setValorUnitarioServicio(0);
    setDescServicio(0);
    setComisionPorcServicio(0);
  };

  const handleAbonoChange = (e) => {
    const valor = e.target.value;
    setAbonadoValor(valor === '' ? '' : Number(valor));
  };

  const handleEjecutarAbono = () => {
    // botón de abonar
    alert(`Abonando: $${abonadoValor} a la OT N° ${formOrden.IdOrden || ''}`);
  };

  return (
    <Box sx={{ backgroundColor: '#f0f4f8', p: 2.5, borderRadius: 2, border: '1px solid #cfd8dc' }}>

      <Box sx={{ backgroundColor: '#ffffff', p: 2, borderRadius: 1.5, boxShadow: '0px 2px 4px rgba(0,0,0,0.06)', mb: 2, border: '1px solid #e0e6ed' }}>
        <Typography variant="subtitle2" sx={{ color: '#005cb2', fontWeight: 'bold', mb: 1.5, borderBottom: '2px solid #005cb2', pb: 0.5, display: 'inline-block' }}>
          Datos de Identificación y Tiempos
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <TextField label="Cliente" size="small" fullWidth name="NombreCliente" value={formOrden.NombreCliente || ''} onChange={handleInputChange} variant="outlined" sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#fafafa' } }} />
          </Grid>
          <Grid item xs={12} sm={2}>
            <TextField label="Sucursal" size="small" fullWidth name="Sucursal" value={formOrden.Sucursal || 'INTERNA'} onChange={handleInputChange} variant="outlined" />
          </Grid>
          <Grid item xs={12} sm={2}>
            <TextField label="Ingreso OT" size="small" fullWidth name="FechaIngreso" value={formOrden.FechaIngreso || ''} onChange={handleInputChange} variant="outlined" />
          </Grid>
          <Grid item xs={12} sm={2}>
            <TextField label="Hora Ingreso" size="small" fullWidth name="HoraIngreso" value={formOrden.HoraIngreso || ''} onChange={handleInputChange} variant="outlined" />
          </Grid>
          <Grid item xs={12} sm={2}>
            <TextField label="Hora Entrega" size="small" fullWidth name="HoraEntrega" value={formOrden.HoraEntrega || ''} onChange={handleInputChange} variant="outlined" />
          </Grid>

          <Grid item xs={12} sm={3}>
            <TextField label="Bodega" size="small" fullWidth name="Bodega" value={formOrden.Bodega || 'INTERNA'} onChange={handleInputChange} variant="outlined" />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField label="Fecha Real Entrega OT" size="small" fullWidth name="FechaRealEntrega" value={formOrden.FechaRealEntrega || ''} onChange={handleInputChange} variant="outlined" />
          </Grid>
          <Grid item xs={12} sm={2}>
            <TextField label="Hora Término" size="small" fullWidth name="HoraTermino" value={formOrden.HoraTermino || '00:00'} onChange={handleInputChange} variant="outlined" 
              sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#e8f5e9', '& fieldset': { borderColor: '#a5d6a7' } } }}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField label="Fecha Entrega Cotización Aprox." size="small" fullWidth name="FechaEntregaCotizacionAprox" value={formOrden.FechaEntregaCotizacionAprox || ''} onChange={handleInputChange} variant="outlined"
              sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#ffebee', '& fieldset': { borderColor: '#ef9a9a' } }, '& .MuiInputLabel-root': { color: '#c62828' } }}
            />
          </Grid>
        </Grid>
      </Box>

      <Box sx={{ backgroundColor: '#ffffff', p: 2, borderRadius: 1.5, boxShadow: '0px 2px 4px rgba(0,0,0,0.06)', mb: 2, border: '1px solid #e0e6ed' }}>
        <Typography variant="subtitle2" sx={{ color: '#005cb2', fontWeight: 'bold', mb: 1.5, borderBottom: '2px solid #005cb2', pb: 0.5, display: 'inline-block' }}>
          Gestión Interna
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={2.5} display="flex" gap={1} alignItems="center">
            <Button variant="contained" size="small" sx={{ backgroundColor: '#005cb2', textTransform: 'none', minWidth: '120px', fontWeight: 'bold' }}>
              Cambiar N° OT
            </Button>
            <Checkbox size="small" defaultChecked />
          </Grid>
          <Grid item xs={12} sm={1.5}>
            <TextField label="Número OT" size="small" fullWidth name="IdOrden" value={formOrden.IdOrden || ''} onChange={handleInputChange} sx={{ '& input': { fontWeight: 'bold', textAlign: 'center', color: '#005cb2' }, '& .MuiOutlinedInput-root': { backgroundColor: '#fcfcfc' } }} />
          </Grid>
          <Grid item xs={12} sm={2}>
            <TextField label="N° Nota de Venta" size="small" fullWidth name="NroNotaVenta" value={formOrden.NroNotaVenta || ''} onChange={handleInputChange} />
          </Grid>
          <Grid item xs={12} sm={2}>
            <TextField label="Encargado OT" size="small" fullWidth name="EncargadoOT" value={formOrden.EncargadoOT || 'POR ASIGNAR'} onChange={handleInputChange} />
          </Grid>
          <Grid item xs={12} sm={2}>
            <TextField label="Usuario Modifica" size="small" fullWidth name="UsuarioModificaOT" value={formOrden.UsuarioModificaOT || ''} onChange={handleInputChange} />
          </Grid>
          <Grid item xs={12} sm={2}>
            <TextField label="Vendedor" size="small" fullWidth name="Vendedor" value={formOrden.Vendedor || 'PAUL CELERY'} onChange={handleInputChange} />
          </Grid>

          <Grid item xs={12} sm={3}>
            <FormControl size="small" fullWidth>
              <InputLabel>Estado OT</InputLabel>
              <Select value={formOrden.EstadoOT || 'MANTENIMIENTO'} label="Estado OT" name="EstadoOT" onChange={handleInputChange} sx={{ backgroundColor: '#fcfcfc' }}>
                <MenuItem value="MANTENIMIENTO">MANTENIMIENTO</MenuItem>
                <MenuItem value="REVISION">EN REVISIÓN</MenuItem>
                <MenuItem value="TERMINADO">TERMINADO</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={1.5}>
            <Button variant="outlined" size="small" fullWidth sx={{ textTransform: 'none', height: '38px', color: '#1e88e5', borderColor: '#1e88e5', fontWeight: 'bold', '&:hover': { backgroundColor: '#e3f2fd' } }}>
              Referencias DTE
            </Button>
          </Grid>
          <Grid item xs={12} sm={4.5}>
            <TextField label="Observaciones" size="small" fullWidth multiline rows={1} name="Observaciones" value={formOrden.Observaciones || ''} onChange={handleInputChange} sx={{ '& .MuiOutlinedInput-root': { backgroundColor: '#fffde7' } }} />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField label="Ingreso Orden de Compra" size="small" fullWidth name="IngresoOrdenCompra" value={formOrden.IngresoOrdenCompra || ''} onChange={handleInputChange} />
          </Grid>
        </Grid>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: '#b0bec5', mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#cfd8dc', px: 1, borderRadius: '4px 4px 0 0' }}>
        <Tabs value={subTab} onChange={(e, v) => setSubTab(v)} sx={{ minHeight: '38px' }}>
          <Tab label="Productos" sx={{ textTransform: 'none', fontWeight: 'bold', minHeight: '38px', '&.Mui-selected': { color: '#005cb2' } }} />
          <Tab label="Servicios" sx={{ textTransform: 'none', fontWeight: 'bold', minHeight: '38px', '&.Mui-selected': { color: '#005cb2' } }} />
        </Tabs>
        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#1b5e20' }}>N° Cotización Aprobada:</Typography>
          <TextField size="small" name="NroCotizacionAprobada" value={formOrden.NroCotizacionAprobada || '0'} onChange={handleInputChange} sx={{ width: '70px', '& .MuiInputBase-input': { p: '4px', textAlign: 'center', backgroundColor: 'white', fontWeight: 'bold' } }} />
        </Box>
      </Box>

      {subTab === 0 ? (
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2, flexWrap: 'wrap', p: 1.5, backgroundColor: '#eaeff1', borderRadius: 1, border: '1px solid #b0bec5' }}>
          <Button variant="contained" size="small" sx={{ backgroundColor: '#005cb2', textTransform: 'none', fontWeight: 'bold' }}>Producto</Button>
          <TextField size="small" placeholder="Digitar código o descripción..." sx={{ width: '280px', backgroundColor: 'white', borderRadius: 1 }} />
          <Typography variant="body2" sx={{ color: '#37474f', fontWeight: 'bold' }}>Stock:</Typography>
          <TextField size="small" value="15" sx={{ width: '80px', backgroundColor: '#e0e0e0', '& input': { textAlign: 'center', fontWeight: 'bold' } }} disabled />
          <FormControlLabel control={<Checkbox defaultChecked sx={{ color: '#d32f2f', '&.Mui-checked': { color: '#d32f2f' } }} />} label={<Typography variant="body2" sx={{ color: '#d32f2f', fontWeight: 'bold' }}>Sin rebaja de stock</Typography>} />
        </Box>
      ) : (
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-end', mb: 2, flexWrap: 'wrap', p: 2, backgroundColor: '#fffde7', borderRadius: 1.5, border: '1px solid #fff59d', boxShadow: '0px 2px 4px rgba(0,0,0,0.04)' }}>
          <Box sx={{ flexGrow: 1, minWidth: '220px' }}>
            <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#5d4037', display: 'block', mb: 0.5 }}>Servicio (Texto Libre):</Typography>
            <TextField size="small" fullWidth placeholder="Ej: MANO DE OBRA EVALUACIÓN TÉCNICA" value={servicioTexto} onChange={(e) => setServicioTexto(e.target.value)} sx={{ backgroundColor: 'white' }} />
          </Box>
          <Box sx={{ width: '70px' }}>
            <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#5d4037', display: 'block', mb: 0.5 }}>Cantidad:</Typography>
            <TextField size="small" type="number" value={cantidadServicio} onChange={(e) => setCantidadServicio(Math.max(1, parseInt(e.target.value) || 1))} sx={{ backgroundColor: 'white' }} />
          </Box>
          <Box sx={{ width: '100px' }}>
            <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#5d4037', display: 'block', mb: 0.5 }}>Valor Unit. $:</Typography>
            <TextField size="small" type="number" value={valorUnitarioServicio} onChange={(e) => setValorUnitarioServicio(Math.max(0, parseFloat(e.target.value) || 0))} sx={{ backgroundColor: 'white' }} />
          </Box>
          <Box sx={{ width: '80px' }}>
            <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#5d4037', display: 'block', mb: 0.5 }}>Desc. (%):</Typography>
            <TextField size="small" type="number" value={descServicio} onChange={(e) => setDescServicio(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))} sx={{ backgroundColor: 'white' }} />
          </Box>
          <Box sx={{ width: '110px' }}>
            <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#5d4037', display: 'block', mb: 0.5 }}>Total Neto $:</Typography>
            <TextField size="small" disabled value={totalNetoLinea.toLocaleString('es-CL')} sx={{ backgroundColor: '#f5f5f5', '& .MuiInputBase-input.Mui-disabled': { WebkitTextFillColor: '#2e7d32', fontWeight: 'bold', textAlign: 'right' } }} />
          </Box>
          <Box sx={{ width: '85px' }}>
            <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#5d4037', display: 'block', mb: 0.5 }}>Comisión (%):</Typography>
            <TextField size="small" type="number" value={comisionPorcServicio} onChange={(e) => setComisionPorcServicio(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))} sx={{ backgroundColor: 'white' }} />
          </Box>
          <Box sx={{ width: '110px' }}>
            <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#5d4037', display: 'block', mb: 0.5 }}>Total Comis. $:</Typography>
            <TextField size="small" disabled value={totalComisionLinea.toLocaleString('es-CL')} sx={{ backgroundColor: '#f5f5f5', '& .MuiInputBase-input.Mui-disabled': { WebkitTextFillColor: '#1565c0', fontWeight: 'bold', textAlign: 'right' } }} />
          </Box>
          <Button variant="contained" color="warning" size="medium" onClick={handleAgregarServicio} sx={{ fontWeight: 'bold', textTransform: 'none', height: '40px', px: 2 }}>
            Añadir Servicio
          </Button>
        </Box>
      )}

      <TableContainer component={Paper} variant="outlined" sx={{ mb: 2, borderColor: '#b0bec5', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { backgroundColor: '#005cb2', color: 'white', fontWeight: 'bold', p: '10px' } }}>
              <TableCell sx={{ color: 'white' }}>N°</TableCell>
              <TableCell sx={{ color: 'white' }}>Código</TableCell>
              <TableCell sx={{ color: 'white' }}>Descripción</TableCell>
              <TableCell align="right" sx={{ color: 'white' }}>Cantidad</TableCell>
              <TableCell align="right" sx={{ color: 'white' }}>Valor Unit.</TableCell>
              <TableCell align="right" sx={{ color: 'white' }}>Desc. (%)</TableCell>
              <TableCell align="right" sx={{ color: 'white' }}>Sub Total</TableCell>
              <TableCell align="right" sx={{ color: 'white' }}>Comisión (%)</TableCell>
              <TableCell align="right" sx={{ color: 'white' }}>Comisión ($)</TableCell>
              <TableCell align="center" sx={{ color: 'white' }}>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filasGrilla.map((row, index) => (
              <TableRow key={index} sx={{ '&:nth-of-type(odd)': { backgroundColor: '#f9fbfd' }, '&:hover': { backgroundColor: '#f1f5f9' } }}>
                <TableCell>{index + 1}</TableCell>
                <TableCell sx={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#37474f' }}>{row.codigo}</TableCell>
                <TableCell>{row.descripcion}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>{row.cantidad}</TableCell>
                <TableCell align="right">${row.valorUnit.toLocaleString('es-CL')}</TableCell>
                <TableCell align="right">{row.descPorc}%</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', color: '#005cb2' }}>${row.subTotal.toLocaleString('es-CL')}</TableCell>
                <TableCell align="right">{row.comisionPorc}%</TableCell>
                <TableCell align="right">${row.comisionValue.toLocaleString('es-CL')}</TableCell>
                <TableCell align="center">
                  <IconButton size="small" color="error" onClick={() => setFilasGrilla(filasGrilla.filter((_, i) => i !== index))}>
                    <Delete fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Grid container spacing={2} alignItems="center" sx={{ mb: 2 }}>
        <Grid item xs={12} sm={3.5} display="flex" gap={1} alignItems="center">
          <Typography variant="body2" sx={{ fontWeight: 'bold', minWidth: '110px', color: '#37474f' }}>Usuario crea OT:</Typography>
          <TextField size="small" name="UsuarioCrea" value={formOrden.UsuarioCrea || 'ADMINISTRADOR'} onChange={handleInputChange} sx={{ backgroundColor: 'white', borderRadius: 1 }} />
        </Grid>

        <Grid item xs={12} sm={3.5}>
          <Box sx={{ border: '1px solid #b0bec5', p: 1, borderRadius: 1.5, backgroundColor: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0px 1px 3px rgba(0,0,0,0.05)' }}>
            <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#005cb2' }}>Abonado OT:</Typography>
            <Box display="flex" gap={1} alignItems="center">
              <TextField 
                size="small" 
                type="number"
                value={abonadoValor} 
                onChange={handleAbonoChange}
                onFocus={() => { if (abonadoValor === 0) setAbonadoValor(''); }}
                onBlur={() => { if (abonadoValor === '') setAbonadoValor(0); }}
                slotProps={{ htmlInput: { min: 0, style: { textAlign: 'right' } } }}
                sx={{ width: '90px', backgroundColor: '#ffffff' }} 
              />
              <Button 
                variant="contained" 
                size="small" 
                color="success" 
                onClick={handleEjecutarAbono}
                sx={{ textTransform: 'none', fontSize: '11px', fontWeight: 'bold' }}
              >
                Abonar $
              </Button>
            </Box>
          </Box>
        </Grid>

        <Grid item xs={12} sm={5} display="flex" justifyContent="flex-end">
          <Paper variant="outlined" sx={{ p: 1.5, backgroundColor: '#e1f5fe', borderColor: '#b3e5fc', width: '100%', boxShadow: '0px 2px 4px rgba(0,0,0,0.04)' }}>
            <Grid container spacing={1}>
              <Grid item xs={4} display="flex" flexDirection="column">
                <Typography variant="caption" sx={{ color: '#0288d1', fontWeight: 'bold' }}>Sub Total $</Typography>
                <TextField size="small" value={(formOrden.SubTotal || 47900).toLocaleString('es-CL')} disabled sx={{ backgroundColor: '#f5f5f5' }} />
              </Grid>
              <Grid item xs={4} display="flex" flexDirection="column">
                <Typography variant="caption" sx={{ color: '#0288d1', fontWeight: 'bold' }}>Total Neto $</Typography>
                <TextField size="small" value={(formOrden.TotalNeto || 47900).toLocaleString('es-CL')} disabled sx={{ backgroundColor: '#f5f5f5' }} />
              </Grid>
              <Grid item xs={4} display="flex" flexDirection="column">
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#0d47a1' }}>Total OT $</Typography>
                <TextField size="small" value={(formOrden.TotalOT || 57001).toLocaleString('es-CL')} disabled sx={{ backgroundColor: '#ffffff', '& input': { fontWeight: 'bold', color: '#0d47a1', textAlign: 'right' } }} />
              </Grid>
              
              <Grid item xs={4} display="flex" flexDirection="column">
                <Typography variant="caption" sx={{ color: '#555' }}>Descuento (%)</Typography>
                <TextField size="small" value="0" sx={{ backgroundColor: 'white' }} />
              </Grid>
              <Grid item xs={4} display="flex" flexDirection="column">
                <Typography variant="caption" sx={{ color: '#555' }}>Total IVA $</Typography>
                <TextField size="small" value={(formOrden.TotalIVA || 9101).toLocaleString('es-CL')} disabled sx={{ backgroundColor: '#f5f5f5' }} />
              </Grid>
              <Grid item xs={4} display="flex" flexDirection="column">
                <Typography variant="caption" sx={{ color: '#555' }}>Descuento $</Typography>
                <TextField size="small" value="0" sx={{ backgroundColor: 'white' }} />
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3, pt: 2, borderTop: '2px solid #b0bec5' }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="contained" size="small" startIcon={<Clear />} sx={{ textTransform: 'none', backgroundColor: '#78909c', '&:hover': { backgroundColor: '#607d8b' }, fontWeight: 'bold' }}>Limpiar</Button>
          <Button variant="contained" size="small" startIcon={<Search />} sx={{ textTransform: 'none', backgroundColor: '#1976d2', '&:hover': { backgroundColor: '#115293' }, fontWeight: 'bold' }}>Buscar</Button>
          <Button variant="contained" size="small" startIcon={<Save />} sx={{ textTransform: 'none', backgroundColor: '#2e7d32', '&:hover': { backgroundColor: '#1b5e20' }, fontWeight: 'bold' }}>Grabar</Button>
          <Button variant="contained" size="small" startIcon={<Delete />} sx={{ textTransform: 'none', backgroundColor: '#c62828', '&:hover': { backgroundColor: '#b71c1c' }, fontWeight: 'bold' }}>Anular</Button>
          <Button variant="contained" size="small" startIcon={<Print />} sx={{ textTransform: 'none', backgroundColor: '#37474f', '&:hover': { backgroundColor: '#263238' }, fontWeight: 'bold' }}>Imprimir</Button>
        </Box>
        <Button variant="contained" size="small" startIcon={<Close />} sx={{ textTransform: 'none', backgroundColor: '#212121', '&:hover': { backgroundColor: '#000000' }, fontWeight: 'bold', px: 2 }}>CERRAR</Button>
      </Box>
    </Box>
  );
}
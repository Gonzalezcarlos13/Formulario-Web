import React, { useState } from 'react';
import {
  Box, Typography, Grid, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Paper, Button, 
  RadioGroup, FormControlLabel, Radio, IconButton, Card, 
  CardContent, Stack
} from '@mui/material';
import { Search, Print, NavigateBefore, NavigateNext, SkipPrevious, SkipNext } from '@mui/icons-material';

export default function ConsultaClienteOT({ formOrden }) {
  const [filtroRadio, setFiltroRadio] = useState('Todas');
  
  const [ordenesCliente] = useState([
    { idOt: formOrden?.IdOrden || '12018', fecha: formOrden?.FechaIngreso || '05/06/2026', estado: formOrden?.EstadoOT || 'MANTENIMIENTO' }
  ]);

  const [detallesOt] = useState([
    { descripcion: 'ASPIRADOR STHIL BENCINA MS', cantidad: 10, costoNeto: 47900, desctoPorc: 0, desctoPesos: 0, valorTotal: 47900, clase: '', comision: 0, tComision: 0 }
  ]);

  const tagLabelStyle = {
    backgroundColor: '#1976d2',
    color: 'white',
    fontWeight: 'bold',
    fontSize: '11px',
    px: 1.5,
    py: 0.5,
    borderRadius: '4px 0 0 4px',
    display: 'flex',
    alignItems: 'center',
    minWidth: '90px',
    userSelect: 'none'
  };

  const inputStyle = {
    flexGrow: 1,
    height: '31px',
    border: '1px solid #ccc',
    borderRadius: '0 4px 4px 0',
    padding: '0 10px',
    fontSize: '13px',
    fontFamily: 'sans-serif',
    backgroundColor: '#fff',
    outline: 'none',
    transition: 'border-color 0.2s',
    '&:focus': { borderColor: '#1976d2' }
  };

  return (
    <Box sx={{ p: 1, backgroundColor: '#f5f7fa', minHeight: '85vh' }}>
      <Grid container spacing={2}>
        
        <Grid item xs={12} lg={4}>
          <Card variant="outlined" sx={{ height: '100%', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderRadius: 2 }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1a237e', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                📋 Información del Cliente
              </Typography>
              
              <Stack spacing={1.5}>
                <Box display="flex" alignItems="stretch">
                  <Box sx={tagLabelStyle}>RUT Cliente</Box>
                  <input type="text" defaultValue="76.245.310-K" style={inputStyle} />
                  <IconButton size="small" variant="contained" sx={{ ml: 1, backgroundColor: '#1976d2', color: 'white', borderRadius: '4px', '&:hover': { backgroundColor: '#115293' } }}>
                    <Search sx={{ fontSize: '20px' }} />
                  </IconButton>
                </Box>

                <Box display="flex" alignItems="stretch">
                  <Box sx={tagLabelStyle}>Nombre</Box>
                  <input type="text" value={formOrden?.NombreCliente || ''} readOnly style={{ ...inputStyle, backgroundColor: '#f0f4f8', color: '#555' }} />
                </Box>

                <Box display="flex" alignItems="stretch">
                  <Box sx={tagLabelStyle}>Giro</Box>
                  <input type="text" defaultValue="PARTICULAR / SERVICIO TÉCNICO" style={inputStyle} />
                </Box>

                <Box display="flex" alignItems="stretch">
                  <Box sx={tagLabelStyle}>Dirección</Box>
                  <input type="text" defaultValue="AV. ALEJANDRO FLEMING 7800" style={inputStyle} />
                </Box>

                <Box display="flex" alignItems="stretch">
                  <Box sx={tagLabelStyle}>Comuna</Box>
                  <input type="text" defaultValue="LAS CONDES" style={inputStyle} />
                </Box>

                <Box display="flex" alignItems="stretch">
                  <Box sx={tagLabelStyle}>Teléfono</Box>
                  <input type="text" defaultValue="+56 9 8765 4321" style={inputStyle} />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={8}>
          <Card variant="outlined" sx={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderRadius: 2 }}>
            <CardContent sx={{ p: 2 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5} flexWrap="wrap" gap={1}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1a237e' }}>
                  🕒 Historial de Órdenes de Trabajo
                </Typography>
                
                <RadioGroup 
                  row 
                  value={filtroRadio} 
                  onChange={(e) => setFiltroRadio(e.target.value)}
                  sx={{ '& .MuiFormControlLabel-label': { fontSize: '13px', fontWeight: 600 } }}
                >
                  <FormControlLabel value="Todas" control={<Radio size="small" />} label="Todas" />
                  <FormControlLabel value="Facturadas" control={<Radio size="small" />} label="Facturadas" />
                </RadioGroup>
              </Box>

              <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: '140px', overflowY: 'auto', borderRadius: 1.5 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow sx={{ '& th': { backgroundColor: '#f8fafc', fontWeight: 700, fontSize: '12px', color: '#64748b', py: 1 } }}>
                      <TableCell align="center" sx={{ width: '40px' }}></TableCell>
                      <TableCell>N° Orden</TableCell>
                      <TableCell>Fecha Ingreso</TableCell>
                      <TableCell>Estado Actual</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {ordenesCliente.map((row, idx) => (
                      <TableRow key={idx} sx={{ backgroundColor: '#e3f2fd', '& td': { py: 1, fontSize: '12px', fontWeight: 500 } }}>
                        <TableCell align="center" sx={{ color: '#1976d2' }}>▶</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', color: '#0d47a1' }}>{row.idOt}</TableCell>
                        <TableCell>{row.fecha}</TableCell>
                        <TableCell sx={{ color: '#e65100', fontWeight: 'bold' }}>{row.estado}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow sx={{ height: '38px' }}><TableCell colSpan={4}></TableCell></TableRow>
                  </TableBody>
                </Table>
              </TableContainer>

              <Box display="flex" justifyContent="flex-start" mt={1.5} gap={0.5}>
                <IconButton size="small" sx={{ border: '1px solid #ccc', borderRadius: '4px' }}><SkipPrevious fontSize="small" /></IconButton>
                <IconButton size="small" sx={{ border: '1px solid #ccc', borderRadius: '4px' }}><NavigateBefore fontSize="small" /></IconButton>
                <IconButton size="small" sx={{ border: '1px solid #ccc', borderRadius: '4px' }}><NavigateNext fontSize="small" /></IconButton>
                <IconButton size="small" sx={{ border: '1px solid #ccc', borderRadius: '4px' }}><SkipNext fontSize="small" /></IconButton>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12}>
          <Card variant="outlined" sx={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderRadius: 2 }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1a237e', mb: 1.5 }}>
                🔍 Desglose de Insumos y Servicios de la OT Seleccionada
              </Typography>

              <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: '220px', overflowY: 'auto', borderRadius: 1.5 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow sx={{ '& th': { backgroundColor: '#f8fafc', fontWeight: 700, fontSize: '12px', color: '#64748b', py: 1 } }}>
                      <TableCell align="center" sx={{ width: '40px' }}></TableCell>
                      <TableCell>Descripción del Producto / Servicio</TableCell>
                      <TableCell align="right">Cantidad</TableCell>
                      <TableCell align="right">Costo Neto</TableCell>
                      <TableCell align="right">Descto %</TableCell>
                      <TableCell align="right">Descto $</TableCell>
                      <TableCell align="right">Valor Total</TableCell>
                      <TableCell>Clase</TableCell>
                      <TableCell align="right">Comisión</TableCell>
                      <TableCell align="right">T. Comisión</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {detallesOt.map((item, idx) => (
                      <TableRow key={idx} sx={{ '& td': { py: 1, fontSize: '12px' }, '&:hover': { backgroundColor: '#f1f5f9' } }}>
                        <TableCell align="center" sx={{ color: '#64748b' }}>▶</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: '#334155' }}>{item.descripcion}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>{item.cantidad}</TableCell>
                        <TableCell align="right">${item.costoNeto.toLocaleString('es-CL')}</TableCell>
                        <TableCell align="right">{item.desctoPorc}%</TableCell>
                        <TableCell align="right">${item.desctoPesos}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', color: '#1e293b' }}>${item.valorTotal.toLocaleString('es-CL')}</TableCell>
                        <TableCell>{item.clase || '-'}</TableCell>
                        <TableCell align="right">{item.comision}%</TableCell>
                        <TableCell align="right">${item.tComision}</TableCell>
                      </TableRow>
                    ))}
                    {Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={`empty-row-${i}`} sx={{ height: '36px' }}>
                        {Array.from({ length: 10 }).map((_, cIdx) => <TableCell key={cIdx}></TableCell>)}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Box display="flex" alignItems="stretch" mt={2} maxWidth="260px">
                <Box sx={{ ...tagLabelStyle, minWidth: '70px' }}>Código</Box>
                <input type="text" defaultValue="0000 350 3500" style={inputStyle} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ mt: 2, p: 2, backgroundColor: '#fff', borderRadius: 2, border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        
        <Stack direction="row" spacing={3} flexWrap="wrap" gap={1}>
          <Box display="flex" alignItems="center" gap={1}>
            <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>Total O.T:</Typography>
            <Typography sx={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', backgroundColor: '#f1f5f9', px: 1.5, py: 0.5, borderRadius: 1, border: '1px solid #cbd5e1' }}>
              ${(formOrden?.TotalOT || 0).toLocaleString('es-CL')}
            </Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>Total Cliente:</Typography>
            <Typography sx={{ fontSize: '16px', fontWeight: 800, color: '#1e3a8a', backgroundColor: '#eff6ff', px: 1.5, py: 0.5, borderRadius: 1, border: '1px solid #bfdbfe' }}>
              ${(formOrden?.TotalOT || 0).toLocaleString('es-CL')}
            </Typography>
          </Box>
        </Stack>

        <Button 
          startIcon={<Print />} 
          variant="contained" 
          color="primary"
          size="medium"
          sx={{ textTransform: 'none', fontWeight: 'bold', px: 3, borderRadius: 1.5, boxShadow: '0 4px 6px rgba(25, 118, 210, 0.2)' }}
        >
          Imprimir Ficha
        </Button>
      </Box>
    </Box>
  );
}
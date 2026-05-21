import React, { useState } from 'react';
import {
  Box, Typography, Grid, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Paper, Button, 
  IconButton, Card, CardContent, Stack
} from '@mui/material';
import { Search, Save } from '@mui/icons-material';

export default function DevolucionInsumos({ formOrden }) {

  const [insumosDevolucion] = useState([
    { codigo: '0000 350 3500', descripcion: 'ASPIRADOR STHIL BENCINA MS', cantidad: 10, valorNeto: 47900, totalNeto: 47900 }
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
    minWidth: '110px',
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
        
        <Grid item xs={12} md={6}>
          <Card variant="outlined" sx={{ height: '100%', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderRadius: 2 }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1a237e', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                📦 Datos de la Orden de Trabajo
              </Typography>
              
              <Stack spacing={1.5}>
                <Box display="flex" alignItems="stretch">
                  <Box sx={tagLabelStyle}>Número de OT</Box>
                  <input type="text" value={formOrden?.IdOrden || '12018'} readOnly style={{ ...inputStyle, backgroundColor: '#f0f4f8', color: '#555' }} />
                  <IconButton size="small" sx={{ ml: 1, backgroundColor: '#1976d2', color: 'white', borderRadius: '4px', '&:hover': { backgroundColor: '#115293' } }}>
                    <Search sx={{ fontSize: '20px' }} />
                  </IconButton>
                </Box>

                <Box display="flex" alignItems="stretch">
                  <Box sx={tagLabelStyle}>Fecha Ingreso</Box>
                  <input type="text" value={formOrden?.FechaIngreso || '05/06/2026'} readOnly style={{ ...inputStyle, backgroundColor: '#f0f4f8', color: '#555' }} />
                </Box>

                <Box display="flex" alignItems="stretch">
                  <Box sx={tagLabelStyle}>Fecha Entrega</Box>
                  <input type="text" value={formOrden?.HoraEntrega ? (formOrden?.FechaIngreso || '05/06/2026') : ''} readOnly style={{ ...inputStyle, backgroundColor: '#f0f4f8', color: '#555' }} />
                </Box>

                <Box display="flex" alignItems="stretch">
                  <Box sx={tagLabelStyle}>Bodega</Box>
                  <input type="text" value={formOrden?.Bodega || 'INTERNA'} readOnly style={{ ...inputStyle, backgroundColor: '#f0f4f8', color: '#555' }} />
                </Box>

                <Box display="flex" alignItems="stretch">
                  <Box sx={tagLabelStyle}>Encargado</Box>
                  <input type="text" value={formOrden?.EncargadoOT || 'POR ASIGNAR'} readOnly style={{ ...inputStyle, backgroundColor: '#f0f4f8', color: '#555' }} />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card variant="outlined" sx={{ height: '100%', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderRadius: 2 }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1a237e', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                👤 Cliente Asociado
              </Typography>
              
              <Stack spacing={1.5}>
                <Box display="flex" alignItems="stretch">
                  <Box sx={{ ...tagLabelStyle, minWidth: '90px' }}>Cliente</Box>
                  <input type="text" defaultValue="76.245.310-K" style={inputStyle} />
                </Box>
                <Box display="flex" alignItems="stretch">
                  <Box sx={{ ...tagLabelStyle, minWidth: '90px' }}>Dirección</Box>
                  <input type="text" value={formOrden?.NombreCliente || 'BLANCA ESTER BAHAMONDE PAREDES'} readOnly style={{ ...inputStyle, backgroundColor: '#f0f4f8', color: '#555' }} />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card variant="outlined" sx={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderRadius: 2 }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1a237e', mb: 1.5 }}>
                📋 Detalles de Insumos Disponibles para Devolución
              </Typography>

              <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: '250px', overflowY: 'auto', borderRadius: 1.5 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow sx={{ '& th': { backgroundColor: '#f8fafc', fontWeight: 700, fontSize: '12px', color: '#64748b', py: 1 } }}>
                      <TableCell>Código</TableCell>
                      <TableCell>Descripción</TableCell>
                      <TableCell align="right">Cantidad</TableCell>
                      <TableCell align="right">Valor Neto</TableCell>
                      <TableCell align="right">Total Neto</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {insumosDevolucion.map((item, idx) => (
                      <TableRow key={idx} sx={{ '& td': { py: 1, fontSize: '12px' }, '&:hover': { backgroundColor: '#f1f5f9' } }}>
                        <TableCell sx={{ fontWeight: 'bold', color: '#0d47a1' }}>{item.codigo}</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: '#334155' }}>{item.descripcion}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', color: '#1976d2' }}>{item.cantidad}</TableCell>
                        <TableCell align="right">${item.valorNeto.toLocaleString('es-CL')}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>${item.totalNeto.toLocaleString('es-CL')}</TableCell>
                      </TableRow>
                    ))}
                    {Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={`empty-dev-${i}`} sx={{ height: '36px' }}>
                        <TableCell colSpan={5}></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      <Box sx={{ mt: 2, p: 2, backgroundColor: '#fff', borderRadius: 2, border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
        <Button 
          startIcon={<Save />} 
          variant="contained" 
          color="success"
          size="medium"
          sx={{ textTransform: 'none', fontWeight: 'bold', px: 4, borderRadius: 1.5, boxShadow: '0 4px 6px rgba(46, 125, 50, 0.2)' }}
        >
          Grabar Devolución
        </Button>
      </Box>
    </Box>
  );
}
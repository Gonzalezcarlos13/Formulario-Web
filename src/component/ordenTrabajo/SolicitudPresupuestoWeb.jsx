import React, { useState } from 'react';
import {
    Box, Typography, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Paper, Button
} from '@mui/material';
import { Search, Refresh } from '@mui/icons-material';

export default function SolicitudPresupuestoWeb({ formOrden, onSeleccionarSolicitud }) {
    const [solicitudes] = useState([
        {
            idSolicitud: '0000350',
            fecha: formOrden?.FechaIngreso || '05/06/2026',
            nroOt: formOrden?.IdOrden || '12018',
            rutCliente: '76.245.310-K',
            nombre: formOrden?.NombreCliente || 'BLANCA ESTER BAHAMONDE PAREDES',
            estado: 'PENDIENTE'
        },
        {
            idSolicitud: '0000351',
            fecha: '06/06/2026',
            nroOt: '12019',
            rutCliente: '15.832.411-2',
            nombre: 'JUAN CARLOS PEREZ LOPEZ',
            estado: 'APROBADO'
        }
    ]);

    const [filaSeleccionada, setFilaSeleccionada] = useState(0);

    const handleSeleccionarFila = (index) => {
        setFilaSeleccionada(index);
        if (onSeleccionarSolicitud) {
            onSeleccionarSolicitud(solicitudes[index]);
        }
    };

    return (
        <Box sx={{ backgroundColor: '#f0f0f0', p: 1.5, borderRadius: 1, border: '1px solid #b0b0b0', minHeight: '450px' }}>

            <Typography
                variant="h6"
                align="center"
                sx={{ color: 'black', fontWeight: 'bold', mb: 1.5, fontSize: '18px', fontFamily: 'sans-serif' }}
            >
                Solicitudes de Insumos para OT
            </Typography>

            <TableContainer
                component={Paper}
                variant="outlined"
                sx={{
                    borderColor: '#b8b8b8',
                    backgroundColor: '#a0a0a0',
                    height: '350px',
                    overflowY: 'auto'
                }}
            >
                <Table size="small" stickyHeader>
                    <TableHead>
                        <TableRow sx={{ '& th': { backgroundColor: '#f0f0f0', color: 'black', fontWeight: 'bold', p: '4px', fontSize: '11px', border: '1px solid #b8b8b8' } }}>
                            <TableCell sx={{ width: '30px' }}></TableCell>
                            <TableCell>Nro de Solici</TableCell>
                            <TableCell>Fecha</TableCell>
                            <TableCell>Nro OT</TableCell>
                            <TableCell>Rut Cliente</TableCell>
                            <TableCell>Nombre</TableCell>
                            <TableCell>Estado</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {solicitudes.map((row, idx) => {
                            const esActiva = filaSeleccionada === idx;
                            return (
                                <TableRow
                                    key={idx}
                                    onClick={() => handleSeleccionarFila(idx)}
                                    sx={{
                                        backgroundColor: esActiva ? '#3399ff' : 'white',
                                        cursor: 'pointer',
                                        '& td': {
                                            p: '4px 6px',
                                            fontSize: '11px',
                                            border: '1px solid #b8b8b8',
                                            color: esActiva ? 'white' : 'black'
                                        }
                                    }}
                                >
                                    <TableCell sx={{ textAlign: 'center', backgroundColor: '#f0f0f0', fontWeight: 'bold', color: 'black !important' }}>
                                        {esActiva ? '▶' : ''}
                                    </TableCell>

                                    <TableCell>{row.idSolicitud}</TableCell>
                                    <TableCell style={{ textAlign: 'center' }}>{row.fecha}</TableCell>
                                    <TableCell style={{ fontWeight: 'bold' }}>{row.nroOt}</TableCell>
                                    <TableCell>{row.rutCliente}</TableCell>
                                    <TableCell>{row.nombre}</TableCell>
                                    <TableCell
                                        style={{
                                            fontWeight: 'bold',
                                            color: esActiva ? 'white' : (row.estado === 'PENDIENTE' ? '#b71c1c' : '#2e7d32')
                                        }}
                                    >
                                        {row.estado}
                                    </TableCell>
                                </TableRow>
                            );
                        })}

                        {Array.from({ length: Math.max(0, 12 - solicitudes.length) }).map((_, i) => (
                            <TableRow key={`empty-${i}`} sx={{ backgroundColor: 'white', height: '24px' }}>
                                <TableCell sx={{ backgroundColor: '#f0f0f0', border: '1px solid #b8b8b8' }}></TableCell>
                                <TableCell sx={{ border: '1px solid #b8b8b8' }}></TableCell>
                                <TableCell sx={{ border: '1px solid #b8b8b8' }}></TableCell>
                                <TableCell sx={{ border: '1px solid #b8b8b8' }}></TableCell>
                                <TableCell sx={{ border: '1px solid #b8b8b8' }}></TableCell>
                                <TableCell sx={{ border: '1px solid #b8b8b8' }}></TableCell>
                                <TableCell sx={{ border: '1px solid #b8b8b8' }}></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Box display="flex" gap={1} sx={{ mt: 2 }}>
                <Button
                    startIcon={<Search />}
                    variant="contained"
                    size="small"
                    onClick={() => alert(`Visualizando detalles de la Solicitud: ${solicitudes[filaSeleccionada]?.idSolicitud}`)}
                    sx={{ backgroundColor: '#e0e0e0', color: 'black', border: '1px solid #999', textTransform: 'none', fontSize: '11px', fontWeight: 'bold', '&:hover': { backgroundColor: '#d0d0d0' } }}
                >
                    Ver Detalle Solicitud
                </Button>
                <Button
                    startIcon={<Refresh />}
                    variant="contained"
                    size="small"
                    sx={{ backgroundColor: '#e0e0e0', color: 'black', border: '1px solid #999', textTransform: 'none', fontSize: '11px', fontWeight: 'bold', '&:hover': { backgroundColor: '#d0d0d0' } }}
                >
                    Actualizar Lista
                </Button>
            </Box>

        </Box>
    );
}
// src/component/OrdenTrabajo.jsx
import React, { useState } from 'react';
import { Box, Tabs, Tab } from '@mui/material';
import DtoOrdenTrabajo from '../dto/DtoOrdenTrabajo';

// Importamos todas tus ventanas hijas
import GenerarOT from './ordenTrabajo/GenerarOT';
import ImagenesOT from './ordenTrabajo/ImagenesOT';
import PresupuestoOT from './ordenTrabajo/PresupuestoOT';
import SolicitudPresupuestoWeb from './ordenTrabajo/SolicitudPresupuestoWeb';
import ConsultaClienteOT from './ordenTrabajo/ConsultaClienteOT';
import DevolucionInsumos from './ordenTrabajo/DevolucionInsumos';

export default function OrdenTrabajoForm() {
  const [tabValue, setTabValue] = useState(0);
  
  // 1. MEJORA: Añadimos 'setFormOrden' para permitir modificaciones en el estado
  const [formOrden, setFormOrden] = useState(new DtoOrdenTrabajo({
    IdOrden: '12018',
    NombreCliente: 'BLANCA ESTER BAHAMONDE PAREDES',
    Sucursal: 'INTERNA',
    FechaIngreso: '05/06/2026',
    HoraIngreso: '14:54',
    HoraEntrega: '14:54',
    Bodega: 'INTERNA',
    Vendedor: 'PAUL CELERY',
    EncargadoOT: 'POR ASIGNAR',
    EstadoOT: 'MANTENIMIENTO',
    SubTotal: 47900,
    TotalNeto: 47900,
    TotalIVA: 9101,
    TotalOT: 57001
  }));

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  return (
    <Box sx={{ width: '100%', p: 1, backgroundColor: '#f0f0f0', minHeight: '100vh' }}>
      
      {/* Menú de Pestañas Superior Replicado */}
      <Tabs 
        value={tabValue} 
        onChange={handleTabChange} 
        variant="scrollable" 
        scrollButtons="auto"
        sx={{ borderBottom: 1, borderColor: 'divider', mb: 1, '& .MuiTab-root': { textTransform: 'none', fontWeight: 'bold', fontSize: '12px' } }}
      >
        <Tab label="Generar OT" />
        <Tab label="Imágenes OT" />
        <Tab label="Presupuesto OT" />
        <Tab label="Solicitud de presupuesto web" />
        <Tab label="Consulta Cliente OT" />
        <Tab label="Devolución de insumos" />
      </Tabs>

      {/* Renderizado de Ventanas */}
      <Box sx={{ p: 0.5 }}>
        {/* 2. MEJORA: Entregamos 'setFormOrden' como prop a la pestaña encargada de editar */}
        {tabValue === 0 && <GenerarOT formOrden={formOrden} setFormOrden={setFormOrden} />}
        
        {/* Las demás pestañas pueden recibirlo también si en el futuro necesitan modificar el DTO */}
        {tabValue === 1 && <ImagenesOT formOrden={formOrden} />}
        {tabValue === 2 && <PresupuestoOT formOrden={formOrden} />}
        {tabValue === 3 && <SolicitudPresupuestoWeb formOrden={formOrden} />}
        {tabValue === 4 && <ConsultaClienteOT formOrden={formOrden} />}
        {tabValue === 5 && <DevolucionInsumos formOrden={formOrden} />}
      </Box>

    </Box>
  );
}
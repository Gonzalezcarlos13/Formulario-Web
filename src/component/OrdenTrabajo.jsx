import React, { useState } from 'react';
import { Box, Tabs, Tab } from '@mui/material';

import GenerarOT from './ordenTrabajo/GenerarOT';
import ImagenesOT from './ordenTrabajo/ImagenesOT'; 
import PresupuestoOT from './ordenTrabajo/PresupuestoOT';
import SolicitudPresupuestoWeb from './ordenTrabajo/SolicitudPresupuestoWeb';
import ConsultaClienteOT from './ordenTrabajo/ConsultaClienteOT';
import DevolucionInsumos from './ordenTrabajo/DevolucionInsumos';

export default function OrdenTrabajo() {
  const [activeTab, setActiveTab] = useState(0);

  // Estado único centralizado
  const [valores, setValores] = useState(
    {
    Idorden: '12018',
    IdCliente: '1245',
  NombreCliente: 'BLANCA ESTER BAHAMONDE PAREDES',
  IdEncargado: '1',
  NombreEncargado: 'POR ASIGNAR',
  Sucursal: 'INTERNA',
  NotaVenta: '',
  FechaIngreso: '2026-06-05',
  HoraIngreso: '14:54',
  HoraEntrega: '14:54',
  IdBodega : "1",
  Bodega: 'INTERNA',
  IdVendedor: '1245',
  NombreVendedor: 'PAUL CELERY',
  Estado: '3',
  EstadoOTTexto: 'MANTENIMIENTO',
  UsuarioModificaOT: '--',
  IngresoOrdenCompra: '',
  ReferenciasDTE: '457',
  FechaRealEntregaOT: '',
  HoraTerminoOT: '',
  FechaEntregaCotizacionApprox: '2026-06-08',
  Observaciones: 'Cliente solicita revisión prioritaria.',
  UsuarioCreaOT: 'ADMINISTRADOR',
  AbonadoOT: '0',
  CotizacionAprobada: '0',
  SubTotal: '47900',
  DescuentoPorcentaje: '0',
  DescuentoMonto: '0',
  TotalNeto: '47900',
  TotalIVA: '9101',
  TotalOT: '57001'
  });

  const handleChange = (field, value) => {
    setValores(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Box sx={{ backgroundColor: '#f4f6f9', minHeight: '100vh', p: { xs: 1, md: 3 }, display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
      {/* Contenedor con ancho máximo para que no se deforme en pantallas anchas */}
      <Box sx={{ width: '100%', maxWidth: '1300px', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.08)', p: 3, mt: 1 }}>
        
        {/* NAVEGACIÓN */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs 
            value={activeTab} 
            onChange={(e, val) => setActiveTab(val)} 
            variant="scrollable" 
            scrollButtons="auto"
            sx={{ '& .MuiTab-root': { fontSize: '13px', py: 1.5 } }}
          >
            <Tab label="Generar OT" sx={{ fontWeight: 'bold', textTransform: 'none' }} />
            <Tab label="Imágenes OT" sx={{ fontWeight: 'bold', textTransform: 'none' }} />
            <Tab label="Presupuesto OT" sx={{ textTransform: 'none', fontWeight: 'bold' }} />
            <Tab label="Solicitud de presupuesto web" sx={{ textTransform: 'none', fontWeight: 'bold' }} />
            <Tab label="Cartola OT Cliente" sx={{ textTransform: 'none', fontWeight: 'bold' }} />
            <Tab label="Devolución de insumos" sx={{ textTransform: 'none', fontWeight: 'bold' }} />
          </Tabs>
        </Box>

        {/* CONTENIDO DE PESTAÑAS */}
        <Box sx={{ mt: 1 }}>
          {activeTab === 0 && <GenerarOT valores={valores} handleChange={handleChange} />}
          {activeTab === 1 && <ImagenesOT formOrden={valores} />}
          {activeTab === 2 && <PresupuestoOT formOrden={valores} handleChange={handleChange} />}
          {activeTab === 3 && <SolicitudPresupuestoWeb valores={valores} handleChange={handleChange} />}
          {activeTab === 4 && <ConsultaClienteOT valores={valores} />}
          {activeTab === 5 && <DevolucionInsumos valores={valores} />}
        </Box>

      </Box>
    </Box>
  );
}
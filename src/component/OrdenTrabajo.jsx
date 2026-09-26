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
    }
  );

  const handleChange = (field, value) => {
    setValores(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Box
      sx={{
        backgroundColor: '#f4f6f9',
        minHeight: '100vh',
        p: { xs: 1, md: 3 },
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start'
      }}
    >
      {/* Contenedor con ancho máximo para que no se deforme en pantallas anchas */}
      <Box
        sx={{
          width: '100%',
          maxWidth: '1300px',
          backgroundColor: '#fff',
          borderRadius: '10px',
          border: '1px solid #e3e9f0',
          boxShadow: '0 5px 18px rgba(15, 23, 42, 0.07)',
          p: { xs: 1.25, sm: 2, md: 2.5 },
          mt: 1
        }}
      >
        {/* NAVEGACIÓN */}
        <Box
          sx={{
            mb: 2,
            p: '5px',
            borderRadius: '9px',
            border: '1px solid #dfe7ef',
            backgroundColor: '#f8fafc'
          }}
        >
          <Tabs 
            value={activeTab} 
            onChange={(e, val) => setActiveTab(val)} 
            variant="scrollable" 
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{
              minHeight: '42px',

              '& .MuiTabs-flexContainer': {
                gap: '3px'
              },

              '& .MuiTabs-indicator': {
                height: '3px',
                borderRadius: '3px 3px 0 0',
                backgroundColor: '#1976d2'
              },

              '& .MuiTab-root': {
                minHeight: '42px',
                minWidth: 'auto',
                px: { xs: 1.2, sm: 1.6 },
                py: 0.9,
                borderRadius: '7px',
                fontSize: { xs: '11.5px', sm: '12.5px' },
                fontWeight: 700,
                color: '#5f6b78',
                transition: 'all 0.18s ease',
                whiteSpace: 'nowrap'
              },

              '& .MuiTab-root:hover': {
                color: '#1565c0',
                backgroundColor: '#edf5fd'
              },

              '& .MuiTab-root.Mui-selected': {
                color: '#0d5cab',
                backgroundColor: '#e5f1fc',
                fontWeight: 800,
                boxShadow: '0 1px 4px rgba(25, 118, 210, 0.16)'
              },

              '& .MuiTabs-scrollButtons': {
                color: '#1976d2'
              },

              '& .MuiTabs-scrollButtons.Mui-disabled': {
                opacity: 0.25
              }
            }}
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

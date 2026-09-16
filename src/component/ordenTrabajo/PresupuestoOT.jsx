import React, { useState, useEffect } from 'react';
import {
  Box, Grid, TextField, Typography, Button, Tabs, Tab,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Select, MenuItem, FormControl, InputAdornment, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress
} from '@mui/material';
import { Search, Save, Print, Add, Close } from '@mui/icons-material';

const BASE_API_URL = process.env.REACT_APP_API_URL || 'http://localhost/apichess';
const ORDEN_API_URL = 'http://localhost/Api';

const detallesPendientesPorOT = new Map();
const DETALLES_ELIMINADOS_STORAGE_KEY = 'OT_DETALLES_ELIMINADOS_VISUAL_V1';

const obtenerDetallesEliminadosVisualesOT = (idOrden) => {
  const id = String(idOrden || '').trim();

  if (!id) {
    return new Set();
  }

  try {
    const raw = localStorage.getItem(DETALLES_ELIMINADOS_STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : {};
    const eliminados = Array.isArray(data?.[id]) ? data[id] : [];

    return new Set(
      eliminados.map((item) => String(item))
    );
  } catch (_) {
    return new Set();
  }
};

const leerPendientesOT = (idOrden) => {
  const id = String(idOrden || '').trim();
  if (!id) return [];
  const guardados = detallesPendientesPorOT.get(id);
  return Array.isArray(guardados) ? guardados : [];
};

const guardarPendientesOT = (idOrden, detalles) => {
  const id = String(idOrden || '').trim();
  if (!id) return;
  detallesPendientesPorOT.set(id, Array.isArray(detalles) ? detalles : []);
};

const borrarPendientesOT = (idOrden) => {
  const id = String(idOrden || '').trim();
  if (!id) return;
  detallesPendientesPorOT.delete(id);
};

const tieneValor = (valor) =>
  valor !== undefined &&
  valor !== null &&
  String(valor).trim() !== '';

const obtenerNumero = (...valores) => {
  for (const valor of valores) {
    if (!tieneValor(valor)) continue;

    if (typeof valor === 'number' && Number.isFinite(valor)) {
      return valor;
    }

    const texto = String(valor)
      .trim()
      .replace(/\$/g, '')
      .replace(/\s/g, '')
      .replace(/\./g, '')
      .replace(',', '.');

    const numero = Number(texto);

    if (!Number.isNaN(numero)) {
      return numero;
    }
  }

  return 0;
};

const normalizarClave = (valor) =>
  String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();

const buscarArrayProfundo = (raiz, aliases = []) => {
  const aliasesNormalizados = aliases.map(normalizarClave);
  const visitados = new WeakSet();
  let resultado = [];

  const recorrer = (obj) => {
    if (!obj || typeof obj !== 'object' || resultado.length > 0) return;
    if (visitados.has(obj)) return;

    visitados.add(obj);

    if (Array.isArray(obj)) {
      for (const elemento of obj) {
        recorrer(elemento);
        if (resultado.length > 0) return;
      }
      return;
    }

    for (const [clave, valor] of Object.entries(obj)) {
      if (
        aliasesNormalizados.includes(normalizarClave(clave)) &&
        Array.isArray(valor)
      ) {
        resultado = valor;
        return;
      }
    }

    for (const valor of Object.values(obj)) {
      if (valor && typeof valor === 'object') {
        recorrer(valor);
        if (resultado.length > 0) return;
      }
    }
  };

  recorrer(raiz);
  return resultado;
};

const esDetalleOrden = (item) => {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    return false;
  }

  return (
    tieneValor(item.IdDetalle) ||
    tieneValor(item.idDetalle) ||
    tieneValor(item.Codigo) ||
    tieneValor(item.codigo) ||
    tieneValor(item.CodigoProducto) ||
    tieneValor(item.codigoProducto) ||
    tieneValor(item.Descripcion) ||
    tieneValor(item.descripcion)
  );
};

const BODEGAS = [
  { id: '1', nombre: 'Bodega Central' },
  { id: '2', nombre: 'Bodega Norte' },
  { id: '3', nombre: 'Bodega Repuestos' }
];

const normalizarBodega = (valor) => {
  const texto = String(valor ?? '').trim();
  if (!texto) return '';
  const porId = BODEGAS.find((item) => item.id === texto);
  if (porId) return porId.nombre;
  const porNombre = BODEGAS.find(
    (item) => item.nombre.toLowerCase() === texto.toLowerCase()
  );
  return porNombre ? porNombre.nombre : '';
};

export default function PresupuestoOT({ formOrden = {} }) {
  const [subTab, setSubTab] = useState(0);
  const [modalProducto, setModalProducto] = useState(false);
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [productos, setProductos] = useState([]);
  const [cargandoProductos, setCargandoProductos] = useState(false);
  const [cargandoDetalleOT, setCargandoDetalleOT] = useState(false);
  const [guardandoDetallesBD, setGuardandoDetallesBD] = useState(false);
  const [confirmarAgregarProducto, setConfirmarAgregarProducto] = useState(false);
  const [productoAgregadoExito, setProductoAgregadoExito] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [filasGrillaSuperior, setFilasGrillaSuperior] = useState([]);

  const idOrdenActual = String(
    formOrden.IdOrden ??
    formOrden.Idorden ??
    formOrden.IdOT ??
    formOrden.idOrden ??
    ''
  ).trim();

  const convertirDetallesGenerarAFilas = (detalles = []) =>
    (Array.isArray(detalles) ? detalles : []).map((detalle, index) => {
      const cantidad = obtenerNumero(
        detalle.Cantidad,
        detalle.cantidad,
        0
      );

      const valorNeto = obtenerNumero(
        detalle.ValorUnitario,
        detalle.valorUnitario,
        detalle.ValorNeto,
        detalle.valorNeto,
        detalle.neto,
        0
      );

      const dsctoPorc = obtenerNumero(
        detalle.DescuentoPorcentaje,
        detalle.descuentoPorcentaje,
        detalle.dsctoPorc,
        0
      );

      const subtotalGuardado =
        detalle.SubTotal ??
        detalle.subTotal ??
        detalle.subtotal ??
        detalle.TotalNeto ??
        detalle.totalNeto;

      const totalNeto = tieneValor(subtotalGuardado)
        ? obtenerNumero(subtotalGuardado)
        : Math.round(
            cantidad *
              valorNeto *
              (1 - dsctoPorc / 100)
          );

      return {
        id:
          detalle.IdDetalle ??
          detalle.idDetalle ??
          `generar-${idOrdenActual}-${index}`,
        codigo: String(
          detalle.Codigo ??
            detalle.codigo ??
            '--'
        ),
        producto: String(
          detalle.Descripcion ??
            detalle.descripcion ??
            detalle.producto ??
            ''
        ),
        cantidad,
        valorNeto,
        dsctoValor: 0,
        dsctoPorc,
        totalNeto,
        comision: obtenerNumero(
          detalle.TotalComision,
          detalle.totalComision,
          detalle.comision,
          0
        )
      };
    });

  const obtenerSnapshotGenerarOT = () => {
    if (!idOrdenActual) return null;

    try {
      const guardado = sessionStorage.getItem(
        `ot_detalles_generar_${idOrdenActual}`
      );

      if (!guardado) return null;

      const snapshot = JSON.parse(guardado);

      if (
        !snapshot ||
        String(snapshot.idOrden || '').trim() !== idOrdenActual ||
        !Array.isArray(snapshot.detalles)
      ) {
        return null;
      }

      return snapshot;
    } catch (_) {
      return null;
    }
  };

  const [detalleInsumos, setDetalleInsumos] = useState(() =>
    leerPendientesOT(idOrdenActual)
  );

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
    InsumoBodega: '',
    InsumoProducto: '',
    InsumoCodigo: '',
    InsumoCantidad: '',
    Neto: 0,
    Iva: 0,
    Total: 0
  });

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
        InsumoBodega: prev.InsumoBodega || normalizarBodega(formOrden.Bodega || formOrden.IdBodega || ''),
        EncargadoOT: formOrden.EncargadoOT || '',
        Observaciones: formOrden.Observaciones || ''
      }));
    }
  }, [formOrden]);

  useEffect(() => {
    setDetalleInsumos(leerPendientesOT(idOrdenActual));
  }, [idOrdenActual]);

  useEffect(() => {
    if (!idOrdenActual) return;
    guardarPendientesOT(idOrdenActual, detalleInsumos);
  }, [idOrdenActual, detalleInsumos]);

  const cargarDetallesOTDesdeBD = async (signal = null) => {
    if (!idOrdenActual) {
      setFilasGrillaSuperior([]);
      return [];
    }

    setCargandoDetalleOT(true);

    try {
      const response = await fetch(
        `${ORDEN_API_URL}/api/OrdenTrabajo/Leer/${encodeURIComponent(idOrdenActual)}`,
        {
          method: 'GET',
          headers: {
            Accept: 'application/json'
          },
          ...(signal ? { signal } : {})
        }
      );

      if (!response.ok) {
        const detalleError = await response.text().catch(() => '');
        throw new Error(
          `HTTP ${response.status}${detalleError ? ` - ${detalleError}` : ''}`
        );
      }

      const respuesta = await response.json();

      let listaDetalles = buscarArrayProfundo(
        respuesta,
        [
          'Detalles',
          'detalles',
          'Detalle',
          'detalle',
          'Productos',
          'productos',
          'Items',
          'items'
        ]
      );

      if ((!listaDetalles || listaDetalles.length === 0) && Array.isArray(respuesta)) {
        listaDetalles = respuesta.filter(esDetalleOrden);
      }

      if (!Array.isArray(listaDetalles)) {
        listaDetalles = [];
      }

      const filas = listaDetalles
        .filter(esDetalleOrden)
        .map((detalle, index) => {
          const cantidad = obtenerNumero(
            detalle.Cantidad,
            detalle.cantidad,
            detalle.CantidadProducto,
            detalle.cantidadProducto,
            1
          );

          const valorNeto = obtenerNumero(
            detalle.ValorUnitario,
            detalle.valorUnitario,
            detalle.ValorNeto,
            detalle.valorNeto,
            detalle.Precio,
            detalle.precio,
            detalle.Neto,
            detalle.neto,
            0
          );

          const dsctoPorc = obtenerNumero(
            detalle.DescuentoPorcentaje,
            detalle.descuentoPorcentaje,
            detalle.DescuentoPorc,
            detalle.descuentoPorc,
            detalle.Descuento,
            detalle.descuento,
            0
          );

          const dsctoValor = obtenerNumero(
            detalle.DescuentoMonto,
            detalle.descuentoMonto,
            detalle.DescuentoValor,
            detalle.descuentoValor,
            0
          );

          const subtotalGuardado =
            detalle.SubTotal ??
            detalle.subTotal ??
            detalle.Subtotal ??
            detalle.subtotal ??
            detalle.TotalNeto ??
            detalle.totalNeto;

          const totalNeto = tieneValor(subtotalGuardado)
            ? obtenerNumero(subtotalGuardado)
            : Math.round(
                cantidad *
                  valorNeto *
                  (1 - dsctoPorc / 100)
              );

          return {
            id:
              detalle.IdDetalle ??
              detalle.idDetalle ??
              `${idOrdenActual}-${index}`,
            codigo: String(
              detalle.Codigo ??
                detalle.codigo ??
                detalle.CodigoProducto ??
                detalle.codigoProducto ??
                detalle.CodProducto ??
                detalle.codProducto ??
                '--'
            ),
            producto: String(
              detalle.Descripcion ??
                detalle.descripcion ??
                detalle.NombreProducto ??
                detalle.nombreProducto ??
                detalle.Nombre ??
                detalle.nombre ??
                ''
            ),
            cantidad,
            valorNeto,
            dsctoValor,
            dsctoPorc,
            totalNeto,
            comision: obtenerNumero(
              detalle.TotalComision,
              detalle.totalComision,
              detalle.ComisionTotal,
              detalle.comisionTotal,
              detalle.Comision,
              detalle.comision,
              0
            )
          };
        });

      const eliminadosVisuales = obtenerDetallesEliminadosVisualesOT(
        idOrdenActual
      );

      const filasVisibles = filas.filter((fila) =>
        !eliminadosVisuales.has(String(fila.id))
      );

      setFilasGrillaSuperior(filasVisibles);
      return filasVisibles;
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error(
          `[PRESUPUESTO OT ${idOrdenActual}] Error al cargar productos de la OT:`,
          error
        );
        setFilasGrillaSuperior([]);
      }
      throw error;
    } finally {
      if (!signal || !signal.aborted) {
        setCargandoDetalleOT(false);
      }
    }
  };

  useEffect(() => {
    if (!idOrdenActual) {
      setFilasGrillaSuperior([]);
      return undefined;
    }

    const controller = new AbortController();

    cargarDetallesOTDesdeBD(controller.signal).catch((error) => {
      if (error.name !== 'AbortError') {
        console.error(error);
      }
    });

    return () => {
      controller.abort();
    };
  }, [idOrdenActual]);

  useEffect(() => {
    if (!idOrdenActual) {
      return undefined;
    }

    const aplicarSnapshotGenerar = (payload) => {
      if (
        !payload ||
        String(payload.idOrden || '').trim() !== idOrdenActual ||
        !Array.isArray(payload.detalles)
      ) {
        return;
      }

      setFilasGrillaSuperior(
        convertirDetallesGenerarAFilas(payload.detalles)
      );
    };

    const manejarActualizacion = (event) => {
      aplicarSnapshotGenerar(event.detail);
    };

    window.addEventListener(
      'ot:detalles-generar-actualizados',
      manejarActualizacion
    );

    const snapshot = obtenerSnapshotGenerarOT();

    if (snapshot) {
      aplicarSnapshotGenerar(snapshot);
    }

    return () => {
      window.removeEventListener(
        'ot:detalles-generar-actualizados',
        manejarActualizacion
      );
    };
  }, [idOrdenActual]);


  useEffect(() => {
    if (!modalProducto) return undefined;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setCargandoProductos(true);
      try {
        const resp = await fetch(`${BASE_API_URL}/productos.php/getAllProductos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ busqueda: busquedaProducto.trim(), idsucursal: '1' }),
          signal: controller.signal
        });
        if (!resp.ok) throw new Error(`Error HTTP: ${resp.status}`);
        const json = await resp.json();
        let rawItems = [];
        if (Array.isArray(json)) rawItems = json;
        else if (json && typeof json === 'object') {
          rawItems = json.data || json.productos || json.listado || json.result || json.items || Object.values(json) || [];
        }
        if (!Array.isArray(rawItems)) rawItems = [];
        const normalizados = rawItems.map((item, index) => {
          const idProd = item.IdProducto || item.idProducto || item.Id || item.id || index + 1;
          const codigoProd = item.Codigo || item.codigo || item.CodProducto || item.SKU || `${idProd}`;
          const descProd = item.Descripcion || item.descripcion || item.Nombre || item.nombre || `Producto ${idProd}`;
          const netoVal = parseFloat(item.Neto ?? item.neto ?? item.PrecioNeto ?? item.ValorNeto ?? item.Precio ?? item.precio ?? item.ValorUnitario ?? 0);
          const stockVal = parseInt(item.Stock ?? item.stock ?? item.Cantidad ?? 0, 10);
          return {
            ...item,
            id: idProd,
            codigo: codigoProd,
            Codigo: codigoProd,
            nombre: descProd,
            descripcion: descProd,
            Descripcion: descProd,
            stock: Number.isNaN(stockVal) ? 0 : stockVal,
            Stock: Number.isNaN(stockVal) ? 0 : stockVal,
            neto: Number.isNaN(netoVal) ? 0 : netoVal,
            Neto: Number.isNaN(netoVal) ? 0 : netoVal
          };
        });
        setProductos(normalizados);
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Error al buscar productos:', error);
          setProductos([]);
        }
      } finally {
        if (!controller.signal.aborted) setCargandoProductos(false);
      }
    }, busquedaProducto.trim() ? 300 : 0);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [modalProducto, busquedaProducto]);

  const handleChange = (campo, valor) => {
    setDatosPresupuesto((prev) => ({
      ...prev,
      [campo]: valor
    }));
  };

  const abrirBuscadorProducto = () => {
    setBusquedaProducto('');
    setModalProducto(true);
  };

  const seleccionarProducto = (producto) => {
    setProductoSeleccionado(producto);
    setDatosPresupuesto((prev) => ({
      ...prev,
      InsumoCodigo: producto.codigo || producto.Codigo || '',
      InsumoProducto: producto.descripcion || producto.Descripcion || producto.nombre || '',
      InsumoCantidad: prev.InsumoCantidad || '1'
    }));
    setModalProducto(false);
  };

  const limpiarSeleccionProducto = () => {
    setProductoSeleccionado(null);
    setBusquedaProducto('');
    setProductos([]);
    setModalProducto(false);

    setDatosPresupuesto((prev) => ({
      ...prev,
      InsumoCodigo: '',
      InsumoProducto: '',
      InsumoCantidad: ''
    }));
  };

  const limpiarDetallesInsumos = () => {
    setProductoSeleccionado(null);
    setBusquedaProducto('');
    setProductos([]);
    setModalProducto(false);
    setDetalleInsumos([]);
    borrarPendientesOT(idOrdenActual);

    setDatosPresupuesto((prev) => ({
      ...prev,
      InsumoCodigo: '',
      InsumoProducto: '',
      InsumoCantidad: '',
      Neto: 0,
      Iva: 0,
      Total: 0
    }));
  };

  const eliminarDetalleInsumo = (idDetalle) => {
    setDetalleInsumos((prev) =>
      prev.filter((item) => item.id !== idDetalle)
    );
  };

  const agregarProducto = () => {
    if (!productoSeleccionado) {
      alert('Primero debes seleccionar un producto.');
      return;
    }
    const cantidad = Number(datosPresupuesto.InsumoCantidad || 0);
    if (!cantidad || cantidad <= 0) {
      alert('Ingresa una cantidad mayor a 0.');
      return;
    }
    const neto = Number(productoSeleccionado.Neto ?? productoSeleccionado.neto ?? 0);
    const subtotal = Math.round(cantidad * neto);
    const iva = Math.round(subtotal * 0.19);
    const total = subtotal + iva;
    setDetalleInsumos((prev) => [
      ...prev,
      {
        id: `${productoSeleccionado.codigo || productoSeleccionado.Codigo}-${Date.now()}`,
        codigo: productoSeleccionado.codigo || productoSeleccionado.Codigo || '',
        producto: productoSeleccionado.descripcion || productoSeleccionado.Descripcion || productoSeleccionado.nombre || '',
        cantidad,
        neto,
        subtotal,
        iva,
        total,
        bodega: datosPresupuesto.InsumoBodega
      }
    ]);
    limpiarSeleccionProducto();
  };

  const guardarDetalleOrdenEnBD = async (detalle) => {
    if (!idOrdenActual) {
      throw new Error('La O.T. actual no tiene un IdOrden válido.');
    }

    const dto = {
      IdDetalle: '0',
      Idorden: String(idOrdenActual),
      IdOrden: Number(idOrdenActual),
      IdTipo: '2',
      Codigo: String(detalle.codigo || ''),
      Descripcion: String(detalle.producto || ''),
      Cantidad: String(Number(detalle.cantidad || 0)),
      ValorUnitario: String(Number(detalle.neto || 0)),
      DescuentoPorcentaje: '0',
      SubTotal: String(Number(detalle.subtotal || 0)),
      ComisionPorcentaje: '0',
      TotalComision: '0'
    };

    const payload = {
      Cabecera: null,
      Detalles: [dto],
      Imagenes: []
    };

    const response = await fetch(
      `${ORDEN_API_URL}/api/OrdenTrabajo/CrearDetalleOrdenTrabajo`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify(payload)
      }
    );

    if (!response.ok) {
      const detalleError = await response.text().catch(() => '');

      throw new Error(
        `HTTP ${response.status}${
          detalleError ? ` - ${detalleError}` : ''
        }`
      );
    }

    if (response.status === 204) {
      return null;
    }

    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      return await response.json();
    }

    return await response.text().catch(() => null);
  };

  const confirmarDetallePresupuesto = () => {
    if (!idOrdenActual) {
      alert('Primero debes cargar una Orden de Trabajo.');
      return;
    }

    if (!detalleInsumos.length) {
      alert('No hay productos pendientes para guardar.');
      return;
    }

    if (guardandoDetallesBD) return;

    setConfirmarAgregarProducto(true);
  };

  const guardarDetallePresupuestoConfirmado = async () => {
    if (guardandoDetallesBD) return;

    setConfirmarAgregarProducto(false);
    setGuardandoDetallesBD(true);

    try {
      const pendientes = [...detalleInsumos];

      for (const detalle of pendientes) {
        await guardarDetalleOrdenEnBD(detalle);
      }

      setDetalleInsumos([]);
      borrarPendientesOT(idOrdenActual);

      setDatosPresupuesto((prev) => ({
        ...prev,
        InsumoCodigo: '',
        InsumoProducto: '',
        InsumoCantidad: '',
        Neto: 0,
        Iva: 0,
        Total: 0
      }));

      setProductoSeleccionado(null);
      setBusquedaProducto('');
      setProductos([]);

      const filasNuevas = pendientes.map((detalle, index) => ({
        id: `nuevo-${idOrdenActual}-${Date.now()}-${index}`,
        codigo: String(detalle.codigo || '--'),
        producto: String(detalle.producto || ''),
        cantidad: Number(detalle.cantidad || 0),
        valorNeto: Number(detalle.neto || 0),
        dsctoValor: 0,
        dsctoPorc: 0,
        totalNeto: Number(detalle.subtotal || 0),
        comision: 0
      }));

      setFilasGrillaSuperior((prev) => [
        ...prev,
        ...filasNuevas
      ]);

      await cargarDetallesOTDesdeBD();

      const actualizacionOT = {
        idOrden: String(idOrdenActual),
        fecha: Date.now(),
        detalles: pendientes.map((detalle) => ({
          IdTipo: '2',
          Codigo: String(detalle.codigo || ''),
          Descripcion: String(detalle.producto || ''),
          Cantidad: Number(detalle.cantidad || 0),
          ValorUnitario: Number(detalle.neto || 0),
          DescuentoPorcentaje: 0,
          SubTotal: Number(detalle.subtotal || 0),
          ComisionPorcentaje: 0,
          TotalComision: 0
        }))
      };

      try {
        sessionStorage.setItem(
          `ot_detalles_actualizados_${idOrdenActual}`,
          JSON.stringify(actualizacionOT)
        );
      } catch (_) {}

      window.dispatchEvent(
        new CustomEvent('ot:detalles-actualizados', {
          detail: actualizacionOT
        })
      );

      setProductoAgregadoExito(true);
    } catch (error) {
      console.error(
        `[PRESUPUESTO OT ${idOrdenActual}] Error al guardar detalles:`,
        error
      );

      alert(
        `No fue posible guardar los productos en la O.T.: ${
          error.message || 'Error desconocido'
        }`
      );
    } finally {
      setGuardandoDetallesBD(false);
    }
  };

  const cantidadInsumo = Number(datosPresupuesto.InsumoCantidad || 0);
  const netoInsumo = Number(productoSeleccionado?.Neto ?? productoSeleccionado?.neto ?? 0);
  const stockInsumo = Number(productoSeleccionado?.Stock ?? productoSeleccionado?.stock ?? 0);
  const subtotalInsumo = Math.round(cantidadInsumo * netoInsumo);
  const ivaInsumo = Math.round(subtotalInsumo * 0.19);
  const totalInsumo = subtotalInsumo + ivaInsumo;

  useEffect(() => {
    const neto = detalleInsumos.reduce(
      (acumulado, item) => acumulado + (Number(item.subtotal) || 0),
      0
    );

    const iva = detalleInsumos.reduce(
      (acumulado, item) => acumulado + (Number(item.iva) || 0),
      0
    );

    const total = detalleInsumos.reduce(
      (acumulado, item) => acumulado + (Number(item.total) || 0),
      0
    );

    setDatosPresupuesto((prev) => {
      if (
        Number(prev.Neto) === neto &&
        Number(prev.Iva) === iva &&
        Number(prev.Total) === total
      ) {
        return prev;
      }

      return {
        ...prev,
        Neto: neto,
        Iva: iva,
        Total: total
      };
    });
  }, [detalleInsumos]);

  const etiquetaAzulSx = {
    display: 'block',
    width: 'fit-content',
    minWidth: '82px',
    mx: 'auto',
    mb: 0.35,
    px: 0.75,
    py: 0.2,
    backgroundColor: '#0070d2',
    color: '#ffffff',
    fontWeight: 700,
    fontSize: '10px',
    lineHeight: 1.25,
    textAlign: 'center'
  };

  const campoCompactoSx = {
    '& .MuiOutlinedInput-root': {
      height: '30px',
      backgroundColor: '#ffffff',
      borderRadius: '3px'
    },
    '& .MuiInputBase-input': {
      px: 1,
      py: 0.5,
      fontSize: '11px',
      textAlign: 'center'
    }
  };

  const botonOrigenSx = {
    minHeight: '28px',
    backgroundColor: '#e0e0e0',
    color: '#111111',
    border: '1px solid #999999',
    borderRadius: '3px',
    textTransform: 'none',
    fontSize: '11px',
    fontWeight: 700,
    boxShadow: 'none',
    '&:hover': {
      backgroundColor: '#d5d5d5',
      boxShadow: 'none'
    }
  };

  const panelOrigenSx = {
    backgroundColor: '#e0e0e0',
    border: '1px solid #b8b8b8',
    borderRadius: '3px'
  };

  return (
    <Box
      sx={{
        width: '100%',
        boxSizing: 'border-box',
        backgroundColor: '#f0f0f0',
        border: '1px solid #b0b0b0',
        borderRadius: '3px',
        p: { xs: 1, sm: 1.25, md: 1.5 }
      }}
    >
      <Box sx={{ ...panelOrigenSx, p: { xs: 1, md: 1.25 }, mb: 1.25 }}>
        <Grid container spacing={1}>
          <Grid item xs={12} sm={4} md={3}>
            <Typography variant="caption" sx={etiquetaAzulSx}>
              Número O.T.:
            </Typography>
            <TextField
              size="small"
              fullWidth
              value={datosPresupuesto.IdOrden}
              onChange={(e) => handleChange('IdOrden', e.target.value)}
              sx={campoCompactoSx}
            />
          </Grid>

          <Grid item xs={12} sm={8} md={6}>
            <Typography variant="caption" sx={etiquetaAzulSx}>
              Cliente:
            </Typography>
            <TextField
              size="small"
              fullWidth
              value={datosPresupuesto.NombreCliente}
              onChange={(e) => handleChange('NombreCliente', e.target.value)}
              sx={{
                ...campoCompactoSx,
                '& .MuiInputBase-input': {
                  px: 1,
                  py: 0.5,
                  fontSize: '11px',
                  textAlign: 'left'
                }
              }}
            />
          </Grid>

          <Grid
            item
            xs={12}
            md={3}
            sx={{ display: 'flex', alignItems: 'flex-end' }}
          >
            <Button
              variant="contained"
              size="small"
              fullWidth
              sx={{
                ...botonOrigenSx,
                backgroundColor: '#0070d2',
                color: '#ffffff',
                borderColor: '#0063bb',
                '&:hover': {
                  backgroundColor: '#0063bb'
                }
              }}
            >
              Observaciones
            </Button>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="caption" sx={etiquetaAzulSx}>
              Fecha ingreso:
            </Typography>
            <TextField
              size="small"
              fullWidth
              value={datosPresupuesto.FechaIngreso}
              onChange={(e) => handleChange('FechaIngreso', e.target.value)}
              sx={campoCompactoSx}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="caption" sx={etiquetaAzulSx}>
              Hora ingreso:
            </Typography>
            <TextField
              size="small"
              fullWidth
              value={datosPresupuesto.HoraIngreso}
              onChange={(e) => handleChange('HoraIngreso', e.target.value)}
              sx={campoCompactoSx}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="caption" sx={etiquetaAzulSx}>
              Fecha entrega:
            </Typography>
            <TextField
              size="small"
              fullWidth
              value={datosPresupuesto.FechaEntrega}
              onChange={(e) => handleChange('FechaEntrega', e.target.value)}
              sx={campoCompactoSx}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="caption" sx={etiquetaAzulSx}>
              Hora entrega:
            </Typography>
            <TextField
              size="small"
              fullWidth
              value={datosPresupuesto.HoraEntrega}
              onChange={(e) => handleChange('HoraEntrega', e.target.value)}
              sx={campoCompactoSx}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="caption" sx={etiquetaAzulSx}>
              Bodega:
            </Typography>
            <TextField
              size="small"
              fullWidth
              value={datosPresupuesto.Bodega}
              onChange={(e) => handleChange('Bodega', e.target.value)}
              sx={campoCompactoSx}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="caption" sx={etiquetaAzulSx}>
              Encargado:
            </Typography>
            <TextField
              size="small"
              fullWidth
              value={datosPresupuesto.EncargadoOT}
              onChange={(e) => handleChange('EncargadoOT', e.target.value)}
              sx={campoCompactoSx}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                mb: 0.35,
                fontSize: '10px',
                fontWeight: 700,
                color: '#4a4a4a'
              }}
            >
              Observaciones
            </Typography>
            <TextField
              fullWidth
              multiline
              minRows={2}
              maxRows={4}
              value={datosPresupuesto.Observaciones}
              onChange={(e) => handleChange('Observaciones', e.target.value)}
              placeholder="Escribe observaciones o comentarios técnicos aquí..."
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: '#ffffff',
                  borderRadius: '3px',
                  minHeight: '64px',
                  alignItems: 'flex-start'
                },
                '& textarea': {
                  fontSize: '11px',
                  lineHeight: 1.4
                }
              }}
            />
          </Grid>
        </Grid>
      </Box>

      <TableContainer
        component={Paper}
        variant="outlined"
        sx={{
          mb: 1.25,
          borderColor: '#b8b8b8',
          borderRadius: '3px',
          minHeight: 190,
          maxHeight: 245,
          overflowX: 'auto',
          overflowY: 'auto'
        }}
      >
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow
              sx={{
                '& th': {
                  backgroundColor: '#f0f0f0',
                  color: '#111111',
                  fontWeight: 700,
                  p: '4px 6px',
                  fontSize: '10px',
                  whiteSpace: 'nowrap',
                  borderBottom: '1px solid #b8b8b8'
                }
              }}
            >
              <TableCell />
              <TableCell>Código</TableCell>
              <TableCell>Producto</TableCell>
              <TableCell align="center">Cantidad</TableCell>
              <TableCell align="right">Valor Neto</TableCell>
              <TableCell align="right">Dscto.($)</TableCell>
              <TableCell align="right">Dscto.(%)</TableCell>
              <TableCell align="right">Total Neto</TableCell>
              <TableCell align="right">Comisión</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {cargandoDetalleOT ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 2, fontSize: '10px' }}>
                  Cargando productos de la O.T. {idOrdenActual}...
                </TableCell>
              </TableRow>
            ) : filasGrillaSuperior.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 2, fontSize: '10px' }}>
                  Esta O.T. no tiene productos guardados.
                </TableCell>
              </TableRow>
            ) : (
              filasGrillaSuperior.map((row) => (
                <TableRow
                  key={row.id}
                  sx={{
                    backgroundColor: '#ffffff',
                    '& td': {
                      p: '4px 6px',
                      fontSize: '10px',
                      borderBottom: '1px solid #e0e0e0'
                    }
                  }}
                >
                  <TableCell sx={{ width: 24, textAlign: 'center' }}>▶</TableCell>
                  <TableCell>{row.codigo}</TableCell>
                  <TableCell>{row.producto}</TableCell>
                  <TableCell align="center">{row.cantidad}</TableCell>
                  <TableCell align="right">
                    {Number(row.valorNeto || 0).toLocaleString('es-CL')}
                  </TableCell>
                  <TableCell align="right">
                    {Number(row.dsctoValor || 0).toLocaleString('es-CL')}
                  </TableCell>
                  <TableCell align="right">{row.dsctoPorc}</TableCell>
                  <TableCell align="right">
                    {Number(row.totalNeto || 0).toLocaleString('es-CL')}
                  </TableCell>
                  <TableCell align="right">
                    {Number(row.comision || 0).toLocaleString('es-CL')}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ ...panelOrigenSx, p: 1, mb: 1.25 }}>
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            mb: 0.75,
            color: '#000080',
            fontWeight: 700,
            fontSize: '12px',
            textAlign: 'center'
          }}
        >
          Detalles Insumos
        </Typography>

        <Box
          sx={{
            width: '100%',
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'minmax(0, 1.45fr) minmax(300px, 0.85fr)'
            },
            gap: 1.25,
            alignItems: 'stretch'
          }}
        >
          <Box
            sx={{
              minWidth: 0,
              minHeight: { xs: 'auto', sm: 245 },
              backgroundColor: '#f0f0f0',
              border: '1px solid #b8b8b8',
              borderRadius: '3px',
              p: 1,
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <Tabs
              value={subTab}
              onChange={(e, v) => setSubTab(v)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                minHeight: 28,
                mb: 1,
                borderBottom: '1px solid #b8b8b8',
                '& .MuiTab-root': {
                  minHeight: 28,
                  px: 1.5,
                  py: 0,
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: '10px'
                }
              }}
            >
              <Tab label="Productos" />
              <Tab label="Servicio" />
            </Tabs>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: '125px minmax(150px, 230px) 34px 86px'
                },
                gap: 0.75,
                alignItems: 'end',
                mb: 1
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" sx={etiquetaAzulSx}>
                  Bodega:
                </Typography>

                <FormControl size="small" fullWidth>
                  <Select
                    value={datosPresupuesto.InsumoBodega || ''}
                    displayEmpty
                    onChange={(e) =>
                      handleChange('InsumoBodega', e.target.value)
                    }
                    sx={{
                      height: '30px',
                      backgroundColor: '#ffffff',
                      borderRadius: '3px',
                      fontSize: '11px',
                      '& .MuiSelect-select': {
                        py: '4px',
                        textAlign: 'center'
                      }
                    }}
                  >
                    <MenuItem value="">
                      <em>Seleccione</em>
                    </MenuItem>

                    {BODEGAS.map((bodega) => (
                      <MenuItem key={bodega.id} value={bodega.nombre}>
                        {bodega.nombre}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" sx={etiquetaAzulSx}>
                  Producto:
                </Typography>

                <TextField
                  size="small"
                  fullWidth
                  value={datosPresupuesto.InsumoProducto}
                  onChange={(e) => {
                    setProductoSeleccionado(null);
                    handleChange('InsumoProducto', e.target.value);
                  }}
                  placeholder="Producto"
                  sx={{
                    ...campoCompactoSx,
                    '& .MuiInputBase-input': {
                      px: 1,
                      py: 0.5,
                      fontSize: '11px',
                      textAlign: 'left'
                    }
                  }}
                />
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  height: '100%'
                }}
              >
                <IconButton
                  size="small"
                  onClick={abrirBuscadorProducto}
                  sx={{
                    width: 30,
                    height: 30,
                    backgroundColor: '#e0e0e0',
                    color: '#0070d2',
                    border: '1px solid #999999',
                    borderRadius: '3px',
                    '&:hover': {
                      backgroundColor: '#d5d5d5'
                    }
                  }}
                >
                  <Search sx={{ fontSize: 18 }} />
                </IconButton>
              </Box>

              <Button
                variant="contained"
                size="small"
                startIcon={<Add sx={{ fontSize: 15 }} />}
                onClick={agregarProducto}
                disabled={!productoSeleccionado || !cantidadInsumo}
                sx={{
                  ...botonOrigenSx,
                  width: '100%',
                  minWidth: 0
                }}
              >
                Agregar
              </Button>
            </Box>

            <TableContainer
              component={Paper}
              variant="outlined"
              sx={{
                borderColor: '#b8b8b8',
                borderRadius: '3px',
                overflowX: 'auto',
                width: '100%'
              }}
            >
              <Table
                size="small"
                sx={{
                  minWidth: 480,
                  tableLayout: 'fixed'
                }}
              >
                <TableHead>
                  <TableRow
                    sx={{
                      '& th': {
                        backgroundColor: '#0070d2',
                        color: '#ffffff',
                        fontWeight: 700,
                        p: '4px',
                        fontSize: '9.5px',
                        textAlign: 'center',
                        whiteSpace: 'nowrap'
                      }
                    }}
                  >
                    <TableCell>Stock</TableCell>
                    <TableCell>P.Venta Neto</TableCell>
                    <TableCell>Cantidad</TableCell>
                    <TableCell>Iva</TableCell>
                    <TableCell>Total</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  <TableRow
                    sx={{
                      backgroundColor: '#ffffff',
                      '& td': {
                        p: '3px',
                        height: 30,
                        borderBottom: 'none'
                      }
                    }}
                  >
                    <TableCell align="center">{stockInsumo}</TableCell>

                    <TableCell align="center">
                      {Math.round(netoInsumo).toLocaleString('es-CL')}
                    </TableCell>

                    <TableCell>
                      <input
                        type="number"
                        min="0"
                        value={datosPresupuesto.InsumoCantidad}
                        onChange={(e) =>
                          handleChange('InsumoCantidad', e.target.value)
                        }
                        style={{
                          width: '100%',
                          minWidth: 55,
                          border: 'none',
                          outline: 'none',
                          textAlign: 'center',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: 'transparent'
                        }}
                      />
                    </TableCell>

                    <TableCell align="center">
                      {ivaInsumo.toLocaleString('es-CL')}
                    </TableCell>

                    <TableCell align="center">
                      {totalInsumo.toLocaleString('es-CL')}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>

            <Box
              sx={{
                display: 'flex',
                justifyContent: 'flex-start',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 0.75,
                pt: 1
              }}
            >
              <Button
                variant="contained"
                size="small"
                onClick={limpiarDetallesInsumos}
                sx={{
                  ...botonOrigenSx,
                  minWidth: 80
                }}
              >
                Limpiar
              </Button>

              <Button
                variant="contained"
                size="small"
                onClick={confirmarDetallePresupuesto}
                disabled={
                  guardandoDetallesBD ||
                  detalleInsumos.length === 0
                }
                sx={{
                  ...botonOrigenSx,
                  minWidth: 90
                }}
              >
                {guardandoDetallesBD ? (
                  <>
                    <CircularProgress size={14} sx={{ mr: 0.75 }} />
                    Guardando
                  </>
                ) : (
                  'Agregar Producto'
                )}
              </Button>
            </Box>
          </Box>

          <TableContainer
            component={Paper}
            variant="outlined"
            sx={{
              minWidth: 0,
              width: '100%',
              minHeight: { xs: 220, sm: 245 },
              maxHeight: 300,
              borderColor: '#b8b8b8',
              borderRadius: '3px',
              overflow: 'auto',
              backgroundColor: '#a0a0a0'
            }}
          >
            <Table
              size="small"
              stickyHeader
              sx={{
                minWidth: 500,
                width: '100%',
                tableLayout: 'auto'
              }}
            >
              <TableHead>
                <TableRow
                  sx={{
                    '& th': {
                      backgroundColor: '#f0f0f0',
                      color: '#111111',
                      fontWeight: 700,
                      p: '4px',
                      fontSize: '9.5px',
                      whiteSpace: 'nowrap',
                      borderBottom: '1px solid #b8b8b8'
                    }
                  }}
                >
                  <TableCell>N°</TableCell>
                  <TableCell>Producto</TableCell>
                  <TableCell align="center">Cant.</TableCell>
                  <TableCell align="right">P.Venta Neto</TableCell>
                  <TableCell align="right">SubTotal</TableCell>
                  <TableCell align="right">Iva</TableCell>
                  <TableCell align="right">C.Total</TableCell>
                  <TableCell
                    align="center"
                    sx={{
                      width: 54,
                      minWidth: 54,
                      maxWidth: 54,
                      position: 'sticky',
                      right: 0,
                      zIndex: 4,
                      backgroundColor: '#f0f0f0 !important',
                      borderLeft: '1px solid #d0d0d0'
                    }}
                  >
                    Acción
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {detalleInsumos.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      align="center"
                      sx={{
                        height: { xs: 170, sm: 190 },
                        backgroundColor: '#a0a0a0',
                        border: 'none',
                        color: '#ffffff',
                        fontSize: '10px',
                        verticalAlign: 'middle'
                      }}
                    >
                      Sin productos agregados
                    </TableCell>
                  </TableRow>
                ) : (
                  detalleInsumos.map((item, index) => (
                    <TableRow
                      key={item.id}
                      sx={{
                        backgroundColor: '#ffffff',
                        '& td': {
                          p: '4px',
                          fontSize: '9.5px',
                          borderBottom: '1px solid #e0e0e0'
                        }
                      }}
                    >
                      <TableCell>{index + 1}</TableCell>

                      <TableCell>
                        <Typography
                          variant="caption"
                          sx={{
                            display: 'block',
                            fontWeight: 700,
                            fontSize: '9.5px'
                          }}
                        >
                          {item.producto}
                        </Typography>

                        <Typography
                          variant="caption"
                          sx={{
                            display: 'block',
                            color: '#666666',
                            fontSize: '8.5px'
                          }}
                        >
                          {item.codigo}
                        </Typography>
                      </TableCell>

                      <TableCell align="center">
                        {item.cantidad}
                      </TableCell>

                      <TableCell align="right">
                        {Math.round(item.neto).toLocaleString('es-CL')}
                      </TableCell>

                      <TableCell align="right">
                        {item.subtotal.toLocaleString('es-CL')}
                      </TableCell>

                      <TableCell align="right">
                        {item.iva.toLocaleString('es-CL')}
                      </TableCell>

                      <TableCell align="right">
                        {item.total.toLocaleString('es-CL')}
                      </TableCell>

                      <TableCell
                        align="center"
                        sx={{
                          width: 54,
                          minWidth: 54,
                          maxWidth: 54,
                          position: 'sticky',
                          right: 0,
                          zIndex: 2,
                          backgroundColor: '#ffffff',
                          borderLeft: '1px solid #e0e0e0'
                        }}
                      >
                        <IconButton
                          size="small"
                          title="Quitar producto"
                          aria-label={`Quitar ${item.producto}`}
                          disabled={guardandoDetallesBD}
                          onClick={() => eliminarDetalleInsumo(item.id)}
                          sx={{
                            width: 27,
                            height: 27,
                            color: '#ffffff',
                            backgroundColor: '#d32f2f',
                            borderRadius: '4px',
                            '&:hover': {
                              backgroundColor: '#b71c1c'
                            },
                            '&.Mui-disabled': {
                              color: '#eeeeee',
                              backgroundColor: '#bdbdbd'
                            }
                          }}
                        >
                          <Close sx={{ fontSize: 17, fontWeight: 700 }} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Box>

      <Box
        sx={{
          ...panelOrigenSx,
          p: 1,
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', md: 'center' },
          gap: 1
        }}
      >
        <Box
          sx={{
            display: 'flex',
            gap: 0.5,
            flexWrap: 'wrap'
          }}
        >
          <Button
            startIcon={<Search />}
            variant="contained"
            size="small"
            sx={botonOrigenSx}
          >
            Buscar
          </Button>
          <Button
            startIcon={<Save />}
            variant="contained"
            size="small"
            sx={botonOrigenSx}
          >
            Grabar
          </Button>
          <Button
            disabled
            variant="contained"
            size="small"
            sx={botonOrigenSx}
          >
            Eliminar
          </Button>
          <Button
            startIcon={<Print />}
            variant="contained"
            size="small"
            sx={botonOrigenSx}
          >
            Imprimir
          </Button>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(3, minmax(80px, 1fr))',
              sm: 'repeat(3, 105px)'
            },
            gap: 0.75,
            justifyContent: { xs: 'stretch', md: 'end' }
          }}
        >
          {[
            ['Neto', 'Neto'],
            ['Iva', 'Iva'],
            ['Total', 'Total']
          ].map(([label, campo]) => (
            <Box key={campo}>
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  mb: 0.25,
                  fontSize: '9.5px',
                  fontWeight: 700,
                  textAlign: 'center'
                }}
              >
                {label}
              </Typography>
              <TextField
                size="small"
                fullWidth
                value={datosPresupuesto[campo]}
                onChange={(e) => handleChange(campo, e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    height: '28px',
                    backgroundColor: '#ffffff',
                    borderRadius: '3px'
                  },
                  '& .MuiInputBase-input': {
                    p: '4px 6px',
                    textAlign: 'right',
                    fontSize: '11px',
                    fontWeight: 700
                  }
                }}
              />
            </Box>
          ))}
        </Box>
      </Box>

      <Dialog
        open={confirmarAgregarProducto}
        onClose={() => {
          if (!guardandoDetallesBD) {
            setConfirmarAgregarProducto(false);
          }
        }}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '8px',
            overflow: 'hidden'
          }
        }}
      >
        <DialogTitle
          sx={{
            backgroundColor: '#0070d2',
            color: '#ffffff',
            fontSize: '15px',
            fontWeight: 700,
            py: 1.25,
            px: 2
          }}
        >
          Confirmar producto
        </DialogTitle>

        <DialogContent
          sx={{
            pt: '30px !important',
            pb: 2,
            px: 3,
            textAlign: 'center'
          }}
        >
          <Box
            sx={{
              width: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: 34
            }}
          >
            <Typography
              sx={{
                fontSize: '13px',
                color: '#222222',
                fontWeight: 500,
                lineHeight: 1.6,
                textAlign: 'center'
              }}
            >
              ¿Está seguro de querer agregar este producto?
            </Typography>
          </Box>
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            pb: 2,
            pt: 0.75,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 1.5
          }}
        >
          <Button
            variant="contained"
            size="small"
            disabled={guardandoDetallesBD}
            onClick={guardarDetallePresupuestoConfirmado}
            sx={{
              minWidth: 90,
              backgroundColor: '#0070d2',
              textTransform: 'none',
              fontWeight: 700,
              '&:hover': {
                backgroundColor: '#0063bb'
              }
            }}
          >
            {guardandoDetallesBD ? (
              <CircularProgress size={16} sx={{ color: '#ffffff' }} />
            ) : (
              'Sí'
            )}
          </Button>

          <Button
            variant="outlined"
            size="small"
            disabled={guardandoDetallesBD}
            onClick={() => setConfirmarAgregarProducto(false)}
            sx={{
              minWidth: 90,
              textTransform: 'none',
              fontWeight: 700
            }}
          >
            No
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={productoAgregadoExito}
        onClose={() => setProductoAgregadoExito(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '8px',
            overflow: 'hidden'
          }
        }}
      >
        <DialogTitle
          sx={{
            backgroundColor: '#2e7d32',
            color: '#ffffff',
            fontSize: '15px',
            fontWeight: 700,
            py: 1.25,
            px: 2
          }}
        >
          Producto agregado
        </DialogTitle>

        <DialogContent
          sx={{
            pt: '30px !important',
            pb: 2,
            px: 3,
            textAlign: 'center'
          }}
        >
          <Box
            sx={{
              width: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: 34
            }}
          >
            <Typography
              sx={{
                fontSize: '13px',
                color: '#222222',
                fontWeight: 500,
                lineHeight: 1.6,
                textAlign: 'center'
              }}
            >
              Producto agregado con éxito.
            </Typography>
          </Box>
        </DialogContent>

        <DialogActions
          sx={{
            px: 2,
            pb: 1.5,
            pt: 1,
            justifyContent: 'flex-end'
          }}
        >
          <Button
            variant="contained"
            size="small"
            onClick={() => setProductoAgregadoExito(false)}
            sx={{
              minWidth: 85,
              backgroundColor: '#2e7d32',
              textTransform: 'none',
              fontWeight: 700,
              '&:hover': {
                backgroundColor: '#256428'
              }
            }}
          >
            Aceptar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={modalProducto}
        onClose={() => setModalProducto(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#e0e0e0',
            color: '#000080',
            fontWeight: 700,
            borderBottom: '1px solid #b8b8b8'
          }}
        >
          Buscar Producto
          <IconButton
            size="small"
            onClick={() => setModalProducto(false)}
          >
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ pt: 2 }}>
          <TextField
            autoFocus
            fullWidth
            size="small"
            value={busquedaProducto}
            onChange={(e) => setBusquedaProducto(e.target.value)}
            placeholder="Código o descripción del producto"
            sx={{ mb: 1.5 }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  {cargandoProductos ? (
                    <CircularProgress size={18} />
                  ) : (
                    <Search sx={{ color: '#0070d2', fontSize: 20 }} />
                  )}
                </InputAdornment>
              )
            }}
          />

          <TableContainer
            component={Paper}
            variant="outlined"
            sx={{
              maxHeight: 420,
              borderColor: '#b8b8b8',
              overflowX: 'auto'
            }}
          >
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow
                  sx={{
                    '& th': {
                      backgroundColor: '#f0f0f0',
                      fontWeight: 700,
                      fontSize: '10px'
                    }
                  }}
                >
                  <TableCell>Código</TableCell>
                  <TableCell>Descripción</TableCell>
                  <TableCell align="center">Stock</TableCell>
                  <TableCell align="right">Neto</TableCell>
                  <TableCell align="center">Seleccionar</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {!cargandoProductos && productos.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      align="center"
                      sx={{ py: 3 }}
                    >
                      No se encontraron productos.
                    </TableCell>
                  </TableRow>
                )}

                {productos.slice(0, 100).map((producto, index) => (
                  <TableRow
                    key={`${producto.codigo}-${index}`}
                    hover
                  >
                    <TableCell>{producto.codigo}</TableCell>
                    <TableCell>{producto.descripcion}</TableCell>
                    <TableCell align="center">
                      {producto.stock}
                    </TableCell>
                    <TableCell align="right">
                      {Math.round(
                        producto.neto || 0
                      ).toLocaleString('es-CL')}
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() =>
                          seleccionarProducto(producto)
                        }
                        sx={{
                          ...botonOrigenSx,
                          minHeight: 24,
                          py: 0
                        }}
                      >
                        Elegir
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>

        <DialogActions
          sx={{
            backgroundColor: '#f0f0f0',
            borderTop: '1px solid #b8b8b8'
          }}
        >
          <Button
            onClick={() => setModalProducto(false)}
            sx={botonOrigenSx}
          >
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
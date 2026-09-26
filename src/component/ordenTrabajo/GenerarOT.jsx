import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Box,
  Checkbox,
  FormControlLabel,
  TextField,
  Button,
  Typography,
  Tabs,
  Tab,
  MenuItem,
  Select,
  IconButton,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
  CircularProgress,
  InputAdornment,
  Autocomplete,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  TableContainer,
  Chip
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import BlockIcon from '@mui/icons-material/Block';
import PrintIcon from '@mui/icons-material/Print';
import CloseIcon from '@mui/icons-material/Close';

import OrdenTrabajoServicio from '../../apiservicios/servicio.ordentrabajo';
import DTODetalleOrden from "../../dto/DTODetalleOrden.js";
import DTOImagenOrden from "../../dto/DTOImagenOrden.js";

const BASE_API_URL = process.env.REACT_APP_API_URL || 'http://localhost/apichess';

const listaOpcionesOT = ['DESPACHADO', 'EMPAQUE', 'ENTREGADO', 'LABORATORIO'];
const opcionesVendedores = ['PAUL CELERY', 'VALENZUELA G. XIMENA', 'RAUL CASTILLO'];

const listadoBodegasInicial = [
  { id: 1, nombre: 'Bodega Central' },
  { id: 2, nombre: 'Bodega Norte' },
  { id: 3, nombre: 'Bodega Repuestos' }
];

const detallesTemporalesPorOT = new Map();
const DETALLES_ELIMINADOS_STORAGE_KEY = 'OT_DETALLES_ELIMINADOS_VISUAL_V1';

// Claves utilizadas para saber si una O.T. fue cargada desde Cartola.
const CLAVE_OT_COMPARTIDA = 'cartolaOT_orden_compartida';
const CLAVE_BLOQUEO_CARTOLA_GENERAR = 'generarOT_bloqueo_cartola';

/*
  Cada carga completa de la página obtiene un token distinto.
  - Si Cartola carga una O.T. dentro de esta misma página, el token coincide
    y Generar OT mantiene Limpiar/Grabar bloqueados.
  - Si el usuario actualiza el navegador, window se recrea, cambia el token
    y el bloqueo anterior deja de ser válido automáticamente.
*/
const obtenerTokenDocumentoOT = () => {
  if (typeof window === 'undefined') return '';

  if (!window.__OT_DOCUMENT_TOKEN__) {
    window.__OT_DOCUMENT_TOKEN__ = `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}`;
  }

  return window.__OT_DOCUMENT_TOKEN__;
};

const guardarBloqueoCartolaGenerar = (idOrden) => {
  const id = String(idOrden || '').trim();
  if (!id || typeof window === 'undefined') return;

  try {
    sessionStorage.setItem(
      CLAVE_BLOQUEO_CARTOLA_GENERAR,
      JSON.stringify({
        idOrden: id,
        tokenDocumento: obtenerTokenDocumentoOT(),
        creadoEn: Date.now()
      })
    );
  } catch (_) {}
};

const limpiarBloqueoCartolaGenerar = (limpiarCompartida = false) => {
  if (typeof window === 'undefined') return;

  try {
    sessionStorage.removeItem(CLAVE_BLOQUEO_CARTOLA_GENERAR);

    if (limpiarCompartida) {
      sessionStorage.removeItem(CLAVE_OT_COMPARTIDA);
    }
  } catch (_) {}
};

const leerDetallesEliminados = () => {
  try {
    const raw = localStorage.getItem(DETALLES_ELIMINADOS_STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : {};
    return data && typeof data === 'object' ? data : {};
  } catch (_) {
    return {};
  }
};

const guardarDetalleEliminado = (idOrden, idDetalle) => {
  const orden = String(idOrden || '').trim();
  const detalle = String(idDetalle || '').trim();

  if (!orden || !detalle) return;

  const data = leerDetallesEliminados();
  const actuales = Array.isArray(data[orden]) ? data[orden] : [];

  if (!actuales.includes(detalle)) {
    data[orden] = [...actuales, detalle];

    try {
      localStorage.setItem(
        DETALLES_ELIMINADOS_STORAGE_KEY,
        JSON.stringify(data)
      );
    } catch (_) {}
  }
};

const obtenerDetallesEliminadosOT = (idOrden) => {
  const orden = String(idOrden || '').trim();
  if (!orden) return new Set();

  const data = leerDetallesEliminados();
  const ids = Array.isArray(data[orden]) ? data[orden] : [];

  return new Set(ids.map(id => String(id)));
};

const obtenerDetallesTemporales = (idOrden) => {
  const id = String(idOrden || '').trim();

  if (!id || !detallesTemporalesPorOT.has(id)) return [];

  const guardados = detallesTemporalesPorOT.get(id);
  return Array.isArray(guardados) ? guardados : [];
};

// Devuelve el primer identificador positivo válido.
// En esta BD algunos registros tienen IdOrden = 0 y el identificador real está en Id.
const obtenerIdPositivo = (...valores) => {
  for (const valor of valores) {
    const numero = Number(String(valor ?? '').trim());

    if (Number.isFinite(numero) && numero > 0) {
      return numero;
    }
  }

  return 0;
};

export default function GenerarOT({ valores = {}, handleChange = () => { }, limpiarValores = () => { } }) {
  const [listadobodega] = useState(listadoBodegasInicial);
  const [, setListadoSucursales] = useState([]);
  const [subTab, setSubTab] = useState(0);

  const [detalles, setDetalles] = useState(() =>
    obtenerDetallesTemporales(valores.IdOrden || valores.Idorden)
  );

  const ultimaOTAutocargadaRef = useRef('');
  const seleccionarElementoRef = useRef(null);

  // ID real del registro en dbo.OrdenTrabajo (columna Id).
  // Se conserva separado porque IdOrden puede venir en 0 desde la API.
  const idRegistroBDRef = useRef('');

  const idRegistroBDActual = obtenerIdPositivo(
    idRegistroBDRef.current,
    valores.IdRegistroBD,
    valores.Id,
    valores.id,
    valores.IdOrden,
    valores.Idorden
  );

  const [imagenes] = useState([]);
  const [confirmarGuardar, setConfirmarGuardar] = useState(false);

  // Si la O.T. viene desde Cartola, Generar OT queda solo para consulta.
  const [soloLecturaCartola, setSoloLecturaCartola] = useState(false);

  const [detalleAEliminar, setDetalleAEliminar] = useState(null);
  const [modalAbono, setModalAbono] = useState(false);
  const [montoAbono, setMontoAbono] = useState('');
  const [errorAbono, setErrorAbono] = useState('');
  const [confirmarAccionAbono, setConfirmarAccionAbono] = useState(false);
  const [confirmarLimpiarAbono, setConfirmarLimpiarAbono] = useState(false);
  const [guardandoAbono, setGuardandoAbono] = useState(false);

  // Corrección manual del TOTAL abonado ya registrado.
  const [modalActualizarAbono, setModalActualizarAbono] = useState(false);
  const [montoActualizarAbono, setMontoActualizarAbono] = useState('');
  const [errorActualizarAbono, setErrorActualizarAbono] = useState('');

  // Confirmación especial cuando se intenta dejar el abono en $0.
  // Se muestra al presionar "Aplicar" antes de modificar el valor en pantalla.
  const [confirmarEliminarAbono, setConfirmarEliminarAbono] = useState(false);

  // Indica que AbonadoOT cambió en pantalla, pero todavía no fue guardado en BD.
  const [abonoPendienteGuardar, setAbonoPendienteGuardar] = useState(false);

  // Guarda el valor exacto pendiente de persistir.
  // IMPORTANTE: null = no hay cambio pendiente.
  // 0 = sí existe un cambio pendiente y debe guardarse 0 en la BD.
  const [valorAbonoPendiente, setValorAbonoPendiente] = useState(null);

  // Confirmación antes de guardar el abono en la BD.
  const [confirmarGuardarAbono, setConfirmarGuardarAbono] = useState(false);

  // Alerta visual después de guardar correctamente el abono.
  const [alertaAbonoGuardado, setAlertaAbonoGuardado] = useState({
    abierto: false,
    total: 0
  });

  const [errores, setErrores] = useState({});

  const [modalBuscar, setModalBuscar] = useState({ abierto: false, tipo: '', titulo: '' });
  const [filtroTexto, setFiltroTexto] = useState('');
  const [datosBusqueda, setDatosBusqueda] = useState([]);
  const [cargandoModal, setCargandoModal] = useState(false);

  useEffect(() => {
    const idOrden = String(valores.IdOrden || valores.Idorden || '').trim();

    if (!idOrden) return;

    detallesTemporalesPorOT.set(idOrden, detalles);

    const snapshotDetalles = {
      idOrden,
      fecha: Date.now(),
      detalles: detalles.map((detalle) => ({
        IdDetalle: detalle.IdDetalle ?? detalle.idDetalle ?? '',
        Idorden: detalle.Idorden ?? detalle.IdOrden ?? idOrden,
        IdTipo: detalle.IdTipo ?? detalle.idTipo ?? '2',
        Codigo: detalle.Codigo ?? detalle.codigo ?? '',
        Descripcion:
          detalle.Descripcion ??
          detalle.descripcion ??
          detalle.producto ??
          '',
        Cantidad: detalle.Cantidad ?? detalle.cantidad ?? 0,
        ValorUnitario:
          detalle.ValorUnitario ??
          detalle.valorUnitario ??
          detalle.neto ??
          0,
        DescuentoPorcentaje:
          detalle.DescuentoPorcentaje ??
          detalle.descuentoPorcentaje ??
          detalle.dsctoPorc ??
          0,
        SubTotal:
          detalle.SubTotal ??
          detalle.subTotal ??
          detalle.subtotal ??
          detalle.totalNeto ??
          0,
        ComisionPorcentaje:
          detalle.ComisionPorcentaje ??
          detalle.comisionPorcentaje ??
          0,
        TotalComision:
          detalle.TotalComision ??
          detalle.totalComision ??
          detalle.comision ??
          0
      }))
    };

    try {
      sessionStorage.setItem(
        `ot_detalles_generar_${idOrden}`,
        JSON.stringify(snapshotDetalles)
      );
    } catch (_) {}

    window.dispatchEvent(
      new CustomEvent('ot:detalles-generar-actualizados', {
        detail: snapshotDetalles
      })
    );
  }, [detalles, valores.IdOrden, valores.Idorden]);

  useEffect(() => {
    const idOrdenActual = String(
      valores.IdOrden || valores.Idorden || ''
    ).trim();

    if (!idOrdenActual) {
      return undefined;
    }

    const clavePendientes = `ot_detalles_actualizados_${idOrdenActual}`;

    const aplicarActualizacion = (payload) => {
      const idOrdenEvento = String(payload?.idOrden || '').trim();

      if (!idOrdenEvento || idOrdenEvento !== idOrdenActual) {
        return;
      }

      const nuevosDetalles = Array.isArray(payload?.detalles)
        ? payload.detalles
        : [];

      if (!nuevosDetalles.length) {
        return;
      }

      setDetalles((prev) => {
        const timestamp = Date.now();

        const convertidos = nuevosDetalles.map((detalle, index) => ({
          IdDetalle: String(
            detalle.IdDetalle ||
            detalle.idDetalle ||
            `presupuesto-${timestamp}-${index}`
          ),
          Idorden: idOrdenActual,
          IdTipo: String(detalle.IdTipo || detalle.idTipo || '2'),
          Codigo: String(
            detalle.Codigo ||
            detalle.codigo ||
            ''
          ),
          Descripcion: String(
            detalle.Descripcion ||
            detalle.descripcion ||
            detalle.producto ||
            ''
          ),
          Cantidad: String(
            detalle.Cantidad ??
            detalle.cantidad ??
            0
          ),
          ValorUnitario: String(
            detalle.ValorUnitario ??
            detalle.valorUnitario ??
            detalle.neto ??
            0
          ),
          DescuentoPorcentaje: String(
            detalle.DescuentoPorcentaje ??
            detalle.descuentoPorcentaje ??
            0
          ),
          SubTotal: String(
            detalle.SubTotal ??
            detalle.subTotal ??
            detalle.subtotal ??
            0
          ),
          ComisionPorcentaje: String(
            detalle.ComisionPorcentaje ??
            detalle.comisionPorcentaje ??
            0
          ),
          TotalComision: String(
            detalle.TotalComision ??
            detalle.totalComision ??
            0
          )
        }));

        const actualizados = [...prev, ...convertidos];

        detallesTemporalesPorOT.set(
          idOrdenActual,
          actualizados
        );

        return actualizados;
      });

      try {
        sessionStorage.removeItem(clavePendientes);
      } catch (_) {}
    };

    const manejarActualizacion = (event) => {
      aplicarActualizacion(event.detail);
    };

    window.addEventListener(
      'ot:detalles-actualizados',
      manejarActualizacion
    );

    try {
      const guardado = sessionStorage.getItem(clavePendientes);

      if (guardado) {
        aplicarActualizacion(JSON.parse(guardado));
      }
    } catch (error) {
      console.error(
        '[OT] No fue posible recuperar la actualización de productos:',
        error
      );
    }

    return () => {
      window.removeEventListener(
        'ot:detalles-actualizados',
        manejarActualizacion
      );
    };
  }, [valores.IdOrden, valores.Idorden]);

  const obtenerFechaYHoraActuales = useCallback(() => {
    const ahora = new Date();
    const anio = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const dia = String(ahora.getDate()).padStart(2, '0');
    const horas = String(ahora.getHours()).padStart(2, '0');
    const minutos = String(ahora.getMinutes()).padStart(2, '0');

    return {
      fechaActual: `${anio}-${mes}-${dia}`,
      horaActual: `${horas}:${minutos}`
    };
  }, []);

  useEffect(() => {

    if (valores.IdOrden) return;

    const { fechaActual, horaActual } = obtenerFechaYHoraActuales();

    if (!valores.FechaIngreso) {
      handleChange('FechaIngreso', fechaActual);
    }

    if (!valores.HoraIngreso) {
      handleChange('HoraIngreso', horaActual);
    }
  }, [
    valores.IdOrden,
    valores.FechaIngreso,
    valores.HoraIngreso,
    handleChange,
    obtenerFechaYHoraActuales
  ]);

  useEffect(() => {
    let mounted = true;
    const fetchSucursales = async () => {
      try {
        if (OrdenTrabajoServicio && typeof OrdenTrabajoServicio.obtenerSucursales === 'function') {
          const { data } = await OrdenTrabajoServicio.obtenerSucursales();
          if (mounted) setListadoSucursales(data || []);
        } else {
          console.warn('obtenerSucursales no se encuentra en OrdenTrabajoServicio');
        }
      } catch (e) {
        console.error('Error al cargar sucursales:', e);
        if (mounted) setListadoSucursales([]);
      }
    };
    fetchSucursales();
    return () => { mounted = false; };
  }, []);

  const valorDescuentoPorc = valores.DescuentoPorc || '0';

  const totalesCalculados = useMemo(() => {
    const netoAcumulado = detalles.reduce((acumulado, item) => acumulado + (parseFloat(item.SubTotal) || 0), 0);
    const descPorcGlobal = parseFloat(valorDescuentoPorc) || 0;
    const descuentoDinero = Math.round(netoAcumulado * (descPorcGlobal / 100));
    const netoConDescuento = netoAcumulado - descuentoDinero;
    const iva = Math.round(netoConDescuento * 0.19);
    const totalOT = netoConDescuento + iva;

    return {
      SubTotal: Math.round(netoAcumulado).toString(),
      TotalNeto: Math.round(netoConDescuento).toString(),
      DescuentoS: descuentoDinero.toString(),
      TotalIVA: iva.toString(),
      TotalOT: Math.round(totalOT).toString()
    };
  }, [detalles, valorDescuentoPorc]);

  useEffect(() => {
    Object.entries(totalesCalculados).forEach(([key, val]) => {
      if (valores[key] !== val) {
        handleChange(key, val);
      }
    });
  }, [totalesCalculados, handleChange, valores]);

  const handleImprimir = async () => {
    try {
      const response = await fetch(`${BASE_API_URL}/clientes.php/guardarImpresion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(valores),
      });

      if (!response.ok) throw new Error('Error en el servidor al procesar la información.');
      window.print();
    } catch (error) {
      console.error('Error al enviar e imprimir:', error);
      alert('Ocurrió un error al enviar la información.');
    }
  };

  const normalizarTextoBusqueda = (valor) =>
    String(valor ?? '')
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .toUpperCase();

  const ejecutarConsultaAPI = useCallback(async (tipo, textoBusqueda = '', signal) => {
    setCargandoModal(true);
    try {
      let datos = [];
      if (tipo === 'cliente') {
        const resp = await fetch(`${BASE_API_URL}/clientes.php/getAllClientes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idsucursal: '1', busqueda: textoBusqueda, id: 0 }),
          signal
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const jsonResp = await resp.json();
        const items = Array.isArray(jsonResp) ? jsonResp : (jsonResp.data || Object.values(jsonResp) || []);

        datos = items.map((item, index) => {
          const nombreCliente =
            item.nombre ||
            item.Nombre ||
            item.ClienteNombre ||
            item.NombreCliente ||
            item.RazonSocial ||
            item.razonSocial ||
            item.razonsocial ||
            '';

          const rutCliente =
            item.RUT ||
            item.Rut ||
            item.rut ||
            item.RUTCliente ||
            item.RutCliente ||
            item.rutCliente ||
            item.ClienteRUT ||
            item.ClienteRut ||
            item.clienteRut ||
            item.CodigoRut ||
            item.codigoRut ||
            item.RutEmpresa ||
            item.rutEmpresa ||
            item.codigo ||
            item.Codigo ||
            '';

          const idCliente =
            item.IDCliente ||
            item.IdCliente ||
            item.idCliente ||
            item.Id ||
            item.id ||
            index + 1;

          return {
            ...item,
            id: idCliente,
            nombre: nombreCliente,

            // RUT normalizado para que siempre se muestre en el modal.
            rut: String(rutCliente || '').trim(),
            Rut: String(rutCliente || '').trim(),
            RUT: String(rutCliente || '').trim(),

            // Mantengo codigo para no romper la selección existente.
            codigo: String(rutCliente || '').trim(),
            Codigo: String(rutCliente || '').trim(),

            Descripcion:
              item.Descripcion ||
              item.descripcion ||
              item.Direccion ||
              item.direccion ||
              '',

            sucursal:
              item.sucursal ||
              item.Sucursal ||
              item.IdSucursal ||
              item.idSucursal ||
              ''
          };
        });
      } else if (tipo === 'producto') {
        const resp = await fetch(`${BASE_API_URL}/productos.php/getAllProductos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ busqueda: textoBusqueda, idsucursal: '1' }),
          signal
        });

        if (!resp.ok) throw new Error(`Error HTTP: ${resp.status}`);
        const json = await resp.json();

        let rawItems = [];
        if (Array.isArray(json)) {
          rawItems = json;
        } else if (json && typeof json === 'object') {
          rawItems = json.data || json.productos || json.listado || json.result || json.items || Object.values(json) || [];
        }

        if (!Array.isArray(rawItems)) rawItems = [];

        datos = rawItems.map((item, index) => {
          const idProd = item.IdProducto || item.idProducto || item.Id || item.id || (index + 1);
          const codigoProd = item.Codigo || item.codigo || item.CodProducto || item.SKU || `${idProd}`;
          const descProd = item.Descripcion || item.descripcion || item.Nombre || item.nombre || `Producto ${idProd}`;

          const netoVal = parseFloat(
            item.Neto ?? item.neto ?? item.PrecioNeto ?? item.ValorNeto ?? item.Precio ?? item.precio ?? item.ValorUnitario ?? 0
          );

          const stockVal = parseInt(item.Stock ?? item.stock ?? item.Cantidad ?? 0, 10);

          return {
            ...item,
            id: idProd,
            codigo: codigoProd,
            Codigo: codigoProd,
            nombre: descProd,
            descripcion: descProd,
            Descripcion: descProd,
            stock: stockVal,
            Stock: stockVal,
            neto: netoVal,
            Neto: netoVal
          };
        });
      } else if (tipo === 'productosBD') {
        const urlAPI = 'http://localhost/Api/api/OrdenTrabajo/Leer/0';

        const [respOT, respClientes] = await Promise.all([
          fetch(urlAPI, {
            method: 'GET',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json'
            },
            signal
          }),
          fetch(`${BASE_API_URL}/clientes.php/getAllClientes`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              idsucursal: '1',
              busqueda: '',
              id: 0
            }),
            signal
          })
        ]);

        if (!respOT.ok) {
          throw new Error(`HTTP ${respOT.status} al consultar O.T.`);
        }

        const jsonOT = await respOT.json();

        const items = Array.isArray(jsonOT)
          ? jsonOT
          : (
              jsonOT?.data ||
              jsonOT?.listado ||
              jsonOT?.result ||
              Object.values(jsonOT || {}) ||
              []
            );

        let clientes = [];

        if (respClientes.ok) {
          const jsonClientes = await respClientes.json();

          clientes = Array.isArray(jsonClientes)
            ? jsonClientes
            : (
                jsonClientes?.data ||
                Object.values(jsonClientes || {}) ||
                []
              );
        }

        const clientesPorNombre = new Map();

        clientes.forEach((clienteItem) => {
          const nombreCliente =
            clienteItem.nombre ||
            clienteItem.Nombre ||
            clienteItem.ClienteNombre ||
            clienteItem.RazonSocial ||
            clienteItem.Razon_Social ||
            '';

          const rutCliente =
            clienteItem.RUT ||
            clienteItem.Rut ||
            clienteItem.rut ||
            clienteItem.codigo ||
            clienteItem.Codigo ||
            '';

          const claveNombre =
            normalizarTextoBusqueda(nombreCliente);

          if (claveNombre && rutCliente) {
            clientesPorNombre.set(
              claveNombre,
              String(rutCliente).trim()
            );
          }
        });

        const datosOT = items.map((item, index) => {
          const idOt =
            item.IdOrden ||
            item.idOrden ||
            item.Id ||
            item.id ||
            (index + 1);

          const cliente =
            item.NombreCliente ||
            item.Cliente ||
            item.RazonSocial ||
            '';

          const detalle =
            item.Observaciones ||
            item.Descripcion ||
            item.Detalle ||
            item.EstadoOT ||
            '';

          let descripcionFormateada =
            [cliente, detalle]
              .filter(Boolean)
              .join(' - ');

          if (!descripcionFormateada) {
            descripcionFormateada =
              `Orden de Trabajo N° ${idOt}`;
          }

          const rutDirecto =
            item.RUT ||
            item.Rut ||
            item.rut ||
            item.RUTCliente ||
            item.RutCliente ||
            item.rutCliente ||
            item.ClienteRUT ||
            item.ClienteRut ||
            item.Rut_Cliente ||
            '';

          const rutCliente =
            String(
              rutDirecto ||
              clientesPorNombre.get(
                normalizarTextoBusqueda(cliente)
              ) ||
              ''
            ).trim();

          const valorMonto = parseFloat(
            item.TotalOT ??
            item.TotalNeto ??
            item.SubTotal ??
            item.Monto ??
            item.Neto ??
            0
          );

          const stockVal = parseInt(
            item.Cantidad ??
            item.Stock ??
            1,
            10
          );

          return {
            ...item,
            IdRegistroBD: obtenerIdPositivo(
              item.Id,
              item.id,
              idOt
            ),
            id: idOt,

            // El código OT se mantiene para no romper la selección
            // ni la carga posterior de la orden.
            codigo: `OT-${idOt}`,
            Codigo: `OT-${idOt}`,

            // RUT separado para mostrarlo en la ventana Buscar.
            rut: rutCliente,
            Rut: rutCliente,
            RUT: rutCliente,

            nombre: descripcionFormateada,
            descripcion: descripcionFormateada,
            Descripcion: descripcionFormateada,

            stock: stockVal,
            Stock: stockVal,

            neto: valorMonto,
            Neto: valorMonto
          };
        });

        const termino =
          normalizarTextoBusqueda(textoBusqueda);

        datos = termino
          ? datosOT.filter((item) => {
              const valores = [
                item.rut,
                item.RUT,
                item.codigo,
                item.Codigo,
                item.nombre,
                item.descripcion,
                item.NombreCliente,
                item.Cliente,
                item.IdOrden,
                item.id
              ];

              return valores.some((valor) =>
                normalizarTextoBusqueda(valor)
                  .includes(termino)
              );
            })
          : datosOT;
      }
      setDatosBusqueda(datos);
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error al conectar con la API:', error);
        setDatosBusqueda([]);
      }
    } finally {
      setCargandoModal(false);
    }
  }, []);

  const handleAbrirBuscador = (tipo, titulo) => {
    /*
      Si el usuario inicia una búsqueda de O.T. desde Generar OT,
      deja de estar trabajando con la O.T. protegida que vino desde Cartola.
      Desde este momento Limpiar y Grabar vuelven a estar disponibles.
    */
    if (tipo === 'productosBD') {
      setSoloLecturaCartola(false);
      limpiarBloqueoCartolaGenerar(true);
    }

    setFiltroTexto('');
    setDatosBusqueda([]);
    setModalBuscar({ abierto: true, tipo, titulo });
  };

  useEffect(() => {
    if (!modalBuscar.abierto) return;

    const controller = new AbortController();
    const timer = setTimeout(() => {
      ejecutarConsultaAPI(modalBuscar.tipo, filtroTexto, controller.signal);
    }, 400);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [modalBuscar.abierto, modalBuscar.tipo, filtroTexto, ejecutarConsultaAPI]);

  const datosVisibles = useMemo(() => {
    return datosBusqueda.slice(0, 50);
  }, [datosBusqueda]);

  const handleSeleccionarElemento = async (
    item,
    tipoForzado = null
  ) => {
    const tipoSeleccion =
      tipoForzado || modalBuscar.tipo;

    /*
      Si la O.T. se está eligiendo directamente desde el buscador
      de Generar OT, salimos del modo consulta Cartola.
    */
    if (
      tipoForzado === null &&
      tipoSeleccion === 'productosBD'
    ) {
      setSoloLecturaCartola(false);
      limpiarBloqueoCartolaGenerar(true);
    }

    const normalizarClave = (clave) =>
      String(clave || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]/g, '')
        .toLowerCase();

    const tieneValor = (valor) =>
      valor !== undefined &&
      valor !== null &&
      String(valor).trim() !== '';

    const formatearFechaInput = (valor) => {
      if (!tieneValor(valor)) return '';

      const texto = String(valor).trim();

      let match = texto.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
      if (match) {
        return `${match[1]}-${String(match[2]).padStart(2, '0')}-${String(match[3]).padStart(2, '0')}`;
      }

      match = texto.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
      if (match) {
        return `${match[3]}-${String(match[2]).padStart(2, '0')}-${String(match[1]).padStart(2, '0')}`;
      }

      const fecha = new Date(texto);
      if (!Number.isNaN(fecha.getTime())) {
        return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
      }

      return '';
    };

    const formatearHoraInput = (valor) => {
      if (!tieneValor(valor)) return '';

      const texto = String(valor).trim();

      let match = texto.match(/(?:T|\s|^)(\d{1,2}):(\d{2})(?::\d{2})?/);
      if (match) {
        return `${String(match[1]).padStart(2, '0')}:${match[2]}`;
      }

      return '';
    };

    const buscarValorProfundo = (raiz, aliases = []) => {
      const aliasNormalizados = aliases.map(normalizarClave);
      const visitados = new WeakSet();
      let valorEncontrado = '';

      const recorrer = (obj) => {
        if (!obj || valorEncontrado !== '') return;
        if (typeof obj !== 'object') return;

        if (visitados.has(obj)) return;
        visitados.add(obj);

        if (Array.isArray(obj)) {
          for (const elemento of obj) {
            recorrer(elemento);
            if (valorEncontrado !== '') return;
          }
          return;
        }

        const entradas = Object.entries(obj);

        for (const [clave, valor] of entradas) {
          const claveNormalizada = normalizarClave(clave);

          if (
            aliasNormalizados.includes(claveNormalizada) &&
            tieneValor(valor) &&
            (typeof valor !== 'object')
          ) {
            valorEncontrado = valor;
            return;
          }
        }

        for (const [, valor] of entradas) {
          if (valor && typeof valor === 'object') {
            recorrer(valor);
            if (valorEncontrado !== '') return;
          }
        }
      };

      recorrer(raiz);
      return valorEncontrado;
    };

    const buscarObjetoProfundo = (raiz, aliases = []) => {
      const aliasNormalizados = aliases.map(normalizarClave);
      const visitados = new WeakSet();

      const recorrer = (obj) => {
        if (!obj || typeof obj !== 'object') return null;
        if (visitados.has(obj)) return null;
        visitados.add(obj);

        if (Array.isArray(obj)) {
          for (const elemento of obj) {
            const resultado = recorrer(elemento);
            if (resultado) return resultado;
          }
          return null;
        }

        for (const [clave, valor] of Object.entries(obj)) {
          if (
            aliasNormalizados.includes(normalizarClave(clave)) &&
            valor &&
            typeof valor === 'object'
          ) {
            return valor;
          }
        }

        for (const [, valor] of Object.entries(obj)) {
          if (valor && typeof valor === 'object') {
            const resultado = recorrer(valor);
            if (resultado) return resultado;
          }
        }

        return null;
      };

      return recorrer(raiz);
    };

    const buscarArrayProfundo = (raiz, aliases = []) => {
      const aliasNormalizados = aliases.map(normalizarClave);
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
            aliasNormalizados.includes(normalizarClave(clave)) &&
            Array.isArray(valor)
          ) {
            resultado = valor;
            return;
          }
        }

        for (const [, valor] of Object.entries(obj)) {
          if (valor && typeof valor === 'object') {
            recorrer(valor);
            if (resultado.length > 0) return;
          }
        }
      };

      recorrer(raiz);
      return resultado;
    };

    const obtenerNumero = (...valores) => {
      for (const valor of valores) {
        if (!tieneValor(valor)) continue;

        if (typeof valor === 'number') return valor;

        const numero = Number(
          String(valor)
            .replace(/\$/g, '')
            .replace(/\./g, '')
            .replace(',', '.')
            .trim()
        );

        if (!Number.isNaN(numero)) return numero;
      }

      return 0;
    };

    const normalizarEstadoOT = (valor) => {
      if (!tieneValor(valor)) return 'MANTENIMIENTO';

      const texto = String(valor).trim();
      const clave = normalizarClave(texto);

      const estados = {
        '1': 'MANTENIMIENTO',
        '2': 'APROBADO',
        '3': 'RECHAZADO',
        mantenimiento: 'MANTENIMIENTO',
        aprobado: 'APROBADO',
        rechazado: 'RECHAZADO'
      };

      return estados[clave] || texto.toUpperCase();
    };

    const normalizarEncargadoOT = (valor) => {
      if (!tieneValor(valor)) return '';

      const texto = String(valor).trim();
      const opciones = ['DESPACHADO', 'EMPAQUE', 'ENTREGADO', 'LABORATORIO'];

      const encontrado = opciones.find(
        opcion => normalizarClave(opcion) === normalizarClave(texto)
      );

      return encontrado || texto.toUpperCase();
    };

    const normalizarVendedor = (valor) => {
      if (!tieneValor(valor)) return '';

      const texto = String(valor).trim();

      if (/^\d+$/.test(texto)) return '';

      const encontrado = opcionesVendedores.find(
        opcion => normalizarClave(opcion) === normalizarClave(texto)
      );

      return encontrado || '';
    };

    const buscarNombreVendedor = (raiz) => {
      const visitados = new WeakSet();

      const recorrer = (obj) => {
        if (!obj || typeof obj !== 'object') return '';

        if (visitados.has(obj)) return '';
        visitados.add(obj);

        if (Array.isArray(obj)) {
          for (const elemento of obj) {
            const encontrado = recorrer(elemento);
            if (encontrado) return encontrado;
          }
          return '';
        }

        for (const [clave, valor] of Object.entries(obj)) {
          const claveNormalizada = normalizarClave(clave);

          if (
            [
              'nombrevendedor',
              'vendedornombre',
              'nombredelvendedor'
            ].includes(claveNormalizada)
          ) {
            const vendedor = normalizarVendedor(valor);
            if (vendedor) return vendedor;
          }
        }

        for (const valor of Object.values(obj)) {
          if (
            valor !== null &&
            valor !== undefined &&
            typeof valor !== 'object'
          ) {
            const vendedor = normalizarVendedor(valor);
            if (vendedor) return vendedor;
          }
        }

        for (const valor of Object.values(obj)) {
          if (valor && typeof valor === 'object') {
            const encontrado = recorrer(valor);
            if (encontrado) return encontrado;
          }
        }

        return '';
      };

      return recorrer(raiz);
    };

    if (tipoSeleccion === 'cliente') {
      const clienteNombre =
        buscarValorProfundo(item, [
          'NombreCliente',
          'nombreCliente',
          'RazonSocial',
          'razonSocial',
          'ClienteNombre',
          'Nombre',
          'nombre',
          'Cliente',
          'cliente'
        ]) || '';

      if (clienteNombre) {
        handleChange('NombreCliente', String(clienteNombre));
        setErrores(prev => ({ ...prev, NombreCliente: false }));
      }

      const sucursal =
        buscarValorProfundo(item, [
          'IdSucursal',
          'idSucursal',
          'Sucursal',
          'sucursal'
        ]) || '1';

      handleChange('Sucursal', String(sucursal));

      const fechaIngreso = buscarValorProfundo(item, [
        'FechaIngreso',
        'fechaIngreso',
        'IngresoOT',
        'ingresoOT'
      ]);

      const fechaEntrega = buscarValorProfundo(item, [
        'FechaEntrega',
        'fechaEntrega',
        'FechaVencto',
        'fechaVencto'
      ]);

      const fechaRealEntrega = buscarValorProfundo(item, [
        'FechaRealEntrega',
        'fechaRealEntrega',
        'Fechainicio',
        'fechainicio'
      ]);

      const fechaCotizacion = buscarValorProfundo(item, [
        'FechaEntregaCotizacionAprox',
        'fechaEntregaCotizacionAprox',
        'FechaEntregaCotiz',
        'fechaEntregaCotiz'
      ]);

      if (fechaIngreso) handleChange('FechaIngreso', formatearFechaInput(fechaIngreso));
      if (fechaEntrega) handleChange('FechaEntrega', formatearFechaInput(fechaEntrega));
      if (fechaRealEntrega) handleChange('FechaRealEntrega', formatearFechaInput(fechaRealEntrega));
      if (fechaCotizacion) handleChange('FechaEntregaCotizacionAprox', formatearFechaInput(fechaCotizacion));

      const horaIngreso =
        buscarValorProfundo(item, ['HoraIngreso', 'horaIngreso']) ||
        formatearHoraInput(fechaIngreso);

      const horaEntrega =
        buscarValorProfundo(item, ['HoraEntrega', 'horaEntrega']) ||
        formatearHoraInput(fechaEntrega);

      const horaTermino = buscarValorProfundo(item, [
        'HoraTermino',
        'horaTermino',
        'HoraFin',
        'horaFin'
      ]);

      if (horaIngreso) handleChange('HoraIngreso', formatearHoraInput(horaIngreso));
      if (horaEntrega) handleChange('HoraEntrega', formatearHoraInput(horaEntrega));
      if (horaTermino) handleChange('HoraTermino', formatearHoraInput(horaTermino));

      const vendedor = buscarValorProfundo(item, [
        'Vendedor',
        'vendedor',
        'NombreVendedor',
        'nombreVendedor'
      ]);

      if (vendedor) handleChange('Vendedor', normalizarVendedor(vendedor));

      const encargado = buscarValorProfundo(item, [
        'EncargadoOT',
        'encargadoOT',
        'Encargado',
        'encargado',
        'NombreEncargadoOT',
        'nombreEncargadoOT'
      ]);

      if (encargado) handleChange('EncargadoOT', normalizarEncargadoOT(encargado));

      const estado = buscarValorProfundo(item, [
        'EstadoOT',
        'estadoOT',
        'Estado',
        'estado'
      ]);

      if (estado) handleChange('EstadoOT', normalizarEstadoOT(estado));

      const observaciones = buscarValorProfundo(item, [
        'Observaciones',
        'observaciones',
        'Descripcion',
        'descripcion'
      ]);

      if (observaciones) handleChange('Observaciones', String(observaciones));

      setModalBuscar({ abierto: false, tipo: '', titulo: '' });
      setDatosBusqueda([]);
      setFiltroTexto('');

    } else if (tipoSeleccion === 'productosBD') {
      /*
        IMPORTANTE:
        En dbo.OrdenTrabajo hay registros donde IdOrden = 0 y el ID real
        del registro es la columna Id (por ejemplo Id = 77). Por eso
        preferimos Id/IdRegistroBD antes que IdOrden.
      */
      const idRegistroBD = obtenerIdPositivo(
        item.IdRegistroBD,
        item.Id,
        item.id,
        item.IdOrden,
        item.idOrden,
        item.IDOrden
      );

      const idOrdenVisible = obtenerIdPositivo(
        item.IdOrden,
        item.idOrden,
        item.IDOrden,
        idRegistroBD
      );

      const idOrdenSeleccionada = idRegistroBD || idOrdenVisible;

      try {
        const idSeleccionado = String(idOrdenSeleccionada || '').trim();

        if (!idSeleccionado) {
          throw new Error('La Orden de Trabajo seleccionada no tiene un identificador válido.');
        }

        idRegistroBDRef.current = String(idRegistroBD || idOrdenSeleccionada);
        handleChange('IdRegistroBD', String(idRegistroBD || idOrdenSeleccionada));

        // Evita una segunda carga automática de la misma O.T.
        ultimaOTAutocargadaRef.current = idSeleccionado;

        setDetalles([]);
        setErrores({});

        [
          'NombreCliente',
          'Sucursal',
          'FechaIngreso',
          'HoraIngreso',
          'FechaEntrega',
          'HoraEntrega',
          'Bodega',
          'FechaRealEntrega',
          'HoraTermino',
          'FechaEntregaCotizacionAprox',
          'NroNotaVenta',
          'EncargadoOT',
          'Vendedor',
          'EstadoOT',
          'IngresoOrdenCompra',
          'UsuarioModifica',
          'Observaciones',
          'SubTotal',
          'TotalNeto',
          'DescuentoPorc',
          'TotalIVA',
          'DescuentoS',
          'TotalOT'
        ].forEach((campo) => handleChange(campo, ''));

        handleChange('IdOrden', idSeleccionado);
        setCargandoModal(true);

        const respOT = await fetch(
          `http://localhost/Api/api/OrdenTrabajo/Leer/${idOrdenSeleccionada}`,
          {
            method: 'GET',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json'
            }
          }
        );

        if (!respOT.ok) {
          throw new Error(
            `Error HTTP ${respOT.status} al cargar la Orden de Trabajo ${idOrdenSeleccionada}.`
          );
        }

        const jsonOT = await respOT.json();

        const respuestaCompleta = jsonOT;

        console.log(
          '[OT] Respuesta COMPLETA de Leer:',
          respuestaCompleta
        );

        const obtenerObjetosCabecera = (raiz) => {
          const objetos = [];
          const visitados = new WeakSet();

          const recorrer = (obj) => {
            if (!obj || typeof obj !== 'object') return;
            if (visitados.has(obj)) return;
            visitados.add(obj);

            if (Array.isArray(obj)) {
              obj.forEach(recorrer);
              return;
            }

            for (const [clave, valor] of Object.entries(obj)) {
              if (
                normalizarClave(clave) === 'cabecera' &&
                valor &&
                typeof valor === 'object'
              ) {
                if (Array.isArray(valor)) {
                  valor.forEach(v => {
                    if (v && typeof v === 'object') objetos.push(v);
                  });
                } else {
                  objetos.push(valor);
                }
              }

              if (valor && typeof valor === 'object') {
                recorrer(valor);
              }
            }
          };

          recorrer(raiz);
          return objetos;
        };

        const cabecerasOT = obtenerObjetosCabecera(respuestaCompleta);

        const obtenerCampoDesdeObjeto = (objeto, aliases) => {
          if (!objeto || typeof objeto !== 'object') return '';

          const aliasesNorm = aliases.map(normalizarClave);

          for (const [clave, valor] of Object.entries(objeto)) {
            if (
              aliasesNorm.includes(normalizarClave(clave)) &&
              tieneValor(valor) &&
              typeof valor !== 'object'
            ) {
              return valor;
            }
          }

          return '';
        };

        const obtenerCampoOT = (aliases) => {

          for (const cabecera of cabecerasOT) {
            const valor = obtenerCampoDesdeObjeto(cabecera, aliases);
            if (tieneValor(valor)) return valor;
          }

          const valorRespuesta = buscarValorProfundo(respuestaCompleta, aliases);
          if (tieneValor(valorRespuesta)) return valorRespuesta;

          const valorItem = buscarValorProfundo(item, aliases);
          if (tieneValor(valorItem)) return valorItem;

          return '';
        };

        console.log('[OT] Cabeceras encontradas:', cabecerasOT);

        handleChange(
          'IdOrden',
          String(
            obtenerCampoOT([
              'IdOrden',
              'idOrden',
              'IDOrden'
            ]) || idOrdenSeleccionada
          )
        );

        const cliente = obtenerCampoOT([
          'NombreCliente',
          'nombreCliente',
          'RazonSocial',
          'razonSocial',
          'ClienteNombre',
          'clienteNombre'
        ]);

        if (tieneValor(cliente)) {
          handleChange('NombreCliente', String(cliente));
        }

        const sucursal = obtenerCampoOT([
          'IdSucursal',
          'idSucursal',
          'Sucursal',
          'sucursal'
        ]);

        if (tieneValor(sucursal)) {
          handleChange('Sucursal', String(sucursal));
        }

        const fechaIngreso = obtenerCampoOT([
          'FechaIngreso',
          'fechaIngreso',
          'IngresoOT',
          'ingresoOT'
        ]);

        const fechaEntregaDirecta = obtenerCampoOT([
          'FechaEntrega',
          'fechaEntrega',
          'FechaVencto',
          'fechaVencto',
          'FechaVencimiento',
          'fechaVencimiento',
          'FechaVencimientoOT',
          'fechaVencimientoOT',
          'FechaEntregaOT',
          'fechaEntregaOT'
        ]);

        const fechaEntrega = fechaEntregaDirecta || obtenerCampoOT([
          'FechaRealEntrega',
          'fechaRealEntrega',
          'Fechainicio',
          'fechainicio',
          'FechaInicio',
          'fechaInicio',
          'FechaRealEntregaOT',
          'fechaRealEntregaOT'
        ]);

        const fechaRealEntrega = obtenerCampoOT([
          'FechaRealEntrega',
          'fechaRealEntrega',
          'Fechainicio',
          'fechainicio',
          'FechaInicio',
          'fechaInicio',
          'FechaRealEntregaOT',
          'fechaRealEntregaOT'
        ]);

        const fechaCotizacion = obtenerCampoOT([
          'FechaEntregaCotizacionAprox',
          'fechaEntregaCotizacionAprox',
          'FechaEntregaCotiz',
          'fechaEntregaCotiz',
          'FechaEntregaCotizacionApprox',
          'fechaEntregaCotizacionApprox'
        ]);

        if (tieneValor(fechaIngreso)) {
          const fecha = formatearFechaInput(fechaIngreso);
          if (fecha) handleChange('FechaIngreso', fecha);
        }

        if (tieneValor(fechaEntrega)) {
          const fecha = formatearFechaInput(fechaEntrega);
          if (fecha) handleChange('FechaEntrega', fecha);
        }

        if (tieneValor(fechaRealEntrega)) {
          const fecha = formatearFechaInput(fechaRealEntrega);
          if (fecha) handleChange('FechaRealEntrega', fecha);
        }

        if (tieneValor(fechaCotizacion)) {
          const fecha = formatearFechaInput(fechaCotizacion);
          if (fecha) handleChange('FechaEntregaCotizacionAprox', fecha);
        }

        const horaIngreso = obtenerCampoOT([
          'HoraIngreso',
          'horaIngreso'
        ]) || formatearHoraInput(fechaIngreso);

        const horaEntrega = obtenerCampoOT([
          'HoraEntrega',
          'horaEntrega'
        ]) || formatearHoraInput(fechaEntrega);

        const horaTermino = obtenerCampoOT([
          'HoraTermino',
          'horaTermino',
          'HoraFin',
          'horaFin',
          'HoraTerminoOT',
          'horaTerminoOT'
        ]);

        if (tieneValor(horaIngreso)) {
          const hora = formatearHoraInput(horaIngreso);
          if (hora) handleChange('HoraIngreso', hora);
        }

        if (tieneValor(horaEntrega)) {
          const hora = formatearHoraInput(horaEntrega);
          if (hora) handleChange('HoraEntrega', hora);
        }

        if (tieneValor(horaTermino)) {
          const hora = formatearHoraInput(horaTermino);
          if (hora) handleChange('HoraTermino', hora);
        }

        const notaVenta = obtenerCampoOT([
          'NroNotaVenta',
          'nroNotaVenta',
          'NotaVenta',
          'notaVenta',
          'NumeroNotaVenta',
          'numeroNotaVenta'
        ]);

        if (tieneValor(notaVenta)) {
          handleChange('NroNotaVenta', String(notaVenta));
        }

        const encargadoOT =
          normalizarEncargadoOT(
            obtenerCampoOT([
              'EncargadoOT',
              'encargadoOT'
            ])
          ) ||
          normalizarEncargadoOT(
            obtenerCampoOT([
              'NombreEncargadoOT',
              'nombreEncargadoOT'
            ])
          ) ||
          normalizarEncargadoOT(
            obtenerCampoOT([
              'Encargado',
              'encargado'
            ])
          ) ||
          normalizarEncargadoOT(
            obtenerCampoOT([
              'NombreEncargado',
              'nombreEncargado'
            ])
          );

        handleChange('EncargadoOT', encargadoOT || '');
        handleChange('NombreEncargado', encargadoOT || '');

        const vendedorNombreAPI = obtenerCampoOT([
          'NombreVendedor',
          'nombreVendedor',
          'VendedorNombre',
          'vendedorNombre',
          'NombreDelVendedor',
          'nombreDelVendedor'
        ]);

        const vendedorNombreItem =
          item?.NombreVendedor ??
          item?.nombreVendedor ??
          item?.VendedorNombre ??
          item?.vendedorNombre ??
          '';

        const vendedorCampoAPI = obtenerCampoOT([
          'Vendedor',
          'vendedor'
        ]);

        const vendedorOT =
          normalizarVendedor(vendedorNombreAPI) ||
          normalizarVendedor(vendedorNombreItem) ||
          buscarNombreVendedor(respuestaCompleta) ||
          buscarNombreVendedor(item) ||
          normalizarVendedor(vendedorCampoAPI);

        handleChange('Vendedor', vendedorOT);

        console.log('[OT] VENDEDOR RECUPERADO:', {
          NombreVendedorAPI: vendedorNombreAPI,
          NombreVendedorItem: vendedorNombreItem,
          VendedorAPI: vendedorCampoAPI,
          VendedorFinal: vendedorOT
        });

        if (!vendedorOT) {
          console.warn(
            `[OT ${idOrdenSeleccionada}] No llegó un NombreVendedor válido desde la API.`
          );
        }

        const estadoOT = obtenerCampoOT([
          'EstadoOT',
          'estadoOT',
          'Estado',
          'estado',
          'EstadoOTTexto',
          'estadoOTTexto'
        ]);

        if (tieneValor(estadoOT)) {
          const estadoNormalizado = normalizarEstadoOT(estadoOT);

          if (
            ['MANTENIMIENTO', 'APROBADO', 'RECHAZADO'].includes(
              estadoNormalizado
            )
          ) {
            handleChange('EstadoOT', estadoNormalizado);
          } else {
            console.warn(
              `[OT ${idOrdenSeleccionada}] Estado no reconocido:`,
              estadoOT
            );
          }
        }

        const ingresoOrdenCompra = obtenerCampoOT([
          'IngresoOrdenCompra',
          'ingresoOrdenCompra',
          'OrdenCompra',
          'ordenCompra'
        ]);

        if (tieneValor(ingresoOrdenCompra)) {
          handleChange(
            'IngresoOrdenCompra',
            String(ingresoOrdenCompra)
          );
        }

        const usuarioModifica = obtenerCampoOT([
          'UsuarioModifica',
          'usuarioModifica'
        ]);

        if (tieneValor(usuarioModifica)) {
          handleChange(
            'UsuarioModifica',
            String(usuarioModifica)
          );
        }

        const observaciones = obtenerCampoOT([
          'Observaciones',
          'observaciones'
        ]);

        if (tieneValor(observaciones)) {
          handleChange(
            'Observaciones',
            String(observaciones)
          );
        }

        const sinRebaja = obtenerCampoOT([
          'SinRebajaStock',
          'sinRebajaStock'
        ]);

        if (tieneValor(sinRebaja)) {
          handleChange(
            'SinRebajaStock',
            sinRebaja === true ||
            String(sinRebaja).toLowerCase() === 'true' ||
            String(sinRebaja) === '1'
          );
        }

        const nroCotizacion = obtenerCampoOT([
          'NroCotizacionAprobada',
          'nroCotizacionAprobada'
        ]);

        if (tieneValor(nroCotizacion)) {
          handleChange(
            'NroCotizacionAprobada',
            String(nroCotizacion)
          );
        }

        const usuarioCrea = obtenerCampoOT([
          'UsuarioCrea',
          'usuarioCrea'
        ]);

        if (tieneValor(usuarioCrea)) {
          handleChange(
            'UsuarioCrea',
            String(usuarioCrea)
          );
        }

        const abonadoOT = obtenerCampoOT([
          'AbonadoOT',
          'abonadoOT'
        ]);

        if (tieneValor(abonadoOT)) {
          handleChange(
            'AbonadoOT',
            String(abonadoOT)
          );
        }

        const bodegaAPI = obtenerCampoOT([
          'IdBodega',
          'idBodega',
          'Bodega',
          'bodega'
        ]);

        if (tieneValor(bodegaAPI)) {
          const bodegaEncontrada = listadobodega.find(
            b =>
              String(b.id) === String(bodegaAPI) ||
              normalizarClave(b.nombre) === normalizarClave(bodegaAPI)
          );

          if (bodegaEncontrada) {
            handleChange('Bodega', String(bodegaEncontrada.id));
          } else {
            handleChange('Bodega', String(bodegaAPI));
          }
        }

        let listaDetalles = buscarArrayProfundo(
          respuestaCompleta,
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

        if (!Array.isArray(listaDetalles) || listaDetalles.length === 0) {

          if (Array.isArray(respuestaCompleta)) {
            listaDetalles = respuestaCompleta;
          }
        }

        if (Array.isArray(listaDetalles) && listaDetalles.length > 0) {
          const eliminadosOT = obtenerDetallesEliminadosOT(
            idOrdenSeleccionada
          );

          const listaDetallesVisibles = listaDetalles.filter((d, index) => {
            const idDetalleReal = String(
              d.IdDetalle ??
              d.idDetalle ??
              d.Id ??
              d.id ??
              index + 1
            );

            return !eliminadosOT.has(idDetalleReal);
          });

          const detallesCargados = listaDetallesVisibles.map((d, index) => {
            const cantidad = obtenerNumero(
              d.Cantidad,
              d.cantidad,
              d.CantidadProducto,
              d.cantidadProducto,
              1
            );

            const valorUnitario = obtenerNumero(
              d.ValorUnitario,
              d.valorUnitario,
              d.Precio,
              d.precio,
              d.ValorNeto,
              d.valorNeto,
              d.Neto,
              d.neto,
              0
            );

            const descuento = obtenerNumero(
              d.DescuentoPorcentaje,
              d.descuentoPorcentaje,
              d.DescuentoPorc,
              d.descuentoPorc,
              d.Descuento,
              d.descuento,
              0
            );

            const subtotalAPI =
              d.SubTotal ??
              d.subTotal ??
              d.Subtotal ??
              d.subtotal ??
              d.TotalNeto ??
              d.totalNeto ??
              d.Total ??
              d.total;

            const subtotal =
              tieneValor(subtotalAPI)
                ? obtenerNumero(subtotalAPI)
                : Math.round(
                    cantidad *
                    valorUnitario *
                    (1 - descuento / 100)
                  );

            const tipo =
              d.IdTipo ??
              d.idTipo ??
              d.Tipo ??
              d.tipo ??
              d.TipoDetalle ??
              d.tipoDetalle ??
              '2';

            const idDetalleReal = String(
              d.IdDetalle ??
              d.idDetalle ??
              d.Id ??
              d.id ??
              index + 1
            );

            return {
              IdDetalle: idDetalleReal,
              IdDetalleBD: idDetalleReal,

              Idorden: String(
                d.Idorden ??
                d.IdOrden ??
                d.idOrden ??
                idOrdenSeleccionada
              ),

              IdTipo: String(tipo),

              Codigo: String(
                d.Codigo ??
                d.codigo ??
                d.CodigoProducto ??
                d.codigoProducto ??
                d.CodProducto ??
                d.codProducto ??
                '--'
              ),

              Descripcion: String(
                d.Descripcion ??
                d.descripcion ??
                d.NombreProducto ??
                d.nombreProducto ??
                d.Nombre ??
                d.nombre ??
                d.Detalle ??
                d.detalle ??
                ''
              ),

              Cantidad: String(cantidad),
              ValorUnitario: String(valorUnitario),
              DescuentoPorcentaje: String(descuento),
              SubTotal: String(subtotal),

              ComisionPorcentaje: String(
                obtenerNumero(
                  d.ComisionPorcentaje,
                  d.comisionPorcentaje,
                  d.ComisionPorc,
                  d.comisionPorc,
                  d.Comision,
                  d.comision,
                  0
                )
              ),

              TotalComision: String(
                obtenerNumero(
                  d.TotalComision,
                  d.totalComision,
                  d.ComisionTotal,
                  d.comisionTotal,
                  0
                )
              )
            };
          });

          setDetalles(detallesCargados);

          const subtotalCalculado = detallesCargados.reduce(
            (suma, d) => suma + (parseFloat(d.SubTotal) || 0),
            0
          );

          const descuentoPorcentaje = obtenerNumero(
            obtenerCampoOT([
              'DescuentoPorc',
              'descuentoPorc',
              'DescuentoPorcentaje',
              'descuentoPorcentaje'
            ]),
            0
          );

          const descuentoCalculado = Math.round(
            subtotalCalculado * (descuentoPorcentaje / 100)
          );

          const totalNetoCalculado =
            subtotalCalculado - descuentoCalculado;

          const ivaCalculado =
            Math.round(totalNetoCalculado * 0.19);

          const totalOTCalculado =
            totalNetoCalculado + ivaCalculado;

          handleChange(
            'SubTotal',
            String(Math.round(subtotalCalculado))
          );

          handleChange(
            'TotalNeto',
            String(Math.round(totalNetoCalculado))
          );

          handleChange(
            'DescuentoS',
            String(descuentoCalculado)
          );

          handleChange(
            'TotalIVA',
            String(ivaCalculado)
          );

          handleChange(
            'TotalOT',
            String(Math.round(totalOTCalculado))
          );
        } else {
          setDetalles([]);
        }

        console.log('[OT] Campos recuperados:', {
          IdOrden: idOrdenSeleccionada,
          NombreCliente: cliente,
          FechaIngreso: fechaIngreso,
          HoraIngreso: horaIngreso,
          FechaEntrega: fechaEntrega,
          HoraEntrega: horaEntrega,
          FechaRealEntrega: fechaRealEntrega,
          HoraTermino: horaTermino,
          FechaEntregaCotizacionAprox: fechaCotizacion,
          EncargadoOT: encargadoOT,
          Vendedor: vendedorOT,
          EstadoOT: estadoOT,
          IngresoOrdenCompra: ingresoOrdenCompra,
          UsuarioModifica: usuarioModifica,
          Observaciones: observaciones
        });

        console.log('[OT] ===== RECUPERACION FINAL =====');
        console.log('[OT]', {
          IdOrden: idOrdenSeleccionada,
          FechaIngreso: fechaIngreso,
          HoraIngreso: horaIngreso,
          FechaEntrega: fechaEntrega,
          HoraEntrega: horaEntrega,
          FechaRealEntrega: fechaRealEntrega,
          HoraTermino: horaTermino,
          FechaEntregaCotizacionAprox: fechaCotizacion,
          EncargadoOT: encargadoOT,
          Vendedor: vendedorOT,
          EstadoOT: estadoOT,
          IngresoOrdenCompra: ingresoOrdenCompra,
          UsuarioModifica: usuarioModifica,
          Observaciones: observaciones,
          Bodega: bodegaAPI
        });
        console.log('[OT] ===============================');

        setErrores({});

      } catch (err) {
        console.error(
          'Error al cargar detalle de la OT:',
          err
        );

        alert(
          `No fue posible cargar la Orden de Trabajo: ${
            err.message || 'Error desconocido'
          }`
        );
      } finally {
        setCargandoModal(false);
        setModalBuscar({
          abierto: false,
          tipo: '',
          titulo: ''
        });
        setDatosBusqueda([]);
        setFiltroTexto('');
      }

    } else if (tipoSeleccion === 'producto') {
      const cod = item.codigo || item.Codigo || '';
      const desc = item.descripcion || item.nombre || item.Descripcion || '';
      const netoVal =
        item.Neto !== undefined
          ? item.Neto
          : (item.precio || item.ValorUnitario || 0);
      const stockVal =
        item.Stock !== undefined
          ? item.Stock
          : (item.stock || 0);

      handleChange('TmpProductoCodigo', cod);
      handleChange('TmpProductoDescripcion', desc);
      handleChange(
        'TmpProductoValorNeto',
        Math.round(parseFloat(netoVal) || 0).toString()
      );
      handleChange(
        'TmpProductoStock',
        stockVal.toString()
      );

      let cantidadActual =
        parseFloat(valores.TmpProductoCantidad) || 1;

      handleChange(
        'TmpProductoCantidad',
        cantidadActual.toString()
      );

      const descPorcActual =
        parseFloat(valores.TmpProductoDescuentoPorc) || 0;

      const totalNetoItem =
        cantidadActual * (parseFloat(netoVal) || 0);

      const descuentoItem =
        totalNetoItem * (descPorcActual / 100);

      const finalNetoItem =
        totalNetoItem - descuentoItem;

      handleChange(
        'TmpProductoTotalNeto',
        Math.round(finalNetoItem).toString()
      );

      setModalBuscar({
        abierto: false,
        tipo: '',
        titulo: ''
      });
      setDatosBusqueda([]);
      setFiltroTexto('');
    }
  };

  const validarSoloNumerosKeyDown = (e) => {
    if (
      ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key) ||
      e.ctrlKey || e.metaKey
    ) {
      return;
    }
    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault();
    }
  };


  // Mantener siempre disponible la versión más reciente del cargador.
  seleccionarElementoRef.current = handleSeleccionarElemento;

  /*
    SINCRONIZACIÓN CARTOLA -> GENERAR OT

    Cuando en Cartola se presiona "Cargar", la O.T. queda en el
    formulario compartido. Este bloque hace que GenerarOT reutilice
    su recuperación normal de "productosBD" y traiga también:
      - productos guardados
      - cantidades
      - valores
      - descuentos
      - subtotales
      - totales de la O.T.

    No crea endpoints ni modifica backend/BD.
  */
  useEffect(() => {
    const manejarOrdenDesdeCartola = (event) => {
      const detalleEvento = event?.detail || {};

      const idOrden = String(
        detalleEvento.idOrden ||
        detalleEvento.item?.IdOrden ||
        detalleEvento.item?.Idorden ||
        detalleEvento.item?.Id ||
        ''
      ).trim();

      if (!idOrden) {
        return;
      }

      const itemOrden = {
        ...(detalleEvento.item || {}),
        IdOrden: idOrden,
        idOrden: idOrden,
        IDOrden: idOrden,
        Id: idOrden
      };

      // Esta O.T. viene desde Cartola: Generar OT queda en modo consulta.
      setSoloLecturaCartola(true);
      guardarBloqueoCartolaGenerar(idOrden);

      if (seleccionarElementoRef.current) {
        seleccionarElementoRef.current(
          itemOrden,
          'productosBD'
        );
      }
    };

    window.addEventListener(
      'ot:seleccionar-desde-cartola',
      manejarOrdenDesdeCartola
    );

    return () => {
      window.removeEventListener(
        'ot:seleccionar-desde-cartola',
        manejarOrdenDesdeCartola
      );
    };
  }, []);

  useEffect(() => {
    const idOrdenActual = String(
      valores.IdOrden ||
      valores.Idorden ||
      ''
    ).trim();

    if (!idOrdenActual) {
      ultimaOTAutocargadaRef.current = '';
      setSoloLecturaCartola(false);
      return;
    }

    /*
      Si GenerarOT se monta después de que Cartola cargó la O.T.,
      el evento ya pudo haber ocurrido. Por eso Cartola deja un marcador
      temporal. El marcador solamente es válido dentro de la MISMA carga
      de la página. Después de F5/recargar, el token cambia y los botones
      quedan habilitados, que es el comportamiento solicitado.
    */
    try {
      const rawBloqueo = sessionStorage.getItem(
        CLAVE_BLOQUEO_CARTOLA_GENERAR
      );

      if (rawBloqueo) {
        const bloqueo = JSON.parse(rawBloqueo);
        const idCartola = String(
          bloqueo?.idOrden ||
          bloqueo?.IdOrden ||
          bloqueo?.Idorden ||
          ''
        ).trim();

        const esMismoDocumento =
          bloqueo?.tokenDocumento === obtenerTokenDocumentoOT();

        if (
          esMismoDocumento &&
          idCartola &&
          idCartola === idOrdenActual
        ) {
          setSoloLecturaCartola(true);
        } else {
          // Bloqueo antiguo (por ejemplo, después de actualizar la página).
          limpiarBloqueoCartolaGenerar(false);
          setSoloLecturaCartola(false);
        }
      } else {
        setSoloLecturaCartola(false);
      }
    } catch (error) {
      console.warn(
        '[OT] No fue posible verificar el origen Cartola:',
        error
      );
      limpiarBloqueoCartolaGenerar(false);
      setSoloLecturaCartola(false);
    }

    // Si ya fue cargada por el buscador normal o por Cartola, no repetir.
    if (
      ultimaOTAutocargadaRef.current ===
      idOrdenActual
    ) {
      return;
    }

    ultimaOTAutocargadaRef.current =
      idOrdenActual;

    /*
      Esto cubre el caso donde GenerarOT estaba desmontado/oculto
      mientras se eligió la O.T. en Cartola. Al entrar a esta pestaña,
      se recuperan automáticamente también sus productos.
    */
    if (seleccionarElementoRef.current) {
      seleccionarElementoRef.current(
        {
          IdOrden: idOrdenActual,
          idOrden: idOrdenActual,
          IDOrden: idOrdenActual,
          Id: idOrdenActual
        },
        'productosBD'
      );
    }
  }, [
    valores.IdOrden,
    valores.Idorden
  ]);

  const agregarProductoALaTabla = () => {
    const codigo = valores.TmpProductoCodigo || '';
    const descripcion = valores.TmpProductoDescripcion || `PRODUCTO / REPUESTO: ${codigo}`;
    const cantidad = valores.TmpProductoCantidad || '';
    const valorNeto = valores.TmpProductoValorNeto || '';
    const descPorc = valores.TmpProductoDescuentoPorc || '0';
    const totalNeto = valores.TmpProductoTotalNeto || '0';

    if (!codigo.trim() || !cantidad || !valorNeto) {
      alert("Por favor, ingrese el Producto, Cantidad y Valor Neto antes de agregar.");
      return;
    }

    const nuevoDetalle = {
      "IdDetalle": String(Date.now()),
      "Idorden": valores.IdOrden || "12018",
      "IdTipo": subTab === 0 ? "2" : "1",
      "Codigo": codigo,
      "Descripcion": descripcion,
      "Cantidad": cantidad,
      "ValorUnitario": valorNeto,
      "DescuentoPorcentaje": descPorc,
      "SubTotal": totalNeto
    };

    setDetalles(prev => [...prev, nuevoDetalle]);

    const camposALimpiar = [
      'TmpProductoCodigo', 'TmpProductoCantidad', 'TmpProductoValorNeto',
      'TmpProductoDescuentoPorc', 'TmpProductoTotalNeto', 'TmpProductoStock', 'TmpProductoDescripcion'
    ];
    camposALimpiar.forEach(campo => handleChange(campo, ''));
  };

  const handleCalculosYCambios = (campo, valor) => {
    const valorLimpio = valor.replace(/[^0-9]/g, '');
    handleChange(campo, valorLimpio);

    const datosActualizados = { ...valores, [campo]: valorLimpio };

    if (['TmpProductoCantidad', 'TmpProductoValorNeto', 'TmpProductoDescuentoPorc'].includes(campo)) {
      const cant = parseFloat(datosActualizados.TmpProductoCantidad) || 0;
      const netoUnitario = parseFloat(datosActualizados.TmpProductoValorNeto) || 0;
      const descPorc = parseFloat(datosActualizados.TmpProductoDescuentoPorc) || 0;

      const totalNetoItem = cant * netoUnitario;
      const descuentoItem = totalNetoItem * (descPorc / 100);
      const finalNetoItem = totalNetoItem - descuentoItem;

      handleChange('TmpProductoTotalNeto', Math.round(finalNetoItem).toString());
    }
  };

  const verificarEnter = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      agregarProductoALaTabla();
    }
  };

  const eliminarDetalle = (idDetalle) => {
    const detalle = detalles.find(
      item => String(item.IdDetalle) === String(idDetalle)
    );

    if (!detalle) return;

    setDetalleAEliminar(detalle);
  };

  const confirmarEliminacionDetalle = () => {
    if (!detalleAEliminar) return;

    const idOrdenActual = String(
      valores.IdOrden ||
      valores.Idorden ||
      detalleAEliminar.Idorden ||
      ''
    ).trim();

    const idDetalleActual = String(
      detalleAEliminar.IdDetalleBD ||
      detalleAEliminar.IdDetalle ||
      ''
    ).trim();

    if (idOrdenActual && idDetalleActual) {
      guardarDetalleEliminado(
        idOrdenActual,
        idDetalleActual
      );
    }

    setDetalles(prev =>
      prev.filter(
        item =>
          String(item.IdDetalle) !==
          String(detalleAEliminar.IdDetalle)
      )
    );

    setDetalleAEliminar(null);
  };

  const obtenerMontoNumerico = (valor) => {
    const limpio = String(valor ?? '')
      .replace(/\./g, '')
      .replace(/,/g, '.')
      .replace(/[^0-9.-]/g, '');

    const numero = Number(limpio);

    return Number.isFinite(numero) ? Math.round(numero) : 0;
  };

  // Formato visual chileno para montos: 468061 -> 468.061
  // Solo afecta la presentación; los valores internos siguen siendo numéricos.
  const formatearMontoCL = (valor) =>
    obtenerMontoNumerico(valor).toLocaleString('es-CL');

  const abonadoActual = obtenerMontoNumerico(valores.AbonadoOT || 0);
  const totalOrdenAbono = obtenerMontoNumerico(valores.TotalOT || 0);
  const saldoPendienteAbono = Math.max(
    totalOrdenAbono - abonadoActual,
    0
  );

  const montoAbonoPreview = obtenerMontoNumerico(montoAbono);
  const montoAbonoAplicable = Math.min(
    Math.max(montoAbonoPreview, 0),
    saldoPendienteAbono
  );
  const nuevoTotalAbonadoPreview =
    abonadoActual + montoAbonoAplicable;
  const saldoRestantePreview = Math.max(
    totalOrdenAbono - nuevoTotalAbonadoPreview,
    0
  );

  const abrirModalAbono = () => {
    setMontoAbono('');
    setErrorAbono('');
    setModalAbono(true);
  };

  const cerrarModalAbono = () => {
    setModalAbono(false);
    setConfirmarAccionAbono(false);
    setMontoAbono('');
    setErrorAbono('');
  };

  const seleccionarMontoAbono = (monto) => {
    const valor = Math.max(0, Math.round(Number(monto) || 0));
    setMontoAbono(valor > 0 ? String(valor) : '');
    setErrorAbono('');
  };

  const solicitarConfirmacionAbono = () => {
    const monto = obtenerMontoNumerico(montoAbono);

    if (monto <= 0) {
      setErrorAbono('Ingresa un monto mayor a 0.');
      return;
    }

    if (
      totalOrdenAbono > 0 &&
      monto > saldoPendienteAbono
    ) {
      setErrorAbono(
        'El monto no puede superar el saldo pendiente de la O.T.'
      );
      return;
    }

    setConfirmarAccionAbono(true);
  };

  const extraerAbonadoRespuesta = (respuesta) => {
    const visitados = new WeakSet();

    const recorrer = (valor) => {
      if (
        valor === null ||
        valor === undefined
      ) {
        return undefined;
      }

      if (typeof valor !== 'object') {
        return undefined;
      }

      if (visitados.has(valor)) {
        return undefined;
      }

      visitados.add(valor);

      if (
        Object.prototype.hasOwnProperty.call(
          valor,
          'AbonadoOT'
        )
      ) {
        return valor.AbonadoOT;
      }

      if (
        Object.prototype.hasOwnProperty.call(
          valor,
          'abonadoOT'
        )
      ) {
        return valor.abonadoOT;
      }

      const elementos = Array.isArray(valor)
        ? valor
        : Object.values(valor);

      for (const item of elementos) {
        const encontrado = recorrer(item);

        if (encontrado !== undefined) {
          return encontrado;
        }
      }

      return undefined;
    };

    return recorrer(respuesta);
  };


  const leerAbonoPersistido = async (
    idOrden,
    mostrarError = true
  ) => {
    const id = Number(idOrden || 0);

    if (!id) {
      return 0;
    }

    const response = await fetch(
      `http://localhost/Api/api/OrdenTrabajo/LeerAbono/${encodeURIComponent(
        id
      )}`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json'
        }
      }
    );

    if (!response.ok) {
      const detalle = await response
        .text()
        .catch(() => '');

      if (mostrarError) {
        if (response.status === 404) {
          throw new Error(
            'La ruta LeerAbono todavía no está publicada en la API. ' +
            'Recompile y publique OrdenTrabajoController antes de probar.'
          );
        }

        throw new Error(
          `No se pudo leer el abono guardado. HTTP ${response.status}${
            detalle ? ` - ${detalle}` : ''
          }`
        );
      }

      return null;
    }

    const respuesta = await response
      .json()
      .catch(() => null);

    return obtenerMontoNumerico(
      respuesta?.AbonadoOT ??
      respuesta?.abonadoOT ??
      0
    );
  };

  const guardarAbonoPersistente = async (
    nuevoAbonado
  ) => {
    const idOrden = idRegistroBDActual;

    if (!idOrden) {
      throw new Error(
        'Primero debe cargar una Orden de Trabajo existente.'
      );
    }

    const totalGuardar = Math.max(
      0,
      Math.round(
        Number(nuevoAbonado) || 0
      )
    );

    /*
      IMPORTANTE:
      Para guardar un abono NO usamos /Actualizar general.

      /Actualizar llama a ActualizarOrdenTrabajoAsync y en tu API
      está devolviendo false, por eso recibías HTTP 500.

      Esta ruta modifica únicamente AbonadoOT.
    */
    const response = await fetch(
      'http://localhost/Api/api/OrdenTrabajo/ActualizarAbono',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          // Enviamos ambos nombres para que el backend pueda trabajar
          // con la PK real (Id) sin romper compatibilidad con el DTO actual.
          Id: idOrden,
          IdOrden: idOrden,
          AbonadoOT: totalGuardar
        })
      }
    );

    if (!response.ok) {
      const detalle = await response
        .text()
        .catch(() => '');

      if (response.status === 404) {
        throw new Error(
          'La ruta ActualizarAbono todavía no está publicada en la API. ' +
          'Recompile y publique OrdenTrabajoController antes de probar.'
        );
      }

      throw new Error(
        `No se pudo guardar el abono. HTTP ${response.status}${
          detalle ? ` - ${detalle}` : ''
        }`
      );
    }

    const respuesta = await response
      .json()
      .catch(() => null);

    const abonadoRespuesta =
      obtenerMontoNumerico(
        respuesta?.AbonadoOT ??
        respuesta?.abonadoOT ??
        totalGuardar
      );

    /*
      Verificación real contra la BD.
    */
    const abonadoVerificado =
      await leerAbonoPersistido(
        idOrden,
        true
      );

    if (
      abonadoVerificado !==
      totalGuardar
    ) {
      throw new Error(
        `El servidor respondió correctamente, pero AbonadoOT quedó en ${abonadoVerificado} y debía quedar en ${totalGuardar}.`
      );
    }

    // Devolvemos el valor leído nuevamente desde la BD.
    // Así la pantalla refleja exactamente lo que quedó persistido.
    return abonadoVerificado;
  };

  const confirmarAbonoOT = async () => {
    const monto = obtenerMontoNumerico(
      montoAbono
    );

    if (monto <= 0) {
      setConfirmarAccionAbono(false);
      setErrorAbono(
        'Ingresa un monto mayor a 0.'
      );
      return;
    }

    if (
      totalOrdenAbono > 0 &&
      monto > saldoPendienteAbono
    ) {
      setConfirmarAccionAbono(false);
      setErrorAbono(
        'El monto no puede superar el saldo pendiente de la O.T.'
      );
      return;
    }

    const nuevoAbonado =
      abonadoActual + monto;

    /*
      Un abono nuevo se guarda inmediatamente en la BD
      al presionar "Confirmar".
      Por eso NO queda pendiente para el botón "Guardar".
    */
    setGuardandoAbono(true);

    try {
      const abonadoGuardado =
        await guardarAbonoPersistente(
          nuevoAbonado
        );

      handleChange(
        'AbonadoOT',
        String(abonadoGuardado)
      );

      // El abono nuevo ya quedó persistido.
      setAbonoPendienteGuardar(false);
      setValorAbonoPendiente(null);

      setConfirmarAccionAbono(false);
      setModalAbono(false);
      setMontoAbono('');
      setErrorAbono('');

      setAlertaAbonoGuardado({
        abierto: true,
        total: abonadoGuardado
      });
    } catch (error) {
      console.error(
        '[OT] Error guardando nuevo abono:',
        error
      );

      setConfirmarAccionAbono(false);

      setErrorAbono(
        error.message ||
        'No fue posible guardar el abono.'
      );

      alert(
        `No fue posible guardar el abono: ${
          error.message ||
          'Error desconocido'
        }`
      );
    } finally {
      setGuardandoAbono(false);
    }
  };

  const solicitarLimpiarAbono = () => {
    if (abonadoActual <= 0) {
      return;
    }

    setConfirmarLimpiarAbono(true);
  };

  const confirmarLimpiezaAbono = async () => {
    handleChange(
      'AbonadoOT',
      '0'
    );

    setMontoAbono('');
    setErrorAbono('');
    setConfirmarAccionAbono(false);
    setConfirmarLimpiarAbono(false);

    // 0 es un valor válido y debe persistirse en la BD.
    setValorAbonoPendiente(0);
    setAbonoPendienteGuardar(true);
  };

  const abrirActualizarAbono = () => {
    setMontoActualizarAbono(
      String(abonadoActual)
    );
    setErrorActualizarAbono('');
    setModalActualizarAbono(true);
  };

  const cerrarActualizarAbono = () => {
    if (guardandoAbono) {
      return;
    }

    setModalActualizarAbono(false);
    setErrorActualizarAbono('');
  };

  // Aplica el valor corregido en pantalla.
  // La persistencia definitiva sigue realizándose con el botón "Guardar".
  const aplicarNuevoTotalAbonado = (nuevoTotal) => {
    handleChange(
      'AbonadoOT',
      String(nuevoTotal)
    );

    // Guardamos el valor exacto pendiente, incluido 0.
    setValorAbonoPendiente(nuevoTotal);
    setAbonoPendienteGuardar(true);

    setModalActualizarAbono(false);
    setConfirmarEliminarAbono(false);
    setErrorActualizarAbono('');
  };

  const confirmarActualizarAbono = async () => {
    const nuevoTotal =
      obtenerMontoNumerico(
        montoActualizarAbono
      );

    if (nuevoTotal < 0) {
      setErrorActualizarAbono(
        'El total abonado no puede ser negativo.'
      );
      return;
    }

    if (
      totalOrdenAbono > 0 &&
      nuevoTotal > totalOrdenAbono
    ) {
      setErrorActualizarAbono(
        'El total abonado no puede superar el total de la O.T.'
      );
      return;
    }

    /*
      Si el usuario presiona "Aplicar" con el nuevo total en 0,
      NO aplicamos todavía el cambio.

      Primero mostramos SIEMPRE una alerta de confirmación,
      aunque el valor visual actual ya aparezca en $0.
    */
    if (nuevoTotal === 0) {
      setConfirmarEliminarAbono(true);
      return;
    }

    // Para cualquier otro valor, se mantiene el comportamiento normal.
    aplicarNuevoTotalAbonado(nuevoTotal);
  };

  const confirmarEliminarAbonoEnCero = () => {
    // Aquí el usuario ya confirmó expresamente que desea dejarlo en 0.
    aplicarNuevoTotalAbonado(0);
  };

  const cancelarEliminarAbonoEnCero = () => {
    // Cerramos solamente la alerta de confirmación.
    // El modal "Actualizar abono" permanece abierto para poder corregir el valor.
    setConfirmarEliminarAbono(false);
  };

  const dejarAbonoEnCero = () => {
    setMontoActualizarAbono('0');
    setErrorActualizarAbono('');
  };

  const guardarAbonoActualEnBD = async () => {
    const idOrden = idRegistroBDActual;

    if (!idOrden) {
      alert(
        'Primero debe cargar una Orden de Trabajo existente.'
      );
      return;
    }

    const totalAbonadoActual =
      valorAbonoPendiente !== null
        ? obtenerMontoNumerico(valorAbonoPendiente)
        : obtenerMontoNumerico(valores.AbonadoOT || 0);

    setGuardandoAbono(true);

    try {
      const abonadoGuardado =
        await guardarAbonoPersistente(
          totalAbonadoActual
        );

      handleChange(
        'AbonadoOT',
        String(abonadoGuardado)
      );

      setAbonoPendienteGuardar(false);
      setValorAbonoPendiente(null);

      // Mostramos una alerta visual más ordenada en vez del alert() del navegador.
      setAlertaAbonoGuardado({
        abierto: true,
        total: abonadoGuardado
      });
    } catch (error) {
      console.error(
        '[OT] Error guardando AbonadoOT:',
        error
      );

      alert(
        `No fue posible guardar el abono: ${
          error.message ||
          'Error desconocido'
        }`
      );
    } finally {
      setGuardandoAbono(false);
    }
  };

  /*
    Cada vez que se carga/cambia una O.T., traemos directamente
    el AbonadoOT persistido en la BD. Así, al volver a OT-77,
    por ejemplo, no aparece 0 si ya existía un abono guardado.
  */
  useEffect(() => {
    const idOrden = idRegistroBDActual;

    if (!idOrden) {
      return;
    }

    let activo = true;

    const cargar = async () => {
      try {
        const abonadoBD =
          await leerAbonoPersistido(
            idOrden,
            false
          );

        if (
          activo &&
          abonadoBD !== null &&
          abonadoBD !== undefined &&
          abonadoBD !== abonadoActual
        ) {
          handleChange(
            'AbonadoOT',
            String(abonadoBD)
          );

          setAbonoPendienteGuardar(false);
          setValorAbonoPendiente(null);
        }
      } catch (error) {
        console.warn(
          '[OT] No fue posible recuperar AbonadoOT:',
          error
        );
      }
    };

    cargar();

    return () => {
      activo = false;
    };
  }, [
    idRegistroBDActual
  ]);

  const validarCamposObligatorios = () => {
    const nuevosErrores = {
      NombreCliente: !valores.NombreCliente || !valores.NombreCliente.trim(),
      FechaIngreso: !valores.FechaIngreso || !valores.FechaIngreso.trim(),
      HoraIngreso: !valores.HoraIngreso || !valores.HoraIngreso.trim(),
      FechaEntrega: !valores.FechaEntrega || !valores.FechaEntrega.trim(),
      HoraEntrega: !valores.HoraEntrega || !valores.HoraEntrega.trim(),
      Bodega: !valores.Bodega
    };

    setErrores(nuevosErrores);
    return !Object.values(nuevosErrores).some(Boolean);
  };

  const handleIntentarGuardar = () => {
    if (soloLecturaCartola) {
      return;
    }

    const esValido = validarCamposObligatorios();
    if (esValido) {
      setConfirmarGuardar(true);
    } else {
      alert("Por favor complete todos los campos obligatorios antes de guardar.");
    }
  };

  const GuardarOrden = async () => {
    if (soloLecturaCartola) {
      setConfirmarGuardar(false);
      return;
    }

    try {
      console.log('[OT] FECHAS/HORAS QUE SE GUARDARÁN:', {
        FechaRealEntrega: valores.FechaRealEntrega || valores.FechaRealEntregaOT || '',
        FechaRealEntregaOT: valores.FechaRealEntrega || valores.FechaRealEntregaOT || '',
        HoraTermino: valores.HoraTermino || valores.HoraTerminoOT || '',
        HoraTerminoOT: valores.HoraTermino || valores.HoraTerminoOT || ''
      });

      const datos = {
        "Cabecera": {
          ...valores,

          "IdSucursal":
            String(valores.Sucursal || '1').trim().toUpperCase() === 'INTERNA'
              ? '1'
              : String(valores.Sucursal || '1'),

          "Sucursal":
            String(valores.Sucursal || '1').trim() === '1'
              ? 'INTERNA'
              : (valores.Sucursal || 'INTERNA'),

          "FechaEntrega": valores.FechaEntrega || '',
          "FechaEntregaOT": valores.FechaEntrega || '',
          "FechaVencimiento": valores.FechaEntrega || '',
          "FechaVencto": valores.FechaEntrega
            ? `${valores.FechaEntrega} ${valores.HoraEntrega || '00:00'}:00`
            : '',
          "HoraEntrega": valores.HoraEntrega || '',

          "FechaRealEntrega": valores.FechaRealEntrega || valores.FechaRealEntregaOT || '',
          "FechaRealEntregaOT": valores.FechaRealEntrega || valores.FechaRealEntregaOT || '',
          "Fechainicio": valores.FechaRealEntrega || valores.FechaRealEntregaOT || '',

          "HoraTermino": valores.HoraTermino || valores.HoraTerminoOT || '',
          "HoraTerminoOT": valores.HoraTermino || valores.HoraTerminoOT || '',
          "HoraFin": valores.HoraTermino || valores.HoraTerminoOT || '',

          "FechaEntregaCotizacionAprox": valores.FechaEntregaCotizacionAprox || valores.FechaEntregaCotizacionApprox || '',
          "FechaEntregaCotizacionApprox": valores.FechaEntregaCotizacionAprox || valores.FechaEntregaCotizacionApprox || '',

          "SinRebajaStock": valores.SinRebajaStock || false,
          "EstadoOT": valores.EstadoOT || 'MANTENIMIENTO',
          "EncargadoOT": valores.EncargadoOT || valores.NombreEncargado || '',
          "NombreEncargado": valores.EncargadoOT || valores.NombreEncargado || '',
          "Encargado": valores.EncargadoOT || valores.NombreEncargado || '',

          "Vendedor": valores.Vendedor || '',
          "NombreVendedor": valores.Vendedor || '',
          "VendedorNombre": valores.Vendedor || '',

          "IngresoOrdenCompra": valores.IngresoOrdenCompra || '',
          "UsuarioModifica": valores.UsuarioModifica || '--',
          "NroCotizacionAprobada": valores.NroCotizacionAprobada || '0',
          "UsuarioCrea": valores.UsuarioCrea || 'ADMINISTRADOR',
          "AbonadoOT": valores.AbonadoOT || '0'
        },
        "Detalles": (detalles || []).map(d => new DTODetalleOrden(d)),
        "Imagenes": (imagenes || []).map(d => new DTOImagenOrden(d))
      };
      const response = await OrdenTrabajoServicio.CreateOrdenTrabajo(datos);
      const idOT = response?.Id;
      alert(`¡Orden de Trabajo guardada correctamente! ID OT: ${idOT || valores.IdOrden}`);
    } catch (error) {
      console.error('Error al guardar la orden:', error);
      alert(`Error al guardar la orden: ${error.message || 'Problema en el servidor'}`);
    }
  };

  const LimpiarFormulario = () => {
    // Limpiar siempre está permitido, incluso si la O.T. viene desde Cartola.
    // Al limpiar salimos del modo consulta y eliminamos el bloqueo temporal.
    setSoloLecturaCartola(false);
    limpiarBloqueoCartolaGenerar(true);

    const idOrdenActual = String(valores.IdOrden || valores.Idorden || '').trim();

    if (idOrdenActual) {
      detallesTemporalesPorOT.delete(idOrdenActual);
    }

    setDetalles([]);
    setSubTab(0);
    setErrores({});
    const fieldsToClear = [
      'NombreCliente', 'Sucursal', 'FechaIngreso', 'HoraIngreso', 'FechaEntrega', 'HoraEntrega', 'Bodega',
      'FechaRealEntrega', 'HoraTermino', 'FechaEntregaCotiz', 'FechaEntregaCotizacionAprox', 'IdOrden', 'NroNotaVenta',
      'EncargadoOT', 'NombreEncargado', 'UsuarioModifica', 'Vendedor', 'Observaciones', 'SubTotal', 'TotalNeto', 'DescuentoPorc',
      'TotalIVA', 'DescuentoS', 'TotalOT', 'TmpProductoCantidad', 'TmpProductoValorNeto',
      'TmpProductoDescuentoPorc', 'TmpProductoTotalNeto', 'TmpProductoComisionPorc', 'TmpProductoTotalComision',
      'TmpProductoCodigo', 'TmpProductoStock', 'TmpProductoDescripcion', 'SinRebajaStock', 'EstadoOT',
      'IngresoOrdenCompra', 'NroCotizacionAprobada', 'UsuarioCrea', 'AbonadoOT'
    ];
    fieldsToClear.forEach(key => handleChange(key, ''));
    if (limpiarValores) limpiarValores();

    const { fechaActual, horaActual } = obtenerFechaYHoraActuales();
    handleChange('FechaIngreso', fechaActual);
    handleChange('HoraIngreso', horaActual);
  };

  const styleInputIcons = {
    '& input::-webkit-calendar-picker-indicator': {
      display: 'block !important',
      cursor: 'pointer'
    }
  };

  const detallesFiltrados = useMemo(() => {
    return detalles.filter(item => (subTab === 0 ? item.IdTipo === "2" : item.IdTipo === "1"));
  }, [detalles, subTab]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1.5, sm: 2, md: 2.5 }, width: '100%', p: { xs: 1, sm: 2 } }}>

      {}
      <Box sx={{ border: '1px solid #cfd8dc', borderRadius: '6px', p: { xs: 1.5, sm: 2.5 }, pt: 2, position: 'relative', backgroundColor: '#fff', width: '100%' }}>
        <Typography variant="body2" sx={{ position: 'absolute', top: '-10px', left: '15px', backgroundColor: '#fff', px: 1, color: '#005cb2', fontWeight: 'bold', fontSize: '12px' }}>
          Datos de Identificación y Tiempos
        </Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(6, 1fr)', md: 'repeat(12, 1fr)' }, gap: { xs: 1.5, sm: 2 }, mt: 0.5, width: '100%' }}>
          <TextField
            label="Cliente"
            size="small"
            fullWidth
            error={!!errores.NombreCliente}
            value={valores.NombreCliente || ''}
            onChange={(e) => {
              handleChange('NombreCliente', e.target.value);
              if (errores.NombreCliente) setErrores(prev => ({ ...prev, NombreCliente: false }));
            }}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => handleAbrirBuscador('cliente', 'Buscar Cliente')}>
                      <SearchIcon sx={{ color: '#0066cc' }} />
                    </IconButton>
                  </InputAdornment>
                )
              }
            }}
            sx={{ gridColumn: { xs: '1 / -1', sm: 'span 6', md: 'span 7' } }}
          />

          {}
          <FormControl size="small" fullWidth sx={{ gridColumn: { xs: '1 / -1', sm: 'span 6', md: 'span 5' } }}>
            <TextField
              size="small"
              id="sucursal-input"
              label="Sucursal"
              value={
                String(valores.Sucursal || '1').trim().toUpperCase() === 'INTERNA' ||
                String(valores.Sucursal || '1').trim() === '1'
                  ? 'INTERNA'
                  : valores.Sucursal
              }
              slotProps={{ input: { readOnly: true } }}
              variant="outlined"
              fullWidth
            />
          </FormControl>

          <TextField
            label="Ingreso OT"
            type="date"
            size="small"
            fullWidth
            error={!!errores.FechaIngreso}
            value={valores.FechaIngreso || ''}
            onChange={(e) => {
              handleChange('FechaIngreso', e.target.value);
              if (errores.FechaIngreso) setErrores(prev => ({ ...prev, FechaIngreso: false }));
            }}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ ...styleInputIcons, gridColumn: { xs: '1 / -1', sm: 'span 3', md: 'span 3' } }}
          />
          <TextField
            label="Hora Ingreso"
            type="time"
            size="small"
            fullWidth
            error={!!errores.HoraIngreso}
            value={valores.HoraIngreso || ''}
            onChange={(e) => {
              handleChange('HoraIngreso', e.target.value);
              if (errores.HoraIngreso) setErrores(prev => ({ ...prev, HoraIngreso: false }));
            }}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ ...styleInputIcons, gridColumn: { xs: '1 / -1', sm: 'span 3', md: 'span 3' } }}
          />
          <TextField
            label="Fecha Entrega"
            type="date"
            size="small"
            fullWidth
            error={!!errores.FechaEntrega}
            value={valores.FechaEntrega || ''}
            onChange={(e) => {
              handleChange('FechaEntrega', e.target.value);
              if (errores.FechaEntrega) setErrores(prev => ({ ...prev, FechaEntrega: false }));
            }}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ ...styleInputIcons, gridColumn: { xs: '1 / -1', sm: 'span 3', md: 'span 3' } }}
          />
          <TextField
            label="Hora Entrega"
            type="time"
            size="small"
            fullWidth
            error={!!errores.HoraEntrega}
            value={valores.HoraEntrega || ''}
            onChange={(e) => {
              handleChange('HoraEntrega', e.target.value);
              if (errores.HoraEntrega) setErrores(prev => ({ ...prev, HoraEntrega: false }));
            }}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ ...styleInputIcons, gridColumn: { xs: '1 / -1', sm: 'span 3', md: 'span 3' } }}
          />

          <FormControl size="small" fullWidth error={!!errores.Bodega} sx={{ gridColumn: { xs: '1 / -1', sm: 'span 6', md: 'span 4' } }}>
            <InputLabel id="bodega-select-label">Bodega</InputLabel>
            <Select
              labelId="bodega-select-label"
              id="bodega-select"
              value={valores.Bodega || ''}
              label="Bodega"
              onChange={(e) => {
                handleChange('Bodega', e.target.value);
                if (errores.Bodega) setErrores(prev => ({ ...prev, Bodega: false }));
              }}
            >
              {listadobodega.length > 0 ? (
                listadobodega.map((item, index) => (
                  <MenuItem key={item.id || index} value={item.id || item.nombre}>
                    {item.nombre}
                  </MenuItem>
                ))
              ) : (
                <MenuItem disabled value=""><em>Sin bodegas disponibles</em></MenuItem>
              )}
            </Select>
          </FormControl>

          <TextField label="Fecha Real Entrega OT" type="date" size="small" fullWidth value={valores.FechaRealEntrega || ''} onChange={(e) => handleChange('FechaRealEntrega', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ ...styleInputIcons, gridColumn: { xs: '1 / -1', sm: 'span 3', md: 'span 4' } }} />
          <TextField label="Hora Término OT" type="time" size="small" fullWidth value={valores.HoraTermino || ''} onChange={(e) => handleChange('HoraTermino', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ ...styleInputIcons, backgroundColor: '#f4fbf4', gridColumn: { xs: '1 / -1', sm: 'span 3', md: 'span 4' } }} />
          <TextField label="Fecha Entrega Cotización Aprox." type="date" size="small" fullWidth value={valores.FechaEntregaCotizacionAprox || ''} onChange={(e) => handleChange('FechaEntregaCotizacionAprox', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ ...styleInputIcons, gridColumn: '1 / -1' }} />
        </Box>
      </Box>

      {}
      <Box sx={{ border: '1px solid #cfd8dc', borderRadius: '6px', p: { xs: 1.5, sm: 2.5 }, pt: 2, position: 'relative', backgroundColor: '#fff', width: '100%' }}>
        <Typography variant="body2" sx={{ position: 'absolute', top: '-10px', left: '15px', backgroundColor: '#fff', px: 1, color: '#005cb2', fontWeight: 'bold', fontSize: '12px' }}>
          Gestión Interna
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1.5, sm: 2 }, mt: 0.5, width: '100%' }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(6, 1fr)', md: 'repeat(12, 1fr)' }, gap: { xs: 1.5, sm: 2 }, width: '100%' }}>
            <Box sx={{ gridColumn: { xs: '1 / -1', sm: 'span 6', md: 'span 3' }, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
              <Button variant="contained" size="small" sx={{ textTransform: 'none', backgroundColor: '#0066cc', minWidth: '110px', fontSize: '11px', whiteSpace: 'nowrap' }}>
                Cambiar N° OT
              </Button>
              <FormControlLabel
                control={<Checkbox checked={valores.SinRebajaStock || false} onChange={(e) => handleChange('SinRebajaStock', e.target.checked)} size="small" />}
                label={<Typography variant="caption">Sin Rebaja</Typography>}
                sx={{ m: 0 }}
              />
            </Box>

            <TextField
              label="Número OT"
              size="small"
              fullWidth
              value={valores.IdOrden || ''}
              onKeyDown={validarSoloNumerosKeyDown}
              onChange={(e) => handleChange('IdOrden', e.target.value.replace(/[^0-9]/g, ''))}
              sx={{ '& .MuiInputBase-input': { fontWeight: 'bold', color: '#0066cc', textAlign: 'center' }, gridColumn: { xs: '1 / -1', sm: 'span 3', md: 'span 2' } }}
            />

            <TextField
              label="N° Nota de Venta"
              size="small"
              fullWidth
              value={valores.NroNotaVenta || ''}
              onChange={(e) => handleChange('NroNotaVenta', e.target.value)}
              sx={{ gridColumn: { xs: '1 / -1', sm: 'span 3', md: 'span 3' } }}
            />

            <Box sx={{ gridColumn: { xs: '1 / -1', sm: 'span 6', md: 'span 4' } }}>
              <FormControl size="small" fullWidth variant="outlined">
                <InputLabel id="estado-ot-select-label">Estado OT</InputLabel>
                <Select
                  labelId="estado-ot-select-label"
                  label="Estado OT"
                  value={valores.EstadoOT || 'MANTENIMIENTO'}
                  onChange={(e) => handleChange('EstadoOT', e.target.value)}
                >
                  <MenuItem value="MANTENIMIENTO">MANTENIMIENTO</MenuItem>
                  <MenuItem value="APROBADO">APROBADO</MenuItem>
                  <MenuItem value="RECHAZADO">RECHAZADO</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: { xs: 1.5, sm: 2 }, width: '100%' }}>
            <Autocomplete
              size="small"
              fullWidth
              options={listaOpcionesOT}
              value={
                listaOpcionesOT.includes(valores.EncargadoOT)
                  ? valores.EncargadoOT
                  : null
              }
              inputValue={valores.EncargadoOT || ''}
              filterOptions={(options) => options}
              isOptionEqualToValue={(option, value) => option === value}
              onChange={(e, newValue) => {
                const encargadoSeleccionado = newValue || '';
                handleChange('EncargadoOT', encargadoSeleccionado);
                handleChange('NombreEncargado', encargadoSeleccionado);
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Encargado OT"
                  placeholder="Seleccione o busque..."
                />
              )}
            />

            <Autocomplete
              size="small"
              fullWidth
              options={opcionesVendedores}
              value={
                opcionesVendedores.includes(valores.Vendedor)
                  ? valores.Vendedor
                  : null
              }
              isOptionEqualToValue={(option, value) => option === value}
              onChange={(e, newValue) => handleChange('Vendedor', newValue || '')}
              renderInput={(params) => <TextField {...params} label="Vendedor" placeholder="Seleccione o busque..." />}
            />
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(6, 1fr)', md: 'repeat(12, 1fr)' }, gap: { xs: 1.5, sm: 2 }, width: '100%' }}>
            <TextField
              label="Ingreso Orden de Compra"
              size="small"
              fullWidth
              value={valores.IngresoOrdenCompra || ''}
              onChange={(e) => handleChange('IngresoOrdenCompra', e.target.value)}
              sx={{ gridColumn: { xs: '1 / -1', sm: 'span 6', md: 'span 6' } }}
            />

            <Button variant="outlined" size="medium" fullWidth sx={{ textTransform: 'none', height: '38px', gridColumn: { xs: '1 / -1', sm: 'span 3', md: 'span 3' }, fontSize: '11.5px', fontWeight: 'bold' }}>
              Referencias DTE
            </Button>

            <TextField
              label="Usuario Modifica"
              size="small"
              fullWidth
              value={valores.UsuarioModifica || '--'}
              slotProps={{ input: { readOnly: true } }}
              sx={{ gridColumn: { xs: '1 / -1', sm: 'span 3', md: 'span 3' } }}
            />
          </Box>

          <Box sx={{ width: '100%', mt: 0.5 }}>
            <TextField label="Observaciones" size="small" fullWidth multiline rows={1.5} value={valores.Observaciones || ''} onChange={(e) => handleChange('Observaciones', e.target.value)} sx={{ backgroundColor: '#fffbe6' }} />
          </Box>
        </Box>
      </Box>

      {}
      <Box sx={{ border: '1px solid #cfd8dc', borderRadius: '6px', backgroundColor: '#eaeff4', overflow: 'hidden', width: '100%' }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, backgroundColor: '#cfd8dc', px: 2, py: 0.5, gap: 1 }}>
          <Tabs value={subTab} onChange={(e, val) => setSubTab(val)} sx={{ minHeight: '36px', '& .MuiTab-root': { minHeight: '36px', py: 0.5, fontSize: '13px' } }}>
            <Tab label="Productos" sx={{ textTransform: 'none', fontWeight: 'bold' }} />
            <Tab label="Servicios" sx={{ textTransform: 'none', fontWeight: 'bold' }} />
          </Tabs>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: { xs: 'space-between', sm: 'flex-end' }, gap: 1, pb: { xs: 0.5, sm: 0 } }}>
            <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'green', fontSize: '12px' }}>N° Cotización Aprobada:</Typography>
            <Select size="small" value={valores.NroCotizacionAprobada || '0'} onChange={(e) => handleChange('NroCotizacionAprobada', e.target.value)} sx={{ height: '26px', backgroundColor: '#fff', minWidth: '60px', fontSize: '12px' }}>
              <MenuItem value="0">0</MenuItem>
            </Select>
          </Box>
        </Box>

        {subTab === 0 ? (
          <Box sx={{ p: { xs: 1, sm: 1.5 }, display: 'flex', flexDirection: 'column', gap: 1.5, backgroundColor: '#f5f5f5', borderBottom: '1px solid #e0e0e0' }}>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 1.5, alignItems: { xs: 'stretch', md: 'center' }, width: '100%' }}>
              <TextField
                label="Producto"
                size="small"
                fullWidth
                value={valores.TmpProductoDescripcion || valores.TmpProductoCodigo || ''}
                onChange={(e) => handleChange('TmpProductoDescripcion', e.target.value)}
                sx={{ backgroundColor: '#fff', flexGrow: 1 }}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => handleAbrirBuscador('producto', 'Mantenedor de Productos')}>
                          <SearchIcon sx={{ color: '#0066cc' }} />
                        </IconButton>
                      </InputAdornment>
                    )
                  }
                }}
              />

              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <TextField label="Stock" type="text" size="small" value={valores.TmpProductoStock || '0'} slotProps={{ input: { readOnly: true } }} sx={{ width: { xs: '50%', md: '80px' }, backgroundColor: '#e0e0e0' }} />
                <FormControlLabel control={<Checkbox checked={valores.SinRebajaStock || false} onChange={(e) => handleChange('SinRebajaStock', e.target.checked)} color="error" size="small" />} label={<Typography variant="caption" sx={{ color: 'red', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Sin rebaja</Typography>} />
              </Box>
            </Box>

            <Box sx={{ width: '100%', display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(6, 1fr)' }, gap: 1 }}>
              <TextField label="Cantidad" type="text" size="small" fullWidth value={valores.TmpProductoCantidad || ''} onKeyDown={validarSoloNumerosKeyDown} onChange={(e) => handleCalculosYCambios('TmpProductoCantidad', e.target.value)} onKeyDownCapture={verificarEnter} sx={{ backgroundColor: '#fff' }} />
              <TextField label="Valor Neto" type="text" size="small" fullWidth value={valores.TmpProductoValorNeto || ''} onKeyDown={validarSoloNumerosKeyDown} onChange={(e) => handleCalculosYCambios('TmpProductoValorNeto', e.target.value)} onKeyDownCapture={verificarEnter} sx={{ backgroundColor: '#fff' }} />
              <TextField label="Descto.(%)" type="text" size="small" fullWidth value={valores.TmpProductoDescuentoPorc || ''} onKeyDown={validarSoloNumerosKeyDown} onChange={(e) => handleCalculosYCambios('TmpProductoDescuentoPorc', e.target.value)} onKeyDownCapture={verificarEnter} sx={{ backgroundColor: '#fff' }} />
              <TextField label="Total Neto" type="text" size="small" fullWidth value={valores.TmpProductoTotalNeto || ''} slotProps={{ input: { readOnly: true } }} sx={{ backgroundColor: '#e0e0e0' }} />
              <TextField label="Comisión (%)" type="text" size="small" fullWidth value={valores.TmpProductoComisionPorc || ''} onKeyDown={validarSoloNumerosKeyDown} onChange={(e) => handleCalculosYCambios('TmpProductoComisionPorc', e.target.value)} sx={{ backgroundColor: '#fff' }} />
              <TextField label="Total Comisión ($)" type="text" size="small" fullWidth value={valores.TmpProductoTotalComision || ''} onKeyDown={validarSoloNumerosKeyDown} onChange={(e) => handleCalculosYCambios('TmpProductoTotalComision', e.target.value)} sx={{ backgroundColor: '#fff' }} />
            </Box>

            <Box sx={{ width: '100%', display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
              <Button variant="contained" size="small" sx={{ textTransform: 'none', backgroundColor: '#0066cc' }} onClick={agregarProductoALaTabla}>
                + Insertar Producto
              </Button>
            </Box>
          </Box>
        ) : (
          <Box sx={{ p: { xs: 1, sm: 1.5 }, display: 'flex', flexDirection: 'column', gap: 1.5, backgroundColor: '#f5f5f5', borderBottom: '1px solid #e0e0e0' }}>
            <TextField label="Servicio (texto libre)" size="small" fullWidth multiline rows={2} sx={{ backgroundColor: '#fffbe6' }} placeholder="Escribe la descripción del servicio técnico aquí..." />
            <Box sx={{ width: '100%', display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(5, 1fr)' }, gap: 1 }}>
              <TextField label="Cantidad" type="text" size="small" fullWidth onKeyDown={validarSoloNumerosKeyDown} onChange={(e) => handleChange('TmpServicioCantidad', e.target.value.replace(/[^0-9]/g, ''))} sx={{ backgroundColor: '#fff' }} />
              <TextField label="Valor Unitario $" type="text" size="small" fullWidth onKeyDown={validarSoloNumerosKeyDown} onChange={(e) => handleChange('TmpServicioValor', e.target.value.replace(/[^0-9]/g, ''))} sx={{ backgroundColor: '#fff' }} />
              <TextField label="Descuento (%)" type="text" size="small" fullWidth onKeyDown={validarSoloNumerosKeyDown} onChange={(e) => handleChange('TmpServicioDesc', e.target.value.replace(/[^0-9]/g, ''))} sx={{ backgroundColor: '#fff' }} />
              <TextField label="Total Neto $" type="text" size="small" fullWidth sx={{ backgroundColor: '#e0e0e0' }} slotProps={{ input: { readOnly: true } }} />
              <TextField label="Comisión (%)" type="text" size="small" fullWidth onKeyDown={validarSoloNumerosKeyDown} onChange={(e) => handleChange('TmpServicioComision', e.target.value.replace(/[^0-9]/g, ''))} sx={{ backgroundColor: '#fff' }} />
            </Box>
          </Box>
        )}

        <TableContainer component={Paper} elevation={0} sx={{ width: '100%', overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 700 }}>
            <TableHead sx={{ backgroundColor: '#0056b3' }}>
              <TableRow>
                <TableCell align="center" sx={{ color: '#fff', fontWeight: 'bold' }}>N°</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Código</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Descripción / Servicio</TableCell>
                <TableCell align="center" sx={{ color: '#fff', fontWeight: 'bold' }}>Cantidad</TableCell>
                <TableCell align="right" sx={{ color: '#fff', fontWeight: 'bold' }}>Valor Unit.</TableCell>
                <TableCell align="center" sx={{ color: '#fff', fontWeight: 'bold' }}>Desc. (%)</TableCell>
                <TableCell align="right" sx={{ color: '#fff', fontWeight: 'bold' }}>Sub Total</TableCell>
                <TableCell align="center" sx={{ color: '#fff', fontWeight: 'bold' }}>Comisión (%)</TableCell>
                <TableCell align="right" sx={{ color: '#fff', fontWeight: 'bold' }}>Comisión ($)</TableCell>
                <TableCell align="center" sx={{ color: '#fff', fontWeight: 'bold' }}>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {detallesFiltrados.map((item, index) => (
                <TableRow key={item.IdDetalle} sx={{ backgroundColor: index % 2 === 0 ? '#f9fbfd' : '#fff' }}>
                  <TableCell align="center" sx={{ fontWeight: 'bold', color: '#0066cc' }}>{index + 1}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace' }}>{item.Codigo}</TableCell>
                  <TableCell>{item.Descripcion}</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>{item.Cantidad}</TableCell>
                  <TableCell align="right">${parseFloat(item.ValorUnitario || 0).toLocaleString('es-CL')}</TableCell>
                  <TableCell align="center">{item.DescuentoPorcentaje}%</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', color: '#0056b3' }}>
                    ${parseFloat(item.SubTotal || 0).toLocaleString('es-CL')}
                  </TableCell>
                  <TableCell align="center">0%</TableCell>
                  <TableCell align="right">$0</TableCell>
                  <TableCell align="center">
                    <IconButton size="small" color="error" onClick={() => eliminarDetalle(item.IdDetalle)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, justifyContent: 'space-between', alignItems: 'stretch', gap: 2, mt: 0.5 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, flex: 1, minWidth: { xs: '100%', lg: 'auto' } }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              alignItems: { xs: 'stretch', md: 'center' },
              gap: 1,
              width: '100%',
              flexWrap: 'wrap'
            }}
          >
            <TextField
              label="Usuario crea OT"
              size="small"
              value={valores.UsuarioCrea || 'ADMINISTRADOR'}
              slotProps={{ input: { readOnly: true } }}
              sx={{
                width: { xs: '100%', sm: '220px' },
                flexShrink: 0,
                '& .MuiOutlinedInput-root': {
                  backgroundColor: '#ffffff'
                },
                '& .MuiInputBase-input': {
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#263238'
                },
                '& .MuiInputLabel-root': {
                  fontSize: '12px'
                }
              }}
            />

            <Box
              sx={{
                border: '1px solid #0066cc',
                borderRadius: '6px',
                px: 0.75,
                py: 0.45,
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 0.6,
                backgroundColor: '#f0f7ff',
                width: { xs: '100%', md: 'auto' },
                maxWidth: '100%',
                boxSizing: 'border-box'
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 800,
                  color: '#0066cc',
                  whiteSpace: 'nowrap',
                  mr: 0.2
                }}
              >
                Abonado OT:
              </Typography>

              <Box
                component="input"
                type="text"
                value={valores.AbonadoOT || '0'}
                readOnly
                title="El abono se modifica mediante los botones de abono."
                sx={{
                  width: '82px',
                  height: '28px',
                  px: 0.75,
                  boxSizing: 'border-box',
                  border: '1px solid #b0bec5',
                  borderRadius: '4px',
                  textAlign: 'center',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#263238',
                  backgroundColor: '#ffffff',
                  outline: 'none'
                }}
              />

              <Button
                variant="contained"
                color="success"
                size="small"
                disabled={guardandoAbono || !idRegistroBDActual}
                onClick={abrirModalAbono}
                sx={{
                  minWidth: '72px',
                  minHeight: '29px',
                  py: 0.2,
                  px: 1,
                  textTransform: 'none',
                  fontSize: '10.5px',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  boxShadow: 'none'
                }}
              >
                Abonar $
              </Button>

              <Button
                variant="contained"
                size="small"
                disabled={
                  guardandoAbono ||
                  !abonoPendienteGuardar ||
                  !idRegistroBDActual
                }
                onClick={() => setConfirmarGuardarAbono(true)}
                title={
                  abonoPendienteGuardar
                    ? 'Guardar la actualización del Abonado OT en la base de datos'
                    : 'Use Actualizar para modificar el total abonado'
                }
                sx={{
                  minWidth: '72px',
                  minHeight: '29px',
                  py: 0.2,
                  px: 1,
                  textTransform: 'none',
                  fontSize: '10.5px',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  boxShadow: 'none',
                  backgroundColor: '#1565c0',
                  '&:hover': {
                    backgroundColor: '#0d47a1'
                  },
                  '&.Mui-disabled': {
                    backgroundColor: '#cfd8dc',
                    color: '#78909c'
                  }
                }}
              >
                {guardandoAbono ? '...' : 'Guardar'}
              </Button>

              <Button
                variant="outlined"
                size="small"
                disabled={guardandoAbono || !idRegistroBDActual}
                onClick={abrirActualizarAbono}
                title="Corregir o reiniciar el total abonado"
                sx={{
                  minWidth: '72px',
                  minHeight: '29px',
                  py: 0.2,
                  px: 1,
                  textTransform: 'none',
                  fontSize: '10.5px',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  borderColor: '#1976d2',
                  color: '#1565c0',
                  backgroundColor: '#ffffff',
                  '&:hover': {
                    borderColor: '#1565c0',
                    backgroundColor: '#f3f8fd'
                  }
                }}
              >
                Actualizar
              </Button>
            </Box>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))', md: 'repeat(5, minmax(0, 1fr))' }, gap: 1, width: '100%' }}>
            <Button
              variant="contained"
              size="small"
              fullWidth
              startIcon={<SearchIcon />}
              onClick={() => handleAbrirBuscador('productosBD', 'Órdenes de Trabajo / Registros')}
              sx={{ backgroundColor: '#1e88e5', textTransform: 'none', fontWeight: 600, borderRadius: '8px', '&:hover': { backgroundColor: '#1565c0' } }}
            >
              Buscar
            </Button>
            <Button
              variant="outlined"
              size="small"
              fullWidth
              startIcon={<DeleteIcon />}
              onClick={LimpiarFormulario}
              title="Limpiar formulario"
              sx={{
                color: '#546e7a',
                borderColor: '#cfd8dc',
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: '8px',
                '&:hover': {
                  backgroundColor: '#eceff1'
                },
                '&.Mui-disabled': {
                  color: '#90a4ae',
                  borderColor: '#cfd8dc',
                  backgroundColor: '#f5f7f8'
                }
              }}
            >
              Limpiar
            </Button>
            <Button
              variant="contained"
              size="small"
              fullWidth
              startIcon={<SaveIcon />}
              onClick={handleIntentarGuardar}
              disabled={soloLecturaCartola}
              title={
                soloLecturaCartola
                  ? 'O.T. cargada desde Cartola. El guardado está deshabilitado.'
                  : 'Guardar Orden de Trabajo'
              }
              sx={{
                backgroundColor: '#2e7d32',
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: '8px',
                '&:hover': {
                  backgroundColor: '#1b5e20'
                },
                '&.Mui-disabled': {
                  backgroundColor: '#cfd8dc',
                  color: '#78909c'
                }
              }}
            >
              Grabar
            </Button>
            <Button
              variant="contained"
              size="small"
              fullWidth
              startIcon={<BlockIcon />}
              sx={{ backgroundColor: '#d32f2f', textTransform: 'none', fontWeight: 600, borderRadius: '8px', '&:hover': { backgroundColor: '#c62828' } }}
            >
              Anular
            </Button>
            <Button
              variant="outlined"
              size="small"
              fullWidth
              startIcon={<PrintIcon />}
              onClick={handleImprimir}
              sx={{ color: '#37474f', borderColor: '#b0bec5', textTransform: 'none', fontWeight: 600, borderRadius: '8px', '@media print': { display: 'none' } }}
            >
              Imprimir
            </Button>
          </Box>
        </Box>

        <Box
          sx={{
            border: '1px solid #d4e0e8',
            borderRadius: '10px',
            p: { xs: 1, sm: 1.35 },
            backgroundColor: '#f8fafc',
            display: 'grid',
            gridTemplateColumns: {
              xs: 'minmax(0, 1fr)',
              sm: 'repeat(2, minmax(0, 1fr))',
              md: 'repeat(3, minmax(0, 1fr))'
            },
            gap: 1,
            flex: 1,
            width: '100%',
            minWidth: 0
          }}
        >
          <TextField
            label="Sub Total $"
            type="text"
            size="small"
            fullWidth
            value={formatearMontoCL(valores.SubTotal)}
            slotProps={{ input: { readOnly: true } }}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: '#f1f5f9',
                '& fieldset': { borderColor: '#cbd5e1' }
              },
              '& .MuiInputBase-input': {
                fontWeight: 700,
                color: '#334155'
              },
              '& .MuiInputLabel-root': {
                color: '#475569',
                fontWeight: 600
              }
            }}
          />

          <TextField
            label="Total Neto $"
            type="text"
            size="small"
            fullWidth
            value={formatearMontoCL(valores.TotalNeto)}
            slotProps={{ input: { readOnly: true } }}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: '#eef6ff',
                '& fieldset': { borderColor: '#93c5fd' }
              },
              '& .MuiInputBase-input': {
                fontWeight: 700,
                color: '#0f5ca8'
              },
              '& .MuiInputLabel-root': {
                color: '#1565c0',
                fontWeight: 600
              }
            }}
          />

          <TextField
            label="Descuento (%)"
            type="text"
            size="small"
            fullWidth
            value={valores.DescuentoPorc || '0'}
            onKeyDown={validarSoloNumerosKeyDown}
            onChange={(e) => handleChange('DescuentoPorc', e.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: '#fff9e6',
                '& fieldset': { borderColor: '#f0cf6a' },
                '&:hover fieldset': { borderColor: '#d6a91f' },
                '&.Mui-focused fieldset': { borderColor: '#c58b00' }
              },
              '& .MuiInputBase-input': {
                fontWeight: 700,
                color: '#7a5600'
              },
              '& .MuiInputLabel-root': {
                color: '#8a6200',
                fontWeight: 600
              }
            }}
          />

          <TextField
            label="Total IVA $"
            type="text"
            size="small"
            fullWidth
            value={formatearMontoCL(valores.TotalIVA)}
            slotProps={{ input: { readOnly: true } }}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: '#f5f1ff',
                '& fieldset': { borderColor: '#c4b5fd' }
              },
              '& .MuiInputBase-input': {
                fontWeight: 700,
                color: '#6d3fc0'
              },
              '& .MuiInputLabel-root': {
                color: '#6d4cc2',
                fontWeight: 600
              }
            }}
          />

          <TextField
            label="Descuento $"
            type="text"
            size="small"
            fullWidth
            value={formatearMontoCL(valores.DescuentoS)}
            slotProps={{ input: { readOnly: true } }}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: '#fff3e8',
                '& fieldset': { borderColor: '#fdba74' }
              },
              '& .MuiInputBase-input': {
                fontWeight: 700,
                color: '#b45309'
              },
              '& .MuiInputLabel-root': {
                color: '#b45f06',
                fontWeight: 600
              }
            }}
          />

          <TextField
            label="Total OT $"
            type="text"
            size="small"
            fullWidth
            // IMPORTANTE:
            // valores.TotalOT conserva el total original de la O.T.
            // Aquí mostramos solamente lo que falta pagar después de los abonos.
            // Así evitamos modificar el total base y realizar una doble resta.
            value={formatearMontoCL(saldoPendienteAbono)}
            slotProps={{
              input: {
                readOnly: true
              }
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: '#eaf7ed',
                '& fieldset': {
                  borderColor: '#73b985',
                  borderWidth: '1.5px'
                }
              },
              '& .MuiInputBase-input': {
                fontWeight: 900,
                color: '#17652c'
              },
              '& .MuiInputLabel-root': {
                color: '#23753a',
                fontWeight: 700
              }
            }}
          />
        </Box>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
        <Button variant="contained" size="small" sx={{ backgroundColor: '#212121', color: '#fff', px: 3, width: { xs: '100%', sm: 'auto' }, fontSize: '12px', '&:hover': { backgroundColor: '#424242' } }}>
          X CERRAR
        </Button>
      </Box>

      {}
      <Dialog
        open={modalAbono}
        onClose={cerrarModalAbono}
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
          Abonar Orden de Trabajo
        </DialogTitle>

        <DialogContent
          sx={{
            pt: '28px !important',
            pb: 2,
            px: 3
          }}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 1,
              mb: 2
            }}
          >
            <Box
              sx={{
                border: '1px solid #d9e2e8',
                borderRadius: '6px',
                p: 1,
                backgroundColor: '#f8fafb',
                textAlign: 'center'
              }}
            >
              <Typography
                sx={{
                  fontSize: '10px',
                  color: '#607d8b',
                  fontWeight: 700
                }}
              >
                Abonado actual
              </Typography>
              <Typography
                sx={{
                  mt: 0.3,
                  fontSize: '14px',
                  color: '#1b5e20',
                  fontWeight: 800
                }}
              >
                ${abonadoActual.toLocaleString('es-CL')}
              </Typography>
            </Box>

            <Box
              sx={{
                border: '1px solid #d9e2e8',
                borderRadius: '6px',
                p: 1,
                backgroundColor: '#f8fafb',
                textAlign: 'center'
              }}
            >
              <Typography
                sx={{
                  fontSize: '10px',
                  color: '#607d8b',
                  fontWeight: 700
                }}
              >
                Saldo pendiente
              </Typography>
              <Typography
                sx={{
                  mt: 0.3,
                  fontSize: '14px',
                  color: '#003366',
                  fontWeight: 800
                }}
              >
                ${saldoPendienteAbono.toLocaleString('es-CL')}
              </Typography>
            </Box>
          </Box>

          <Typography
            sx={{
              mb: 0.75,
              fontSize: '12px',
              fontWeight: 700,
              color: '#333333',
              textAlign: 'center'
            }}
          >
            Monto a abonar
          </Typography>

          <TextField
            fullWidth
            size="small"
            autoFocus
            value={montoAbono}
            error={Boolean(errorAbono)}
            helperText={errorAbono}
            placeholder="Ingrese monto"
            onChange={(e) => {
              setMontoAbono(
                e.target.value.replace(/[^0-9]/g, '')
              );
              setErrorAbono('');
            }}
            slotProps={{
              htmlInput: {
                inputMode: 'numeric'
              }
            }}
            sx={{
              mb: 1.5,
              '& .MuiInputBase-input': {
                textAlign: 'center',
                fontWeight: 700
              },
              '& .MuiFormHelperText-root': {
                textAlign: 'center'
              }
            }}
          />

          <Typography
            sx={{
              mb: 0.75,
              fontSize: '10.5px',
              color: '#607d8b',
              textAlign: 'center'
            }}
          >
            Opciones rápidas
          </Typography>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 0.75
            }}
          >
            <Button
              variant="outlined"
              size="small"
              disabled={saldoPendienteAbono <= 0}
              onClick={() =>
                seleccionarMontoAbono(
                  saldoPendienteAbono * 0.25
                )
              }
              sx={{
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '11px'
              }}
            >
              25%
            </Button>

            <Button
              variant="outlined"
              size="small"
              disabled={saldoPendienteAbono <= 0}
              onClick={() =>
                seleccionarMontoAbono(
                  saldoPendienteAbono * 0.5
                )
              }
              sx={{
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '11px'
              }}
            >
              50%
            </Button>

            <Button
              variant="outlined"
              size="small"
              disabled={saldoPendienteAbono <= 0}
              onClick={() =>
                seleccionarMontoAbono(
                  saldoPendienteAbono
                )
              }
              sx={{
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '11px'
              }}
            >
              Total
            </Button>
          </Box>

          <Box
            sx={{
              mt: 2,
              pt: 1.5,
              borderTop: '1px solid #d9e2e8'
            }}
          >
            <Typography
              sx={{
                mb: 1,
                fontSize: '10.5px',
                color: '#607d8b',
                fontWeight: 700,
                textAlign: 'center'
              }}
            >
              Vista previa del abono
            </Typography>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 1
              }}
            >
              <Box
                sx={{
                  border: '1px solid #c8e6c9',
                  borderRadius: '6px',
                  p: 1,
                  backgroundColor: '#f1f8e9',
                  textAlign: 'center'
                }}
              >
                <Typography
                  sx={{
                    fontSize: '10px',
                    color: '#558b2f',
                    fontWeight: 700
                  }}
                >
                  Nuevo total abonado
                </Typography>

                <Typography
                  sx={{
                    mt: 0.35,
                    fontSize: '14px',
                    color: '#1b5e20',
                    fontWeight: 800
                  }}
                >
                  ${nuevoTotalAbonadoPreview.toLocaleString('es-CL')}
                </Typography>
              </Box>

              <Box
                sx={{
                  border: '1px solid #bbdefb',
                  borderRadius: '6px',
                  p: 1,
                  backgroundColor: '#f3f8fc',
                  textAlign: 'center'
                }}
              >
                <Typography
                  sx={{
                    fontSize: '10px',
                    color: '#1565c0',
                    fontWeight: 700
                  }}
                >
                  Saldo después del abono
                </Typography>

                <Typography
                  sx={{
                    mt: 0.35,
                    fontSize: '14px',
                    color: '#003366',
                    fontWeight: 800
                  }}
                >
                  ${saldoRestantePreview.toLocaleString('es-CL')}
                </Typography>
              </Box>
            </Box>

            {montoAbonoPreview > 0 && (
              <Typography
                sx={{
                  mt: 1,
                  fontSize: '10px',
                  color: '#607d8b',
                  textAlign: 'center'
                }}
              >
                Se abonarán ${montoAbonoAplicable.toLocaleString('es-CL')} al confirmar.
              </Typography>
            )}
          </Box>
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            pb: 2,
            pt: 0.5,
            display: 'flex',
            justifyContent: 'center',
            gap: 1.5
          }}
        >
          <Button
            variant="contained"
            size="small"
            color="success"
            disabled={
              montoAbonoPreview <= 0 ||
              montoAbonoPreview > saldoPendienteAbono
            }
            onClick={solicitarConfirmacionAbono}
            sx={{
              minWidth: 95,
              textTransform: 'none',
              fontWeight: 700
            }}
          >
            Aceptar
          </Button>

          <Button
            variant="outlined"
            size="small"
            onClick={cerrarModalAbono}
            sx={{
              minWidth: 95,
              textTransform: 'none',
              fontWeight: 700,
              borderColor: '#9e9e9e',
              color: '#333333'
            }}
          >
            Cancelar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={confirmarAccionAbono}
        onClose={() => setConfirmarAccionAbono(false)}
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
          Confirmar abono
        </DialogTitle>

        <DialogContent
          sx={{
            pt: '30px !important',
            pb: 2,
            px: 3,
            textAlign: 'center'
          }}
        >
          <Typography
            sx={{
              fontSize: '13px',
              color: '#222222',
              fontWeight: 600,
              lineHeight: 1.6,
              textAlign: 'center'
            }}
          >
            ¿Desea confirmar esta acción y realizar el abono?
          </Typography>

          <Box
            sx={{
              mt: 2,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 1
            }}
          >
            <Box
              sx={{
                border: '1px solid #c8e6c9',
                borderRadius: '6px',
                p: 1,
                backgroundColor: '#f1f8e9',
                textAlign: 'center'
              }}
            >
              <Typography
                sx={{
                  fontSize: '10px',
                  color: '#558b2f',
                  fontWeight: 700
                }}
              >
                Monto a abonar
              </Typography>

              <Typography
                sx={{
                  mt: 0.35,
                  fontSize: '14px',
                  color: '#1b5e20',
                  fontWeight: 800
                }}
              >
                ${montoAbonoAplicable.toLocaleString('es-CL')}
              </Typography>
            </Box>

            <Box
              sx={{
                border: '1px solid #bbdefb',
                borderRadius: '6px',
                p: 1,
                backgroundColor: '#f3f8fc',
                textAlign: 'center'
              }}
            >
              <Typography
                sx={{
                  fontSize: '10px',
                  color: '#1565c0',
                  fontWeight: 700
                }}
              >
                Nuevo total abonado
              </Typography>

              <Typography
                sx={{
                  mt: 0.35,
                  fontSize: '14px',
                  color: '#003366',
                  fontWeight: 800
                }}
              >
                ${nuevoTotalAbonadoPreview.toLocaleString('es-CL')}
              </Typography>
            </Box>
          </Box>

          <Typography
            sx={{
              mt: 1.5,
              fontSize: '10.5px',
              color: '#607d8b',
              textAlign: 'center'
            }}
          >
            Saldo restante: ${saldoRestantePreview.toLocaleString('es-CL')}
          </Typography>
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
            color="success"
            disabled={guardandoAbono}
            onClick={confirmarAbonoOT}
            sx={{
              minWidth: 110,
              textTransform: 'none',
              fontWeight: 700
            }}
          >
            {guardandoAbono ? (
              <>
                <CircularProgress
                  size={14}
                  sx={{
                    mr: 0.75,
                    color: '#ffffff'
                  }}
                />
                Guardando
              </>
            ) : (
              'Confirmar'
            )}
          </Button>

          <Button
            variant="outlined"
            size="small"
            onClick={() => setConfirmarAccionAbono(false)}
            sx={{
              minWidth: 100,
              textTransform: 'none',
              fontWeight: 700,
              borderColor: '#9e9e9e',
              color: '#333333',
              '&:hover': {
                borderColor: '#757575',
                backgroundColor: '#f5f5f5'
              }
            }}
          >
            Cancelar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={modalActualizarAbono}
        onClose={cerrarActualizarAbono}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '14px',
            overflow: 'hidden',
            boxShadow: '0 18px 48px rgba(15, 54, 88, 0.24)'
          }
        }}
      >
        <DialogTitle
          sx={{
            background: 'linear-gradient(135deg, #0d5fa6 0%, #1976d2 100%)',
            color: '#ffffff',
            py: 1.45,
            px: 2.25
          }}
        >
          <Typography
            sx={{
              fontSize: '15px',
              fontWeight: 800,
              lineHeight: 1.2
            }}
          >
            Actualizar abono de la O.T.
          </Typography>
          <Typography
            sx={{
              mt: 0.35,
              fontSize: '10.5px',
              color: 'rgba(255,255,255,0.82)',
              fontWeight: 500
            }}
          >
            Corrija el total abonado sin modificar los demás datos de la orden.
          </Typography>
        </DialogTitle>

        <DialogContent
          sx={{
            pt: '24px !important',
            pb: 1.5,
            px: { xs: 2, sm: 2.5 },
            backgroundColor: '#fbfdff'
          }}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 1.1,
              mb: 2
            }}
          >
            <Box
              sx={{
                border: '1px solid #c8e6c9',
                borderRadius: '10px',
                p: 1.15,
                textAlign: 'center',
                backgroundColor: '#f5fbf6'
              }}
            >
              <Typography
                sx={{
                  fontSize: '10px',
                  color: '#4f6f55',
                  fontWeight: 700
                }}
              >
                Abonado actual
              </Typography>

              <Typography
                sx={{
                  mt: 0.35,
                  fontSize: '16px',
                  fontWeight: 900,
                  color: '#1b7a32',
                  fontVariantNumeric: 'tabular-nums'
                }}
              >
                ${abonadoActual.toLocaleString('es-CL')}
              </Typography>
            </Box>

            <Box
              sx={{
                border: '1px solid #bbdefb',
                borderRadius: '10px',
                p: 1.15,
                textAlign: 'center',
                backgroundColor: '#f3f8fd'
              }}
            >
              <Typography
                sx={{
                  fontSize: '10px',
                  color: '#4f6b83',
                  fontWeight: 700
                }}
              >
                Total O.T.
              </Typography>

              <Typography
                sx={{
                  mt: 0.35,
                  fontSize: '16px',
                  fontWeight: 900,
                  color: '#0d4f88',
                  fontVariantNumeric: 'tabular-nums'
                }}
              >
                ${totalOrdenAbono.toLocaleString('es-CL')}
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              border: '1px solid #d9e5ef',
              borderRadius: '10px',
              p: 1.4,
              backgroundColor: '#ffffff'
            }}
          >
            <Typography
              sx={{
                mb: 0.8,
                fontSize: '11px',
                fontWeight: 800,
                color: '#314b62'
              }}
            >
              Nuevo total abonado
            </Typography>

            <TextField
              fullWidth
              size="small"
              autoFocus
              value={montoActualizarAbono}
              onChange={(e) => {
                setMontoActualizarAbono(
                  e.target.value.replace(
                    /[^0-9]/g,
                    ''
                  )
                );
                setErrorActualizarAbono('');
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Typography sx={{ fontWeight: 800, color: '#46657f' }}>$</Typography>
                  </InputAdornment>
                )
              }}
              inputProps={{
                inputMode: 'numeric',
                style: {
                  textAlign: 'right',
                  fontWeight: 800,
                  fontSize: '14px'
                }
              }}
              placeholder="Ingrese el total correcto"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                  backgroundColor: '#ffffff'
                }
              }}
            />

            {errorActualizarAbono && (
              <Typography
                sx={{
                  mt: 0.9,
                  color: '#c62828',
                  fontSize: '10.5px',
                  fontWeight: 700
                }}
              >
                {errorActualizarAbono}
              </Typography>
            )}

            <Button
              variant="outlined"
              color="error"
              size="small"
              fullWidth
              disabled={guardandoAbono}
              onClick={dejarAbonoEnCero}
              sx={{
                mt: 1.2,
                minHeight: '34px',
                textTransform: 'none',
                fontSize: '10.5px',
                fontWeight: 800,
                borderRadius: '8px',
                borderColor: '#ef9a9a',
                backgroundColor: '#fffafa',
                '&:hover': {
                  borderColor: '#d32f2f',
                  backgroundColor: '#fff1f1'
                }
              }}
            >
              Dejar abonado en $0
            </Button>
          </Box>

          <Box
            sx={{
              mt: 1.25,
              px: 1.25,
              py: 1,
              borderRadius: '8px',
              backgroundColor: '#eef6fd',
              border: '1px solid #d0e4f5'
            }}
          >
            <Typography
              sx={{
                color: '#46657f',
                fontSize: '10px',
                lineHeight: 1.5,
                textAlign: 'center'
              }}
            >
              <strong>Aplicar</strong> cambia el valor en pantalla. Después debe presionar
              <strong> Guardar</strong> para registrarlo definitivamente en la base de datos.
            </Typography>
          </Box>
        </DialogContent>

        <DialogActions
          sx={{
            px: 2.5,
            pb: 2,
            pt: 1,
            justifyContent: 'center',
            gap: 1,
            backgroundColor: '#fbfdff'
          }}
        >
          <Button
            variant="contained"
            size="small"
            disabled={guardandoAbono}
            onClick={confirmarActualizarAbono}
            sx={{
              minWidth: 115,
              minHeight: '34px',
              borderRadius: '8px',
              backgroundColor: '#1565c0',
              textTransform: 'none',
              fontWeight: 800,
              boxShadow: 'none',
              '&:hover': {
                backgroundColor: '#0d47a1',
                boxShadow: '0 4px 10px rgba(21, 101, 192, 0.2)'
              }
            }}
          >
            Aplicar
          </Button>

          <Button
            variant="outlined"
            size="small"
            disabled={guardandoAbono}
            onClick={cerrarActualizarAbono}
            sx={{
              minWidth: 115,
              minHeight: '34px',
              borderRadius: '8px',
              textTransform: 'none',
              fontWeight: 700,
              borderColor: '#aab7c2',
              color: '#455a64',
              backgroundColor: '#ffffff',
              '&:hover': {
                borderColor: '#78909c',
                backgroundColor: '#f7f9fa'
              }
            }}
          >
            Cancelar
          </Button>
        </DialogActions>
      </Dialog>

      {/* =========================================================
          CONFIRMAR ELIMINACIÓN DEL ABONO / DEJAR EN $0
          ========================================================= */}
      <Dialog
        open={confirmarEliminarAbono}
        onClose={cancelarEliminarAbonoEnCero}
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
            background: 'linear-gradient(135deg, #b71c1c 0%, #d32f2f 100%)',
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: 800,
            py: 1.3,
            px: 2
          }}
        >
          Confirmar abono en $0
        </DialogTitle>

        <DialogContent
          sx={{
            pt: '28px !important',
            pb: 1.5,
            px: 3,
            textAlign: 'center'
          }}
        >
          <Box
            sx={{
              p: 1.5,
              borderRadius: '10px',
              border: '1px solid #ffcdd2',
              backgroundColor: '#fff6f6'
            }}
          >
            <Typography
              sx={{
                fontSize: '12.5px',
                color: '#4e2a2a',
                fontWeight: 700,
                lineHeight: 1.55,
                textAlign: 'center'
              }}
            >
              ¿Está seguro de que desea dejar el total abonado de esta O.T. en $0?
            </Typography>

            <Typography
              sx={{
                mt: 1,
                fontSize: '13px',
                color: '#b71c1c',
                textAlign: 'center',
                fontWeight: 800
              }}
            >
              Abonado actual: ${Number(abonadoActual || 0).toLocaleString('es-CL')}
            </Typography>
          </Box>

          <Typography
            sx={{
              mt: 1.1,
              fontSize: '10px',
              color: '#78909c',
              lineHeight: 1.5,
              textAlign: 'center'
            }}
          >
            Este paso todavía no modifica la base de datos. Después deberá usar el botón Guardar.
          </Typography>
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            pb: 2,
            pt: 0.75,
            justifyContent: 'center',
            gap: 1.5
          }}
        >
          {/* CONFIRMAR A LA IZQUIERDA */}
          <Button
            variant="contained"
            color="error"
            size="small"
            disabled={guardandoAbono}
            onClick={confirmarEliminarAbonoEnCero}
            sx={{
              minWidth: 105,
              textTransform: 'none',
              fontWeight: 700
            }}
          >
            Confirmar
          </Button>

          {/* CANCELAR A LA DERECHA */}
          <Button
            variant="outlined"
            size="small"
            disabled={guardandoAbono}
            onClick={cancelarEliminarAbonoEnCero}
            sx={{
              minWidth: 105,
              textTransform: 'none',
              fontWeight: 700,
              borderColor: '#9e9e9e',
              color: '#333333',
              '&:hover': {
                borderColor: '#757575',
                backgroundColor: '#f5f5f5'
              }
            }}
          >
            Cancelar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={confirmarLimpiarAbono}
        onClose={() => {
          if (!guardandoAbono) {
            setConfirmarLimpiarAbono(false);
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
            backgroundColor: '#d32f2f',
            color: '#ffffff',
            fontSize: '15px',
            fontWeight: 700,
            py: 1.25,
            px: 2
          }}
        >
          Limpiar abono
        </DialogTitle>

        <DialogContent
          sx={{
            pt: '30px !important',
            pb: 2,
            px: 3,
            textAlign: 'center'
          }}
        >
          <Typography
            sx={{
              fontSize: '13px',
              color: '#222222',
              fontWeight: 600,
              lineHeight: 1.6,
              textAlign: 'center'
            }}
          >
            ¿Está seguro de reiniciar el Abonado OT a $0?
          </Typography>

          <Typography
            sx={{
              mt: 1.25,
              fontSize: '11px',
              color: '#607d8b',
              textAlign: 'center'
            }}
          >
            Actualmente hay ${abonadoActual.toLocaleString('es-CL')} abonados.
            Después podrá ingresar nuevamente el monto o porcentaje correcto.
          </Typography>
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            pb: 2,
            pt: 0.75,
            display: 'flex',
            justifyContent: 'center',
            gap: 1.5
          }}
        >
          <Button
            variant="contained"
            color="error"
            size="small"
            disabled={guardandoAbono}
            onClick={confirmarLimpiezaAbono}
            sx={{
              minWidth: 105,
              textTransform: 'none',
              fontWeight: 700
            }}
          >
            {guardandoAbono
              ? 'Guardando...'
              : 'Confirmar'}
          </Button>

          <Button
            variant="outlined"
            size="small"
            disabled={guardandoAbono}
            onClick={() =>
              setConfirmarLimpiarAbono(false)
            }
            sx={{
              minWidth: 105,
              textTransform: 'none',
              fontWeight: 700,
              borderColor: '#9e9e9e',
              color: '#333333'
            }}
          >
            Cancelar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(detalleAEliminar)}
        onClose={() => setDetalleAEliminar(null)}
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
            backgroundColor: '#d32f2f',
            color: '#ffffff',
            fontSize: '15px',
            fontWeight: 700,
            py: 1.25,
            px: 2
          }}
        >
          Confirmar eliminación
        </DialogTitle>

        <DialogContent
          sx={{
            pt: '30px !important',
            pb: 2,
            px: 3,
            textAlign: 'center'
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
            ¿Está seguro de eliminar el producto "
            {detalleAEliminar?.Descripcion ||
              detalleAEliminar?.Codigo ||
              ''}"?
          </Typography>
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
            onClick={confirmarEliminacionDetalle}
            sx={{
              minWidth: 95,
              backgroundColor: '#d32f2f',
              color: '#ffffff',
              textTransform: 'none',
              fontWeight: 700,
              '&:hover': {
                backgroundColor: '#b71c1c'
              }
            }}
          >
            Aceptar
          </Button>

          <Button
            variant="outlined"
            size="small"
            onClick={() => setDetalleAEliminar(null)}
            sx={{
              minWidth: 95,
              textTransform: 'none',
              fontWeight: 700,
              borderColor: '#9e9e9e',
              color: '#333333',
              '&:hover': {
                borderColor: '#757575',
                backgroundColor: '#f5f5f5'
              }
            }}
          >
            Cancelar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmarGuardar} onClose={() => setConfirmarGuardar(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Confirmación</DialogTitle>
        <DialogContent>
          <Typography variant="body2">¿Desea guardar este documento?</Typography>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" color="success" onClick={async () => { setConfirmarGuardar(false); await GuardarOrden(); }}>Sí</Button>
          <Button variant="outlined" onClick={() => setConfirmarGuardar(false)}>No</Button>
        </DialogActions>
      </Dialog>

      {/* =========================================================
          CONFIRMACIÓN ANTES DE GUARDAR EL ABONO
          ========================================================= */}
      <Dialog
        open={confirmarGuardarAbono}
        onClose={() => {
          if (!guardandoAbono) {
            setConfirmarGuardarAbono(false);
          }
        }}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '7px',
            overflow: 'hidden'
          }
        }}
      >
        <DialogTitle
          sx={{
            backgroundColor: '#1976d2',
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: 700,
            py: 1,
            px: 2
          }}
        >
          Confirmar actualización
        </DialogTitle>

        <DialogContent
          sx={{
            pt: '28px !important',
            pb: 1.5,
            px: 3,
            textAlign: 'center'
          }}
        >
          <Typography
            sx={{
              fontSize: '13px',
              color: '#222222',
              fontWeight: 600,
              textAlign: 'center',
              lineHeight: 1.6
            }}
          >
            ¿Está seguro que desea guardar esta actualización del abono en la base de datos?
          </Typography>

          <Typography
            sx={{
              mt: 1.25,
              fontSize: '14px',
              color: '#1565c0',
              fontWeight: 800,
              textAlign: 'center'
            }}
          >
            Nuevo total abonado: $
            {Number(
              valorAbonoPendiente !== null
                ? valorAbonoPendiente
                : (valores.AbonadoOT || 0)
            ).toLocaleString('es-CL')}
          </Typography>
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            pb: 2,
            pt: 0.75,
            display: 'flex',
            justifyContent: 'center',
            gap: 1.5
          }}
        >
          {/* SÍ A LA IZQUIERDA */}
          <Button
            variant="contained"
            color="success"
            size="small"
            disabled={guardandoAbono}
            onClick={async () => {
              setConfirmarGuardarAbono(false);
              await guardarAbonoActualEnBD();
            }}
            sx={{
              minWidth: 90,
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '11px'
            }}
          >
            {guardandoAbono ? 'Guardando...' : 'Sí'}
          </Button>

          {/* NO A LA DERECHA */}
          <Button
            variant="outlined"
            size="small"
            disabled={guardandoAbono}
            onClick={() => setConfirmarGuardarAbono(false)}
            sx={{
              minWidth: 90,
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '11px',
              borderColor: '#9e9e9e',
              color: '#333333',
              '&:hover': {
                borderColor: '#757575',
                backgroundColor: '#f5f5f5'
              }
            }}
          >
            No
          </Button>
        </DialogActions>
      </Dialog>

      {/* =========================================================
          ALERTA DE ÉXITO - ABONO GUARDADO
          ========================================================= */}
      <Dialog
        open={alertaAbonoGuardado.abierto}
        onClose={() =>
          setAlertaAbonoGuardado({
            abierto: false,
            total: 0
          })
        }
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '7px',
            overflow: 'hidden'
          }
        }}
      >
        <DialogTitle
          sx={{
            backgroundColor: '#2e7d32',
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: 700,
            py: 1,
            px: 2
          }}
        >
          Abono guardado
        </DialogTitle>

        <DialogContent
          sx={{
            pt: '26px !important',
            pb: 1.5,
            px: 3,
            textAlign: 'center'
          }}
        >
          <Typography
            sx={{
              fontSize: '13px',
              color: '#222222',
              fontWeight: 600,
              textAlign: 'center',
              lineHeight: 1.6
            }}
          >
            El abono se ha guardado correctamente.
          </Typography>

          <Typography
            sx={{
              mt: 1.25,
              fontSize: '14px',
              color: '#1b5e20',
              fontWeight: 800,
              textAlign: 'center'
            }}
          >
            Total abonado: $
            {Number(
              alertaAbonoGuardado.total || 0
            ).toLocaleString('es-CL')}
          </Typography>
        </DialogContent>

        <DialogActions
          sx={{
            px: 2,
            pb: 1.5,
            pt: 0.5,
            justifyContent: 'flex-end'
          }}
        >
          <Button
            variant="contained"
            color="success"
            size="small"
            onClick={() =>
              setAlertaAbonoGuardado({
                abierto: false,
                total: 0
              })
            }
            sx={{
              minWidth: 82,
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '11px'
            }}
          >
            Aceptar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={modalBuscar.abierto}
        onClose={() => { setModalBuscar({ abierto: false, tipo: '', titulo: '' }); setFiltroTexto(''); setDatosBusqueda([]); }}
        fullWidth
        maxWidth={
          (modalBuscar.tipo === 'producto' || modalBuscar.tipo === 'productosBD')
            ? 'lg'
            : 'md'
        }
        PaperProps={{
          elevation: 8,
          sx: {
            borderRadius: modalBuscar.tipo === 'cliente' ? { xs: '12px', sm: '16px' } : '12px',
            overflow: 'hidden',
            width: modalBuscar.tipo === 'cliente' ? { xs: 'calc(100% - 20px)', sm: '680px' } : 'auto',
            maxWidth: '100%',
            maxHeight: modalBuscar.tipo === 'cliente' ? { xs: '92vh', sm: '82vh' } : '90vh'
          }
        }}
      >
        <DialogTitle
          sx={{
            background: modalBuscar.tipo === 'cliente'
              ? 'linear-gradient(135deg, #003366 0%, #005ba8 100%)'
              : '#003366',
            color: '#ffffff',
            py: modalBuscar.tipo === 'cliente' ? { xs: 1.5, sm: 1.75 } : 1.5,
            px: modalBuscar.tipo === 'cliente' ? { xs: 1.75, sm: 2.5 } : 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                fontSize: modalBuscar.tipo === 'cliente' ? { xs: '16px', sm: '18px' } : '16px',
                lineHeight: 1.2
              }}
            >
              {modalBuscar.titulo || 'Búsqueda'}
            </Typography>

            {modalBuscar.tipo === 'cliente' && (
              <Typography
                sx={{
                  mt: 0.35,
                  fontSize: { xs: '10.5px', sm: '11.5px' },
                  color: 'rgba(255,255,255,0.82)'
                }}
              >
                Busca y selecciona el cliente para la Orden de Trabajo
              </Typography>
            )}
          </Box>

          <IconButton
            onClick={() => { setModalBuscar({ abierto: false, tipo: '', titulo: '' }); setFiltroTexto(''); setDatosBusqueda([]); }}
            sx={{
              color: '#fff',
              ml: 1,
              backgroundColor: modalBuscar.tipo === 'cliente' ? 'rgba(255,255,255,0.10)' : 'transparent',
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.20)'
              }
            }}
            size="small"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent
          dividers
          sx={{
            minHeight: modalBuscar.tipo === 'cliente' ? { xs: '420px', sm: '460px' } : '380px',
            p: modalBuscar.tipo === 'cliente' ? { xs: 1.5, sm: 2.25 } : { xs: 1.5, sm: 2.5 },
            backgroundColor: modalBuscar.tipo === 'cliente' ? '#f5f8fb' : '#f8fafc'
          }}
        >
          <Box sx={{ mb: modalBuscar.tipo === 'cliente' ? 1.5 : 2 }}>
            <TextField
              fullWidth
              size="small"
              autoFocus={modalBuscar.tipo === 'cliente'}
              placeholder={
                modalBuscar.tipo === 'productosBD'
                  ? "Buscar por RUT, cliente, descripción o N° O.T..."
                  : modalBuscar.tipo === 'producto'
                    ? "Escriba para filtrar por código o descripción exactos..."
                    : "Buscar por nombre, razón social o RUT..."
              }
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon
                        sx={{
                          color: modalBuscar.tipo === 'cliente' ? '#0066b3' : '#003366',
                          fontSize: modalBuscar.tipo === 'cliente' ? 21 : 20
                        }}
                      />
                    </InputAdornment>
                  )
                }
              }}
              sx={{
                backgroundColor: '#fff',
                borderRadius: modalBuscar.tipo === 'cliente' ? '10px' : '6px',
                '& .MuiOutlinedInput-root': modalBuscar.tipo === 'cliente'
                  ? {
                      minHeight: 42,
                      borderRadius: '10px',
                      boxShadow: '0 2px 8px rgba(0, 51, 102, 0.06)',
                      '& fieldset': {
                        borderColor: '#c9d6e3'
                      },
                      '&:hover fieldset': {
                        borderColor: '#6c9dcc'
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#0066b3',
                        borderWidth: '1.5px'
                      }
                    }
                  : {}
              }}
            />

            {modalBuscar.tipo === 'cliente' && !cargandoModal && (
              <Box
                sx={{
                  mt: 1,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 1,
                  flexWrap: 'wrap'
                }}
              >
                <Typography
                  sx={{
                    fontSize: '11px',
                    color: '#64748b'
                  }}
                >
                  {filtroTexto.trim()
                    ? `Resultados para "${filtroTexto.trim()}"`
                    : 'Clientes disponibles'}
                </Typography>

                <Chip
                  size="small"
                  label={`${datosVisibles.length} resultado${datosVisibles.length === 1 ? '' : 's'}`}
                  sx={{
                    height: 22,
                    backgroundColor: '#e6f0f8',
                    color: '#005b9f',
                    fontSize: '10.5px',
                    fontWeight: 700
                  }}
                />
              </Box>
            )}
          </Box>

          {cargandoModal ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 6 }}>
              <CircularProgress size={36} sx={{ color: '#003366' }} />
            </Box>
          ) : (modalBuscar.tipo === 'producto' || modalBuscar.tipo === 'productosBD') ? (
            <TableContainer component={Paper} elevation={1} sx={{ overflowX: 'auto', width: '100%', borderRadius: '8px' }}>
              <Table size="small" sx={{ minWidth: 600 }}>
                <TableHead sx={{ backgroundColor: '#f0f4f8' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', color: '#003366', width: '50px' }}>Nro</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: '#003366', width: '130px' }}>
                      {modalBuscar.tipo === 'productosBD' ? 'RUT' : 'Código'}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: '#003366' }}>Descripción</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', color: '#003366', width: '80px' }}>Stock</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', color: '#003366', width: '100px' }}>Neto</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', color: '#003366', width: '100px' }}>Bruto</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', color: '#003366', width: '100px' }}>Seleccionar</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {datosVisibles.map((item, idx) => {
                    const netoVal = parseFloat(item.Neto || item.neto || item.precio || 0);
                    const brutoVal = Math.round(netoVal * 1.19);
                    const descText = item.descripcion || item.nombre || item.Descripcion || 'Sin Descripción';
                    const stockVal = item.Stock ?? item.stock ?? 0;

                    return (
                      <TableRow key={item.id || item.Id || idx} hover sx={{ '&:nth-of-type(even)': { backgroundColor: '#fcfcfc' } }}>
                        <TableCell sx={{ color: '#666', fontSize: '12px' }}>{idx + 1}</TableCell>
                        <TableCell sx={{ color: '#0056b3', fontWeight: 600, fontFamily: 'monospace', fontSize: '12px' }}>
                          {modalBuscar.tipo === 'productosBD'
                            ? (item.rut || item.RUT || item.Rut || '--')
                            : (item.codigo || item.Codigo || '--')}
                        </TableCell>
                        <TableCell sx={{ fontSize: '13px', fontWeight: 500 }}>{descText}</TableCell>
                        <TableCell align="center">
                          <Chip
                            label={stockVal}
                            size="small"
                            sx={{
                              height: '20px',
                              fontSize: '11px',
                              fontWeight: 'bold',
                              backgroundColor: stockVal > 0 ? '#e8f5e9' : '#ffebee',
                              color: stockVal > 0 ? '#2e7d32' : '#c62828'
                            }}
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: '12px' }}>${netoVal.toLocaleString('es-CL')}</TableCell>
                        <TableCell align="right" sx={{ fontSize: '12px', fontWeight: 'bold' }}>${brutoVal.toLocaleString('es-CL')}</TableCell>
                        <TableCell align="center">
                          <Button
                            size="small"
                            variant="contained"
                            disableElevation
                            onClick={() => handleSeleccionarElemento(item)}
                            sx={{
                              minWidth: '32px',
                              px: 1,
                              py: 0.2,
                              backgroundColor: '#003366',
                              textTransform: 'none',
                              fontSize: '11px',
                              '&:hover': { backgroundColor: '#002244' }
                            }}
                          >
                            Elegir
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {datosBusqueda.length === 0 && (
                <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>
                  No se encontraron registros.
                </Typography>
              )}
            </TableContainer>
          ) : 
          (
           
             <TableContainer component={Paper} elevation={1} sx={{ overflowX: 'auto', width: '100%', borderRadius: '8px' }}>
              <Table size="small" sx={{ minWidth: 600 }}>
                <TableHead sx={{ backgroundColor: '#f0f4f8' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', color: '#003366', width: '50px' }}>Nro</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: '#003366', width: '120px' }}>Rut</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: '#003366' }}>Razon Social</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', color: '#003366', width: '100px' }}>Seleccionar</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {datosVisibles.map((item, idx) => {
             
                      const primario = item.nombre || item.Nombre || item.Descripcion || item.Codigo || 'Sin Nombre';
                const codigoCliente = item.codigo || item.Codigo || '';
                const secundario = codigoCliente
                  ? `Código/RUT: ${codigoCliente}`
                  : item.cargo || item.Cargo || '';

                const inicial = String(primario || '?')
                  .trim()
                  .charAt(0)
                  .toUpperCase();

                    return (
                      <TableRow key={item.id || item.Id || idx} hover sx={{ '&:nth-of-type(even)': { backgroundColor: '#fcfcfc' } }}>
                        <TableCell sx={{ color: '#666', fontSize: '12px' }}>{idx + 1}</TableCell>
                        <TableCell sx={{ color: '#0056b3', fontWeight: 600, fontFamily: 'monospace', fontSize: '12px' }}>
                          {item.rut || item.RUT || item.Rut || item.codigo || item.Codigo || '--'}
                        </TableCell>
                        <TableCell sx={{ fontSize: '13px', fontWeight: 500 }}>{primario}</TableCell>
                        <TableCell align="center">
                          <Button
                            size="small"
                            variant="contained"
                            disableElevation
                            onClick={() => handleSeleccionarElemento(item)}
                            sx={{
                              minWidth: '32px',
                              px: 1,
                              py: 0.2,
                              backgroundColor: '#003366',
                              textTransform: 'none',
                              fontSize: '11px',
                              '&:hover': { backgroundColor: '#002244' }
                            }}
                          >
                            Elegir
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {datosBusqueda.length === 0 && (
                <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>
                  No se encontraron registros.
                </Typography>
              )}
            </TableContainer>
           
             
          )}
        </DialogContent>

        <DialogActions
          sx={{
            px: modalBuscar.tipo === 'cliente' ? { xs: 1.5, sm: 2.25 } : 2,
            py: modalBuscar.tipo === 'cliente' ? 1.25 : 1.5,
            backgroundColor: '#ffffff',
            borderTop: modalBuscar.tipo === 'cliente' ? '1px solid #e3eaf0' : 'none'
          }}
        >
          <Button
            onClick={() => { setModalBuscar({ abierto: false, tipo: '', titulo: '' }); setFiltroTexto(''); setDatosBusqueda([]); }}
            color="inherit"
            size="small"
            sx={
              modalBuscar.tipo === 'cliente'
                ? {
                    minWidth: 90,
                    border: '1px solid #cbd5df',
                    borderRadius: '7px',
                    textTransform: 'none',
                    fontWeight: 700,
                    fontSize: '11.5px',
                    color: '#40566b',
                    '&:hover': {
                      backgroundColor: '#f3f6f8',
                      borderColor: '#9fb4c7'
                    }
                  }
                : {}
            }
          >
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
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
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import OrdenTrabajoServicio from '../../apiservicios/servicio.ordentrabajo';
import DTODetalleOrden from "../../dto/DTODetalleOrden.js";
import DTOImagenOrden from "../../dto/DTOImagenOrden.js";
import InformeEncargadosOT from './InformeEncargadosOT';

const BASE_API_URL = process.env.REACT_APP_API_URL || 'http://localhost/apichess';

const obtenerHostAPIOrdenTrabajo = () => {
  if (typeof window === 'undefined') return '192.168.1.20';

  const host = String(window.location?.hostname || '').trim();

  if (!host || host === 'localhost' || host === '127.0.0.1') {
    return '192.168.1.20';
  }

  return host;
};

const normalizarBaseAPIOrdenTrabajo = (url) =>
  String(url || '').trim().replace(/\/$/, '');

const API_ORDEN_TRABAJO =
  process.env.REACT_APP_ORDEN_TRABAJO_API_URL ||
  `http://${obtenerHostAPIOrdenTrabajo()}/Api/api/OrdenTrabajo`;

const API_ORDEN_TRABAJO_DEV =
  process.env.REACT_APP_ORDEN_TRABAJO_API_DEV_URL ||
  'https://localhost:44351/api/OrdenTrabajo';

const API_ORDEN_TRABAJO_PREFERIDA_KEY = 'OT_API_ORDEN_TRABAJO_PREFERIDA_V1';

const obtenerBaseAPIOrdenTrabajoPreferida = () => {
  if (typeof window === 'undefined') return '';

  try {
    return normalizarBaseAPIOrdenTrabajo(
      sessionStorage.getItem(API_ORDEN_TRABAJO_PREFERIDA_KEY)
    );
  } catch (_) {
    return '';
  }
};

const guardarBaseAPIOrdenTrabajoPreferida = (base) => {
  if (typeof window === 'undefined') return;

  const normalizada = normalizarBaseAPIOrdenTrabajo(base);
  if (!normalizada) return;

  try {
    sessionStorage.setItem(
      API_ORDEN_TRABAJO_PREFERIDA_KEY,
      normalizada
    );
  } catch (_) {}
};

const obtenerBasesAPIOrdenTrabajo = () =>
  [...new Set([
    obtenerBaseAPIOrdenTrabajoPreferida(),
    API_ORDEN_TRABAJO,
    API_ORDEN_TRABAJO_DEV
  ].map(normalizarBaseAPIOrdenTrabajo).filter(Boolean))];
const esEstadoAnulado = (estado) => ['ANULADA', 'ANULADO'].includes(
  String(estado ?? '').trim().toUpperCase()
);

const listaOpcionesOT = ['DESPACHADO', 'EMPAQUE', 'ENTREGADO', 'LABORATORIO'];
const opcionesVendedores = ['PAUL CELERY', 'VALENZUELA G. XIMENA', 'RAUL CASTILLO'];

const listadoBodegasInicial = [
  { id: 1, nombre: 'Bodega Central' },
  { id: 2, nombre: 'Bodega Norte' },
  { id: 3, nombre: 'Bodega Repuestos' }
];

const detallesTemporalesPorOT = new Map();
const DETALLES_ELIMINADOS_STORAGE_KEY = 'OT_DETALLES_ELIMINADOS_VISUAL_V1';

const CLAVE_OT_COMPARTIDA = 'cartolaOT_orden_compartida';
const CLAVE_BLOQUEO_CARTOLA_GENERAR = 'generarOT_bloqueo_cartola';


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
  const limpiezaManualRef = useRef(false);
  const omitirAutocargaInicialRef = useRef(true);
  const idRegistroBDRef = useRef('');
  const [idOTExistenteConfirmada, setIdOTExistenteConfirmada] = useState(0);

  const idRegistroBDActual = obtenerIdPositivo(
    idOTExistenteConfirmada,
    idRegistroBDRef.current,
    valores.IdRegistroBD,
    valores.idRegistroBD
  );

  const idOTExistente = idRegistroBDActual;
  const esEdicionOTExistente = idOTExistente > 0;

  const [imagenes] = useState([]);
  const [confirmarGuardar, setConfirmarGuardar] = useState(false);
  const [procesandoGuardado, setProcesandoGuardado] = useState(false);

  const [confirmarAnulacion, setConfirmarAnulacion] = useState(false);
  const [anulandoOT, setAnulandoOT] = useState(false);
  const [errorAnulacion, setErrorAnulacion] = useState('');
  const [mensajeAnulacion, setMensajeAnulacion] = useState('');

  const [soloLecturaCartola, setSoloLecturaCartola] = useState(false);

  const [detalleAEliminar, setDetalleAEliminar] = useState(null);
  const [eliminandoDetalle, setEliminandoDetalle] = useState(false);
  const [errorEliminacionDetalle, setErrorEliminacionDetalle] = useState('');
  const [modalAbono, setModalAbono] = useState(false);
  const [montoAbono, setMontoAbono] = useState('');
  const [errorAbono, setErrorAbono] = useState('');
  const [confirmarAccionAbono, setConfirmarAccionAbono] = useState(false);
  const [confirmarLimpiarAbono, setConfirmarLimpiarAbono] = useState(false);
  const [guardandoAbono, setGuardandoAbono] = useState(false);

  const [modalActualizarAbono, setModalActualizarAbono] = useState(false);
  const [montoActualizarAbono, setMontoActualizarAbono] = useState('');
  const [errorActualizarAbono, setErrorActualizarAbono] = useState('');

  const [confirmarEliminarAbono, setConfirmarEliminarAbono] = useState(false);

  const [abonoPendienteGuardar, setAbonoPendienteGuardar] = useState(false);

  const [valorAbonoPendiente, setValorAbonoPendiente] = useState(null);

  const [confirmarGuardarAbono, setConfirmarGuardarAbono] = useState(false);

  const [alertaAbonoGuardado, setAlertaAbonoGuardado] = useState({
    abierto: false,
    total: 0
  });

  const [errores, setErrores] = useState({});

  const [modalBuscar, setModalBuscar] = useState({ abierto: false, tipo: '', titulo: '' });

  const [informeEncargadosAbierto, setInformeEncargadosAbierto] = useState(false);

  const [portalBuscarEncargado, setPortalBuscarEncargado] = useState(null);

  const [filtroTexto, setFiltroTexto] = useState('');
  const [datosBusqueda, setDatosBusqueda] = useState([]);
  const [cargandoModal, setCargandoModal] = useState(false);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    let portalHost = null;
    let intentos = 0;

    const ubicarBotonSobrePestanas = () => {
      const tabsPrincipal = document.querySelector('.MuiTabs-root');
      const contenedorTabs = tabsPrincipal?.parentElement;
      const contenedorGeneral = contenedorTabs?.parentElement;

      if (!tabsPrincipal || !contenedorTabs || !contenedorGeneral) {
        intentos += 1;
        if (intentos < 20) {
          window.setTimeout(ubicarBotonSobrePestanas, 100);
        }
        return;
      }

      portalHost = document.createElement('div');
      portalHost.setAttribute('data-buscar-encargado-superior', 'true');
      portalHost.style.width = '100%';
      portalHost.style.boxSizing = 'border-box';

      contenedorGeneral.insertBefore(portalHost, contenedorTabs);
      setPortalBuscarEncargado(portalHost);
    };

    ubicarBotonSobrePestanas();

    return () => {
      setPortalBuscarEncargado(null);

      if (portalHost?.parentNode) {
        portalHost.parentNode.removeChild(portalHost);
      }
    };
  }, []);

  const [modalPDF, setModalPDF] = useState({
    abierto: false,
    url: '',
    nombre: ''
  });
  const [generandoPDF, setGenerandoPDF] = useState(false);
  const pdfIframeRef = useRef(null);
  const pdfUrlActualRef = useRef('');

  const cerrarVistaPDF = useCallback(() => {
    setModalPDF({
      abierto: false,
      url: '',
      nombre: ''
    });

    if (pdfUrlActualRef.current) {
      URL.revokeObjectURL(pdfUrlActualRef.current);
      pdfUrlActualRef.current = '';
    }
  }, []);

  const imprimirPDFVisualizado = useCallback(() => {
    try {
      const frame = pdfIframeRef.current;

      if (frame?.contentWindow) {
        frame.contentWindow.focus();
        frame.contentWindow.print();
        return;
      }

      alert('El visor PDF todavía no está listo. Intente nuevamente.');
    } catch (error) {
      console.error('[OT PDF] No fue posible imprimir desde el visor:', error);
      alert('No fue posible abrir la impresión del PDF. Use el botón de impresión del visor.');
    }
  }, []);

  useEffect(() => {
    return () => {
      if (pdfUrlActualRef.current) {
        URL.revokeObjectURL(pdfUrlActualRef.current);
        pdfUrlActualRef.current = '';
      }
    };
  }, []);

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
    if (limpiezaManualRef.current || valores.IdOrden) return;

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

  const pdfTexto = (valor) =>
    String(valor ?? '').trim();

  const pdfNumero = (valor) => {
    const limpio = String(valor ?? '')
      .replace(/\./g, '')
      .replace(/,/g, '.')
      .replace(/[^0-9.-]/g, '');

    const numero = Number(limpio);
    return Number.isFinite(numero) ? numero : 0;
  };

  const pdfDinero = (valor) => {
    const numero = Math.round(pdfNumero(valor));
    return `$${numero.toLocaleString('es-CL')}`;
  };

  const pdfFecha = (valor, incluirDia = false) => {
    const texto = pdfTexto(valor);
    if (!texto) return '';

    const soloFecha = texto.split('T')[0].split(' ')[0];
    const partes = soloFecha.split(/[-/]/);

    let fecha;

    if (partes.length === 3) {
      if (partes[0].length === 4) {
        fecha = new Date(
          Number(partes[0]),
          Number(partes[1]) - 1,
          Number(partes[2])
        );
      } else {
        fecha = new Date(
          Number(partes[2]),
          Number(partes[1]) - 1,
          Number(partes[0])
        );
      }
    } else {
      fecha = new Date(texto);
    }

    if (Number.isNaN(fecha.getTime())) {
      return texto;
    }

    const dd = String(fecha.getDate()).padStart(2, '0');
    const mm = String(fecha.getMonth() + 1).padStart(2, '0');
    const yyyy = fecha.getFullYear();
    const fechaCorta = `${dd}-${mm}-${yyyy}`;

    if (!incluirDia) return fechaCorta;

    const diaSemana = fecha.toLocaleDateString('es-CL', {
      weekday: 'long'
    });

    const diaCapitalizado =
      diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1);

    return `${diaCapitalizado}, ${fechaCorta}`;
  };

  const pdfHora = (valor) => {
    const texto = pdfTexto(valor);
    if (!texto) return '';

    const match = texto.match(/(\d{1,2}):(\d{2})/);
    if (!match) return texto;

    return `${String(match[1]).padStart(2, '0')}:${match[2]}`;
  };

  const pdfNormalizarClave = (valor) =>
    String(valor ?? '')
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase();

  const pdfBuscarValorProfundo = (raiz, aliases = []) => {
    if (!raiz || typeof raiz !== 'object') return '';

    const clavesBuscadas = new Set(
      aliases.map((alias) => pdfNormalizarClave(alias))
    );

    const visitados = new WeakSet();

    const recorrer = (obj) => {
      if (!obj || typeof obj !== 'object') return '';
      if (visitados.has(obj)) return '';
      visitados.add(obj);

      if (Array.isArray(obj)) {
        for (const elemento of obj) {
          const encontrado = recorrer(elemento);
          if (encontrado !== '') return encontrado;
        }
        return '';
      }

      for (const [clave, valor] of Object.entries(obj)) {
        if (
          clavesBuscadas.has(pdfNormalizarClave(clave)) &&
          valor !== null &&
          valor !== undefined &&
          typeof valor !== 'object'
        ) {
          return valor;
        }
      }

      for (const valor of Object.values(obj)) {
        if (valor && typeof valor === 'object') {
          const encontrado = recorrer(valor);
          if (encontrado !== '') return encontrado;
        }
      }

      return '';
    };

    return recorrer(raiz);
  };

  const pdfExtraerLista = (respuesta) => {
    if (Array.isArray(respuesta)) return respuesta;
    if (!respuesta || typeof respuesta !== 'object') return [];

    const candidatos = [
      respuesta.data,
      respuesta.clientes,
      respuesta.Clientes,
      respuesta.listado,
      respuesta.result,
      respuesta.resultado,
      respuesta.items
    ];

    for (const candidato of candidatos) {
      if (Array.isArray(candidato)) return candidato;
    }

    for (const valor of Object.values(respuesta)) {
      if (Array.isArray(valor)) return valor;
    }

    return [];
  };

  const obtenerClienteParaPDF = async () => {
    const nombre = pdfTexto(valores.NombreCliente);

    const clienteBase = {
      nombre,
      rut: pdfTexto(
        valores.RUT ||
        valores.Rut ||
        valores.rut ||
        valores.RutCliente ||
        valores.RUTCliente
      ),
      email: pdfTexto(
        valores.Email ||
        valores.email ||
        valores.Correo ||
        valores.correo
      ),
      direccion: pdfTexto(
        valores.Direccion ||
        valores.direccion
      ),
      comuna: pdfTexto(
        valores.Comuna ||
        valores.comuna
      ),
      ciudad: pdfTexto(
        valores.Ciudad ||
        valores.ciudad
      ),
      telefono: pdfTexto(
        valores.Telefono ||
        valores.telefono ||
        valores.Celular ||
        valores.celular
      ),
      sucursal: pdfTexto(
        valores.Sucursal ||
        valores.sucursal
      ),
      giro: pdfTexto(
        valores.Giro ||
        valores.giro
      )
    };

    if (!nombre) return clienteBase;

    try {
      const response = await fetch(
        `${BASE_API_URL}/clientes.php/getAllClientes`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            idsucursal: '1',
            busqueda: nombre,
            id: 0
          })
        }
      );

      if (!response.ok) {
        return clienteBase;
      }

      const json = await response.json();
      const lista = pdfExtraerLista(json);
      const claveNombre = pdfNormalizarClave(nombre);

      const cliente =
        lista.find((item) => {
          const nombreItem = pdfBuscarValorProfundo(item, [
            'RazonSocial',
            'razonSocial',
            'NombreCliente',
            'nombreCliente',
            'ClienteNombre',
            'Nombre',
            'nombre'
          ]);

          return pdfNormalizarClave(nombreItem) === claveNombre;
        }) || lista[0];

      if (!cliente) return clienteBase;

      const tomar = (aliases, fallback = '') => {
        const valor = pdfBuscarValorProfundo(cliente, aliases);
        return pdfTexto(valor || fallback);
      };

      return {
        nombre:
          tomar([
            'RazonSocial',
            'NombreCliente',
            'ClienteNombre',
            'Nombre'
          ], clienteBase.nombre),
        rut:
          tomar([
            'RUT',
            'Rut',
            'rut',
            'RUTCliente',
            'RutCliente',
            'ClienteRut',
            'CodigoRut',
            'Codigo'
          ], clienteBase.rut),
        email:
          tomar([
            'Email',
            'email',
            'Correo',
            'correo',
            'Mail',
            'mail'
          ], clienteBase.email),
        direccion:
          tomar([
            'Direccion',
            'direccion',
            'Domicilio',
            'domicilio'
          ], clienteBase.direccion),
        comuna:
          tomar([
            'Comuna',
            'comuna'
          ], clienteBase.comuna),
        ciudad:
          tomar([
            'Ciudad',
            'ciudad'
          ], clienteBase.ciudad),
        telefono:
          tomar([
            'Telefono',
            'telefono',
            'Fono',
            'fono',
            'Celular',
            'celular'
          ], clienteBase.telefono),
        sucursal:
          tomar([
            'Sucursal',
            'sucursal',
            'NombreSucursal'
          ], clienteBase.sucursal),
        giro:
          tomar([
            'Giro',
            'giro',
            'Actividad',
            'actividad'
          ], clienteBase.giro)
      };
    } catch (error) {
      console.warn(
        '[OT PDF] No fue posible completar datos del cliente:',
        error
      );
      return clienteBase;
    }
  };

  const cargarLogoPDF = async () => {
    const rutaLogo =
      `${process.env.PUBLIC_URL || ''}/assets/celery-logo.png`;

    try {
      return await new Promise((resolve) => {
        const imagen = new Image();

        imagen.onload = () => {
          try {
            const canvas = document.createElement('canvas');

            canvas.width =
              imagen.naturalWidth || imagen.width || 600;

            canvas.height =
              imagen.naturalHeight || imagen.height || 300;

            const contexto = canvas.getContext('2d');

            if (!contexto) {
              resolve('');
              return;
            }

            contexto.fillStyle = '#ffffff';
            contexto.fillRect(
              0,
              0,
              canvas.width,
              canvas.height
            );

            contexto.drawImage(
              imagen,
              0,
              0,
              canvas.width,
              canvas.height
            );

            resolve(
              canvas.toDataURL(
                'image/jpeg',
                0.95
              )
            );
          } catch (error) {
            console.error(
              '[OT PDF] Error convirtiendo el logo:',
              error
            );

            resolve('');
          }
        };

        imagen.onerror = (error) => {
          console.error(
            `[OT PDF] No se pudo cargar el logo desde ${rutaLogo}:`,
            error
          );

          resolve('');
        };

        imagen.src = rutaLogo;
      });
    } catch (error) {
      console.error(
        '[OT PDF] Error general cargando el logo:',
        error
      );

      return '';
    }
  };

  const generarPDFOrdenTrabajo = async () => {
    const cliente = await obtenerClienteParaPDF();
    const logo = await cargarLogoPDF();

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const ANCHO = 210;
    const ALTO = 297;
    const MARGEN = 10;
    const ANCHO_UTIL = ANCHO - MARGEN * 2;

    const idOrden = pdfTexto(
      valores.IdOrden ||
      valores.Idorden ||
      valores.IdRegistroBD ||
      valores.Id ||
      ''
    );

    const numeroDocumento = idOrden || '-';

    const obtenerBodegaPDF = () => {
      const valor = pdfTexto(valores.Bodega);
      if (!valor) return '';

      const encontrada = listadobodega.find(
        (item) => String(item.id) === valor
      );

      return encontrada?.nombre || valor;
    };

    const datosOT = {
      fechaIngreso: pdfFecha(valores.FechaIngreso, true),
      fechaIngresoCorta: pdfFecha(valores.FechaIngreso),
      horaIngreso: pdfHora(valores.HoraIngreso),
      cliente: cliente.nombre || pdfTexto(valores.NombreCliente),
      rut: cliente.rut,
      email: cliente.email,
      direccion: cliente.direccion,
      comuna: cliente.comuna,
      ciudad: cliente.ciudad,
      telefono: cliente.telefono,
      sucursal: cliente.sucursal || pdfTexto(valores.Sucursal),
      giro: cliente.giro,
      vendedor: pdfTexto(valores.Vendedor),
      fechaProceso: pdfFecha(
        valores.FechaRealEntrega || valores.FechaIngreso
      ),
      horaProceso: pdfHora(
        valores.HoraTermino || valores.HoraIngreso
      ),
      encargado: pdfTexto(
        valores.EncargadoOT || valores.NombreEncargado
      ),
      estado: pdfTexto(valores.EstadoOT),
      hojaServicio: pdfTexto(
        valores.NroNotaVenta || valores.HojaServicio
      ),
      fechaEntregaAprox: pdfFecha(
        valores.FechaEntregaCotizacionAprox ||
        valores.FechaEntregaCotiz ||
        valores.FechaEntrega
      ),
      horaEntrega: pdfHora(valores.HoraEntrega),
      observaciones: pdfTexto(valores.Observaciones),
      series: pdfTexto(
        valores.SeriesOT ||
        valores.SerieOT ||
        valores.Series ||
        valores.Serie
      ),
      bodega: obtenerBodegaPDF()
    };

    const filasDetalle = detalles.map((detalle, index) => {
      const cantidad = pdfNumero(
        detalle.Cantidad ?? detalle.cantidad ?? 0
      );

      const neto = pdfNumero(
        detalle.ValorUnitario ??
        detalle.valorUnitario ??
        detalle.ValorNeto ??
        detalle.neto ??
        0
      );

      const descuentoPorcentaje = pdfNumero(
        detalle.DescuentoPorcentaje ??
        detalle.descuentoPorcentaje ??
        detalle.DescuentoPorc ??
        detalle.descuentoPorc ??
        0
      );

      const descuentoPesos = Math.round(
        cantidad * neto * (descuentoPorcentaje / 100)
      );

      const totalNeto = pdfNumero(
        detalle.SubTotal ??
        detalle.subTotal ??
        detalle.subtotal ??
        detalle.TotalNeto ??
        0
      );

      return {
        numero: index + 1,
        codigo: pdfTexto(
          detalle.Codigo ??
          detalle.codigo ??
          detalle.CodigoProducto ??
          '--'
        ),
        descripcion: pdfTexto(
          detalle.Descripcion ??
          detalle.descripcion ??
          detalle.NombreProducto ??
          detalle.producto ??
          ''
        ),
        cantidad,
        neto,
        descuentoPorcentaje,
        descuentoPesos,
        totalNeto
      };
    });

    const agregarEncabezadoEmpresa = () => {
      let logoInsertado = false;

      if (logo) {
        try {
          doc.addImage(
            logo,
            'JPEG',
            13,
            8,
            43,
            30,
            undefined,
            'FAST'
          );

          logoInsertado = true;
        } catch (error) {
          console.error(
            '[OT PDF] No fue posible insertar el logo en el PDF:',
            error
          );
        }
      }

      if (!logoInsertado) {
        doc.setTextColor(38, 118, 61);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(21);
        doc.text('CELERY', 13, 28);
        doc.setTextColor(0, 0, 0);
      }

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(8.5);

      const empresa = [
        'CELERY SERVICIOS S.P.A.',
        'Rut: 76.113.479-5',
        'Giro: Compra y venta maquinaria e insumos de jardin.',
        'Direccion: AVDA. LAS CONDES N° 9507',
        'Las Condes. Santiago. Chile.',
        'Teléfono (22) 222 3333 – Celular (9) 2345 2134'
      ];

      let y = 11;
      empresa.forEach((linea) => {
        doc.text(linea, 198, y, { align: 'right' });
        y += 4.2;
      });

      doc.setTextColor(0, 70, 175);
      doc.text(
        'ventas@celeryservicios.cl - www.celeryservicios.cl',
        198,
        y,
        { align: 'right' }
      );
      doc.setTextColor(0, 0, 0);
    };

    const agregarPie = () => {
      doc.setDrawColor(90, 90, 90);
      doc.setLineWidth(0.25);
      doc.rect(MARGEN, ALTO - 13, ANCHO_UTIL, 7);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(
        'ORDEN DE TRABAJO CELERY SERVICIOS',
        ANCHO / 2,
        ALTO - 8.3,
        { align: 'center' }
      );
    };

    const dibujarCampo = (
      x,
      y,
      ancho,
      etiqueta,
      valor,
      alto = 5.6,
      negrita = false
    ) => {
      const anchoEtiqueta = 38;
      const anchoSeparador = 4;

      doc.setDrawColor(80, 80, 80);
      doc.setLineWidth(0.18);
      doc.rect(x, y, ancho, alto);
      doc.line(x + anchoEtiqueta, y, x + anchoEtiqueta, y + alto);
      doc.line(
        x + anchoEtiqueta + anchoSeparador,
        y,
        x + anchoEtiqueta + anchoSeparador,
        y + alto
      );

      doc.setFont('helvetica', negrita ? 'bold' : 'normal');
      doc.setFontSize(7.5);
      doc.text(etiqueta, x + 1.3, y + 3.8);
      doc.text(':', x + anchoEtiqueta + 1.5, y + 3.8);

      doc.setFont('helvetica', negrita ? 'bold' : 'normal');

      const maxAncho = ancho - anchoEtiqueta - anchoSeparador - 3;
      const lineas = doc.splitTextToSize(pdfTexto(valor), maxAncho);
      doc.text(
        lineas.slice(0, alto > 8 ? 2 : 1),
        x + anchoEtiqueta + anchoSeparador + 1.2,
        y + 3.8
      );

      return y + alto;
    };

    const dibujarDocumento = (x, y, ancho, alto, numero) => {
      doc.setDrawColor(60, 60, 60);
      doc.setLineWidth(0.35);
      doc.rect(x, y, ancho, alto);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('N° Documento', x + ancho / 2, y + 9, {
        align: 'center'
      });

      const textoNumero = pdfTexto(numero) || '-';
      const largo = textoNumero.length;
      const tamano = largo >= 7 ? 30 : largo >= 5 ? 38 : 48;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(tamano);
      doc.text(
        textoNumero,
        x + ancho / 2,
        y + alto / 2 + tamano * 0.12,
        { align: 'center' }
      );
    };

    const dibujarFichaCliente = (tituloDatos = 'DATOS OT') => {
      const inicioY = 43;
      const izquierdaX = MARGEN;
      const anchoIzquierda = 126;
      const derechaX = izquierdaX + anchoIzquierda;
      const anchoDerecha = ANCHO_UTIL - anchoIzquierda;

      let y = inicioY;

      y = dibujarCampo(
        izquierdaX,
        y,
        anchoIzquierda,
        'Fecha ingreso',
        datosOT.fechaIngreso,
        5.6,
        false
      );

      y = dibujarCampo(
        izquierdaX,
        y,
        anchoIzquierda,
        'Cliente',
        datosOT.cliente,
        5.6,
        true
      );

      y = dibujarCampo(
        izquierdaX,
        y,
        anchoIzquierda,
        'RUT',
        datosOT.rut
      );

      y = dibujarCampo(
        izquierdaX,
        y,
        anchoIzquierda,
        'Email',
        datosOT.email
      );

      y = dibujarCampo(
        izquierdaX,
        y,
        anchoIzquierda,
        'Direccion',
        datosOT.direccion
      );

      y = dibujarCampo(
        izquierdaX,
        y,
        anchoIzquierda,
        'Comuna',
        datosOT.comuna
      );

      y = dibujarCampo(
        izquierdaX,
        y,
        anchoIzquierda,
        'Ciudad',
        datosOT.ciudad
      );

      y = dibujarCampo(
        izquierdaX,
        y,
        anchoIzquierda,
        'Telefono',
        datosOT.telefono
      );

      y = dibujarCampo(
        izquierdaX,
        y,
        anchoIzquierda,
        'Sucursal',
        datosOT.sucursal
      );

      doc.setDrawColor(60, 60, 60);
      doc.rect(izquierdaX, y, anchoIzquierda, 8);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
   
      const centroVisualDatosOT =
        izquierdaX + (anchoIzquierda * 0.44);

      doc.text(
        tituloDatos,
        centroVisualDatosOT,
        y + 5.7,
        { align: 'center' }
      );
      y += 8;

      y = dibujarCampo(
        izquierdaX,
        y,
        anchoIzquierda,
        'Vendedor',
        datosOT.vendedor,
        5.6,
        true
      );

      y = dibujarCampo(
        izquierdaX,
        y,
        anchoIzquierda,
        'Fecha Proceso',
        datosOT.fechaProceso,
        5.6,
        true
      );

      y = dibujarCampo(
        izquierdaX,
        y,
        anchoIzquierda,
        'Hora Proceso',
        datosOT.horaProceso
      );

      y = dibujarCampo(
        izquierdaX,
        y,
        anchoIzquierda,
        'Encargado',
        datosOT.encargado
      );

      y = dibujarCampo(
        izquierdaX,
        y,
        anchoIzquierda,
        'Estado OT',
        datosOT.estado
      );

      y = dibujarCampo(
        izquierdaX,
        y,
        anchoIzquierda,
        'Hoja Servicio',
        datosOT.hojaServicio,
        8
      );

      dibujarDocumento(
        derechaX,
        inicioY,
        anchoDerecha,
        y - inicioY,
        numeroDocumento
      );

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(
        `Hora ingreso : ${datosOT.horaIngreso}`,
        derechaX + anchoDerecha - 2,
        inicioY + 4,
        { align: 'right' }
      );

      return y;
    };

    const cuerpoEconomico = filasDetalle.map((fila) => [
      fila.numero,
      fila.codigo,
      fila.descripcion,
      fila.cantidad,
      pdfDinero(fila.neto),
      `${fila.descuentoPorcentaje}%`,
      pdfDinero(fila.descuentoPesos),
      pdfDinero(fila.totalNeto)
    ]);

    agregarEncabezadoEmpresa();
    let y = dibujarFichaCliente('DATOS OT') + 5;

    autoTable(doc, {
      startY: y,
      margin: { left: MARGEN, right: MARGEN },
      head: [[
        'N°',
        'Codigo',
        'Descripcion',
        'Cant.',
        'Neto',
        'Desc. (%)',
        'Desc. ($)',
        'TotalNeto $'
      ]],
      body: cuerpoEconomico.length
        ? cuerpoEconomico
        : [['', '', 'Sin productos registrados', '', '', '', '', '']],
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 6.5,
        cellPadding: 1.1,
        lineColor: [75, 75, 75],
        lineWidth: 0.18,
        textColor: [0, 0, 0],
        valign: 'top'
      },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 22, halign: 'center' },
        2: { cellWidth: 68 },
        3: { cellWidth: 12, halign: 'center' },
        4: { cellWidth: 19, halign: 'right' },
        5: { cellWidth: 18, halign: 'center' },
        6: { cellWidth: 20, halign: 'right' },
        7: { cellWidth: 23, halign: 'right' }
      },
      rowPageBreak: 'avoid'
    });

    y = (doc.lastAutoTable?.finalY || y) + 1.5;

    doc.setDrawColor(70, 70, 70);
    doc.rect(MARGEN, y, ANCHO_UTIL, 6);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('Series OT :', MARGEN + 1.5, y + 4);
    doc.setFont('helvetica', 'normal');
    doc.text(datosOT.series, MARGEN + 19, y + 4);
    y += 10;

    if (y > 242) {
      doc.addPage();
      agregarEncabezadoEmpresa();
      y = 48;
    }

    const obsAncho = 124;
    const totalesX = MARGEN + obsAncho;
    const totalesAncho = ANCHO_UTIL - obsAncho;
    const altoObs = 29;

    doc.rect(MARGEN, y, obsAncho, altoObs);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('OBSERVACIONES:', MARGEN + 1.5, y + 4);

    doc.setFont('helvetica', 'normal');
    const observacionesPDF =
      datosOT.observaciones ||
      'A este presupuesto se le debe agregar el IVA. Sus valores son NETOS.';

    const lineasObs = doc.splitTextToSize(
      observacionesPDF,
      obsAncho - 4
    );

    doc.text(
      lineasObs.slice(0, 7),
      MARGEN + 1.5,
      y + 9
    );

    const resumen = [
      ['Neto', pdfDinero(valores.TotalNeto || valores.SubTotal)],
      ['Iva', pdfDinero(valores.TotalIVA)],
      ['Total', pdfDinero(valores.TotalOT)],
      ['Abonado', pdfDinero(valores.AbonadoOT)]
    ];

    const altoFilaTotal = altoObs / resumen.length;

    resumen.forEach(([label, valor], index) => {
      const yy = y + index * altoFilaTotal;
      doc.rect(totalesX, yy, totalesAncho, altoFilaTotal);
      doc.line(
        totalesX + 25,
        yy,
        totalesX + 25,
        yy + altoFilaTotal
      );
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text(label, totalesX + 1.5, yy + 4.7);
      doc.text(
        valor,
        totalesX + totalesAncho - 1.5,
        yy + 4.7,
        { align: 'right' }
      );
    });

    agregarPie();

    doc.addPage();
    agregarEncabezadoEmpresa();

    const inicioY2 = 52;
    const izquierdaX2 = MARGEN;
    const anchoIzquierda2 = 116;
    const derechaX2 = izquierdaX2 + anchoIzquierda2;
    const anchoDerecha2 = ANCHO_UTIL - anchoIzquierda2;

    let y2 = inicioY2;

    y2 = dibujarCampo(
      izquierdaX2,
      y2,
      anchoIzquierda2,
      'Fecha ingreso',
      datosOT.fechaIngreso
    );
    y2 = dibujarCampo(
      izquierdaX2,
      y2,
      anchoIzquierda2,
      'Cliente',
      datosOT.cliente,
      5.6,
      true
    );
    y2 = dibujarCampo(
      izquierdaX2,
      y2,
      anchoIzquierda2,
      'RUT',
      datosOT.rut
    );
    y2 = dibujarCampo(
      izquierdaX2,
      y2,
      anchoIzquierda2,
      'Email',
      datosOT.email
    );
    y2 = dibujarCampo(
      izquierdaX2,
      y2,
      anchoIzquierda2,
      'Direccion',
      datosOT.direccion
    );
    y2 = dibujarCampo(
      izquierdaX2,
      y2,
      anchoIzquierda2,
      'Comuna',
      datosOT.comuna
    );
    y2 = dibujarCampo(
      izquierdaX2,
      y2,
      anchoIzquierda2,
      'Ciudad',
      datosOT.ciudad
    );
    y2 = dibujarCampo(
      izquierdaX2,
      y2,
      anchoIzquierda2,
      'Giro',
      datosOT.giro
    );

    doc.rect(izquierdaX2, y2, anchoIzquierda2, 8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    const centroVisualDatosTaller =
      izquierdaX2 + (anchoIzquierda2 * 0.44);

    doc.text(
      'DATOS OT - TALLER',
      centroVisualDatosTaller,
      y2 + 5.7,
      { align: 'center' }
    );
    y2 += 8;

    y2 = dibujarCampo(
      izquierdaX2,
      y2,
      anchoIzquierda2,
      'Vendedor',
      datosOT.vendedor,
      5.6,
      true
    );
    y2 = dibujarCampo(
      izquierdaX2,
      y2,
      anchoIzquierda2,
      'Fecha Entrega APROX',
      datosOT.fechaEntregaAprox,
      8,
      true
    );
    y2 = dibujarCampo(
      izquierdaX2,
      y2,
      anchoIzquierda2,
      'Hora Entrega',
      datosOT.horaEntrega
    );
    y2 = dibujarCampo(
      izquierdaX2,
      y2,
      anchoIzquierda2,
      'Estado OT',
      datosOT.estado
    );
    y2 = dibujarCampo(
      izquierdaX2,
      y2,
      anchoIzquierda2,
      'Hoja Servicio',
      datosOT.hojaServicio,
      8
    );

    dibujarDocumento(
      derechaX2,
      inicioY2,
      anchoDerecha2,
      y2 - inicioY2,
      numeroDocumento
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(
      `Hora ingreso : ${datosOT.horaIngreso}`,
      derechaX2 + anchoDerecha2 - 2,
      inicioY2 + 4,
      { align: 'right' }
    );

    const cuerpoTaller = filasDetalle.map((fila) => [
      fila.numero,
      fila.codigo,
      fila.descripcion,
      fila.cantidad
    ]);

    autoTable(doc, {
      startY: y2 + 6,
      margin: { left: MARGEN, right: MARGEN },
      head: [[
        'N°',
        'Codigo',
        'Descripcion',
        'Cantidad'
      ]],
      body: cuerpoTaller.length
        ? cuerpoTaller
        : [['', '', 'Sin productos registrados', '']],
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 6.8,
        cellPadding: 1.15,
        lineColor: [75, 75, 75],
        lineWidth: 0.18,
        textColor: [0, 0, 0],
        valign: 'top'
      },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' },
        1: { cellWidth: 40, halign: 'center' },
        2: { cellWidth: 118 },
        3: { cellWidth: 20, halign: 'center' }
      },
      rowPageBreak: 'avoid'
    });

    let yCondiciones = (doc.lastAutoTable?.finalY || y2 + 20) + 2;

    doc.rect(MARGEN, yCondiciones, ANCHO_UTIL, 6);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('Series OT :', MARGEN + 1.5, yCondiciones + 4);
    doc.setFont('helvetica', 'normal');
    doc.text(datosOT.series, MARGEN + 19, yCondiciones + 4);
    yCondiciones += 12;

    const condiciones = [
      'IMPORTANTE: UNA VEZ RECIBIDO EL EQUIPO, EL CLIENTE TIENE UN PLAZO MAXIMO DE NOVENTA DIAS PARA RETIRARLA; VENCIDO ESTE PLAZO, LA EMPRESA QUEDA FACULTADA, DESDE YA, POR EL CLIENTE PARA REMATARLA, RENUNCIANDO A CUALQUIER ACCION JUDICIAL DESTINADA A RECUPERARLA O A QUE SE LE INDEMNICE SU VALOR.',
      'DE NO SER ACEPTADO EL PRESUPUESTO DE REPARACION, TODO PRESUPUESTO TIENE UN COSTO ASOCIADO. CONSULTE POR EL VALOR DE SU EQUIPO.',
      'EN CASO DE NO SER ACEPTADA LA REPARACION DE UN EQUIPO A MOTOR QUE LLEGUE FUNCIONANDO Y QUE DEBA SER DESARMADO PARA HACER SU PRESUPUESTO, SE DEJA ESTABLECIDO QUE NO SE PUEDE EXIGIR QUE EL EQUIPO SE ENTREGUE IGUALMENTE FUNCIONANDO. CELERY SERVICIOS SPA. NO RESPONDERA POR EVENTUALES DANOS O PERDIDAS POR CAUSAS FORTUITAS O DE FUERZA MAYOR NO IMPUTABLES A ESTA EMPRESA.',
      'ESTE COMPROBANTE ES AL PORTADOR. CONSERVELO EN LUGAR SEGURO. LE SERA SOLICITADO PARA RETIRAR SU EQUIPO.'
    ];

    const paddingCondicionesX = 4;
    const paddingCondicionesY = 4;
    const espacioEntreCondiciones = 2.2;
    const lineHeightFactorCondiciones = 1.22;

    let fontSizeCondiciones = 6.6;

    const prepararCondiciones = () => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(fontSizeCondiciones);

      const anchoTexto =
        ANCHO_UTIL - (paddingCondicionesX * 2);

      const bloques = condiciones.map((texto) =>
        doc.splitTextToSize(
          `- ${texto}`,
          anchoTexto
        )
      );

      const altoLinea =
        fontSizeCondiciones *
        0.352778 *
        lineHeightFactorCondiciones;

      const altoTexto = bloques.reduce(
        (total, lineas, index) => {
          const altoBloque =
            lineas.length * altoLinea;

          const separacion =
            index < bloques.length - 1
              ? espacioEntreCondiciones
              : 0;

          return total + altoBloque + separacion;
        },
        0
      );

      return {
        bloques,
        altoLinea,
        altoTotal:
          altoTexto +
          (paddingCondicionesY * 2)
      };
    };

    let condicionesPreparadas =
      prepararCondiciones();

    const margenInferiorCondiciones = 18;

    if (
      yCondiciones +
        condicionesPreparadas.altoTotal >
      ALTO - margenInferiorCondiciones
    ) {
      doc.addPage();
      agregarEncabezadoEmpresa();
      yCondiciones = 48;

      condicionesPreparadas =
        prepararCondiciones();
    }

    const altoDisponible =
      ALTO -
      margenInferiorCondiciones -
      yCondiciones;

    while (
      condicionesPreparadas.altoTotal >
        altoDisponible &&
      fontSizeCondiciones > 5.4
    ) {
      fontSizeCondiciones -= 0.2;
      condicionesPreparadas =
        prepararCondiciones();
    }

    const altoCajaCondiciones =
      Math.max(
        44,
        condicionesPreparadas.altoTotal
      );

    doc.setDrawColor(70, 70, 70);
    doc.setLineWidth(0.22);

    doc.rect(
      MARGEN,
      yCondiciones,
      ANCHO_UTIL,
      altoCajaCondiciones
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(fontSizeCondiciones);
    doc.setTextColor(0, 0, 0);

    let yTextoCondiciones =
      yCondiciones +
      paddingCondicionesY +
      (
        fontSizeCondiciones *
        0.352778
      );

    condicionesPreparadas.bloques.forEach(
      (lineas, index) => {
        doc.text(
          lineas,
          MARGEN + paddingCondicionesX,
          yTextoCondiciones,
          {
            lineHeightFactor:
              lineHeightFactorCondiciones,
            maxWidth:
              ANCHO_UTIL -
              (paddingCondicionesX * 2)
          }
        );

        yTextoCondiciones +=
          (
            lineas.length *
            condicionesPreparadas.altoLinea
          ) +
          (
            index <
            condicionesPreparadas.bloques.length - 1
              ? espacioEntreCondiciones
              : 0
          );
      }
    );

    agregarPie();

    doc.setProperties({
      title: `Orden de Trabajo ${numeroDocumento}`,
      subject: 'Orden de Trabajo Celery Servicios',
      author: 'Celery Servicios S.P.A.',
      creator: 'Sistema Ordenes de Trabajo'
    });

    return doc;
  };

  const handleImprimir = async () => {
    if (generandoPDF) return;

    setGenerandoPDF(true);

    try {
      try {
        const response = await fetch(
          `${BASE_API_URL}/clientes.php/guardarImpresion`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(valores)
          }
        );

        if (!response.ok) {
          console.warn(
            '[OT PDF] guardarImpresion respondió HTTP',
            response.status
          );
        }
      } catch (errorRegistro) {
        console.warn(
          '[OT PDF] No fue posible registrar la impresión:',
          errorRegistro
        );
      }

      const pdf = await generarPDFOrdenTrabajo();
      const blob = pdf.output('blob');
      const url = URL.createObjectURL(blob);
      const idOT = pdfTexto(
        valores.IdOrden ||
        valores.Idorden ||
        'OT'
      );
      const nombreArchivo = `OrdenTrabajo_${idOT}.pdf`;

      if (pdfUrlActualRef.current) {
        URL.revokeObjectURL(pdfUrlActualRef.current);
      }

      pdfUrlActualRef.current = url;

      setModalPDF({
        abierto: true,
        url,
        nombre: nombreArchivo
      });
    } catch (error) {
      console.error(
        'Error al generar la Orden de Trabajo en PDF:',
        error
      );

      alert(
        'No fue posible generar el PDF de la Orden de Trabajo. ' +
        'Revise la consola para ver el detalle.'
      );
    } finally {
      setGenerandoPDF(false);
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

            rut: String(rutCliente || '').trim(),
            Rut: String(rutCliente || '').trim(),
            RUT: String(rutCliente || '').trim(),

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
        const urlAPI = `${API_ORDEN_TRABAJO}/Leer/0`;

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

        const normalizarNombreClienteRut = (nombre) =>
          normalizarTextoBusqueda(nombre)
            .replace(/\./g, '')
            .replace(/[^A-Z0-9]+/g, ' ')
            .trim();

        const clientesPorNombre = new Map();
        const clientesPorId = new Map();

        const registrarRutCliente = (clienteItem) => {
          const nombreCliente =
            clienteItem.nombre ||
            clienteItem.Nombre ||
            clienteItem.NombreCliente ||
            clienteItem.ClienteNombre ||
            clienteItem.RazonSocial ||
            clienteItem.Razon_Social ||
            '';

          const rutCliente = String(
            clienteItem.RUT ||
            clienteItem.Rut ||
            clienteItem.rut ||
            clienteItem.RUTCliente ||
            clienteItem.RutCliente ||
            clienteItem.rutCliente ||
            clienteItem.ClienteRUT ||
            clienteItem.CodigoRut ||
            clienteItem.RutEmpresa ||
            clienteItem.codigo ||
            clienteItem.Codigo ||
            ''
          ).trim();

          if (!rutCliente || rutCliente === '--') return;

          const claveNombre = normalizarNombreClienteRut(nombreCliente);
          const idCliente = obtenerIdPositivo(
            clienteItem.IdCliente,
            clienteItem.IDCliente,
            clienteItem.idCliente,
            clienteItem.Id,
            clienteItem.id
          );

          if (claveNombre) clientesPorNombre.set(claveNombre, rutCliente);
          if (idCliente > 0) clientesPorId.set(idCliente, rutCliente);
        };

        clientes.forEach(registrarRutCliente);

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

          const estadoOT = String(
            item.EstadoOTTexto ||
            item.estadoOTTexto ||
            item.EstadoOT ||
            item.estadoOT ||
            item.Estado ||
            item.estado ||
            ''
          ).trim();

          const detalleOriginal = String(
            item.Observaciones ||
            item.Descripcion ||
            item.Detalle ||
            ''
          ).trim();

          const detalle =
            normalizarTextoBusqueda(detalleOriginal) === normalizarTextoBusqueda(estadoOT)
              ? ''
              : detalleOriginal;

          const descripcionFormateada =
            cliente || `Orden de Trabajo N° ${idOt}`;

          const estadoVisual = esEstadoAnulado(estadoOT)
            ? estadoOT
            : (detalle || estadoOT || '');

          const numeroOT = obtenerIdPositivo(
            item.IdOrden,
            item.idOrden,
            item.IDOrden,
            item.Id,
            item.id,
            idOt
          );

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

          const idClienteOrden = obtenerIdPositivo(
            item.IdCliente,
            item.IDCliente,
            item.idCliente
          );

          const rutCliente = String(
            (rutDirecto && rutDirecto !== '--' ? rutDirecto : '') ||
            clientesPorId.get(idClienteOrden) ||
            clientesPorNombre.get(normalizarNombreClienteRut(cliente)) ||
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

            codigo: `OT-${idOt}`,
            Codigo: `OT-${idOt}`,
            numeroOT: numeroOT || idOt,
            NumeroOT: numeroOT || idOt,
            estadoOT: estadoVisual,
            EstadoOTTexto: estadoVisual,
            EstadoOTOriginal: estadoOT,

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

        const clientesSinRut = new Map();
        datosOT.forEach((item) => {
          const nombre = item.NombreCliente || item.Cliente || item.RazonSocial || '';
          const clave = normalizarNombreClienteRut(nombre);
          if (!item.rut && clave && !clientesSinRut.has(clave)) {
            clientesSinRut.set(clave, nombre);
          }
        });

        if (clientesSinRut.size > 0) {
          const consultas = Array.from(clientesSinRut.values()).slice(0, 10);
          const resultados = await Promise.allSettled(consultas.map(async (nombre) => {
            const respuesta = await fetch(`${BASE_API_URL}/clientes.php/getAllClientes`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ idsucursal: '1', busqueda: nombre, id: 0 }),
              signal
            });
            if (!respuesta.ok) return [];
            const json = await respuesta.json();
            const registros = Array.isArray(json) ? json : (json?.data || json?.clientes || []);
            return Array.isArray(registros) ? registros : [];
          }));

          if (signal?.aborted) return;

          resultados.forEach((resultado) => {
            if (resultado.status === 'fulfilled') {
              resultado.value.forEach(registrarRutCliente);
            }
          });

          datosOT.forEach((item) => {
            if (item.rut) return;
            const idCliente = obtenerIdPositivo(item.IdCliente, item.IDCliente, item.idCliente);
            const rut = clientesPorId.get(idCliente) ||
              clientesPorNombre.get(normalizarNombreClienteRut(item.NombreCliente || item.Cliente || item.RazonSocial));
            if (rut) {
              item.rut = rut;
              item.Rut = rut;
              item.RUT = rut;
            }
          });
        }

        const termino =
          normalizarTextoBusqueda(textoBusqueda);

        if (!termino) {
          datos = datosOT;
        } else {
          const textoLimpio = String(textoBusqueda ?? '').trim();
          const esNumeroEntero = /^\d+$/.test(textoLimpio);

          const coincidenciasNumeroOT = esNumeroEntero
            ? datosOT.filter((item) =>
                String(
                  item.numeroOT ??
                  item.NumeroOT ??
                  item.IdOrden ??
                  item.idOrden ??
                  item.Id ??
                  item.id ??
                  ''
                ).trim() === textoLimpio
              )
            : [];

          if (coincidenciasNumeroOT.length > 0) {
            datos = coincidenciasNumeroOT;
          } else {
            datos = datosOT.filter((item) => {
              const valores = [
                item.rut,
                item.RUT,
                item.codigo,
                item.Codigo,
                item.nombre,
                item.descripcion,
                item.NombreCliente,
                item.Cliente,
                item.numeroOT,
                item.NumeroOT,
                item.estadoOT,
                item.EstadoOTTexto,
                item.IdOrden,
                item.id
              ];

              return valores.some((valor) =>
                normalizarTextoBusqueda(valor)
                  .includes(termino)
              );
            });
          }
        }
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

    if (
      tipoForzado === null &&
      tipoSeleccion === 'productosBD'
    ) {
      limpiezaManualRef.current = false;
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

        ultimaOTAutocargadaRef.current = idSeleccionado;

        setDetalles([]);
        setErrores({});
        setErrorAnulacion('');
        setMensajeAnulacion('');

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
          `${API_ORDEN_TRABAJO}/Leer/${idOrdenSeleccionada}`,
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
        const respuestaTieneDatos = Array.isArray(jsonOT)
          ? jsonOT.length > 0
          : Boolean(jsonOT && typeof jsonOT === 'object' && Object.keys(jsonOT).length > 0);

        if (!respuestaTieneDatos) {
          throw new Error(`La Orden de Trabajo ${idOrdenSeleccionada} no devolvió información.`);
        }

        const idConfirmado = idRegistroBD || idOrdenSeleccionada;
        idRegistroBDRef.current = String(idConfirmado);
        setIdOTExistenteConfirmada(Number(idConfirmado));
        handleChange('IdRegistroBD', String(idConfirmado));

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

        const idClienteOT = obtenerCampoOT([
          'IdCliente',
          'idCliente',
          'IDCliente'
        ]);
        if (tieneValor(idClienteOT)) {
          handleChange('IdCliente', String(idClienteOT));
        }

        const idEncargadoOT = obtenerCampoOT([
          'IdEncargado',
          'idEncargado',
          'IDEncargado'
        ]);
        if (tieneValor(idEncargadoOT)) {
          handleChange('IdEncargado', String(idEncargadoOT));
        }

        const idVendedorOT = obtenerCampoOT([
          'IdVendedor',
          'idVendedor',
          'IDVendedor'
        ]);
        if (tieneValor(idVendedorOT)) {
          handleChange('IdVendedor', String(idVendedorOT));
        }

        const referenciasDTE = obtenerCampoOT([
          'ReferenciasDTE',
          'referenciasDTE',
          'ReferenciaDTE',
          'referenciaDTE'
        ]);
        if (tieneValor(referenciasDTE)) {
          handleChange('ReferenciasDTE', String(referenciasDTE));
        }

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
          'EstadoOTTexto',
          'estadoOTTexto'
        ]) || obtenerCampoOT([
          'EstadoOT',
          'estadoOT',
          'Estado',
          'estado'
        ]);

        if (tieneValor(estadoOT)) {
          const estadoNormalizado = normalizarEstadoOT(estadoOT);

          if (
            ['MANTENIMIENTO', 'APROBADO', 'RECHAZADO', 'ANULADA', 'ANULADO'].includes(
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
          'UsuarioModificaOT',
          'usuarioModificaOT',
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
          'CotizacionAprobada',
          'cotizacionAprobada',
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
          'UsuarioCreaOT',
          'usuarioCreaOT',
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
          const respuestaDirectaDetalles = Array.isArray(respuestaCompleta)
            ? respuestaCompleta.filter((item) =>
                item &&
                typeof item === 'object' &&
                tieneValor(item.IdDetalle ?? item.idDetalle)
              )
            : [];

          listaDetalles = respuestaDirectaDetalles;
        }

        if (Array.isArray(listaDetalles) && listaDetalles.length > 0) {
          const listaDetallesVisibles = listaDetalles;

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


  seleccionarElementoRef.current = handleSeleccionarElemento;

  const handleEditarOrdenDesdeInforme = async (idOrden, orden = {}) => {
    const objetoOriginal =
      orden?.objetoOriginal && typeof orden.objetoOriginal === 'object'
        ? orden.objetoOriginal
        : {};

    const idRegistroBD = obtenerIdPositivo(
      orden?.idRegistroBD,
      orden?.IdRegistroBD,
      orden?.idReal,
      objetoOriginal?.Id,
      objetoOriginal?.id,
      idOrden,
      orden?.Id,
      orden?.id,
      orden?.idOrden,
      orden?.IdOrden
    );

    if (!idRegistroBD) {
      alert('No fue posible identificar la Orden de Trabajo seleccionada.');
      return;
    }

    const idOrdenVisible = obtenerIdPositivo(
      orden?.idOrden,
      orden?.IdOrden,
      orden?.IDOrden,
      objetoOriginal?.IdOrden,
      objetoOriginal?.Idorden,
      idRegistroBD
    );

    const idCarga = String(idRegistroBD);
    const idVisible = String(idOrdenVisible || idRegistroBD);

    limpiezaManualRef.current = false;
    setSoloLecturaCartola(false);
    limpiarBloqueoCartolaGenerar(true);

    await handleSeleccionarElemento(
      {
        ...objetoOriginal,
        ...orden,
        IdRegistroBD: idCarga,
        idRegistroBD: idCarga,
        Id: idCarga,
        id: idCarga,
        IdOrden: idVisible,
        idOrden: idVisible,
        IDOrden: idVisible
      },
      'productosBD'
    );

    setInformeEncargadosAbierto(false);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (window.__OT_GENERAR_INICIO_LIMPIO__) return undefined;

    const timer = window.setTimeout(() => {
      window.__OT_GENERAR_INICIO_LIMPIO__ = true;

      limpiezaManualRef.current = true;
      idRegistroBDRef.current = '';
      setIdOTExistenteConfirmada(0);
      ultimaOTAutocargadaRef.current = '';
      setSoloLecturaCartola(false);
      setDetalles([]);
      setSubTab(0);
      limpiarBloqueoCartolaGenerar(true);

      if (typeof limpiarValores === 'function') {
        limpiarValores();
      }

      const camposIniciales = [
        'Id', 'id', 'IdOrden', 'Idorden', 'IDOrden', 'IdRegistroBD', 'idRegistroBD',
        'NombreCliente', 'Cliente', 'RUT', 'Rut', 'rut', 'Sucursal',
        'FechaIngreso', 'HoraIngreso', 'FechaEntrega', 'HoraEntrega', 'Bodega',
        'FechaRealEntrega', 'FechaRealEntregaOT', 'HoraTermino', 'HoraTerminoOT',
        'FechaEntregaCotiz', 'FechaEntregaCotizacionAprox', 'FechaEntregaCotizacionApprox',
        'NroNotaVenta', 'EncargadoOT', 'NombreEncargado', 'Vendedor',
        'IngresoOrdenCompra', 'ReferenciasDTE', 'Observaciones',
        'TmpProductoCantidad', 'TmpProductoValorNeto', 'TmpProductoDescuentoPorc',
        'TmpProductoTotalNeto', 'TmpProductoComisionPorc', 'TmpProductoTotalComision',
        'TmpProductoCodigo', 'TmpProductoDescripcion',
        'TmpServicioDescripcion', 'TmpServicioCantidad', 'TmpServicioValor',
        'TmpServicioDesc', 'TmpServicioTotalNeto', 'TmpServicioComision',
        'TmpServicioTotalComision', 'EstadoOT', 'EstadoOTTexto'
      ];

      camposIniciales.forEach((campo) => handleChange(campo, ''));
      handleChange('SinRebajaStock', false);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

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

      limpiezaManualRef.current = false;
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

    if (omitirAutocargaInicialRef.current) {
      omitirAutocargaInicialRef.current = false;
      return;
    }

    if (limpiezaManualRef.current) {
      ultimaOTAutocargadaRef.current = '';
      setSoloLecturaCartola(false);
      return;
    }

    if (!idOrdenActual) {
      ultimaOTAutocargadaRef.current = '';
      setSoloLecturaCartola(false);
      return;
    }

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

    const idRegistroExplicito = obtenerIdPositivo(
      valores.IdRegistroBD,
      valores.idRegistroBD,
      idRegistroBDRef.current
    );

    let cargaDesdeCartola = false;
    try {
      const rawBloqueo = sessionStorage.getItem(CLAVE_BLOQUEO_CARTOLA_GENERAR);
      if (rawBloqueo) {
        const bloqueo = JSON.parse(rawBloqueo);
        cargaDesdeCartola =
          bloqueo?.tokenDocumento === obtenerTokenDocumentoOT() &&
          String(bloqueo?.idOrden || '').trim() === idOrdenActual;
      }
    } catch (_) {}

    if (!idRegistroExplicito && !cargaDesdeCartola) {
      return;
    }

    if (
      ultimaOTAutocargadaRef.current ===
      idOrdenActual
    ) {
      return;
    }

    ultimaOTAutocargadaRef.current =
      idOrdenActual;

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
    const comisionPorc = valores.TmpProductoComisionPorc || '0';
    const totalComision = valores.TmpProductoTotalComision || '0';

    if (!codigo.trim() || !cantidad || !valorNeto) {
      alert('Por favor, ingrese el Producto, Cantidad y Valor Neto antes de agregar.');
      return;
    }

    const nuevoDetalle = {
      IdDetalle: String(Date.now()),
      Idorden: valores.IdOrden || '12018',
      IdTipo: '2',
      Codigo: codigo,
      Descripcion: descripcion,
      Cantidad: cantidad,
      ValorUnitario: valorNeto,
      DescuentoPorcentaje: descPorc,
      SubTotal: totalNeto,
      ComisionPorcentaje: comisionPorc,
      TotalComision: totalComision
    };

    setDetalles(prev => [...prev, nuevoDetalle]);

    [
      'TmpProductoCodigo',
      'TmpProductoCantidad',
      'TmpProductoValorNeto',
      'TmpProductoDescuentoPorc',
      'TmpProductoTotalNeto',
      'TmpProductoComisionPorc',
      'TmpProductoTotalComision',
      'TmpProductoStock',
      'TmpProductoDescripcion'
    ].forEach(campo => handleChange(campo, ''));
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

  const handleCalculosServicio = (campo, valor) => {
    const valorLimpio = valor.replace(/[^0-9]/g, '');
    handleChange(campo, valorLimpio);

    const datos = { ...valores, [campo]: valorLimpio };
    const cantidad = parseFloat(datos.TmpServicioCantidad) || 0;
    const valorUnitario = parseFloat(datos.TmpServicioValor) || 0;
    const descuento = Math.min(parseFloat(datos.TmpServicioDesc) || 0, 100);
    const comision = Math.min(parseFloat(datos.TmpServicioComision) || 0, 100);
    const bruto = cantidad * valorUnitario;
    const totalNeto = Math.max(0, bruto - (bruto * descuento / 100));
    const totalComision = Math.max(0, totalNeto * comision / 100);

    handleChange('TmpServicioTotalNeto', Math.round(totalNeto).toString());
    handleChange('TmpServicioTotalComision', Math.round(totalComision).toString());
  };

  const agregarServicioALaTabla = () => {
    const descripcion = String(valores.TmpServicioDescripcion || '').trim();
    const cantidad = String(valores.TmpServicioCantidad || '').trim();
    const valorUnitario = String(valores.TmpServicioValor || '').trim();
    const descuento = String(valores.TmpServicioDesc || '0').trim();
    const totalNeto = String(valores.TmpServicioTotalNeto || '0').trim();
    const comision = String(valores.TmpServicioComision || '0').trim();
    const totalComision = String(valores.TmpServicioTotalComision || '0').trim();

    if (!descripcion || !cantidad || !valorUnitario) {
      alert('Por favor, ingrese la descripción del servicio, cantidad y valor unitario.');
      return;
    }

    if ((Number(cantidad) || 0) <= 0 || (Number(valorUnitario) || 0) <= 0) {
      alert('La cantidad y el valor unitario del servicio deben ser mayores que cero.');
      return;
    }

    const nuevoServicio = {
      IdDetalle: String(Date.now()),
      Idorden: valores.IdOrden || '12018',
      IdTipo: '1',
      Codigo: 'SERVICIO',
      Descripcion: descripcion,
      Cantidad: cantidad,
      ValorUnitario: valorUnitario,
      DescuentoPorcentaje: descuento,
      SubTotal: totalNeto,
      ComisionPorcentaje: comision,
      TotalComision: totalComision
    };

    setDetalles(prev => [...prev, nuevoServicio]);

    [
      'TmpServicioDescripcion',
      'TmpServicioCantidad',
      'TmpServicioValor',
      'TmpServicioDesc',
      'TmpServicioTotalNeto',
      'TmpServicioComision',
      'TmpServicioTotalComision'
    ].forEach(campo => handleChange(campo, ''));
  };

  const verificarEnter = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      agregarProductoALaTabla();
    }
  };

  const verificarEnterServicio = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      agregarServicioALaTabla();
    }
  };

  const eliminarDetalle = (idDetalle) => {
    const detalle = detalles.find(
      item => String(item.IdDetalle) === String(idDetalle)
    );

    if (!detalle) return;

    setErrorEliminacionDetalle('');
    setDetalleAEliminar(detalle);
  };

  const leerRespuestaEliminacionDetalle = async (response) => {
    if (response.status === 204) return null;

    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      return await response.json().catch(() => null);
    }

    return await response.text().catch(() => null);
  };

  const verificarDetalleEliminadoEnBD = async (
    apiBase,
    idOrden,
    idDetalle
  ) => {
    const base = normalizarBaseAPIOrdenTrabajo(apiBase);
    const response = await fetch(`${base}/Leer/${idOrden}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(
        `No fue posible verificar la eliminación en la base de datos. HTTP ${response.status}`
      );
    }

    const data = await response.json().catch(() => null);
    const orden = Array.isArray(data) ? data[0] : data;
    const detallesBD = Array.isArray(orden?.Detalles)
      ? orden.Detalles
      : Array.isArray(orden?.detalles)
        ? orden.detalles
        : [];

    return !detallesBD.some((detalle) =>
      obtenerIdPositivo(
        detalle?.IdDetalle,
        detalle?.idDetalle
      ) === idDetalle
    );
  };

  const eliminarDetallePersistido = async (idOrden, idDetalle) => {
    const bases = obtenerBasesAPIOrdenTrabajo();
    const errores = [];

    for (const base of bases) {
      const apiBase = normalizarBaseAPIOrdenTrabajo(base);
      const url = `${apiBase}/EliminarDetalle/${idDetalle}`;

      let response;

      try {
        response = await fetch(url, {
          method: 'POST',
          headers: {
            Accept: 'application/json'
          },
          cache: 'no-store'
        });
      } catch (errorConexion) {
        try {
          const eliminadoAunqueLaRespuestaFallo =
            await verificarDetalleEliminadoEnBD(
              apiBase,
              idOrden,
              idDetalle
            );

          if (eliminadoAunqueLaRespuestaFallo) {
            guardarBaseAPIOrdenTrabajoPreferida(apiBase);

            return {
              respuesta: null,
              apiBaseUsada: apiBase
            };
          }
        } catch (_) {}

        errores.push(
          `${url} -> ${errorConexion?.message || 'sin conexión'}`
        );
        continue;
      }

      const respuesta = await leerRespuestaEliminacionDetalle(response);

      if (!response.ok) {
        const mensaje =
          respuesta?.mensaje ||
          respuesta?.message ||
          respuesta?.Message ||
          (typeof respuesta === 'string' ? respuesta : '');

        errores.push(
          `${url} -> HTTP ${response.status}${mensaje ? ` - ${mensaje}` : ''}`
        );
        continue;
      }

      if (
        respuesta === false ||
        respuesta?.exito === false ||
        respuesta?.success === false ||
        respuesta?.ok === false
      ) {
        throw new Error(
          respuesta?.mensaje ||
          respuesta?.message ||
          'La API no confirmó la eliminación del detalle.'
        );
      }

      const eliminado = await verificarDetalleEliminadoEnBD(
        apiBase,
        idOrden,
        idDetalle
      );

      if (!eliminado) {
        throw new Error(
          `El detalle ${idDetalle} continúa registrado en la base de datos.`
        );
      }

      guardarBaseAPIOrdenTrabajoPreferida(apiBase);

      return {
        respuesta,
        apiBaseUsada: apiBase
      };
    }

    throw new Error(
      'No fue posible eliminar el producto o servicio en la API.' +
      (errores.length ? ` Rutas probadas: ${errores.join(' | ')}` : '')
    );
  };

  const confirmarEliminacionDetalle = async () => {
    if (!detalleAEliminar || eliminandoDetalle) return;

    setErrorEliminacionDetalle('');

    const idDetalleBD = obtenerIdPositivo(
      detalleAEliminar.IdDetalleBD
    );

    const idOrdenActual = obtenerIdPositivo(
      idOTExistenteConfirmada,
      idRegistroBDRef.current,
      valores.IdRegistroBD,
      valores.idRegistroBD,
      valores.IdOrden,
      valores.Idorden,
      detalleAEliminar.Idorden
    );

    try {
      setEliminandoDetalle(true);

      if (idDetalleBD > 0) {
        if (!idOrdenActual) {
          throw new Error(
            'No fue posible identificar la O.T. a la que pertenece el detalle.'
          );
        }

        await eliminarDetallePersistido(
          idOrdenActual,
          idDetalleBD
        );
      }

      const idVisual = String(detalleAEliminar.IdDetalle);

      setDetalles(prev =>
        prev.filter(
          item => String(item.IdDetalle) !== idVisual
        )
      );

      setDetalleAEliminar(null);
      setErrorEliminacionDetalle('');
    } catch (error) {
      console.error('[OT] Error eliminando detalle:', error);
      setErrorEliminacionDetalle(
        error?.message ||
        'No fue posible eliminar el producto o servicio.'
      );
    } finally {
      setEliminandoDetalle(false);
    }
  };

  const obtenerMontoNumerico = (valor) => {
    const limpio = String(valor ?? '')
      .replace(/\./g, '')
      .replace(/,/g, '.')
      .replace(/[^0-9.-]/g, '');

    const numero = Number(limpio);

    return Number.isFinite(numero) ? Math.round(numero) : 0;
  };

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
      `${API_ORDEN_TRABAJO}/LeerAbono/${encodeURIComponent(
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

    const response = await fetch(
      `${API_ORDEN_TRABAJO}/ActualizarAbono`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
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

  const aplicarNuevoTotalAbonado = (nuevoTotal) => {
    handleChange(
      'AbonadoOT',
      String(nuevoTotal)
    );

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

    if (nuevoTotal === 0) {
      setConfirmarEliminarAbono(true);
      return;
    }
    aplicarNuevoTotalAbonado(nuevoTotal);
  };

  const confirmarEliminarAbonoEnCero = () => {
    aplicarNuevoTotalAbonado(0);
  };

  const cancelarEliminarAbonoEnCero = () => {
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

  const idOTParaAnular = obtenerIdPositivo(
    valores.IdRegistroBD,
    idRegistroBDRef.current
  );
  const numeroOTVisible = String(obtenerIdPositivo(
    valores.IdOrden, valores.Idorden, idOTParaAnular
  ) || '');
  const ordenAnulada = esEstadoAnulado(valores.EstadoOT);

  const abrirConfirmacionAnulacion = () => {
    setErrorAnulacion('');
    setMensajeAnulacion('');

    if (!numeroOTVisible || !idOTParaAnular) {
      setErrorAnulacion('Primero debe buscar y cargar una O.T. guardada.');
      return;
    }
    if (soloLecturaCartola) {
      setErrorAnulacion('La O.T. llegó desde Cartola en modo consulta. Abra la orden desde Buscar para modificarla.');
      return;
    }
    if (ordenAnulada) {
      setErrorAnulacion('Esta Orden de Trabajo ya está anulada.');
      return;
    }
    if (abonoPendienteGuardar || guardandoAbono) {
      setErrorAnulacion('Hay una modificación de abono pendiente. Guárdela o descártela antes de anular.');
      return;
    }
    setConfirmarAnulacion(true);
  };

  const verificarEstadoAnulacionBD = async (idOT, apiBase) => {
    const base = String(apiBase || API_ORDEN_TRABAJO).replace(/\/$/, '');
    const respuesta = await fetch(
      `${base}/Leer/${encodeURIComponent(idOT)}`,
      { method: 'GET', headers: { Accept: 'application/json' }, cache: 'no-store' }
    );
    if (!respuesta.ok) {
      throw new Error(`No fue posible verificar el estado en BD (HTTP ${respuesta.status}).`);
    }
    const json = await respuesta.json();
    const candidatos = [];
    const visitados = new WeakSet();
    const recorrer = (obj) => {
      if (!obj || typeof obj !== 'object' || visitados.has(obj)) return;
      visitados.add(obj);
      if (Array.isArray(obj)) {
        obj.forEach(recorrer);
        return;
      }

      const estado = obj.EstadoOTTexto ?? obj.estadoOTTexto ??
        obj.EstadoOT ?? obj.estadoOT ?? obj.EstadoOt;
      if (estado !== undefined && estado !== null) {
        const idObjeto = obtenerIdPositivo(
          obj.Id, obj.id, obj.IdRegistroBD, obj.idRegistroBD,
          obj.IdOrden, obj.idOrden, obj.IDOrden
        );
        candidatos.push({
          estado: String(estado).trim().toUpperCase(),
          prioridad: idObjeto === Number(idOT) ? 2 : (idObjeto ? 0 : 1)
        });
      }
      Object.values(obj).forEach(recorrer);
    };
    recorrer(json);
    candidatos.sort((a, b) => b.prioridad - a.prioridad);
    return candidatos.find((candidato) => candidato.prioridad === 2)?.estado || '';
  };

  const confirmarAnularOrden = async () => {
    if (anulandoOT) return;
    const idOT = idOTParaAnular;
    if (!idOT || !numeroOTVisible || ordenAnulada || soloLecturaCartola) {
      setConfirmarAnulacion(false);
      setErrorAnulacion('La O.T. seleccionada no está disponible para anular.');
      return;
    }
    if (abonoPendienteGuardar || guardandoAbono) {
      setErrorAnulacion('Primero resuelva el abono pendiente antes de anular.');
      return;
    }
    setAnulandoOT(true);
    setErrorAnulacion('');
    setMensajeAnulacion('');

    try {
      const bases = obtenerBasesAPIOrdenTrabajo();
      const erroresRuta = [];
      let response = null;
      let apiBaseUsada = '';

      for (const base of bases) {
        const url = `${base}/Anular`;

        try {
          const intento = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json'
            },
            cache: 'no-store',
            body: JSON.stringify({ Id: idOT, IdOrden: idOT })
          });

          if (
            intento.status === 404 ||
            intento.status === 405 ||
            intento.status >= 500
          ) {
            erroresRuta.push(`${url} -> HTTP ${intento.status}`);
            continue;
          }

          response = intento;
          apiBaseUsada = base;
          break;
        } catch (errorRuta) {
          erroresRuta.push(`${url} -> ${errorRuta?.message || 'sin conexión'}`);
        }
      }

      if (!response) {
        throw new Error(
          `No fue posible acceder a una ruta válida de anulación. ${erroresRuta.join(' | ')}`
        );
      }

      const texto = await response.text();
      let respuesta = null;
      try { respuesta = texto ? JSON.parse(texto) : null; } catch (_) { respuesta = texto; }

      if (!response.ok) {
        throw new Error(respuesta?.mensaje || respuesta?.message ||
          `No fue posible anular la O.T. (HTTP ${response.status}). ${typeof respuesta === 'string' ? respuesta.slice(0, 160) : ''}`);
      }
      if (respuesta?.exito !== true) {
        throw new Error(respuesta?.mensaje || respuesta?.message || 'La API no confirmó la anulación de la O.T.');
      }
      if (obtenerIdPositivo(respuesta.Id, respuesta.IdOrden) !== idOT) {
        throw new Error('La API respondió con un identificador de O.T. diferente al solicitado.');
      }

      const estadoBD = await verificarEstadoAnulacionBD(idOT, apiBaseUsada);
      if (!esEstadoAnulado(estadoBD)) {
        throw new Error(`La API respondió, pero no se pudo confirmar la anulación guardada en BD. Estado leído: ${estadoBD || 'no disponible'}.`);
      }

      guardarBaseAPIOrdenTrabajoPreferida(apiBaseUsada);
      handleChange('EstadoOT', estadoBD);
      setConfirmarAnulacion(false);
      setMensajeAnulacion(respuesta.yaAnulada
        ? `La O.T. N° ${numeroOTVisible} ya estaba anulada. Estado verificado en la base de datos.`
        : `La O.T. N° ${numeroOTVisible} fue anulada y verificada en la base de datos.`);
      window.dispatchEvent(new CustomEvent('ot:anulada', {
        detail: { idOrden: numeroOTVisible, idRegistroBD: idOT, estado: estadoBD }
      }));
    } catch (error) {
      console.error('[GENERAR OT] Error anulando O.T.:', error);
      setErrorAnulacion(error.message || 'Error desconocido al anular la O.T.');
    } finally {
      setAnulandoOT(false);
    }
  };

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
    if (ordenAnulada) {
      setErrorAnulacion('Esta O.T. está anulada y no puede guardarse nuevamente.');
      return;
    }
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

  const construirDatosOrden = (idExistente = 0) => {
    const cabecera = {
      ...valores,
      IdSucursal:
        String(valores.Sucursal || '1').trim().toUpperCase() === 'INTERNA'
          ? '1'
          : String(valores.Sucursal || '1'),
      Sucursal:
        String(valores.Sucursal || '1').trim() === '1'
          ? 'INTERNA'
          : (valores.Sucursal || 'INTERNA'),
      FechaEntrega: valores.FechaEntrega || '',
      FechaEntregaOT: valores.FechaEntrega || '',
      FechaVencimiento: valores.FechaEntrega || '',
      FechaVencto: valores.FechaEntrega
        ? `${valores.FechaEntrega} ${valores.HoraEntrega || '00:00'}:00`
        : '',
      HoraEntrega: valores.HoraEntrega || '',
      FechaRealEntrega: valores.FechaRealEntrega || valores.FechaRealEntregaOT || '',
      FechaRealEntregaOT: valores.FechaRealEntrega || valores.FechaRealEntregaOT || '',
      Fechainicio: valores.FechaRealEntrega || valores.FechaRealEntregaOT || '',
      HoraTermino: valores.HoraTermino || valores.HoraTerminoOT || '',
      HoraTerminoOT: valores.HoraTermino || valores.HoraTerminoOT || '',
      HoraFin: valores.HoraTermino || valores.HoraTerminoOT || '',
      FechaEntregaCotizacionAprox:
        valores.FechaEntregaCotizacionAprox || valores.FechaEntregaCotizacionApprox || '',
      FechaEntregaCotizacionApprox:
        valores.FechaEntregaCotizacionAprox || valores.FechaEntregaCotizacionApprox || '',
      SinRebajaStock: Boolean(valores.SinRebajaStock),
      EstadoOT: valores.EstadoOT || 'MANTENIMIENTO',
      EstadoOTTexto: valores.EstadoOT || valores.EstadoOTTexto || 'MANTENIMIENTO',
      EncargadoOT: valores.EncargadoOT || valores.NombreEncargado || '',
      NombreEncargado: valores.EncargadoOT || valores.NombreEncargado || '',
      Encargado: valores.EncargadoOT || valores.NombreEncargado || '',
      Vendedor: valores.Vendedor || '',
      NombreVendedor: valores.Vendedor || '',
      VendedorNombre: valores.Vendedor || '',
      IngresoOrdenCompra: valores.IngresoOrdenCompra || '',
      UsuarioModifica: valores.UsuarioModifica || '--',
      NroCotizacionAprobada: valores.NroCotizacionAprobada || '0',
      UsuarioCrea: valores.UsuarioCrea || 'ADMINISTRADOR',
      AbonadoOT: valores.AbonadoOT || '0'
    };

    if (idExistente > 0) {
      cabecera.Id = idExistente;
      cabecera.IdRegistroBD = idExistente;
      cabecera.IdOrden = idExistente;
      cabecera.Idorden = idExistente;
    }

    const detallesPayload = (detalles || []).map((detalle) => {
      const dto = new DTODetalleOrden(detalle);

      if (!idExistente) return dto;

      return {
        ...dto,
        IdOrden: idExistente,
        Idorden: idExistente
      };
    });

    return {
      Cabecera: cabecera,
      Detalles: detallesPayload,
      Imagenes: (imagenes || []).map((imagen) => new DTOImagenOrden(imagen))
    };
  };

  const construirOrdenActualizacion = (idOrden) => {
    const id = obtenerIdPositivo(idOrden);

    if (!id) {
      throw new Error('No existe un identificador válido para actualizar la O.T.');
    }

    const sucursalValor = String(valores.Sucursal || 'INTERNA').trim();
    const sucursal = sucursalValor === '1' ? 'INTERNA' : sucursalValor;
    const estado = String(
      valores.EstadoOT ||
      valores.EstadoOTTexto ||
      'MANTENIMIENTO'
    ).trim();

    return {
      Idorden: String(id),
      IdCliente: String(
        valores.IdCliente ??
        valores.IDCliente ??
        valores.idCliente ??
        ''
      ),
      NombreCliente: String(valores.NombreCliente || valores.Cliente || ''),
      IdEncargado: String(
        valores.IdEncargado ??
        valores.IDEncargado ??
        valores.idEncargado ??
        ''
      ),
      NombreEncargado: String(
        valores.EncargadoOT ||
        valores.NombreEncargado ||
        ''
      ),
      Sucursal: sucursal,
      NotaVenta: String(
        valores.NroNotaVenta ||
        valores.NotaVenta ||
        ''
      ),
      FechaIngreso: String(valores.FechaIngreso || ''),
      FechaEntrega: String(valores.FechaEntrega || ''),
      HoraIngreso: String(valores.HoraIngreso || ''),
      HoraEntrega: String(valores.HoraEntrega || ''),
      Bodega: String(valores.Bodega || ''),
      IdVendedor: String(
        valores.IdVendedor ??
        valores.IDVendedor ??
        valores.idVendedor ??
        ''
      ),
      NombreVendedor: String(
        valores.Vendedor ||
        valores.NombreVendedor ||
        ''
      ),
      Estado: estado,
      EstadoOTTexto: estado,
      UsuarioModificaOT: String(
        valores.UsuarioModificaOT ||
        valores.UsuarioModifica ||
        '--'
      ),
      IngresoOrdenCompra: String(valores.IngresoOrdenCompra || ''),
      ReferenciasDTE: String(valores.ReferenciasDTE || ''),
      FechaRealEntregaOT: String(
        valores.FechaRealEntregaOT ||
        valores.FechaRealEntrega ||
        ''
      ),
      HoraTerminoOT: String(
        valores.HoraTerminoOT ||
        valores.HoraTermino ||
        ''
      ),
      FechaEntregaCotizacionApprox: String(
        valores.FechaEntregaCotizacionApprox ||
        valores.FechaEntregaCotizacionAprox ||
        ''
      ),
      Observaciones: String(valores.Observaciones || ''),
      UsuarioCreaOT: String(
        valores.UsuarioCreaOT ||
        valores.UsuarioCrea ||
        'ADMINISTRADOR'
      ),
      AbonadoOT: String(valores.AbonadoOT || '0'),
      CotizacionAprobada: String(
        valores.CotizacionAprobada ||
        valores.NroCotizacionAprobada ||
        '0'
      ),
      SubTotal: String(valores.SubTotal || '0'),
      DescuentoPorcentaje: String(
        valores.DescuentoPorcentaje ||
        valores.DescuentoPorc ||
        '0'
      ),
      DescuentoMonto: String(
        valores.DescuentoMonto ||
        valores.DescuentoS ||
        '0'
      ),
      TotalNeto: String(valores.TotalNeto || '0'),
      TotalIVA: String(valores.TotalIVA || '0'),
      TotalOT: String(valores.TotalOT || '0')
    };
  };

  const leerRespuestaOrden = async (response) => {
    if (response.status === 204) return null;

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return await response.json().catch(() => null);
    }

    return await response.text().catch(() => null);
  };

  const obtenerEstadoNumericoOrden = async (idOrden, apiBase) => {
    const id = obtenerIdPositivo(idOrden);
    const base = normalizarBaseAPIOrdenTrabajo(apiBase);

    if (!id || !base) return null;

    try {
      const response = await fetch(
        `${base}/Leer/${encodeURIComponent(id)}`,
        {
          method: 'GET',
          headers: { Accept: 'application/json' },
          cache: 'no-store'
        }
      );

      if (!response.ok) return null;

      const json = await response.json().catch(() => null);
      let encontrado = null;
      let alternativo = null;
      const visitados = new WeakSet();

      const recorrer = (obj) => {
        if (!obj || typeof obj !== 'object' || visitados.has(obj)) return;
        visitados.add(obj);

        if (Array.isArray(obj)) {
          obj.forEach(recorrer);
          return;
        }

        const estadoValor = obj.Estado ?? obj.estado;
        const estadoNumero = Number(String(estadoValor ?? '').trim());

        if (Number.isFinite(estadoNumero)) {
          const idObjeto = obtenerIdPositivo(
            obj.Id,
            obj.id,
            obj.IdRegistroBD,
            obj.idRegistroBD,
            obj.IdOrden,
            obj.idOrden,
            obj.IDOrden
          );

          if (idObjeto === id) {
            encontrado = estadoNumero;
          } else if (alternativo === null) {
            alternativo = estadoNumero;
          }
        }

        Object.values(obj).forEach(recorrer);
      };

      recorrer(json);
      return encontrado ?? alternativo;
    } catch (_) {
      return null;
    }
  };

  const actualizarOrdenExistente = async (idOrden, datos) => {
    const id = obtenerIdPositivo(idOrden);

    if (!id) {
      throw new Error('No existe un identificador válido para actualizar la O.T.');
    }

    const bases = obtenerBasesAPIOrdenTrabajo();
    const errores = [];

    for (const baseOriginal of bases) {
      const base = normalizarBaseAPIOrdenTrabajo(baseOriginal);
      if (!base) continue;

      const url = `${base}/Actualizar`;
      const estadoNumerico = await obtenerEstadoNumericoOrden(id, base);
      const datosEnvio = {
        ...datos,
        Estado:
          estadoNumerico !== null && estadoNumerico !== undefined
            ? String(estadoNumerico)
            : String(datos?.Estado ?? '')
      };

      let response;

      try {
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json'
          },
          cache: 'no-store',
          body: JSON.stringify(datosEnvio)
        });
      } catch (errorConexion) {
        errores.push(`${url} -> ${errorConexion?.message || 'sin conexión'}`);
        continue;
      }

      const respuesta = await leerRespuestaOrden(response);

      if (!response.ok) {
        const mensaje =
          respuesta?.mensaje ||
          respuesta?.message ||
          (typeof respuesta === 'string' ? respuesta : '');

        errores.push(
          `${url} -> HTTP ${response.status}${mensaje ? ` - ${mensaje}` : ''}`
        );

        if (
          response.status === 404 ||
          response.status === 405 ||
          response.status >= 500
        ) {
          continue;
        }

        throw new Error(
          `No fue posible actualizar la O.T. ${id}. HTTP ${response.status}${
            mensaje ? ` - ${mensaje}` : ''
          }`
        );
      }

      if (
        respuesta === false ||
        respuesta?.exito === false ||
        respuesta?.success === false ||
        respuesta?.ok === false
      ) {
        errores.push(
          `${url} -> ${
            respuesta?.mensaje ||
            respuesta?.message ||
            'la API no confirmó la actualización'
          }`
        );
        continue;
      }

      guardarBaseAPIOrdenTrabajoPreferida(base);

      return {
        respuesta,
        apiBaseUsada: base
      };
    }

    throw new Error(
      'No fue posible actualizar la O.T. en ninguna API disponible.' +
      (errores.length ? ` ${errores.join(' | ')}` : '')
    );
  };

  const guardarDetallesNuevosOrdenExistente = async (idOrden, apiBaseUsada) => {
    const id = obtenerIdPositivo(idOrden);

    if (!id) {
      throw new Error('No existe un identificador válido para guardar los productos o servicios.');
    }

    const detallesNuevos = detalles
      .filter((detalle) => !obtenerIdPositivo(detalle?.IdDetalleBD))
      .map((detalle) => ({
        Idorden: String(id),
        IdTipo: String(detalle?.IdTipo ?? detalle?.idTipo ?? '2'),
        Codigo: String(
          detalle?.Codigo ??
          detalle?.codigo ??
          detalle?.CodigoProducto ??
          ''
        ),
        Descripcion: String(
          detalle?.Descripcion ??
          detalle?.descripcion ??
          ''
        ),
        Cantidad: String(detalle?.Cantidad ?? detalle?.cantidad ?? '0'),
        ValorUnitario: String(
          detalle?.ValorUnitario ??
          detalle?.valorUnitario ??
          detalle?.ValorNeto ??
          '0'
        ),
        DescuentoPorcentaje: String(
          detalle?.DescuentoPorcentaje ??
          detalle?.descuentoPorcentaje ??
          '0'
        ),
        ComisionPorcentaje: String(
          detalle?.ComisionPorcentaje ??
          detalle?.comisionPorcentaje ??
          '0'
        ),
        TotalComision: String(
          detalle?.TotalComision ??
          detalle?.totalComision ??
          '0'
        )
      }));

    if (detallesNuevos.length === 0) {
      return 0;
    }

    const base = normalizarBaseAPIOrdenTrabajo(
      apiBaseUsada || API_ORDEN_TRABAJO
    );
    const url = `${base}/CrearDetalleOrdenTrabajo`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      cache: 'no-store',
      body: JSON.stringify({
        Detalles: detallesNuevos
      })
    });

    const respuesta = await leerRespuestaEliminacionDetalle(response);

    if (!response.ok) {
      const mensaje =
        respuesta?.mensaje ||
        respuesta?.message ||
        respuesta?.Message ||
        (typeof respuesta === 'string' ? respuesta : '');

      throw new Error(
        `No fue posible guardar los productos o servicios nuevos. HTTP ${response.status}${
          mensaje ? ` - ${mensaje}` : ''
        }`
      );
    }

    if (
      respuesta === false ||
      respuesta?.exito === false ||
      respuesta?.success === false ||
      respuesta?.ok === false
    ) {
      throw new Error(
        respuesta?.mensaje ||
        respuesta?.message ||
        'La API no confirmó el guardado de los productos o servicios.'
      );
    }

    if (seleccionarElementoRef.current) {
      await seleccionarElementoRef.current(
        {
          IdOrden: String(id),
          idOrden: String(id),
          IDOrden: String(id),
          Id: String(id)
        },
        'productosBD'
      );
    }

    return detallesNuevos.length;
  };

  const GuardarOrden = async () => {
    if (ordenAnulada) {
      setConfirmarGuardar(false);
      setErrorAnulacion('Esta O.T. está anulada y no puede modificarse.');
      return;
    }

    if (soloLecturaCartola || procesandoGuardado) return;

    setProcesandoGuardado(true);

    try {
      if (esEdicionOTExistente) {
        const id = idOTExistente;
        const datos = construirOrdenActualizacion(id);

        const resultadoActualizacion =
          await actualizarOrdenExistente(id, datos);

        await guardarDetallesNuevosOrdenExistente(
          id,
          resultadoActualizacion?.apiBaseUsada
        );

        idRegistroBDRef.current = String(id);
        setIdOTExistenteConfirmada(id);
        handleChange('IdRegistroBD', String(id));
        handleChange('IdOrden', String(id));

        alert(`¡Orden de Trabajo N° ${id} actualizada correctamente!`);
        return;
      }

      const datos = construirDatosOrden();
      const response = await OrdenTrabajoServicio.CreateOrdenTrabajo(datos);
      const idCreado = obtenerIdPositivo(
        response?.Id,
        response?.id,
        response?.IdOrden,
        response?.idOrden
      );

      if (idCreado) {
        idRegistroBDRef.current = String(idCreado);
        setIdOTExistenteConfirmada(idCreado);
        handleChange('IdRegistroBD', String(idCreado));
        handleChange('IdOrden', String(idCreado));
      }

      alert(
        `¡Orden de Trabajo guardada correctamente! ID OT: ${
          idCreado || valores.IdOrden || ''
        }`
      );
    } catch (error) {
      console.error(
        esEdicionOTExistente
          ? 'Error al actualizar la orden:'
          : 'Error al guardar la orden:',
        error
      );

      alert(
        esEdicionOTExistente
          ? `Error al actualizar la Orden de Trabajo N° ${idOTExistente}: ${
              error.message || 'Problema en el servidor'
            }`
          : `Error al guardar la orden: ${error.message || 'Problema en el servidor'}`
      );
    } finally {
      setProcesandoGuardado(false);
    }
  };

  const LimpiarFormulario = () => {
    const idOrdenActual = String(
      valores.IdRegistroBD ||
      valores.IdOrden ||
      valores.Idorden ||
      valores.Id ||
      valores.id ||
      ''
    ).trim();

    limpiezaManualRef.current = true;
    idRegistroBDRef.current = '';
    setIdOTExistenteConfirmada(0);
    ultimaOTAutocargadaRef.current = '';

    limpiarBloqueoCartolaGenerar(true);

    if (idOrdenActual) {
      detallesTemporalesPorOT.delete(idOrdenActual);

      try {
        sessionStorage.removeItem(`ot_detalles_generar_${idOrdenActual}`);
        sessionStorage.removeItem(`ot_detalles_actualizados_${idOrdenActual}`);
      } catch (_) {}
    }

    setDetalles([]);
    setSubTab(0);
    setErrores({});
    setDetalleAEliminar(null);
    setConfirmarGuardar(false);
    setProcesandoGuardado(false);
    setConfirmarAnulacion(false);
    setAnulandoOT(false);
    setErrorAnulacion('');
    setMensajeAnulacion('');
    setSoloLecturaCartola(false);
    setModalAbono(false);
    setMontoAbono('');
    setErrorAbono('');
    setConfirmarAccionAbono(false);
    setConfirmarLimpiarAbono(false);
    setGuardandoAbono(false);
    setModalActualizarAbono(false);
    setMontoActualizarAbono('');
    setErrorActualizarAbono('');
    setConfirmarEliminarAbono(false);
    setAbonoPendienteGuardar(false);
    setValorAbonoPendiente(null);
    setConfirmarGuardarAbono(false);
    setAlertaAbonoGuardado({ abierto: false, total: 0 });
    setModalBuscar({ abierto: false, tipo: '', titulo: '' });
    setFiltroTexto('');
    setDatosBusqueda([]);
    setCargandoModal(false);
    setInformeEncargadosAbierto(false);
    cerrarVistaPDF();

    if (typeof limpiarValores === 'function') {
      limpiarValores();
    }

    const camposTexto = [
      'Id', 'id', 'IdOrden', 'Idorden', 'IDOrden', 'IdRegistroBD', 'idRegistroBD',
      'NombreCliente', 'Cliente', 'RUT', 'Rut', 'rut', 'Sucursal',
      'FechaIngreso', 'HoraIngreso', 'FechaEntrega', 'HoraEntrega', 'Bodega',
      'FechaRealEntrega', 'FechaRealEntregaOT', 'HoraTermino', 'HoraTerminoOT',
      'FechaEntregaCotiz', 'FechaEntregaCotizacionAprox', 'FechaEntregaCotizacionApprox',
      'NroNotaVenta', 'EncargadoOT', 'NombreEncargado', 'UsuarioModifica', 'Vendedor',
      'Observaciones', 'SubTotal', 'TotalNeto', 'DescuentoPorc', 'TotalIVA',
      'DescuentoS', 'TotalOT', 'TmpProductoCantidad', 'TmpProductoValorNeto',
      'TmpProductoDescuentoPorc', 'TmpProductoTotalNeto', 'TmpProductoComisionPorc',
      'TmpProductoTotalComision', 'TmpProductoCodigo', 'TmpProductoStock',
      'TmpProductoDescripcion', 'EstadoOT', 'EstadoOTTexto', 'TmpServicioDescripcion',
      'TmpServicioCantidad', 'TmpServicioValor', 'TmpServicioDesc',
      'TmpServicioTotalNeto', 'TmpServicioComision', 'TmpServicioTotalComision',
      'IngresoOrdenCompra', 'NroCotizacionAprobada', 'UsuarioCrea', 'AbonadoOT'
    ];

    camposTexto.forEach((campo) => handleChange(campo, ''));
    handleChange('SinRebajaStock', false);
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
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: { xs: 1.25, sm: 1.5, md: 1.75, lg: 2 },
        width: '100%',
        maxWidth: '1440px',
        mx: 'auto',
        px: { xs: 0.5, sm: 1, md: 1.5 },
        py: { xs: 0.75, sm: 1 },
        boxSizing: 'border-box',
        overflowX: 'hidden',
        '& .MuiInputBase-root': { minWidth: 0 },
        '& .MuiFormControl-root': { minWidth: 0 }
      }}
    >
      <Box
        sx={{
          border: '1px solid #d7e1e8',
          borderRadius: { xs: '8px', sm: '10px' },
          p: { xs: 1.25, sm: 1.75, md: 2 },
          pt: { xs: 2, sm: 2.25 },
          position: 'relative',
          backgroundColor: '#fff',
          width: '100%',
          minWidth: 0,
          boxSizing: 'border-box',
          boxShadow: { xs: 'none', md: '0 1px 4px rgba(15, 23, 42, 0.04)' }
        }}
      >
        <Typography variant="body2" sx={{
          position: 'absolute',
          top: '-10px',
          left: { xs: '12px', sm: '16px' },
          backgroundColor: '#fff',
          px: 0.8,
          color: '#075985',
          fontWeight: 800,
          fontSize: { xs: '11px', sm: '12px' },
          lineHeight: 1.2
        }}>
          Datos de Identificación y Tiempos
        </Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(6, minmax(0, 1fr))', lg: 'repeat(12, minmax(0, 1fr))' }, gap: { xs: 1.25, sm: 1.5, lg: 1.75 }, mt: 0.5, width: '100%', minWidth: 0 }}>
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
            sx={{ gridColumn: { xs: '1 / -1', sm: 'span 6', lg: 'span 7' } }}
          />

          {}
          <FormControl size="small" fullWidth sx={{ gridColumn: { xs: '1 / -1', sm: 'span 6', lg: 'span 5' } }}>
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
            sx={{ ...styleInputIcons, gridColumn: { xs: '1 / -1', sm: 'span 3', lg: 'span 3' } }}
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
            sx={{ ...styleInputIcons, gridColumn: { xs: '1 / -1', sm: 'span 3', lg: 'span 3' } }}
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
            sx={{ ...styleInputIcons, gridColumn: { xs: '1 / -1', sm: 'span 3', lg: 'span 3' } }}
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
            sx={{ ...styleInputIcons, gridColumn: { xs: '1 / -1', sm: 'span 3', lg: 'span 3' } }}
          />

          <FormControl size="small" fullWidth error={!!errores.Bodega} sx={{ gridColumn: { xs: '1 / -1', sm: 'span 6', md: 'span 3', lg: 'span 4' } }}>
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

          <TextField label="Fecha Real Entrega OT" type="date" size="small" fullWidth value={valores.FechaRealEntrega || ''} onChange={(e) => handleChange('FechaRealEntrega', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ ...styleInputIcons, gridColumn: { xs: '1 / -1', sm: 'span 3', lg: 'span 4' } }} />
          <TextField label="Hora Término OT" type="time" size="small" fullWidth value={valores.HoraTermino || ''} onChange={(e) => handleChange('HoraTermino', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ ...styleInputIcons, backgroundColor: '#f4fbf4', gridColumn: { xs: '1 / -1', sm: 'span 3', lg: 'span 4' } }} />
          <TextField label="Fecha Entrega Cotización Aprox." type="date" size="small" fullWidth value={valores.FechaEntregaCotizacionAprox || ''} onChange={(e) => handleChange('FechaEntregaCotizacionAprox', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ ...styleInputIcons, gridColumn: { xs: '1 / -1', sm: 'span 6', lg: 'span 4' } }} />
        </Box>
      </Box>

      {}
      <Box
        sx={{
          border: '1px solid #d7e1e8',
          borderRadius: { xs: '8px', sm: '10px' },
          p: { xs: 1.25, sm: 1.75, md: 2 },
          pt: { xs: 2, sm: 2.25 },
          position: 'relative',
          backgroundColor: '#fff',
          width: '100%',
          minWidth: 0,
          boxSizing: 'border-box',
          boxShadow: { xs: 'none', md: '0 1px 4px rgba(15, 23, 42, 0.04)' }
        }}
      >
        <Typography variant="body2" sx={{
          position: 'absolute',
          top: '-10px',
          left: { xs: '12px', sm: '16px' },
          backgroundColor: '#fff',
          px: 0.8,
          color: '#075985',
          fontWeight: 800,
          fontSize: { xs: '11px', sm: '12px' },
          lineHeight: 1.2
        }}>
          Gestión Interna
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1.5, sm: 2 }, mt: 0.5, width: '100%' }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(6, minmax(0, 1fr))', lg: 'repeat(12, minmax(0, 1fr))' }, gap: { xs: 1.25, sm: 1.5, lg: 1.75 }, width: '100%', minWidth: 0 }}>
            <Box sx={{ gridColumn: { xs: '1 / -1', sm: 'span 6', lg: 'span 3' }, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between', gap: 1 }}>
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
              sx={{ '& .MuiInputBase-input': { fontWeight: 'bold', color: '#0066cc', textAlign: 'center' }, gridColumn: { xs: '1 / -1', sm: 'span 3', lg: 'span 2' } }}
            />

            <TextField
              label="N° Nota de Venta"
              size="small"
              fullWidth
              value={valores.NroNotaVenta || ''}
              onChange={(e) => handleChange('NroNotaVenta', e.target.value)}
              sx={{ gridColumn: { xs: '1 / -1', sm: 'span 3', lg: 'span 3' } }}
            />

            <Box sx={{ gridColumn: { xs: '1 / -1', sm: 'span 6', lg: 'span 4' } }}>
              <FormControl size="small" fullWidth variant="outlined">
                <InputLabel id="estado-ot-select-label">Estado OT</InputLabel>
                <Select
                  labelId="estado-ot-select-label"
                  label="Estado OT"
                  value={valores.EstadoOT || ''}
                  onChange={(e) => handleChange('EstadoOT', e.target.value)}
                >
                  <MenuItem value="MANTENIMIENTO">MANTENIMIENTO</MenuItem>
                  <MenuItem value="APROBADO">APROBADO</MenuItem>
                  <MenuItem value="RECHAZADO">RECHAZADO</MenuItem>
                  <MenuItem value="ANULADA" disabled sx={{ display: 'none' }}>ANULADA</MenuItem>
                  <MenuItem value="ANULADO" disabled sx={{ display: 'none' }}>ANULADO</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(2, minmax(0, 1fr))' }, gap: { xs: 1.25, md: 1.5 }, width: '100%' }}>
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

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(6, minmax(0, 1fr))', lg: 'repeat(12, minmax(0, 1fr))' }, gap: { xs: 1.25, sm: 1.5, lg: 1.75 }, width: '100%', minWidth: 0 }}>
            <TextField
              label="Ingreso Orden de Compra"
              size="small"
              fullWidth
              value={valores.IngresoOrdenCompra || ''}
              onChange={(e) => handleChange('IngresoOrdenCompra', e.target.value)}
              sx={{ gridColumn: { xs: '1 / -1', sm: 'span 6', lg: 'span 6' } }}
            />

            <Button variant="outlined" size="medium" fullWidth sx={{ textTransform: 'none', height: '38px', gridColumn: { xs: '1 / -1', sm: 'span 3', lg: 'span 3' }, fontSize: '11.5px', fontWeight: 'bold' }}>
              Referencias DTE
            </Button>

            <TextField
              label="Usuario Modifica"
              size="small"
              fullWidth
              value={valores.UsuarioModifica || '--'}
              slotProps={{ input: { readOnly: true } }}
              sx={{ gridColumn: { xs: '1 / -1', sm: 'span 3', lg: 'span 3' } }}
            />
          </Box>

          <Box sx={{ width: '100%', mt: 0.5 }}>
            <TextField label="Observaciones" size="small" fullWidth multiline minRows={2} maxRows={5} value={valores.Observaciones || ''} onChange={(e) => handleChange('Observaciones', e.target.value)} sx={{ backgroundColor: '#fffbe6' }} />
          </Box>
        </Box>
      </Box>

      {}
      <Box
        sx={{
          border: '1px solid #d7e1e8',
          borderRadius: { xs: '8px', sm: '10px' },
          backgroundColor: '#f8fafc',
          overflow: 'hidden',
          width: '100%',
          minWidth: 0,
          boxSizing: 'border-box'
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', xl: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'stretch', lg: 'center' },
            backgroundColor: '#e5edf3',
            px: { xs: 1, sm: 1.5 },
            py: 0.5,
            gap: 0.75,
            borderBottom: '1px solid #d7e1e8'
          }}
        >
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
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, gap: 1.5, alignItems: { xs: 'stretch', lg: 'center' }, width: '100%' }}>
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

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', justifyContent: { xs: 'space-between', lg: 'flex-end' }, minWidth: { lg: '220px' } }}>
                <TextField label="Stock" type="text" size="small" value={valores.TmpProductoStock || '0'} slotProps={{ input: { readOnly: true } }} sx={{ width: { xs: '120px', sm: '140px', lg: '90px' }, backgroundColor: '#e0e0e0' }} />
                <FormControlLabel control={<Checkbox checked={valores.SinRebajaStock || false} onChange={(e) => handleChange('SinRebajaStock', e.target.checked)} color="error" size="small" />} label={<Typography variant="caption" sx={{ color: 'red', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Sin rebaja</Typography>} />
              </Box>
            </Box>

            <Box sx={{ width: '100%', display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, minmax(0, 1fr))', xl: 'repeat(6, minmax(0, 1fr))' }, gap: 1 }}>
              <TextField label="Cantidad" type="text" size="small" fullWidth value={valores.TmpProductoCantidad || ''} onKeyDown={validarSoloNumerosKeyDown} onChange={(e) => handleCalculosYCambios('TmpProductoCantidad', e.target.value)} onKeyDownCapture={verificarEnter} sx={{ backgroundColor: '#fff' }} />
              <TextField label="Valor Neto" type="text" size="small" fullWidth value={valores.TmpProductoValorNeto || ''} onKeyDown={validarSoloNumerosKeyDown} onChange={(e) => handleCalculosYCambios('TmpProductoValorNeto', e.target.value)} onKeyDownCapture={verificarEnter} sx={{ backgroundColor: '#fff' }} />
              <TextField label="Descto.(%)" type="text" size="small" fullWidth value={valores.TmpProductoDescuentoPorc || ''} onKeyDown={validarSoloNumerosKeyDown} onChange={(e) => handleCalculosYCambios('TmpProductoDescuentoPorc', e.target.value)} onKeyDownCapture={verificarEnter} sx={{ backgroundColor: '#fff' }} />
              <TextField label="Total Neto" type="text" size="small" fullWidth value={valores.TmpProductoTotalNeto || ''} slotProps={{ input: { readOnly: true } }} sx={{ backgroundColor: '#e0e0e0' }} />
              <TextField label="Comisión (%)" type="text" size="small" fullWidth value={valores.TmpProductoComisionPorc || ''} onKeyDown={validarSoloNumerosKeyDown} onChange={(e) => handleCalculosYCambios('TmpProductoComisionPorc', e.target.value)} sx={{ backgroundColor: '#fff' }} />
              <TextField label="Total Comisión ($)" type="text" size="small" fullWidth value={valores.TmpProductoTotalComision || ''} onKeyDown={validarSoloNumerosKeyDown} onChange={(e) => handleCalculosYCambios('TmpProductoTotalComision', e.target.value)} sx={{ backgroundColor: '#fff' }} />
            </Box>

            <Box sx={{ width: '100%', display: 'flex', justifyContent: { xs: 'stretch', sm: 'flex-end' }, mt: 0.25 }}>
              <Button variant="contained" size="small" sx={{ width: { xs: '100%', sm: 'auto' }, minWidth: { sm: '160px' }, textTransform: 'none', backgroundColor: '#0066cc', borderRadius: '7px' }} onClick={agregarProductoALaTabla}>
                + Insertar Producto
              </Button>
            </Box>
          </Box>
        ) : (
          <Box sx={{ p: { xs: 1, sm: 1.5 }, display: 'flex', flexDirection: 'column', gap: 1.5, backgroundColor: '#f5f5f5', borderBottom: '1px solid #e0e0e0' }}>
            <TextField
              label="Servicio (texto libre)"
              size="small"
              fullWidth
              multiline
              rows={2}
              value={valores.TmpServicioDescripcion || ''}
              onChange={(e) => handleChange('TmpServicioDescripcion', e.target.value)}
              sx={{ backgroundColor: '#fffbe6' }}
              placeholder="Escribe la descripción del servicio técnico aquí..."
            />

            <Box sx={{ width: '100%', display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, minmax(0, 1fr))', xl: 'repeat(6, minmax(0, 1fr))' }, gap: 1 }}>
              <TextField label="Cantidad" type="text" size="small" fullWidth value={valores.TmpServicioCantidad || ''} onKeyDown={validarSoloNumerosKeyDown} onKeyDownCapture={verificarEnterServicio} onChange={(e) => handleCalculosServicio('TmpServicioCantidad', e.target.value)} sx={{ backgroundColor: '#fff' }} />
              <TextField label="Valor Unitario $" type="text" size="small" fullWidth value={valores.TmpServicioValor || ''} onKeyDown={validarSoloNumerosKeyDown} onKeyDownCapture={verificarEnterServicio} onChange={(e) => handleCalculosServicio('TmpServicioValor', e.target.value)} sx={{ backgroundColor: '#fff' }} />
              <TextField label="Descuento (%)" type="text" size="small" fullWidth value={valores.TmpServicioDesc || ''} onKeyDown={validarSoloNumerosKeyDown} onKeyDownCapture={verificarEnterServicio} onChange={(e) => handleCalculosServicio('TmpServicioDesc', e.target.value)} sx={{ backgroundColor: '#fff' }} inputProps={{ maxLength: 3 }} />
              <TextField label="Total Neto $" type="text" size="small" fullWidth value={valores.TmpServicioTotalNeto || ''} sx={{ backgroundColor: '#e0e0e0' }} slotProps={{ input: { readOnly: true } }} />
              <TextField label="Comisión (%)" type="text" size="small" fullWidth value={valores.TmpServicioComision || ''} onKeyDown={validarSoloNumerosKeyDown} onKeyDownCapture={verificarEnterServicio} onChange={(e) => handleCalculosServicio('TmpServicioComision', e.target.value)} sx={{ backgroundColor: '#fff' }} inputProps={{ maxLength: 3 }} />
              <TextField label="Total Comisión ($)" type="text" size="small" fullWidth value={valores.TmpServicioTotalComision || ''} sx={{ backgroundColor: '#e0e0e0' }} slotProps={{ input: { readOnly: true } }} />
            </Box>

            <Box sx={{ width: '100%', display: 'flex', justifyContent: { xs: 'stretch', sm: 'flex-end' }, mt: 0.25 }}>
              <Button variant="contained" size="small" sx={{ width: { xs: '100%', sm: 'auto' }, minWidth: { sm: '160px' }, textTransform: 'none', backgroundColor: '#0066cc', borderRadius: '7px' }} onClick={agregarServicioALaTabla}>
                + Insertar Servicio
              </Button>
            </Box>
          </Box>
        )}

        <TableContainer component={Paper} elevation={0} sx={{ width: '100%', maxWidth: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch', borderRadius: 0 }}>
          <Table size="small" sx={{ minWidth: 980, '& th': { whiteSpace: 'nowrap', fontSize: '11px' }, '& td': { fontSize: '11px' } }}>
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
                  <TableCell align="center">{parseFloat(item.ComisionPorcentaje || 0)}%</TableCell>
                  <TableCell align="right">${parseFloat(item.TotalComision || 0).toLocaleString('es-CL')}</TableCell>
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
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', xl: 'row' }, justifyContent: 'space-between', alignItems: 'stretch', gap: { xs: 1.25, sm: 1.5 }, mt: 0.25, width: '100%', minWidth: 0 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, flex: 1, minWidth: 0, width: '100%' }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', lg: 'row' },
              alignItems: { xs: 'stretch', lg: 'center' },
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
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'repeat(2, minmax(0, 1fr))',
                  sm: 'auto 92px repeat(3, minmax(82px, auto))'
                },
                alignItems: 'center',
                gap: 0.6,
                backgroundColor: '#f0f7ff',
                width: { xs: '100%', lg: 'auto' },
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
                  mr: 0.2,
                  gridColumn: { xs: '1 / -1', sm: 'auto' }
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
                  width: { xs: '100%', sm: '92px' },
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
                disabled={guardandoAbono || !idRegistroBDActual || ordenAnulada}
                onClick={abrirModalAbono}
                sx={{
                  width: { xs: '100%', sm: 'auto' },
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
                  !idRegistroBDActual ||
                  ordenAnulada
                }
                onClick={() => setConfirmarGuardarAbono(true)}
                title={
                  abonoPendienteGuardar
                    ? 'Guardar la actualización del Abonado OT en la base de datos'
                    : 'Use Actualizar para modificar el total abonado'
                }
                sx={{
                  width: { xs: '100%', sm: 'auto' },
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
                disabled={guardandoAbono || !idRegistroBDActual || ordenAnulada}
                onClick={abrirActualizarAbono}
                title="Corregir o reiniciar el total abonado"
                sx={{
                  width: { xs: '100%', sm: 'auto' },
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

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))', lg: 'repeat(5, minmax(0, 1fr))' }, gap: 1, width: '100%' }}>
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
              disabled={soloLecturaCartola || ordenAnulada || anulandoOT || procesandoGuardado}
              title={
                soloLecturaCartola
                  ? 'O.T. cargada desde Cartola. La modificación está deshabilitada.'
                  : esEdicionOTExistente
                    ? `Actualizar la O.T. N° ${idOTExistente}`
                    : 'Guardar una nueva Orden de Trabajo'
              }
              sx={{
                backgroundColor: esEdicionOTExistente ? '#1565c0' : '#2e7d32',
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: '8px',
                '&:hover': {
                  backgroundColor: esEdicionOTExistente ? '#0d47a1' : '#1b5e20'
                },
                '&.Mui-disabled': {
                  backgroundColor: '#cfd8dc',
                  color: '#78909c'
                }
              }}
            >
              {procesandoGuardado
                ? (esEdicionOTExistente ? 'Actualizando...' : 'Guardando...')
                : (esEdicionOTExistente ? 'Actualizar' : 'Grabar')}
            </Button>
            <Button
              variant="contained"
              size="small"
              fullWidth
              startIcon={anulandoOT ? <CircularProgress size={15} color="inherit" /> : <BlockIcon />}
              onClick={abrirConfirmacionAnulacion}
              disabled={anulandoOT || guardandoAbono || !idOTParaAnular || ordenAnulada || soloLecturaCartola}
              title={ordenAnulada ? 'Esta O.T. ya está anulada' : 'Anular esta O.T. guardada en la base de datos'}
              sx={{ backgroundColor: '#d32f2f', textTransform: 'none', fontWeight: 600, borderRadius: '8px', '&:hover': { backgroundColor: '#c62828' }, '&.Mui-disabled': { backgroundColor: '#cfd8dc', color: '#78909c' } }}
            >
              {anulandoOT ? 'Anulando...' : ordenAnulada ? 'Anulada' : 'Anular'}
            </Button>
            <Button
              variant="outlined"
              size="small"
              fullWidth
              startIcon={
                generandoPDF
                  ? <CircularProgress size={15} color="inherit" />
                  : <PrintIcon />
              }
              onClick={handleImprimir}
              disabled={generandoPDF}
              sx={{ gridColumn: { xs: '1 / -1', sm: 'auto' }, color: '#37474f', borderColor: '#b0bec5', textTransform: 'none', fontWeight: 600, borderRadius: '8px', '@media print': { display: 'none' } }}
            >
              {generandoPDF ? 'Generando...' : 'Imprimir'}
            </Button>
          </Box>
          {(errorAnulacion || mensajeAnulacion) && (
            <Box sx={{ mt: 1, width: '100%' }}>
              <Typography role="status" sx={{ fontSize: '12px', color: errorAnulacion ? '#b71c1c' : '#1b5e20', fontWeight: 700 }}>
                {errorAnulacion || mensajeAnulacion}
              </Typography>
            </Box>
          )}
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
              lg: 'repeat(3, minmax(0, 1fr))'
            },
            gap: 1,
            flex: { xs: '1 1 auto', xl: '0 1 560px' },
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

      <Box sx={{ display: 'flex', justifyContent: { xs: 'stretch', sm: 'flex-end' }, mt: 0.25 }}>
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
        onClose={() => {
          if (eliminandoDetalle) return;
          setErrorEliminacionDetalle('');
          setDetalleAEliminar(null);
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

          {errorEliminacionDetalle && (
            <Typography
              sx={{
                mt: 1.5,
                fontSize: '12px',
                color: '#c62828',
                fontWeight: 700,
                lineHeight: 1.5
              }}
            >
              {errorEliminacionDetalle}
            </Typography>
          )}
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
            disabled={eliminandoDetalle}
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
            {eliminandoDetalle ? 'Eliminando...' : 'Aceptar'}
          </Button>

          <Button
            variant="outlined"
            size="small"
            disabled={eliminandoDetalle}
            onClick={() => {
              setErrorEliminacionDetalle('');
              setDetalleAEliminar(null);
            }}
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

      <Dialog
        open={confirmarAnulacion}
        onClose={() => {
          if (!anulandoOT) setConfirmarAnulacion(false);
        }}
        aria-labelledby="titulo-anulacion-ot"
        aria-describedby="descripcion-anulacion-ot"
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            width: 'calc(100% - 32px)',
            maxWidth: 460,
            m: 2,
            borderRadius: '16px',
            overflow: 'hidden',
            border: '1px solid #e2e8f0',
            boxShadow: '0 20px 55px rgba(15, 23, 42, 0.22)'
          }
        }}
      >
        <DialogTitle
          id="titulo-anulacion-ot"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            px: { xs: 2, sm: 3 },
            py: 2,
            borderBottom: '1px solid #f1f5f9',
            backgroundColor: '#fff'
          }}
        >
          <Box
            sx={{
              width: 42,
              height: 42,
              flexShrink: 0,
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#fef2f2',
              color: '#c62828'
            }}
          >
            <BlockIcon sx={{ fontSize: 24 }} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              component="div"
              sx={{
                fontSize: { xs: '16px', sm: '18px' },
                fontWeight: 800,
                lineHeight: 1.25,
                color: '#991b1b'
              }}
            >
              Confirmar anulación de OT
            </Typography>
            <Typography
              component="div"
              sx={{
                mt: 0.4,
                fontSize: '12px',
                color: '#64748b',
                lineHeight: 1.4
              }}
            >
              Verifica la orden antes de continuar.
            </Typography>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ px: { xs: 2, sm: 3 }, pt: '20px !important', pb: 1 }}>
          <Typography
            id="descripcion-anulacion-ot"
            sx={{ fontSize: '13px', color: '#334155', lineHeight: 1.6 }}
          >
            ¿Deseas anular la orden de trabajo
            {' '}
            <Box
              component="span"
              sx={{
                fontWeight: 800,
                color: '#0f172a',
                whiteSpace: 'nowrap'
              }}
            >
              OT N° {numeroOTVisible}
            </Box>
            ?
          </Typography>

          <Box
            sx={{
              mt: 2,
              p: 1.5,
              border: '1px solid #fecaca',
              borderLeft: '3px solid #dc2626',
              borderRadius: '9px',
              backgroundColor: '#fff7f7'
            }}
          >
            <Typography
              sx={{
                mb: 0.5,
                color: '#991b1b',
                fontSize: '12px',
                fontWeight: 800
              }}
            >
              ¿Qué ocurrirá al confirmar?
            </Typography>
            <Typography sx={{ color: '#475569', fontSize: '12px', lineHeight: 1.6 }}>
              La OT se marcará como ANULADA en la base de datos. Sus productos,
              imágenes y abonos se conservarán para mantener el historial.
            </Typography>
          </Box>

          {errorAnulacion && (
            <Box
              role="alert"
              sx={{
                mt: 1.5,
                p: 1.25,
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px'
              }}
            >
              <Typography sx={{ fontSize: '12px', color: '#b91c1c', fontWeight: 700 }}>
                {errorAnulacion}
              </Typography>
            </Box>
          )}
        </DialogContent>

        <DialogActions
          sx={{
            px: { xs: 2, sm: 3 },
            pt: 1.75,
            pb: 2.5,
            gap: 1,
            justifyContent: 'flex-end',
            flexWrap: 'wrap',
            '& > :not(style) ~ :not(style)': { ml: 0 }
          }}
        >
          <Button
            variant="outlined"
            onClick={() => setConfirmarAnulacion(false)}
            disabled={anulandoOT}
            sx={{
              minHeight: 38,
              px: 2,
              borderRadius: '8px',
              textTransform: 'none',
              fontSize: '12px',
              fontWeight: 700,
              color: '#475569',
              borderColor: '#cbd5e1',
              '&:hover': { borderColor: '#94a3b8', backgroundColor: '#f8fafc' }
            }}
          >
            Volver
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={confirmarAnularOrden}
            disabled={anulandoOT}
            startIcon={
              anulandoOT
                ? <CircularProgress size={15} color="inherit" />
                : <BlockIcon sx={{ fontSize: 17 }} />
            }
            sx={{
              minHeight: 38,
              px: 2,
              borderRadius: '8px',
              backgroundColor: '#c62828',
              textTransform: 'none',
              fontSize: '12px',
              fontWeight: 800,
              boxShadow: 'none',
              '&:hover': { backgroundColor: '#a61b1b', boxShadow: 'none' }
            }}
          >
            {anulandoOT ? 'Anulando...' : 'Sí, anular OT'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={confirmarGuardar}
        onClose={() => {
          if (!procesandoGuardado) setConfirmarGuardar(false);
        }}
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
            background: esEdicionOTExistente
              ? 'linear-gradient(135deg, #0d5fa6 0%, #1976d2 100%)'
              : 'linear-gradient(135deg, #2e7d32 0%, #43a047 100%)',
            color: '#fff',
            py: 1.6,
            px: 2.2
          }}
        >
          <Typography sx={{ fontSize: '16px', fontWeight: 800, lineHeight: 1.2 }}>
            {esEdicionOTExistente ? 'Confirmar actualización' : 'Confirmar nueva Orden de Trabajo'}
          </Typography>
          {esEdicionOTExistente && (
            <Typography
              sx={{
                mt: 0.35,
                fontSize: '11px',
                color: 'rgba(255,255,255,0.85)',
                fontWeight: 600
              }}
            >
              Orden de Trabajo N° {idOTExistente}
            </Typography>
          )}
        </DialogTitle>

        <DialogContent sx={{ px: 2.2, pt: '20px !important', pb: 1.5 }}>
          <Typography
            sx={{
              color: '#37474f',
              fontSize: '13px',
              lineHeight: 1.6,
              fontWeight: 500
            }}
          >
            {esEdicionOTExistente
              ? '¿Desea actualizar esta O.T. con la nueva información? Los cambios reemplazarán la información actual y se guardarán en esta misma orden.'
              : '¿Desea guardar esta Orden de Trabajo como un nuevo registro?'}
          </Typography>
        </DialogContent>

        <DialogActions
          sx={{
            px: 2.2,
            pb: 2,
            pt: 0.5,
            gap: 1,
            borderTop: '1px solid #edf1f4',
            justifyContent: 'flex-end'
          }}
        >
          <Button
            variant="outlined"
            disabled={procesandoGuardado}
            onClick={() => setConfirmarGuardar(false)}
            sx={{
              minWidth: 105,
              minHeight: 36,
              borderRadius: '8px',
              textTransform: 'none',
              fontWeight: 700,
              borderColor: '#aab7c2',
              color: '#455a64',
              backgroundColor: '#fff',
              '&:hover': {
                borderColor: '#78909c',
                backgroundColor: '#f7f9fa'
              }
            }}
          >
            Cancelar
          </Button>

          <Button
            variant="contained"
            disabled={procesandoGuardado}
            onClick={async () => {
              setConfirmarGuardar(false);
              await GuardarOrden();
            }}
            sx={{
              minWidth: 115,
              minHeight: 36,
              borderRadius: '8px',
              textTransform: 'none',
              fontWeight: 800,
              boxShadow: 'none',
              backgroundColor: esEdicionOTExistente ? '#1565c0' : '#2e7d32',
              '&:hover': {
                backgroundColor: esEdicionOTExistente ? '#0d47a1' : '#1b5e20',
                boxShadow: '0 4px 10px rgba(21, 101, 192, 0.18)'
              }
            }}
          >
            {procesandoGuardado
              ? esEdicionOTExistente ? 'Actualizando...' : 'Guardando...'
              : esEdicionOTExistente ? 'Actualizar' : 'Sí, grabar'}
          </Button>
        </DialogActions>
      </Dialog>

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
            aria-label="Cerrar buscador"
            onClick={() => { setModalBuscar({ abierto: false, tipo: '', titulo: '' }); setFiltroTexto(''); setDatosBusqueda([]); }}
            sx={{
              color: modalBuscar.tipo === 'productosBD' ? '#003366' : '#fff',
              ml: 1,
              backgroundColor: modalBuscar.tipo === 'productosBD'
                ? '#ffffff'
                : modalBuscar.tipo === 'cliente' ? 'rgba(255,255,255,0.10)' : 'transparent',
              ...(modalBuscar.tipo === 'productosBD' ? {
                border: '2px solid #ffffff',
                boxShadow: '0 0 0 1px rgba(255,255,255,0.75), 0 2px 6px rgba(0,0,0,0.25)',
                width: 36,
                height: 36
              } : {}),
              '&:hover': {
                backgroundColor: modalBuscar.tipo === 'productosBD' ? '#e6f0ff' : 'rgba(255,255,255,0.20)'
              }
            }}
            size="small"
          >
            <CloseIcon sx={{ fontSize: modalBuscar.tipo === 'productosBD' ? 25 : 20 }} />
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
            <TableContainer
              component={Paper}
              elevation={1}
              sx={{
                overflowX: 'auto',
                width: '100%',
                maxHeight: { xs: '58vh', sm: '62vh' },
                borderRadius: '8px',
                border: '1px solid #d9e2ec',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              <Table
                stickyHeader
                size="small"
                sx={{
                  minWidth: modalBuscar.tipo === 'productosBD' ? 850 : 600,
                  tableLayout: modalBuscar.tipo === 'productosBD' ? 'fixed' : 'auto',
                  '& .MuiTableCell-root': {
                    py: 0.7,
                    px: 1,
                    borderBottom: '1px solid #e8edf2'
                  }
                }}
              >
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800, color: '#003366', backgroundColor: '#f3f6f8', width: 42, whiteSpace: 'nowrap' }}>Nro</TableCell>
                    {modalBuscar.tipo === 'productosBD' && (
                      <TableCell align="center" sx={{ fontWeight: 800, color: '#003366', backgroundColor: '#f3f6f8', width: 65, whiteSpace: 'nowrap' }}>
                        N° OT
                      </TableCell>
                    )}
                    <TableCell sx={{ fontWeight: 800, color: '#003366', backgroundColor: '#f3f6f8', width: modalBuscar.tipo === 'productosBD' ? 105 : 130, whiteSpace: 'nowrap' }}>
                      {modalBuscar.tipo === 'productosBD' ? 'RUT' : 'Código'}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#003366', backgroundColor: '#f3f6f8', width: modalBuscar.tipo === 'productosBD' ? 245 : 'auto', whiteSpace: 'nowrap' }}>Descripción</TableCell>
                    {modalBuscar.tipo === 'productosBD' && (
                      <TableCell align="center" sx={{ fontWeight: 800, color: '#003366', backgroundColor: '#f3f6f8', width: 130, whiteSpace: 'nowrap' }}>
                        Estado
                      </TableCell>
                    )}
                    <TableCell align="center" sx={{ fontWeight: 800, color: '#003366', backgroundColor: '#f3f6f8', width: 58, whiteSpace: 'nowrap' }}>Stock</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, color: '#003366', backgroundColor: '#f3f6f8', width: 90, whiteSpace: 'nowrap' }}>Neto</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, color: '#003366', backgroundColor: '#f3f6f8', width: 90, whiteSpace: 'nowrap' }}>Bruto</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800, color: '#003366', backgroundColor: '#f3f6f8', width: 82, whiteSpace: 'nowrap' }}>Seleccionar</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {datosVisibles.map((item, idx) => {
                    const netoVal = parseFloat(item.Neto || item.neto || item.precio || 0);
                    const brutoVal = Math.round(netoVal * 1.19);
                    const descText = item.descripcion || item.nombre || item.Descripcion || 'Sin Descripción';
                    const stockVal = item.Stock ?? item.stock ?? 0;
                    const numeroOT = item.numeroOT || item.NumeroOT || item.IdOrden || item.idOrden || item.Id || item.id || '--';
                    const estadoText = String(
                      item.estadoOT ||
                      item.EstadoOTTexto ||
                      item.estadoOTTexto ||
                      item.EstadoOT ||
                      item.Estado ||
                      '--'
                    ).trim() || '--';

                    return (
                      <TableRow
                        key={item.id || item.Id || idx}
                        hover
                        sx={{
                          height: 38,
                          '&:nth-of-type(even)': { backgroundColor: '#fbfcfd' },
                          '&:hover': { backgroundColor: '#f4f7fa' }
                        }}
                      >
                        <TableCell sx={{ color: '#667085', fontSize: '11.5px', whiteSpace: 'nowrap' }}>{idx + 1}</TableCell>
                        {modalBuscar.tipo === 'productosBD' && (
                          <TableCell align="center" sx={{ color: '#003366', fontWeight: 800, fontSize: '12px', whiteSpace: 'nowrap' }}>
                            {numeroOT}
                          </TableCell>
                        )}
                        <TableCell sx={{ color: '#0056b3', fontWeight: 700, fontFamily: 'monospace', fontSize: '11.5px', whiteSpace: 'nowrap' }}>
                          {modalBuscar.tipo === 'productosBD'
                            ? (item.rut || item.RUT || item.Rut || '--')
                            : (item.codigo || item.Codigo || '--')}
                        </TableCell>
                        <TableCell
                          title={descText}
                          sx={{
                            fontSize: '12px',
                            fontWeight: 500,
                            color: '#1f2937',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          {descText}
                        </TableCell>
                        {modalBuscar.tipo === 'productosBD' && (
                          <TableCell align="center" sx={{ whiteSpace: 'nowrap', overflow: 'hidden' }}>
                            <Chip
                              label={estadoText}
                              title={estadoText}
                              size="small"
                              sx={{
                                height: '21px',
                                maxWidth: '118px',
                                fontSize: '9.5px',
                                fontWeight: 700,
                                color: '#111827',
                                backgroundColor: '#f5f6f7',
                                border: '1px solid #d7dde3',
                                borderRadius: '6px',
                                '& .MuiChip-label': {
                                  px: 0.9,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }
                              }}
                            />
                          </TableCell>
                        )}
                        <TableCell align="center">
                          <Chip
                            label={stockVal}
                            size="small"
                            sx={{
                              height: '19px',
                              minWidth: 22,
                              fontSize: '10px',
                              fontWeight: 700,
                              backgroundColor: stockVal > 0 ? '#e8f5e9' : '#ffebee',
                              color: stockVal > 0 ? '#2e7d32' : '#c62828',
                              '& .MuiChip-label': { px: 0.7 }
                            }}
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: '11.5px', whiteSpace: 'nowrap' }}>${netoVal.toLocaleString('es-CL')}</TableCell>
                        <TableCell align="right" sx={{ fontSize: '11.5px', fontWeight: 700, whiteSpace: 'nowrap' }}>${brutoVal.toLocaleString('es-CL')}</TableCell>
                        <TableCell align="center">
                          <Button
                            size="small"
                            variant="contained"
                            disableElevation
                            onClick={() => handleSeleccionarElemento(item)}
                            sx={{
                              minWidth: 0,
                              px: 1,
                              py: 0.15,
                              minHeight: 24,
                              backgroundColor: '#003366',
                              textTransform: 'none',
                              fontSize: '10.5px',
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
                <TableHead sx={{ backgroundColor: '#f3f6f8' }}>
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

        {modalBuscar.tipo !== 'productosBD' && (
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
        )}
      </Dialog>

      {portalBuscarEncargado && createPortal(
        <Box
          sx={{
            display: 'flex',
            justifyContent: { xs: 'stretch', sm: 'flex-start' },
            alignItems: 'center',
            width: '100%',
            px: { xs: 0, sm: 0 },
            pb: { xs: 1, sm: 1.25 }
          }}
        >
          <Button
            variant="contained"
            startIcon={<PersonSearchIcon />}
            onClick={() => setInformeEncargadosAbierto(true)}
            sx={{
              width: { xs: '100%', sm: 'auto' },
              minWidth: { sm: '165px' },
              minHeight: '34px',
              px: { xs: 1.5, sm: 2 },
              borderRadius: '8px',
              textTransform: 'none',
              fontSize: '12px',
              fontWeight: 800,
              backgroundColor: '#075985',
              boxShadow: '0 2px 6px rgba(7, 89, 133, 0.18)',
              '&:hover': {
                backgroundColor: '#064b70'
              }
            }}
          >
            Buscar encargado
          </Button>
        </Box>,
        portalBuscarEncargado
      )}

      <Dialog
        open={informeEncargadosAbierto}
        onClose={() => setInformeEncargadosAbierto(false)}
        fullScreen
        PaperProps={{
          sx: {
            backgroundColor: '#f4f7fb'
          }
        }}
      >
        <InformeEncargadosOT
          onClose={() => setInformeEncargadosAbierto(false)}
          onEditarOrden={handleEditarOrdenDesdeInforme}
        />
      </Dialog>

      <Dialog
        open={modalPDF.abierto}
        onClose={cerrarVistaPDF}
        maxWidth={false}
        fullWidth
        PaperProps={{
          sx: {
            width: {
              xs: '100vw',
              sm: '96vw',
              md: '92vw',
              lg: '88vw'
            },
            maxWidth: '1440px',
            height: {
              xs: '100dvh',
              sm: '94vh',
              md: '92vh'
            },
            maxHeight: {
              xs: '100dvh',
              sm: '94vh',
              md: '92vh'
            },
            m: {
              xs: 0,
              sm: 1.5,
              md: 2
            },
            borderRadius: {
              xs: 0,
              sm: '12px',
              md: '14px'
            },
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 18px 55px rgba(15, 23, 42, 0.30)'
          }
        }}
      >
        <DialogTitle
          sx={{
            flexShrink: 0,
            py: {
              xs: 1,
              sm: 1.15
            },
            px: {
              xs: 1.25,
              sm: 2
            },
            background:
              'linear-gradient(90deg, #075985 0%, #0369a1 55%, #0284c7 100%)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1.5
          }}
        >
          <Box
            sx={{
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 0.25
            }}
          >
            <Typography
              sx={{
                fontWeight: 800,
                fontSize: {
                  xs: '14px',
                  sm: '16px'
                },
                lineHeight: 1.2
              }}
            >
              Imprimir Orden de Trabajo en PDF
            </Typography>

            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                minWidth: 0
              }}
            >
              <Typography
                sx={{
                  fontSize: {
                    xs: '10px',
                    sm: '11px'
                  },
                  opacity: 0.88,
                  whiteSpace: 'nowrap'
                }}
              >
                Documento:
              </Typography>

              <Typography
                title={modalPDF.nombre || 'OrdenTrabajo.pdf'}
                sx={{
                  fontSize: {
                    xs: '10px',
                    sm: '11px'
                  },
                  fontWeight: 700,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: {
                    xs: '210px',
                    sm: '420px',
                    md: '650px'
                  }
                }}
              >
                {modalPDF.nombre || 'OrdenTrabajo.pdf'}
              </Typography>
            </Box>
          </Box>

          <IconButton
            onClick={cerrarVistaPDF}
            size="small"
            sx={{
              flexShrink: 0,
              color: '#fff',
              backgroundColor: 'rgba(255,255,255,0.10)',
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.20)'
              }
            }}
            aria-label="Cerrar PDF"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent
          sx={{
            p: {
              xs: 0,
              sm: 0.75,
              md: 1
            },
            backgroundColor: '#1f2937',
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
            display: 'flex'
          }}
        >
          {modalPDF.url ? (
            <Box
              sx={{
                width: '100%',
                height: '100%',
                minHeight: 0,
                borderRadius: {
                  xs: 0,
                  sm: '8px'
                },
                overflow: 'hidden',
                backgroundColor: '#fff'
              }}
            >
              <Box
                component="iframe"
                ref={pdfIframeRef}
                src={modalPDF.url}
                title="Orden de Trabajo en PDF"
                sx={{
                  border: 0,
                  width: '100%',
                  height: '100%',
                  minHeight: {
                    xs: 'calc(100dvh - 126px)',
                    sm: '72vh',
                    md: '74vh'
                  },
                  display: 'block',
                  backgroundColor: '#fff'
                }}
              />
            </Box>
          ) : (
            <Box
              sx={{
                width: '100%',
                minHeight: {
                  xs: 'calc(100dvh - 126px)',
                  sm: '72vh'
                },
                display: 'flex',
                flexDirection: 'column',
                gap: 1.25,
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff'
              }}
            >
              <CircularProgress color="inherit" />
              <Typography sx={{ fontSize: '12px' }}>
                Preparando documento PDF...
              </Typography>
            </Box>
          )}
        </DialogContent>

        <DialogActions
          sx={{
            flexShrink: 0,
            px: {
              xs: 1,
              sm: 1.5,
              md: 2
            },
            py: {
              xs: 0.9,
              sm: 1
            },
            gap: {
              xs: 0.75,
              sm: 1
            },
            borderTop: '1px solid #dbe3ea',
            backgroundColor: '#fff',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: {
              xs: 'stretch',
              sm: 'flex-start'
            }
          }}
        >
          <Button
            onClick={imprimirPDFVisualizado}
            variant="contained"
            startIcon={<PrintIcon />}
            disabled={!modalPDF.url}
            sx={{
              flex: {
                xs: '1 1 calc(50% - 6px)',
                sm: '0 0 auto'
              },
              minWidth: {
                xs: 0,
                sm: '135px'
              },
              minHeight: '36px',
              textTransform: 'none',
              fontWeight: 700,
              borderRadius: '8px',
              backgroundColor: '#0b75ad',
              '&:hover': {
                backgroundColor: '#075985'
              }
            }}
          >
            Imprimir PDF
          </Button>

          <Button
            component="a"
            href={modalPDF.url || undefined}
            download={modalPDF.nombre || 'OrdenTrabajo.pdf'}
            variant="outlined"
            startIcon={<SaveIcon />}
            disabled={!modalPDF.url}
            sx={{
              flex: {
                xs: '1 1 calc(50% - 6px)',
                sm: '0 0 auto'
              },
              minWidth: {
                xs: 0,
                sm: '150px'
              },
              minHeight: '36px',
              textTransform: 'none',
              fontWeight: 700,
              borderRadius: '8px'
            }}
          >
            Descargar PDF
          </Button>

          <Box
            sx={{
              display: {
                xs: 'none',
                sm: 'block'
              },
              flex: 1
            }}
          />

          <Button
            onClick={cerrarVistaPDF}
            color="inherit"
            variant="text"
            sx={{
              flex: {
                xs: '1 1 100%',
                sm: '0 0 auto'
              },
              minHeight: '36px',
              textTransform: 'none',
              fontWeight: 700,
              borderRadius: '8px',
              color: '#475569'
            }}
          >
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
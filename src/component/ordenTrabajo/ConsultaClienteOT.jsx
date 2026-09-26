import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  RadioGroup,
  FormControlLabel,
  Radio,
  IconButton,
  Card,
  CardContent,
  TextField,
  Button,
  InputAdornment,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip
} from '@mui/material';
import {
  Search,
  Close,
  NavigateBefore,
  NavigateNext,
  SkipPrevious,
  SkipNext
} from '@mui/icons-material';

const API_ORDENES = 'http://localhost/Api/api/OrdenTrabajo/Leer/0';
const BASE_API_URL =
  process.env.REACT_APP_API_URL ||
  'http://localhost/apichess';
const API_CLIENTES =
  `${BASE_API_URL}/clientes.php/getAllClientes`;

const FILAS_POR_PAGINA = 8;

const normalizarTexto = (valor) =>
  String(valor ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();

const normalizarClaveCliente = (valor) =>
  normalizarTexto(valor)
    .replace(/[^A-Z0-9]/g, '');

const extraerClientes = (respuesta) => {
  if (Array.isArray(respuesta)) {
    return respuesta;
  }

  if (!respuesta || typeof respuesta !== 'object') {
    return [];
  }

  const candidatosDirectos = [
    respuesta.data,
    respuesta.clientes,
    respuesta.Clientes,
    respuesta.listado,
    respuesta.result,
    respuesta.resultado,
    respuesta.items
  ];

  for (const candidato of candidatosDirectos) {
    if (Array.isArray(candidato)) {
      return candidato;
    }

    if (candidato && typeof candidato === 'object') {
      const valores = Object.values(candidato);

      if (
        valores.length > 0 &&
        valores.every(
          (item) =>
            item &&
            typeof item === 'object' &&
            !Array.isArray(item)
        )
      ) {
        return valores;
      }

      const encontrados = extraerClientes(candidato);
      if (encontrados.length > 0) {
        return encontrados;
      }
    }
  }

  for (const valor of Object.values(respuesta)) {
    if (Array.isArray(valor)) {
      return valor;
    }

    if (valor && typeof valor === 'object') {
      const encontrados = extraerClientes(valor);

      if (encontrados.length > 0) {
        return encontrados;
      }
    }
  }

  return [];
};

const obtenerValor = (objeto, aliases, valorDefecto = '') => {
  if (!objeto || typeof objeto !== 'object') {
    return valorDefecto;
  }

  const claves = Object.keys(objeto);
  const mapa = new Map(
    claves.map((clave) => [
      normalizarTexto(clave).replace(/[^A-Z0-9]/g, ''),
      clave
    ])
  );

  for (const alias of aliases) {
    const claveNormalizada = normalizarTexto(alias).replace(/[^A-Z0-9]/g, '');
    const claveReal = mapa.get(claveNormalizada);

    if (claveReal !== undefined) {
      const valor = objeto[claveReal];

      if (
        valor !== undefined &&
        valor !== null &&
        String(valor).trim() !== ''
      ) {
        return valor;
      }
    }
  }

  return valorDefecto;
};

const convertirNumero = (valor) => {
  if (typeof valor === 'number') {
    return Number.isFinite(valor) ? valor : 0;
  }

  const texto = String(valor ?? '')
    .trim()
    .replace(/\$/g, '')
    .replace(/\s/g, '');

  if (!texto) return 0;

  // En estos datos los puntos se utilizan habitualmente como separador de miles.
  const limpio = texto.includes(',')
    ? texto.replace(/\./g, '').replace(',', '.')
    : texto.replace(/\./g, '');

  const numero = Number(limpio);

  return Number.isFinite(numero) ? numero : 0;
};

const formatearFecha = (valor) => {
  if (!valor) return '--';

  const texto = String(valor).trim();

  let match = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }

  match = texto.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);

  if (match) {
    return `${String(match[1]).padStart(2, '0')}/${String(match[2]).padStart(2, '0')}/${match[3]}`;
  }

  const fecha = new Date(texto);

  if (!Number.isNaN(fecha.getTime())) {
    return fecha.toLocaleDateString('es-CL');
  }

  return texto;
};

const extraerListado = (respuesta) => {
  if (Array.isArray(respuesta)) {
    return respuesta;
  }

  if (!respuesta || typeof respuesta !== 'object') {
    return [];
  }

  const candidatos = [
    respuesta.data,
    respuesta.listado,
    respuesta.result,
    respuesta.resultado,
    respuesta.items,
    respuesta.ordenes,
    respuesta.Ordenes
  ];

  for (const candidato of candidatos) {
    if (Array.isArray(candidato)) {
      return candidato;
    }
  }

  const valores = Object.values(respuesta);

  for (const valor of valores) {
    if (Array.isArray(valor)) {
      return valor;
    }
  }

  return valores.filter(
    (valor) =>
      valor &&
      typeof valor === 'object' &&
      !Array.isArray(valor)
  );
};

const normalizarOrden = (item, index) => {
  const idOrdenCampo = obtenerValor(item, [
    'IdOrden',
    'idOrden',
    'IDOrden'
  ], '');

  const idRegistroCampo = obtenerValor(item, [
    'Id',
    'id',
    'ID'
  ], '');

  /*
    En tu API varios registros vienen así:
      IdOrden = 0
      Id = 72 / 73 / 74 / ...

    Por eso NO debemos tomar IdOrden cuando vale 0.
    Primero usamos IdOrden si es válido y distinto de 0;
    de lo contrario usamos Id.
  */
  const idOrdenNumerico = Number(idOrdenCampo);
  const idRegistroNumerico = Number(idRegistroCampo);

  const idOt =
    String(idOrdenCampo).trim() !== '' &&
      Number.isFinite(idOrdenNumerico) &&
      idOrdenNumerico > 0
      ? idOrdenCampo
      : (
        String(idRegistroCampo).trim() !== '' &&
          Number.isFinite(idRegistroNumerico) &&
          idRegistroNumerico > 0
          ? idRegistroCampo
          : index + 1
      );

  const cliente = String(
    obtenerValor(item, [
      'NombreCliente',
      'nombreCliente',
      'Cliente',
      'cliente',
      'RazonSocial',
      'razonSocial',
      'ClienteNombre',
      'clienteNombre'
    ], '')
  ).trim();

  const rut = String(
    obtenerValor(item, [
      'RUT',
      'Rut',
      'rut',
      'RUTCliente',
      'RutCliente',
      'rutCliente',
      'ClienteRUT',
      'ClienteRut',
      'clienteRut'
    ], '')
  ).trim();

  const observaciones = String(
    obtenerValor(item, [
      'Observaciones',
      'observaciones',
      'Descripcion',
      'descripcion',
      'Detalle',
      'detalle'
    ], '')
  ).trim();

  const estado = String(
    obtenerValor(item, [
      'EstadoOT',
      'estadoOT',
      'Estado',
      'estado',
      'EstadoOTTexto',
      'estadoOTTexto'
    ], 'SIN ESTADO')
  ).trim();

  const fechaIngreso = obtenerValor(item, [
    'FechaIngreso',
    'fechaIngreso',
    'IngresoOT',
    'ingresoOT'
  ], '');

  const neto = convertirNumero(
    obtenerValor(item, [
      'TotalOT',
      'totalOT',
      'TotalNeto',
      'totalNeto',
      'SubTotal',
      'subTotal',
      'Monto',
      'monto',
      'Neto',
      'neto'
    ], 0)
  );

  const producto = String(
    obtenerValor(item, [
      'Producto',
      'producto',
      'DescripcionProducto',
      'descripcionProducto',
      'NombreProducto',
      'nombreProducto'
    ], '')
  ).trim();

  const codigoProducto = String(
    obtenerValor(item, [
      'CodigoProducto',
      'codigoProducto',
      'CodProducto',
      'codProducto',
      'SKU',
      'sku',
      'IdProducto',
      'idProducto'
    ], '')
  ).trim();

  const facturadaRaw = obtenerValor(item, [
    'Facturada',
    'facturada',
    'Facturado',
    'facturado',
    'EsFacturada',
    'esFacturada',
    'EstadoFactura',
    'estadoFactura'
  ], '');

  const facturada = [
    '1',
    'TRUE',
    'SI',
    'SÍ',
    'FACTURADA',
    'FACTURADO'
  ].includes(normalizarTexto(facturadaRaw));

  const descripcion = [cliente, observaciones]
    .filter(Boolean)
    .join(' - ');

  return {
    original: item,
    idOt: String(idOt),
    codigo: `OT-${idOt}`,
    rut,
    cliente,
    observaciones,
    descripcion: descripcion || `Orden de Trabajo N° ${idOt}`,
    producto,
    codigoProducto,
    fechaIngreso: formatearFecha(fechaIngreso),
    estado,
    neto,
    bruto: Math.round(neto * 1.19),
    facturada
  };
};


const buscarValorProfundo = (raiz, aliases = []) => {
  const aliasesNormalizados = aliases.map(
    (alias) => normalizarTexto(alias).replace(/[^A-Z0-9]/g, '')
  );

  const visitados = new WeakSet();

  const recorrer = (valor) => {
    if (
      valor === null ||
      valor === undefined ||
      typeof valor !== 'object'
    ) {
      return '';
    }

    if (visitados.has(valor)) {
      return '';
    }

    visitados.add(valor);

    if (Array.isArray(valor)) {
      for (const item of valor) {
        const encontrado = recorrer(item);

        if (
          encontrado !== '' &&
          encontrado !== null &&
          encontrado !== undefined
        ) {
          return encontrado;
        }
      }

      return '';
    }

    for (const [clave, contenido] of Object.entries(valor)) {
      const claveNormalizada = normalizarTexto(clave)
        .replace(/[^A-Z0-9]/g, '');

      if (
        aliasesNormalizados.includes(claveNormalizada) &&
        contenido !== null &&
        contenido !== undefined &&
        typeof contenido !== 'object' &&
        String(contenido).trim() !== ''
      ) {
        return contenido;
      }
    }

    for (const contenido of Object.values(valor)) {
      if (contenido && typeof contenido === 'object') {
        const encontrado = recorrer(contenido);

        if (
          encontrado !== '' &&
          encontrado !== null &&
          encontrado !== undefined
        ) {
          return encontrado;
        }
      }
    }

    return '';
  };

  return recorrer(raiz);
};

const formatearFechaInput = (valor) => {
  if (!valor) return '';

  const texto = String(valor).trim();

  let match = texto.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);

  if (match) {
    return `${match[1]}-${String(match[2]).padStart(2, '0')}-${String(
      match[3]
    ).padStart(2, '0')}`;
  }

  match = texto.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);

  if (match) {
    return `${match[3]}-${String(match[2]).padStart(2, '0')}-${String(
      match[1]
    ).padStart(2, '0')}`;
  }

  const fecha = new Date(texto);

  if (!Number.isNaN(fecha.getTime())) {
    return `${fecha.getFullYear()}-${String(
      fecha.getMonth() + 1
    ).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
  }

  return '';
};

const formatearHoraInput = (valor) => {
  if (!valor) return '';

  const match = String(valor)
    .trim()
    .match(/(?:T|\s|^)(\d{1,2}):(\d{2})(?::\d{2})?/);

  if (!match) return '';

  return `${String(match[1]).padStart(2, '0')}:${match[2]}`;
};

const obtenerIdValido = (...valores) => {
  for (const valor of valores) {
    const texto = String(valor ?? '').trim();
    const numero = Number(texto);

    if (
      texto !== '' &&
      Number.isFinite(numero) &&
      numero > 0
    ) {
      return texto;
    }
  }

  return '';
};

const CLAVE_CARTOLA_BUSQUEDA = 'cartolaOT_busqueda_actual';
const CLAVE_CARTOLA_FILTRO = 'cartolaOT_filtro_actual';
const CLAVE_CARTOLA_SELECCION = 'cartolaOT_seleccion_actual';
const CLAVE_OT_COMPARTIDA = 'cartolaOT_orden_compartida';
const CLAVE_BLOQUEO_CARTOLA_GENERAR = 'generarOT_bloqueo_cartola';

// Token exclusivo de la carga actual de la página.
// Al hacer F5/recargar, window se recrea y este token cambia.
const obtenerTokenDocumentoOT = () => {
  if (typeof window === 'undefined') return '';

  if (!window.__OT_DOCUMENT_TOKEN__) {
    window.__OT_DOCUMENT_TOKEN__ = `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}`;
  }

  return window.__OT_DOCUMENT_TOKEN__;
};

export default function ConsultaClienteOT({
  formOrden = {},
  valores = {},
  handleChange = null
}) {
  const [filtroRadio, setFiltroRadio] = useState(() => {
    try {
      return sessionStorage.getItem(CLAVE_CARTOLA_FILTRO) || 'Todas';
    } catch (_) {
      return 'Todas';
    }
  });

  const [busquedaOrden, setBusquedaOrden] = useState(() => {
    try {
      return sessionStorage.getItem(CLAVE_CARTOLA_BUSQUEDA) || '';
    } catch (_) {
      return '';
    }
  });

  const [ordenesTodas, setOrdenesTodas] = useState([]);
  const [ordenBase, setOrdenBase] = useState(null);
  const [ordenSeleccionada, setOrdenSeleccionada] = useState(null);
  const [ordenesRelacionadas, setOrdenesRelacionadas] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [cargandoSeleccion, setCargandoSeleccion] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [pagina, setPagina] = useState(0);

  const [modalOrdenesAbierto, setModalOrdenesAbierto] = useState(false);
  const [filtroModalOrdenes, setFiltroModalOrdenes] = useState('');
  const [cargandoModalOrdenes, setCargandoModalOrdenes] = useState(false);
  const [errorModalOrdenes, setErrorModalOrdenes] = useState('');
  const restauracionRealizadaRef = useRef(false);

  const formularioCompartido =
    valores &&
      typeof valores === 'object' &&
      Object.keys(valores).length > 0
      ? valores
      : formOrden;

  useEffect(() => {
    try {
      sessionStorage.setItem(
        CLAVE_CARTOLA_BUSQUEDA,
        String(busquedaOrden || '')
      );

      sessionStorage.setItem(
        CLAVE_CARTOLA_FILTRO,
        String(filtroRadio || 'Todas')
      );
    } catch (_) { }
  }, [busquedaOrden, filtroRadio]);

  const aplicarCamposAlFormulario = useCallback(
    (campos) => {
      if (!campos || typeof campos !== 'object') {
        return;
      }

      /*
        Si el componente padre ya entrega handleChange,
        ésta es la forma React correcta de actualizar todo.
      */
      if (typeof handleChange === 'function') {
        Object.entries(campos).forEach(([campo, valor]) => {
          handleChange(campo, valor);
        });
      }

      /*
        Respaldo para tu estructura actual:
        Cartola suele recibir el mismo objeto "valores" que usan
        Generar OT, Imágenes OT y Presupuesto OT.
        Se sincroniza ese objeto para que al cambiar de pestaña
        ya contenga la O.T. seleccionada.
      */
      if (
        formularioCompartido &&
        typeof formularioCompartido === 'object'
      ) {
        Object.assign(formularioCompartido, campos);
      }

      if (
        formOrden &&
        typeof formOrden === 'object'
      ) {
        Object.assign(formOrden, campos);
      }

      if (
        valores &&
        typeof valores === 'object'
      ) {
        Object.assign(valores, campos);
      }

      try {
        sessionStorage.setItem(
          CLAVE_OT_COMPARTIDA,
          JSON.stringify(campos)
        );

        const idOrdenBloqueo = String(
          campos.IdOrden ||
          campos.Idorden ||
          campos.IdOT ||
          campos.Id ||
          ''
        ).trim();

        if (idOrdenBloqueo) {
          sessionStorage.setItem(
            CLAVE_BLOQUEO_CARTOLA_GENERAR,
            JSON.stringify({
              idOrden: idOrdenBloqueo,
              tokenDocumento: obtenerTokenDocumentoOT(),
              creadoEn: Date.now()
            })
          );
        }
      } catch (_) { }

      window.__OT_CARTOLA_SELECCIONADA__ = campos;

      window.dispatchEvent(
        new CustomEvent('ot:cartola-orden-cargada', {
          detail: campos
        })
      );

      window.dispatchEvent(
        new CustomEvent('ot:seleccionar-desde-cartola', {
          detail: {
            idOrden: campos.IdOrden,
            item: campos
          }
        })
      );
    },
    [formOrden, formularioCompartido, handleChange, valores]
  );

  const cargarOrdenes = useCallback(async () => {
    const response = await fetch(API_ORDENES, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const json = await response.json();
    const listado = extraerListado(json);
    const ordenesNormalizadas =
      listado.map(normalizarOrden);

    /*
      La respuesta de OrdenTrabajo no siempre trae el RUT.
      En vez de depender de getAllClientes con busqueda vacía,
      buscamos solamente los clientes que aparecen en las O.T.
      Esto evita que un límite/paginación del servicio deje clientes fuera.
    */
    try {
      const nombresClientes = Array.from(
        new Set(
          ordenesNormalizadas
            .filter((orden) => !orden.rut && orden.cliente)
            .map((orden) => String(orden.cliente).trim())
            .filter(Boolean)
        )
      );

      const resultadosClientes = await Promise.all(
        nombresClientes.map(async (nombreClienteOT) => {
          try {
            const responseCliente = await fetch(API_CLIENTES, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                idsucursal: '1',
                busqueda: nombreClienteOT,
                id: 0
              })
            });

            if (!responseCliente.ok) {
              console.warn(
                `[Cartola OT] No fue posible consultar cliente "${nombreClienteOT}". HTTP ${responseCliente.status}`
              );

              return {
                clave: normalizarClaveCliente(nombreClienteOT),
                rut: ''
              };
            }

            const respuestaCliente =
              await responseCliente.json();

            const clientesEncontrados =
              extraerClientes(respuestaCliente);

            const claveBuscada =
              normalizarClaveCliente(nombreClienteOT);

            let clienteEncontrado =
              clientesEncontrados.find((clienteItem) => {
                const nombre = buscarValorProfundo(
                  clienteItem,
                  [
                    'RazonSocial',
                    'razonSocial',
                    'Razon_Social',
                    'razon_social',
                    'NombreCliente',
                    'nombreCliente',
                    'ClienteNombre',
                    'clienteNombre',
                    'Nombre',
                    'nombre'
                  ]
                );

                return (
                  normalizarClaveCliente(nombre) ===
                  claveBuscada
                );
              });

            /*
              Respaldo para nombres que vienen con pequeñas diferencias
              de puntos, guiones, espacios o abreviaciones.
            */
            if (!clienteEncontrado) {
              const coincidencias =
                clientesEncontrados.filter(
                  (clienteItem) => {
                    const nombre =
                      buscarValorProfundo(
                        clienteItem,
                        [
                          'RazonSocial',
                          'razonSocial',
                          'Razon_Social',
                          'razon_social',
                          'NombreCliente',
                          'nombreCliente',
                          'ClienteNombre',
                          'clienteNombre',
                          'Nombre',
                          'nombre'
                        ]
                      );

                    const claveCliente =
                      normalizarClaveCliente(nombre);

                    return (
                      claveCliente &&
                      (
                        claveCliente.includes(claveBuscada) ||
                        claveBuscada.includes(claveCliente)
                      )
                    );
                  }
                );

              if (coincidencias.length === 1) {
                clienteEncontrado = coincidencias[0];
              }
            }

            /*
              Si el servicio devuelve un único resultado para la búsqueda,
              también lo aceptamos como último respaldo.
            */
            if (
              !clienteEncontrado &&
              clientesEncontrados.length === 1
            ) {
              clienteEncontrado =
                clientesEncontrados[0];
            }

            const rutCliente = clienteEncontrado
              ? String(
                  buscarValorProfundo(
                    clienteEncontrado,
                    [
                      'RUT',
                      'Rut',
                      'rut',
                      'RUTCliente',
                      'RutCliente',
                      'rutCliente',
                      'rut_cliente',
                      'RUT_CLIENTE',
                      'ClienteRUT',
                      'ClienteRut',
                      'clienteRut',
                      'CodigoRut',
                      'codigoRut',
                      'RutEmpresa',
                      'rutEmpresa',
                      'Codigo',
                      'codigo'
                    ]
                  ) || ''
                ).trim()
              : '';

            console.log(
              `[Cartola OT] Cliente: ${nombreClienteOT} | RUT: ${rutCliente || 'NO ENCONTRADO'}`
            );

            return {
              clave: claveBuscada,
              rut: rutCliente
            };
          } catch (errorCliente) {
            console.warn(
              `[Cartola OT] Error buscando RUT de "${nombreClienteOT}":`,
              errorCliente
            );

            return {
              clave: normalizarClaveCliente(nombreClienteOT),
              rut: ''
            };
          }
        })
      );

      const rutPorCliente = new Map(
        resultadosClientes
          .filter((resultado) => resultado.clave)
          .map((resultado) => [
            resultado.clave,
            resultado.rut
          ])
      );

      return ordenesNormalizadas.map((orden) => {
        if (orden.rut) {
          return orden;
        }

        const claveCliente =
          normalizarClaveCliente(orden.cliente);

        return {
          ...orden,
          rut:
            rutPorCliente.get(claveCliente) ||
            ''
        };
      });
    } catch (errorClientes) {
      console.warn(
        '[Cartola OT] No fue posible recuperar RUT de clientes:',
        errorClientes
      );

      return ordenesNormalizadas;
    }
  }, []);

  const irAGenerarOT = useCallback(() => {
    try {
      window.dispatchEvent(
        new CustomEvent('ot:cambiar-pestana', {
          detail: {
            pestaña: 'Generar OT',
            pestana: 'Generar OT',
            tab: 'generarOT',
            indice: 0
          }
        })
      );
    } catch (_) { }

    /*
      Respaldo para la estructura actual con Tabs de Material UI:
      busca la pestaña visible cuyo texto es exactamente "Generar OT"
      y la activa sin depender de cómo el componente padre maneja el índice.
    */
    const activarPestana = () => {
      const elementos = Array.from(
        document.querySelectorAll(
          '[role="tab"], button'
        )
      );

      const tabGenerar = elementos.find((elemento) => {
        const texto = String(
          elemento?.textContent || ''
        )
          .replace(/\s+/g, ' ')
          .trim()
          .toUpperCase();

        return texto === 'GENERAR OT';
      });

      if (
        tabGenerar &&
        typeof tabGenerar.click === 'function'
      ) {
        tabGenerar.click();
        return true;
      }

      return false;
    };

    /*
      Esperamos un frame para que React termine de compartir
      la información antes de cambiar de pestaña.
    */
    requestAnimationFrame(() => {
      if (!activarPestana()) {
        setTimeout(activarPestana, 80);
      }
    });
  }, []);

  const cargarOrdenCompleta = useCallback(
    async (orden) => {
      const idSeleccionado = obtenerIdValido(
        orden?.idOt,
        orden?.original?.IdOrden,
        orden?.original?.idOrden,
        orden?.original?.Id,
        orden?.original?.id
      );

      if (!idSeleccionado) {
        setMensaje(
          'La Orden de Trabajo seleccionada no tiene un ID válido.'
        );
        return false;
      }

      setCargandoSeleccion(true);

      try {
        const response = await fetch(
          `http://localhost/Api/api/OrdenTrabajo/Leer/${encodeURIComponent(
            idSeleccionado
          )}`,
          {
            method: 'GET',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json'
            }
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const respuesta = await response.json();

        const origen = {
          ...(orden?.original || {}),
          RespuestaCompleta: respuesta
        };

        const obtener = (aliases, respaldo = '') => {
          const desdeRespuesta = buscarValorProfundo(
            respuesta,
            aliases
          );

          if (
            desdeRespuesta !== '' &&
            desdeRespuesta !== null &&
            desdeRespuesta !== undefined
          ) {
            return desdeRespuesta;
          }

          const desdeFila = buscarValorProfundo(
            orden?.original || {},
            aliases
          );

          if (
            desdeFila !== '' &&
            desdeFila !== null &&
            desdeFila !== undefined
          ) {
            return desdeFila;
          }

          return respaldo;
        };

        const idOrden = obtenerIdValido(
          obtener(['IdOrden', 'idOrden', 'IDOrden']),
          idSeleccionado
        );

        const fechaIngreso = obtener([
          'FechaIngreso',
          'fechaIngreso',
          'IngresoOT'
        ]);

        const fechaEntrega = obtener([
          'FechaEntrega',
          'fechaEntrega',
          'FechaEntregaOT',
          'FechaRealEntrega',
          'fechaRealEntrega'
        ]);

        const fechaRealEntrega = obtener([
          'FechaRealEntrega',
          'fechaRealEntrega',
          'FechaRealEntregaOT'
        ]);

        const fechaCotizacion = obtener([
          'FechaEntregaCotizacionAprox',
          'FechaEntregaCotizacionApprox',
          'fechaEntregaCotizacionAprox',
          'fechaEntregaCotizacionApprox'
        ]);

        const horaIngreso =
          obtener(['HoraIngreso', 'horaIngreso']) ||
          formatearHoraInput(fechaIngreso);

        const horaEntrega =
          obtener(['HoraEntrega', 'horaEntrega']) ||
          formatearHoraInput(fechaEntrega);

        const horaTermino = obtener([
          'HoraTermino',
          'HoraTerminoOT',
          'horaTermino',
          'horaTerminoOT',
          'HoraFin'
        ]);

        const nombreCliente = String(
          obtener(
            [
              'NombreCliente',
              'nombreCliente',
              'RazonSocial',
              'razonSocial',
              'ClienteNombre',
              'Cliente'
            ],
            orden?.cliente || ''
          )
        );

        const observaciones = String(
          obtener(
            [
              'Observaciones',
              'observaciones',
              'Descripcion',
              'descripcion'
            ],
            orden?.observaciones || ''
          )
        );

        const estado = String(
          obtener(
            [
              'EstadoOT',
              'estadoOT',
              'Estado',
              'estado',
              'EstadoOTTexto'
            ],
            orden?.estado || ''
          )
        );

        const encargado = String(
          obtener([
            'EncargadoOT',
            'encargadoOT',
            'NombreEncargado',
            'NombreEncargadoOT',
            'Encargado'
          ])
        );

        const vendedor = String(
          obtener([
            'Vendedor',
            'vendedor',
            'NombreVendedor',
            'nombreVendedor',
            'VendedorNombre'
          ])
        );

        const bodega = String(
          obtener([
            'Bodega',
            'bodega',
            'NombreBodega',
            'nombreBodega'
          ])
        );

        const camposCompartidos = {
          IdOrden: idOrden,
          Idorden: idOrden,
          IdOT: idOrden,

          IdCliente: String(
            obtener(['IdCliente', 'idCliente'], '')
          ),
          NombreCliente: nombreCliente,

          RUT: String(
            orden?.rut ||
            obtener([
              'RUT',
              'Rut',
              'rut',
              'RUTCliente',
              'RutCliente',
              'rutCliente',
              'ClienteRUT',
              'ClienteRut'
            ], '')
          ),
          RutCliente: String(
            orden?.rut ||
            obtener([
              'RUT',
              'Rut',
              'rut',
              'RUTCliente',
              'RutCliente',
              'rutCliente',
              'ClienteRUT',
              'ClienteRut'
            ], '')
          ),

          Sucursal: String(
            obtener(
              ['Sucursal', 'sucursal', 'IdSucursal', 'idSucursal'],
              formularioCompartido?.Sucursal || '1'
            )
          ),

          FechaIngreso: formatearFechaInput(fechaIngreso),
          HoraIngreso: formatearHoraInput(horaIngreso),
          FechaEntrega: formatearFechaInput(fechaEntrega),
          HoraEntrega: formatearHoraInput(horaEntrega),

          FechaRealEntrega: formatearFechaInput(fechaRealEntrega),
          FechaRealEntregaOT: formatearFechaInput(fechaRealEntrega),

          HoraTermino: formatearHoraInput(horaTermino),
          HoraTerminoOT: formatearHoraInput(horaTermino),

          FechaEntregaCotizacionAprox:
            formatearFechaInput(fechaCotizacion),
          FechaEntregaCotizacionApprox:
            formatearFechaInput(fechaCotizacion),

          IdBodega: String(
            obtener(['IdBodega', 'idBodega'], '')
          ),
          Bodega: bodega,

          EncargadoOT: encargado,
          NombreEncargado: encargado,

          Vendedor: vendedor,
          NombreVendedor: vendedor,

          EstadoOT: estado,
          Estado: estado,
          EstadoOTTexto: estado,

          NroNotaVenta: String(
            obtener(
              [
                'NroNotaVenta',
                'NotaVenta',
                'NumeroNotaVenta'
              ],
              ''
            )
          ),

          IngresoOrdenCompra: String(
            obtener(
              [
                'IngresoOrdenCompra',
                'OrdenCompra',
                'NroOrdenCompra'
              ],
              ''
            )
          ),

          ReferenciasDTE: String(
            obtener(['ReferenciasDTE', 'referenciasDTE'], '')
          ),

          UsuarioModifica: String(
            obtener(
              [
                'UsuarioModifica',
                'UsuarioModificaOT'
              ],
              '--'
            )
          ),

          UsuarioModificaOT: String(
            obtener(
              [
                'UsuarioModificaOT',
                'UsuarioModifica'
              ],
              '--'
            )
          ),

          Observaciones: observaciones,

          AbonadoOT: String(
            obtener(['AbonadoOT', 'abonadoOT'], '0')
          ),

          NroCotizacionAprobada: String(
            obtener(
              [
                'NroCotizacionAprobada',
                'CotizacionAprobada'
              ],
              '0'
            )
          ),

          CotizacionAprobada: String(
            obtener(
              [
                'CotizacionAprobada',
                'NroCotizacionAprobada'
              ],
              '0'
            )
          ),

          SubTotal: String(
            obtener(['SubTotal', 'subTotal'], '0')
          ),

          TotalNeto: String(
            obtener(
              ['TotalNeto', 'totalNeto', 'Neto'],
              orden?.neto ?? 0
            )
          ),

          TotalIVA: String(
            obtener(
              ['TotalIVA', 'totalIVA', 'Iva', 'IVA'],
              '0'
            )
          ),

          TotalOT: String(
            obtener(
              ['TotalOT', 'totalOT', 'Total', 'total'],
              orden?.bruto ?? 0
            )
          ),

          DescuentoPorc: String(
            obtener(
              [
                'DescuentoPorc',
                'DescuentoPorcentaje'
              ],
              '0'
            )
          ),

          DescuentoPorcentaje: String(
            obtener(
              [
                'DescuentoPorcentaje',
                'DescuentoPorc'
              ],
              '0'
            )
          ),

          DescuentoS: String(
            obtener(
              [
                'DescuentoS',
                'DescuentoMonto'
              ],
              '0'
            )
          ),

          DescuentoMonto: String(
            obtener(
              [
                'DescuentoMonto',
                'DescuentoS'
              ],
              '0'
            )
          ),

          // Se conserva la respuesta por si otro módulo necesita
          // recuperar información adicional de esta misma OT.
          CartolaOTSeleccionada: origen
        };

        aplicarCamposAlFormulario(camposCompartidos);

        setOrdenSeleccionada({
          ...orden,
          idOt: idOrden,
          codigo: `OT-${idOrden}`
        });

        setBusquedaOrden(idOrden);

        try {
          sessionStorage.setItem(
            CLAVE_CARTOLA_SELECCION,
            idOrden
          );
        } catch (_) { }

        setMensaje(
          `La O.T. ${idOrden} quedó activa correctamente. Redirigiendo a Generar OT...`
        );

        irAGenerarOT();

        return true;
      } catch (error) {
        console.error(
          `[Cartola OT] Error al cargar la O.T. ${idSeleccionado}:`,
          error
        );

        setMensaje(
          `No fue posible cargar la O.T. ${idSeleccionado}: ${error.message || 'Error desconocido'
          }`
        );

        return false;
      } finally {
        setCargandoSeleccion(false);
      }
    },
    [
      aplicarCamposAlFormulario,
      formularioCompartido,
      irAGenerarOT
    ]
  );

  const abrirSelectorOrdenes = async () => {
    setModalOrdenesAbierto(true);
    setFiltroModalOrdenes('');
    setErrorModalOrdenes('');

    if (ordenesTodas.length > 0) {
      return;
    }

    setCargandoModalOrdenes(true);

    try {
      const ordenes = await cargarOrdenes();
      setOrdenesTodas(ordenes);
    } catch (error) {
      console.error(
        '[Cartola OT] Error al cargar selector de O.T.:',
        error
      );

      setErrorModalOrdenes(
        `No fue posible cargar las Órdenes de Trabajo: ${error.message || 'Error desconocido'
        }`
      );
    } finally {
      setCargandoModalOrdenes(false);
    }
  };

  const seleccionarOrdenDesdeModal = async (orden) => {
    const id = String(orden.idOt);

    setBusquedaOrden(id);
    setModalOrdenesAbierto(false);
    setFiltroModalOrdenes('');
    setMensaje('');

    /*
      IMPORTANTE:
      "Elegir" solamente selecciona la O.T. para consultar
      y mostrar abajo su historial relacionado.

      NO carga todavía la información en Generar OT,
      Imágenes OT ni Presupuesto OT.
    */
    await buscarRelacionadas(
      id,
      ordenesTodas.length > 0
        ? ordenesTodas
        : null
    );
  };

  const buscarRelacionadas = useCallback(
    async (valorBuscado, ordenesDisponibles = null) => {
      const texto = String(valorBuscado ?? '')
        .trim()
        .replace(/^OT[-\s]*/i, '');

      if (!texto) {
        setMensaje('Ingrese un ID o número de Orden de Trabajo.');
        setOrdenBase(null);
        setOrdenesRelacionadas([]);
        setPagina(0);
        return;
      }

      setCargando(true);
      setMensaje('');

      try {
        const ordenes = ordenesDisponibles || await cargarOrdenes();

        if (!ordenesDisponibles) {
          setOrdenesTodas(ordenes);
        }

        const buscada = ordenes.find(
          (orden) =>
            String(orden.idOt).trim() === texto ||
            normalizarTexto(orden.codigo) === normalizarTexto(valorBuscado)
        );

        if (!buscada) {
          setOrdenBase(null);
          setOrdenesRelacionadas([]);
          setPagina(0);
          setMensaje(`No se encontró la Orden de Trabajo N° ${texto}.`);
          return;
        }

        const clienteBase = normalizarTexto(buscada.cliente);
        const productoBase = normalizarTexto(buscada.producto);
        const codigoProductoBase = normalizarTexto(buscada.codigoProducto);
        const observacionBase = normalizarTexto(buscada.observaciones);

        /*
          Relación principal:
          1. Mismo cliente/persona.
          2. Si la API entrega producto o código de producto, también se consideran
             las OT que comparten ese mismo producto.
          3. Si faltan cliente y producto, se usa la misma observación/descripción
             como respaldo.
        */
        const relacionadas = ordenes.filter((orden) => {
          const mismoCliente =
            clienteBase &&
            normalizarTexto(orden.cliente) === clienteBase;

          const mismoProducto =
            (codigoProductoBase &&
              normalizarTexto(orden.codigoProducto) === codigoProductoBase) ||
            (productoBase &&
              normalizarTexto(orden.producto) === productoBase);

          const mismoDetalleRespaldo =
            !clienteBase &&
            !productoBase &&
            !codigoProductoBase &&
            observacionBase &&
            normalizarTexto(orden.observaciones) === observacionBase;

          return mismoCliente || mismoProducto || mismoDetalleRespaldo;
        });

        relacionadas.sort((a, b) => {
          const numeroA = Number(a.idOt);
          const numeroB = Number(b.idOt);

          if (Number.isFinite(numeroA) && Number.isFinite(numeroB)) {
            return numeroA - numeroB;
          }

          return String(a.idOt).localeCompare(String(b.idOt));
        });

        setOrdenBase(buscada);
        setOrdenesRelacionadas(relacionadas);
        setPagina(0);

        /*
          Aquí solo se prepara la Cartola.
          La O.T. seleccionada se comparte con las demás pestañas
          únicamente cuando el usuario presiona "Cargar".
        */
        if (relacionadas.length === 0) {
          setMensaje('La O.T. fue encontrada, pero no tiene registros relacionados.');
        }
      } catch (error) {
        console.error('[Cartola OT] Error al consultar historial:', error);
        setOrdenBase(null);
        setOrdenesRelacionadas([]);
        setPagina(0);
        setMensaje(
          `No fue posible consultar las Órdenes de Trabajo: ${error.message || 'Error desconocido'
          }`
        );
      } finally {
        setCargando(false);
      }
    },
    [cargarOrdenes]
  );

  // Mantiene la Cartola aunque el usuario cambie de pestaña.
  useEffect(() => {
    if (restauracionRealizadaRef.current) {
      return;
    }

    restauracionRealizadaRef.current = true;

    const idCompartido = obtenerIdValido(
      formularioCompartido?.IdOrden,
      formularioCompartido?.Idorden,
      formularioCompartido?.IdOT,
      formularioCompartido?.Id
    );

    let idGuardado = '';

    try {
      idGuardado =
        sessionStorage.getItem(CLAVE_CARTOLA_SELECCION) ||
        sessionStorage.getItem(CLAVE_CARTOLA_BUSQUEDA) ||
        '';
    } catch (_) { }

    const idInicial = obtenerIdValido(
      idCompartido,
      idGuardado
    );

    if (!idInicial) {
      return;
    }

    setBusquedaOrden(idInicial);

    buscarRelacionadas(idInicial);
  }, [
    buscarRelacionadas,
    formularioCompartido
  ]);

  const ordenesVisiblesModal = useMemo(() => {
    const texto = normalizarTexto(filtroModalOrdenes);

    if (!texto) {
      return ordenesTodas;
    }

    return ordenesTodas.filter((orden) => {
      const campos = [
        orden.idOt,
        orden.codigo,
        orden.rut,
        orden.cliente,
        orden.descripcion,
        orden.observaciones,
        orden.estado,
        orden.producto,
        orden.codigoProducto
      ];

      return campos.some((campo) =>
        normalizarTexto(campo).includes(texto)
      );
    });
  }, [ordenesTodas, filtroModalOrdenes]);

  const filasFiltradas = useMemo(() => {
    if (filtroRadio === 'Facturadas') {
      return ordenesRelacionadas.filter((orden) => orden.facturada);
    }

    return ordenesRelacionadas;
  }, [ordenesRelacionadas, filtroRadio]);

  const totalPaginas = Math.max(
    1,
    Math.ceil(filasFiltradas.length / FILAS_POR_PAGINA)
  );

  useEffect(() => {
    if (pagina >= totalPaginas) {
      setPagina(Math.max(totalPaginas - 1, 0));
    }
  }, [pagina, totalPaginas]);

  const filasPagina = useMemo(() => {
    const inicio = pagina * FILAS_POR_PAGINA;

    return filasFiltradas.slice(
      inicio,
      inicio + FILAS_POR_PAGINA
    );
  }, [filasFiltradas, pagina]);

  const handleBuscar = async () => {
    const texto = String(busquedaOrden || '')
      .trim()
      .replace(/^OT[-\s]*/i, '');

    if (!texto) {
      setMensaje(
        'Ingrese un ID o número de Orden de Trabajo.'
      );
      return;
    }

    let ordenes = ordenesTodas;

    if (ordenes.length === 0) {
      try {
        ordenes = await cargarOrdenes();
        setOrdenesTodas(ordenes);
      } catch (error) {
        setMensaje(
          `No fue posible consultar las Órdenes de Trabajo: ${error.message || 'Error desconocido'
          }`
        );
        return;
      }
    }

    const buscada = ordenes.find(
      (orden) =>
        String(orden.idOt).trim() === texto ||
        normalizarTexto(orden.codigo) ===
        normalizarTexto(busquedaOrden)
    );

    await buscarRelacionadas(
      texto,
      ordenes
    );
  };

  return (
    <Box
      sx={{
        width: '100%',
        minHeight: '85vh',
        backgroundColor: '#f5f7fa',
        px: { xs: 1, sm: 2, md: 3 },
        py: { xs: 1.5, sm: 2.5 },
        boxSizing: 'border-box'
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: '1180px',
          mx: 'auto'
        }}
      >
        <Card
          variant="outlined"
          sx={{
            width: '100%',
            border: '1px solid #e2e8f0',
            boxShadow: '0 10px 30px rgba(15, 23, 42, 0.07)',
            borderRadius: '16px',
            overflow: 'hidden',
            backgroundColor: '#ffffff'
          }}
        >
          <Box
            sx={{
              height: '4px',
              background: 'linear-gradient(90deg, #0b5f8f 0%, #1976d2 55%, #42a5f5 100%)'
            }}
          />

          <CardContent sx={{ p: { xs: 1.5, sm: 2.5, md: 3 } }}>
            <Box sx={{ textAlign: 'center', mb: { xs: 2, sm: 2.75 } }}>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 800,
                  color: '#183b5b',
                  fontSize: { xs: '17px', sm: '19px' },
                  letterSpacing: '-0.2px',
                  lineHeight: 1.2
                }}
              >
                Historial de Órdenes de Trabajo
              </Typography>

              <Typography
                sx={{
                  mt: 0.55,
                  color: '#7a8da3',
                  fontSize: { xs: '11px', sm: '12px' },
                  fontWeight: 500
                }}
              >
                Consulta una O.T. y revisa sus registros relacionados
              </Typography>
            </Box>

            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: 'stretch',
                justifyContent: 'center',
                gap: 1,
                mb: 2.25,
                mx: 'auto',
                p: { xs: 1, sm: 1.25 },
                maxWidth: '610px',
                borderRadius: '12px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0'
              }}
            >
              <TextField
                size="small"
                label="ID / N° Orden"
                placeholder="Ej: 77"
                value={busquedaOrden}
                onChange={(e) => setBusquedaOrden(e.target.value)}
                inputProps={{
                  inputMode: 'numeric',
                  maxLength: 10
                }}
                sx={{
                  width: { xs: '100%', sm: '300px' },
                  flexShrink: 0,
                  backgroundColor: '#fff',
                  '& .MuiOutlinedInput-root': {
                    height: '42px',
                    borderRadius: '9px',
                    '& fieldset': {
                      borderColor: '#cfd9e5'
                    },
                    '&:hover fieldset': {
                      borderColor: '#90b8dd'
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#1976d2',
                      borderWidth: '1px'
                    }
                  },
                  '& .MuiInputBase-input': {
                    fontWeight: 700,
                    color: '#173b67',
                    textAlign: 'center',
                    fontSize: '13px'
                  },
                  '& .MuiInputLabel-root': {
                    fontWeight: 600,
                    fontSize: '13px'
                  }
                }}
              />

              <Button
                variant="contained"
                startIcon={
                  cargandoModalOrdenes
                    ? (
                      <CircularProgress
                        size={15}
                        sx={{ color: '#fff' }}
                      />
                    )
                    : <Search />
                }
                disabled={cargandoModalOrdenes}
                onClick={abrirSelectorOrdenes}
                sx={{
                  minWidth: { xs: '100%', sm: '150px' },
                  height: '42px',
                  px: 2.25,
                  borderRadius: '9px',
                  textTransform: 'none',
                  fontSize: '12px',
                  fontWeight: 800,
                  boxShadow: '0 4px 10px rgba(25,118,210,0.16)',
                  backgroundColor: '#1976d2',
                  '&:hover': {
                    backgroundColor: '#1565c0',
                    boxShadow: '0 6px 14px rgba(25,118,210,0.20)'
                  }
                }}
              >
                {cargandoModalOrdenes
                  ? 'Cargando...'
                  : 'Buscar O.T.'}
              </Button>
            </Box>

            {ordenBase && (
              <Box
                sx={{
                  mb: 1.75,
                  px: { xs: 1.25, sm: 1.75 },
                  py: { xs: 1.15, sm: 1.25 },
                  border: '1px solid #d6e7f5',
                  borderRadius: '12px',
                  backgroundColor: '#f8fcff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 1
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 0.8
                  }}
                >
                  <Chip
                    size="small"
                    label={ordenBase.codigo}
                    sx={{
                      height: '26px',
                      borderRadius: '7px',
                      backgroundColor: '#0b5f8f',
                      color: '#fff',
                      fontWeight: 800,
                      fontSize: '11px',
                      '& .MuiChip-label': { px: 1.15 }
                    }}
                  />

                  {ordenBase.cliente && (
                    <Box>
                      <Typography
                        sx={{
                          fontSize: '10px',
                          color: '#7b8fa4',
                          fontWeight: 600,
                          lineHeight: 1.1
                        }}
                      >
                        Cliente
                      </Typography>
                      <Typography
                        sx={{
                          mt: 0.2,
                          fontSize: '12px',
                          color: '#1f4668',
                          fontWeight: 700,
                          lineHeight: 1.2
                        }}
                      >
                        {ordenBase.cliente}
                      </Typography>
                    </Box>
                  )}
                </Box>

                <Chip
                  size="small"
                  label={`${ordenesRelacionadas.length} registro${ordenesRelacionadas.length === 1 ? '' : 's'
                    } relacionado${ordenesRelacionadas.length === 1 ? '' : 's'
                    }`}
                  sx={{
                    height: '25px',
                    borderRadius: '7px',
                    backgroundColor: '#edf8ef',
                    color: '#2f7d3b',
                    border: '1px solid #d5ead9',
                    fontWeight: 700,
                    fontSize: '10.5px'
                  }}
                />
              </Box>
            )}

            {ordenSeleccionada && (
              <Box
                sx={{
                  mb: 1.5,
                  px: 1.5,
                  py: 1.05,
                  border: '1px solid #cfe8d4',
                  borderRadius: '10px',
                  backgroundColor: '#f6fcf7'
                }}
              >
                <Typography
                  sx={{
                    fontSize: '11.5px',
                    fontWeight: 700,
                    color: '#2f6f39',
                    textAlign: 'center',
                    lineHeight: 1.5
                  }}
                >
                  La {ordenSeleccionada.codigo} ya fue cargada correctamente.
                  Ahora puedes cambiar entre Generar OT, Imágenes OT y Presupuesto OT
                  sin perder la información seleccionada.
                </Typography>
              </Box>
            )}

            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 1,
                mb: 1.25
              }}
            >
              <RadioGroup
                row
                value={filtroRadio}
                onChange={(e) => {
                  setFiltroRadio(e.target.value);
                  setPagina(0);
                }}
                sx={{
                  gap: 0.5,
                  p: 0.45,
                  borderRadius: '9px',
                  backgroundColor: '#f1f5f9',
                  border: '1px solid #e2e8f0',
                  '& .MuiFormControlLabel-root': {
                    m: 0,
                    px: 1.35,
                    minHeight: '30px',
                    borderRadius: '7px',
                    transition: 'all 0.15s ease'
                  },
                  '& .MuiFormControlLabel-label': {
                    fontSize: '11.5px',
                    fontWeight: 700
                  },
                  '& .MuiRadio-root': {
                    display: 'none'
                  }
                }}
              >
                <FormControlLabel
                  value="Todas"
                  control={<Radio size="small" />}
                  label="Todas"
                  sx={{
                    backgroundColor: filtroRadio === 'Todas' ? '#ffffff' : 'transparent',
                    color: filtroRadio === 'Todas' ? '#174b76' : '#708296',
                    boxShadow: filtroRadio === 'Todas'
                      ? '0 1px 4px rgba(15, 23, 42, 0.10)'
                      : 'none'
                  }}
                />

                <FormControlLabel
                  value="Facturadas"
                  control={<Radio size="small" />}
                  label="Facturadas"
                  sx={{
                    backgroundColor: filtroRadio === 'Facturadas' ? '#ffffff' : 'transparent',
                    color: filtroRadio === 'Facturadas' ? '#174b76' : '#708296',
                    boxShadow: filtroRadio === 'Facturadas'
                      ? '0 1px 4px rgba(15, 23, 42, 0.10)'
                      : 'none'
                  }}
                />
              </RadioGroup>

              {filasFiltradas.length > 0 && (
                <Chip
                  size="small"
                  label={`Mostrando ${filasPagina.length} de ${filasFiltradas.length}`}
                  variant="outlined"
                  sx={{
                    height: '27px',
                    borderRadius: '8px',
                    borderColor: '#dbe4ee',
                    color: '#6b7f93',
                    backgroundColor: '#fff',
                    fontSize: '10.5px',
                    fontWeight: 600
                  }}
                />
              )}
            </Box>

            {mensaje && (
              <Box
                sx={{
                  mb: 1.25,
                  py: 1,
                  px: 1.4,
                  borderRadius: '9px',
                  backgroundColor: '#fffaf0',
                  border: '1px solid #f6dfaa'
                }}
              >
                <Typography
                  sx={{
                    color: '#7b5d26',
                    fontSize: '11.5px',
                    fontWeight: 600
                  }}
                >
                  {mensaje}
                </Typography>
              </Box>
            )}

            <TableContainer
              component={Paper}
              elevation={0}
              sx={{
                width: '100%',
                minHeight: '180px',
                maxHeight: '440px',
                overflowX: 'auto',
                overflowY: 'auto',
                borderRadius: '12px',
                border: '1px solid #e1e8f0',
                boxShadow: '0 2px 10px rgba(15, 23, 42, 0.03)'
              }}
            >
              <Table
                size="small"
                stickyHeader
                sx={{
                  minWidth: { xs: '880px', md: '100%' },
                  tableLayout: 'auto'
                }}
              >
                <TableHead>
                  <TableRow
                    sx={{
                      '& th': {
                        backgroundColor: '#f6f8fb',
                        fontWeight: 800,
                        fontSize: '10.5px',
                        color: '#53677d',
                        py: 1.2,
                        borderBottom: '1px solid #dde6ef',
                        whiteSpace: 'nowrap',
                        letterSpacing: '0.15px'
                      }
                    }}
                  >
                    <TableCell align="center" sx={{ width: '48px' }}>
                      N°
                    </TableCell>

                    <TableCell sx={{ width: '120px' }}>
                      RUT
                    </TableCell>

                    <TableCell>
                      Cliente / Descripción
                    </TableCell>

                    <TableCell sx={{ width: '130px' }}>
                      Fecha Ingreso
                    </TableCell>

                    <TableCell sx={{ width: '140px' }}>
                      Estado Actual
                    </TableCell>

                    <TableCell align="right" sx={{ width: '120px' }}>
                      Neto
                    </TableCell>

                    <TableCell align="right" sx={{ width: '120px' }}>
                      Bruto
                    </TableCell>

                    <TableCell align="center" sx={{ width: '105px' }}>
                      Acción
                    </TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {cargando ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 5 }}>
                        <CircularProgress size={28} />
                      </TableCell>
                    </TableRow>
                  ) : filasPagina.length > 0 ? (
                    filasPagina.map((row, idx) => {
                      const indiceGlobal =
                        pagina * FILAS_POR_PAGINA + idx + 1;

                      const esOrdenCargada =
                        String(row.idOt) === String(ordenSeleccionada?.idOt);

                      const esOrdenBase =
                        String(row.idOt) === String(ordenBase?.idOt);

                      return (
                        <TableRow
                          key={`${row.idOt}-${indiceGlobal}`}
                          hover
                          sx={{
                            backgroundColor: esOrdenCargada
                              ? '#eef8ff'
                              : esOrdenBase
                                ? '#f6fbff'
                                : '#ffffff',
                            '& td': {
                              py: 1.05,
                              fontSize: '11.5px',
                              borderBottom: '1px solid #edf2f7'
                            },
                            '& td:first-of-type': {
                              borderLeft: esOrdenCargada
                                ? '3px solid #1976d2'
                                : esOrdenBase
                                  ? '3px solid #9bc4e8'
                                  : '3px solid transparent'
                            },
                            '&:hover': {
                              backgroundColor: esOrdenCargada
                                ? '#e7f4fd'
                                : '#f8fbfe'
                            },
                            '&:last-of-type td': {
                              borderBottom: 'none'
                            }
                          }}
                        >
                          <TableCell
                            align="center"
                            sx={{
                              color: '#6e8297',
                              fontWeight: 700
                            }}
                          >
                            {indiceGlobal}
                          </TableCell>

                          <TableCell
                            sx={{
                              fontWeight: 800,
                              color: '#0b5f8f',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {row.rut || '--'}
                          </TableCell>

                          <TableCell>
                            <Typography
                              sx={{
                                fontSize: '11.5px',
                                fontWeight: 600,
                                color: '#30465b',
                                lineHeight: 1.35
                              }}
                            >
                              {row.descripcion}
                            </Typography>
                          </TableCell>

                          <TableCell sx={{ color: '#52677b', whiteSpace: 'nowrap' }}>
                            {row.fechaIngreso}
                          </TableCell>

                          <TableCell>
                            <Chip
                              size="small"
                              label={row.estado}
                              sx={{
                                height: '23px',
                                maxWidth: '125px',
                                borderRadius: '6px',
                                fontSize: '10px',
                                fontWeight: 800,
                                backgroundColor:
                                  normalizarTexto(row.estado) === 'MANTENIMIENTO'
                                    ? '#fff3e7'
                                    : '#edf3f8',
                                color:
                                  normalizarTexto(row.estado) === 'MANTENIMIENTO'
                                    ? '#c76100'
                                    : '#476078',
                                '& .MuiChip-label': {
                                  px: 0.9,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }
                              }}
                            />
                          </TableCell>

                          <TableCell
                            align="right"
                            sx={{
                              fontWeight: 600,
                              color: '#3e5368',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            ${row.neto.toLocaleString('es-CL')}
                          </TableCell>

                          <TableCell
                            align="right"
                            sx={{
                              fontWeight: 800,
                              color: '#193d5e',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            ${row.bruto.toLocaleString('es-CL')}
                          </TableCell>

                          <TableCell align="center">
                            <Button
                              size="small"
                              variant="contained"
                              disableElevation
                              disabled={cargandoSeleccion}
                              onClick={async () => {
                                /*
                                  Primero se carga toda la O.T.
                                  Si la carga termina correctamente,
                                  cargarOrdenCompleta redirige a Generar OT.
                                */
                                await cargarOrdenCompleta(row);
                              }}
                              sx={{
                                minWidth: '74px',
                                minHeight: '29px',
                                py: 0.35,
                                px: 1.25,
                                borderRadius: '7px',
                                textTransform: 'none',
                                fontSize: '10.5px',
                                fontWeight: 800,
                                boxShadow: 'none',
                                backgroundColor: '#0b5f8f',
                                '&:hover': {
                                  backgroundColor: '#084f78',
                                  boxShadow: '0 3px 8px rgba(11,95,143,0.18)'
                                },
                                '&.Mui-disabled': {
                                  backgroundColor: '#d7e0e8',
                                  color: '#8190a0'
                                }
                              }}
                            >
                              {cargandoSeleccion ? '...' : 'Cargar'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        align="center"
                        sx={{
                          py: 6,
                          color: '#8393a5',
                          fontSize: '11.5px',
                          fontWeight: 500
                        }}
                      >
                        Busque una O.T. para mostrar el historial relacionado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <Box
              sx={{
                mt: 1.75,
                display: 'flex',
                justifyContent: 'center'
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexWrap: 'nowrap',
                  gap: 0.55,
                  p: 0.55,
                  border: '1px solid #e1e8f0',
                  borderRadius: '10px',
                  backgroundColor: '#f8fafc',
                  width: 'fit-content',
                  minWidth: 'max-content'
                }}
              >
                <IconButton
                  size="small"
                  disabled={pagina === 0}
                  onClick={() => setPagina(0)}
                  sx={{
                    width: 31,
                    height: 31,
                    borderRadius: '7px',
                    color: '#45627d',
                    '&:hover': { backgroundColor: '#eaf2f9' },
                    '&.Mui-disabled': { color: '#bdc8d3' }
                  }}
                >
                  <SkipPrevious sx={{ fontSize: 18 }} />
                </IconButton>

                <IconButton
                  size="small"
                  disabled={pagina === 0}
                  onClick={() => setPagina((prev) => Math.max(prev - 1, 0))}
                  sx={{
                    width: 31,
                    height: 31,
                    borderRadius: '7px',
                    color: '#45627d',
                    '&:hover': { backgroundColor: '#eaf2f9' },
                    '&.Mui-disabled': { color: '#bdc8d3' }
                  }}
                >
                  <NavigateBefore sx={{ fontSize: 18 }} />
                </IconButton>

                <Box
                  sx={{
                    minWidth: '96px',
                    px: 1.25,
                    py: 0.45,
                    borderRadius: '7px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #e0e7ef',
                    textAlign: 'center'
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: '9.5px',
                      color: '#8494a6',
                      fontWeight: 600,
                      lineHeight: 1
                    }}
                  >
                    Página
                  </Typography>
                  <Typography
                    sx={{
                      mt: 0.25,
                      fontSize: '11.5px',
                      color: '#294b6a',
                      fontWeight: 800,
                      lineHeight: 1.1
                    }}
                  >
                    {pagina + 1} de {totalPaginas}
                  </Typography>
                </Box>

                <IconButton
                  size="small"
                  disabled={pagina >= totalPaginas - 1}
                  onClick={() =>
                    setPagina((prev) => Math.min(prev + 1, totalPaginas - 1))
                  }
                  sx={{
                    width: 31,
                    height: 31,
                    borderRadius: '7px',
                    color: '#45627d',
                    '&:hover': { backgroundColor: '#eaf2f9' },
                    '&.Mui-disabled': { color: '#bdc8d3' }
                  }}
                >
                  <NavigateNext sx={{ fontSize: 18 }} />
                </IconButton>

                <IconButton
                  size="small"
                  disabled={pagina >= totalPaginas - 1}
                  onClick={() => setPagina(totalPaginas - 1)}
                  sx={{
                    width: 31,
                    height: 31,
                    borderRadius: '7px',
                    color: '#45627d',
                    '&:hover': { backgroundColor: '#eaf2f9' },
                    '&.Mui-disabled': { color: '#bdc8d3' }
                  }}
                >
                  <SkipNext sx={{ fontSize: 18 }} />
                </IconButton>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>

      <Dialog
        open={modalOrdenesAbierto}
        onClose={() => setModalOrdenesAbierto(false)}
        fullWidth
        maxWidth="lg"
        PaperProps={{
          sx: {
            borderRadius: '14px',
            overflow: 'hidden',
            maxHeight: '88vh',
            boxShadow: '0 18px 55px rgba(15, 23, 42, 0.18)'
          }
        }}
      >
        <DialogTitle
          sx={{
            backgroundColor: '#0b4f78',
            color: '#fff',
            py: 1.35,
            px: 2.25,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <Box>
            <Typography
              component="span"
              sx={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 800,
                lineHeight: 1.2
              }}
            >
              Órdenes de Trabajo
            </Typography>
            <Typography
              component="span"
              sx={{
                display: 'block',
                mt: 0.25,
                fontSize: '10px',
                color: 'rgba(255,255,255,0.72)',
                fontWeight: 500
              }}
            >
              Selecciona un registro para consultar su historial
            </Typography>
          </Box>

          <IconButton
            size="small"
            onClick={() => setModalOrdenesAbierto(false)}
            sx={{
              color: '#fff',
              backgroundColor: 'rgba(255,255,255,0.08)',
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.16)' }
            }}
          >
            <Close fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent
          dividers
          sx={{
            p: { xs: 1.25, sm: 2 },
            backgroundColor: '#f7f9fc',
            borderColor: '#e5ebf1'
          }}
        >
          <TextField
            fullWidth
            size="small"
            autoFocus
            placeholder="Filtrar por RUT, N° O.T., cliente, descripción, estado o producto..."
            value={filtroModalOrdenes}
            onChange={(e) => setFiltroModalOrdenes(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search
                      sx={{
                        color: '#6b8298',
                        fontSize: 19
                      }}
                    />
                  </InputAdornment>
                )
              }
            }}
            sx={{
              mb: 1.5,
              backgroundColor: '#fff',
              '& .MuiOutlinedInput-root': {
                borderRadius: '9px',
                '& fieldset': { borderColor: '#d8e2eb' },
                '&:hover fieldset': { borderColor: '#a9bfd3' }
              },
              '& .MuiInputBase-input': {
                fontSize: '12px'
              }
            }}
          />

          {errorModalOrdenes && (
            <Box
              sx={{
                mb: 1.5,
                px: 1.25,
                py: 1,
                borderRadius: '8px',
                backgroundColor: '#fff3f3',
                border: '1px solid #f3cccc'
              }}
            >
              <Typography
                sx={{
                  color: '#bd3d3d',
                  fontSize: '11.5px',
                  fontWeight: 600
                }}
              >
                {errorModalOrdenes}
              </Typography>
            </Box>
          )}

          {cargandoModalOrdenes ? (
            <Box
              sx={{
                minHeight: '280px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <CircularProgress size={34} />
            </Box>
          ) : (
            <TableContainer
              component={Paper}
              elevation={0}
              sx={{
                maxHeight: '520px',
                overflowX: 'auto',
                borderRadius: '10px',
                border: '1px solid #e0e7ef'
              }}
            >
              <Table
                size="small"
                stickyHeader
                sx={{ minWidth: '900px' }}
              >
                <TableHead>
                  <TableRow
                    sx={{
                      '& th': {
                        backgroundColor: '#f1f5f9',
                        color: '#50677d',
                        fontWeight: 800,
                        fontSize: '10.5px',
                        py: 1.1,
                        borderBottom: '1px solid #dce5ee'
                      }
                    }}
                  >
                    <TableCell sx={{ width: '55px' }}>N°</TableCell>
                    <TableCell sx={{ width: '125px' }}>RUT</TableCell>
                    <TableCell>Cliente / Descripción</TableCell>
                    <TableCell sx={{ width: '125px' }}>Fecha</TableCell>
                    <TableCell sx={{ width: '140px' }}>Estado</TableCell>
                    <TableCell align="right" sx={{ width: '110px' }}>Neto</TableCell>
                    <TableCell align="right" sx={{ width: '110px' }}>Bruto</TableCell>
                    <TableCell align="center" sx={{ width: '100px' }}>Acción</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {ordenesVisiblesModal.length > 0 ? (
                    ordenesVisiblesModal.map((orden, idx) => (
                      <TableRow
                        key={`${orden.idOt}-${idx}`}
                        hover
                        sx={{
                          '& td': {
                            borderBottom: '1px solid #edf2f7'
                          },
                          '&:nth-of-type(even)': {
                            backgroundColor: '#fbfcfd'
                          },
                          '&:hover': {
                            backgroundColor: '#f3f8fc'
                          }
                        }}
                      >
                        <TableCell
                          sx={{
                            color: '#75889b',
                            fontSize: '11.5px',
                            fontWeight: 600
                          }}
                        >
                          {idx + 1}
                        </TableCell>

                        <TableCell
                          sx={{
                            color: '#0b5f8f',
                            fontWeight: 800,
                            fontSize: '11.5px'
                          }}
                        >
                          {orden.rut || '--'}
                        </TableCell>

                        <TableCell>
                          <Typography
                            sx={{
                              fontSize: '11.5px',
                              fontWeight: 600,
                              color: '#30465b'
                            }}
                          >
                            {orden.descripcion}
                          </Typography>
                        </TableCell>

                        <TableCell sx={{ fontSize: '11.5px', color: '#53687b' }}>
                          {orden.fechaIngreso}
                        </TableCell>

                        <TableCell>
                          <Chip
                            size="small"
                            label={orden.estado}
                            sx={{
                              height: '23px',
                              borderRadius: '6px',
                              fontSize: '10px',
                              fontWeight: 800,
                              backgroundColor:
                                normalizarTexto(orden.estado) === 'MANTENIMIENTO'
                                  ? '#fff3e7'
                                  : '#edf3f8',
                              color:
                                normalizarTexto(orden.estado) === 'MANTENIMIENTO'
                                  ? '#c76100'
                                  : '#476078'
                            }}
                          />
                        </TableCell>

                        <TableCell
                          align="right"
                          sx={{ fontSize: '11.5px', color: '#455d72' }}
                        >
                          ${orden.neto.toLocaleString('es-CL')}
                        </TableCell>

                        <TableCell
                          align="right"
                          sx={{
                            fontSize: '11.5px',
                            fontWeight: 800,
                            color: '#234663'
                          }}
                        >
                          ${orden.bruto.toLocaleString('es-CL')}
                        </TableCell>

                        <TableCell align="center">
                          <Button
                            size="small"
                            variant="contained"
                            disableElevation
                            onClick={() =>
                              seleccionarOrdenDesdeModal(orden)
                            }
                            sx={{
                              minWidth: '68px',
                              minHeight: '28px',
                              px: 1,
                              py: 0.25,
                              borderRadius: '7px',
                              textTransform: 'none',
                              fontSize: '10.5px',
                              fontWeight: 800,
                              backgroundColor: '#0b5f8f',
                              '&:hover': {
                                backgroundColor: '#084f78'
                              }
                            }}
                          >
                            Elegir
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        align="center"
                        sx={{
                          py: 5,
                          color: '#8393a5',
                          fontSize: '11.5px'
                        }}
                      >
                        No se encontraron Órdenes de Trabajo.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>

        <DialogActions
          sx={{
            px: 2,
            py: 1.1,
            backgroundColor: '#ffffff',
            borderTop: '1px solid #edf1f5'
          }}
        >
          <Typography
            sx={{
              mr: 'auto',
              fontSize: '10.5px',
              color: '#718398',
              fontWeight: 600
            }}
          >
            {ordenesVisiblesModal.length} registro
            {ordenesVisiblesModal.length === 1 ? '' : 's'} disponible
            {ordenesVisiblesModal.length === 1 ? '' : 's'}
          </Typography>

          <Button
            variant="outlined"
            size="small"
            onClick={() => setModalOrdenesAbierto(false)}
            sx={{
              minWidth: '78px',
              borderRadius: '7px',
              textTransform: 'none',
              fontSize: '11px',
              fontWeight: 700,
              borderColor: '#cdd8e3',
              color: '#4c657d',
              '&:hover': {
                borderColor: '#9eb4c8',
                backgroundColor: '#f7f9fb'
              }
            }}
          >
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
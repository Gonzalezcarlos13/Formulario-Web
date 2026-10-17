import React, {
  useCallback,
  useEffect,
  useMemo,
  useState
} from 'react';

import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  IconButton,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';

import SearchIcon from '@mui/icons-material/Search';
import PrintIcon from '@mui/icons-material/Print';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import PaidOutlinedIcon from '@mui/icons-material/PaidOutlined';
import PersonSearchOutlinedIcon from '@mui/icons-material/PersonSearchOutlined';

const API_ORDENES = 'http://localhost/Api/api/OrdenTrabajo/Leer';

const normalizarClave = (valor) =>
  String(valor ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();

const tieneValor = (valor) =>
  valor !== null &&
  valor !== undefined &&
  String(valor).trim() !== '';

const limpiarTextoDetalle = (valor) =>
  String(valor ?? '').trim();

const esTextoDetalleReal = (valor) => {
  const texto = limpiarTextoDetalle(valor);

  if (!texto) {
    return false;
  }

  const normalizado = normalizarClave(texto);

  return ![
    '-',
    '--',
    '---',
    'SIN DETALLE',
    'SIN DETALLE REGISTRADO',
    'N/A',
    'NA'
  ]
    .map(normalizarClave)
    .includes(normalizado);
};

const obtenerValor = (objeto, aliases, respaldo = '') => {
  if (!objeto || typeof objeto !== 'object') {
    return respaldo;
  }

  const buscadas = new Set(
    aliases.map((alias) => normalizarClave(alias))
  );

  for (const [clave, valor] of Object.entries(objeto)) {
    if (
      buscadas.has(normalizarClave(clave)) &&
      tieneValor(valor) &&
      typeof valor !== 'object'
    ) {
      return valor;
    }
  }

  return respaldo;
};

const obtenerNumeroPositivo = (...valores) => {
  for (const valor of valores) {
    const numero = Number(
      String(valor ?? '')
        .trim()
        .replace(/[^\d.-]/g, '')
    );

    if (Number.isFinite(numero) && numero > 0) {
      return numero;
    }
  }

  return 0;
};

const obtenerIdCabecera = (objeto) =>
  obtenerNumeroPositivo(
    obtenerValor(objeto, [
      'IdOrden',
      'idOrden',
      'IDOrden',
      'Idorden',
      'idorden',
      'IdOT',
      'idOT'
    ]),
    obtenerValor(objeto, [
      'IdRegistroBD',
      'idRegistroBD'
    ]),
    obtenerValor(objeto, [
      'Id',
      'id'
    ])
  );

const obtenerIdOrdenDetalle = (objeto) =>
  obtenerNumeroPositivo(
    obtenerValor(objeto, [
      'Idorden',
      'IdOrden',
      'idOrden',
      'IDOrden',
      'idorden',
      'IdOT',
      'idOT'
    ])
  );

const recolectarObjetos = (raiz) => {
  const objetos = [];
  const visitados = new WeakSet();

  const recorrer = (valor) => {
    if (!valor || typeof valor !== 'object') {
      return;
    }

    if (visitados.has(valor)) {
      return;
    }

    visitados.add(valor);

    if (Array.isArray(valor)) {
      valor.forEach(recorrer);
      return;
    }

    objetos.push(valor);

    Object.values(valor).forEach((hijo) => {
      if (hijo && typeof hijo === 'object') {
        recorrer(hijo);
      }
    });
  };

  recorrer(raiz);

  return objetos;
};

const extraerListaOrdenes = (respuesta) => {
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

  const arrays = Object.values(respuesta).filter(
    (valor) => Array.isArray(valor)
  );

  if (arrays.length > 0) {
    return arrays[0];
  }

  return Object.values(respuesta).filter(
    (valor) =>
      valor &&
      typeof valor === 'object' &&
      !Array.isArray(valor)
  );
};

const esPosibleCabecera = (objeto) => {
  const idOrden = obtenerIdCabecera(objeto);

  if (!idOrden) {
    return false;
  }

  return Boolean(
    obtenerValor(
      objeto,
      [
        'NombreCliente',
        'Cliente',
        'RazonSocial',
        'FechaIngreso',
        'HoraIngreso',
        'EncargadoOT',
        'NombreEncargado',
        'EstadoOT',
        'FechaEntrega',
        'FechaRealEntrega',
        'TotalOT'
      ],
      ''
    )
  );
};

const esPosibleDetalle = (objeto, idOrdenRespaldo = '') => {
  if (!objeto || typeof objeto !== 'object') {
    return false;
  }

  const idOrden =
    obtenerIdOrdenDetalle(objeto) ||
    obtenerNumeroPositivo(idOrdenRespaldo);

  if (!idOrden) {
    return false;
  }

  const codigo = obtenerValor(
    objeto,
    [
      'Codigo',
      'codigo',
      'CodigoProducto',
      'CodProducto',
      'ItemCodigo'
    ],
    ''
  );

  const descripcion = obtenerValor(
    objeto,
    [
      'Descripcion',
      'descripcion',
      'NombreProducto',
      'Producto',
      'Detalle'
    ],
    ''
  );

  const cantidad = obtenerValor(
    objeto,
    [
      'Cantidad',
      'cantidad',
      'Cant',
      'cant'
    ],
    ''
  );

  const valorUnitario = obtenerValor(
    objeto,
    [
      'ValorUnitario',
      'valorUnitario',
      'ValorNeto',
      'PrecioVentaNeto',
      'PVentaNeto',
      'Neto'
    ],
    ''
  );

  const codigoReal = esTextoDetalleReal(codigo);
  const descripcionReal = esTextoDetalleReal(descripcion);
  const tieneDatosDetalle =
    tieneValor(cantidad) ||
    tieneValor(valorUnitario);


  return Boolean(
    codigoReal ||
    (descripcionReal && tieneDatosDetalle)
  );
};

const normalizarFechaInput = (valor) => {
  const texto = String(valor ?? '').trim();

  if (!texto) {
    return '';
  }

  const soloFecha = texto
    .split('T')[0]
    .split(' ')[0];

  if (/^\d{4}-\d{2}-\d{2}$/.test(soloFecha)) {
    return soloFecha;
  }

  const ddmmyyyy = soloFecha.match(
    /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/
  );

  if (ddmmyyyy) {
    const [, dd, mm, yyyy] = ddmmyyyy;

    return `${yyyy}-${String(mm).padStart(2, '0')}-${String(
      dd
    ).padStart(2, '0')}`;
  }

  const fecha = new Date(texto);

  if (Number.isNaN(fecha.getTime())) {
    return '';
  }

  return [
    fecha.getFullYear(),
    String(fecha.getMonth() + 1).padStart(2, '0'),
    String(fecha.getDate()).padStart(2, '0')
  ].join('-');
};

const formatearFecha = (valor) => {
  const fecha = normalizarFechaInput(valor);

  if (!fecha) {
    return '--';
  }

  const [yyyy, mm, dd] = fecha.split('-');

  return `${dd}-${mm}-${yyyy}`;
};

const formatearHora = (valor) => {
  const texto = String(valor ?? '').trim();

  if (!texto) {
    return '--';
  }

  const match = texto.match(/(\d{1,2}):(\d{2})/);

  if (!match) {
    return texto;
  }

  return `${String(match[1]).padStart(2, '0')}:${match[2]}`;
};

const numero = (valor) => {
  if (typeof valor === 'number') {
    return Number.isFinite(valor) ? valor : 0;
  }

  const limpio = String(valor ?? '')
    .trim()
    .replace(/\./g, '')
    .replace(/,/g, '.')
    .replace(/[^0-9.-]/g, '');

  const resultado = Number(limpio);

  return Number.isFinite(resultado) ? resultado : 0;
};

const dinero = (valor) =>
  `$${Math.round(numero(valor)).toLocaleString('es-CL')}`;

const crearRangoInicial = () => {
  const hasta = new Date();
  const desde = new Date(hasta);

  desde.setDate(desde.getDate() - 30);

  const aInput = (fecha) =>
    [
      fecha.getFullYear(),
      String(fecha.getMonth() + 1).padStart(2, '0'),
      String(fecha.getDate()).padStart(2, '0')
    ].join('-');

  return {
    desde: aInput(desde),
    hasta: aInput(hasta)
  };
};

const normalizarCabecera = (objeto) => {
  const idOrden = obtenerIdCabecera(objeto);

  return {
    idOrden: String(idOrden || ''),
    idRegistroBD: String(
      obtenerNumeroPositivo(
        obtenerValor(objeto, [
          'IdRegistroBD',
          'idRegistroBD'
        ]),
        obtenerValor(objeto, ['Id', 'id']),
        idOrden
      ) || ''
    ),
    encargado: String(
      obtenerValor(
        objeto,
        [
          'EncargadoOT',
          'NombreEncargado',
          'Encargado',
          'encargadoOT',
          'encargado',
          'NombreEncargadoOT',
          'EncargadoNombre',
          'NombreEncargadoItem'
        ],
        'POR ASIGNAR'
      )
    ).trim() || 'POR ASIGNAR',
    cliente: String(
      obtenerValor(
        objeto,
        [
          'NombreCliente',
          'Cliente',
          'RazonSocial',
          'ClienteNombre',
          'nombreCliente'
        ],
        '--'
      )
    ).trim() || '--',
    fechaIngreso: obtenerValor(
      objeto,
      [
        'FechaIngreso',
        'IngresoOT',
        'FechaCreacion'
      ],
      ''
    ),
    horaIngreso: obtenerValor(
      objeto,
      [
        'HoraIngreso',
        'HoraEntrada',
        'HoraCreacion'
      ],
      ''
    ),
    fechaEntrega: obtenerValor(
      objeto,
      [
        'FechaEntrega',
        'FechaRealEntrega',
        'FechaEntregaOT',
        'FechaEntregaCotizacionAprox',
        'FechaEntregaCotizacion',
        'FechaRealEntregaOT',
        'FechaVencto',
        'FechaVencimiento'
      ],
      ''
    ),
    estado: String(
      obtenerValor(
        objeto,
        [
          'EstadoOT',
          'Estado',
          'estadoOT',
          'estado'
        ],
        ''
      )
    ).trim(),
    totalOT: obtenerValor(
      objeto,
      [
        'TotalOT',
        'Total',
        'MontoTotal',
        'Bruto'
      ],
      0
    ),
    objetoOriginal: objeto
  };
};

const normalizarDetalle = (objeto, idOrdenRespaldo = '') => ({
  idOrden: String(
    obtenerIdOrdenDetalle(objeto) ||
    idOrdenRespaldo ||
    ''
  ),
  idDetalle: String(
    obtenerNumeroPositivo(
      obtenerValor(objeto, [
        'IdDetalle',
        'idDetalle',
        'Id',
        'id'
      ])
    ) || ''
  ),
  codigo: String(
    obtenerValor(
      objeto,
      [
        'Codigo',
        'codigo',
        'CodigoProducto',
        'CodProducto',
        'ItemCodigo'
      ],
      ''
    )
  ).trim(),
  descripcion: String(
    obtenerValor(
      objeto,
      [
        'Descripcion',
        'descripcion',
        'NombreProducto',
        'Producto',
        'Detalle'
      ],
      ''
    )
  ).trim(),
  cantidad: numero(
    obtenerValor(
      objeto,
      [
        'Cantidad',
        'cantidad',
        'Cant',
        'cant'
      ],
      0
    )
  ),
  valorUnitario: numero(
    obtenerValor(
      objeto,
      [
        'ValorUnitario',
        'valorUnitario',
        'ValorNeto',
        'PrecioVentaNeto',
        'PVentaNeto',
        'Neto'
      ],
      0
    )
  ),
  subTotal: numero(
    obtenerValor(
      objeto,
      [
        'SubTotal',
        'Subtotal',
        'subTotal',
        'subtotal',
        'TotalNeto',
        'Total'
      ],
      0
    )
  )
});

const esDetalleNormalizadoValido = (detalle) => {
  if (!detalle) {
    return false;
  }

  return Boolean(
    esTextoDetalleReal(detalle.codigo) ||
    esTextoDetalleReal(detalle.descripcion)
  );
};

const deduplicarDetalles = (detalles) => {
  const vistos = new Set();
  const salida = [];

  detalles
    .filter(esDetalleNormalizadoValido)
    .forEach((detalle) => {
    const clave =
      detalle.idDetalle ||
      [
        detalle.idOrden,
        detalle.codigo,
        detalle.descripcion,
        detalle.cantidad,
        detalle.valorUnitario,
        detalle.subTotal
      ].join('|');

    if (!vistos.has(clave)) {
      vistos.add(clave);
      salida.push(detalle);
    }
  });

  return salida;
};

export default function InformeEncargadosOT({
  onClose = () => {},
  onEditarOrden = null
}) {
  const rango = useMemo(
    () => crearRangoInicial(),
    []
  );

  const [desde, setDesde] = useState(
    rango.desde
  );

  const [hasta, setHasta] = useState(
    rango.hasta
  );

  const [tipoFecha, setTipoFecha] =
    useState('entrega');

  const [
    todosEncargados,
    setTodosEncargados
  ] = useState(true);

  const [
    encargadoSeleccionado,
    setEncargadoSeleccionado
  ] = useState('');

  const [cabeceras, setCabeceras] =
    useState([]);

  const [, setDetallesPorOT] = useState({});

  const [resultado, setResultado] =
    useState([]);

  const [cargandoBase, setCargandoBase] =
    useState(false);

  const [
    cargandoInforme,
    setCargandoInforme
  ] = useState(false);

  const [error, setError] = useState('');

  const handleEditarOrden = useCallback(async (ot) => {
    const idOrden = String(ot?.idOrden ?? '').trim();
    const idRegistroBD = String(ot?.idRegistroBD ?? idOrden).trim();
    const idReal = idRegistroBD || idOrden;

    if (!idReal) {
      setError('No se pudo identificar la O.T. seleccionada.');
      return;
    }

    setError('');

    const ordenEdicion = {
      ...ot,
      idOrden,
      idRegistroBD,
      idReal
    };

    try {
      if (typeof onEditarOrden === 'function') {
        await Promise.resolve(
          onEditarOrden(idReal, ordenEdicion)
        );
      } else {
        window.dispatchEvent(
          new CustomEvent('ot:editar-desde-informe-encargados', {
            detail: {
              idOrden,
              idRegistroBD,
              idReal,
              orden: ordenEdicion
            }
          })
        );
      }

      onClose();
    } catch (errorEdicion) {
      console.error(
        '[INFORME ENCARGADOS] Error al abrir la O.T. para edición:',
        errorEdicion
      );
      setError('No fue posible abrir la O.T. seleccionada para edición.');
    }
  }, [onEditarOrden, onClose]);

  const consultarBase = useCallback(
    async () => {
      const response = await fetch(
        `${API_ORDENES}/0`,
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status} al consultar las O.T.`
        );
      }

      const data = await response.json();


      let items = extraerListaOrdenes(data);

      if (!Array.isArray(items)) {
        items = [];
      }

      const candidatos =
        items.length > 0
          ? items
          : recolectarObjetos(data);

      const mapaCabeceras = new Map();

      candidatos.forEach((objeto) => {
        if (
          !objeto ||
          typeof objeto !== 'object'
        ) {
          return;
        }

        const idOrden =
          obtenerIdCabecera(objeto);

        if (!idOrden) {
          return;
        }

        const normalizada =
          normalizarCabecera(objeto);

        const anterior =
          mapaCabeceras.get(
            normalizada.idOrden
          );


        if (
          !esPosibleCabecera(objeto) &&
          items.length === 0
        ) {
          return;
        }

        mapaCabeceras.set(
          normalizada.idOrden,
          {
            ...(anterior || {}),
            ...normalizada,
            encargado:
              normalizada.encargado !==
              'POR ASIGNAR'
                ? normalizada.encargado
                : anterior?.encargado ||
                  'POR ASIGNAR',
            cliente:
              normalizada.cliente !== '--'
                ? normalizada.cliente
                : anterior?.cliente || '--',
            fechaIngreso:
              normalizada.fechaIngreso ||
              anterior?.fechaIngreso ||
              '',
            horaIngreso:
              normalizada.horaIngreso ||
              anterior?.horaIngreso ||
              '',
            fechaEntrega:
              normalizada.fechaEntrega ||
              anterior?.fechaEntrega ||
              '',
            totalOT:
              tieneValor(
                normalizada.totalOT
              )
                ? normalizada.totalOT
                : anterior?.totalOT || 0
          }
        );
      });

      const cabecerasNormalizadas =
        Array.from(
          mapaCabeceras.values()
        ).sort(
          (a, b) =>
            Number(b.idOrden || 0) -
            Number(a.idOrden || 0)
        );

      const detallesIniciales = {};

      recolectarObjetos(data)
        .filter((objeto) =>
          esPosibleDetalle(objeto)
        )
        .map((objeto) =>
          normalizarDetalle(objeto)
        )
        .filter(esDetalleNormalizadoValido)
        .forEach((detalle) => {
          if (!detalle.idOrden) {
            return;
          }

          if (
            !detallesIniciales[
              detalle.idOrden
            ]
          ) {
            detallesIniciales[
              detalle.idOrden
            ] = [];
          }

          detallesIniciales[
            detalle.idOrden
          ].push(detalle);
        });

      Object.keys(
        detallesIniciales
      ).forEach((idOrden) => {
        detallesIniciales[idOrden] =
          deduplicarDetalles(
            detallesIniciales[idOrden]
          );
      });

      return {
        cabeceras:
          cabecerasNormalizadas,
        detalles:
          detallesIniciales
      };
    },
    []
  );


  const encargadosDisponibles =
    useMemo(() => {
      const nombres = new Set();

      cabeceras.forEach((ot) => {
        const encargado = String(
          ot.encargado ||
          'POR ASIGNAR'
        ).trim();

        if (encargado) {
          nombres.add(encargado);
        }
      });

      return Array.from(nombres).sort(
        (a, b) =>
          a.localeCompare(b, 'es')
      );
    }, [cabeceras]);

  const cumpleFiltroFecha =
    useCallback(
      (ot) => {
        const valor =
          tipoFecha === 'entrega'
            ? ot.fechaEntrega
            : ot.fechaIngreso;

        const fecha =
          normalizarFechaInput(valor);

        if (!fecha) {
          return !desde && !hasta;
        }

        if (
          desde &&
          fecha < desde
        ) {
          return false;
        }

        if (
          hasta &&
          fecha > hasta
        ) {
          return false;
        }

        return true;
      },
      [
        desde,
        hasta,
        tipoFecha
      ]
    );

  const leerOrdenCompleta =
    useCallback(
      async (
        otBase,
        cacheDetalles = {}
      ) => {
        const idOrden =
          String(
            otBase.idRegistroBD ||
            otBase.idOrden ||
            ''
          ).trim();

        if (!idOrden) {
          return {
            ...otBase,
            detalles: []
          };
        }

        try {
          const response = await fetch(
            `${API_ORDENES}/${encodeURIComponent(
              idOrden
            )}`,
            {
              method: 'GET',
              headers: {
                Accept: 'application/json',
                'Content-Type':
                  'application/json'
              }
            }
          );

          if (!response.ok) {
            return {
              ...otBase,
              detalles:
                cacheDetalles[
                  otBase.idOrden
                ] || []
            };
          }

          const data =
            await response.json();

          const objetos =
            recolectarObjetos(data);

          const cabeceraEncontrada =
            objetos.find(
              (objeto) => {
                if (
                  !esPosibleCabecera(
                    objeto
                  )
                ) {
                  return false;
                }

                const id =
                  obtenerIdCabecera(
                    objeto
                  );

                return (
                  String(id) ===
                    String(
                      otBase.idOrden
                    ) ||
                  String(id) ===
                    String(
                      otBase.idRegistroBD
                    )
                );
              }
            ) ||
            objetos.find(
              esPosibleCabecera
            );

          const cabeceraCompleta =
            cabeceraEncontrada
              ? {
                  ...otBase,
                  ...normalizarCabecera(
                    cabeceraEncontrada
                  ),
                  idOrden:
                    otBase.idOrden,
                  idRegistroBD:
                    otBase.idRegistroBD ||
                    normalizarCabecera(
                      cabeceraEncontrada
                    ).idRegistroBD
                }
              : otBase;

          let detalles = objetos
            .filter((objeto) =>
              esPosibleDetalle(
                objeto,
                otBase.idOrden
              )
            )
            .map((objeto) =>
              normalizarDetalle(
                objeto,
                otBase.idOrden
              )
            )
            .filter(esDetalleNormalizadoValido)
            .filter((detalle) => {
              if (!detalle.idOrden) {
                return true;
              }

              return (
                String(
                  detalle.idOrden
                ) ===
                  String(
                    otBase.idOrden
                  ) ||
                String(
                  detalle.idOrden
                ) ===
                  String(
                    otBase.idRegistroBD
                  )
              );
            });

          detalles =
            deduplicarDetalles(
              detalles
            );

          if (
            detalles.length === 0 &&
            Array.isArray(
              cacheDetalles[
                otBase.idOrden
              ]
            )
          ) {
            detalles =
              cacheDetalles[
                otBase.idOrden
              ];
          }

          return {
            ...cabeceraCompleta,
            detalles
          };
        } catch (errorDetalle) {
          console.warn(
            `[INFORME ENCARGADOS] No fue posible recuperar la O.T. ${idOrden}:`,
            errorDetalle
          );

          return {
            ...otBase,
            detalles:
              cacheDetalles[
                otBase.idOrden
              ] || []
          };
        }
      },
      []
    );


  const construirMapaDetalles = useCallback((ordenes, cacheInicial = {}) => {
    const mapa = { ...cacheInicial };

    ordenes.forEach((ot) => {
      if (!ot?.idOrden) return;

      if (Array.isArray(ot.detalles)) {
        mapa[ot.idOrden] = deduplicarDetalles(ot.detalles);
      }
    });

    return mapa;
  }, []);

  const cargarBase = useCallback(async () => {
    setCargandoBase(true);
    setError('');

    try {
      const base = await consultarBase();

      const completas = await Promise.all(
        base.cabeceras.map((ot) =>
          leerOrdenCompleta(
            ot,
            base.detalles
          )
        )
      );

      const ordenesCompletas = completas
        .filter((ot) => ot && ot.idOrden)
        .sort(
          (a, b) =>
            Number(b.idOrden || 0) -
            Number(a.idOrden || 0)
        );

      setCabeceras(ordenesCompletas);
      setDetallesPorOT(
        construirMapaDetalles(
          ordenesCompletas,
          base.detalles
        )
      );

      console.log(
        '[INFORME ENCARGADOS] O.T. completas recuperadas:',
        ordenesCompletas.map((ot) => ({
          idOrden: ot.idOrden,
          encargado: ot.encargado,
          cliente: ot.cliente,
          fechaIngreso: ot.fechaIngreso,
          fechaEntrega: ot.fechaEntrega,
          detalles: Array.isArray(ot.detalles)
            ? ot.detalles.length
            : 0
        }))
      );

      return {
        cabeceras: ordenesCompletas,
        detalles: construirMapaDetalles(
          ordenesCompletas,
          base.detalles
        )
      };
    } catch (err) {
      console.error(
        '[INFORME ENCARGADOS] Error cargando O.T. completas:',
        err
      );

      setCabeceras([]);
      setDetallesPorOT({});
      setResultado([]);
      setError(
        'No fue posible recuperar las Órdenes de Trabajo completas. Revise la API.'
      );

      return {
        cabeceras: [],
        detalles: {}
      };
    } finally {
      setCargandoBase(false);
    }
  }, [
    consultarBase,
    leerOrdenCompleta,
    construirMapaDetalles
  ]);

  useEffect(() => {
    cargarBase();
  }, [cargarBase]);

  const generarInforme =
    useCallback(async () => {
      if (
        desde &&
        hasta &&
        desde > hasta
      ) {
        setError(
          'La fecha Desde no puede ser mayor que la fecha Hasta.'
        );
        setResultado([]);
        return;
      }

      if (
        !todosEncargados &&
        !encargadoSeleccionado
      ) {
        setError(
          'Seleccione un encargado o marque "Todos los encargados".'
        );
        setResultado([]);
        return;
      }

      setCargandoInforme(true);
      setError('');

      try {
        const baseActual =
          await consultarBase();

        const completas = await Promise.all(
          baseActual.cabeceras.map((ot) =>
            leerOrdenCompleta(
              ot,
              baseActual.detalles
            )
          )
        );

        const ordenesCompletas = completas.filter(
          (ot) => ot && ot.idOrden
        );

        setCabeceras(ordenesCompletas);
        setDetallesPorOT(
          construirMapaDetalles(
            ordenesCompletas,
            baseActual.detalles
          )
        );

        const filtradas = ordenesCompletas.filter(
          (ot) => {
            const coincideEncargado =
              todosEncargados ||
              normalizarClave(
                ot.encargado
              ) ===
                normalizarClave(
                  encargadoSeleccionado
                );

            return (
              coincideEncargado &&
              cumpleFiltroFecha(ot)
            );
          }
        );

        console.log(
          '[INFORME ENCARGADOS] Resultado antes de mostrar:',
          {
            totalBase: ordenesCompletas.length,
            totalFiltrado: filtradas.length,
            encargadoSeleccionado,
            todosEncargados,
            tipoFecha,
            desde,
            hasta
          }
        );

        const ordenadas =
          filtradas.sort((a, b) => {
            const fechaA =
              normalizarFechaInput(
                tipoFecha === 'entrega'
                  ? a.fechaEntrega
                  : a.fechaIngreso
              );

            const fechaB =
              normalizarFechaInput(
                tipoFecha === 'entrega'
                  ? b.fechaEntrega
                  : b.fechaIngreso
              );

            if (
              fechaA &&
              fechaB &&
              fechaA !== fechaB
            ) {
              return fechaB.localeCompare(
                fechaA
              );
            }

            return (
              Number(
                b.idOrden || 0
              ) -
              Number(
                a.idOrden || 0
              )
            );
          });

        setResultado(ordenadas);
      } catch (err) {
        console.error(
          '[INFORME ENCARGADOS] Error generando informe:',
          err
        );

        setResultado([]);

        setError(
          'No fue posible generar el informe. Revise la conexión con la API.'
        );
      } finally {
        setCargandoInforme(false);
      }
    }, [
      desde,
      hasta,
      todosEncargados,
      encargadoSeleccionado,
      tipoFecha,
      cumpleFiltroFecha,
      consultarBase,
      leerOrdenCompleta,
      construirMapaDetalles
    ]);

  const totalInforme = useMemo(
    () =>
      resultado.reduce(
        (acumulado, ot) =>
          acumulado +
          numero(ot.totalOT),
        0
      ),
    [resultado]
  );

  const cantidadDetalles =
    useMemo(
      () =>
        resultado.reduce(
          (acumulado, ot) =>
            acumulado +
            (
              Array.isArray(
                ot.detalles
              )
                ? ot.detalles.filter(
                    esDetalleNormalizadoValido
                  ).length
                : 0
            ),
          0
        ),
      [resultado]
    );

  const cantidadEncargados =
    useMemo(() => {
      const unicos = new Set(
        resultado.map((ot) =>
          normalizarClave(
            ot.encargado
          )
        )
      );

      unicos.delete('');

      return unicos.size;
    }, [resultado]);

  const imprimir = () => {
    if (!Array.isArray(resultado) || resultado.length === 0) {
      return;
    }

    const escaparHtml = (valor) =>
      String(valor ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

    const filasOrdenes = resultado
      .map((ot) => {
        const detallesValidos = Array.isArray(ot.detalles)
          ? ot.detalles.filter(esDetalleNormalizadoValido)
          : [];

        const filasDetalles =
          detallesValidos.length > 0
            ? detallesValidos
                .map(
                  (detalle) => `
                    <tr class="detalle-row">
                      <td class="detalle-label"></td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td class="codigo">${escaparHtml(detalle.codigo)}</td>
                      <td class="descripcion">${escaparHtml(detalle.descripcion)}</td>
                      <td class="numero">${escaparHtml(detalle.cantidad)}</td>
                      <td class="numero">${escaparHtml(dinero(detalle.valorUnitario))}</td>
                      <td></td>
                    </tr>
                  `
                )
                .join('')
            : `
                <tr class="detalle-row sin-detalle">
                  <td class="detalle-label">DETALLE</td>
                  <td colspan="9">Esta O.T. no tiene productos o servicios asociados.</td>
                  <td></td>
                </tr>
              `;

        return `
          <tbody class="grupo-ot">
            <tr class="ot-row">
              <td>${escaparHtml(ot.encargado || 'POR ASIGNAR')}</td>
              <td class="centro">${escaparHtml(ot.idOrden)}</td>
              <td>${escaparHtml(ot.cliente || '')}</td>
              <td class="centro">${escaparHtml(formatearFecha(ot.fechaIngreso))}</td>
              <td class="centro">${escaparHtml(formatearHora(ot.horaIngreso))}</td>
              <td class="centro">${escaparHtml(formatearFecha(ot.fechaEntrega))}</td>
              <td class="detalle-indicador">${
                detallesValidos.length > 0 ? 'Detalle ↓' : ''
              }</td>
              <td class="detalle-resumen">${
                detallesValidos.length > 0
                  ? `${detallesValidos.length} producto${
                      detallesValidos.length === 1 ? '' : 's'
                    } / servicio${detallesValidos.length === 1 ? '' : 's'}`
                  : 'Sin productos o servicios asociados'
              }</td>
              <td></td>
              <td></td>
              <td class="numero total-ot">${escaparHtml(dinero(ot.totalOT))}</td>
            </tr>
            ${filasDetalles}
          </tbody>
        `;
      })
      .join('');

    const encargadoImpresion = todosEncargados
      ? 'Todos los encargados'
      : encargadoSeleccionado || 'Sin encargado seleccionado';

    const tipoFechaTexto =
      tipoFecha === 'entrega'
        ? 'Fecha de Entrega'
        : 'Fecha de Ingreso';

    const iframe = document.createElement('iframe');

    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';

    document.body.appendChild(iframe);

    const documento =
      iframe.contentDocument ||
      iframe.contentWindow?.document;

    if (!documento) {
      iframe.remove();
      return;
    }

    documento.open();
    documento.write(`
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <title>Informe OT Encargados</title>
          <style>
            @page {
              size: A4 landscape;
              margin: 10mm;
            }

            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              color: #102a43;
              font-family: Arial, Helvetica, sans-serif;
              font-size: 9px;
              background: #fff;
            }

            .titulo {
              margin: 0 0 3px;
              color: #063b68;
              font-size: 16px;
              font-weight: 700;
              text-align: center;
            }

            .subtitulo {
              margin: 0 0 10px;
              color: #5b7083;
              font-size: 9px;
              text-align: center;
            }

            .filtros {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 6px;
              margin-bottom: 10px;
              padding: 7px;
              border: 1px solid #9fb5c8;
              background: #f5f9fc;
            }

            .filtro {
              min-width: 0;
            }

            .filtro strong {
              display: block;
              margin-bottom: 2px;
              color: #60758a;
              font-size: 7px;
              text-transform: uppercase;
            }

            .filtro span {
              color: #102a43;
              font-size: 9px;
              font-weight: 700;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
            }

            th,
            td {
              padding: 4px 5px;
              border: 1px solid #aebdca;
              vertical-align: middle;
              overflow-wrap: anywhere;
              word-break: break-word;
            }

            th {
              color: #06345c;
              background: #cbd9e5;
              font-size: 8px;
              font-weight: 700;
              text-align: left;
            }

            th.centro,
            td.centro {
              text-align: center;
            }

            th.numero,
            td.numero {
              text-align: right;
            }

            .ot-row td {
              background: #eef7fc;
              border-top: 2px solid #0b75ad;
              font-weight: 700;
            }

            .detalle-row td {
              background: #fff;
              font-size: 8px;
            }

            .detalle-row:nth-child(even) td {
              background: #fbfdff;
            }

            .detalle-label,
            .detalle-indicador,
            .detalle-resumen {
              color: #71869a;
              font-size: 7px;
              font-style: italic;
            }

            .codigo {
              color: #075985;
              font-weight: 700;
            }

            .descripcion {
              color: #1e293b;
            }

            .total-ot {
              color: #0f172a;
              font-weight: 700;
            }

            .sin-detalle td {
              color: #8295a7;
              font-style: italic;
              text-align: center;
            }

            .resumen-final {
              display: flex;
              justify-content: flex-end;
              margin-top: 10px;
            }

            .total-box {
              display: grid;
              grid-template-columns: 115px 145px;
              border: 1px solid #0b2f66;
            }

            .total-label {
              padding: 6px 8px;
              color: #fff;
              background: #0b2f66;
              font-weight: 700;
              text-align: center;
            }

            .total-valor {
              padding: 6px 8px;
              color: #0b2f66;
              background: #fff;
              font-weight: 700;
              text-align: center;
            }

            .pie {
              margin-top: 7px;
              color: #8193a3;
              font-size: 7px;
            }

            .grupo-ot {
              break-inside: avoid;
              page-break-inside: avoid;
            }

            thead {
              display: table-header-group;
            }

            tr {
              break-inside: avoid;
              page-break-inside: avoid;
            }

            @media print {
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          <h1 class="titulo">Informe OT Encargados</h1>
          <p class="subtitulo">Órdenes de trabajo y productos asociados según los filtros seleccionados</p>

          <section class="filtros">
            <div class="filtro">
              <strong>Encargado</strong>
              <span>${escaparHtml(encargadoImpresion)}</span>
            </div>
            <div class="filtro">
              <strong>Desde</strong>
              <span>${escaparHtml(formatearFecha(desde))}</span>
            </div>
            <div class="filtro">
              <strong>Hasta</strong>
              <span>${escaparHtml(formatearFecha(hasta))}</span>
            </div>
            <div class="filtro">
              <strong>Filtro aplicado</strong>
              <span>${escaparHtml(tipoFechaTexto)}</span>
            </div>
          </section>

          <table>
            <colgroup>
              <col style="width: 9%" />
              <col style="width: 5%" />
              <col style="width: 15%" />
              <col style="width: 8%" />
              <col style="width: 6%" />
              <col style="width: 8%" />
              <col style="width: 9%" />
              <col style="width: 20%" />
              <col style="width: 6%" />
              <col style="width: 7%" />
              <col style="width: 7%" />
            </colgroup>
            <thead>
              <tr>
                <th>Encargado</th>
                <th class="centro">N° O.T.</th>
                <th>Cliente</th>
                <th class="centro">Fecha Ingreso</th>
                <th class="centro">Hora Ingreso</th>
                <th class="centro">Fecha Entrega</th>
                <th>Cód. producto</th>
                <th>Descripción</th>
                <th class="centro">Cantidad</th>
                <th class="numero">Valor unit.</th>
                <th class="numero">Total O.T.</th>
              </tr>
            </thead>
            ${filasOrdenes}
          </table>

          <div class="resumen-final">
            <div class="total-box">
              <div class="total-label">Total Informe</div>
              <div class="total-valor">${escaparHtml(dinero(totalInforme))}</div>
            </div>
          </div>

          <div class="pie">
            ${escaparHtml(resultado.length)} O.T. en el informe · ${escaparHtml(
      cantidadDetalles
    )} productos o servicios asociados
          </div>

          <script>
            window.onload = function () {
              setTimeout(function () {
                window.focus();
                window.print();
              }, 150);
            };

            window.onafterprint = function () {
              if (window.frameElement) {
                window.frameElement.remove();
              }
            };
          </script>
        </body>
      </html>
    `);
    documento.close();

    setTimeout(() => {
      if (document.body.contains(iframe)) {
        iframe.remove();
      }
    }, 60000);
  };

  const tarjetaResumen = (
    titulo,
    valor,
    icono,
    detalle,
    colorFondo,
    colorTexto
  ) => (
    <Paper
      elevation={0}
      sx={{
        border:
          '1px solid #e2e8f0',
        borderRadius: '12px',
        p: {
          xs: 1.2,
          sm: 1.5
        },
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
        minWidth: 0,
        backgroundColor: '#fff'
      }}
    >
      <Box
        sx={{
          width: 38,
          height: 38,
          flexShrink: 0,
          borderRadius: '10px',
          display: 'grid',
          placeItems: 'center',
          backgroundColor:
            colorFondo,
          color: colorTexto
        }}
      >
        {icono}
      </Box>

      <Box
        sx={{
          minWidth: 0
        }}
      >
        <Typography
          sx={{
            color: '#64748b',
            fontSize: '10.5px',
            fontWeight: 700,
            lineHeight: 1.1
          }}
        >
          {titulo}
        </Typography>

        <Typography
          sx={{
            mt: 0.25,
            color: '#0f172a',
            fontSize: {
              xs: '15px',
              sm: '17px'
            },
            fontWeight: 900,
            lineHeight: 1.1,
            overflow: 'hidden',
            textOverflow:
              'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {valor}
        </Typography>

        <Typography
          sx={{
            mt: 0.25,
            color: '#94a3b8',
            fontSize: '9.5px',
            lineHeight: 1.1
          }}
        >
          {detalle}
        </Typography>
      </Box>
    </Paper>
  );

  return (
    <Box
      sx={{
        minHeight: '100%',
        backgroundColor:
          '#f4f7fb',
        p: {
          xs: 0,
          sm: 1,
          md: 1.5
        }
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          border:
            '1px solid #d9e3ec',
          borderRadius: {
            xs: 0,
            sm: '14px'
          },
          overflow: 'hidden',
          backgroundColor: '#fff',
          boxShadow:
            '0 8px 28px rgba(15, 23, 42, 0.08)'
        }}
      >
        <Box
          sx={{
            px: {
              xs: 1.5,
              sm: 2.25
            },
            py: {
              xs: 1.3,
              sm: 1.55
            },
            color: '#fff',
            background:
              'linear-gradient(90deg, #06456f 0%, #075985 50%, #0b7fb5 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent:
              'space-between',
            gap: 2
          }}
        >
          <Box
            sx={{
              minWidth: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 1.25
            }}
          >
            <Box
              sx={{
                width: 38,
                height: 38,
                flexShrink: 0,
                borderRadius: '10px',
                backgroundColor:
                  'rgba(255,255,255,0.13)',
                display: {
                  xs: 'none',
                  sm: 'grid'
                },
                placeItems: 'center'
              }}
            >
              <PersonSearchOutlinedIcon />
            </Box>

            <Box
              sx={{
                minWidth: 0
              }}
            >
              <Typography
                sx={{
                  fontSize: {
                    xs: '14px',
                    sm: '17px'
                  },
                  fontWeight: 900,
                  lineHeight: 1.15
                }}
              >
                Informe de OT Encargado
              </Typography>

              <Typography
                sx={{
                  mt: 0.35,
                  fontSize: {
                    xs: '10px',
                    sm: '11px'
                  },
                  opacity: 0.88
                }}
              >
                Consulta O.T., encargados, fechas y productos asociados
              </Typography>
            </Box>
          </Box>

          <IconButton
            onClick={onClose}
            size="small"
            sx={{
              flexShrink: 0,
              color: '#fff',
              backgroundColor:
                'rgba(255,255,255,0.12)',
              '&:hover': {
                backgroundColor:
                  'rgba(255,255,255,0.22)'
              }
            }}
            aria-label="Cerrar informe"
          >
            <CloseIcon />
          </IconButton>
        </Box>

        <Box
          sx={{
            p: {
              xs: 1.25,
              sm: 1.75,
              md: 2
            },
            background:
              'linear-gradient(180deg, #fbfdff 0%, #f7fafc 100%)',
            borderBottom:
              '1px solid #e2e8f0'
          }}
        >
          <Paper
            elevation={0}
            sx={{
              border:
                '1px solid #dbe5ee',
              borderRadius: '12px',
              p: {
                xs: 1.25,
                sm: 1.5
              },
              backgroundColor: '#fff'
            }}
          >
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(2, minmax(0, 1fr))',
                  lg:
                    'minmax(260px, 1.4fr) minmax(170px, .8fr) minmax(170px, .8fr) minmax(190px, .9fr)'
                },
                gap: 1.25,
                alignItems: 'center'
              }}
            >
              <Autocomplete
                fullWidth
                size="small"
                options={encargadosDisponibles}
                value={
                  encargadoSeleccionado || null
                }
                onChange={(_, nuevoEncargado) => {
                  const valor =
                    nuevoEncargado || '';

                  setEncargadoSeleccionado(
                    valor
                  );

                  if (valor) {
                    setTodosEncargados(false);
                  }
                }}
                isOptionEqualToValue={(
                  opcion,
                  valor
                ) =>
                  normalizarClave(opcion) ===
                  normalizarClave(valor)
                }
                noOptionsText="No se encontraron encargados"
                clearOnEscape
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Encargado"
                    placeholder="Buscar encargado..."
                    fullWidth
                  />
                )}
              />

              <TextField
                type="date"
                label="Desde"
                size="small"
                value={desde}
                onChange={(event) =>
                  setDesde(
                    event.target.value
                  )
                }
                InputLabelProps={{
                  shrink: true
                }}
                fullWidth
              />

              <TextField
                type="date"
                label="Hasta"
                size="small"
                value={hasta}
                onChange={(event) =>
                  setHasta(
                    event.target.value
                  )
                }
                InputLabelProps={{
                  shrink: true
                }}
                fullWidth
              />

              <FormControlLabel
                sx={{
                  m: 0,
                  px: 0.75,
                  minHeight: 40,
                  borderRadius: '8px',
                  border:
                    '1px solid #e2e8f0',
                  backgroundColor:
                    todosEncargados
                      ? '#eef7ff'
                      : '#fff'
                }}
                control={
                  <Checkbox
                    size="small"
                    checked={
                      todosEncargados
                    }
                    onChange={(
                      event
                    ) => {
                      const marcado =
                        event.target
                          .checked;

                      setTodosEncargados(
                        marcado
                      );

                      if (marcado) {
                        setEncargadoSeleccionado(
                          ''
                        );
                      }
                    }}
                  />
                }
                label={
                  <Typography
                    sx={{
                      fontSize:
                        '11.5px',
                      fontWeight: 800,
                      color:
                        '#334155'
                    }}
                  >
                    Todos los encargados
                  </Typography>
                }
              />
            </Box>

            <Divider
              sx={{
                my: 1.35
              }}
            />

            <Box
              sx={{
                display: 'flex',
                flexDirection: {
                  xs: 'column',
                  md: 'row'
                },
                alignItems: {
                  xs: 'stretch',
                  md: 'center'
                },
                justifyContent:
                  'space-between',
                gap: 1.25
              }}
            >
              <Box>
                <Typography
                  sx={{
                    mb: 0.25,
                    fontSize:
                      '10.5px',
                    fontWeight: 800,
                    color:
                      '#64748b'
                  }}
                >
                  Filtrar rango según
                </Typography>

                <RadioGroup
                  row
                  value={tipoFecha}
                  onChange={(event) =>
                    setTipoFecha(
                      event.target.value
                    )
                  }
                  sx={{
                    gap: {
                      xs: 0,
                      sm: 1
                    }
                  }}
                >
                  <FormControlLabel
                    value="entrega"
                    control={
                      <Radio
                        size="small"
                      />
                    }
                    label={
                      <Typography
                        sx={{
                          fontSize:
                            '11.5px',
                          fontWeight: 600
                        }}
                      >
                        Fecha de Entrega
                      </Typography>
                    }
                  />

                  <FormControlLabel
                    value="ingreso"
                    control={
                      <Radio
                        size="small"
                      />
                    }
                    label={
                      <Typography
                        sx={{
                          fontSize:
                            '11.5px',
                          fontWeight: 600
                        }}
                      >
                        Fecha de Ingreso
                      </Typography>
                    }
                  />
                </RadioGroup>
              </Box>

              <Stack
                direction={{
                  xs: 'column',
                  sm: 'row'
                }}
                spacing={1}
              >
                <Button
                  variant="outlined"
                  startIcon={
                    <RefreshIcon />
                  }
                  onClick={cargarBase}
                  disabled={
                    cargandoBase ||
                    cargandoInforme
                  }
                  sx={{
                    minHeight: 38,
                    textTransform:
                      'none',
                    fontWeight: 700,
                    borderRadius:
                      '8px'
                  }}
                >
                  Recargar
                </Button>

                <Button
                  variant="contained"
                  startIcon={
                    cargandoInforme ? (
                      <CircularProgress
                        size={16}
                        color="inherit"
                      />
                    ) : (
                      <SearchIcon />
                    )
                  }
                  onClick={
                    generarInforme
                  }
                  disabled={
                    cargandoBase ||
                    cargandoInforme
                  }
                  sx={{
                    minHeight: 38,
                    minWidth: {
                      sm: 160
                    },
                    textTransform:
                      'none',
                    fontWeight: 800,
                    borderRadius:
                      '8px',
                    backgroundColor:
                      '#0b75ad',
                    '&:hover': {
                      backgroundColor:
                        '#075985'
                    }
                  }}
                >
                  {cargandoInforme
                    ? 'Consultando...'
                    : 'Buscar informe'}
                </Button>

                <Button
                  variant="outlined"
                  startIcon={
                    <PrintIcon />
                  }
                  onClick={imprimir}
                  disabled={
                    resultado.length ===
                    0
                  }
                  sx={{
                    minHeight: 38,
                    textTransform:
                      'none',
                    fontWeight: 700,
                    borderRadius:
                      '8px',
                    color:
                      '#475569',
                    borderColor:
                      '#cbd5e1'
                  }}
                >
                  Imprimir
                </Button>
              </Stack>
            </Box>
          </Paper>
        </Box>

        <Box
          sx={{
            p: {
              xs: 1.25,
              sm: 1.75,
              md: 2
            },
            backgroundColor:
              '#f8fafc'
          }}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm:
                  'repeat(2, minmax(0, 1fr))',
                lg:
                  'repeat(4, minmax(0, 1fr))'
              },
              gap: 1
            }}
          >
            {tarjetaResumen(
              'Órdenes encontradas',
              resultado.length,
              <AssignmentIndIcon fontSize="small" />,
              'O.T. que cumplen los filtros',
              '#e8f3fb',
              '#075985'
            )}

            {tarjetaResumen(
              'Encargados',
              cantidadEncargados,
              <PersonSearchOutlinedIcon fontSize="small" />,
              'Encargados dentro del resultado',
              '#eef2ff',
              '#4338ca'
            )}

            {tarjetaResumen(
              'Detalles',
              cantidadDetalles,
              <Inventory2OutlinedIcon fontSize="small" />,
              'Productos o servicios asociados',
              '#ecfdf5',
              '#047857'
            )}

            {tarjetaResumen(
              'Total informe',
              dinero(totalInforme),
              <PaidOutlinedIcon fontSize="small" />,
              'Suma de las O.T. filtradas',
              '#fff7ed',
              '#c2410c'
            )}
          </Box>
        </Box>

        {error && (
          <Alert
            severity="error"
            sx={{
              mx: {
                xs: 1.25,
                sm: 2
              },
              mb: 1.5,
              borderRadius: '10px'
            }}
          >
            {error}
          </Alert>
        )}

        <Box
          sx={{
            px: {
              xs: 1,
              sm: 1.5,
              md: 2
            },
            pb: {
              xs: 1,
              sm: 1.5,
              md: 2
            }
          }}
        >
          <Box
            sx={{
              display: {
                xs: 'block',
                md: 'none'
              }
            }}
          >
            {(cargandoBase || cargandoInforme) && (
              <Paper
                elevation={0}
                sx={{
                  border: '1px solid #dbe5ee',
                  borderRadius: '12px',
                  py: 5,
                  textAlign: 'center'
                }}
              >
                <CircularProgress size={28} />
                <Typography
                  sx={{
                    mt: 1,
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#64748b'
                  }}
                >
                  Recuperando información del informe...
                </Typography>
              </Paper>
            )}

            {!cargandoBase &&
              !cargandoInforme &&
              resultado.length === 0 && (
                <Paper
                  elevation={0}
                  sx={{
                    border: '1px solid #dbe5ee',
                    borderRadius: '12px',
                    py: 5,
                    px: 2,
                    textAlign: 'center'
                  }}
                >
                  <SearchIcon sx={{ color: '#64748b' }} />
                  <Typography
                    sx={{
                      mt: 1,
                      color: '#334155',
                      fontSize: '12px',
                      fontWeight: 800
                    }}
                  >
                    No hay O.T. para los filtros seleccionados
                  </Typography>
                  <Typography
                    sx={{
                      mt: 0.5,
                      color: '#94a3b8',
                      fontSize: '10.5px'
                    }}
                  >
                    Cambia el rango, encargado o tipo de fecha y vuelve a buscar.
                  </Typography>
                </Paper>
              )}

            {!cargandoBase &&
              !cargandoInforme &&
              resultado.map((ot) => {
                const detallesValidos = Array.isArray(ot.detalles)
                  ? ot.detalles.filter(esDetalleNormalizadoValido)
                  : [];

                return (
                  <Paper
                    key={`mobile-${ot.idOrden}`}
                    elevation={0}
                    sx={{
                      mb: 1,
                      border: '1px solid #dbe5ee',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      backgroundColor: '#fff'
                    }}
                  >
                    <Box
                      sx={{
                        px: 1.25,
                        py: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 1,
                        backgroundColor: '#f1f7fb',
                        borderBottom: '1px solid #dbe5ee'
                      }}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography
                          sx={{
                            color: '#075985',
                            fontSize: '11.5px',
                            fontWeight: 900,
                            lineHeight: 1.15
                          }}
                        >
                          {ot.encargado || 'POR ASIGNAR'}
                        </Typography>
                        <Typography
                          sx={{
                            mt: 0.25,
                            color: '#64748b',
                            fontSize: '10px'
                          }}
                        >
                          O.T. N° {ot.idOrden}
                        </Typography>
                      </Box>

                      <Chip
                        size="small"
                        label={dinero(ot.totalOT)}
                        sx={{
                          flexShrink: 0,
                          height: 24,
                          backgroundColor: '#fff',
                          color: '#0f172a',
                          fontSize: '10px',
                          fontWeight: 900,
                          border: '1px solid #d7e3ec'
                        }}
                      />
                    </Box>

                    <Box sx={{ p: 1.25 }}>
                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                          gap: 1
                        }}
                      >
                        {[
                          ['Cliente', ot.cliente || ''],
                          ['Fecha ingreso', formatearFecha(ot.fechaIngreso)],
                          ['Hora ingreso', formatearHora(ot.horaIngreso)],
                          ['Fecha entrega', formatearFecha(ot.fechaEntrega)]
                        ].map(([titulo, valor]) => (
                          <Box
                            key={titulo}
                            sx={{
                              minWidth: 0,
                              px: 0.85,
                              py: 0.75,
                              border: '1px solid #dbe5ee',
                              borderRadius: '7px',
                              backgroundColor: '#fbfdff'
                            }}
                          >
                            <Typography
                              sx={{
                                color: '#7c8da1',
                                fontSize: '8.8px',
                                fontWeight: 900,
                                textTransform: 'uppercase',
                                lineHeight: 1
                              }}
                            >
                              {titulo}
                            </Typography>
                            <Typography
                              sx={{
                                mt: 0.35,
                                color: '#1e293b',
                                fontSize: '10.6px',
                                fontWeight: 800,
                                lineHeight: 1.25,
                                whiteSpace: 'normal',
                                overflowWrap: 'anywhere',
                                wordBreak: 'break-word'
                              }}
                            >
                              {valor}
                            </Typography>
                          </Box>
                        ))}
                      </Box>

                      <Divider sx={{ my: 1.1 }} />

                      <Typography
                        sx={{
                          mb: 0.75,
                          color: '#475569',
                          fontSize: '10px',
                          fontWeight: 900,
                          textTransform: 'uppercase'
                        }}
                      >
                        Productos / Servicios
                      </Typography>

                      {detallesValidos.length > 0 ? (
                        <Stack spacing={0.65}>
                          {detallesValidos.map((detalle, indexDetalle) => (
                            <Box
                              key={`${ot.idOrden}-${detalle.idDetalle || detalle.codigo || indexDetalle}`}
                              sx={{
                                display: 'grid',
                                gridTemplateColumns: '76px minmax(0, 1fr) auto',
                                gap: 0.75,
                                alignItems: 'center',
                                px: 0.85,
                                py: 0.7,
                                borderRadius: '8px',
                                backgroundColor: indexDetalle % 2 === 0 ? '#f8fafc' : '#fff',
                                border: '1px solid #edf2f7'
                              }}
                            >
                              <Typography
                                sx={{
                                  color: '#075985',
                                  fontSize: '9.8px',
                                  fontWeight: 900,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {detalle.codigo}
                              </Typography>

                              <Box sx={{ minWidth: 0 }}>
                                <Typography
                                  sx={{
                                    color: '#1e293b',
                                    fontSize: '10px',
                                    fontWeight: 650,
                                    lineHeight: 1.2
                                  }}
                                >
                                  {detalle.descripcion}
                                </Typography>
                              </Box>

                              <Box sx={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                <Typography
                                  sx={{
                                    color: '#334155',
                                    fontSize: '9.5px',
                                    fontWeight: 800
                                  }}
                                >
                                  {detalle.cantidad} un.
                                </Typography>
                                <Typography
                                  sx={{
                                    color: '#64748b',
                                    fontSize: '9.5px'
                                  }}
                                >
                                  {dinero(detalle.valorUnitario)}
                                </Typography>
                              </Box>
                            </Box>
                          ))}
                        </Stack>
                      ) : (
                        <Typography
                          sx={{
                            color: '#94a3b8',
                            fontSize: '10.5px',
                            fontStyle: 'italic'
                          }}
                        >
                          Esta O.T. no tiene productos o servicios asociados.
                        </Typography>
                      )}
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1.2 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<EditOutlinedIcon />}
                          onClick={() => handleEditarOrden(ot)}
                          sx={{
                            borderRadius: '8px',
                            textTransform: 'none',
                            fontSize: '11px',
                            fontWeight: 800,
                            minHeight: 32
                          }}
                        >
                          Editar O.T.
                        </Button>
                      </Box>
                    </Box>
                  </Paper>
                );
              })}
          </Box>

          <Box
            sx={{
              display: {
                xs: 'none',
                md: 'block'
              }
            }}
          >
            <Paper
              elevation={0}
              sx={{
                border: '1px solid #9fb0bf',
                borderRadius: '10px',
                overflow: 'hidden',
                backgroundColor: '#fff'
              }}
            >
              <TableContainer
                sx={{
                  maxHeight: '61vh',
                  overflow: 'auto',
                  pb: 0.8,
                  scrollbarGutter: 'stable',
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#9aa9b7 #eef3f7',
                  '&::-webkit-scrollbar': {
                    width: '7px',
                    height: '7px'
                  },
                  '&::-webkit-scrollbar-track': {
                    backgroundColor: '#eef3f7',
                    borderRadius: '10px',
                    marginInline: '6px'
                  },
                  '&::-webkit-scrollbar-thumb': {
                    backgroundColor: '#9aa9b7',
                    borderRadius: '10px',
                    border: '2px solid #eef3f7'
                  },
                  '&::-webkit-scrollbar-thumb:hover': {
                    backgroundColor: '#748596'
                  }
                }}
              >
                <Table
                  stickyHeader
                  size="small"
                  sx={{
                    minWidth: 1320,
                    tableLayout: 'fixed',
                    borderCollapse: 'separate',
                    borderSpacing: 0,
                    '& .MuiTableCell-root': {
                      px: 0.85,
                      py: 0.7,
                      lineHeight: 1.2,
                      borderRight: '1px solid #aebdca',
                      borderBottom: '1px solid #b9c7d3',
                      verticalAlign: 'middle',
                      boxSizing: 'border-box'
                    },
                    '& .MuiTableCell-root:last-of-type': {
                      borderRight: 'none'
                    }
                  }}
                >
                  <TableHead>
                    <TableRow>
                      {[
                        ['Encargado', 130, 'left'],
                        ['N° O.T.', 72, 'center'],
                        ['Cliente', 205, 'left'],
                        ['Fecha Ingreso', 105, 'center'],
                        ['Hora Ingreso', 85, 'center'],
                        ['Fecha Entrega', 105, 'center'],
                        ['Cód. producto', 125, 'left'],
                        ['Descripción', 280, 'left'],
                        ['Cantidad', 82, 'center'],
                        ['Valor unit.', 105, 'right'],
                        ['Total O.T.', 120, 'right'],
                        ['Acción', 95, 'center']
                      ].map(([titulo, ancho, alineacion]) => (
                        <TableCell
                          key={titulo}
                          align={alineacion}
                          sx={{
                            width: ancho,
                            minWidth: ancho,
                            backgroundColor: '#cbd9e5',
                            color: '#06345c',
                            fontSize: '9.7px',
                            fontWeight: 900,
                            textTransform: 'none',
                            whiteSpace: 'nowrap',
                            borderRight: '1px solid #91a5b7 !important',
                            borderBottom: '2px solid #7891a6 !important',
                            boxShadow: 'inset 0 -1px 0 rgba(6, 52, 92, 0.08)'
                          }}
                        >
                          {titulo}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {(cargandoBase || cargandoInforme) && (
                      <TableRow>
                        <TableCell
                          colSpan={12}
                          align="center"
                          sx={{
                            py: '34px !important',
                            backgroundColor: '#fff'
                          }}
                        >
                          <CircularProgress size={28} />
                          <Typography
                            sx={{
                              mt: 1,
                              color: '#64748b',
                              fontSize: '11px',
                              fontWeight: 700
                            }}
                          >
                            Recuperando información del informe...
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}

                    {!cargandoBase &&
                      !cargandoInforme &&
                      resultado.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={12}
                            align="center"
                            sx={{
                              py: '34px !important',
                              backgroundColor: '#fff'
                            }}
                          >
                            <SearchIcon sx={{ color: '#64748b' }} />
                            <Typography
                              sx={{
                                mt: 0.75,
                                color: '#334155',
                                fontSize: '11px',
                                fontWeight: 800
                              }}
                            >
                              No hay O.T. para los filtros seleccionados
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}

                    {!cargandoBase &&
                      !cargandoInforme &&
                      resultado.map((ot, indiceOT) => {
                        const detallesValidos = Array.isArray(ot.detalles)
                          ? ot.detalles.filter(esDetalleNormalizadoValido)
                          : [];

                        const coloresGrupo = [
                          {
                            principal: '#0b75ad',
                            cabecera: '#edf7fc',
                            detalle: '#fbfdff'
                          },
                          {
                            principal: '#2e7d32',
                            cabecera: '#eef8ef',
                            detalle: '#fbfefb'
                          },
                          {
                            principal: '#7e57c2',
                            cabecera: '#f4effa',
                            detalle: '#fdfbff'
                          },
                          {
                            principal: '#c56a00',
                            cabecera: '#fff5e8',
                            detalle: '#fffdf9'
                          }
                        ];

                        const estiloGrupo =
                          coloresGrupo[indiceOT % coloresGrupo.length];

                        const textoCelda = {
                          fontSize: '10px',
                          color: '#1e293b',
                          fontWeight: 700,
                          whiteSpace: 'normal',
                          overflowWrap: 'anywhere',
                          wordBreak: 'break-word'
                        };

                        const textoCentro = {
                          ...textoCelda,
                          textAlign: 'center'
                        };

                        return (
                          <React.Fragment key={`grupo-${ot.idOrden}`}>
                            <TableRow
                              sx={{
                                backgroundColor: estiloGrupo.cabecera,
                                '& .MuiTableCell-root': {
                                  borderTop:
                                    indiceOT === 0
                                      ? `3px solid ${estiloGrupo.principal}`
                                      : `2px solid ${estiloGrupo.principal}`,
                                  borderRight: '1px solid #9fb0bf',
                                  borderBottom: '1px solid #aebdca',
                                  backgroundColor: estiloGrupo.cabecera,
                                  boxShadow:
                                    'inset 0 1px 0 rgba(255,255,255,0.75)'
                                }
                              }}
                            >
                              <TableCell>
                                <Typography
                                  sx={{
                                    ...textoCelda,
                                    color: estiloGrupo.principal,
                                    fontWeight: 900
                                  }}
                                >
                                  {ot.encargado || 'POR ASIGNAR'}
                                </Typography>
                              </TableCell>

                              <TableCell align="center">
                                <Typography
                                  sx={{
                                    ...textoCentro,
                                    color: estiloGrupo.principal,
                                    fontWeight: 900
                                  }}
                                >
                                  {ot.idOrden}
                                </Typography>
                              </TableCell>

                              <TableCell>
                                <Typography sx={textoCelda}>
                                  {ot.cliente || ''}
                                </Typography>
                              </TableCell>

                              <TableCell align="center">
                                <Typography sx={textoCentro}>
                                  {formatearFecha(ot.fechaIngreso)}
                                </Typography>
                              </TableCell>

                              <TableCell align="center">
                                <Typography sx={textoCentro}>
                                  {formatearHora(ot.horaIngreso)}
                                </Typography>
                              </TableCell>

                              <TableCell align="center">
                                <Typography sx={textoCentro}>
                                  {formatearFecha(ot.fechaEntrega)}
                                </Typography>
                              </TableCell>

                              <TableCell
                                align="center"
                                sx={{
                                  color: '#94a3b8',
                                  fontSize: '9px',
                                  fontStyle: 'italic'
                                }}
                              >
                                {detallesValidos.length > 0 ? 'Detalle ↓' : ''}
                              </TableCell>

                              <TableCell
                                sx={{
                                  color: '#94a3b8',
                                  fontSize: '9px',
                                  fontStyle: 'italic'
                                }}
                              >
                                {detallesValidos.length > 0
                                  ? `${detallesValidos.length} producto${
                                      detallesValidos.length === 1 ? '' : 's'
                                    } / servicio${
                                      detallesValidos.length === 1 ? '' : 's'
                                    }`
                                  : 'Sin productos o servicios asociados'}
                              </TableCell>

                              <TableCell align="center" />
                              <TableCell align="right" />

                              <TableCell align="right">
                                <Typography
                                  sx={{
                                    fontSize: '10.5px',
                                    color: '#0f172a',
                                    fontWeight: 900,
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  {dinero(ot.totalOT)}
                                </Typography>
                              </TableCell>

                              <TableCell align="center">
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="primary"
                                  startIcon={<EditOutlinedIcon sx={{ fontSize: 15 }} />}
                                  onClick={() => handleEditarOrden(ot)}
                                  aria-label={`Editar O.T. ${ot.idOrden}`}
                                  sx={{
                                    minWidth: 78,
                                    minHeight: 28,
                                    px: 0.8,
                                    borderRadius: '6px',
                                    fontSize: '9.5px',
                                    fontWeight: 800,
                                    textTransform: 'none',
                                    whiteSpace: 'nowrap',
                                    backgroundColor: '#fff'
                                  }}
                                >
                                  Editar
                                </Button>
                              </TableCell>
                            </TableRow>

                            {detallesValidos.length > 0 ? (
                              detallesValidos.map((detalle, indexDetalle) => (
                                <TableRow
                                  key={`${ot.idOrden}-${
                                    detalle.idDetalle ||
                                    detalle.codigo ||
                                    indexDetalle
                                  }`}
                                  hover
                                  sx={{
                                    backgroundColor:
                                      indexDetalle % 2 === 0
                                        ? estiloGrupo.detalle
                                        : '#ffffff',
                                    '&:hover': {
                                      backgroundColor: '#e6f2f9'
                                    },
                                    '& .MuiTableCell-root': {
                                      backgroundColor:
                                        indexDetalle % 2 === 0
                                          ? estiloGrupo.detalle
                                          : '#ffffff',
                                      borderRight: '1px solid #c0ccd6',
                                      borderBottom: '1px solid #c8d3dc'
                                    }
                                  }}
                                >
                                  <TableCell
                                    sx={{
                                      color: '#8a99aa',
                                      fontSize: '8.7px',
                                      fontWeight: 700,
                                      textAlign: 'center'
                                    }}
                                  >
                                    {indexDetalle === 0 ? 'DETALLE' : ''}
                                  </TableCell>

                                  <TableCell />
                                  <TableCell />
                                  <TableCell />
                                  <TableCell />
                                  <TableCell />

                                  <TableCell>
                                    <Typography
                                      sx={{
                                        fontSize: '9.8px',
                                        color: estiloGrupo.principal,
                                        fontWeight: 900,
                                        whiteSpace: 'normal',
                                        overflowWrap: 'anywhere'
                                      }}
                                    >
                                      {detalle.codigo}
                                    </Typography>
                                  </TableCell>

                                  <TableCell>
                                    <Typography
                                      sx={{
                                        fontSize: '9.8px',
                                        color: '#1e293b',
                                        fontWeight: 650,
                                        lineHeight: 1.25,
                                        whiteSpace: 'normal',
                                        overflowWrap: 'anywhere',
                                        wordBreak: 'break-word'
                                      }}
                                    >
                                      {detalle.descripcion}
                                    </Typography>
                                  </TableCell>

                                  <TableCell align="center">
                                    <Typography
                                      sx={{
                                        fontSize: '9.8px',
                                        color: '#1e293b',
                                        fontWeight: 800
                                      }}
                                    >
                                      {detalle.cantidad}
                                    </Typography>
                                  </TableCell>

                                  <TableCell align="right">
                                    <Typography
                                      sx={{
                                        fontSize: '9.8px',
                                        color: '#334155',
                                        fontWeight: 700,
                                        whiteSpace: 'nowrap'
                                      }}
                                    >
                                      {dinero(detalle.valorUnitario)}
                                    </Typography>
                                  </TableCell>

                                  <TableCell />
                                  <TableCell />
                                </TableRow>
                              ))
                            ) : (
                              <TableRow
                                sx={{
                                  backgroundColor: '#fff',
                                  '& .MuiTableCell-root': {
                                    backgroundColor: '#fff',
                                    borderRight: '1px solid #c0ccd6',
                                    borderBottom: '1px solid #c8d3dc'
                                  }
                                }}
                              >
                                <TableCell
                                  sx={{
                                    color: '#8a99aa',
                                    fontSize: '8.7px',
                                    fontWeight: 700,
                                    textAlign: 'center'
                                  }}
                                >
                                  DETALLE
                                </TableCell>

                                <TableCell />
                                <TableCell />
                                <TableCell />
                                <TableCell />
                                <TableCell />

                                <TableCell
                                  colSpan={4}
                                  sx={{
                                    color: '#94a3b8',
                                    fontSize: '9.5px',
                                    fontStyle: 'italic',
                                    textAlign: 'center'
                                  }}
                                >
                                  Esta O.T. no tiene productos o servicios asociados.
                                </TableCell>

                                <TableCell />
                                <TableCell />
                              </TableRow>
                            )}
                          </React.Fragment>
                        );
                      })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Box>
        </Box>

        <Box
          sx={{
            px: {
              xs: 1.25,
              sm: 2
            },
            py: 0.9,
            borderTop:
              '1px solid #cfd8e3',
            backgroundColor:
              '#fbfdff',
            display: 'flex',
            flexDirection: {
              xs: 'column',
              sm: 'row'
            },
            alignItems: {
              xs: 'stretch',
              sm: 'center'
            },
            justifyContent:
              'space-between',
            gap: {
              xs: 1,
              sm: 1.5
            }
          }}
        >
          <Typography
            sx={{
              display: {
                xs: 'none',
                sm: 'block'
              },
              color: '#94a3b8',
              fontSize: '10px',
              whiteSpace: 'nowrap'
            }}
          >
            {cabeceras.length} O.T. disponibles en la consulta general
          </Typography>

          <Box
            sx={{
              ml: {
                xs: 0,
                sm: 'auto'
              },
              display: 'flex',
              flexDirection: {
                xs: 'column',
                sm: 'row'
              },
              alignItems: {
                xs: 'stretch',
                sm: 'center'
              },
              gap: 1
            }}
          >
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr 1fr',
                  sm: '120px 150px'
                },
                minWidth: {
                  xs: '100%',
                  sm: '270px'
                },
                border: '1px solid #0b2f66',
                borderRadius: '2px',
                overflow: 'hidden',
                backgroundColor: '#fff'
              }}
            >
              <Box
                sx={{
                  px: 1.1,
                  py: 0.75,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#0b2f66',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: 900,
                  letterSpacing: '0.2px',
                  whiteSpace: 'nowrap'
                }}
              >
                Total Informe
              </Box>

              <Box
                sx={{
                  px: 1.1,
                  py: 0.75,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#fff',
                  color: '#0b2f66',
                  fontSize: '12px',
                  fontWeight: 900,
                  whiteSpace: 'nowrap'
                }}
              >
                {dinero(totalInforme)}
              </Box>
            </Box>

          </Box>
        </Box>
      </Paper>

    </Box>
  );
}
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  IconButton,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip
} from '@mui/material';
import {
  CloudUpload,
  Delete,
  Save,
  PhotoLibrary,
  Download,
  Visibility,
  Refresh
} from '@mui/icons-material';

const API_URL = 'http://localhost/Api';

const crearEstadoVacio = () => ({
  img1: null,
  img2: null,
  img3: null,
  img4: null
});

const obtenerExtension = (mimeType = '') => {
  const tipo = String(mimeType).toLowerCase();

  if (tipo.includes('png')) return 'png';
  if (tipo.includes('webp')) return 'webp';
  if (tipo.includes('gif')) return 'gif';
  if (tipo.includes('bmp')) return 'bmp';

  return 'jpg';
};

// Convierte la imagen a texto Base64 para enviarla en RutaImagen.
const convertirABase64 = (archivo) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(String(reader.result || ''));
    };

    reader.onerror = () => {
      reject(
        reader.error ||
        new Error('No fue posible leer la imagen.')
      );
    };

    reader.readAsDataURL(archivo);
  });

const normalizarSrc = (valor) => {
  const texto = String(valor || '').trim();

  if (!texto) {
    return '';
  }

  return texto;
};

const extraerImagenesDesdeRespuesta = (respuesta) => {
  if (!respuesta) {
    return [];
  }

  const orden = Array.isArray(respuesta)
    ? respuesta[0]
    : respuesta;

  const lista =
    orden?.Imagenes ??
    orden?.imagenes ??
    orden?.Images ??
    orden?.images ??
    [];

  return Array.isArray(lista) ? lista : [];
};

export default function ImagenesOT({ formOrden = {} }) {
  const [imagenes, setImagenes] = useState(crearEstadoVacio);
  const [dragOverSlot, setDragOverSlot] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [actualizando, setActualizando] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [imagenVista, setImagenVista] = useState(null);

  const [confirmarGuardado, setConfirmarGuardado] = useState(false);
  const [guardadoCorrecto, setGuardadoCorrecto] = useState(false);

  const [confirmarActualizacion, setConfirmarActualizacion] = useState(false);
  const [actualizacionCorrecta, setActualizacionCorrecta] = useState(false);

  const [imagenAEliminar, setImagenAEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);
  const [eliminacionCorrecta, setEliminacionCorrecta] = useState(false);

  const urlsRef = useRef(new Set());

  const idOrden = useMemo(
    () =>
      formOrden.IdOrden ??
      formOrden.Idorden ??
      formOrden.IdOT ??
      formOrden.idOrden ??
      '',
    [
      formOrden.IdOrden,
      formOrden.Idorden,
      formOrden.IdOT,
      formOrden.idOrden
    ]
  );

  const liberarUrl = useCallback((url) => {
    if (url && String(url).startsWith('blob:')) {
      URL.revokeObjectURL(url);
      urlsRef.current.delete(url);
    }
  }, []);

  const crearUrl = useCallback((blob) => {
    const url = URL.createObjectURL(blob);
    urlsRef.current.add(url);
    return url;
  }, []);

  const limpiarUrlsActuales = useCallback(() => {
    urlsRef.current.forEach((url) => {
      URL.revokeObjectURL(url);
    });

    urlsRef.current.clear();
  }, []);

  useEffect(() => {
    return () => {
      limpiarUrlsActuales();
    };
  }, [limpiarUrlsActuales]);

  const cargarImagenes = useCallback(async () => {
    limpiarUrlsActuales();
    setImagenVista(null);
    setImagenes(crearEstadoVacio());

    if (!idOrden) {
      return;
    }

    setCargando(true);

    try {
      const response = await fetch(
        `${API_URL}/api/OrdenTrabajo/Leer/${encodeURIComponent(idOrden)}`,
        {
          method: 'GET',
          headers: {
            Accept: 'application/json'
          }
        }
      );

      if (!response.ok) {
        const detalle = await response.text().catch(() => '');

        throw new Error(
          `HTTP ${response.status}${detalle ? ` - ${detalle}` : ''
          }`
        );
      }

      const respuesta = await response.json();
      const registros =
        extraerImagenesDesdeRespuesta(respuesta);

      const siguiente = crearEstadoVacio();

      /*
        La tabla actual posee:
        IdImagen, Idorden y RutaImagen.

        Como todavía no existe una columna de posición,
        ordenamos por IdImagen y ocupamos los cuatro espacios
        disponibles de izquierda a derecha.
      */
      const ordenadas = [...registros]
        .sort(
          (a, b) =>
            Number(a?.IdImagen ?? a?.idImagen ?? 0) -
            Number(b?.IdImagen ?? b?.idImagen ?? 0)
        )
        .slice(0, 4);

      ordenadas.forEach((registro, index) => {
        const ruta =
          registro?.RutaImagen ??
          registro?.rutaImagen ??
          '';

        const src = normalizarSrc(ruta);

        if (!src) {
          return;
        }

        const slot = `img${index + 1}`;

        siguiente[slot] = {
          idImagen: Number(
            registro?.IdImagen ??
            registro?.idImagen ??
            0
          ),
          src,
          blob: null,
          nombre: `OT_${idOrden}_${slot}.jpg`,
          mimeType: 'image/jpeg',
          origen: 'guardada',
          guardada: true,
          posicion: index + 1
        };
      });

      setImagenes(siguiente);
    } catch (error) {
      console.error(
        `[IMAGENES OT ${idOrden}] Error al cargar desde BD:`,
        error
      );

      alert(
        'No fue posible cargar las imágenes guardadas desde la base de datos.'
      );
    } finally {
      setCargando(false);
    }
  }, [idOrden, limpiarUrlsActuales]);

  useEffect(() => {
    cargarImagenes();
  }, [cargarImagenes]);

  const procesarArchivo = useCallback(
    (slot, file) => {
      if (!file || !file.type.startsWith('image/')) {
        alert('Selecciona solamente archivos de imagen.');
        return;
      }

      setImagenes((prev) => {
        const anterior = prev[slot];
        const idImagenExistente = Number(anterior?.idImagen || 0);

        if (anterior?.src) {
          liberarUrl(anterior.src);
        }

        const src = crearUrl(file);

        return {
          ...prev,
          [slot]: {
            idImagen: idImagenExistente,
            src,
            blob: file,
            nombre:
              file.name ||
              `OT_${idOrden || 'SIN_OT'}_${slot}.${obtenerExtension(file.type)}`,
            mimeType: file.type || 'image/jpeg',
            origen:
              idImagenExistente > 0
                ? 'actualizacion'
                : 'pendiente',
            guardada: false,
            posicion: Number(slot.replace('img', '')) || 1
          }
        };
      });
    },
    [idOrden, crearUrl, liberarUrl]
  );

  const handleFileChange = (slot, event) => {
    const file = event.target.files?.[0];

    if (file) {
      procesarArchivo(slot, file);
    }

    event.target.value = '';
  };

  const handleDrop = (slot, event) => {
    event.preventDefault();
    setDragOverSlot(null);

    const file = event.dataTransfer.files?.[0];

    if (file) {
      procesarArchivo(slot, file);
    }
  };

  const handleEliminar = (slot) => {
    const imagen = imagenes[slot];

    if (!imagen) {
      return;
    }

    setImagenAEliminar({
      slot,
      imagen
    });
  };

  const cancelarEliminarImagen = () => {
    if (!eliminando) {
      setImagenAEliminar(null);
    }
  };

  const confirmarEliminarImagen = async () => {
    if (!imagenAEliminar) {
      return;
    }

    const { slot, imagen } = imagenAEliminar;

    setEliminando(true);

    try {
      if (
        imagen.origen === 'guardada' &&
        Number(imagen.idImagen) > 0
      ) {
        const response = await fetch(
          `${API_URL}/api/OrdenTrabajo/EliminarImagen/${Number(
            imagen.idImagen
          )}`,
          {
            method: 'POST',
            headers: {
              Accept: 'application/json'
            }
          }
        );

        if (!response.ok) {
          const detalle =
            await response.text().catch(() => '');

          throw new Error(
            `HTTP ${response.status}${detalle ? ` - ${detalle}` : ''
            }`
          );
        }
      }

      liberarUrl(imagen.src);

      setImagenes((prev) => ({
        ...prev,
        [slot]: null
      }));

      if (imagenVista?.slot === slot) {
        setImagenVista(null);
      }

      setImagenAEliminar(null);

      if (
        imagen.origen === 'guardada' &&
        Number(imagen.idImagen) > 0
      ) {
        await cargarImagenes();
      }

      setEliminacionCorrecta(true);
    } catch (error) {
      console.error(
        `[IMAGENES OT ${idOrden}] Error al eliminar imagen:`,
        error
      );

      alert(
        `No fue posible eliminar la imagen: ${error.message || 'Error desconocido'
        }`
      );
    } finally {
      setEliminando(false);
    }
  };

  const handleGuardarImagenes = async () => {
    if (!idOrden) {
      alert('Primero debes buscar o seleccionar una OT.');
      return;
    }

    const pendientes = Object.entries(imagenes).filter(
      ([, imagen]) =>
        imagen?.blob &&
        imagen.origen === 'pendiente' &&
        Number(imagen.idImagen || 0) <= 0
    );

    if (pendientes.length === 0) {
      alert(
        'No hay imágenes nuevas para guardar.'
      );
      return;
    }

    setGuardando(true);

    try {
      for (const [slot, imagen] of pendientes) {
        const rutaImagen =
          await convertirABase64(imagen.blob);

        const payload = {
          IdImagen: 0,
          Idorden: String(idOrden),
          RutaImagen: rutaImagen
        };

        console.log(
          `[IMAGENES OT ${idOrden}] Guardando ${slot}:`,
          {
            Idorden: payload.Idorden,
            RutaImagen:
              `[${payload.RutaImagen.length} caracteres]`
          }
        );

        const response = await fetch(
          `${API_URL}/api/OrdenTrabajo/CrearImagenesOrdenTrabajoAsync`,
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
          const detalle =
            await response.text().catch(() => '');

          throw new Error(
            `HTTP ${response.status}${detalle ? ` - ${detalle}` : ''
            }`
          );
        }
      }

      /*
        Una vez guardadas, volvemos a consultar la OT.
        Así la pantalla se actualiza usando solamente información
        recuperada desde la BD.
      */
      await cargarImagenes();

      setGuardadoCorrecto(true);
    } catch (error) {
      console.error(
        `[IMAGENES OT ${idOrden}] Error al guardar en BD:`,
        error
      );

      alert(
        `No fue posible guardar las imágenes en la base de datos: ${error.message || 'Error desconocido'
        }`
      );
    } finally {
      setGuardando(false);
    }
  };

  // El botón Guardar abre primero la confirmación.
  const solicitarGuardarImagenes = () => {
    if (!idOrden) {
      alert('Primero debes buscar o seleccionar una OT.');
      return;
    }

    const hayImagenesPendientes =
      Object.values(imagenes).some(
        (imagen) =>
          imagen?.blob &&
          imagen.origen === 'pendiente'
      );

    if (!hayImagenesPendientes) {
      alert(
        'No hay imágenes nuevas para guardar.'
      );
      return;
    }

    setConfirmarGuardado(true);
  };

  const confirmarGuardarImagenes = async () => {
    setConfirmarGuardado(false);
    await handleGuardarImagenes();
  };

  const handleActualizarImagenes = async () => {
    if (!idOrden) {
      alert('Primero debes buscar o seleccionar una OT.');
      return;
    }

    const actualizaciones = Object.entries(imagenes).filter(
      ([, imagen]) =>
        imagen?.blob &&
        imagen.origen === 'actualizacion' &&
        Number(imagen.idImagen || 0) > 0
    );

    if (actualizaciones.length === 0) {
      alert('No hay imágenes seleccionadas para actualizar.');
      return;
    }

    setActualizando(true);

    try {
      for (const [slot, imagen] of actualizaciones) {
        const rutaImagen =
          await convertirABase64(imagen.blob);

        const payload = {
          IdImagen: Number(imagen.idImagen),
          Idorden: String(idOrden),
          RutaImagen: rutaImagen
        };

        console.log(
          `[IMAGENES OT ${idOrden}] Actualizando ${slot}:`,
          {
            IdImagen: payload.IdImagen,
            Idorden: payload.Idorden,
            RutaImagen:
              `[${payload.RutaImagen.length} caracteres]`
          }
        );

        const response = await fetch(
          `${API_URL}/api/OrdenTrabajo/ActualizarImagen`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'text/plain',
              Accept: 'application/json'
            },
            body: JSON.stringify(payload)
          }
        );

        if (!response.ok) {
          const detalle =
            await response.text().catch(() => '');

          throw new Error(
            `HTTP ${response.status}${detalle ? ` - ${detalle}` : ''
            }`
          );
        }
      }

      await cargarImagenes();
      setActualizacionCorrecta(true);
    } catch (error) {
      console.error(
        `[IMAGENES OT ${idOrden}] Error al actualizar imagen:`,
        error
      );

      alert(
        `No fue posible actualizar la imagen: ${error.message || 'Error desconocido'
        }`
      );
    } finally {
      setActualizando(false);
    }
  };

  const solicitarActualizarImagenes = () => {
    if (!idOrden) {
      alert('Primero debes buscar o seleccionar una OT.');
      return;
    }

    const hayActualizaciones =
      Object.values(imagenes).some(
        (imagen) =>
          imagen?.blob &&
          imagen.origen === 'actualizacion' &&
          Number(imagen.idImagen || 0) > 0
      );

    if (!hayActualizaciones) {
      alert(
        'Primero selecciona una imagen guardada con el botón de la nube para reemplazarla.'
      );
      return;
    }

    setConfirmarActualizacion(true);
  };

  const confirmarActualizarImagenes = async () => {
    setConfirmarActualizacion(false);
    await handleActualizarImagenes();
  };


  const handleDescargar = (slot) => {
    const imagen = imagenes[slot];

    if (!imagen?.src && !imagen?.blob) {
      return;
    }

    const enlace = document.createElement('a');

    let urlTemporal = null;

    if (imagen.blob) {
      urlTemporal =
        URL.createObjectURL(imagen.blob);

      enlace.href = urlTemporal;
    } else {
      enlace.href = imagen.src;
    }

    enlace.download =
      imagen.nombre ||
      `OT_${idOrden || 'SIN_OT'}_${slot}.${obtenerExtension(
        imagen.mimeType
      )}`;

    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();

    if (urlTemporal) {
      setTimeout(() => {
        URL.revokeObjectURL(urlTemporal);
      }, 0);
    }
  };

  const renderSlot = (titulo, slot) => {
    const imagen = imagenes[slot];
    const tieneImagen = Boolean(imagen?.src);
    const estaGuardada = imagen?.origen === 'guardada';
    const estaActualizando = imagen?.origen === 'actualizacion';
    const arrastrando = dragOverSlot === slot;

    return (
      <Box sx={{ minWidth: 0, width: '100%' }}>
        <Paper
          variant="outlined"
          onDragOver={(event) => {
            event.preventDefault();
            setDragOverSlot(slot);
          }}
          onDragLeave={() => setDragOverSlot(null)}
          onDrop={(event) => handleDrop(slot, event)}
          sx={{
            width: '100%',
            aspectRatio: '4 / 3',
            minHeight: 0,
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: 2,
            backgroundColor: tieneImagen
              ? '#f3f6f8'
              : arrastrando
                ? '#e3f2fd'
                : '#fcfcfc',
            border: tieneImagen
              ? '1px solid #b8c4cf'
              : arrastrando
                ? '2px dashed #1976d2'
                : '2px dashed #b0bec5',
            boxShadow: tieneImagen
              ? '0 2px 8px rgba(15, 23, 42, 0.06)'
              : 'none'
          }}
        >
          {tieneImagen ? (
            <Box
              sx={{
                width: '100%',
                height: '100%',
                position: 'relative'
              }}
            >
              <img
                src={imagen.src}
                alt={titulo}
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'block',
                  objectFit: 'cover',
                  objectPosition: 'center'
                }}
              />

              <Box
                sx={{
                  position: 'absolute',
                  top: 7,
                  right: 7,
                  display: 'flex',
                  gap: 0.5,
                  p: 0.3,
                  borderRadius: 1,
                  backgroundColor: 'rgba(255,255,255,0.94)',
                  boxShadow: 1
                }}
              >
                <Tooltip title="Ver imagen">
                  <IconButton
                    size="small"
                    onClick={() =>
                      setImagenVista({
                        ...imagen,
                        slot,
                        titulo
                      })
                    }
                  >
                    <Visibility fontSize="small" />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Descargar imagen">
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={() => handleDescargar(slot)}
                  >
                    <Download fontSize="small" />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Cambiar imagen">
                  <IconButton
                    component="label"
                    size="small"
                    color="primary"
                  >
                    <CloudUpload fontSize="small" />
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(event) =>
                        handleFileChange(slot, event)
                      }
                    />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Eliminar imagen">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleEliminar(slot)}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>

              <Typography
                variant="caption"
                sx={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  py: 0.5,
                  textAlign: 'center',
                  color: 'white',
                  fontWeight: 'bold',
                  backgroundColor: estaGuardada
                    ? 'rgba(46,125,50,0.9)'
                    : estaActualizando
                      ? 'rgba(237,108,2,0.92)'
                      : 'rgba(0,112,210,0.88)'
                }}
              >
                {titulo} — {
                  estaGuardada
                    ? 'Guardada'
                    : estaActualizando
                      ? 'Pendiente de actualizar'
                      : 'Pendiente de guardar'
                }
              </Typography>
            </Box>
          ) : (
            <Button
              component="label"
              sx={{
                width: '100%',
                height: '100%',
                flexDirection: 'column',
                textTransform: 'none',
                color: arrastrando ? '#1976d2' : '#546e7a'
              }}
            >
              <CloudUpload
                sx={{
                  fontSize: 40,
                  color: '#0070d2',
                  mb: 1
                }}
              />

              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 'bold',
                  color: '#37474f'
                }}
              >
                {arrastrando ? '¡Suéltala aquí!' : titulo}
              </Typography>

              <Typography
                variant="caption"
                color="textSecondary"
              >
                Haz clic para buscar o arrastra la imagen aquí
              </Typography>

              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(event) =>
                  handleFileChange(slot, event)
                }
              />
            </Button>
          )}
        </Paper>
      </Box>
    );
  };

  const hayNuevas = Object.values(imagenes).some(
    (imagen) =>
      imagen?.blob &&
      imagen.origen === 'pendiente' &&
      Number(imagen.idImagen || 0) <= 0
  );

  const hayActualizaciones = Object.values(imagenes).some(
    (imagen) =>
      imagen?.blob &&
      imagen.origen === 'actualizacion' &&
      Number(imagen.idImagen || 0) > 0
  );

  return (
    <>
      <Box
        sx={{
          backgroundColor: '#f0f0f0',
          p: 2,
          borderRadius: 1,
          border: '1px solid #b0b0b0'
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
            mb: 2,
            pb: 1,
            borderBottom: '1px solid #b8b8b8'
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}
          >
            <PhotoLibrary sx={{ color: '#0070d2' }} />

            <Typography
              variant="subtitle1"
              sx={{
                color: '#005cb2',
                fontWeight: 'bold'
              }}
            >
              Registro Fotográfico del Equipo — OT N° {idOrden || 'S/N'}
            </Typography>
          </Box>

          <Button
            startIcon={
              cargando
                ? <CircularProgress size={15} />
                : <Refresh />
            }
            size="small"
            variant="outlined"
            disabled={!idOrden || cargando}
            onClick={cargarImagenes}
            sx={{
              textTransform: 'none',
              fontSize: '11px'
            }}
          >
            Recargar
          </Button>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, minmax(0, 1fr))',
              md: 'repeat(4, minmax(0, 1fr))'
            },
            gap: 2,
            width: '100%',
            alignItems: 'stretch'
          }}
        >
          {renderSlot('Imagen 1', 'img1')}
          {renderSlot('Imagen 2', 'img2')}
          {renderSlot('Imagen 3', 'img3')}
          {renderSlot('Imagen 4', 'img4')}
        </Box>

        <Box
          sx={{
            mt: 2.5,
            pt: 1.5,
            borderTop: '1px solid #b8b8b8',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 1.25,
            flexWrap: 'wrap'
          }}
        >
          <Button
            startIcon={
              guardando
                ? <CircularProgress size={16} />
                : <Save />
            }
            variant="contained"
            size="small"
            disabled={!hayNuevas || guardando || actualizando || !idOrden}
            onClick={solicitarGuardarImagenes}
            sx={{
              backgroundColor: '#e0e0e0',
              color: 'black',
              border: '1px solid #999',
              textTransform: 'none',
              fontSize: '11px',
              fontWeight: 'bold',
              minWidth: 125,
              '&:hover': {
                backgroundColor: '#d5d5d5'
              }
            }}
          >
            {guardando ? 'Guardando...' : 'Guardar Imagen'}
          </Button>

          <Button
            startIcon={
              actualizando
                ? <CircularProgress size={16} />
                : <Refresh />
            }
            variant="contained"
            size="small"
            disabled={!hayActualizaciones || actualizando || guardando || !idOrden}
            onClick={solicitarActualizarImagenes}
            sx={{
              backgroundColor: '#1976d2',
              color: '#ffffff',
              border: '1px solid #1565c0',
              textTransform: 'none',
              fontSize: '11px',
              fontWeight: 'bold',
              minWidth: 135,
              '&:hover': {
                backgroundColor: '#1565c0'
              }
            }}
          >
            {actualizando ? 'Actualizando...' : 'Actualizar Imagen'}
          </Button>
        </Box>
      </Box>

      <Dialog
        open={confirmarActualizacion}
        onClose={() => {
          if (!actualizando) {
            setConfirmarActualizacion(false);
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
              lineHeight: 1.6
            }}
          >
            ¿Está seguro que desea actualizar la imagen seleccionada?
          </Typography>

          <Typography
            sx={{
              mt: 1,
              fontSize: '11px',
              color: '#607d8b'
            }}
          >
            La imagen anterior será reemplazada en la O.T. N° {idOrden}.
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
            size="small"
            disabled={actualizando}
            onClick={confirmarActualizarImagenes}
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
            disabled={actualizando}
            onClick={() => setConfirmarActualizacion(false)}
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
        open={actualizacionCorrecta}
        onClose={() => setActualizacionCorrecta(false)}
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
          Imagen actualizada
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
              fontWeight: 600
            }}
          >
            La imagen se ha actualizado correctamente.
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
            onClick={() => setActualizacionCorrecta(false)}
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
        open={Boolean(imagenAEliminar)}
        onClose={cancelarEliminarImagen}
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
            backgroundColor: '#d32f2f',
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: 700,
            py: 1,
            px: 2
          }}
        >
          Eliminar imagen
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
              lineHeight: 1.6
            }}
          >
            ¿Desea realmente borrar la imagen?
          </Typography>

          <Typography
            sx={{
              mt: 1,
              fontSize: '11px',
              color: '#607d8b'
            }}
          >
            Esta acción eliminará la imagen de la O.T. N° {idOrden}.
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
            disabled={eliminando}
            onClick={confirmarEliminarImagen}
            sx={{
              minWidth: 105,
              textTransform: 'none',
              fontWeight: 700
            }}
          >
            {eliminando ? 'Eliminando...' : 'Confirmar'}
          </Button>

          <Button
            variant="outlined"
            size="small"
            disabled={eliminando}
            onClick={cancelarEliminarImagen}
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
        open={eliminacionCorrecta}
        onClose={() => setEliminacionCorrecta(false)}
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
          Imagen eliminada
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
              fontWeight: 600
            }}
          >
            La imagen se ha eliminado correctamente.
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
            onClick={() => setEliminacionCorrecta(false)}
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

      {/* =========================================================
          CONFIRMACIÓN ANTES DE GUARDAR IMÁGENES
          ========================================================= */}
      <Dialog
        open={confirmarGuardado}
        onClose={() => {
          if (!guardando) {
            setConfirmarGuardado(false);
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
          Confirmar guardado
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
              lineHeight: 1.6,
              textAlign: 'center'
            }}
          >
            ¿Está seguro que desea guardar la imagen?
          </Typography>

          <Typography
            sx={{
              mt: 1,
              fontSize: '11px',
              color: '#607d8b',
              textAlign: 'center'
            }}
          >
            La imagen quedará asociada a la O.T. N° {idOrden}.
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
            size="small"
            disabled={guardando}
            onClick={confirmarGuardarImagenes}
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
            disabled={guardando}
            onClick={() =>
              setConfirmarGuardado(false)
            }
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

      {/* =========================================================
          ALERTA DESPUÉS DE GUARDAR CORRECTAMENTE
          ========================================================= */}
      <Dialog
        open={guardadoCorrecto}
        onClose={() => setGuardadoCorrecto(false)}
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
          Imagen guardada
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
              lineHeight: 1.6
            }}
          >
            La imagen se ha guardado correctamente en la base de datos.
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
              setGuardadoCorrecto(false)
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
        open={Boolean(imagenVista)}
        onClose={() => setImagenVista(null)}
        maxWidth="lg"
        fullWidth
      >
        <DialogContent
          sx={{
            minHeight: { xs: 300, sm: 420 },
            p: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#111',
            overflow: 'auto'
          }}
        >
          {imagenVista?.src && (
            <img
              src={imagenVista.src}
              alt={imagenVista.titulo || 'Imagen OT'}
              style={{
                width: 'auto',
                height: 'auto',
                maxWidth: '100%',
                maxHeight: '82vh',
                display: 'block',
                objectFit: 'contain'
              }}
            />
          )}
        </DialogContent>

        <DialogActions>
          {imagenVista?.slot && (
            <Button
              startIcon={<Download />}
              onClick={() =>
                handleDescargar(imagenVista.slot)
              }
            >
              Descargar
            </Button>
          )}

          <Button onClick={() => setImagenVista(null)}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

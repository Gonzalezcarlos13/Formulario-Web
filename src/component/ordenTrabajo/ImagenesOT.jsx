import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Grid,
  Typography,
  Button,
  Paper,
  IconButton,
  CircularProgress,
  Dialog,
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

const DB_NAME = 'OrdenTrabajoImagenesVisual';
const DB_VERSION = 1;
const STORE_NAME = 'imagenes';

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

const abrirDB = () =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: 'key'
        });

        store.createIndex('idOrden', 'idOrden', {
          unique: false
        });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const guardarRegistro = async (registro) => {
  const db = await abrirDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    store.put(registro);

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      const error = transaction.error;
      db.close();
      reject(error);
    };
  });
};

const eliminarRegistro = async (key) => {
  const db = await abrirDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    store.delete(key);

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      const error = transaction.error;
      db.close();
      reject(error);
    };
  });
};

const leerRegistrosPorOrden = async (idOrden) => {
  const db = await abrirDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('idOrden');
    const request = index.getAll(String(idOrden));

    request.onsuccess = () => {
      const resultado = request.result || [];
      db.close();
      resolve(resultado);
    };

    request.onerror = () => {
      const error = request.error;
      db.close();
      reject(error);
    };
  });
};

export default function ImagenesOT({ formOrden = {} }) {
  const [imagenes, setImagenes] = useState(crearEstadoVacio);
  const [dragOverSlot, setDragOverSlot] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [imagenVista, setImagenVista] = useState(null);
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
      const registros = await leerRegistrosPorOrden(idOrden);
      const siguiente = crearEstadoVacio();

      registros.forEach((registro) => {
        if (!registro?.slot || !registro?.blob) {
          return;
        }

        if (!Object.prototype.hasOwnProperty.call(siguiente, registro.slot)) {
          return;
        }

        siguiente[registro.slot] = {
          src: crearUrl(registro.blob),
          blob: registro.blob,
          nombre: registro.nombre,
          mimeType: registro.mimeType,
          origen: 'guardada',
          guardada: true,
          posicion: registro.posicion
        };
      });

      setImagenes(siguiente);
    } catch (error) {
      console.error('Error al cargar imágenes:', error);
      alert('No fue posible cargar las imágenes guardadas.');
    } finally {
      setCargando(false);
    }
  }, [idOrden, crearUrl, limpiarUrlsActuales]);

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

        if (anterior?.src) {
          liberarUrl(anterior.src);
        }

        const src = crearUrl(file);

        return {
          ...prev,
          [slot]: {
            src,
            blob: file,
            nombre:
              file.name ||
              `OT_${idOrden || 'SIN_OT'}_${slot}.${obtenerExtension(file.type)}`,
            mimeType: file.type || 'image/jpeg',
            origen: 'pendiente',
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

  const handleEliminar = async (slot) => {
    const imagen = imagenes[slot];

    if (!imagen) {
      return;
    }

    try {
      if (imagen.origen === 'guardada' && idOrden) {
        await eliminarRegistro(`${idOrden}_${slot}`);
      }

      liberarUrl(imagen.src);

      setImagenes((prev) => ({
        ...prev,
        [slot]: null
      }));

      if (imagenVista?.slot === slot) {
        setImagenVista(null);
      }
    } catch (error) {
      console.error('Error al eliminar imagen:', error);
      alert('No fue posible eliminar la imagen.');
    }
  };

  const handleGuardarImagenes = async () => {
    if (!idOrden) {
      alert('Primero debes buscar o seleccionar una OT.');
      return;
    }

    const pendientes = Object.entries(imagenes).filter(
      ([, imagen]) => imagen?.blob && imagen.origen === 'pendiente'
    );

    if (pendientes.length === 0) {
      alert('No hay imágenes nuevas o modificadas para guardar.');
      return;
    }

    setGuardando(true);

    try {
      for (const [slot, imagen] of pendientes) {
        await guardarRegistro({
          key: `${idOrden}_${slot}`,
          idOrden: String(idOrden),
          slot,
          posicion: Number(slot.replace('img', '')) || 1,
          nombre:
            imagen.nombre ||
            `OT_${idOrden}_${slot}.${obtenerExtension(imagen.mimeType)}`,
          mimeType: imagen.mimeType || 'image/jpeg',
          blob: imagen.blob,
          actualizadoEn: new Date().toISOString()
        });
      }

      await cargarImagenes();
      alert('Imágenes guardadas y actualizadas correctamente.');
    } catch (error) {
      console.error('Error al guardar imágenes:', error);
      alert('No fue posible guardar las imágenes.');
    } finally {
      setGuardando(false);
    }
  };

  const handleDescargar = (slot) => {
    const imagen = imagenes[slot];

    if (!imagen?.blob) {
      return;
    }

    const url = URL.createObjectURL(imagen.blob);
    const enlace = document.createElement('a');

    enlace.href = url;
    enlace.download =
      imagen.nombre ||
      `OT_${idOrden || 'SIN_OT'}_${slot}.${obtenerExtension(
        imagen.mimeType
      )}`;

    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 0);
  };

  const renderSlot = (titulo, slot) => {
    const imagen = imagenes[slot];
    const tieneImagen = Boolean(imagen?.src);
    const estaGuardada = imagen?.origen === 'guardada';
    const arrastrando = dragOverSlot === slot;

    return (
      <Grid item xs={12} sm={6} md={3}>
        <Paper
          variant="outlined"
          onDragOver={(event) => {
            event.preventDefault();
            setDragOverSlot(slot);
          }}
          onDragLeave={() => setDragOverSlot(null)}
          onDrop={(event) => handleDrop(slot, event)}
          sx={{
            height: 220,
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: 2,
            backgroundColor: tieneImagen
              ? '#fafafa'
              : arrastrando
                ? '#e3f2fd'
                : '#fcfcfc',
            border: tieneImagen
              ? '1px solid #b8b8b8'
              : arrastrando
                ? '2px dashed #1976d2'
                : '2px dashed #b0bec5'
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
                  objectFit: 'contain'
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
                    : 'rgba(0,112,210,0.88)'
                }}
              >
                {titulo} — {estaGuardada ? 'Guardada' : 'Pendiente'}
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
      </Grid>
    );
  };

  const hayPendientes = Object.values(imagenes).some(
    (imagen) => imagen?.blob && imagen.origen === 'pendiente'
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

        <Grid container spacing={2}>
          {renderSlot('Imagen 1', 'img1')}
          {renderSlot('Imagen 2', 'img2')}
          {renderSlot('Imagen 3', 'img3')}
          {renderSlot('Imagen 4', 'img4')}
        </Grid>

        <Box
          sx={{
            mt: 2.5,
            pt: 1.5,
            borderTop: '1px solid #b8b8b8'
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
            disabled={!hayPendientes || guardando || !idOrden}
            onClick={handleGuardarImagenes}
            sx={{
              backgroundColor: '#e0e0e0',
              color: 'black',
              border: '1px solid #999',
              textTransform: 'none',
              fontSize: '11px',
              fontWeight: 'bold',
              '&:hover': {
                backgroundColor: '#d5d5d5'
              }
            }}
          >
            {guardando ? 'Guardando...' : 'Guardar / Actualizar Imágenes'}
          </Button>
        </Box>
      </Box>

      <Dialog
        open={Boolean(imagenVista)}
        onClose={() => setImagenVista(null)}
        maxWidth="lg"
        fullWidth
      >
        <DialogContent
          sx={{
            minHeight: 400,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#111'
          }}
        >
          {imagenVista?.src && (
            <img
              src={imagenVista.src}
              alt={imagenVista.titulo || 'Imagen OT'}
              style={{
                maxWidth: '100%',
                maxHeight: '75vh',
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

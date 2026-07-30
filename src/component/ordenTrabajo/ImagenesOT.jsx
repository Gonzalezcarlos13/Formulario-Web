import React, { useState } from 'react';
import { Box, Grid, Typography, Button, Paper, IconButton } from '@mui/material';
import { CloudUpload, Delete, Save, PhotoLibrary } from '@mui/icons-material';

export default function ImagenesOT({ formOrden = {} }) {
  const [imagenes, setImagenes] = useState({
    img1: null,
    img2: null,
    img3: null,
    img4: null,
  });

  const [dragOverSlot, setDragOverSlot] = useState(null);

  const convertirABase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };


  const procesarArchivo = async (slot, file) => {
    if (!file || !file.type.startsWith('image/')) {
      alert("Por favor, selecciona o arrastra solo archivos de imagen.");
      return;
    }
    try {
      const base64String = await convertirABase64(file);
      setImagenes((prev) => ({ ...prev, [slot]: base64String }));
      console.log(`Imagen asignada a ${slot} correctamente en formato Base64.`);
    } catch (error) {
      console.error("Error al transformar la imagen a Base64:", error);
      alert("Ocurrió un error al procesar la imagen.");
    }
  };


  const handleFileChange = (slot, event) => {
    const file = event.target.files[0];
    procesarArchivo(slot, file);
  };

  const handleDragOver = (slot, event) => {
    event.preventDefault(); 
    setDragOverSlot(slot); 
  };

  const handleDragLeave = () => {
    setDragOverSlot(null);  // Quita la iluminación si el usuario se arrepiente
  };

  const handleDrop = (slot, event) => {
    event.preventDefault();
    setDragOverSlot(null);  // Resetea el estado visual

    const file = event.dataTransfer.files[0]; // Captura el archivo arrastrado
    procesarArchivo(slot, file);
  };

  const handleRemoveImage = (slot) => {
    setImagenes((prev) => ({ ...prev, [slot]: null }));
  };

  const handleGuardarIndividual = () => {
    console.log("Datos de imágenes listos para ir a la API:", imagenes);
    alert("Imágenes procesadas. Estarán asociadas al presionar 'Grabar' en la vista principal.");
  };

  const renderUploadSlot = (slotLabel, slotKey) => {
    const hasImage = !!imagenes[slotKey];
    const isDraggingOver = dragOverSlot === slotKey;

    return (
      <Grid item xs={12} sm={6}>
        <Paper
          variant="outlined"
          onDragOver={(e) => handleDragOver(slotKey, e)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(slotKey, e)}
          sx={{
            height: '220px',
            backgroundColor: hasImage ? '#fafafa' : (isDraggingOver ? '#e3f2fd' : '#fcfcfc'),
            border: hasImage ? '1px solid #b8b8b8' : (isDraggingOver ? '2px dashed #1976d2' : '2px dashed #b0bec5'),
            borderRadius: 2,
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'hidden',
            transition: 'all 0.2s ease',
            transform: isDraggingOver ? 'scale(1.01)' : 'scale(1)', // Efecto sutil de pulsado al arrastrar
            '&:hover': {
              borderColor: '#0070d2',
              backgroundColor: hasImage ? '#fafafa' : '#f5f9ff',
            },
          }}
        >
          {hasImage ? (
            <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
              <img
                src={imagenes[slotKey]}
                alt={slotLabel}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  borderRadius: 1,
                  boxShadow: 1,
                }}
              >
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleRemoveImage(slotKey)}
                >
                  <Delete fontSize="small" />
                </IconButton>
              </Box>
              <Typography
                variant="caption"
                sx={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  backgroundColor: 'rgba(0, 112, 210, 0.85)',
                  color: 'white',
                  textAlign: 'center',
                  py: 0.5,
                  fontWeight: 'bold',
                }}
              >
                {slotLabel} (Base64 OK)
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
                color: isDraggingOver ? '#1976d2' : '#546e7a',
              }}
            >
              <CloudUpload sx={{ fontSize: 40, color: isDraggingOver ? '#1976d2' : '#0070d2', mb: 1 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#37474f' }}>
                {isDraggingOver ? "¡Suéltala aquí!" : slotLabel}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Haz clic para buscar o arrastra la imagen aquí
              </Typography>
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => handleFileChange(slotKey, e)}
              />
            </Button>
          )}
        </Paper>
      </Grid>
    );
  };

  return (
    <Box sx={{ backgroundColor: '#f0f0f0', p: 2, borderRadius: 1, border: '1px solid #b0b0b0' }}>
      
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, pb: 1, borderBottom: '1px solid #b8b8b8' }}>
        <PhotoLibrary sx={{ color: '#0070d2' }} />
        <Typography variant="subtitle1" sx={{ color: '#005cb2', fontWeight: 'bold' }}>
          Registro Fotográfico del Equipo — OT N° {formOrden.IdOrden || 'S/N'}
        </Typography>
      </Box>

      <Grid container spacing={2}>
        {renderUploadSlot('Imagen 1', 'img1')}
        {renderUploadSlot('Imagen 2 ', 'img2')}
        {renderUploadSlot('Imagen 3', 'img3')}
        {renderUploadSlot('Imagen 4', 'img4')}
      </Grid>

      <Box display="flex" justifyContent="flex-start" gap={1} sx={{ mt: 2.5, pt: 1.5, borderTop: '1px solid #b8b8b8' }}>
        <Button
          startIcon={<Save />}
          variant="contained"
          size="small"
          onClick={handleGuardarIndividual}
          sx={{
            backgroundColor: '#e0e0e0',
            color: 'black',
            border: '1px solid #999',
            textTransform: 'none',
            fontSize: '11px',
            fontWeight: 'bold',
            '&:hover': { backgroundColor: '#d5d5d5' }
          }}
        >
          Guardar Imágenes
        </Button>
      </Box>

    </Box>
  );
}
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

  const handleFileChange = (slot, event) => {
    const file = event.target.files[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setImagenes((prev) => ({ ...prev, [slot]: imageUrl }));
    }
  };

  const handleRemoveImage = (slot) => {
    setImagenes((prev) => ({ ...prev, [slot]: null }));
  };

  const renderUploadSlot = (slotLabel, slotKey) => {
    const hasImage = !!imagenes[slotKey];

    return (
      <Grid item xs={12} sm={6}>
        <Paper
          variant="outlined"
          sx={{
            height: '220px',
            backgroundColor: hasImage ? '#fafafa' : '#fcfcfc',
            border: hasImage ? '1px solid #b8b8b8' : '2px dashed #b0bec5',
            borderRadius: 2,
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'hidden',
            transition: 'all 0.3s ease',
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
                {slotLabel}
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
                color: '#546e7a',
              }}
            >
              <CloudUpload sx={{ fontSize: 40, color: '#0070d2', mb: 1 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#37474f' }}>
                {slotLabel}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Haz clic para buscar imagen
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
        {renderUploadSlot('Imagen Frontal / General', 'img1')}
        {renderUploadSlot('Imagen de Detalle / Falla', 'img2')}
        {renderUploadSlot('Imagen de Componentes', 'img3')}
        {renderUploadSlot('Imagen de Salida / Entrega', 'img4')}
      </Grid>

      <Box display="flex" justifyContent="flex-start" gap={1} sx={{ mt: 2.5, pt: 1.5, borderTop: '1px solid #b8b8b8' }}>
        <Button
          startIcon={<Save />}
          variant="contained"
          size="small"
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
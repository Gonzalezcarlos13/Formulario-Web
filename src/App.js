import React from 'react';
import './App.css';
// Importamos la página contenedora que creamos en la carpeta page
import OrdenTrabajoPage from './page/OrdenTrabajoPage'; 

function App() {
  return (
    <div className="App">
      {/* Llamamos a la página para que se renderice en la web */}
      <OrdenTrabajoPage />
    </div>
  );
}

export default App;
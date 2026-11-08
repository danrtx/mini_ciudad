import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ControlsList } from '../components/ui/ControlsList';

export function AboutPage() {
  return (
    <main className="about-page">
      <section className="panel about-panel">
        <Link className="link-subtle" to="/">
          <ArrowLeft size={14} aria-hidden /> Volver a la ciudad
        </Link>
        <h1>Acerca de Villa Pastel</h1>
        <p>
          Proyecto final del curso <strong>Programación de Entornos Multimedia</strong>. Mini ciudad 3D interactiva hecha
          con React, Three.js (React Three Fiber) y modelos LOW-POLY exportados desde Blender en formato GLB.
        </p>
        <h2>Controles</h2>
        <ControlsList />
        <h2>Tecnologías</h2>
        <p>React · TypeScript · Vite · Three.js · React Three Fiber · Drei · Rapier · Zustand · React Router · Lucide · Blender</p>
      </section>
    </main>
  );
}

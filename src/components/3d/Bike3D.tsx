import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sparkles } from '@react-three/drei';
import * as THREE from 'three';

/* ─── Rueda cromada ─── */
function Wheel({ pos, r = 0.82 }: { pos: [number,number,number]; r?: number }) {
  const spin = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (spin.current) spin.current.rotation.z = clock.elapsedTime * 1.2;
  });
  return (
    <group position={pos} rotation={[Math.PI / 2, 0, 0]}>
      {/* Cubierta */}
      <mesh>
        <torusGeometry args={[r, 0.12, 20, 100]} />
        <meshStandardMaterial color="#111" roughness={0.9} metalness={0.2} />
      </mesh>
      {/* Aro exterior */}
      <mesh>
        <torusGeometry args={[r * 0.87, 0.052, 14, 100]} />
        <meshStandardMaterial color="#d0d0d0" metalness={1} roughness={0.04} />
      </mesh>
      {/* Aro interior */}
      <mesh>
        <torusGeometry args={[r * 0.62, 0.032, 10, 80]} />
        <meshStandardMaterial color="#aaa" metalness={1} roughness={0.08} />
      </mesh>
      {/* Radios giratorizos */}
      <group ref={spin}>
        {Array.from({ length: 6 }, (_, i) => {
          const a = (i / 6) * Math.PI * 2;
          const mid = r * 0.745;
          return (
            <mesh key={i} position={[Math.sin(a) * mid * 0.5, Math.cos(a) * mid * 0.5, 0]} rotation={[0, 0, -a]}>
              <cylinderGeometry args={[0.022, 0.016, mid, 4]} />
              <meshStandardMaterial color="#ccc" metalness={1} roughness={0.05} />
            </mesh>
          );
        })}
      </group>
      {/* Buje rojo */}
      <mesh>
        <cylinderGeometry args={[0.18, 0.18, 0.22, 18]} />
        <meshStandardMaterial color="#E11428" metalness={0.9} roughness={0.15} emissive="#E11428" emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}

/* ─── Moto completa ─── */
function Motorcycle() {
  const group = useRef<THREE.Group>(null);

  return (
    <Float speed={1.2} rotationIntensity={0.06} floatIntensity={0.18}>
      <group ref={group} rotation={[0, 0.32, 0]} position={[0, 0.18, 0]}>

        {/* Rueda delantera */}
        <Wheel pos={[-1.52, -0.36, 0]} />

        {/* Rueda trasera */}
        <Wheel pos={[1.28, -0.36, 0]} />

        {/* ─ Horquilla delantera ─ */}
        {([-0.10, 0.10] as number[]).map((z, i) => (
          <mesh key={i} position={[-1.38, 0.14, z]} rotation={[0, 0, Math.PI * 0.14]}>
            <cylinderGeometry args={[0.032, 0.032, 0.92, 8]} />
            <meshStandardMaterial color="#bbb" metalness={1} roughness={0.06} />
          </mesh>
        ))}

        {/* Tija / cabeza de dirección */}
        <mesh position={[-1.10, 0.58, 0]}>
          <cylinderGeometry args={[0.052, 0.052, 0.28, 10]} />
          <meshStandardMaterial color="#ccc" metalness={0.9} roughness={0.1} />
        </mesh>

        {/* Manillar */}
        <mesh position={[-1.10, 0.72, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.030, 0.030, 0.58, 8]} />
          <meshStandardMaterial color="#bbb" metalness={1} roughness={0.05} />
        </mesh>
        {/* Puños */}
        {([-0.29, 0.29] as number[]).map((z, i) => (
          <mesh key={i} position={[-1.10, 0.72, z]}>
            <cylinderGeometry args={[0.042, 0.042, 0.08, 8]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.8} metalness={0.2} />
          </mesh>
        ))}

        {/* Faro */}
        <mesh position={[-1.78, 0.24, 0]}>
          <cylinderGeometry args={[0.18, 0.16, 0.11, 20]} rotation-x={Math.PI / 2} />
          <meshStandardMaterial color="#fff" emissive="#ffffaa" emissiveIntensity={0.6} metalness={0.6} roughness={0.2} />
        </mesh>
        <mesh position={[-1.79, 0.24, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.13, 20]} />
          <meshStandardMaterial color="#fff" emissive="#ffeeaa" emissiveIntensity={1.2} />
        </mesh>

        {/* Chasis (frame) — tubo principal diagonal */}
        <mesh position={[-0.20, 0.32, 0]} rotation={[0, 0, Math.PI * 0.11]}>
          <cylinderGeometry args={[0.044, 0.036, 1.60, 8]} />
          <meshStandardMaterial color="#222" metalness={0.7} roughness={0.35} />
        </mesh>

        {/* Subchasis trasero */}
        <mesh position={[0.82, 0.15, 0]} rotation={[0, 0, -Math.PI * 0.08]}>
          <cylinderGeometry args={[0.028, 0.022, 0.82, 6]} />
          <meshStandardMaterial color="#333" metalness={0.7} roughness={0.3} />
        </mesh>

        {/* Basculante */}
        <mesh position={[0.98, -0.10, 0]} rotation={[0, 0, Math.PI * 0.06]}>
          <cylinderGeometry args={[0.032, 0.028, 0.68, 6]} />
          <meshStandardMaterial color="#444" metalness={0.8} roughness={0.2} />
        </mesh>

        {/* Motor — bloque principal */}
        <mesh position={[0.05, -0.12, 0]}>
          <boxGeometry args={[0.82, 0.56, 0.42]} />
          <meshStandardMaterial color="#1c1c1c" metalness={0.65} roughness={0.4} />
        </mesh>
        {/* Tapa del motor */}
        <mesh position={[0.05, -0.12, 0.22]}>
          <boxGeometry args={[0.70, 0.44, 0.04]} />
          <meshStandardMaterial color="#2a2a2a" metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Cilindros del motor */}
        {([-0.12, 0.12] as number[]).map((x, i) => (
          <mesh key={i} position={[x, 0.18, 0]}>
            <cylinderGeometry args={[0.09, 0.09, 0.30, 10]} />
            <meshStandardMaterial color="#333" metalness={0.7} roughness={0.3} />
          </mesh>
        ))}

        {/* Cárter */}
        <mesh position={[0.05, -0.40, 0]}>
          <boxGeometry args={[0.60, 0.18, 0.36]} />
          <meshStandardMaterial color="#181818" metalness={0.6} roughness={0.5} />
        </mesh>

        {/* Tanque de combustible (ROJO) */}
        <mesh position={[-0.46, 0.52, 0]}>
          <boxGeometry args={[0.80, 0.36, 0.36]} />
          <meshStandardMaterial color="#C90F20" metalness={0.55} roughness={0.25} />
        </mesh>
        {/* Detalle cromado del tanque */}
        <mesh position={[-0.46, 0.70, 0]}>
          <boxGeometry args={[0.68, 0.05, 0.30]} />
          <meshStandardMaterial color="#999" metalness={1} roughness={0.05} />
        </mesh>

        {/* Carenado frontal superior */}
        <mesh position={[-0.90, 0.60, 0]}>
          <boxGeometry args={[0.30, 0.28, 0.30]} />
          <meshStandardMaterial color="#C90F20" metalness={0.5} roughness={0.3} />
        </mesh>

        {/* Asiento */}
        <mesh position={[0.42, 0.47, 0]}>
          <boxGeometry args={[0.60, 0.14, 0.30]} />
          <meshStandardMaterial color="#141414" roughness={0.85} metalness={0.1} />
        </mesh>
        {/* Cola / guardabarro trasero */}
        <mesh position={[0.90, 0.38, 0]}>
          <boxGeometry args={[0.36, 0.16, 0.26]} />
          <meshStandardMaterial color="#C90F20" metalness={0.5} roughness={0.3} />
        </mesh>

        {/* Piloto trasero */}
        <mesh position={[1.08, 0.32, 0]}>
          <boxGeometry args={[0.06, 0.06, 0.12]} />
          <meshStandardMaterial color="#ff2200" emissive="#ff1100" emissiveIntensity={1.5} />
        </mesh>

        {/* Escape (tubo) */}
        <mesh position={[0.44, -0.50, -0.18]} rotation={[0, 0, Math.PI * 0.035]}>
          <cylinderGeometry args={[0.048, 0.058, 1.30, 10]} />
          <meshStandardMaterial color="#ccc" metalness={1} roughness={0.07} />
        </mesh>
        {/* Silenciador */}
        <mesh position={[1.08, -0.56, -0.18]}>
          <cylinderGeometry args={[0.07, 0.055, 0.32, 10]} />
          <meshStandardMaterial color="#bbb" metalness={1} roughness={0.06} />
        </mesh>

        {/* Guardabarro delantero */}
        <mesh position={[-1.52, -0.96, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.82, 0.038, 8, 40, Math.PI * 0.62]} />
          <meshStandardMaterial color="#C90F20" metalness={0.5} roughness={0.3} />
        </mesh>

        {/* Guardabarro trasero */}
        <mesh position={[1.28, -0.96, 0]} rotation={[Math.PI / 2, 0, Math.PI]}>
          <torusGeometry args={[0.82, 0.038, 8, 40, Math.PI * 0.55]} />
          <meshStandardMaterial color="#C90F20" metalness={0.5} roughness={0.3} />
        </mesh>

        {/* Pedales / estriberas */}
        {([-0.22, 0.22] as number[]).map((z, i) => (
          <mesh key={i} position={[0.35, -0.44, z]}>
            <boxGeometry args={[0.22, 0.025, 0.06]} />
            <meshStandardMaterial color="#888" metalness={1} roughness={0.1} />
          </mesh>
        ))}

        {/* Cadena (mini tori) */}
        {Array.from({ length: 8 }, (_, i) => {
          const t = i / 8;
          const x = -0.08 + t * 1.38;
          return (
            <mesh key={i} position={[x, -0.60, -0.20]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.032, 0.010, 6, 12]} />
              <meshStandardMaterial color="#555" metalness={0.9} roughness={0.2} />
            </mesh>
          );
        })}

      </group>
    </Float>
  );
}

/* ─── Escena principal ─── */
function Scene() {
  return (
    <>
      <ambientLight intensity={0.14} />
      {/* Luz roja dramática izquierda */}
      <pointLight position={[-4, 3, 3]}  intensity={6}   color="#E11428" />
      {/* Luz blanca superior */}
      <pointLight position={[0, 6, 4]}   intensity={5}   color="#ffffff" />
      {/* Fill azulado derecha */}
      <pointLight position={[5, 1, 2]}   intensity={2.5} color="#4466CC" />
      {/* Rim light trasera */}
      <pointLight position={[3, -1, -3]} intensity={1.8} color="#E11428" />

      <Motorcycle />

      <Sparkles count={60} scale={9} size={1.3} speed={0.22} color="#E11428" opacity={0.32} />
    </>
  );
}

export default function Bike3D({ className = '' }: { className?: string }) {
  return (
    <div style={{ width: '100%', height: '100%' }} className={className}>
      <Canvas
        camera={{ position: [0.5, 0.6, 5.2], fov: 52 }}
        style={{ background: 'transparent' }}
        dpr={[1, 1.5]}
      >
        <Scene />
      </Canvas>
    </div>
  );
}

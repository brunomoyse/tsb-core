"use client";

import React, { useRef, Suspense } from 'react';
import { Canvas, useLoader, useFrame } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as THREE from 'three';
import { OrbitControls } from '@react-three/drei';

const Model = () => {
    const gltf = useLoader(GLTFLoader, '/models/manekineko/scene.gltf');

    // Load textures
    const blackBaseColor = useLoader(THREE.TextureLoader, '/models/manekineko/maneki_black_baseColor.jpeg');
    const blackMetallicRoughness = useLoader(THREE.TextureLoader, '/models/manekineko/maneki_black_metallicRoughness.png');

    // Assuming the model's mesh material is named 'manekiMaterial', you can adjust this
    const mesh = gltf.scene.children.find(child => child.isMesh && child.material.name === 'manekiMaterial');
    if (mesh) {
        mesh.material.map = blackBaseColor;
        mesh.material.metalnessMap = blackMetallicRoughness;
        mesh.material.needsUpdate = true;
    }

    const ref = useRef<THREE.Mesh>();

    // This will run on every frame, useful if your model has animations
    useFrame((state, delta) => {
        if (ref.current) {
            // If the model has animations, uncomment the next line
            // state.clock.getElapsedTime() is the time in seconds since the clock started, it can be used to control the animation mixer
            // gltf.animations.forEach(clip => state.mixers[clip.name].update(delta));
        }
    });

    return <primitive ref={ref} object={gltf.scene} />;
};

const Manekineko: React.FC = () => {
    return (
        <Canvas style={{ width: '500px', height: '500px' }}>
            <Suspense fallback={null}>
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} />
                <Model />
            </Suspense>
            <OrbitControls enablePan={false} />
        </Canvas>
    );
};

export default Manekineko;

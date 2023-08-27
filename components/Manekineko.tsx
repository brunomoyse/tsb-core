"use client";

// Manekineko.tsx
import React, { Suspense } from 'react';
import { Canvas, useLoader, useFrame } from '@react-three/fiber';
import { TextureLoader } from 'three';
import { useGLTF, useAnimations, OrbitControls } from '@react-three/drei';
import { Mesh } from 'three';

const Model = () => {
    const gltf = useGLTF("/models/manekineko/scene.gltf", true);
    const { animations } = gltf;
    const { actions, mixer } = useAnimations(animations, gltf.scene);

    // Load the textures
    const baseColorTexture = useLoader(TextureLoader, "/models/manekineko/maneki_white_baseColor.jpeg");
    const metallicRoughnessTexture = useLoader(TextureLoader, "/models/manekineko/maneki_white_metallicRoughness.png");

    // Flip the texture vertically
    baseColorTexture.flipY = false;
    metallicRoughnessTexture.flipY = false;

    // Apply the textures to the model's material (assuming a single material for simplicity)
    if (gltf && gltf.scene) {
        gltf.scene.traverse((child) => {
            if (child instanceof Mesh) {
                child.material.map = baseColorTexture;
                child.material.roughnessMap = metallicRoughnessTexture;
                child.material.metalnessMap = metallicRoughnessTexture;
                child.material.needsUpdate = true;
            }
        });
    }

    // This will run on every frame and update the animation mixer
    useFrame((state, delta) => mixer.update(delta));

    // Start the animation (assuming only one animation clip is present)
    if (actions && Object.keys(actions).length) {
        const firstActionKey = Object.keys(actions)[0];
        // @ts-ignore
        actions[firstActionKey].play();
    }

    return (
        <primitive object={gltf.scene} dispose={null} />
    );
}

const Manekineko: React.FC = () => {
    return (
        <Canvas camera={{ position: [0, 2, 5], fov: 40 }}>
            <Suspense fallback={null}>
                <ambientLight />
                <directionalLight position={[2.5, 8, 5]} intensity={1.5} />
                <Model />
            </Suspense>
            <OrbitControls enablePan={false} />
        </Canvas>
    );
}

export default Manekineko;




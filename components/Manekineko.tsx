"use client";

// Manekineko.tsx
import React, {Suspense, useEffect, useRef} from 'react';
import { Canvas, useLoader, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, useAnimations, OrbitControls } from '@react-three/drei';
import { TextureLoader, Mesh, Object3D } from 'three';
import { motion } from "framer-motion";

const CameraLogger: React.FC = () => {
    const { camera } = useThree();

    useEffect(() => {
        const handleSaveCameraState = (e: KeyboardEvent) => {
            if (e.key === "s" || e.key === "S") {
                console.log("Camera Position:", camera.position);
                console.log("Camera Rotation:", camera.rotation);
            }
        };

        window.addEventListener('keydown', handleSaveCameraState);

        return () => {
            window.removeEventListener('keydown', handleSaveCameraState);
        }
    }, [camera]);

    return null; // This component doesn't render anything visually
}

const Model = () => {
    const gltf = useGLTF("/models/manekineko/scene.gltf", true);
    const { animations } = gltf;
    const { actions, mixer } = useAnimations(animations, gltf.scene);
    const { camera } = useThree();

    // Adjust the camera position
    camera.lookAt(7, 5, -8);

    // Load the textures
    const baseColorTexture = useLoader(TextureLoader, "/models/manekineko/textures/maneki_white_baseColor.jpeg");
    const metallicRoughnessTexture = useLoader(TextureLoader, "/models/manekineko/textures/maneki_white_metallicRoughness.png");

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
                // Traverse the scene to enable shadows on all meshes
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
    }

    const desiredModelName = "white_M";  // The name of the model you want to keep visible

    // Step 1: Collect unwanted models
    let objectsToRemove: Object3D[] = [];
    gltf.scene.traverse((child) => {
        if (child.name.includes("_M") && child.name !== desiredModelName) {
            objectsToRemove.push(child);
        }
    });

    // Step 2: Remove the collected models
    objectsToRemove.forEach(object => {
        if (object.parent) object.parent.remove(object);
    });

    // This will run on every frame and update the animation mixer
    useFrame((state, delta) => mixer.update(delta));

    // Start the animation (assuming only one animation clip is present)
    if (actions && Object.keys(actions).length) {
        const firstActionKey = Object.keys(actions)[0];
        setTimeout(() => {
            // @ts-ignore
            actions[firstActionKey].play();
        }, 2850)

    }

    return (
        <primitive object={gltf.scene} dispose={null} />
    );
}

const Manekineko: React.FC = () => {

    return (
        <motion.div
            className="w-full flex flex-col items-center md:items-end justify-center"
            initial={({ x: -450 })}
            animate={{ x: 0 }}
            transition={{ ease: "easeOut", duration: 1, delay : 1.4 }}
        >
            <Canvas
                camera={{
                    position: [23.5, 10.5, 4.5],
                    fov: 25
                }}
                shadows
            >
                <CameraLogger />
                <Suspense fallback={null}>
                    <ambientLight
                        intensity={1.4}
                    />
                    <directionalLight
                        position={[0, 10, 0]}
                        intensity={2}
                        castShadow
                        // ... other shadow properties
                    />
                    <Model />
                </Suspense>
                {/*<OrbitControls enablePan={false} target={[-15, 8, 0]} />*/ }
            </Canvas>
        </motion.div>

    );
}

export default Manekineko;




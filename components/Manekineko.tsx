"use client";

// Manekineko.tsx
import React, {Suspense, useEffect, useRef, useState} from 'react';
import { Canvas, useLoader, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, useAnimations, OrbitControls } from '@react-three/drei';
import { TextureLoader, Mesh, Object3D, PlaneGeometry } from 'three';
import { motion } from "framer-motion";
import { gsap } from 'gsap';

const CameraLogger: React.FC = () => {
    const { camera } = useThree();

    const [scrollY, setScrollY] = React.useState(0);

    const initialPosition = useRef({
        x: 14.362144994873887,
        y: 10.309751143909795,
        z: 11.009304534482585
    });

    // Calculate initial angle based on initial position
    const initialAngle = Math.atan2(initialPosition.current.z + 8, initialPosition.current.x - 5.35);

    useEffect(() => {
        const handleScroll = () => {
            const scrollMax = document.documentElement.scrollHeight - window.innerHeight;
            const scrollPercent = window.scrollY / scrollMax;
            const maxAngle = 2; // pi = 90 degrees
            let angle = initialAngle + scrollPercent * Math.PI; // Calculate desired angle

            // Clamp the angle
            angle = Math.max(-maxAngle, Math.min(maxAngle, angle));

            const radius = Math.sqrt(
                (initialPosition.current.x - 5.35)**2 +
                (initialPosition.current.z + 8)**2
            );

            const desiredX = 5.35 + radius * Math.cos(angle);
            const desiredZ = -8 + radius * Math.sin(angle);

            // Interpolate the camera's position to the desired position
            gsap.to(camera.position, {
                duration: 0.5, // Adjust duration for smoother/faster transitions
                x: desiredX,
                y: initialPosition.current.y,
                z: desiredZ,
                onUpdate: () => {
                    camera.lookAt(5.35, 5, -8);
                    camera.updateProjectionMatrix();
                },
                ease: "power1.out",
            });
        };

        window.addEventListener('scroll', handleScroll);
        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, [camera]);

    // initial camera position movement
    useEffect(() => {
        gsap.to(camera.position, {
            duration: 1.3,
            x: initialPosition.current.x,
            y: initialPosition.current.y,
            z: initialPosition.current.z,
            onUpdate: () => {
                camera.lookAt(5.35, 5, -8);
                camera.updateProjectionMatrix();
            },
            ease: "power2.out",
        });
    }, [camera]);

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
    const [hasScrolled, setHasScrolled] = React.useState(false);

    // Adjust the camera position
    // camera.lookAt(5.35, 5, -8);

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

    useEffect(() => {
        const handleScroll = () => {
            setHasScrolled(true);
        };

        window.addEventListener('scroll', handleScroll);

        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    // Start the animation (assuming only one animation clip is present)
    if (hasScrolled && actions && Object.keys(actions).length) {
        const firstActionKey = Object.keys(actions)[0];
        // @ts-ignore
        actions[firstActionKey].play();
    }

    return (
        <primitive object={gltf.scene} dispose={null} />
    );
}

const canvasVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 2 } },
    exit: { opacity: 0 }
};


const Manekineko: React.FC = () => {
    return (
        <motion.div
            className="w-full flex flex-col items-center md:items-end justify-center mb-8"
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={canvasVariants}
        >
            <Canvas
                camera={{
                    //position: [23.5, 10.5, 4.5],
                    //position: [
                    //    14.362144994873887,
                    //    10.309751143909795,
                    //    11.009304534482585
                    //],
                    position: [34.362144994873887, 20.309751143909795, 21.009304534482585],
                    fov: 28
                }}
                shadows
            >
                <CameraLogger />
                <Suspense fallback={null}>
                    <ambientLight
                        intensity={0.4}
                    />
                    <directionalLight
                        color="#ffFFFF"
                        position={[10, 3, 6]}
                        intensity={1.2}
                        castShadow
                        shadow-mapSize-width={1024}
                        shadow-mapSize-height={1024}
                    />


                    <Model />

                </Suspense>
                {/*<OrbitControls enablePan={false} target={[5, 5, -8]} />*/}
            </Canvas>
        </motion.div>
    );
}

export default Manekineko;




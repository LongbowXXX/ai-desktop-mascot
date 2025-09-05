import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { VRM, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { useLoader } from '@react-three/fiber';
import { createVRMAnimationClip, VRMAnimation, VRMAnimationLoaderPlugin } from '@pixiv/three-vrm-animation';
/**
 * Custom hook to load and manage a VRM model.
 * @param {string} vrmUrl - The URL to the VRM file.
 * @param {Record<string, string>} animationUrls - An object mapping animation names to their URLs.
 * @param {function} [onLoad] - Optional callback function to be called when the VRM model is loaded.
 */
export function useVrmModel(vrmUrl: string, animationUrls: Record<string, string>, onLoad?: (vrm: VRM) => void) {
  const vrmRef = useRef<VRM | null>(null);
  const mixer = useRef<THREE.AnimationMixer | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const vrmAnimations = useRef<Record<string, VRMAnimation>>({});
  const [loadedAnimationNames, setLoadedAnimationNames] = useState(new Set<string>());

  // --- VRM Loader ---
  const gltf = useLoader(GLTFLoader, vrmUrl, loader => {
    loader.register(parser => new VRMLoaderPlugin(parser));
  });

  // --- VRMA Animation Loader ---
  const vrmaLoader = useMemo(() => {
    const loader = new GLTFLoader();
    loader.register(parser => new VRMAnimationLoaderPlugin(parser));
    return loader;
  }, []);

  // --- Load Single Animation ---
  const loadAnimation = useCallback(
    async (name: string, url: string) => {
      try {
        const animGltf = await vrmaLoader.loadAsync(url);
        const animation = animGltf.userData.vrmAnimations?.[0] as VRMAnimation | undefined;
        if (animation) {
          console.log(`Loaded ${name} VRMA animation for ${vrmUrl}:`, animation);
          vrmAnimations.current[name] = animation;
          setLoadedAnimationNames(prev => new Set(prev).add(name));
          return animation;
        } else {
          console.warn(`Animation not found in ${url}`);
          return null;
        }
      } catch (error) {
        // Keep error parameter for logging
        console.error(`Error loading ${name} animation from ${url}:`, error); // Log the error
        return null;
      }
    },
    [vrmaLoader, vrmUrl] // Include vrmUrl in dependency if needed, though loader is stable
  );
  // --- Load All Animations ---
  useEffect(() => {
    Object.entries(animationUrls).forEach(([name, url]) => {
      if (!loadedAnimationNames.has(name)) {
        loadAnimation(name, url);
      }
    });
  }, [animationUrls, loadAnimation, loadedAnimationNames]);

  useEffect(() => {
    if (gltf.userData.vrm && !vrmRef.current) {
      const vrm: VRM = gltf.userData.vrm;
      VRMUtils.rotateVRM0(vrm);
      gltf.scene.traverse(child => {
        if ((child as THREE.Mesh).isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      console.log(`VRM loaded from ${vrmUrl}:`, vrm);
      vrmRef.current = vrm;
      mixer.current = new THREE.AnimationMixer(vrm.scene); // Create mixer here
      // setIsLoaded(true); // Mark VRM as loaded (旧処理)
      setTimeout(() => {
        setIsLoaded(true); // ディレイしてロード完了とする
        if (onLoad) {
          onLoad(vrm); // Call external onLoad if provided
        }
      }, 1000);
    }
    // Cleanup
    return () => {
      if (vrmRef.current) {
        mixer.current?.stopAllAction();
        VRMUtils.deepDispose(vrmRef.current.scene);
        vrmRef.current = null;
        mixer.current = null;
        vrmAnimations.current = {};
        console.log(`Cleaned up VRM from ${vrmUrl}`);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vrmUrl]); // Add vrmUrl to dependencies

  // --- Create Animation Clip ---
  const createAnimationClipFromVRMA = useCallback(
    (animationName: string): THREE.AnimationClip | null => {
      const vrm = vrmRef.current;
      if (vrm && vrmAnimations.current[animationName]) {
        return createVRMAnimationClip(vrmAnimations.current[animationName], vrm);
      }
      return null;
    },
    [] // Depends only on refs, no need to list vrmRef here
  );

  return { gltf, vrmRef, mixer, isLoaded, loadedAnimationNames, createAnimationClipFromVRMA };
}

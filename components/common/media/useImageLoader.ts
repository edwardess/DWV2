import { useState, useEffect, useCallback, useRef } from 'react';
import { generateCloudinaryURL } from '@/utils/generateCloudinaryUrl';
import { imageLoadingQueue } from './ImageLoadingQueue';

interface UseImageLoaderResult {
  isLoading: boolean;
  error: boolean;
  optimizedSrc: string;
}

type SetStateAction<T> = T | ((prevState: T) => T);
type Dispatch<T> = (value: T) => void;

const MAX_RETRIES = 2;
const RETRY_DELAY = 1000; // 1 second

export function useImageLoader(src: string, width: number): UseImageLoaderResult {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [optimizedSrc, setOptimizedSrc] = useState('');
  const isMounted = useRef(true);
  const retryCount = useRef(0);

  // Safe setState that only updates if component is mounted
  const safeSetState = useCallback(<T>(setter: Dispatch<SetStateAction<T>>, value: T) => {
    if (isMounted.current) {
      setter(value);
    }
  }, []);

  // Retry logic with delay
  const retry = useCallback((fn: () => Promise<void>) => {
    return new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        fn().then(resolve).catch(reject);
      }, RETRY_DELAY);
    });
  }, []);

  useEffect(() => {
    // Reset state for new src
    safeSetState(setIsLoading, true);
    safeSetState(setError, false);
    retryCount.current = 0;

    const loadImage = async () => {
      try {
        // Generate optimized URL
        const cloudinarySrc = generateCloudinaryURL(src, width);
        safeSetState(setOptimizedSrc, cloudinarySrc);

        // Create a promise that resolves when the image loads
        const imageLoadPromise = new Promise<void>((resolve, reject) => {
          const img = new Image();
          
          img.onload = () => {
            safeSetState(setIsLoading, false);
            resolve();
          };

          img.onerror = async () => {
            console.error(`❌ Failed to load optimized image (attempt ${retryCount.current + 1}/${MAX_RETRIES + 1})`);
            
            // Try retrying with Cloudinary URL if we haven't exceeded max retries
            if (retryCount.current < MAX_RETRIES) {
              retryCount.current++;
              try {
                await retry(() => imageLoadPromise);
                return;
              } catch (retryError) {
                console.error('❌ Retry failed:', retryError);
              }
            }

            // If all retries fail or we're out of retries, fallback to original URL
            console.log('⚠️ Falling back to original URL:', src);
            safeSetState(setOptimizedSrc, src);
            safeSetState(setError, true);

            // Try loading original source
            const fallbackImg = new Image();
            fallbackImg.onload = () => {
              safeSetState(setIsLoading, false);
              safeSetState(setError, false);
              console.log('✅ Fallback to original image successful');
              resolve();
            };
            fallbackImg.onerror = () => {
              console.error('❌ Both optimized and original image failed to load');
              reject(new Error('Both optimized and original image failed to load'));
            };
            fallbackImg.src = src;
          };

          // Add cache busting for Cloudinary URL if retrying
          const finalSrc = retryCount.current > 0 
            ? `${cloudinarySrc}${cloudinarySrc.includes('?') ? '&' : '?'}_retry=${retryCount.current}` 
            : cloudinarySrc;
          
          img.src = finalSrc;
        });

        // Add to loading queue
        await imageLoadingQueue.add(() => imageLoadPromise);
      } catch (err) {
        console.error('❌ Error in image loading process:', err);
        safeSetState(setOptimizedSrc, src);
        safeSetState(setError, true);
        safeSetState(setIsLoading, false);
      }
    };

    loadImage();

    // Cleanup
    return () => {
      isMounted.current = false;
    };
  }, [src, width, safeSetState, retry]);

  return { isLoading, error, optimizedSrc };
} 
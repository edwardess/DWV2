/**
 * Generates a Cloudinary optimization URL for a Firebase Storage image
 * Uses Cloudinary's fetch API to avoid pre-upload requirements
 * Applies auto-formatting, quality, and resizing while keeping Firebase as source
 */
export function generateCloudinaryURL(firebaseUrl: string, width: number = 800): string {
  if (!firebaseUrl) {
    console.warn('❌ Empty URL provided to generateCloudinaryURL');
    return '';
  }
  
  // Skip optimization for certain cases
  if (
    firebaseUrl.includes('res.cloudinary.com') || // Already a Cloudinary URL
    firebaseUrl.startsWith('data:') || // Data URL
    firebaseUrl.startsWith('blob:') || // Blob URL
    firebaseUrl.startsWith('http://localhost') || // Local development
    firebaseUrl.startsWith('https://localhost') // Local development
  ) {
    return firebaseUrl;
  }

  try {
    // Ensure URL is properly encoded and valid
    const url = new URL(firebaseUrl);
    const encoded = encodeURIComponent(url.toString());
    
    // Cloud name from environment or hardcoded for this example
    const cloudName = 'dctmc1j3u';
    
    // Build the Cloudinary fetch URL with optimization parameters
    const params = [
      'f_auto', // Auto format
      'q_auto', // Auto quality
      `w_${width}`, // Width constraint
      'c_limit', // Limit mode
      'dpr_auto', // Auto DPR for retina
    ].join(',');
    
    const cloudinaryURL = `https://res.cloudinary.com/${cloudName}/image/fetch/${params}/${encoded}`;
    
    // Validate the generated URL
    try {
      new URL(cloudinaryURL);
    return cloudinaryURL;
    } catch {
      console.warn('❌ Generated invalid Cloudinary URL, falling back to original');
      return firebaseUrl;
    }
  } catch (error) {
    console.warn('❌ Error in generateCloudinaryURL, using original:', error);
    return firebaseUrl; // Fallback to original URL if something goes wrong
  }
} 
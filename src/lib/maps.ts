// Hardcoded Google Maps API Key
const GOOGLE_MAPS_API_KEY = 'AIzaSyCLjlBd3uCfymgXG6wNRf-gCwOzqGniVcA';

class GoogleMapsLoaderSingleton {
  private geocoder: google.maps.Geocoder | null = null;
  private geocodeCache = new Map<string, google.maps.LatLng>();
  private isLoading = false;
  private loadPromise: Promise<any> | null = null;

  async getGoogleMaps(): Promise<any> {
    // Check if already loaded globally
    if (window.google && window.google.maps && window.google.maps.Map) {
      console.log('Google Maps already available globally');
      this.initializeGeocoder();
      return window.google.maps;
    }

    // Return existing promise if already loading
    if (this.loadPromise) {
      console.log('Using existing load promise');
      try {
        return await this.loadPromise;
      } catch (error) {
        // If the existing promise failed, reset and try again
        console.log('Previous load attempt failed, resetting and retrying...');
        this.loadPromise = null;
      }
    }

    console.log('Starting Google Maps initialization...');
    
    this.loadPromise = this.loadGoogleMapsScript();
    try {
      return await this.loadPromise;
    } catch (error) {
      // Reset promise on failure to allow retry
      this.loadPromise = null;
      throw error;
    }
  }

  private async loadGoogleMapsScript(): Promise<any> {
    return new Promise((resolve, reject) => {
      // Check if script already exists
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        console.log('Google Maps script already exists, waiting for load...');
        this.waitForGoogleMaps().then(resolve).catch(reject);
        return;
      }

      console.log('Creating Google Maps script tag...');
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=geometry,places&language=da&region=DK&v=weekly&loading=async`;
      script.async = true;
      script.defer = true;

      script.onload = () => {
        console.log('Google Maps script loaded');
        this.waitForGoogleMaps().then(resolve).catch((error) => {
          console.error('Google Maps failed to initialize after script load:', error);
          reject(error);
        });
      };

      script.onerror = (error) => {
        console.error('Failed to load Google Maps script:', error);
        this.loadPromise = null; // Reset so it can be retried
        reject(new Error('Failed to load Google Maps script'));
      };

      document.head.appendChild(script);
    });
  }

  private async waitForGoogleMaps(): Promise<any> {
    let attempts = 0;
    const maxAttempts = 65; // ~10.4 seconds with variable intervals

    return new Promise((resolve, reject) => {
      const checkGoogleMaps = () => {
        attempts++;
        
        if (window.google && window.google.maps && window.google.maps.Map) {
          console.log('Google Maps successfully loaded!');
          this.initializeGeocoder();
          resolve(window.google.maps);
          return;
        }

        if (attempts >= maxAttempts) {
          console.error('Timeout waiting for Google Maps to load. Attempts:', attempts);
          // Reset load promise to allow retry
          this.loadPromise = null;
          reject(new Error('Timeout waiting for Google Maps to load - try refreshing the page'));
          return;
        }

        if (attempts % 15 === 0) {
          console.log(`Waiting for Google Maps... attempt ${attempts}/${maxAttempts}`);
        }

        // Use exponential backoff for later attempts
        const delay = attempts > 50 ? Math.min(200 + (attempts - 50) * 20, 1000) : 100;
        setTimeout(checkGoogleMaps, delay);
      };

      checkGoogleMaps();
    });
  }

  private initializeGeocoder() {
    if (!this.geocoder && window.google && window.google.maps && window.google.maps.Geocoder) {
      try {
        this.geocoder = new window.google.maps.Geocoder();
        console.log('Geocoder initialized successfully');
      } catch (error) {
        console.error('Failed to initialize geocoder:', error);
      }
    }
  }

  async geocodeAddress(address: string): Promise<google.maps.LatLng | null> {
    // Check cache first
    if (this.geocodeCache.has(address)) {
      console.log('Using cached geocoding result for:', address);
      return this.geocodeCache.get(address)!;
    }

    // Ensure Google Maps and geocoder are loaded
    if (!this.geocoder) {
      try {
        await this.getGoogleMaps();
        this.initializeGeocoder();
      } catch (error) {
        console.error('Failed to initialize Google Maps for geocoding:', error);
        return null;
      }
    }

    if (!this.geocoder) {
      console.error('Geocoder not available after initialization');
      return null;
    }

    console.log('Geocoding address:', address);
    
    return new Promise((resolve) => {
      this.geocoder!.geocode({ address }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const location = results[0].geometry.location;
          this.geocodeCache.set(address, location);
          console.log('Geocoding successful for:', address, 'Location:', location.toJSON());
          resolve(location);
        } else {
          console.warn('Geocoding failed for address:', address, 'Status:', status);
          
          // Handle specific error cases
          if (status === 'ZERO_RESULTS') {
            console.warn('No results found for address:', address);
          } else if (status === 'OVER_QUERY_LIMIT') {
            console.error('Geocoding quota exceeded');
          } else if (status === 'REQUEST_DENIED') {
            console.error('Geocoding request denied - check API key');
          }
          
          resolve(null);
        }
      });
    });
  }
}

export const GoogleMapsLoader = new GoogleMapsLoaderSingleton();

// Default center for Helsingør area
export const HELSINGOR_CENTER = { lat: 56.0362, lng: 12.6134 };
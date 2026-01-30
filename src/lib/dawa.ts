// DAWA API integration for Danish address validation
// Focused on Helsingør (postal codes 3000-3080)

const DAWA_BASE_URL = 'https://api.dataforsyningen.dk';

export interface DawaAddress {
  id: string;
  tekst: string;
  adresse: {
    id: string;
    vejnavn: string;
    husnr: string;
    etage?: string;
    dør?: string;
    postnr: string;
    postnrnavn: string;
  };
}

export interface DawaStreet {
  tekst: string;
  vejnavn: string;
  postnr: string;
  postnrnavn: string;
}

// Helsingør postal codes
const HELSINGOR_POSTAL_CODES = [
  '3000', '3001', '3002', '3070', '3080'
];

export async function searchHelsingorStreets(query: string): Promise<DawaStreet[]> {
  if (!query || query.length < 2) return [];
  
  try {
    // Search for streets in Helsingør postal codes
    const postalCodeFilter = HELSINGOR_POSTAL_CODES.map(code => `postnr=${code}`).join('&');
    const url = `${DAWA_BASE_URL}/vejnavne/autocomplete?q=${encodeURIComponent(query)}&${postalCodeFilter}&per_side=10`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`DAWA API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data || [];
  } catch (error) {
    console.error('Error searching Helsingør streets:', error);
    return [];
  }
}

export async function searchHelsingorAddresses(street: string, number?: string): Promise<DawaAddress[]> {
  if (!street || street.length < 2) return [];
  
  try {
    // Build query for specific address
    let query = street;
    if (number) {
      query += ` ${number}`;
    }
    
    // Search for addresses in Helsingør postal codes
    const postalCodeFilter = HELSINGOR_POSTAL_CODES.map(code => `postnr=${code}`).join('&');
    const url = `${DAWA_BASE_URL}/adresser/autocomplete?q=${encodeURIComponent(query)}&${postalCodeFilter}&per_side=10`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`DAWA API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data || [];
  } catch (error) {
    console.error('Error searching Helsingør addresses:', error);
    return [];
  }
}

export async function validateHelsingorAddress(street: string, number: string, postalCode: string): Promise<boolean> {
  // Check if postal code is valid for Helsingør
  if (!HELSINGOR_POSTAL_CODES.includes(postalCode)) {
    return false;
  }
  
  try {
    const addresses = await searchHelsingorAddresses(street, number);
    return addresses.some(addr => 
      addr.adresse.vejnavn.toLowerCase() === street.toLowerCase() &&
      addr.adresse.husnr === number &&
      addr.adresse.postnr === postalCode
    );
  } catch (error) {
    console.error('Error validating Helsingør address:', error);
    return false;
  }
}

export function isHelsingorPostalCode(postalCode: string): boolean {
  return HELSINGOR_POSTAL_CODES.includes(postalCode);
}
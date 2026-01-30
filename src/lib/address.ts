export function addressLabel(o:any){
  console.log('🔍 Address data for order:', {
    id: o.id?.slice(0, 8),
    address: o.address,
    addressStreet: o.addressStreet,
    addressNumber: o.addressNumber,
    addressPostcode: o.addressPostcode,
    addressCity: o.addressCity,
    address_street: o.address_street,
    address_number: o.address_number,
    address_postcode: o.address_postcode,
    address_city: o.address_city
  });

  // Handle case where address is stored as JSON string
  let parsedAddress = null;
  if (o.address && typeof o.address === 'string') {
    try {
      const parsed = JSON.parse(o.address);
      if (parsed && typeof parsed === 'object') {
        parsedAddress = parsed;
      }
    } catch (e) {
      // If parsing fails, use address as-is
      return o.address;
    }
  }

  // Use parsed address data if available, otherwise use individual fields
  const street = [
    o.addressStreet ?? o.address_street ?? parsedAddress?.street,
    o.addressNumber ?? o.address_number ?? parsedAddress?.number ? String(o.addressNumber ?? o.address_number ?? parsedAddress?.number) : ""
  ].filter(Boolean).join(" ").trim();
  
  const extras = [
    o.addressFloor ?? o.address_floor ?? parsedAddress?.floor ? `etage ${String(o.addressFloor ?? o.address_floor ?? parsedAddress?.floor)}` : "",
    o.addressDoor ?? o.address_door ?? parsedAddress?.door ? `dør ${String(o.addressDoor ?? o.address_door ?? parsedAddress?.door)}` : "",
    o.addressStaircase ?? o.address_staircase ?? parsedAddress?.staircase ? `opg. ${String(o.addressStaircase ?? o.address_staircase ?? parsedAddress?.staircase)}` : "",
  ].filter(Boolean).join(", ");
  
  const tail = [
    o.addressPostcode ?? o.address_postcode ?? parsedAddress?.zip ? String(o.addressPostcode ?? o.address_postcode ?? parsedAddress?.zip) : "",
    o.addressCity ?? o.address_city ?? parsedAddress?.city
  ].filter(Boolean).join(" ").trim();
  
  const parts = [street, extras, tail].filter(Boolean);
  const label = parts.join(", ");
  
  // If we have a proper formatted address, return it, otherwise fallback to original address
  return label || (typeof o.address === 'string' && !parsedAddress ? o.address : "");
}

import { Order } from './types';
import { renderOrderLine } from './orderLineUtils';
import { addressLabel } from './address';

// Click-guard to prevent multiple prints
const printedLocks = new Set<string>();

export const printOrder = async (order: Order): Promise<void> => {
  // Click-guard: only allow one print per order ID for 8 seconds
  if (printedLocks.has(order.id)) {
    return;
  }
  
  printedLocks.add(order.id);
  setTimeout(() => printedLocks.delete(order.id), 8000);
  
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('da-DK', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Ordre ${order.id.slice(0, 8)}</title>
      <style>
        body { font-family: monospace; font-size: 12px; margin: 20px; }
        h1 { font-size: 16px; margin-bottom: 10px; }
        .section { margin-bottom: 10px; }
        .item { margin-bottom: 5px; }
        .allergy { color: red; font-weight: bold; }
        hr { border: 1px dashed #000; }
        @media print {
          body { margin: 0; }
          @page { margin: 0.5in; }
        }
      </style>
    </head>
    <body>
      <h1>LA CASTELLO - KØKKEN</h1>
      <hr>
      
      <div class="section">
        <strong>Ordre:</strong> ${order.id.slice(0, 8)}<br>
        <strong>Tid:</strong> ${formatTime(order.createdAt)}<br>
        <strong>Type:</strong> ${order.type === 'pickup' ? 'AFHENTNING' : 'UDBRINGNING'}<br>
        ${order.desiredTime ? `<strong>Ønsket tid:</strong> ${formatTime(order.desiredTime)}<br>` : '<strong>ASAP</strong><br>'}
      </div>
      
      <hr>
      
      <div class="section">
        <strong>Kunde:</strong> ${order.customerName}<br>
        ${order.phone ? `<strong>Tlf:</strong> ${order.phone}<br>` : ''}
        ${order.type === 'delivery' ? `
          <strong>Adresse:</strong> ${addressLabel(order)}<br>
          ${[
            order.addressFloor ? `Etage: ${order.addressFloor}` : '',
            order.addressDoor ? `Dør: ${order.addressDoor}` : '',
            order.addressStaircase ? `Opgang: ${order.addressStaircase}` : ''
          ].filter(Boolean).join(', ')}
        ` : ''}
      </div>
      
      <hr>
      
      <div class="section">
        <strong>VARER:</strong><br>
        ${order.lines.map((line, index) => {
          // Handle enhanced order lines for printing
          if ('type' in line && line.type && ['pizza', 'burger', 'burger_menu', 'drink', 'standard'].includes(line.type)) {
            const enhancedLine = line as any;
            let html = `<div class="item">`;
            
            // Main item
            html += `${enhancedLine.qty}x ${enhancedLine.pizza_name || enhancedLine.name}`;
            if (enhancedLine.menu_id) {
              html += ` (${enhancedLine.menu_id})`;
            }
            
            // Pizza size
            if (enhancedLine.size && enhancedLine.type === 'pizza') {
              const sizeNames = {
                'alm': 'Alm',
                'two_etagers': '2 Etagers',
                'deep_pan': 'Deep Pan', 
                'family': 'Familie'
              };
              html += ` - ${sizeNames[enhancedLine.size as keyof typeof sizeNames] || enhancedLine.size}`;
              if (enhancedLine.size_price) {
                html += ` (${enhancedLine.size_price} kr)`;
              }
            }
            
            // Final price
            if (enhancedLine.final_price) {
              html += ` - ${enhancedLine.final_price} kr`;
            }
            
            // Required choices
            if (enhancedLine.choices && enhancedLine.choices.length > 0) {
              html += `<br>   VALG:`;
              enhancedLine.choices.forEach((choice: any) => {
                html += `<br>     ${choice.category.replace('_', ' ')}: ${choice.option}`;
                if (choice.price_delta > 0) {
                  html += ` (+${choice.price_delta} kr)`;
                }
              });
            }
            
            // Modifiers
            if (enhancedLine.modifiers && enhancedLine.modifiers.length > 0) {
              html += `<br>   ÆNDRINGER:`;
              enhancedLine.modifiers.forEach((mod: any) => {
                html += `<br>     ${mod.action === 'add' ? 'Tilføjet' : 'Fjernet'}: ${mod.item}`;
                if (mod.price_delta > 0) {
                  html += ` (+${mod.price_delta} kr)`;
                }
              });
            }
            
            // Special instructions
            if (enhancedLine.special_instructions) {
              html += `<br>   NOTE: ${enhancedLine.special_instructions}`;
            }
            
            html += `</div>`;
            return html;
          }
          
          // Fallback to existing rendering for legacy orders
          const rendered = renderOrderLine(line, index);
          let html = `<div class="item">${rendered.display}`;
          
          // Add warning for unknown items
          if (rendered.display.includes('Ukendt vare')) {
            html += ` <span style="color: red; font-weight: bold;">(MANGLER NAVN)</span>`;
          }
          
          if (rendered.modifiers && rendered.modifiers.length > 0) {
            html += `<br>   ${rendered.modifiers.join(', ')}`;
          }
          html += `</div>`;
          return html;
        }).join('')}
      </div>
      
      ${order.hasAllergy ? `
      <hr>
      <div class="section allergy">
        ⚠️ ALLERGI: ${order.allergies}
      </div>
      ` : ''}
      
      ${order.notes ? `
      <hr>
      <div class="section">
        <strong>Bemærkninger:</strong><br>
        ${order.notes}
      </div>
      ` : ''}
      
      ${order.total ? `
      <hr>
      <div class="section">
        <strong>Total:</strong> ${order.total} kr.
      </div>
      ` : ''}
      
      <hr>
      <small>Printet: ${new Date().toLocaleString('da-DK')}</small>
    </body>
    </html>
  `;

  try {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      throw new Error('Pop-up blokeret - tillad pop-ups for at udskrive');
    }

    printWindow.document.open();
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Wait for content to load completely
    printWindow.onload = () => {
      console.log('Print window loaded, focusing and printing...');
      printWindow.focus();
      
      // Small delay to ensure rendering is complete
      setTimeout(() => {
        printWindow.print();
      }, 100);
    };
    
    // Fallback if onload doesn't fire
    setTimeout(() => {
      if (printWindow && !printWindow.closed) {
        console.log('Fallback: Forcing print...');
        printWindow.focus();
        printWindow.print();
      }
    }, 1000);
    
  } catch (error) {
    console.error('Print error:', error);
    throw new Error('Kunne ikke åbne print vindue - tjek pop-up indstillinger');
  }
};
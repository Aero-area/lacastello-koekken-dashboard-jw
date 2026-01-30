import { OrderLine, StandardOrderLine, HalfHalfPizzaLine, ModifiedOrderLine } from './types';

export function renderOrderLine(line: OrderLine, index: number): {
  display: string;
  qty: number;
  modifiers?: string[]
} {
  // Handle enhanced order lines with full data structure
  if ('type' in line && line.type && ['pizza', 'burger', 'burger_menu', 'drink', 'standard'].includes(line.type)) {
    const enhancedLine = line as any; // Enhanced order line
    
    let display = `${enhancedLine.qty}x ${enhancedLine.pizza_name || enhancedLine.name}`;
    
    // Add menu ID if available
    if (enhancedLine.menu_id) {
      display += ` (${enhancedLine.menu_id})`;
    }
    
    // Add size for pizzas
    if (enhancedLine.size && enhancedLine.type === 'pizza') {
      const sizeNames = {
        'alm': 'Alm',
        'two_etagers': '2 Etagers', 
        'deep_pan': 'Deep Pan',
        'family': 'Familie'
      };
      display += ` - ${sizeNames[enhancedLine.size as keyof typeof sizeNames] || enhancedLine.size}`;
      if (enhancedLine.size_price) {
        display += ` (${enhancedLine.size_price} kr)`;
      }
    }
    
    // Add final price
    if (enhancedLine.final_price) {
      display += ` - ${enhancedLine.final_price} kr`;
    }
    
    return {
      display,
      qty: enhancedLine.qty,
    };
  }
  
  if ('type' in line && line.type === 'pizza_half_half') {
    // Half-half pizza
    return {
      display: `1x HALV-HALV: ½ ${line.left.name} / ½ ${line.right.name}`,
      qty: 1,
    };
  } else if ('modifiers' in line) {
    // Modified order line
    const menuDisplay = line.menu_no ? `[${line.menu_no}] ` : '';
    const modifierTexts = line.modifiers.map(mod => 
      mod.action === 'add' ? `+ med ${mod.item}` : `- uden ${mod.item}`
    );
    
    return {
      display: `${line.qty}x ${menuDisplay}${line.name}`,
      qty: line.qty,
      modifiers: modifierTexts,
    };
  } else {
    // Standard order line
    const standardLine = line as StandardOrderLine;
    const menuDisplay = standardLine.menu_no ? `[${standardLine.menu_no}] ` : '';
    
    return {
      display: `${standardLine.qty}x ${menuDisplay}${standardLine.name}`,
      qty: standardLine.qty,
    };
  }
}

export function getLineSearchText(line: OrderLine): string {
  if ('type' in line && line.type === 'pizza_half_half') {
    return `${line.left.name} ${line.right.name}`;
  } else if ('name' in line) {
    return line.name || 'Ukendt vare';
  }
  return '';
}

export function getLineMenuNo(line: OrderLine): string | null {
  if ('menu_no' in line) {
    return line.menu_no || null;
  }
  return null;
}

export function getLineQty(line: OrderLine): number {
  if ('qty' in line) {
    return line.qty;
  }
  return 1; // Half-half pizzas are always qty 1
}

export function getLineName(line: OrderLine): string {
  if ('type' in line && line.type === 'pizza_half_half') {
    return line.display || `½ ${line.left.name} + ½ ${line.right.name}`;
  } else if ('name' in line) {
    return line.name || 'Ukendt vare';
  }
  return 'Ukendt vare';
}

export function getLineMods(line: OrderLine): string[] {
  if ('modifiers' in line) {
    return line.modifiers.map(mod => 
      mod.action === 'add' ? `med ${mod.item}` : `uden ${mod.item}`
    );
  }
  return [];
}
import { CirclePlus as PlusCircle, CircleMinus as MinusCircle } from 'lucide-react';

import { OrderLine } from '@/lib/types';

interface OrderLineItemProps { 
  line: OrderLine; 
}

export default function OrderLineItem({ line }: OrderLineItemProps) {
  console.log('🎨 OrderLineItem: Rendering line:', line);

  // Handle enhanced order lines with full data structure
  if ('type' in line && line.type && ['pizza', 'burger', 'burger_menu', 'drink', 'standard'].includes(line.type)) {
    const enhancedLine = line as any;
    
    return (
      <div className="py-2 border-l-4 border-blue-200 pl-3 bg-blue-50/30">
        {/* Main item with pricing */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex-1">
            <p className="font-semibold text-sm">
              {enhancedLine.qty}x {enhancedLine.pizza_name || enhancedLine.name}
              {enhancedLine.menu_id && (
                <span className="text-xs text-gray-500 ml-1">({enhancedLine.menu_id})</span>
              )}
            </p>
            
            {/* Pizza size */}
            {enhancedLine.size && enhancedLine.type === 'pizza' && (
              <div className="text-xs text-blue-700 mt-1">
                <span className="font-medium">Størrelse:</span> {
                  enhancedLine.size === 'alm' ? 'Alm' :
                  enhancedLine.size === 'two_etagers' ? '2 Etagers' :
                  enhancedLine.size === 'deep_pan' ? 'Deep Pan' :
                  enhancedLine.size === 'family' ? 'Familie' : enhancedLine.size
                }
                {enhancedLine.size_price && ` (${enhancedLine.size_price} kr)`}
              </div>
            )}
          </div>
          
          {/* Final price */}
          {enhancedLine.final_price && (
            <div className="text-sm font-bold text-gray-900">
              {enhancedLine.final_price} kr
            </div>
          )}
        </div>
        
        {/* Required choices (CRITICAL) */}
        {enhancedLine.choices && enhancedLine.choices.length > 0 && (
          <div className="space-y-1 mb-2">
            <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Valg:</p>
            {enhancedLine.choices.map((choice: any, index: number) => (
              <div key={index} className="flex items-center justify-between text-xs bg-purple-50 px-2 py-1 rounded">
                <div className="flex items-center gap-1">
                  <span className="font-medium capitalize">
                    {choice.category.replace('_', ' ')}:
                  </span>
                  <span className="text-purple-800">{choice.option}</span>
                </div>
                {choice.price_delta > 0 && (
                  <span className="text-purple-600 font-medium">+{choice.price_delta} kr</span>
                )}
              </div>
            ))}
          </div>
        )}
        
        {/* Modifiers */}
        {enhancedLine.modifiers && enhancedLine.modifiers.length > 0 && (
          <div className="space-y-1 mb-2">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Ændringer:</p>
            {enhancedLine.modifiers.map((modifier: any, index: number) => (
              <div key={index} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1">
                  {modifier.action === 'add' ? (
                    <PlusCircle className="h-3 w-3 text-green-600 flex-shrink-0" />
                  ) : (
                    <MinusCircle className="h-3 w-3 text-red-600 flex-shrink-0" />
                  )}
                  <span className={modifier.action === 'add' ? 'text-green-700' : 'text-red-700'}>
                    {modifier.action === 'add' ? 'Tilføjet' : 'Fjernet'}: {modifier.item}
                  </span>
                </div>
                {modifier.price_delta > 0 && (
                  <span className="text-green-600 font-medium">+{modifier.price_delta} kr</span>
                )}
              </div>
            ))}
          </div>
        )}
        
        {/* Special instructions */}
        {enhancedLine.special_instructions && (
          <div className="text-xs bg-yellow-50 border border-yellow-200 px-2 py-1 rounded mt-2">
            <span className="font-medium text-yellow-800">Note:</span>
            <span className="text-yellow-700 ml-1">{enhancedLine.special_instructions}</span>
          </div>
        )}
        
        {/* Price breakdown for complex items */}
        {(enhancedLine.base_price || (enhancedLine.choices && enhancedLine.choices.some((c: any) => c.price_delta > 0)) || 
          (enhancedLine.modifiers && enhancedLine.modifiers.some((m: any) => m.price_delta > 0))) && (
          <div className="text-xs text-gray-600 mt-2 pt-2 border-t border-gray-200">
            {enhancedLine.base_price && (
              <div>Base: {enhancedLine.base_price} kr</div>
            )}
            {enhancedLine.choices && enhancedLine.choices.filter((c: any) => c.price_delta > 0).length > 0 && (
              <div>Valg: +{enhancedLine.choices.filter((c: any) => c.price_delta > 0).reduce((sum: number, c: any) => sum + c.price_delta, 0)} kr</div>
            )}
            {enhancedLine.modifiers && enhancedLine.modifiers.filter((m: any) => m.price_delta > 0).length > 0 && (
              <div>Tilføjelser: +{enhancedLine.modifiers.filter((m: any) => m.price_delta > 0).reduce((sum: number, m: any) => sum + m.price_delta, 0)} kr</div>
            )}
          </div>
        )}
      </div>
    );
  }
  
  if (line.type === 'pizza_half_half') {
    return (
      <div className="py-1">
        <p className="font-semibold">1x HALV-HALV</p>
        <p className="pl-4 text-sm text-gray-700">
          {line.display || `½ ${line.left?.name || 'Ukendt'} + ½ ${line.right?.name || 'Ukendt'}`}
        </p>
      </div>
    );
  }

  // Get the display name with fallbacks
  const displayName = line.name || 'Ukendt vare';
  const hasValidName = displayName !== 'Ukendt vare';
  
  return (
    <div className="py-1">
      <p className="font-semibold">
        {line.qty || 1}x {displayName}
        {!hasValidName && (
          <span className="text-red-600 ml-2 text-xs">(Mangler navn)</span>
        )}
      </p>
      {'modifiers' in line && line.modifiers && line.modifiers.map((modifier, index) => (
        <div key={index} className="pl-4 text-sm text-gray-700 flex items-center">
          {modifier.action === 'add' ? ( <PlusCircle className="h-3 w-3 mr-2 text-green-600 flex-shrink-0" /> ) : ( <MinusCircle className="h-3 w-3 mr-2 text-red-600 flex-shrink-0" /> )}
          <span>{modifier.item || 'Ukendt tilføjelse'}</span>
        </div>
       ))}
    </div>
  );
}
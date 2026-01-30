/*
  # Add Pizza Add-ons and Toppings

  1. New Data
    - Add 44 different pizza add-ons with their prices
    - Categorized by type: sauces (15 kr), proteins/cheeses (25 kr), vegetables (20 kr)
    - All apply to "Pizza" category
    - Include Danish synonyms for better order matching

  2. Categories Added
    - Sauces and dressings (15 kr each)
    - Proteins, meats, and premium cheeses (25 kr each) 
    - Fresh vegetables and toppings (20 kr each)

  3. Features
    - Proper pricing structure
    - Danish names for local menu integration
    - Synonyms for order processing flexibility
*/

-- Insert pizza add-ons with proper pricing
INSERT INTO menu_addons (name, price, applies_to_category, synonyms) VALUES
-- Sauces and dressings (15 kr)
('Chili sauce', 15, 'Pizza', ARRAY['chili', 'hot sauce', 'stærk sauce']),
('Karrydressing', 15, 'Pizza', ARRAY['curry', 'curry dressing']),
('Hjemmelavet pesto', 15, 'Pizza', ARRAY['pesto', 'basilikum pesto']),
('Creme fraiche dressing', 15, 'Pizza', ARRAY['creme fraiche', 'cremefraiche']),
('Hvidløgsdressing', 15, 'Pizza', ARRAY['hvidløg dressing', 'garlic dressing']),
('Rød dressing', 15, 'Pizza', ARRAY['rød sauce', 'red dressing']),
('Hvidløgsolie', 15, 'Pizza', ARRAY['hvidløg olie', 'garlic oil']),
('Bearnaise sauce', 15, 'Pizza', ARRAY['bearnaise', 'bernaise']),

-- Proteins, meats and premium cheeses (25 kr)
('Mozzarellaost', 25, 'Pizza', ARRAY['mozzarella', 'mozarella']),
('Havartiost', 25, 'Pizza', ARRAY['havarti', 'havarti ost']),
('Gorgonzola', 25, 'Pizza', ARRAY['gorgonzola ost', 'blå ost']),
('Parmesanost', 25, 'Pizza', ARRAY['parmesan', 'parmasan']),
('Frisk mozzarella', 25, 'Pizza', ARRAY['frisk mozarella', 'buffalo mozzarella']),
('Skinke', 25, 'Pizza', ARRAY['ham', 'prosciutto']),
('Pastrami', 25, 'Pizza', ARRAY['pastrami kød']),
('Italiensk salami', 25, 'Pizza', ARRAY['salami', 'italiensk pølse']),
('Bacon', 25, 'Pizza', ARRAY['bacon strimler']),
('Kødsauce', 25, 'Pizza', ARRAY['kød sauce', 'meat sauce']),
('Kødstrimler', 25, 'Pizza', ARRAY['kød strimler', 'meat strips']),
('Krydret kød', 25, 'Pizza', ARRAY['spicy meat', 'stærkt kød']),
('Hakket oksekød', 25, 'Pizza', ARRAY['hakket kød', 'ground beef']),
('Kebab', 25, 'Pizza', ARRAY['kebab kød', 'döner']),
('Kylling', 25, 'Pizza', ARRAY['chicken', 'kyllingestrimler']),
('Pepperoni', 25, 'Pizza', ARRAY['pepperoni pølse']),
('Tynde skiver kalvekød', 25, 'Pizza', ARRAY['kalvekød', 'veal']),
('Tynde skiver bresaola', 25, 'Pizza', ARRAY['bresaola', 'lufttørret oksekød']),
('Cocktailpølser', 25, 'Pizza', ARRAY['cocktail pølser', 'mini pølser']),
('Kartoffel', 25, 'Pizza', ARRAY['kartofler', 'potato']),
('Rejer', 25, 'Pizza', ARRAY['shrimp', 'reker']),
('Tun', 25, 'Pizza', ARRAY['tuna', 'tunfisk']),
('Salat Dressing', 25, 'Pizza', ARRAY['salat sauce']),

-- Fresh vegetables and toppings (20 kr)
('Frisk tomat', 20, 'Pizza', ARRAY['tomat', 'tomater', 'fresh tomato']),
('Champignon', 20, 'Pizza', ARRAY['svampe', 'mushrooms']),
('Paprika', 20, 'Pizza', ARRAY['peber', 'bell pepper']),
('Løg', 20, 'Pizza', ARRAY['onion', 'rødløg']),
('Grøn peber', 20, 'Pizza', ARRAY['grøn paprika', 'green pepper']),
('Ananas', 20, 'Pizza', ARRAY['pineapple']),
('Spinat', 20, 'Pizza', ARRAY['spinach', 'baby spinat']),
('Broccoli', 20, 'Pizza', ARRAY['broccoli blomster']),
('Squash', 20, 'Pizza', ARRAY['zucchini', 'courgette']),
('Aubergine', 20, 'Pizza', ARRAY['eggplant', 'melanzane']),
('Artiskok', 20, 'Pizza', ARRAY['artichoke', 'artiskokhjerter']),
('Oliven', 20, 'Pizza', ARRAY['olives', 'sorte oliven', 'grønne oliven']),
('Rucola', 20, 'Pizza', ARRAY['rocket', 'arugula']),
('Jalapenos', 20, 'Pizza', ARRAY['jalapeño', 'hot peppers']),
('Spaghetti', 20, 'Pizza', ARRAY['pasta', 'spaghetti pasta'])

ON CONFLICT (name) DO UPDATE SET
  price = EXCLUDED.price,
  applies_to_category = EXCLUDED.applies_to_category,
  synonyms = EXCLUDED.synonyms;
/*
  # Add pizza add-ons column to menu_items table

  1. Schema Changes
    - Add `pizza_addon_ids` column to store which pizza menu IDs this addon applies to
    - Add `addon_category` column to categorize add-ons (sauce, protein, vegetable, etc.)

  2. New Menu Items
    - Add 44 pizza add-ons with proper pricing
    - Categorize by type (sauce=15kr, protein=25kr, vegetable=20kr)
    - Link to pizza menu IDs that can use these add-ons

  3. Security
    - Maintain existing RLS policies
*/

-- Add new columns to menu_items table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'menu_items' AND column_name = 'pizza_addon_ids'
  ) THEN
    ALTER TABLE menu_items ADD COLUMN pizza_addon_ids text[];
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'menu_items' AND column_name = 'addon_category'
  ) THEN
    ALTER TABLE menu_items ADD COLUMN addon_category text;
  END IF;
END $$;

-- Insert pizza add-ons as menu items
INSERT INTO menu_items (id, hovedkategori, navn, pris, beskrivelse, addon_category, pizza_addon_ids, is_available) VALUES
-- Sauces & Dressings (15 kr)
('T001', 'Tilbehør', 'Chili sauce', 15, 'Stærk chili sauce til pizza', 'sauce', ARRAY['1','2','3','4','5','6','7','8','9','10','11','12','13','14'], true),
('T002', 'Tilbehør', 'Karrydressing', 15, 'Cremet karrydressing', 'sauce', ARRAY['1','2','3','4','5','6','7','8','9','10','11','12','13','14'], true),
('T003', 'Tilbehør', 'Hjemmelavet pesto', 15, 'Frisk hjemmelavet pesto', 'sauce', ARRAY['1','2','3','4','5','6','7','8','9','10','11','12','13','14'], true),
('T004', 'Tilbehør', 'Creme fraiche dressing', 15, 'Mild creme fraiche dressing', 'sauce', ARRAY['1','2','3','4','5','6','7','8','9','10','11','12','13','14'], true),
('T005', 'Tilbehør', 'Hvidløgsdressing', 15, 'Cremet hvidløgsdressing', 'sauce', ARRAY['1','2','3','4','5','6','7','8','9','10','11','12','13','14'], true),
('T006', 'Tilbehør', 'Rød dressing', 15, 'Rød paprika dressing', 'sauce', ARRAY['1','2','3','4','5','6','7','8','9','10','11','12','13','14'], true),
('T007', 'Tilbehør', 'Hvidløgsolie', 15, 'Aromatisk hvidløgsolie', 'sauce', ARRAY['1','2','3','4','5','6','7','8','9','10','11','12','13','14'], true),
('T008', 'Tilbehør', 'Bearnaise sauce', 15, 'Klassisk bearnaise sauce', 'sauce', ARRAY['1','2','3','4','5','6','7','8','9','10','11','12','13','14'], true),

-- Proteins & Premium Items (25 kr)
('T009', 'Tilbehør', 'Mozzarellaost', 25, 'Ekstra mozzarella ost', 'protein', ARRAY['1','2','3','4','5','6','7','8','9','10','11','12','13','14'], true),
('T010', 'Tilbehør', 'Havartiost', 25, 'Dansk havarti ost', 'protein', ARRAY['1','2','3','4','5','6','7','8','9','10','11','12','13','14'], true),
('T011', 'Tilbehør', 'Gorgonzola', 25, 'Italiensk gorgonzola ost', 'protein', ARRAY['1','2','3','4','5','6','7','8','9','10','11','12','13','14'], true),
('T012', 'Tilbehør', 'Parmesanost', 25, 'Ægte parmesan ost', 'protein', ARRAY['1','2','3','4','5','6','7','8','9','10','11','12','13','14'], true),
('T013', 'Tilbehør', 'Frisk mozzarella', 25, 'Frisk italiensk mozzarella', 'protein', ARRAY['1','2','3','4','5','6','7','8','9','10','11','12','13','14'], true),
('T014', 'Tilbehør', 'Skinke', 25, 'Italiensk skinke', 'protein', ARRAY['1','2','3','4','5','6','7','8','9','10','11','12','13','14'], true),
('T015', 'Tilbehør', 'Pastrami', 25, 'Røget pastrami', 'protein', ARRAY['1','2','3','4','5','6','7','8','9','10','11','12','13','14'], true),
('T016', 'Tilbehør', 'Italiensk salami', 25, 'Ægte italiensk salami', 'protein', ARRAY['1','2','3','4','5','6','7','8','9','10','11','12','13','14'], true),
('T017', 'Tilbehør', 'Bacon', 25, 'Sprød bacon', 'protein', ARRAY['1','2','3','4','5','6','7','8','9','10','11','12','13','14'], true),
('T018', 'Tilbehør', 'Kødsauce', 25, 'Hjemmelavet kødsauce', 'protein', ARRAY['1','2','3','4','5','6','7','8','9','10','11','12','13','14'], true),
('T019', 'Tilbehør', 'Kødstrimler', 25, 'Saftige kødstrimler', 'protein', ARRAY['1','2','3','4','5','6','7','8','9','10','11','12','13','14'], true),
('T020', 'Tilbehør', 'Krydret kød', 25, 'Krydret oksekød', 'protein', ARRAY['1','2','3','4','5','6','7','8','9','10','11','12','13','14'], true),
('T021', 'Tilbehør', 'Hakket oksekød', 25, 'Hakket oksekød', 'protein', ARRAY['1','2','3','4','5','6','7','8','9','10','11','12','13','14'], true),
('T022', 'Tilbehør', 'Kebab', 25, 'Krydret kebab kød', 'protein', ARRAY['1','2','3','4','5','6','7','8','9','10','11','12','13','14'], true),
('T023', 'Tilbehør', 'Kylling', 25, 'Grillet kylling', 'protein', ARRAY['1','2','3','4','5','6','7','8','9','10','11','12','13','14'], true),
('T024', 'Tilbehør', 'Pepperoni', 25, 'Italiensk pepperoni', 'protein', ARRAY['1','2','3','4','5','6','7','8','9','10','11','12','13','14'], true),
('T025', 'Tilbehør', 'Tynde skiver kalvekød', 25, 'Tyndt skåret kalvekød', 'protein', ARRAY['1','2','3','4','5','6','7','8','9','10','11','12','13','14'], true),
('T026', 'Tilbehør', 'Tynde skiver bresaola', 25, 'Italiensk bresaola', 'protein', ARRAY['1','2','3','4','5','6','7','8','9','10','11','12','13','14'], true),
('T027', 'Tilbehør', 'Cocktailpølser', 25, 'Små cocktailpølser', 'protein', ARRAY['1','2','3','4','5','6','7','8','9','10','11','12','13','14'], true),
('T028', 'Tilbehør', 'Kartoffel', 25, 'Ristede kartofler', 'protein', ARRAY['1','2','3','4','5','6','7','8','9','10','11','12','13','14'], true),
('T029', 'Tilbehør', 'Rejer', 25, 'Friske rejer', 'protein', ARRAY['1','2','3','4','5','6','7','8','9','10','11','12','13','14'], true),
('T030', 'Tilbehør', 'Tun', 25, 'Tun i olie', 'protein', ARRAY['1','2','3','4','5','6','7','8','9','10','11','12','13','14'], true),
('T031', 'Tilbehør', 'Salat Dressing', 25, 'Frisk salat dressing', 'protein', ARRAY['1','2','3','4','5','6','7','8','9','10','11','12','13','14'], true),

-- Fresh Vegetables & Toppings (20 kr)
('T032', 'Tilbehør', 'Frisk tomat', 20, 'Friske tomater', 'vegetable', ARRAY['1','2','3','4','5','6','7','8','9','10','11','12','13','14'], true),
('T033', 'Tilbehør', 'Champignon', 20, 'Friske champignons', 'vegetable', ARRAY['1','2','3','4','5','6','7','8','9','10','11','12','13','14'], true),
('T034', 'Tilbehør', 'Paprika', 20, 'Frisk paprika', 'vegetable', ARRAY['1','2','3','4','5','6','7','8','9','10','11','12','13','14'], true),
('T035', 'Tilbehør', 'Løg', 20, 'Frisk løg', 'vegetable', ARRAY['1','2','3','4','5','6','7','8','9','10','11','12','13','14'], true),
('T036', 'Tilbehør', 'Grøn peber', 20, 'Frisk grøn peber', 'vegetable', ARRAY['1','2','3','4','5','6','7','8','9','10','11','12','13','14'], true),
('T037', 'Tilbehør', 'Ananas', 20, 'Frisk ananas', 'vegetable', ARRAY['1','2','3','4','5','6','7','8','9','10','11','12','13','14'], true),
('T038', 'Tilbehør', 'Spinat', 20, 'Frisk spinat', 'vegetable', ARRAY['1','2','3','4','5','6','7','8','9','10','11','12','13','14'], true),
('T039', 'Tilbehør', 'Broccoli', 20, 'Frisk broccoli', 'vegetable', ARRAY['1','2','3','4','5','6','7','8','9','10','11','12','13','14'], true),
('T040', 'Tilbehør', 'Squash', 20, 'Frisk squash', 'vegetable', ARRAY['1','2','3','4','5','6','7','8','9','10','11','12','13','14'], true),
('T041', 'Tilbehør', 'Aubergine', 20, 'Frisk aubergine', 'vegetable', ARRAY['1','2','3','4','5','6','7','8','9','10','11','12','13','14'], true),
('T042', 'Tilbehør', 'Artiskok', 20, 'Artiskok hjerter', 'vegetable', ARRAY['1','2','3','4','5','6','7','8','9','10','11','12','13','14'], true),
('T043', 'Tilbehør', 'Oliven', 20, 'Sorte oliven', 'vegetable', ARRAY['1','2','3','4','5','6','7','8','9','10','11','12','13','14'], true),
('T044', 'Tilbehør', 'Rucola', 20, 'Frisk rucola', 'vegetable', ARRAY['1','2','3','4','5','6','7','8','9','10','11','12','13','14'], true),
('T045', 'Tilbehør', 'Jalapenos', 20, 'Stærke jalapenos', 'vegetable', ARRAY['1','2','3','4','5','6','7','8','9','10','11','12','13','14'], true),
('T046', 'Tilbehør', 'Spaghetti', 20, 'Kogte spaghetti', 'vegetable', ARRAY['1','2','3','4','5','6','7','8','9','10','11','12','13','14'], true)

ON CONFLICT (id) DO UPDATE SET
  navn = EXCLUDED.navn,
  pris = EXCLUDED.pris,
  beskrivelse = EXCLUDED.beskrivelse,
  addon_category = EXCLUDED.addon_category,
  pizza_addon_ids = EXCLUDED.pizza_addon_ids,
  is_available = EXCLUDED.is_available;
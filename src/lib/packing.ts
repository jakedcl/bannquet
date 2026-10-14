import templates from '../../config/packing-templates.json';

export type PackingTemplateItem = {
  label: string;
  ounces?: number;
};

export type PackingTemplate = {
  id: string;
  name: string;
  items: PackingTemplateItem[];
};

const OUNCES_PER_GRAM = 28.3495;

export function loadPackingTemplates(): PackingTemplate[] {
  return templates.map((template) => {
    if (!template.id || !template.name || template.items.length === 0) {
      throw new Error('A packing template needs an id, a name, and at least one item.');
    }
    return {
      id: template.id,
      name: template.name,
      items: template.items.map((item) => ({
        label: item.label,
        ...(item.ounces ? { ounces: item.ounces } : {}),
      })),
    };
  });
}

export function packingTemplateById(id: string): PackingTemplate | null {
  return loadPackingTemplates().find((template) => template.id === id) ?? null;
}

export function ouncesToGrams(ounces: number): number {
  return Math.round(ounces * OUNCES_PER_GRAM);
}

export function gramsToOunces(grams: number): number {
  return Math.round(grams / OUNCES_PER_GRAM);
}

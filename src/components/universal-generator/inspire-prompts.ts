export const INSPIRE_PROMPTS = [
  "A {{watch, handbag, sneaker}} on a {{white, black, gradient}} background, {{studio lighting, natural sunlight}}",
  "A {{cat, dog, fox}} portrait in the style of {{Van Gogh, Monet, Picasso}}",
  "A model wearing {{casual, formal, streetwear}} in {{Tokyo, Paris, New York}}",
  "{{Sushi, Pizza, Ramen}} on a {{wooden, marble, slate}} table, {{overhead, side}} lighting",
  "A {{modern, Gothic, Japanese}} {{house, museum, temple}} at {{sunrise, golden hour, night}}",
  "A {{mountain, beach, forest}} landscape with {{fog, rainbow, aurora}} and {{warm, cool}} tones",
  "A {{sports car, motorcycle, yacht}} in {{Miami, Monaco, Dubai}} at {{day, sunset, night}}",
  "A {{Scandinavian, Industrial, Bohemian}} {{living room, bedroom}} with {{plants, art, books}}",
  "{{Geometric, Organic, Minimalist}} patterns in {{pastel, neon, earth}} tones",
  "A {{man, woman, child}} with {{curly, straight, wavy}} hair in {{studio, street, nature}} light",
  "{{Smartphone, Laptop, Smartwatch}} on a {{desk, bed, outdoor}} with {{morning, evening}} light",
  "A {{Golden Retriever, Persian Cat, Parrot}} playing in a {{park, beach, living room}}",
  "A {{diamond, gold, silver}} {{ring, necklace, bracelet}} on {{silk, velvet, marble}}",
  "A {{wizard, elf, dragon}} in a {{magical forest, crystal cave, floating castle}} with {{fire, ice, lightning}} magic",
];

export function getRandomPrompt(): string {
  return INSPIRE_PROMPTS[Math.floor(Math.random() * INSPIRE_PROMPTS.length)];
}

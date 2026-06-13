export const CATEGORIES = ['Jasle', 'Škôlka', 'ZŠ 1.stupeň', 'ZŠ 2.stupeň', 'Dospelý (SŠ)'];

export const DIETS = [
    'Bez lepku', 'Bez laktózy', 'Vegetariánske', 'Vegánske', 'Diabetické',
    'Nízky obsah soli', 'Bez orechov', 'Bez vajec', 'Bez sóje', 'Jemná / light',
    'Špeciálna',
];

export const SPECIAL_DIET_NAME = 'Špeciálna';

export const GROUP_CONFIG: Record<string, string[]> = {
    'Jasle': ['A'],
    'Škôlka': ['A'],
    'ZŠ 1.stupeň': ['A', 'B', 'V'],
    'ZŠ 2.stupeň': ['A', 'B', 'V'],
    'Dospelý (SŠ)': ['A', 'B', 'C', 'V']
};

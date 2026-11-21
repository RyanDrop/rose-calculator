export type Sexo = 'M' | 'F';

export type DobraId =
  | 'peito'
  | 'axilar'
  | 'triceps'
  | 'subescapular'
  | 'abdomen'
  | 'suprailiaca'
  | 'coxa';

export interface Dobra {
  id: DobraId;
  nome: string;
  simbolo: string;
  local: string;
}

export const DOBRAS: readonly Dobra[] = [
  {
    id: 'peito',
    nome: 'Peitoral',
    simbolo: 'peito',
    local: 'Diagonal, entre a linha axilar anterior e o mamilo.',
  },
  {
    id: 'axilar',
    nome: 'Axilar média',
    simbolo: 'axilar',
    local: 'Linha axilar média, na altura do processo xifoide.',
  },
  {
    id: 'triceps',
    nome: 'Tríceps',
    simbolo: 'tri',
    local: 'Vertical, ponto médio entre acrômio e olécrano.',
  },
  {
    id: 'subescapular',
    nome: 'Subescapular',
    simbolo: 'sub',
    local: 'Oblíqua, 1–2 cm abaixo do ângulo inferior da escápula.',
  },
  {
    id: 'abdomen',
    nome: 'Abdominal',
    simbolo: 'abd',
    local: 'Vertical, cerca de 2 cm ao lado da cicatriz umbilical.',
  },
  {
    id: 'suprailiaca',
    nome: 'Supra-ilíaca',
    simbolo: 'sup',
    local: 'Oblíqua, logo acima da crista ilíaca.',
  },
  {
    id: 'coxa',
    nome: 'Coxa',
    simbolo: 'cox',
    local: 'Vertical, ponto médio entre a prega inguinal e a patela.',
  },
];

export interface Faixa {
  rotulo: string;
  de: number;
  ate: number;
  tom: 'baixo' | 'atleta' | 'adequado' | 'atencao' | 'elevado';
}

/** Faixas de referência para adultos usadas na interpretação (escala de 0 a 45%). */
export const FAIXAS: Record<Sexo, readonly Faixa[]> = {
  M: [
    { rotulo: 'Muito baixo', de: 0, ate: 6, tom: 'baixo' },
    { rotulo: 'Atleta', de: 6, ate: 14, tom: 'atleta' },
    { rotulo: 'Adequado', de: 14, ate: 21, tom: 'adequado' },
    { rotulo: 'Acima do adequado', de: 21, ate: 26, tom: 'atencao' },
    { rotulo: 'Elevado', de: 26, ate: 45, tom: 'elevado' },
  ],
  F: [
    { rotulo: 'Muito baixo', de: 0, ate: 14, tom: 'baixo' },
    { rotulo: 'Atleta', de: 14, ate: 21, tom: 'atleta' },
    { rotulo: 'Adequado', de: 21, ate: 31, tom: 'adequado' },
    { rotulo: 'Acima do adequado', de: 31, ate: 36, tom: 'atencao' },
    { rotulo: 'Elevado', de: 36, ate: 45, tom: 'elevado' },
  ],
};

export const ESCALA_MAX = 45;

export interface Entrada {
  sexo: Sexo;
  idade: number;
  dobras: Record<DobraId, number>;
  peso?: number;
}

export interface Resultado {
  soma: number;
  densidade: number;
  gordura: number;
  massaGorda: number | null;
  massaMagra: number | null;
  faixa: Faixa | null;
  foraDoEsperado: boolean;
}

/** Densidade corporal (g/cm³) — Jackson & Pollock (1978, homens) e Jackson, Pollock & Ward (1980, mulheres). */
export function densidadeCorporal(sexo: Sexo, soma: number, idade: number): number {
  return sexo === 'M'
    ? 1.112 - 0.00043499 * soma + 0.00000055 * soma * soma - 0.00028826 * idade
    : 1.097 - 0.00046971 * soma + 0.00000056 * soma * soma - 0.00012828 * idade;
}

/** Equação de Siri (1961). */
export function siri(densidade: number): number {
  return 495 / densidade - 450;
}

export function classificar(sexo: Sexo, gordura: number): Faixa | null {
  if (!Number.isFinite(gordura) || gordura < 0) return null;
  const faixas = FAIXAS[sexo];
  return faixas.find((f) => gordura < f.ate) ?? faixas[faixas.length - 1];
}

export function calcular(e: Entrada): Resultado {
  const soma = Object.values(e.dobras).reduce((a, b) => a + b, 0);
  const densidade = densidadeCorporal(e.sexo, soma, e.idade);
  const gordura = siri(densidade);
  const temPeso = e.peso !== undefined && Number.isFinite(e.peso) && e.peso > 0;
  const massaGorda = temPeso ? e.peso! * (gordura / 100) : null;
  const massaMagra = temPeso && massaGorda !== null ? e.peso! - massaGorda : null;

  return {
    soma,
    densidade,
    gordura,
    massaGorda,
    massaMagra,
    faixa: classificar(e.sexo, gordura),
    foraDoEsperado: densidade <= 0.9 || densidade >= 1.2 || gordura < 0 || gordura > 70,
  };
}

/** Aceita vírgula ou ponto como separador decimal. Retorna NaN para vazio. */
export function lerNumero(valor: string): number {
  const v = valor.replace(',', '.').trim();
  return v === '' ? NaN : Number(v);
}

export function formatar(n: number | null, casas = 1): string {
  if (n === null || !Number.isFinite(n)) return '—';
  return n.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

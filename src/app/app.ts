import { Component, afterNextRender, computed, inject, Injector, signal } from '@angular/core';
import {
  DOBRAS,
  DobraId,
  ESCALA_MAX,
  FAIXAS,
  Sexo,
  calcular,
  formatar,
  lerNumero,
} from './jackson-pollock';
import { entregarPng, gerarPng } from './exportar-png';

type Campo = DobraId | 'idade' | 'peso';

const VAZIO: Record<DobraId, string> = {
  peito: '',
  axilar: '',
  triceps: '',
  subescapular: '',
  abdomen: '',
  suprailiaca: '',
  coxa: '',
};

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly dobrasInfo = DOBRAS;
  protected readonly escalaMax = ESCALA_MAX;
  protected readonly fmt = formatar;

  protected readonly sexo = signal<Sexo>('F');
  protected readonly nome = signal('');
  protected readonly idade = signal('');
  protected readonly peso = signal('');
  protected readonly dobras = signal<Record<DobraId, string>>({ ...VAZIO });
  protected readonly tocados = signal<ReadonlySet<Campo>>(new Set());
  protected readonly calculado = signal(false);
  protected readonly tentou = signal(false);
  protected readonly mostrar = computed(() => this.calculado() && this.resultado() !== null);
  private readonly injector = inject(Injector);
  protected readonly exportando = signal(false);
  protected readonly aviso = signal<string | null>(null);

  protected readonly faixas = computed(() => FAIXAS[this.sexo()]);

  protected readonly erros = computed(() => {
    const erros: Partial<Record<Campo, string>> = {};
    const idade = lerNumero(this.idade());
    if (this.idade().trim() === '') erros.idade = 'Informe a idade.';
    else if (!Number.isFinite(idade) || idade < 10 || idade > 120)
      erros.idade = 'Use uma idade entre 10 e 120 anos.';

    const peso = lerNumero(this.peso());
    if (this.peso().trim() !== '' && (!Number.isFinite(peso) || peso <= 0 || peso > 400))
      erros.peso = 'Peso inválido. Deixe em branco se não tiver.';

    for (const d of DOBRAS) {
      const bruto = this.dobras()[d.id];
      const v = lerNumero(bruto);
      if (bruto.trim() === '') erros[d.id] = 'Obrigatória.';
      else if (!Number.isFinite(v)) erros[d.id] = 'Use apenas números.';
      else if (v < 0) erros[d.id] = 'Não pode ser negativa.';
      else if (v > 100) erros[d.id] = 'Acima de 100 mm: confira a leitura.';
    }
    return erros;
  });

  protected readonly preenchidas = computed(
    () => DOBRAS.filter((d) => Number.isFinite(lerNumero(this.dobras()[d.id]))).length,
  );

  protected readonly somaParcial = computed(() =>
    DOBRAS.reduce((acc, d) => {
      const v = lerNumero(this.dobras()[d.id]);
      return Number.isFinite(v) && v >= 0 ? acc + v : acc;
    }, 0),
  );

  protected readonly resultado = computed(() => {
    const erros = this.erros();
    const bloqueantes = Object.keys(erros).filter((k) => k !== 'peso');
    if (bloqueantes.length) return null;
    const dobras = {} as Record<DobraId, number>;
    for (const d of DOBRAS) dobras[d.id] = lerNumero(this.dobras()[d.id]);
    const peso = erros.peso ? undefined : lerNumero(this.peso());
    return calcular({
      sexo: this.sexo(),
      idade: lerNumero(this.idade()),
      dobras,
      peso: Number.isFinite(peso) ? peso : undefined,
    });
  });

  /** Geometria do gráfico (unidades do viewBox). */
  protected readonly G = { w: 340, h: 196, esq: 30, dir: 6, topo: 22, base: 26 };

  protected readonly grafico = computed(() => {
    const r = this.resultado();
    if (!r) return null;
    const barras = DOBRAS.map((d) => ({
      id: d.id,
      nome: d.nome,
      curto: d.curto,
      valor: lerNumero(this.dobras()[d.id]),
      maior: false,
    }));
    const max = Math.max(...barras.map((b) => b.valor));
    barras.forEach((b) => (b.maior = b.valor === max && max > 0));
    const passo = max <= 20 ? 5 : max <= 50 ? 10 : 20;
    const topo = Math.max(passo, Math.ceil(max / passo) * passo);
    const ticks: number[] = [];
    for (let t = 0; t <= topo; t += passo) ticks.push(t);
    return {
      barras,
      ticks,
      topo,
      slot: (this.G.w - this.G.esq - this.G.dir) / barras.length,
      descricao: barras.map((b) => `${b.nome} ${formatar(b.valor)}`).join(', '),
    };
  });

  protected y(v: number, topo: number): number {
    const altura = this.G.h - this.G.topo - this.G.base;
    return this.G.topo + altura * (1 - v / topo);
  }

  protected barraPath(i: number, v: number, g: { slot: number; topo: number }): string {
    const larg = Math.min(22, g.slot * 0.55);
    const x = this.G.esq + i * g.slot + (g.slot - larg) / 2;
    const base = this.y(0, g.topo);
    const topoY = this.y(v, g.topo);
    const r = Math.min(4, (base - topoY) / 2, larg / 2);
    if (base - topoY <= 0) return '';
    return `M${x},${base}V${topoY + r}Q${x},${topoY} ${x + r},${topoY}H${x + larg - r}Q${x + larg},${topoY} ${x + larg},${topoY + r}V${base}Z`;
  }

  protected readonly marcador = computed(() => {
    const r = this.resultado();
    if (!r || !Number.isFinite(r.gordura)) return null;
    return Math.min(Math.max(r.gordura, 0), ESCALA_MAX) / ESCALA_MAX;
  });

  protected readonly pendencia = computed(() => {
    const faltam = 7 - this.preenchidas();
    const semIdade = !!this.erros().idade;
    if (faltam === 7 && semIdade) return 'Preencha a idade e as 7 dobras para ver o resultado.';
    const partes: string[] = [];
    if (semIdade) partes.push('a idade');
    if (faltam > 0) partes.push(faltam === 1 ? '1 dobra' : `${faltam} dobras`);
    if (!partes.length) return 'Confira os campos destacados.';
    return `Falta ${partes.join(' e ')}.`;
  });

  protected erro(campo: Campo): string | null {
    return this.tocados().has(campo) ? (this.erros()[campo] ?? null) : null;
  }

  protected tocar(campo: Campo): void {
    if (this.tocados().has(campo)) return;
    this.tocados.update((s) => new Set(s).add(campo));
  }

  protected definirDobra(id: DobraId, valor: string): void {
    this.dobras.update((d) => ({ ...d, [id]: valor }));
    this.aviso.set(null);
  }

  protected definir(campo: 'idade' | 'peso', valor: string): void {
    (campo === 'idade' ? this.idade : this.peso).set(valor);
    this.aviso.set(null);
  }

  protected escolherSexo(sexo: Sexo): void {
    this.sexo.set(sexo);
    this.aviso.set(null);
  }

  protected calcularAgora(): void {
    this.tentou.set(true);
    const campos: Campo[] = ['idade', 'peso', ...DOBRAS.map((d) => d.id)];
    this.tocados.set(new Set(campos));
    if (!this.resultado()) {
      const primeiro = campos.find((c) => this.erros()[c] && c !== 'peso');
      if (primeiro) document.getElementById(primeiro)?.focus();
      return;
    }
    this.calculado.set(true);
    afterNextRender(
      () => {
        const painel = document.getElementById('resultado');
        if (!painel) return;
        painel.focus({ preventScroll: true });
        if (window.matchMedia('(max-width: 959px)').matches) painel.scrollIntoView({ block: 'start' });
      },
      { injector: this.injector },
    );
  }

  protected limpar(): void {
    this.calculado.set(false);
    this.tentou.set(false);
    this.nome.set('');
    this.idade.set('');
    this.peso.set('');
    this.dobras.set({ ...VAZIO });
    this.tocados.set(new Set());
    this.aviso.set(null);
  }

  protected largura(de: number, ate: number): string {
    return `${((ate - de) / ESCALA_MAX) * 100}%`;
  }

  protected async exportar(): Promise<void> {
    const r = this.resultado();
    if (!r || this.exportando()) return;
    this.exportando.set(true);
    this.aviso.set(null);
    try {
      const dobras = {} as Record<DobraId, number>;
      for (const d of DOBRAS) dobras[d.id] = lerNumero(this.dobras()[d.id]);
      const peso = lerNumero(this.peso());
      const data = new Date();
      const blob = await gerarPng({
        nome: this.nome().trim(),
        sexo: this.sexo(),
        idade: lerNumero(this.idade()),
        peso: r.massaGorda !== null && Number.isFinite(peso) ? peso : null,
        dobras,
        resultado: r,
        data,
      });
      const arquivo = `avaliacao-7-dobras-${data.toISOString().slice(0, 10)}.png`;
      const como = await entregarPng(blob, arquivo);
      if (como === 'baixado') this.aviso.set('Imagem salva nos downloads.');
    } catch {
      this.aviso.set('Não foi possível gerar a imagem. Tente de novo.');
    } finally {
      this.exportando.set(false);
    }
  }
}

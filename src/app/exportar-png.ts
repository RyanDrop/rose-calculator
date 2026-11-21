import { DOBRAS, DobraId, ESCALA_MAX, FAIXAS, Resultado, Sexo, formatar } from './jackson-pollock';

export interface DadosImagem {
  nome: string;
  sexo: Sexo;
  idade: number;
  peso: number | null;
  dobras: Record<DobraId, number>;
  resultado: Resultado;
  data: Date;
}

const W = 1080;
const H = 1350;
const FONTE = '"Space Grotesk", system-ui, sans-serif';

const COR = {
  vinhoEscuro: '#4f222c',
  vinho: '#5e2a35',
  vinhoClaro: '#7a3644',
  creme: '#fffaf8',
  tinta: '#141a24',
  suave: '#5b5560',
  linha: '#ecdfe2',
  rosa: '#f3dde2',
};

const TOM: Record<string, string> = {
  baixo: '#f6e3e7',
  atleta: '#e7b9c4',
  adequado: '#d18a9c',
  atencao: '#b0576d',
  elevado: '#2a0f15',
};

function retangulo(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function desenharInstagram(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, cor: string) {
  const e = t * 0.09;
  ctx.save();
  ctx.strokeStyle = cor;
  ctx.fillStyle = cor;
  ctx.lineWidth = e;
  retangulo(ctx, x + e / 2, y + e / 2, t - e, t - e, t * 0.28);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x + t / 2, y + t / 2, t * 0.21, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x + t * 0.75, y + t * 0.25, t * 0.06, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Desenha o relatório em um canvas 1080×1350 (4:5, bom para WhatsApp e Instagram). */
export async function gerarPng(d: DadosImagem): Promise<Blob> {
  await Promise.all([
    document.fonts.load(`700 40px ${FONTE}`),
    document.fonts.load(`500 40px ${FONTE}`),
  ]).catch(() => undefined);

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const r = d.resultado;
  const M = 64;

  // Fundo creme
  ctx.fillStyle = '#f4ecee';
  ctx.fillRect(0, 0, W, H);

  // Bloco vinho superior
  const grad = ctx.createLinearGradient(0, 0, W, 640);
  grad.addColorStop(0, COR.vinhoEscuro);
  grad.addColorStop(1, COR.vinhoClaro);
  ctx.fillStyle = grad;
  retangulo(ctx, 32, 32, W - 64, 650, 48);
  ctx.fill();

  // Marca
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.beginPath();
  ctx.arc(M + 40, M + 48, 36, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = `700 26px ${FONTE}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('RA', M + 40, M + 49);
  ctx.textAlign = 'left';
  ctx.font = `700 30px ${FONTE}`;
  ctx.fillText('Rosi Nascimento Personal', M + 96, M + 36);
  ctx.font = `500 22px ${FONTE}`;
  ctx.fillStyle = 'rgba(255,255,255,0.72)';
  ctx.fillText('Avaliação de composição corporal', M + 96, M + 68);

  ctx.textAlign = 'right';
  ctx.fillText(d.data.toLocaleDateString('pt-BR'), W - M, M + 36);
  ctx.textAlign = 'left';

  // Resultado principal
  ctx.fillStyle = 'rgba(255,255,255,0.78)';
  ctx.font = `500 28px ${FONTE}`;
  ctx.fillText('Gordura corporal estimada', M, 220);

  ctx.fillStyle = '#fff';
  ctx.font = `700 170px ${FONTE}`;
  ctx.textBaseline = 'alphabetic';
  const numero = formatar(r.gordura);
  ctx.fillText(numero, M - 6, 400);
  const larguraNumero = ctx.measureText(numero).width;
  ctx.font = `700 72px ${FONTE}`;
  ctx.fillText('%', M + larguraNumero + 4, 400);

  if (r.faixa) {
    ctx.font = `700 26px ${FONTE}`;
    const texto = r.faixa.rotulo;
    const tw = ctx.measureText(texto).width;
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    retangulo(ctx, M, 432, tw + 44, 50, 25);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textBaseline = 'middle';
    ctx.fillText(texto, M + 22, 458);
  }

  // Escala
  const ex = M;
  const ey = 540;
  const ew = W - M * 2;
  const eh = 22;
  ctx.save();
  retangulo(ctx, ex, ey, ew, eh, eh / 2);
  ctx.clip();
  for (const f of FAIXAS[d.sexo]) {
    ctx.fillStyle = TOM[f.tom];
    ctx.fillRect(ex + (f.de / ESCALA_MAX) * ew, ey, ((f.ate - f.de) / ESCALA_MAX) * ew + 1, eh);
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 2;
  retangulo(ctx, ex, ey, ew, eh, eh / 2);
  ctx.stroke();

  const pos = Math.min(Math.max(r.gordura, 0), ESCALA_MAX) / ESCALA_MAX;
  const mx = ex + pos * ew;
  ctx.fillStyle = '#fff';
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 3;
  ctx.beginPath();
  ctx.arc(mx, ey + eh / 2, 19, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = COR.vinho;
  ctx.beginPath();
  ctx.arc(mx, ey + eh / 2, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = `500 20px ${FONTE}`;
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillText('0%', ex, ey + 40);
  ctx.textAlign = 'right';
  ctx.fillText(`${ESCALA_MAX}%`, ex + ew, ey + 40);
  ctx.textAlign = 'center';
  ctx.fillText(
    [d.nome, d.sexo === 'M' ? 'Masculino' : 'Feminino', `${d.idade} anos`, d.peso ? `${formatar(d.peso)} kg` : '']
      .filter(Boolean)
      .join(' · '),
    W / 2,
    ey + 40,
    ew - 180,
  );
  ctx.textAlign = 'left';

  // Indicadores
  const tiles: [string, string][] = [
    ['Soma das 7 dobras', `${formatar(r.soma)} mm`],
    ['Densidade corporal', `${formatar(r.densidade, 4)} g/cm³`],
    ['Massa gorda', r.massaGorda !== null ? `${formatar(r.massaGorda)} kg` : '—'],
    ['Massa magra', r.massaMagra !== null ? `${formatar(r.massaMagra)} kg` : '—'],
  ];
  const ty = 718;
  const gap = 20;
  const tw = (W - M * 2 - gap) / 2;
  const th = 120;
  tiles.forEach(([rotulo, valor], i) => {
    const x = M + (i % 2) * (tw + gap);
    const y = ty + Math.floor(i / 2) * (th + gap);
    ctx.fillStyle = COR.creme;
    retangulo(ctx, x, y, tw, th, 28);
    ctx.fill();
    ctx.strokeStyle = COR.linha;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = COR.suave;
    ctx.font = `500 22px ${FONTE}`;
    ctx.textBaseline = 'top';
    ctx.fillText(rotulo, x + 28, y + 24);
    ctx.fillStyle = COR.tinta;
    ctx.font = `700 40px ${FONTE}`;
    ctx.fillText(valor, x + 28, y + 60);
  });

  // Dobras
  const dy = ty + th * 2 + gap + 34;
  ctx.fillStyle = COR.tinta;
  ctx.font = `700 26px ${FONTE}`;
  ctx.fillText('Dobras cutâneas (mm)', M, dy);
  const cy = dy + 48;
  const colunas = 4;
  const cw = (W - M * 2) / colunas;
  DOBRAS.forEach((dobra, i) => {
    const x = M + (i % colunas) * cw;
    const y = cy + Math.floor(i / colunas) * 84;
    ctx.fillStyle = COR.suave;
    ctx.font = `500 21px ${FONTE}`;
    ctx.fillText(dobra.nome, x, y);
    ctx.fillStyle = COR.tinta;
    ctx.font = `700 32px ${FONTE}`;
    ctx.fillText(formatar(d.dobras[dobra.id]), x, y + 30);
  });

  // Rodapé
  ctx.fillStyle = COR.suave;
  ctx.font = `500 19px ${FONTE}`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('Jackson & Pollock (7 dobras) · equação de Siri', M, H - 56);

  // Instagram
  const handle = '@rosinascimentotraining';
  ctx.font = `700 26px ${FONTE}`;
  const hw = ctx.measureText(handle).width;
  const ic = 30;
  const hx = W - M - hw;
  const iy = H - 56 - 23;
  ctx.fillStyle = COR.vinho;
  ctx.fillText(handle, hx, H - 56);
  desenharInstagram(ctx, hx - ic - 12, iy, ic, COR.vinho);

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Falha ao gerar a imagem'))), 'image/png'),
  );
}

/** Compartilha pelo menu nativo (celular) quando possível; senão baixa o arquivo. */
export async function entregarPng(
  blob: Blob,
  nome: string,
): Promise<'compartilhado' | 'baixado' | 'cancelado'> {
  const arquivo = new File([blob], nome, { type: 'image/png' });
  if (navigator.canShare?.({ files: [arquivo] })) {
    try {
      await navigator.share({ files: [arquivo], title: 'Avaliação – Jackson & Pollock' });
      return 'compartilhado';
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return 'cancelado';
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'baixado';
}

// Desenho do título (frente e verso), selo de segurança e leitura do PNG.
// O selo de segurança fica no MESMO lugar de antes (CHIP), então os PNGs já baixados continuam valendo.
const CHIP = {x:40, y:900, c:28, W:900, H:1160};
const EMISSAO = "25/10/2026"; // ► data de emissão que aparece em todos os títulos

function bitsDoToken(token){
  const p = token.split("-");
  let b = (+p[0]).toString(2).padStart(14, "0");
  for(const h of p[1]) b += parseInt(h, 16).toString(2).padStart(4, "0");
  return b + "10";
}
function tokenDosBits(b){
  if(b.length !== 64 || b.slice(62) !== "10") return null;
  const n = parseInt(b.slice(0, 14), 2);
  if(n > 9999) return null;
  let s = ""; for(let i = 14; i < 62; i += 4) s += parseInt(b.slice(i, i + 4), 2).toString(16);
  return String(n).padStart(4, "0") + "-" + s;
}

/* ---------- peças de desenho ---------- */
const VERDE_TXT = "#3d5a1e", VERDE_ROT = "#516f30", SERIF = "Georgia, 'Times New Roman', serif";

function rr(x, X, Y, W, H, R){
  x.beginPath(); x.moveTo(X + R, Y); x.arcTo(X + W, Y, X + W, Y + H, R); x.arcTo(X + W, Y + H, X, Y + H, R);
  x.arcTo(X, Y + H, X, Y, R); x.arcTo(X, Y, X + W, Y, R); x.closePath();
}

// Linhas onduladas cruzadas, como o fundo de segurança dos documentos (guilhochê)
function guilhoche(x, W, H, cor, a){
  x.save(); x.lineWidth = 0.8; x.strokeStyle = cor; x.globalAlpha = a;
  for(let fam = 0; fam < 2; fam++){
    for(let k = 0; k < 48; k++){
      x.beginPath();
      for(let px = 0; px <= W; px += 5){
        const s = fam ? -1 : 1;
        const y = H * 0.5 + Math.sin(px * 0.012 * s + k * 0.22) * H * 0.28 + Math.sin(px * 0.031 + k * 0.15 * s) * H * 0.09 + (k - 24) * 6.4;
        px ? x.lineTo(px, y) : x.moveTo(px, y);
      }
      x.stroke();
    }
  }
  x.restore();
}

// Moldura em "corda" nas quatro bordas
function moldura(x, W, H, fundo, ponto){
  const b = 18;
  x.fillStyle = fundo;
  x.fillRect(0, 0, W, b); x.fillRect(0, H - b, W, b); x.fillRect(0, 0, b, H); x.fillRect(W - b, 0, b, H);
  x.fillStyle = ponto;
  for(let i = 8; i < W - 6; i += 9){ x.beginPath(); x.arc(i, b / 2, 3.1, 0, 7); x.fill(); x.beginPath(); x.arc(i, H - b / 2, 3.1, 0, 7); x.fill(); }
  for(let j = 8; j < H - 6; j += 9){ x.beginPath(); x.arc(b / 2, j, 3.1, 0, 7); x.fill(); x.beginPath(); x.arc(W - b / 2, j, 3.1, 0, 7); x.fill(); }
  x.strokeStyle = fundo; x.lineWidth = 1.5; x.strokeRect(b + 3, b + 3, W - 2 * b - 6, H - 2 * b - 6);
}

// Marca d'água central (no lugar do brasão): rosácea + a palavra SIMULAÇÃO
function marcaDagua(x, cx, cy, r){
  x.save(); x.translate(cx, cy); x.strokeStyle = "#5f8a2c"; x.lineWidth = 1.2; x.globalAlpha = 0.16;
  for(let i = 0; i < 36; i++){ x.rotate(Math.PI / 18); x.beginPath(); x.ellipse(r * 0.55, 0, r * 0.45, r * 0.17, 0, 0, 7); x.stroke(); }
  for(let k = 1; k <= 4; k++){ x.beginPath(); x.arc(0, 0, r * k / 4, 0, 7); x.stroke(); }
  x.restore();
  x.save(); x.translate(cx, cy + 6); x.rotate(-0.2); x.globalAlpha = 0.09; x.fillStyle = "#2f4a14";
  x.font = "bold 92px Arial"; x.textAlign = "center"; x.fillText("SIMULAÇÃO", 0, 0); x.restore();
}

// Reduz a letra até o texto caber na largura
function ajusta(x, s, maxW, tam, peso){
  while(tam > 12){ x.font = peso + " " + tam + "px Arial"; if(x.measureText(s).width <= maxW) break; tam--; }
  return tam;
}

function campo(x, rotulo, valor, X, Y, W, H, tam){
  rr(x, X, Y, W, H, 8); x.fillStyle = "rgba(255,255,255,0.55)"; x.fill();
  x.strokeStyle = "rgba(61,90,30,0.45)"; x.lineWidth = 1.5; x.stroke();
  x.fillStyle = VERDE_ROT; x.font = "bold 12px Arial"; x.textAlign = "left"; x.fillText(rotulo, X + 12, Y + 19);
  const t = ajusta(x, valor, W - 24, tam || 26, "bold");
  x.fillStyle = "#14210a"; x.font = "bold " + t + "px Arial"; x.fillText(valor, X + 12, Y + H - 13);
}

// Data de nascimento fictícia, sempre a mesma para o mesmo número
function nasc(num){
  const n = +num, d = 1 + n % 28, m = 1 + (n * 7) % 12, a = 1975 + (n * 13) % 30;
  return String(d).padStart(2, "0") + "/" + String(m).padStart(2, "0") + "/" + a;
}

/* ---------- frente e verso ---------- */
function frente(c, nome, num){
  c.width = 900; c.height = 560; const x = c.getContext("2d");
  const g = x.createLinearGradient(0, 0, 900, 560); g.addColorStop(0, "#c9e4b0"); g.addColorStop(0.5, "#e6f0c6"); g.addColorStop(1, "#bfdca5");
  x.fillStyle = g; x.fillRect(0, 0, 900, 560);
  guilhoche(x, 900, 560, "#5f8a2c", 0.22);
  marcaDagua(x, 450, 330, 170);
  moldura(x, 900, 560, "#86b03a", "rgba(255,255,255,0.55)");

  x.textAlign = "center"; x.fillStyle = VERDE_TXT; x.font = "bold 25px " + SERIF;
  x.fillText("REPÚBLICA FEDERATIVA DO BRASIL", 450, 62);
  x.strokeStyle = "rgba(61,90,30,0.5)"; x.lineWidth = 1.5; x.beginPath(); x.moveTo(40, 76); x.lineTo(860, 76); x.stroke();
  x.textAlign = "left"; x.font = "bold 30px " + SERIF; x.fillStyle = "#1f3a0d"; x.fillText("TÍTULO ELEITORAL", 40, 116);
  x.textAlign = "right"; x.fillStyle = "#1a4c8b"; x.font = "bold 17px Arial";
  x.fillText("IDENTIFICAÇÃO", 860, 99); x.fillText("BIOMÉTRICA", 860, 120);

  campo(x, "NOME DO ELEITOR", nome.toUpperCase(), 40, 140, 820, 64, 28);
  campo(x, "DATA DE NASCIMENTO", nasc(num), 40, 214, 210, 64, 26);
  campo(x, "Nº INSCRIÇÃO", num, 262, 214, 330, 64, 28);
  campo(x, "ZONA", "001", 604, 214, 120, 64, 26);
  campo(x, "SEÇÃO", "0001", 736, 214, 124, 64, 26);
  campo(x, "MUNICÍPIO / UF", "SIMULAÇÃO / BR", 40, 288, 540, 64, 26);
  campo(x, "DATA DE EMISSÃO", EMISSAO, 592, 288, 268, 64, 26);

  // assinatura do juiz (rabisco) e linha
  x.save(); x.strokeStyle = "#1a2a6c"; x.lineWidth = 2.4; x.lineJoin = "round"; x.beginPath();
  for(let t = 0; t <= 1; t += 0.01){
    const px = 300 + t * 300, py = 418 + Math.sin(t * 24) * 17 * (1 - t * 0.45) + Math.sin(t * 7.5) * 9;
    t ? x.lineTo(px, py) : x.moveTo(px, py);
  }
  x.stroke(); x.restore();
  x.strokeStyle = VERDE_TXT; x.lineWidth = 1.5; x.beginPath(); x.moveTo(250, 456); x.lineTo(650, 456); x.stroke();
  x.textAlign = "center"; x.fillStyle = VERDE_TXT; x.font = "bold 13px Arial";
  x.fillText("JUIZ(A) ELEITORAL · SIMULAÇÃO", 450, 476);
  x.font = "13px Arial"; x.fillText("Documento fictício para uso exclusivo nesta votação · sem validade oficial", 450, 520);
  x.textAlign = "left";
}

function verso(c, nome, num, token){
  c.width = 900; c.height = 560; const x = c.getContext("2d");
  const g = x.createLinearGradient(0, 0, 900, 560); g.addColorStop(0, "#f1f2cc"); g.addColorStop(1, "#dde9ae");
  x.fillStyle = g; x.fillRect(0, 0, 900, 560);
  guilhoche(x, 900, 560, "#7fa532", 0.2);
  moldura(x, 900, 560, "#86b03a", "rgba(255,255,255,0.55)");

  // faixa do topo
  x.fillStyle = "#86b03a"; x.fillRect(18, 18, 864, 56);
  x.textAlign = "center"; x.fillStyle = "#f6f3d6"; x.font = "bold 27px " + SERIF; x.fillText("REPÚBLICA FEDERATIVA DO BRASIL", 450, 55);

  // painel com as instruções
  rr(x, 44, 94, 530, 164, 10); x.fillStyle = "rgba(255,255,255,0.62)"; x.fill();
  x.textAlign = "left"; x.fillStyle = VERDE_TXT; x.font = "bold 20px Arial"; x.fillText("COMO VOTAR", 62, 124);
  x.fillStyle = "#14210a"; x.font = "16px Arial";
  ["1. Abra o site e toque em Adicionar título.", "2. Envie este arquivo PNG inteiro, sem cortar.", "3. Confirme, siga até a mesa e depois à cabine.", "4. Cada título vota uma única vez. Não compartilhe."].forEach((t, i) => x.fillText(t, 62, 152 + i * 25));
  x.fillStyle = VERDE_ROT; x.font = "12px Arial"; x.fillText("Simulação · sem validade oficial · " + location.origin, 62, 248);

  // selo de segurança (a chave pessoal deste título; fica nesta posição exata)
  x.fillStyle = VERDE_ROT; x.font = "bold 11px Arial"; x.fillText("SELO DE SEGURANÇA · PESSOAL E INTRANSFERÍVEL", 30, 280);
  x.fillStyle = "#fff"; x.fillRect(28, 288, 248, 248);
  const b = bitsDoToken(token); x.fillStyle = "#111";
  for(let i = 0; i < 64; i++) if(b[i] === "1") x.fillRect(CHIP.x + (i % 8) * CHIP.c, 300 + Math.floor(i / 8) * CHIP.c, CHIP.c, CHIP.c);

  // caixa em "L": polegar direito + assinatura
  x.fillStyle = "#14210a"; x.font = "bold 13px Arial"; x.fillText("POLEGAR DIREITO", 600, 110);
  x.beginPath(); x.moveTo(600, 120); x.lineTo(860, 120); x.lineTo(860, 490); x.lineTo(300, 490); x.lineTo(300, 420); x.lineTo(600, 420); x.closePath();
  x.fillStyle = "#fff"; x.fill(); x.strokeStyle = "#14210a"; x.lineWidth = 2.5; x.stroke();
  // impressão digital desenhada bem clara
  x.save(); x.strokeStyle = "rgba(61,90,30,0.14)"; x.lineWidth = 2;
  for(let r = 14; r < 100; r += 8){ x.beginPath(); x.ellipse(730, 270, r * 0.75, r, 0, Math.PI * 0.85, Math.PI * 2.15); x.stroke(); }
  x.restore();
  // dados do eleitor dentro da caixa de assinatura
  x.fillStyle = "#14210a"; x.font = "bold 18px Arial"; x.fillText("Nº " + num, 316, 446);
  const t = ajusta(x, nome, 520, 18, "normal"); x.font = t + "px Arial"; x.fillText(nome, 316, 473);
  x.fillStyle = VERDE_ROT; x.font = "12px Arial"; x.fillText("ASSINATURA OU IMPRESSÃO DIGITAL DO ELEITOR", 300, 507);

  // rodapé verde
  x.fillStyle = "#86b03a"; x.fillRect(290, 516, 574, 26);
  x.textAlign = "center"; x.fillStyle = "#f6f3d6"; x.font = "bold 13px Arial"; x.fillText("VÁLIDO SOMENTE COM MARCA D'ÁGUA - JUSTIÇA ELEITORAL", 577, 534);
  x.textAlign = "left";
}

function baixar(d){
  const a = document.createElement("canvas"), b = document.createElement("canvas");
  frente(a, d.nome, d.numero); verso(b, d.nome, d.numero, d.token);
  const t = document.createElement("canvas"); t.width = CHIP.W; t.height = CHIP.H;
  const x = t.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, CHIP.W, CHIP.H);
  x.drawImage(a, 0, 0); x.drawImage(b, 0, 600);
  const l = document.createElement("a");
  l.download = "titulo-" + d.numero + "-" + d.nome.replace(/\s+/g, "-") + ".png";
  l.href = t.toDataURL("image/png"); l.click();
}

// Lê a chave do selo de segurança de um PNG enviado. Devolve "0000-xxxxxxxxxxxx" ou null.
function lerToken(img){
  const W = img.naturalWidth || img.width, H = img.naturalHeight || img.height;
  if(!W || !H || Math.abs(W / H - CHIP.W / CHIP.H) > 0.03) return null;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const x = c.getContext("2d"); x.drawImage(img, 0, 0);
  const sx = W / CHIP.W, sy = H / CHIP.H, med = [];
  for(let i = 0; i < 64; i++){
    const cx = (CHIP.x + (i % 8) * CHIP.c + CHIP.c / 2) * sx, cy = (CHIP.y + Math.floor(i / 8) * CHIP.c + CHIP.c / 2) * sy;
    const w = Math.max(2, Math.round(CHIP.c * 0.5 * sx)), h = Math.max(2, Math.round(CHIP.c * 0.5 * sy));
    const d = x.getImageData(Math.round(cx - w / 2), Math.round(cy - h / 2), w, h).data;
    let s = 0; for(let k = 0; k < d.length; k += 4) s += d[k] * 0.3 + d[k + 1] * 0.59 + d[k + 2] * 0.11;
    med.push(s / (d.length / 4));
  }
  const mn = Math.min.apply(null, med), mx = Math.max.apply(null, med);
  if(mx - mn < 80) return null;
  const lim = (mn + mx) / 2;
  return tokenDosBits(med.map(v => v < lim ? "1" : "0").join(""));
}

// api/enviar-email.js
// Vercel serverless function — dispara e-mail de confirmação de vaga

import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { randomUUID } from 'crypto'

const supabase = createClient(
  'https://xmomrthnlojzhihemqfj.supabase.co',
  'sb_publishable_F4t-xclZHN2DGHvObebCeg_pFWachzu'
)
const resend  = new Resend('re_Ukzpv8nJ_6GjLEAZfuPpwPWLdMGhGFiV8')
const APP_URL = 'https://desafio-do-peixe-d986.vercel.app'
const fmt = (n) => Number(n).toLocaleString('pt-BR', { minimumFractionDigits:1, maximumFractionDigits:1 })

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { corredor_id, etapa_id, proxima_etapa_id } = req.body

  try {
    // 1. Busca dados do corredor e etapa
    const { data: inscricao } = await supabase
      .from('inscricoes')
      .select('*, corredores(*), etapas(*)')
      .eq('corredor_id', corredor_id)
      .eq('etapa_id', etapa_id)
      .single()

    if (!inscricao) return res.status(404).json({ error: 'Inscrição não encontrada' })

    // Não envia de novo se já enviou
    if (inscricao.token_confirmacao) {
      return res.status(200).json({ ok: true, msg: 'E-mail já enviado anteriormente' })
    }

    // 2. Busca próxima etapa automaticamente (Jul→Set, Set→Nov)
    const { data: todasEtapas } = await supabase
      .from('etapas')
      .select('*')
      .gt('inicio', inscricao.etapas.fim)
      .order('inicio', { ascending: true })
      .limit(1)

    const proximaEtapa   = todasEtapas?.[0] || null
    const isUltimaEtapa  = !proximaEtapa

    // 3. Gera token único de confirmação
    const token = randomUUID()
    await supabase
      .from('inscricoes')
      .update({ token_confirmacao: token })
      .eq('corredor_id', corredor_id)
      .eq('etapa_id', etapa_id)

    const linkConfirmacao = `${APP_URL}/confirmar?token=${token}`
    const corredor = inscricao.corredores
    const etapa    = inscricao.etapas

    // 4. Envia e-mail via Resend
    await resend.emails.send({
      from:    'Desafio do Peixe <onboarding@resend.dev>',
      to:      corredor.email,
      subject: isUltimaEtapa
        ? `🏅 Parabéns ${corredor.nome.split(' ')[0]}! Você completou o Desafio do Peixe 2026!`
        : `🏅 Parabéns ${corredor.nome.split(' ')[0]}! Sua vaga na ${proximaEtapa?.nome} está garantida`,
      html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background:#F8F8F4;font-family:system-ui,sans-serif;">
<div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

  <!-- Header -->
  <div style="background:#009B3A;padding:28px 24px 32px;text-align:center;">
    <img src="data:image/png;base64,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n5aI3n777ffee0//qQ+45557xo4dO336dABTpkw59dRTJ06cCODWW2996aWXiOjGG2+8+eab58yZA+Dee+/Nyck5/fTT9aV20n5h8PiKU/sUnGhHA89XzwP2Z7ocitPZVlvLVd0FySiUstX2fmqTi+1qZnVIQSnbtltbW/X7pUuXTp8+/b333pNSPvHEE+FwuLW19brrrrv22mtbWlr0nWPmcePGnXjiiddffz0z/+lPfxowYEB5efnHHydDfJFIpE+fPvfcc09FRQUzn3322Y899lgwGGTmc88995lnnmHm73znO263u7m5mZlPOumkn/70p5m3vzNDO6b/e9XrePac7jO+F7Sj2oudeUwHKVoChOh8JOoo5/akmhybh+gGZH8TZk9AMROA9evXv/baa6tXrwZQWVl51113TZw4cdOmTc3NzePGjRs9erSmyqlTp44cOVJv8Msvv3zmzJlbtmxpaWmZMmWK2+1+8MEHY7HYunXrZs2apYnacZydO3f+7Gc/+/jjjwHMmjXr7rvvHjFiRG1trb6+WCxmmmZVVdWwYcP0zBNPPFFXVwcgHA7n5+cDKCsrq6ioKCgoiEajtm0rpTSnOgLOJggAV/c42+0r2t66bf6uNUilAh8i69AepOAzsHLhPVfzYm5/HATK+VEyN1kpAJMnT/71r399ySWXxOPxd955Z+7cuRdffHFpaekDDzzgdrv79++/ceNGAB988MHOnTtjsVgikQBw++2333zzzQ0NDaWlpYZhVFVVjR8/vk+fPi6XS/OWSCRiGEZeXl5RUZGWe16vt729vaQkmdAUiURCodDw4cM16wgGg1OnTu3Tp48GurS0NBaLzZ07t6mpac2aNUqpxsbGYcOGrVixorMMmlmx0vZ33+wuZ5UMpER4Rs1n+2pfokMwkwEVQmgm/FeA3ADg7EBoDryD4Tk96UEk0iu877778vPzY7EYAJ/PN3To0Ozs7HHjxn388ccTJkwYNWpUVVVVUVHR8OHDq6qqmDkQCDz88MNSylAoZFmWPklBQUFzc7OmRADt7e0ulysUCukb09jYuHPnztra2jTQDQ0NSqm77rorPz/ftu2mpqYnn3zyoYce0hTQo0eP999//5xzzvnFL36xZMkSr9c7duzYv/3tb5s2bSKizrBpQcmsMy0SL+16GgtzXv3qqEwYJDI5tdlRfSO2EDJK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" alt="Desafio do Peixe" width="90" height="90" style="display:inline-block;margin-bottom:12px;border-radius:50%;border:3px solid rgba(254,223,0,0.35);" /><br/>
    <div style="color:rgba(255,255,255,0.75);font-size:11px;letter-spacing:0.15em;text-transform:uppercase;margin-bottom:10px;">
      Desafio do Peixe 2026
    </div>
    <div style="color:#FEDF00;font-size:32px;font-weight:900;font-family:Georgia,serif;line-height:1.2;">
      Parabéns! 🎉
    </div>
    <div style="color:#FEDF00;font-size:18px;font-weight:700;margin-top:6px;">
      ${corredor.nome.split(' ')[0]}, você conseguiu uma vaga!
    </div>
  </div>

  <!-- Conquista -->
  <div style="background:#FFFBE6;border-bottom:3px solid #FEDF00;padding:20px 28px;text-align:center;">
    <div style="font-size:13px;color:#6B6B5A;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">sua conquista na ${etapa.nome}</div>
    <div style="font-size:38px;font-weight:900;color:#009B3A;font-family:Georgia,serif;">
      ${fmt(inscricao.km_total || etapa.meta_km)} km
    </div>
    <div style="font-size:14px;color:#6B6B5A;margin-top:4px;">
      = <strong style="color:#009B3A;">R$ ${Math.floor(inscricao.km_total || etapa.meta_km).toLocaleString('pt-BR')}</strong> doados à Casa da Esperança de Santos
    </div>
  </div>

  <!-- Corpo -->
  <div style="padding:32px 28px;">
    <p style="font-size:16px;color:#1A1A1A;line-height:1.7;margin:0 0 20px;">
      É com muita alegria que viemos te comunicar que você garantiu uma vaga para a
      <strong>${proximaEtapa?.nome || 'próxima etapa'} do Desafio do Peixe 2026!</strong>
    </p>

    <p style="font-size:15px;color:#1A1A1A;line-height:1.7;margin:0 0 28px;">
      Para garantir a sua participação, confirme sua presença clicando no botão abaixo:
    </p>

    <!-- CTA principal -->
    <div style="text-align:center;margin:0 0 28px;">
      <a href="${linkConfirmacao}"
        style="background:#009B3A;color:#fff;text-decoration:none;
               padding:18px 36px;border-radius:12px;font-weight:900;
               font-size:16px;display:inline-block;letter-spacing:0.04em;
               box-shadow:0 4px 12px rgba(0,155,58,0.35);">
        ✅ CONFIRMAR MINHA VAGA
      </a>
    </div>

    <!-- Próxima etapa -->
    ${proximaEtapa ? `
    <div style="background:#F0F8F3;border:1.5px solid #009B3A30;border-radius:12px;padding:18px 20px;margin:0 0 24px;">
      <div style="font-size:12px;color:#6B6B5A;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">sua próxima etapa</div>
      <div style="font-size:18px;font-weight:800;color:#009B3A;">${proximaEtapa.nome}</div>
      <div style="font-size:13px;color:#6B6B5A;margin-top:4px;">
        ${new Date(proximaEtapa.inicio).toLocaleDateString('pt-BR')} a ${new Date(proximaEtapa.fim).toLocaleDateString('pt-BR')}
        · Meta: ${proximaEtapa.meta_km} km
      </div>
    </div>

    <!-- Grupo WhatsApp -->
    <div style="background:#E8F8EF;border:1.5px solid #25D36640;border-radius:12px;padding:18px 20px;margin:0 0 24px;text-align:center;">
      <div style="font-size:13px;color:#1A1A1A;line-height:1.6;margin-bottom:14px;">
        Após confirmar, entre no grupo da <strong>${proximaEtapa.nome}</strong> no WhatsApp:
      </div>
      <a href="https://chat.whatsapp.com/LVwPQRETsnM6fBS1OrrRb4"
        style="background:#25D366;color:#fff;text-decoration:none;
               padding:14px 28px;border-radius:12px;font-weight:900;
               font-size:15px;display:inline-block;letter-spacing:0.02em;">
        💬 Entrar no grupo
      </a>
      <div style="font-size:11px;color:#6B6B5A;margin-top:10px;">
        Link exclusivo — não compartilhe com outros corredores
      </div>
    </div>
    ` : ''}

    <!-- Aviso importante -->
    <div style="background:#FFF3F3;border:1.5px solid #E0000020;border-radius:12px;padding:18px 20px;margin:0 0 24px;">
      <div style="font-size:13px;font-weight:800;color:#C0392B;margin-bottom:6px;">⚠️ ATENÇÃO</div>
      <div style="font-size:13px;color:#1A1A1A;line-height:1.6;">
        Sua vaga só estará confirmada após clicar no botão acima.<br/>
        <strong>Este link é exclusivo para você</strong> — não compartilhe com outros corredores, ok?
      </div>
    </div>

    <p style="font-size:12px;color:#9A9A8A;line-height:1.7;margin:0;">
      Se o botão não funcionar, copie e cole este link no navegador:<br/>
      <a href="${linkConfirmacao}" style="color:#009B3A;word-break:break-all;">${linkConfirmacao}</a>
    </p>
  </div>

  <!-- Footer -->
  <div style="background:#F0F0E8;padding:20px 28px;text-align:center;">
    <div style="font-size:12px;color:#9A9A8A;line-height:1.8;">
      Desafio do Peixe 2026 · Correndo em prol da Casa da Esperança de Santos<br/>
      <a href="https://instagram.com/desafiodopeixe" style="color:#009B3A;text-decoration:none;font-weight:600;">
        @desafiodopeixe
      </a>
    </div>
  </div>

</div>
</body>
</html>
      `,
    })

    return res.status(200).json({ ok: true })

  } catch (err) {
    console.error('Email error:', err)
    return res.status(500).json({ error: err.message })
  }
}

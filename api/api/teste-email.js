const https = require('https')

module.exports = async function handler(req, res) {
  const para = req.query?.para || 'liasavaris@gmail.com'
  const nome = req.query?.nome || 'Lia'

  const html = `<html><body style="font-family:system-ui;background:#F8F8F4;padding:32px;">
    <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;">
      <div style="background:#009B3A;padding:28px;text-align:center;">
        <div style="color:#FEDF00;font-size:28px;font-weight:900;">Parabéns, ${nome}! 🎉</div>
        <div style="color:rgba(255,255,255,0.9);margin-top:8px;">Você garantiu uma vaga na Etapa de Setembro!</div>
      </div>
      <div style="padding:28px;">
        <p style="font-size:15px;color:#1A1A1A;line-height:1.7;">
          É com muita alegria que viemos te comunicar que você garantiu uma vaga para a
          <strong>Etapa de Setembro do Desafio do Peixe 2026!</strong>
        </p>
        <div style="text-align:center;margin:24px 0;">
          <a href="https://desafio-do-peixe-d986.vercel.app/confirmar?token=teste"
            style="background:#009B3A;color:#fff;text-decoration:none;padding:16px 32px;border-radius:12px;font-weight:900;font-size:15px;display:inline-block;">
            ✅ CONFIRMAR MINHA VAGA
          </a>
        </div>
        <div style="background:#E8F8EF;border-radius:12px;padding:16px;text-align:center;margin-top:16px;">
          <div style="margin-bottom:12px;font-size:14px;">Entre no grupo do WhatsApp da Etapa de Setembro:</div>
          <a href="https://chat.whatsapp.com/LVwPQRETsnM6fBS1OrrRb4"
            style="background:#25D366;color:#fff;text-decoration:none;padding:12px 24px;border-radius:12px;font-weight:900;font-size:14px;display:inline-block;">
            💬 Entrar no grupo
          </a>
        </div>
      </div>
      <div style="background:#F0F0E8;padding:16px;text-align:center;font-size:12px;color:#888;">
        Desafio do Peixe 2026 · @desafiodopeixe
      </div>
    </div>
  </body></html>`

  const payload = JSON.stringify({
    from: 'Desafio do Peixe <onboarding@resend.dev>',
    to: [para],
    subject: `🏅 Parabéns ${nome}! Sua vaga na Etapa de Setembro está garantida`,
    html
  })

  return new Promise((resolve) => {
    const options = {
      hostname: 'api.resend.com',
      path: '/emails',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer re_Ukzpv8nJ_6GjLEAZfuPpwPWLdMGhGFiV8',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }

    const req2 = https.request(options, (response) => {
      let data = ''
      response.on('data', chunk => data += chunk)
      response.on('end', () => {
        const result = JSON.parse(data)
        if (result.id) {
          res.setHeader('Content-Type', 'text/html; charset=utf-8')
          res.status(200).send(`<html><body style="font-family:system-ui;padding:40px;text-align:center;">
            <div style="font-size:48px">✅</div>
            <h2 style="color:#009B3A;margin:16px 0">E-mail enviado!</h2>
            <p>Enviado para: <strong>${para}</strong></p>
            <p style="color:#666;margin-top:8px">Confere a caixa de entrada!</p>
          </body></html>`)
        } else {
          res.status(500).send(`Erro: ${JSON.stringify(result)}`)
        }
        resolve()
      })
    })

    req2.on('error', (e) => {
      res.status(500).send(`Erro: ${e.message}`)
      resolve()
    })

    req2.write(payload)
    req2.end()
  })
}

const https = require('https')

module.exports = async function handler(req, res) {
  const para = req.query?.para || 'liasavaris@gmail.com'
  const nome = req.query?.nome || 'Lia'
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) {
    return res.status(500).send('RESEND_API_KEY nao configurada no Vercel')
  }

  const payload = JSON.stringify({
    from: 'Desafio do Peixe <onboarding@resend.dev>',
    to: [para],
    subject: `Parabens ${nome}! Sua vaga na Etapa de Setembro esta garantida`,
    html: `<h1 style="color:#009B3A">Parabens, ${nome}!</h1><p>Voce garantiu uma vaga na Etapa de Setembro do Desafio do Peixe 2026!</p>`
  })

  return new Promise((resolve) => {
    const req2 = https.request({
      hostname: 'api.resend.com', path: '/emails', method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (response) => {
      let data = ''
      response.on('data', chunk => data += chunk)
      response.on('end', () => {
        const result = JSON.parse(data)
        if (result.id) {
          res.status(200).send(`<h2 style="color:green">Email enviado! ID: ${result.id}</h2><p>Para: ${para}</p>`)
        } else {
          res.status(500).send(`Erro: ${JSON.stringify(result)}`)
        }
        resolve()
      })
    })
    req2.on('error', (e) => { res.status(500).send(e.message); resolve() })
    req2.write(payload)
    req2.end()
  })
}

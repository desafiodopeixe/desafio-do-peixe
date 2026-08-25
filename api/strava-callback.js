// api/strava-callback.js
// Vercel serverless function — recebe o código do Strava após autorização

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://xmomrthnlojzhihemqfj.supabase.co',
  'sb_publishable_F4t-xclZHN2DGHvObebCeg_pFWachzu'
)

const STRAVA_CLIENT_ID     = '273035'
const STRAVA_CLIENT_SECRET = 'b9675f3f648ef367215a51ee213713e3c00b2231'
const APP_URL              = 'https://desafio-do-peixe-d986.vercel.app'

export default async function handler(req, res) {
  const { code, state: corridorId, error } = req.query

  if (error) {
    return res.redirect(`${APP_URL}?strava=negado`)
  }

  try {
    // 1. Troca o code pelo access_token no Strava
    const tokenRes = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id:     STRAVA_CLIENT_ID,
        client_secret: STRAVA_CLIENT_SECRET,
        code,
        grant_type:    'authorization_code',
      }),
    })
    const tokenData = await tokenRes.json()

    if (!tokenData.access_token) {
      return res.redirect(`${APP_URL}?strava=erro`)
    }

    // 2. Salva o token no banco
    await supabase
      .from('corredores')
      .update({
        strava_id:    String(tokenData.athlete.id),
        strava_token: tokenData.access_token,
      })
      .eq('id', corridorId)

    // 3. Redireciona para o painel do corredor
    return res.redirect(`${APP_URL}?strava=conectado&corredor=${corridorId}`)

  } catch (err) {
    console.error('Strava callback error:', err)
    return res.redirect(`${APP_URL}?strava=erro`)
  }
}

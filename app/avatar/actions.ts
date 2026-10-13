'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase/server'
import { AVATAR_LIST } from '@/lib/avatars'

export async function selectAvatarAction(formData: FormData) {
  const teamId = cookies().get('team_id')?.value
  if (!teamId) redirect('/')

  // CASE 1: CONFIRM ENTRY (User clicked "Enter Casino")
  if (formData.get('confirm_entry') === 'true') {
    redirect('/map')
  }

  // CASE 2: SELECTING AN AVATAR
  const submittedAvatarId = Number(formData.get('avatar_id'))

  // 1. Fetch team's current record
  const { data: teamData, error: teamErr } = await supabaseAdmin
    .from('teams')
    .select('id, access_code, avatar_id')
    .eq('id', teamId)
    .single()

  const team = teamData as any
  if (teamErr || !team) redirect('/')

  // Determine this team's designated avatar
  const designatedAvatar = AVATAR_LIST.find(a =>
    a.code === team.access_code ||
    a.teamNum === team.avatar_id ||
    a.id === team.avatar_id
  ) || AVATAR_LIST[0]

  // Enforce rule: Team can ONLY choose their designated avatar!
  if (submittedAvatarId && submittedAvatarId !== designatedAvatar.id) {
    console.warn(`Security: Team ${team.access_code} attempted to select unauthorized avatar ${submittedAvatarId}`)
    revalidatePath('/avatar')
    return
  }

  // 2. Claim / lock designated avatar
  const { error } = await supabaseAdmin
    .from('teams')
    // @ts-expect-error: Supabase inference bug
    .update({ avatar_id: designatedAvatar.id })
    .eq('id', teamId)

  if (error) {
    console.error('Avatar Update Error:', error)
  }

  // Direct redirect into map
  redirect('/map')
}
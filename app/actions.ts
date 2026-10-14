'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase/server'

// Define the shape manually to bypass the inference error
type TeamRow = {
  id: string;
  access_code: string;
}

import { AVATAR_LIST } from '@/lib/avatars'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function loginAction(prevState: any, formData: FormData) {
  let rawCode = formData.get('access_code') as string

  if (!rawCode) return { error: "Please enter your Syndicate Code or Team Number." }
  rawCode = rawCode.trim().toUpperCase()

  // 1. Resolve aliases
  let targetCode = rawCode.replace(/[\s-]+/g, '_')

  // Check if numeric or TEAM-xx alias
  const teamNumMatch = rawCode.match(/^(?:TEAM|T)?\s*0*([1-9]|[12][0-9]|3[0-2])$/i)
  const testNumMatch = rawCode.match(/^(?:TEST)\s*0*([12])$/i)

  if (teamNumMatch) {
    const num = parseInt(teamNumMatch[1], 10)
    const matched = AVATAR_LIST.find(a => a.teamNum === num)
    if (matched) targetCode = matched.code
  } else if (testNumMatch) {
    const num = parseInt(testNumMatch[1], 10)
    const matched = AVATAR_LIST.find(a => a.teamNum === (30 + num))
    if (matched) targetCode = matched.code
  } else {
    // Check if matches an avatar name or code
    const matched = AVATAR_LIST.find(a =>
      a.code === targetCode ||
      a.code === rawCode ||
      a.name.toUpperCase().replace(/[\s-]+/g, '_') === targetCode ||
      a.name.toUpperCase() === rawCode
    )
    if (matched) targetCode = matched.code
  }

  // 2. Fetch team by resolved targetCode or fallback to rawCode
  let { data, error } = await supabaseAdmin
    .from('teams')
    .select('*')
    .eq('access_code', targetCode)
    .maybeSingle()

  if (!data && targetCode !== rawCode) {
    const fallbackRes = await supabaseAdmin
      .from('teams')
      .select('*')
      .eq('access_code', rawCode)
      .maybeSingle()
    data = fallbackRes.data
    error = fallbackRes.error
  }

  if (error) {
    console.error("Database Error:", error)
    return { error: "System Error." }
  }

  const team = data as (TeamRow & { is_logged_in?: boolean }) | null

  if (!team) {
    return { error: `INVALID SYNDICATE CODE: "${rawCode}". Check the Syndicate Roster below.` }
  }

  if (team.is_logged_in) {
    return { error: "SYNDICATE IS ALREADY LOGGED IN ON ANOTHER DEVICE." }
  }

  // 3. Update logged in state
  const payload = { is_logged_in: true } as any;
  await supabaseAdmin
    .from('teams')
    // @ts-expect-error: Suppress Next.js/Supabase inference bug
    .update(payload)
    .eq('id', team.id)

  // 4. Set Session
  cookies().set('team_id', team.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24
  })

  // 5. Redirect
  redirect('/avatar')
}

export async function logoutAction(teamId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload = { is_logged_in: false } as any;
  await supabaseAdmin
    .from('teams')
    // @ts-expect-error: Suppress Next.js/Supabase inference bug
    .update(payload)
    .eq('id', teamId)

  cookies().delete('team_id')
  redirect('/')
}

export async function getTeamId() {
  return cookies().get('team_id')?.value
}

// --- EXISTING CODE ABOVE (Login, etc.) ---

// --- NEW: DYNAMIC QUESTION FETCHING ---
export async function fetchQuestionData(gameId: string, difficultyStr: string = 'STANDARD') {
  console.log(`DEBUG: fetchQuestionData called with gameId='${gameId}', difficultyStr='${difficultyStr}'`);
  try {
    const questionGameId = gameId;

    const { data, error } = await supabaseAdmin
      .from('question_bank')
      .select('*')
      .ilike('game_type', questionGameId)
      .ilike('difficulty', difficultyStr)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    console.log(`DEBUG: fetchQuestionData result: data=`, data, `error=`, error);


    // Fallback logic for single obj vs array
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const qData = data as any;
    const questionData = qData && Array.isArray(qData) && qData.length > 0 ? qData[0] : (qData || null);

    console.log(`DEBUG: fetchQuestionData result: data=`, questionData, `error=`, error);

    if (error || !questionData) {
      console.error("Supabase Error fetching question:", error);
      return { error: "No active questions found for this table/difficulty." };
    }

    // Extract test_cases, clues, options, expected_output from either top-level or test_cases JSONB
    const rawTestCases = questionData.test_cases;
    let extractedCases: any[] = [];
    let extractedClues: string[] = questionData.clues || [];
    let extractedOptions: string[] | null = questionData.options || null;
    let extractedExpected: string | null = questionData.expected_output || null;

    if (Array.isArray(rawTestCases)) {
      extractedCases = rawTestCases;
      if (!extractedExpected && rawTestCases.length > 0) {
        extractedExpected = rawTestCases[0].expected || null;
      }
    } else if (typeof rawTestCases === 'object' && rawTestCases !== null) {
      extractedCases = rawTestCases.cases || [];
      if (!extractedClues || extractedClues.length === 0) {
        extractedClues = rawTestCases.clues || [];
      }
      if (!extractedOptions) {
        extractedOptions = rawTestCases.options || null;
      }
      if (!extractedExpected) {
        extractedExpected = rawTestCases.expected_output || (extractedCases[0]?.expected ?? null);
      }
    }

    return {
      success: true,
      question: {
        id: questionData.id,
        title: questionData.title,
        content: questionData.problem_statement || questionData.content,
        starter_code: questionData.starter_code,
        constraints: questionData.constraints,
        expected_output: extractedExpected,
        test_cases: extractedCases,
        clues: extractedClues,
        clues_total: extractedClues.length,
        options: extractedOptions
      }
    };
  } catch {
    return { error: "System error fetching question." };
  }
}

// --- NEW: PLACE BET ---
export async function placeBet(teamId: string, amount: number, gameId: string) {
  try {
    // 0. Verify Table Status & Expiration
    const [eventRes, gameStateRes] = await Promise.all([
      supabaseAdmin.from('event_control').select('table_timers, is_paused').eq('id', 1).single(),
      supabaseAdmin.from('game_state').select('is_active').eq('game_id', gameId).single()
    ])

    const eventData = eventRes.data as any
    const gameStateData = gameStateRes.data as any

    const isGlobalPaused = eventData?.is_paused
    if (isGlobalPaused) return { error: "The entire casino is currently PAUSED." }

    const timers = (eventData?.table_timers || {}) as Record<string, string>
    const status = timers[`${gameId}_status`]
    const startTimeStr = timers[gameId]
    const isStateActive = gameStateData?.is_active

    if (status === 'KILLED' || isStateActive === false) {
      return { error: "This table is currently CLOSED by the Pit Boss." }
    }

    if (startTimeStr) {
      const startMs = new Date(startTimeStr).getTime()
      if (Date.now() > startMs + (16 * 60000)) {
        return { error: "The round for this table has already ended! You cannot join." }
      }
    }

    // 1. Get current balance
    const { data: teamData, error: fetchError } = await supabaseAdmin
      .from('teams')
      .select('wallet_balance')
      .eq('id', teamId)
      .single()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(res => ({ data: res.data as any, error: res.error })); // Keep error separate

    if (fetchError || !teamData) {
      return { error: "Failed to read wallet." }
    }

    if (teamData.wallet_balance < amount) {
      return { error: "Insufficient funds. You need $" + amount }
    }

    // 2. Deduct amount and lock them to the table waiting room
    const newBalance = teamData.wallet_balance - amount
    const { error: updateError } = await supabaseAdmin
      .from('teams')
      // @ts-expect-error: Next.js/Supabase inference bug
      .update({ wallet_balance: newBalance, current_locked_table: gameId })
      .eq('id', teamId)

    if (updateError) {
      return { error: "Failed to deduct bet." }
    }

    // 3. Log transaction
    await supabaseAdmin.from('transactions').insert({
      team_id: teamId,
      amount: -amount,
      description: `Game Entry Fee`,
    } as any)

    return { success: true, newBalance }
  } catch {
    return { error: "System error placing bet." }
  }
}

// --- NEW: UNLOCK PLAYER ---
export async function unlockPlayer(teamId: string) {
  try {
    const { error } = await supabaseAdmin
      .from('teams')
      // @ts-expect-error: Next.js/Supabase inference bug
      .update({ current_locked_table: null })
      .eq('id', teamId)

    if (error) return { error: error.message }
    return { success: true }
  } catch {
    return { error: "System error unlocking player." }
  }
}

// --- NEW: FETCH TEAM HISTORY (Bypass RLS for Sidebar) ---
export async function fetchTeamHistory(teamId: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) return { error: error.message };
    return { history: data };
  } catch {
    return { error: "System error fetching history." };
  }
}

// --- NEW: ROUND 2 PORTAL & BETTING LOGIC ---
export async function updateRound2Status(teamId: string, inRound2: boolean = true) {
  const payload: any = { in_round_2: inRound2 }
  // @ts-expect-error: Next.js/Supabase inference bug
  await supabaseAdmin.from('teams').update(payload).eq('id', teamId)
}

export async function submitFinalBet(teamId: string, amount: number) {
  try {
    if (isNaN(amount) || amount < 500) {
      return { error: 'Minimum bet is 500 credits.' }
    }
    const { data, error: fetchErr } = await supabaseAdmin.from('teams').select('wallet_balance').eq('id', teamId).single()
    if (fetchErr || !data) return { error: 'Team not found.' }
    const team = data as any
    const newBalance = (team.wallet_balance || 0) - amount
    if (newBalance < 0) return { error: 'Insufficient funds. Minimum bet is 500 credits.' }

    const payload: any = {
      wallet_balance: newBalance,
      round_2_bet: amount,
      current_locked_table: 'final'
    }
    // @ts-expect-error: Next.js/Supabase inference bug
    const { error: updateErr } = await supabaseAdmin.from('teams').update(payload).eq('id', teamId)
    if (updateErr) return { error: 'Failed to record wager.' }

    // Log transaction
    const txPayload: any = {
      team_id: teamId,
      amount: -Math.abs(amount),
      description: `Final Round Wager: $${amount}`
    }
    await supabaseAdmin.from('transactions').insert(txPayload)

    return { success: true, newBalance }
  } catch (err: any) {
    return { error: err.message || 'System error placing final bet.' }
  }
}

// --- NEW: SPIN WHEEL LOGIC ---
export async function spinWheel(teamId: string, gameId: string) {
  console.log(`DEBUG: spinWheel called for teamId: ${teamId}, gameId: ${gameId}`)
  try {
    const { data, error: fetchErr } = await supabaseAdmin.from('teams').select('wallet_balance').eq('id', teamId).maybeSingle()
    console.log(`DEBUG: spinWheel fetch data:`, data, `fetchErr:`, fetchErr)
    const team = data as any
    if (!team) return { error: 'Team not found' }
    
    // In the final round, spin wheel is a free bonus multiplier included for all top 6 finalists
    const cost = gameId === 'final' ? 0 : 150
    const newBalance = (team.wallet_balance || 0) - cost
    if (newBalance < 0) return { error: 'Insufficient funds (150 Credits required for Wheel).' }

    const payload: any = { wallet_balance: newBalance, current_locked_table: gameId }
    // @ts-expect-error: Next.js/Supabase inference bug
    const { error: updateErr } = await supabaseAdmin.from('teams').update(payload).eq('id', teamId)
    console.log(`DEBUG: spinWheel updateErr:`, updateErr)

    if (cost > 0) {
      // Log transaction
      const txPayload: any = {
        team_id: teamId,
        amount: -cost,
        description: `Wheel Spin Fee for ${gameId.toUpperCase()}`
      }
      await supabaseAdmin.from('transactions').insert(txPayload)
    }

    return { success: true, newBalance }
  } catch (error: any) {
    return { error: error.message || 'System error processing spin.' }
  }
}

// --- NEW: AUTOMATED REWARD CLAIM ---
export async function claimAutomatedReward(teamId: string, payout: number, gameId: string) {
  console.log(`DEBUG: claimAutomatedReward called for teamId: ${teamId}, payout: ${payout}, gameId: ${gameId}`)
  try {
    const { data: teamData, error: fetchError } = await supabaseAdmin
      .from('teams')
      .select('wallet_balance, stamps')
      .eq('id', teamId)
      .single()
      .then(res => ({ data: res.data as any, error: res.error }));

    if (fetchError || !teamData) {
      return { error: "Failed to read wallet for reward." }
    }

    // Anti-double-claim check: ensure no identical transaction in the last 10 minutes
    const { data: recentTx } = await supabaseAdmin
      .from('transactions')
      .select('id, created_at')
      .eq('team_id', teamId)
      .eq('description', `Won ${gameId.toUpperCase()} Table (Automated)`)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const recentTxData = recentTx as any
    if (recentTxData) {
      const txTime = new Date(recentTxData.created_at).getTime();
      if (Date.now() - txTime < 5000) { // Reduced to 5 seconds to prevent double-click/strict-mode fires
         return { success: true, newBalance: teamData.wallet_balance };
      }
    }

    const newBalance = teamData.wallet_balance + payout;
    const stamps = (teamData.stamps as Record<string, boolean>) || {}
    stamps[gameId] = true
    
    // Update balance and stamps
    const { error: updateError } = await supabaseAdmin
      .from('teams')
      // @ts-expect-error: Next.js/Supabase inference bug
      .update({ wallet_balance: newBalance, stamps: stamps as any })
      .eq('id', teamId);

    if (updateError) {
      return { error: "Failed to apply reward." }
    }

    // Log transaction
    await supabaseAdmin.from('transactions').insert({
      team_id: teamId,
      amount: payout,
      description: `Won ${gameId.toUpperCase()} Table (Automated)`,
    } as any);

    return { success: true, newBalance };
  } catch {
    return { error: "System error claiming reward." };
  }
}

export async function buyClue(teamId: string, questionId: string, clueIndex: number) {
  const cost = (clueIndex + 1) * 50;
  
  const { data: teamData, error: teamErr } = await supabaseAdmin.from('teams').select('wallet_balance').eq('id', teamId).single();
  const team = teamData as any;
  if (teamErr || !team) return { error: 'Team not found' };
  
  if (team.wallet_balance < cost) {
    return { error: `Not enough coins. Need ${cost} coins.` };
  }

  const { data: question } = await supabaseAdmin.from('question_bank').select('test_cases').eq('id', questionId).maybeSingle();
  
  let actualClue = '';
  let cluesArray: string[] = [];
  const tc = (question as any)?.test_cases;
  if (tc) {
    if (Array.isArray(tc)) {
      // test_cases is just cases array
    } else if (typeof tc === 'object' && tc.clues && Array.isArray(tc.clues)) {
      cluesArray = tc.clues;
    }
  }

  if (!Array.isArray(cluesArray) || clueIndex >= cluesArray.length) {
    if (clueIndex >= 3) {
      return { error: 'No more clues available for this challenge!' };
    }
    actualClue = `[CLUE ${clueIndex + 1}] Check your logic against edge case constraints.`;
  } else {
    actualClue = cluesArray[clueIndex];
  }

  // @ts-expect-error: Next.js/Supabase inference bug
  const { error: updateErr } = await supabaseAdmin.from('teams').update({ wallet_balance: team.wallet_balance - cost } as any).eq('id', teamId);
  if (updateErr) return { error: 'Failed to deduct coins' };

  return { clue: actualClue };
}

export async function buyVaultClues(teamId: string, questionId: string, level: number) {
  const cost = level * 50;
  
  const { data: teamData, error: teamErr } = await supabaseAdmin.from('teams').select('wallet_balance').eq('id', teamId).single();
  const team = teamData as any;
  if (teamErr || !team) return { error: 'Team not found' };
  
  if (team.wallet_balance < cost) {
    return { error: `Not enough coins. Need ${cost} coins.` };
  }

  const { data: question } = await supabaseAdmin.from('question_bank').select('test_cases').eq('id', questionId).maybeSingle();
  
  const actualClues: string[] = [];
  let cluesArray: string[] = [];
  const tc = (question as any)?.test_cases;
  if (tc) {
    if (typeof tc === 'object' && !Array.isArray(tc) && tc.clues && Array.isArray(tc.clues)) {
      cluesArray = tc.clues;
    }
  }

  for (let i = 0; i < level; i++) {
    if (!Array.isArray(cluesArray) || i >= cluesArray.length) {
      actualClues.push(`[VAULT CLUE ${i + 1}] Consider an optimal data structure like a stack or priority queue.`);
    } else {
      actualClues.push(cluesArray[i]);
    }
  }

  // @ts-expect-error: Next.js/Supabase inference bug
  const { error: updateErr } = await supabaseAdmin.from('teams').update({ wallet_balance: team.wallet_balance - cost } as any).eq('id', teamId);
  if (updateErr) return { error: 'Failed to deduct coins' };

  return { clues: actualClues };
}
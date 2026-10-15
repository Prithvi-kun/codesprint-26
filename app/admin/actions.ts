'use server'
import { cookies } from 'next/headers'
import { unstable_noStore as noStore } from 'next/cache'
import { supabaseAdminRaw as supabaseAdmin } from '@/lib/supabase/server'
import { Json } from '@/lib/supabase/types'

// --- AUTH CHECK ---
function isAdminAuthenticated(): boolean {
    const cookieStore = cookies()
    return cookieStore.get('admin_session')?.value === 'authenticated'
}

// A write that "succeeds" but touches 0 rows means Row-Level Security blocked it,
// i.e. the server is NOT using the real service_role key (common on Vercel misconfig).
const RLS_BLOCKED = 'Database write was blocked (0 rows changed). The server is not using a valid SUPABASE_SERVICE_ROLE_KEY - check the Vercel env var and redeploy. Open /api/admin/health for details.'

// =============================================
// TAB A: "THE PIT" - Live Ops
// =============================================

export async function toggleRound2Portal(isOpen: boolean) {
    if (!isAdminAuthenticated()) return { error: 'UNAUTHORIZED' }

    const payload: any = { round_2_open: isOpen }
    const { error } = await supabaseAdmin
        .from('event_control')
        .update(payload)
        .eq('id', 1)

    if (error) return { error: error.message }
    return { success: true }
}

export async function setTableStatusState(gameId: string, status: string) {
    if (!isAdminAuthenticated()) return { error: 'UNAUTHORIZED' }

    const { data: currentEvent } = await supabaseAdmin
        .from('event_control')
        .select('table_timers')
        .eq('id', 1)
        .single()

    const currentTimers = (currentEvent?.table_timers && typeof currentEvent.table_timers === 'object')
        ? { ...(currentEvent.table_timers as Record<string, string>) }
        : {}

    const previousStatus = currentTimers[`${gameId}_status`]

    // Record when the specific table was paused
    if (status === 'PAUSED' && previousStatus !== 'PAUSED') {
        currentTimers[`${gameId}_paused_at`] = new Date().toISOString()
    }
    // If we're resuming, calculate how long we were paused and shift the start time
    else if (status === 'ACTIVE' && previousStatus === 'PAUSED') {
        const pausedAtStr = currentTimers[`${gameId}_paused_at`]
        if (pausedAtStr) {
            const pausedAt = new Date(pausedAtStr).getTime()
            const now = Date.now()
            const diff = now - pausedAt

            const currentStartStr = currentTimers[gameId]
            if (currentStartStr) {
                const currentStart = new Date(currentStartStr).getTime()
                currentTimers[gameId] = new Date(currentStart + diff).toISOString()
            }
            delete currentTimers[`${gameId}_paused_at`]
        }
    }

    currentTimers[`${gameId}_status`] = status

    const { data: evRows, error: eventErr } = await supabaseAdmin
        .from('event_control')
        .update({ table_timers: currentTimers } as any)
        .eq('id', 1)
        .select('id')

    if (eventErr) return { error: eventErr.message }
    if (!evRows || evRows.length === 0) return { error: RLS_BLOCKED }

    // If the Pit Boss explicitly KILLS the table, forcefully eject everyone and close it
    if (status === 'KILLED') {
        // 1. Mark table offline so no one else can join
        await supabaseAdmin
            .from('game_state')
            .update({ is_active: false } as any)
            .eq('game_id', gameId)

        // 2. Clear locked table state for all trapped players to eject them instantly
        await supabaseAdmin
            .from('teams')
            .update({ current_locked_table: null } as any)
            .eq('current_locked_table', gameId)
    }

    return { success: true }
}

export async function resetAllTeamLogins() {
    if (!isAdminAuthenticated()) return { error: 'UNAUTHORIZED' }
    const { error, data } = await supabaseAdmin
        .from('teams')
        .update({ is_logged_in: false, current_locked_table: null } as any)
        .or('current_locked_table.is.null,current_locked_table.neq.BANNED')
        .select('id')

    if (error) return { error: `Failed to reset team logins: ${error.message}` }
    return { success: true, count: data?.length || 0 }
}

export async function togglePause(isPaused: boolean) {
    if (!isAdminAuthenticated()) return { error: 'UNAUTHORIZED' }

    const { data: currentEvent } = await supabaseAdmin
        .from('event_control')
        .select('table_timers, is_paused')
        .eq('id', 1)
        .single()

    const currentTimers = (currentEvent?.table_timers && typeof currentEvent.table_timers === 'object')
        ? { ...(currentEvent.table_timers as Record<string, string>) }
        : {}

    if (isPaused && !currentEvent?.is_paused) {
        currentTimers['global_paused_at'] = new Date().toISOString()
    } else if (!isPaused && currentEvent?.is_paused) {
        const pausedAtStr = currentTimers['global_paused_at']
        if (pausedAtStr) {
            const pausedAt = new Date(pausedAtStr).getTime()
            const now = Date.now()
            const diff = now - pausedAt

            // Shift all game start times forward
            for (const key of Object.keys(currentTimers)) {
                // If the key is a gameId (doesn't contain an underscore)
                if (!key.includes('_')) {
                    const currentStartStr = currentTimers[key]
                    if (currentStartStr) {
                        const currentStart = new Date(currentStartStr).getTime()
                        currentTimers[key] = new Date(currentStart + diff).toISOString()
                    }
                }
            }
            delete currentTimers['global_paused_at']
        }
    }

    const { data: pauseRows, error } = await supabaseAdmin
        .from('event_control')
        .update({ is_paused: isPaused, table_timers: currentTimers } as any)
        .eq('id', 1)
        .select('id')

    if (error) return { error: error.message }
    if (!pauseRows || pauseRows.length === 0) return { error: RLS_BLOCKED }
    return { success: true, isPaused }
}

export async function setCurrentRound(roundName: string) {
    if (!isAdminAuthenticated()) return { error: 'UNAUTHORIZED' }

    const { error } = await supabaseAdmin
        .from('event_control')
        .update({ current_round: roundName } as any)
        .eq('id', 1)

    if (error) return { error: error.message }
    return { success: true }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function startTableRound(gameId: string, durationMins: number = 16) {
    if (!isAdminAuthenticated()) return { error: 'UNAUTHORIZED' }

    const normGame = gameId.toLowerCase()
    const now = new Date().toISOString()
    const pin = Math.floor(1000 + Math.random() * 9000).toString()

    // 0. Draw + activate this round's questions FIRST, so the moment the table
    //    is announced as ACTIVE (below) the questions already exist for the players.
    // Shut down previously active questions for THIS game table
    await supabaseAdmin
        .from('question_bank')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update({ is_active: false } as any)
        .eq('is_active', true)
        .ilike('game_type', normGame)

    // Select exactly 1 STANDARD and 1 HIGH unused question for THIS game table
    const difficulties = ['STANDARD', 'HIGH']
    const selectedIds: string[] = []

    for (const diff of difficulties) {
        let { data: qList } = await supabaseAdmin
            .from('question_bank')
            .select('id')
            .ilike('game_type', normGame)
            .ilike('difficulty', diff)
            .eq('is_used', false)

        // Auto-recycle: if all questions have been used, reset is_used flag so table never runs dry
        if (!qList || qList.length === 0) {
            await supabaseAdmin
                .from('question_bank')
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .update({ is_used: false } as any)
                .ilike('game_type', normGame)
                .ilike('difficulty', diff)

            const recycled = await supabaseAdmin
                .from('question_bank')
                .select('id')
                .ilike('game_type', normGame)
                .ilike('difficulty', diff)

            qList = recycled.data || []
        }

        if (qList && qList.length > 0) {
            const randomQ = qList[Math.floor(Math.random() * qList.length)]
            selectedIds.push(randomQ.id)
        }
    }

    // Activate the newly drawn questions AND mark them USED
    if (selectedIds.length > 0) {
        await supabaseAdmin
            .from('question_bank')
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .update({ is_active: true, is_used: true } as any)
            .in('id', selectedIds)
    }

    // 1. Fetch current table timers to preserve other active games
    const { data: currentEvent } = await supabaseAdmin
        .from('event_control')
        .select('table_timers')
        .eq('id', 1)
        .single()

    // Fallback if missing or not an object
    const currentTimers = (currentEvent?.table_timers && typeof currentEvent.table_timers === 'object')
        ? { ...(currentEvent.table_timers as Record<string, string>) }
        : {}

    // Force overwrite the timer, status, and pin for this table
    currentTimers[normGame] = now
    currentTimers[`${normGame}_status`] = 'ACTIVE'
    currentTimers[`${normGame}_pin`] = pin
    delete currentTimers[`${normGame}_paused_at`] // Clear any pause state

    // Also support uppercase key if referenced anywhere
    if (currentTimers[gameId] && gameId !== normGame) {
        delete currentTimers[gameId]
    }

    // Update the event_control table with the merged timers
    const { data: startRows, error: eventErr } = await supabaseAdmin
        .from('event_control')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update({ table_timers: currentTimers } as any)
        .eq('id', 1)
        .select('id')

    if (eventErr) return { error: `Failed to update event control: ${eventErr.message}` }
    if (!startRows || startRows.length === 0) return { error: RLS_BLOCKED }

    // Update the game_state table with the actual PIN text Native SQL storage
    let { error: upsertErr } = await supabaseAdmin
        .from('game_state')
        .upsert({ game_id: normGame, entry_pin: pin, is_active: true } as any)

    if (upsertErr) {
        // Fallback: attempt direct update if the row already exists
        const { error: updateErr } = await supabaseAdmin
            .from('game_state')
            .update({ entry_pin: pin, is_active: true } as any)
            .eq('game_id', normGame)
        if (!updateErr) {
            upsertErr = null
        }
    }

    if (upsertErr) return { error: `Failed to upsert game state: ${upsertErr.message}` }

    return { success: true, pin, startTime: now, gameId: normGame }
}

export async function restartTableTimerOnly(gameId: string) {
    if (!isAdminAuthenticated()) return { error: 'UNAUTHORIZED' }

    const normGame = gameId.toLowerCase()
    const now = new Date().toISOString()

    const { data: currentEvent } = await supabaseAdmin
        .from('event_control')
        .select('table_timers')
        .eq('id', 1)
        .single()

    const currentTimers = (currentEvent?.table_timers && typeof currentEvent.table_timers === 'object')
        ? { ...(currentEvent.table_timers as Record<string, string>) }
        : {}

    currentTimers[normGame] = now
    currentTimers[`${normGame}_status`] = 'ACTIVE'
    delete currentTimers[`${normGame}_paused_at`]

    const { error: eventErr } = await supabaseAdmin
        .from('event_control')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update({ table_timers: currentTimers } as any)
        .eq('id', 1)

    if (eventErr) return { error: `Failed to reset timer: ${eventErr.message}` }
    return { success: true, startTime: now, gameId: normGame }
}
// --- NEW: PIT BOSS MANUAL WIN VALIDATION ---
export async function awardWin(teamId: string, gameId: string) {
    if (!isAdminAuthenticated()) return { error: 'UNAUTHORIZED' }

    try {
        const winState = `WIN_${gameId.toUpperCase()}`

        // Perform the State Flag update to trigger the Success Modal on the client
        const { error: updateError } = await supabaseAdmin
            .from('teams')
            .update({
                current_locked_table: winState
            } as any)
            .eq('id', teamId)

        if (updateError) throw updateError

        return { success: true }
    } catch (err: any) {
        return { error: err.message || "Failed to award win." }
    }
}

export async function getEventState() {
    noStore();
    if (!isAdminAuthenticated()) return { error: 'UNAUTHORIZED' }

    const { data: control } = await supabaseAdmin
        .from('event_control')
        .select('*')
        .eq('id', 1)
        .single()

    const { data: rounds } = await supabaseAdmin
        .from('game_rounds')
        .select('*')
        .order('round_number')

    const { data: recentTx } = await supabaseAdmin
        .from('transactions')
        .select('*, teams(access_code)')
        .order('created_at', { ascending: false })
        .limit(20)

    const { data: activeTeams } = await supabaseAdmin
        .from('teams')
        .select('id, access_code, current_locked_table')
        .not('current_locked_table', 'is', null)

    const { data: gameStates } = await supabaseAdmin
        .from('game_state')
        .select('game_id, entry_pin')

    if (control && control.table_timers && gameStates) {
        const clonedTimers = { ...control.table_timers }
        gameStates.forEach((gs: any) => {
            if (gs.game_id && gs.entry_pin) {
                clonedTimers[`${gs.game_id}_pin`] = gs.entry_pin
            }
        })
        control.table_timers = clonedTimers
    }

    return { control, rounds, recentTx, activeTeams }
}

// =============================================
// TAB B: "THE VAULT" - Team Management
// =============================================

export async function getAllTeams() {
    if (!isAdminAuthenticated()) return { error: 'UNAUTHORIZED' }

    const { data, error } = await supabaseAdmin
        .from('teams')
        .select('*')
        .order('wallet_balance', { ascending: false })

    if (error) return { error: error.message }
    return { teams: data }
}

export async function adjustWallet(teamId: string, amount: number, reason: string) {
    if (!isAdminAuthenticated()) return { error: 'UNAUTHORIZED' }

    // Get current balance
    const { data: team } = await supabaseAdmin
        .from('teams')
        .select('wallet_balance')
        .eq('id', teamId)
        .single()

    if (!team) return { error: 'TEAM NOT FOUND' }

    const newBalance = team.wallet_balance + amount

    // Update wallet
    const { error: updateErr } = await supabaseAdmin
        .from('teams')
        .update({ wallet_balance: newBalance } as any)
        .eq('id', teamId)

    if (updateErr) return { error: updateErr.message }

    // Log transaction
    await supabaseAdmin.from('transactions').insert({
        team_id: teamId,
        amount,
        description: `[ADMIN] ${reason}`,
    })

    return { success: true, newBalance }
}

export async function sendWarning(teamId: string) {
    if (!isAdminAuthenticated()) return { error: 'UNAUTHORIZED' }

    // We broadcast the warning via Supabase Realtime
    // The client will listen for this on the 'admin_alerts' channel
    const { error } = await supabaseAdmin
        .from('teams')
        .update({ current_locked_table: 'WARNING' } as any)
        .eq('id', teamId)

    if (error) return { error: error.message }

    // Reset warning after storing it (the client reads it via realtime)
    setTimeout(async () => {
        await supabaseAdmin
            .from('teams')
            .update({ current_locked_table: null } as any)
            .eq('id', teamId)
    }, 100)

    return { success: true }
}

export async function banTeam(teamId: string) {
    if (!isAdminAuthenticated()) return { error: 'UNAUTHORIZED' }

    const { error } = await supabaseAdmin
        .from('teams')
        .update({
            current_locked_table: 'BANNED',
            wallet_balance: 0
        } as any)
        .eq('id', teamId)

    if (error) return { error: error.message }
    return { success: true }
}

export async function unbanTeam(teamId: string) {
    if (!isAdminAuthenticated()) return { error: 'UNAUTHORIZED' }

    const { error } = await supabaseAdmin
        .from('teams')
        .update({ current_locked_table: null } as any)
        .eq('id', teamId)

    if (error) return { error: error.message }
    return { success: true }
}

export async function toggleStamp(teamId: string, game: string) {
    if (!isAdminAuthenticated()) return { error: 'UNAUTHORIZED' }

    // Fetch latest stamps from DB to prevent race conditions
    const { data: teamData } = await supabaseAdmin.from('teams').select('stamps').eq('id', teamId).single()
    if (!teamData) return { error: 'Team not found' }

    const stamps = (teamData.stamps as Record<string, boolean>) || {}
    stamps[game] = !stamps[game]

    const { error } = await supabaseAdmin
        .from('teams')
        .update({ stamps: stamps as unknown as Json } as any)
        .eq('id', teamId)

    if (error) return { error: error.message }

    // Log transaction for badge
    await supabaseAdmin.from('transactions').insert({
        team_id: teamId,
        amount: 0,
        description: `[ADMIN] Toggled Badge: ${game.toUpperCase()}`,
    } as any)

    return { success: true, stamps }
}

export async function createTeam(accessCode: string, initialBalance = 100) {
    if (!isAdminAuthenticated()) return { error: 'UNAUTHORIZED' }

    // Check if code exists
    const { data: existing } = await supabaseAdmin
        .from('teams')
        .select('id')
        .eq('access_code', accessCode)
        .maybeSingle()

    if (existing) return { error: 'CODE ALREADY EXISTS' }

    const { data, error } = await supabaseAdmin
        .from('teams')
        .insert({
            access_code: accessCode,
            wallet_balance: initialBalance,
            stamps: {},
            avatar_id: Math.floor(Math.random() * 25) + 1 // Assign random avatar initially
        })
        .select()
        .single()

    if (error) return { error: error.message }
    return { success: true, team: data }
}

// =============================================
// TAB C: "THE DECK" - Question Management
// =============================================

export async function getAllQuestions() {
    if (!isAdminAuthenticated()) return { error: 'UNAUTHORIZED' }

    const { data, error } = await supabaseAdmin
        .from('question_bank')
        .select('*')
        .order('game_type')

    if (error) return { error: error.message }
    return { questions: data }
}

export async function toggleQuestion(questionId: string, isActive: boolean) {
    if (!isAdminAuthenticated()) return { error: 'UNAUTHORIZED' }

    const { error } = await supabaseAdmin
        .from('question_bank')
        .update({ is_active: isActive } as any)
        .eq('id', questionId)

    if (error) return { error: error.message }
    return { success: true }
}

export async function burnQuestion(questionId: string) {
    if (!isAdminAuthenticated()) return { error: 'UNAUTHORIZED' }

    const { error } = await supabaseAdmin
        .from('question_bank')
        .update({ is_used: true } as any)
        .eq('id', questionId)

    if (error) return { error: error.message }
    return { success: true }
}

export async function reshuffleAllQuestions() {
    if (!isAdminAuthenticated()) return { error: 'UNAUTHORIZED' }

    const { error } = await supabaseAdmin
        .from('question_bank')
        .update({ is_used: false } as any)
        .neq('id', '00000000-0000-0000-0000-000000000000') // Update all rows

    if (error) return { error: error.message }
    return { success: true }
}

function formatQuestionPayload(q: any, defaultGameType?: string, defaultDifficulty?: string) {
    // 1. Detect game_type
    let gType = (q.game_type || defaultGameType || '').toUpperCase()
    if (!gType && q.title) {
        const titleLower = q.title.toLowerCase()
        if (titleLower.includes('slots')) gType = 'SLOTS'
        else if (titleLower.includes('roulette')) gType = 'ROULETTE'
        else if (titleLower.includes('blackjack')) gType = 'BLACKJACK'
        else if (titleLower.includes('craps')) gType = 'CRAPS'
        else if (titleLower.includes('poker')) gType = 'POKER'
        else if (titleLower.includes('baccarat')) gType = 'BACCARAT'
        else if (titleLower.includes('dice')) gType = 'DICE'
        else if (titleLower.includes('high card') || titleLower.includes('highcard')) gType = 'HIGHCARD'
        else if (titleLower.includes('coin flip') || titleLower.includes('coinflip')) gType = 'COINFLIP'
        else if (titleLower.includes('vault')) gType = 'VAULT'
        else if (titleLower.includes('final')) gType = 'FINAL'
    }
    if (!gType) gType = 'SLOTS'

    // 2. Detect difficulty
    let diff = (q.difficulty || defaultDifficulty || 'STANDARD').toUpperCase()
    if (diff !== 'HIGH' && diff !== 'STANDARD') diff = 'STANDARD'

    // 3. Format test_cases jsonb
    const rawTestCases = q.test_cases
    const casesArray = Array.isArray(rawTestCases) ? rawTestCases : (rawTestCases?.cases || [])
    const clues = q.clues || (rawTestCases && !Array.isArray(rawTestCases) ? rawTestCases.clues : []) || []
    const options = q.options || (rawTestCases && !Array.isArray(rawTestCases) ? rawTestCases.options : null) || null
    const expectedOutput = q.expected_output || (rawTestCases && !Array.isArray(rawTestCases) ? rawTestCases.expected_output : null) || (casesArray[0]?.expected ?? null)

    const testCasesPayload = {
        cases: casesArray,
        clues: clues,
        options: options,
        expected_output: expectedOutput,
        correct_option: q.correct_option || null,
        solution_python: q.solution_python || null,
        solution_c: q.solution_c || null,
    }

    return {
        title: q.title || 'Untitled',
        problem_statement: q.description || q.problem_statement || '',
        starter_code: q.starter || q.starter_code || '# Write your solution here\n',
        test_cases: testCasesPayload,
        constraints: q.constraints || '',
        game_type: gType,
        difficulty: diff,
        is_active: q.is_active !== undefined ? q.is_active : true,
        is_used: false
    }
}

export async function bulkUploadQuestions(questionsJson: string) {
    if (!isAdminAuthenticated()) return { error: 'UNAUTHORIZED' }

    try {
        let questions = JSON.parse(questionsJson)

        if (!Array.isArray(questions)) {
            if (typeof questions === 'object' && questions !== null) {
                questions = [questions]
            } else {
                return { error: 'JSON must be an object or an array' }
            }
        }

        const formattedQuestions = questions.map((q: any) => formatQuestionPayload(q))

        // Insert in chunks of 50 to prevent timeouts/limits
        const BATCH_SIZE = 50
        for (let i = 0; i < formattedQuestions.length; i += BATCH_SIZE) {
            const chunk = formattedQuestions.slice(i, i + BATCH_SIZE)
            const { error } = await supabaseAdmin
                .from('question_bank')
                .insert(chunk)
            if (error) return { error: `Batch insert error (items ${i + 1}-${i + chunk.length}): ${error.message}` }
        }

        return { success: true, count: formattedQuestions.length }
    } catch (e: any) {
        return { error: e.message || 'INVALID JSON FORMAT' }
    }
}

export async function uploadDefaultQuestionBank() {
    if (!isAdminAuthenticated()) return { error: 'UNAUTHORIZED' }
    try {
        const fs = await import('fs')
        const path = await import('path')
        const filePath = path.join(process.cwd(), 'questions_all_tables_complete.json')
        if (!fs.existsSync(filePath)) {
            return { error: 'questions_all_tables_complete.json file not found on server.' }
        }
        const content = fs.readFileSync(filePath, 'utf8')
        return await bulkUploadQuestions(content)
    } catch (err: any) {
        return { error: err.message || 'Failed to read questions_all_tables_complete.json' }
    }
}

export async function purgeAllQuestions() {
    if (!isAdminAuthenticated()) return { error: 'UNAUTHORIZED' }
    const { error } = await supabaseAdmin
        .from('question_bank')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')
    if (error) return { error: error.message }
    return { success: true }
}


export async function uploadQuestionsForTable(gameType: string, difficulty: string, questionsJson: string) {
    if (!isAdminAuthenticated()) return { error: 'UNAUTHORIZED' }

    try {
        let questions = JSON.parse(questionsJson)

        if (!Array.isArray(questions)) {
            if (typeof questions === 'object' && questions !== null) {
                questions = [questions]
            } else {
                return { error: 'JSON must be an object or an array' }
            }
        }

        const formattedQuestions = questions.map((q: any) => formatQuestionPayload(q, gameType, difficulty))

        const { error } = await supabaseAdmin
            .from('question_bank')
            .insert(formattedQuestions)

        if (error) return { error: error.message }
        return { success: true, count: formattedQuestions.length }
    } catch {
        return { error: 'INVALID JSON FORMAT' }
    }
}

export async function deleteQuestion(questionId: string) {
    if (!isAdminAuthenticated()) return { error: 'UNAUTHORIZED' }

    const { error } = await supabaseAdmin
        .from('question_bank')
        .delete()
        .eq('id', questionId)

    if (error) return { error: error.message }
    return { success: true }
}

export async function deleteAllQuestionsForTable(gameType: string, difficulty?: string) {
    if (!isAdminAuthenticated()) return { error: 'UNAUTHORIZED' }

    let query = supabaseAdmin
        .from('question_bank')
        .delete()
        .ilike('game_type', gameType)

    if (difficulty) {
        query = query.ilike('difficulty', difficulty)
    }

    const { error } = await query

    if (error) return { error: error.message }
    return { success: true }
}

// =============================================
// TAB D: "THE EYE" - Analytics
// =============================================

export async function getLeaderboard() {
    if (!isAdminAuthenticated()) return { error: 'UNAUTHORIZED' }

    const { data, error } = await supabaseAdmin
        .from('teams')
        .select('id, access_code, wallet_balance, stamps, avatar_id')
        .order('wallet_balance', { ascending: false })
        .limit(50)

    if (error) return { error: error.message }
    return { leaderboard: data }
}

export async function getAnalytics() {
    if (!isAdminAuthenticated()) return { error: 'UNAUTHORIZED' }

    const { data: teams } = await supabaseAdmin
        .from('teams')
        .select('wallet_balance')

    const totalEconomy = teams?.reduce((sum: number, t: any) => sum + t.wallet_balance, 0) || 0
    const avgBalance = teams?.length ? totalEconomy / teams.length : 0
    const maxBalance = teams?.reduce((max: number, t: any) => Math.max(max, t.wallet_balance), 0) || 0
    const minBalance = teams?.reduce((min: number, t: any) => Math.min(min, t.wallet_balance), Infinity) || 0

    return {
        totalEconomy,
        avgBalance: Math.round(avgBalance),
        maxBalance,
        minBalance: minBalance === Infinity ? 0 : minBalance,
        teamCount: teams?.length || 0,
    }
}

// =============================================
// SUGGESTIONS: Broadcast & Difficulty
// =============================================

export async function broadcastMessage(message: string) {
    if (!isAdminAuthenticated()) return { error: 'UNAUTHORIZED' }

    // We use the event_control table to store the broadcast message
    // The client-side will subscribe to changes on this table
    const { error } = await supabaseAdmin
        .from('event_control')
        .update({ current_round: `BROADCAST:${Date.now()}:${message}` } as any)
        .eq('id', 1)

    if (error) return { error: error.message }
    return { success: true }
}

export async function forceWin(teamId: string, gameType: string, amount: number) {
    if (!isAdminAuthenticated()) return { error: 'UNAUTHORIZED' }

    // Add credits
    const { data: team } = await supabaseAdmin
        .from('teams')
        .select('wallet_balance, stamps')
        .eq('id', teamId)
        .single()

    if (!team) return { error: 'TEAM NOT FOUND' }

    const newBalance = team.wallet_balance + amount
    const stamps = (team.stamps as Record<string, boolean>) || {}
    stamps[gameType] = true

    const { error } = await supabaseAdmin
        .from('teams')
        .update({
            wallet_balance: newBalance,
            stamps: stamps as unknown as Json,
        } as any)
        .eq('id', teamId)

    if (error) return { error: error.message }

    // Log it
    await supabaseAdmin.from('transactions').insert({
        team_id: teamId,
        amount,
        description: `[ADMIN FORCE WIN] ${gameType}`,
    })

    return { success: true, newBalance }
}


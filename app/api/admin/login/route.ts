import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export type DealerRole =
    | 'pitboss'
    | 'slots'
    | 'roulette'
    | 'blackjack'
    | 'craps'
    | 'poker'
    | 'baccarat'
    | 'dice'
    | 'highcard'
    | 'coinflip'
    | 'vault'

interface AccountConfig {
    role: DealerRole
    label: string
    table?: string
}

export const DEALER_ACCOUNTS: Record<string, AccountConfig> = {
    // --- MASTER PIT BOSS (Alpha & Omega) ---
    'PITBOSS-ALPHA': { role: 'pitboss', label: 'Pit Boss Alpha (Master HQ)' },
    'PITBOSS-OMEGA': { role: 'pitboss', label: 'Pit Boss Omega (Master HQ)' },
    'PITBOSS':       { role: 'pitboss', label: 'Pit Boss Alpha (Master HQ)' },
    'ALPHA':         { role: 'pitboss', label: 'Pit Boss Alpha (Master HQ)' },

    // --- 10 DEDICATED TABLE DEALER LOGINS ---
    'DEALER-SLOTS':     { role: 'slots', label: 'Slots Dealer', table: 'slots' },
    'ADMIN-SLOTS':      { role: 'slots', label: 'Slots Dealer', table: 'slots' },
    'SLOTS':            { role: 'slots', label: 'Slots Dealer', table: 'slots' },

    'DEALER-ROULETTE':  { role: 'roulette', label: 'Roulette Dealer', table: 'roulette' },
    'ADMIN-ROULETTE':   { role: 'roulette', label: 'Roulette Dealer', table: 'roulette' },
    'ROULETTE':         { role: 'roulette', label: 'Roulette Dealer', table: 'roulette' },

    'DEALER-BLACKJACK': { role: 'blackjack', label: 'Blackjack Dealer', table: 'blackjack' },
    'ADMIN-BLACKJACK':  { role: 'blackjack', label: 'Blackjack Dealer', table: 'blackjack' },
    'BLACKJACK':        { role: 'blackjack', label: 'Blackjack Dealer', table: 'blackjack' },

    'DEALER-CRAPS':     { role: 'craps', label: 'Craps Dealer', table: 'craps' },
    'ADMIN-CRAPS':      { role: 'craps', label: 'Craps Dealer', table: 'craps' },
    'CRAPS':            { role: 'craps', label: 'Craps Dealer', table: 'craps' },

    'DEALER-POKER':     { role: 'poker', label: 'Poker Dealer', table: 'poker' },
    'ADMIN-POKER':      { role: 'poker', label: 'Poker Dealer', table: 'poker' },
    'POKER':            { role: 'poker', label: 'Poker Dealer', table: 'poker' },

    'DEALER-BACCARAT':  { role: 'baccarat', label: 'Baccarat Dealer', table: 'baccarat' },
    'ADMIN-BACCARAT':   { role: 'baccarat', label: 'Baccarat Dealer', table: 'baccarat' },
    'BACCARAT':         { role: 'baccarat', label: 'Baccarat Dealer', table: 'baccarat' },

    'DEALER-DICE':      { role: 'dice', label: 'Dice Dealer', table: 'dice' },
    'ADMIN-DICE':       { role: 'dice', label: 'Dice Dealer', table: 'dice' },
    'DICE':             { role: 'dice', label: 'Dice Dealer', table: 'dice' },

    'DEALER-HIGHCARD':  { role: 'highcard', label: 'High Card Dealer', table: 'highcard' },
    'ADMIN-HIGHCARD':   { role: 'highcard', label: 'High Card Dealer', table: 'highcard' },
    'HIGHCARD':         { role: 'highcard', label: 'High Card Dealer', table: 'highcard' },
    'HIGH-CARD':        { role: 'highcard', label: 'High Card Dealer', table: 'highcard' },

    'DEALER-COINFLIP':  { role: 'coinflip', label: 'Coin Flip Dealer', table: 'coinflip' },
    'ADMIN-COINFLIP':   { role: 'coinflip', label: 'Coin Flip Dealer', table: 'coinflip' },
    'COINFLIP':         { role: 'coinflip', label: 'Coin Flip Dealer', table: 'coinflip' },
    'COIN-FLIP':        { role: 'coinflip', label: 'Coin Flip Dealer', table: 'coinflip' },

    'DEALER-VAULT':     { role: 'vault', label: 'Vault Dealer', table: 'vault' },
    'ADMIN-VAULT':      { role: 'vault', label: 'Vault Dealer', table: 'vault' },
    'VAULT':            { role: 'vault', label: 'Vault Dealer', table: 'vault' },
}

export async function POST(request: Request) {
    try {
        const { code } = await request.json()

        if (!code) {
            return NextResponse.json({ success: false, error: 'DEALER CODE REQUIRED' })
        }

        const normalizedCode = code.trim().toUpperCase().replace(/[\s_]+/g, '-')
        const account = DEALER_ACCOUNTS[normalizedCode]

        if (!account) {
            return NextResponse.json({
                success: false,
                error: `ACCESS DENIED: Unknown code "${code}". Use PITBOSS-ALPHA or DEALER-<TABLENAME>.`
            })
        }

        // Set admin session cookies
        const cookieStore = cookies()
        cookieStore.set('admin_session', 'authenticated', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 12, // 12 hours
            path: '/',
        })

        cookieStore.set('admin_role', account.role, {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 12,
            path: '/',
        })

        cookieStore.set('admin_label', account.label, {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 12,
            path: '/',
        })

        return NextResponse.json({
            success: true,
            role: account.role,
            label: account.label,
            table: account.table || null
        })
    } catch {
        return NextResponse.json({ success: false, error: 'SYSTEM ERROR' })
    }
}

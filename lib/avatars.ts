// lib/avatars.ts

export interface AvatarInfo {
  id: number
  seed: string
  name: string
  code: string
  teamNum: number
  isTest?: boolean
}

export const AVATAR_LIST: AvatarInfo[] = [
  { id: 1,  seed: 'Padrino',     name: 'El Padrino',           code: 'EL_PADRINO',          teamNum: 1 },
  { id: 2,  seed: 'Bandidos',    name: 'Los Bandidos',         code: 'LOS_BANDIDOS',        teamNum: 2 },
  { id: 3,  seed: 'Sinaloa',     name: 'Sinaloa Cartel',       code: 'SINALOA_CARTEL',      teamNum: 3 },
  { id: 4,  seed: 'Tijuana',     name: 'Tijuana Hustlers',     code: 'TIJUANA_HUSTLERS',    teamNum: 4 },
  { id: 5,  seed: 'Diablos',     name: 'Los Diablos',          code: 'LOS_DIABLOS',         teamNum: 5 },
  { id: 6,  seed: 'CosaNostra',  name: 'La Cosa Nostra',       code: 'LA_COSA_NOSTRA',      teamNum: 6 },
  { id: 7,  seed: 'CartelSol',   name: 'Cartel del Sol',       code: 'CARTEL_DEL_SOL',      teamNum: 7 },
  { id: 8,  seed: 'Sicarios',    name: 'Los Sicarios',         code: 'LOS_SICARIOS',        teamNum: 8 },
  { id: 9,  seed: 'ElCapo',      name: 'El Capo',              code: 'EL_CAPO',             teamNum: 9 },
  { id: 10, seed: 'Medellin',    name: 'Medellín Mob',         code: 'MEDELLIN_MOB',        teamNum: 10 },
  { id: 11, seed: 'Matadores',   name: 'Los Matadores',        code: 'LOS_MATADORES',       teamNum: 11 },
  { id: 12, seed: 'VegasLocos',  name: 'Vegas Locos',          code: 'VEGAS_LOCOS',         teamNum: 12 },
  { id: 13, seed: 'MonteCarlo',  name: 'Monte Carlo Mafia',    code: 'MONTE_CARLO_MAFIA',   teamNum: 13 },
  { id: 14, seed: 'Pistoleros',  name: 'Los Pistoleros',       code: 'LOS_PISTOLEROS',      teamNum: 14 },
  { id: 15, seed: 'Havana',      name: 'Havana Syndicate',     code: 'HAVANA_SYNDICATE',    teamNum: 15 },
  { id: 16, seed: 'DiabloRojo',  name: 'El Diablo Rojo',       code: 'EL_DIABLO_ROJO',      teamNum: 16 },
  { id: 17, seed: 'Guadalajara', name: 'Guadalajara Kings',    code: 'GUADALAJARA_KINGS',   teamNum: 17 },
  { id: 18, seed: 'Fantasmas',   name: 'Los Fantasmas',        code: 'LOS_FANTASMAS',       teamNum: 18 },
  { id: 19, seed: 'Corleone',    name: 'Don Corleone',         code: 'DON_CORLEONE',        teamNum: 19 },
  { id: 20, seed: 'Sonora',      name: 'Sonora Outlaws',       code: 'SONORA_OUTLAWS',      teamNum: 20 },
  { id: 21, seed: 'Casablanca',  name: 'Casablanca Cartel',    code: 'CASABLANCA_CARTEL',   teamNum: 21 },
  { id: 22, seed: 'VatosLocos',  name: 'Los Vatos Locos',      code: 'LOS_VATOS_LOCOS',     teamNum: 22 },
  { id: 23, seed: 'Boricua',     name: 'Boricua Royals',       code: 'BORICUA_ROYALS',      teamNum: 23 },
  { id: 24, seed: 'Renegados',   name: 'Los Renegados',        code: 'LOS_RENEGADOS',       teamNum: 24 },
  { id: 25, seed: 'Juarez',      name: 'Juárez Desperados',    code: 'JUAREZ_DESPERADOS',   teamNum: 25 },
  { id: 26, seed: 'ElPatron',    name: 'El Patrón',            code: 'EL_PATRON',           teamNum: 26 },
  { id: 27, seed: 'Durango',     name: 'Durango Vipers',       code: 'DURANGO_VIPERS',      teamNum: 27 },
  { id: 28, seed: 'Cazadores',   name: 'Los Cazadores',        code: 'LOS_CAZADORES',       teamNum: 28 },
  { id: 29, seed: 'Oaxaca',      name: 'Oaxaca Shadows',       code: 'OAXACA_SHADOWS',      teamNum: 29 },
  { id: 30, seed: 'Cancun',      name: 'Cancún High Rollers',  code: 'CANCUN_ROLLERS',      teamNum: 30 },
  { id: 31, seed: 'Inspector',   name: 'El Inspector',         code: 'TEST_EL_INSPECTOR',   teamNum: 31, isTest: true },
  { id: 32, seed: 'PitBoss',     name: 'Pit Boss Mafia',       code: 'TEST_PIT_BOSS',       teamNum: 32, isTest: true }
]

export const getAvatarUrl = (seed: string) =>
  `https://api.dicebear.com/9.x/pixel-art/svg?seed=${seed}&backgroundColor=b6e3f4`
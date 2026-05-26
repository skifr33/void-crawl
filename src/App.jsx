import { useState, useEffect, useRef, useCallback } from 'react'

// ─── Constants ────────────────────────────────────────────────────────────────

const W = 24, H = 24, TS = 14;

const DECKS = {
  1: { name: 'DOCKING RING',  biofog: false },
  2: { name: 'CREW QUARTERS', biofog: false },
  3: { name: 'MEDICAL BAY',   biofog: true  },
};

const ENEMY_DEFS = {
  shambler:          { name: 'SHAMBLER',          hp: 4,  atk: 3, decks: [1,2,3] },
  drone_sentry:      { name: 'DRONE SENTRY',      hp: 3,  atk: 4, decks: [1,2,3], ranged: true },
  void_hound:        { name: 'VOID HOUND',        hp: 5,  atk: 5, decks: [1,2,3] },
  augment_berserker: { name: 'AUGMENT BERSERKER', hp: 8,  atk: 6, decks: [2,3] },
  phantom_echo:      { name: 'PHANTOM ECHO',      hp: 6,  atk: 7, decks: [3], phase: true },
};

const ENEMY_CHAR = {
  shambler: 'S', drone_sentry: 'D', void_hound: 'V',
  augment_berserker: 'A', phantom_echo: 'P',
};

const PORTAL_TABLE = [
  'HULL BREACH — lose 3 HP',
  'SIGNAL SCRAMBLE — next roll is Signal Lost',
  'VOID SURGE — all enemies +2 ATK this room',
  'POWER DRAIN — lose 2 Power Cells',
  'TEMPORAL SLIP — skip next action',
  'FRAGMENT RAIN — gain 1 Corrupted Fragment',
  'ECHO BREACH — Phantom Echo materialises',
  'STATIC FLOOD — fog resets in last room',
  'SHARD SCATTER — gain 2 Data Shards',
  'CRITICAL UPLINK — next roll auto-succeeds',
  'HULL BREACH — lose 3 HP',
  'POWER DRAIN — lose 2 Power Cells',
  'FRAGMENT RAIN — gain 1 Corrupted Fragment',
  'SIGNAL SCRAMBLE — next roll is Signal Lost',
  'VOID SURGE — enemies agitated',
  'SHARD SCATTER — gain 2 Data Shards',
  'STATIC FLOOD — fog resets in last room',
  'TEMPORAL SLIP — skip next action',
  'ECHO BREACH — Phantom Echo materialises',
  'CRITICAL UPLINK — next roll auto-succeeds',
];

// ─── Item Catalog ─────────────────────────────────────────────────────────────
// effect keys: heal|maxhp|cells|shards|phaseRestore|forceCrit|dmgBuff|defense (equip)|dmgBonus (equip)

const ITEMS = {
  // ── FOOD (consumables) ──────────────────────────────────────────────────────
  nutrient_paste:      { name:'NUTRIENT PASTE',       cat:'food', tier:1, price:1, desc:'Restore 2 HP',                  fx:{heal:2} },
  ration_pack:         { name:'RATION PACK',           cat:'food', tier:1, price:1, desc:'Restore 3 HP',                  fx:{heal:3} },
  protein_slab:        { name:'PROTEIN SLAB',          cat:'food', tier:1, price:2, desc:'Restore 4 HP',                  fx:{heal:4} },
  energy_gel:          { name:'ENERGY GEL',            cat:'food', tier:1, price:2, desc:'Restore 2 HP, +2 cells',        fx:{heal:2,cells:2} },
  void_fungi:          { name:'VOID FUNGI',            cat:'food', tier:1, price:1, desc:'Restore 3 HP',                  fx:{heal:3} },
  synth_coffee:        { name:'SYNTH-COFFEE',          cat:'food', tier:1, price:1, desc:'Restore 1 HP',                  fx:{heal:1} },
  cryo_ration:         { name:'CRYO-RATION',           cat:'food', tier:1, price:2, desc:'Restore 4 HP',                  fx:{heal:4} },
  station_gruel:       { name:'STATION GRUEL',         cat:'food', tier:1, price:1, desc:'Restore 2 HP',                  fx:{heal:2} },
  recycled_protein:    { name:'RECYCLED PROTEIN',      cat:'food', tier:1, price:1, desc:'Restore 3 HP',                  fx:{heal:3} },
  combat_ration_a:     { name:'COMBAT RATION A',       cat:'food', tier:1, price:2, desc:'Restore 5 HP',                  fx:{heal:5} },
  hydroponics_pack:    { name:'HYDROPONICS PACK',      cat:'food', tier:1, price:2, desc:'Restore 4 HP',                  fx:{heal:4} },
  bio_capsule:         { name:'BIO-CAPSULE',           cat:'food', tier:1, price:2, desc:'Restore 3 HP',                  fx:{heal:3} },
  glucose_shot:        { name:'GLUCOSE SHOT',          cat:'food', tier:1, price:1, desc:'Restore 2 HP',                  fx:{heal:2} },
  iron_ration:         { name:'IRON RATION',           cat:'food', tier:1, price:2, desc:'Restore 5 HP',                  fx:{heal:5} },
  mold_biscuit:        { name:'MOLD BISCUIT',          cat:'food', tier:1, price:1, desc:'Restore 2 HP',                  fx:{heal:2} },
  synthetic_broth:     { name:'SYNTHETIC BROTH',       cat:'food', tier:1, price:1, desc:'Restore 3 HP',                  fx:{heal:3} },
  nutrient_block:      { name:'NUTRIENT BLOCK',        cat:'food', tier:1, price:2, desc:'Restore 4 HP',                  fx:{heal:4} },
  protein_strip:       { name:'PROTEIN STRIP',         cat:'food', tier:1, price:1, desc:'Restore 2 HP',                  fx:{heal:2} },
  void_water:          { name:'VOID WATER',            cat:'food', tier:1, price:1, desc:'Restore 2 HP, +1 shard',        fx:{heal:2,shards:1} },
  medi_spray:          { name:'MEDI-SPRAY',            cat:'food', tier:2, price:3, desc:'Restore 6 HP',                  fx:{heal:6} },
  nano_repair_kit:     { name:'NANO-REPAIR KIT',       cat:'food', tier:2, price:4, desc:'Restore 8 HP',                  fx:{heal:8} },
  cellular_booster:    { name:'CELLULAR BOOSTER',      cat:'food', tier:2, price:5, desc:'Restore 10 HP',                 fx:{heal:10} },
  bioelectric_broth:   { name:'BIOELECTRIC BROTH',     cat:'food', tier:2, price:3, desc:'Restore 7 HP',                  fx:{heal:7} },
  synth_meat:          { name:'SYNTH-MEAT RATION',     cat:'food', tier:2, price:4, desc:'Restore 8 HP',                  fx:{heal:8} },
  quantum_nutrient:    { name:'QUANTUM NUTRIENT',      cat:'food', tier:2, price:4, desc:'Restore 8 HP, +1 shard',        fx:{heal:8,shards:1} },
  cascade_stim:        { name:'CASCADE STIM',          cat:'food', tier:2, price:4, desc:'Restore 7 HP',                  fx:{heal:7} },
  void_bloom_extract:  { name:'VOID BLOOM EXTRACT',    cat:'food', tier:2, price:5, desc:'Restore 10 HP',                 fx:{heal:10} },
  phase_serum:         { name:'PHASE SERUM',           cat:'food', tier:2, price:5, desc:'Restore 6 HP, reset Phase Step',fx:{heal:6,phaseRestore:true} },
  neural_stim:         { name:'NEURAL STIM',           cat:'food', tier:2, price:4, desc:'Restore 5 HP, next atk +3',     fx:{heal:5,dmgBuff:3} },
  adrenaline_shot:     { name:'ADRENALINE SHOT',       cat:'food', tier:2, price:4, desc:'Restore 5 HP, next atk +2',     fx:{heal:5,dmgBuff:2} },
  stasis_pill:         { name:'STASIS PILL',           cat:'food', tier:2, price:4, desc:'Restore 8 HP',                  fx:{heal:8} },
  cryo_inject:         { name:'CRYO-INJECT',           cat:'food', tier:2, price:4, desc:'Restore 9 HP',                  fx:{heal:9} },
  dark_spore_tea:      { name:'DARK SPORE TEA',        cat:'food', tier:2, price:3, desc:'Restore 8 HP',                  fx:{heal:8} },
  void_extract:        { name:'VOID EXTRACT',          cat:'food', tier:2, price:5, desc:'Restore 10 HP',                 fx:{heal:10} },
  regen_protocol:      { name:'REGEN PROTOCOL',        cat:'food', tier:3, price:7, desc:'Restore 15 HP',                 fx:{heal:15} },
  full_restore:        { name:'FULL RESTORE',          cat:'food', tier:3, price:10,desc:'Restore to full HP',             fx:{healFull:true} },
  void_ambrosia:       { name:'VOID AMBROSIA',         cat:'food', tier:3, price:8, desc:'Restore 12 HP',                 fx:{heal:12} },
  quantum_heal:        { name:'QUANTUM HEAL',          cat:'food', tier:3, price:9, desc:'Restore 14 HP',                 fx:{heal:14} },
  phase_restore:       { name:'PHASE RESTORE',         cat:'food', tier:3, price:8, desc:'Restore 12 HP, reset Phase Step',fx:{heal:12,phaseRestore:true} },
  battle_brew:         { name:'BATTLE BREW',           cat:'food', tier:3, price:8, desc:'Restore 10 HP, next atk +4',    fx:{heal:10,dmgBuff:4} },
  combat_cocktail:     { name:'COMBAT COCKTAIL',       cat:'food', tier:3, price:9, desc:'Restore 8 HP, next atk +3',     fx:{heal:8,dmgBuff:3} },
  corruption_purge:    { name:'CORRUPTION PURGE',      cat:'food', tier:3, price:8, desc:'Restore 10 HP, -1 corruption',  fx:{heal:10,corruption:-1} },
  cellular_rebuild:    { name:'CELLULAR REBUILD',      cat:'food', tier:3, price:9, desc:'+3 max HP permanently',         fx:{maxhp:3} },
  neural_override:     { name:'NEURAL OVERRIDE',       cat:'food', tier:3, price:9, desc:'Next Signal Lost → Crit Uplink',fx:{forceCrit:true} },
  echo_suppressant:    { name:'ECHO SUPPRESSANT',      cat:'food', tier:3, price:7, desc:'Restore 12 HP',                 fx:{heal:12} },
  void_core_extract:   { name:'VOID CORE EXTRACT',     cat:'food', tier:3, price:9, desc:'Restore 15 HP',                 fx:{heal:15} },
  prime_biomass:       { name:'PRIME BIOMASS',         cat:'food', tier:3, price:9, desc:'Restore 16 HP',                 fx:{heal:16} },
  omega_ration:        { name:'OMEGA RATION',          cat:'food', tier:3, price:12,desc:'Restore 20 HP',                 fx:{heal:20} },
  signal_booster_food: { name:'SIGNAL BOOSTER',        cat:'food', tier:3, price:8, desc:'Restore 8 HP, reset Phase Step',fx:{heal:8,phaseRestore:true} },
  dark_matter_meal:    { name:'DARK MATTER MEAL',      cat:'food', tier:3, price:8, desc:'Restore 12 HP, +2 shards',      fx:{heal:12,shards:2} },
  singularity_soup:    { name:'SINGULARITY SOUP',      cat:'food', tier:3, price:11,desc:'Restore 18 HP',                 fx:{heal:18} },
  combat_ration_b:     { name:'COMBAT RATION B',       cat:'food', tier:2, price:3, desc:'Restore 7 HP',                  fx:{heal:7} },

  // ── WEAPONS (equippable, +dmgBonus to all attacks) ─────────────────────────
  scrap_blade:         { name:'SCRAP BLADE',           cat:'weapon', tier:1, price:2,  desc:'Dmg +1',  fx:{dmgBonus:1} },
  shock_baton:         { name:'SHOCK BATON',           cat:'weapon', tier:1, price:2,  desc:'Dmg +1',  fx:{dmgBonus:1} },
  pulse_pistol:        { name:'PULSE PISTOL',          cat:'weapon', tier:1, price:3,  desc:'Dmg +2',  fx:{dmgBonus:2} },
  void_shiv:           { name:'VOID SHIV',             cat:'weapon', tier:1, price:2,  desc:'Dmg +1',  fx:{dmgBonus:1} },
  makeshift_rifle:     { name:'MAKESHIFT RIFLE',       cat:'weapon', tier:1, price:3,  desc:'Dmg +2',  fx:{dmgBonus:2} },
  static_knuckles:     { name:'STATIC KNUCKLES',       cat:'weapon', tier:1, price:3,  desc:'Dmg +2',  fx:{dmgBonus:2} },
  jury_rigged_smg:     { name:'JURY-RIGGED SMG',       cat:'weapon', tier:1, price:3,  desc:'Dmg +2',  fx:{dmgBonus:2} },
  broken_sword:        { name:'BROKEN SWORD',          cat:'weapon', tier:1, price:2,  desc:'Dmg +1',  fx:{dmgBonus:1} },
  signal_disruptor:    { name:'SIGNAL DISRUPTOR',      cat:'weapon', tier:1, price:2,  desc:'Dmg +1',  fx:{dmgBonus:1} },
  overcharged_pistol:  { name:'OVERCHARGED PISTOL',    cat:'weapon', tier:1, price:3,  desc:'Dmg +2',  fx:{dmgBonus:2} },
  rusty_machete:       { name:'RUSTY MACHETE',         cat:'weapon', tier:1, price:2,  desc:'Dmg +1',  fx:{dmgBonus:1} },
  copper_flail:        { name:'COPPER WIRE FLAIL',     cat:'weapon', tier:1, price:2,  desc:'Dmg +1',  fx:{dmgBonus:1} },
  bent_pipe:           { name:'BENT PIPE',             cat:'weapon', tier:1, price:1,  desc:'Dmg +1',  fx:{dmgBonus:1} },
  cracked_railgun:     { name:'CRACKED RAILGUN',       cat:'weapon', tier:1, price:3,  desc:'Dmg +2',  fx:{dmgBonus:2} },
  void_shard_knife:    { name:'VOID SHARD KNIFE',      cat:'weapon', tier:1, price:3,  desc:'Dmg +2',  fx:{dmgBonus:2} },
  station_wrench:      { name:'STATION WRENCH',        cat:'weapon', tier:1, price:1,  desc:'Dmg +1',  fx:{dmgBonus:1} },
  shock_rod:           { name:'SHOCK ROD',             cat:'weapon', tier:1, price:3,  desc:'Dmg +2',  fx:{dmgBonus:2} },
  scavenged_blaster:   { name:'SCAVENGED BLASTER',     cat:'weapon', tier:1, price:3,  desc:'Dmg +2',  fx:{dmgBonus:2} },
  fragment_pistol:     { name:'FRAGMENT PISTOL',       cat:'weapon', tier:1, price:3,  desc:'Dmg +2',  fx:{dmgBonus:2} },
  plasma_cutter:       { name:'PLASMA CUTTER',         cat:'weapon', tier:2, price:5,  desc:'Dmg +3',  fx:{dmgBonus:3} },
  neural_disruptor_w:  { name:'NEURAL DISRUPTOR',      cat:'weapon', tier:2, price:5,  desc:'Dmg +3',  fx:{dmgBonus:3} },
  phase_blade:         { name:'PHASE BLADE',           cat:'weapon', tier:2, price:5,  desc:'Dmg +3',  fx:{dmgBonus:3} },
  scatter_cannon:      { name:'SCATTER CANNON',        cat:'weapon', tier:2, price:6,  desc:'Dmg +4',  fx:{dmgBonus:4} },
  void_rifle:          { name:'VOID RIFLE',            cat:'weapon', tier:2, price:6,  desc:'Dmg +4',  fx:{dmgBonus:4} },
  corrosion_injector:  { name:'CORROSION INJECTOR',    cat:'weapon', tier:2, price:5,  desc:'Dmg +3',  fx:{dmgBonus:3} },
  gravity_mace:        { name:'GRAVITY MACE',          cat:'weapon', tier:2, price:6,  desc:'Dmg +4',  fx:{dmgBonus:4} },
  emp_pistol:          { name:'EMP PISTOL',            cat:'weapon', tier:2, price:5,  desc:'Dmg +3',  fx:{dmgBonus:3} },
  bio_blade:           { name:'BIO-BLADE',             cat:'weapon', tier:2, price:5,  desc:'Dmg +3',  fx:{dmgBonus:3} },
  quantum_sniper:      { name:'QUANTUM SNIPER',        cat:'weapon', tier:2, price:6,  desc:'Dmg +4',  fx:{dmgBonus:4} },
  dark_matter_gun:     { name:'DARK MATTER GUN',       cat:'weapon', tier:2, price:6,  desc:'Dmg +4',  fx:{dmgBonus:4} },
  echo_lance:          { name:'ECHO LANCE',            cat:'weapon', tier:2, price:5,  desc:'Dmg +3',  fx:{dmgBonus:3} },
  phase_hook:          { name:'PHASE HOOK',            cat:'weapon', tier:2, price:6,  desc:'Dmg +4',  fx:{dmgBonus:4} },
  static_cannon:       { name:'STATIC CANNON',         cat:'weapon', tier:2, price:6,  desc:'Dmg +4',  fx:{dmgBonus:4} },
  void_cutter:         { name:'VOID CUTTER',           cat:'weapon', tier:2, price:5,  desc:'Dmg +3',  fx:{dmgBonus:3} },
  signal_rifle:        { name:'SIGNAL RIFLE',          cat:'weapon', tier:2, price:6,  desc:'Dmg +4',  fx:{dmgBonus:4} },
  entropy_blade:       { name:'ENTROPY BLADE',         cat:'weapon', tier:2, price:5,  desc:'Dmg +3',  fx:{dmgBonus:3} },
  cryo_lance:          { name:'CRYO-LANCE',            cat:'weapon', tier:2, price:6,  desc:'Dmg +4',  fx:{dmgBonus:4} },
  annihilator_array:   { name:'ANNIHILATOR ARRAY',     cat:'weapon', tier:3, price:9,  desc:'Dmg +6',  fx:{dmgBonus:6} },
  void_cannon:         { name:'VOID CANNON',           cat:'weapon', tier:3, price:9,  desc:'Dmg +6',  fx:{dmgBonus:6} },
  phase_katana:        { name:'PHASE KATANA',          cat:'weapon', tier:3, price:8,  desc:'Dmg +5',  fx:{dmgBonus:5} },
  soul_ripper:         { name:'SOUL RIPPER',           cat:'weapon', tier:3, price:10, desc:'Dmg +7',  fx:{dmgBonus:7} },
  plasma_lance:        { name:'PLASMA LANCE',          cat:'weapon', tier:3, price:9,  desc:'Dmg +6',  fx:{dmgBonus:6} },
  dark_matter_rifle:   { name:'DARK MATTER RIFLE',     cat:'weapon', tier:3, price:9,  desc:'Dmg +6',  fx:{dmgBonus:6} },
  entropy_gun:         { name:'ENTROPY GUN',           cat:'weapon', tier:3, price:10, desc:'Dmg +7',  fx:{dmgBonus:7} },
  quantum_blade:       { name:'QUANTUM BLADE',         cat:'weapon', tier:3, price:8,  desc:'Dmg +5',  fx:{dmgBonus:5} },
  singularity_pistol:  { name:'SINGULARITY PISTOL',    cat:'weapon', tier:3, price:10, desc:'Dmg +7',  fx:{dmgBonus:7} },
  void_annihilator:    { name:'VOID ANNIHILATOR',      cat:'weapon', tier:3, price:11, desc:'Dmg +8',  fx:{dmgBonus:8} },
  corrupted_railgun:   { name:'CORRUPTED RAILGUN',     cat:'weapon', tier:3, price:9,  desc:'Dmg +6',  fx:{dmgBonus:6} },
  phantom_edge:        { name:'PHANTOM EDGE',          cat:'weapon', tier:3, price:8,  desc:'Dmg +5',  fx:{dmgBonus:5} },
  echo_disruptor:      { name:'ECHO DISRUPTOR',        cat:'weapon', tier:3, price:9,  desc:'Dmg +6',  fx:{dmgBonus:6} },
  signal_decimator:    { name:'SIGNAL DECIMATOR',      cat:'weapon', tier:3, price:10, desc:'Dmg +7',  fx:{dmgBonus:7} },
  station_destroyer:   { name:'STATION DESTROYER',     cat:'weapon', tier:3, price:11, desc:'Dmg +8',  fx:{dmgBonus:8} },

  // ── ARMOR (equippable, -defense from incoming damage) ───────────────────────
  scrap_plating:       { name:'SCRAP PLATING',         cat:'armor', tier:1, price:2,  desc:'Def 1',  fx:{defense:1} },
  makeshift_vest:      { name:'MAKESHIFT VEST',        cat:'armor', tier:1, price:2,  desc:'Def 1',  fx:{defense:1} },
  void_mesh:           { name:'VOID MESH',             cat:'armor', tier:1, price:2,  desc:'Def 1',  fx:{defense:1} },
  cracked_shield:      { name:'CRACKED SHIELD',        cat:'armor', tier:1, price:2,  desc:'Def 1',  fx:{defense:1} },
  station_uniform:     { name:'STATION UNIFORM',       cat:'armor', tier:1, price:1,  desc:'Def 1',  fx:{defense:1} },
  rubber_padding:      { name:'RUBBER PADDING',        cat:'armor', tier:1, price:1,  desc:'Def 1',  fx:{defense:1} },
  copper_weave:        { name:'COPPER WEAVE',          cat:'armor', tier:1, price:2,  desc:'Def 1',  fx:{defense:1} },
  salvaged_plate:      { name:'SALVAGED PLATE',        cat:'armor', tier:1, price:3,  desc:'Def 2',  fx:{defense:2} },
  signal_dampener:     { name:'SIGNAL DAMPENER',       cat:'armor', tier:1, price:2,  desc:'Def 1',  fx:{defense:1} },
  static_wrap:         { name:'STATIC WRAP',           cat:'armor', tier:1, price:1,  desc:'Def 1',  fx:{defense:1} },
  broken_carapace:     { name:'BROKEN CARAPACE',       cat:'armor', tier:1, price:2,  desc:'Def 1',  fx:{defense:1} },
  torn_body_armor:     { name:'TORN BODY ARMOR',       cat:'armor', tier:1, price:3,  desc:'Def 2',  fx:{defense:2} },
  void_cloth:          { name:'VOID CLOTH',            cat:'armor', tier:1, price:1,  desc:'Def 1',  fx:{defense:1} },
  scavenged_plating:   { name:'SCAVENGED PLATING',     cat:'armor', tier:1, price:3,  desc:'Def 2',  fx:{defense:2} },
  jury_rigged_vest:    { name:'JURY-RIGGED VEST',      cat:'armor', tier:1, price:2,  desc:'Def 1',  fx:{defense:1} },
  cracked_helmet:      { name:'CRACKED HELMET',        cat:'armor', tier:1, price:2,  desc:'Def 1',  fx:{defense:1} },
  carbon_fragments:    { name:'CARBON FRAGMENTS',      cat:'armor', tier:1, price:3,  desc:'Def 2',  fx:{defense:2} },
  shock_mesh:          { name:'SHOCK MESH',            cat:'armor', tier:1, price:2,  desc:'Def 1',  fx:{defense:1} },
  station_hazmat:      { name:'STATION HAZMAT',        cat:'armor', tier:1, price:3,  desc:'Def 2',  fx:{defense:2} },
  phase_vest:          { name:'PHASE VEST',            cat:'armor', tier:2, price:5,  desc:'Def 3',  fx:{defense:3} },
  neural_weave:        { name:'NEURAL WEAVE',          cat:'armor', tier:2, price:5,  desc:'Def 3',  fx:{defense:3} },
  echo_armor:          { name:'ECHO ARMOR',            cat:'armor', tier:2, price:5,  desc:'Def 3',  fx:{defense:3} },
  void_plate:          { name:'VOID PLATE',            cat:'armor', tier:2, price:6,  desc:'Def 4',  fx:{defense:4} },
  signal_shield:       { name:'SIGNAL SHIELD',         cat:'armor', tier:2, price:6,  desc:'Def 4',  fx:{defense:4} },
  corrupted_plating:   { name:'CORRUPTED PLATING',     cat:'armor', tier:2, price:5,  desc:'Def 3',  fx:{defense:3} },
  quantum_mesh:        { name:'QUANTUM MESH',          cat:'armor', tier:2, price:6,  desc:'Def 4',  fx:{defense:4} },
  plasma_shield:       { name:'PLASMA SHIELD',         cat:'armor', tier:2, price:6,  desc:'Def 4',  fx:{defense:4} },
  bio_armor:           { name:'BIO-ARMOR',             cat:'armor', tier:2, price:5,  desc:'Def 3',  fx:{defense:3} },
  cryo_plating:        { name:'CRYO-PLATING',          cat:'armor', tier:2, price:6,  desc:'Def 4',  fx:{defense:4} },
  dark_matter_vest:    { name:'DARK MATTER VEST',      cat:'armor', tier:2, price:6,  desc:'Def 4',  fx:{defense:4} },
  entropy_shield:      { name:'ENTROPY SHIELD',        cat:'armor', tier:2, price:5,  desc:'Def 3',  fx:{defense:3} },
  phase_plate:         { name:'PHASE PLATE',           cat:'armor', tier:2, price:6,  desc:'Def 4',  fx:{defense:4} },
  static_barrier:      { name:'STATIC BARRIER',        cat:'armor', tier:2, price:5,  desc:'Def 3',  fx:{defense:3} },
  void_carapace:       { name:'VOID CARAPACE',         cat:'armor', tier:2, price:6,  desc:'Def 4',  fx:{defense:4} },
  echo_shield:         { name:'ECHO SHIELD',           cat:'armor', tier:2, price:5,  desc:'Def 3',  fx:{defense:3} },
  signal_plating:      { name:'SIGNAL PLATING',        cat:'armor', tier:2, price:6,  desc:'Def 4',  fx:{defense:4} },
  annihilator_shell:   { name:'ANNIHILATOR SHELL',     cat:'armor', tier:3, price:8,  desc:'Def 5',  fx:{defense:5} },
  void_fortress:       { name:'VOID FORTRESS',         cat:'armor', tier:3, price:10, desc:'Def 6',  fx:{defense:6} },
  phase_carapace:      { name:'PHASE CARAPACE',        cat:'armor', tier:3, price:8,  desc:'Def 5',  fx:{defense:5} },
  quantum_armor:       { name:'QUANTUM ARMOR',         cat:'armor', tier:3, price:10, desc:'Def 6',  fx:{defense:6} },
  plasma_weave:        { name:'PLASMA WEAVE',          cat:'armor', tier:3, price:10, desc:'Def 6',  fx:{defense:6} },
  singularity_shield:  { name:'SINGULARITY SHIELD',    cat:'armor', tier:3, price:11, desc:'Def 7',  fx:{defense:7} },
  echo_fortress:       { name:'ECHO FORTRESS',         cat:'armor', tier:3, price:8,  desc:'Def 5',  fx:{defense:5} },
  dark_matter_plate:   { name:'DARK MATTER PLATE',     cat:'armor', tier:3, price:10, desc:'Def 6',  fx:{defense:6} },
  entropy_carapace:    { name:'ENTROPY CARAPACE',      cat:'armor', tier:3, price:11, desc:'Def 7',  fx:{defense:7} },
  corrupted_fortress:  { name:'CORRUPTED FORTRESS',    cat:'armor', tier:3, price:10, desc:'Def 6',  fx:{defense:6} },
  station_shield_p:    { name:'STATION SHIELD PRIME',  cat:'armor', tier:3, price:8,  desc:'Def 5',  fx:{defense:5} },
  void_matrix_armor:   { name:'VOID MATRIX ARMOR',     cat:'armor', tier:3, price:11, desc:'Def 7',  fx:{defense:7} },
  phantom_carapace:    { name:'PHANTOM CARAPACE',      cat:'armor', tier:3, price:8,  desc:'Def 5',  fx:{defense:5} },
  signal_prime_plate:  { name:'SIGNAL PRIME PLATING',  cat:'armor', tier:3, price:10, desc:'Def 6',  fx:{defense:6} },
  omega_shell:         { name:'OMEGA SHELL',           cat:'armor', tier:3, price:12, desc:'Def 8',  fx:{defense:8} },
  absolute_barrier:    { name:'ABSOLUTE BARRIER',      cat:'armor', tier:3, price:11, desc:'Def 7',  fx:{defense:7} },
  zero_point_armor:    { name:'ZERO POINT ARMOR',      cat:'armor', tier:3, price:12, desc:'Def 8',  fx:{defense:8} },

  // ── MISC / OTHER ────────────────────────────────────────────────────────────
  signal_booster_m:    { name:'SIGNAL BOOSTER',        cat:'misc', tier:1, price:1,  desc:'+2 power cells',              fx:{cells:2} },
  shard_magnet:        { name:'SHARD MAGNET',          cat:'misc', tier:1, price:1,  desc:'+1 data shard',               fx:{shards:1} },
  fuel_cell:           { name:'FUEL CELL',             cat:'misc', tier:1, price:2,  desc:'+3 power cells',              fx:{cells:3} },
  shard_cluster:       { name:'SHARD CLUSTER',         cat:'misc', tier:1, price:2,  desc:'+2 data shards',              fx:{shards:2} },
  power_chip:          { name:'POWER CHIP',            cat:'misc', tier:1, price:2,  desc:'+2 power cells',              fx:{cells:2} },
  patch_kit:           { name:'PATCH KIT',             cat:'misc', tier:1, price:2,  desc:'+1 max HP',                   fx:{maxhp:1} },
  nano_patch:          { name:'NANO-PATCH',            cat:'misc', tier:1, price:2,  desc:'+1 max HP',                   fx:{maxhp:1} },
  static_core:         { name:'STATIC CORE',           cat:'misc', tier:1, price:2,  desc:'+2 power cells',              fx:{cells:2} },
  data_fragment:       { name:'DATA FRAGMENT',         cat:'misc', tier:1, price:1,  desc:'+1 shard',                    fx:{shards:1} },
  void_particle:       { name:'VOID PARTICLE',         cat:'misc', tier:1, price:1,  desc:'+1 shard',                    fx:{shards:1} },
  signal_amp:          { name:'SIGNAL AMP',            cat:'misc', tier:1, price:2,  desc:'Next atk +1 dmg',             fx:{dmgBuff:1} },
  cracked_lens:        { name:'CRACKED LENS',          cat:'misc', tier:1, price:1,  desc:'+1 shard',                    fx:{shards:1} },
  memory_core:         { name:'MEMORY CORE',           cat:'misc', tier:1, price:2,  desc:'+2 power cells',              fx:{cells:2} },
  void_tracker:        { name:'VOID TRACKER',          cat:'misc', tier:1, price:2,  desc:'+1 shard, +1 cell',           fx:{shards:1,cells:1} },
  echo_trace:          { name:'ECHO TRACE',            cat:'misc', tier:1, price:2,  desc:'+1 max HP',                   fx:{maxhp:1} },
  copper_fragment:     { name:'COPPER FRAGMENT',       cat:'misc', tier:1, price:1,  desc:'+1 shard',                    fx:{shards:1} },
  static_filter:       { name:'STATIC FILTER',         cat:'misc', tier:1, price:1,  desc:'+1 power cell',               fx:{cells:1} },
  broken_lens:         { name:'BROKEN LENS',           cat:'misc', tier:1, price:1,  desc:'+1 shard',                    fx:{shards:1} },
  residual_charge:     { name:'RESIDUAL CHARGE',       cat:'misc', tier:1, price:2,  desc:'+3 power cells',              fx:{cells:3} },
  phase_amplifier:     { name:'PHASE AMPLIFIER',       cat:'misc', tier:2, price:5,  desc:'Reset Phase Step',            fx:{phaseRestore:true} },
  void_engine_shard:   { name:'VOID ENGINE SHARD',     cat:'misc', tier:2, price:4,  desc:'+4 power cells',              fx:{cells:4} },
  quantum_lens:        { name:'QUANTUM LENS',          cat:'misc', tier:2, price:5,  desc:'+2 max HP',                   fx:{maxhp:2} },
  data_vault:          { name:'DATA VAULT',            cat:'misc', tier:2, price:4,  desc:'+3 shards',                   fx:{shards:3} },
  static_amplifier:    { name:'STATIC AMPLIFIER',      cat:'misc', tier:2, price:4,  desc:'Next atk +2 dmg',             fx:{dmgBuff:2} },
  echo_dampener:       { name:'ECHO DAMPENER',         cat:'misc', tier:2, price:5,  desc:'+2 max HP',                   fx:{maxhp:2} },
  corruption_filter:   { name:'CORRUPTION FILTER',     cat:'misc', tier:2, price:5,  desc:'-1 corruption',               fx:{corruption:-1} },
  void_fragment_p:     { name:'VOID FRAGMENT PRIME',   cat:'misc', tier:2, price:4,  desc:'+3 power cells',              fx:{cells:3} },
  phase_core:          { name:'PHASE CORE',            cat:'misc', tier:2, price:5,  desc:'Reset Phase Step',            fx:{phaseRestore:true} },
  echo_core:           { name:'ECHO CORE',             cat:'misc', tier:2, price:5,  desc:'+3 max HP',                   fx:{maxhp:3} },
  quantum_cell:        { name:'QUANTUM CELL',          cat:'misc', tier:2, price:4,  desc:'+6 power cells',              fx:{cells:6} },
  void_matrix:         { name:'VOID MATRIX',           cat:'misc', tier:2, price:4,  desc:'+3 shards',                   fx:{shards:3} },
  nano_rebuild:        { name:'NANO-REBUILD KIT',      cat:'misc', tier:2, price:5,  desc:'+3 max HP',                   fx:{maxhp:3} },
  signal_override:     { name:'SIGNAL OVERRIDE',       cat:'misc', tier:2, price:5,  desc:'Next atk +3 dmg',             fx:{dmgBuff:3} },
  combat_injector:     { name:'COMBAT INJECTOR',       cat:'misc', tier:2, price:4,  desc:'Next atk +2 dmg',             fx:{dmgBuff:2} },
  shard_processor:     { name:'SHARD PROCESSOR',       cat:'misc', tier:2, price:4,  desc:'+4 shards',                   fx:{shards:4} },
  singularity_core:    { name:'SINGULARITY CORE',      cat:'misc', tier:3, price:8,  desc:'Phase Step + +4 max HP',      fx:{phaseRestore:true,maxhp:4} },
  void_prime_engine:   { name:'VOID PRIME ENGINE',     cat:'misc', tier:3, price:7,  desc:'+8 power cells',              fx:{cells:8} },
  echo_matrix_prime:   { name:'ECHO MATRIX PRIME',     cat:'misc', tier:3, price:8,  desc:'+5 max HP',                   fx:{maxhp:5} },
  quantum_override:    { name:'QUANTUM OVERRIDE',      cat:'misc', tier:3, price:9,  desc:'Force next Crit Uplink',      fx:{forceCrit:true} },
  signal_prime_core:   { name:'SIGNAL PRIME CORE',     cat:'misc', tier:3, price:8,  desc:'Phase Step + +3 max HP',      fx:{phaseRestore:true,maxhp:3} },
  dark_matter_core:    { name:'DARK MATTER CORE',      cat:'misc', tier:3, price:7,  desc:'+5 shards',                   fx:{shards:5} },
  entropy_engine:      { name:'ENTROPY ENGINE',        cat:'misc', tier:3, price:7,  desc:'+8 power cells',              fx:{cells:8} },
  absolute_phase:      { name:'ABSOLUTE PHASE',        cat:'misc', tier:3, price:10, desc:'Phase Step + force Crit',     fx:{phaseRestore:true,forceCrit:true} },
  omega_signal:        { name:'OMEGA SIGNAL',          cat:'misc', tier:3, price:10, desc:'Force Crit + +3 max HP',      fx:{forceCrit:true,maxhp:3} },
  void_singularity:    { name:'VOID SINGULARITY',      cat:'misc', tier:3, price:8,  desc:'+6 shards',                   fx:{shards:6} },
  phase_matrix_prime:  { name:'PHASE MATRIX PRIME',    cat:'misc', tier:3, price:8,  desc:'+4 max HP',                   fx:{maxhp:4} },
  signal_nexus:        { name:'SIGNAL NEXUS',          cat:'misc', tier:3, price:8,  desc:'+8 cells, +2 shards',         fx:{cells:8,shards:2} },
  quantum_nexus:       { name:'QUANTUM NEXUS',         cat:'misc', tier:3, price:9,  desc:'Phase Step + +5 max HP',      fx:{phaseRestore:true,maxhp:5} },
  echo_prime_engine:   { name:'ECHO PRIME ENGINE',     cat:'misc', tier:3, price:8,  desc:'+6 cells, +3 max HP',         fx:{cells:6,maxhp:3} },
  station_core_prime:  { name:'STATION CORE PRIME',    cat:'misc', tier:3, price:8,  desc:'+4 shards, +4 cells',         fx:{shards:4,cells:4} },
  absolute_core:       { name:'ABSOLUTE CORE',         cat:'misc', tier:3, price:9,  desc:'+6 max HP, Phase Step',       fx:{maxhp:6,phaseRestore:true} },
  corruption_prime:    { name:'CORRUPTION PURGE PRIME',cat:'misc', tier:3, price:9,  desc:'-2 corruption, +2 max HP',    fx:{corruption:-2,maxhp:2} },
  void_nexus:          { name:'VOID NEXUS',            cat:'misc', tier:3, price:9,  desc:'+5 shards, +5 cells',         fx:{shards:5,cells:5} },
};

// Merchant types and what tiers they stock
const MERCHANT_TYPES = {
  bot:      { name:'VENDOR BOT',          char:'$', color:'#ffcc00', tiers:[1,2,3], cats:['food','weapon','armor','misc'], stockSize:6 },
  vending:  { name:'VEND-O-MATIC',        char:'V', color:'#00ccff', tiers:[1,2],   cats:['food','misc'],                  stockSize:5 },
  particle: { name:'PARTICLE GENERATOR',  char:'P', color:'#ff44ff', tiers:[2,3],   cats:['weapon','armor','misc'],        stockSize:5 },
};

function merchantStock(type, deck) {
  const mt = MERCHANT_TYPES[type];
  const maxTier = deck; // deck 1→tier1, deck 2→tier1-2, deck 3→tier1-3
  const eligible = Object.entries(ITEMS)
    .filter(([, it]) => mt.cats.includes(it.cat) && it.tier <= maxTier && mt.tiers.includes(it.tier))
    .map(([id, it]) => ({ id, ...it }));
  // Pick stockSize random unique items
  const shuffled = eligible.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, mt.stockSize);
}

// ─── Dice ─────────────────────────────────────────────────────────────────────

const d20 = () => Math.floor(Math.random() * 20) + 1;
const d6  = () => Math.floor(Math.random() * 6)  + 1;

function roll2D20(forceResult) {
  if (forceResult === 'CRITICAL_UPLINK') return { a: 20, b: 20, result: 'CRITICAL_UPLINK' };
  if (forceResult === 'SIGNAL_LOST')     return { a: 5,  b: 5,  result: 'SIGNAL_LOST' };
  const a = d20(), b = d20();
  const result = (a >= 12 && b >= 12) ? 'CRITICAL_UPLINK'
               : (a >= 12 || b >= 12) ? 'STATIC_PASS'
               : 'SIGNAL_LOST';
  return { a, b, result };
}

function digitSum(n) {
  let s = n;
  while (s >= 10) s = String(s).split('').reduce((a, c) => a + +c, 0);
  return s;
}

// ─── Map Generation ───────────────────────────────────────────────────────────

const makeTile = (type = 'wall') => ({ type, fog: 'DARK' });

function carveRoom(grid, x, y, w, h) {
  for (let ry = y; ry < y + h && ry < H - 1; ry++)
    for (let rx = x; rx < x + w && rx < W - 1; rx++)
      if (ry > 0 && rx > 0) grid[ry][rx] = makeTile('floor');
}

function carveCorridor(grid, x1, y1, x2, y2) {
  let x = x1, y = y1;
  while (x !== x2) {
    if (y > 0 && y < H-1 && x > 0 && x < W-1) grid[y][x] = makeTile('floor');
    x += x < x2 ? 1 : -1;
  }
  while (y !== y2) {
    if (y > 0 && y < H-1 && x > 0 && x < W-1) grid[y][x] = makeTile('floor');
    y += y < y2 ? 1 : -1;
  }
}

function generateMap(deck) {
  const grid = Array.from({ length: H }, () =>
    Array.from({ length: W }, () => makeTile('wall'))
  );
  const rooms = [];
  const target = 9 + Math.floor(Math.random() * 4);

  for (let attempts = 0; attempts < target * 15 && rooms.length < target; attempts++) {
    let r1 = d20(), r2 = d20();
    if (r1 === r2) { r1 = d20(); r2 = d20(); }
    const rw = Math.max(3, 2 + digitSum(r1 + r2));
    const rh = Math.max(3, 2 + digitSum(r1));
    const rx = 1 + Math.floor(Math.random() * (W - rw - 2));
    const ry = 1 + Math.floor(Math.random() * (H - rh - 2));

    const overlaps = rooms.some(r =>
      rx < r.x + r.w + 2 && rx + rw + 2 > r.x &&
      ry < r.y + r.h + 2 && ry + rh + 2 > r.y
    );
    if (!overlaps) {
      rooms.push({ x: rx, y: ry, w: rw, h: rh });
      carveRoom(grid, rx, ry, rw, rh);
    }
  }

  for (let i = 1; i < rooms.length; i++) {
    const a = rooms[i - 1], b = rooms[i];
    carveCorridor(
      grid,
      a.x + Math.floor(a.w / 2), a.y + Math.floor(a.h / 2),
      b.x + Math.floor(b.w / 2), b.y + Math.floor(b.h / 2)
    );
  }

  // Portal in last room center
  const last = rooms[rooms.length - 1];
  const portalPos = { x: last.x + Math.floor(last.w / 2), y: last.y + Math.floor(last.h / 2) };
  grid[portalPos.y][portalPos.x] = makeTile('portal');

  // Player start in first room
  const first = rooms[0];
  const startPos = { x: first.x + 1, y: first.y + 1 };

  // Spawn enemies
  const deckTypes = Object.entries(ENEMY_DEFS)
    .filter(([, e]) => e.decks.includes(deck))
    .map(([key, def]) => ({ key, ...def }));

  const enemies = [];
  rooms.slice(1, -1).forEach((room, i) => {
    if (Math.random() > 0.65) return;
    const def = deckTypes[Math.floor(Math.random() * deckTypes.length)];
    const ex = room.x + 1 + Math.floor(Math.random() * Math.max(1, room.w - 2));
    const ey = room.y + 1 + Math.floor(Math.random() * Math.max(1, room.h - 2));
    enemies.push({ id: `e${i}`, ...def, maxHp: def.hp, pos: { x: ex, y: ey }, alive: true });
  });

  // Spawn merchants — 1 per 3 rooms, random type, skip first & last
  const merchants = [];
  rooms.slice(1, -1).forEach((room, i) => {
    if (i % 3 !== 0) return;
    const types = Object.keys(MERCHANT_TYPES);
    const mType = types[Math.floor(Math.random() * types.length)];
    // Place in room corner away from enemy
    const mx = room.x + room.w - 2;
    const my = room.y + 1;
    if (mx > 0 && mx < W-1 && my > 0 && my < H-1) {
      grid[my][mx] = makeTile('merchant_' + mType);
      merchants.push({ id: `m${i}`, type: mType, pos: { x: mx, y: my } });
    }
  });

  return { grid, rooms, startPos, portalPos, enemies, merchants };
}

// ─── Fog of War ───────────────────────────────────────────────────────────────

function revealFog(grid, pos, radius = 4) {
  return grid.map((row, y) =>
    row.map((tile, x) => {
      const dist = Math.sqrt((x - pos.x) ** 2 + (y - pos.y) ** 2);
      if (dist > radius) return tile.fog === 'LIT' ? { ...tile, fog: 'DIM' } : tile;
      const newFog = dist <= radius / 2 ? 'LIT' : 'DIM';
      if (tile.fog === newFog || (tile.fog === 'LIT' && newFog === 'DIM')) return tile;
      return { ...tile, fog: newFog };
    })
  );
}

// ─── Initial State ────────────────────────────────────────────────────────────

function makePlayer() {
  return {
    hp: 20, maxHp: 20, powerCells: 12, dataShards: 0, corruptedFragments: 0,
    phaseStepUsed: false,
    inventory: [],          // array of { id, ...itemDef }
    equipped: { weapon: null, armor: null },
    dmgBuff: 0,             // temp bonus applied to next attack
  };
}

function buildState(deck, player) {
  const { grid, rooms, startPos, portalPos, enemies, merchants } = generateMap(deck);
  return {
    phase: 'EXPLORE',
    deck,
    grid: revealFog(grid, startPos),
    rooms,
    player: player ?? makePlayer(),
    playerPos: startPos,
    portalPos,
    enemies,
    merchants,
    combat: null,
    activeEnemy: null,
    activeMerchant: null,   // { type, stock: [...items] }
    log: [`DECK ${deck}: ${DECKS[deck].name} — BREACH INITIATED`],
    rollResult: null,
    portalRoll: null,
    screenShake: false,
    glitch: false,
    forceNext: null,
    hallOfHeads: JSON.parse(localStorage.getItem('void-hall') || '[]'),
  };
}

// ─── Movement / Collision ─────────────────────────────────────────────────────

function walkable(grid, enemies, pos) {
  const { x, y } = pos;
  if (x < 0 || x >= W || y < 0 || y >= H) return false;
  const t = grid[y]?.[x];
  if (!t || t.type === 'wall') return false;
  // merchant tiles are enterable (triggers shop)
  if (enemies.some(e => e.alive && e.pos.x === x && e.pos.y === y)) return false;
  return true;
}

function isMerchantTile(tile) {
  return tile?.type?.startsWith('merchant_');
}

function merchantTypeFromTile(tile) {
  return tile?.type?.replace('merchant_', '');
}

// ─── Enemy AI ─────────────────────────────────────────────────────────────────

// Ranged enemies hold at distance 3; melee enemies close to 1
const ENGAGE_DIST = { ranged: 3, melee: 1 };

function stepEnemies(state) {
  const { grid, enemies, playerPos } = state;
  const moved = enemies.map(e => {
    if (!e.alive) return e;
    const fog = grid[e.pos.y]?.[e.pos.x]?.fog;
    if (fog === 'DARK') return e;
    const dx = playerPos.x - e.pos.x, dy = playerPos.y - e.pos.y;
    const dist = Math.abs(dx) + Math.abs(dy);
    if (dist > 9 || dist === 0) return e;

    const stopDist = e.ranged ? ENGAGE_DIST.ranged : ENGAGE_DIST.melee;
    if (dist <= stopDist) return e; // already in engage range — don't crowd

    const sx = dx !== 0 ? (dx > 0 ? 1 : -1) : 0;
    const sy = dy !== 0 ? (dy > 0 ? 1 : -1) : 0;
    for (const np of [
      { x: e.pos.x + sx, y: e.pos.y },
      { x: e.pos.x, y: e.pos.y + sy },
      { x: e.pos.x + sx, y: e.pos.y + sy },
    ]) {
      if (np.x < 0 || np.x >= W || np.y < 0 || np.y >= H) continue;
      if (grid[np.y][np.x]?.type === 'wall') continue;
      if (enemies.some(o => o.alive && o.id !== e.id && o.pos.x === np.x && o.pos.y === np.y)) continue;
      if (np.x === playerPos.x && np.y === playerPos.y) return e;
      return { ...e, pos: np };
    }
    return e;
  });

  // After enemies move, check if any ranged enemy is now in range and visible
  // — they initiate combat proactively
  const aggressor = moved.find(e => {
    if (!e.alive || !e.ranged) return false;
    const fog = grid[e.pos.y]?.[e.pos.x]?.fog;
    if (fog === 'DARK') return false;
    const dist = Math.abs(e.pos.x - playerPos.x) + Math.abs(e.pos.y - playerPos.y);
    return dist <= ENGAGE_DIST.ranged + 1;
  });

  const newState = { ...state, enemies: moved };
  if (aggressor) return startCombat(newState, aggressor);
  return newState;
}

// ─── Combat ───────────────────────────────────────────────────────────────────

function startCombat(state, enemy) {
  const init = d20();
  const playerFirst = init >= 10;
  const base = {
    ...state,
    phase: 'COMBAT',
    activeEnemy: enemy,
    combat: {
      turn: playerFirst ? 'PLAYER' : 'ENEMY',
      round: 1,
      coverActive: false,
      log: [`⚔ ${enemy.name} — ${playerFirst ? 'YOU MOVE FIRST' : 'ENEMY MOVES FIRST'} [${init}]`],
    },
    log: [...state.log, `COMBAT: ${enemy.name}`],
    screenShake: false,
    glitch: false,
  };
  // Enemy won initiative — resolve their opening attack immediately
  if (!playerFirst) return enemyAttack(base);
  return base;
}

// mode: 'shoot' (2D20, costs 1 cell) | 'melee' (d20 hit-check, free, lower dmg)
function playerAttack(state, mode = 'shoot') {
  let newPlayer = { ...state.player };
  let dmg = 0, clog = [], glitch = false, screenShake = false;

  const weaponBonus = newPlayer.equipped?.weapon?.fx?.dmgBonus ?? 0;
  const buffBonus   = newPlayer.dmgBuff ?? 0;
  newPlayer = { ...newPlayer, dmgBuff: 0 };

  if (mode === 'shoot') {
    // Costs 1 Power Cell
    newPlayer = { ...newPlayer, powerCells: newPlayer.powerCells - 1 };

    const rawRoll = roll2D20(state.forceNext);
    let roll = rawRoll;

    // Phase Step: upgrade first Signal Lost → Static Pass
    if (roll.result === 'SIGNAL_LOST' && !newPlayer.phaseStepUsed) {
      roll = { ...roll, result: 'STATIC_PASS' };
      newPlayer = { ...newPlayer, phaseStepUsed: true };
      clog.push('PHASE STEP ACTIVATED');
    }

    if (roll.result === 'CRITICAL_UPLINK') {
      dmg = d6() + 4 + weaponBonus + buffBonus;
      clog.push(`CRITICAL UPLINK [${roll.a}/${roll.b}] — ${dmg} DMG`);
      screenShake = true;
    } else if (roll.result === 'STATIC_PASS') {
      dmg = d6() + weaponBonus + buffBonus;
      clog.push(`STATIC PASS [${roll.a}/${roll.b}] — ${dmg} DMG`);
    } else {
      clog.push(`SIGNAL LOST [${roll.a}/${roll.b}] — SHOT MISSED`);
      glitch = true;
    }

    // Tag remaining cells in log
    clog.push(`⚡ ${newPlayer.powerCells} CELLS REMAINING`);

  } else {
    // MELEE — free, single d20 check
    const roll = d20();
    const hit = roll >= 10;
    if (hit) {
      dmg = Math.ceil(d6() / 2) + Math.floor(weaponBonus / 2) + buffBonus; // half weapon bonus
      clog.push(`MELEE [${roll}] — ${dmg} DMG`);
      if (roll >= 18) { dmg += 2; clog[0] = `MELEE CRIT [${roll}] — ${dmg} DMG`; screenShake = true; }
    } else {
      clog.push(`MELEE [${roll}] — WHIFFED`);
      glitch = true;
    }
  }

  const enemy = { ...state.activeEnemy, hp: Math.max(0, state.activeEnemy.hp - dmg) };
  const dead = enemy.hp <= 0;
  if (dead) { clog.push(`${enemy.name} ELIMINATED — +1 SHARD`); enemy.alive = false; screenShake = true; }

  const enemies = state.enemies.map(e => e.id === enemy.id ? enemy : e);
  if (dead) newPlayer = { ...newPlayer, dataShards: newPlayer.dataShards + 1 };

  const base = {
    ...state, enemies, player: newPlayer,
    rollResult: null, glitch, screenShake, forceNext: null,
    combat: state.combat ? { ...state.combat, log: [...state.combat.log, ...clog] } : null,
    log: [...state.log, ...clog],
  };

  if (dead) return { ...base, phase: 'EXPLORE', activeEnemy: null, combat: null };
  return { ...base, activeEnemy: enemy };
}

// enemyAttack: always resolves to turn:'PLAYER' or phase:'DEAD'. Never leaves turn:'ENEMY'.
function enemyAttack(state) {
  const enemy = state.activeEnemy;
  if (!enemy) return state; // safety: no active enemy, stay put

  const combatLog = state.combat?.log ?? [];
  const roll = d20();
  const hitThreshold = enemy.ranged ? 8 : 10;   // ranged enemies are accurate
  const hit = roll >= hitThreshold;
  let dmg = 0, clog = [], screenShake = false;

  if (hit) {
    const armorDef = state.player.equipped?.armor?.fx?.defense ?? 0;
    // Cover halves ranged damage but barely helps vs melee
    const coverReduction = state.combat?.coverActive ? (enemy.ranged ? Math.ceil(enemy.atk / 4) : 1) : 0;
    dmg = Math.max(0, Math.ceil(enemy.atk / 2) + (roll >= 18 ? 2 : 0) - armorDef - coverReduction);
    const atkType = enemy.ranged ? 'RANGED' : 'MELEE';
    const tags = [state.combat?.coverActive && `COVER-${coverReduction}`, armorDef > 0 && `ARM-${armorDef}`].filter(Boolean).join(' ');
    clog.push(`${enemy.name} ${atkType} [${roll}] — ${dmg} DMG${tags ? ` (${tags})` : ''}`);
    screenShake = true;
  } else {
    clog.push(`${enemy.name} [${roll}] — MISSED`);
  }

  const newHp = Math.max(0, state.player.hp - dmg);
  const dead = newHp <= 0;
  const newPlayer = { ...state.player, hp: newHp };

  const next = {
    ...state,
    player: newPlayer,
    screenShake,
    combat: {
      ...(state.combat ?? {}),
      turn: 'PLAYER',
      round: (state.combat?.round ?? 1) + 1,
      coverActive: false,
      log: [...combatLog, ...clog],
    },
    log: [...state.log, ...clog],
  };

  if (dead) return { ...next, phase: 'DEAD', log: [...next.log, 'SIGNAL TERMINATED'] };
  return next;
}

function doCombatAction(state, action) {
  if (state.phase !== 'COMBAT' || state.combat?.turn !== 'PLAYER') return state;

  const combatLog = state.combat.log ?? [];
  const enemy = state.activeEnemy;

  // SHOOT — 2D20, costs 1 Power Cell
  if (action === 'SHOOT') {
    if (state.player.powerCells <= 0) {
      return { ...state, combat: { ...state.combat, log: [...combatLog, 'OUT OF CELLS — USE MELEE'] } };
    }
    const after = playerAttack(state, 'shoot');
    if (after.phase === 'COMBAT') return enemyAttack(after);
    return after;
  }

  // MELEE — free, d20 hit-check, reduced damage
  if (action === 'MELEE') {
    const after = playerAttack(state, 'melee');
    if (after.phase === 'COMBAT') return enemyAttack(after);
    return after;
  }

  // DODGE — evade on d20 ≥12; ranged enemies are harder to dodge (≥14)
  if (action === 'DODGE') {
    const threshold = enemy?.ranged ? 14 : 12;
    const roll = d20();
    const evaded = roll >= threshold;
    const clog = evaded
      ? [`DODGE [${roll}] — EVADED`]
      : [`DODGE [${roll}] — EXPOSED (needed ${threshold})`];
    const withLog = { ...state, combat: { ...state.combat, log: [...combatLog, ...clog] } };
    if (evaded) return withLog; // player keeps turn
    return enemyAttack(withLog);
  }

  // COVER — take cover; greatly reduces ranged damage, barely helps vs melee
  if (action === 'COVER') {
    const note = enemy?.ranged
      ? 'COVER TAKEN — ranged DMG halved next hit'
      : 'COVER TAKEN — melee DMG -1 next hit';
    const withCover = {
      ...state,
      combat: { ...state.combat, coverActive: true, log: [...combatLog, note] },
    };
    return enemyAttack(withCover);
  }

  // JAM — scramble enemy sensors; very effective vs ranged (≥10), risky vs melee (≥17)
  if (action === 'JAM') {
    const threshold = enemy?.ranged ? 10 : 17;
    const roll = d20();
    const ok = roll >= threshold;
    const clog = ok
      ? [`JAM [${roll}] — ${enemy?.name} SIGNAL SCRAMBLED`]
      : [`JAM [${roll}] — JAM FAILED (needed ${threshold})`];
    const withJam = { ...state, combat: { ...state.combat, log: [...combatLog, ...clog] } };
    if (ok) return withJam; // enemy stunned, player keeps turn
    return enemyAttack(withJam);
  }

  return state;
}

// ─── Portal ───────────────────────────────────────────────────────────────────

function enterPortal(state) {
  const roll = d20();
  const consequence = PORTAL_TABLE[roll - 1];
  let p = { ...state.player };

  if (consequence.includes('lose 3 HP'))           p.hp = Math.max(0, p.hp - 3);
  if (consequence.includes('lose 2 Power Cells'))  p.powerCells = Math.max(0, p.powerCells - 2);
  if (consequence.includes('gain 1 Corrupted'))    p.corruptedFragments++;
  if (consequence.includes('gain 2 Data'))         p.dataShards += 2;

  let forceNext = null;
  if (consequence.includes('next roll auto-succeeds'))   forceNext = 'CRITICAL_UPLINK';
  if (consequence.includes('next roll is Signal Lost'))  forceNext = 'SIGNAL_LOST';

  let enemies = state.enemies;
  if (consequence.includes('Phantom Echo materialises')) {
    enemies = [...enemies, {
      id: `echo_${Date.now()}`, key: 'phantom_echo',
      ...ENEMY_DEFS.phantom_echo, maxHp: ENEMY_DEFS.phantom_echo.hp,
      pos: { x: Math.min(W-2, state.playerPos.x + 2), y: state.playerPos.y },
      alive: true,
    }];
  }

  return {
    ...state, player: p, enemies, forceNext,
    portalRoll: { roll, consequence },
    phase: p.hp <= 0 ? 'DEAD' : 'PORTAL',
    log: [...state.log, `VOID PORTAL [${roll}] — ${consequence}`],
  };
}

// ─── Item Logic ───────────────────────────────────────────────────────────────

// Apply a consumable item's fx to player state. Returns [newPlayer, newForceNext].
function applyItemFx(player, fx, forceNext) {
  let p = { ...player };
  let fn = forceNext;
  if (fx.heal)         p.hp = Math.min(p.maxHp, p.hp + fx.heal);
  if (fx.healFull)     p.hp = p.maxHp;
  if (fx.maxhp)        { p.maxHp += fx.maxhp; p.hp += fx.maxhp; }
  if (fx.cells)        p.powerCells = Math.min(p.maxPowerCells ?? 99, p.powerCells + fx.cells);
  if (fx.shards)       p.dataShards += fx.shards;
  if (fx.phaseRestore) p.phaseStepUsed = false;
  if (fx.dmgBuff)      p.dmgBuff = (p.dmgBuff || 0) + fx.dmgBuff;
  if (fx.corruption)   p.corruptedFragments = Math.max(0, (p.corruptedFragments || 0) + fx.corruption);
  if (fx.forceCrit)    fn = 'CRITICAL_UPLINK';
  return [p, fn];
}

function buyItem(state, item) {
  const { player } = state;
  if (player.dataShards < item.price) return state; // can't afford

  let newPlayer = { ...player, dataShards: player.dataShards - item.price };
  let newForceNext = state.forceNext;

  if (item.cat === 'weapon') {
    // Equip immediately, old weapon dropped
    newPlayer = { ...newPlayer, equipped: { ...newPlayer.equipped, weapon: item } };
  } else if (item.cat === 'armor') {
    newPlayer = { ...newPlayer, equipped: { ...newPlayer.equipped, armor: item } };
  } else {
    // food / misc: add to inventory (max 8 slots)
    if (newPlayer.inventory.length >= 8) return { ...state, log: [...state.log, 'INVENTORY FULL'] };
    newPlayer = { ...newPlayer, inventory: [...newPlayer.inventory, item] };
  }

  return {
    ...state,
    player: newPlayer,
    forceNext: newForceNext,
    log: [...state.log, `PURCHASED: ${item.name} (${item.price} SHARDS)`],
  };
}

function useInventoryItem(state, idx) {
  const item = state.player.inventory[idx];
  if (!item) return state;
  const newInv = state.player.inventory.filter((_, i) => i !== idx);
  const [newPlayer, newForceNext] = applyItemFx({ ...state.player, inventory: newInv }, item.fx, state.forceNext);
  return {
    ...state,
    player: newPlayer,
    forceNext: newForceNext,
    log: [...state.log, `USED: ${item.name}`],
  };
}

// ─── Quick Save / Load ────────────────────────────────────────────────────────

const SAVE_KEY = 'void-crawl-qs';

function saveGame(state) {
  const payload = {
    phase: state.phase === 'SHOP' ? 'EXPLORE' : state.phase, // don't save mid-shop
    deck: state.deck,
    grid: state.grid,
    player: state.player,
    playerPos: state.playerPos,
    portalPos: state.portalPos,
    enemies: state.enemies,
    merchants: state.merchants,
    combat: state.combat,
    activeEnemy: state.activeEnemy,
    log: state.log.slice(-20),
    rollResult: state.rollResult,
    portalRoll: state.portalRoll,
    forceNext: state.forceNext,
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return {
      ...JSON.parse(raw),
      hallOfHeads: JSON.parse(localStorage.getItem('void-hall') || '[]'),
      screenShake: false,
      glitch: false,
    };
  } catch {
    return null;
  }
}

// ─── Hall of Heads ────────────────────────────────────────────────────────────

function enshrine(state) {
  const entry = {
    date: new Date().toLocaleDateString(),
    deck: state.deck,
    hp: state.player.hp,
    shards: state.player.dataShards,
    fragments: state.player.corruptedFragments,
    kills: state.enemies.filter(e => !e.alive).length,
  };
  const hall = [...state.hallOfHeads, entry];
  localStorage.setItem('void-hall', JSON.stringify(hall));
  return { ...state, hallOfHeads: hall, phase: 'HALL' };
}

// ─── Canvas Drawing ───────────────────────────────────────────────────────────

const C = {
  wallLit:   '#223322', wallDim:   '#0d1a0d',
  floorLit:  '#0d2b0d', floorDim:  '#081508',
  portalLit: '#2d0060', playerCol: '#39ff14',
  enemyCol:  '#ff3914',
};

function drawFrame(canvas, state, t) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const { grid, playerPos, enemies, deck } = state;
  const biofog = DECKS[deck]?.biofog;

  ctx.fillStyle = '#020402';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = `${TS - 2}px 'VT323', monospace`;
  ctx.textBaseline = 'top';

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const tile = grid[y][x];
      if (tile.fog === 'DARK') continue;
      const px = x * TS, py = y * TS;
      const lit = tile.fog === 'LIT';

      if (tile.type === 'portal') {
        const pulse = Math.sin(t * 0.003) * 0.5 + 0.5;
        ctx.fillStyle = `rgba(${Math.floor(150 + pulse * 100)}, 0, ${Math.floor(180 + pulse * 75)}, 1)`;
        ctx.fillRect(px, py, TS, TS);
        ctx.fillStyle = `rgba(200, 0, 255, ${0.6 + pulse * 0.4})`;
        ctx.fillText('◉', px + 1, py);
      } else if (isMerchantTile(tile)) {
        const mType = merchantTypeFromTile(tile);
        const mt = MERCHANT_TYPES[mType];
        ctx.fillStyle = lit ? '#1a1400' : '#0d0a00';
        ctx.fillRect(px, py, TS, TS);
        if (lit) {
          const blink = Math.sin(t * 0.004 + x) > 0;
          ctx.fillStyle = blink ? mt.color : '#886600';
          ctx.fillText(mt.char, px + 1, py);
        }
      } else if (tile.type === 'wall') {
        ctx.fillStyle = lit ? C.wallLit : C.wallDim;
        ctx.fillRect(px, py, TS, TS);
      } else {
        ctx.fillStyle = lit ? C.floorLit : C.floorDim;
        ctx.fillRect(px, py, TS, TS);
        if (lit) {
          ctx.fillStyle = '#1a4d1a';
          ctx.fillText('·', px + 2, py + 1);
        }
      }

      if (biofog && lit) {
        ctx.fillStyle = 'rgba(0,255,80,0.07)';
        ctx.fillRect(px, py, TS, TS);
      }
    }
  }

  // Enemies
  enemies.forEach(e => {
    if (!e.alive) return;
    const fog = grid[e.pos.y]?.[e.pos.x]?.fog;
    if (!fog || fog === 'DARK') return;
    const flicker = Math.sin(t * 0.005 + e.pos.x * 1.7) > 0.2;
    if (!flicker) return;
    ctx.fillStyle = C.enemyCol;
    ctx.fillText(ENEMY_CHAR[e.key] || '?', e.pos.x * TS + 1, e.pos.y * TS);
  });

  // Player
  const pulse = Math.sin(t * 0.008) * 0.25 + 0.75;
  ctx.fillStyle = `rgba(57, 255, 20, ${pulse})`;
  ctx.fillText('@', playerPos.x * TS + 1, playerPos.y * TS);

  // Scanlines
  ctx.fillStyle = 'rgba(0,0,0,0.07)';
  for (let sy = 0; sy < canvas.height; sy += 2) ctx.fillRect(0, sy, canvas.width, 1);

  // Glitch
  if (state.glitch) {
    for (let i = 0; i < 4; i++) {
      const sy = Math.floor(Math.random() * canvas.height);
      const sh = 3 + Math.floor(Math.random() * 6);
      try {
        const slice = ctx.getImageData(0, sy, canvas.width, sh);
        ctx.putImageData(slice, (Math.random() - 0.5) * 18, sy);
      } catch (_) {}
    }
    ctx.fillStyle = 'rgba(255,0,60,0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [state, setState] = useState(() => buildState(1, null));
  const [hasSave, setHasSave] = useState(() => !!localStorage.getItem(SAVE_KEY));
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);
  const tRef      = useRef(0);
  const stateRef  = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const loop = t => {
      tRef.current = t;
      drawFrame(canvasRef.current, stateRef.current, t);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const move = useCallback((dir) => {
    setState(s => {
      if (s.phase !== 'EXPLORE') return s;
      const nx = s.playerPos.x + dir.x, ny = s.playerPos.y + dir.y;

      const bump = s.enemies.find(e => e.alive && e.pos.x === nx && e.pos.y === ny);
      if (bump) return startCombat(s, bump);
      if (!walkable(s.grid, s.enemies, { x: nx, y: ny })) return s;

      const newPos = { x: nx, y: ny };
      const tile = s.grid[ny][nx];
      const newGrid = revealFog(s.grid, newPos);

      if (tile.type === 'portal') {
        return enterPortal({ ...s, playerPos: newPos, grid: newGrid });
      }

      if (isMerchantTile(tile)) {
        const mType = merchantTypeFromTile(tile);
        const stock = merchantStock(mType, s.deck);
        return {
          ...s, playerPos: newPos, grid: newGrid,
          phase: 'SHOP',
          activeMerchant: { type: mType, stock },
          log: [...s.log, `${MERCHANT_TYPES[mType].name} — OPEN FOR BUSINESS`],
        };
      }

      return stepEnemies({ ...s, playerPos: newPos, grid: newGrid, screenShake: false, glitch: false });
    });
  }, []);

  useEffect(() => {
    const onKey = e => {
      const map = {
        ArrowUp:'N', ArrowDown:'S', ArrowLeft:'W', ArrowRight:'E',
        w:'N', s:'S', a:'W', d:'E', k:'N', j:'S', h:'W', l:'E',
      };
      const dir = map[e.key];
      if (!dir) return;
      e.preventDefault();
      const DIRS = { N:{x:0,y:-1}, S:{x:0,y:1}, W:{x:-1,y:0}, E:{x:1,y:0} };
      move(DIRS[dir]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [move]);

  const touchStart = useRef(null);
  const onTouchStart = e => { touchStart.current = e.touches[0]; };
  const onTouchEnd   = e => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.clientX;
    const dy = e.changedTouches[0].clientY - touchStart.current.clientY;
    touchStart.current = null;
    if (Math.abs(dx) < 12 && Math.abs(dy) < 12) return;
    if (Math.abs(dx) > Math.abs(dy)) move({ x: dx > 0 ? 1 : -1, y: 0 });
    else                              move({ x: 0, y: dy > 0 ? 1 : -1 });
  };

  const combat = action => setState(s => doCombatAction(s, action));

  const advanceDeck = () => setState(s => {
    if (s.deck >= 3) return enshrine(s);
    const next = buildState(s.deck + 1, { ...s.player, phaseStepUsed: false });
    return { ...next, hallOfHeads: s.hallOfHeads };
  });

  const restart = () => setState(buildState(1, null));

  const quickSave = () => {
    saveGame(state);
    setHasSave(true);
  };

  const quickLoad = () => {
    const s = loadGame();
    if (s) setState(s);
  };

  const [showInventory, setShowInventory] = useState(false);

  const useItem = idx => setState(s => useInventoryItem(s, idx));
  const buy     = item => setState(s => buyItem(s, item));
  const closeShop = () => setState(s => ({ ...s, phase: 'EXPLORE', activeMerchant: null }));

  const { player, phase, log, combat: cbt, activeEnemy, deck, hallOfHeads } = state;
  const deckInfo = DECKS[deck];
  const contacts = state.enemies.filter(e => e.alive).length;

  const S = {
    app: {
      display:'flex', flexDirection:'column', alignItems:'center',
      minHeight:'100vh', background:'#020402', color:'#39ff14',
      fontFamily:"'VT323','Courier New',monospace", fontSize:'16px', padding:'6px',
    },
    header: {
      width:'100%', maxWidth:`${W*TS}px`,
      display:'flex', justifyContent:'space-between',
      padding:'3px 0', borderBottom:'1px solid #1a4d1a', marginBottom:'4px', fontSize:'13px',
    },
    canvasWrap: {
      position:'relative',
      animation: state.screenShake ? 'shake 0.25s ease' : 'none',
    },
    canvas: { display:'block', border:'1px solid #1a4d1a', imageRendering:'pixelated' },
    hud: {
      width:'100%', maxWidth:`${W*TS}px`,
      display:'grid', gridTemplateColumns:'1fr 1fr 1fr',
      gap:'4px', marginTop:'5px', fontSize:'13px',
    },
    stat: { background:'#050a05', border:'1px solid #1a4d1a', padding:'3px 6px', textAlign:'center' },
    bar: (val, max, col) => ({
      background:'#0a0a0a', height:'3px', marginTop:'2px',
      position:'relative', overflow:'hidden',
    }),
    barFill: (val, max, col) => ({
      background: col, height:'100%', width:`${Math.max(0,(val/max)*100)}%`, transition:'width 0.2s',
    }),
    logBox: {
      width:'100%', maxWidth:`${W*TS}px`, height:'56px', overflowY:'auto',
      background:'#050a05', border:'1px solid #1a4d1a', padding:'3px 6px',
      marginTop:'5px', fontSize:'12px',
    },
    dpad: {
      display:'grid',
      gridTemplateAreas:`". up ." "left . right" ". down ."`,
      gridTemplateColumns:'44px 44px 44px', gridTemplateRows:'44px 44px 44px',
      gap:'3px', marginTop:'6px',
    },
    dpBtn: area => ({
      gridArea:area, background:'#050a05', border:'1px solid #1a4d1a',
      color:'#39ff14', fontSize:'18px', cursor:'pointer',
      display:'flex', alignItems:'center', justifyContent:'center',
    }),
    combatPanel: {
      width:'100%', maxWidth:`${W*TS}px`,
      background:'#050a05', border:'1px solid #ff3914', padding:'8px', marginTop:'5px',
    },
    cBtn: {
      background:'#0a0500', border:'1px solid #39ff14', color:'#39ff14',
      fontFamily:"'VT323',monospace", fontSize:'16px',
      padding:'5px 10px', cursor:'pointer', margin:'2px', minWidth:'72px',
    },
    overlay: {
      position:'fixed', inset:0, background:'rgba(2,4,2,0.93)',
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      zIndex:100, fontFamily:"'VT323',monospace", color:'#39ff14', textAlign:'center', padding:'20px',
    },
    oBtn: {
      background:'#050a05', border:'1px solid #39ff14', color:'#39ff14',
      fontFamily:"'VT323',monospace", fontSize:'20px',
      padding:'10px 24px', cursor:'pointer', marginTop:'16px',
    },
  };

  return (
    <div style={S.app} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <style>{`
        @keyframes shake {
          0%,100%{transform:translate(0,0)}
          25%{transform:translate(-3px,2px)}
          50%{transform:translate(3px,-2px)}
          75%{transform:translate(-2px,3px)}
        }
        button:active{opacity:0.7}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-track{background:#020402}
        ::-webkit-scrollbar-thumb{background:#1a4d1a}
      `}</style>

      {/* Header */}
      <div style={S.header}>
        <span>DECK {deck}: {deckInfo.name}</span>
        <span style={{color: contacts > 0 ? '#ff3914' : '#39ff14'}}>
          {contacts > 0 ? `☠ ${contacts}` : '✓ CLEAR'}
        </span>
        <span style={{display:'flex', gap:'4px'}}>
          <button style={{...S.cBtn, fontSize:'11px', padding:'1px 6px', margin:0}}
            onClick={() => setShowInventory(v => !v)}>
            BAG({player.inventory.length})
          </button>
          <button style={{...S.cBtn, fontSize:'11px', padding:'1px 6px', margin:0,
            opacity: ['DEAD','HALL'].includes(phase) ? 0.35 : 1 }}
            onClick={quickSave} disabled={['DEAD','HALL'].includes(phase)}>
            SAVE
          </button>
        </span>
      </div>

      {/* Canvas */}
      <div style={S.canvasWrap}>
        <canvas ref={canvasRef} width={W*TS} height={H*TS} style={S.canvas} />
        <div style={{
          position:'absolute', inset:0, pointerEvents:'none',
          background:'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)',
        }}/>
      </div>

      {/* HUD */}
      <div style={S.hud}>
        <div style={S.stat}>
          <div>HP {player.hp}/{player.maxHp}</div>
          <div style={S.bar()}>
            <div style={S.barFill(player.hp, player.maxHp, player.hp > 8 ? '#39ff14' : '#ff3914')} />
          </div>
        </div>
        <div style={S.stat}>⚡ {player.powerCells} CELLS</div>
        <div style={S.stat}>◈ {player.dataShards} SHARDS</div>
      </div>

      {!player.phaseStepUsed && phase === 'EXPLORE' && (
        <div style={{
          maxWidth:`${W*TS}px`, width:'100%', marginTop:'4px', fontSize:'11px',
          color:'#39ccff', border:'1px solid #1a3344', background:'#020408',
          padding:'2px 6px', textAlign:'center',
        }}>
          PHASE STEP READY — Signal Lost → Static Pass (1×/deck)
        </div>
      )}

      {/* Combat panel */}
      {phase === 'COMBAT' && activeEnemy && (
        <div style={S.combatPanel}>
          <div style={{color:'#ff3914', marginBottom:'4px'}}>
            ⚔ {activeEnemy.name} — {activeEnemy.hp}/{activeEnemy.maxHp} HP
            <div style={S.bar()}>
              <div style={S.barFill(activeEnemy.hp, activeEnemy.maxHp, '#ff3914')} />
            </div>
          </div>
          <div style={{fontSize:'11px', color:'#888', marginBottom:'5px', minHeight:'28px'}}>
            {cbt?.log.slice(-2).map((l,i) => <div key={i}>{l}</div>)}
          </div>
          {/* Enemy type tag */}
          {activeEnemy?.ranged && (
            <div style={{fontSize:'11px', color:'#ffcc00', marginBottom:'4px'}}>
              ◈ RANGED — JAM easy, COVER effective, DODGE hard
            </div>
          )}
          <div style={{display:'flex', flexWrap:'wrap', gap:'3px'}}>
            {/* SHOOT */}
            <button style={{
              ...S.cBtn,
              opacity: player.powerCells <= 0 ? 0.35 : 1,
              borderColor: player.powerCells > 0 ? '#39ff14' : '#333',
              position: 'relative',
            }}
              onClick={() => combat('SHOOT')}
              disabled={player.powerCells <= 0}>
              SHOOT {player.powerCells > 0 ? `⚡${player.powerCells}` : '—'}
            </button>
            {/* MELEE */}
            <button style={S.cBtn} onClick={() => combat('MELEE')}>MELEE</button>
            {/* DODGE */}
            <button style={{
              ...S.cBtn,
              borderColor: activeEnemy?.ranged ? '#886600' : '#39ff14',
            }} onClick={() => combat('DODGE')}>
              DODGE {activeEnemy?.ranged ? '⚠' : ''}
            </button>
            {/* COVER */}
            <button style={{
              ...S.cBtn,
              borderColor: activeEnemy?.ranged ? '#ffcc00' : '#333',
              color: activeEnemy?.ranged ? '#ffcc00' : '#555',
            }} onClick={() => combat('COVER')}>
              COVER {activeEnemy?.ranged ? '✓' : ''}
            </button>
            {/* JAM */}
            <button style={{
              ...S.cBtn,
              borderColor: activeEnemy?.ranged ? '#39ff14' : '#333',
              color: activeEnemy?.ranged ? '#39ff14' : '#555',
            }} onClick={() => combat('JAM')}>
              JAM {activeEnemy?.ranged ? '✓✓' : ''}
            </button>
          </div>
        </div>
      )}

      {/* D-pad */}
      {phase === 'EXPLORE' && (
        <div style={S.dpad}>
          <button style={S.dpBtn('up')}    onClick={() => move({x:0,y:-1})}>▲</button>
          <button style={S.dpBtn('left')}  onClick={() => move({x:-1,y:0})}>◀</button>
          <button style={S.dpBtn('right')} onClick={() => move({x:1,y:0})}>▶</button>
          <button style={S.dpBtn('down')}  onClick={() => move({x:0,y:1})}>▼</button>
        </div>
      )}

      {/* Log */}
      <div style={S.logBox}>
        {log.slice(-10).map((l, i) => <div key={i} style={{color: l.includes('DEAD')||l.includes('TERMINATED') ? '#ff3914' : '#39ff14'}}>{l}</div>)}
      </div>

      {/* Load button */}
      <div style={{ width:'100%', maxWidth:`${W*TS}px`, display:'flex', gap:'4px', marginTop:'4px' }}>
        <button style={{
          ...S.cBtn, flex:1, fontSize:'12px', padding:'3px',
          borderColor: hasSave ? '#39ff14' : '#1a4d1a', color: hasSave ? '#39ff14' : '#333',
          cursor: hasSave ? 'pointer' : 'default',
        }} onClick={quickLoad} disabled={!hasSave}>
          {hasSave ? 'LOAD SAVE' : 'NO SAVE'}
        </button>
        {player.equipped.weapon && (
          <div style={{...S.stat, flex:1, fontSize:'11px', color:'#ffcc00', borderColor:'#554400'}}>
            ⚔ {player.equipped.weapon.name} (+{player.equipped.weapon.fx.dmgBonus})
          </div>
        )}
        {player.equipped.armor && (
          <div style={{...S.stat, flex:1, fontSize:'11px', color:'#44aaff', borderColor:'#224466'}}>
            🛡 {player.equipped.armor.name} (-{player.equipped.armor.fx.defense})
          </div>
        )}
      </div>

      {/* ── Overlays ── */}

      {/* Inventory */}
      {showInventory && (
        <div style={{...S.overlay, zIndex:200}} onClick={() => setShowInventory(false)}>
          <div style={{background:'#020402', border:'1px solid #1a4d1a', padding:'12px',
            maxWidth:'320px', width:'100%', maxHeight:'80vh', overflowY:'auto'}}
            onClick={e => e.stopPropagation()}>
            <div style={{fontSize:'22px', marginBottom:'8px'}}>
              ▣ INVENTORY ({player.inventory.length}/8)
            </div>
            {player.equipped.weapon && (
              <div style={{fontSize:'12px', color:'#ffcc00', marginBottom:'4px'}}>
                WEAPON: {player.equipped.weapon.name} (+{player.equipped.weapon.fx.dmgBonus} DMG)
              </div>
            )}
            {player.equipped.armor && (
              <div style={{fontSize:'12px', color:'#44aaff', marginBottom:'8px'}}>
                ARMOR: {player.equipped.armor.name} (-{player.equipped.armor.fx.defense} DMG TAKEN)
              </div>
            )}
            {player.inventory.length === 0
              ? <div style={{color:'#333', padding:'16px 0', textAlign:'center'}}>EMPTY</div>
              : player.inventory.map((it, i) => (
                  <div key={i} style={{
                    display:'flex', justifyContent:'space-between', alignItems:'center',
                    borderBottom:'1px solid #1a4d1a', padding:'5px 0', fontSize:'13px',
                  }}>
                    <div>
                      <div style={{color: it.cat==='food'?'#39ff14':it.cat==='misc'?'#aaffaa':'#fff'}}>
                        {it.name}
                      </div>
                      <div style={{fontSize:'11px', color:'#555'}}>{it.desc}</div>
                    </div>
                    <button style={{...S.cBtn, fontSize:'12px', padding:'3px 8px', margin:0}}
                      onClick={() => useItem(i)}>
                      USE
                    </button>
                  </div>
                ))
            }
            <button style={{...S.cBtn, width:'100%', marginTop:'10px', fontSize:'14px'}}
              onClick={() => setShowInventory(false)}>
              CLOSE
            </button>
          </div>
        </div>
      )}

      {/* Shop */}
      {phase === 'SHOP' && state.activeMerchant && (() => {
        const mt = MERCHANT_TYPES[state.activeMerchant.type];
        return (
          <div style={S.overlay}>
            <div style={{background:'#020402', border:`1px solid ${mt.color}`, padding:'12px',
              maxWidth:'340px', width:'100%', maxHeight:'85vh', overflowY:'auto'}}>
              <div style={{fontSize:'24px', color: mt.color, marginBottom:'4px'}}>
                {mt.char} {mt.name}
              </div>
              <div style={{fontSize:'13px', color:'#555', marginBottom:'10px'}}>
                BALANCE: {player.dataShards} DATA SHARDS
              </div>
              {state.activeMerchant.stock.map((item, i) => {
                const canAfford = player.dataShards >= item.price;
                const catColor = item.cat==='weapon'?'#ffcc00':item.cat==='armor'?'#44aaff':item.cat==='food'?'#39ff14':'#aaffaa';
                return (
                  <div key={i} style={{
                    display:'flex', justifyContent:'space-between', alignItems:'center',
                    borderBottom:'1px solid #1a2a1a', padding:'6px 0', gap:'8px',
                  }}>
                    <div style={{flex:1}}>
                      <div style={{color: catColor, fontSize:'13px'}}>{item.name}</div>
                      <div style={{fontSize:'11px', color:'#555'}}>{item.desc}</div>
                    </div>
                    <button style={{
                      ...S.cBtn, fontSize:'12px', padding:'3px 8px', margin:0, whiteSpace:'nowrap',
                      opacity: canAfford ? 1 : 0.35,
                      borderColor: canAfford ? '#39ff14' : '#333',
                      cursor: canAfford ? 'pointer' : 'default',
                    }} onClick={() => canAfford && buy(item)} disabled={!canAfford}>
                      {item.price}◈
                    </button>
                  </div>
                );
              })}
              <div style={{display:'flex', gap:'6px', marginTop:'10px'}}>
                <button style={{...S.cBtn, flex:1, fontSize:'14px'}} onClick={closeShop}>
                  LEAVE
                </button>
                <button style={{...S.cBtn, flex:1, fontSize:'14px'}} onClick={quickSave}>
                  SAVE
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {phase === 'PORTAL' && state.portalRoll && (
        <div style={S.overlay}>
          <div style={{fontSize:'40px', color:'#cc00ff', marginBottom:'12px'}}>◉</div>
          <div style={{fontSize:'28px', marginBottom:'6px'}}>VOID PORTAL</div>
          <div style={{fontSize:'22px', color:'#888', marginBottom:'6px'}}>D20: {state.portalRoll.roll}</div>
          <div style={{fontSize:'18px', color:'#cc00ff', marginBottom:'20px', maxWidth:'300px'}}>
            {state.portalRoll.consequence}
          </div>
          <div style={{display:'flex', gap:'8px'}}>
            <button style={{...S.oBtn, color:'#cc00ff', borderColor:'#cc00ff'}} onClick={advanceDeck}>
              {deck < 3 ? `DESCEND TO DECK ${deck+1}` : 'ENSHRINE OPERATIVE'}
            </button>
            <button style={{...S.oBtn, fontSize:'16px'}} onClick={quickSave}>SAVE</button>
          </div>
        </div>
      )}

      {phase === 'DEAD' && (
        <div style={S.overlay}>
          <div style={{fontSize:'56px', color:'#ff3914', marginBottom:'12px'}}>☠</div>
          <div style={{fontSize:'32px', marginBottom:'8px', color:'#ff3914'}}>SIGNAL TERMINATED</div>
          <div style={{fontSize:'16px', color:'#555', marginBottom:'8px'}}>
            DECK {deck} — {state.enemies.filter(e=>!e.alive).length} CONTACTS NEUTRALISED
          </div>
          <div style={{fontSize:'14px', color:'#333', marginBottom:'24px'}}>
            HP {player.hp} | SHARDS {player.dataShards}
          </div>
          <button style={S.oBtn} onClick={restart}>NEW OPERATIVE</button>
        </div>
      )}

      {phase === 'HALL' && (
        <div style={S.overlay}>
          <div style={{fontSize:'36px', marginBottom:'12px'}}>☠ HALL OF HEADS</div>
          <div style={{
            maxHeight:'280px', overflowY:'auto', width:'100%', maxWidth:'360px',
            border:'1px solid #1a4d1a',
          }}>
            {hallOfHeads.length === 0
              ? <div style={{padding:'16px', color:'#333'}}>NO OPERATIVES ENSHRINED</div>
              : [...hallOfHeads].reverse().map((h, i) => (
                  <div key={i} style={{
                    borderBottom:'1px solid #1a4d1a', padding:'8px',
                    textAlign:'left', fontSize:'13px',
                  }}>
                    <div style={{color:'#39ff14'}}>DECK {h.deck} CLEARED — {h.date}</div>
                    <div style={{color:'#555', fontSize:'12px'}}>
                      HP {h.hp} · SHARDS {h.shards} · KILLS {h.kills}
                    </div>
                  </div>
                ))
            }
          </div>
          <button style={S.oBtn} onClick={restart}>NEW OPERATIVE</button>
        </div>
      )}
    </div>
  );
}

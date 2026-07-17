# Last City class ability icons

Generated from `cls_feat_*.2da` -> `feat.2da.ICON` and `spells.2da.IconResRef`.

- Custom class feat rows: 219
- OnMenu=1 ability rows: 145
- Unique icon resrefs: 115
- Extracted icon PNGs: 111
- Missing icon images: 4
- Extracted source: `lc_icons.hak`

## Generated files

- `ability-icons.csv`: all 219 `FEAT_*` rows from active custom class feat tables.
- `ability-icons-onmenu.csv`: 145 rows where `OnMenu=1`.
- `ability-icons-missing-or-mismatch.csv`: 25 rows with mismatched icon data, spell FeatID mismatch, or the known Engineer script issue.
- `extracted-icons/`: extracted icon files as PNG plus raw TGA.
- `ability-icons-contact-sheet.png`: all extracted unique icon resrefs.
- `ability-icons-onmenu-contact-sheet.png`: class-by-class `OnMenu=1` icon sheet.

## Missing icon resrefs

These resrefs are referenced by class ability data but do not exist as TGA/DDS in the scanned HAK/BIF sources.

| Referenced resref | Likely existing resref | Source of problem |
|---|---|---|
| `if_sci_animus` | `if_sci_anms` | `spells.2da.IconResRef` differs from `feat.2da.ICON` for `FEAT_SCIENTIST_ANIMUS`. |
| `if_chr_avoid` | `if_chr_avd` | `spells.2da.IconResRef` differs from `feat.2da.ICON` for `FEAT_CHARLATAN_AVOID`. |
| `if_chr_strike` | `if_chr_strk` | `spells.2da.IconResRef` differs from `feat.2da.ICON` for `FEAT_CHARLATAN_CHEAP_STRIKE`. |
| `if_chr_risk` | none found | `feat.2da.ICON` for `FEAT_CHARLATAN_RISK`; no spell icon and no matching image found. |

## Per class

| Class | FEAT rows | OnMenu rows | Feat icons | Spell icons |
|---|---:|---:|---|---|
| Alchemist | 21 | 12 | `if_alchm_1, if_alchm_2, if_alchm_3, if_alchm_4, if_alchm_5, if_alchm_6, if_alchm_passive, if_sci_anms, if_sci_dice_gra, if_sci_foc_gra, if_sci_ic_gra, if_sci_lepid, if_sci_recipes, if_sci_rhod, if_sci_symph, if_sci_vis, if_sci_x3_gra` | `if_alchm_1, if_alchm_2, if_alchm_3, if_alchm_4, if_alchm_5, if_alchm_6, if_sci_animus, if_sci_lepid, if_sci_rhod, if_sci_symph, if_sci_vis, if_sci_x3_gra` |
| Archer | 15 | 10 | `if_arr_1, if_arr_3, if_arr_4, if_arr_5, if_arr_6, if_arr_passive, if_trk_t_ba, if_trk_t_du, if_trk_t_fl, if_trk_t_fr, if_trk_t_vi` | `if_arr_1, if_arr_3, if_arr_4, if_arr_5, if_arr_6, if_trk_t_ba, if_trk_t_du, if_trk_t_fl, if_trk_t_fr, if_trk_t_vi` |
| Assassin | 16 | 11 | `if_asn_1, if_asn_2, if_asn_3, if_asn_4, if_asn_5, if_asn_passive, if_chr_caltr, if_chr_leg_s, if_chr_poisn, if_chr_risk, if_chr_sand, if_chr_trick` | `if_asn_1, if_asn_2, if_asn_3, if_asn_4, if_asn_5, if_chr_caltrops, if_chr_leg_sweep, if_chr_poison, if_chr_sand, if_chr_trick` |
| Berserker | 16 | 10 | `if_brsrk_1, if_brsrk_2, if_brsrk_3, if_brsrk_4, if_brsrk_5, if_brsrk_passive, if_war_eyes, if_war_fear, if_war_iway, if_war_lung, if_war_rank, if_war_shlds` | `if_brsrk_1, if_brsrk_2, if_brsrk_3, if_brsrk_4, if_brsrk_5, if_war_eyes, if_war_fear, if_war_iway, if_war_rank, if_war_shlds` |
| Boxer | 16 | 11 | `if_bxr_1, if_bxr_2, if_bxr_3, if_bxr_4, if_bxr_5, if_bxr_passive, if_chr_caltr, if_chr_leg_s, if_chr_poisn, if_chr_risk, if_chr_sand, if_chr_trick` | `if_bxr_1, if_bxr_2, if_bxr_3, if_bxr_4, if_bxr_5, if_chr_caltrops, if_chr_leg_sweep, if_chr_poison, if_chr_sand, if_chr_trick` |
| Charlatan | 9 | 7 | `if_chr_avd, if_chr_caltr, if_chr_leg_s, if_chr_maxlvl, if_chr_poisn, if_chr_risk, if_chr_sand, if_chr_strk, if_chr_trick` | `if_chr_avoid, if_chr_caltrops, if_chr_leg_sweep, if_chr_poison, if_chr_sand, if_chr_strike, if_chr_trick` |
| Engineer | 17 | 11 | `if_engnr_1, if_engnr_2, if_engnr_3, if_engnr_4, if_engnr_5, if_engnr_6, if_engnr_passive, if_sci_anms, if_sci_lepid, if_sci_recipes, if_sci_rhod, if_sci_symph, if_sci_vis` | `if_engnr_1, if_engnr_2, if_engnr_3, if_engnr_4, if_engnr_5, if_engnr_6, if_sci_animus, if_sci_lepid, if_sci_rhod, if_sci_symph, if_sci_vis` |
| Hunter | 15 | 10 | `if_htr_1, if_htr_2, if_htr_3, if_htr_4, if_htr_5, if_htr_passive, if_trk_t_ba, if_trk_t_du, if_trk_t_fl, if_trk_t_fr, if_trk_t_vi` | `if_htr_1, if_htr_2, if_htr_3, if_htr_4, if_htr_5, if_trk_t_ba, if_trk_t_du, if_trk_t_fl, if_trk_t_fr, if_trk_t_vi` |
| Knight | 16 | 9 | `if_knght_1, if_knght_2, if_knght_3, if_knght_4, if_knght_5, if_knght_passive, if_war_eyes, if_war_fear, if_war_iway, if_war_lung, if_war_rank, if_war_shlds` | `if_knght_1, if_knght_2, if_knght_3, if_knght_4, if_war_eyes, if_war_fear, if_war_iway, if_war_rank, if_war_shlds` |
| Medic | 16 | 10 | `if_mdc_1, if_mdc_2, if_mdc_3, if_mdc_4, if_mdc_5, if_mdc_passive, if_sci_anms, if_sci_lepid, if_sci_recipes, if_sci_rhod, if_sci_symph, if_sci_vis` | `if_mdc_1, if_mdc_2, if_mdc_3, if_mdc_4, if_mdc_5, if_sci_animus, if_sci_lepid, if_sci_rhod, if_sci_symph, if_sci_vis` |
| Scientist | 13 | 9 | `cls_sci_gra_off, cls_sci_x_off, if_sci_anms, if_sci_foc_gra, if_sci_heal, if_sci_ic_gra, if_sci_lepid, if_sci_maxlvl, if_sci_recipes, if_sci_rhod, if_sci_symph, if_sci_vis, if_sci_x3_gra` | `cls_sci_gra_off, cls_sci_x_off, if_sci_animus, if_sci_heal, if_sci_lepid, if_sci_rhod, if_sci_symph, if_sci_vis, if_sci_x3_gra` |
| Shieldmaster | 16 | 10 | `if_shld_1, if_shld_2, if_shld_3, if_shld_4, if_shld_5, if_shld_passive, if_war_eyes, if_war_fear, if_war_iway, if_war_lung, if_war_rank, if_war_shlds` | `if_shld_1, if_shld_2, if_shld_3, if_shld_4, if_shld_5, if_war_eyes, if_war_fear, if_war_iway, if_war_rank, if_war_shlds` |
| Tamer | 16 | 11 | `if_tmr_1, if_tmr_2, if_tmr_3, if_tmr_4, if_tmr_5, if_tmr_6, if_tmr_passive, if_trk_t_ba, if_trk_t_du, if_trk_t_fl, if_trk_t_fr, if_trk_t_vi` | `if_tmr_1, if_tmr_2, if_tmr_3, if_tmr_4, if_tmr_5, if_tmr_6, if_trk_t_ba, if_trk_t_du, if_trk_t_fl, if_trk_t_fr, if_trk_t_vi` |
| Tracker | 8 | 7 | `if_trk_maxlvl, if_trk_rene, if_trk_root, if_trk_t_ba, if_trk_t_du, if_trk_t_fl, if_trk_t_fr, if_trk_t_vi` | `if_trk_rene, if_trk_root, if_trk_t_ba, if_trk_t_du, if_trk_t_fl, if_trk_t_fr, if_trk_t_vi` |
| Warrior | 9 | 7 | `if_war_eyes, if_war_fear, if_war_iway, if_war_kick, if_war_lung, if_war_maxlvl, if_war_rank, if_war_shlds, if_war_surv` | `if_war_eyes, if_war_fear, if_war_iway, if_war_kick, if_war_rank, if_war_shlds, if_war_surv` |

## Mismatches / issues

- 15x `feat/spell icon differs`
- 9x `spell.FeatID mismatch`
- 1x `known missing f_engnr_sharp.ncs`

| Class | Level | Feat | feat.ICON | spell.IconResRef | Issue |
|---|---:|---|---|---|---|
| Charlatan | 4 | `FEAT_CHARLATAN_CHEAP_STRIKE` | `if_chr_strk` | `if_chr_strike` | feat/spell icon differs |
| Charlatan | 8 | `FEAT_CHARLATAN_AVOID` | `if_chr_avd` | `if_chr_avoid` | feat/spell icon differs |
| Charlatan | -1 | `FEAT_CHARLATAN_CALTROPS` | `if_chr_caltr` | `if_chr_caltrops` | feat/spell icon differs |
| Charlatan | -1 | `FEAT_CHARLATAN_LEG_SWEEP` | `if_chr_leg_s` | `if_chr_leg_sweep` | feat/spell icon differs |
| Charlatan | -1 | `FEAT_CHARLATAN_POISON` | `if_chr_poisn` | `if_chr_poison` | feat/spell icon differs |
| Scientist | -1 | `FEAT_SCIENTIST_ANIMUS` | `if_sci_anms` | `if_sci_animus` | feat/spell icon differs |
| Berserker | 2 | `FEAT_WAR_BERSERKER_1` | `if_brsrk_1` | `if_brsrk_1` | spell.FeatID mismatch |
| Berserker | 4 | `FEAT_WAR_BERSERKER_2` | `if_brsrk_2` | `if_brsrk_2` | spell.FeatID mismatch |
| Berserker | 6 | `FEAT_WAR_BERSERKER_3` | `if_brsrk_3` | `if_brsrk_3` | spell.FeatID mismatch |
| Berserker | 8 | `FEAT_WAR_BERSERKER_4` | `if_brsrk_4` | `if_brsrk_4` | spell.FeatID mismatch |
| Berserker | 10 | `FEAT_WAR_BERSERKER_5` | `if_brsrk_5` | `if_brsrk_5` | spell.FeatID mismatch |
| Alchemist | -1 | `FEAT_SCIENTIST_ANIMUS` | `if_sci_anms` | `if_sci_animus` | feat/spell icon differs |
| Medic | -1 | `FEAT_SCIENTIST_ANIMUS` | `if_sci_anms` | `if_sci_animus` | feat/spell icon differs |
| Engineer | -1 | `FEAT_SCIENTIST_ANIMUS` | `if_sci_anms` | `if_sci_animus` | feat/spell icon differs |
| Engineer | -1 | `FEAT_SCI_ENGINEER_6` | `if_engnr_6` | `if_engnr_6` | known missing f_engnr_sharp.ncs |
| Boxer | -1 | `FEAT_CHARLATAN_CALTROPS` | `if_chr_caltr` | `if_chr_caltrops` | feat/spell icon differs |
| Boxer | -1 | `FEAT_CHARLATAN_LEG_SWEEP` | `if_chr_leg_s` | `if_chr_leg_sweep` | feat/spell icon differs |
| Boxer | -1 | `FEAT_CHARLATAN_POISON` | `if_chr_poisn` | `if_chr_poison` | feat/spell icon differs |
| Assassin | 3 | `FEAT_CHR_ASSASIN_2` | `if_asn_2` | `if_asn_2` | spell.FeatID mismatch |
| Assassin | 5 | `FEAT_CHR_ASSASIN_3` | `if_asn_3` | `if_asn_3` | spell.FeatID mismatch |
| Assassin | 7 | `FEAT_CHR_ASSASIN_4` | `if_asn_4` | `if_asn_4` | spell.FeatID mismatch |
| Assassin | 9 | `FEAT_CHR_ASSASIN_5` | `if_asn_5` | `if_asn_5` | spell.FeatID mismatch |
| Assassin | -1 | `FEAT_CHARLATAN_CALTROPS` | `if_chr_caltr` | `if_chr_caltrops` | feat/spell icon differs |
| Assassin | -1 | `FEAT_CHARLATAN_LEG_SWEEP` | `if_chr_leg_s` | `if_chr_leg_sweep` | feat/spell icon differs |
| Assassin | -1 | `FEAT_CHARLATAN_POISON` | `if_chr_poisn` | `if_chr_poison` | feat/spell icon differs |

## OnMenu ability rows

### Alchemist
- L-1: `FEAT_SCIENTIST_X3_GRE` -> feat `if_sci_x3_gra`, spell `if_sci_x3_gra`
- L-1: `FEAT_SCIENTIST_VIS` -> feat `if_sci_vis`, spell `if_sci_vis`
- L-1: `FEAT_SCIENTIST_ANIMUS` -> feat `if_sci_anms`, spell `if_sci_animus` (feat/spell icon differs)
- L-1: `FEAT_SCIENTIST_SYMPHYTUM` -> feat `if_sci_symph`, spell `if_sci_symph`
- L-1: `FEAT_SCIENTIST_LEPIDIUM` -> feat `if_sci_lepid`, spell `if_sci_lepid`
- L-1: `FEAT_SCIENTIST_RHODIOLA` -> feat `if_sci_rhod`, spell `if_sci_rhod`
- L2: `FEAT_SCI_ALCHEMIST_1` -> feat `if_alchm_1`, spell `if_alchm_1`
- L2: `FEAT_SCI_ALCHEMIST_2` -> feat `if_alchm_2`, spell `if_alchm_2`
- L4: `FEAT_SCI_ALCHEMIST_3` -> feat `if_alchm_3`, spell `if_alchm_3`
- L6: `FEAT_SCI_ALCHEMIST_4` -> feat `if_alchm_4`, spell `if_alchm_4`
- L8: `FEAT_SCI_ALCHEMIST_5` -> feat `if_alchm_5`, spell `if_alchm_5`
- L10: `FEAT_SCI_ALCHEMIST_6` -> feat `if_alchm_6`, spell `if_alchm_6`

### Archer
- L2: `FEAT_TRK_ARCHER_1` -> feat `if_arr_1`, spell `if_arr_1`
- L4: `FEAT_TRK_ARCHER_3` -> feat `if_arr_3`, spell `if_arr_3`
- L6: `FEAT_TRK_ARCHER_4` -> feat `if_arr_4`, spell `if_arr_4`
- L8: `FEAT_TRK_ARCHER_5` -> feat `if_arr_5`, spell `if_arr_5`
- L10: `FEAT_TRK_ARCHER_6` -> feat `if_arr_6`, spell `if_arr_6`
- L-1: `FEAT_TRAKER_TRAP_BARBED` -> feat `if_trk_t_ba`, spell `if_trk_t_ba`
- L-1: `FEAT_TRAKER_TRAP_FLAME` -> feat `if_trk_t_fl`, spell `if_trk_t_fl`
- L-1: `FEAT_TRAKER_TRAP_DUST` -> feat `if_trk_t_du`, spell `if_trk_t_du`
- L-1: `FEAT_TRAKER_TRAP_VIPER` -> feat `if_trk_t_vi`, spell `if_trk_t_vi`
- L-1: `FEAT_TRAKER_TRAP_FROST` -> feat `if_trk_t_fr`, spell `if_trk_t_fr`

### Assassin
- L1: `FEAT_CHR_ASSASIN_1` -> feat `if_asn_1`, spell `if_asn_1`
- L3: `FEAT_CHR_ASSASIN_2` -> feat `if_asn_2`, spell `if_asn_2` (spell.FeatID mismatch)
- L5: `FEAT_CHR_ASSASIN_3` -> feat `if_asn_3`, spell `if_asn_3` (spell.FeatID mismatch)
- L7: `FEAT_CHR_ASSASIN_4` -> feat `if_asn_4`, spell `if_asn_4` (spell.FeatID mismatch)
- L9: `FEAT_CHR_ASSASIN_5` -> feat `if_asn_5`, spell `if_asn_5` (spell.FeatID mismatch)
- L-1: `FEAT_CHARLATAN_SAND_THROW` -> feat `if_chr_sand`, spell `if_chr_sand`
- L-1: `FEAT_CHARLATAN_CALTROPS` -> feat `if_chr_caltr`, spell `if_chr_caltrops` (feat/spell icon differs)
- L-1: `FEAT_CHARLATAN_LEG_SWEEP` -> feat `if_chr_leg_s`, spell `if_chr_leg_sweep` (feat/spell icon differs)
- L-1: `FEAT_CHARLATAN_TRICK` -> feat `if_chr_trick`, spell `if_chr_trick`
- L-1: `FEAT_CHARLATAN_POISON` -> feat `if_chr_poisn`, spell `if_chr_poison` (feat/spell icon differs)
- L-1: `FEAT_CHARLATAN_RISK` -> feat `if_chr_risk`, spell `-`

### Berserker
- L-1: `FEAT_WARRIOR_S_SHIELDS` -> feat `if_war_shlds`, spell `if_war_shlds`
- L-1: `FEAT_WARRIOR_S_FEARME` -> feat `if_war_fear`, spell `if_war_fear`
- L-1: `FEAT_WARRIOR_S_IWAY` -> feat `if_war_iway`, spell `if_war_iway`
- L-1: `FEAT_WARRIOR_S_RANK` -> feat `if_war_rank`, spell `if_war_rank`
- L-1: `FEAT_WARRIOR_S_GOFOREYES` -> feat `if_war_eyes`, spell `if_war_eyes`
- L2: `FEAT_WAR_BERSERKER_1` -> feat `if_brsrk_1`, spell `if_brsrk_1` (spell.FeatID mismatch)
- L4: `FEAT_WAR_BERSERKER_2` -> feat `if_brsrk_2`, spell `if_brsrk_2` (spell.FeatID mismatch)
- L6: `FEAT_WAR_BERSERKER_3` -> feat `if_brsrk_3`, spell `if_brsrk_3` (spell.FeatID mismatch)
- L8: `FEAT_WAR_BERSERKER_4` -> feat `if_brsrk_4`, spell `if_brsrk_4` (spell.FeatID mismatch)
- L10: `FEAT_WAR_BERSERKER_5` -> feat `if_brsrk_5`, spell `if_brsrk_5` (spell.FeatID mismatch)

### Boxer
- L1: `FEAT_CHR_BOXER_1` -> feat `if_bxr_1`, spell `if_bxr_1`
- L3: `FEAT_CHR_BOXER_2` -> feat `if_bxr_2`, spell `if_bxr_2`
- L5: `FEAT_CHR_BOXER_3` -> feat `if_bxr_3`, spell `if_bxr_3`
- L7: `FEAT_CHR_BOXER_4` -> feat `if_bxr_4`, spell `if_bxr_4`
- L9: `FEAT_CHR_BOXER_5` -> feat `if_bxr_5`, spell `if_bxr_5`
- L-1: `FEAT_CHARLATAN_SAND_THROW` -> feat `if_chr_sand`, spell `if_chr_sand`
- L-1: `FEAT_CHARLATAN_CALTROPS` -> feat `if_chr_caltr`, spell `if_chr_caltrops` (feat/spell icon differs)
- L-1: `FEAT_CHARLATAN_LEG_SWEEP` -> feat `if_chr_leg_s`, spell `if_chr_leg_sweep` (feat/spell icon differs)
- L-1: `FEAT_CHARLATAN_TRICK` -> feat `if_chr_trick`, spell `if_chr_trick`
- L-1: `FEAT_CHARLATAN_POISON` -> feat `if_chr_poisn`, spell `if_chr_poison` (feat/spell icon differs)
- L-1: `FEAT_CHARLATAN_RISK` -> feat `if_chr_risk`, spell `-`

### Charlatan
- L4: `FEAT_CHARLATAN_CHEAP_STRIKE` -> feat `if_chr_strk`, spell `if_chr_strike` (feat/spell icon differs)
- L8: `FEAT_CHARLATAN_AVOID` -> feat `if_chr_avd`, spell `if_chr_avoid` (feat/spell icon differs)
- L-1: `FEAT_CHARLATAN_SAND_THROW` -> feat `if_chr_sand`, spell `if_chr_sand`
- L-1: `FEAT_CHARLATAN_CALTROPS` -> feat `if_chr_caltr`, spell `if_chr_caltrops` (feat/spell icon differs)
- L-1: `FEAT_CHARLATAN_LEG_SWEEP` -> feat `if_chr_leg_s`, spell `if_chr_leg_sweep` (feat/spell icon differs)
- L-1: `FEAT_CHARLATAN_TRICK` -> feat `if_chr_trick`, spell `if_chr_trick`
- L-1: `FEAT_CHARLATAN_POISON` -> feat `if_chr_poisn`, spell `if_chr_poison` (feat/spell icon differs)

### Engineer
- L-1: `FEAT_SCIENTIST_VIS` -> feat `if_sci_vis`, spell `if_sci_vis`
- L-1: `FEAT_SCIENTIST_ANIMUS` -> feat `if_sci_anms`, spell `if_sci_animus` (feat/spell icon differs)
- L-1: `FEAT_SCIENTIST_SYMPHYTUM` -> feat `if_sci_symph`, spell `if_sci_symph`
- L-1: `FEAT_SCIENTIST_LEPIDIUM` -> feat `if_sci_lepid`, spell `if_sci_lepid`
- L-1: `FEAT_SCIENTIST_RHODIOLA` -> feat `if_sci_rhod`, spell `if_sci_rhod`
- L2: `FEAT_SCI_ENGINEER_1` -> feat `if_engnr_1`, spell `if_engnr_1`
- L4: `FEAT_SCI_ENGINEER_2` -> feat `if_engnr_2`, spell `if_engnr_2`
- L6: `FEAT_SCI_ENGINEER_3` -> feat `if_engnr_3`, spell `if_engnr_3`
- L8: `FEAT_SCI_ENGINEER_4` -> feat `if_engnr_4`, spell `if_engnr_4`
- L10: `FEAT_SCI_ENGINEER_5` -> feat `if_engnr_5`, spell `if_engnr_5`
- L-1: `FEAT_SCI_ENGINEER_6` -> feat `if_engnr_6`, spell `if_engnr_6` (known missing f_engnr_sharp.ncs)

### Hunter
- L1: `FEAT_TRK_HUNTER_1` -> feat `if_htr_1`, spell `if_htr_1`
- L2: `FEAT_TRK_HUNTER_2` -> feat `if_htr_2`, spell `if_htr_2`
- L3: `FEAT_TRK_HUNTER_3` -> feat `if_htr_3`, spell `if_htr_3`
- L4: `FEAT_TRK_HUNTER_4` -> feat `if_htr_4`, spell `if_htr_4`
- L5: `FEAT_TRK_HUNTER_4` -> feat `if_htr_5`, spell `if_htr_5`
- L-1: `FEAT_TRAKER_TRAP_BARBED` -> feat `if_trk_t_ba`, spell `if_trk_t_ba`
- L-1: `FEAT_TRAKER_TRAP_FLAME` -> feat `if_trk_t_fl`, spell `if_trk_t_fl`
- L-1: `FEAT_TRAKER_TRAP_DUST` -> feat `if_trk_t_du`, spell `if_trk_t_du`
- L-1: `FEAT_TRAKER_TRAP_VIPER` -> feat `if_trk_t_vi`, spell `if_trk_t_vi`
- L-1: `FEAT_TRAKER_TRAP_FROST` -> feat `if_trk_t_fr`, spell `if_trk_t_fr`

### Knight
- L-1: `FEAT_WARRIOR_S_SHIELDS` -> feat `if_war_shlds`, spell `if_war_shlds`
- L-1: `FEAT_WARRIOR_S_FEARME` -> feat `if_war_fear`, spell `if_war_fear`
- L-1: `FEAT_WARRIOR_S_IWAY` -> feat `if_war_iway`, spell `if_war_iway`
- L-1: `FEAT_WARRIOR_S_RANK` -> feat `if_war_rank`, spell `if_war_rank`
- L-1: `FEAT_WARRIOR_S_GOFOREYES` -> feat `if_war_eyes`, spell `if_war_eyes`
- L2: `FEAT_WAR_KNIGHT_1` -> feat `if_knght_1`, spell `if_knght_1`
- L4: `FEAT_WAR_KNIGHT_2` -> feat `if_knght_2`, spell `if_knght_2`
- L6: `FEAT_WAR_KNIGHT_3` -> feat `if_knght_3`, spell `if_knght_3`
- L8: `FEAT_WAR_KNIGHT_4` -> feat `if_knght_4`, spell `if_knght_4`

### Medic
- L-1: `FEAT_SCIENTIST_VIS` -> feat `if_sci_vis`, spell `if_sci_vis`
- L-1: `FEAT_SCIENTIST_ANIMUS` -> feat `if_sci_anms`, spell `if_sci_animus` (feat/spell icon differs)
- L-1: `FEAT_SCIENTIST_SYMPHYTUM` -> feat `if_sci_symph`, spell `if_sci_symph`
- L-1: `FEAT_SCIENTIST_LEPIDIUM` -> feat `if_sci_lepid`, spell `if_sci_lepid`
- L-1: `FEAT_SCIENTIST_RHODIOLA` -> feat `if_sci_rhod`, spell `if_sci_rhod`
- L2: `FEAT_SCI_MEDIC_1` -> feat `if_mdc_1`, spell `if_mdc_1`
- L4: `FEAT_SCI_MEDIC_2` -> feat `if_mdc_2`, spell `if_mdc_2`
- L6: `FEAT_SCI_MEDIC_3` -> feat `if_mdc_3`, spell `if_mdc_3`
- L8: `FEAT_SCI_MEDIC_4` -> feat `if_mdc_4`, spell `if_mdc_4`
- L10: `FEAT_SCI_MEDIC_5` -> feat `if_mdc_5`, spell `if_mdc_5`

### Scientist
- L4: `FEAT_SCIENTIST_ACHILLEA` -> feat `if_sci_heal`, spell `if_sci_heal`
- L-1: `FEAT_SCIENTIST_G_MODE` -> feat `cls_sci_gra_off`, spell `cls_sci_gra_off`
- L-1: `FEAT_SCIENTIST_X_MODE` -> feat `cls_sci_x_off`, spell `cls_sci_x_off`
- L-1: `FEAT_SCIENTIST_X3_GRE` -> feat `if_sci_x3_gra`, spell `if_sci_x3_gra`
- L-1: `FEAT_SCIENTIST_VIS` -> feat `if_sci_vis`, spell `if_sci_vis`
- L-1: `FEAT_SCIENTIST_ANIMUS` -> feat `if_sci_anms`, spell `if_sci_animus` (feat/spell icon differs)
- L-1: `FEAT_SCIENTIST_SYMPHYTUM` -> feat `if_sci_symph`, spell `if_sci_symph`
- L-1: `FEAT_SCIENTIST_LEPIDIUM` -> feat `if_sci_lepid`, spell `if_sci_lepid`
- L-1: `FEAT_SCIENTIST_RHODIOLA` -> feat `if_sci_rhod`, spell `if_sci_rhod`

### Shieldmaster
- L-1: `FEAT_WARRIOR_S_SHIELDS` -> feat `if_war_shlds`, spell `if_war_shlds`
- L-1: `FEAT_WARRIOR_S_FEARME` -> feat `if_war_fear`, spell `if_war_fear`
- L-1: `FEAT_WARRIOR_S_IWAY` -> feat `if_war_iway`, spell `if_war_iway`
- L-1: `FEAT_WARRIOR_S_RANK` -> feat `if_war_rank`, spell `if_war_rank`
- L-1: `FEAT_WARRIOR_S_GOFOREYES` -> feat `if_war_eyes`, spell `if_war_eyes`
- L2: `FEAT_WAR_SHIELDMASTER_1` -> feat `if_shld_1`, spell `if_shld_1`
- L4: `FEAT_WAR_SHIELDMASTER_2` -> feat `if_shld_2`, spell `if_shld_2`
- L6: `FEAT_WAR_SHIELDMASTER_3` -> feat `if_shld_3`, spell `if_shld_3`
- L8: `FEAT_WAR_SHIELDMASTER_4` -> feat `if_shld_4`, spell `if_shld_4`
- L10: `FEAT_WAR_SHIELDMASTER_5` -> feat `if_shld_5`, spell `if_shld_5`

### Tamer
- L1: `FEAT_TRK_TAMER_1` -> feat `if_tmr_1`, spell `if_tmr_1`
- L1: `FEAT_TRK_TAMER_2` -> feat `if_tmr_2`, spell `if_tmr_2`
- L3: `FEAT_TRK_TAMER_3` -> feat `if_tmr_3`, spell `if_tmr_3`
- L5: `FEAT_TRK_TAMER_4` -> feat `if_tmr_4`, spell `if_tmr_4`
- L7: `FEAT_TRK_TAMER_5` -> feat `if_tmr_5`, spell `if_tmr_5`
- L9: `FEAT_TRK_TAMER_6` -> feat `if_tmr_6`, spell `if_tmr_6`
- L-1: `FEAT_TRAKER_TRAP_BARBED` -> feat `if_trk_t_ba`, spell `if_trk_t_ba`
- L-1: `FEAT_TRAKER_TRAP_FLAME` -> feat `if_trk_t_fl`, spell `if_trk_t_fl`
- L-1: `FEAT_TRAKER_TRAP_DUST` -> feat `if_trk_t_du`, spell `if_trk_t_du`
- L-1: `FEAT_TRAKER_TRAP_VIPER` -> feat `if_trk_t_vi`, spell `if_trk_t_vi`
- L-1: `FEAT_TRAKER_TRAP_FROST` -> feat `if_trk_t_fr`, spell `if_trk_t_fr`

### Tracker
- L4: `FEAT_TRAKER_ROOT_STRIKE` -> feat `if_trk_root`, spell `if_trk_root`
- L8: `FEAT_TRAKER_RENEWAL` -> feat `if_trk_rene`, spell `if_trk_rene`
- L-1: `FEAT_TRAKER_TRAP_BARBED` -> feat `if_trk_t_ba`, spell `if_trk_t_ba`
- L-1: `FEAT_TRAKER_TRAP_FLAME` -> feat `if_trk_t_fl`, spell `if_trk_t_fl`
- L-1: `FEAT_TRAKER_TRAP_DUST` -> feat `if_trk_t_du`, spell `if_trk_t_du`
- L-1: `FEAT_TRAKER_TRAP_VIPER` -> feat `if_trk_t_vi`, spell `if_trk_t_vi`
- L-1: `FEAT_TRAKER_TRAP_FROST` -> feat `if_trk_t_fr`, spell `if_trk_t_fr`

### Warrior
- L4: `FEAT_WARRIOR_KICK` -> feat `if_war_kick`, spell `if_war_kick`
- L8: `FEAT_WARRIOR_SECOND_WIND` -> feat `if_war_surv`, spell `if_war_surv`
- L-1: `FEAT_WARRIOR_S_SHIELDS` -> feat `if_war_shlds`, spell `if_war_shlds`
- L-1: `FEAT_WARRIOR_S_FEARME` -> feat `if_war_fear`, spell `if_war_fear`
- L-1: `FEAT_WARRIOR_S_IWAY` -> feat `if_war_iway`, spell `if_war_iway`
- L-1: `FEAT_WARRIOR_S_RANK` -> feat `if_war_rank`, spell `if_war_rank`
- L-1: `FEAT_WARRIOR_S_GOFOREYES` -> feat `if_war_eyes`, spell `if_war_eyes`

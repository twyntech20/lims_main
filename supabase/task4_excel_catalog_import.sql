-- ============================================================
-- Task 4: import the laboratory catalog from
-- "Master List of Analyses Microbiology and Chemistry 2025.xlsx"
--
-- Applied to the live LIMS project via the Supabase MCP connector as
-- two migrations (checked in here so the repo stops drifting from the
-- live schema, same as phase3b/phase3c/phase4/phase5/task3):
--   task4_test_catalog_metadata_columns
--   task4_import_excel_catalog
--
-- SOURCE SHAPE
--   The workbook is Test x Method x Matrix (158 usable rows: 68
--   microbiology, 90 chemistry). Chemistry rows 98-190 hold only a
--   stray "<6°C" and are formatting residue, not analyses.
--   Collapsed on (Test, Method) this is 132 entries:
--     42 microbiology
--     58 chemistry - in house
--     23 chemistry - ICP-MS metals (EPA 6020B)
--      9 chemistry - sub-contracted
--   Applicable matrices are recorded in tests.matrix rather than split
--   into separate catalog rows, matching the granularity Tasks 1-3 use.
--
-- OUTCOME (verified by dry run before applying)
--   97 existing tests matched and enriched
--    1 existing test not present in the workbook -> KEPT, untouched
--   38 new analyses inserted
--    0 deletions, 0 deactivations, 0 renames, 0 code changes
--
-- NOT IMPORTED, DELIBERATELY
--   * reference_range - the workbook has no such column. Left NULL
--     rather than invented.
--   * turnaround_days - left exactly as-is for backward compatibility.
--     The workbook's TAT is a text range ("3-5 days") which the integer
--     column cannot hold, so it is stored verbatim in tat_general /
--     tat_rush and tat_matches_legacy records where the legacy integer
--     falls outside the workbook range (36 of 85 analyses).
--   * method / unit on matched rows are filled ONLY where the catalog
--     held nothing. Where the two disagree the LIMS value is the more
--     specific one - it distinguishes Hach 10205 HR from LR, spells
--     "Pseudalert" correctly where the workbook has "Psuedalert", and
--     carries the per-matrix unit that a collapsed row cannot. The full
--     workbook unit list is preserved in unit_options.
-- ============================================================

-- ── 1. additive metadata columns ────────────────────────────
alter table tests add column if not exists matrix          text;
alter table tests add column if not exists mdl             text;
alter table tests add column if not exists result_type     text;
alter table tests add column if not exists holding_time    text;
alter table tests add column if not exists incubation      text;
alter table tests add column if not exists preservative    text;
alter table tests add column if not exists volume_required text;
alter table tests add column if not exists storage_temp    text;
alter table tests add column if not exists catalog_notes   text;
alter table tests add column if not exists tat_general        text;
alter table tests add column if not exists tat_rush           text;
alter table tests add column if not exists tat_matches_legacy boolean;
alter table tests add column if not exists unit_options   text;
alter table tests add column if not exists subcontracted  boolean not null default false;
alter table tests add column if not exists catalog_source text;

comment on column tests.turnaround_days is
  'Legacy integer TAT, pre-dating the 2025 workbook. Left unchanged for backward compatibility; tat_general holds the authoritative workbook range.';
comment on column tests.tat_general is
  'TAT (General) exactly as written in the source workbook, e.g. "3-5 days". Authoritative.';
comment on column tests.tat_matches_legacy is
  'False when turnaround_days falls outside the tat_general range - a documented legacy/workbook discrepancy, not an error.';
comment on column tests.reference_range is
  'Not supplied by the 2025 workbook (it has no reference-range column); intentionally left NULL rather than invented.';
comment on column tests.unit_options is
  'All units the workbook lists for this analysis across its matrices. tests.unit remains the entry default.';

create index if not exists idx_tests_subcontracted on tests(subcontracted) where subcontracted;

-- ── 2. staged workbook rows ─────────────────────────────────
create temp table _task4_stage(
  cat text, section text, test text, method_code text, method_full text,
  matrix text, units text, mdl text, result_type text, holding_time text,
  incubation text, preservative text, volume text, storage_temp text, notes text,
  tat_gen text, tat_rush text, subcontracted boolean, code text, new_name text
) on commit drop;

insert into _task4_stage values
('microbiology','Microbiology','Total Coliform','SM 9223B','SM 9223B (Colilert P/A) / SM 9223B (Colilert QuantiTray)','Water','MPN/100mL | Presence/Absence','1','Qualitative (Presence/Absence) | Quantitative','30 hrs (Drinking water) 6hrs (Waste water)','24-28 hrs @ 35±0.2°C',null,'100mL','<10°C',null,'3-5 days','2-3 days',false,null,null),
('microbiology','Microbiology','Total Coliform','SM 9222B','SM 9222B (Membrane Filtration)','Water','CFU/100mL','1','Quantitative','30 hrs (Drinking water) 6hrs (Waste water)','22-24 hrs @ 35±0.2°C (mEndo); Confirmation: 48±3 hrs @ 35±0.2°C (1XLT/BG)',null,'100mL','<10°C',null,'4-6 days','3-4 days',false,null,null),
('microbiology','Microbiology','Total Coliform','SM 9221B','SM 9221B (Multiple Tube Fermentation)','Water','MPN/100mL','1.8','Quantitative','30 hrs (Drinking water) 6hrs (Waste water)','48±3 hrs @ 35±0.2°C (2XLT/1XLT) Confirmation: 48±3 hrs @ 35±0.2°C (BG)',null,'55.5mL','<10°C',null,'6-8 days','5-6 days',false,null,null),
('microbiology','Microbiology','Total Coliform','AOAC 991.14','AOAC 991.14 (Petrifilm)','Carcass swabs / Environmental swabs / Food','CFU/103cm² | CFU/g','10','Quantitative','6hrs','24±2 hrs @ 35±0.2°C',null,'11g | 1mL','<10°C','Not Validated for BPW (including sanicult swabs)','3-5 days','2-3 days',false,null,null),
('microbiology','Microbiology','Total Coliform','AOAC 2018.13','AOAC 2018.13 (Rapid Petrifilm)','Carcass swabs / Environmental swabs / Food','CFU/103cm² | CFU/g','10','Quantitative','6hrs','18-24 hrs @ 35±0.2°C',null,'11g | 1mL','<10°C','Not Validated for BPW (including sanicult swabs)','3-5 days','2-3 days',false,null,null),
('microbiology','Microbiology','Heterotrophic Plate Count','SM 9215E','SM 9215E (SimPlate)','Water','MPN/mL','2','Quantitative','8 hrs','45-72 hrs @ 35±0.2°C',null,'1mL','<10°C',null,'4-6 days','3-4 days',false,null,null),
('microbiology','Microbiology','Heterotrophic Plate Count','SM 9215B','SM 9215B (Pourplate)','Water','CFU/mL','1','Quantitative','8 hrs','45-72 hrs @ 35±0.2°C',null,'2mL','<10°C','No standard Method','4-6 days','3-4 days',false,null,null),
('microbiology','Microbiology','Fecal Coliform','Colilert 18-QuantiTray','Colilert 18-QuantiTray','Water','MPN/100mL','1','Quantitative','6 hrs','18-22 hrs @ 44.5±0.2°C',null,'100mL','<10°C',null,'3-5 days','2-3 days',false,null,null),
('microbiology','Microbiology','Fecal Coliform','SM 9222D','SM 9222D (Membrane Filtration)','Water','CFU/100mL','1','Quantitative','6 hrs','22-26 hrs @ 44.5±0.2°C (mFC); Confirmation: 22-26 hrs @ 44.5±0.2°C (EC)',null,'100mL','<10°C',null,'4-6 days','3-4 days',false,null,null),
('microbiology','Microbiology','Fecal Coliform','SM 9221E','SM 9221E (Multiple Tube Fermentation)','Biosolids / Water','MPN/100mL','0.1803 | 1.8','Quantitative','6 hrs','48±3 hrs @ 35±0.2°C (2XLT/1XLT) Confirmation: 22-26 hrs @ 44.5±0.2°C (EC)',null,'30g | 55.5mL','<10°C','%Total Solids required to calculate final results','5-7 days','4-5 days',false,null,null),
('microbiology','Microbiology','E. coli','SM 9223B','SM 9223B (Colilert P/A) / SM 9223B (Colilert QuantiTray)','Water','MPN/100mL | Presence/Absence','1','Qualitative (Presence/Absence) | Quantitative','30 hrs (Drinking water) 6hrs (Waste water)','24-28 hrs @ 35±0.2°C',null,'100mL','<10°C',null,'3-5 days','2-3 days',false,null,null),
('microbiology','Microbiology','E. coli','AOAC 991.14','AOAC 991.14 (Petrifilm)','Carcass swabs / Environmental swabs / Food','CFU/103cm² | CFU/cm² | CFU/g','0.083 | 10','Quantitative','6hrs','24-28 hrs @ 35±0.2°C',null,'11g | 1mL','<10°C',null,'3-5 days','2-3 days',false,null,null),
('microbiology','Microbiology','E. coli','AOAC 2018.13','AOAC 2018.13 (Rapid Petrifilm)','Carcass swabs / Environmental swabs / Food','CFU/103cm² | CFU/cm² | CFU/g','0.083 | 10','Quantitative','6hrs','18-24 hrs @ 35±0.2°C',null,'11g | 1mL','<10°C','Not Validated for BPW (including sanicult swabs)','3-5 days','2-3 days',false,null,null),
('microbiology','Microbiology','E. coli O157:H7','AOAC 020801','AOAC 020801 (BioRad)','Food (Beef trim/Ground beef) / Food (other)','Positive/Negative',null,'Qualitative (Positive/Negative)',null,'8-22 hrs @ 42±0.5°C (1,125mL BPW) | 8-24 hrs @ 42±0.5°C (225mL BPW)',null,'25g | 375g','<10°C',null,'3-5 days','2-3 days',false,null,null),
('microbiology','Microbiology','E. coli O157:H7','AOAC 121401','AOAC 121401 (Veriflow)','Food','Positive/Negative',null,'Qualitative (Positive/Negative)',null,'18-20 hrs @ 42±0.5°C (225mL BPW or meHEC)',null,'25g',null,null,'3-5 days','2-3 days',false,null,null),
('microbiology','Microbiology','Enterococcus','SM 9230C','SM 9230C (Membrane Filtration)','Water','CFU/100mL','1','Quantitative','8 hrs','48±4 hrs @ 35±0.2°C (mEnterococcus)',null,'100mL','<10°C',null,'5-7 days','3-4 days',false,null,null),
('microbiology','Microbiology','Enterococcus','Enterolert- Quantitray','Enterolert- Quantitray','Water','MPN/100mL','1','Quantitative','8 hrs','24-28 hrs @ 42±0.5°C',null,'100mL','<10°C',null,'3-5 days','2-3 days',false,'ENT-QT',null),
('microbiology','Microbiology','Aerobic Plate Count','AOAC 990.12','AOAC 990.12 (Petrifilm)','Carcass swabs / Environmental swabs / Food','CFU/103cm² | CFU/g','10','Quantitative','6hrs','48±3 hrs @ 35±0.2°C',null,'11g | 1mL','<10°C','Usually run at least 4 dilutions','4-6 days','3-4 days',false,null,null),
('microbiology','Microbiology','Yeast & Mold','AOAC 997.02','AOAC 997.02 (Petrifilm)','Environmental swabs / Food','CFU/103cm² | CFU/g','10','Quantitative','6hrs','5 days @ 10-35°C',null,'11g | 1mL','<10°C',null,'7-9 days','6-7 days',false,null,null),
('microbiology','Microbiology','Yeast & Mold','FDA BAM Online: Ch. 18','FDA BAM Online: Ch. 18 (PourPlate)','Food','CFU/g','10','Quantitative',null,'5 days @ 10-35°C',null,'11g','<10°C',null,'7-9 days','6-7 days',false,'YM-PP',null),
('microbiology','Microbiology','Legionella','CDC Elite Testing Program','CDC Elite Testing Program','Water','CFU/mL','1','Quantitative','48hrs','10 days @ 35±0.2°C',null,'500mL','<10°C','Needs an additional result box for Culture ID','12-14 days','11-12 days',false,null,null),
('microbiology','Microbiology','Salmonella','AOAC 010803','AOAC 010803 (BioRad)','Environmental swabs / Food / Food (Ground Beef) / Water','Positive/Negative',null,'Qualitative (Positive/Negative)','6hrs | 6hrs?','19-23 hrs @ 35±0.2°C (10mL BPW) | 19-23 hrs @ 35±0.2°C (225mL BPW) | 8-22 hrs @ 42±0.5°C (1,125mL BPW)',null,'1mL | 25g | 25mL | 375g','<10°C',null,'4-6 days','3-4 days',false,null,null),
('microbiology','Microbiology','Salmonella','AOAC 011404','AOAC 011404 (Veriflow)','Environmental swabs / Food','Positive/Negative',null,'Qualitative (Positive/Negative)','6hrs','18-24 hrs @ 35±0.2°C (10mL BPW) | 18-24 hrs @ 35±0.2°C (225mL BPW)',null,'1mL | 25g','<10°C',null,'4-6 days','3-4 days',false,null,null),
('microbiology','Microbiology','Listeria spp.','AOAC 090701','AOAC 090701 (BioRad)','Environmental swabs / Food','Positive/Negative',null,'Qualitative (Positive/Negative)','6hrs','30-48 hrs @ 30±0.2°C (10mL DemiFraser) | 30-48 hrs @ 30±0.2°C (225mL DemiFraser)',null,'1mL | 25g','<10°C',null,'4-6 days','3-4 days',false,null,null),
('microbiology','Microbiology','Listeria spp.','AOAC 121302','AOAC 121302 (Veriflow)','Environmental swabs / Food','Positive/Negative',null,'Qualitative (Positive/Negative)','6hrs','30-48 hrs @ 30±0.2°C (10mL DemiFraser) | 30-48 hrs @ 30±0.2°C (225mL DemiFraser)',null,'1mL | 25g','<10°C',null,'4-6 days','3-4 days',false,null,null),
('microbiology','Microbiology','Listeria monocytogenes','AOAC 010802','AOAC 010802 (BioRad)','Environmental swabs / Food','Positive/Negative',null,'Qualitative (Positive/Negative)','6hrs','30-48 hrs @ 30±0.2°C (10mL DemiFraser) | 30-48 hrs @ 30±0.2°C (225mL DemiFraser)',null,'1mL | 25g','<10°C',null,'4-6 days','3-4 days',false,null,null),
('microbiology','Microbiology','Listeria monocytogenes','AOAC 051304','AOAC 051304 (Veriflow)','Environmental swabs / Food','Positive/Negative',null,'Qualitative (Positive/Negative)','6hrs','30-48 hrs @ 30±0.2°C (10mL DemiFraser) | 30-48 hrs @ 30±0.2°C (225mL DemiFraser)',null,'1mL | 25g','<10°C',null,'4-6 days','3-4 days',false,null,null),
('microbiology','Microbiology','STEC','AOAC 121203','AOAC 121203 (BioRad)','Environmental swabs / Food / Food (Ground Beef)','Positive/Negative',null,'Qualitative (Positive/Negative)','6hrs','18-26 hrs @ 42±0.5°C (225mL BPW) | 8-22 hrs @ 42±0.5°C (1,125mL BPW)',null,'1mL | 25g | 375g','<10°C',null,'3-5 days','2-3 days',false,null,null),
('microbiology','Microbiology','Staphylococcus aureus','AOAC 2003.07, 2003.08, 2003.11','AOAC 2003.07, 2003.08, 2003.11 (Petrifilm)','Food','CFU/g','10','Quantitative',null,'24±2 hrs @ 35±0.2°C',null,'11g','<10°C',null,'3-5 days','2-3 days',false,'STAPH-PF',null),
('microbiology','Microbiology','Hepatitis A','ISO/TS 15216-2','ISO/TS 15216-2 (BioRad/Congen)','Food','Positive/Negative',null,'Qualitative (Positive/Negative)',null,'NA',null,'1g','<10°C',null,'5-7 days','3-4 days',false,null,null),
('microbiology','Microbiology','Histamine','AOAC 937.07a','AOAC 937.07a','Fish','ppm','50','Qualitative (</> MDL)',null,'NA',null,'10g','<10°C',null,'3-5 days','2-3 days',false,null,null),
('microbiology','Microbiology','Histamine Quantification','AOAC-R1 #070703','AOAC-R1 #070703','Fish','ppm','2.5','Quantitative',null,'NA',null,'10g','<10°C',null,'3-5 days','2-3 days',false,null,null),
('microbiology','Microbiology','Water Activity','AOAC 978.18','AOAC 978.18','Food','aW',null,'Quantitative',null,'NA',null,'5-10g','<10°C',null,'3-5 days','2-3 days',false,null,null),
('microbiology','Microbiology','LAL Endotoxin','Endosafe PTS 2703','Endosafe PTS 2703','Water','EU/mL','0.05','Quantitative','6hrs','NA',null,'.1mL','<10°C',null,'3-5 days','2-3 days',false,null,null),
('microbiology','Microbiology','Enterobacteriacaea','AOAC 2003.01','AOAC 2003.01','Food','CFU/g','10','Quantitative',null,'24±2 hrs @ 35±0.2°C',null,'11g','<10°C',null,'3-5 days','2-3 days',false,'ENTB-AOAC','Enterobacteriaceae (AOAC 2003.01)'),
('microbiology','Microbiology','Enterobacteriacaea','NF ISO 21528-2','NF ISO 21528-2','Carcass Swab / Environmental swabs','CFU/103cm²','10','Quantitative',null,'24±2 hrs @ 35±0.2°C',null,'11g','<10°C',null,'3-5 days','2-3 days',false,'ENTB-ISO','Enterobacteriaceae (NF ISO 21528-2)'),
('microbiology','Microbiology','Psuedomonas','Psuedalert Quantitray','Psuedalert Quantitray','Water','MPN/100mL','1','Quantitative','6hrs','24-28 hrs @ 35±0.2°C',null,'100mL','<10°C',null,'3-5 days','2-3 days',false,'PSEUDO',null),
('microbiology','Microbiology','OSA','FDA BAM Chapter 3','FDA BAM Chapter 3','Food','CFU/g','10','Quantitative',null,'48±3 hrs @ 35±0.2°C',null,'1mL','<10°C',null,'4-6 days','3-4 days',false,null,null),
('microbiology','Microbiology','Sulfate Reducing Bacteria','BART HACH','BART HACH','Water','CFU/mL','1','Quantitative',null,'8 days at room temperature',null,'20mL','<10°C',null,'12-15 days','11-12 days',false,'SRB-BART','Sulfate Reducing Bacteria'),
('microbiology','Microbiology','Iron Related Bacteria','BART HACH','BART HACH','Water','CFU/mL','1','Quantitative',null,'8 days at room temperature',null,'20mL','<10°C',null,'12-15 days','11-12 days',false,'IRB-BART','Iron Related Bacteria'),
('microbiology','Microbiology','Lactic Acid Bacteria','NF ISO 15214','NF ISO 15214 (Petrifilm)','Food','CFU/g','10','Quantitative',null,'48±3 hrs @ 30±0.2°C',null,'11g','<10°C',null,'4-6 days','3-4 days',false,'LAB-ISO','Lactic Acid Bacteria'),
('microbiology','Microbiology','Clostridium perfringens','J.W. Bisson, V.J. Cabbel; App & Env Micro, 1979;','J.W. Bisson, V.J. Cabbel; App & Env Micro, 1979; (Membrane Filtration)','Water','CFU/100mL','1','Quantitative','6hrs','18-24 hrs @ 44.5°C anaerobically',null,'100mL','<10°C',null,'3-5 days','2-3 days',false,'CLOST-PERF','Clostridium perfringens'),
('chemistry','Chemistry (In-House)','Alkalinity (Gallery)','EPA 310.2','EPA 310.2','Water','mg/L','2.6','Quantitative','24 Hr',null,'Refrigerate','250mL','<6°C',null,'1 Day','N/A',false,null,null),
('chemistry','Chemistry (In-House)','Alkalinity (Titration)','EPA 310.1','EPA 310.1','Water','mg/L','-','Quantitative','24 Hr',null,'Refrigerate','500mL','<6°C',null,'1 Day','N/A',false,null,null),
('chemistry','Chemistry (In-House)','Ammonia(Gallery)','EPA 350.1','EPA 350.1','Water','mg/L','0.011','Quantitative','28 Days',null,'H2SO4','250mL','<6°C',null,'5-10 Days','2-3 Days',false,null,null),
('chemistry','Chemistry (In-House)','Ammonia (Hach LR)','Hach Method 10205','Hach Method 10205 (LR)','Water','mg/L','0.015','Quantitative','28 Days',null,'H2SO4','250mL','<6°C',null,'5-10 Days','2-3 Days',false,'NH3-LR',null),
('chemistry','Chemistry (In-House)','Ammonia (Hach HR)','Hach Method 10205','Hach Method 10205 (HR)','Water','mg/L','2','Quantitative','28 Days',null,'H2SO4','250mL','<6°C',null,'5-10 Days','2-3 Days',false,'NH3-HR',null),
('chemistry','Chemistry (In-House)','Bicarbonate Ion (Soil)','USDA 402a2b1a1-2','USDA 402a2b1a1-2','Solid','mmol/L','Calc','Quantitative',null,null,'None','100g','Ambient',null,null,null,false,null,null),
('chemistry','Chemistry (In-House)','BOD','SM 5210B','SM 5210B','Water','mg/L','1','Quantitative','24-48Hr',null,'Refrgerate','1 L','<6°C',null,'5-10 Days','N/A',false,null,null),
('chemistry','Chemistry (In-House)','Calcium Carbonate (CaCO3)','AOAC 955.01','AOAC 955.01','Solid','mg/kg by dry weight','-','Quantitative',null,null,null,'100g','Ambient',null,null,'2-3 Days',false,null,null),
('chemistry','Chemistry (In-House)','Carbon Dioxide',null,null,'Water',null,null,'Quantitative','Immediate',null,'Refrigerate','2mL','<6°C',null,'5-10 Days','N/A',false,null,null),
('chemistry','Chemistry (In-House)','COD (HR)','EPA 410.4','EPA 410.4','Water','mg/L','10.8','Quantitative','28 Days',null,'H2SO4','250mL','<6°C',null,'5-10 Days','2-3 Days',false,'COD-HR',null),
('chemistry','Chemistry (In-House)','COD (LR)','EPA 410.4','EPA 410.4','Water','mg/L','3','Quantitative','28 Days',null,'H2SO4','250mL','<6°C',null,'5-10 Days','2-3 Days',false,'COD-LR',null),
('chemistry','Chemistry (In-House)','Chloride (Gallery)','EPA 325.2','EPA 325.2','Water','mg/L','0.05','Quantitative','28 Days',null,'Refrigerate','250mL','<6°C',null,'5-10 Days','2-3 Days',false,null,null),
('chemistry','Chemistry (In-House)','Chloride (Hach)',null,null,'Water',null,null,'Quantitative',null,null,null,'250mL','<6°C',null,null,null,false,null,null),
('chemistry','Chemistry (In-House)','Chlorine (Total Residual)','EPA 330.5','EPA 330.5','Water','mg/L','0.01','Quantitative','24 Hr',null,'Refrigerate','250 mL','<6°C',null,'1 Day','N/A',false,null,null),
('chemistry','Chemistry (In-House)','Chlorophyll','EPA 445','EPA 445','Water','ug Chl a/L','0.05','Quantitative','24 Hr',null,'Refrigerate','1 L','<6°C',null,'1 Day','N/A',false,null,null),
('chemistry','Chemistry (In-House)','Conductivity','EPA 120.1','EPA 120.1','Water','ms/cm','0.1','Quantitative','24 Hr',null,'Refrigerate','250mL','<6°C',null,'1 Day','N/A',false,null,null),
('chemistry','Chemistry (In-House)','Cyanide (Total)','EPA 335.2','EPA 335.2','Water','mg/L','0.006','Quantitative','14 Days',null,'NaOH tp pH <12','250 mL`','<6°C',null,'5-10 Days','2-3 Days',false,null,null),
('chemistry','Chemistry (In-House)','Cyanide (Reactive)','EPA 335.2','EPA 335.2','Water','mg/L','0.006','Quantitative','14 Days',null,'NaOH tp pH <12','250 mL','<6°C',null,'5-10 Days','2-3 Days',false,'CN-REAC',null),
('chemistry','Chemistry (In-House)','Dissolved Oxygen','EPA 360.1','EPA 360.1','Water','mg/L','1','Quantitative','24 Hrs',null,'Refrigerate','300mL Bottle','<6°C',null,'1 Day','N/A',false,null,null),
('chemistry','Chemistry (In-House)','Fluoride (Gallery)','EPA 340.3','EPA 340.3','Water','mg/L','0.05','Quantitative','28 Days',null,'Refrigerate','250 mL','<6°C',null,'5-10 Days','2-3 Days',false,null,null),
('chemistry','Chemistry (In-House)','Fluoride (Hach)',null,null,'Water',null,null,'Quantitative',null,null,null,null,'<6°C',null,null,null,false,null,null),
('chemistry','Chemistry (In-House)','Hexavalent Chromium','SM 3500-Cr-B','SM 3500-Cr-B','Water','mg/L','0.001','Quantitative','24 Hr',null,'Refrigerate','250mL','<6°C',null,'5-10 Days','N/A',false,null,null),
('chemistry','Chemistry (In-House)','Ignitability','EPA 1010A','EPA 1010A','Water','oF','212','Qualitative (</> MDL)','28 Days',null,'Refrigerate','250mL','<6°C',null,'5-10 Days','2-3 Days',false,null,null),
('chemistry','Chemistry (In-House)','Moisture / Water Content','SM 2540G','SM 2540G','Water','%','1','Quantitative','7 Days',null,'Refrigerate','1L','<6°C',null,'5-10 Days','2-3 Days',false,null,null),
('chemistry','Chemistry (In-House)','Nitrate (NO3) [Gallery]','EPA 353.1','EPA 353.1','Water','mg/L','0.008','Quantitative','48 Hrs',null,'Refrigerate','250 mL','<6°C',null,'2 Days','1 Day',false,null,null),
('chemistry','Chemistry (In-House)','Nitrite (NO2) [Gallery]','EPA 353.2','EPA 353.2','Water','mg/L','0.004','Quantitative','48 Hrs',null,'Refrigerate','250 mL','<6°C',null,'2 Days','1 Day',false,null,null),
('chemistry','Chemistry (In-House)','Nitrate (NO3) [Hach]','Hach Method 10206','Hach Method 10206','Water','mg/L','0.034','Quantitative',null,null,null,'250 mL','<6°C',null,null,null,false,'NO3-HACH',null),
('chemistry','Chemistry (In-House)','Nitrite (NO2) [Gach]','Hach Method 10207','Hach Method 10207','Water','mg/L','0.015','Quantitative',null,null,null,'250 mL','<6°C',null,null,null,false,'NO2-HACH',null),
('chemistry','Chemistry (In-House)','Nitrate+Nitrite (NO3+NO2)','EPA 353.1','EPA 353.1','Water','mg/L','0.008','Quantitative','28 Days',null,'Refrigerate','250 Ml','<6°C',null,'5-10 Days','2-3 Days',false,'NO3-NO2',null),
('chemistry','Chemistry (In-House)','Oil & Grease','EPA 1664A','EPA 1664A','Water','mg/L','5','Quantitative','28 Days',null,'6N HCL to pH<2','1 L','<6°C','Depends on arrival time for RUSH','5-10 Days','2-3 Days',false,null,null),
('chemistry','Chemistry (In-House)','Orthophosphate (Gallery)','EPA 365.3','EPA 365.3','Water','mg/L','0.001','Quantitative','48 hours',null,'Refrigerate','250 mL','<6°C',null,'2 Days','1 Day',false,null,null),
('chemistry','Chemistry (In-House)','Orthophosphate (Hach)',null,null,'Water',null,null,'Quantitative',null,null,null,'250 mL','<6°C',null,null,null,false,null,null),
('chemistry','Chemistry (In-House)','pH','SM 4500-H','SM 4500-H','Water','pH','0.1','Quantitative','Immediate',null,'Refrigerate','250 mL','<6°C',null,'5-10 Days','N/A',false,'PH-W',null),
('chemistry','Chemistry (In-House)','pH','AOAC 981.12','AOAC 981.12','Food','pH','0.1','Quantitative','Immediate',null,'Refrigerate','100g','<6°C',null,'5-10 Days','N/A',false,'PH-F',null),
('chemistry','Chemistry (In-House)','pH','EPA 9045D','EPA 9045D','Solids','pH','0.1','Quantitative','Immediate',null,'Refrigerate','100g','<6°C',null,'5-10 Days','N/A',false,'PH-S',null),
('chemistry','Chemistry (In-House)','Phenol','EPA 420.1','EPA 420.1','Water','mg/L','0.005','Quantitative',null,null,null,'250 mL','<6°C',null,null,null,false,null,null),
('chemistry','Chemistry (In-House)','Salinity','SM 2520B','SM 2520B','Water','ppt',null,'Quantitative',null,null,null,'250mL','<6°C',null,null,null,false,null,null),
('chemistry','Chemistry (In-House)','Silica (Gallery)','EPA 370.1','EPA 370.1','Water','mg/L','0.001','Quantitative','28 Days',null,'Refrigerate','250 mL','<6°C',null,'5-10 Days','2-3 Days',false,null,null),
('chemistry','Chemistry (In-House)','Silica (Hach)',null,null,'Water',null,null,'Quantitative',null,null,null,'250 mL','<6°C',null,null,null,false,null,null),
('chemistry','Chemistry (In-House)','Sulfate (Gallery)','EPA 375.4','EPA 375.4','Water','mg/L','0.07','Quantitative','28 Days',null,'Refrigerate','250 mL','<6°C',null,'5-10 Days','2-3 Days',false,null,null),
('chemistry','Chemistry (In-House)','Sulfate (Hach)',null,null,'Water',null,null,'Quantitative',null,null,null,'250 mL','<6°C',null,null,null,false,null,null),
('chemistry','Chemistry (In-House)','Sulfide (Total)','SM 4500-S2- D','SM 4500-S2- D','Water','mg/L','0.005','Quantitative','7 Days',null,'Refrigerate','250 mL','<6°C',null,'5-10 Days','2-3 Days',false,null,null),
('chemistry','Chemistry (In-House)','Sulfide (Reactive)','SM 4500-S- D','SM 4500-S- D','Water','mg/L','0.005','Quantitative',null,null,null,'250 mL','<6°C',null,null,null,false,null,null),
('chemistry','Chemistry (In-House)','Surfactant',null,null,'Water',null,null,'Quantitative',null,null,null,null,'<6°C',null,null,null,false,null,null),
('chemistry','Chemistry (In-House)','TKN (Gallery)','EPA 351.2','EPA 351.2','Water','mg/L','0.173','Quantitative','28 Days',null,'H2SO4','250mL','<6°C','Need to digest','5-10 Days','2-3 Days',false,null,null),
('chemistry','Chemistry (In-House)','TKN (Hach)','Hach Method 10242','Hach Method 10242','Water','mg/L','0','Quantitative',null,null,null,'250mL','<6°C',null,null,null,false,'TKN-HACH',null),
('chemistry','Chemistry (In-House)','TDS','EPA 160.1','EPA 160.1','Water','mg/L','10','Quantitative','7 Days',null,'Refrigerate','250 mL','<6°C',null,'5-10 Days','1 Day',false,null,null),
('chemistry','Chemistry (In-House)','TOC (HACH)',null,null,'Water',null,null,'Quantitative',null,null,null,'250mL','<6°C',null,null,null,false,null,null),
('chemistry','Chemistry (In-House)','TOC (Drinking Water)',null,null,'Water',null,null,'Quantitative',null,null,null,null,'<6°C',null,null,null,false,null,null),
('chemistry','Chemistry (In-House)','Total Phosphorus (Gallery)','EPA 365.1','EPA 365.1','Water','mg/L','0.003','Quantitative','28 Days',null,'H2SO4','250 mL','<6°C','Need to digest','5-10 Days','2-3 Days',false,null,null),
('chemistry','Chemistry (In-House)','Total Phosphorus (Hach)','Hach Method 8190','Hach Method 8190','Water','mg/L','0.2','Quantitative',null,null,null,'250mL','<6°C',null,null,null,false,'TP-HACH',null),
('chemistry','Chemistry (In-House)','Total Solids','SM 2540G','SM 2540G','Solids','%','1','Quantitative','7 Days',null,'n/a','500 g','<6°C',null,'5-10 Days','1-2 Days',false,'TS',null),
('chemistry','Chemistry (In-House)','Total Petroleum Hydrocarbons','EPA 1664A','EPA 1664A','Water','mg/L','5','Quantitative','28 Days',null,'6N HCL to pH<2','1 L','<6°C',null,'5-10 Days','2-3 Days',false,null,null),
('chemistry','Chemistry (In-House)','Total Suspended Solids (TSS)','SM 2540D','SM 2540D','Water','mg/L','1','Quantitative','7 Days',null,'Refrigerate','1L','<6°C',null,'5 Days','2-3 Days',false,null,null),
('chemistry','Chemistry (In-House)','Turbidity','EPA 180.1','EPA 180.1','Water','NTU','0.1','Quantitative','24 Hrs',null,'N/A','250 mL','<6°C',null,'1 Day','N/A',false,null,null),
('chemistry','Chemistry (In-House)','Volatile Solids',null,null,null,null,null,'Quantitative',null,null,null,null,'<6°C',null,null,null,false,null,null),
('chemistry','Chemistry (In-House)','Volatile Suspended Solids (VSS)','SM 2540 G','SM 2540 G','Solids','%','1','Quantitative','7 Days',null,'n/a','500 g','<6°C',null,'5-10 Days','1-2 Days',false,'VSS',null),
('chemistry','Chemistry (In-House)','Volatile Acids','HACH 8196','HACH 8196','Water','mg/L','27','Quantitative','24 Hrs',null,'N/A','250mL','<6°C',null,'1 Day','N/A',false,null,null),
('chemistry','Chemistry (Sub-Contracted)','Mold',null,null,'Water',null,null,null,null,null,null,null,'<6°C',null,null,null,true,'SUB-MOLD','Mold'),
('chemistry','Chemistry (Sub-Contracted)','TPH (gas, diesel, oil)',null,null,'Water',null,null,null,null,null,null,null,'<6°C',null,null,null,true,'SUB-TPH','TPH (gas, diesel, oil)'),
('chemistry','Chemistry (Sub-Contracted)','SVOC',null,null,'Water',null,null,null,null,null,null,null,'<6°C',null,null,null,true,'SUB-SVOC','SVOC'),
('chemistry','Chemistry (Sub-Contracted)','VOC',null,null,'Water',null,null,null,null,null,null,null,'<6°C',null,null,null,true,'SUB-VOC','VOC'),
('chemistry','Chemistry (Sub-Contracted)','Pesticides',null,null,'Water',null,null,null,null,null,null,null,'<6°C',null,null,null,true,'SUB-PEST','Pesticides'),
('chemistry','Chemistry (Sub-Contracted)','Diquat',null,null,'Water',null,null,null,null,null,null,null,'<6°C',null,null,null,true,'SUB-DIQUAT','Diquat'),
('chemistry','Chemistry (Sub-Contracted)','Endothall',null,null,'Water',null,null,null,null,null,null,null,'<6°C',null,null,null,true,'SUB-ENDO','Endothall'),
('chemistry','Chemistry (Sub-Contracted)','Dioxin',null,null,'Water',null,null,null,null,null,null,null,'<6°C',null,null,null,true,'SUB-DIOXIN','Dioxin'),
('chemistry','Chemistry (Sub-Contracted)','TCDD (Tetrachlorodibenzo Dioxin)',null,null,'Water',null,null,null,null,null,null,null,'<6°C',null,null,null,true,'SUB-TCDD','TCDD (Tetrachlorodibenzo Dioxin)'),
('chemistry','Chemistry (ICP-MS Metals)','Aluminum','EPA 6020B','EPA 6020B','Water',null,null,null,null,null,null,'250mL','<6°C',null,null,null,false,'MET-AL','Aluminum'),
('chemistry','Chemistry (ICP-MS Metals)','Antimony','EPA 6020B','EPA 6020B','Water',null,null,null,null,null,null,'250mL','<6°C',null,null,null,false,'MET-SB','Antimony'),
('chemistry','Chemistry (ICP-MS Metals)','Arsenic','EPA 6020B','EPA 6020B','Water',null,null,null,null,null,null,'250mL','<6°C',null,null,null,false,'MET-AS','Arsenic'),
('chemistry','Chemistry (ICP-MS Metals)','Barium','EPA 6020B','EPA 6020B','Water',null,null,null,null,null,null,'250mL','<6°C',null,null,null,false,'MET-BA','Barium'),
('chemistry','Chemistry (ICP-MS Metals)','Beryllium','EPA 6020B','EPA 6020B','Water',null,null,null,null,null,null,'250mL','<6°C',null,null,null,false,'MET-BE','Beryllium'),
('chemistry','Chemistry (ICP-MS Metals)','Cadmium','EPA 6020B','EPA 6020B','Water',null,null,null,null,null,null,'250mL','<6°C',null,null,null,false,'MET-CD','Cadmium'),
('chemistry','Chemistry (ICP-MS Metals)','Calcium','EPA 6020B','EPA 6020B','Water',null,null,null,null,null,null,'250mL','<6°C',null,null,null,false,'MET-CA','Calcium'),
('chemistry','Chemistry (ICP-MS Metals)','Chromium','EPA 6020B','EPA 6020B','Water',null,null,null,null,null,null,'250mL','<6°C',null,null,null,false,'MET-CR','Chromium'),
('chemistry','Chemistry (ICP-MS Metals)','Cobalt','EPA 6020B','EPA 6020B','Water',null,null,null,null,null,null,'250mL','<6°C',null,null,null,false,'MET-CO','Cobalt'),
('chemistry','Chemistry (ICP-MS Metals)','Copper','EPA 6020B','EPA 6020B','Water',null,null,null,null,null,null,'250mL','<6°C',null,null,null,false,'MET-CU','Copper'),
('chemistry','Chemistry (ICP-MS Metals)','Iron','EPA 6020B','EPA 6020B','Water',null,null,null,null,null,null,'250mL','<6°C',null,null,null,false,'MET-FE','Iron'),
('chemistry','Chemistry (ICP-MS Metals)','Lead','EPA 6020B','EPA 6020B','Water',null,null,null,null,null,null,'250mL','<6°C',null,null,null,false,'MET-PB','Lead'),
('chemistry','Chemistry (ICP-MS Metals)','Magnesium','EPA 6020B','EPA 6020B','Water',null,null,null,null,null,null,'250mL','<6°C',null,null,null,false,'MET-MG','Magnesium'),
('chemistry','Chemistry (ICP-MS Metals)','Manganese','EPA 6020B','EPA 6020B','Water',null,null,null,null,null,null,'250mL','<6°C',null,null,null,false,'MET-MN','Manganese'),
('chemistry','Chemistry (ICP-MS Metals)','Mercury','EPA 6020B','EPA 6020B','Water',null,null,null,null,null,null,'250mL','<6°C',null,null,null,false,'MET-HG','Mercury'),
('chemistry','Chemistry (ICP-MS Metals)','Nickel','EPA 6020B','EPA 6020B','Water',null,null,null,null,null,null,'250mL','<6°C',null,null,null,false,'MET-NI','Nickel'),
('chemistry','Chemistry (ICP-MS Metals)','Potassium','EPA 6020B','EPA 6020B','Water',null,null,null,null,null,null,'250mL','<6°C',null,null,null,false,'MET-K','Potassium'),
('chemistry','Chemistry (ICP-MS Metals)','Selenium','EPA 6020B','EPA 6020B','Water',null,null,null,null,null,null,'250mL','<6°C',null,null,null,false,'MET-SE','Selenium'),
('chemistry','Chemistry (ICP-MS Metals)','Silver','EPA 6020B','EPA 6020B','Water',null,null,null,null,null,null,'250mL','<6°C',null,null,null,false,'MET-AG','Silver'),
('chemistry','Chemistry (ICP-MS Metals)','Sodium','EPA 6020B','EPA 6020B','Water',null,null,null,null,null,null,'250mL','<6°C',null,null,null,false,'MET-NA','Sodium'),
('chemistry','Chemistry (ICP-MS Metals)','Thallium','EPA 6020B','EPA 6020B','Water',null,null,null,null,null,null,'250mL','<6°C',null,null,null,false,'MET-TL','Thallium'),
('chemistry','Chemistry (ICP-MS Metals)','Vanadium','EPA 6020B','EPA 6020B','Water',null,null,null,null,null,null,'250mL','<6°C',null,null,null,false,'MET-V','Vanadium'),
('chemistry','Chemistry (ICP-MS Metals)','Zinc','EPA 6020B','EPA 6020B','Water',null,null,null,null,null,null,'250mL','<6°C',null,null,null,false,'MET-ZN','Zinc');

-- ── 3. matcher ──────────────────────────────────────────────
create or replace function pg_temp.nz(t text) returns text language sql immutable as
$$ select regexp_replace(lower(coalesce(t,'')), '[^a-z0-9]', '', 'g') $$;

-- LIMS microbiology names embed technique and method
-- ("Total Coliform (MF) - SM 9222B"); recover the analyte name so a
-- workbook entry can be matched to it. Without this, 25 microbiology
-- entries look "new" and would be inserted as duplicates.
create or replace function pg_temp.basename(t text) returns text language sql immutable as
$$ select btrim(regexp_replace(regexp_replace(coalesce(t,''),
     '\s*-\s*(SM|AOAC|EPA|FDA|ISO|NF)\s.*$',''), '\s*\([^)]*\)\s*$','')) $$;

-- A workbook entry matches a catalog row when it carries that row's code
-- explicitly (the 19 cosmetic name/method drifts), or when category,
-- normalised method and normalised analyte name all agree. Three entries
-- legitimately match two rows each - Total Coliform and E. coli under
-- SM 9223B (P/A vs QuantiTray) and Aerobic Plate Count under AOAC 990.12
-- (Petrifilm vs Surface) - and both rows are enriched.
create or replace function pg_temp.matches(t_cat text,t_name text,t_method text,t_code text,
                                           x_cat text,x_test text,x_method text,x_code text)
returns boolean language sql immutable as
$$ select (x_code is not null and t_code = x_code)
       or (t_cat = x_cat
           and pg_temp.nz(t_method) = pg_temp.nz(x_method)
           and (pg_temp.nz(t_name) = pg_temp.nz(x_test)
             or pg_temp.nz(pg_temp.basename(t_name)) = pg_temp.nz(x_test))) $$;

-- ── 4. enrich the 97 matched analyses ───────────────────────
update tests t set
  matrix          = nullif(x.matrix,''),
  mdl             = nullif(x.mdl,''),
  result_type     = nullif(x.result_type,''),
  holding_time    = nullif(x.holding_time,''),
  incubation      = nullif(x.incubation,''),
  preservative    = nullif(x.preservative,''),
  volume_required = nullif(x.volume,''),
  storage_temp    = nullif(x.storage_temp,''),
  catalog_notes   = nullif(x.notes,''),
  tat_general     = nullif(x.tat_gen,''),
  tat_rush        = nullif(x.tat_rush,''),
  unit_options    = nullif(x.units,''),
  subcontracted   = x.subcontracted,
  catalog_source  = 'Master List of Analyses 2025',
  method          = coalesce(nullif(t.method,''), nullif(x.method_code,'')),
  unit            = coalesce(nullif(t.unit,''),   nullif(split_part(x.units,' | ',1),''))
from _task4_stage x
where pg_temp.matches(t.category,t.name,t.method,t.code,x.cat,x.test,x.method_code,x.code);

-- ── 5. insert the 38 analyses the catalog lacked ────────────
insert into tests (
  name, code, category, method, unit, unit_options, turnaround_days, is_active,
  matrix, mdl, result_type, holding_time, incubation, preservative,
  volume_required, storage_temp, catalog_notes, tat_general, tat_rush,
  subcontracted, catalog_source
)
select x.new_name, x.code, x.cat,
       nullif(x.method_code,''),
       nullif(split_part(x.units,' | ',1),''),
       nullif(x.units,''),
       5,          -- legacy placeholder only; tat_general is authoritative
       true,
       nullif(x.matrix,''), nullif(x.mdl,''), nullif(x.result_type,''),
       nullif(x.holding_time,''), nullif(x.incubation,''), nullif(x.preservative,''),
       nullif(x.volume,''), nullif(x.storage_temp,''), nullif(x.notes,''),
       nullif(x.tat_gen,''), nullif(x.tat_rush,''),
       x.subcontracted, 'Master List of Analyses 2025'
from _task4_stage x
where x.new_name is not null
  and not exists (select 1 from tests t
                  where pg_temp.matches(t.category,t.name,t.method,t.code,x.cat,x.test,x.method_code,x.code))
on conflict (code) do nothing;

-- ── 6. document the legacy TAT discrepancy ──────────────────
-- turnaround_days is deliberately NOT changed.
update tests t set tat_matches_legacy = sub.ok
from (
  select c.code,
         case when c.turnaround_days is null or c.tat_general is null then null
              else c.turnaround_days between b.lo and b.hi end as ok
  from tests c
  left join lateral (
    select min(x::int) as lo, max(x::int) as hi
    from unnest(string_to_array(regexp_replace(c.tat_general,'[^0-9]+',' ','g'),' ')) as x
    where x <> ''
  ) b on true
  where c.catalog_source = 'Master List of Analyses 2025'
) sub
where t.code = sub.code;

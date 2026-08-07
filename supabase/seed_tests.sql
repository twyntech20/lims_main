-- ============================================================
-- FQLabs Test Catalog Seed
-- Microbiology (22 test types) + Chemistry (43 test types)
-- Run in Supabase SQL editor
-- ============================================================

insert into tests (name, code, category, method, unit, turnaround_days, is_active) values

-- ── MICROBIOLOGY ─────────────────────────────────────────────
('Total Coliform (P/A) - SM 9223B',           'TC-PA-9223B',    'microbiology', 'SM 9223B',              'P/A',             1,  true),
('Total Coliform (QuantiTray) - SM 9223B',    'TC-QT-9223B',    'microbiology', 'SM 9223B',              'MPN/100mL',       1,  true),
('Total Coliform (MF) - SM 9222B',            'TC-MF-9222B',    'microbiology', 'SM 9222B',              'CFU/100mL',       1,  true),
('Total Coliform (MTF) - SM 9221B',           'TC-MTF-9221B',   'microbiology', 'SM 9221B',              'MPN/100mL',       1,  true),
('Total Coliform (Petrifilm) - AOAC 991.14',  'TC-PF-991.14',   'microbiology', 'AOAC 991.14',           'CFU/g',           2,  true),
('Total Coliform (Rapid Petrifilm) - AOAC 2018.13', 'TC-RPF',   'microbiology', 'AOAC 2018.13',          'CFU/g',           1,  true),

('E. coli (P/A) - SM 9223B',                  'EC-PA-9223B',    'microbiology', 'SM 9223B',              'P/A',             1,  true),
('E. coli (QuantiTray) - SM 9223B',           'EC-QT-9223B',    'microbiology', 'SM 9223B',              'MPN/100mL',       1,  true),
('E. coli (Petrifilm) - AOAC 991.14',         'EC-PF-991.14',   'microbiology', 'AOAC 991.14',           'CFU/g',           2,  true),
('E. coli (Rapid Petrifilm) - AOAC 2018.13',  'EC-RPF',         'microbiology', 'AOAC 2018.13',          'CFU/g',           1,  true),
('E. coli O157:H7 (BioRad)',                  'EC-O157-BR',     'microbiology', 'AOAC 020801',           'Positive/Negative', 3, true),
('E. coli O157:H7 (Veriflow)',                'EC-O157-VF',     'microbiology', 'AOAC 121401',           'Positive/Negative', 2, true),

('Fecal Coliform (QuantiTray)',               'FC-QT',          'microbiology', 'Colilert 18-QuantiTray','MPN/100mL',       1,  true),
('Fecal Coliform (MF) - SM 9222D',           'FC-MF-9222D',    'microbiology', 'SM 9222D',              'CFU/100mL',       1,  true),
('Fecal Coliform (MTF) - SM 9221E',          'FC-MTF-9221E',   'microbiology', 'SM 9221E',              'MPN/100mL',       1,  true),

('Heterotrophic Plate Count (SimPlate)',      'HPC-SIMP',       'microbiology', 'SM 9215E',              'MPN/mL',          2,  true),
('Heterotrophic Plate Count (Pourplate)',     'HPC-PP',         'microbiology', 'SM 9215B',              'CFU/mL',          2,  true),

('Enterococcus (MF) - SM 9230C',             'ENT-MF',         'microbiology', 'SM 9230C',              'CFU/100mL',       2,  true),
('Enterococcus (QuantiTray)',                 'ENT-QT',         'microbiology', 'Enterolert-QuantiTray', 'MPN/100mL',       1,  true),

('Aerobic Plate Count (Petrifilm)',           'APC-PF',         'microbiology', 'AOAC 990.12',           'CFU/g',           2,  true),
('Aerobic Plate Count (Surface)',             'APC-SURF',       'microbiology', 'AOAC 990.12',           'CFU/cm²',         2,  true),

('Yeast & Mold (Petrifilm)',                  'YM-PF',          'microbiology', 'AOAC 997.02',           'CFU/g',           5,  true),
('Yeast & Mold (PourPlate)',                  'YM-PP',          'microbiology', 'FDA BAM Ch.18',          'CFU/g',           5,  true),

('Legionella',                               'LEG',            'microbiology', 'CDC Elite Testing Program','CFU/mL',         10, true),

('Salmonella (BioRad)',                       'SAL-BR',         'microbiology', 'AOAC 010803',           'Positive/Negative', 3, true),
('Salmonella (Veriflow)',                     'SAL-VF',         'microbiology', 'AOAC 011404',           'Positive/Negative', 2, true),

('Listeria spp. (BioRad)',                    'LIST-BR',        'microbiology', 'AOAC 090701',           'Positive/Negative', 3, true),
('Listeria spp. (Veriflow)',                  'LIST-VF',        'microbiology', 'AOAC 121302',           'Positive/Negative', 2, true),
('Listeria monocytogenes (BioRad)',           'LISTM-BR',       'microbiology', 'AOAC 010802',           'Positive/Negative', 3, true),
('Listeria monocytogenes (Veriflow)',         'LISTM-VF',       'microbiology', 'AOAC 051304',           'Positive/Negative', 2, true),

('STEC (BioRad)',                             'STEC-BR',        'microbiology', 'AOAC 121203',           'Positive/Negative', 3, true),

('Staphylococcus aureus (Petrifilm)',         'STAPH-PF',       'microbiology', 'AOAC 2003.07/08/11',    'CFU/g',           3,  true),

('Hepatitis A',                              'HEP-A',          'microbiology', 'ISO/TS 15216-2',        'Positive/Negative', 10, true),

('Histamine',                                'HIST',           'microbiology', 'AOAC 937.07a',          'ppm',             5,  true),
('Histamine Quantification',                 'HIST-Q',         'microbiology', 'AOAC-R1 #070703',       'ppm',             5,  true),

('Water Activity',                           'WA',             'microbiology', 'AOAC 978.18',           'aW',              2,  true),
('LAL Endotoxin',                            'LAL',            'microbiology', 'Endosafe PTS 2703',     'EU/mL',           3,  true),
('Enterobacteriaceae (Petrifilm)',            'ENTB-PF',        'microbiology', 'FDA BAM Ch5/6/8',       'CFU/g',           3,  true),
('Pseudomonas',                              'PSEUDO',         'microbiology', 'Pseudalert Quantitray', 'MPN/100mL',       3,  true),
('OSA',                                      'OSA',            'microbiology', 'FDA BAM Chapter 3',     'CFU/g',           5,  true),

-- ── CHEMISTRY ────────────────────────────────────────────────
('Alkalinity (Gallery)',                      'ALK-GAL',        'chemistry',    'EPA 310.2',             'mg/L',            1,  true),
('Alkalinity (Titration)',                    'ALK-TIT',        'chemistry',    'EPA 310.1',             'mg/L',            1,  true),
('Ammonia (Gallery)',                         'NH3-GAL',        'chemistry',    'EPA 350.1',             'mg/L',            5,  true),
('Ammonia (Hach LR)',                         'NH3-LR',         'chemistry',    'Hach 10205 LR',         'mg/L',            5,  true),
('Ammonia (Hach HR)',                         'NH3-HR',         'chemistry',    'Hach 10205 HR',         'mg/L',            5,  true),
('Bicarbonate Ion (Soil)',                    'BICARB',         'chemistry',    'USDA 402a2b1a1-2',      'mmol/L',          5,  true),
('BOD',                                      'BOD',            'chemistry',    'SM 5210B',              'mg/L',            5,  true),
('Calcium Carbonate (CaCO3)',                 'CACO3',          'chemistry',    'AOAC 955.01',           'mg/kg dry wt',    5,  true),
('Carbon Dioxide',                           'CO2',            'chemistry',    null,                    null,              5,  true),
('COD (High Range)',                          'COD-HR',         'chemistry',    'EPA 410.4',             'mg/L',            5,  true),
('COD (Low Range)',                           'COD-LR',         'chemistry',    'EPA 410.4',             'mg/L',            5,  true),
('Chloride (Gallery)',                        'CL-GAL',         'chemistry',    'EPA 325.2',             'mg/L',            5,  true),
('Chloride (Hach)',                           'CL-HACH',        'chemistry',    null,                    null,              5,  true),
('Chlorine Total Residual',                   'CL-TOT',         'chemistry',    'EPA 330.5',             'mg/L',            1,  true),
('Chlorophyll',                              'CHLOR',          'chemistry',    'EPA 445',               'ug Chl a/L',      1,  true),
('Conductivity',                             'COND',           'chemistry',    'EPA 120.1',             'ms/cm',           1,  true),
('Cyanide (Total)',                           'CN-TOT',         'chemistry',    'EPA 335.2',             'mg/L',            5,  true),
('Cyanide (Reactive)',                        'CN-REAC',        'chemistry',    null,                    null,              5,  true),
('Dissolved Oxygen',                         'DO',             'chemistry',    'EPA 360.1',             'mg/L',            1,  true),
('Fluoride (Gallery)',                        'F-GAL',          'chemistry',    'EPA 340.3',             'mg/L',            5,  true),
('Fluoride (Hach)',                           'F-HACH',         'chemistry',    null,                    null,              5,  true),
('Hexavalent Chromium',                      'CR6',            'chemistry',    'SM 3500-Cr-B',          'mg/L',            5,  true),
('Ignitability',                             'IGNIT',          'chemistry',    'EPA 1010A',             '>212 °F',         5,  true),
('Moisture / Water Content',                  'MOIST',          'chemistry',    'SM 2540G',              '%',               5,  true),
('Nitrate (NO3) Gallery',                    'NO3-GAL',        'chemistry',    'EPA 353.1',             'mg/L',            2,  true),
('Nitrite (NO2) Gallery',                    'NO2-GAL',        'chemistry',    'EPA 353.2',             'mg/L',            2,  true),
('Nitrate (NO3) Hach',                       'NO3-HACH',       'chemistry',    'Hach 10206',            'mg/L',            2,  true),
('Nitrite (NO2) Hach',                       'NO2-HACH',       'chemistry',    'Hach 10207',            'mg/L',            2,  true),
('Nitrate + Nitrite',                         'NO3-NO2',        'chemistry',    'EPA 353.1',             'mg/L',            5,  true),
('Oil & Grease',                              'OG',             'chemistry',    'EPA 1664A',             'mg/L',            5,  true),
('Orthophosphate (Gallery)',                  'OPO4-GAL',       'chemistry',    'EPA 365.3',             'mg/L',            2,  true),
('Orthophosphate (Hach)',                     'OPO4-HACH',      'chemistry',    null,                    null,              2,  true),
('pH (Water)',                               'PH-W',           'chemistry',    'SM 4500-H',             'pH',              1,  true),
('pH (Food)',                                'PH-F',           'chemistry',    'AOAC 981.12',           'pH',              1,  true),
('pH (Solids)',                              'PH-S',           'chemistry',    'EPA 9045D',             'pH',              1,  true),
('Phenol',                                   'PHENOL',         'chemistry',    'EPA 420.1',             'mg/L',            5,  true),
('Salinity',                                 'SAL',            'chemistry',    'SM 2520B',              'ppt',             5,  true),
('Silica (Gallery)',                          'SIO2-GAL',       'chemistry',    'EPA 370.1',             'mg/L',            5,  true),
('Silica (Hach)',                             'SIO2-HACH',      'chemistry',    null,                    null,              5,  true),
('Sulfate (Gallery)',                         'SO4-GAL',        'chemistry',    'EPA 375.4',             'mg/L',            5,  true),
('Sulfate (Hach)',                            'SO4-HACH',       'chemistry',    null,                    null,              5,  true),
('Sulfide (Total)',                           'S2-TOT',         'chemistry',    'SM 4500-S2-D',          'mg/L',            5,  true),
('Sulfide (Reactive)',                        'S2-REAC',        'chemistry',    'SM 4500-S-D',           'mg/L',            5,  true),
('Surfactant',                               'SURF',           'chemistry',    null,                    null,              5,  true),
('TKN (Gallery)',                             'TKN-GAL',        'chemistry',    'EPA 351.2',             'mg/L',            5,  true),
('TKN (Hach)',                               'TKN-HACH',       'chemistry',    'Hach 10242',            'mg/L',            5,  true),
('TDS',                                      'TDS',            'chemistry',    'EPA 160.1',             'mg/L',            5,  true),
('TOC (Hach)',                               'TOC-HACH',       'chemistry',    null,                    null,              5,  true),
('TOC (Drinking Water)',                      'TOC-DW',         'chemistry',    null,                    null,              5,  true),
('Total Phosphorus (Gallery)',               'TP-GAL',         'chemistry',    'EPA 365.1',             'mg/L',            5,  true),
('Total Phosphorus (Hach)',                  'TP-HACH',        'chemistry',    'Hach 8190',             'mg/L',            5,  true),
('Total Solids',                             'TS',             'chemistry',    null,                    null,              5,  true),
('Total Petroleum Hydrocarbons',             'TPH',            'chemistry',    'EPA 1664A',             'mg/L',            5,  true),
('Total Suspended Solids (TSS)',             'TSS',            'chemistry',    'SM 2540D',              'mg/L',            5,  true),
('Turbidity',                               'TURB',           'chemistry',    'EPA 180.1',             'NTU',             1,  true),
('Volatile Solids',                          'VS',             'chemistry',    null,                    null,              5,  true),
('Volatile Suspended Solids (VSS)',          'VSS',            'chemistry',    null,                    null,              5,  true),
('Volatile Acids',                           'VA',             'chemistry',    'HACH 8196',             'mg/L',            1,  true)

on conflict (code) do nothing;

-- Seed labor_catalog with common John Deere 6030/7030 service operations
-- Run this script to populate the labor catalog

INSERT INTO labor_catalog (id, operation_code, description, standard_hours) VALUES
  (gen_random_uuid(), 'DIAG-01', 'Диагностика - компютърна', 1.0),
  (gen_random_uuid(), 'DIAG-02', 'Диагностика - механична', 1.5),
  (gen_random_uuid(), 'DIAG-03', 'Диагностика - хидравлична система', 2.0),
  (gen_random_uuid(), 'DIAG-04', 'Диагностика - електрическа система', 1.5),
  
  (gen_random_uuid(), 'SERV-01', 'Смяна на масло - двигател', 1.0),
  (gen_random_uuid(), 'SERV-02', 'Смяна на масло - трансмисия', 1.5),
  (gen_random_uuid(), 'SERV-03', 'Смяна на масло - хидравлика', 1.5),
  (gen_random_uuid(), 'SERV-04', 'Смяна на филтри (комплект)', 2.0),
  (gen_random_uuid(), 'SERV-05', 'Сервизна проверка - 500 часа', 3.0),
  (gen_random_uuid(), 'SERV-06', 'Сервизна проверка - 1000 часа', 5.0),
  
  (gen_random_uuid(), 'REP-01', 'Ремонт на двигател - малък', 4.0),
  (gen_random_uuid(), 'REP-02', 'Ремонт на двигател - среден', 8.0),
  (gen_random_uuid(), 'REP-03', 'Ремонт на двигател - основен', 16.0),
  (gen_random_uuid(), 'REP-04', 'Ремонт на трансмисия', 6.0),
  (gen_random_uuid(), 'REP-05', 'Ремонт на хидравлична помпа', 4.0),
  (gen_random_uuid(), 'REP-06', 'Ремонт на хидравличен цилиндър', 3.0),
  
  (gen_random_uuid(), 'BELT-01', 'Смяна на клинов ремък', 1.0),
  (gen_random_uuid(), 'BELT-02', 'Смяна на ремък за климатик', 1.5),
  (gen_random_uuid(), 'BELT-03', 'Смяна на ремък за алтернатор', 1.0),
  
  (gen_random_uuid(), 'ELEC-01', 'Ремонт на стартер', 2.0),
  (gen_random_uuid(), 'ELEC-02', 'Ремонт на алтернатор', 2.5),
  (gen_random_uuid(), 'ELEC-03', 'Ремонт на електроинсталация', 3.0),
  (gen_random_uuid(), 'ELEC-04', 'Калибриране на сензори', 1.5),
  
  (gen_random_uuid(), 'CLIM-01', 'Ремонт на климатична система', 3.0),
  (gen_random_uuid(), 'CLIM-02', 'Зареждане на климатик', 1.0),
  
  (gen_random_uuid(), 'TIRE-01', 'Смяна на гума - предна', 1.0),
  (gen_random_uuid(), 'TIRE-02', 'Смяна на гума - задна', 1.5),
  (gen_random_uuid(), 'TIRE-03', 'Баланс на гуми', 0.5)
ON CONFLICT DO NOTHING;

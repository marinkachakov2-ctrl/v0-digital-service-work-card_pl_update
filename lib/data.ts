// ────────────────────────────── Mock Database ──────────────────────────────
// This module simulates database tables for development.
// When integrating with Supabase/Postgres, replace these with actual queries.

import type { Technician, Machine, Customer } from "./types";

// ────────────────────────────── Technicians ──────────────────────────────

export const technicians: Technician[] = [
  {
    id: "tech-1",
    name: "Иван Иванов",
    email: "ivan.ivanov@megatron.bg",
    phone: "+359 888 111 111",
    specialization: "Двигатели",
    isActive: true,
    createdAt: "2023-01-15T08:00:00Z",
    updatedAt: "2024-06-01T10:30:00Z",
  },
  {
    id: "tech-2",
    name: "Петър Петров",
    email: "petar.petrov@megatron.bg",
    phone: "+359 888 222 222",
    specialization: "Хидравлика",
    isActive: true,
    createdAt: "2023-02-20T09:00:00Z",
    updatedAt: "2024-05-15T14:20:00Z",
  },
  {
    id: "tech-3",
    name: "Георги Георгиев",
    email: "georgi.georgiev@megatron.bg",
    phone: "+359 888 333 333",
    specialization: "Електрика",
    isActive: true,
    createdAt: "2023-03-10T10:00:00Z",
    updatedAt: "2024-04-20T16:45:00Z",
  },
  {
    id: "tech-4",
    name: "Димитър Димитров",
    email: "dimitar.dimitrov@megatron.bg",
    phone: "+359 888 444 444",
    specialization: "Трансмисия",
    isActive: true,
    createdAt: "2023-04-05T11:00:00Z",
    updatedAt: "2024-06-10T09:15:00Z",
  },
  {
    id: "tech-5",
    name: "Стефан Стефанов",
    email: "stefan.stefanov@megatron.bg",
    phone: "+359 888 555 555",
    specialization: "Диагностика",
    isActive: true,
    createdAt: "2023-05-12T08:30:00Z",
    updatedAt: "2024-06-15T11:00:00Z",
  },
];

// ────────────────────────────── Customers ──────────────────────────────

export const customers: Customer[] = [
  {
    id: "cust-1",
    name: "Агроинвест ООД",
    address: "гр. Пловдив, ул. Индустриална 15",
    phone: "+359 32 123 456",
    email: "office@agroinvest.bg",
    vatNumber: "BG123456789",
    createdAt: "2022-01-10T08:00:00Z",
    updatedAt: "2024-01-15T10:00:00Z",
  },
  {
    id: "cust-2",
    name: "Зърнени Култури АД",
    address: "гр. Стара Загора, бул. Цар Симеон Велики 100",
    phone: "+359 42 654 321",
    email: "info@zarneni.bg",
    vatNumber: "BG987654321",
    createdAt: "2022-03-20T09:00:00Z",
    updatedAt: "2024-02-10T14:30:00Z",
  },
  {
    id: "cust-3",
    name: "Агро Про ЕООД",
    address: "гр. Бургас, ж.к. Меден Рудник 45",
    phone: "+359 56 789 012",
    email: "contact@agropro.bg",
    vatNumber: "BG456789123",
    createdAt: "2022-06-15T10:00:00Z",
    updatedAt: "2024-03-05T16:00:00Z",
  },
  {
    id: "cust-4",
    name: "Слънчеви Полета ООД",
    address: "гр. Добрич, ул. Селскостопанска 22",
    phone: "+359 58 111 222",
    email: "slanchevi@poleta.bg",
    vatNumber: "BG789123456",
    createdAt: "2022-08-01T11:00:00Z",
    updatedAt: "2024-04-20T09:45:00Z",
  },
];

// ────────────────────────────── Machines ──────────────────────────────

export const machines: Machine[] = [
  {
    id: "mach-1",
    model: "John Deere 8370R",
    manufacturer: "John Deere",
    serialNo: "1RW8370RCLP077234",
    engineSN: "PE6068T123456",
    engineHours: 4680,
    previousEngineHours: 4520,
    ownerId: "cust-1",
    ownerName: "Агроинвест ООД",
    location: "Пловдив",
    status: "active",
    lastServiceDate: "2024-05-15",
    createdAt: "2020-03-10T08:00:00Z",
    updatedAt: "2024-06-01T10:30:00Z",
  },
  {
    id: "mach-2",
    model: "John Deere 8R 410",
    manufacturer: "John Deere",
    serialNo: "1RW8410RDMP089123",
    engineSN: "PE6090H789012",
    engineHours: 2150,
    previousEngineHours: 2000,
    ownerId: "cust-1",
    ownerName: "Агроинвест ООД",
    location: "Пловдив",
    status: "active",
    lastServiceDate: "2024-04-20",
    createdAt: "2021-02-15T09:00:00Z",
    updatedAt: "2024-05-10T14:20:00Z",
  },
  {
    id: "mach-3",
    model: "Case IH Magnum 380",
    manufacturer: "Case IH",
    serialNo: "JJAM0380CJLA12345",
    engineSN: "FPT6756TA",
    engineHours: 3200,
    previousEngineHours: 3100,
    ownerId: "cust-2",
    ownerName: "Зърнени Култури АД",
    location: "Стара Загора",
    status: "active",
    lastServiceDate: "2024-03-25",
    createdAt: "2019-06-20T10:00:00Z",
    updatedAt: "2024-04-15T11:00:00Z",
  },
  {
    id: "mach-4",
    model: "New Holland T7.315",
    manufacturer: "New Holland",
    serialNo: "ZFLE07315HAC56789",
    engineSN: "NEF6125TP",
    engineHours: 5500,
    previousEngineHours: 5350,
    ownerId: "cust-2",
    ownerName: "Зърнени Култури АД",
    location: "Стара Загора",
    status: "maintenance",
    lastServiceDate: "2024-06-01",
    createdAt: "2018-04-10T11:00:00Z",
    updatedAt: "2024-06-05T09:30:00Z",
  },
  {
    id: "mach-5",
    model: "Claas Axion 960",
    manufacturer: "Claas",
    serialNo: "CLA9600TEMA78901",
    engineSN: "MAN6090CR",
    engineHours: 1800,
    previousEngineHours: 1650,
    ownerId: "cust-3",
    ownerName: "Агро Про ЕООД",
    location: "Бургас",
    status: "active",
    lastServiceDate: "2024-05-30",
    createdAt: "2022-01-25T08:30:00Z",
    updatedAt: "2024-06-10T15:45:00Z",
  },
  {
    id: "mach-6",
    model: "Fendt 1050 Vario",
    manufacturer: "Fendt",
    serialNo: "FEN1050VMTB34567",
    engineSN: "MAN6127CR",
    engineHours: 2800,
    previousEngineHours: 2700,
    ownerId: "cust-3",
    ownerName: "Агро Про ЕООД",
    location: "Бургас",
    status: "active",
    lastServiceDate: "2024-04-10",
    createdAt: "2021-07-15T09:00:00Z",
    updatedAt: "2024-05-20T13:00:00Z",
  },
  {
    id: "mach-7",
    model: "Massey Ferguson 8S.265",
    manufacturer: "Massey Ferguson",
    serialNo: "MF8S265DNAC90123",
    engineSN: "AGCO6060TA",
    engineHours: 950,
    previousEngineHours: 850,
    ownerId: "cust-4",
    ownerName: "Слънчеви Полета ООД",
    location: "Добрич",
    status: "active",
    lastServiceDate: "2024-06-05",
    createdAt: "2023-03-01T10:00:00Z",
    updatedAt: "2024-06-15T10:00:00Z",
  },
  {
    id: "mach-8",
    model: "John Deere S790",
    manufacturer: "John Deere",
    serialNo: "1H0S790SHN0785432",
    engineSN: "PE13068H",
    engineHours: 1200,
    previousEngineHours: 1100,
    ownerId: "cust-4",
    ownerName: "Слънчеви Полета ООД",
    location: "Добрич",
    status: "active",
    lastServiceDate: "2024-05-20",
    createdAt: "2022-08-10T11:00:00Z",
    updatedAt: "2024-06-01T14:30:00Z",
  },
];

// ────────────────────────────── Query Functions ──────────────────────────────
// These simulate database queries. Replace with Supabase client calls later.

export function getTechnicianById(id: string): Technician | undefined {
  return technicians.find((t) => t.id === id);
}

export function getTechnicianByName(name: string): Technician | undefined {
  return technicians.find((t) => t.name === name);
}

export function getActiveTechnicians(): Technician[] {
  return technicians.filter((t) => t.isActive);
}

export function getMachineById(id: string): Machine | undefined {
  return machines.find((m) => m.id === id);
}

export function getMachineBySerialNo(serialNo: string): Machine | undefined {
  return machines.find((m) => m.serialNo === serialNo);
}

export function getMachinesByOwner(ownerId: string): Machine[] {
  return machines.filter((m) => m.ownerId === ownerId);
}

export function getCustomerById(id: string): Customer | undefined {
  return customers.find((c) => c.id === id);
}

export function searchMachinesLocal(query: string): Machine[] {
  const lowerQuery = query.toLowerCase().trim();
  if (!lowerQuery) return [];
  
  return machines.filter((m) =>
    m.model.toLowerCase().includes(lowerQuery) ||
    m.manufacturer.toLowerCase().includes(lowerQuery) ||
    m.serialNo.toLowerCase().includes(lowerQuery) ||
    m.ownerName.toLowerCase().includes(lowerQuery) ||
    (m.location && m.location.toLowerCase().includes(lowerQuery))
  );
}
